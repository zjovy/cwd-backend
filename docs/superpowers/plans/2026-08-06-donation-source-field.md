# Donation Source Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose a derived `source` field (`"stripe"` | `"manual"`) on donation list and detail API responses.

**Architecture:** Derive `source` in SQL from existing `stripe_payment_intent_id` via a `CASE` expression in `getDonations` and `getById`. No schema migration, no controller changes, no filter support.

**Tech Stack:** Express.js, MySQL (`mysqlProvider.js`), ES Modules

**Spec:** `docs/superpowers/specs/2026-08-06-donation-source-field-design.md`

---

## File map

| File | Responsibility |
| --- | --- |
| `src/providers/mysqlProvider.js` | Add `CASE ... AS source` to `getDonations` and `getById` SELECTs |

No other files change. Controllers already return query rows as-is. No test framework is configured in this repo.

---

### Task 1: Add `source` to donation list and detail queries

**Files:**
- Modify: `src/providers/mysqlProvider.js` (`getDonations` SELECT ~lines 96–97, `getById` SELECT ~lines 111–112)

- [x] **Step 1: Update `getDonations` SELECT**

Replace the list SELECT column list with:

```js
        `SELECT d.id, d.donor_id, d.amount, d.donation_date, d.receipt_status, d.description,
                CASE
                  WHEN d.stripe_payment_intent_id IS NOT NULL THEN 'stripe'
                  ELSE 'manual'
                END AS source,
                dn.first_name, dn.last_name, dn.email
         FROM donations d
         JOIN donors dn ON d.donor_id = dn.id
         ${where}
         ORDER BY d.donation_date DESC LIMIT ${pageSize} OFFSET ${offset}`,
```

- [x] **Step 2: Update `getById` SELECT**

Replace the detail SELECT column list with:

```js
      `SELECT d.id, d.donor_id, d.amount, d.donation_date, d.receipt_status, d.description,
              CASE
                WHEN d.stripe_payment_intent_id IS NOT NULL THEN 'stripe'
                ELSE 'manual'
              END AS source,
              dn.first_name, dn.last_name, dn.email, dn.phone, dn.address
       FROM donations d
       JOIN donors dn ON d.donor_id = dn.id
       WHERE d.id = ?`,
```

- [x] **Step 3: Lint**

Run: `npm run lint`

Expected: no new errors in `mysqlProvider.js`.

- [x] **Step 4: Commit**

```bash
git add src/providers/mysqlProvider.js
git commit -m "feat: expose derived donation source on list and detail"
```

---

## Spec coverage check

| Spec requirement | Task |
| --- | --- |
| Derive `source` from `stripe_payment_intent_id` | Task 1 |
| `GET /donations` includes `source` | Task 1 Step 1 |
| `GET /donations/:id` includes `source` | Task 1 Step 2 |
| No filter, no schema migration, no write-path changes | Implicit (not in plan) |
| Do not return raw Stripe IDs | Implicit (CASE only) |
