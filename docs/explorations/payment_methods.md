# Payment Methods — Beyond Stripe + Bank Transfer
> Status: **Exploring** — discussed Apr 29 meeting. Cash support and multi-currency on the table.
> Confirmed integrations (Stripe + bank transfer) are documented in [`../integrations/payment_flow.md`](../integrations/payment_flow.md).
> Last updated: April 29, 2026

---

## Why This Exploration Exists

[`integrations/payment_flow.md`](../integrations/payment_flow.md) covers the two confirmed payment paths: Stripe (card / Klarna / PayPal) and German SEPA bank transfer. This exploration covers the additional payment methods that came up in the Apr 29 meeting and need a decision before v1.

**The meeting raised three concerns:**
1. **Cash payments** — some customers prefer cash, especially locally in Cologne. If the platform doesn't support it, Berat will create workarounds outside the platform → "shadow IT"
2. **Multi-currency support** — once we go international, EUR alone is insufficient
3. **Country-specific payment habits** — different countries have different default rails (e.g. iDEAL in NL, Bancontact in BE)

---

## Concern 1 — Cash Payments

### The Risk Ferhat Flagged

> "If our system is not able to catch all cases, what will Berat... go back to his old system. He will create shadow IT."

If the platform refuses to acknowledge cash, Berat will track cash orders outside the platform → split source of truth → all the analytics and AI features lose accuracy.

### Option A — Cash as a First-Class Payment Method

Add `cash` to the payment method enum. Customer can mark "I will pay in cash on delivery" at order time. Berat (or an employee) confirms cash received via a "Mark as Paid (Cash)" button in admin.

**Pros:**
- Captures all transactions, no shadow IT
- Same handler pattern as bank transfer (admin button → `confirmPayment()`)
- Matches Berat's actual workflow

**Cons:**
- Cash is harder to audit; weakens automated fraud detection
- Tax reporting needs separate handling (German law treats cash receipts differently)

### Option B — Cash Out of Scope, Document the Decision

Reject cash explicitly in the docs. Push back on Berat: cash creates audit risk, all customers must use Stripe or SEPA.

**Pros:**
- Cleaner system, simpler tax reporting
- Forces customers onto traceable rails

**Cons:**
- Berat will keep doing cash orders manually → exact problem Ferhat warned about
- Lost data: every cash order missing from the platform

### Comparison

| Criterion | Option A — Support cash | Option B — Reject cash |
|-----------|------------------------|----------------------|
| Captures all of Berat's reality | ✅ | ❌ |
| Audit / tax simplicity | Lower | ✅ Higher |
| Risk of shadow IT | Low | High |
| Engineering effort | Small (similar to bank transfer) | None |
| **Recommended** | ✅ | — |

---

## Concern 2 — Multi-Currency

### The Two Patterns Ferhat Described

#### Pattern A — Single Account + Payment Gateway Converts

```
Customer (any country) pays via Stripe in their currency
         ↓
Stripe converts to EUR (with FX spread)
         ↓
Single DE IBAN receives EUR
```

**Pros:** Simple ops; one account; familiar pattern (most German online businesses do this).
**Cons:** FX spread eats margin (~1–2% per transaction); customers in other countries may be charged FX fees by their bank.

#### Pattern B — Multiple Bank Accounts Per Country

```
DE customer → DE IBAN
NL customer → NL IBAN
AT customer → AT IBAN
```

**Pros:** No FX cost; better UX in each country; matches local expectations.
**Cons:** Ops overhead (open and reconcile N accounts); legal entity may be required in each country to open a local account.

#### Pattern C — Hybrid (Likely Path)

Default to Pattern A (gateway). For countries with high enough volume to justify it, open a local account and route those customers to it.

---

## Concern 3 — Country-Specific Payment Rails

For non-DE markets, default rails differ:

| Country | Common rails |
|---------|-------------|
| Germany | SEPA, Klarna, Stripe |
| Netherlands | iDEAL (90%+ of online payments) |
| Austria | EPS, SEPA, Stripe |
| Switzerland | TWINT, Postfinance, Stripe |
| Belgium | Bancontact |

**Stripe supports all of these** — enabling them is a Stripe dashboard configuration, not new code. If the platform integrates Stripe Checkout (vs raw PaymentIntents), all rails appear automatically.

→ This connects back to Stripe integration scope. See [`../integrations/payment_flow.md`](../integrations/payment_flow.md).

---

## Open Questions

| # | Question | Owner |
|---|----------|-------|
| PM-01 | Cash support: in scope for v1? | 👤 Berat |
| PM-02 | If cash supported: how is it registered? Customer says "I'll pay cash" or Berat marks it after the fact? | 👤 Berat |
| PM-03 | Initial target markets beyond DE — which? Determines which rails to enable in Stripe | 👤 Berat |
| PM-04 | Single-account-via-gateway vs multi-account: which Pattern (A/B/C)? | Berat after market list |
| PM-05 | Stripe Checkout (auto-enables all rails) vs PaymentIntents (manual)? | 🔧 Team |

→ Tracked in [`../open_questions.md`](../open_questions.md)

---

## Decision Path

```
Berat answers PM-01 (cash) + PM-03 (markets)
        ↓
Cash decision → graduate to integrations/payment_flow.md or stays rejected
Markets list → drives Pattern A/B/C choice (PM-04)
        ↓
Stripe Checkout vs PaymentIntents (PM-05) → team-internal
        ↓
Updated payment_flow.md absorbs the new methods
        ↓
This file archived or reduced to a pointer
```
