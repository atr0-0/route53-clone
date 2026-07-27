"""Exercises seed.py's logic against an isolated test database — not the demo
seed data itself (DR-13 keeps those separate), but the loader's behavior:
volume, idempotency, and that SOA/apex NS ride the real create_zone() path.
"""

import sys
from pathlib import Path

from sqlalchemy import func, select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models import HostedZone, RecordSet, User  # noqa: E402
from seed import seed  # noqa: E402


def test_seed_reset_produces_expected_volume(db_session):
    seed.run(db_session, reset=True)

    zone_count = db_session.scalar(select(func.count()).select_from(HostedZone))
    user_count = db_session.scalar(select(func.count()).select_from(User))
    non_required_records = db_session.scalar(
        select(func.count()).select_from(RecordSet).where(RecordSet.is_required.is_(False))
    )

    assert zone_count == 15
    assert 2 <= user_count <= 3
    assert 80 <= non_required_records <= 100

    flagship = db_session.scalar(select(HostedZone).where(HostedZone.name == "example.com"))
    assert flagship is not None
    assert len(flagship.record_sets) >= 27  # >=25 fixture records + SOA + NS
    assert {rs.type for rs in flagship.record_sets} == {
        "A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA",
    }

    required = [rs for rs in flagship.record_sets if rs.is_required]
    assert {rs.type for rs in required} == {"SOA", "NS"}
    ns = next(rs for rs in required if rs.type == "NS")
    assert [v.value for v in ns.values] == flagship.name_servers


def test_seed_without_reset_is_idempotent(db_session):
    seed.run(db_session, reset=True)
    zone_count_first = db_session.scalar(select(func.count()).select_from(HostedZone))
    record_count_first = db_session.scalar(select(func.count()).select_from(RecordSet))

    seed.run(db_session, reset=False)

    assert db_session.scalar(select(func.count()).select_from(HostedZone)) == zone_count_first
    assert db_session.scalar(select(func.count()).select_from(RecordSet)) == record_count_first
