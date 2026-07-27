# Assumptions, Mocked Data & Notes

**Read this first.** It is the short guide to what is real in this application, what is deliberately
faked, and what we assumed where the assignment brief was silent. If something looks unfinished
while you review, check §1 — it is probably listed here as a stated boundary.

Depth lives elsewhere and is linked throughout:
[requirements SRS](./01-requirements.md) · [design decisions](./02-design-decisions.md)

---

## 1. What is real vs. what is mocked

The brief states the focus is *"recreating the Route53 user experience and core workflows **rather
than implementing actual DNS functionality**"* (`AS-O4`), and that *"IAM, AWS Accounts,
Organizations, Billing, and other AWS dependencies **can be mocked**"* (`AS-A5`). Everything below
follows from those two sentences.

### 1.1 Fully real

Genuinely implemented, backed by the database, and exercised by tests.

| Area | What is real |
|---|---|
| **Hosted zones** | Full CRUD, persisted in SQLite. Search, filter, sort, pagination all execute **server-side**. |
| **DNS records** | Full CRUD as Route53 **record sets** — one row holds an ordered list of values, as the real console does. Persisted in SQLite. |
| **Record validation** | All nine types validated server-side against their real grammars, verified against AWS documentation. Invalid values are genuinely rejected. |
| **Domain rules** | CNAME-at-apex, CNAME coexistence, required-record protection, non-empty-zone deletion, and Route53's real quotas are all enforced. |
| **Auth session** | Real JWT issued by the backend in an httpOnly cookie; real route guarding; real 401 handling. |
| **Import / export** | BIND parsing and serialisation are real, including the atomic dry-run preview. |
| **Dashboard** | The post-sign-in landing page is a real screen matching the live console's actual layout (a four-feature-card grid, verified against direct capture — [DD-21](./02-design-decisions.md#dd-21--direct-console-capture-completed-ui-revamped-surface-by-surface-against-it)), showing genuine zone/record counts. Only specific actions inside it are mocked — see §1.2 #16. |
| **Multi-record create** | The record-create form's "Add another record" builds and submits **N genuinely separate records** in one confirm, not a cosmetic button. [DD-23](./02-design-decisions.md#dd-23--multi-record-quick-create-built-for-real) |
| **Record-detail split panel** | Selecting a record on the Records tab opens a real `AppLayout` split panel showing that record's full field set, matching the live console. [DD-24](./02-design-decisions.md#dd-24--record-detail-split-panel-threaded-via-react-context) |
| **Record filters** | Type, Routing policy, and Alias filters on the Records tab are all genuine server-side filters — matching real column data, not just UI decoration. (Routing-policy *evaluation* remains mocked per #10 below — only the filter is real.) |
| **Zone tags** | The zone detail page's Tags tab shows the zone's real tags, read from the same data the create/edit forms write. |

### 1.2 Mocked

| # | What | How it behaves | Why |
|---|---|---|---|
| 1 | **DNS resolution** | **Nothing resolves.** No nameserver runs anywhere in this system. Records are rows in a table. | `AS-O4` — explicitly out of scope |
| 2 | **Delegation nameservers** | The four `ns-2048.awsdns-64.com`-style values on each zone are generated to match Route53's real naming pattern. They are **cosmetic and non-authoritative** — pointing a real domain at them does nothing. | Needed so a zone looks like a Route53 zone |
| 3 | **SOA record values** | Generated in Route53's real seven-field format. Never used for anything. | Same |
| 4 | **User accounts** | 2–3 **seeded** users. No signup, no password reset, no email verification. Credentials are in the README. | `AS-A1` — "simple mocked authentication" |
| 5 | **AWS account ID** | `123456789012` in the top navigation. Display only. | `AS-A5` |
| 6 | **Region selector** | Renders and opens, but selecting a region changes nothing. | `AS-A5` |
| 7 | **IAM / permissions** | None. Any authenticated user can see and edit every zone. | `AS-A5` |
| 8 | **Change info** | Every mutation returns `{id: "/change/C…", status: "INSYNC"}` matching the real Route53 API shape. Status is **always `INSYNC`** — nothing ever propagates, so nothing is ever `PENDING`. | API-shape fidelity |
| 9 | **Alias targets** | The Alias toggle works and the picker is populated from a **static list** (CloudFront, S3 website endpoint, ELB, API Gateway). No real AWS resources are queried, and targets are never resolved. | `AS-O4` |
| 10 | **Routing policies** | All eight are selectable and their configuration is stored and displayed. **Only Simple is functional.** The other seven — Weighted, Geolocation, Geoproximity, Latency, IP-based, Multivalue answer, Failover — are **never evaluated**, because evaluation requires DNS resolution, which does not exist here. | `AS-O4` |
| 11 | **Health checks** | Placeholder page. No endpoint is ever checked. | `AS-M3` |
| 12 | **Traffic Policies, Resolver, Profiles** | "Coming Soon" pages inside the real app shell. | `AS-M2`, `AS-M4`, `AS-M5` |
| 13 | **DNSSEC signing tab** | Present on the zone detail page as a placeholder, matching the real console's tab set. | Console parity |
| 13a | **Accelerated recovery tab & "Configure query logging" / "Test record" header buttons** | Present, matching the real console — selecting/clicking shows the shared demo-limitation toast rather than a working feature or a separate placeholder page. `[DERIVED]` | [DD-22](./02-design-decisions.md#dd-22--mocked-actions-get-a-shared-demo-limitation-toast-rather-than-more-coming-soon-routes) |
| 13b | **Dashboard's other three feature cards, Register domain, and Notifications** | Visually identical to the real console. Clicking `Create health check`, `Create policy`, `Register domain`, the domain-transfer link, or the Notifications refresh button shows the shared demo-limitation toast. Only `Create hosted zone` (DNS management card) is a real action. | [DD-22](./02-design-decisions.md#dd-22--mocked-actions-get-a-shared-demo-limitation-toast-rather-than-more-coming-soon-routes) |
| 13c | **"Global resolvers" and "Outposts" nav items, "Switch to wizard" link** | Added to the nav tree / create-record form purely to match the real console's structure. Clicking shows the shared demo-limitation toast instead of navigating. | [DD-22](./02-design-decisions.md#dd-22--mocked-actions-get-a-shared-demo-limitation-toast-rather-than-more-coming-soon-routes) |
| 14 | **Hosted zone IDs** | Generated in AWS's `Z…` format. Real-looking, not real AWS identifiers. | Console parity |
| 15 | **Seed data** | ~15 zones and ~90 records, loaded from declarative fixtures so the demo is never empty. Content is plausible rather than placeholder — SPF/DKIM/DMARC TXT records, real-shaped MX, `www`/`api`/`blog` records. One flagship zone carries ≥25 records covering all nine types. See §5. | Reviewability |

---

## 2. Things that look like bugs but are not

The five most likely to be misread while clicking through. All are real Route53 behaviour,
reproduced deliberately.

**A hosted zone cannot be renamed.** The Edit page shows the domain name and type as read-only.
Route53 does not permit renaming, because the zone name is the DNS suffix of every record inside it
— rename `example.com` and every `www.example.com` beneath it becomes wrong. The form states this
inline rather than leaving a greyed-out field to guess at.
→ [SRS FR-B15](./01-requirements.md), [DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches)

**Deleting a zone that still has records fails.** It returns `409 HostedZoneNotEmpty` with AWS's
verbatim message. This is exactly what the real API does. Because a hard block would make the
brief's "Delete Hosted Zones" look unimplemented, the same dialog offers **"Delete all N records,
then delete this zone"** — an atomic cascade behind type-to-confirm. Deletion is never a dead end.
→ [SRS FR-B18, FR-B18a](./01-requirements.md)

**Two A records at the same name is an error, not two rows.** Route53 stores *record sets*: `www`
with three IPs is **one row with three values**, not three rows. Attempting to create a second A
record at an existing name returns `409` and points you at the existing record. A one-row-per-value
model would have been simpler and visibly wrong.
→ [SRS FR-C1](./01-requirements.md), [DD-8](./02-design-decisions.md#dd-8--records-are-record-sets-with-values-in-a-child-table)

**The SOA and apex NS records cannot be deleted.** Their delete actions are disabled and the API
rejects the attempt. Route53 protects them the same way. Subdomain NS records — used to delegate a
subdomain — *are* deletable.
→ [SRS FR-C16](./01-requirements.md)

**A CNAME cannot be created at the zone root, or alongside any other record at the same name.**
This is RFC 1034, enforced by Route53 and enforced here in both directions.
→ [SRS FR-D3](./01-requirements.md)

---

## 3. Assumptions

Where the brief was silent or ambiguous, these are the readings taken. The six consequential ones
are summarised here; the full register — including 32 routine defaults — is
[SRS §4](./01-requirements.md).

| # | Ambiguity in the brief | What we assumed |
|---|---|---|
| **A1** | "Edit Hosted Zones" and "Delete Hosted Zones" are unqualified, but real Route53 restricts both | Build to the real product, and add escape hatches so no capability is ever hidden behind an error. Justified by the brief's own *"feel like Route53 rather than a generic CRUD application"* |
| **A2** | The brief never mentions zone types, tags, routing policies, alias records, or nameservers | Include them anyway — they are visible **columns** in the console tables being compared against. Every such addition is tagged `[DERIVED]` in the SRS and listed in [§14.2](./01-requirements.md) |
| **A3** | "DNS Records" does not say how records are modelled | Route53's record-set model: `(name, type, set identifier)` holding an ordered value list |
| **A4** | Route53's exact console details are not all publicly documented | Originally: verify against the AWS Developer Guide, mark the rest `[UNVERIFIED]`, use no screenshots. **Revised** — three sources are now used: AWS docs, AWS's own [Cloudscape demos](https://github.com/cloudscape-design/demos), and direct console capture. Between them this found six factual/copy errors plus, once captures existed, a further set of structural UI mismatches — nav grouping, Dashboard layout, zone-detail tabs (§4) |
| **A5** | "Support common Route53 record types such as…" — support, or validate? | Validate. The backend owns all nine grammars and serves them to the frontend via `GET /record-types`, so they are defined once rather than duplicated in TypeScript |
| **A6** | Nothing is said about destructive-action confirmation | Friction scales with blast radius: simple confirm for one record or an empty zone, type-to-confirm for cascade and bulk deletes |

**Also assumed, briefly:** a single shared AWS account with all users seeing all zones; a 24-hour
session with no refresh token; search matching the columns actually visible (zone name and
description; record name and values); server-side search, filter, sort, and pagination everywhere;
UTC storage with local-time rendering. Full list and rationale in [SRS §4.2](./01-requirements.md).

---

## 4. Notes

**Accuracy.** Nothing about Route53's behaviour was written from memory and left there. Three
verification passes were run against primary sources — documentation, AWS's own Cloudscape demos, and
finally direct console capture — and between them they corrected six factual/copy errors plus a
further round of **structural** UI mismatches described below:

*Against the AWS Route53 Developer Guide* — the CAA `tag` rule (any alphanumeric tag, not a fixed
three-value enum), the values-per-record-set quota (400, not 100), the permitted characters in zone
and record names (the narrow letters-digits-hyphens rule governs domain *registration*, not hosted
zones), and the wildcard restrictions (`*` must replace a whole label and is forbidden on NS
records).

*Against AWS's own [Cloudscape demos](https://github.com/cloudscape-design/demos)* — the
type-to-confirm delete pattern asks the user to type the literal word `confirm`, **not** the resource
name (that is the S3/RDS pattern), and server-side tables require debounced filtering via
`onDelayedChange`, without which every keystroke fires an API request.

The console procedure pages also pinned down exact UI strings that would otherwise have been
plausible guesses: the routing option is `Simple routing`, the submit button is `Create records`
(plural), multiple values are allowed for every type **except** CNAME, NS records accept only simple
routing, and the zone apex is created by leaving the name **blank** — the console explicitly warns
against typing `@`.

*Against five direct captures of the live console* (`docs/reference/*.png` —
[DD-21](./02-design-decisions.md#dd-21--direct-console-capture-completed-ui-revamped-surface-by-surface-against-it)),
taken after the documentation and Cloudscape-demo passes above, which corrected **structural**
mismatches neither source could have caught: the left-nav's real grouping (flat top-level items,
Resolver split into *Global Resolver* and *VPC Resolver*); the Dashboard's real layout (a four-card
feature grid, not stat tiles and a recent-zones table); the zone-detail page's real tab set
(*Records, Accelerated recovery, DNSSEC signing, Tags*, with "Hosted zone details" as an expandable
panel above the tabs rather than a tab itself); and, in the record-type dropdown, the developer
guide's shorter prose (`A — IPv4 address`) turned out to **not** match the live console's actual
option text (`A – Routes traffic to an IPv4 address and some AWS resources`) — a live capture beats
documentation prose even where both exist, because they are not guaranteed to describe the same
string.

Sources are listed in [SRS §15](./01-requirements.md) and [UI spec §10](./07-ui-spec.md).

**What is still unverified.** AWS does not publish console *layouts*, and the five captures taken
don't cover every screen, so these remain best-effort and may differ from the live console: the NS
record's default TTL, hosted zone ID character format, console date formatting, and the hosted-zone
description field's label (no zone create/edit screen was captured). Table column sets, left-nav
ordering, and the record-create form's TTL quick-set presets were previously on this list and are now
resolved by direct capture (`02-zones-list.png`, `04-records-table.png`, `01-nav.png`,
`05-create-record-form.png`). Remaining items are marked `[UNVERIFIED]` inline rather than quietly
assumed.

**Three implementation defects found and fixed during the revamp** (none related to visual fidelity —
see [DD-25](./02-design-decisions.md#dd-25--three-cloudscapenextjs-gotchas-found-during-the-revamp)
for full detail): a Cloudscape `Button` defaults to submitting its parent `<form>` unless told
otherwise, which meant secondary buttons (`Cancel`, per-record `Delete`, TTL presets, `Add another
record`) were silently triggering premature submissions; `AppLayout`'s split panel defaulted to
roughly half the viewport height, covering the records table's row checkboxes; and the app-wide `401`
handler was force-reloading `/login` on the login endpoint's *own* failed-login response, wiping the
"incorrect credentials" message before it could render. All three are fixed and covered by the
Playwright verification pass each surface went through.

**How it is built.** Frontend on [Cloudscape](https://cloudscape.design/) under the Next.js App
Router, talking to a FastAPI backend through a same-origin rewrite proxy so the session cookie is
never a third-party cookie. Backend is layered `routers → services → repositories → models`, with
services owning every transaction boundary. Records are modelled as Route53 **record sets** — one
row holding an ordered list of values — which is why three IPs on one hostname render as one table
row rather than three. Full detail in [architecture](./04-architecture.md),
[data model](./05-data-model.md), [API contract](./06-api-contract.md), and [UI spec](./07-ui-spec.md).

**Scope traceability.** The brief was decomposed into **73 discrete asks**, enumerated as `AS-*` IDs
in [SRS §2](./01-requirements.md). Every requirement declares which ask it satisfies, and
[SRS §14.1](./01-requirements.md) maps all 73 to their coverage. Of those, exactly **two** are
qualified rather than fully covered — `AS-H5` (Edit) and `AS-H6` (Delete), both from assumption A1,
both explained in §2 above. [SRS §14.2](./01-requirements.md) separately lists everything built
*beyond* the brief, so added scope is as visible as omitted scope.

**Known limitations.**

- **The hosted demo is shared and stateful.** It starts seeded, but anyone who exercises Delete
  changes it permanently for everyone after them — there is deliberately no reset button and no
  scheduled re-seed (§5). If the demo looks sparse or oddly populated, that is drift from earlier
  visitors rather than a defect. For a clean, fully seeded instance, run it locally: the README has
  a one-command start that creates and seeds a fresh database.
- SQLite permits one writer at a time; WAL mode and a busy timeout are enabled. Fine at demo load,
  not a production concurrency story.
- The session token cannot be revoked before its 24-hour expiry — there is no refresh or
  blocklist mechanism.
- The hosted backend runs on a free tier and may cold-start on the first request after a period of
  inactivity.
- **The live backend may briefly lag the live frontend after a UI-only session.** Vercel redeploys
  automatically on push, but the PythonAnywhere backend does not — it needs a manual `git pull` and
  web-app reload. If the frontend has shipped ahead of that (as it did for the Records tab's Routing
  policy/Alias filters — real, backend-filtered params added in the same session as the UI revamp),
  those specific dropdowns render correctly but silently filter nothing on the live demo until the
  backend catches up, since FastAPI ignores unrecognised query parameters rather than erroring.

---

## 5. How the mock data is organised

Five distinct kinds, deliberately kept apart — details in
[DD-15](./02-design-decisions.md#dd-15--demo-seed-data-strategy).

| Kind | Where it lives | Notes |
|---|---|---|
| **Demo seed data** | `backend/seed/fixtures/*.yaml`, loaded by `seed.py` | ~15 zones, ~90 records. Idempotent; `--reset` wipes and reseeds. Deliberately **not** an Alembic migration and **not** run on startup, so demo content stays out of schema history and out of app boot. |
| **Static catalogues** | Code constants | Alias targets, region list, account ID. Fixed, no CRUD — a database table would imply a mutability that does not exist. |
| **Runtime generators** | Service layer | Zone IDs, the four nameservers, SOA values, change IDs. **Computed per zone at creation**, not seeded, and stable for a given zone. |
| **Test fixtures** | `backend/tests/`, `e2e/` | Kept separate from seed data; the E2E suite creates and tears down its own zones. Sharing them would mean every seed tweak breaks the test suite. |
| **Sample BIND files** | `examples/` | One valid, one with a deliberately malformed line, so import and its atomic-rejection path can be exercised without writing a zone file. |

A separate load-generation script produces the 1,000-zone / 10,000-record dataset used for
performance checks. It is never shipped in the demo.

---

**Attribution.** The UI is built on [Cloudscape Design System](https://cloudscape.design/), the
open-source component library AWS uses for the real console — which is why the visual language
matches so closely. No AWS trademarks, logos, or proprietary branding assets are reproduced. This is
an educational clone and is not affiliated with, endorsed by, or connected to Amazon Web Services.
