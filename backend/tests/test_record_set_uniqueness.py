"""Proves DR-4's unique constraint and invariant 4 (set_identifier defaults to ''
rather than NULL, so it behaves as a real value in the unique index)."""

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.repositories import hosted_zone_repo, record_set_repo, user_repo


@pytest.fixture()
def zone(db_session):
    user = user_repo.create(
        db_session, email="owner@example.com", password_hash=hash_password("pw"), display_name="Owner"
    )
    zone = hosted_zone_repo.create(
        db_session,
        zone_id="Z00000000000B1",
        name="uniqueness-test.com",
        type="PUBLIC",
        description=None,
        name_servers=["ns-1.awsdns-01.com"],
        owner_id=user.id,
    )
    db_session.commit()
    return zone


def test_duplicate_name_type_set_identifier_is_rejected(db_session, zone):
    record_set_repo.create_with_values(
        db_session,
        record_id="rs_aaa001",
        hosted_zone_id=zone.id,
        name="www.uniqueness-test.com",
        type="A",
        values=["192.0.2.1"],
        ttl=300,
    )
    db_session.commit()

    with pytest.raises(IntegrityError):
        record_set_repo.create_with_values(
            db_session,
            record_id="rs_aaa002",
            hosted_zone_id=zone.id,
            name="www.uniqueness-test.com",
            type="A",
            values=["192.0.2.2"],
            ttl=300,
        )
    db_session.rollback()


def test_distinct_set_identifiers_both_succeed(db_session, zone):
    record_set_repo.create_with_values(
        db_session,
        record_id="rs_bbb001",
        hosted_zone_id=zone.id,
        name="weighted.uniqueness-test.com",
        type="A",
        values=["192.0.2.10"],
        ttl=300,
        set_identifier="primary",
        routing_policy="WEIGHTED",
    )
    record_set_repo.create_with_values(
        db_session,
        record_id="rs_bbb002",
        hosted_zone_id=zone.id,
        name="weighted.uniqueness-test.com",
        type="A",
        values=["192.0.2.11"],
        ttl=300,
        set_identifier="secondary",
        routing_policy="WEIGHTED",
    )
    db_session.commit()  # no IntegrityError — distinct set_identifier differentiates them


def test_empty_string_set_identifier_behaves_as_a_real_value_not_null(db_session, zone):
    """Two inserts both omitting set_identifier (both default to '') must collide —
    proving '' occupies the unique index like any other value, per invariant 4.
    If this test passed with duplicates allowed, set_identifier would be NULL under
    the hood, which is distinct-from-itself in a unique index and defeats FR-C1.
    """
    record_set_repo.create_with_values(
        db_session,
        record_id="rs_ccc001",
        hosted_zone_id=zone.id,
        name="simple.uniqueness-test.com",
        type="A",
        values=["192.0.2.20"],
        ttl=300,
    )
    db_session.commit()

    with pytest.raises(IntegrityError):
        record_set_repo.create_with_values(
            db_session,
            record_id="rs_ccc002",
            hosted_zone_id=zone.id,
            name="simple.uniqueness-test.com",
            type="A",
            values=["192.0.2.21"],
            ttl=300,
        )
    db_session.rollback()
