from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.record_set import RecordSet
from app.models.record_value import RecordValue


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
    offset: int,
    limit: int,
) -> tuple[list[RecordSet], int]:
    """List-only for now (Slice 3) — full record CRUD, validation, and quotas are
    Slice 4's scope (services/record_service.py). Search matches name and any
    value (FR-C4); type is repeatable multi-select (FR-C5)."""
    filters = []
    filters.append(RecordSet.hosted_zone_id == hosted_zone_id)
    if types:
        filters.append(RecordSet.type.in_(types))
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
