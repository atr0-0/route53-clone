import pytest
from sqlalchemy import func, select

from app.core.errors import HostedZoneNotEmptyError
from app.core.security import hash_password
from app.models.hosted_zone import HostedZone
from app.models.record_set import RecordSet
from app.repositories import user_repo
from app.services import hosted_zone_service, record_service


@pytest.fixture()
def owner(db_session):
    user = user_repo.create(
        db_session, email="delete-owner@example.com", password_hash=hash_password("pw"), display_name="Owner"
    )
    db_session.commit()
    return user


def test_delete_empty_zone_succeeds(db_session, owner):
    """FR-B19: a zone holding only its required records deletes cleanly."""
    zone = hosted_zone_service.create_zone(db_session, name="empty-delete-test.com", type="PUBLIC", owner_id=owner.id)

    hosted_zone_service.delete_zone(db_session, zone.zone_id, cascade=False)

    assert db_session.scalar(select(HostedZone).where(HostedZone.zone_id == zone.zone_id)) is None


def test_delete_non_empty_zone_returns_hosted_zone_not_empty(db_session, owner):
    """AC-4: a zone with one A record refuses deletion with the verbatim message,
    and the zone survives."""
    zone = hosted_zone_service.create_zone(db_session, name="non-empty-delete-test.com", type="PUBLIC", owner_id=owner.id)
    record_service.create_record(
        db_session, zone_id=zone.zone_id, name="www", type="A", values=["192.0.2.1"], ttl=300
    )

    with pytest.raises(HostedZoneNotEmptyError) as exc_info:
        hosted_zone_service.delete_zone(db_session, zone.zone_id, cascade=False)

    assert exc_info.value.message == (
        "The specified hosted zone contains non-required resource record sets "
        "and so cannot be deleted."
    )
    assert db_session.scalar(select(HostedZone).where(HostedZone.zone_id == zone.zone_id)) is not None


def test_cascade_delete_removes_zone_and_records_atomically(db_session, owner):
    """AC-4a backend half: the cascade path deletes both the record and the zone."""
    zone = hosted_zone_service.create_zone(db_session, name="cascade-delete-test.com", type="PUBLIC", owner_id=owner.id)
    record_service.create_record(
        db_session, zone_id=zone.zone_id, name="www", type="A", values=["192.0.2.1"], ttl=300
    )
    zone_pk = zone.id

    hosted_zone_service.delete_zone(db_session, zone.zone_id, cascade=True)

    assert db_session.scalar(select(HostedZone).where(HostedZone.zone_id == zone.zone_id)) is None
    assert (
        db_session.scalar(
            select(func.count()).select_from(RecordSet).where(RecordSet.hosted_zone_id == zone_pk)
        )
        == 0
    )
