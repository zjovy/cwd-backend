# Donation Source Field Design

**Date:** 2026-08-06  
**Status:** Approved  
**Scope:** Backend API (cwd-backend)

## Problem

The home page and donations page need a column showing whether each donation came from Stripe or was created manually. The distinction already exists in the database (`stripe_payment_intent_id` is set by Stripe sync and null for manual creates), but list and detail APIs do not expose it.

## Decision

Derive a read-only `source` field in SQL from the existing `stripe_payment_intent_id` column. Do not add a new persisted column.

| Condition | `source` value |
| --- | --- |
| `stripe_payment_intent_id IS NOT NULL` | `"stripe"` |
| `stripe_payment_intent_id IS NULL` | `"manual"` |

## Approach

Add a `CASE` expression to the SELECT lists used by donation read queries:

```sql
CASE
  WHEN d.stripe_payment_intent_id IS NOT NULL THEN 'stripe'
  ELSE 'manual'
END AS source
```

No schema migration, no backfill, no changes to create or Stripe sync write paths.

## API changes

### Endpoints

- `GET /donations` — each item in `donations` includes `source`
- `GET /donations/:id` — response includes `source`

### Response field

```json
"source": "stripe" | "manual"
```

- Display only: no `?source=` filter parameter
- Do not return `stripe_payment_intent_id` or `stripe_created_at` in these responses

### Unchanged

- `POST /donations` (manual create)
- Stripe sync (`createStripeDonation`)
- Update / delete / receipt-sending endpoints
- Dashboard aggregate endpoints

## Implementation touchpoints

| Layer | File | Change |
| --- | --- | --- |
| Provider | `src/providers/mysqlProvider.js` | Add `CASE ... AS source` to `getDonations` and `getById` SELECTs |
| Controllers / routes | — | No changes (rows returned as-is) |
| Schema / migrations | — | None |

## Frontend (out of scope for this repo)

Separate frontend work: render a Source column on the home and donations lists using `donation.source`.

## Out of scope

- Filtering or sorting by source
- New `source` DB column
- Exposing raw Stripe IDs to the client
- Postgres provider (runtime is MySQL-only)

## Testing

- Manual donation via `POST /donations` → `GET /donations` / `GET /donations/:id` return `"source": "manual"`
- Stripe-synced donation (with `stripe_payment_intent_id`) → same endpoints return `"source": "stripe"`
- Existing list filters and pagination still work; response shape otherwise unchanged
