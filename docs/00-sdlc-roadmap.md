# SDLC Roadmap — AWS Route53 Clone

This project is executed as a staged SDLC. Each phase produces a reviewable artifact that the
next phase is built against. This page tracks where we are.

| # | Phase | Artifact | Status |
|---|-------|----------|--------|
| 1 | **Requirements** | [`01-requirements.md`](./01-requirements.md) — the brief's 73 asks enumerated as `AS-*` IDs, the requirements derived from them, assumptions register, acceptance criteria, full traceability | ✅ Done (v3) |
| — | **Decisions** *(continuous)* | [`02-design-decisions.md`](./02-design-decisions.md) — ADR-style log of every decision and the trade-off it carries | 🔄 Live — appended throughout |
| — | **Submission artifact** | [`03-assumptions-mocked-data-notes.md`](./03-assumptions-mocked-data-notes.md) — what's real vs. mocked, assumptions, and reviewer notes. Answers the submission form's *Assumptions / Mocked Data / Notes* link | 🔄 Live — keep current as mocks change |
| 2 | **Design** | [`04-architecture.md`](./04-architecture.md) — topology, backend layering, frontend state, auth flow · [`05-data-model.md`](./05-data-model.md) — ER diagram, tables, indexes, migrations, fixtures · [`06-api-contract.md`](./06-api-contract.md) — every endpoint, payloads, error codes · [`07-ui-spec.md`](./07-ui-spec.md) — shell, navigation, screen-by-screen layouts, verified copy deck | ✅ Done |
| 3–6 | **Build order** | [`08-implementation-plan.md`](./08-implementation-plan.md) — invariants, 10 vertical slices, the Stage 1 / Stage 2 split, cutting order, and a handover prompt | ✅ Plan ready |
| 3 | **Implementation** | Working `backend/` and `frontend/`. **Stage 1** (slices 0–7) structural and functional · **Stage 2** (slice 8) additive polish + reconciliation against console captures | ⬜ Not started |
| 4 | **Testing** | `pytest` API + unit suites, `vitest` component tests, Playwright E2E derived from the SRS §13 acceptance criteria | ⬜ Not started |
| 5 | **Deployment** | Frontend on Vercel, backend on Fly.io with a mounted volume for SQLite; live demo URL | ⬜ Not started |
| 6 | **Documentation** | Root `README.md` — setup, architecture overview, database schema, API overview (an explicit assignment deliverable) | ⬜ Not started |

## Phase gates

A phase is not "done" until its artifact is reviewed and approved. Requirements are allowed to
change, but changes are made **in `01-requirements.md` first**, not directly in code — the
traceability matrix in SRS §14 is what proves the assignment brief has been fully covered at
submission time.

Every decision that involves a genuine trade-off gets an entry in
[`02-design-decisions.md`](./02-design-decisions.md), in any phase.

## Phase 1 notes

**v3 — anchored on the brief.** The SRS is now built around **§2, "The Assignment, As Stated"**: all
**73** discrete asks from the assignment, enumerated as `AS-*` IDs in the brief's own order and
wording. Every requirement declares the ask it satisfies; requirements with no parent ask are tagged
`[DERIVED]` and point at the decision that justifies them. SRS §14.1 maps all 73 asks to their
requirements with a coverage state, and §14.2 lists everything we added beyond the brief — so
additions are as visible as omissions.

Only **two** asks are qualified rather than fully covered: `AS-H5` (Edit Hosted Zones — description
and tags only) and `AS-H6` (Delete Hosted Zones — blocked when non-empty, with a cascade escape
hatch). Both trace to decision A1.

**v2 — the assumptions review.** The first draft carried roughly forty unstated assumptions, several
of which narrowed or extended the brief in ways a reader could have mistaken for missing
functionality. The six consequential ones were walked through individually (**A1–A6**, SRS §4.1) and
the rest batched into the register at §4.2.

That review also triggered a verification pass against the AWS Route53 Developer Guide, which
**found four factual errors** — the CAA `tag` rule, the values-per-record-set quota, the permitted
characters in zone and record names, and the wildcard restrictions. Facts are now marked
`[VERIFIED]` or `[UNVERIFIED]` throughout, with sources in SRS §15.

## Locked technical decisions

Summary only — the reasoning, alternatives, and costs are in
[`02-design-decisions.md`](./02-design-decisions.md).

| Decision | Choice | Entry |
|---|---|---|
| UI foundation | AWS Cloudscape Design System | [DD-1](./02-design-decisions.md#dd-1--aws-cloudscape-design-system-for-the-ui) |
| Hosting | Vercel + Fly.io with a persistent volume | [DD-2](./02-design-decisions.md#dd-2--vercel-for-the-frontend-flyio-with-a-volume-for-the-backend) |
| Auth | Seeded users, JWT in an httpOnly cookie | [DD-3](./02-design-decisions.md#dd-3--backend-issued-jwt-in-an-httponly-cookie) |
| Backend stack | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 | [DD-4](./02-design-decisions.md#dd-4--sqlalchemy-20--alembic--pydantic-v2) |
| Type safety | TS client generated from the OpenAPI schema | [DD-5](./02-design-decisions.md#dd-5--typescript-client-generated-from-the-openapi-schema) |
| Brief vs. product conflicts | Route53 behaviour wins, with escape hatches | [DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches) |
| Unrequested Route53 concepts | All seven kept | [DD-7](./02-design-decisions.md#dd-7--keep-seven-route53-concepts-the-brief-never-mentions) |
| Record model | Record sets, values in a child table | [DD-8](./02-design-decisions.md#dd-8--records-are-record-sets-with-values-in-a-child-table) |
| Record validation | Backend owns grammars, serves them via `/record-types` | [DD-9](./02-design-decisions.md#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend) |
| Destructive actions | Friction scales with blast radius | [DD-10](./02-design-decisions.md#dd-10--confirmation-friction-scales-with-blast-radius) |
| Bonus scope | All five in scope, at P2 | [DD-11](./02-design-decisions.md#dd-11--all-five-bonus-items-in-scope-at-p2) |
| Demo seed data | ~15 zones / ~90 records via a seed script; no reset | [DD-15](./02-design-decisions.md#dd-15--demo-seed-data-strategy) |
| Frontend ↔ backend | Next.js rewrite proxy, same-origin cookie | [DD-16](./02-design-decisions.md#dd-16--next-js-rewrite-proxy-instead-of-cross-origin-calls) |
| Backend layering | Four layers; repositories never commit | [DD-17](./02-design-decisions.md#dd-17--four-layer-backend-routers--services--repositories--models) |
| UI fidelity | Full console nav, real dashboard landing, verified copy deck | [DD-18](./02-design-decisions.md#dd-18--ui-fidelity-full-console-nav-real-dashboard-verified-copy-deck) |
| Fidelity sourcing | Cloudscape demos + console capture; observe, never generate | [DD-19](./02-design-decisions.md#dd-19--how-ui-fidelity-is-sourced) |
| Implementation staging | Two stages, split structural vs. additive | [DD-20](./02-design-decisions.md#dd-20--two-stage-implementation-structural-then-additive) |
