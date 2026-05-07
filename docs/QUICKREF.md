# eFactory — RE Status Dashboard
> One-page scan for meeting prep. Last updated: May 4, 2026.
> Full detail → follow the links. This file is a map, not a source.

---

## Phase
**Requirements Engineering** — exploring all options. Nothing below is implementation-ready unless marked ✅ CONFIRMED.

---

## Confirmed Decisions (D-01 – D-14)

| ID | Decision | Impact |
|----|----------|--------|
| D-01 | Pipedrive stays as CRM — integrate via API | All customer/deal ops mirror to Pipedrive |
| D-02 | Sevdesk stays as invoicing system — integrate via API | All proposals and invoices go through Sevdesk |
| D-03 | Zapier replaced by platform before **July 31, 2026** | Hard deadline — highest priority integration |
| D-04 | No code until requirements confirmed + Figma signed off | Dev blocked until RE phase closes |
| D-05 | Team owns all naming — no AI-generated names | Every entity name needs explicit team agreement |
| D-06 | Stripe webhook is the authoritative payment trigger | Platform must expose webhook endpoint |
| D-07 | Bank transfer uses same handler as Stripe webhook | One `confirmPayment()` function, two entry points |
| D-08 | Berat stays in loop on GW selection in v1 | Admin dashboard needs GW candidate view |
| D-09 | Guest flow for WhatsApp customers | No account required before offer accepted |
| D-10 | Flamingo analytics is Phase 0 quick win | Standalone deliverable, independent of main build |
| D-11 | Unified chat is the canonical communication view | Every Layer-1 proxy feeds the same chat data model |
| D-12 | App built English-first with localization files | No hardcoded UI strings; all copy via i18n layer |
| D-13 | International market support is architectural | Currency-aware data model; pluggable tax engine; country-specific payment rails |
| D-14 | Whitelist / blacklist documentation pattern | Every considered option appears in docs, including rejected ones with reasons |
| D-15 | Cloudflare + Workers is the email routing infrastructure | Email Worker → HTTP fetch to backend; no separate inbound email provider needed |
| D-16 | No call recordings, no transcriptions (Berat confirmed) | Voice channel scope: metadata-only |

Full reasoning → [`decisions_log.md`](decisions_log.md)

---

## Active Explorations

| Area | Status | Options count | Full detail |
|------|--------|--------------|-------------|
| Communication system (3-layer model) | ✅ Layered architecture confirmed | — | [`explorations/communications/_overview.md`](explorations/communications/_overview.md) |
| └─ Email proxy (Layer 1) | ✅ Provider confirmed (Cloudflare D-15) | 3 options evaluated | [`explorations/communications/email.md`](explorations/communications/email.md) |
| └─ WhatsApp proxy (Layer 1) | 🔍 Exploring | 4 options (D added as fallback) | [`explorations/communications/whatsapp.md`](explorations/communications/whatsapp.md) |
| └─ Voice / IVR (Layer 1) | 🔍 Exploring | 4 providers · 2 bridge types · 3 auth options | [`explorations/communications/voice.md`](explorations/communications/voice.md) |
| └─ Unified chat (Layer 2) | ✅ Pattern confirmed (Kleinanzeigen-style) | — | [`explorations/communications/unified_chat.md`](explorations/communications/unified_chat.md) |
| └─ AI layer (Layer 3) | 🔍 Exploring | 6 features cataloged | [`explorations/communications/ai_layer.md`](explorations/communications/ai_layer.md) |
| AI BI dashboard (prompt → SQL → UI view) | 🔍 High-confidence direction (E-11) | 3 implementation options | [`explorations/ai_bi_dashboard.md`](explorations/ai_bi_dashboard.md) |
| Internationalization | ✅ Direction confirmed (D-12, D-13) | 3 architecture options | [`explorations/internationalization.md`](explorations/internationalization.md) |
| Payment methods (cash, multi-currency) | 🔍 Exploring | Cash recommended; multi-currency tied to i18n | [`explorations/payment_methods.md`](explorations/payment_methods.md) |
| Employee (service worker) access | 🔍 Exploring | Framework proposed, rules undefined | [`explorations/employee_access.md`](explorations/employee_access.md) |

---

## Blocking Questions — Cannot Build Without These

| Question | Blocks | Owner |
|----------|--------|-------|
| What determines the GW payment rate (30–60%)? | GW payment calculation — core pricing logic | Berat |
| Exact deadline pressure multiplier when < 72h? | Pricing engine for urgent orders | Berat |
| ~~Full columns of `#1 Bestellungen` sheet?~~ | ~~DB schema~~ | **✅ Closed May 2** — all 22 columns confirmed; see business_rules.md §9 |
| What is the MVP for day 1? | Cannot prioritize any features | Berat |
| Should proposals auto-send or wait for admin approval? | Entire offer flow | Berat |
| ~~Record calls or metadata-only?~~ | ~~Voice scope~~  | **Closed** — metadata-only (D-16) |
| Which countries / languages to support? | i18n architecture choice | Berat |
| Cash payments in v1? | Avoid shadow IT | Berat |

---

## Research In Progress

| Topic | Owner | Needed for |
|-------|-------|-----------|
| Voice API provider evaluation (Twilio vs SIPGATE vs Telnyx) | Yasser | Voice channel decision |
| WhatsApp virtual numbers per order — cost + feasibility | Yasser | WhatsApp channel decision |
| Per-country invoicing legal requirements | Berat + legal | i18n invoice engine |

---

## Open Questions by Count

| Domain | Count | File |
|--------|-------|------|
| Pricing & payment | 4 (1 blocking) | [`open_questions.md`](open_questions.md) §1 |
| Order data & schema | 6 (O-01/O-03/O-04 closed; O-07–O-10 new from xlsx analysis) | [`open_questions.md`](open_questions.md) §2 |
| Offer & admin flow | 5 (3 blocking) | [`open_questions.md`](open_questions.md) §3 |
| GW & operational | 4 | [`open_questions.md`](open_questions.md) §4 |
| Communication system | 20+ across 3 layers | [`open_questions.md`](open_questions.md) §5 |
| Internationalization | 4 (1 blocking) | [`open_questions.md`](open_questions.md) §6 |
| Payment methods | 5 (1 blocking) | [`open_questions.md`](open_questions.md) §7 |
| Employee access | 2 | [`open_questions.md`](open_questions.md) §8 |
| Internal team | 6 | [`open_questions.md`](open_questions.md) §9 |
| Pipedrive limits | 2 | [`open_questions.md`](open_questions.md) §10 |
| GW matchmaking | 4 | [`open_questions.md`](open_questions.md) §11 |
| GW portal & Notion sub-pages | 12 (N-01–N-12; N-04 blocking) | [`open_questions.md`](open_questions.md) §12 **NEW** |

---

## Key Files Quick Nav

| I need to... | Open this |
|-------------|-----------|
| Confirm a business fact | [`business_rules.md`](business_rules.md) |
| Understand GW workflow (SOPs, flowcharts, WP forms) | [`gw_workflow_sops.md`](gw_workflow_sops.md) ⭐ |
| See why a decision was made | [`decisions_log.md`](decisions_log.md) |
| See the draft database schema | [`db_schema_draft.md`](db_schema_draft.md) |
| Compare implementation options | [`explorations/`](explorations/_overview.md) |
| Understand the communication system | [`explorations/communications/_overview.md`](explorations/communications/_overview.md) |
| Find an unanswered question | [`open_questions.md`](open_questions.md) |
| Understand the full order lifecycle | [`INDEX.md`](INDEX.md) |
| Check team / process conventions | [`team_conventions.md`](team_conventions.md) |
| Check raw spreadsheet analysis | [`source/sheets_analysis.md`](source/sheets_analysis.md) |
