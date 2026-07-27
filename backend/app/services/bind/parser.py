"""BIND zone-file parsing (FR-G3). Pure and DB-independent — turns text into
structured lines or per-line syntax diagnostics; `bind/importer.py` groups
those lines into record sets and checks them against the same grammars and
semantic rules every other write path uses (DD-9, invariant 6).

Deliberately not a full BIND grammar: no $INCLUDE/$GENERATE, no name/TTL
inheritance from the previous line, no parenthesised multi-line records. FR-G3
asks for `$ORIGIN`, `$TTL`, relative and absolute names, and all nine types —
this covers exactly that, on the reasoning that a hand-written demo zone file
never needs the rest.
"""

import re
from dataclasses import dataclass

from app.services.validation.grammars import GRAMMARS

_HOSTNAME_RDATA_TYPES = {"CNAME", "NS", "PTR"}
_KNOWN_TYPES = set(GRAMMARS) | {"SOA"}
_CLASS_TOKENS = {"IN", "CH", "HS"}


@dataclass
class ParsedRecordLine:
    line_no: int
    raw: str
    # Relative to the file's own $ORIGIN — "" for the apex, "www" for a `www`
    # record. The importer re-qualifies this against whatever zone is
    # actually being imported into (see _relative_name).
    name: str
    ttl: int | None
    type: str
    value: str


@dataclass
class ParseError:
    line_no: int
    raw: str
    reason: str


def _strip_comment(line: str) -> str:
    """A `;` starts a comment, unless it's inside a double-quoted segment
    (TXT/CAA values quote their content)."""
    in_quotes = False
    for index, char in enumerate(line):
        if char == '"':
            in_quotes = not in_quotes
        elif char == ";" and not in_quotes:
            return line[:index]
    return line


def _resolve_name(token: str, origin: str) -> str:
    """Fully-qualified, dot-less form — for rdata hostnames (CNAME/NS/PTR
    targets, MX/SRV hosts), which are literal values, not zone-relative
    identities. Absolute (trailing dot) tokens are stripped as-is; relative
    ones are qualified against `$ORIGIN`; `@` means the apex."""
    if token == "@":
        return origin
    if token.endswith("."):
        return token[:-1].lower()
    return f"{token}.{origin}".lower()


def _relative_name(token: str, origin: str) -> str:
    """For the record's own name column: returns the label(s) *relative to
    `origin`* — "" for the apex, "www" for `www`/`www.<origin>.` alike — so
    the importer can re-qualify against whatever zone the file is actually
    being imported into, rather than baking in the exporting zone's name
    (which is what `_resolve_name` would do, and is wrong here: importing
    zone A's export into zone B must produce B's names, not `<name>.A.B`)."""
    fqdn = _resolve_name(token, origin)
    origin_lower = origin.lower()
    if fqdn == origin_lower:
        return ""
    suffix = f".{origin_lower}"
    if fqdn.endswith(suffix):
        return fqdn[: -len(suffix)]
    # Absolute name outside the file's own origin — keep it as given; it will
    # fail to resolve sensibly against the target zone and surface as a
    # rejected/invalid name downstream rather than silently mis-qualifying.
    return fqdn


def parse_bind(content: str, *, default_origin: str) -> tuple[list[ParsedRecordLine], list[ParseError]]:
    """`default_origin` seeds the origin before any `$ORIGIN` directive is
    seen — in practice the zone being imported into, so a file with no
    `$ORIGIN` at all still resolves relative names sensibly."""
    lines: list[ParsedRecordLine] = []
    errors: list[ParseError] = []
    origin = default_origin
    default_ttl: int | None = None

    for line_no, raw_line in enumerate(content.splitlines(), start=1):
        line = _strip_comment(raw_line).strip()
        if not line:
            continue

        if line.startswith("$ORIGIN"):
            parts = line.split(None, 1)
            if len(parts) == 2:
                token = parts[1].strip()
                origin = token[:-1].lower() if token.endswith(".") else f"{token}.{origin}".lower()
            continue

        if line.startswith("$TTL"):
            parts = line.split(None, 1)
            if len(parts) == 2 and parts[1].strip().isdigit():
                default_ttl = int(parts[1].strip())
            continue

        tokens = line.split()
        if len(tokens) < 3:
            errors.append(ParseError(line_no, raw_line, "Expected \"<name> [ttl] [class] <type> <rdata>\"."))
            continue

        name_token, rest = tokens[0], tokens[1:]

        # Real BIND allows TTL and class in either order before the type, both
        # optional — scan forward past them until a recognized type token ends
        # the prefix; everything after that is rdata.
        ttl = default_ttl
        type_index = None
        unrecognized_token: str | None = None
        for index, token in enumerate(rest):
            upper = token.upper()
            if upper in _CLASS_TOKENS:
                continue
            if token.isdigit():
                ttl = int(token)
                continue
            if upper in _KNOWN_TYPES:
                type_index = index
                break
            unrecognized_token = token
            break

        if type_index is None:
            reason = (
                f'Unrecognized record type "{unrecognized_token}".'
                if unrecognized_token
                else "No record type found on this line."
            )
            errors.append(ParseError(line_no, raw_line, reason))
            continue

        record_type = rest[type_index].upper()
        rdata_tokens = rest[type_index + 1 :]
        if not rdata_tokens:
            errors.append(ParseError(line_no, raw_line, f"{record_type} record has no value."))
            continue
        if ttl is None:
            errors.append(ParseError(line_no, raw_line, "No TTL given and no $TTL directive set yet."))
            continue

        name = _relative_name(name_token, origin)
        value, value_error = _build_value(record_type, rdata_tokens, origin)
        if value_error:
            errors.append(ParseError(line_no, raw_line, value_error))
            continue

        lines.append(ParsedRecordLine(line_no=line_no, raw=raw_line, name=name, ttl=ttl, type=record_type, value=value))

    return lines, errors


_LEADING_INT_RE = re.compile(r"^\d+$")


def _build_value(record_type: str, rdata_tokens: list[str], origin: str) -> tuple[str, str | None]:
    """Reassembles rdata tokens into our internal per-value string — the same
    shape `record_service.create_record` expects, so a parsed line and a
    hand-typed console value are indistinguishable downstream."""
    if record_type == "SOA":
        return " ".join(rdata_tokens), None

    if record_type in _HOSTNAME_RDATA_TYPES:
        if len(rdata_tokens) != 1:
            return "", f"{record_type} takes a single target hostname."
        return _resolve_name(rdata_tokens[0], origin), None

    if record_type == "MX":
        if len(rdata_tokens) != 2 or not _LEADING_INT_RE.match(rdata_tokens[0]):
            return "", "MX requires \"<priority> <hostname>\"."
        return f"{rdata_tokens[0]} {_resolve_name(rdata_tokens[1], origin)}", None

    if record_type == "SRV":
        if len(rdata_tokens) != 4 or not all(_LEADING_INT_RE.match(t) for t in rdata_tokens[:3]):
            return "", "SRV requires \"<priority> <weight> <port> <target>\"."
        priority, weight, port, target = rdata_tokens
        return f"{priority} {weight} {port} {_resolve_name(target, origin)}", None

    # A, AAAA, TXT, CAA: our internal value format already matches BIND rdata
    # syntax token-for-token, so rejoining the remaining tokens is enough.
    return " ".join(rdata_tokens), None
