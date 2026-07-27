from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import CamelModel, ChangeInfo


class TagInput(BaseModel):
    key: str
    value: str


class TagResponse(CamelModel):
    key: str
    value: str


class HostedZoneCreate(BaseModel):
    name: str
    type: Literal["PUBLIC", "PRIVATE"] = "PUBLIC"
    description: str | None = Field(default=None, max_length=256)
    tags: list[TagInput] = Field(default_factory=list)


class HostedZoneUpdate(BaseModel):
    # extra="forbid": sending name/type is rejected with 422 rather than silently
    # ignored — Route53 treats both as immutable (FR-B15, matching the API contract).
    model_config = ConfigDict(extra="forbid")

    description: str | None = Field(default=None, max_length=256)
    tags: list[TagInput] | None = None


class HostedZoneListItem(CamelModel):
    zone_id: str
    name: str
    type: str
    description: str | None
    record_count: int
    created_by: str
    created_at: datetime


class HostedZoneDetail(HostedZoneListItem):
    name_servers: list[str]
    tags: list[TagResponse]


class HostedZoneCreateResponse(HostedZoneDetail):
    # 06-api-contract.md §7: zone create — like every record mutation — returns a
    # mocked change object (FR-C17). GET/PATCH/DELETE don't: they aren't DNS
    # changes (comment/tag edits, deletes), matching real Route53.
    change_info: ChangeInfo
