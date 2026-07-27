"""The nine record-type value grammars — the single source of truth (FR-D6, DD-9).

Reached two ways: used directly here for server-side enforcement, and served
via `GET /record-types` for the frontend's inline validation. No grammar is
ever duplicated in TypeScript. Patterns are deliberately approximate where a
regex can't express the real rule (e.g. IPv4/IPv6 octet ranges) — DD-9's
"client-side rules limited to what a regex can express." The real check is
each grammar's `validate()` function, called server-side only.
"""

import ipaddress
import re
from collections.abc import Callable
from dataclasses import dataclass

_HOSTNAME_LABEL = r"[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
_HOSTNAME_RE = re.compile(rf"^{_HOSTNAME_LABEL}(\.{_HOSTNAME_LABEL})*\.?$")

MAX_VALUE_LENGTH = 4000  # DR-3 / FR-D1 (TXT), applied as the general ceiling
DEFAULT_MAX_VALUES = 400  # FR-D5 — every type except CNAME


def is_valid_hostname(value: str) -> bool:
    return bool(value) and len(value) <= 255 and bool(_HOSTNAME_RE.fullmatch(value))


@dataclass(frozen=True)
class Grammar:
    type: str
    pattern: str
    placeholder: str
    help_text: str
    multi_value: bool
    max_values: int
    max_value_length: int
    requires_ttl: bool
    validate: Callable[[str], str | None]  # error message, or None if valid


def _validate_a(value: str) -> str | None:
    try:
        ipaddress.IPv4Address(value)
    except ValueError:
        return "Enter a valid IPv4 address, e.g. 192.0.2.1."
    return None


def _validate_aaaa(value: str) -> str | None:
    try:
        ipaddress.IPv6Address(value)
    except ValueError:
        return "Enter a valid IPv6 address, e.g. 2001:0db8:85a3:0:0:8a2e:0370:7334."
    return None


def _validate_hostname_value(value: str) -> str | None:
    if not is_valid_hostname(value):
        return "Enter a valid domain name, e.g. hostname.example.com."
    return None


_MX_RE = re.compile(r"^(\d{1,5})\s+(\S+)$")


def _validate_mx(value: str) -> str | None:
    match = _MX_RE.fullmatch(value)
    if not match:
        return 'Enter "<priority> <domain>", e.g. 10 mail.example.com.'
    priority, domain = match.groups()
    if not (0 <= int(priority) <= 65535):
        return "Priority must be between 0 and 65535."
    if not is_valid_hostname(domain):
        return "Enter a valid mail server domain name."
    return None


_SRV_RE = re.compile(r"^(\d{1,5})\s+(\d{1,5})\s+(\d{1,5})\s+(\S+)$")


def _validate_srv(value: str) -> str | None:
    match = _SRV_RE.fullmatch(value)
    if not match:
        return 'Enter "<priority> <weight> <port> <target>", e.g. 10 5 80 hostname.example.com.'
    priority, weight, port, target = match.groups()
    for n in (priority, weight, port):
        if not (0 <= int(n) <= 65535):
            return "Priority, weight, and port must each be between 0 and 65535."
    if not is_valid_hostname(target):
        return "Enter a valid target domain name."
    return None


# AC-7a: tag is any A-Z/a-z/0-9 string, not a fixed enum — AWS documents custom
# tags with flag 128, so the grammar must not restrict to issue/issuewild/iodef.
_CAA_RE = re.compile(r'^(\d{1,3})\s+([A-Za-z0-9]+)\s+"([^"]*)"$')


def _validate_caa(value: str) -> str | None:
    match = _CAA_RE.fullmatch(value)
    if not match:
        return 'Enter "<flags> <tag> \\"<value>\\"", e.g. 0 issue "ca.example.net".'
    flags, _tag, _value = match.groups()
    if not (0 <= int(flags) <= 255):
        return "Flags must be between 0 and 255."
    return None


_QUOTED_SEGMENT_RE = re.compile(r'"([^"]{0,255})"')


def _validate_txt(value: str) -> str | None:
    if len(value) > MAX_VALUE_LENGTH:
        return f"TXT values must be {MAX_VALUE_LENGTH} characters or fewer."
    stripped = value.strip()
    segments = _QUOTED_SEGMENT_RE.findall(stripped)
    reconstructed = " ".join(f'"{s}"' for s in segments)
    if not segments or reconstructed != stripped:
        return 'Enter one or more double-quoted strings, e.g. "v=spf1 -all".'
    return None


def _validate_cname(value: str) -> str | None:
    if not is_valid_hostname(value):
        return "Enter a valid domain name, e.g. hostname.example.com."
    return None


GRAMMARS: dict[str, Grammar] = {
    "A": Grammar(
        type="A",
        pattern=r"^(\d{1,3}\.){3}\d{1,3}$",
        placeholder="192.0.2.1",
        help_text="An IPv4 address in dotted-quad notation.",
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_a,
    ),
    "AAAA": Grammar(
        type="AAAA",
        pattern=r"^[0-9A-Fa-f:]+$",
        placeholder="2001:0db8:85a3:0:0:8a2e:0370:7334",
        help_text="An IPv6 address, full or :: compressed.",
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_aaaa,
    ),
    "CNAME": Grammar(
        type="CNAME",
        pattern=_HOSTNAME_RE.pattern,
        placeholder="hostname.example.com",
        help_text=(
            "A single domain name. Forbidden at the zone apex; cannot coexist with "
            "any other record at the same name."
        ),
        multi_value=False,
        max_values=1,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_cname,
    ),
    "TXT": Grammar(
        type="TXT",
        pattern=r'^"[^"]{0,255}"(\s*"[^"]{0,255}")*$',
        placeholder='"v=spf1 include:_spf.google.com ~all"',
        help_text=(
            "One or more double-quoted strings, each 255 characters or fewer, "
            "totalling 4000 or fewer."
        ),
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_txt,
    ),
    "MX": Grammar(
        type="MX",
        pattern=r"^\d{1,5}\s+\S+$",
        placeholder="10 mail.example.com",
        help_text="Priority (0-65535) followed by the mail server domain name.",
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_mx,
    ),
    "NS": Grammar(
        type="NS",
        pattern=_HOSTNAME_RE.pattern,
        placeholder="ns-1.example.com",
        help_text="A valid domain name.",
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_hostname_value,
    ),
    "PTR": Grammar(
        type="PTR",
        pattern=_HOSTNAME_RE.pattern,
        placeholder="hostname.example.com",
        help_text="A valid domain name.",
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_hostname_value,
    ),
    "SRV": Grammar(
        type="SRV",
        pattern=r"^\d{1,5}\s+\d{1,5}\s+\d{1,5}\s+\S+$",
        placeholder="10 5 80 hostname.example.com",
        help_text="Priority, weight, port, and target domain name, each separated by a space.",
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_srv,
    ),
    "CAA": Grammar(
        type="CAA",
        pattern=r'^\d{1,3}\s+[A-Za-z0-9]+\s+"[^"]*"$',
        placeholder='0 issue "ca.example.net"',
        help_text=(
            'Flags, a tag (any letters/digits — AWS permits custom tags), and a '
            "double-quoted value."
        ),
        multi_value=True,
        max_values=DEFAULT_MAX_VALUES,
        max_value_length=MAX_VALUE_LENGTH,
        requires_ttl=True,
        validate=_validate_caa,
    ),
}
