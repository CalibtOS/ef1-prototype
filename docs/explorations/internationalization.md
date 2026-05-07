# Internationalization & Localization
> Status: **Confirmed direction (Ferhat, Apr 29)** — implementation specifics open.
> Last updated: April 29, 2026

---

## Confirmed Direction

Ferhat (Apr 29): the platform must be designed for international markets from day 1. This is a first-class architectural concern, not a v2 retrofit.

**Confirmed:**
- App developed in **English by default**
- **Localization files** (i18n resource files) for translation — same pattern as ATC platform
- Architecture must accommodate **multiple currencies**
- Architecture must accommodate **country-specific business rules** (e.g. different invoice requirements, different payment habits)

---

## What This Affects

Because i18n is a first-class concern, decisions in many other areas must consider it:

| Area | Internationalization implication |
|------|--------------------------------|
| **UI / copy** | All user-facing strings in resource files; never hardcoded |
| **Currency** | Order prices, GW payments, invoices — all currency-aware. See [`payment_methods.md`](payment_methods.md) |
| **Date / time** | Locale-aware formatting (DD.MM.YYYY for DE; MM/DD/YYYY for US; etc.) |
| **VAT / Tax** | 7% educational services in DE; different rules elsewhere → tax engine must be country-aware |
| **Invoice content** | German Rechnung has specific legal requirements (§14 UStG); other countries differ |
| **Email templates** | Per-locale templates, not just translated strings |
| **Phone numbers** | International format storage (E.164); local display per recipient |
| **Bank accounts** | DE customers pay to a DE IBAN; non-DE customers may pay differently |
| **Voice / IVR** | Language menus per region; local-format numbers |

---

## Open Architectural Choices

### Choice 1 — Single platform, locale switch

**How:** One deployment. User sees content in their selected language. Currency / tax rules driven by their order's country field.

**Pros:** One codebase, one DB, one ops surface.
**Cons:** All country-specific logic is conditional code paths. Tight coupling.

---

### Choice 2 — Multi-tenant per country

**How:** Same codebase, different deployments per country. Each instance has its own DB and configuration. Customers use the deployment for their country.

**Pros:** Cleaner separation; legally independent; easier to comply with country-specific regulations (e.g. data residency).
**Cons:** Operational overhead × N countries; cross-country reporting harder.

---

### Choice 3 — Country variants of the UI but shared backend

**How:** Same backend handles all countries; the UI is rendered differently per country to match local conventions and legal requirements (e.g. country A shows VAT inclusive, country B shows VAT separately).

**Pros:** Best UX per country without DB fragmentation.
**Cons:** UI complexity grows per country.

---

### Comparison Table

| Criterion | Choice 1 (Single + locale) | Choice 2 (Multi-tenant) | Choice 3 (UI variants, shared BE) |
|-----------|---------------------------|------------------------|---------------------------------|
| Engineering complexity | Medium | High | Medium-high |
| Compliance fit | Hard above 2 countries | ✅ Best | Medium |
| Cross-country reporting | ✅ Easy | Hard | ✅ Easy |
| Adding a new country | Add locale + tax rules | Spin up deployment | Add UI variant + tax rules |
| Best for | 2–3 similar markets | Strict per-country compliance | UX-driven differentiation |

**No decision yet.** Likely depends on which markets Berat actually wants to enter.

---

## Currency Handling — Sub-Decision

Ferhat described two patterns:

1. **Single bank account + payment gateway converts** — most websites do this. One DE IBAN; gateway handles foreign currencies and converts. Simple ops.
2. **Multiple bank accounts per country** — customers transfer to a local IBAN matching their country. Lower fees, may match customer expectations in certain markets.

**Hybrid is likely:** primary single-account-via-gateway, with optional country-specific bank accounts for high-volume markets.

→ Full payment treatment in [`payment_methods.md`](payment_methods.md).

---

## Open Questions

| # | Question | Owner |
|---|----------|-------|
| I18N-01 | Which countries / languages does Berat want to support? Priority order? | 👤 Berat |
| I18N-02 | Per-country invoicing legal requirements — research scope | 👤 Berat + legal |
| I18N-03 | Architecture choice (1 vs 2 vs 3) — depends on which markets | Team after Berat |
| I18N-04 | Localization stack: which i18n library / framework? | 🔧 Team |
| I18N-05 | Translation management: human translators? AI? Hybrid? | Berat budget input |

→ Tracked in [`../open_questions.md`](../open_questions.md)

---

## Why This Is Documented Now Even Though v1 May Be DE-Only

Ferhat's RE-phase principle: document what we *could* do even if we won't do it in v1. The architecture must not paint us into a corner. If we hardcode DE-only assumptions in v1, retrofitting i18n later costs significantly more than designing for it from the start.
