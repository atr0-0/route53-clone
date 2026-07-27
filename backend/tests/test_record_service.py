import pytest

from app.core.errors import (
    InvalidChangeBatchError,
    InvalidInputError,
    LimitsExceededError,
    NoSuchRecordError,
    RecordSetAlreadyExistsError,
)
from app.core.security import hash_password
from app.repositories import record_set_repo, user_repo
from app.services import hosted_zone_service, record_service
from app.services.validation import semantic


@pytest.fixture()
def zone(db_session):
    user = user_repo.create(
        db_session, email="record-owner@example.com", password_hash=hash_password("pw"), display_name="Owner"
    )
    db_session.commit()
    return hosted_zone_service.create_zone(db_session, name="record-test.com", type="PUBLIC", owner_id=user.id)


def test_create_record_two_values_one_row(db_session, zone):
    """AC-6: an A record `www` with two IPs is one row holding both values."""
    record = record_service.create_record(
        db_session, zone_id=zone.zone_id, name="www", type="A", values=["192.0.2.1", "192.0.2.2"], ttl=300
    )
    assert [v.value for v in record.values] == ["192.0.2.1", "192.0.2.2"]
    assert record.name == "www.record-test.com"


def test_bare_prefix_and_full_name_normalize_the_same(db_session, zone):
    a = record_service.create_record(
        db_session, zone_id=zone.zone_id, name="api", type="A", values=["192.0.2.1"], ttl=300
    )
    assert a.name == "api.record-test.com"


def test_blank_name_means_apex(db_session, zone):
    record = record_service.create_record(
        db_session, zone_id=zone.zone_id, name="", type="TXT", values=['"apex txt"'], ttl=300
    )
    assert record.name == zone.name


def test_duplicate_identity_returns_conflict(db_session, zone):
    record_service.create_record(
        db_session, zone_id=zone.zone_id, name="www", type="A", values=["192.0.2.1"], ttl=300
    )
    with pytest.raises(RecordSetAlreadyExistsError):
        record_service.create_record(
            db_session, zone_id=zone.zone_id, name="www", type="A", values=["192.0.2.2"], ttl=300
        )


def test_cname_forbidden_at_apex(db_session, zone):
    with pytest.raises(InvalidChangeBatchError):
        record_service.create_record(
            db_session, zone_id=zone.zone_id, name="", type="CNAME", values=["target.example.com"], ttl=300
        )


def test_cname_coexistence_both_directions(db_session, zone):
    """AC-8: an A record blocks a later CNAME at the same name, and a CNAME
    blocks a later record of any other type at its name."""
    record_service.create_record(
        db_session, zone_id=zone.zone_id, name="blog", type="A", values=["192.0.2.1"], ttl=300
    )
    with pytest.raises(InvalidChangeBatchError):
        record_service.create_record(
            db_session, zone_id=zone.zone_id, name="blog", type="CNAME", values=["target.example.com"], ttl=300
        )

    record_service.create_record(
        db_session, zone_id=zone.zone_id, name="shop", type="CNAME", values=["target.example.com"], ttl=300
    )
    with pytest.raises(InvalidChangeBatchError):
        record_service.create_record(
            db_session, zone_id=zone.zone_id, name="shop", type="TXT", values=['"hello"'], ttl=300
        )


def test_wildcard_must_replace_entire_label(db_session, zone):
    with pytest.raises(InvalidChangeBatchError):
        record_service.create_record(
            db_session, zone_id=zone.zone_id, name="*prod", type="A", values=["192.0.2.1"], ttl=300
        )


def test_wildcard_forbidden_on_ns(db_session, zone):
    with pytest.raises(InvalidChangeBatchError):
        record_service.create_record(
            db_session,
            zone_id=zone.zone_id,
            name="*",
            type="NS",
            values=["ns-1.example.com"],
            ttl=172800,
        )


def test_wildcard_leftmost_label_is_valid(db_session, zone):
    record = record_service.create_record(
        db_session, zone_id=zone.zone_id, name="*", type="A", values=["192.0.2.1"], ttl=300
    )
    assert record.name.startswith("*.")


def test_ns_forces_simple_routing(db_session, zone):
    with pytest.raises(InvalidInputError):
        record_service.create_record(
            db_session,
            zone_id=zone.zone_id,
            name="delegated",
            type="NS",
            values=["ns-1.example.com"],
            ttl=172800,
            routing_policy="WEIGHTED",
        )


def test_zone_record_quota(db_session, zone, monkeypatch):
    monkeypatch.setattr(record_set_repo, "count_by_zone", lambda *a, **k: semantic.ZONE_RECORD_SET_QUOTA)
    with pytest.raises(LimitsExceededError):
        record_service.create_record(
            db_session, zone_id=zone.zone_id, name="quota-test", type="A", values=["192.0.2.1"], ttl=300
        )


def test_name_type_quota_for_non_simple_policy(db_session, zone, monkeypatch):
    monkeypatch.setattr(record_set_repo, "count_by_name_type", lambda *a, **k: 100)
    with pytest.raises(LimitsExceededError):
        record_service.create_record(
            db_session,
            zone_id=zone.zone_id,
            name="weighted-test",
            type="A",
            values=["192.0.2.1"],
            ttl=300,
            routing_policy="WEIGHTED",
            set_identifier="a",
        )


def test_update_record_replaces_values_and_ttl(db_session, zone):
    record = record_service.create_record(
        db_session, zone_id=zone.zone_id, name="www", type="A", values=["192.0.2.1"], ttl=300
    )
    updated = record_service.update_record(
        db_session,
        zone_id=zone.zone_id,
        record_id=record.record_id,
        fields={"values": ["192.0.2.9", "192.0.2.10"], "ttl": 600},
    )
    assert [v.value for v in updated.values] == ["192.0.2.9", "192.0.2.10"]
    assert updated.ttl == 600


def test_update_record_rejects_invalid_value(db_session, zone):
    record = record_service.create_record(
        db_session, zone_id=zone.zone_id, name="www", type="A", values=["192.0.2.1"], ttl=300
    )
    with pytest.raises(InvalidInputError):
        record_service.update_record(
            db_session, zone_id=zone.zone_id, record_id=record.record_id, fields={"values": ["not-an-ip"]}
        )


def test_delete_required_record_is_rejected(db_session, zone):
    """AC-9: SOA and apex NS deletion is rejected."""
    soa = next(rs for rs in zone.record_sets if rs.type == "SOA")
    ns = next(rs for rs in zone.record_sets if rs.type == "NS")
    with pytest.raises(InvalidChangeBatchError):
        record_service.delete_record(db_session, zone_id=zone.zone_id, record_id=soa.record_id)
    with pytest.raises(InvalidChangeBatchError):
        record_service.delete_record(db_session, zone_id=zone.zone_id, record_id=ns.record_id)


def test_delete_subdomain_ns_succeeds(db_session, zone):
    """AC-9: a subdomain NS record (delegation), not the apex, is deletable."""
    subdomain_ns = record_service.create_record(
        db_session,
        zone_id=zone.zone_id,
        name="delegated",
        type="NS",
        values=["ns-1.example.com", "ns-2.example.com"],
        ttl=172800,
    )
    record_service.delete_record(db_session, zone_id=zone.zone_id, record_id=subdomain_ns.record_id)
    with pytest.raises(NoSuchRecordError):
        record_service.get_record_by_id(db_session, zone.id, subdomain_ns.record_id)


def test_alias_record_omits_ttl_and_values(db_session, zone):
    record = record_service.create_record(
        db_session,
        zone_id=zone.zone_id,
        name="cdn",
        type="A",
        values=[],
        ttl=None,
        alias_target={"type": "cloudfront", "target": "d123.cloudfront.net"},
    )
    assert record.ttl is None
    assert record.alias_target == {"type": "cloudfront", "target": "d123.cloudfront.net"}


def test_alias_record_rejects_ttl(db_session, zone):
    with pytest.raises(InvalidInputError):
        record_service.create_record(
            db_session,
            zone_id=zone.zone_id,
            name="cdn",
            type="A",
            values=[],
            ttl=300,
            alias_target={"type": "cloudfront", "target": "d123.cloudfront.net"},
        )
