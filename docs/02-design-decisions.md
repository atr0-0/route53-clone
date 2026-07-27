# Design Decisions

An append-only log of every significant decision on this project, in ADR style. Each entry records
what forced the choice, what was chosen, what was rejected, and **what the choice costs** — the
last of those being the part most decision logs quietly skip.

Referenced from [`01-requirements.md`](./01-requirements.md) and the root README. New entries are
appended as Phases 2–6 proceed; existing entries are never edited, only superseded.

| # | Decision | Status |
|---|---|---|
| [DD-1](#dd-1--aws-cloudscape-design-system-for-the-ui) | AWS Cloudscape Design System for the UI | Accepted |
| [DD-2](#dd-2--vercel-for-the-frontend-flyio-with-a-volume-for-the-backend) | Vercel + Fly.io with a mounted volume | Accepted |
| [DD-3](#dd-3--backend-issued-jwt-in-an-httponly-cookie) | Backend-issued JWT in an httpOnly cookie | Accepted |
| [DD-4](#dd-4--sqlalchemy-20--alembic--pydantic-v2) | SQLAlchemy 2.0 + Alembic + Pydantic v2 | Accepted |
| [DD-5](#dd-5--typescript-client-generated-from-the-openapi-schema) | TS client generated from the OpenAPI schema | Accepted |
| [DD-6](#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches) | Route53 behaviour wins over literal brief wording, + escape hatches | Accepted |
| [DD-7](#dd-7--keep-seven-route53-concepts-the-brief-never-mentions) | Keep seven Route53 concepts the brief never mentions | Accepted |
| [DD-8](#dd-8--records-are-record-sets-with-values-in-a-child-table) | Records are *record sets*, values in a child table | Accepted |
| [DD-9](#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend) | Backend owns validation grammars, serves them to the frontend | Accepted |
| [DD-10](#dd-10--confirmation-friction-scales-with-blast-radius) | Confirmation friction scales with blast radius | Accepted |
| [DD-11](#dd-11--all-five-bonus-items-in-scope-at-p2) | All five bonus items in scope, at P2 | Accepted |
| [DD-12](#dd-12--one-decisions-log-rather-than-a-docsadr-folder) | One decisions log rather than a `docs/adr/` folder | Accepted |
| [DD-13](#dd-13--offset-pagination-not-cursor) | Offset pagination, not cursor | Accepted |
| [DD-14](#dd-14--alias-target-as-a-nullable-json-column) | Alias target as a nullable JSON column | Accepted |
| [DD-15](#dd-15--demo-seed-data-strategy) | Demo seed data: volume, mechanism, and no reset | Accepted |
| [DD-16](#dd-16--next-js-rewrite-proxy-instead-of-cross-origin-calls) | Next.js rewrite proxy instead of cross-origin calls | Accepted |
| [DD-17](#dd-17--four-layer-backend-routers--services--repositories--models) | Four-layer backend | Accepted |
| [DD-18](#dd-18--ui-fidelity-full-console-nav-real-dashboard-verified-copy-deck) | UI fidelity: full nav, real dashboard, verified copy deck | Accepted |
| [DD-19](#dd-19--how-ui-fidelity-is-sourced) | How UI fidelity is sourced: observe, never generate | Accepted |
| [DD-20](#dd-20--two-stage-implementation-structural-then-additive) | Two-stage implementation: structural, then additive | Accepted |
| [DD-21](#dd-21--direct-console-capture-completed-ui-revamped-surface-by-surface-against-it) | Direct console capture completed; UI revamped surface-by-surface against it | Accepted |
| [DD-22](#dd-22--mocked-actions-get-a-shared-demo-limitation-toast-rather-than-more-coming-soon-routes) | Mocked actions get a shared demo-limitation toast, rather than more Coming Soon routes | Accepted |
| [DD-23](#dd-23--multi-record-quick-create-built-for-real) | Multi-record quick create built for real | Accepted |
| [DD-24](#dd-24--record-detail-split-panel-threaded-via-react-context) | Record-detail split panel threaded via React Context | Accepted |
| [DD-25](#dd-25--three-cloudscapenextjs-gotchas-found-during-the-revamp) | Three Cloudscape/Next.js gotchas found during the revamp | Accepted |

---

## DD-1 — AWS Cloudscape Design System for the UI

**Status:** Accepted

**Context.** "UI similarity to Route53" is the first item on the assignment's evaluation criteria,
and the brief asks that the app *"feel like Route53 rather than a generic CRUD application."*
Reproducing the AWS console's spacing, typography, table chrome, and form conventions by hand is
a large amount of pixel work with a low ceiling on accuracy.

**Decision.** Build on `@cloudscape-design/components` — the open-source React library AWS uses to
build the real console. `AppLayout`, `SideNavigation`, `Table` (filter, pagination, selection,
preferences), `Flashbar`, `Modal`, and `FormField` come as-is.

**Alternatives considered.**
- *Hand-rolled Tailwind + shadcn/ui.* More control, and arguably a better showcase of raw frontend
  skill, but replicating AWS's exact visual language by hand is slower and lands further away.
- *Material UI / Ant Design.* Fast to build with, but immediately reads as "not AWS", which defeats
  the entire point.

**Trade-off accepted.** Cloudscape is client-only React, so every screen needs a `"use client"`
boundary under the Next.js App Router (tracked as risk R2). The bundle is heavier than a
hand-rolled equivalent. And some of the "frontend engineering" on display becomes composition
rather than construction — mitigated by the fact that the interesting frontend work here is server
state, URL-synced list state, and generated types, none of which Cloudscape touches.

---

## DD-2 — Vercel for the frontend, Fly.io with a volume for the backend

**Status:** Accepted

**Context.** The assignment requires SQLite *and* a hosted demo link. Most free hosting tiers have
ephemeral filesystems, so a SQLite file written at runtime is silently destroyed on every deploy
or restart — a demo that loses the grader's data mid-review.

**Decision.** Next.js on Vercel's free tier; FastAPI in a Docker container on Fly.io with a
**mounted persistent volume** holding the SQLite file.

**Alternatives considered.**
- *Single container on Render/Railway with a disk.* One URL and a simpler ops story, but slower
  cold starts on free tiers and it gives up Vercel's frontend performance.
- *Postgres instead of SQLite.* Solves persistence trivially — but the brief names SQLite, so this
  isn't actually available.

**Trade-off accepted.** Two deploy targets instead of one, and a cross-origin session cookie
requiring `SameSite=None; Secure` plus a credentialed CORS allow-list (risk R1). If third-party
cookie restrictions bite, the fallback is proxying `/api/*` through a Next.js rewrite to make the
cookie same-origin.

**Corrected 2026-07-27**: Fly.io now requires a card on file for account verification, even within
its free allowance. Since a card wasn't available for this deployment, the live demo's backend runs
on **PythonAnywhere**'s free tier instead — a real persistent per-account filesystem, so SQLite still
survives redeploys, satisfying the same requirement this decision was written for. The one adjustment
that entailed: PythonAnywhere's free web apps are WSGI (Apache/uWSGI), not ASGI, so `backend/wsgi.py`
bridges FastAPI for that one deployment target — everywhere else (local dev, Docker, and Fly.io if a
card becomes available later) still runs the app directly over ASGI via uvicorn, unchanged. The
rewrite-proxy architecture below made this a same-origin cookie regardless of which host serves the
API, so the `SameSite=None` cross-origin concern this decision anticipated never actually applied in
practice — the Vercel rewrite keeps the browser talking to one origin throughout.

---

## DD-3 — Backend-issued JWT in an httpOnly cookie

**Status:** Accepted

**Context.** The brief asks for *"simple mocked authentication"* with login, logout, and session
persistence. That could be satisfied by a boolean in `localStorage`.

**Decision.** Seeded users in the database; `POST /auth/login` verifies credentials and issues a
JWT in an **httpOnly, Secure** cookie with a 24-hour lifetime. `GET /auth/me` hydrates the session.

**Alternatives considered.**
- *Frontend-only mock.* Genuinely simpler and arguably what "mocked" invites — but it demonstrates
  nothing about backend session handling, and every API endpoint would then be unauthenticated.
- *Full auth with signup, refresh tokens, and password reset.* Explicitly out of scope; the brief
  says mocked, and this would burn time that belongs on Route53 fidelity.

**Trade-off accepted.** A token that cannot be revoked before expiry, and no refresh flow — if the
24 hours lapse mid-session the user simply logs in again. Both acceptable for a demo; neither would
be acceptable in production.

---

## DD-4 — SQLAlchemy 2.0 + Alembic + Pydantic v2

**Status:** Accepted

**Context.** "Database design" is its own evaluation criterion, and the schema needs to be legible
to a reviewer.

**Decision.** SQLAlchemy 2.0 typed ORM models, schema changes through **Alembic migrations**,
request and response schemas in Pydantic v2.

**Alternatives considered.**
- *`Base.metadata.create_all()`.* One line instead of a migrations directory — but it leaves no
  record of how the schema evolved, and the migration history is itself evidence of design intent.
- *Raw SQL / SQLModel.* Raw SQL is more work for no gain here; SQLModel blurs the ORM/schema
  boundary in ways that make the layering in NFR-5 harder to keep clean.

**Trade-off accepted.** Alembic is ceremony for a project whose schema may never change after
Phase 2. Worth it because the assignment is graded partly on how the database work is presented,
not only on whether it functions.

---

## DD-5 — TypeScript client generated from the OpenAPI schema

**Status:** Accepted

**Context.** Two codebases in two languages describing the same API is the classic place for a
full-stack project to drift, and the drift is invisible until runtime.

**Decision.** FastAPI emits OpenAPI; the frontend's API client and types are **generated** from it.
Hand-written request/response interfaces are not permitted.

**Alternatives considered.**
- *Hand-written TS types.* Faster on day one, and wrong by week two.
- *A shared schema language (protobuf, TypeSpec).* Better in a large system; disproportionate here,
  since FastAPI already produces the schema for free.

**Trade-off accepted.** A generation step in the build, and the frontend cannot get ahead of the
backend contract. That constraint is the point — a backend change that breaks the frontend now
fails at compile time instead of in the browser.

---

## DD-6 — Real Route53 behaviour wins over literal brief wording, + escape hatches

**Status:** Accepted · Resolves assumption **A1**

**Context.** The brief lists *"Edit Hosted Zones"* and *"Delete Hosted Zones"* without
qualification. Real Route53 refuses both in common cases: a zone cannot be renamed (its name is the
DNS suffix of every record inside it), and a zone holding records cannot be deleted
(`HostedZoneNotEmpty`). Building faithfully means both features can *look* unfinished to someone
working through a checklist — which is a presentation problem, not a design one.

**Decision.** Real Route53 semantics are the model. But every blocked path gets a visible way
forward:

- Deleting a non-empty zone still returns `409`, and the modal offers **"Delete all N records, then
  delete this zone"** — an atomic cascade behind type-to-confirm (FR-B18a).
- Immutable fields render as read-only values **with helper text explaining why**, not as
  greyed-out inputs (FR-B15).

**Alternatives considered.**
- *Pure fidelity, divergences documented in the README.* Cleanest model, but it depends on the
  grader reading the README before judging the UI.
- *Follow the brief literally* — editable zone names cascading to every child record, unconditional
  cascade delete. Every checklist item passes on first click, at the cost of the two behaviours
  that most make the app read as Route53.

**Trade-off accepted.** Extra UI and an extra endpoint for a path that real Route53 doesn't offer.
The cascade delete is a small deliberate divergence from AWS — accepted because the alternative is
a grader concluding that "Delete Hosted Zones" was never built.

---

## DD-7 — Keep seven Route53 concepts the brief never mentions

**Status:** Accepted · Resolves assumption **A2**

**Context.** Seven things appeared in the requirements that the assignment never asks for:
public/private zone types, delegation nameservers, DNSSEC and query-logging tabs, tags, routing
policies, alias records, and change-info objects. All arrived from the same instinct — the real
product has them.

**Decision.** Keep all seven. `Type`, `Routing policy`, and `Alias` are visible **columns** in the
console tables a grader will compare against; a table missing them reads as a different product.
The nameservers are near-free, since the auto-created NS record needs values anyway.

**Alternatives considered.**
- *Drop the expensive two (routing policies, alias records).* Saves real time — neither does
  anything functional, because nothing resolves DNS. Rejected because they are among the most
  visible elements of the record form and table.
- *Drop everything not in the brief.* Minimal scope, but produces a generic CRUD app, which the
  brief explicitly warns against.

**Trade-off accepted.** Meaningful scope nobody asked for. Two knock-ons: `set_identifier` stays in
the record uniqueness key (feeding DD-8), and TTL becomes conditional on the alias toggle, adding a
branch to form logic and validation. Change-info objects are near-free but invisible in the UI —
kept only because API-shape fidelity is cheap here.

---

## DD-8 — Records are *record sets*, with values in a child table

**Status:** Accepted · Resolves assumption **A3**

**Context.** Route53 has no concept of a single-valued "record". Its unit is a **record set**:
`(name, type, routing policy, set identifier)` holding an **ordered list of values**. This is not
an internal detail — it is visible on screen. Three IPs on one hostname render in the real console
as one row with three stacked values:

```
Record name        Type  Routing policy  Value
www.example.com    A     Simple          192.0.2.1
                                         192.0.2.2
                                         192.0.2.3
```

A one-row-per-value model renders the same data as three near-identical rows.

**Decision.** Identity is `(hosted_zone_id, name, type, set_identifier)`, unique-constrained.
Values live in a child `record_values` table with an `ordinal` column. A duplicate identity returns
`409`, and the UI directs the user to edit the existing set — matching Route53.

**Alternatives considered.**
- *Record sets with a JSON array column.* Same model, same UI, one fewer table, no join. Rejected
  because searching by value (FR-C4) becomes an unindexed scan over a JSON blob, and the 255-character
  TXT string limit moves from the schema into application code.
- *Flat, one row per value.* Simplest schema, visibly wrong output, and it breaks both the
  multi-value create form and the 409-on-duplicate semantics.

**Trade-off accepted.** One join on every record list query, and multi-value writes touch two
tables inside a transaction. Negligible at this scale, and it buys indexed value search plus
schema-level enforcement of per-value limits.

---

## DD-9 — The backend owns validation grammars and serves them to the frontend

**Status:** Accepted · Resolves assumption **A5**

**Context.** Nine record types each have their own value grammar — `10 mail.example.com` for MX,
`10 5 80 host.example.com` for SRV, `0 issue "ca.example.net"` for CAA, quoted 255-character chunks
for TXT. The first draft specified these enforced server-side *and* "mirrored client-side for
instant feedback" — that is, all nine written twice, in Python and TypeScript, kept in sync by
discipline alone.

**Decision.** The grammars are defined **once, in the backend**. `GET /record-types` exposes per
type: `pattern`, `placeholder`, `helpText`, `multiValue`, `maxValues`, and per-value limits. The
frontend renders its inline validation from that payload. Semantic rules that need a database
lookup — CNAME coexistence, apex CNAME, duplicate sets, required-record protection — stay
server-only and surface through the `field` pointer in the error body.

**Alternatives considered.**
- *Backend strict, thin client.* No duplication either, and less work — but errors only appear on
  submit rather than as the user types.
- *Mirror the grammars in both languages.* Best possible inline UX, guaranteed drift.
- *Light validation only.* Cheapest, but reduces "supports 9 record types" to a dropdown with nine
  labels in it.

**Trade-off accepted.** An endpoint whose purpose a reviewer may not immediately recognise (risk
R7, addressed in the README), and client-side rules limited to what a regex can express — anything
relational still needs a round trip.

---

## DD-10 — Confirmation friction scales with blast radius

**Status:** Accepted · Resolves assumption **A6**

**Context.** The first draft required typing the zone name to confirm any zone deletion, justified
as matching the console — a claim held with low confidence. DD-6 then raised the stakes by adding a
cascade delete that destroys a zone *and every record in it* in one click.

**Decision.** Friction is proportional to what is destroyed:

| Action | Confirmation |
|---|---|
| Delete one record | Simple Cancel / Delete |
| Delete an empty zone | Simple Cancel / Delete |
| Cascade delete a zone and its records | **Type-to-confirm** (`confirm`) |
| Bulk delete N records | **Type-to-confirm** (`confirm`) |

**Corrected 2026-07-27**: this table originally read "Type the zone name" for the cascade row —
correct as a first draft, but DD-19 subsequently verified against AWS's own Cloudscape demos that
the console's actual pattern is typing the literal word `confirm`, not the resource name (the S3/RDS
pattern this project explicitly didn't choose). `01-requirements.md` AC-4a and
`07-ui-spec.md` §5.6/§7 were updated at the time; this table was missed and is fixed now.

**Alternatives considered.**
- *Type-to-confirm on every zone delete.* Consistent, but tedious when the zone is empty anyway.
- *Simple confirm everywhere.* Least code, but puts a one-click irreversible mass delete behind no
  real friction.

**Trade-off accepted.** Two different confirmation patterns in one app, which needs to look
deliberate rather than inconsistent — so the heavier pattern is used only where the modal itself
explains that the action is irreversible and states the record count.

---

## DD-11 — All five bonus items in scope, at P2

**Status:** Accepted

**Context.** The brief lists five optional bonuses (`AS-B1` – `AS-B5`). Bonus work lifts "overall
completeness" (`AS-V7`) but competes directly with core fidelity for time.

**Decision.** **All five are in scope** — BIND import, JSON/BIND export, dark mode, keyboard
shortcuts, and bulk operations — delivered as **four workstreams**, since shortcuts and bulk
operations ship together against the same selectable tables. All marked **P2** so any can be cut
without touching anything core. Dark mode is near-free given DD-1 (Cloudscape ships a dark theme).
Export is a serialiser. Import is the only genuinely expensive one, needing a parser plus a
preview flow.

**Alternatives considered.** Export and dark mode only, as the cheap wins. Held in reserve as the
fallback if Phase 3 runs long.

**Trade-off accepted.** Import carries the most risk per unit of visible payoff. Its atomic,
preview-first design (FR-G3) is what makes it defensible: a half-applied import would leave a zone
in a state nobody asked for.

---

## DD-12 — One decisions log rather than a `docs/adr/` folder

**Status:** Accepted

**Context.** Design rationale needs somewhere to live. The conventional form is one file per
decision in `docs/adr/`.

**Decision.** A single `02-design-decisions.md` with numbered entries and an index table.

**Alternatives considered.** A `docs/adr/` folder — better for a long-lived system with many
authors, where per-file history and independent review matter.

**Trade-off accepted.** This file grows long, and entries cannot be reviewed independently. At this
project's size a reviewer scans one file in a couple of minutes; twenty small files is a worse
read for exactly the audience this is written for.

---

## DD-13 — Offset pagination, not cursor

**Status:** Accepted

**Context.** Every list endpoint needs pagination, and the choice shows up directly in the UI.

**Decision.** Offset pagination — `?page=&page_size=` — with a `total` and `total_pages` in the
envelope.

**Alternatives considered.** Cursor pagination, which is stable under concurrent inserts and
performs better on deep pages. Rejected because the console shows **numbered pages** and a total
count, which cursors cannot provide without an extra count query anyway.

**Trade-off accepted.** Deep offsets degrade on large tables, and a row inserted mid-browse can
shift items across a page boundary. Neither matters at 10,000 records with a single user.

---

## DD-14 — Alias target as a nullable JSON column

**Status:** Accepted

**Context.** Alias records (DD-7) replace TTL and values with a target: an AWS resource type plus an
identifier. They are mutually exclusive with a normal record's TTL and value list.

**Decision.** A nullable `alias_target` JSON column on `record_sets`. Non-null means the row is an
alias record, and TTL is then required to be null.

**Alternatives considered.**
- *A separate `alias_targets` table.* Properly normalised, but it is strictly 1:0..1 with
  `record_sets` — a join that can never return more than one row buys nothing.
- *Discrete columns* (`alias_type`, `alias_value`, `alias_zone`). More queryable, but they are dead
  columns on every non-alias row, and alias targets are never filtered on.

**Trade-off accepted.** A JSON column is opaque to SQL queries — deliberate, since nothing ever
queries inside it. The mutual exclusion between `alias_target` and `ttl` is enforced in the service
layer rather than by the schema, and needs its own test.

---

## DD-15 — Demo seed data strategy

**Status:** Accepted

**Context.** "Mock data" turned out to be five distinct things with different lifecycles, and
conflating them is how seed fixtures end up entangled with the test suite:

1. **Demo seed data** — users, zones, records in SQLite
2. **Static mock catalogues** — alias targets, regions, account ID
3. **Runtime generators** — zone IDs, nameservers, SOA values, change IDs
4. **Test fixtures** — validation matrix, API and E2E state
5. **Sample BIND files** — for exercising import

Only the first has a genuine volume question. The hosted demo (`AS-D8`) must never open empty, but
the default page size is 10 — so under ~11 zones a reviewer never sees pagination engage at all,
while overloading it makes the app tedious to review.

**Decision — three parts.**

*Volume: sized by what must be demonstrable.* ~15 zones (two pages, mixed Public/Private so the type
filter has something to act on); one flagship zone with ≥25 record sets (three pages, all nine
types, several multi-value sets, one subdomain NS record so the deletable-NS case is reachable);
2–8 records on the rest. ~90 records total, with plausible content — SPF/DKIM/DMARC TXT,
real-shaped MX, `www`/`api`/`blog` records — never `test1.com`.

*Mechanism: a standalone `seed.py` reading declarative YAML fixtures*, idempotent, with `--reset`.
Run explicitly.

*No demo-reset facility.* The public demo drifts as people use it, and that is accepted.

**Alternatives considered.**
- *Alembic data migration.* Any fresh deploy self-populates with no extra step — but it couples
  demo data to schema history, is awkward to re-run, and muddies what migrations are for.
- *Auto-seed on startup when the database is empty.* Zero-touch deploys, but surprising, and it
  silently repopulates a database someone deliberately emptied.
- *A "Reset demo data" action behind a `DEMO_MODE` flag.* Would let a reviewer test destructive
  paths freely and restore afterwards. Rejected as scope that appears nowhere in Route53.
- *Scheduled nightly re-seed.* Self-healing, but invisible to a reviewer, useless within a single
  session, and it can change data underneath someone mid-review.

**Trade-off accepted.** The demo is shared and stateful: a reviewer exercising delete permanently
removes seed data for everyone after them, and a later viewer cannot distinguish a degraded demo
from a broken one (risk R8). The mitigation is documentation rather than code — the README and the
[notes doc](./03-assumptions-mocked-data-notes.md) state that the demo is mutable and give the
one-command local run with a fresh database.

Two consequences worth noting. Fixtures in YAML rather than Python mean the seed content is
reviewable as *data*, which matters when it is also the first thing a grader sees. And keeping test
fixtures separate (DR-13) means the suite never breaks because someone adjusted a demo zone.

---

## DD-16 — Next.js rewrite proxy instead of cross-origin calls

**Status:** Accepted · Resolves risk **R1**

**Context.** DD-2 put the frontend on Vercel and the backend on Fly.io — two different origins. The
session cookie (DD-3) has to survive that split. Calling Fly directly from the browser makes the
cookie a **third-party cookie**, which Safari and Firefox block by default and Chrome restricts. A
grader opening the demo in Safari could simply fail to stay logged in, with no obvious cause.

**Decision.** The browser only ever talks to the Vercel origin. `next.config.ts` rewrites `/api/*`
to the Fly backend, server-to-server. The cookie becomes first-party `SameSite=Lax`, CORS drops out
of the browser path entirely, and `proxy.ts` can read the cookie server-side to guard routes
before a page renders. The Fly service stays publicly reachable so its `/docs` OpenAPI UI is still
linkable from the README (`AS-D7`).

**Alternatives considered.**
- *Direct cross-origin with `SameSite=None; Secure` and a credentialed CORS allow-list.* One fewer
  hop and no Vercel function invocations — but it is precisely the third-party cookie pattern
  browsers are removing, and `proxy.ts` could not see the cookie, so route guarding would have
  to move client-side and flash unauthenticated content.
- *Token in `localStorage` with an `Authorization` header.* Sidesteps cookies entirely and works
  cross-origin. Rejected: readable by any script, which gives up the XSS protection that made
  httpOnly worth choosing in DD-3.

**Trade-off accepted.** Every API call takes an extra hop through Vercel, adding latency and
consuming function invocations on the free tier. Accepted because a login that silently fails in
some browsers is a far worse outcome than a few tens of milliseconds. It also couples the frontend
deployment to the backend's URL through one env var (`BACKEND_ORIGIN`).

---

## DD-17 — Four-layer backend: routers → services → repositories → models

**Status:** Accepted

**Context.** `NFR-5` specified four layers. Worth re-examining before building on it, because for
~17 endpoints a repository layer sitting on top of SQLAlchemy — itself already a data-access
abstraction — is a common place to add indirection that earns nothing.

**Decision.** Keep four. `routers/` handles HTTP only; `services/` owns domain rules **and
transaction boundaries**; `repositories/` owns query construction and never commits; `models/` are
ORM entities. Each layer may only call the one below it.

**Alternatives considered.**
- *Three layers — routers → services → models*, with services using the `Session` directly. Less
  ceremony, fewer files, and most repository methods in a CRUD app of this size are one-line
  passthroughs. Tests would run against a real SQLite file, which is fast enough that mockable
  repositories buy little.

**Trade-off accepted.** More files and one more hop per entity, and some repository methods will be
thin. Two things make it worth it here: query construction stays out of the services, so the domain
rules that matter — CNAME coexistence, required-record protection, the non-empty-zone check, the
cascade — read as policy rather than as SQL; and "Code quality and maintainability" plus
"Backend/API design" are explicit evaluation criteria (`AS-V3`, `AS-V5`), where a clean, conventional
separation is legible at a glance. The discipline that keeps this honest is that **repositories
never commit** — without that rule the layer would be decorative.

---

## DD-18 — UI fidelity: full console nav, real dashboard, verified copy deck

**Status:** Accepted

**Context.** `AS-V1` — "UI similarity to Route53" — is the **first** evaluation criterion, and
`AS-E12` asks the app to *"feel like Route53 rather than a generic CRUD application."* DD-1 chose
Cloudscape, which supplies the visual language. What Cloudscape cannot supply is the Route53-shaped
content inside it: the navigation tree, the landing experience, and the exact wording.

**Decision — three parts.**

*Full console navigation.* Reproduce Route53's real tree, including Domains, IP-based routing,
Applications and Test record — sections the brief never names. Every leaf except Hosted zones
routes to the same `ComingSoon` component, so marginal cost is one component plus N routes.

*A real Dashboard as the landing page.* The console lands on Dashboard after sign-in. Rather than
open on an empty placeholder, it renders live zone/record counts and recently-created zones from
data already held. `FR-F2` rises **P2 → P1**.

*A verified copy deck.* Before writing the spec, AWS's console procedure pages were read to pin down
exact strings rather than plausible-sounding ones. This corrected several guesses: the type dropdown
reads `A — IPv4 address` not `A`; the routing option is `Simple routing` not `Simple`; the submit
button is `Create records`, plural; multiple values are allowed for every type **except CNAME**; NS
records accept **only** simple routing; and the apex is created by leaving the name **blank**, with
the console explicitly warning against typing `@`. All captured in [UI spec §7](./07-ui-spec.md).

**Alternatives considered.**
- *Trim the nav to the brief's five sections.* Precisely scoped, nothing added — but the nav reads
  visibly shorter than the real console, and nav length is one of the first things the eye checks.
- *Land on Hosted zones.* Strongest possible first screen, but it is not where the console takes
  you, and a reviewer comparing flows would notice.
- *Dashboard as a pure "Coming Soon".* The most literal reading of `AS-M1` — and it would make a
  reviewer's very first screen empty.
- *Build the wizard record-creation flow too.* The console has both modes with a real toggle.
  Deferred at P2: Quick create satisfies every requirement, and a second full flow with its own
  state and validation would compete with polish on screens reviewers spend more time in.

**Trade-off accepted.** Roughly fifteen routes exist only to say "Coming soon", which could read as
hollow if a reviewer clicks every one. Mitigated by the placeholder naming what *is* built and
linking straight to it. The dashboard is also genuine extra scope beyond `AS-M1`'s "placeholder is
sufficient" — accepted because first impressions are weighted heavily by `AS-V1` and `AS-V7`. And
the copy deck still carries `[UNVERIFIED]` entries (column headers, search placeholders, nav
ordering): AWS does not publish console layouts, and per **A4** no screenshots are being used.
*(Superseded in part by DD-19 — screenshots were subsequently adopted.)*

---

## DD-19 — How UI fidelity is sourced

**Status:** Accepted · Revises assumption **A4**

**Context.** DD-18 got the copy deck from AWS documentation, but layout facts remained
`[UNVERIFIED]` because AWS does not publish console layouts. With `AS-V1` as the first evaluation
criterion, the open question was how to close that gap. A browser-automation approach was
proposed: drive a real browser, read the live DOM, and generate a mirroring project.

**Decision — three ranked sources, and one prohibition.**

1. **`cloudscape-design/demos` (MIT-0)** — AWS's own reference implementations of console page
   patterns. Highest authority, zero cost, no setup. Already applied.
2. **Direct console capture** — a throwaway hosted zone, screenshotted, deleted within 12 hours.
   The pricing page confirms *"A hosted zone that is deleted within 12 hours of creation is not
   charged"*, so the only cost is ~15 minutes. This is the sole source for what remains
   `[UNVERIFIED]`. **This reverses A4's decision to skip screenshots.**
3. **Playwright MCP** — adopted, but for the *build loop* (screenshot our own app, inspect, correct)
   and because it is already the Phase 4 E2E runner (`NFR-7`). Not for reference gathering.

**Prohibited: generating code from the AWS console's DOM.** It would yield minified class names and
hand-rolled markup — strictly worse than clean Cloudscape composition — and would forfeit the free
dark mode and accessibility that [DD-1](#dd-1--aws-cloudscape-design-system-for-the-ui) buys. We
observe and verify; we do not generate. The same rule applies to the demos: they are read as
patterns, not pasted, even though MIT-0 would permit copying.

**Alternatives considered.**
- *Playwright MCP against the live AWS console.* Feasible with a persistent browser profile and a
  hand-performed login, which avoids automating credentials or MFA. Rejected as the primary route
  because manual screenshots produce the same artifacts with fewer moving parts.
- *Continue with documentation only (A4 as originally decided).* Zero user effort — but it leaves
  the top evaluation criterion resting on recollection, when the fix costs nothing.

**Trade-off accepted.** Source 2 depends on the user having an AWS account and spending time; until
those captures exist, the `[UNVERIFIED]` list stands and is listed openly in
[UI spec §10](./07-ui-spec.md) rather than quietly assumed. Source 3 costs setup time before any
payoff, justified only because Phase 4 needs Playwright regardless.

**What this already caught.** Reading the demos corrected two specified patterns: the type-to-confirm
modal takes the literal word `confirm`, not the resource name (we had the S3/RDS pattern); and
server-side tables need `onDelayedChange` debouncing, without which every keystroke fires a request.
Both would have shipped.

---

## DD-20 — Two-stage implementation: structural, then additive

**Status:** Accepted

**Context.** Implementation needs a sequencing model. The intuitive split is "build it working, then
make it pretty" — but that framing is dangerous here, because some of what *looks* like polish is
load-bearing. Deferring it means rewriting rather than adding.

**Decision.** Two stages inside Phase 3, split on **structural vs. additive** rather than on
appearance:

- **Stage 1 — structurally correct, minimally polished.** Every screen present and functional, with
  the right components, state architecture, and data flow. Less surface content, not fewer patterns.
- **Stage 2 — the additive layer**, plus reconciliation against the console captures.

| Deferrable (additive) | Not deferrable (structural) |
|---|---|
| Help panel and `Info` links | Debounced filtering — lives in the fetch wiring |
| Dark mode toggle | Selection across pagination — lives in the state hook |
| Keyboard shortcuts | URL-synced list state — moving state out of `useState` later is real surgery |
| Empty-state and help copy | `/record-types`-driven validation |
| Date formatting | Record-set rendering — a data-shape concern, not styling |
| Density / striping / sticky-column preferences | The delete-confirmation pattern |
| `+N more` truncation | `AppLayout` and navigation structure |

Two rules keep the deferral honest:

1. **No custom CSS overriding Cloudscape tokens, including in stage 1.** "Good enough looking" is
   exactly when someone reaches for a quick colour override — and that turns stage 2's dark mode
   from a one-liner into a rewrite, forfeiting the largest benefit
   [DD-1](#dd-1--aws-cloudscape-design-system-for-the-ui) provides.
2. **No temporary shortcuts on structural items.** Hardcoding the nine grammars in TypeScript "just
   for stage 1" builds precisely what [DD-9](#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend)
   rejected — and things built that way rarely get unbuilt.

**Alternatives considered.**
- *Single pass, fully polished per screen.* Higher quality per screen, but the first screen absorbs
  all the shell and pattern work, so progress is invisible for a long stretch and the last screens
  risk being rushed.
- *Backend fully complete before any frontend.* Clean separation, but it defers all UI risk —
  including **R2** (Cloudscape under the App Router) — to the point where discovering a problem is
  most expensive.

**Trade-off accepted.** Two passes over the same screens, and stage 1 will look unfinished in ways
that are deliberate but hard to distinguish from ways that are not. Mitigated by the table above
being explicit, so "is this stage 2?" is a lookup rather than a judgement call. The staging also
sequences naturally with the pending console captures — they land during stage 1, and stage 2 is
where the app is reconciled against them.

---

## DD-21 — Direct console capture completed; UI revamped surface-by-surface against it

**Status:** Accepted · Completes [DD-19](#dd-19--how-ui-fidelity-is-sourced)

**Context.** DD-19 committed to direct console capture as the authority for whatever documentation
and the Cloudscape demos couldn't settle, but at the time no captures existed yet — everything
downstream of it (`07-ui-spec.md` §3, §5.1, §5.3, §7) was still written from documentation and
inference. Once five real screenshots landed in `docs/reference/` (`01-nav.png`, `02-zones-list.png`,
`04-records-table.png`, `05-create-record-form.png`, `08-dashboard.png`), reviewing them surfaced
genuine **structural** mismatches, not polish-level nitpicks — most notably that the Dashboard built
under [DD-18](#dd-18--ui-fidelity-full-console-nav-real-dashboard-verified-copy-deck) bore no
resemblance to the real layout (stat-tiles-plus-recent-zones vs. a four-card marketing grid), and
that the left-nav grouping and the zone-detail tab set were both wrong.

**Decision.** Rebuild one UI surface at a time against the captures, in order: login, app-shell nav,
Dashboard, hosted zones list, zone-detail shell, records tab + record detail, create-record form,
edit-record form, zone create/edit forms. Each surface: build, `tsc`/lint, Playwright screenshot
against the matching reference image, fix discrepancies, commit alone — so a long session degrades
gracefully rather than losing everything to a single bad diff. Concretely, the captures corrected:

- **Nav** (`01-nav.png`, `02-zones-list.png`): flat top-level items (Dashboard, Hosted zones, Health
  checks, Profiles) rather than everything nested under a "Hosted zones" section; Resolver splits
  into **Global Resolver** and **VPC Resolver**, not one section; Domains sits after VPC Resolver.
- **Dashboard** (`08-dashboard.png`): a four-card feature grid (DNS management / Availability
  monitoring / Traffic management / Domain registration), a Register-domain search box, and an empty
  Notifications table — not stat tiles and a recent-zones list. Real zone/record counts are kept, but
  folded into the DNS management card rather than forcing a layout the product doesn't have.
- **Zone detail** (`04-records-table.png`): "Hosted zone details" is not a tab — it's an
  `ExpandableSection` above the tab strip, with `Edit` as an inline link inside it, not a standalone
  header button. The tab set is **Records, Accelerated recovery, DNSSEC signing, Tags** — not
  "Hosted zone details" / "Query logging" as tabs. Header actions are **Export zone file, Delete
  zone, Test record, Configure query logging** as flat buttons — no `Actions` dropdown. A **split
  panel** shows "N records selected" / the selected record's detail, matching the real console.
- **Create record** (`05-create-record-form.png`): the zone-name suffix next to `Record name` is
  plain text, not a second disabled input; the record-type option text is the much longer
  `A – Routes traffic to an IPv4 address and some AWS resources`, not the short `A — IPv4 address`
  this project's copy deck had carried since DD-18 (sourced from the developer guide's prose, not the
  live dropdown — a reminder that documentation prose and actual UI strings are not the same source);
  TTL presets are **1m / 1h / 1d**, no `5m`; and the value field is labelled plain `Value`, not
  `Value/Route traffic to`.

**Alternatives considered.**
- *Treat the captures as directional only, keep the existing screens.* Cheaper, but defeats the
  entire point of DD-19 — `AS-V1` is the first evaluation criterion, and the captures exist
  specifically to close gaps that documentation can't.
- *One big rewrite pass instead of surface-by-surface commits.* Faster if nothing goes wrong, but a
  single commit spanning nine surfaces means a bad diff or a dropped session loses everything;
  per-surface commits bound the blast radius of either.

**Trade-off accepted.** Nine separate rebuild passes instead of one, and several already-shipped
requirements (`FR-E2`, `FR-F2`, `FR-B21`, `FR-C9`) needed correcting after the fact rather than
getting it right the first time — the cost DD-19 explicitly flagged as still owed until captures
existed. `01-requirements.md` and `07-ui-spec.md` carry `Corrected 2026-07-27` notes at each affected
requirement rather than silently rewriting history.

---

## DD-22 — Mocked actions get a shared demo-limitation toast, rather than more Coming Soon routes

**Status:** Accepted

**Context.** DD-21's revamp added interactive-looking elements that have no real backing: the
Dashboard's other three feature cards (`Create health check`, `Create policy`, `Register domain`),
its Register-domain search and Notifications refresh, two new nav leaves (`Global resolvers`,
`Outposts`) added purely to complete the nav tree, and the zone-detail shell's `Accelerated
recovery` tab and `Test record`/`Configure query logging` header buttons. [FR-F1](./01-requirements.md)
already has a pattern for unbuilt sections — a full `ComingSoon` page inside the shell — but that
pattern assumes a whole nav leaf's worth of scope; these are individual buttons and one tab on
screens that are otherwise fully real.

**Decision.** A single shared helper, `pushDemoLimitationToast()`, wraps `pushFlash({type: "info",
content: "This is a demo — only Hosted zones and DNS records are fully functional here."})`. Every
mocked interactive element — the three inert feature cards, Register-domain's search and its
"transfer your domains" link, Notifications' refresh button, the two toast-only nav leaves, the
`Accelerated recovery` tab, and `Test record`/`Configure query logging` — calls it instead of
navigating or doing nothing silently.

**Alternatives considered.**
- *Build two more `ComingSoon` routes for the new nav leaves*, matching `FR-F1`'s existing pattern.
  Consistent, but disproportionate for two leaves added purely for nav-tree completeness, and it
  doesn't fit buttons/tabs that live on an otherwise-real page at all — there's no natural route for
  "the Dashboard's third feature card" to navigate to.
- *Do nothing on click* (silent no-op). Cheapest, but indistinguishable from a bug — a reviewer
  clicking `Register domain` and seeing nothing happen reads as broken, not as a stated boundary.
- *A disabled/greyed-out affordance instead of a clickable one.* Visually honest, but it costs the
  visual fidelity DD-21 exists to buy — the real console's cards, buttons, and tabs are not disabled.

**Trade-off accepted.** A small class of buttons that look fully functional until clicked. Mitigated
by the toast's wording being specific and immediate — it names exactly what *is* real (Hosted zones,
DNS records) rather than a generic "not implemented" — so the boundary is stated the moment it's hit,
consistent with `FR-F1`'s existing "Coming Soon" tone rather than introducing a second one.

---

## DD-23 — Multi-record quick create built for real

**Status:** Accepted

**Context.** `05-create-record-form.png` shows Quick create record with a **numbered, collapsible
`Record 1` section** and an `Add another record` button — the real console lets one submission create
several record sets at once. `FR-C9` only ever specified single-record quick create; extending it to
match the capture meant deciding whether the multi-record chrome would be cosmetic (an `Add another
record` button that does nothing real) or functional.

**Decision.** Build it for real. The create-record page holds an array of record drafts, each an
independently editable, independently deletable `ExpandableSection` numbered `Record N`; `Add another
record` appends a blank draft; `Create records` submits every draft **sequentially** against the
existing single-record `POST /hosted-zones/{id}/records` endpoint (no bulk-create endpoint was added
— this is a frontend-side loop, not new backend scope), stopping and reporting which draft failed if
one does, and showing a single success flash naming how many records were created.

**Alternatives considered.**
- *Cosmetic only — `Add another record` shows the demo-limitation toast (DD-22) instead of doing
  anything.* Consistent with how this session treated other capture-driven additions, but multi-record
  create is not a peripheral affordance the way "Register domain" is — it's the primary create flow's
  own headline feature, sitting front and center in the capture, and faking the button a reviewer is
  most likely to actually try would read worse than not having the capture at all.
- *A dedicated bulk-create endpoint accepting an array of record bodies.* Fewer round trips and a
  cleaner atomicity story, but it's new backend surface for a UI-driven request with no `AS-*`
  parent, and the sequential-loop approach reuses validation, error shapes, and cache invalidation
  that already exist and are already tested.

**Trade-off accepted.** N separate round trips instead of one, and a failure partway through a batch
leaves the earlier drafts' records already created — there is no rollback. Acceptable because each
draft is independently valid before submission (the same validation as single-record create), so a
mid-batch failure is a genuine per-record rejection (bad grammar, conflicting name) rather than a
partial-write hazard, and the error message names which record and how many succeeded before it.

---

## DD-24 — Record-detail split panel threaded via React Context

**Status:** Accepted

**Context.** `04-records-table.png` shows the real Records tab with an `AppLayout` **split panel**:
"N records selected" collapsed to "Select a record to see its details" when nothing is selected, and
the selected record's full field set when exactly one is. `splitPanel` is an `AppLayout`-level prop
owned by `app/(console)/layout.tsx`, but the content it needs to show is page-specific state (which
record is selected) that only the Records tab page component has.

**Decision.** A `SplitPanelContext` (mirroring the existing `BreadcrumbsContext` pattern) lets a page
call `useSetSplitPanel(panel, key)` with its current header/content and an effect cleans up on
unmount; `(console)/layout.tsx` reads the context and renders it into `AppLayout`'s `splitPanel` prop,
auto-opening it the first time a page provides one. `splitPanelSize` is **explicitly controlled**
(260px, resizable) rather than left to `AppLayout`'s own uncontrolled default — see DD-25.

**Alternatives considered.**
- *Render the detail inline in the table row (an expandable row), skip the split panel entirely.*
  Much less plumbing, but it isn't what the capture shows, and split panels are themselves a
  Cloudscape pattern this project hasn't used yet.
- *Lift all Records-tab state into the layout component.* Avoids a new context, but couples an
  `AppLayout`-owning component that every authenticated page shares to one page's selection state —
  every other page would carry dead code for a panel it never uses.

**Trade-off accepted.** A second context alongside `BreadcrumbsContext` for what is conceptually the
same kind of problem (page-specific content needed at the `AppLayout` level), rather than a single
generalized "shell slots" context covering both. Accepted because the two have different lifecycles
— breadcrumbs are set once per page render, the split panel's content changes on every selection
change — and a shared generic slot API would have to accommodate both at the cost of clarity in each.

---

## DD-25 — Three Cloudscape/Next.js gotchas found during the revamp

**Status:** Accepted

**Context.** Building DD-21 through DD-24 surfaced three defects that had nothing to do with visual
fidelity and everything to do with Cloudscape/Next.js default behaviour not matching what this
codebase assumed. None were caught earlier because the interactions that trigger them — clicking a
secondary button inside a form, selecting a table row with a split panel open, failing a login —
hadn't been exercised end-to-end with network/console monitoring until the revamp's Playwright
verification loop did exactly that.

**Decision — fix all three, document the pattern so it isn't reintroduced.**

1. **Cloudscape `Button` defaults `formAction` to `"submit"`.** Any button rendered inside a native
   `<form>` — a `Delete` action on a record draft, a TTL preset, `Add another record`, even `Cancel`
   — silently submits the form on click unless it isn't the intended submit action. This was already
   a latent bug on every existing form (the TTL preset buttons on the original single-record create
   page), but went unnoticed until the multi-record form's `Add another record` button made it
   produce a visibly wrong result (a premature, partial submission). **Fix:** every button in every
   form that isn't the primary submit action now sets `formAction="none"` explicitly — audited across
   all five forms in the app, not just the one that surfaced it.
2. **`AppLayout`'s `splitPanelSize` defaults to roughly half the viewport height when left
   uncontrolled.** This silently covered the records table's row checkboxes with the split panel
   itself, making row selection impossible without ever throwing an error — a Playwright click on a
   checkbox simply timed out because a different element was on top of it at that screen position.
   **Fix:** `splitPanelSize` is controlled (DD-24), defaulting to 260px.
3. **The app-wide 401 interceptor in `lib/api/client.ts` treated every 401 as a session expiry**,
   including the login endpoint's own 401 for wrong credentials (`FR-A3`) — so a failed sign-in
   force-reloaded `/login` before React could render the inline error, silently wiping the form
   instead of showing *"Your sign-in details are incorrect. Please try again."* **Fix:** the
   interceptor now checks the request's OpenAPI `schemaPath` and skips the redirect for
   `/v1/auth/login` specifically; every other endpoint's 401 still triggers the existing
   session-expiry redirect unchanged.

**Alternatives considered.**
- *Leave the `formAction` issue as a one-off fix on the button that surfaced it.* Cheaper in the
  moment, but the same default silently affects every other secondary button in the app; auditing all
  five forms once was cheaper than finding the same bug five more times.
- *Give the split panel an uncontrolled size and just document the limitation.* Rejected — it isn't a
  cosmetic issue, it makes a core interaction (selecting a record) actually unusable at the default
  size.
- *Special-case the redirect on the frontend (skip it only when already on `/login`), rather than at
  the interceptor.* This was actually the interceptor's original guard (`isAlreadyOnLogin`) — but it
  still reloads `/login`, just without the `?next=` param, which is exactly the bug: reloading is the
  problem, not the destination.

**Trade-off accepted.** None of these are visible in a code read of any single file in isolation —
the `formAction` and `splitPanelSize` defaults are Cloudscape's internal behaviour, and the 401
interceptor bug only manifests on the one endpoint it wasn't written to think about. All three were
found only because the revamp's verification loop (build → screenshot → **drive the actual
interaction in a real browser**) went past visual comparison into functional exercising. This is the
argument for keeping that loop even on stage-2/polish work, not just structural stage 1
([DD-20](#dd-20--two-stage-implementation-structural-then-additive)).
