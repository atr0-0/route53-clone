"""Record domain logic. Slice 3 starts this file with `list_records()` only, needed
for the zone detail Records tab (AC-2). Slice 4 (session C) extends it with
create/update/delete and the validation grammars — it does not replace this
function."""

from sqlalchemy.orm import Session

from app.models.record_set import RecordSet
from app.repositories import record_set_repo


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
