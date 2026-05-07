# eFactory — Open Questions
> Last updated: May 4, 2026
> Organized by domain — grab the section relevant to your meeting or research task.
> Answered questions → moved to [`business_rules.md`](business_rules.md).
> Full context on explored options → [`explorations/`](explorations/_overview.md).
> ClickUp board: https://app.clickup.com/9012383676/v/l/5-90129748640-1

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 | Blocking — cannot build this part without an answer |
| 🟡 | High priority — needed before v1 feature freeze |
| 🟢 | Needed but not yet blocking |
| 👤 | Answer needed from Berat |
| 🔧 | Answer needed from team / research |

---

## 1. Pricing & Payment

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| P-01 | What determines the GW payment rate (30–60%)? Per-GW contract? Per-order negotiation? Work type? | 🔴 | 👤 Berat | GW payment calculation — every order |
| P-02 | Exact deadline pressure multiplier when deadline < 72h? | 🔴 | 👤 Berat | Pricing engine for urgent orders |
| P-03 | Customer non-payment timeout — how long before invoice is cancelled? | 🟡 | 👤 Berat | `changeStatus: cancelled` trigger in Sevdesk |
| P-04 | Is "Bachelorarbeit Coaching" priced or split differently than standard ghostwriting? | 🟡 | 👤 Berat | Coaching order pricing path |

---

## 2. Order Data & Schema

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| ~~O-01~~ | ~~Share ALL columns of `#1 Bestellungen`~~ | — | — | **✅ Closed May 2** — all 22 columns confirmed from anonymized copy. Full schema in [`business_rules.md`](business_rules.md) §9 |
| O-02 | Does column K always equal final agreed price, or can it change post-negotiation? | 🟡 | 👤 Berat | Payment model relies on K being the invoiced amount |
| ~~O-03~~ | ~~Is there a GW assignment column in the Google Sheets?~~ | — | — | **✅ Closed May 2** — confirmed: column R "Zuteilung" (dropdown) is the GW assignment status |
| ~~O-04~~ | ~~What does the "LQ" column mean?~~ | — | — | **✅ Closed May 2** — LQ = Lead Quelle (Lead Source). Values: ef1, av, ac, ws1, sp1, b1, ig, ebay |
| O-04b | What do the LQ values "av", "ac", "sp1", "b1" stand for? | 🟢 | 👤 Berat | Only ef1 (website) and ig (Instagram) are obvious; others need clarification |
| O-05 | What are "non-standard jobs" (rows with no work type, no date, just a price)? | 🟡 | 👤 Berat | Need to model these in DB or handle as exceptions |
| O-06 | What triggers green row color and exactly what happens when an order is "Done"? | 🟢 | 🔧 Abdurrahman | Confirmed: Status = "Done" drives row color. Exact conditional formatting rule — Abdurrahman to review |
| O-07 | Work type normalization: what are the canonical ~15 types to normalize ~200 variants to? | 🟡 | 👤 Berat + 🔧 Team | DB schema needs a controlled enum for work_type; cannot finalize migration without this |
| O-08 | What does "Gutgeschrieben" mean vs "Ausgezahlt" in GW payment status? Different accounting treatment? | 🟢 | 👤 Berat | DB enum needs accurate semantics |
| O-09 | What do LQ values "av", "ac", "sp1", "b1" stand for (marketing channels)? | 🟢 | 👤 Berat | Needed for analytics/reporting on customer acquisition channels |
| O-10 | Paper title and field of study exist only in `#3 Zuweisungen` — are they also tracked elsewhere? Or can they be null in the DB for old Berat-only orders? | 🟡 | 👤 Berat | Data model: orders table needs title/field_of_study; migration source is #3 |

---

## 3. Offer & Admin Flow

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| A-01 | What is the minimum viable product for day 1? | 🔴 | 👤 Berat | Cannot prioritize any features without this |
| A-02 | Should proposals auto-send to customer or wait for admin approval first? | 🔴 | 👤 Berat | Entire offer flow in admin dashboard |
| A-03 | What email address should outgoing proposals come from? (`efactory1@efactory1.de` vs `kundenservice@efactory1.de`) | 🔴 | 👤 Berat | Sevdesk `sendViaEmail` requires sender address |
| A-04 | Should customer receive one email or two on offer? (proposal PDF + Notion dashboard link as separate emails?) | 🟡 | 👤 Berat | Email flow design |
| A-05 | What is the standard header/footer text (Textvorlagen) in Sevdesk proposals/invoices? | 🟢 | 👤 Berat | Platform must preserve Berat's existing German boilerplate |

---

## 4. GW & Operational Rules

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| G-01 | When a GW is removed or leaves, what happens to their open orders? | 🟡 | 👤 Berat | Platform needs an order reassignment flow |
| G-02 | Can customers self-register on the platform, or only after being invited following an order? | 🟡 | 👤 Berat | Onboarding and authentication flow |
| G-03 | Record Loom videos of all manual flows | 🟢 | 👤 Berat | Edge case discovery — things not captured in meetings |
| G-04 | GDPR: is there explicit email opt-in before setting "Abonniert" in Pipedrive? | 🟢 | 👤 Berat | Legal requirement |

---

## 5. Communication System (Explorations)

Questions that must be answered before the communication channel explorations can be decided.
Full option context → [`explorations/communications/_overview.md`](explorations/communications/_overview.md)

### Layer 1 — Proxy mechanics

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| C-01 | WhatsApp virtual numbers per order — feasible? What's the cost per number/month? Can numbers be reused? | 🟡 | 🔧 Yasser | WhatsApp Option B evaluation |
| C-02 | Which voice API provider? Evaluate: German number availability, GDPR compliance, cost | 🟡 | 🔧 Yasser | Voice channel provider decision |
| C-09 | If WhatsApp groups get blocked at scale, fall back to direct-DM bot (Option D)? | 🟢 | 🔧 Yasser | WhatsApp resilience |
| C-21 | Cloudflare email routing cost at Berat's email volume (913 received shown in meeting) — free tier sufficient? | 🟡 | 🔧 Team | Budget / provider confirmation |
| C-22 | Use `efactory1.de` for proxy addresses or a separate dedicated domain? | 🟡 | 🔧 Ferhat | Email proxy domain setup |

### Layer 1.5 — Voice recording (special: business judgement)

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| C-05 | Call recording: GDPR retention period, storage location, who can access? | ~~🟡~~ | ~~👤 Berat + legal~~ | ~~Voice channel compliance~~ → **Closed** — recording out of scope (D-16) |
| C-10 | ~~Record calls or metadata-only?~~ | — | — | **Closed** — Berat confirmed metadata-only (D-16) |
| C-11 | ~~If recording: do we transcribe?~~ | — | — | **Closed** — Berat confirmed no transcription (D-16) |

### Layer 2 — Unified chat presentation

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| C-12 | Per-order email reply address convention — `order-{id}@efactory1.de`? | 🟡 | 🔧 Team | Unified chat email integration |
| C-13 | Email reply parsing — how do we strip quoted history to extract just the new content? | 🟡 | 🔧 Team | Unified chat email integration |
| C-14 | Where do email attachments live? (S3 / object storage / inline?) | 🟡 | 🔧 Team | Unified chat data model |
| C-15 | Do we surface system events (e.g. "GW assigned at 14:32") inline in chat or in a separate panel? | 🟢 | 👤 Berat | Chat UX |
| C-16 | Chat view: chronological-mixed or grouped-by-medium? | 🟢 | 👤 Berat | Chat UX |

### Layer 3 — AI layer

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| C-17 | What rules trigger HIL (human-in-the-loop) alerts vs auto-action? | 🟡 | 👤 Berat + 🔧 Team | AI feature design |
| C-18 | Where's the boundary between rule-based pattern detection vs LLM-based? | 🟡 | 🔧 Team | AI architecture (one-big vs many-small) |
| C-19 | Per-feature AI cost ceiling — €X/month/order before throttling? | 🟢 | 👤 Berat | AI budget |
| C-20 | Master prompt for miscommunication detection — who writes / owns it? | 🟢 | 🔧 Team | AI Feature B |
| C-06 | Does Berat want a silent monitoring ("listen-in") feature on live calls? | 🟢 | 👤 Berat | Voice channel feature scope |
| C-07 | IVR language: German only, or support for non-German speakers? | 🟢 | 👤 Berat | IVR design scope |
| C-08 | Message moderation: all messages scanned, or only flagged? What triggers a flag? | 🟢 | 👤 Berat | Moderation system design — later phase |

---

## 6. Internationalization (Exploration)

Full context → [`explorations/internationalization.md`](explorations/internationalization.md)

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| I18N-01 | Which countries / languages does Berat want to support? Priority order? | 🔴 | 👤 Berat | Architecture choice (single vs multi-tenant vs UI variants) |
| I18N-02 | Per-country invoicing legal requirements — research scope | 🟡 | 👤 Berat + legal | Invoice engine design |
| I18N-03 | i18n stack: which library / framework? (likely team choice once tech stack is set) | 🟢 | 🔧 Team | UI implementation |
| I18N-04 | Translation management: human translators? AI? Hybrid? | 🟢 | 👤 Berat budget | Translation workflow |

---

## 7. Payment Methods (Exploration)

Full context → [`explorations/payment_methods.md`](explorations/payment_methods.md)

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| PM-01 | Cash support in v1? (Recommended yes — avoid Berat building shadow IT) | 🔴 | 👤 Berat | Payment method enum + admin UI |
| PM-02 | If cash: how is it registered? Customer says "I'll pay cash" or Berat marks it after the fact? | 🟡 | 👤 Berat | Cash workflow design |
| PM-03 | Initial target markets beyond DE — drives which payment rails to enable | 🟡 | 👤 Berat | Tied to I18N-01 |
| PM-04 | Multi-currency: single account + gateway converts vs multiple bank accounts per country? | 🟡 | 👤 Berat after I18N-01 | International payment flow |
| PM-05 | Stripe Checkout (auto-rails per country) vs PaymentIntents (manual)? | 🟢 | 🔧 Team | Stripe integration shape |

---

## 8. Employee Access Control (Explorations)

Full option context → [`explorations/employee_access.md`](explorations/employee_access.md)

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| E-01 | What specific tasks will employees (service workers) actually perform? | 🟡 | 👤 Berat | Without this, cannot design the permission matrix |
| E-02 | Which employee actions require Berat's confirmation vs auto-execute vs auto-block? | 🟡 | 👤 Berat | Action validation tier boundaries |

---

## 9. Internal Team (to resolve without Berat)

| # | Question | Owner | Depends on |
|---|----------|-------|-----------|
| I-01 | Finalize entity ID naming conventions (`platform_order_id`, `sevdesk_invoice_id`, etc.) | Ferhat + team | Team agreement — D-05 |
| I-02 | Finalize DB schema | Ismail | O-01 (all Bestellungen columns known) |
| I-03 | Finalize tech stack (backend framework, DB, hosting) | Ismail | Ferhat sign-off |
| I-04 | Does the platform replace Google Sheets entirely, or mirror it? | Ferhat | Berat's answer on Sheets usage |
| I-05 | Which Zapier flows does it currently handle — document all of them | Yasser | Berat confirm — needed for D-03 replacement |
| I-06 | Production database: SQLite confirmed broken for concurrent connections (fixed Apr 29 with Prisma single-connection workaround) — must decide production DB before scaling | Ismail | Ferhat sign-off |

---

## 10. Pipedrive / Limits

| # | Question | Priority | Owner | Context |
|---|----------|----------|-------|---------|
| PP-01 | Subscriber limit at 4,159/5,000 ⚠️ — what's the plan before launch? | 🟡 | 👤 Berat + team | Will hit cap before or at launch unless addressed |
| PP-02 | Is Pipedrive now the only source of truth, or does Zapier still write to Google Sheets too? | 🟡 | 👤 Berat | Migration scope: if Sheets is still being written to, we cannot ignore it |

---

## 11. GW Matchmaking (New — May 1)

Matchmaking was discussed in the May 1 meeting. Weighted scoring system is the proposed approach — criteria and weights are open.

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| M-01 | Does Berat currently apply gender preference when assigning GWs? Should platform support customer gender preference as a filter? | 🟡 | 👤 Berat | Matchmaking criteria design |
| M-02 | GW ratings: how to prevent malicious 0-star reviews from distorting scores? (Low weight vs manual review vs both?) | 🟡 | 👤 Berat + 🔧 Team | Matchmaking + GW score model |
| M-03 | What are the exact weights per matching criterion? (capacity vs expertise vs rating vs availability) | 🟡 | 👤 Berat + 🔧 Team | Matching algorithm |
| M-04 | Is GW availability self-reported (GW sets it) or inferred from active order count? | 🟡 | 👤 Berat | GW profile + matching |

---

## 12. GW Portal & Notion Sub-Pages (New — May 4)

The 8 Notion sub-pages linked from the GW dashboard have NOT been fetched. They likely contain the exact rules Berat gives GWs for each process step. These are high priority because they define platform business logic we cannot guess.

To fetch: open each sub-page in Chrome with the browser extension connected, or ask Berat to export as PDF.

| # | Question | Priority | Owner | Blocks |
|---|----------|----------|-------|--------|
| ~~N-01~~ | ~~Full content of "Ablauf mit Kund:innen"~~ | — | — | **✅ Closed May 6** — full SOP confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) SOP A |
| ~~N-02~~ | ~~Full content of "Nichteinhaltung von Terminen"~~ | — | — | **✅ Closed May 6** — full SOP confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) SOP B |
| ~~N-03~~ | ~~Full content of "Annahme von Aufträgen"~~ | — | — | **✅ Closed May 5** — full SOP confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) §1 |
| ~~N-04~~ | ~~Full content of "Auszahlung des Honorars"~~ | — | — | **✅ Closed May 5** — full SOP + AGB excerpts confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) §4 |
| ~~N-05~~ | ~~Full content of "Umgang mit negativem Feedback"~~ | — | — | **✅ Closed May 5** — full SOP confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) §5 |
| ~~N-06~~ | ~~Full content of "Auftragserweiterung und Zusatzrechnungen"~~ | — | — | **✅ Closed May 5** — full SOP confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) §6 |
| ~~N-07~~ | ~~Full content of "Erstkontakt mit Kunden"~~ | — | — | **✅ Closed May 6** — full SOP confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) SOP D |
| ~~N-08~~ | ~~Full content of "Qualitätssicherung durch Ghostwriter"~~ | — | — | **✅ Closed May 6** — full SOP confirmed; see [`gw_workflow_sops.md`](gw_workflow_sops.md) SOP E |
| N-09 | Shadow-banning: what exactly triggers it? Is it reversible? Are there intermediate tiers (e.g. "reduced" notifications vs full ban)? | 🟡 | 👤 Berat | GW visibility tier system design |
| N-10 | Expert track (form 6514, page `/als-expertin-bewerben/`) — is this the same role as a GW, or a different profile (tutor/coach)? Different payment structure? | 🟢 | 👤 Berat | GW registry: do Experts get a separate profile type? |
| N-11 | B2B segment (form 42844, page `/fuer-unternehmen/`) — different pricing, SLA, legal structure, or just a different intake form? | 🟡 | 👤 Berat | B2B order pricing path |
| N-12 | Partner / affiliate program (forms 38976 + 38981) — commission rate? How is referral attribution tracked? Platform integration needed? | 🟢 | 👤 Berat | Referral analytics + partner payout |

---

## Already Answered — Moved to business_rules.md

| Question | Answer summary |
|----------|---------------|
| Which inbound email provider? | Cloudflare Email Workers (D-15, May 1) — no separate provider needed |
| Does `efactory1.de` MX conflict with catch-all? | Non-issue — Cloudflare manages the MX setup (D-15) |
| Record calls or metadata-only? | Metadata-only — Berat confirmed no recording (D-16, May 1) |
| If recording, do we transcribe? | No — Berat confirmed no transcription (D-16, May 1) |
| Pricing per page by work type | 49/59/69/79 € (Hausarbeit/Bachelor/Master/Doktor) |
| GW payment formula structure | `(Gross ÷ 1.07) × rate` — VAT 7% confirmed; rate variable 30–60% |
| Tight deadline margin policy | % split never changes; higher price = more absolute for both |
| Installment payments | Up to 5 monthly; Stripe/Klarna; 10% discount upfront |
| Teillieferung date formula | ≤20 pages: 50/50; >20 pages: 30/30/30 |
| Invoice type in Sevdesk | Legal invoice; cancelled if unpaid |
| GW selection logic | Expertise first, then workload |
| GW workload tracking | In Berat's head; GWs can handle multiple jobs |
| GW + customer notified simultaneously | Yes — both get email at same time on assignment |
| Assignment SLA | Never more than 24h from order placed |
| Direct outreach pay policy | Standard terms — no urgency premium |
| "No GW accepts" scenario | Never happens; Berat determines the fee |
| Can Berat self-assign? | Yes; job never posted to GW board when self-assigned |
| GW assignment email template | Full German template confirmed — see business_rules.md §6 |
| Tracking Teillieferung timing | Not tracked; customer complains if late |
| Edge case handling | Phone/WhatsApp manually; remains manual in v1 |
| All columns of `#1 Bestellungen` (O-01) | ✅ Closed May 2 — 22 columns confirmed; full schema in business_rules.md §9 |
| GW assignment column in Sheets (O-03) | ✅ Closed May 2 — column R "Zuteilung" (dropdown); column Q "Wird bearbeitet von" holds GW name |
| LQ column meaning (O-04) | ✅ Closed May 2 — LQ = Lead Quelle (lead acquisition source): ef1, av, ac, ws1, sp1, b1, ig, ebay |
| Work type (Art der Arbeit) normalization | Open — ~200 string variants in live data need mapping to ~15 canonical types (O-07 new) |
