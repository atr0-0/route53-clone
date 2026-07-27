from app.schemas.common import CamelModel


class RecordTypeMetadata(CamelModel):
    type: str
    pattern: str
    placeholder: str
    help_text: str
    multi_value: bool
    max_values: int
    max_value_length: int
    requires_ttl: bool


class RecordTypesResponse(CamelModel):
    items: list[RecordTypeMetadata]
