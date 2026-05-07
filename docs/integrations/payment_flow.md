# Payment Flow
> Part of the eFactory platform integrations.
> See [`INDEX.md`](../INDEX.md) for the full order lifecycle.
> Invoice creation and Sevdesk endpoints: [`sevdesk.md`](sevdesk.md)
> Pipedrive Won trigger: [`pipedrive.md`](pipedrive.md)
> Business rules (installments, invoice type): [`business_rules.md`](../business_rules.md)

---

## Overview

Payment has two paths depending on how the customer pays. Both paths call the **same internal handler** — no divergent logic.

| Path | Trigger | Who acts |
|------|---------|---------|
| Stripe (card / Klarna / PayPal) | `payment_intent.succeeded` webhook | Automatic |
| Bank transfer (SEPA / Überweisung) | Admin "Mark as Paid" button | Berat manually |

---

## Path A — Stripe

### Setup (when invoice is sent)

When the platform sends the invoice email, it also creates a Stripe `PaymentIntent` or `Checkout Session` with metadata embedding all relevant IDs:

```json
{
  "platform_order_id": "789",
  "sevdesk_invoice_id": "INV-12345",
  "pipedrive_deal_id": "456"
}
```

The Stripe payment link is included in the invoice email body.

### Webhook handler

Stripe fires `payment_intent.succeeded` (or `checkout.session.completed`) to the platform's webhook endpoint. The handler:

```
Stripe webhook: payment_intent.succeeded
    ↓
Verify Stripe signature
    ↓
Read metadata → platform_order_id, sevdesk_invoice_id, pipedrive_deal_id
    ↓
Call internal confirmPayment(platform_order_id)
    ↓
(parallel)
├── POST /Invoice/:sevdesk_invoice_id/changeStatus → mark paid in Sevdesk
├── PATCH /deals/:pipedrive_deal_id → mark Won in Pipedrive
└── Platform DB → update order status to "paid", trigger GW assignment flow
```

**Why not poll Sevdesk:** Sevdesk has no native payment processing. `GET /Invoice/:id/getIsPartiallyPaid` will never self-update when Stripe receives money — Sevdesk only knows about payment when we tell it. Polling is pointless.

### Installments

When a customer pays via installments (Klarna / Stripe):
- Stripe fires a webhook for each installment payment
- The Sevdesk invoice must **not** be marked "fully paid" until the final installment clears
- Track installment count on the platform order — only call `changeStatus: paid` on final webhook

---

## Path B — Bank Transfer

A meaningful share of German customers (students and others) pay via SEPA bank transfer. Berat manually checks his bank account for these.

```
Berat sees payment in bank account
    ↓
Opens platform admin dashboard → order detail view
    ↓
Clicks "Mark as Paid" button
    ↓
Call internal confirmPayment(platform_order_id)
    ↓
(parallel — same as Stripe path)
├── POST /Invoice/:id/changeStatus → mark paid in Sevdesk
├── PATCH /deals/:id → mark Won in Pipedrive
└── Platform DB → update order status to "paid", trigger GW assignment flow
```

The `confirmPayment()` function is shared. The "Mark as Paid" button and the Stripe webhook are just two entry points into identical logic.

---

## Invoice cancellation (non-payment)

If a customer does not pay within the timeout period:
- Admin cancels the invoice manually (or the platform auto-cancels on timeout)
- `POST /Invoice/:id/changeStatus` with cancelled status
- Exact timeout duration not yet confirmed by Berat — see [`open_questions.md`](../open_questions.md)

---

## Stripe metadata — entity ID reference

| Key | Value | Purpose |
|-----|-------|---------|
| `platform_order_id` | Platform DB primary key for the order | Find and update the internal order record |
| `sevdesk_invoice_id` | Sevdesk invoice ID | Call `changeStatus` on the right invoice |
| `pipedrive_deal_id` | Pipedrive deal ID | Call `PATCH /deals/:id` to mark Won |

> ⚠️ Entity ID naming conventions are not yet finalized. The key names above are placeholders until the team agrees on canonical names. See [`open_questions.md`](../open_questions.md).

---

## Combined order lifecycle across all three systems

```
1. Customer submits form
   → Platform DB: create order (platform_order_id generated)
   → Pipedrive: create Person + Deal (stage: Qualifiziert)
   → Pipedrive: set marketing_status = subscribed

2. Admin generates offer
   → Sevdesk: check/create Contact
   → Sevdesk: POST /Order/Factory/saveOrder (pricing engine)
   → Sevdesk: POST /Order/:id/sendViaEmail
   → Pipedrive: PATCH /deals/:id → Rückmeldung

3. Customer accepts offer
   → Sevdesk: POST /Invoice/Factory/createInvoiceFromOrder
   → Stripe: create PaymentIntent with metadata
   → Sevdesk: POST /Invoice/:id/sendViaEmail (includes Stripe link)
   → Pipedrive: PATCH /deals/:id → Rechnung angefordert

4a. Stripe payment
   → Stripe webhook: payment_intent.succeeded
   → confirmPayment(platform_order_id) [internal handler]
   → (parallel) Sevdesk paid | Pipedrive Won | Platform: start GW assignment

4b. Bank transfer
   → Admin: "Mark as Paid" button
   → confirmPayment(platform_order_id) [same internal handler]
   → (parallel) Sevdesk paid | Pipedrive Won | Platform: start GW assignment

5. GW assigned
   → Admin selects GW (or self-assigns)
   → Platform: send two simultaneous emails (GW briefing + customer intro)
   → Platform: order status → in progress

6. Delivery
   → GW uploads Teillieferung (platform checks against auto-calculated date)
   → GW uploads final work + invoice
   → Customer accepts deliverable
   → Berat pays GW
```
