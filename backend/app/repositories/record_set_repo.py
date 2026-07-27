from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.record_set import RecordSet
from app.models.record_value import RecordValue
from app.services import generators

_MAX_ID_ATTEMPTS = 5


def generate_unique_record_id(session: Session) -> str:
    """Shared by hosted_zone_service (SOA/apex NS at zone creation) and
    record_service (user-created records) — one generator, one collision-retry
    policy, not duplicated per caller."""
    for _ in range(_MAX_ID_ATTEMPTS):
        candidate = generators.generate_record_id()
        if session.scalar(select(RecordSet.id).where(RecordSet.record_id == candidate)) is None:
            return candidate
    raise RuntimeError("Could not generate a unique record_id")


def create_with_values(
    session: Session,
    *,
    record_id: str,
    hosted_zone_id: int,
    name: str,
    type: str,
    values: list[str],
    ttl: int | None = None,
    set_identifier: str = "",
    routing_policy: str = "SIMPLE",
    routing_config: dict | None = None,
    alias_target: dict | None = None,
    is_required: bool = False,
) -> RecordSet:
    record_set = RecordSet(
        record_id=record_id,
        hosted_zone_id=hosted_zone_id,
        name=name,
        type=type,
        set_identifier=set_identifier,
        routing_policy=routing_policy,
        routing_config=routing_config,
        alias_target=alias_target,
        ttl=ttl,
        is_required=is_required,
    )
    session.add(record_set)
    session.flush()

    for ordinal, value in enumerate(values):
        session.add(RecordValue(record_set_id=record_set.id, value=value, ordinal=ordinal))
    session.flush()

    return record_set


def list_by_zone(
    session: Session,
    *,
    hosted_zone_id: int,
    search: str | None,
    types: list[str] | None,
    routing_policy: str | None = None,
    alias: bool | None = None,
    offset: int,
    limit: int,
) -> tuple[list[RecordSet], int]:
    """Search matches name and any value (FR-C4); type is repeatable multi-select
    (FR-C5). routing_policy and alias are single-value filters matching the
    Records tab's dedicated dropdowns (docs/reference/04-records-table.png)."""
    filters = []
    filters.append(RecordSet.hosted_zone_id == hosted_zone_id)
    if types:
        filters.append(RecordSet.type.in_(types))
    if routing_policy:
        filters.append(RecordSet.routing_policy == routing_policy)
    if alias is not None:
        filters.append(RecordSet.alias_target.is_not(None) if alias else RecordSet.alias_target.is_(None))
    if search:
        pattern = f"%{search.lower()}%"
        value_match = RecordSet.id.in_(
            select(RecordValue.record_set_id).where(func.lower(RecordValue.value).like(pattern))
        )
        filters.append(or_(func.lower(RecordSet.name).like(pattern), value_match))

    total = session.scalar(select(func.count()).select_from(RecordSet).where(*filters))

    stmt = (
        select(RecordSet)
        .where(*filters)
        .order_by(RecordSet.name.asc(), RecordSet.type.asc())
        .offset(offset)
        .limit(limit)
    )
    items = list(session.scalars(stmt).all())
    return items, total


def get_by_record_id(session: Session, hosted_zone_id: int, record_id: str) -> RecordSet | None:
    return session.scalar(
        select(RecordSet).where(
            RecordSet.hosted_zone_id == hosted_zone_id, RecordSet.record_id == record_id
        )
    )


def get_by_identity(
    session: Session, hosted_zone_id: int, name: str, type: str, set_identifier: str
) -> RecordSet | None:
    return session.scalar(
        select(RecordSet).where(
            RecordSet.hosted_zone_id == hosted_zone_id,
            RecordSet.name == name,
            RecordSet.type == type,
            RecordSet.set_identifier == set_identifier,
        )
    )


def get_types_at_name(session: Session, hosted_zone_id: int, name: str) -> list[str]:
    """For the CNAME coexistence check (FR-D3) — every type currently present
    at this name in this zone."""
    rows = session.scalars(
        select(RecordSet.type).where(
            RecordSet.hosted_zone_id == hosted_zone_id, RecordSet.name == name
        )
    ).all()
    return list(rows)


def count_by_zone(session: Session, hosted_zone_id: int) -> int:
    return session.scalar(
        select(func.count()).select_from(RecordSet).where(RecordSet.hosted_zone_id == hosted_zone_id)
    )


def count_by_name_type(session: Session, hosted_zone_id: int, name: str, type: str) -> int:
    return session.scalar(
        select(func.count())
        .select_from(RecordSet)
        .where(
            RecordSet.hosted_zone_id == hosted_zone_id,
            RecordSet.name == name,
            RecordSet.type == type,
        )
    )


def replace_values(session: Session, record_set: RecordSet, values: list[str]) -> None:
    for value in list(record_set.values):
        session.delete(value)
    session.flush()
    for ordinal, value in enumerate(values):
        session.add(RecordValue(record_set_id=record_set.id, value=value, ordinal=ordinal))
    session.flush()


def delete(session: Session, record_set: RecordSet) -> None:
    session.delete(record_set)
