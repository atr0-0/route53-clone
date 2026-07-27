from app.schemas.common import CamelModel


class RecordListItem(CamelModel):
    record_id: str
    name: str
    type: str
    routing_policy: str
    set_identifier: str
    ttl: int | None
    values: list[str]
    alias_target: dict | None
    is_required: bool
