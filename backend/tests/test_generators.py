import re

from app.services import generators


def test_zone_id_format():
    zone_id = generators.generate_zone_id()
    assert re.fullmatch(r"Z[A-Z0-9]{13}", zone_id)


def test_record_id_format():
    record_id = generators.generate_record_id()
    assert re.fullmatch(r"rs_[0-9a-f]{6}", record_id)


def test_change_id_format():
    change_id = generators.generate_change_id()
    assert re.fullmatch(r"C[A-Z0-9]{13}", change_id)


def test_ids_are_not_constant():
    assert len({generators.generate_zone_id() for _ in range(20)}) > 1
    assert len({generators.generate_record_id() for _ in range(20)}) > 1


def test_nameservers_span_four_different_tlds():
    nameservers = generators.generate_nameservers()
    assert len(nameservers) == 4
    tlds = [ns.split(".", 2)[2] for ns in nameservers]
    assert tlds == ["com", "net", "org", "co.uk"]
    assert len(set(tlds)) == 4


def test_nameservers_reproduce_the_documented_numeric_offset():
    """ns-{N}.awsdns-{M} must keep the exact offset from the worked example
    (2048 -> 64, i.e. M = N - 1984 mod 65536), regardless of the random base."""
    nameservers = generators.generate_nameservers()
    for i, ns in enumerate(nameservers):
        match = re.fullmatch(r"ns-(\d+)\.awsdns-(\d+)\.(?:com|net|org|co\.uk)", ns)
        assert match, ns
        n, m = int(match.group(1)), int(match.group(2))
        assert (n - 1984) % 65536 == m


def test_soa_value_format_matches_fr_b13():
    nameservers = generators.generate_nameservers()
    soa = generators.generate_soa_value(nameservers)
    parts = soa.split(" ")
    assert parts[0] == nameservers[0]
    assert parts[1] == "awsdns-hostmaster.amazon.com"
    assert parts[2:] == ["1", "7200", "900", "1209600", "86400"]
