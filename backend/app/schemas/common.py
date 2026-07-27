"""Shared base for response/request schemas. The API contract uses camelCase on
the wire (zoneId, recordCount, ...); Python stays snake_case. Pydantic v2's
alias_generator does the conversion — never hand-written camelCase mapping."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
