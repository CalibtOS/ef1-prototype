# Source: Berat's Google Sheets Analysis
> **This is a raw source file** — for traceability only. Do not use as primary reference.
> Confirmed facts extracted here live in [`business_rules.md`](../business_rules.md).
> Open questions generated here live in [`open_questions.md`](../open_questions.md).

> Source: Screenshots shared by Berat Özdemir on 27.04.2026 (initial) + full dataset shared 02.05.2026
> ⚠️ Berat has shared his complete dataset, but the data is **entirely fabricated / fake** — it does not represent real customers, orders, or amounts. Use it for structure and workflow understanding only, not as a sample of real business data.
> Raw screenshots: [`assets/excel-sheets-imgs/`](../../assets/excel-sheets-imgs/)

---

## Spreadsheet Overview

The document contains **4 sheets**:

| Sheet | Name | Purpose |
|-------|------|---------|
| 1 | `#1 Bestellungen` | Main order ledger — every order Berat has ever taken |
| 2 | `#2 Infos für Autor/Kunde` | Email templates sent to GW and customer on assignment |
| 3 | `#3 Zuweisungen der Bestellungen` | GW assignment view — pulls data from sheet 1 via formulas |
| 4 | `Formulare ef1` | Links reference — forms on the efactory1.de website |

---

## Sheet 1 — `#1 Bestellungen` (Main Order Ledger)

### Header Area (Rows 1–3)

- **Row 1:** Title "Aktuelle Aufträge von efactory1" (Current Orders from efactory1)
- **Row 1 (right side):** Live total: **"87.210,03 € offene Forderungen von Kund:innen"** (open receivables from customers) — this is a dashboard figure, not a formula we can see, but it's prominent
- **Row 2:** Color legend
  - **bezahlt** (paid) — highlighted cell (cyan/light blue)
  - **fällig** (due/outstanding) — highlighted cell (red)
- **Row 4:** Column headers

### Complete Column Map — `#1 Bestellungen`

> ✅ All columns now confirmed from anonymized copy screenshots (02.05.2026). Closes O-01.

| Col | German Header | English Meaning | Notes |
|-----|---------------|-----------------|-------|
| A | Status | Order status | Values: **Done**, **On hold**, **Open** |
| B | ID | Order ID / Bestellnummer | Integer; runs to 3500+ |
| C | Vor- und Nachname | Customer full name (first + last) | Anonymized in copy |
| D | Angenommen | Date order was accepted/received | Date format DD.MM.YYYY |
| E | Zwischendatum (truncated) | Partial delivery date (Teillieferung) | Confirmed: `#3 Zuweisungen` column H = `='#1 Bestellungen'!E{row}` |
| F | Abgabedatum (truncated) | Final deadline | Confirmed: `#3 Zuweisungen` column G = `='#1 Bestellungen'!F{row}` |
| G | Tage Zwisch... | Days remaining for partial delivery | Likely calculated (today vs column E) |
| H | Tage Abg... | Days remaining for final deadline | Likely calculated (today vs column F) |
| I | Art der Arbeit | Work type | Hausarbeit / Bachelorarbeit / Masterarbeit / Doktorarbeit / Seminararbeit / Fallstudie / Präsentation / Lektorat / Portfolio / Expose / etc. Confirmed: `#3 Zuweisungen` column C = `='#1 Bestellungen'!I{row}` |
| J | SOL Umfang | Target page count (SOLL Umfang) | Confirmed: `#3 Zuweisungen` column F = `='#1 Bestellungen'!J{row}` |
| K | Gesamtpreis [€] | Total gross customer price (incl. 7% VAT) | Key financial column; GW payment formula derives from this. Confirmed: `#3 Zuweisungen` GW payment formula = `(K/1.07)*rate` |
| L | Rate 1 [€] | Payment installment 1 | Yellow highlight = paid; unformatted = not yet paid |
| M | Rate 2 [€] | Payment installment 2 | Same highlight logic |
| N | Rate 3 [€] | Payment installment 3 | Same highlight logic |
| O | Rate 4 [€] | Payment installment 4 | Same highlight logic |
| P | Rate 5 [€] | Payment installment 5 | Same highlight logic; up to 5 installments confirmed |
| Q | Wird bea... | "Wird bearbeitet von" — being processed/handled by | Contains GW name (or Berat's name for self-assigned) |
| R | Zuteilung | GW assignment status | **Dropdown** — closes O-03 |
| S | Stand der Zahlung an Autor | GW payment status | **Dropdown** — values: "Arbeit im Gange" (= work in progress), "Ausgezahlt" (= paid out), "Noch nicht ausgezahlt: R..." (= not yet paid: R...) |
| T | Honorar für Autor:in | GW honorarium / payment amount to GW | Likely formula: `(K/1.07)*rate` — same as `#3 Zuweisungen` column I |
| U | Weitere Notiz | Additional notes | Free text |
| V | LQ = Lead Quelle (Lead Source) | Acquisition / marketing channel that brought the customer | ✅ Confirmed: ef1, ig, ebay, ws1, av, ac, sp1, b1 — see Full xlsx Analysis section below |

### Confirmed Status Values (Column A)

| Value | Meaning |
|-------|---------|
| Done | Order completed |
| On hold | Order paused / waiting |
| Open | Order active / in progress |

Green row = Status is "Done" (or a combination of status + payment confirmed — conditional formatting drives this; exact rule to be confirmed with Abdurrahman who knows the sheet best).

### Confirmed GW Payment Status Values (Column S)

| Value | Meaning |
|-------|---------|
| Arbeit im Gange | Work in progress — GW not yet paid |
| Ausgezahlt | Paid out — GW has been paid |
| Noch nicht ausgezahlt: R... | Not yet paid — reason starts with "R" (possibly "Rechnung" = invoice / invoice issue) |

### Conditional Formatting

- Whole row turns green when order is complete (exact trigger is conditional formatting rule — not yet read out)
- Yellow highlights in Rate columns (L–P): individual cell = paid installment
- Red highlight = overdue / "fällig"
- Some cells highlighted in orange/yellow for dates — likely deadline warning

> Ferhat's instruction: Abdurrahman knows the conditional formatting rules best. Yasser should review together with him.

### Order Scale

- Order IDs run to **3522+** in active data (anonymized copy, May 2, 2026)
- Total orders since business started: 3,500+ (row IDs are sequential from #1)
- Multiple orders per customer confirmed (same customer with multiple order IDs)

### Known GW Names (Column Q — from later rows in anonymized copy)

Tom, Günther, Fatih Moritz, Nikolaos, Marina Laura, Iris, Eva Maria, Martin, Joachim, Patrick, Eva Steinme..., Sabine Hau..., Angelina, Lee-Ann Rö..., Julia Möll..., Fine, Ulrike, Jens Mayer, Moritz More..., Magdalena, Valerian, Nikos, Carsten — and "GW?" (unknown/unassigned)

---

## Sheet 3 — `#3 Zuweisungen der Bestellungen` (GW Assignment View)

### Purpose

Secondary view sheet that every column (except Notes) is a formula pulling from `#1 Bestellungen`. Purpose: gives Berat a focused view for GW assignment management.

### Confirmed Column Formulas

| `#3 Zuweisungen` Col | Formula pattern | Maps to `#1 Bestellungen` Col |
|----------------------|-----------------|-------------------------------|
| A | Customer first name | C |
| B | Order ID | B |
| C | Work type | I |
| D | Paper title/topic | (column not confirmed — appears to be a text column in #1) |
| E | Field of study | (column not confirmed — appears to be a text column in #1) |
| F | Page count | J |
| G | Final deadline | F |
| H | Partial delivery date | E |
| I | GW payment | `=('#1 Bestellungen'!K{row}/1,07)*rate` |
| J | Notes | Free text — only non-formula column |

### Rate Values Observed

| Row | Rate | Source |
|-----|------|--------|
| 3521 (Azer order) | 0.30 (30%) | Formula: `(K3521/1,07)*0,3` |
| 3533 (customer_3518) | 0.37 (37%) | Formula: `(K3533/1,07)*0,37` |

Rate range confirmed by Berat: 0.30–0.60. What determines the rate remains unknown → open question P-01.

### Row Scale

- Row 3303 in `#3 Zuweisungen` references row 3533 in `#1 Bestellungen` — row numbers in the two sheets are offset (not 1:1)
- Active data in `#3` runs to approximately row 3307; empty rows follow

### Color

- All active rows highlighted red = active/in-progress orders in GW view

---

## Sheet 2 — `#2 Infos für Autor/Kunde` (Email Templates)

Contains the two official email templates sent simultaneously when a GW is assigned.

- **Template 1 (An Autor):** GW assignment notification with order details, customer contact, rules
- **Template 2 (An Kunde / PF Autor):** Customer notification with GW contact details

> Full template text confirmed and documented in [`business_rules.md`](../business_rules.md) §6.

---

## Sheet 4 — `Formulare ef1` (Forms Reference)

### Purpose

Quick reference of all forms and URLs used in the efactory1.de ghostwriter workflow.

### Ghostwriter Workflow Steps (Column B = priority, Column C = action)

| Priority | Action (German) | Action (English) |
|----------|-----------------|------------------|
| -1 | Neue Aufträge verschicken | Send new order notifications to GWs |
| 0 | Ghostwriter Onboarding | GW onboarding |
| 0 | Ghostwriter Zwischenlieferungsmail | GW intermediate delivery email |
| 1 | Auftrag annehmen | Accept / take the order |
| 1 | Sales Funnel | Sales funnel (customer acquisition) |
| 2 | Zwischenstand hochladen | Upload partial/intermediate delivery |
| 2 | Zahlungserinnerungen | Send payment reminders |
| 3 | Finale Arbeit hochladen | Upload final work |
| 3 | Zahlungen überprüfen | Review / verify payments |

### Form URLs on efactory1.de

| Form URL | Purpose |
|----------|---------|
| efactory1.de/ghostwriter-endstand/ | Final work upload |
| efactory1.de/ghostwriter-zwischenstand/ | Partial delivery upload |
| efactory1.de/ghostwriter-dashboard/ | GW dashboard / accept orders |
| efactory1.de/ghostwriter-onboarding/ | GW onboarding |
| efactory1.de/rechnung-anfordern/ | Request invoice |
| efactory1.de/kontakt/ | Contact |
| efactory1.de/als-ghostwriterin-bewerben/ | Apply as ghostwriter |
| efactory1.de/freunde-werben-freunde/ | Referral program |

---

## Key Pricing Formula — Confirmed

```
Column T (Honorar = GW honorarium / payment amount to the ghostwriter) formula: =('#1 Bestellungen'!K{row}/1,07)*rate
```

```
GW Payment = (Gross Customer Price ÷ 1.07) × rate
```

- VAT = 7% (educational services, Germany) — confirmed
- Rate varies: observed 0.30 and 0.37; Berat confirmed range 0.30–0.60
- Rate-setting logic remains unknown → see open question P-01

---

## Full xlsx Analysis — Additional Confirmed Facts (May 2, 2026)

> Source: Direct extraction from `ef1-work-todo-copy-anonymized-02052026.xlsx` via Python/openpyxl

### Order Count and Date Range

| Fact | Value |
|------|-------|
| Total orders (data rows) | ~3,510 |
| Status: Done | 3,359 |
| Status: Open | 645 |
| Status: On hold | 4 |
| Status: Bye | 1 |
| Status: Storno | 1 |
| Date range (Angenommen an) | 2022-02-07 to 2026-05-01 |
| Total unique GW names (Q column) | 258 (includes typos, name variations, and duplicates) |

### Confirmed Status Enum (Column A) — All Values

| Value | Count | Meaning |
|-------|-------|---------|
| Done | 3,359 | Completed |
| Open | 645 | Active |
| On hold | 4 | Paused |
| Bye | 1 | Customer left / no longer proceeding |
| Storno | 1 | Order cancelled |

> ⚠️ Previously documented as only 3 values (Done/Open/On hold). "Bye" and "Storno" are additional cancellation states.

### Confirmed GW Payment Status (Column S) — All 8 Values

| Value | English | Meaning |
|-------|---------|---------|
| Arbeit im Gange | Work in progress | GW is working; no payment yet |
| Ausgezahlt | Paid out | GW has been paid in full |
| Gutgeschrieben | Credited | Payment credited (distinct from Ausgezahlt — possibly internal accounting difference) |
| Keine Auszahlung | No payment | Berat self-assigned — no GW to pay |
| Noch nicht ausgezahlt; Rechnung liegt vor | Not yet paid; invoice received | GW sent invoice, payment pending |
| Nur Teilauszahlung | Only partial payment | GW received partial payment |
| Rechnung fehlt | Invoice missing | GW has not yet sent their invoice |
| Storniert | Cancelled | Assignment cancelled |

### LQ Column (V) — Confirmed: Lead Source / Acquisition Channel

**LQ = Lead Quelle** (Lead Source). Tracks which marketing channel brought the customer.

| Value | Count | Likely Meaning |
|-------|-------|----------------|
| ef1 | 315 | efactory1.de website (direct/organic) |
| av | 41 | Unknown — likely a specific ad/referral channel |
| ac | 25 | Unknown — likely a specific ad/referral channel |
| ws1 | 18 | WhatsApp (source 1?) |
| sp1 | 13 | Unknown — possibly Sponsored 1 |
| b1 | 13 | Unknown — possibly Bewertungsportal 1 (review platform) |
| ig | 11 | Instagram |
| ebay | 1 | eBay Kleinanzeigen |

> Note: Only 438 of 3,510 orders have an LQ value — the column was likely added partway through the business. Older orders (pre-2024 roughly) have no LQ entry. Closes O-04.

### GW Rate Range — Corrected from xlsx

> Previously documented range (0.30–0.60) was based on Berat's WhatsApp statement. Actual data shows:

| Rate | Orders | Cumulative % |
|------|--------|-------------|
| 0.33 | 33 | 1% |
| 0.34 | 309 | 12% |
| 0.35 | 359 | 25% |
| 0.36 | 214 | 33% |
| 0.38–0.39 | 131 | 38% |
| **0.40** | **435** | **53% — most common** |
| 0.41–0.44 | 227 | 62% |
| 0.45–0.50 | 823 | 91% |
| 0.51–0.62 | 104 | 95%+ |

**Actual range: 0.33 – 0.62. Peak at 0.40 (435 orders). 90%+ of orders fall between 0.34 and 0.50.**

### Work Types — Full List

The `Art der Arbeit` field (Column I) has ~200 distinct string values due to free-text entry. Core normalized types:

| Core Type | Count | Notes |
|-----------|-------|-------|
| Hausarbeit | ~1,950+ | Many variants: "Hausarbeit mit R", "Hausarbeit IU", "2 Hausarbeiten", etc. |
| Bachelorarbeit | ~760+ | Including "Bachelorarbeit Lektorat", "Bachelorarbeit Englisch", etc. |
| Masterarbeit | ~210+ | Including "Masterarbeit Englisch", "Masterarbeit Überarbeitung", etc. |
| Präsentation | ~75+ | Including "PowerPoint", "Präsi" |
| Facharbeit | ~60+ | Including "Facharbeit Schule", "Facharbeit Ausbildung" |
| Projektarbeit | ~45+ | Including "Projektarbeit IHK", "Projektarbeit (SiP)" |
| Doktorarbeit | ~35+ | Including "Doktorarbeit Lektorat", "Dissertation" |
| Expose | ~35+ | Including "Expose Masterarbeit", "Kurzexpose" |
| Seminararbeit | ~25+ | |
| Diplomarbeit | ~25+ | Including "Diplomarbeit Schweiz" |
| Lektorat | ~20+ | Editing/proofreading services |
| Workbook | ~25+ | IU Workbooks |
| Formatierung | ~5 | Formatting-only service |
| Other/Mixed | ~50+ | Essays, Case Studies, Reports, etc. |

> **Platform implication:** The work type field MUST be normalized to a controlled enum in the DB. The current free-text approach creates unmergeable data. ~200 string variants map to ~15 canonical types.

### Installment / Rate Payment Structure

| Installment count | Orders | % |
|-------------------|--------|---|
| 0 rates paid | 522 | 15% |
| 1 installment | 1,904 | 54% |
| 2 installments | 1,249 | 36% |
| 3 installments | 235 | 7% |
| 4 installments | 67 | 2% |
| 5 installments | 33 | 1% |

> Most orders (54%) are single-payment. Installment plans (2–5 rates) are used for 46% of orders. The rates L–P always sum to the gross price K when fully paid.

### Honorar / GW Payment Amount (Column T) Coverage

- Column T filled: **2,898 orders** (82%)
- Column T empty: **1,112 orders** (18%) — predominantly early orders (2022) where Berat did all work himself, or records where GW payment was not tracked

### Paper Title and Field of Study — NOT in Sheet #1

> Critical gap: Paper title (Titel der Arbeit) and field of study (Fachbereich) do NOT appear as columns in `#1 Bestellungen` (confirmed: columns A–V have no title or subject field). These fields exist ONLY in `#3 Zuweisungen der Bestellungen` (columns D and E).

This means for data migration: the paper title must be sourced from `#3`, not `#1`.

### Columns Beyond V — Confirmed Empty

The xlsx has placeholder columns W through AE but all are empty. Column V (LQ) is definitively the last meaningful column.

---

## What is Still Unknown

| Item | Status |
|------|--------|
| ~~LQ column (V) — exact meaning~~ | ✅ **Closed** — Lead Quelle (Lead Source). See values above. |
| What determines GW rate (0.33–0.62 range) | Open — P-01 — rate negotiated per order/GW |
| Exact conditional formatting rules | Pending review with Abdurrahman |
| 'av', 'ac', 'sp1', 'b1' lead source meanings | Open — ask Berat |
| "Gutgeschrieben" (= Credited) vs "Ausgezahlt" (= Paid Out) — accounting distinction | Open |
