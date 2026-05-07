# eFactory — Draft Database Schema
> Status: **Draft** — RE phase. Do not implement until Berat confirms open questions and Ferhat signs off on Figma screens (D-04).
> Domain model derived from spreadsheet structure (sheets contain sample/fake data — not for migration).
> Related: [`source/sheets_analysis.md`](source/sheets_analysis.md) · [`business_rules.md`](business_rules.md) · [`open_questions.md`](open_questions.md)
> Last updated: May 2, 2026

---

## Sheet → Table Mapping

| Sheet | Maps to | Relationship |
|-------|---------|-------------|
| `#1 Bestellungen` (Orders) | `orders` + `payments` | One order row → one orders row + up to 5 payments rows |
| `#3 Zuweisungen der Bestellungen` (GW Assignment View) | `assignments` + supplements `orders` | One assignment row → one assignments row; title/field_of_study go into orders |
| `#2 Infos für Autor/Kunde` (Info for Author / Customer) | Not a table — email templates stored in config/code | Static email templates |
| `Formulare ef1` (eFactory1 Forms / Workflow Links) | Not a table — workflow links config | Static URL reference |

---

## Entity Relationship Overview

```
customers (from Pipedrive)
    │
    │ 1:N
    ▼
  orders ──────────────────── 1:N ──── payments
    │         (customer installments)
    │ 1:1
    ▼
assignments
    │
    │ N:1
    ▼
ghostwriters
```

---

## Table Definitions

### `customers`

> Customer data is the source of truth in **Pipedrive**. This table is a local mirror for join purposes.

```sql
CREATE TABLE customers (
  id                   SERIAL PRIMARY KEY,
  pipedrive_contact_id INTEGER UNIQUE,           -- Pipedrive contact ID
  pipedrive_deal_id    INTEGER,                  -- Pipedrive deal ID (latest active deal)
  name                 VARCHAR(255) NOT NULL,    -- Full name (Vor- und Nachname = first and last name)
  email                VARCHAR(255),
  phone                VARCHAR(50),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

**Source:** Pipedrive contacts (not directly in the spreadsheet — customer name from column C of #1 is first+last only).

---

### `orders`

> Central entity. Maps directly from `#1 Bestellungen` (Orders).

```sql
CREATE TABLE orders (
  id                     SERIAL PRIMARY KEY,
  customer_id            INTEGER REFERENCES customers(id),
  status                 VARCHAR(20) NOT NULL,    -- Enum: done | open | on_hold | bye | cancelled
  accepted_at            DATE,                    -- Date order was received
  intermediate_deadline  DATE,                    -- Intermediate / partial delivery date
  final_deadline         DATE,                    -- Final submission deadline
  work_type              VARCHAR(50),             -- Normalized enum, see below
  page_count             INTEGER,                 -- Planned page/scope count
  gross_price            NUMERIC(10,2),           -- Total price incl. 7% VAT
  paper_title            TEXT,                    -- Thesis/paper title (may be null if not provided)
  field_of_study         VARCHAR(150),            -- Field of study (may be null if not provided)
  lead_source            VARCHAR(20),             -- Lead source / acquisition channel
  internal_notes         TEXT,                    -- Free-text internal notes
  sevdesk_invoice_id     VARCHAR(50),             -- External: Sevdesk invoice reference
  pipedrive_deal_id      INTEGER,                 -- External: Pipedrive deal reference
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
```

**Computed at query time (do NOT store):**
- `days_until_intermediate` = `intermediate_deadline - CURRENT_DATE` (column G)
- `days_until_final` = `final_deadline - CURRENT_DATE` (column H)
- `net_price` = `gross_price / 1.07`
- `total_paid` = `SUM(payments.amount WHERE is_paid = true)` for this order
- `outstanding_balance` = `gross_price - total_paid`

**`work_type` enum — canonical values (normalized from ~200 raw strings):**

| Canonical Value | English Meaning | Maps from (examples) |
|----------------|-----------------|---------------------|
| hausarbeit | Term paper / coursework | Hausarbeit, Hausarbeit mit R, Hausarbeit IU, 2 Hausarbeiten, etc. |
| bachelorarbeit | Bachelor's thesis | Bachelorarbeit, Bachelorarbeit Lektorat, Bachelorarbeit Englisch, etc. |
| masterarbeit | Master's thesis | Masterarbeit, Masterarbeit Englisch, Masterarbeit Überarbeitung, etc. |
| doktorarbeit | Doctoral thesis / PhD dissertation | Doktorarbeit, Dissertation, Doktorarbeit Lektorat, etc. |
| diplomarbeit | Diploma thesis (pre-Bologna German degree, roughly equivalent to a Master's) | Diplomarbeit, Diplomarbeit Schweiz, Diplom |
| seminararbeit | Seminar paper | Seminararbeit, Seminararbeit (Englisch) |
| facharbeit | Technical/vocational paper (high school or apprenticeship level) | Facharbeit, Facharbeit Schule, Facharbeit Ausbildung |
| projektarbeit | Project report / project work | Projektarbeit, Projektarbeit IHK, Projektbericht, Praxisbericht |
| expose | Research proposal / outline | Expose, Expose Masterarbeit, Expose Bachelorarbeit, Kurzexpose |
| praesentation | Presentation / slideshow | Präsentation, PowerPoint, Präsi, Poster |
| lektorat | Proofreading / editing service | Lektorat, Lektorat Master, Lektorat Bachelorarbeit |
| workbook | Workbook (IU-specific course assignment booklet) | Workbook, Workbook IU, Workbook der IU |
| formatierung | Formatting-only service | Formatierung, Formatierung Hausarbeit |
| coaching | Academic coaching / exam prep (Klausurvorbereitung = exam preparation) | Coaching, Bachelorarbeit Coaching, Klausurvorbereitung |
| sonstiges | Other / miscellaneous | Essay, Case Study, Paper, Article, Statistik, etc. |

> ⚠️ Open question O-07: Berat must confirm the canonical list.

**`status` enum:**

| DB Value | Spreadsheet Value | Meaning |
|----------|-----------------|---------|
| done | Done | Completed |
| open | Open | Active |
| on_hold | On hold | Paused |
| bye | Bye | Customer withdrew |
| cancelled | Storno | Order cancelled |

---

### `ghostwriters`

```sql
CREATE TABLE ghostwriters (
  id                SERIAL PRIMARY KEY,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100),
  email             VARCHAR(255) UNIQUE NOT NULL,
  phone             VARCHAR(50),
  expertise_tags    TEXT[],               -- Array of field strings (replaces Berat's mental model)
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `assignments`

> One assignment per order. Maps from columns Q, R, S, T of `#1 Bestellungen` (Orders) + columns L, M, J of `#3 Zuweisungen` (GW Assignment View).

```sql
CREATE TABLE assignments (
  id                   SERIAL PRIMARY KEY,
  order_id             INTEGER UNIQUE REFERENCES orders(id),  -- 1:1 with orders
  ghostwriter_id       INTEGER REFERENCES ghostwriters(id),   -- null if NICHT ZUGETEILT
  assignment_status    VARCHAR(30) NOT NULL,                  -- R: not_assigned | assigned
  net_honorarium       NUMERIC(10,2),                        -- T: Honorar für Autor:in (= Honorarium / payment amount for the Author/GW)
  gw_payment_status    VARCHAR(50),                          -- S: see enum below
  efactory_notes       TEXT,                                 -- From #3 col J: Weitere Notiz von efactory1.de (additional notes from efactory1.de)
  assigned_at          TIMESTAMPTZ,                          -- When Berat made the assignment
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

**`assignment_status` enum:**

| DB Value | Spreadsheet Value |
|----------|-----------------|
| not_assigned | NICHT ZUGETEILT (Not assigned) |
| assigned | Autor zugeteilt (Author / GW has been assigned) |

**`gw_payment_status` enum:**

| DB Value | Spreadsheet Value | Meaning |
|----------|-----------------|---------|
| in_progress | Arbeit im Gange | GW working, not yet paid |
| paid | Ausgezahlt | GW paid in full |
| credited | Gutgeschrieben | Payment credited (accounting) |
| no_payment | Keine Auszahlung | Self-assigned — no GW payment |
| invoice_received | Noch nicht ausgezahlt; Rechnung liegt vor | Invoice received, pending payment |
| partial_paid | Nur Teilauszahlung | Partial payment made |
| invoice_missing | Rechnung fehlt | GW hasn't sent invoice |
| cancelled | Storniert | Assignment cancelled |

---

### `payments`

> Customer installment payments. Maps from columns L–P of `#1 Bestellungen`.

```sql
CREATE TABLE payments (
  id                   SERIAL PRIMARY KEY,
  order_id             INTEGER REFERENCES orders(id) NOT NULL,
  installment_number   SMALLINT NOT NULL CHECK (installment_number BETWEEN 1 AND 5),
  amount               NUMERIC(10,2) NOT NULL,
  is_paid              BOOLEAN DEFAULT FALSE,    -- Yellow cell highlight in spreadsheet
  paid_at              TIMESTAMPTZ,              -- Not tracked in spreadsheet; captured by platform
  stripe_payment_id    VARCHAR(100),             -- Stripe PaymentIntent ID (if paid via Stripe)
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, installment_number)
);
```

---

## Computed vs Stored — Decision Table

| Data Point | Stored or Computed | Reason |
|-----------|-------------------|--------|
| gross_price | **Stored** | Agreed customer price; source of truth |
| net_price | **Computed** = gross_price / 1.07 | Always derivable |
| net_honorarium | **Stored** | The rate is baked in; can't recompute without knowing the rate at time of assignment |
| gw_rate | **Computed** = net_honorarium / (gross_price / 1.07) | Derivable from stored values |
| days_until_intermediate | **Computed** = intermediate_deadline - today | Always current |
| days_until_final | **Computed** = final_deadline - today | Always current |
| total_customer_paid | **Computed** = SUM(payments.amount WHERE is_paid) | Aggregated |
| outstanding_balance | **Computed** = gross_price - total_customer_paid | Derived |
| installment amounts (Rate 1-5) | **Stored** in payments table | Manually negotiated; not derivable from formula |

---

## Relationships Summary

| From | To | Type | Notes |
|------|----|------|-------|
| customers | orders | 1:N | One customer can have many orders (confirmed in data) |
| orders | assignments | 1:1 | One assignment per order |
| assignments | ghostwriters | N:1 | Many assignments per GW |
| orders | payments | 1:N | Up to 5 installments per order |
| orders | customers (via Pipedrive) | N:1 | Many orders per customer; Pipedrive is customer SoT |

---

## What Is NOT Modeled Here (Deferred)

| Feature | Reason deferred |
|---------|----------------|
| GW expertise tags schema | Berat input needed on how to categorize fields (open question E-01) |
| Communication messages table | Architecture being explored (E-01–E-08 in decisions_log) |
| Order revision / correction loop tracking | Not in current spreadsheet; v2 feature |
| GW job board (NICHT ZUGETEILT orders) | UX being explored; DB field `assignment_status` is the hook |
| Customer portal accounts | Authentication design not started |
| Multi-currency / country fields | Deferred to i18n phase (D-13, E-09) |

