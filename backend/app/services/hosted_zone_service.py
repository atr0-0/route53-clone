"""Hosted zone domain logic. Services own transaction boundaries (invariant 1).

Slice 1 starts this file with exactly `create_zone()` — the single code path both
`seed.py` and the real create endpoint use, so seeded SOA/NS records are produced
the same way a real create would (Slice 1's acceptance criterion). Slice 3 extends
this file with list/search/filter/update; delete is Slice 5.
"""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictingDomainExistsError, InvalidInputError, NoSuchHostedZoneError
from app.models.hosted_zone import HostedZone
from app.models.record_set import RecordSet
from app.repositories import hosted_zone_repo, record_set_repo
from app.services import generators

SOA_TTL = 900
APEX_NS_TTL = 172800
_MAX_ID_ATTEMPTS = 5
_LABEL_MAX_BYTES = 63
_NAME_MAX_BYTES = 255
_PRINTABLE_ASCII_EXCEPT_SPACE = re.compile(r"[\x21-\x7e]+(\.[\x21-\x7e]+)*")


def _validate_and_normalize_name(name: str) -> str:
    """FR-B11: any printable ASCII except space, <=255 bytes total, labels <=63
    bytes, >=2 labels. Trailing dot accepted and stripped; stored lowercased."""
    normalized = name.strip()
    if normalized.endswith("."):
        normalized = normalized[:-1]
    normalized = normalized.lower()

    if not normalized or len(normalized.encode("utf-8")) > _NAME_MAX_BYTES:
        raise InvalidInputError("Domain name must be 1-255 bytes.", field="name")

    labels = normalized.split(".")
    if len(labels) < 2:
        raise InvalidInputError("Domain name must have at least two labels.", field="name")
    for label in labels:
        if not label or len(label.encode("utf-8")) > _LABEL_MAX_BYTES:
            raise InvalidInputError(
                "Each label of the domain name must be 1-63 bytes.", field="name"
            )

    if not _PRINTABLE_ASCII_EXCEPT_SPACE.fullmatch(normalized):
        raise InvalidInputError(
            "Domain name may contain any printable ASCII character except space.", field="name"
        )
    return normalized


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
    normalized_name = _validate_and_normalize_name(name)
    if hosted_zone_repo.get_by_name(session, normalized_name) is not None:
        raise ConflictingDomainExistsError(field="name")

    name_servers = generators.generate_nameservers()

    zone = hosted_zone_repo.create(
        session,
        zone_id=_unique_zone_id(session),
        name=normalized_name,
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
        name=normalized_name,
        type="SOA",
        values=[generators.generate_soa_value(name_servers)],
        ttl=SOA_TTL,
        is_required=True,
    )
    record_set_repo.create_with_values(
        session,
        record_id=_unique_record_id(session),
        hosted_zone_id=zone.id,
        name=normalized_name,
        type="NS",
        values=name_servers,
        ttl=APEX_NS_TTL,
        is_required=True,
    )

    session.commit()
    session.refresh(zone)
    return zone


def list_zones(
    session: Session,
    *,
    search: str | None,
    type: str | None,
    sort: str,
    order: str,
    page: int,
    page_size: int,
) -> tuple[list[tuple[HostedZone, int]], int]:
    offset = (page - 1) * page_size
    return hosted_zone_repo.list_zones(
        session, search=search, type=type, sort=sort, order=order, offset=offset, limit=page_size
    )


def get_zone(session: Session, zone_id: str) -> HostedZone:
    zone = hosted_zone_repo.get_by_zone_id(session, zone_id)
    if zone is None:
        raise NoSuchHostedZoneError()
    return zone


def update_zone(
    session: Session,
    zone_id: str,
    *,
    description: str | None,
    tags: list[dict[str, str]] | None,
) -> HostedZone:
    """Only description and tags are editable (FR-B15). Name and type are immutable
    after insert — this function simply has no parameter for them, so there is no
    code path that could change them."""
    zone = get_zone(session, zone_id)
    zone.description = description
    if tags is not None:
        hosted_zone_repo.replace_tags(session, zone, tags)
    session.commit()
    session.refresh(zone)
    return zone
