from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hosted_zone import HostedZone
from app.models.hosted_zone_tag import HostedZoneTag


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


def get_by_name(session: Session, name: str) -> HostedZone | None:
    return session.scalar(select(HostedZone).where(HostedZone.name == name))
