from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.pagination import Page, PaginationParams, make_page
from app.models.record_set import RecordSet
from app.models.user import User
from app.schemas.record import RecordListItem
from app.services import hosted_zone_service, record_service

router = APIRouter(prefix="/hosted-zones/{zone_id}/records", tags=["records"])


def _to_list_item(record: RecordSet) -> RecordListItem:
    return RecordListItem(
        record_id=record.record_id,
        name=record.name,
        type=record.type,
        routing_policy=record.routing_policy,
        set_identifier=record.set_identifier,
        ttl=record.ttl,
        values=[v.value for v in record.values],
        alias_target=record.alias_target,
        is_required=record.is_required,
    )


@router.get("", response_model=Page[RecordListItem])
def list_records(
    zone_id: str,
    search: str | None = None,
    type: list[str] | None = Query(default=None),
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """List-only (Slice 3, for the zone detail Records tab / AC-2). Create, update,
    delete, and validation are Slice 4 (session C)."""
    zone = hosted_zone_service.get_zone(db, zone_id)
    records, total = record_service.list_records(
        db,
        hosted_zone_id=zone.id,
        search=search,
        types=type,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    items = [_to_list_item(r) for r in records]
    return make_page(items, page=pagination.page, page_size=pagination.page_size, total=total)
