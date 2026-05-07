# eFactory — Decisions Log
> Last updated: May 2, 2026
> Confirmed decisions (D-01 to D-10): agreed before RE phase formalization — treat as final.
> Architecture explorations (E-01 onwards): captured during Requirements Engineering phase — **not decisions**. Represent directions under discussion. Only graduate to a decision when explicitly confirmed.
> When a confirmed decision is revisited, add a new entry rather than modifying the old one.
> Related: [`open_questions.md`](open_questions.md) for unresolved items.

---

## Confirmed Decisions

These were explicitly agreed upon by Ferhat and/or Berat and are treated as binding.

---

### D-01 — Pipedrive stays as CRM
**Date:** April 2026 (Meeting 4)
**Decision:** Pipedrive remains the single source of truth for customer contacts and deal pipeline. The platform integrates via API; it does not replace Pipedrive.
**Why:** 7,700+ contacts and 3,400+ deals with years of history. The entire automated email campaign system runs through Pipedrive. Replacing it means losing all of that.
**Consequence:** All customer-facing operations (contact creation, deal movement, marketing status) must be mirrored to Pipedrive via API calls.

---

### D-02 — Sevdesk stays as accounting/invoicing system
**Date:** April 2026 (Meeting 2)
**Decision:** Sevdesk remains the invoicing and accounting system. The platform generates proposals and invoices through the Sevdesk API.
**Why:** Legally required for German tax accounting. Berat's accountant uses it. Cannot replace without legal risk.
**Consequence:** All invoicing flows (proposal creation, invoice generation, status updates) go through Sevdesk — the platform never manages money directly.

---

### D-03 — Zapier must be replaced before July 31, 2026
**Date:** April 2026
**Decision:** The platform must take over Zapier's role (form → Pipedrive + Google Sheets) before the deprecation deadline.
**Why:** Zapier's Pipedrive integration deprecates July 31, 2026. If not replaced, the customer intake automation breaks entirely on that date.
**Consequence:** Phase 3 of the Pipedrive integration (Replace Zapier) is on a hard deadline. See [`integrations/pipedrive.md`](integrations/pipedrive.md).

---

### D-04 — No code until requirements are fully confirmed
**Date:** April 2026 (Meeting 7, Ferhat)
**Decision:** No backend or frontend code until: all Google Sheets columns known, pricing formula confirmed, payment flow confirmed, database schema finalized, Berat signed off on Figma screens.
**Why:** Ferhat's explicit instruction after observing premature implementation and AI-generated naming in previous work. Building on unconfirmed requirements wastes time and creates rework.
**Consequence:** Development is in holding pattern. Use this time to close open questions in [`open_questions.md`](open_questions.md).

---

### D-05 — Team owns all naming decisions
**Date:** April 2026 (Meeting 7, Ferhat)
**Decision:** Entity names, ID field names, route names, and column names must be agreed on by the team explicitly. No AI-generated names without team sign-off.
**Why:** Ferhat's frustration with auto-generated naming conventions that don't match the team's mental model or the German business context.
**Consequence:** See [`open_questions.md`](open_questions.md) — entity ID naming is listed as an internal open question.

---

### D-06 — Stripe webhook is the authoritative payment trigger
**Date:** April 2026
**Decision:** `payment_intent.succeeded` webhook from Stripe is the single trigger for marking an order as paid. Sevdesk's `/getIsPartiallyPaid` endpoint is not polled.
**Why:** Sevdesk has no native payment processing. It never self-updates when Stripe receives money — polling it returns stale data. Stripe is the actual payment processor and the only reliable source of truth.
**Consequence:** The platform must expose a webhook endpoint for Stripe. Stripe `PaymentIntent` / `Checkout Session` must embed `sevdesk_invoice_id`, `pipedrive_deal_id`, and `platform_order_id` in metadata. See [`integrations/payment_flow.md`](integrations/payment_flow.md).

---

### D-07 — Bank transfer uses the same handler as Stripe webhook
**Date:** April 2026
**Decision:** The admin "Mark as Paid" button (for bank transfer customers) calls the same internal service function as the Stripe webhook handler. No divergent payment logic.
**Why:** A significant portion of German B2B customers pay via SEPA bank transfer rather than Stripe. The platform must handle this without duplicating business logic.
**Consequence:** One internal `confirmPayment(orderId)` function. Two entry points: Stripe webhook and admin button. Both produce identical downstream effects.

---

### D-08 — Berat stays in the loop on GW selection in v1
**Date:** April 2026 (Meeting discussions)
**Decision:** The platform does not automate GW selection in v1. It surfaces candidates based on expertise and workload; Berat makes the final assignment decision.
**Why:** GW expertise matching is currently in Berat's head. Encoding it correctly takes time and domain knowledge we don't fully have yet. Automating a bad matchmaking algorithm is worse than keeping Berat in the loop.
**Consequence:** The admin dashboard needs a GW selection view with expertise tags and active order count. The "automated matchmaking" feature is backlogged for a later phase.

---

### D-09 — Guest flow for WhatsApp customers
**Date:** April 2026
**Decision:** Customers who arrive via WhatsApp (not the form) get a platform link without needing to create an account upfront. An account is created only after the offer is accepted and payment is made.
**Why:** WhatsApp is a significant customer acquisition channel. Requiring account creation before an offer is sent creates unnecessary friction for customers who initiated contact off-platform.
**Consequence:** The platform must support a guest/anonymous flow for the offer step. Account creation is deferred until payment confirmation.

---

### D-10 — Flamingo analytics is a quick win for Phase 0
**Date:** April 2026 (Meeting 6)
**Decision:** Before the main platform is built, extract and visualize Berat's own Flamingo (WordPress plugin) form submission data as a standalone analytics view.
**Why:** Flamingo has intercepted every form submission with metadata (IP, browser, timestamp, form type) since the website launched. Berat has never seen this data visualized. It provides immediate value with minimal engineering effort.
**Consequence:** Flamingo analytics is a Phase 0 deliverable — independent of the main platform build.

---

### D-11 — Unified chat is the canonical communication view
**Date:** April 29, 2026 (Apr 29 RE meeting)
**Decision:** Every communication exchange — regardless of external medium (email, WhatsApp, voice metadata, web chat) — surfaces as a single chronological chat history per order inside the platform. The Kleinanzeigen marketplace pattern is the reference implementation: external channels keep working for the user, the platform is the single source of truth.
**Why:** Berat needs one place to scan an order's full communication. Forcing him into separate inboxes per medium recreates the manual fragmentation the platform is supposed to eliminate. Reference: Kleinanzeigen Open Marketplace (formerly eBay Kleinanzeigen) has used this pattern successfully for years.
**Consequence:** Every Layer-1 proxy (email, WhatsApp, voice) must feed the unified chat data model. See [`explorations/communications/unified_chat.md`](explorations/communications/unified_chat.md).

---

### D-12 — App built English-first with localization files
**Date:** April 29, 2026 (Apr 29 RE meeting)
**Decision:** The platform is developed in English by default. All user-facing strings live in localization resource files. Translations layer on top — never hardcoded German.
**Why:** Internationalization is a first-class concern (Ferhat). Retrofitting i18n later costs significantly more than designing for it. The same pattern is already used at ATC.
**Consequence:** No hardcoded UI strings anywhere. All copy goes through the i18n layer. See [`explorations/internationalization.md`](explorations/internationalization.md).

---

### D-13 — International market support is architectural, not optional
**Date:** April 29, 2026 (Apr 29 RE meeting)
**Decision:** The platform's architecture must accommodate multiple currencies, country-specific business rules (VAT, invoicing, payment habits), and country-variant UI from day 1.
**Why:** Ferhat: long-term partnership; eFactory may target multiple markets. If we paint ourselves into a DE-only corner, the rework to escape is expensive.
**Consequence:** Currency-aware data model; tax engine must be country-pluggable; payment integration must support country-specific rails. Architecture choice (single-tenant locale-aware vs multi-tenant vs UI variants) deferred until Berat names target markets. See [`explorations/internationalization.md`](explorations/internationalization.md).

---

### D-14 — Whitelist / blacklist documentation pattern
**Date:** April 29, 2026 (Apr 29 RE meeting, restated multiple times)
**Decision:** Every option considered must appear in the docs — including rejected ones, with the reason for rejection. We never silently drop an option.
**Why:** Ferhat: *"It's not about saying 'everything else is not what we want to do' — it's saying 'this could be everything else, and we're actively deciding against this part because of that and that.'"* This prevents re-debating the same options every few months and gives Berat a complete view of considered-and-rejected paths.
**Consequence:** Standing convention recorded in [`team_conventions.md`](team_conventions.md) (TC-01). Already applied across all `explorations/*.md` files.

---

### D-15 — Cloudflare + Workers is the email routing infrastructure
**Date:** May 1, 2026 (meeting — Ferhat demonstrated live)
**Decision:** Cloudflare handles all inbound email catch-all routing. Cloudflare Email Workers (serverless functions) intercept arriving emails and make an HTTP request to the platform backend. No separate email provider (Mailgun, Resend, Postmark, SES) is needed for inbound routing.
**Why:** Ferhat already had this running on kalibna.xyz — a live "redirect emails to team" worker with 322 requests was shown in the meeting. Reusing the same proven infrastructure eliminates a vendor and removes setup work. Cloudflare Workers natively trigger on email receipt, making this a clean fit without extra glue.
**Consequence:** C-03 (which inbound email provider?) and C-04 (MX conflicts?) are closed. Architecture: email arrives at catch-all domain → Cloudflare Email Worker → HTTP fetch() to backend → backend handles all logic (validate, store, forward outbound). Backend is responsible for outbound sending (provider TBD separately). See [`explorations/communications/email.md`](explorations/communications/email.md).

---

### D-16 — No call recordings, no transcriptions
**Date:** May 1, 2026 (Ferhat confirmed Berat's position in meeting)
**Decision:** The voice channel will not record calls and will not produce transcriptions. Capture is metadata-only.
**Why:** Berat explicitly said no to both recording and transcription when Ferhat raised it. The German market concern (customers dropping off when informed of recording) was part of the reasoning. Ferhat: "It might very likely that we're not be using even transcriptions."
**Consequence:** C-10 (record calls or metadata-only?) and C-11 (transcription?) are closed. Voice channel scope: call metadata only — caller identity, recipient, IVR navigation path, duration, exit point. Transient sentiment analysis without any audio storage remains an open idea floated by Ferhat — not confirmed by Berat. See [`explorations/communications/voice.md`](explorations/communications/voice.md).

---

## Architecture Explorations — Requirements Engineering Phase

These entries track what is actively being explored during the RE phase. They are **not decisions**. Full detail, option comparisons, and trade-offs live in [`explorations/`](explorations/_overview.md).

| ID | Exploration | Status | Detail |
|----|-------------|--------|--------|
| E-01 | Man-in-the-middle communication principle | Direction confirmed by Ferhat — implementation open | [`explorations/_overview.md`](explorations/_overview.md) |
| E-02 | WhatsApp proxy: group-per-order vs virtual numbers | Two options under evaluation — Yasser researching B | [`explorations/communications/whatsapp.md`](explorations/communications/whatsapp.md) |
| E-03 | Email proxy: catch-all inbound webhook | ✅ Provider confirmed: Cloudflare + Workers (D-15) — implementation design documented | [`explorations/communications/email.md`](explorations/communications/email.md) |
| E-04 | Voice / IVR: provider + conference bridge | Exploring 4 providers, 2 bridge modes — Yasser researching | [`explorations/communications/voice.md`](explorations/communications/voice.md) |
| E-05 | Caller authentication: phone number + OTP fallback | Leading hypothesis — voice recognition rejected | [`explorations/communications/voice.md`](explorations/communications/voice.md) |
| E-06 | Service worker role: least privilege + action tiers | Framework direction set — rules undefined, Berat input needed | [`explorations/employee_access.md`](explorations/employee_access.md) |
| E-07 | AI layer on communication stream (sentiment, miscommunication, suggested replies, HIL) | 6 features cataloged — v1 scope to be confirmed by Berat | [`explorations/communications/ai_layer.md`](explorations/communications/ai_layer.md) |
| E-08 | Call recording vs metadata-only — German market constraint | Metadata logging confirmed; full recording is a Berat business judgement | [`explorations/communications/voice.md`](explorations/communications/voice.md) |
| E-09 | Internationalization architecture (single-tenant locale-aware vs multi-tenant vs UI variants) | Direction confirmed (D-12, D-13); architecture choice depends on Berat's target markets | [`explorations/internationalization.md`](explorations/internationalization.md) |
| E-10 | Payment methods beyond Stripe + bank transfer (cash, multi-currency, country-specific rails) | Cash support recommended to avoid shadow IT; multi-currency tied to E-09 | [`explorations/payment_methods.md`](explorations/payment_methods.md) |
| E-11 | AI-powered BI dashboard (prompt → auto SQL query → auto UI view) | High-confidence direction — Ferhat described in detail May 2; implementation specifics open | [`explorations/ai_bi_dashboard.md`](explorations/ai_bi_dashboard.md) |
