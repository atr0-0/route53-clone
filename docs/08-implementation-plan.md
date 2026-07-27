# Implementation Plan

| | |
|---|---|
| **Covers** | Roadmap Phases 3–6 — Implementation, Testing, Deployment, Documentation |
| **Status** | Ready to execute. Phases 1–2 (requirements, design) are complete |
| **Audience** | Whoever builds this, including a fresh session picking it up cold (§8) |

---

## 1. How to use this document

Phases 1–2 produced a complete specification. This document turns it into a **build order**.

It does not restate the specification. Each slice names the documents to read for its scope; the
requirement IDs (`FR-*`, `DR-*`, `NFR-*`, `AC-*`) are the contract, and
[`01-requirements.md`](./01-requirements.md) is authoritative for all of them.

**Read §3 (Invariants) before writing any code.** Those are the decisions that are expensive to
reverse — most of them were reached after considering alternatives, and the reasoning is in
[`02-design-decisions.md`](./02-design-decisions.md).

### Terminology

Three levels, deliberately distinct:

| Term | Meaning |
|---|---|
| **Phase** | Roadmap phase 1–6 (requirements → design → implementation → testing → deployment → docs) |
| **Stage** | The two halves of Phase 3 — **Stage 1** structural, **Stage 2** additive ([DD-20](./02-design-decisions.md#dd-20--two-stage-implementation-structural-then-additive)) |
| **Slice** | A vertical unit of work inside a stage. Slices 0–7 are Stage 1; Slice 8 is Stage 2 |

### Document map

| Need | Read |
|---|---|
| What was asked, and what each requirement means | [`01-requirements.md`](./01-requirements.md) — §2 is the brief's 73 asks; §14 is the coverage matrix |
| Why something is the way it is | [`02-design-decisions.md`](./02-design-decisions.md) — 20 entries, each with alternatives and trade-offs |
| What's real vs. mocked | [`03-assumptions-mocked-data-notes.md`](./03-assumptions-mocked-data-notes.md) |
| Layering, structure, auth flow, state ownership | [`04-architecture.md`](./04-architecture.md) |
| Tables, columns, indexes, migrations, fixtures | [`05-data-model.md`](./05-data-model.md) |
| Endpoints, payloads, error codes | [`06-api-contract.md`](./06-api-contract.md) |
| Screens, components, exact console strings | [`07-ui-spec.md`](./07-ui-spec.md) — §7 is the copy deck, §11 the staging table |

---

## 2. Build order at a glance

```
STAGE 1 — structural
  Slice 0  Foundations + R2 risk spike        both halves boot
  Slice 1  Data model, migrations, seed       DB is real
  Slice 2  Auth                               AC-1
  Slice 3  Hosted zones                       AC-2, AC-3, AC-5
  Slice 4  Records + validation               AC-6..AC-11
  Slice 5  Delete semantics + escape hatch    AC-4, AC-4a
  Slice 6  Console parity                     AC-12, AC-13
  Slice 7  Bonus features (P2)                AC-14, AC-15
STAGE 2 — additive
  Slice 8  UI reconciliation + polish         [UNVERIFIED] resolved
PHASES 4–6
  Slice 9  Testing, deployment, README        AC-16, deliverables
```

**Why backend-first within each slice, but not overall.** Slices 2–5 build the API and its UI
together, so every slice ends with something demonstrable rather than a half-system. The exception
is Slice 0, which puts a minimal Cloudscape shell in place immediately — risk **R2** (Cloudscape
under the App Router) is cheapest to discover before anything depends on it.

---

## 3. Invariants

These hold in **every** slice. Violating one means rework, not a patch.

### Backend

1. **Repositories never commit.** Services own transaction boundaries. This is what makes the
   cascade delete (`FR-B18a`) and atomic import (`FR-G3`) correct by construction rather than by
   luck. ([DD-17](./02-design-decisions.md#dd-17--four-layer-backend-routers--services--repositories--models))
2. **Domain rules live in `services/`, never in routers.** CNAME coexistence, required-record
   protection, the non-empty-zone check, quotas.
3. **`PRAGMA foreign_keys = ON` on every connection**, via a SQLAlchemy connect listener. SQLite
   defaults it *off*, per connection — without it every `ON DELETE CASCADE` is silently inert and
   cascades appear to work while leaving orphans.
4. **`set_identifier` defaults to `''`, never NULL.** NULLs are distinct in a unique index, so NULL
   would let duplicate record sets be inserted and break `FR-C1` entirely.
5. **Record *sets*, not records.** Values live in `record_values` with an `ordinal`. Three IPs on one
   hostname is one row. ([DD-8](./02-design-decisions.md#dd-8--records-are-record-sets-with-values-in-a-child-table))
6. **The nine grammars exist once**, in `services/validation/grammars.py`, and reach the frontend
   through `GET /record-types`. Never duplicated in TypeScript, not even temporarily.
   ([DD-9](./02-design-decisions.md#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend))
7. **One error shape, one handler.** Typed `DomainError` subclasses → a single exception handler →
   the `NFR-3` body. Routers never hand-build error responses.
8. **Names are stored lowercased and fully qualified**, trailing dot normalised away.

### Frontend

9. **No custom CSS overriding Cloudscape tokens — including in Stage 1.** This is the rule most
   likely to be broken under time pressure, and breaking it turns Stage 2's dark mode from a
   one-liner into a rewrite. Use design tokens where spacing or colour is needed.
10. **No hand-written API types.** The client is generated from the OpenAPI schema (`NFR-1`).
11. **Server-side always** — search, filter, sort, pagination. Never fetch-all-then-filter.
12. **Filtering is debounced** via `TextFilter`'s `onDelayedChange`. Binding the fetch to `onChange`
    fires one request per keystroke.
13. **Selection is reconciled across page changes.** Cloudscape does not preserve `selectedItems`
    when the page changes; without this, bulk delete silently loses selections.
14. **List state lives in the URL** — filter, type, sort, page, page size. Retrofitting this later
    is real surgery.
15. **Every mutation raises a `Flashbar`**, success or failure. If `error.field` is present, attach
    the message to the matching `FormField`. No silent failures (`NFR-10`).

### Both

16. **No secrets committed.** Env-driven config with a committed `.env.example` (`NFR-11`).
17. **Console strings come from [UI spec §7](./07-ui-spec.md)**, not from intuition. `A — IPv4
    address` not `A`; `Simple routing` not `Simple`; `Create records` plural; type `confirm` to
    confirm a delete, not the resource name.

---

## 4. Stage 1 slices

### Slice 0 — Foundations and the R2 spike

**Goal:** the repository exists, both halves boot, wired together, with the riskiest assumption
tested.

**Repository first.** The project is not yet a git repository, and `AS-D1` – `AS-D3` require a
GitHub repo with exactly `frontend/` and `backend/` at the root. So: `git init` · that directory
structure, with `docs/` already in place · a `.gitignore` covering both stacks (`__pycache__`,
`.venv`, `*.db`, `node_modules`, `.next`, `.env`) · **`.env` ignored and `.env.example` committed**
(invariant 16) · an initial commit before any application code, so the existing design docs are the
first thing in history.

Build: `backend/` FastAPI skeleton with `config.py` (pydantic-settings), `db/session.py` including
the `foreign_keys` connect listener, Alembic initialised · `frontend/` Next.js App Router with
Cloudscape global CSS and a minimal `AppLayout` rendering the side navigation · the `next.config.ts`
rewrite of `/api/*` to the backend · `docker compose` for both · the OpenAPI → TypeScript client
generation script.

**Done when:** the repo is initialised with `frontend/`, `backend/`, and `docs/` at the root, and
`git status` is clean with no secrets or database files tracked · `docker compose up` serves both
halves · a Cloudscape `AppLayout` renders under the App Router with **no SSR/hydration errors** ·
the generated client compiles · a request from the browser reaches the backend through the rewrite.

Covers `AS-D1` – `AS-D3`, `NFR-11`, `NFR-13`, `NFR-15`. De-risks **R1** and **R2**.

> **Stop here if the Cloudscape shell fights the App Router.** Everything downstream assumes it
> works. The containment strategy is in [architecture §3.3](./04-architecture.md).

### Slice 1 — Data model, migrations, seed

Read: [`05-data-model.md`](./05-data-model.md) in full.

Build: all five tables as SQLAlchemy models · Alembic revision `0001_initial` · `generators.py`
(zone IDs, the four nameservers, SOA values, change IDs) · `catalogues.py` (alias targets, regions,
account ID) · seed fixtures in YAML and an idempotent `seed.py` with `--reset`.

**Done when:** `python -m seed --reset` produces ~15 zones and ~90 records · a test deletes a zone
and asserts its record sets, values, and tags are gone — **this test is what proves invariant 3** ·
a test asserts a duplicate `(zone, name, type, set_identifier)` is rejected · seeded SOA and apex NS
records are produced by the *same code path* a real create uses, not written directly by fixtures.

Covers `DR-1` – `DR-14`.

### Slice 2 — Authentication

Read: [architecture §4](./04-architecture.md), [API contract §2](./06-api-contract.md).

Build: `core/security.py` (JWT sign/verify, cookie helpers) · `core/errors.py` and its handler ·
`core/pagination.py` (`Page[T]`) · `auth_service`, `auth` router · frontend login page,
`middleware.ts` guard, `useSession`, global 401 handling.

`errors.py` and `pagination.py` land here because every later slice depends on them.

**Done when:** `AC-1` passes end to end — sign in, reload and stay signed in, deep-link while signed
out and return to it after signing in.

Covers `FR-A1` – `FR-A8`, `NFR-2` – `NFR-4`.

### Slice 3 — Hosted zones

Read: [API contract §4](./06-api-contract.md), [UI spec §5.2, §5.5, §6](./07-ui-spec.md).

Build: `hosted_zone_repo` · `hosted_zone_service` (create with SOA/NS generation; name and type
immutable on update) · `hosted_zones` router · frontend zone list, create page, edit page, and the
detail shell with tabs.

**The list screen establishes the `ConsoleTable` pattern every later table reuses** — debounced
filter, URL-synced state, selection reconciliation, server-side counter, `stickyHeader`,
`resizableColumns`, `enableKeyboardNavigation`. Get it right once here.

**Done when:** `AC-2` (new zone reports 2 records, one SOA and one 4-value NS) · `AC-3` (search and
pagination) · `AC-5` (name and type read-only with explanatory helper text, not disabled inputs).

Covers `FR-B1` – `FR-B16`, `FR-B21` – `FR-B23`. **Delete is deliberately deferred to Slice 5** — its
guard cannot be tested until records exist.

### Slice 4 — Records and validation

Read: [API contract §3, §5](./06-api-contract.md), [SRS FR-D](./01-requirements.md),
[UI spec §5.3, §5.4](./07-ui-spec.md).

Build: `validation/grammars.py` (nine types, table-driven) · `validation/semantic.py` (CNAME apex
and coexistence, required records, quotas) · `record_set_repo`, `record_service` · `records` and
`record_types` routers · frontend records table, quick-create form, edit, delete.

**Done when:** `AC-6` (two IPs render as one row; duplicate returns `409`) · `AC-7` and `AC-7a`
(invalid values rejected per type; a **custom CAA tag with flag `128` is accepted**) · `AC-8` (CNAME
rules, both directions) · `AC-9` (SOA and apex NS undeletable; subdomain NS deletable) · `AC-10`
(type filter combines with search) · `AC-11` (form validation renders from `/record-types`, and a
backend grammar change reaches the UI with no frontend edit).

Covers `FR-C1` – `FR-C17`, `FR-D1` – `FR-D6`.

### Slice 5 — Delete semantics and the escape hatch

Read: [SRS FR-B17–B20](./01-requirements.md), [UI spec §5.6](./07-ui-spec.md),
[DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches).

Build: the `HostedZoneNotEmpty` guard · atomic `?cascade=true` · the two delete modals (plain
confirm for empty zones and single records; **type `confirm`** for cascade and bulk).

**Done when:** `AC-4` (populated zone refuses deletion with the verbatim AWS message) · `AC-4a`
(cascade path deletes both, and the confirm button stays disabled until `confirm` is typed).

Covers `FR-B17` – `FR-B20`.

### Slice 6 — Console parity

Read: [UI spec §2, §3, §5.1, §5.7](./07-ui-spec.md).

Build: the real Dashboard (`FR-F2`, now P1) as the post-login landing · the full navigation tree
with every leaf routed · `ComingSoon` · breadcrumbs everywhere · `Flashbar` on every mutation ·
empty and no-match states · loading skeletons · AWS-format IDs with copy buttons.

**Done when:** `AC-12` (flash on every mutation) · `AC-13` (every placeholder renders inside the
shell with correct breadcrumb and nav highlight) · no nav item 404s.

Covers `FR-E1` – `FR-E11`, `FR-F1`, `FR-F2`.

> **The console captures should have landed by now** (§6). They are not blocking — every open
> `[UNVERIFIED]` item is a string or an array — but this is the slice where they are cheapest to
> apply.

### Slice 7 — Bonus features (P2)

**Build in this order — cheapest and safest first, most expensive last.** This is the exact reverse
of the cutting order in §9, so running out of time stops cleanly at a boundary rather than
abandoning something half-built.

| # | Feature | Rough effort | Notes |
|---|---|---|---|
| 1 | Dark mode (`FR-G1`) | ~1 hour | Cloudscape ships the theme; add a toggle and persist it. Nearly free **given invariant 9** — if custom CSS crept in, this is where it hurts |
| 2 | Keyboard shortcuts (`FR-G5`) | ~3 hours | Key handler plus a `?` reference modal |
| 3 | Bulk operations (`FR-G4`) | ~half a day | Multi-select already exists from the Slice 3 table pattern; add the endpoint and the confirm modal |
| 4 | Export (`FR-G2`) | ~half a day | Walk record sets, emit BIND and JSON, serve as a download |
| 5 | **BIND import (`FR-G3`)** | **~2 days** | Parser (`$ORIGIN`, `$TTL`, relative and absolute names, nine types), per-line diagnostics, preview screen, atomic commit. **Built last, cut first** |

Import costs roughly as much as the other four combined, which is why it sits at the boundary.

**Done when:** `AC-14` (dry-run preview before anything is written; one bad line rejects the whole
import) · `AC-15` (BIND export round-trips back through import to an identical record set).

> **If import is cut, `AC-15` cannot run** — the round-trip needs both halves. Replace it with a
> golden-file test asserting the exported BIND matches a known-good fixture, so export still has
> real coverage. Note the substitution in the README rather than leaving an acceptance criterion
> silently unmet.

Covers `FR-G1` – `FR-G5`. All P2.

---

## 5. Stage 2 — Slice 8: reconciliation and polish

Read: [UI spec §11](./07-ui-spec.md) for the deferral table.

Build: reconcile every screen against the console captures and flip the resolved `[UNVERIFIED]`
markers · the help panel with `Info` links · density, striping, and sticky-column preferences ·
date formatting · `+N more` truncation · empty-state and help copy.

**Done when:** the `[UNVERIFIED]` list in [UI spec §10](./07-ui-spec.md) is empty or each remaining
item is explicitly accepted · a side-by-side comparison of the zone list, records tab, and create
record screen against the captures at the same viewport shows no structural difference.

---

## 6. The pending console capture

The only outstanding input. ~15 minutes, **$0** — Route53's pricing page confirms *"A hosted zone
that is deleted within 12 hours of creation is not charged."*

Create a throwaway zone, add ~8 records across types, capture the eight screens listed in
[UI spec §10](./07-ui-spec.md), delete the zone within 12 hours. Captures go in `docs/reference/`.

**Deadline: before Slice 6.** Not blocking before then — Slices 0–5 never touch the open items.

---

## 7. Testing, deployment, documentation

### Slice 9 — Phases 4–6

**Testing (`NFR-7`).** `pytest` for services — the `FR-D1` grammar matrix is table-driven, and the
invariant-3 cascade test belongs here permanently. `vitest` for frontend units. Playwright for
`AC-1` – `AC-16`; the Playwright MCP set up during Stage 1 is the same runner, so this is not new
tooling. Target ≥80% line coverage on `services/`.

**Test data never comes from the seed fixtures** (`DR-13`) — tests build and tear down their own
state, or every seed tweak breaks the suite.

**Deployment (`NFR-12`).** Frontend to Vercel; backend to Fly.io with a **mounted volume** for the
SQLite file. `AC-16` is the acceptance test: redeploy the backend and confirm previously created
zones and records survive. Verify the session cookie works through the rewrite on the deployed
origins before calling it done.

**Documentation (`AS-D4` – `AS-D7`).** Root `README.md` with the four required sections — setup,
architecture overview, database schema, API overview — linking the SRS, the decisions log, and the
[assumptions/notes doc](./03-assumptions-mocked-data-notes.md) that answers the submission form's
*Assumptions / Mocked Data / Notes* field. Include demo credentials and the `/docs` OpenAPI link.

---

## 8. Handover

Implementation is handed to fresh sessions, one per slice pair. A long-running session gets its
context summarised, and the first things to blur are exactly the details that matter most here —
the invariants in §3 and the exact console strings in [UI spec §7](./07-ui-spec.md). Those live in
the documents so they do not have to live in a context window.

### 8.1 Session sizing

| Session | Slices | Why paired |
|---|---|---|
| **A** | 0 + 1 | Scaffolding and data model — Slice 1's cascade test is what validates Slice 0's `PRAGMA` wiring |
| **B** | 2 + 3 | Auth, then hosted zones — Slice 3 establishes the `ConsoleTable` pattern every later table reuses |
| **C** | 4 + 5 | Records, then delete semantics — Slice 5's non-empty guard needs Slice 4's records to test against |
| **D** | 6 + 7 | Console parity, then bonus features |
| **E** | 8 + 9 | Stage 2 polish, testing, deployment, README |

### 8.2 The first session is a test of these documents

Session A is the first to build against this specification without having written it. **If it needs
information that is not in `docs/`, that is a documentation gap — not something to work around.**

This matters beyond convenience: documentation is both an explicit deliverable (`AS-D4` – `AS-D7`)
and an evaluation criterion (`AS-V6`), and **the evaluator will also be reading these documents
cold.** A gap that blocks a fresh session will block them too. Naming the gap and fixing the doc is
therefore worth more than routing around it — and answering from outside the docs only hides the
problem until submission.

### 8.3 Prompt

Paste, substituting the session letter and slice numbers.

```
This is the AWS Route53 Clone assignment (Scaler SDE Fullstack). Phases 1–2 —
requirements and design — are complete and documented in docs/. The specification
is settled and the reasoning is recorded: do not redesign it.

You are Session <X> of five. The work divides as:
  A: Slices 0+1  scaffolding, data model
  B: Slices 2+3  auth, hosted zones
  C: Slices 4+5  records, delete semantics
  D: Slices 6+7  console parity, bonus features
  E: Slices 8+9  Stage 2 polish, testing, deployment, README

Read, in this order:
  1. docs/08-implementation-plan.md  — §3 Invariants first; they are non-negotiable.
                                       Then §4 for your slices
  2. docs/01-requirements.md         — §2 is the brief's 73 asks; the FR/DR/NFR IDs
                                       are the contract
  3. docs/02-design-decisions.md     — why things are the way they are; 20 entries
  4. Then the documents your slices' sections name
     (04-architecture, 05-data-model, 06-api-contract, 07-ui-spec)

Your task: build Slice <N> and Slice <N+1> from docs/08-implementation-plan.md §4.

Rules:
  - §3 Invariants apply to every line of code. Several encode decisions that are
    expensive to reverse — read them before starting.
  - A slice is done when its "Done when" acceptance criteria pass. Write those tests.
  - Console strings come from docs/07-ui-spec.md §7, never from intuition.
  - If something in the spec seems wrong, say so and propose a change to the doc —
    do not silently diverge. Docs are updated first, then code.
  - If you need information that isn't in docs/, that is a documentation gap.
    Name it explicitly and propose the fix rather than working around it: the
    assignment is graded on documentation, and the evaluator reads these cold too.
  - Anything marked [UNVERIFIED] is a known gap, not an error. Leave the marker.

Begin by confirming which slices you're on and what their acceptance criteria are.
```

---

## 9. Cutting order, if time runs short

**Cutting order is the exact reverse of Slice 7's build order.** Build the cheapest first and the
most expensive last, and running out of time lands you on a clean boundary — never mid-feature.

| Order | Cut | Cost of cutting |
|---|---|---|
| 1st | **BIND import** (`FR-G3`) | One bonus item, and `AC-15`'s round-trip test — substitute a golden-file test for export (see Slice 7). Costs roughly as much as the other four combined, which is why it goes first |
| 2nd | Export (`FR-G2`) | One bonus item |
| 3rd | Bulk operations (`FR-G4`) | One bonus item |
| 4th | Keyboard shortcuts (`FR-G5`) | One bonus item |
| 5th | Slice 8 polish, beyond reconciling the captures | Directly visible on `AS-V1`, the top evaluation criterion — cut reluctantly |
| — | **Never cut** | Slices 0–6. They are the brief's mandatory scope: without them, `AS-H*`, `AS-R*`, or `AS-E*` go unmet |

**Decision recorded:** import is built last and cut first. It is simultaneously the most expensive
item and the strongest evidence for `AS-V2`/`AS-V3`/`AS-V5`, so this trades engineering depth for
breadth of coverage under `AS-V7`. Made deliberately and in advance, because the same choice made
under deadline pressure tends to cut whatever is currently stuck rather than whatever is least
valuable.

Dark mode (`FR-G1`) is not on this list — given invariant 9 it costs almost nothing, so cutting it
saves no meaningful time.
