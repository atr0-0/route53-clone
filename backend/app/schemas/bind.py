from app.schemas.common import CamelModel


class ImportCreateItem(CamelModel):
    name: str
    type: str
    ttl: int | None
    values: list[str]


class ImportSkippedItem(CamelModel):
    line: int
    reason: str


class ImportRejectedItem(CamelModel):
    line: int
    raw: str
    reason: str


class ImportPreviewResponse(CamelModel):
    to_create: list[ImportCreateItem]
    skipped: list[ImportSkippedItem]
    rejected: list[ImportRejectedItem]


class ImportContentBody(CamelModel):
    """Pasted-text alternative to a multipart file upload (06-api-contract.md §6)."""

    content: str
