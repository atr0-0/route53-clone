from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.pagination import Page, PaginationParams, make_page
from app.models.record_set import RecordSet
from app.models.user import User
from app.schemas.common import ChangeInfo
from app.schemas.record import BulkDeleteRequest, RecordCreate, RecordListItem, RecordMutationResponse, RecordUpdate
from app.services import generators, hosted_zone_service, record_service

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


def _to_mutation_response(record: RecordSet) -> RecordMutationResponse:
    return RecordMutationResponse(
        **_to_list_item(record).model_dump(),
        change_info=ChangeInfo(**generators.generate_change_info()),
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


@router.get("/{record_id}", response_model=RecordListItem)
def get_record(
    zone_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> RecordListItem:
    """Not in the original API contract's endpoint table (which only lists list/
    create/update/delete for records) — added because the edit page needs to
    fetch one record's current values without paging through the full list."""
    zone = hosted_zone_service.get_zone(db, zone_id)
    record = record_service.get_record_by_id(db, zone.id, record_id)
    return _to_list_item(record)


@router.post("", response_model=RecordMutationResponse, status_code=201)
def create_record(
    zone_id: str,
    body: RecordCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> RecordMutationResponse:
    record = record_service.create_record(
        db,
        zone_id=zone_id,
        name=body.name,
        type=body.type,
        values=body.values,
        ttl=body.ttl,
        set_identifier=body.set_identifier,
        routing_policy=body.routing_policy,
        routing_config=body.routing_config,
        alias_target=body.alias_target,
    )
    return _to_mutation_response(record)


@router.patch("/{record_id}", response_model=RecordMutationResponse)
def update_record(
    zone_id: str,
    record_id: str,
    body: RecordUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> RecordMutationResponse:
    record = record_service.update_record(
        db,
        zone_id=zone_id,
        record_id=record_id,
        fields=body.model_dump(exclude_unset=True),
    )
    return _to_mutation_response(record)


@router.delete("/{record_id}", status_code=204)
def delete_record(
    zone_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> None:
    record_service.delete_record(db, zone_id=zone_id, record_id=record_id)


@router.post("/bulk-delete", status_code=204)
def bulk_delete_records(
    zone_id: str,
    body: BulkDeleteRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> None:
    record_service.bulk_delete_records(db, zone_id=zone_id, record_ids=body.record_ids)
