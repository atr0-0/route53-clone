from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import InvalidInputError
from app.models.user import User
from app.repositories import record_set_repo
from app.schemas.bind import ImportContentBody, ImportPreviewResponse
from app.services import hosted_zone_service
from app.services.bind import importer, serializer

router = APIRouter(prefix="/hosted-zones/{zone_id}", tags=["import-export"])


@router.get("/export")
def export_zone(
    zone_id: str,
    format: str = Query(default="bind", pattern="^(bind|json)$"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Response:
    """FR-G2. BIND output must re-import cleanly into an empty zone and
    produce an identical record set — the round-trip guarantee in AC-15."""
    zone = hosted_zone_service.get_zone(db, zone_id)
    record_sets, _total = record_set_repo.list_by_zone(
        db, hosted_zone_id=zone.id, search=None, types=None, offset=0, limit=10_000
    )

    if format == "json":
        content = serializer.to_json(zone, record_sets)
        media_type, extension = "application/json", "json"
    else:
        content = serializer.to_bind(zone, record_sets)
        media_type, extension = "text/dns", "zone"

    filename = f"{zone.name}.{extension}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", response_model=ImportPreviewResponse)
def import_zone_file(
    zone_id: str,
    body: ImportContentBody,
    dry_run: bool = False,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ImportPreviewResponse:
    """FR-G3. `dry_run=true` always returns a preview and writes nothing;
    committing with any `rejected` entry returns 422 and creates nothing —
    import is all-or-nothing."""
    if not body.content.strip():
        raise InvalidInputError("The file is empty.", field="content")

    zone = hosted_zone_service.get_zone(db, zone_id)
    if dry_run:
        return importer.build_preview(db, zone, body.content)
    return importer.commit_import(db, zone, body.content)
