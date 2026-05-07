# Sevdesk Integration
> Part of the eFactory platform integrations.
> See [`INDEX.md`](../INDEX.md) for the full picture.
> Pricing rules (VAT, formula, GW split): [`business_rules.md`](../business_rules.md)
> Payment confirmation flow: [`payment_flow.md`](payment_flow.md)

---

## Why Sevdesk stays

Sevdesk handles every Angebot (proposal) and Rechnung (invoice) in the business and serves as the accounting system for German tax purposes. Without it the business cannot legally invoice customers. Replacing it would create tax/legal risk. The platform integrates via API instead.

---

## Current manual workflow (what we're replacing)

For every single order, Berat currently:

1. Reads the form submission email to extract customer details
2. Opens Sevdesk, creates a new contact manually
3. Creates a new Angebot with: page count, price per page, discount, work type, topic, deadline, Teillieferung date
4. Downloads the proposal PDF
5. Opens Outlook, pastes email template from Google Sheets, attaches PDF, sends to customer
6. Sends a second email with the Notion dashboard link from a different address
7. When customer accepts: creates invoice from proposal in Sevdesk
8. Generates a Stripe payment link, pastes it into the invoice email, sends
9. Manually checks payment logs
10. Updates invoice status to "paid" manually

---

## Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Check existing contact | `GET` | `/Contact?email=...` |
| Create new contact | `POST` | `/Contact` |
| Create proposal (Angebot) | `POST` | `/Order/Factory/saveOrder` |
| Get proposal PDF | `GET` | `/Order/:id/getPdf?download=true&preventSendBy=true` |
| Send proposal via email | `POST` | `/Order/:id/sendViaEmail` |
| Convert proposal → invoice | `POST` | `/Invoice/Factory/createInvoiceFromOrder` |
| Get invoice PDF | `GET` | `/Invoice/:id/getPdf?download=true&preventSendBy=true` |
| Send invoice via email | `POST` | `/Invoice/:id/sendViaEmail` |
| Update invoice status | `POST` | `/Invoice/:id/changeStatus` |

**Auth:** API token via `Authorization` header. Store as env var — never hardcode.

### Critical endpoint: `createInvoiceFromOrder`

This converts an accepted proposal into a legal invoice automatically — preserving all line items, customer data, pricing, and discounts. Without this endpoint the platform would have to recreate every line item from scratch, which is error-prone. This is the most important endpoint in the entire Sevdesk integration.

---

## Automation flow

```
Customer submits form
    ↓
GET /Contact?email=... → check if contact exists
    ↓
POST /Contact → create if not exists
    ↓
POST /Order/Factory/saveOrder → create proposal (pricing engine fills line items)
    ↓
POST /Order/:id/sendViaEmail → send proposal PDF to customer
    ↓
[Customer accepts in platform]
    ↓
POST /Invoice/Factory/createInvoiceFromOrder → convert proposal to invoice
    ↓
POST /Invoice/:id/sendViaEmail → send invoice with Stripe payment link
    ↓
[Payment confirmed — see payment_flow.md]
    ↓
POST /Invoice/:id/changeStatus → mark as paid (or cancelled if unpaid)
```

---

## Pricing engine

The proposal creation must use Berat's confirmed pricing formula. See [`business_rules.md`](../business_rules.md) for the full breakdown. Summary:

- **Formula:** `Gross Price = Pages × Price per Page × Deadline Factor`
- **Price per page:** 49€ Hausarbeit | 59€ Bachelorarbeit | 69€ Masterarbeit | 79€ Doktorarbeit
- **VAT:** 7% (educational services)
- **Deadline Factor:** 1 for all orders with deadline ≥ 72h; exact multiplier for < 72h not yet confirmed — see [`open_questions.md`](../open_questions.md)

The Angebot line items in Sevdesk must reflect this. The platform calculates the price and passes it to `saveOrder` — Sevdesk does not calculate pricing.

---

## German formatting constraints

- **Dates:** DD.MM.YYYY format
- **Currency:** EUR, comma as decimal separator (German locale)
- **VAT rate:** 7% for educational services; 19% for non-educational (rare)
- **TextTemplates:** Header and footer text on proposals/invoices are stored as Sevdesk TextTemplates — the platform must use Berat's existing templates, not overwrite them. Exact text still needed from Berat (see [`open_questions.md`](../open_questions.md))
- **sevUser field:** Every object created via API must have the `sevUser` field set to the platform's API user ID — missing this breaks Sevdesk's object ownership

---

## Invoice cancellation

If a customer does not pay, the invoice must be cancelled (storniert):
- Call `POST /Invoice/:id/changeStatus` with the cancelled status
- A non-payment timeout trigger is needed — exact timeout duration not yet confirmed by Berat (see [`open_questions.md`](../open_questions.md))

---

## Implementation phases

**Phase 1 — Read-only access**
Pull existing contacts, proposals, and invoices for display in the admin dashboard. No writes.

**Phase 2 — Proposal automation**
Platform creates proposals via API when admin generates an offer. Berat reviews and approves before sending.

**Phase 3 — Full invoice automation**
Platform handles the entire flow from proposal to paid invoice without manual intervention, except bank transfer payment confirmation.

---

## Error handling

Wrap every Sevdesk call in try-catch with retry logic. Sevdesk rate limits are lower than Pipedrive — exact limits to be confirmed during implementation. Failed calls must be logged and queued; the platform must not crash or block an order due to a transient Sevdesk error.
