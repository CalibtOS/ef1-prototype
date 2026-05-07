# Exploration: AI-Powered BI Dashboard
> Status: **High-confidence direction** — Ferhat described in detail (May 2, 2026); not yet confirmed as a formal decision
> Related exploration entry: E-11 in [`decisions_log.md`](../decisions_log.md)
> Last updated: May 2, 2026

---

## What Is This

An AI-powered analytics and business intelligence layer inside the platform that allows Berat to get data insights through natural language prompts — without writing SQL or knowing the data model.

---

## The Core Idea (As Described by Ferhat, May 2)

1. Berat writes a natural language prompt (e.g. "show me all orders this month where the GW hasn't been paid")
2. The platform auto-generates the SQL query against the database
3. The platform auto-generates a UI view (table, chart, summary) to display the result
4. Because the prompt is run through a master prompt context (business rules, entity relationships, column meanings), the generated queries are high-quality and business-aware — not generic

This is what existing BI tools (Power BI, Tableau, etc.) are trying to do with AI, but built custom for efactory1's specific schema and business domain.

---

## Why This Matters for the Business

- **Primary value:** Berat gets insight into his own data that he never had before — without being a data analyst or SQL expert
- **Secondary value:** Reduces the cognitive load of running the business — he can query anything without manual spreadsheet work
- **Reference comparison:** Standard BI tools give broad query capability but are unfocused. This system is focused on efactory1's specific entities and business rules → higher quality outputs from the same prompts

---

## How It Differs from Generic AI + Database Tools

Generic approach (e.g., ChatGPT + a database):
- Produces generic SQL that may reference wrong columns, misunderstand business logic
- UI output is unpredictable
- No domain context about what "Gesamtpreis" means vs "Honorar" vs "Rate 1–5"

This system's advantage:
- **Master prompt context** pre-loads all entity definitions, column meanings, business rules, and relationships
- **Hard constraints** (what can and cannot be queried, how certain fields should be presented) come from the same business logic that drives the rest of the platform
- Result: auto-generated SQL + auto-generated UI that is domain-accurate, not just syntactically valid

---

## Candidate Implementation Approaches

> These are options, not decisions. All remain open.

### Option A — Backend LLM query generation + predefined UI components
- Backend receives the prompt
- LLM generates SQL with master prompt context injected
- SQL runs against the DB via a read-only query interface
- Result set is classified by LLM (table? number? chart?) → renders in a pre-built UI component

**Pros:** Controlled; easier to test; no arbitrary HTML generation
**Cons:** UI component library limits what can be displayed

### Option B — Full HTML generation (as Ferhat described)
- Same as Option A but LLM also generates the HTML/UI for the view
- More flexible; can produce any layout
- Ferhat specifically mentioned "auto-generated view for it" suggesting this direction

**Pros:** Maximum flexibility; view can match the specific query result
**Cons:** LLM-generated HTML is harder to secure and test; may produce inconsistent designs

### Option C — Natural language → pre-built dashboard widget
- Prompt triggers selection from a set of pre-defined analytics queries
- No ad-hoc SQL; prompts are matched to templates
- Much safer but less flexible

**Pros:** Predictable, testable, no SQL injection risk
**Cons:** Limited to what was pre-built; doesn't fulfill Ferhat's vision of open-ended querying

---

## Open Questions

| # | Question | Owner |
|---|----------|-------|
| BI-01 | Which specific queries / views does Berat actually need most? | 👤 Berat |
| BI-02 | Read-only access only? Or can prompts trigger actions (e.g. "mark all overdue invoices")? | 👤 Berat + Ferhat |
| BI-03 | SQL injection + security model for LLM-generated queries — how do we sandbox? | 🔧 Team |
| BI-04 | Which LLM? Claude API (with prompt caching for master context) vs OpenAI vs local? | 🔧 Ferhat |
| BI-05 | Is this v1 scope or a later phase? | 👤 Berat + Ferhat |

---

## Relationship to Other Platform Components

- **Unified chat view (D-11):** Separate feature — the BI dashboard is about data analytics, not communication
- **Flamingo analytics (D-10):** Flamingo is Phase 0, standalone. The BI dashboard is part of the main platform and works on the core data model
- **Communication AI layer (E-07):** Different — E-07 is about real-time sentiment/miscommunication detection in messages; E-11 is about historical data querying

---

## What Is NOT Decided

- Whether this is v1 or a later phase
- Which LLM provider
- Whether UI is pre-built components or LLM-generated HTML
- Whether prompts can trigger write operations
- Security model for query sandboxing
