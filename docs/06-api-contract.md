# API Contract

| | |
|---|---|
| **Phase** | 2 of 6 — Design ([roadmap](./00-sdlc-roadmap.md)) |
| **Companions** | [Architecture](./04-architecture.md) · [Data model](./05-data-model.md) |
| **Satisfies** | `AS-O3`, `AS-T2`, `AS-D7` · `NFR-1` – `NFR-4`, `§11.1` of the [SRS](./01-requirements.md) |

This is the authoritative contract. FastAPI generates the OpenAPI schema from it, and the frontend
client is generated from that schema (`NFR-1`) — so this document, the running API, and the
TypeScript types cannot drift apart.

---

## 1. Conventions

**Base path** `/api/v1`. In the browser this is reached same-origin through the Next.js rewrite
([DD-16](./02-design-decisions.md#dd-16--next-js-rewrite-proxy-instead-of-cross-origin-calls)).
Slice 0's `next.config.ts` rewrite strips the `/api` segment (`source: "/api/:path*"` →
`destination: "${BACKEND_ORIGIN}/:path*"`), so **the backend's own FastAPI routers are mounted at
`/v1`**, not `/api/v1` — e.g. `app.include_router(auth_router, prefix="/v1")`. Hitting the backend
directly (its public Fly URL, for `/docs`) uses `/v1/...` and unprefixed `/health`; only the
browser-facing path through the rewrite is `/api/v1/...`.

**Auth** — session JWT in an `HttpOnly; Secure; SameSite=Lax` cookie. Every endpoint except
`/auth/login` requires it and returns `401` without it.

**Identifiers** — public AWS-shaped strings only. `Z1D633PJN98FT9` for zones, opaque strings for
records. Internal integer keys never appear.

**Names** — accepted with or without a trailing dot, normalised to lowercase without one
`[VERIFIED]`.

### 1.1 List envelope (`NFR-2`)

Every list endpoint returns the same shape:

```json
{ "items": [], "page": 1, "page_size": 10, "total": 42, "total_pages": 5 }
```

Shared query parameters:

| Param | Default | Notes |
|---|---|---|
| `search` | — | Case-insensitive substring, server-side |
| `sort` / `order` | resource default / `asc` | Sortable fields listed per endpoint |
| `page` | `1` | 1-based |
| `page_size` | `10` | Max `100` |

### 1.2 Error body (`NFR-3`)

```json
{ "error": { "code": "HostedZoneNotEmpty", "message": "…", "field": null } }
```

`code` is AWS-shaped so the UI can branch on it; `field` names the offending input so the frontend
attaches the message to the right `FormField` rather than only raising a toast.

### 1.3 Status codes (`NFR-4`)

| Code | Meaning | Error codes |
|---|---|---|
| `400` | Domain rule violated | `InvalidChangeBatch`, `LimitsExceeded` |
| `401` | Missing or invalid session | `NotAuthenticated` |
| `404` | No such resource | `NoSuchHostedZone`, `NoSuchRecord` |
| `409` | Conflict | `HostedZoneNotEmpty`, `ConflictingDomainExists`, `RecordSetAlreadyExists` |
| `422` | Schema or value-grammar validation | `InvalidInput` |

---

## 2. Auth

### `POST /auth/login`
```json
{ "email": "admin@example.com", "password": "…" }
```
`200` sets the session cookie and returns the user. `401 NotAuthenticated` on bad credentials — one
generic message for both unknown-user and wrong-password (`FR-A3`).

### `POST /auth/logout`
`204`. Clears the cookie server-side (`FR-A5`).

### `GET /auth/me`
`200` → `{ id, email, displayName, accountId }`. Hydrates session state and the top-nav menu
(`FR-A7`). `accountId` is the mocked `123456789012`.

---

## 3. Record type metadata

### `GET /record-types`

The single source of truth for the nine grammars (`FR-D6`,
[DD-9](./02-design-decisions.md#dd-9--the-backend-owns-validation-grammars-and-serves-them-to-the-frontend)).
Fetched once and cached; the record form renders its inline validation from this payload, so no
grammar is ever written in TypeScript.

```json
{
  "items": [
    {
      "type": "MX",
      "pattern": "^\\d{1,5}\\s+\\S+$",
      "placeholder": "10 mail.example.com",
      "helpText": "Priority (0–65535) followed by the mail server domain name.",
      "multiValue": true,
      "maxValues": 400,
      "maxValueLength": 4000,
      "requiresTtl": true
    }
  ]
}
```

Syntactic rules ship here. **Semantic rules are not expressible in this payload** — CNAME
coexistence, apex CNAME, duplicate sets and required-record protection need a database lookup and
surface as `400`/`409` with a `field` pointer.

---

## 4. Hosted zones

### `GET /hosted-zones`

`search` matches **name and description** (`FR-B3`). Additional params: `type` ∈ `PUBLIC|PRIVATE`
(`FR-B4`); `sort` ∈ `name|recordCount|type|createdAt`.

```json
{
  "items": [{
    "zoneId": "Z1D633PJN98FT9",
    "name": "example.com",
    "type": "PUBLIC",
    "description": "Primary production zone",
    "recordCount": 28,
    "createdBy": "Admin User",
    "createdAt": "2026-07-27T09:14:00Z"
  }],
  "page": 1, "page_size": 10, "total": 15, "total_pages": 2
}
```

### `POST /hosted-zones`

```json
{ "name": "example.com", "type": "PUBLIC", "description": "…", "tags": [{"key":"Env","value":"prod"}] }
```

`201`. Generates the zone ID, four nameservers, and the apex **SOA** and **NS** record sets
(`FR-B13`), so a new zone reports `recordCount: 2`.

| Failure | Response |
|---|---|
| Duplicate name | `409 ConflictingDomainExists`, `field: "name"` |
| Invalid domain name | `422 InvalidInput`, `field: "name"` |
| 500-zone quota reached | `400 LimitsExceeded` |

### `GET /hosted-zones/{zoneId}`

Adds `nameServers` (the four) and `tags` to the list shape (`FR-B23`). `404 NoSuchHostedZone`.

### `PATCH /hosted-zones/{zoneId}`

```json
{ "description": "Updated", "tags": [{"key":"Env","value":"staging"}] }
```

**Only `description` and `tags` are accepted.** Sending `name` or `type` is rejected with
`422 InvalidInput` rather than silently ignored — Route53 treats both as immutable (`FR-B15`).

### `DELETE /hosted-zones/{zoneId}`

| Query | Behaviour |
|---|---|
| *(none)* | Deletes **only** if the zone holds nothing beyond its required SOA and NS sets. Otherwise `409 HostedZoneNotEmpty` `[VERIFIED]`: *"The specified hosted zone contains non-required resource record sets and so cannot be deleted."* (`FR-B18`) |
| `?cascade=true` | **Atomic**: deletes every record set, its values, the tags, then the zone, in one transaction (`FR-B18a`) |

`204` on success. The cascade path exists so the brief's plain "Delete Hosted Zones" is never a dead
end ([DD-6](./02-design-decisions.md#dd-6--real-route53-behaviour-wins-over-literal-brief-wording--escape-hatches));
the UI gates it behind type-to-confirm (`FR-B17`).

---

## 5. Records

### `GET /hosted-zones/{zoneId}/records`

`search` matches **record name and any value** (`FR-C4`) — the query that `record_values(value)` is
indexed for. `type` is repeatable for multi-select filtering (`FR-C5`); `page_size` allows up to
`100`.

```json
{
  "items": [{
    "recordId": "rs_8f21c4",
    "name": "www.example.com",
    "type": "A",
    "routingPolicy": "SIMPLE",
    "setIdentifier": "",
    "ttl": 300,
    "values": ["192.0.2.1", "192.0.2.2", "192.0.2.3"],
    "aliasTarget": null,
    "isRequired": false
  }],
  "page": 1, "page_size": 10, "total": 28, "total_pages": 3
}
```

**`values` is an ordered array on a single item** — the record-set model (`FR-C1`). Three IPs are
one row, not three.

### `GET /hosted-zones/{zoneId}/records/{recordId}`

**Added 2026-07-27 (Slice 4)** — missing from this contract's original endpoint table (§8 lists
only list/create/update/delete for records). The edit record page needs one record's current
values to populate the form, and paging through the list to find it by id doesn't scale. Same
shape as one item from the list endpoint above. `404 NoSuchRecord` if it doesn't exist.

### `POST /hosted-zones/{zoneId}/records`

```json
{
  "name": "www",
  "type": "A",
  "ttl": 300,
  "values": ["192.0.2.1", "192.0.2.2"],
  "routingPolicy": "SIMPLE"
}
```

`name` accepts the bare prefix (`www`) or the full name; both normalise to
`www.example.com`. An empty string means the apex. Alias records send `aliasTarget` and **omit**
`ttl` and `values` (`FR-C12`).

`201` → the created record plus `changeInfo` (§7).

| Failure | Response |
|---|---|
| Same `(name, type, setIdentifier)` exists | `409 RecordSetAlreadyExists` — edit the existing set instead |
| Value fails its grammar | `422 InvalidInput`, `field: "values[1]"` |
| CNAME at apex, or coexisting with another type | `400 InvalidChangeBatch`, `field: "type"` (`FR-D3`) |
| >400 values, or >10,000 sets in the zone | `400 LimitsExceeded` |
| `ttl` sent with `aliasTarget` | `422 InvalidInput`, `field: "ttl"` |

### `PATCH /hosted-zones/{zoneId}/records/{recordId}`

Accepts `values`, `ttl`, `routingPolicy`, `routingConfig`, `aliasTarget`. **`name` and `type` are
rejected** — they are the record's identity (`FR-C14`).

### `DELETE /hosted-zones/{zoneId}/records/{recordId}`

`204`. The SOA and **apex** NS sets return `400 InvalidChangeBatch`; a **subdomain** NS record
deletes normally (`FR-C16` `[VERIFIED]`).

### `POST /hosted-zones/{zoneId}/records/bulk-delete`

```json
{ "recordIds": ["rs_8f21c4", "rs_2b90de"] }
```

Atomic. If any ID is a required record the whole request fails with `400 InvalidChangeBatch` and
nothing is deleted (`FR-G4`).

---

## 6. Import & export

### `GET /hosted-zones/{zoneId}/export?format=bind|json`

`200` with `Content-Disposition: attachment`. BIND output must re-import cleanly into an empty zone
and produce an identical record set — the round-trip guarantee in `AC-15` (`FR-G2`).

### `POST /hosted-zones/{zoneId}/import`

`multipart/form-data` (file) or `{ "content": "…" }`. Parses `$ORIGIN`, `$TTL`, relative and
absolute names, and all nine types.

**`?dry_run=true` returns a preview and writes nothing** — always called first (`FR-G3`):

```json
{
  "toCreate": [{ "name": "api.example.com", "type": "A", "ttl": 300, "values": ["192.0.2.9"] }],
  "skipped":  [{ "line": 12, "reason": "Record already exists with identical values" }],
  "rejected": [{ "line": 18, "raw": "bad   IN  MX  mail", "reason": "MX requires '<priority> <hostname>'" }]
}
```

Committing with any `rejected` entry returns `422 InvalidInput` and creates **nothing**. Import is
all-or-nothing — a half-applied import would leave a zone in a state nobody asked for.

---

## 7. Change info

Every record mutation and zone create returns a mocked change object matching Route53's response
shape (`FR-C17`):

```json
{ "changeInfo": { "id": "/change/C2682N5HXP0BZ4", "status": "INSYNC", "submittedAt": "2026-07-27T09:14:00Z" } }
```

`status` is **always `INSYNC`** — nothing propagates, so nothing is ever `PENDING`. Listed in the
[mocked-data inventory](./03-assumptions-mocked-data-notes.md).

---

## 8. Endpoint summary

| Method | Path | Requirement |
|---|---|---|
| `POST` | `/auth/login` | FR-A1, FR-A2 |
| `POST` | `/auth/logout` | FR-A5 |
| `GET` | `/auth/me` | FR-A7 |
| `GET` | `/record-types` | FR-D6 `[DERIVED]` |
| `GET` | `/hosted-zones` | FR-B1 – FR-B6 |
| `POST` | `/hosted-zones` | FR-B10 – FR-B13 |
| `GET` | `/hosted-zones/{zoneId}` | FR-B21, FR-B23 |
| `PATCH` | `/hosted-zones/{zoneId}` | FR-B15 |
| `DELETE` | `/hosted-zones/{zoneId}` | FR-B18 |
| `DELETE` | `/hosted-zones/{zoneId}?cascade=true` | FR-B18a `[DERIVED]` |
| `GET` | `/hosted-zones/{zoneId}/records` | FR-C3 – FR-C6 |
| `POST` | `/hosted-zones/{zoneId}/records` | FR-C9 – FR-C13 |
| `GET` | `/hosted-zones/{zoneId}/records/{recordId}` | `[DERIVED]` — added Slice 4, for the edit page |
| `PATCH` | `/hosted-zones/{zoneId}/records/{recordId}` | FR-C14 |
| `DELETE` | `/hosted-zones/{zoneId}/records/{recordId}` | FR-C15, FR-C16 |
| `POST` | `/hosted-zones/{zoneId}/records/bulk-delete` | FR-G4 |
| `GET` | `/hosted-zones/{zoneId}/export` | FR-G2 |
| `POST` | `/hosted-zones/{zoneId}/import` | FR-G3 |

Interactive OpenAPI UI is served at `/docs` on the backend origin and linked from the README
(`AS-D7`).
