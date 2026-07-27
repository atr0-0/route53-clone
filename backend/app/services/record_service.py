"""Record domain logic. Slice 3 starts this file with `list_records()` only, needed
for the zone detail Records tab (AC-2). Slice 4 extends it with create/update/
delete plus every validation rule from FR-D1-D6 and FR-C11a."""

from sqlalchemy.orm import Session

from app.core.errors import InvalidInputError, LimitsExceededError, NoSuchRecordError, RecordSetAlreadyExistsError
from app.models.record_set import RecordSet
from app.repositories import record_set_repo
from app.services import hosted_zone_service
from app.services.validation import semantic
from app.services.validation.grammars import GRAMMARS

TTL_MIN = 0
TTL_MAX = 2147483647


def list_records(
    session: Session,
    *,
    hosted_zone_id: int,
    search: str | None,
    types: list[str] | None,
    page: int,
    page_size: int,
) -> tuple[list[RecordSet], int]:
    offset = (page - 1) * page_size
    return record_set_repo.list_by_zone(
        session, hosted_zone_id=hosted_zone_id, search=search, types=types, offset=offset, limit=page_size
    )


def _normalize_record_name(name: str, zone_name: str) -> str:
    """FR-C2: bare prefix or full name, both normalise to the fully-qualified
    lowercased form; an empty prefix means the apex."""
    name = name.strip()
    if name.endswith("."):
        name = name[:-1]
    name = name.lower()
    if not name:
        return zone_name
    if name == zone_name or name.endswith(f".{zone_name}"):
        return name
    return f"{name}.{zone_name}"


def _validate_ttl(ttl: int | None) -> None:
    if ttl is not None and not (TTL_MIN <= ttl <= TTL_MAX):
        raise InvalidInputError(f"TTL must be between {TTL_MIN} and {TTL_MAX}.", field="ttl")


def _validate_values(type: str, values: list[str]) -> None:
    grammar = GRAMMARS[type]
    if not values:
        raise InvalidInputError("At least one value is required.", field="values")
    if len(values) > grammar.max_values:
        raise LimitsExceededError(f"{type} records allow at most {grammar.max_values} values.")
    for index, value in enumerate(values):
        error = grammar.validate(value)
        if error:
            raise InvalidInputError(error, field=f"values[{index}]")


def get_record_by_id(session: Session, hosted_zone_id: int, record_id: str) -> RecordSet:
    record = record_set_repo.get_by_record_id(session, hosted_zone_id, record_id)
    if record is None:
        raise NoSuchRecordError()
    return record


def create_record(
    session: Session,
    *,
    zone_id: str,
    name: str,
    type: str,
    values: list[str],
    ttl: int | None = None,
    set_identifier: str = "",
    routing_policy: str = "SIMPLE",
    routing_config: dict | None = None,
    alias_target: dict | None = None,
) -> RecordSet:
    zone = hosted_zone_service.get_zone(session, zone_id)
    normalized_name = _normalize_record_name(name, zone.name)
    is_apex = normalized_name == zone.name

    semantic.check_wildcard_rules(normalized_name, type)
    semantic.check_ns_routing_policy(type, routing_policy)

    if alias_target is not None:
        # FR-C12: Alias records replace TTL and values with a target.
        if ttl is not None:
            raise InvalidInputError("TTL must be omitted for alias records.", field="ttl")
        if values:
            raise InvalidInputError("Values must be omitted for alias records.", field="values")
    else:
        _validate_values(type, values)
        if ttl is None:
            raise InvalidInputError("TTL is required for non-alias records.", field="ttl")
        _validate_ttl(ttl)

    existing_types = record_set_repo.get_types_at_name(session, zone.id, normalized_name)
    semantic.check_cname_rules(existing_types, type, is_apex=is_apex)

    if record_set_repo.get_by_identity(session, zone.id, normalized_name, type, set_identifier):
        raise RecordSetAlreadyExistsError()

    semantic.check_zone_record_quota(record_set_repo.count_by_zone(session, zone.id))
    semantic.check_name_type_quota(
        record_set_repo.count_by_name_type(session, zone.id, normalized_name, type), routing_policy
    )

    record = record_set_repo.create_with_values(
        session,
        record_id=record_set_repo.generate_unique_record_id(session),
        hosted_zone_id=zone.id,
        name=normalized_name,
        type=type,
        values=values,
        ttl=ttl,
        set_identifier=set_identifier,
        routing_policy=routing_policy,
        routing_config=routing_config,
        alias_target=alias_target,
    )
    session.commit()
    session.refresh(record)
    return record


def update_record(session: Session, *, zone_id: str, record_id: str, fields: dict) -> RecordSet:
    """FR-C14: values, TTL, and routing-policy configuration only — name and
    type are the record's identity and are never in `fields` (the router builds
    it from `RecordUpdate.model_dump(exclude_unset=True)`, which doesn't have
    those fields to begin with).

    `fields` holds exactly what the client provided: a key absent from the dict
    means "leave unchanged" (falls back to the record's current value below); a
    key present with value `None` means "clear it" — the natural behavior of
    `dict.get(key, current_value)`, no sentinel object needed."""
    zone = hosted_zone_service.get_zone(session, zone_id)
    record = get_record_by_id(session, zone.id, record_id)

    new_values = fields.get("values", [v.value for v in record.values])
    new_ttl = fields.get("ttl", record.ttl)
    new_routing_policy = fields.get("routing_policy", record.routing_policy)
    new_routing_config = fields.get("routing_config", record.routing_config)
    new_alias_target = fields.get("alias_target", record.alias_target)

    if new_alias_target is None:
        _validate_values(record.type, new_values)
        if new_ttl is None:
            raise InvalidInputError("TTL is required for non-alias records.", field="ttl")
        _validate_ttl(new_ttl)
    elif new_ttl is not None:
        raise InvalidInputError("TTL must be omitted for alias records.", field="ttl")

    semantic.check_ns_routing_policy(record.type, new_routing_policy)

    if "values" in fields:
        record_set_repo.replace_values(session, record, new_values)
    record.ttl = new_ttl
    record.routing_policy = new_routing_policy
    record.routing_config = new_routing_config
    record.alias_target = new_alias_target

    session.commit()
    session.refresh(record)
    return record


def delete_record(session: Session, *, zone_id: str, record_id: str) -> None:
    zone = hosted_zone_service.get_zone(session, zone_id)
    record = get_record_by_id(session, zone.id, record_id)
    semantic.check_not_required(record.is_required)
    record_set_repo.delete(session, record)
    session.commit()
