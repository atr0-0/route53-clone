from app.core.security import hash_password
from app.repositories import user_repo
from app.services import hosted_zone_service


def test_create_zone_generates_soa_and_apex_ns(db_session):
    user = user_repo.create(
        db_session, email="owner@example.com", password_hash=hash_password("pw"), display_name="Owner"
    )
    db_session.commit()

    zone = hosted_zone_service.create_zone(
        db_session,
        name="service-test.com",
        type="PUBLIC",
        owner_id=user.id,
        description="a test zone",
        tags=[{"key": "Env", "value": "test"}],
    )

    assert zone.zone_id.startswith("Z")
    assert len(zone.record_sets) == 2

    by_type = {rs.type: rs for rs in zone.record_sets}
    assert set(by_type) == {"SOA", "NS"}

    soa = by_type["SOA"]
    assert soa.is_required is True
    assert soa.ttl == 900
    assert len(soa.values) == 1

    ns = by_type["NS"]
    assert ns.is_required is True
    assert ns.ttl == 172800
    assert [v.value for v in ns.values] == zone.name_servers

    assert [t.key for t in zone.tags] == ["Env"]


def test_create_zone_ids_are_unique_across_zones(db_session):
    user = user_repo.create(
        db_session, email="owner2@example.com", password_hash=hash_password("pw"), display_name="Owner"
    )
    db_session.commit()

    zone_a = hosted_zone_service.create_zone(db_session, name="a-unique.com", type="PUBLIC", owner_id=user.id)
    zone_b = hosted_zone_service.create_zone(db_session, name="b-unique.com", type="PUBLIC", owner_id=user.id)

    assert zone_a.zone_id != zone_b.zone_id
    assert {rs.record_id for rs in zone_a.record_sets}.isdisjoint(
        {rs.record_id for rs in zone_b.record_sets}
    )
