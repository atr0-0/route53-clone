"""Runtime generators for zone IDs, nameservers, SOA values, change IDs, and record IDs (DR-12).

Computed per zone at creation time, never seeded, stable once generated. Formats are
[UNVERIFIED format] — see 05-data-model.md §5 "Generated identifier formats" for the
worked examples these match and the rationale for each choice.
"""

import random
import string

_ALNUM = string.ascii_uppercase + string.digits
_HEX = string.hexdigits[:16].lower()

_NAMESERVER_TLDS = ("com", "net", "org", "co.uk")
_NAMESERVER_OFFSET = -1984  # reproduces the worked example: 2048 -> 64 (2048 - 1984 = 64)
_MODULUS = 65536

SOA_HOSTMASTER = "awsdns-hostmaster.amazon.com"
SOA_REFRESH = 7200
SOA_RETRY = 900
SOA_EXPIRE = 1209600
SOA_MINIMUM = 86400


def generate_zone_id() -> str:
    """`Z` + 13 random [A-Z0-9] chars, matching the `Z1D633PJN98FT9` example."""
    return "Z" + "".join(random.choices(_ALNUM, k=13))


def generate_record_id() -> str:
    """`rs_` + 6 random lowercase hex chars, matching the `rs_8f21c4` example."""
    return "rs_" + "".join(random.choices(_HEX, k=6))


def generate_change_id() -> str:
    """`C` + 13 random [A-Z0-9] chars, matching the `C2682N5HXP0BZ4` example."""
    return "C" + "".join(random.choices(_ALNUM, k=13))


def generate_nameservers() -> list[str]:
    """Four delegation nameservers across four TLDs, sequentially numbered.

    Picks a random base per zone so two zones never collide, while reproducing the
    real Route53 pattern's exact numeric offset between the ns-number and the
    awsdns-number (DR-12).
    """
    base = random.randint(0, _MODULUS - 1)
    return [
        f"ns-{(base + i) % _MODULUS}.awsdns-{(base + _NAMESERVER_OFFSET + i) % _MODULUS}.{tld}"
        for i, tld in enumerate(_NAMESERVER_TLDS)
    ]


def generate_soa_value(nameservers: list[str]) -> str:
    """SOA rdata: `<ns> <hostmaster> <serial> <refresh> <retry> <expire> <minimum>` (FR-B13)."""
    primary_ns = nameservers[0]
    serial = 1
    return (
        f"{primary_ns} {SOA_HOSTMASTER} {serial} "
        f"{SOA_REFRESH} {SOA_RETRY} {SOA_EXPIRE} {SOA_MINIMUM}"
    )
