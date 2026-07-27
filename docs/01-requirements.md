# Software Requirements Specification — AWS Route53 Clone

| | |
|---|---|
| **Project** | Scaler SDE Fullstack Assignment — AWS Route53 Clone |
| **Phase** | 1 of 6 — Requirements ([roadmap](./00-sdlc-roadmap.md)) |
| **Version** | 3 — restructured around the assignment's own asks |
| **Status** | Draft for review |
| **Source** | `Scaler_SDE_Fullstack_Assignment_-_AWS_Route53_Clone` (Google Doc), re-read 2026-07-27 |
| **Companion** | [Design decisions log](./02-design-decisions.md) — the *why* behind every choice here |

## How to read this document

**§2 is the assignment itself** — all **73** discrete asks, enumerated as `AS-*` IDs in the brief's
own order and wording. It is the no-deviation checklist: nothing we build should fail to trace back
to it, and nothing in it should go unbuilt.

Everything after §2 is *our* work. Each requirement declares which `AS-*` it satisfies. Requirements
with **no** parent ask are tagged **`[DERIVED]`** and point at the design decision that justifies
them — added scope must be as visible as missing scope.

**§14 closes the loop**: every `AS-*` mapped to the requirements covering it, plus a separate table
of everything we added beyond the brief.

Requirement IDs: `FR-x#` functional, `NFR-#` non-functional, `DR-#` data.
Priorities: **P0** required to pass · **P1** required to be strong · **P2** bonus, droppable.
Fact markers: **`[VERIFIED]`** confirmed against AWS docs (§15) · **`[UNVERIFIED]`** best-effort recollection.

---

## 1. Purpose

Build a functional clone of the **AWS Route53 web console** with a real backend API and persistent
storage, such that a Route53 user recognises it immediately and can complete their normal workflows
without relearning anything.

---

## 2. The Assignment, As Stated

Faithful enumeration of the brief. Wording follows the source; our interpretation is deliberately
absent from this section. **Type** is `Mandatory` (must build), `Optional` (brief marks it bonus),
or `Mockable` (brief explicitly permits a placeholder).

### 2.1 Objective — `AS-O`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-O1** | "Build a functional clone of the AWS Route53 web application" | Mandatory | Whole document |
| **AS-O2** | "…with persistent storage" | Mandatory | DR-1 – DR-10 |
| **AS-O3** | "…and a backend API" | Mandatory | §11.1, NFR-5 |
| **AS-O4** | "The focus is on recreating the Route53 user experience and core workflows rather than implementing actual DNS functionality." | Mandatory *(constraint)* | §3.2, FR-E*, FR-C11 |

### 2.2 Tech Stack — `AS-T`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-T1** | Frontend: **Next.js (TypeScript)** | Mandatory | NFR-1, NFR-6, NFR-15 |
| **AS-T2** | Backend: **FastAPI** | Mandatory | NFR-5, §11.1 |
| **AS-T3** | Database: **SQLite** | Mandatory | DR-1, NFR-12 |

### 2.3 Authentication — `AS-A`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-A1** | "Implement a simple mocked authentication system." | Mandatory | FR-A1, FR-A2 |
| **AS-A2** | Login | Mandatory | FR-A1, FR-A2, FR-A3 |
| **AS-A3** | Logout | Mandatory | FR-A5 |
| **AS-A4** | Session persistence | Mandatory | FR-A4, FR-A6, FR-A7, FR-A8 |
| **AS-A5** | "IAM, AWS Accounts, Organizations, Billing, and other AWS dependencies can be mocked." | Mockable | §3.2, §4.2 #1–#3, FR-E3 |

### 2.4 Hosted Zones — `AS-H`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-H1** | "Implement full CRUD functionality for Hosted Zones." | Mandatory | FR-B10 – FR-B20 |
| **AS-H2** | View Hosted Zones | Mandatory | FR-B1, FR-B2, FR-B8, FR-B21, FR-B23 |
| **AS-H3** | Search Hosted Zones | Mandatory | FR-B3, FR-B4 |
| **AS-H4** | Create Hosted Zones | Mandatory | FR-B10 – FR-B14 |
| **AS-H5** | Edit Hosted Zones | Mandatory | FR-B15, FR-B16 — **scope narrowed, see A1** |
| **AS-H6** | Delete Hosted Zones | Mandatory | FR-B17 – FR-B20 — **conditional, see A1** |
| **AS-H7** | "All data must persist in SQLite." | Mandatory | DR-1, DR-2, DR-4 |

### 2.5 DNS Records — `AS-R`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-R1** | "Implement full CRUD functionality for DNS Records within a Hosted Zone." | Mandatory | FR-C1 – FR-C17 |
| **AS-R2** | Record type **A** | Mandatory | FR-D1, FR-D6 |
| **AS-R3** | Record type **AAAA** | Mandatory | FR-D1, FR-D6 |
| **AS-R4** | Record type **CNAME** | Mandatory | FR-D1, FR-D3, FR-D6 |
| **AS-R5** | Record type **TXT** | Mandatory | FR-D1, FR-D6 |
| **AS-R6** | Record type **MX** | Mandatory | FR-D1, FR-D6 |
| **AS-R7** | Record type **NS** | Mandatory | FR-D1, FR-D4, FR-D6 |
| **AS-R8** | Record type **PTR** | Mandatory | FR-D1, FR-D6 |
| **AS-R9** | Record type **SRV** | Mandatory | FR-D1, FR-D6 |
| **AS-R10** | Record type **CAA** | Mandatory | FR-D1, FR-D6 |
| **AS-R11** | View Records | Mandatory | FR-C3, FR-C7, FR-C8 |
| **AS-R12** | Search Records | Mandatory | FR-C4, FR-C5 |
| **AS-R13** | Create Records | Mandatory | FR-C9 – FR-C13 |
| **AS-R14** | Edit Records | Mandatory | FR-C14 |
| **AS-R15** | Delete Records | Mandatory | FR-C15, FR-C16 |
| **AS-R16** | "All data must persist in SQLite." | Mandatory | DR-1, DR-3, DR-5 |

> The brief says *"common Route53 record types **such as**"* — an open-ended list. We treat the nine
> named types as the complete required set; Route53's other types (DS, HTTPS, NAPTR, SPF, SSHFP,
> SVCB, TLSA) are out of scope (§3.2).

### 2.6 Route53 Experience — `AS-E`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-E1** | "The application should closely resemble the AWS Route53 experience" | Mandatory | FR-E1 – FR-E11, [DD-1](./02-design-decisions.md#dd-1--aws-cloudscape-design-system-for-the-ui) |
| **AS-E2** | Navigation structure | Mandatory | FR-E1, FR-E2, FR-E3, FR-B22 |
| **AS-E3** | Hosted Zone management | Mandatory | FR-B* |
| **AS-E4** | DNS Record management | Mandatory | FR-C*, FR-D* |
| **AS-E5** | Tables | Mandatory | FR-B1, FR-C3, FR-E6 |
| **AS-E6** | Forms | Mandatory | FR-B10, FR-C9, FR-E8 |
| **AS-E7** | Search | Mandatory | FR-B3, FR-C4 |
| **AS-E8** | Filters | Mandatory | FR-B4, FR-C5 |
| **AS-E9** | Pagination | Mandatory | FR-B5, FR-C6 |
| **AS-E10** | Modals | Mandatory | FR-B17, FR-C15, FR-E5 |
| **AS-E11** | Notifications | Mandatory | FR-E4 |
| **AS-E12** | "The goal is to make the application feel like Route53 rather than a generic CRUD application." | Mandatory *(intent)* | FR-C1, FR-B13, FR-B18, FR-C16, FR-D3, FR-E1 – FR-E11 |

> **AS-E12 is the brief's clearest statement of intent, and it is what drove decisions A1 and A2.**
> Where the wording of a specific ask and the real product diverge, this line is why we build to the
> product — see [DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches).

### 2.7 Mocked Sections — `AS-M`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-M1** | Dashboard | Mockable | FR-F1, FR-F2 |
| **AS-M2** | Traffic Policies | Mockable | FR-F1 |
| **AS-M3** | Health Checks | Mockable | FR-F1 |
| **AS-M4** | Resolver | Mockable | FR-F1 |
| **AS-M5** | Profiles | Mockable | FR-F1 |
| **AS-M6** | "A simple 'Coming Soon' page is sufficient." | Mockable | FR-F1 |

### 2.8 Bonus — `AS-B`

The brief lists **five** optional items. **All five are in scope**, delivered as four workstreams
(shortcuts and bulk operations ship together), each at priority **P2** so any can be cut without
touching core work. See [DD-11](./02-design-decisions.md#dd-11--all-five-bonus-items-in-scope-at-p2).

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-B1** | Import DNS records from BIND zone files | Optional | FR-G3 |
| **AS-B2** | Export Hosted Zones as JSON or BIND format | Optional | FR-G2 |
| **AS-B3** | Dark Mode | Optional | FR-G1 |
| **AS-B4** | Keyboard Shortcuts | Optional | FR-G5 |
| **AS-B5** | Bulk Operations | Optional | FR-G4 |

### 2.9 Deliverables — `AS-D`

| ID | Ask | Type | Satisfied by |
|---|---|---|---|
| **AS-D1** | GitHub repository | Mandatory | NFR-15 |
| **AS-D2** | `frontend/` | Mandatory | NFR-15 |
| **AS-D3** | `backend/` | Mandatory | NFR-15 |
| **AS-D4** | README — Setup instructions | Mandatory | NFR-13, NFR-14 |
| **AS-D5** | README — Architecture overview | Mandatory | NFR-5, NFR-6, NFR-14 |
| **AS-D6** | README — Database schema | Mandatory | DR-2, NFR-14 |
| **AS-D7** | README — API overview | Mandatory | §11.1, NFR-14 |
| **AS-D8** | "Demo: A hosted working link" | Mandatory | NFR-12, [DD-2](./02-design-decisions.md#dd-2--vercel-for-the-frontend-flyio-with-a-volume-for-the-backend) |

### 2.10 Evaluation Criteria — `AS-V`

Not features, but the axes the work is judged on. Listed because they shape priority.

| ID | Criterion | Addressed by |
|---|---|---|
| **AS-V1** | UI similarity to Route53 | FR-E1 – FR-E11, [DD-1](./02-design-decisions.md#dd-1--aws-cloudscape-design-system-for-the-ui) |
| **AS-V2** | Frontend engineering quality | NFR-1, NFR-6, NFR-7, NFR-9, NFR-10 |
| **AS-V3** | Backend/API design | NFR-2 – NFR-5, FR-D6, §11.1 |
| **AS-V4** | Database design | DR-1 – DR-10, [DD-8](./02-design-decisions.md#dd-8--records-are-record-sets-with-values-in-a-child-table) |
| **AS-V5** | Code quality and maintainability | NFR-5, NFR-6, NFR-7 |
| **AS-V6** | Documentation | NFR-14, this SRS, [decisions log](./02-design-decisions.md) |
| **AS-V7** | Overall completeness | §13 acceptance criteria, §14 traceability |

**Total: 73 asks** — 4 objective · 3 stack · 5 auth · 7 hosted zones · 16 records · 12 experience ·
6 mocked · 5 bonus · 8 deliverables · 7 evaluation.

---

## 3. Scope Boundaries

### 3.1 In scope

Everything in §2 marked Mandatory or Mockable, plus all five Optional bonus items at P2.

### 3.2 Out of scope

Per **AS-O4** — *"rather than implementing actual DNS functionality"* — and **AS-A5**.

| Not building | Basis |
|---|---|
| Real DNS resolution | AS-O4. No nameserver runs. Records are data. NS/SOA values are cosmetic. |
| Real IAM, roles, policies | AS-A5. A user is a row; no permission model beyond "logged in". |
| AWS accounts, Organizations, Billing | AS-A5. Static display values in the top nav. |
| Domain registration | Not in the brief. The `Domains` nav section is not implemented. |
| Actual health checking | AS-M3 permits a placeholder. |
| Alias records resolving to real AWS resources | AS-O4. Rendered for parity; targets are a mocked list (FR-C12). |
| Routing policy *evaluation* | AS-O4. All eight are selectable and stored; none evaluated (FR-C11). |
| Record types beyond the nine named | AS-R2 – AS-R10 define the required set. |

---

## 4. Assumptions Register

Where the brief is silent or ambiguous, these are the readings we took. **§4.1** covers the six
consequential ones, each walked through and decided individually; **§4.2** covers routine defaults.

### 4.1 Consequential assumptions

#### A1 — Fidelity to real Route53 outranks a literal reading of the brief

**Assumed:** where the real product and the assignment wording diverge, build to the real product.

**Where it bites:** **AS-H5** says *"Edit Hosted Zones"* and **AS-H6** says *"Delete Hosted Zones"*,
unqualified. Real Route53 refuses both in common cases — a zone cannot be renamed (its name is the
DNS suffix of every record inside it), and a zone holding records cannot be deleted
(`HostedZoneNotEmpty`). Both features exist, but both can *look* unfinished to someone working a
checklist.

**RESOLVED — AWS behaviour, plus escape hatches so nothing dead-ends.** Justified by **AS-E12**
(*"feel like Route53 rather than a generic CRUD application"*). Every blocked path offers a visible
way forward: FR-B18a's guided cascade delete, and FR-B15's explanatory helper text.
See [DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches).

#### A2 — Concepts imported that the brief never mentions

**Assumed:** if real Route53 has it, it belongs here — so public/private zone types, delegation
nameservers, DNSSEC and query-logging tabs, tags, routing policies, alias records, and change-info
objects appeared as requirements without any `AS-*` parent.

**RESOLVED — keep all seven, tagged `[DERIVED]`.** `Type`, `Routing policy`, and `Alias` are visible
columns in the console tables a grader compares against, so **AS-E5** and **AS-E12** are the
justification. Consequences: `set_identifier` stays in the record uniqueness key, and TTL stays
conditional on the alias toggle. See [DD-7](./02-design-decisions.md#dd-7--keep-seven-route53-concepts-the-brief-never-mentions).

#### A3 — The record-set data model

**Assumed, and originally stated as fact:** records are stored as *record sets* keyed on
`(zone, name, type, set_identifier)` holding an ordered value list — not one row per value.

Visible on screen, not an internal detail: three IPs on one hostname render in real Route53 as **one
row with three stacked values**, and under a naive model as **three duplicate-looking rows**.

**RESOLVED — record sets, values in a child `record_values` table** with an `ordinal`. Rejected: a
JSON array column (value search becomes an unindexed blob scan) and a flat model (visibly not
Route53, breaking **AS-E12**). See [DD-8](./02-design-decisions.md#dd-8--records-are-record-sets-with-values-in-a-child-table).

#### A4 — Route53 specifics recalled from memory

**Assumed:** that recollection of the real console and API was accurate enough to specify from. It
partly wasn't — a verification pass against the AWS Developer Guide on 2026-07-27 found four errors:

| Originally said | Actually | Fixed in |
|---|---|---|
| CAA `tag` ∈ {`issue`, `issuewild`, `iodef`} | any string of `A-Z a-z 0-9`; AWS documents custom tags with flag `128` | FR-D1 |
| 100 values per record set | **400** | FR-D5 |
| Zone/record names allow letters, digits, hyphens only | that is the *domain registration* rule; zones and records allow **any printable ASCII except space** | FR-B11 |
| Wildcard `*` allowed as leftmost label | records only — must replace the **whole** label, **forbidden on NS**, and a zone name cannot begin with `*` | FR-D4 |

**RESOLVED — verify from public documentation; UI-level details stay best-effort.** API facts are
`[VERIFIED]` with sources at §15. Console layout (column sets, nav order, TTL presets, date format,
NS default TTL) is not publicly documented and stays `[UNVERIFIED]`. ~~No screenshots will be used.~~

**REVISED 2026-07-27 — screenshots adopted after all** ([DD-19](./02-design-decisions.md#dd-19--how-ui-fidelity-is-sourced)).
With `AS-V1` the first evaluation criterion, leaving console layout to recollection was the single
largest cap on fidelity — and the fix turned out to be free: Route53's pricing page confirms *"A
hosted zone that is deleted within 12 hours of creation is not charged"*, so a throwaway zone can be
created, captured, and deleted at no cost. Two further sources were added: AWS's own
[`cloudscape-design/demos`](https://github.com/cloudscape-design/demos) (MIT-0) for console page
patterns, and Playwright MCP for the implementation build loop. Reading the demos immediately
corrected two wrong patterns — see DD-19.

#### A5 — Strict server-side validation of record values

**Assumed: AS-R2 – AS-R10** (*"Support common Route53 record types such as…"*) means **validate**
the values, not merely list the types in a dropdown. The first draft additionally specified
mirroring all nine grammars client-side — writing each twice, in Python and TypeScript.

**RESOLVED — the backend owns the grammars and serves them to the frontend** via `GET /record-types`
(FR-D6). One source of truth; semantic rules needing a database lookup stay server-only.
See [DD-9](./02-design-decisions.md#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend).

#### A6 — Confirmation friction on destructive actions

**Assumed:** zone deletion requires typing the zone name, justified as matching the console — held
with low confidence. A1's cascade escape hatch then raised the stakes: that button destroys a zone
*and every record in it* in one click.

**RESOLVED — friction scales with blast radius.** Simple confirm for single records and empty zones;
type-to-confirm for cascade and bulk delete. See FR-B17 and
[DD-10](./02-design-decisions.md#dd-10--confirmation-friction-scales-with-blast-radius).

### 4.2 Routine assumptions

Defaults chosen where the brief is silent. Each is cheap to change.

| # | Area | Assumption | Rationale |
|---|---|---|---|
| 1 | Account | Single mocked AWS account `123456789012`, one region, display-only | AS-A5 permits mocking |
| 2 | Users | 2–3 seeded users, no signup flow | AS-A1 says *simple mocked* |
| 3 | Users | Zones carry `owner_id`, but **all users see all zones** | Mirrors a shared AWS account; ownership shows only in `Created by` |
| 4 | Auth | JWT in an httpOnly cookie rather than a frontend-only fake | Exercises real session handling; still mocked per AS-A1 |
| 5 | Auth | **24-hour** token lifetime, no refresh token | Arbitrary; long enough a grader never gets logged out mid-review |
| 6 | Auth | One generic message for both login failure modes | Standard practice; avoids user enumeration |
| 7 | Search | Zone search matches **name + description**; record search matches **name + values** | AS-H3/AS-R12 say only "Search"; matching visible columns is least surprising |
| 8 | Search | Case-insensitive substring, not prefix or fuzzy | Simplest thing that behaves as users expect |
| 9 | Lists | Search, filter, sort, pagination all **server-side** | Fetch-all-then-filter is the most common way these apps fail review (AS-V2) |
| 10 | Lists | Default page size **10**; options 10 / 25 / 50 (records also 100) | Matches console density |
| 11 | Lists | Filter/page/sort state lives in the URL | Makes any view shareable and the back button correct |
| 12 | Lists | Column visibility and page size persist in `localStorage` | Cloudscape `CollectionPreferences` does this natively |
| 13 | API | `/api/v1` prefix, `PATCH` for partial updates, offset pagination | Offset suits numbered pages; cursor would be over-engineering ([DD-13](./02-design-decisions.md#dd-13--offset-pagination-not-cursor)) |
| 14 | API | Uniform list envelope and uniform error body | One frontend code path for every endpoint (AS-V3) |
| 15 | API | AWS-style error codes (`HostedZoneNotEmpty`, `InvalidChangeBatch`) | Lets the UI branch on `code` rather than parse prose |
| 16 | Data | Description capped at 256 characters | Route53's own comment limit `[UNVERIFIED]` |
| 17 | Data | Names stored fully qualified and lowercased | `[VERIFIED]` — Route53 stores alphabetic characters lowercase |
| 18 | Data | Trailing dot accepted and normalised away | `[VERIFIED]` — Route53 treats both forms as identical |
| 19 | Data | Timestamps stored UTC, rendered in the viewer's zone | Avoids a class of off-by-one-day bugs |
| 20 | Data | Alembic migrations rather than `create_all` | Makes the schema versioned and reviewable (AS-V4) |
| 21 | Data | Seed script creates 3–4 zones with a realistic type spread | The hosted demo (AS-D8) must never open empty |
| 22 | Data | Alias target as a nullable JSON column, not its own table | 1:0..1 join buys nothing ([DD-14](./02-design-decisions.md#dd-14--alias-target-as-a-nullable-json-column)) |
| 23 | Data | Tags get a dedicated `hosted_zone_tags` table, not a polymorphic one | Only zones are taggable in this scope |
| 24 | UI | Create and edit are full pages; modals for destructive confirmation only | Matches the console (AS-E10) |
| 25 | UI | In-table skeletons, never a full-page spinner | Matches the console; avoids layout jump |
| 26 | UI | Dark mode honours `prefers-color-scheme` first, then persists the choice | Least-surprise default (AS-B3) |
| 27 | Testing | ≥80% line coverage on `services/` — **an invented target** | A round number keeping the domain layer honest without chasing coverage in glue code |
| 28 | Testing | <200 ms lists at 1,000 zones / 10,000 records — **also invented** | 10,000 is Route53's real per-zone quota, so at least a meaningful ceiling |
| 29 | Testing | Playwright E2E, `pytest` backend, `vitest` frontend units | Conventional; Playwright specs map 1:1 onto §13 |
| 30 | Bonus | BIND import is atomic and preview-first | Partial imports leave a zone in a state nobody asked for |
| 31 | Bonus | Export must round-trip back through import | Cheapest way to prove both directions correct |
| 32 | Bonus | Shortcuts are `/` search, `c` create, `Esc` close, `?` help | Conventional; `?` is self-documenting |

---

## 5. Actors

| Actor | Description |
|---|---|
| **Console user** | The only real actor. Authenticated; sees and manages hosted zones. |
| **System** | Generates zone IDs, nameservers, SOA and NS records, and change IDs on zone creation. |

---

## 6. FR-A — Authentication

> **Satisfies:** AS-A1, AS-A2, AS-A3, AS-A4, AS-A5

| ID | Priority | Requirement |
|---|---|---|
| **FR-A1** | P0 | A login page accepts email and password and authenticates against seeded users. It echoes the AWS sign-in layout **without reproducing AWS trademarks or branding assets**. |
| **FR-A2** | P0 | On success the backend issues a **JWT in an httpOnly, Secure cookie**, never readable by JavaScript. |
| **FR-A3** | P0 | Invalid credentials return `401` with one generic message for both failure modes. |
| **FR-A4** | P0 | **Session persistence (AS-A4)**: full reload, new tab, and browser restart within the 24h lifetime all stay logged in. |
| **FR-A5** | P0 | Logout clears the cookie server-side and redirects to `/login`; later calls return `401`. |
| **FR-A6** | P0 | All routes except `/login` are guarded. An unauthenticated deep link redirects to `/login?next=<path>` and returns there after sign-in. |
| **FR-A7** | P1 | `GET /auth/me` returns the current user; the frontend hydrates session state and the top-nav user menu from it. |
| **FR-A8** | P1 | A `401` from any call clears client state and redirects **once** — no loops, no toast spam. |

---

## 7. FR-B — Hosted Zones

> **Satisfies:** AS-H1 – AS-H7, AS-E3

### 7.1 View, search, filter, pagination — *AS-H2, AS-H3, AS-E5, AS-E8, AS-E9*

| ID | Priority | Requirement |
|---|---|---|
| **FR-B1** | P0 | Zones list in a Cloudscape `Table` with columns `Hosted zone name`, `Type`, `Created by`, `Record count`, `Description`, `Hosted zone ID`. `[UNVERIFIED]` |
| **FR-B2** | P0 | Header shows a count — `Hosted zones (12)` — and hosts `Create hosted zone`, `Edit`, `Delete`, `View details`. Selection-dependent actions disabled until a row is selected. Because the total is known only from the response, the counter uses Cloudscape's **server-side** form and is **hidden while loading** rather than flashing a stale number. |
| **FR-B3** | P0 | **Search (AS-H3)**: `TextFilter` placeholder *"Find hosted zones"*, case-insensitive substring over **name and description**, **server-side** so it spans pages. **Debounced** via `TextFilter`'s `onDelayedChange` — binding the fetch to `onChange` fires one request per keystroke (UI spec §6.1). Applies equally to FR-C4. |
| **FR-B4** | P1 | **Filter (AS-E8)** by `Type` (Public / Private), combining with search as AND. |
| **FR-B5** | P0 | **Pagination (AS-E9)**: server-side, default 10, selector 10 / 25 / 50. |
| **FR-B6** | P1 | Server-side sorting on name, record count, and type; survives pagination. |
| **FR-B7** | P1 | `CollectionPreferences` covering page size, column visibility, and — matching AWS's own demos — **content density, row striping, and sticky columns**; persisted in `localStorage`. The last three are **stage 2** (UI spec §11). |
| **FR-B8** | P0 | The zone name cell links to that zone's records page. |
| **FR-B9** | P1 | Distinct empty state (*"No hosted zones"* + create button) and no-match state (*"No matches"* + `Clear filter`). |

### 7.2 Create — *AS-H4*

| ID | Priority | Requirement |
|---|---|---|
| **FR-B10** | P0 | `Create hosted zone` opens a **full page** with **Domain name** (required), **Description** (optional, ≤256 chars), **Type** (radio, default Public) `[DERIVED — A2]`, **Tags** (repeatable key/value) `[DERIVED — A2]`. |
| **FR-B11** | P0 | Domain name validation `[VERIFIED]`: ≤ **255 bytes** total, each label ≤ **63 bytes**, ≥ 2 labels. Permitted characters are **any printable ASCII except space** — *not* the narrower letters/digits/hyphens rule, which governs domain *registration* only. Trailing dot accepted and normalised; stored **lowercased**. |
| **FR-B12** | P0 | A duplicate domain name returns `409 ConflictingDomainExists`, rendered as an inline field error. |
| **FR-B13** | P0 | On creation the system auto-generates `[DERIVED — A2]`: a `Z`-prefixed zone ID `[UNVERIFIED format]`; **four nameservers** following Route53's real pattern of sequential numbering across four different TLDs — `ns-2048.awsdns-64.com`, `ns-2049.awsdns-65.net`, `ns-2050.awsdns-66.org`, `ns-2051.awsdns-67.co.uk` `[VERIFIED]`; an apex **NS record set** holding those four (TTL `172800` `[UNVERIFIED]`); and an apex **SOA record set**, TTL **900** `[VERIFIED]`, value `<ns> <hostmaster-email> 1 7200 900 1209600 86400` `[VERIFIED]`. Both flagged `is_required`. |
| **FR-B14** | P0 | After creation the user lands on the zone detail page with a green `Flashbar` — *"Hosted zone example.com created"* — and the nameservers visible under **Hosted zone details**. |

### 7.3 Edit — *AS-H5*

| ID | Priority | Requirement |
|---|---|---|
| **FR-B15** | P0 | **Only description and tags are editable.** Domain name and type are immutable, mirroring Route53. Per **A1**, they render as **read-only values with helper text** — *"Route 53 doesn't support renaming a hosted zone, because the zone name forms the suffix of every record it contains."* — never as greyed-out inputs that read like a bug. |
| **FR-B16** | P1 | Saving shows a success `Flashbar` and returns to the zone detail page. |

> **AS-H5 coverage note.** The brief says "Edit Hosted Zones" without qualification; we deliver
> editing of the fields Route53 itself allows. FR-B15's helper text is what makes the narrowing
> legible rather than looking like an unfinished form.

### 7.4 Delete — *AS-H6*

| ID | Priority | Requirement |
|---|---|---|
| **FR-B17** | P0 | Delete opens a confirmation `Modal` (AS-E10). Per **A6**, friction scales: an **empty** zone needs only Cancel/Delete; the **cascade** path requires type-to-confirm. `[VERIFIED]` The confirmation word is the literal string **`confirm`**, matched case-insensitively — *not* the resource name. Typing the resource name is the S3/RDS pattern; Cloudscape's console pattern, used in AWS's own `delete-with-additional-confirmation` demo, is `confirm`. Field label: *"To confirm this deletion, type \"confirm\"."* Full composition in [§5.6 of the UI spec](./07-ui-spec.md). |
| **FR-B18** | P0 | `DELETE /hosted-zones/{id}` on a zone holding any non-required record returns `409 HostedZoneNotEmpty` with the real message `[VERIFIED]`: *"The specified hosted zone contains non-required resource record sets and so cannot be deleted."* The modal surfaces it as an error alert. |
| **FR-B18a** | P0 | `[DERIVED — A1 / DD-6]` **Escape hatch.** The same modal offers **"Delete all N records, then delete this zone"**, calling `DELETE /hosted-zones/{id}?cascade=true`. Atomic, gated on the FR-B17 type-to-confirm pattern. **This is what makes AS-H6 unconditionally true** — deletion is never a dead end. |
| **FR-B19** | P0 | Deleting a zone holding only its required records succeeds, cascading to records, values, and tags. |
| **FR-B20** | P1 | On success, return to the list with a green `Flashbar` naming the deleted zone. |

### 7.5 Zone detail — *AS-H2, AS-E2*

| ID | Priority | Requirement |
|---|---|---|
| **FR-B21** | P0 | Cloudscape `Tabs`: **Records** (default), **Hosted zone details**, **Query logging** `[DERIVED — A2]`, **DNSSEC signing** `[DERIVED — A2]`. A **key-value summary block sits above the tab strip** (zone ID, type, record count, created) — the console shows core identifying facts immediately and reserves tabs for detail. Secondary actions collapse into an **`Actions` `ButtonDropdown`**, leaving only `Edit` and `Delete` as standalone header buttons; `Test record`, `Import zone file`, and `Export zone file` live in the dropdown. |
| **FR-B22** | P0 | Breadcrumbs `Route 53 › Hosted zones › example.com`, each segment navigable. |
| **FR-B23** | P1 | **Hosted zone details** shows zone ID, type, record count, description, created by, creation date, and the four nameservers in a copyable block. |

---

## 8. FR-C — DNS Records

> **Satisfies:** AS-R1, AS-R11 – AS-R16, AS-E4

### 8.1 Model — *AS-R1*

| ID | Priority | Requirement |
|---|---|---|
| **FR-C1** | P0 | Records are **record sets** (A3): identity `(hosted_zone_id, name, type, set_identifier)`, holding an **ordered value list**. A duplicate identity returns `409`; the UI directs the user to edit the existing set and add a value. |
| **FR-C2** | P0 | Names stored fully qualified and lowercased `[VERIFIED]`. The form shows an editable prefix against a static zone suffix — `[ api ].example.com` — an empty prefix meaning the apex. `[VERIFIED]` The console explicitly instructs users **not** to type `@` for the apex, so the field carries the hint *"Keep blank to create a record for the root domain."* |

### 8.2 View, search, filter, pagination — *AS-R11, AS-R12, AS-E5, AS-E8, AS-E9*

| ID | Priority | Requirement |
|---|---|---|
| **FR-C3** | P0 | Columns `Record name`, `Type`, `Routing policy` `[DERIVED — A2]`, `Alias` `[DERIVED — A2]`, `Value/Route traffic to`, `TTL (seconds)`. `Differentiator`, `Health check ID`, `Record ID` available but hidden by default. `[UNVERIFIED]` |
| **FR-C4** | P0 | **Search (AS-R12)**: `TextFilter` placeholder *"Filter records by property or value"*, case-insensitive over record **name and any value**, server-side. |
| **FR-C5** | P0 | **Filter (AS-E8)**: `Record type` multi-select across the nine types, combining with search as AND. |
| **FR-C6** | P0 | **Pagination (AS-E9)**: server-side, default 10, selector 10 / 25 / 50 / 100. |
| **FR-C7** | P1 | Multi-value sets render one value per line, truncating past 3 with *"+N more"*. |
| **FR-C8** | P1 | Required records render with delete disabled and a tooltip explaining why. |

### 8.3 Create — *AS-R13*

| ID | Priority | Requirement |
|---|---|---|
| **FR-C9** | P0 | `Create record` opens **`Quick create record`** `[VERIFIED]` with the console's exact field labels `[VERIFIED]`: `Record name` (prefix + static zone suffix), `Record type`, `Alias`, **`Value/Route traffic to`** (textarea — *"Enter each value on a separate line"*), `TTL (seconds)` with quick-set **1m / 5m / 1h / 1d** `[UNVERIFIED]`, and `Routing policy`. Type options carry their console descriptions `[VERIFIED]` — `A — IPv4 address`, `AAAA — IPv6 address`, `CAA — Certificate Authority Authorization`, `CNAME — Canonical name`, `MX — Mail exchange`, `NS — Name server`, `PTR — Pointer`, `SRV — Service locator`, `TXT — Text`. The submit button reads **`Create records`**, plural `[VERIFIED]`. Multiple values are permitted for **every type except CNAME** `[VERIFIED]`, which collapses to a single input. Full copy deck in [§7 of the UI spec](./07-ui-spec.md). |
| **FR-C10** | P2 | A `Switch to wizard` link `[VERIFIED]` toggles the multi-step flow (`Choose routing policy` → `Configure records` → `Review`). **Deferred** — Quick create covers every requirement and is the mode most users work in; build only if Phase 3 runs ahead. |
| **FR-C11** | P0 | `[DERIVED — A2]` All eight routing policies selectable — the console labels the default **`Simple routing`** `[VERIFIED]` — plus Weighted, Geolocation, Geoproximity, Latency, IP-based, Multivalue answer, Failover. **Simple is default and the only functional one**; the rest store and display their differentiator but are **never evaluated**, per **AS-O4**. Stated in the README as a deliberate boundary. |
| **FR-C11b** | P1 | `[VERIFIED]` **NS records support only the simple routing policy.** Selecting type `NS` forces `Routing policy` to `Simple routing` and disables the control. |
| **FR-C11a** | P1 | `[DERIVED — A2]` Route53's per-name-and-type quotas `[VERIFIED]`: **100** sets sharing a name and type for weighted, latency, geolocation, multivalue-answer, IP-based; **30** for geoproximity. |
| **FR-C12** | P0 | `[DERIVED — A2]` With `Alias` on, TTL and value hide and an alias-target picker appears, populated from a **static mocked list** (CloudFront, S3 website endpoint, ELB, API Gateway). Never resolved, per **AS-O4**. |
| **FR-C13** | P0 | On success: green `Flashbar` naming the record, form closes, table refreshes, zone `record_count` updates. |

### 8.4 Edit & delete — *AS-R14, AS-R15*

| ID | Priority | Requirement |
|---|---|---|
| **FR-C14** | P0 | Edit changes **values, TTL, and routing-policy configuration**. Name and type immutable — Route53 treats them as identity. |
| **FR-C15** | P0 | Delete opens a confirmation modal naming the record and type. Per **A6**, a single record needs only Cancel/Delete. |
| **FR-C16** | P0 | Deleting the SOA or **apex** NS record set is rejected with `400 InvalidChangeBatch`. Non-apex NS records — delegating a subdomain — **are** deletable `[VERIFIED]`. |
| **FR-C17** | P1 | `[DERIVED — A2]` Every mutation returns a mocked change object `{id: "/change/C…", status: "INSYNC", submittedAt}`, matching the Route53 API response shape. |

### 8.5 FR-D — Record type validation

> **Satisfies:** AS-R2 – AS-R10

**FR-D1 (P0)** `[VERIFIED]` — values validated server-side against these grammars. Sources §15.

| Type | Ask | Value grammar | Rules |
|---|---|---|---|
| **A** | AS-R2 | `192.0.2.1` | Dotted-quad IPv4, octets 0–255. Multi-value. |
| **AAAA** | AS-R3 | `2001:0db8:85a3:0:0:8a2e:0370:7334` | IPv6, full or `::` compressed. Multi-value. |
| **CNAME** | AS-R4 | `hostname.example.com` | **Single value. Forbidden at the apex. Cannot coexist with any other record at the same name.** |
| **TXT** | AS-R5 | `"v=spf1 ip4:192.168.0.1/16 -all"` | Double-quoted. Each string ≤ **255 chars**; longer values split into multiple quoted strings on one line. Total ≤ **4000 chars**. Case preserved. Characters outside `a-z A-Z 0-9` and basic punctuation need `\<octal>` escapes. |
| **MX** | AS-R6 | `10 mail.example.com` | `<priority> <domain>`; priority 0–65535. Multi-value. |
| **NS** | AS-R7 | `ns-1.example.com` | Valid domain name. Multi-value. |
| **PTR** | AS-R8 | `hostname.example.com` | Valid domain name. |
| **SRV** | AS-R9 | `10 5 80 hostname.example.com` | `<priority> <weight> <port> <target>`. Multi-value. |
| **CAA** | AS-R10 | `0 issue "ca.example.net"` | `<flags> <tag> "<value>"`. **`tag` may be any string of `A-Z a-z 0-9`** — *not* a fixed enum; AWS documents custom tags with flag `128`. `value` double-quoted. The UI suggests `issue`/`issuewild`/`iodef` without restricting to them. |

| ID | Priority | Requirement |
|---|---|---|
| **FR-D2** | P0 | TTL is an integer in `[0, 2147483647]`, required for non-alias records, omitted for alias records. |
| **FR-D3** | P0 | The **CNAME coexistence rule** `[VERIFIED]` is enforced bidirectionally — no CNAME where another type exists at that name, and no record at a name already holding a CNAME. Both return `400 InvalidChangeBatch`. |
| **FR-D4** | P1 | Wildcard rules `[VERIFIED]`: `*` must replace an **entire leftmost label** (`*.example.com`, never `*prod.example.com` or `prod.*.example.com`); **not permitted on NS records**; and a **hosted zone name may not begin with `*`**. |
| **FR-D5** | P0 | Quotas `[VERIFIED]`: **400** values per record set, **10,000** record sets per zone, **500** zones per account. Exceeding returns `400 LimitsExceeded`. |
| **FR-D6** | P0 | `[DERIVED — A5 / DD-9]` **`GET /record-types` metadata endpoint.** The backend owns all nine grammars and exposes per type: `type`, `pattern`, `placeholder`, `helpText`, `multiValue`, `maxValues`, per-value limits. The frontend renders inline validation **from this payload** — grammars are never duplicated in TypeScript. Semantic rules needing a database lookup stay server-only and surface through the `422`/`400` field pointer. |

---

## 9. FR-E — Route53 Experience Parity

> **Satisfies:** AS-E1 – AS-E12 · the top evaluation criterion, AS-V1

| ID | Priority | Requirement |
|---|---|---|
| **FR-E1** | P0 | The shell is Cloudscape `AppLayout`: collapsible `SideNavigation`, breadcrumb bar, notification slot, content region, help panel. |
| **FR-E2** | P0 | **Navigation structure (AS-E2)** reproduces Route53's **full** console tree with its section dividers — Dashboard · *Domains* · *Hosted zones* (Hosted zones, Health checks) · *Traffic flow* · *Resolver* · *IP-based routing* · Applications · Profiles · Test record. Sections beyond the brief's five are `[DERIVED — A2]`: marginal cost is one component and N routes, and a short nav is among the most obvious tells that a console clone is not the real thing. All leaves except Hosted zones route to Coming Soon (FR-F1). Active item highlighted. Full tree in [§3 of the UI spec](./07-ui-spec.md). `[UNVERIFIED ordering]` |
| **FR-E3** | P0 | Top bar with product name, mocked region selector, and a user menu showing the mocked account ID and `Sign out` (AS-A5). |
| **FR-E4** | P0 | **Notifications (AS-E11)** via `Flashbar` in the `AppLayout` notification slot — green on success, red on failure, dismissible, stacking. |
| **FR-E5** | P0 | **Modals (AS-E10)** for destructive confirmation only; creates and edits are full pages. |
| **FR-E6** | P0 | **Tables (AS-E5)** follow one pattern: header with live count and actions, `TextFilter`, `Pagination`, `CollectionPreferences`, selection, sortable columns, loading skeleton, empty state, no-match state. |
| **FR-E7** | P1 | AWS-style IDs — `Z…` zones, `/hostedzone/Z…` paths, `/change/C…` changes — monospace with a copy button. `[UNVERIFIED format]` |
| **FR-E8** | P1 | **Forms (AS-E6)** follow Cloudscape `Form`/`FormField` conventions: label, `- optional` suffix, description, constraint text, inline error, bottom action bar with `Cancel` left and primary right. |
| **FR-E9** | P1 | Loading is in-table skeletons and inline spinners, never a blank page. Mutation buttons show loading state and disable while in flight. |
| **FR-E10** | P1 | Dates render console-style, e.g. `July 26, 2026, 17:27 (UTC+05:30)`. `[UNVERIFIED]` |
| **FR-E11** | P1 | Tab title tracks the page (`Hosted zones \| Route 53 \| Console`); filter, page, and sort state live in the URL so any view is shareable. |
| **FR-E12** | P1 | **Unsaved-changes guard.** Navigating away from an edit form with unsaved changes opens a confirmation `Modal` — `Cancel` (`variant="link"`) to stay, primary action to leave. Applies to FR-B15 (edit zone) and FR-C14 (edit record). AWS ships `unsaved-changes-modal` inside its *standard form components*, so this is normal console furniture rather than an extra. Copy is `[UNVERIFIED]` pending the `form-unsaved-changes` demo (UI spec §10). |

---

## 10. FR-F / FR-G — Placeholders and Bonus

> **Satisfies:** AS-M1 – AS-M6 (placeholders) · AS-B1 – AS-B5 (bonus)

| ID | Priority | Requirement |
|---|---|---|
| **FR-F1** | P0 | Dashboard, Traffic Policies, Health Checks, Resolver, and Profiles (**AS-M1 – AS-M5**) render **"Coming Soon"** pages (**AS-M6**) **inside the real `AppLayout`** with correct breadcrumbs and nav highlighting — unbuilt sections of one product, not dead links. |
| **FR-F2** | **P1** | **The Dashboard is the post-sign-in landing page**, as it is in the real console — so it is built for real rather than left as a placeholder: live zone / record / health-check counts in `ColumnLayout` stat containers, a recently-created-zones table, and a `Create hosted zone` action. All from data we already hold. Raised from P2 because it is the first screen a reviewer sees, and landing on an empty "Coming Soon" would be a weak opening. Layout in [§5.1 of the UI spec](./07-ui-spec.md). |
| **FR-G1** | P2 | **Dark mode (AS-B3)** via Cloudscape `applyMode(Mode.Dark)`, toggled in the top nav, persisted in `localStorage`, honouring `prefers-color-scheme` on first visit. |
| **FR-G2** | P2 | **Export (AS-B2)** — `GET /hosted-zones/{id}/export?format=bind\|json` returns a download; `Export zone file` sits in the zone actions menu. |
| **FR-G3** | P2 | **Import (AS-B1)** — `Import zone file` accepts a pasted or uploaded BIND file, parses it **server-side** (`$ORIGIN`, `$TTL`, relative and absolute names, all nine types), and returns a **dry-run preview** of what would be created, skipped, or rejected and why. The user confirms; the write is **atomic**. |
| **FR-G4** | P2 | **Bulk operations (AS-B5)** — multi-select in both tables, one `POST /bulk-delete`, one confirmation modal naming the count (header pluralised, per the Cloudscape demo), one summary notification. Required records excluded from selection. Per **A6**, type-to-confirm using the same `confirm` pattern as FR-B17. **Selection must be reconciled across page changes** — Cloudscape does not preserve `selectedItems` when the page changes, so without this bulk delete silently loses selections (UI spec §6.2). |
| **FR-G5** | P2 | **Keyboard shortcuts (AS-B4)** — `/` focus search, `c` create, `Esc` close, `?` shortcut reference. Suppressed while an input is focused. |

---

## 11. Interface & Data Requirements

> **Satisfies:** AS-O3, AS-T2, AS-T3, AS-H7, AS-R16, AS-D7

### 11.1 API surface — *AS-O3, AS-D7*

REST under `/api/v1`. FastAPI generates the OpenAPI schema; the TypeScript client is generated from
it (NFR-1).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Authenticate, set session cookie |
| `POST` | `/auth/logout` | Clear session cookie |
| `GET` | `/auth/me` | Current user |
| `GET` | `/record-types` | `[DERIVED]` Validation metadata for all nine types (FR-D6) |
| `GET` | `/hosted-zones` | List — `?search=&type=&sort=&order=&page=&page_size=` |
| `POST` | `/hosted-zones` | Create (auto-generates SOA + NS, FR-B13) |
| `GET` | `/hosted-zones/{id}` | Detail incl. nameservers and record count |
| `PATCH` | `/hosted-zones/{id}` | Description and tags only (FR-B15) |
| `DELETE` | `/hosted-zones/{id}` | Delete; `409` when non-empty (FR-B18) |
| `DELETE` | `/hosted-zones/{id}?cascade=true` | `[DERIVED]` Atomic cascade delete (FR-B18a) |
| `GET` | `/hosted-zones/{id}/records` | List — `?search=&type=&sort=&order=&page=&page_size=` |
| `POST` | `/hosted-zones/{id}/records` | Create record set |
| `PATCH` | `/hosted-zones/{id}/records/{rid}` | Update values / TTL / policy config |
| `DELETE` | `/hosted-zones/{id}/records/{rid}` | Delete; guarded by FR-C16 |
| `POST` | `/hosted-zones/{id}/records/bulk-delete` | Bulk delete (FR-G4) |
| `GET` | `/hosted-zones/{id}/export` | Export BIND or JSON (FR-G2) |
| `POST` | `/hosted-zones/{id}/import` | Import BIND; `?dry_run=true` for preview (FR-G3) |

**NFR-2 (P0)** — uniform list envelope:

```json
{ "items": [], "page": 1, "page_size": 10, "total": 42, "total_pages": 5 }
```

**NFR-3 (P0)** — uniform error body carrying an AWS-style code, so the UI branches on `code` and
attaches messages to fields via `field`:

```json
{ "error": { "code": "HostedZoneNotEmpty", "message": "...", "field": null } }
```

**NFR-4 (P0)** — status contract: `400` domain-rule violations (`InvalidChangeBatch`,
`LimitsExceeded`), `401` unauthenticated, `404` `NoSuchHostedZone` / `NoSuchRecord`, `409` conflicts
(`HostedZoneNotEmpty`, `ConflictingDomainExists`, duplicate record set), `422` schema and
value-grammar validation.

### 11.2 Data requirements — *AS-T3, AS-H7, AS-R16, AS-D6*

| ID | Priority | Requirement |
|---|---|---|
| **DR-1** | P0 | **All** zone and record data persists in **SQLite** (**AS-T3, AS-H7, AS-R16**). No in-memory or file-based mock stores. |
| **DR-2** | P0 | Entities: `users`, `hosted_zones`, `record_sets`, `record_values`, `hosted_zone_tags`. |
| **DR-3** | P0 | `record_values` is a **separate table** with an `ordinal` (A3), not a delimited string or JSON blob. Keeps value ordering explicit, makes FR-C4's value search an indexed lookup rather than a blob scan, and enforces per-value length limits at the schema level. Cost: one join per list query. |
| **DR-4** | P0 | Unique: `hosted_zones.name`; `record_sets(hosted_zone_id, name, type, set_identifier)`. |
| **DR-5** | P0 | Indexes on `hosted_zones(name)`, `record_sets(hosted_zone_id, name)`, `record_sets(hosted_zone_id, type)`, `record_values(record_set_id)`, `record_values(value)` — backing FR-B3, FR-C4, FR-C5. |
| **DR-6** | P0 | Cascades: zone → record sets → values; zone → tags. Enforced with `ON DELETE CASCADE` **and** `PRAGMA foreign_keys = ON`, which SQLite requires per connection. |
| **DR-7** | P0 | `record_sets.is_required` marks the auto-created SOA and apex NS sets protected by FR-C16. |
| **DR-8** | P0 | `created_at` / `updated_at` on every table, stored UTC. |
| **DR-9** | P1 | Schema managed by **Alembic migrations**, not `create_all`. |
| **DR-10** | P1 | **Demo seed data.** A standalone `seed.py` CLI loads declarative fixture files (`seed/fixtures/*.yaml`), is **idempotent**, and supports `--reset` to wipe and reseed. It is **not** an Alembic migration and does **not** run automatically on startup — demo data stays out of schema history and out of app boot. Volume is set by what must be demonstrable: **~15 zones** (two pages at the default size of 10, mixed Public/Private so the type filter has something to act on), one **flagship zone with ≥25 record sets** (three pages, covering **all nine types**, including several multi-value sets and one **subdomain NS** record so AC-9's deletable-NS case is reachable), and 2–8 records on the rest — roughly **90 records total**. Content must be plausible (SPF/DKIM/DMARC TXT, real-shaped MX, `www`/`api`/`blog` records), never `test1.com`, `test2.com`. |
| **DR-11** | P0 | **Static mock catalogues live in code, not the database**: alias targets (FR-C12), the region list and mocked account ID (FR-E3). They are fixed constants with no CRUD, so a table would imply mutability that does not exist. |
| **DR-12** | P0 | **Runtime generators, not fixtures.** Zone IDs, the four delegation nameservers, SOA values, and change IDs (FR-B13, FR-C17) are **computed per zone at creation time**, not seeded. Nameservers must reproduce Route53's real shape `[VERIFIED]` — sequential numbering across four *different* TLDs (`ns-2048.awsdns-64.com`, `ns-2049.awsdns-65.net`, `ns-2050.awsdns-66.org`, `ns-2051.awsdns-67.co.uk`) — and must be stable for a given zone. |
| **DR-13** | P1 | **Test fixtures are separate from demo seed data.** Unit and API tests build their own state; Playwright creates and tears down its own zones. Sharing seed data with tests means every fixture tweak breaks the suite. A separate load-generation script produces the 1,000-zone / 10,000-record dataset for NFR-8; it is never shipped in the demo. |
| **DR-14** | P2 | **Sample BIND zone files ship in the repo** (`examples/`) — one valid, one with a deliberately malformed line — so a reviewer can exercise FR-G3's import and its atomic-rejection path without writing a zone file. |

---

## 12. Non-Functional Requirements

> **Satisfies:** AS-T1, AS-T2, AS-D1 – AS-D8 · addresses AS-V2 – AS-V6

| ID | Priority | Requirement |
|---|---|---|
| **NFR-1** | P1 | The frontend API client is **generated from the OpenAPI schema**; a backend contract change becomes a TypeScript compile error. No hand-written API types. |
| **NFR-5** | P0 | Backend layered `routers/` → `services/` → `repositories/` → `models/`. Domain rules (CNAME coexistence, required records, non-empty zone, cascade) live in `services/`, unit-testable without HTTP. |
| **NFR-6** | P0 | Frontend feature-organised (`features/hosted-zones/`, `features/records/`), server state in TanStack Query, no ad-hoc `fetch` in components. |
| **NFR-7** | P1 | `pytest` for services (FR-D1 as a table-driven matrix) and routes; `vitest` for frontend units; **Playwright** for §13. Target ≥80% line coverage on `services/` (§4.2 #27 — an invented target). |
| **NFR-8** | P1 | List endpoints under 200 ms at 1,000 zones / 10,000 records (§4.2 #28). Search and pagination always server-side. |
| **NFR-9** | P1 | Keyboard-navigable, correct focus management on modal open/close, labelled controls, WCAG AA contrast in both themes. Cloudscape supplies most of this; the requirement is not to break it. |
| **NFR-10** | P0 | No unhandled rejection reaches the user. Every mutation has an error path surfacing a `Flashbar`; an error boundary catches render failures. |
| **NFR-11** | P0 | `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, `BACKEND_ORIGIN`, `DEMO_MODE`, `COOKIE_SECURE` come from the environment, with a committed `.env.example`. No secret committed. **Corrected 2026-07-27**: an earlier draft listed `NEXT_PUBLIC_API_URL`, which implied the frontend calls the backend cross-origin; DD-16's rewrite proxy means the frontend needs `BACKEND_ORIGIN` server-side instead — this now matches architecture §6. **Added 2026-07-27 (Slice 2)**: `COOKIE_SECURE` (default `true`) — an automated auth test over plain HTTP demonstrated that a `Secure` session cookie (`NFR-2`) is silently never returned by the client when the connection isn't HTTPS, so local `http://localhost` development and the test suite need it set `false`; every deployed environment (real HTTPS) leaves it at the default. |
| **NFR-12** | P0 | **AS-D8 + AS-T3 together**: SQLite lives on a **mounted Fly.io volume**, not the container filesystem, so the hosted demo survives redeploys. Frontend on Vercel. Cross-origin cookies need `SameSite=None; Secure` plus a credentialed CORS allow-list — verified on staging before submission. |
| **NFR-13** | P1 | Both halves run locally with documented commands (**AS-D4**); `docker compose up` starts the full stack. |
| **NFR-14** | P0 | Root `README.md` covers **setup (AS-D4), architecture (AS-D5), database schema (AS-D6), API overview (AS-D7)** and links this SRS and the [decisions log](./02-design-decisions.md). |
| **NFR-15** | P1 | GitHub repository (**AS-D1**) with exactly `frontend/` (**AS-D2**) and `backend/` (**AS-D3**) at the root. |

---

## 13. Acceptance Criteria

Given/When/Then, converting directly into Playwright specs in Phase 4.

**AC-1 (AS-A2, AS-A3, AS-A4)** — Given a seeded user, when they submit valid credentials, then they
land on Hosted zones; when they reload, then they stay signed in; when signed out and hitting a deep
link, then they are redirected to login and returned to that link afterwards.

**AC-2 (AS-H4)** — Given a signed-in user, when they create `example.com`, then it appears with record
count **2**, its Records tab holds exactly one SOA and one NS set, and the NS set holds four
nameservers across four different TLDs.

**AC-3 (AS-H3, AS-E9)** — Given 25 zones, when a substring matching 3 is typed, then 3 rows show and
the header reads `(3)`; when cleared, then pagination reports 3 pages at 10 per page and page 2
differs from page 1.

**AC-4 (AS-H6)** — Given a zone with one A record, when deletion is attempted, then the modal shows the
`HostedZoneNotEmpty` message and the zone survives.

**AC-4a (AS-H6, FR-B18a)** — Given that same modal, when the user chooses *"Delete all 1 records, then
delete this zone"* and types the zone name, then both the record and the zone are gone; and when the
typed name doesn't match, then the confirm button stays disabled.

**AC-5 (AS-H5)** — Given an existing zone, when Edit is opened, then domain name and type are read-only
**with explanatory helper text**, and only description and tags can change.

**AC-6 (AS-R1, AS-R13)** — Given a zone, when an A record `www` with two IPs is created, then **one**
row shows both values; when a second A record at `www` is attempted, then `409` is shown directing
the user to edit the existing record.

**AC-7 (AS-R2 – AS-R10)** — Given the create form, for each of the nine types, when an invalid value is
submitted (`999.1.1.1` for A; unquoted TXT; `mail.example.com` with no priority for MX; a 3-field
SRV; a CAA value without quotes), then a field-level error appears and nothing persists.

**AC-7a (AS-R10)** — Given a CAA record with a **custom** tag and flag `128` — `128 exampletag
"15555551212"` — then it is **accepted**, because AWS permits any alphanumeric tag.

**AC-8 (AS-R4)** — Given an A record at `blog.example.com`, when a CNAME is created at the same name,
then it is rejected; given a CNAME at `shop.example.com`, when a TXT is created there, then it is
rejected; when a CNAME is created at the apex, then it is rejected.

**AC-9 (AS-R7, AS-R15)** — Given a zone's default records, when SOA or apex NS deletion is attempted,
then the action is unavailable in the UI and rejected by the API; when a *subdomain* NS record is
deleted, then it succeeds.

**AC-10 (AS-R12, AS-E8)** — Given a zone with A, CNAME, MX, and TXT records, when the type filter is set
to A + MX, then only those rows show; when a search term is added, then both constraints apply.

**AC-11 (FR-D6)** — Given the create form, when the record type changes, then placeholder and help text
update **from the `/record-types` payload**; and when the backend's grammar for a type changes, then
the frontend reflects it with no frontend change.

**AC-12 (AS-E11)** — Given any successful mutation, then a green Flashbar names the affected resource;
given any failure, then a red Flashbar carries the API's message.

**AC-13 (AS-M1 – AS-M6)** — Given each of the five placeholder nav items, when clicked, then a Coming Soon
page renders inside the shell with correct breadcrumb and nav highlight.

**AC-14 (AS-B1)** — Given a valid BIND file, when uploaded, then a preview lists what would be created
before anything is written; when confirmed, then all records appear; given a file with one invalid
line, then the import is rejected atomically with the failing line reported and **no** records created.

**AC-15 (AS-B2)** — Given a zone with records, when exported as BIND, then the file re-imports into an
empty zone producing an identical record set.

**AC-16 (AS-D8, AS-T3)** — Given the deployed demo, when the backend is redeployed, then previously
created zones and records survive.

---

## 14. Traceability

### 14.1 Every ask → its requirements

All 73 asks in brief order. **Coverage**: `Covered` fully addressed · `Partial` addressed with a
stated narrowing · `Deferred` intentionally postponed.

| Ask | Requirements | Coverage |
|---|---|---|
| AS-O1 functional clone | entire document | Covered |
| AS-O2 persistent storage | DR-1 – DR-10, NFR-12 | Covered |
| AS-O3 backend API | §11.1, NFR-2 – NFR-5 | Covered |
| AS-O4 UX focus, not real DNS | §3.2, FR-C11, FR-C12 | Covered |
| AS-T1 Next.js (TypeScript) | NFR-1, NFR-6, NFR-15 | Covered |
| AS-T2 FastAPI | NFR-5, §11.1 | Covered |
| AS-T3 SQLite | DR-1, NFR-12 | Covered |
| AS-A1 mocked auth system | FR-A1, FR-A2, §4.2 #2, #4 | Covered |
| AS-A2 Login | FR-A1, FR-A2, FR-A3 | Covered |
| AS-A3 Logout | FR-A5 | Covered |
| AS-A4 Session persistence | FR-A4, FR-A6, FR-A7, FR-A8 | Covered |
| AS-A5 AWS deps mockable | §3.2, §4.2 #1–#3, FR-E3 | Covered |
| AS-H1 full CRUD, hosted zones | FR-B10 – FR-B20 | Covered |
| AS-H2 View | FR-B1, FR-B2, FR-B8, FR-B21, FR-B23 | Covered |
| AS-H3 Search | FR-B3, FR-B4 | Covered |
| AS-H4 Create | FR-B10 – FR-B14 | Covered |
| AS-H5 Edit | FR-B15, FR-B16 | **Partial** — description and tags only; name and type immutable per **A1**, with helper text explaining why |
| AS-H6 Delete | FR-B17 – FR-B20 | Covered — `409` when non-empty per **A1**, made unconditional by FR-B18a's cascade path |
| AS-H7 persist in SQLite | DR-1, DR-2, DR-4 | Covered |
| AS-R1 full CRUD, records | FR-C1 – FR-C17 | Covered |
| AS-R2 A | FR-D1, FR-D6 | Covered |
| AS-R3 AAAA | FR-D1, FR-D6 | Covered |
| AS-R4 CNAME | FR-D1, FR-D3, FR-D6 | Covered |
| AS-R5 TXT | FR-D1, FR-D6 | Covered |
| AS-R6 MX | FR-D1, FR-D6 | Covered |
| AS-R7 NS | FR-D1, FR-D4, FR-C16, FR-D6 | Covered |
| AS-R8 PTR | FR-D1, FR-D6 | Covered |
| AS-R9 SRV | FR-D1, FR-D6 | Covered |
| AS-R10 CAA | FR-D1, FR-D6 | Covered |
| AS-R11 View Records | FR-C3, FR-C7, FR-C8 | Covered |
| AS-R12 Search Records | FR-C4, FR-C5 | Covered |
| AS-R13 Create Records | FR-C9 – FR-C13 | Covered |
| AS-R14 Edit Records | FR-C14 | Covered — values, TTL, policy config; name and type immutable as Route53's record identity |
| AS-R15 Delete Records | FR-C15, FR-C16 | Covered — SOA and apex NS protected, as Route53 does |
| AS-R16 persist in SQLite | DR-1, DR-3, DR-5 | Covered |
| AS-E1 closely resemble Route53 | FR-E1 – FR-E11 | Covered |
| AS-E2 Navigation structure | FR-E1, FR-E2, FR-E3, FR-B22 | Covered |
| AS-E3 Hosted Zone management | FR-B* | Covered |
| AS-E4 DNS Record management | FR-C*, FR-D* | Covered |
| AS-E5 Tables | FR-B1, FR-C3, FR-E6 | Covered |
| AS-E6 Forms | FR-B10, FR-C9, FR-E8 | Covered |
| AS-E7 Search | FR-B3, FR-C4 | Covered |
| AS-E8 Filters | FR-B4, FR-C5 | Covered |
| AS-E9 Pagination | FR-B5, FR-C6 | Covered |
| AS-E10 Modals | FR-B17, FR-C15, FR-E5 | Covered |
| AS-E11 Notifications | FR-E4 | Covered |
| AS-E12 feel like Route53 | FR-C1, FR-B13, FR-B18, FR-C16, FR-D3, FR-E1 – FR-E11 | Covered |
| AS-M1 Dashboard | FR-F1, FR-F2 | Covered |
| AS-M2 Traffic Policies | FR-F1 | Covered |
| AS-M3 Health Checks | FR-F1 | Covered |
| AS-M4 Resolver | FR-F1 | Covered |
| AS-M5 Profiles | FR-F1 | Covered |
| AS-M6 "Coming Soon" sufficient | FR-F1 | Covered |
| AS-B1 BIND import | FR-G3 | Covered (P2) |
| AS-B2 Export JSON/BIND | FR-G2 | Covered (P2) |
| AS-B3 Dark Mode | FR-G1 | Covered (P2) |
| AS-B4 Keyboard Shortcuts | FR-G5 | Covered (P2) |
| AS-B5 Bulk Operations | FR-G4 | Covered (P2) |
| AS-D1 GitHub repository | NFR-15 | Covered |
| AS-D2 `frontend/` | NFR-15 | Covered |
| AS-D3 `backend/` | NFR-15 | Covered |
| AS-D4 README setup | NFR-13, NFR-14 | Covered |
| AS-D5 README architecture | NFR-5, NFR-6, NFR-14 | Covered |
| AS-D6 README database schema | DR-2, NFR-14 | Covered |
| AS-D7 README API overview | §11.1, NFR-14 | Covered |
| AS-D8 hosted demo link | NFR-12 | Covered |
| AS-V1 UI similarity | FR-E1 – FR-E11 | Addressed |
| AS-V2 Frontend quality | NFR-1, NFR-6, NFR-7, NFR-9, NFR-10 | Addressed |
| AS-V3 Backend/API design | NFR-2 – NFR-5, FR-D6, §11.1 | Addressed |
| AS-V4 Database design | DR-1 – DR-10 | Addressed |
| AS-V5 Code quality | NFR-5, NFR-6, NFR-7 | Addressed |
| AS-V6 Documentation | NFR-14, this SRS, decisions log | Addressed |
| AS-V7 Overall completeness | §13, this table | Addressed |

**Two `Partial`/qualified rows — AS-H5 and AS-H6 — are the only places we knowingly diverge from a
literal reading of the brief.** Both trace to **A1** / [DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches),
and both are justified by **AS-E12**. Nothing else in the brief is narrowed.

### 14.2 What we added beyond the brief

Requirements with no `AS-*` parent. Added scope is as much a deviation risk as missing scope, so it
is listed explicitly.

| Requirement | What it adds | Justified by | Decision |
|---|---|---|---|
| FR-B10 (Type radio), FR-B1 (`Type` column) | Public / private hosted zones | AS-E5, AS-E12 — visible column in the console table | [DD-7](./02-design-decisions.md#dd-7--keep-seven-route53-concepts-the-brief-never-mentions) |
| FR-B10 (Tags), FR-B15 | Key/value tags on zones | AS-E6 — present on the real create form | DD-7 |
| FR-B13 | Delegation nameservers + auto-created SOA/NS | AS-E12 — a zone with no NS/SOA is not a Route53 zone | DD-7 |
| FR-B21 | Query logging + DNSSEC placeholder tabs | AS-E2, AS-M6 — same "Coming Soon" treatment | DD-7 |
| FR-C3, FR-C9, FR-C11, FR-C11a | Routing policies | AS-E5 — visible column and a dominant form field | DD-7 |
| FR-C3, FR-C9, FR-C12 | Alias records | AS-E5, AS-E6 — visible column and form toggle | DD-7 |
| FR-C17 | Mocked change-info objects | AS-O3 — API-shape fidelity, near-free | DD-7 |
| **FR-B18a** | Cascade-delete escape hatch | **AS-H6** — makes plain "Delete Hosted Zones" unconditionally true | [DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches) |
| **FR-D6** | `GET /record-types` metadata endpoint | **AS-R2 – AS-R10, AS-V3** — one source of truth for nine grammars | [DD-9](./02-design-decisions.md#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend) |

---

## 15. Verified Sources

Consulted 2026-07-27. Everything marked `[VERIFIED]` traces to one of these.

- [Supported DNS record types](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html) — value grammars for all nine types, TXT limits, CAA tag rules, CNAME apex and coexistence restrictions, trailing-dot equivalence
- [Quotas](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DNSLimitations.html) — 400 values per record set, 10,000 records per zone, 500 zones per account, 100/30 same-name-and-type limits
- [NS and SOA records Route53 creates](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/SOA-NSrecords.html) — nameserver naming pattern, SOA field meanings, SOA default TTL of 900
- [DNS domain name format](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DomainNameFormat.html) — 63-byte labels, 255-byte names, permitted characters, lowercase storage, wildcard rules
- [HostedZoneNotEmpty exception](https://docs.aws.amazon.com/botocore/latest/reference/services/route53/client/exceptions/HostedZoneNotEmpty.html) and [Deleting a public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DeleteHostedZone.html) — verbatim error message
- [Values specific for simple records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-basic.html) — the console's exact field labels (`Record name`, `Value/Route traffic to`, `TTL (seconds)`, `Routing policy`), the record-type dropdown option strings, the one-value-per-line rule, the CNAME single-value exception, the NS simple-routing-only constraint, and the apex "do not enter `@`" instruction
- [Creating records by using the console](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html) — navigation path and the `Create records` (plural) button label
- [Creating a public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html) — zone create flow and `Public Hosted Zone` type wording
- [`cloudscape-design/demos`](https://github.com/cloudscape-design/demos) (MIT-0) — AWS's own console page patterns. `delete-with-additional-confirmation` gives the verified type-to-confirm pattern (the word `confirm`, not the resource name); `server-side-table` gives debounced filtering, selection-across-pagination, server-side counters, and the standard table props. Read as patterns, never copied — see [UI spec §10](./07-ui-spec.md)
- [Route 53 pricing](https://aws.amazon.com/route53/pricing/) — *"A hosted zone that is deleted within 12 hours of creation is not charged"*, which makes direct console capture free

**Still `[UNVERIFIED]`**, carried as best-effort per A4: console table column sets and their default
visibility, left-nav tree ordering, NS record default TTL (`172800`), hosted zone ID character
format, TTL quick-set presets, console date format, zone description length cap.

---

## 16. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Cross-origin session cookies** between Vercel and Fly.io. `SameSite=None; Secure` is required and some browsers restrict third-party cookies. Threatens **AS-A4** and **AS-D8**. | Verify on staging early. Fallback: proxy `/api/*` through a Next.js rewrite so the cookie is same-origin. Settled in Phase 2. |
| R2 | **Cloudscape + Next.js App Router** — Cloudscape is client-only React; naive use breaks SSR. Threatens **AS-T1** and **AS-E1**. | Wrap in a `"use client"` shell, import global CSS once at the root layout. Prototype in the first slice, before screens depend on it. **Refined in Slice 2/3 (2026-07-27)**: the Slice 0 spike (bare `AppLayout`/`SideNavigation`) had zero hydration errors, confirming the shell itself is sound. Once real forms and tables landed (`Input` with `autoFocus`, `Table` with `resizableColumns`/`stickyHeader`), Playwright-driven browser testing surfaced non-fatal hydration-mismatch warnings — React logs them as "won't be patched up" and regenerates the affected subtree client-side; no functional break was observed across sign-in, zone creation, or the edit form in that same test run. Suspected Cloudscape-internal SSR/CSR divergence (inline style objects differing pre/post-hydration, e.g. `caret-color`) under React 19.2 / Next 16.2 / Cloudscape 3.0.1334 — not traced to application code. **Left for a later session to investigate further** (candidates: pin an older Cloudscape/React combination, or confirm it's cosmetic-only and accept it) — noting it here rather than silently living with an unexplained console warning. |
| R3 | **SQLite write concurrency** — single writer; concurrent writes raise `database is locked`. | WAL mode plus a busy timeout. Acceptable at demo load. |
| R4 | **Fly.io cold starts** could make the demo (**AS-D8**) look slow. | Keep one machine warm, or note it in the README. |
| R5 | **Remaining `[UNVERIFIED]` UI details** (§15) are guesses that directly affect **AS-V1**, the top evaluation criterion. | Bounded and listed. Correct on sight if better information surfaces. |
| R6 | **Scope creep from the eight routing policies** — added scope (§14.2) with no `AS-*` parent. | Bounded by FR-C11: Simple functional, the rest stored-and-displayed, stated in the README. |
| R7 | **`/record-types` (FR-D6) is unusual** — a grader may not expect validation metadata served from the API. | Explain in the README architecture section (**AS-D5**) as the mechanism keeping one source of truth for nine grammars. |
| R8 | **The public demo is shared and stateful.** A reviewer exercising delete permanently removes seed data for everyone after them, and a later viewer cannot tell a degraded demo from a broken one. | Accepted deliberately — no reset action, no scheduled re-seed ([DD-15](./02-design-decisions.md#dd-15--demo-seed-data-strategy)). Mitigated by documentation: the README and [notes doc](./03-assumptions-mocked-data-notes.md) state that the demo is shared and mutable, and give the one-command local run with a freshly seeded database. |
