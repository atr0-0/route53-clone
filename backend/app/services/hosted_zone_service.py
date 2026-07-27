"""Hosted zone domain logic. Services own transaction boundaries (invariant 1).

Slice 1 starts this file with exactly `create_zone()` — the single code path both
`seed.py` and the real create endpoint use, so seeded SOA/NS records are produced
the same way a real create would (Slice 1's acceptance criterion). Slice 3 extends
this file with list/search/filter/update/delete; it does not replace `create_zone`.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hosted_zone import HostedZone
from app.models.record_set import RecordSet
from app.repositories import hosted_zone_repo, record_set_repo
from app.services import generators

SOA_TTL = 900
APEX_NS_TTL = 172800
_MAX_ID_ATTEMPTS = 5


def _unique_zone_id(session: Session) -> str:
    for _ in range(_MAX_ID_ATTEMPTS):
        candidate = generators.generate_zone_id()
        if session.scalar(select(HostedZone.id).where(HostedZone.zone_id == candidate)) is None:
            return candidate
    raise RuntimeError("Could not generate a unique zone_id")


def _unique_record_id(session: Session) -> str:
    for _ in range(_MAX_ID_ATTEMPTS):
        candidate = generators.generate_record_id()
        if session.scalar(select(RecordSet.id).where(RecordSet.record_id == candidate)) is None:
            return candidate
    raise RuntimeError("Could not generate a unique record_id")


def create_zone(
    session: Session,
    *,
    name: str,
    type: str,
    owner_id: int,
    description: str | None = None,
    tags: list[dict[str, str]] | None = None,
) -> HostedZone:
    """Create a zone plus its required SOA and apex NS record sets, atomically (FR-B13)."""
    name_servers = generators.generate_nameservers()

    zone = hosted_zone_repo.create(
        session,
        zone_id=_unique_zone_id(session),
        name=name,
        type=type,
        description=description,
        name_servers=name_servers,
        owner_id=owner_id,
    )
    if tags:
        hosted_zone_repo.add_tags(session, zone, tags)

    record_set_repo.create_with_values(
        session,
        record_id=_unique_record_id(session),
        hosted_zone_id=zone.id,
        name=name,
        type="SOA",
        values=[generators.generate_soa_value(name_servers)],
        ttl=SOA_TTL,
        is_required=True,
    )
    record_set_repo.create_with_values(
        session,
        record_id=_unique_record_id(session),
        hosted_zone_id=zone.id,
        name=name,
        type="NS",
        values=name_servers,
        ttl=APEX_NS_TTL,
        is_required=True,
    )

    session.commit()
    session.refresh(zone)
    return zone
