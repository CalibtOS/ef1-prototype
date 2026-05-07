# Pipedrive Integration
> Part of the eFactory platform integrations.
> See [`INDEX.md`](../INDEX.md) for the full picture.
> Business rules (pipeline stages, marketing status): [`business_rules.md`](../business_rules.md)
> Payment flow (deal Won trigger): [`payment_flow.md`](payment_flow.md)

---

## Why Pipedrive stays

Pipedrive holds 7,700+ contacts and 3,400+ deals built up over years. It is the source of truth for customer data and the engine behind all automated RapidMail email campaigns. Replacing it means losing all of that history and the campaign system. The platform integrates via API instead.

**Stats:** ~7,700 contacts · ~3,400 deals · **4,159/5,000 subscriber limit** ⚠️

---

## Current manual workflow (what we're replacing)

Berat currently does this manually every day:

1. Moves deals across pipeline stages by drag-and-drop
2. Bulk-selects new contacts → changes marketing status from "Keine Zustimmung" → "Abonniert"
3. Manually creates contacts for WhatsApp customers who never filled the form
4. Checks analytics dashboard to track conversion rates

---

## Pipeline stages

> Stage definitions (IDs, names, business meaning, platform triggers) are in [`business_rules.md` — section 7](../business_rules.md).
> Stage IDs for API calls: 1 · 2 · 3 · 4 · Won

---

## Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Get all stages | `GET` | `/api/v2/stages` |
| Get deals in a stage | `GET` | `/api/v1/stages/:id/deals` |
| Move deal to new stage | `PATCH` | `/api/v2/deals/:id` |
| Get all persons | `GET` | `/api/v2/persons` |
| Update marketing status | `PATCH` | `/api/v2/persons/:id` |

**Auth:** API token via `?api_token=YOUR_TOKEN` query param or `Authorization` header. Store as env var — never hardcode.

**Rate limit:** 100 requests per 10 seconds per token. Use request queuing + exponential backoff for bulk operations.

---

## Automation flow

```
Form submission (platform)
    ↓
POST /persons → create contact (or check by email first)
    ↓
POST /deals → create deal in stage: Qualifiziert
    ↓
PATCH /persons/:id → set marketing_status: "subscribed"
    ↓
[Admin sends offer]
    ↓
PATCH /deals/:id → move to Rückmeldung
    ↓
[Customer accepts offer]
    ↓
PATCH /deals/:id → move to Rechnung angefordert
    ↓
[Payment confirmed — via Stripe webhook or admin button]
    ↓
PATCH /deals/:id → mark as Won
```

---

## Important constraints

- `marketing_status` requires the **Campaigns add-on** to be enabled — already active on Berat's account
- Marketing status is **one-way**: once set to "subscribed", do not toggle back — it is attached to the email address, not the person record
- **Never create duplicate contacts** — always check by email before calling `POST /persons`
- Pipedrive supports **webhooks** for deal updates and contact changes — prefer webhooks over polling wherever possible

---

## Implementation phases

**Phase 1 — Read-only sync**
Pull all existing contacts and deals into the platform DB for historical data migration. Match to platform users by email address. ~7,700 contacts, ~3,400 deals.

**Phase 2 — Two-way sync for new orders**
Every new platform order creates a matching Pipedrive deal. Stage transitions in the platform trigger `PATCH` calls to keep Pipedrive in sync.

**Phase 3 — Replace Zapier (hard deadline: July 31, 2026)**
The platform's form intake replaces Contact Form 7 + Zapier. New form submissions write directly to the platform DB and Pipedrive in a single transaction. Zapier is decommissioned.

---

## Error handling

Wrap every Pipedrive API call in try-catch with retry logic (exponential backoff on 5xx / network timeout). Failed calls must be logged and queued for manual review. The platform must not crash or block an order because Pipedrive is temporarily unreachable — Pipedrive is a side-effect, not a blocker.
