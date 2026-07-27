"""BIND import orchestration (FR-G3): groups bind/parser.py's per-line output
into candidate record sets, validates each one through the exact same
grammars and semantic rules record_service.create_record uses (DD-9,
invariant 6 — never a second copy of the rules), and either previews or
commits atomically.
"""

from dataclasses import dataclass, field

from app.core.errors import DomainError, InvalidInputError
from app.models.hosted_zone import HostedZone
from app.repositories import record_set_repo
from app.schemas.bind import ImportCreateItem, ImportPreviewResponse, ImportRejectedItem, ImportSkippedItem
from app.services import record_service
from app.services.bind.parser import ParsedRecordLine, parse_bind
from app.services.validation import semantic
from app.services.validation.grammars import GRAMMARS
from sqlalchemy.orm import Session


@dataclass
class _Group:
    relative_name: str  # "" for the apex — relative to the *file's* origin
    type: str
    ttl: int | None
    values: list[str] = field(default_factory=list)
    first_line: int = 0
    first_raw: str = ""


def _group_lines(lines: list[ParsedRecordLine]) -> list[_Group]:
    groups: dict[tuple[str, str], _Group] = {}
    order: list[tuple[str, str]] = []
    for line in lines:
        key = (line.name, line.type)
        if key not in groups:
            groups[key] = _Group(relative_name=line.name, type=line.type, ttl=line.ttl, first_line=line.line_no, first_raw=line.raw)
            order.append(key)
        groups[key].values.append(line.value)
    return [groups[key] for key in order]


def build_preview(session: Session, zone: HostedZone, content: str) -> ImportPreviewResponse:
    """Never writes — safe to call for both `?dry_run=true` and as the first
    step of a real commit, so the two can never disagree about what a file
    contains."""
    parsed_lines, parse_errors = parse_bind(content, default_origin=zone.name)
    rejected = [ImportRejectedItem(line=e.line_no, raw=e.raw, reason=e.reason) for e in parse_errors]
    skipped: list[ImportSkippedItem] = []
    to_create: list[ImportCreateItem] = []

    for group in _group_lines(parsed_lines):
        # Re-qualified against *this* zone — never the exporting zone's name,
        # which is all bind/parser.py's relative_name deliberately discards.
        is_apex = group.relative_name == ""
        name = zone.name if is_apex else f"{group.relative_name}.{zone.name}"

        if group.type == "SOA":
            skipped.append(ImportSkippedItem(line=group.first_line, reason="SOA is managed automatically and was not imported."))
            continue
        if group.type == "NS" and is_apex:
            skipped.append(
                ImportSkippedItem(line=group.first_line, reason="The apex NS record is managed automatically and was not imported.")
            )
            continue

        grammar = GRAMMARS.get(group.type)
        if grammar is None:
            rejected.append(ImportRejectedItem(line=group.first_line, raw=group.first_raw, reason=f"Unsupported record type {group.type}."))
            continue

        if len(group.values) > grammar.max_values:
            rejected.append(
                ImportRejectedItem(
                    line=group.first_line, raw=group.first_raw, reason=f"{group.type} allows at most {grammar.max_values} values."
                )
            )
            continue

        value_error = next((grammar.validate(v) for v in group.values if grammar.validate(v)), None)
        if value_error:
            rejected.append(ImportRejectedItem(line=group.first_line, raw=group.first_raw, reason=value_error))
            continue

        try:
            semantic.check_wildcard_rules(name, group.type)
            existing_types = record_set_repo.get_types_at_name(session, zone.id, name)
            semantic.check_cname_rules(existing_types, group.type, is_apex=is_apex)
        except DomainError as error:
            rejected.append(ImportRejectedItem(line=group.first_line, raw=group.first_raw, reason=error.message))
            continue

        existing = record_set_repo.get_by_identity(session, zone.id, name, group.type, "")
        if existing is not None:
            existing_values = [v.value for v in existing.values]
            if existing_values == group.values and existing.ttl == group.ttl:
                skipped.append(ImportSkippedItem(line=group.first_line, reason="Record already exists with identical values."))
            else:
                rejected.append(
                    ImportRejectedItem(
                        line=group.first_line,
                        raw=group.first_raw,
                        reason=f"A {group.type} record already exists at {name} with different values.",
                    )
                )
            continue

        to_create.append(ImportCreateItem(name=name, type=group.type, ttl=group.ttl, values=group.values))

    return ImportPreviewResponse(to_create=to_create, skipped=skipped, rejected=rejected)


def commit_import(session: Session, zone: HostedZone, content: str) -> ImportPreviewResponse:
    """Re-runs the exact same preview and refuses atomically if anything was
    rejected (06-api-contract.md §6) — the client is expected to dry-run
    first, but a stale or bypassed client can never cause a partial write."""
    preview = build_preview(session, zone, content)
    if preview.rejected:
        raise InvalidInputError("The file contains invalid lines; nothing was imported.")

    for item in preview.to_create:
        record_service.create_record(
            session,
            zone_id=zone.zone_id,
            name=item.name,
            type=item.type,
            values=item.values,
            ttl=item.ttl,
            commit=False,
        )
    session.commit()
    return preview
