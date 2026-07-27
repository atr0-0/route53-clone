"""Semantic validation rules — need a database lookup, so they stay server-only
and surface through the `field` pointer on a 422/400 (DD-9). Syntactic rules
live in grammars.py.
"""

from app.core.errors import InvalidChangeBatchError, InvalidInputError, LimitsExceededError

ZONE_RECORD_SET_QUOTA = 10_000
_NAME_TYPE_QUOTA_OVERRIDES = {"GEOPROXIMITY": 30}
_DEFAULT_NAME_TYPE_QUOTA = 100  # FR-C11a — weighted/latency/geolocation/multivalue/ip-based


def check_wildcard_rules(name: str, type: str) -> None:
    """FR-D4: `*` must replace an entire leftmost label; forbidden on NS."""
    labels = name.split(".")
    for index, label in enumerate(labels):
        if "*" not in label:
            continue
        if label != "*":
            raise InvalidChangeBatchError(
                "The wildcard character * must replace an entire label.", field="name"
            )
        if index != 0:
            raise InvalidChangeBatchError(
                "The wildcard character * is only permitted as the leftmost label.", field="name"
            )
        if type == "NS":
            raise InvalidChangeBatchError(
                "Wildcard names are not permitted for NS records.", field="name"
            )


def check_cname_rules(existing_types_at_name: list[str], new_type: str, *, is_apex: bool) -> None:
    """FR-D3, bidirectional: no CNAME where another type exists, and no other
    type where a CNAME exists. Also: CNAME is forbidden at the zone apex."""
    if new_type == "CNAME":
        if is_apex:
            raise InvalidChangeBatchError(
                "CNAME records are not permitted at the zone apex.", field="type"
            )
        if existing_types_at_name:
            raise InvalidChangeBatchError(
                "A CNAME record cannot coexist with any other record at the same name.",
                field="type",
            )
    elif "CNAME" in existing_types_at_name:
        raise InvalidChangeBatchError(
            "This name already has a CNAME record, which cannot coexist with any other type.",
            field="type",
        )


def check_ns_routing_policy(type: str, routing_policy: str) -> None:
    """FR-C11b: NS records support only Simple routing. The frontend disables
    the control for NS; this is the defensive server-side backstop."""
    if type == "NS" and routing_policy != "SIMPLE":
        raise InvalidInputError(
            "NS records support only the Simple routing policy.", field="routingPolicy"
        )


def check_not_required(is_required: bool) -> None:
    """FR-C16: the SOA and apex NS sets (the only ones with is_required=True,
    per DR-7) cannot be deleted. Non-apex NS records are not required."""
    if is_required:
        raise InvalidChangeBatchError(
            "This record set is required by the hosted zone and cannot be deleted."
        )


def check_zone_record_quota(current_count: int) -> None:
    if current_count >= ZONE_RECORD_SET_QUOTA:
        raise LimitsExceededError(
            f"This hosted zone has reached its limit of {ZONE_RECORD_SET_QUOTA} record sets."
        )


def check_name_type_quota(current_count: int, routing_policy: str) -> None:
    """FR-C11a: quota on sets sharing a name and type, for non-Simple policies."""
    if routing_policy == "SIMPLE":
        return
    limit = _NAME_TYPE_QUOTA_OVERRIDES.get(routing_policy, _DEFAULT_NAME_TYPE_QUOTA)
    if current_count >= limit:
        raise LimitsExceededError(
            f"This name and type has reached its limit of {limit} record sets for "
            f"{routing_policy.title()} routing."
        )
