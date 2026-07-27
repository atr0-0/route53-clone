"""Table-driven grammar matrix (NFR-7) — the nine types' valid/invalid values,
including AC-7's specific invalid examples and AC-7a's custom CAA tag."""

import pytest

from app.services.validation.grammars import GRAMMARS

VALID_CASES = [
    ("A", "192.0.2.1"),
    ("AAAA", "2001:0db8:85a3:0:0:8a2e:0370:7334"),
    ("AAAA", "::1"),
    ("CNAME", "hostname.example.com"),
    ("TXT", '"v=spf1 ip4:192.168.0.1/16 -all"'),
    ("TXT", '"first segment" "second segment"'),
    ("MX", "10 mail.example.com"),
    ("NS", "ns-1.example.com"),
    ("PTR", "hostname.example.com"),
    ("SRV", "10 5 80 hostname.example.com"),
    ("CAA", '0 issue "ca.example.net"'),
    ("CAA", '128 exampletag "15555551212"'),  # AC-7a — custom tag, flag 128
]

# AC-7's exact invalid examples, plus a couple of type-specific ones.
INVALID_CASES = [
    ("A", "999.1.1.1"),
    ("AAAA", "not-an-ipv6-address"),
    ("CNAME", "not a valid hostname!"),
    ("TXT", "unquoted spf record"),
    ("MX", "mail.example.com"),  # no priority
    ("NS", "not a valid hostname!"),
    ("PTR", "not a valid hostname!"),
    ("SRV", "10 5 80"),  # 3-field, missing target
    ("CAA", "ca.example.net"),  # value without quotes
]


@pytest.mark.parametrize("type_, value", VALID_CASES)
def test_valid_values_pass(type_, value):
    assert GRAMMARS[type_].validate(value) is None


@pytest.mark.parametrize("type_, value", INVALID_CASES)
def test_invalid_values_fail(type_, value):
    assert GRAMMARS[type_].validate(value) is not None


def test_cname_max_values_is_one():
    """AC-6/FR-C9: multiple values are permitted for every type except CNAME."""
    assert GRAMMARS["CNAME"].max_values == 1
    assert GRAMMARS["CNAME"].multi_value is False


@pytest.mark.parametrize("type_", [t for t in GRAMMARS if t != "CNAME"])
def test_other_types_allow_multiple_values(type_):
    assert GRAMMARS[type_].max_values == 400
    assert GRAMMARS[type_].multi_value is True


def test_all_nine_types_present():
    assert set(GRAMMARS.keys()) == {
        "A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA",
    }
