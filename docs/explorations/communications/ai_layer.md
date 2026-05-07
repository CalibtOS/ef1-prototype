# AI Layer — Intelligence on Top of Communications
> Layer 3 of the communication system. See [`_overview.md`](_overview.md).
> Status: **Exploring** — features documented for Berat review; v1 ships without most of these. RE-phase principle (Ferhat): document everything we *could* do, then explicitly whitelist what's in scope.
> Last updated: April 29, 2026

---

## Scope and Constraint

The AI layer operates on the **unified chat stream** ([`unified_chat.md`](unified_chat.md)) — that's where every email, WhatsApp message, and web chat is captured.

**Important exclusion:** Phone calls are **out of scope** for inline AI semantic analysis in v1. Reason: call recording in Germany requires explicit consent, and the legal/business risk (customers may decline → revenue impact) is high. Voice metadata (duration, completion, navigation) is still tracked and AI-analyzable; the spoken content is not.

→ See `voice.md` for the recording dilemma.

---

## Feature Catalog (All Options on the Table)

Per Ferhat's RE-phase principle, every option is documented even if v1 ships without it. Each feature has its own decision path.

### Feature A — Single-Message Sentiment Analysis

**What:** Score each new message on emotional tone (positive / neutral / negative / hostile).

**Context required:** None — works on the message body alone.

**Trigger example:** Customer message contains hostile language → Berat alerted before GW responds.

**Cost / complexity:** Low. Off-the-shelf sentiment APIs (or a small local model) handle this cheaply.

**Why include:** The simplest AI feature with the highest ratio of value to risk. Catches dispute-bound conversations before they escalate.

---

### Feature B — Contextual Miscommunication Detection

**What:** Detect contradictions between a new message and earlier ones in the same order's history.

**Context required:** Full conversation history for that order + master prompt describing what "miscommunication" looks like in ghostwriting context.

**Trigger example:** GW sent draft yesterday; customer says today "you never sent anything" → flag as possible miscommunication, surface both messages to Berat.

**Cost / complexity:** Medium. Requires a model with a good context window and a carefully written master prompt. Higher per-call cost than sentiment.

**Why include:** Ferhat: *"highly contextual... I will be able to detect something like this with a good master prompt."* Catches issues that single-message scanning would miss.

---

### Feature C — AI-Suggested Replies (Context-Aware)

**What:** Generate a draft reply for the GW (or Berat) based on conversation history + order metadata (deadline, page count, GW assigned, current progress, work type).

**Context required:** Full chat + order record + GW profile.

**Trigger example:** Customer asks "where are we with my order?" → AI drafts a reply pulling current progress, days remaining, last delivery, next milestone.

**Cost / complexity:** Medium-high. Requires LLM with order data injected into prompt.

**Why include:** Reduces response latency for common questions. Suggestion is never sent automatically — see Feature D.

---

### Feature D — Human-in-the-Loop Dashboard

**What:** When the AI flags an issue (sentiment alert, miscommunication, suggested reply), it surfaces in an admin dashboard. Berat or an employee reviews → clicks **Yes** to send / take action, or **No** to dismiss.

**Architecture:**

```
AI signal triggers
        ↓
Item appears on HIL queue with:
  • The raw event (message content, call event, etc.)
  • The AI's interpretation
  • The suggested action (or "no action, just FYI")
  • Yes / No buttons
        ↓
User clicks Yes  → action executes (send message, create task, etc.)
User clicks No   → dismissed, logged for AI feedback loop
```

**Why include:** Decoupling AI suggestion from execution is the safe pattern. The AI never sends a customer-visible message without a human approving. This addresses Ismail's concern about over-trusting AI.

---

### Feature E — Proactive Task Generation from Behavior Patterns

**What:** When the system detects an incomplete user journey, automatically create a follow-up task.

**Context required:** Call metadata, IVR navigation logs, web session events.

**Trigger examples:**
- Customer entered IVR, picked an order, then hung up before connecting to GW → task: "Customer #123 dropped IVR mid-flow — call back"
- Customer logged in, opened the offer page 3 times, never accepted → task: "Customer #123 hesitating on offer — proactive outreach"

**Cost / complexity:** Low. Mostly rule-based; no LLM needed.

**Why include:** Ferhat: *"hey, the person left it without actually concluding what you wanted to do... please try to call a person to ensure no issues."*

---

### Feature F — Conversation Summarization

**What:** On demand, generate a 3-sentence summary of an order's chat history for a new admin / employee picking it up.

**Context required:** Full chat history.

**Cost / complexity:** Low (single LLM call).

**Why include:** Ismail mentioned summarization as an obvious useful feature.

---

## Architecture Question: One Big Model vs Many Small Models

Ismail raised this as a load concern. Both approaches are viable:

| Approach | Pros | Cons |
|----------|------|------|
| **One big model** (e.g. GPT-4-class) handles all features | Simpler infrastructure; one API contract; better contextual reasoning | Higher per-request cost; overkill for sentiment and pattern detection |
| **Many specialized models** (small sentiment model + LLM for replies + rules engine for tasks) | Cheap on routine work; specialized accuracy | More infra to manage; multiple model contracts; integration complexity |
| **Hybrid (likely path)** | Cheap features use rules / small models; LLM only for genuinely contextual work (replies, miscommunication) | Best cost-quality tradeoff | Most architectural complexity |

**Decision deferred** — depends on which features actually ship in v1.

---

## v1 Scope Hypothesis

Per Ferhat's whitelist/blacklist principle, all features above are documented. The question to Berat is which to include in v1.

**Recommended v1 scope (engineering opinion, not yet decided):**

| Feature | v1? | Reason |
|---------|-----|--------|
| A — Sentiment | ✅ Maybe | Low cost, high value, low risk |
| B — Miscommunication | ❌ Defer | Requires master prompt tuning + human review system |
| C — Suggested replies | ❌ Defer | Risk of bad output; requires solid HIL first |
| D — HIL dashboard | ✅ Yes (if any AI ships) | Foundational — every AI feature feeds this |
| E — Proactive tasks (rule-based) | ✅ Yes | No AI needed, immediate value |
| F — Summarization | ❌ Defer | Nice-to-have, not blocking |

**Whitelist for v1:** Features A, D, E
**Blacklist for v1 (with reasons documented):** B, C, F → schedule for v2 once HIL is proven

---

## Open Questions

| # | Question | Owner |
|---|----------|-------|
| AI-01 | What rules trigger HIL alerts vs auto-action? | Berat + team |
| AI-02 | Where's the boundary between "rule-based pattern detection" and "needs LLM"? | Team |
| AI-03 | Per-feature cost ceiling? (€X/month/order before we throttle?) | Berat budget input |
| AI-04 | Master prompt for miscommunication detection — who writes / owns it? | Team |
| AI-05 | Phone calls excluded from semantic analysis — confirmed? Or do we want metadata-based heuristics? | Berat |

→ Tracked in [`../../open_questions.md`](../../open_questions.md) — Section 5

---

## Why This Layer Is Documented Now Even Though Most Features Are Deferred

Ferhat's RE-phase rule (re-stated in this meeting): *"It's not about saying 'hey, everything else is not what we want to do'. It's saying 'hey, this could be everything else — and we're actively deciding against this part because of that and that'... that's white and blacklisting."*

If we don't catalog AI options now, we'll re-debate them in 6 months. By documenting them all and explicitly marking what's in/out of v1 scope, Berat can sign off once and we don't lose information.
