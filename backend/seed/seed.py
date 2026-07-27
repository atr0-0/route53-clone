"""Idempotent demo seed loader (DR-10). Not an Alembic migration, not run on app boot.

    python -m seed          # load, skipping anything that already exists
    python -m seed --reset  # wipe all rows, then reload

Zones are created through hosted_zone_service.create_zone() — the same code path a
real zone create uses — so the seeded SOA and apex NS record sets are reachable
through the UI, not written directly by this script (Slice 1's acceptance criterion).
Test fixtures are deliberately separate from this file (DR-13) — the pytest suite
never imports it.
"""

import argparse
import sys
from pathlib import Path

import yaml
from sqlalchemy import delete, select

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.hosted_zone import HostedZone  # noqa: E402
from app.models.record_set import RecordSet  # noqa: E402
from app.models.user import User  # noqa: E402
from app.repositories import hosted_zone_repo, record_set_repo, user_repo  # noqa: E402
from app.services import generators, hosted_zone_service  # noqa: E402

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def _load(name: str) -> object:
    with open(FIXTURES_DIR / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _unique_record_id(session) -> str:
    for _ in range(5):
        candidate = generators.generate_record_id()
        if session.scalar(select(RecordSet.id).where(RecordSet.record_id == candidate)) is None:
            return candidate
    raise RuntimeError("Could not generate a unique record_id")


def reset_all(session) -> None:
    """Wipe all rows. Deleting hosted_zones first cascades record_sets, record_values,
    and hosted_zone_tags at the database level (invariant 3)."""
    session.execute(delete(HostedZone))
    session.execute(delete(User))
    session.commit()


def seed_users(session) -> dict[str, User]:
    by_email: dict[str, User] = {}
    for entry in _load("users.yaml"):
        existing = user_repo.get_by_email(session, entry["email"])
        if existing is not None:
            by_email[entry["email"]] = existing
            continue
        user = user_repo.create(
            session,
            email=entry["email"],
            password_hash=hash_password(entry["password"]),
            display_name=entry["display_name"],
        )
        session.commit()
        by_email[entry["email"]] = user
    return by_email


def seed_zones(session, users_by_email: dict[str, User]) -> None:
    for entry in _load("zones.yaml"):
        if hosted_zone_repo.get_by_name(session, entry["name"]) is not None:
            continue

        owner = users_by_email[entry["owner"]]
        tags = [{"key": k, "value": v} for k, v in (entry.get("tags") or {}).items()]

        zone = hosted_zone_service.create_zone(
            session,
            name=entry["name"],
            type=entry["type"],
            owner_id=owner.id,
            description=entry.get("description"),
            tags=tags,
        )

        for record in entry.get("records", []):
            record_set_repo.create_with_values(
                session,
                record_id=_unique_record_id(session),
                hosted_zone_id=zone.id,
                name=record["name"],
                type=record["type"],
                values=[str(v) for v in record["values"]],
                ttl=record.get("ttl"),
            )
        session.commit()


def run(session, *, reset: bool) -> None:
    """The actual seed logic, independent of argv/global session — what tests call
    directly against their own isolated database (DR-13: test fixtures stay separate
    from demo seed data, but this loader's *logic* is still worth testing)."""
    if reset:
        reset_all(session)

    users_by_email = seed_users(session)
    seed_zones(session, users_by_email)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="wipe all rows before reloading")
    args = parser.parse_args()

    session = SessionLocal()
    try:
        run(session, reset=args.reset)
        zone_count = session.scalar(select(HostedZone).limit(1)) is not None
        print(f"Seed complete. Zones present: {zone_count}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
