from sqlalchemy.orm import Session

from app.models.record_set import RecordSet
from app.models.record_value import RecordValue


def create_with_values(
    session: Session,
    *,
    record_id: str,
    hosted_zone_id: int,
    name: str,
    type: str,
    values: list[str],
    ttl: int | None = None,
    set_identifier: str = "",
    routing_policy: str = "SIMPLE",
    routing_config: dict | None = None,
    alias_target: dict | None = None,
    is_required: bool = False,
) -> RecordSet:
    record_set = RecordSet(
        record_id=record_id,
        hosted_zone_id=hosted_zone_id,
        name=name,
        type=type,
        set_identifier=set_identifier,
        routing_policy=routing_policy,
        routing_config=routing_config,
        alias_target=alias_target,
        ttl=ttl,
        is_required=is_required,
    )
    session.add(record_set)
    session.flush()

    for ordinal, value in enumerate(values):
        session.add(RecordValue(record_set_id=record_set.id, value=value, ordinal=ordinal))
    session.flush()

    return record_set
