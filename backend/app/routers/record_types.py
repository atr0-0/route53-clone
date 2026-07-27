from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.record_type import RecordTypeMetadata, RecordTypesResponse
from app.services.validation.grammars import GRAMMARS

router = APIRouter(prefix="/record-types", tags=["record-types"])


@router.get("", response_model=RecordTypesResponse)
def list_record_types(_current_user: User = Depends(get_current_user)) -> dict:
    """FR-D6: the single source of truth for all nine grammars, fetched once
    and cached by the frontend — no grammar is ever duplicated in TypeScript."""
    items = [
        RecordTypeMetadata(
            type=grammar.type,
            pattern=grammar.pattern,
            placeholder=grammar.placeholder,
            help_text=grammar.help_text,
            multi_value=grammar.multi_value,
            max_values=grammar.max_values,
            max_value_length=grammar.max_value_length,
            requires_ttl=grammar.requires_ttl,
        )
        for grammar in GRAMMARS.values()
    ]
    return {"items": items}
