from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.hosted_zone import HostedZone
from app.models.hosted_zone_tag import HostedZoneTag
from app.models.record_set import RecordSet

_SORT_COLUMNS = {
    "name": HostedZone.name,
    "type": HostedZone.type,
    "createdAt": HostedZone.created_at,
    # "recordCount" is resolved in list_zones against the labeled subquery, since it
    # isn't a plain column on the table.
}


def create(
    session: Session,
    *,
    zone_id: str,
    name: str,
    type: str,
    description: str | None,
    name_servers: list[str],
    owner_id: int,
) -> HostedZone:
    zone = HostedZone(
        zone_id=zone_id,
        name=name,
        type=type,
        description=description,
        name_servers=name_servers,
        owner_id=owner_id,
    )
    session.add(zone)
    session.flush()
    return zone


def add_tags(session: Session, hosted_zone: HostedZone, tags: list[dict[str, str]]) -> None:
    for tag in tags:
        session.add(HostedZoneTag(hosted_zone_id=hosted_zone.id, key=tag["key"], value=tag["value"]))
    session.flush()


def replace_tags(session: Session, hosted_zone: HostedZone, tags: list[dict[str, str]]) -> None:
    session.execute(delete(HostedZoneTag).where(HostedZoneTag.hosted_zone_id == hosted_zone.id))
    add_tags(session, hosted_zone, tags)


def get_by_name(session: Session, name: str) -> HostedZone | None:
    return session.scalar(select(HostedZone).where(HostedZone.name == name))


def get_by_zone_id(session: Session, zone_id: str) -> HostedZone | None:
    return session.scalar(
        select(HostedZone).options(joinedload(HostedZone.owner)).where(HostedZone.zone_id == zone_id)
    )


def record_count(session: Session, hosted_zone_id: int) -> int:
    return session.scalar(
        select(func.count()).select_from(RecordSet).where(RecordSet.hosted_zone_id == hosted_zone_id)
    )


def count_non_required_records(session: Session, hosted_zone_id: int) -> int:
    """FR-B18: a zone "holds nothing beyond its required SOA and NS sets" means
    this is zero — the exact condition (non-)cascade delete checks."""
    return session.scalar(
        select(func.count())
        .select_from(RecordSet)
        .where(RecordSet.hosted_zone_id == hosted_zone_id, RecordSet.is_required.is_(False))
    )


def list_zones(
    session: Session,
    *,
    search: str | None,
    type: str | None,
    sort: str,
    order: str,
    offset: int,
    limit: int,
) -> tuple[list[tuple[HostedZone, int]], int]:
    """Returns `(zone, record_count)` pairs for the page, plus the total matching
    count (FR-B3, FR-B4, FR-B5, FR-B6). `record_count` is a correlated subquery so
    it's sortable server-side, not computed in Python after the fact."""
    record_count_subq = (
        select(func.count(RecordSet.id))
        .where(RecordSet.hosted_zone_id == HostedZone.id)
        .correlate(HostedZone)
        .scalar_subquery()
    )

    filters = []
    if search:
        pattern = f"%{search.lower()}%"
        filters.append(
            or_(
                func.lower(HostedZone.name).like(pattern),
                func.lower(func.coalesce(HostedZone.description, "")).like(pattern),
            )
        )
    if type:
        filters.append(HostedZone.type == type)

    base = select(HostedZone, record_count_subq.label("record_count")).options(
        joinedload(HostedZone.owner)
    )
    for f in filters:
        base = base.where(f)

    sort_column = record_count_subq if sort == "recordCount" else _SORT_COLUMNS[sort]
    base = base.order_by(sort_column.desc() if order == "desc" else sort_column.asc())

    total = session.scalar(
        select(func.count()).select_from(HostedZone).where(*filters) if filters else select(func.count()).select_from(HostedZone)
    )

    rows = session.execute(base.offset(offset).limit(limit)).all()
    return [(row[0], row[1]) for row in rows], total
