"""Proves invariant 3: PRAGMA foreign_keys=ON makes ON DELETE CASCADE real.

Deletes only the parent HostedZone row via `session.delete()`. Relationships use
`passive_deletes=True` (see models), so SQLAlchemy issues no child DELETE
statements itself — if children disappear, it is because the database cascaded
them, which only happens because the PRAGMA is set on every connection
(app/db/session.py). Without it, this test fails with orphaned rows.
"""

from sqlalchemy import func, select

from app.core.security import hash_password
from app.models.hosted_zone import HostedZone
from app.models.hosted_zone_tag import HostedZoneTag
from app.models.record_set import RecordSet
from app.models.record_value import RecordValue
from app.models.user import User
from app.repositories import hosted_zone_repo, record_set_repo, user_repo


def _build_zone_with_children(session):
    user = user_repo.create(
        session, email="owner@example.com", password_hash=hash_password("pw"), display_name="Owner"
    )
    zone = hosted_zone_repo.create(
        session,
        zone_id="Z00000000000A1",
        name="cascade-test.com",
        type="PUBLIC",
        description=None,
        name_servers=["ns-1.awsdns-01.com"],
        owner_id=user.id,
    )
    hosted_zone_repo.add_tags(session, zone, [{"key": "Env", "value": "test"}])
    record_set_repo.create_with_values(
        session,
        record_id="rs_000001",
        hosted_zone_id=zone.id,
        name="cascade-test.com",
        type="A",
        values=["192.0.2.1", "192.0.2.2"],
        ttl=300,
    )
    session.commit()
    return user, zone


def test_deleting_zone_cascades_record_sets_values_and_tags(db_session):
    user, zone = _build_zone_with_children(db_session)
    zone_id = zone.id

    assert db_session.scalar(
        select(func.count()).select_from(RecordSet).where(RecordSet.hosted_zone_id == zone_id)
    ) == 1
    assert db_session.scalar(
        select(func.count()).select_from(RecordValue).join(RecordSet).where(RecordSet.hosted_zone_id == zone_id)
    ) == 2
    assert db_session.scalar(
        select(func.count()).select_from(HostedZoneTag).where(HostedZoneTag.hosted_zone_id == zone_id)
    ) == 1

    db_session.delete(zone)
    db_session.commit()

    assert db_session.scalar(
        select(func.count()).select_from(RecordSet).where(RecordSet.hosted_zone_id == zone_id)
    ) == 0
    assert db_session.scalar(select(func.count()).select_from(RecordValue)) == 0
    assert db_session.scalar(select(func.count()).select_from(HostedZoneTag)) == 0

    # Deleting a zone must never touch its owner (no FK cascade from users).
    assert db_session.get(User, user.id) is not None
