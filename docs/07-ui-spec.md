# UI Specification

| | |
|---|---|
| **Phase** | 2 of 6 — Design ([roadmap](./00-sdlc-roadmap.md)) |
| **Companions** | [Architecture](./04-architecture.md) · [Data model](./05-data-model.md) · [API contract](./06-api-contract.md) |
| **Satisfies** | `AS-E1` – `AS-E12`, `AS-M1` – `AS-M6` · addresses `AS-V1`, the first evaluation criterion |

`AS-V1` — *"UI similarity to Route53"* — is the first thing the assignment is judged on, and
`AS-E12` asks that the app *"feel like Route53 rather than a generic CRUD application."* This
document is where that gets made concrete.

**§7 is the copy deck** — exact console strings, verified against AWS documentation. Where a label
here differs from what seems natural, the console string wins.

---

## 1. Design foundation

Built on [Cloudscape](https://cloudscape.design/), the open-source library AWS uses for the real
console ([DD-1](./02-design-decisions.md#dd-1--aws-cloudscape-design-system-for-the-ui)). This is
the single biggest lever on `AS-V1`: the spacing, type scale, table chrome, form conventions, and
focus behaviour arrive correct rather than approximated.

| Setting | Value | Why |
|---|---|---|
| Theme | **Visual refresh** (Cloudscape default) | The current AWS console look. Classic would read as a dated console |
| Density | **Comfortable** | Console default. `Compact` is opt-in per user and would look subtly wrong |
| Motion | Default | Cloudscape respects `prefers-reduced-motion` |
| Mode | Light / Dark via `applyMode()` | `FR-G1`; Cloudscape ships both |
| Fonts | Cloudscape default (Open Sans) | Amazon Ember is proprietary and not redistributable — see §9 |

```ts
// app/layout.tsx — once, at the root
import '@cloudscape-design/global-styles/index.css';
import { applyMode, applyDensity, Mode, Density } from '@cloudscape-design/global-styles';

applyDensity(Density.Comfortable);
applyMode(storedPreference ?? (prefersDark ? Mode.Dark : Mode.Light));
```

**Rule: no custom CSS that overrides Cloudscape tokens.** Where spacing or colour is needed, use
design tokens (`@cloudscape-design/design-tokens`). Hand-tuned pixel overrides are how a Cloudscape
app starts looking like a Cloudscape app that has been messed with.

---

## 2. App shell

Every authenticated screen renders inside one `AppLayout` (`FR-E1`), defined once in
`app/(console)/layout.tsx` — the single `"use client"` boundary (risk **R2**).

```
┌────────────────────────────────────────────────────────────────────┐
│ TopNavigation:  Route 53   │  N. Virginia ▾ │ 1234-5678-9012 ▾  ☾  │
├──────────────┬─────────────────────────────────────────────────────┤
│ SideNav      │ BreadcrumbGroup: Route 53 › Hosted zones › example… │
│              ├─────────────────────────────────────────────────────┤
│ Dashboard    │ Flashbar (notifications slot)                       │
│ ▾ Domains    ├─────────────────────────────────────────────────────┤
│ ▾ Hosted…    │                                                     │
│ ▾ Traffic…   │  ContentLayout                                      │
│ ▾ Resolver   │    Header (title, counter, actions)                 │
│ ▾ IP-based…  │    Content                                          │
│   Profiles   │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

| Slot | Component | Notes |
|---|---|---|
| Top bar | `TopNavigation` | Identity "Route 53"; mocked region selector; account menu showing `1234-5678-9012` with `Sign out`; dark-mode toggle (`FR-E3`, `FR-G1`) |
| Left | `SideNavigation` | §3. Active item derived from `usePathname()` |
| Breadcrumbs | `BreadcrumbGroup` | Every segment navigable (`FR-B22`) |
| Notifications | `Flashbar` | `AppLayout`'s `notifications` slot, so flashes sit above content and survive navigation (`FR-E4`) |
| Content | `ContentLayout` + `Header` | Header carries the title, live counter, and primary actions |
| Tools panel | `tools` + `Info` links — **stage 2** | Every Cloudscape demo wires a help panel, and the real console has `Info` links beside section headers. Their absence is a subtle tell. Deferred to implementation stage 2 (§11) because it is purely additive — writing help content, not restructuring |

---

## 3. Navigation

Reproduces Route53's real tree including sections the brief never names (`[DERIVED]`, same logic as
A2). Everything except **Hosted zones** routes to the Coming Soon page — one component, N routes.
A short nav is one of the most obvious tells that a console clone isn't the real thing.

```
Dashboard
─────────────────────
▾ Domains
    Registered domains
    Requests
─────────────────────
▾ Hosted zones
    Hosted zones            ← the only working branch
    Health checks
─────────────────────
▾ Traffic flow
    Traffic policies
    Policy records
─────────────────────
▾ Resolver
    VPCs
    Inbound endpoints
    Outbound endpoints
    Rules
    Query logging
─────────────────────
▾ IP-based routing
    CIDR collections
─────────────────────
  Applications
  Profiles
  Test record
```

Built from a `SideNavigation` `items` array using `type: "section"` for groups and `type: "divider"`
between them — the console's exact structure.

---

## 4. Screen inventory

| Route | Screen | Key components | Requirement |
|---|---|---|---|
| `/login` | Sign in | Centred `Container`, `Form` | `FR-A1` |
| `/dashboard` | **Dashboard (landing)** | `ColumnLayout` stat containers, recent-zones `Table` | `FR-F2` |
| `/hosted-zones` | Zone list | `Table` + `TextFilter` + `Pagination` + `CollectionPreferences` | `FR-B1` – `FR-B9` |
| `/hosted-zones/create` | Create zone | Full-page `Form` | `FR-B10` |
| `/hosted-zones/[id]` | Zone detail → **Records** tab | `Tabs`, records `Table` | `FR-C3` – `FR-C8` |
| `/hosted-zones/[id]/details` | **Hosted zone details** tab | `ColumnLayout` key-value pairs, `CopyToClipboard` | `FR-B23` |
| `/hosted-zones/[id]/edit` | Edit zone | Full-page `Form`, read-only fields | `FR-B15` |
| `/hosted-zones/[id]/records/create` | Quick create record | Full-page `Form` | `FR-C9` |
| `/hosted-zones/[id]/records/[rid]/edit` | Edit record | Full-page `Form` | `FR-C14` |
| *(15 others)* | Coming Soon | `ComingSoon` in the real shell | `FR-F1` |

Modals (`FR-E5`): delete record · delete empty zone · **cascade delete** (type-to-confirm) · bulk
delete (type-to-confirm) · import preview · keyboard shortcut reference.

---

## 5. Key screens

### 5.1 Dashboard — the landing page

The console lands here after sign-in, so this is a reviewer's first impression. Built with real
data rather than a placeholder (`FR-F2`, raised to **P1**).

```
Route 53 › Dashboard

┌─ Hosted zones ──┐ ┌─ Records ───────┐ ┌─ Health checks ─┐
│       15        │ │       92        │ │       0         │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─ Recently created hosted zones ──────────── [View all] ─┐
│  Hosted zone name    Type     Records   Created         │
│  example.com         Public   28        Jul 27, 2026    │
│  acme-corp.net       Public   9         Jul 26, 2026    │
│  staging.internal    Private  4         Jul 25, 2026    │
└─────────────────────────────────────────────────────────┘

[Create hosted zone]
```

### 5.2 Hosted zones list

```
Route 53 › Hosted zones

Hosted zones (15)          [Delete] [Edit] [Create hosted zone]
┌─────────────────────────────────────────────── ⚙ ─────────┐
│ [🔍 Find hosted zones            ]      ‹ 1 2 ›           │
├───┬──────────────┬────────┬──────────┬─────────┬──────────┤
│ ○ │ Hosted zone… │ Type   │ Created… │ Record… │ Descrip… │
├───┼──────────────┼────────┼──────────┼─────────┼──────────┤
│ ○ │ example.com  │ Public │ Admin U. │ 28      │ Primary… │
│ ○ │ acme-corp.net│ Public │ Admin U. │ 9       │          │
└───┴──────────────┴────────┴──────────┴─────────┴──────────┘
```

Columns per `FR-B1`; `Hosted zone ID` also present, monospace with `CopyToClipboard`. `Edit` and
`Delete` disabled until a row is selected (`FR-B2`). Search is server-side over name and description
(`FR-B3`).

### 5.3 Zone detail — Records tab

```
Route 53 › Hosted zones › example.com

example.com                      [Actions ▾] [Edit] [Delete]

Hosted zone ID  Z1D633PJN98FT9    Type      Public
Record count    28                Created   Jul 27, 2026

┌ Records │ Hosted zone details │ Query logging │ DNSSEC signing ┐

Records (28)         [Import zone file] [Delete] [Edit] [Create record]
┌─────────────────────────────────────────────── ⚙ ─────────┐
│ [🔍 Filter records by property or value] [Type ▾] ‹ 1 2 3 ›│
├───┬────────────────┬──────┬──────────┬───────┬─────────────┤
│ ○ │ Record name    │ Type │ Routing… │ Alias │ Value/Route…│
├───┼────────────────┼──────┼──────────┼───────┼─────────────┤
│ ○ │ example.com    │ NS   │ Simple   │ No    │ ns-2048.aw… │
│   │                │      │          │       │ ns-2049.aw… │
│   │                │      │          │       │ +2 more     │
│ ○ │ www.example.com│ A    │ Simple   │ No    │ 192.0.2.1   │
│   │                │      │          │       │ 192.0.2.2   │
└───┴────────────────┴──────┴──────────┴───────┴─────────────┘
```

**One row per record set, values stacked in the cell** — the visible consequence of
[DD-8](./02-design-decisions.md#dd-8--records-are-record-sets-with-values-in-a-child-table).
Truncates past three with `+N more` (`FR-C7`). Required records (SOA, apex NS) render with delete
disabled and an explanatory tooltip (`FR-C8`).

Two composition points from the `details-tabs` demo (§10), both corrections to an earlier draft:

- **A key-value summary block sits *above* the tab strip**, not inside a tab. The console shows core
  identifying facts immediately; the tabs hold the detail. Our earlier layout put everything inside
  tabs.
- **Secondary actions collapse into an `Actions` `ButtonDropdown`**, with only `Edit` and `Delete`
  as standalone buttons. `Test record`, `Import zone file`, and `Export zone file` belong in that
  dropdown rather than sitting loose in the header.

`Tabs` carries `ariaLabel="Resource details"` (`NFR-9`).

### 5.4 Quick create record

```
Route 53 › Hosted zones › example.com › Create record

Quick create record                        [Switch to wizard]

Record name
[ www                    ] .example.com
Keep blank to create a record for the root domain.

Record type
[ A — IPv4 address                              ▾ ]

Alias  ( ○ )

Value/Route traffic to
┌──────────────────────────────────────────────────┐
│ 192.0.2.1                                        │
│ 192.0.2.2                                        │
└──────────────────────────────────────────────────┘
Enter multiple values on separate lines.

TTL (seconds)          Routing policy
[ 300 ]                [ Simple routing            ▾ ]
[1m] [5m] [1h] [1d]

                                [Cancel] [Create records]
```

Details that matter:

- **Record name is a split input** — editable prefix, static `.example.com` suffix (`FR-C2`).
  Blank means the apex, and the hint says so, because the console explicitly warns against typing
  `@` `[VERIFIED]`.
- **Type options carry their descriptions** — `A — IPv4 address`, not `A` `[VERIFIED]`.
- **`Alias` on** hides Value and TTL, shows the mocked target picker (`FR-C12`).
- **CNAME** collapses the textarea to a single input — the console permits multiple values for
  every type except CNAME `[VERIFIED]`.
- **NS forces Routing policy to Simple routing** and disables the select — *"You can specify an NS
  record with only simple routing policy"* `[VERIFIED]`.
- **Inline validation renders from `/record-types`** (`FR-D6`) — placeholder, help text, and pattern
  all come from the API, so no grammar is duplicated in TypeScript.
- The submit button is **`Create records`**, plural `[VERIFIED]`.

### 5.5 Edit hosted zone

```
Route 53 › Hosted zones › example.com › Edit

Edit hosted zone

Domain name
example.com
Route 53 doesn't support renaming a hosted zone, because the zone
name forms the suffix of every record it contains.

Type
Public hosted zone

Description - optional
[ Primary production zone                          ]

Tags
[ Environment ] [ production ]  [Remove]
[+ Add tag]
                                    [Cancel] [Save changes]
```

Immutable fields render as **plain text with explanatory helper text**, never disabled inputs — the
A1 escape hatch that stops correct behaviour from reading as a broken form (`FR-B15`).

### 5.6 Delete zone — the cascade path

Friction scales with blast radius ([DD-10](./02-design-decisions.md#dd-10--confirmation-friction-scales-with-blast-radius)).
An empty zone gets a plain Cancel/Delete. A populated one gets the **verified Cloudscape
high-severity delete pattern** — from `delete-with-additional-confirmation` in AWS's own demos (§10):

```
┌─ Delete hosted zone ─────────────────────────────┐
│                                                  │
│  Delete example.com?                             │
│  Permanently delete this hosted zone? You        │
│  can't undo this action.                         │
│                                                  │
│  ⚠ Proceeding with this action will delete       │
│    the hosted zone with all its records and      │
│    can affect related resources.                 │
│                                                  │
│  To confirm this deletion, type "confirm".       │
│  [                                    ]          │
│                                                  │
│                        [Cancel]  [Delete]        │
└──────────────────────────────────────────────────┘
```

**The confirmation word is the literal string `confirm`, not the resource name** `[VERIFIED]`.
Typing the resource name is the S3/RDS pattern; Cloudscape's console pattern — the one AWS uses in
the demos this app is built on — is `confirm`, matched case-insensitively. Composition:

| Element | Value |
|---|---|
| Field label | `To confirm this deletion, type "confirm".` |
| Alert | `Alert type="warning"`, body as above |
| Confirm button | `variant="primary"`, `disabled={!inputMatchesConsentText}` |
| Cancel button | `variant="link"` |
| Layout | nested `SpaceBetween size="m"`; footer `Box float="right"` wrapping `SpaceBetween direction="horizontal" size="xs"` |

The same pattern serves bulk delete (`FR-G4`), with the header pluralised as the demos do
(`Delete record` / `Delete records`).

### 5.7 Coming Soon

Renders **inside the full shell** with correct breadcrumbs and nav highlighting — an unbuilt section
of one product, not a dead link (`FR-F1`).

```
Route 53 › Health checks

Health checks

┌──────────────────────────────────────────────────┐
│                                                  │
│              Coming soon                         │
│    This section isn't implemented in this        │
│    demo. Hosted zones and records are fully      │
│    functional.                                   │
│                    [Go to hosted zones]          │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 6. Shared patterns

**Every table** (`FR-E6`) uses one `ConsoleTable` wrapper: `Header` with count and actions ·
`TextFilter` · `Pagination` · `CollectionPreferences` · selection column · sortable headers ·
`loading` skeleton · `empty` state · `noMatch` state with `Clear filter`.

Five details taken from AWS's `server-side-table` demo (§10). **All five are structural** — they
live in the fetch wiring and state hook, so retrofitting them later means rewriting every table
(§11).

**1. Debounced filtering.** Keep two pieces of state: `filteringText` for the input, and a delayed
value that actually triggers the request, wired through `TextFilter`'s **`onDelayedChange`**. Binding
the fetch to `onChange` fires a request per keystroke.

```tsx
<TextFilter
  filteringText={filteringText}                    // immediate, for the input
  onChange={({detail}) => setFilteringText(detail.filteringText)}
  onDelayedChange={({detail}) => setQuery(detail.filteringText)}  // debounced → fetch
  filteringPlaceholder="Find hosted zones"
  countText={getMatchesCountText(totalCount)}
/>
```

**2. Selection must survive pagination.** Cloudscape does not preserve `selectedItems` across page
changes — after paginating, `selectedItems` holds objects absent from the new page. Reconcile on
every page change, or bulk delete (`FR-G4`) silently loses selections.

**3. Server-side counters.** The total is only known from the response, so the header counter uses
the server-side form and is **hidden while loading** rather than flashing a stale number:
`getHeaderCounterServerSideText(totalCount, selectedItems.length)`.

**4. Table props.** `stickyHeader` (the console keeps headers visible on long record lists) ·
`resizableColumns` · `enableKeyboardNavigation` (supports `NFR-9`) · and `AppLayout
contentType="table"`, which sets the correct content padding for table pages.

**5. Preferences.** `CollectionPreferences` covers page size, column visibility, **content density,
row striping, and sticky columns** — broader than `FR-B7` originally specified — persisted to
`localStorage`.

**Every form** (`FR-E8`) uses Cloudscape `Form`, composed as the `form` demo does (§10):

- `Header variant="h1"` with optional `description` and `info` link
- Content grouped into `Container` panels, separated by `SpaceBetween size="l"`
- `FormField` with `label`, `description`, `constraintText`, `errorText`; `- optional` suffix on
  optional labels
- Actions in `SpaceBetween direction="horizontal" size="xs"` — `Cancel` (`variant="link"`) then the
  primary action
- **A form-level error summary** via `Form`'s `errorText` prop, in addition to inline field errors.
  Our spec previously had inline errors only
- **`focusTopMostError()` on failed submit** — programmatically move focus to the first errored
  field using refs. Supports `NFR-9`, and matters most on the record form where the error may be
  scrolled out of view

**Unsaved-changes guard.** `unsaved-changes-modal.tsx` lives inside the demo's *standard form
components folder*, so guarding abandonment is normal console furniture, not an exotic extra.
Navigating away from a dirty edit form opens a `Modal` with `Cancel` (`variant="link"`) and a
primary confirm. Applies to `FR-B15` (edit zone) and `FR-C14` (edit record) — see `FR-E12`.

> The demo's exact copy (*"Close side panel…"*) is scoped to its split-panel context, so it is
> adapted rather than reused. The page-level wording lives in the separate `form-unsaved-changes`
> demo, still unread (§10) — treat our wording as `[UNVERIFIED]` until then.

**Every mutation** (`FR-E4`, `NFR-10`): button enters `loading` and disables · on success push a
green `Flashbar` and navigate · on failure push a red `Flashbar` carrying the API message, and if
`error.field` is present attach it to the matching `FormField`. No silent failures.

**List state lives in the URL** (`FR-E11`) — one `useTableState` hook binds filter, type, sort, page,
and page size to query params.

---

## 7. Copy deck

`[VERIFIED]` strings are confirmed against AWS documentation (sources in
[SRS §15](./01-requirements.md)). Others are best-effort per **A4**.

### Record type options `[VERIFIED]`

```
A — IPv4 address                            NS — Name server
AAAA — IPv6 address                         PTR — Pointer
CAA — Certificate Authority Authorization   SRV — Service locator
CNAME — Canonical name                      TXT — Text
MX — Mail exchange
```

### Labels and buttons

| Context | String | Status |
|---|---|---|
| Record form | `Record name`, `Record type`, `Alias`, `Value/Route traffic to`, `TTL (seconds)`, `Routing policy` | `[VERIFIED]` |
| Record form | `Quick create record` / `Switch to wizard` | `[VERIFIED]` |
| Record form submit | **`Create records`** (plural) | `[VERIFIED]` |
| Routing option | **`Simple routing`** (not "Simple") | `[VERIFIED]` |
| Zone form | `Domain name`, `Description - optional`, `Type` | `[UNVERIFIED]` — docs call it "comment"; current console uses Description |
| Zone type | `Public hosted zone` / `Private hosted zone` | `[VERIFIED]` |
| Zone actions | `Create hosted zone`, `Edit`, `Delete`, `View details` | `[VERIFIED]` |
| Zone search | `Find hosted zones` | `[UNVERIFIED]` |
| Record search | `Filter records by property or value` | `[UNVERIFIED]` |
| Zone columns | `Hosted zone name`, `Type`, `Created by`, `Record count`, `Description`, `Hosted zone ID` | `[UNVERIFIED]` |

### Help text `[VERIFIED]`

**Record name** — *"Enter the name of the domain or subdomain that you want to route traffic for.
The default value is the name of the hosted zone."* Plus the console's warning: do **not** enter
`@` for the apex; leave it blank.

**Value/Route traffic to** — *"Enter each value on a separate line."* Multiple values are allowed
for **all types except CNAME**.

**TTL (seconds)** — *"The amount of time, in seconds, that you want DNS recursive resolvers to cache
information about this record."*

**NS constraint** — *"You can specify an NS record with only simple routing policy."*

### Error messages

| Code | Message | Status |
|---|---|---|
| `HostedZoneNotEmpty` | *"The specified hosted zone contains non-required resource record sets and so cannot be deleted."* | `[VERIFIED]` |
| `ConflictingDomainExists` | *"A hosted zone with the specified name already exists."* | `[UNVERIFIED]` |
| `InvalidChangeBatch` (CNAME) | *"RRSet of type CNAME with DNS name … is not permitted at apex in zone …"* | `[UNVERIFIED]` |

### Delete confirmation `[VERIFIED]`

From Cloudscape's `delete-with-additional-confirmation` demo (§10):

| Element | String |
|---|---|
| Confirmation word | `confirm` — the literal word, **not** the resource name; matched case-insensitively |
| Field label | `To confirm this deletion, type "confirm".` |
| Warning alert | `Proceeding with this action will delete the … with all their content and can affect related resources.` |
| Modal header | `Delete <resource>` / `Delete <resources>` — pluralised for bulk |
| Buttons | `Cancel` (`variant="link"`) · `Delete` (`variant="primary"`) |

---

## 8. Dark mode, responsive, keyboard

**Dark mode** (`FR-G1`) — `applyMode(Mode.Dark)` from a `TopNavigation` toggle. Honours
`prefers-color-scheme` on first visit, then persists to `localStorage`. Because it's a Cloudscape
mode rather than custom CSS, every component switches correctly for free — the only requirement is
not to hand-roll colours (§1).

**Responsive** — `AppLayout` collapses the nav to a hamburger below its breakpoint automatically.
Tables scroll horizontally within their container; the page body never scrolls sideways. Not a
primary target — the console itself is desktop-first.

**Keyboard** (`FR-G5`, `NFR-9`) — `/` focus search · `c` create · `Esc` close · `?` shortcut
reference. Suppressed while an input has focus. Cloudscape already provides focus trapping in
modals, focus return on close, and full tab navigation; the requirement is not to break it.

---

## 9. Legal boundary

The app must **look** like Route53 without **impersonating** AWS:

- No AWS logos, wordmarks, or Amazon Ember (proprietary; Cloudscape's Open Sans is used instead).
- The login page echoes the console's *layout*, not its branding.
- A footer notes this is an educational clone, unaffiliated with AWS.

Cloudscape itself is Apache-2.0 and explicitly intended for building AWS-console-style
applications, so using it is squarely within its licence.

---

## 10. Reference sources

Fidelity here rests on three sources, in descending order of authority. See
[DD-19](./02-design-decisions.md#dd-19--how-ui-fidelity-is-sourced).

**1. `cloudscape-design/demos` (MIT-0)** — AWS's own reference implementations of console page
patterns. Read as *patterns*, never copied: screens stay hand-written Cloudscape.

| Demo | Feeds |
|---|---|
| `server-side-table` (`root.tsx`, `hooks.ts`) | ✅ §6 items 1–5 — the entire table pattern |
| `delete-with-additional-confirmation` | ✅ §5.6, §7 — the verified confirm-word pattern |
| `form` (`form.tsx`, `unsaved-changes-modal.tsx`) | ✅ §6 — form composition, error summary, `focusTopMostError`, the unsaved-changes guard |
| `details-tabs` | ✅ §5.3 — summary block above the tabs, `Actions` dropdown |
| `form-unsaved-changes` | ⬜ page-level abandon copy — needed before **Slice 3** |
| `dashboard` | ⬜ §5.1 stat containers — needed before **Slice 6** |

**2. AWS Route53 Developer Guide** — console procedure pages. Source of the §7 copy deck; full list
in [SRS §15](./01-requirements.md).

**3. Direct console capture** — a throwaway hosted zone, deleted within 12 hours (verified free).
Pending. This is the **only** source for what remains `[UNVERIFIED]`: table column sets and their
default visibility, left-nav ordering, TTL quick-set presets, date format, empty-state copy, and the
zone description field label. Captures land in `docs/reference/`.

**What is never a source:** the AWS console's rendered DOM. Mirroring it would yield minified class
names and hand-rolled markup — worse than clean Cloudscape composition, and it would forfeit the
free dark mode and accessibility that [DD-1](./02-design-decisions.md#dd-1--aws-cloudscape-design-system-for-the-ui)
buys. We observe and verify; we do not generate.

---

## 11. Implementation staging

Built in two stages. The split is **structural vs. additive** — not "ugly then pretty".

**Stage 1 — structurally correct, minimally polished.** Every screen present and functional, with
the right components, state architecture, and data flow. Less surface content, not fewer patterns.

**Stage 2 — the additive layer**, plus reconciliation against the console captures from §10.

| Stage 2 (safe to defer — additive) | Stage 1 (must be right — structural) |
|---|---|
| Help panel and `Info` links (§2) | Debounced filtering (§6.1) — lives in the fetch wiring |
| Dark mode toggle (§8) | Selection across pagination (§6.2) — lives in the state hook |
| Keyboard shortcuts (§8) | URL-synced list state (`FR-E11`) — moving state out of `useState` later is real surgery |
| Empty-state and help copy | `/record-types`-driven validation (`FR-D6`) |
| Date formatting (§7) | Record-set rendering (`FR-C1`) — a data-shape concern, not styling |
| Density / striping / sticky-column preferences (§6.5) | The delete-confirmation pattern (§5.6) |
| `+N more` truncation (`FR-C7`) | `AppLayout` / navigation structure (§2, §3) |

**Two rules make the deferral safe:**

1. **No custom CSS overriding Cloudscape tokens (§1)** — including in stage 1. "Good enough looking"
   is exactly when someone reaches for a quick colour override, and that turns stage 2's dark mode
   from a one-liner into a rewrite, forfeiting the largest benefit Cloudscape provides.
2. **No temporary shortcuts on structural items.** Hardcoding the nine grammars in TypeScript "just
   for stage 1" builds precisely what [DD-9](./02-design-decisions.md#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend)
   rejected — and things built that way rarely get unbuilt.

---

## 12. Traceability

| Requirement | Section |
|---|---|
| `AS-E1`, `FR-E1` shell | §2 |
| `AS-E2`, `FR-E2` navigation | §3 |
| `AS-E5`, `FR-E6` tables | §5.2, §5.3, §6 |
| `AS-E6`, `FR-E8` forms | §5.4, §5.5, §6 |
| `AS-E7`/`E8`/`E9` search, filters, pagination | §5.2, §5.3, §6 |
| `AS-E10`, `FR-E5` modals | §5.6 |
| `AS-E11`, `FR-E4` notifications | §6 |
| `AS-M1` – `AS-M6`, `FR-F1` placeholders | §3, §5.7 |
| `FR-F2` dashboard | §5.1 |
| `FR-B15` immutable-field treatment | §5.5 |
| `FR-B18a` cascade escape hatch | §5.6 |
| `FR-C1`, `FR-C7` record-set rendering | §5.3 |
| `FR-C2`, `FR-C9` record form | §5.4 |
| `FR-D6` validation from metadata | §5.4 |
| `FR-G1` dark mode | §1, §8 |
| `FR-G5` shortcuts | §8 |
| `AS-V1` UI similarity | entire document, especially §7 and §10 |
| Risk **R2** Cloudscape + App Router | §2 |
| Risk **R5** unverified UI details | §7 and §10, marked inline |
| Implementation staging | §11 |
