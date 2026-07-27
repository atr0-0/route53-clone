from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.pagination import Page, PaginationParams, make_page
from app.models.hosted_zone import HostedZone
from app.models.user import User
from app.repositories import hosted_zone_repo
from app.schemas.common import ChangeInfo
from app.schemas.hosted_zone import (
    HostedZoneCreate,
    HostedZoneCreateResponse,
    HostedZoneDetail,
    HostedZoneListItem,
    HostedZoneUpdate,
)
from app.services import generators, hosted_zone_service

router = APIRouter(prefix="/hosted-zones", tags=["hosted-zones"])


def _to_list_item(zone: HostedZone, count: int) -> HostedZoneListItem:
    return HostedZoneListItem(
        zone_id=zone.zone_id,
        name=zone.name,
        type=zone.type,
        description=zone.description,
        record_count=count,
        created_by=zone.owner.display_name,
        created_at=zone.created_at,
    )


def _to_detail(zone: HostedZone, count: int) -> HostedZoneDetail:
    return HostedZoneDetail(
        zone_id=zone.zone_id,
        name=zone.name,
        type=zone.type,
        description=zone.description,
        record_count=count,
        created_by=zone.owner.display_name,
        created_at=zone.created_at,
        name_servers=zone.name_servers,
        tags=[{"key": t.key, "value": t.value} for t in zone.tags],
    )


@router.get("", response_model=Page[HostedZoneListItem])
def list_hosted_zones(
    search: str | None = None,
    type: Literal["PUBLIC", "PRIVATE"] | None = None,
    sort: Literal["name", "recordCount", "type", "createdAt"] = "name",
    order: Literal["asc", "desc"] = "asc",
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> dict:
    rows, total = hosted_zone_service.list_zones(
        db,
        search=search,
        type=type,
        sort=sort,
        order=order,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    items = [_to_list_item(zone, count) for zone, count in rows]
    return make_page(items, page=pagination.page, page_size=pagination.page_size, total=total)


@router.post("", response_model=HostedZoneCreateResponse, status_code=201)
def create_hosted_zone(
    body: HostedZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HostedZoneCreateResponse:
    zone = hosted_zone_service.create_zone(
        db,
        name=body.name,
        type=body.type,
        owner_id=current_user.id,
        description=body.description,
        tags=[tag.model_dump() for tag in body.tags],
    )
    detail = _to_detail(zone, count=len(zone.record_sets))
    return HostedZoneCreateResponse(
        **detail.model_dump(), change_info=ChangeInfo(**generators.generate_change_info())
    )


@router.get("/{zone_id}", response_model=HostedZoneDetail)
def get_hosted_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> HostedZoneDetail:
    zone = hosted_zone_service.get_zone(db, zone_id)
    return _to_detail(zone, hosted_zone_repo.record_count(db, zone.id))


@router.patch("/{zone_id}", response_model=HostedZoneDetail)
def update_hosted_zone(
    zone_id: str,
    body: HostedZoneUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> HostedZoneDetail:
    zone = hosted_zone_service.update_zone(
        db,
        zone_id,
        description=body.description,
        tags=[tag.model_dump() for tag in body.tags] if body.tags is not None else None,
    )
    return _to_detail(zone, hosted_zone_repo.record_count(db, zone.id))


@router.delete("/{zone_id}", status_code=204)
def delete_hosted_zone(
    zone_id: str,
    cascade: bool = False,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> None:
    """FR-B18/FR-B18a: 409 HostedZoneNotEmpty unless `cascade=true`, in which
    case every record set, value, and tag is deleted atomically with the zone."""
    hosted_zone_service.delete_zone(db, zone_id, cascade=cascade)
