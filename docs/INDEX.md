# eFactory Platform — Documentation Index
> Last updated: May 4, 2026
> Status: **Requirements Engineering phase** — exploring options, not deciding. Nothing is implementation-ready unless explicitly confirmed.
> Critical deadline: **Zapier deprecates July 31, 2026** (D-03)

---

## Start Here

**For meeting prep or a quick status check → [`QUICKREF.md`](QUICKREF.md)**

| I want to... | Go to |
|-------------|-------|
| See all confirmed business facts | [`business_rules.md`](business_rules.md) |
| Understand how GWs actually work (SOPs + flowcharts) | [`gw_workflow_sops.md`](gw_workflow_sops.md) ⭐ |
| See which WP forms map to which workflow step | [`gw_workflow_sops.md` — WP Forms section](gw_workflow_sops.md#wordpress-forms-connected-to-each-sop) |
| See why a decision was made | [`decisions_log.md`](decisions_log.md) |
| Compare implementation options | [`explorations/_overview.md`](explorations/_overview.md) |
| Understand the communication system | [`explorations/communications/_overview.md`](explorations/communications/_overview.md) |
| Find an unanswered question | [`open_questions.md`](open_questions.md) |
| Read a specific integration spec | [`integrations/`](#integrations-confirmed) |
| Check team / process conventions | [`team_conventions.md`](team_conventions.md) |
| Trace back to raw data from Berat | [`source/`](#sources-raw-traceability) |

---

## What is this project?

**eFactory One** is a German ghostwriting marketplace (DACH region) owned by Berat Özdemir. CalibtOS is building a platform to replace his 100% manual workflow.

Three user roles: **Customer** (student) · **Admin** (Berat) · **GW** (ghostwriter)
Possible future role: **Service Worker** (employee) — see [`explorations/employee_access.md`](explorations/employee_access.md)

---

## Folder Structure

```
docs/
├── INDEX.md                          ← you are here
├── QUICKREF.md                       ← one-page status dashboard (start here for meetings)
├── business_rules.md                 ← confirmed facts (pricing, delivery, GW rules, invoicing, portal)
├── gw_workflow_sops.md               ← ⭐ GW Ablauf SOPs: 6 SOPs translated + flowcharted + WP form connections
├── decisions_log.md                  ← confirmed decisions (D-01–D-16) + exploration index (E-01–E-11)
├── open_questions.md                 ← all open questions, organized by domain
├── db_schema_draft.md                ← draft database schema (MVP-oriented, RE phase)
├── team_conventions.md               ← how we work (whitelist/blacklist pattern, naming, etc.)
│
├── integrations/                     ← confirmed integrations only
│   ├── pipedrive.md
│   ├── sevdesk.md
│   ├── payment_flow.md
│   └── communications.md            ← MOVED → see explorations/communications/
│
├── explorations/                     ← RE-phase thinking space (not decisions)
│   ├── _overview.md                  ← all active exploration areas + status
│   ├── communications/
│   │   ├── _overview.md              ← 3-layer architecture (proxy / chat / AI)
│   │   ├── email.md                  ← Layer 1: email proxy options
│   │   ├── whatsapp.md               ← Layer 1: WhatsApp proxy options
│   │   ├── voice.md                  ← Layer 1: voice/IVR options
│   │   ├── unified_chat.md           ← Layer 2: Kleinanzeigen-style chat
│   │   └── ai_layer.md               ← Layer 3: sentiment, miscommunication, HIL
│   ├── employee_access.md            ← service worker role hypotheses
│   ├── internationalization.md       ← i18n / multi-language / multi-country
│   └── payment_methods.md            ← cash, multi-currency, gateway choices
│
└── source/                           ← raw traceability (do not use as primary reference)
    ├── clickup_answers.md
    ├── sheets_analysis.md
    ├── notion_gw_dashboard.md        ← Notion GW dashboard verbatim extraction (May 4, 2026)
    └── wordpress_forms.md            ← All 17 CF7 forms + page mapping + SQL queries
```

---

## All Documents

### Core

| File | Purpose | Updated |
|------|---------|---------|
| [`QUICKREF.md`](QUICKREF.md) | One-page RE status dashboard — confirmed decisions, active explorations, blocking questions, research owners | Apr 29 |
| [`business_rules.md`](business_rules.md) | Confirmed facts — pricing, GW split, delivery, assignment, GW collaboration rules (§11), GW portal (§12), invoicing, email templates | May 4 |
| [`gw_workflow_sops.md`](gw_workflow_sops.md) | ⭐ All 6 GW Ablauf SOPs: full translations, flowcharts, platform implications, WP form connections, order status machine, AGB summary | May 5 |
| [`decisions_log.md`](decisions_log.md) | Confirmed decisions (D-01–D-16) + RE-phase exploration index (E-01–E-11) | May 2 |
| [`open_questions.md`](open_questions.md) | All open questions organized by domain (12 sections — §12 new: Notion sub-pages + GW portal) | May 4 |
| [`team_conventions.md`](team_conventions.md) | Working agreements — whitelist/blacklist documentation, meeting naming, RE-phase principle | Apr 29 |

### Integrations (confirmed)

| File | Purpose | Updated |
|------|---------|---------|
| [`integrations/pipedrive.md`](integrations/pipedrive.md) | Pipedrive API endpoints, stage mapping, automation flow, implementation phases | Apr 28 |
| [`integrations/sevdesk.md`](integrations/sevdesk.md) | Sevdesk API endpoints, proposal/invoice flow, pricing engine, German constraints | Apr 28 |
| [`integrations/payment_flow.md`](integrations/payment_flow.md) | Stripe webhook path, bank transfer path, installments, full order lifecycle | Apr 28 |

### Explorations (RE phase — not decisions)

| File | Purpose | Updated |
|------|---------|---------|
| [`explorations/_overview.md`](explorations/_overview.md) | All active exploration areas, status, and links | Apr 29 |
| [`explorations/communications/_overview.md`](explorations/communications/_overview.md) | 3-layer architecture (proxy → unified chat → AI) | Apr 29 |
| [`explorations/communications/email.md`](explorations/communications/email.md) | Layer 1: email proxy — catch-all vs forwarding vs per-mailbox | Apr 29 |
| [`explorations/communications/whatsapp.md`](explorations/communications/whatsapp.md) | Layer 1: WhatsApp proxy — groups vs virtual numbers vs direct DM | Apr 29 |
| [`explorations/communications/voice.md`](explorations/communications/voice.md) | Layer 1: Voice/IVR — 4 providers · 2 bridge modes · 3 auth · metadata vs recording | Apr 29 |
| [`explorations/communications/unified_chat.md`](explorations/communications/unified_chat.md) | Layer 2: Kleinanzeigen-style chat presentation pattern | Apr 29 |
| [`explorations/communications/ai_layer.md`](explorations/communications/ai_layer.md) | Layer 3: sentiment, miscommunication, suggested replies, human-in-the-loop | Apr 29 |
| [`explorations/employee_access.md`](explorations/employee_access.md) | Service worker role: access control, action validation tiers, moderation | Apr 29 |
| [`explorations/internationalization.md`](explorations/internationalization.md) | i18n / multi-language / multi-currency / multi-country architecture | Apr 29 |
| [`explorations/payment_methods.md`](explorations/payment_methods.md) | Cash payments, multi-currency, country-specific rails | Apr 29 |
| [`explorations/ai_bi_dashboard.md`](explorations/ai_bi_dashboard.md) | AI-powered BI dashboard (prompt → SQL → UI view) — high-confidence direction | May 2 |

### Sources (raw traceability)

| File | Purpose | Updated |
|------|---------|---------|
| [`source/sheets_analysis.md`](source/sheets_analysis.md) | Full analysis of all 4 sheets in the xlsx — column maps, formulas, data patterns, all confirmed values | May 2 |
| [`source/clickup_answers.md`](source/clickup_answers.md) | Berat's raw ClickUp answers — 16 questions closed Apr 27–28 | Apr 28 |
| [`source/notion_gw_dashboard.md`](source/notion_gw_dashboard.md) | Verbatim extraction of Notion GW dashboard — guidelines, job board, templates, quick actions | May 4 |
| [`source/wordpress_forms.md`](source/wordpress_forms.md) | All 17 CF7 forms, 31 pages, page→form mapping, SQL queries — confirmed from Raidboxes DB | May 4 |

---

## Team

| Name | Role |
|------|------|
| Ferhat Çatak | Tech Lead / CalibtOS founder |
| Mohamed Yasser | Backend / Integration |
| Ismail Nagaty | Backend / Architecture |
| Omar Abouregaila | Research / Requirements |
| Mahmoud Mamdouh Gabal | UI/UX Designer |
| Marwan Shakib | Full-stack / Automation (WhatsApp bot prototype) |
| Yusuf | Full-stack / Automation (WhatsApp web prototype) |
| Berat Özdemir | Client / Business Owner |

---

## Full Order Lifecycle

```
1. Customer submits form
   → Platform DB: create order (platform_order_id)
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

4a. Payment via Stripe
   → Stripe webhook: payment_intent.succeeded
   → confirmPayment(platform_order_id) [internal handler]
   → (parallel) Sevdesk: mark paid | Pipedrive: Won | Platform: start GW assignment

4b. Payment via bank transfer
   → Admin: "Mark as Paid" button
   → confirmPayment(platform_order_id) [same internal handler]
   → (parallel) Sevdesk: mark paid | Pipedrive: Won | Platform: start GW assignment

5. GW assigned
   → Admin selects GW (or self-assigns — job not posted to board)
   → Platform: send two simultaneous emails (GW briefing + customer intro)
   → [Future] Platform: create WhatsApp groups + assign proxy email addresses
   → Platform: order status → in progress

6. Delivery
   → GW uploads Teillieferung (platform checks against auto-calculated date)
   → GW uploads final work + invoice
   → Customer accepts
   → Berat pays GW
```

---

## External Tools & Resources

| Resource | Link / Location |
|----------|----------------|
| ClickUp board | https://app.clickup.com/9012383676/v/l/5-90129748640-1 |
| Postman collection | `eFactory` workspace — Pipedrive + Sevdesk folders |
| Figma wireframes | Ask Mahmoud for link |
| WhatsApp bot prototype | `wa.calibtos.com` (Marwan/Yusuf — ATC SSH server) |
| Sheet screenshots | [`assets/excel-sheets-imgs/`](../assets/excel-sheets-imgs/) |
