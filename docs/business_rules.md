# eFactory — Confirmed Business Rules
> **Confirmed facts only.** Everything here has been verified by Berat or from live data.
> Anything not yet confirmed → [`open_questions.md`](open_questions.md).
> RE-phase explorations (communication system, employee access) → [`explorations/`](explorations/_overview.md).
> Sources: ClickUp answers (Apr 27–28), Google Sheets formula analysis, Pipedrive sandbox, anonymized copy review (02.05.2026), Notion GW dashboard screenshots (04.05.2026), May 3–4 team sessions.
> Raw sources: [`source/clickup_answers.md`](source/clickup_answers.md) · [`source/sheets_analysis.md`](source/sheets_analysis.md) · [`source/notion_gw_dashboard.md`](source/notion_gw_dashboard.md) · [`source/wordpress_forms.md`](source/wordpress_forms.md)
> Last updated: May 4, 2026

---

## 1. Pricing

### Price per page (gross, incl. 7% VAT)

| Work Type | Price per Page |
|-----------|---------------|
| Hausarbeit | 49 € |
| Bachelorarbeit | 59 € |
| Masterarbeit | 69 € |
| Doktorarbeit | 79 € |

> Source: Berat's ClickUp comment ([869d2r1cw](https://app.clickup.com/t/869d2r1cw))

### Customer gross price formula

```
Gross Price = Pages × Price per Page × Deadline Factor
```

- **Deadline Factor = 1** for all orders with deadline ≥ 72h
- **Deadline Factor > 1** when deadline < 72h — exact multiplier not yet confirmed (see [`open_questions.md`](open_questions.md))

### VAT

- **7%** (Mehrwertsteuer) for all educational services — confirmed from live Google Sheets formula
- 19% applies to non-educational services (not common, TBC)

### GW payment split

```
GW Payment = (Gross Price ÷ 1.07) × rate
```

| Component | Value |
|-----------|-------|
| Strip VAT | Gross ÷ 1.07 = Net price |
| GW rate | **Variable: 33% – 62% of net** — not a fixed value (peak at 40%) |
| What sets the rate | ⚠️ Unknown — see [`open_questions.md`](open_questions.md) |

> Formula structure confirmed from live Google Sheets: `=('#1 Bestellungen'!K/1,07)*0,3`
> The `0.3` in that formula was one specific order. Berat confirmed on Apr 28 that the rate is not static — it ranges between 0.3 and 0.6 depending on factors not yet specified.
> ⚠️ Previously documented as a fixed 30/70 split — corrected Apr 28 based on Berat's WhatsApp message.
> Source: [`source/sheets_analysis.md`](source/sheets_analysis.md)

### Margin policy

- Berat never reduces his margin **% due to deadline pressure** — tight deadline raises gross price, earning both sides more in absolute terms
- The GW rate % does not change mid-order once set
- The rate itself (30–60%) is negotiated or set per-GW/per-order — exact logic is an open question, see [`open_questions.md`](open_questions.md)

> Source: Berat's ClickUp comment ([869d2r1dc](https://app.clickup.com/t/869d2r1dc))

---

## 2. Installments & Discounts

- Customers may request up to **5 monthly installments** (e.g. €1,000 → 5 × €200/month)
- Installments are handled by **Stripe via Klarna or PayPal** — not tracked manually
- **10% discount** is offered to customers who pay the full amount upfront
- Sevdesk invoice must not be marked "fully paid" until the final installment clears

> Source: Berat's ClickUp comment ([869d2r7cz](https://app.clickup.com/t/869d2r7cz))

---

## 3. Delivery Structure (Teillieferung)

### Rules by page count

| Pages | Structure | Milestones |
|-------|-----------|-----------|
| ≤ 20 pages | 50 / 50 | 1 partial + final |
| > 20 pages | 30 / 30 / 30 + final | 2 partials + final |

### Teillieferung date formula (≤ 20 pages)

```
Teillieferung Date = Today + (Customer Deadline − Today) ÷ 2
```

For > 20 pages, two Teillieferung dates are needed:
- First: Today + (Deadline − Today) × 0.3
- Second: Today + (Deadline − Today) × 0.6

### Customer override

If the customer requests an earlier partial delivery, they can specify the date — the platform must support this as an input field on order creation.

> Source: Berat's ClickUp comments ([869d2r1e6](https://app.clickup.com/t/869d2r1e6), [869d2r3dk](https://app.clickup.com/t/869d2r3dk))

---

## 4. GW Assignment

### Assignment SLA

- Maximum **24 hours** from order placement to GW assignment
- If order placed **before noon** → assigned **same evening**
- If order placed **after noon** → assigned **following morning**
- The customer is explicitly told about this SLA

> Source: Berat's ClickUp comment ([869d2r1jx](https://app.clickup.com/t/869d2r1jx))

### GW selection criteria (in priority order)

1. **Field expertise** — most important; Berat knows all GW expertise by heart
2. **Current workload** — Berat avoids overloading any single GW (risk minimization: if they get sick, all their orders suffer)

No formal scoring system exists today. The platform must replace this with a GW profile showing expertise tags and active order count.

> Source: Berat's ClickUp comment ([869d2r3em](https://app.clickup.com/t/869d2r3em))

### GW capacity

- GWs can handle **multiple simultaneous jobs**
- No formal capacity limit — judgment call by Berat
- Berat currently tracks this entirely in his head

> Source: Berat's ClickUp comment ([869d2r3gm](https://app.clickup.com/t/869d2r3gm))

### Shadow-banning

- Berat can silently reduce a GW's visibility on the job board without notifying them
- **Shadow-banned GWs** stop receiving email notifications about new jobs; they still see the Notion board if they visit directly
- Shadow-banning is Berat's informal quality-control mechanism — applied when a GW delivers poor work or becomes unreliable
- What triggers it, whether it is reversible, and whether there are intermediate tiers (e.g. "reduced" notifications) → open question N-09 in [`open_questions.md`](open_questions.md)

> Source: Confirmed from May 3 team sessions; shadow-banning mechanism mentioned explicitly in meeting transcripts

### Assignment notification flow

When Berat assigns a GW, both parties are notified **simultaneously**:
- Email to GW: job briefing with order details and customer contact
- Email to customer: GW introduction with name, email, phone

Neither party is told before the other. See section 6 for the exact email templates.

> Source: Berat's ClickUp comment ([869d2r1j7](https://app.clickup.com/t/869d2r1j7))

### Self-assign (Berat as GW)

- Berat can assign himself as the ghostwriter on any order
- When self-assigned: the job is **never posted to the GW job board**
- The order goes directly to Berat's own workload without notifying other GWs
- The platform must provide a "self-assign" path on the admin order detail view

> Source: Berat's ClickUp comment ([869d2r7nu](https://app.clickup.com/t/869d2r7nu))

### Direct outreach policy

When a specific GW hasn't seen or responded to a job:
- Berat reaches out directly via phone or WhatsApp
- **No extra pay offered** — standard terms always apply
- GWs missing jobs is caused by forgetting to check Notion, not by rejecting the pay
- This problem is solved by the platform's notification system

> Source: Berat's ClickUp comment ([869d2r1m1](https://app.clickup.com/t/869d2r1m1))

### "No GW accepts" scenario

This has **never happened**. Berat sets the fee; GWs accept when directly assigned. No fallback flow needed in v1.

> Source: Berat's ClickUp comment ([869d2r1mv](https://app.clickup.com/t/869d2r1mv))

---

## 5. Invoice & Payment

### Invoice type

- Sevdesk invoice is a **legal Rechnung** (steuerrechtliche Rechnung) — not a proforma
- If the customer does not pay, the invoice is **cancelled** (storniert) in Sevdesk
- Currently sent via Outlook — to be replaced by Sevdesk API `POST /Invoice/:id/sendViaEmail`

> Source: Berat's ClickUp comment ([869d2r4kh](https://app.clickup.com/t/869d2r4kh))

### Payment methods

| Method | Trigger | Handler |
|--------|---------|---------|
| Stripe (card / Klarna / PayPal) | `payment_intent.succeeded` webhook | Automatic |
| Bank transfer (SEPA / Überweisung) | Admin "Mark as Paid" button | Same `confirmPayment()` function |

Both paths call the **same internal handler** — no divergence in logic. See [`integrations/payment_flow.md`](integrations/payment_flow.md) for technical details.

### GW Fee Payment (confirmed from Notion dashboard)

- **Day:** GW fees are paid **every Friday** — batch release, not ad hoc
- **Condition:** Berat pays a GW **only after ALL customer installments have been received**
  - If a customer delays or defaults on any installment, the GW waits — even if their work is complete and excellent
  - This has been a source of GW complaints ("we're in the same boat")
- **Revision prerequisite:** Payment is also blocked until revision rounds are complete (see §11)
- The platform must: (1) track each customer installment separately, (2) track revision round completion, (3) flag GW payments as "releasable" only when both conditions are met, (4) batch and remind Berat every Friday

> Source: Notion GW Dashboard — "Auszahlungen: Honorarauszahlungen erfolgen immer jeden Freitag." ([`source/notion_gw_dashboard.md`](source/notion_gw_dashboard.md)); confirmed in May 3–4 team sessions

---

## 6. Email Templates (confirmed)

Berat provided both templates in ClickUp ([869d2r3e6](https://app.clickup.com/t/869d2r3e6)). These must be replicated in the platform.

### Email 1 — To the ghostwriter (sent on assignment)

Marked **"NICHT WEITERLEITEN"** (do not forward).

**Contains:**
- Order ID
- Customer contact: name, email, phone number
- Job overview: work type, pages, deadline, topic, Gliederung/Exposé if available
- Instructions:
  - Introduce yourself to the customer same day
  - CC efactory1 on all emails to customer
  - Upload partial and final work through platform — never directly to customer
  - Always include page numbers when citing sources (APA, Harvard, German citation style)
- Collaboration rules:
  - Correction loops after final draft are mandatory (prerequisite for payment)
  - Incomplete drafts not paid unless justified (e.g. illness — must be reported immediately)
  - Source/citation errors must be corrected before payment
  - Respond to customer within 24h
  - Partial delivery deadlines must be met; changes require sign-off from efactory1 and customer
- Upload links (to be replaced by platform's own upload flow):
  - Partial delivery: `efactory1.de/ghostwriter-zwischenstand/`
  - Final work + invoice: `efactory1.de/ghostwriter-endstand/`

### Email 2 — To the customer (sent simultaneously with Email 1)

**Contains:**
- GW name, email, phone
- Instruction: GW will contact you first; send missing files (formatting template, citation guide) when they reach out
- Payment instructions: pay proactively after each milestone (partial and final), not just at the end
- Customer service contact: `kundenservice@efactory1.de` for all payment questions
- Communication note: primary channel is email; customer can ask GW to switch to WhatsApp/Zoom/phone

---

## 7. Pipedrive Pipeline Stages

| Stage ID | Stage Name | Business meaning | Platform trigger |
|----------|-----------|-----------------|-----------------|
| 1 | Anfrage | New inquiry received | Manual entry (WhatsApp / off-form customers) |
| 2 | Qualifiziert für Ghostwriting | Request qualified, form accepted | Form submitted (automated) |
| 3 | Rückmeldung (Verhandlung) | Customer negotiating / thinking | Admin sends offer |
| 4 | Rechnung angefordert | Invoice sent, awaiting payment | Customer accepts offer |
| Won | — | Payment confirmed, work begins | Payment confirmed (Stripe webhook or admin button) |

> Canonical stage definition — `integrations/pipedrive.md` references this table.
> Confirmed from Pipedrive sandbox testing.
> Stats: ~7,700 contacts, ~3,400 deals, **4,159/5,000 subscriber limit used** ⚠️

---

## 8. Operational Notes

### Delivery tracking

Currently **no system exists** for tracking whether a GW delivered on time. Berat only finds out when the customer complains. The platform's Teillieferung deadline alert is a zero-to-one improvement.

### Edge case handling

All edge cases (niche topics, impossible deadlines, GW going silent, revision disputes) are handled **manually by Berat via phone or WhatsApp**. These remain manual in v1. The platform needs a notes/flag field on orders for Berat to log these.

> Source: Berat's ClickUp comment ([869d2r3h4](https://app.clickup.com/t/869d2r3h4))

### Multiple orders per customer

Confirmed from live sheet data — customers regularly place multiple separate orders (e.g. Antigona: orders 3492 + 3498; Kurt: 3499 + 3500; Adrian: 3502 + 3503). The platform must support this.

### "folgt" (TBD) orders

Orders can be created before the customer has chosen their paper topic. The title field may contain "folgt" (TBD). The platform must allow null/pending topic on order creation.

### Coaching orders

"Bachelorarbeit Coaching" (e.g. order 3496) = advisory work, not ghostwriting. The customer performs their own experiments; the GW advises. Whether this is priced or split differently is still an open question.

---

## 9. Google Sheets — `#1 Bestellungen` Complete Column Schema

> Source: Anonymized copy reviewed May 2, 2026. Closes O-01.
> Full raw analysis → [`source/sheets_analysis.md`](source/sheets_analysis.md)

### Column Map

| Col | German Header | English Meaning | Type |
|-----|---------------|-----------------|------|
| A | Status | Order status | Enum: Done / On hold / Open |
| B | ID | Order ID | Integer (sequential; 3500+ total orders) |
| C | Vor- und Nachname | Customer full name | Free text |
| D | Angenommen | Date order was received/accepted | Date |
| E | Zwischendatum | Partial delivery date (Teillieferung) | Date |
| F | Abgabedatum | Final customer deadline | Date |
| G | Tage Zwisch... | Days remaining for partial delivery | Calculated (likely: E − today) |
| H | Tage Abg... | Days remaining for final deadline | Calculated (likely: F − today) |
| I | Art der Arbeit | Work type | Enum: Hausarbeit / Bachelorarbeit / Masterarbeit / Doktorarbeit / Seminararbeit / Fallstudie / etc. |
| J | SOL Umfang | Target page count (SOLL = target) | Integer |
| K | Gesamtpreis [€] | Gross customer price (incl. 7% VAT) | Currency — key financial column |
| L | Rate 1 [€] | Payment installment 1 | Currency; yellow cell = paid |
| M | Rate 2 [€] | Payment installment 2 | Currency; yellow cell = paid |
| N | Rate 3 [€] | Payment installment 3 | Currency; yellow cell = paid |
| O | Rate 4 [€] | Payment installment 4 | Currency; yellow cell = paid |
| P | Rate 5 [€] | Payment installment 5 | Currency; yellow cell = paid |
| Q | Wird bearbeitet von | Being processed/handled by | GW name or "Berat" for self-assigned |
| R | Zuteilung | GW assignment status | Dropdown |
| S | Stand der Zahlung an Autor | GW payment status | Dropdown: see values below |
| T | Honorar für Autor:in | GW payment amount | Currency — formula: `(K/1.07)*rate` |
| U | Weitere Notiz | Additional notes | Free text |
| V | LQ | Unknown — lead quality? delivery quality? | Still open — O-04 |

### Confirmed Status Values (Column A) — All 5

| Value | Count | Meaning |
|-------|-------|---------|
| Done | 3,359 | Order fully completed |
| Open | 645 | Order active and in progress |
| On hold | 4 | Order paused / waiting |
| Bye | 1 | Customer withdrew / no longer proceeding |
| Storno | 1 | Order cancelled |

Green row background = order is Done (driven by conditional formatting on column A).

### Confirmed GW Payment Status Values (Column S) — All 8

| Value | Meaning |
|-------|---------|
| Arbeit im Gange | Work in progress — GW not yet paid |
| Ausgezahlt | GW paid in full |
| Gutgeschrieben | Payment credited (internal accounting — distinct from Ausgezahlt) |
| Keine Auszahlung | No payment — Berat self-assigned, no GW to pay |
| Noch nicht ausgezahlt; Rechnung liegt vor | GW invoice received; payment pending |
| Nur Teilauszahlung | Only partial payment made to GW |
| Rechnung fehlt | GW has not sent their invoice yet |
| Storniert | Assignment cancelled |

### Scale and Dashboard

- **~3,510 total orders** since business started (order IDs sequential from ~1 to ~3,522)
- **Date range**: Feb 7, 2022 → May 1, 2026 (4+ years of business data)
- **87,210.03 € open receivables** shown as a live dashboard figure in the sheet header
- The sheet has a color legend (row 3): yellow/cyan = bezahlt (paid), red = fällig (overdue)
- **Column T (Honorar) filled**: 2,898 orders (82%) — empty for early orders where Berat self-assigned and no GW payment tracked

### LQ Column (V) — Lead Source / Acquisition Channel

Column V = **Lead Quelle** (Lead Source). Tracks the marketing channel that brought the customer.

| Value | Count | Meaning |
|-------|-------|---------|
| ef1 | 315 | efactory1.de website (direct/organic) |
| av | 41 | Unknown channel (ask Berat) |
| ac | 25 | Unknown channel (ask Berat) |
| ws1 | 18 | WhatsApp (first source?) |
| sp1 | 13 | Unknown |
| b1 | 13 | Unknown (review platform?) |
| ig | 11 | Instagram |
| ebay | 1 | eBay Kleinanzeigen |

> Note: Only 438 of 3,510 orders have a lead source — the LQ column was added partway through the business. Older orders do not have this tracking.

### GW Rate — Actual Data Distribution

The GW rate (ratio of net honorarium to net order price) from live data:
- **Actual range: 0.33 – 0.62**
- **Most common: 0.40** (435 orders)
- **90%+ of orders fall between 0.34 and 0.50**

> Previously documented range of 0.30–0.60 was Berat's stated range. The data shows the practical range is tighter: 0.33–0.62, peaking at 0.40.

### GW Network Size

- **258 unique name strings** in column Q — but many are duplicates and typos (e.g. "Isabel", "Isabell", "Isabelle", "Isabel Ast", "Isabel Walter" = same person)
- Actual GW count is likely 80–120 unique individuals
- "Keine Auszahlung" orders = Berat self-assigned (he is also listed as "Berat", "BERAT", "Bero")
- **Platform must create a proper GW registry** to deduplicate these

### Work Type — Data Quality Problem

The Art der Arbeit field (Column I) has ~200 distinct string values due to inconsistent free-text entry. Platform must enforce a controlled enum. Core canonical types to standardize to: Hausarbeit, Bachelorarbeit, Masterarbeit, Doktorarbeit, Diplomarbeit, Seminararbeit, Facharbeit, Projektarbeit, Expose, Präsentation, Lektorat, Workbook, Formatierung, and a catchall "Sonstiges". All current variants should be mapped to one of these on import.

### Paper Title and Field of Study

- These fields do **NOT** exist in `#1 Bestellungen` (confirmed — no column for paper title in A–V)
- They exist ONLY in `#3 Zuweisungen der Bestellungen` (columns D and E)
- For the database, paper title and field of study must be stored in the orders table but migrated from `#3`, not `#1`

---

## 11. GW Collaboration Rules (from Notion Dashboard)

> Source: Berat's own written rules on the live Notion GW dashboard — all 11 sub-pages now fully documented via screenshots (May 4) and official English translation PDF (May 6, 2026).
> Full analysis with flowcharts → [`gw_workflow_sops.md`](gw_workflow_sops.md)
> Raw text → [`source/notion_gw_dashboard.md`](source/notion_gw_dashboard.md)
> These rules directly define platform logic and must be enforced by the platform.

### 11.1 Revision Rounds — Mandatory Prerequisite for Payment

After the customer receives the final template:
- Revision rounds (Korrekturschleifen) are **obligatory**
- They are a **prerequisite for fee payment** — no revisions = no payment release
- GWs must not ignore revision requests

**Platform implication:** Final submission status ≠ "payment releasable." Platform must have a "revision rounds complete" flag before marking a GW payment as releasable.

### 11.2 Customer–GW Conflicts Can Delay Payment

Problems between a customer and author after the final template is sent **can delay** fee payment. Berat retains discretion over whether to release the fee when a dispute is open.

**Platform implication:** Order needs a "dispute open" flag that blocks GW payment release.

### 11.3 Unfinished Drafts — Not Paid Without Valid Reason

A draft that does not reach the agreed completion level **will not be paid**, unless there is a valid reason (e.g. author illness). GWs must report such cases **immediately**.

**Platform implication:** Platform needs an "exception request" flow where a GW can flag a legitimate reason for incomplete delivery. Admin (Berat) reviews and approves/denies the exception.

### 11.4 Sources and Citations — Mandatory

Correct source citations, citation format, and **page numbers when citing** are obligatory. Errors must be corrected before the fee is released.

**Platform implication:** Quality checklist or submission gate before final delivery is accepted. Berat reviews and explicitly approves; errors block payment.

### 11.5 24-Hour Response SLA

GWs should respond to customer inquiries **within 24 hours**.

**Platform implication:** Platform should surface SLA warning if a GW has not responded to the customer for > 24 hours. Alert Berat for intervention.

### 11.8 Upload Deadline = Day Before, Before 18:00

Work must be uploaded **no later than the day before the due date**, and **before 18:00**.

**Platform implication:** Deadline warnings must trigger on D-2 and D-1 (not on the due date itself). The submission gate should surface a prominent alert when the window is closing.

### 11.9 efactory1 CC'd on All Customer Emails

Every email a GW sends to a customer must have **efactory1 in CC** — the man-in-the-middle is enforced at the email communication level.

**Platform implication:** The platform's messaging system must auto-include efactory1 in CC on all GW→customer messages. GWs must be told to CC efactory1 if communicating outside the platform.

### 11.10 Financial Firewall — GW Never Discusses Money with Customer

All customer questions about prices, payments, or invoices must be redirected to **kundenservice@efactory1.de**. GWs are explicitly forbidden from discussing financials with customers.

**Platform implication:** Platform chat should auto-warn or auto-redirect when financial keywords appear in GW→customer messages.

### 11.11 Work Never Sent Directly — Only Via Platform

Interim drafts and final work are **never sent directly from GW to customer**. All submissions go via the efactory1 platform / website.

**Platform implication:** The GW portal is the only submission channel. GWs inform customers of this in the first contact email.

### 11.12 Delay Notification — Dual-Channel, Simultaneous

When a deadline cannot be met: GW must notify **both the customer AND kundenservice@efactory1.de simultaneously**, including: reason, proposed new delivery date, confirmation of which parties have been informed.

**Platform implication:** "Report Delay" button on active orders triggers dual notification automatically.

### 11.13 GW Self-Check is Mandatory Before Every Submission

Before submitting interim or final work, GW must perform a self-check: spelling, grammar, plagiarism check, and customer-specific requirements.

**Platform implication:** Submission form includes a mandatory pre-submission checklist — cannot submit without checking all boxes.

### 11.14 efactory1 Has a Dedicated QA Team

Review of submitted work is performed by an **efactory1 quality assurance team** — not just Berat reviewing alone. Specialized plagiarism software may be used.

**Platform implication:** Admin side needs a QA review queue separate from Berat's general admin tasks. QA team is a distinct role in the platform's permission model.

### 11.15 Copyright — Works May Not Be Reused Without Client Consent

Created works may **not be used elsewhere** without the express consent of the client.

**Platform implication:** Copyright notice displayed to GWs on submission screen. Part of the AGBs GWs accept at job claim.

### 11.6 Interim Deadlines Are Binding

Interim delivery deadlines (Zwischenlieferungen) must be met. If a deadline needs to change, it must be renegotiated with **both efactory1 AND the customer**.

**Platform implication:** GW cannot unilaterally move an interim deadline. Platform must enforce a deadline-change request workflow requiring Berat's approval (and ideally customer confirmation).

### 11.7 AI Use = Fraud

All submitted work is checked for AI use. If sources cannot be found or clear AI indicators are present:
- GW is excluded from the platform
- Fraud report is filed
- Fee payment is refused

**Platform implication:** Platform must log submission metadata (timestamps, file hashes). Berat needs an "AI violation" action button on the submission review screen that triggers exclusion + payment block.

---

## 12. GW Job Board & Portal

> Source: Confirmed from live Notion GW dashboard screenshots, May 4, 2026.
> Full raw extraction → [`source/notion_gw_dashboard.md`](source/notion_gw_dashboard.md)
> WordPress form inventory → [`source/wordpress_forms.md`](source/wordpress_forms.md)

### 12.1 GW Lifecycle (8 Steps)

| Step | Description | WordPress / Platform touchpoint |
|------|-------------|--------------------------------|
| 1 | **Onboarding** — new GW fills out application | `/ghostwriter-onboarding/` (form 7880) |
| 2 | **Finding orders** — GW browses Notion job board; most receive email alerts; shadow-banned GWs do not | Notion job board → `/ghostwriter-dashboard/` (form 6736) |
| 3 | **First contact with customer** — Berat introduces GW; GW + customer communicate directly; Berat stays financial/contractual intermediary | GW email + WhatsApp (current); platform chat (future) |
| 4 | **Doing the work** — GW accesses job details and downloads materials | `/ghostwriter-dashboard/` (form 6736); resource download pages |
| 5 | **Interim draft submission** — GW uploads partial draft | `/ghostwriter-zwischenstand/` (form 7893) |
| 6 | **Final submission** — GW uploads final work + invoice | `/ghostwriter-endstand/` (form 7897); `/rechnung-anfordern/` (form 8132) |
| 7 | **Payment** — Berat collects all customer installments, then pays GW on the next Friday | Manual (current); Friday batch + releasable flag (platform) |
| 8 | **Edge cases** — deadline non-compliance, order extensions, negative feedback | Additional invoice via `/rechnung-anfordern/` (form 8132) |

### 12.2 Job Board Columns (live Notion table GWs see)

| Column (German) | English | Notes |
|---|---|---|
| Auftrags ID | Order ID | Unique order number |
| Art der Arbeit | Type of work | e.g. Hausarbeit, Bachelorarbeit |
| Titel der Arbeit | Title of work | Paper topic/title from customer |
| Fachbereich | Field / Subject area | e.g. Wirtschaftsinformatik |
| Seitenanzahl | Number of pages | Target page count |
| Verbindliches Finales Lieferdatum (bis 18 Uhr) | Binding final delivery date (by 6 pm) | Hard deadline — must be met |
| Verbindlicher 1. Zwischenstand (bis 18 Uhr) | Binding 1st interim deadline (by 6 pm) | Hard deadline for interim draft |
| Gesamthonorar (Netto) | Total fee (net) | What the GW earns |
| Weitere Notiz von efactory1.de | Note from efactory1 | Berat's custom per-order note |

**Platform implication:** The platform GW portal job board must expose exactly these columns. Deadlines are "by 6 pm" — the time component matters.

### 12.3 GW Quick Actions → WordPress Form URLs

| Button (German) | English | WordPress URL | Platform replacement |
|---|---|---|---|
| Auftrag annehmen | Accept order | `/ghostwriter-dashboard/` | GW portal: "Claim job" action |
| Zwischenstand hochladen | Upload interim draft | `/ghostwriter-zwischenstand/` | GW portal: interim submission module |
| Finale Mustervorlage + Rechnung hochladen | Upload final + invoice | `/ghostwriter-endstand/` | GW portal: final delivery + auto invoice |

### 12.4 GW Template Documents (downloadable from Notion)

| File | German name | Purpose |
|------|-------------|---------|
| Vorlage_Deckblatt_efactory1.de.docx | Cover page template | Standard cover sheet for all submissions |
| Expose_Vorlage_efactory1.docx | Exposé template | Research proposal format |
| Thesis_Vorlage_efactory1.docx | Thesis template | Full thesis format |
| 200_Formulierungen_efactory1.docx | 200 academic phrases | Reference doc for academic language |

**Platform implication:** GW portal must include a document library section with these four files. Currently hosted on Notion — must be migrated to the platform.

### 12.5 Communication Channels (Priority Order)

Berat's current channel priority for both GWs and customers:

| Priority | Channel | Used For |
|----------|---------|---------|
| 1 | Email | All formal processes (form submissions trigger emails; invoices; status updates) |
| 2 | WordPress forms | Process triggers (onboarding, interim upload, final upload, invoice) |
| 3 | WhatsApp | Day-to-day communication with GWs and customers |
| 4 | Phone calls | Escalations, complex discussions |
| 5 | Notion | GW knowledge base + job board |

> Source: Confirmed from May 3–4 team sessions

---

## 13. Communication System & Employee Access

These are RE-phase explorations — not confirmed facts. They live in the explorations folder:

| Topic | File |
|-------|------|
| Communication proxy — email, WhatsApp, voice (all options + comparisons) | [`explorations/communications/`](explorations/_overview.md) |
| Employee (service worker) access control — hypotheses + options | [`explorations/employee_access.md`](explorations/employee_access.md) |
| All active explorations — status and navigation | [`explorations/_overview.md`](explorations/_overview.md) |
