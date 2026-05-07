# WhatsApp Proxy — Options Comparison
> Part of the Communication Proxy exploration.
> Parent: [`_overview.md`](../_overview.md) · Full open questions: [`open_questions.md`](../../open_questions.md)
> Status: **Exploring** — Option A (group-per-order) is leading. Option B (virtual numbers) under research by Yasser.
> Last updated: April 29, 2026

---

## The Problem to Solve

WhatsApp is a primary communication channel between customers and GWs. The platform needs to:
1. Sit between both parties so neither has the other's phone number
2. Handle a GW who works on multiple simultaneous orders (separate threads per order)
3. Handle a customer who may place multiple orders over time (separate threads per order)
4. Log all messages for Berat's visibility
5. Apply moderation before forwarding

Unlike email, you cannot generate a new WhatsApp "address" on the fly — WhatsApp is tied to phone numbers.

---

## Options

### Option A — WhatsApp Group Per Order (Headless Browser) ⭐ Leading

**How it works:**
Each order gets two WhatsApp groups created by a bot:

```
Order #3491:
  Group A: [Customer phone] + [Bot account]  →  "efactory – Yanik #3491"
  Group B: [GW phone]       + [Bot account]  →  "efactory – Yanik #3491 (GW)"

Message flow:
  Customer writes in Group A
      ↓
  Bot receives message
      ↓
  Moderation check
      ↓
  Bot forwards to Group B (GW receives)

  GW writes in Group B
      ↓
  Bot receives, moderates, forwards to Group A
```

The bot controls a WhatsApp account via **WhatsApp Web automation (Puppeteer / headless Chromium)**. Group creation, message reading, and message sending all happen through the browser session.

**Existing prototype:** Marwan built a working WhatsApp Web bot at `wa.calibtos.com`, running in a Docker container on the ATC SSH server. The group creation capability is technically feasible.

**Why groups and not direct DM with the bot:**
A GW handling three orders would have one chat thread with the bot where all three orders' messages mix. Groups give each order its own clearly labelled thread. Same for a customer with multiple orders over time.

**Pros:**
- Works today — prototype already exists
- No per-group cost
- Clear per-order isolation in both parties' WhatsApp
- Bot can read, moderate, and selectively forward

**Cons:**
- Violates WhatsApp Terms of Service (automation via unofficial API)
- Headless browser sessions can break when WhatsApp updates its web client
- Puppeteer maintenance overhead
- Bot phone number could get banned by WhatsApp
- Session management complexity (re-auth when session expires)

**Risk mitigation options for ToS:**
- Use WhatsApp Business App (manual) as fallback if bot gets banned
- Keep bot activity low-profile (no mass messaging, only respond/relay)
- Have a manual failover process documented

---

### Option B — Virtual Phone Number Per Order (Under Research)

**How it works:**
Each order is assigned a dedicated virtual phone number. The customer DMs this number directly on WhatsApp. The platform receives the message, moderates, and relays to the GW's real number (and vice versa).

```
Order #3491 gets phone number: +49 151 XXXX YYYY

Customer messages +49 151 XXXX YYYY
        ↓
Platform receives (via Voice API or SMS gateway)
        ↓
Moderation + relay to GW's real number
        ↓
GW replies to platform number → relayed to customer
```

**Pros:**
- Cleaner UX — customer DMs a number directly, no group
- No WhatsApp ToS risk (if using official WhatsApp Business API per number)
- More like how Twilio-based platforms work

**Cons:**
- Cost: virtual phone numbers cost ~€1–3/month each. At 100 active orders, that's €100–300/month just in numbers — and numbers may need to stay active post-completion for support
- Feasibility unclear: WhatsApp does not allow you to freely add any phone number as a WhatsApp account — the number must receive an SMS/call for verification. Virtual numbers from Twilio/Telnyx can receive SMS, so this may work, but it needs testing
- Operational complexity: number pool management, number recycling after order completion, re-verification if numbers are recycled
- Scale: at 3,500+ historical orders, archiving or releasing numbers is non-trivial

**Research owner:** Yasser — verify: (1) can Twilio/Telnyx virtual numbers be registered on WhatsApp? (2) cost per number per month? (3) can numbers be reused after an order closes?

---

### Option D — Direct Bot DM (Fallback to Option A)

**How it works:**
Same bot as Option A, but no groups. Customer and GW each have a direct WhatsApp conversation with the bot. The bot routes messages between them based on internal session state.

```
Order #3491:
  Customer ↔ Bot (DM)
  GW       ↔ Bot (DM)

Bot internal state: "this DM thread = customer-side of order 3491"
                    "that DM thread = GW-side of order 3491"

Message flow:
  Customer DMs bot
     ↓
  Bot reads → moderates → forwards to GW (in their DM with bot)
```

**When this is needed:**
If group creation gets blocked (WhatsApp may flag bots that create groups at high volume), or if Yusuf's bot prototype can't reliably create groups, falling back to per-party DMs is the natural Plan B.

**Pros:**
- Simpler bot implementation — no group lifecycle management
- Lower group-creation footprint (less likely to get banned for group abuse)
- Yusuf's existing bot can already write to a known DM thread (confirmed Apr 29)

**Cons:**
- A GW with multiple orders sees one mixed DM thread with the bot — bot must prepend `[Order 3491]` to every forwarded message
- Same for a customer with multiple orders over time
- UX worse than groups: parties see a faceless bot, not a labeled per-order channel

**Status:** Documented as fallback. Stays in scope while Option A is in active prototype. Becomes primary if Option A's group creation fails at scale.

---

### Option C — WhatsApp Business API (Official Meta API) — Assessed & Set Aside

**How it works:**
Meta offers an official WhatsApp Business API for registered businesses. Messages are sent and received programmatically with no ToS risk.

**Why it was considered:**
Official, stable, no ban risk.

**Why it doesn't fit this use case:**
- The Business API is designed for 1:many broadcast (e.g. notifications, support) — not 1:1 isolated per-order threads
- Cannot create new "conversations" freely: customers must initiate, or the business must use pre-approved message templates
- No native concept of per-order isolation — all messages from a customer go through one business number
- The platform would need to manage per-order context through session state, which recreates the problem Option A solves with groups
- Cost: per-conversation pricing adds up
- Verification and approval process with Meta takes weeks

**Assessment:** Does not fit the per-order isolation requirement. May be useful for outbound notifications (e.g. "your order has been assigned") but not for the full proxy communication channel.

---

## Comparison Table

| Criterion | Option A (Groups) | Option B (Virtual Numbers) | Option C (Business API) | Option D (Direct DM Fallback) |
|-----------|------------------|--------------------------|------------------------|------------------------------|
| Per-order isolation | ✅ Groups | ✅ Numbers | ❌ Needs workaround | ⚠️ Bot tags messages with order ID |
| WhatsApp ToS compliant | ❌ No | ✅ Yes | ✅ Yes | ❌ No (same ToS as A) |
| Cost per order | None | ~€1–3/month | Per-conversation | None |
| Full message interception | ✅ | ✅ | ✅ | ✅ |
| Moderation possible | ✅ | ✅ | ✅ | ✅ |
| Prototype exists | ✅ Marwan / Yusuf | ❌ | ❌ | ✅ (subset of A) |
| Stability risk | High (ToS / group creation flagged) | Low | Very Low | Medium (DMs less flagged than groups) |
| Research needed | None | Yes (Yasser) | No (assessed, rejected) | None |
| **Fits requirements** | ✅ (with risk) | ⏳ Unknown until researched | ❌ No | ✅ (with worse UX) |

---

## Decision Path

```
Option B research complete (Yasser)
        ↓
If Option B is feasible and cost-acceptable → evaluate Option A vs B
If Option B is not feasible → Option A by default (with ToS risk acknowledged)
        ↓
Team + Ferhat confirm approach
        ↓
Graduate to decisions_log.md
```

→ Open questions: [`open_questions.md`](../../open_questions.md) — WhatsApp section
