"""Records -> BIND / JSON (FR-G2). The counterpart to bind/parser.py — together
they make export-then-import round-trip to an identical record set (AC-15)
rather than merely producing similar-looking text.

Alias records are skipped in BIND output: BIND has no native representation
for an ALIAS target, and nothing here ever resolves one anyway
(03-assumptions-mocked-data-notes.md — aliases are mocked, display-only).
"""

import json

from app.models.hosted_zone import HostedZone
from app.models.record_set import RecordSet

_HOSTNAME_RDATA_TYPES = {"CNAME", "NS", "PTR"}


def _qualify(name: str) -> str:
    return f"{name}."


def _rdata_for_value(record_type: str, value: str) -> str:
    if record_type in _HOSTNAME_RDATA_TYPES:
        return _qualify(value)
    if record_type == "MX":
        priority, host = value.split(" ", 1)
        return f"{priority} {_qualify(host)}"
    if record_type == "SRV":
        priority, weight, port, host = value.split(" ", 3)
        return f"{priority} {weight} {port} {_qualify(host)}"
    # A, AAAA, TXT, CAA: already in final rdata form.
    return value


def to_bind(zone: HostedZone, record_sets: list[RecordSet]) -> str:
    lines = [f"$ORIGIN {_qualify(zone.name)}", ""]
    for record in sorted(record_sets, key=lambda r: (r.name, r.type, r.set_identifier)):
        if record.alias_target is not None:
            continue
        name = _qualify(record.name)
        for value in (v.value for v in sorted(record.values, key=lambda v: v.ordinal)):
            rdata = _rdata_for_value(record.type, value)
            lines.append(f"{name}\t{record.ttl}\tIN\t{record.type}\t{rdata}")
    return "\n".join(lines) + "\n"


def to_json(zone: HostedZone, record_sets: list[RecordSet]) -> str:
    items = [
        {
            "name": record.name,
            "type": record.type,
            "ttl": record.ttl,
            "setIdentifier": record.set_identifier,
            "routingPolicy": record.routing_policy,
            "values": [v.value for v in sorted(record.values, key=lambda v: v.ordinal)],
            "aliasTarget": record.alias_target,
        }
        for record in sorted(record_sets, key=lambda r: (r.name, r.type, r.set_identifier))
    ]
    return json.dumps({"zone": zone.name, "records": items}, indent=2)
