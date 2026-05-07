# Employee (Service Worker) Access Control — Exploration
> Part of the RE phase explorations.
> Parent: [`_overview.md`](_overview.md) · Full open questions: [`open_questions.md`](../open_questions.md)
> Status: **Exploring** — framework direction set by Ferhat (Apr 29). Exact rules undefined — Berat input required.
> Last updated: April 29, 2026

---

## Context

Berat can employ or outsource tasks to co-workers. These are not ghostwriters (who are external contractors) and not admins (who have full access). They are internal employees performing specific operational tasks.

**Current state:** No such role exists. Everything is either Berat (full access) or the external-facing GW/Customer roles.

**Problem this solves:** Berat wants to delegate without giving employees the power to harm the system or see data beyond what their task requires.

---

## Confirmed Direction (Ferhat, Apr 29)

Two principles were established:

1. **Least privilege + aggregated data:** Employees see only what they need. Personal data is never shown raw — always computed into a confirmation (e.g. "age ≥18: yes" instead of date of birth).

2. **Action validation before execution:** Before an employee action executes, it is classified and either auto-executed, flagged, held for Berat's approval, or auto-blocked.

These are directions, not implementation specs. The exact permission matrix and thresholds remain undefined.

---

## Role Hypothesis

### Working name: `service_worker`

A role between Customer and Admin in the permission hierarchy:

```
Admin (Berat)        — full access, all capabilities
        ↓
service_worker       — scoped access, restricted actions, validated operations
        ↓
GW (ghostwriter)     — access to their own jobs only
        ↓
Customer             — access to their own orders only
```

**What service_workers might do** (examples, not confirmed):
- Review customer communication that's been flagged by moderation
- Update order status fields
- Respond to customer messages on Berat's behalf
- Check GW delivery status
- Process bank transfer payment confirmations

**What they must NOT be able to do** (examples, not confirmed):
- See GW payment rates or financial details
- See customer's personal data beyond what's needed for their task
- Initiate refunds or invoice cancellations without Berat confirmation
- Access orders not assigned to their scope

---

## Data Access Hypothesis

### Principle: Aggregated Confirmations Over Raw Data

Instead of exposing raw personal data, the platform computes and surfaces only what the employee's task requires:

| Raw data in DB | What service_worker sees |
|---------------|------------------------|
| Date of birth: 15.03.2001 | "Age verified: ≥18 ✓" |
| Full address | "Delivery region: Germany ✓" |
| Bank IBAN | "Bank transfer confirmed" |
| GW payment rate: 45% | Hidden — not visible to service_worker |
| Customer email | Only if their task requires contact |
| Customer phone | Only if their task requires contact |

**Why this matters for GDPR:** Data minimization is a legal requirement under Art. 5(1)(c) GDPR. The platform should not transmit personal data to employees who don't need it.

---

## Action Validation Hypothesis

### The 4-Tier Model

Before a service_worker action executes, it is classified:

| Tier | What triggers it | System response |
|------|-----------------|----------------|
| ✅ **Auto-execute** | Clearly routine, low-stakes action | Runs immediately, logged |
| ⚠️ **Flag + execute** | Unusual but likely valid | Runs + notification sent to Berat |
| 🔒 **Hold for approval** | Potentially harmful, rare | Execution paused + Berat asked to confirm/reject |
| ❌ **Auto-block** | Clear rule violation | Rejected + Berat notified + employee notified with reason |

**Examples (hypothetical, not confirmed):**
- Marking an order note as "reviewed" → Auto-execute
- Sending a message to a customer for an order outside working hours → Flag + execute
- Cancelling an invoice → Hold for approval
- Sharing a customer's full contact details with an external party → Auto-block

### Open Question: Who defines the tier boundaries?

The tier classification logic requires explicit rules. This cannot be designed without knowing:
- What specific actions service_workers will perform
- What Berat considers harmful vs routine
- Whether AI classification (e.g. GPT scoring actions) is involved or pure rule-based

→ Needs Berat input. See [`open_questions.md`](../open_questions.md).

---

## Message Moderation Hypothesis

Before a message from a service_worker (or GW) is forwarded to a customer, it could be scanned for:

| Flag type | Example trigger | Proposed outcome |
|-----------|----------------|-----------------|
| Direct contact info shared | "You can reach me at 0151-XXXXXXX" | Hold for review |
| Off-platform deal solicitation | "Next time, contact me directly" | Auto-block |
| Platform bypass attempt | "Here's my personal PayPal" | Auto-block |
| Unprofessional tone | Aggressive or rude language | Flag + notify Berat |
| Inappropriate content | Discriminatory or offensive content | Auto-block |

**Implementation options:**
- **Rule-based:** Regex/keyword matching for known patterns (fast, cheap, brittle)
- **AI classification:** LLM scores the message against a rubric (flexible, expensive, slower)
- **Hybrid:** Rules for obvious cases, AI for nuanced ones

**This is a later-phase feature — not v1.** The platform ships without message moderation initially. Moderation is designed now so the architecture can accommodate it later without rework.

---

## Options to Decide

| Decision area | Options | Status |
|---------------|---------|--------|
| Role name | `service_worker` / `employee` / `staff` / `operator` | Not decided — needs team naming discussion (D-05) |
| Permission model | Per-route vs per-field vs per-action | Not decided — per-field is most flexible but most complex |
| Action validation | Rule-based tiers vs AI scoring vs hybrid | Not decided — needs Berat input on what actions matter |
| Message moderation | Rule-based vs AI vs hybrid | Not decided — later phase; no urgency now |
| Data access scope | Hardcoded per task vs configurable per employee | Not decided |

---

## What's Needed Before This Can Be Specified

1. **Berat must define:** What tasks will employees actually perform? (Without this, we can't design the permission matrix)
2. **Berat must define:** Which actions require his confirmation vs can be auto-executed?
3. **Team must agree:** Naming convention for the role (D-05 applies)
4. **Legal input:** GDPR data minimization — which fields are legally sensitive and require aggregation?

→ See [`open_questions.md`](../open_questions.md) — Employee access section
