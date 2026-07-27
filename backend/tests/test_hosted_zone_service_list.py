import pytest

from app.core.security import hash_password
from app.repositories import user_repo
from app.services import hosted_zone_service


@pytest.fixture()
def owner(db_session):
    user = user_repo.create(
        db_session, email="list-owner@example.com", password_hash=hash_password("pw"), display_name="Owner"
    )
    db_session.commit()
    return user


def _make_zones(db_session, owner, count: int, *, name_prefix: str, type: str = "PUBLIC"):
    for i in range(count):
        hosted_zone_service.create_zone(
            db_session, name=f"{name_prefix}{i}.com", type=type, owner_id=owner.id
        )


def test_search_matches_name_and_description(db_session, owner):
    hosted_zone_service.create_zone(
        db_session, name="findme.com", type="PUBLIC", owner_id=owner.id, description="nothing special"
    )
    hosted_zone_service.create_zone(
        db_session, name="other.com", type="PUBLIC", owner_id=owner.id, description="contains findme in description"
    )
    hosted_zone_service.create_zone(db_session, name="unrelated.com", type="PUBLIC", owner_id=owner.id)

    rows, total = hosted_zone_service.list_zones(
        db_session, search="findme", type=None, sort="name", order="asc", page=1, page_size=10
    )

    assert total == 2
    assert {zone.name for zone, _ in rows} == {"findme.com", "other.com"}


def test_type_filter(db_session, owner):
    hosted_zone_service.create_zone(db_session, name="pub1.com", type="PUBLIC", owner_id=owner.id)
    hosted_zone_service.create_zone(db_session, name="priv1.com", type="PRIVATE", owner_id=owner.id)

    rows, total = hosted_zone_service.list_zones(
        db_session, search=None, type="PRIVATE", sort="name", order="asc", page=1, page_size=10
    )

    assert total == 1
    assert rows[0][0].name == "priv1.com"


def test_search_and_type_combine_as_and(db_session, owner):
    hosted_zone_service.create_zone(db_session, name="combo-public.com", type="PUBLIC", owner_id=owner.id)
    hosted_zone_service.create_zone(db_session, name="combo-private.com", type="PRIVATE", owner_id=owner.id)

    rows, total = hosted_zone_service.list_zones(
        db_session, search="combo", type="PRIVATE", sort="name", order="asc", page=1, page_size=10
    )

    assert total == 1
    assert rows[0][0].name == "combo-private.com"


@pytest.mark.parametrize("sort_field", ["name", "type"])
def test_sort_by_name_and_type_respect_order(db_session, owner, sort_field):
    hosted_zone_service.create_zone(db_session, name="aaa-sort.com", type="PRIVATE", owner_id=owner.id)
    hosted_zone_service.create_zone(db_session, name="bbb-sort.com", type="PUBLIC", owner_id=owner.id)

    asc_rows, _ = hosted_zone_service.list_zones(
        db_session, search="sort", type=None, sort=sort_field, order="asc", page=1, page_size=10
    )
    desc_rows, _ = hosted_zone_service.list_zones(
        db_session, search="sort", type=None, sort=sort_field, order="desc", page=1, page_size=10
    )

    assert len(asc_rows) == 2
    assert [z.name for z, _ in asc_rows] == list(reversed([z.name for z, _ in desc_rows]))


def test_sort_by_record_count(db_session, owner):
    """name/type have genuinely distinct values per zone, but two freshly-created
    zones both start at recordCount 2 (SOA + NS) — so this needs an actual
    difference in record count to test meaningfully, unlike the simpler fields."""
    from app.repositories import record_set_repo

    fewer = hosted_zone_service.create_zone(db_session, name="fewer-records.com", type="PUBLIC", owner_id=owner.id)
    more = hosted_zone_service.create_zone(db_session, name="more-records.com", type="PUBLIC", owner_id=owner.id)
    record_set_repo.create_with_values(
        db_session,
        record_id="rs_extra01",
        hosted_zone_id=more.id,
        name="www.more-records.com",
        type="A",
        values=["192.0.2.1"],
        ttl=300,
    )
    db_session.commit()

    asc_rows, _ = hosted_zone_service.list_zones(
        db_session, search="records.com", type=None, sort="recordCount", order="asc", page=1, page_size=10
    )
    desc_rows, _ = hosted_zone_service.list_zones(
        db_session, search="records.com", type=None, sort="recordCount", order="desc", page=1, page_size=10
    )

    assert [z.name for z, _ in asc_rows] == ["fewer-records.com", "more-records.com"]
    assert [z.name for z, _ in desc_rows] == ["more-records.com", "fewer-records.com"]


def test_sort_by_created_at(db_session, owner):
    """Two zones created in the same test run can tie at SQLite's second-level
    CURRENT_TIMESTAMP resolution, so set distinct timestamps explicitly rather
    than relying on real wall-clock time to differ."""
    import datetime

    older = hosted_zone_service.create_zone(db_session, name="older-zone.com", type="PUBLIC", owner_id=owner.id)
    newer = hosted_zone_service.create_zone(db_session, name="newer-zone.com", type="PUBLIC", owner_id=owner.id)
    older.created_at = datetime.datetime(2020, 1, 1)
    newer.created_at = datetime.datetime(2024, 1, 1)
    db_session.commit()

    asc_rows, _ = hosted_zone_service.list_zones(
        db_session, search="-zone.com", type=None, sort="createdAt", order="asc", page=1, page_size=10
    )

    assert [z.name for z, _ in asc_rows] == ["older-zone.com", "newer-zone.com"]


def test_pagination_math_matches_ac3(db_session, owner):
    """AC-3: 25 zones, page_size 10 -> 3 pages, page 2 differs from page 1."""
    _make_zones(db_session, owner, 25, name_prefix="paginated-zone-")

    page1, total = hosted_zone_service.list_zones(
        db_session, search="paginated-zone", type=None, sort="name", order="asc", page=1, page_size=10
    )
    page2, _ = hosted_zone_service.list_zones(
        db_session, search="paginated-zone", type=None, sort="name", order="asc", page=2, page_size=10
    )

    assert total == 25
    assert len(page1) == 10
    assert len(page2) == 10
    assert {z.name for z, _ in page1}.isdisjoint({z.name for z, _ in page2})


def test_update_zone_rejects_immutable_fields_by_construction(db_session, owner):
    """update_zone has no name/type parameter at all — AC-5's backend guarantee."""
    zone = hosted_zone_service.create_zone(db_session, name="immutable-test.com", type="PUBLIC", owner_id=owner.id)

    updated = hosted_zone_service.update_zone(
        db_session, zone.zone_id, description="new description", tags=[{"key": "Env", "value": "prod"}]
    )

    assert updated.name == "immutable-test.com"
    assert updated.type == "PUBLIC"
    assert updated.description == "new description"
    assert [t.key for t in updated.tags] == ["Env"]
