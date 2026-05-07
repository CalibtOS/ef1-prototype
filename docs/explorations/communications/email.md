# Email Proxy — Options Comparison
> Layer 1 (proxy mechanics) of the communication system. See [`_overview.md`](_overview.md).
> How email feeds into the unified chat: [`unified_chat.md`](unified_chat.md)
> Full open questions: [`../../open_questions.md`](../../open_questions.md)
> Status: **Provider confirmed** — Cloudflare catch-all + Workers (D-15, May 1). Full implementation design below.
> Last updated: April 29, 2026

> **Pattern alignment (Apr 29):** the email proxy must support the Kleinanzeigen-style flow — every received email gets parsed into a chat entry, and outbound notifications carry the per-order reply address. See [`unified_chat.md`](unified_chat.md) for the cross-channel pattern.

---

## The Problem to Solve

Customers and GWs currently exchange emails directly. The platform needs to:
1. Intercept every email between them
2. Log it for Berat's visibility
3. Apply moderation (hold, flag, or block if needed)
4. Forward it to the real recipient without revealing their actual address

---

## Options

### Option A — Catch-All Inbound Webhook ⭐ Leading

**How it works:**
A wildcard MX record on a platform-controlled domain (`*@efactory1.de`) routes all inbound mail to one handler endpoint. The platform generates per-order proxy addresses on the fly — no DNS setup needed per address.

```
Customer → job-3491-c@efactory1.de
                ↓
        Platform inbound handler
        (receives via webhook)
                ↓
        Log + moderation check
                ↓
        Forward to GW's real address
        (Reply-To: job-3491-c@efactory1.de)
```

Per order, two addresses are auto-generated:

| Address | Used by | Forwards to |
|---------|---------|------------|
| `job-{id}-c@efactory1.de` | Customer | Platform → GW |
| `job-{id}-gw@efactory1.de` | GW | Platform → Customer |

**Why it works:** Same principle as Ferhat's wildcard subdomain (`*.calibtos.com`) — the catch-all rule means any address at that domain is automatically valid without explicit creation.

**Pros:**
- No per-address setup — scales to unlimited orders automatically
- Full message interception before delivery
- Reply-To chaining keeps the proxy transparent to both parties
- Inbound webhook gives platform full control over every message

**Cons:**
- Requires owning and configuring an email domain with MX records
- Outbound sending must appear to come from the proxy address (needs DKIM/SPF setup per domain)
- Inbound email provider must be selected and contracted

**Inbound routing: Cloudflare ✅ Confirmed (D-15)**

Cloudflare Email Workers handle all inbound routing. An Email Worker (serverless function) triggers on email receipt and makes an HTTP fetch() to the platform backend — identical to the pattern Ferhat already runs on kalibna.xyz. No separate email provider is needed for inbound.

Previously evaluated providers (for reference — not selected):

| Provider | Inbound webhook | Notes |
|----------|----------------|-------|
| Resend | ✅ | Evaluated — Cloudflare Workers makes this redundant |
| Postmark | ✅ | Evaluated — same |
| Mailgun | ✅ | Evaluated — same |
| Amazon SES + Lambda | ✅ | Evaluated — same |

**Remaining open questions:**
- Outbound: which provider sends the forwarded emails from the backend? (TBD — separate from inbound routing)
- Cloudflare email routing cost at Berat's email volume? (see [`open_questions.md`](../../open_questions.md) C-21)
- Use `efactory1.de` or a separate dedicated domain for proxy addresses? (see [`open_questions.md`](../../open_questions.md) C-22)

---

### Option B — Email Forwarding Rules on Existing Domain

**How it works:**
Set up explicit forwarding rules in the existing email host (e.g. Google Workspace, Namecheap). Each unique proxy address is manually registered and configured to forward to the platform or the recipient.

**Pros:**
- No new infrastructure — uses existing email host
- Simple to set up for a small fixed number of addresses

**Cons:**
- Does NOT scale — every new order pattern needs a manual rule
- Cannot intercept content before forwarding (just redirects)
- No moderation capability — platform never sees the message body
- Breaks the man-in-the-middle requirement entirely for moderation

**Assessment:** Rejected as a path — fails the moderation requirement. Documented for completeness.

---

### Option C — Dedicated Mailbox per Order

**How it works:**
Create an actual email mailbox for each order in an email hosting service. Platform polls the mailbox (IMAP) or receives webhook notifications.

**Pros:**
- Maximum isolation — each order is genuinely separate
- Standard email tooling works without custom handling

**Cons:**
- Does not scale — thousands of mailboxes for thousands of orders
- Cost per mailbox adds up quickly
- IMAP polling introduces latency
- Significantly more infrastructure overhead than Option A

**Assessment:** Over-engineered for this use case. Option A achieves the same result with zero mailbox overhead.

---

## Comparison Table

| Criterion | Option A (Catch-All) | Option B (Forwarding) | Option C (Per-Mailbox) |
|-----------|---------------------|----------------------|----------------------|
| Scales automatically | ✅ | ❌ | ❌ |
| Full message interception | ✅ | ❌ | ✅ |
| Moderation possible | ✅ | ❌ | ✅ |
| Infrastructure complexity | Low | Very Low | High |
| Cost at scale | Very low | Low | High |
| Setup effort | Medium (DNS + provider) | Low | High |
| **Fits requirements** | ✅ Yes | ❌ No | ✅ Yes (but overkill) |

---

## Leading Approach Summary

**Option A** is confirmed. Inbound routing is settled (Cloudflare + Workers, D-15). Remaining work:
1. ~~Selecting an inbound email provider~~ — Cloudflare confirmed
2. ~~Confirming `efactory1.de` MX records~~ — Cloudflare handles this
3. Selecting an outbound sending provider (forwarding leg)
4. Setting up DKIM/SPF for outbound from proxy addresses
5. Decide: use `efactory1.de` or a dedicated proxy domain?

**Architecture precision (Ferhat, May 1):** The system does NOT create or provision email addresses. Any email arriving at the catch-all domain is valid — the Cloudflare Worker resolves the job ID in the address against the DB (is this a valid, active job with a GW assigned?). Nothing is provisioned per order.

→ Open questions: [`open_questions.md`](../../open_questions.md) — C-21, C-22

---

## Implementation Design — Option A (Proxy Model)

> Reference for team presentations and implementation planning. Design is settled — remaining work is provider selection and DNS setup.

---

### Core Principle

Users **never** email each other directly. All communication goes through platform-controlled proxy addresses. The platform intercepts, validates, stores, and forwards. Email is the transport; the platform is the record.

---

### Address Model

Per order, two proxy addresses are auto-generated (no DNS setup needed per order — catch-all handles them all):

| Address | Used by | Forwards to |
|---------|---------|-------------|
| `job-{id}-c@efactory1.de` | Customer (reply point) | Platform → GW |
| `job-{id}-gw@efactory1.de` | GW (reply point) | Platform → Customer |

---

### Order Lifecycle (communication layer)

```
Order Created
    ↓
Payment Completed
    ↓
GW Assigned  ← trigger
    ↓
Send 2 bootstrap emails
    ↓
Users reply via their email client
    ↓
System intercepts → validates → stores → forwards
    ↓
Loop continues indefinitely
```

---

### Bootstrap Phase

The moment a GW is assigned, two emails go out simultaneously. This opens the thread in each user's inbox and injects the proxy address invisibly via Reply-To.

**Email to Ghostwriter**
```
To:       gw@email.com
From:     platform@efactory1.de
Reply-To: job-3491-gw@efactory1.de
```

**Email to Customer**
```
To:       customer@email.com
From:     platform@efactory1.de
Reply-To: job-3491-c@efactory1.de
```

What this achieves:
- Opens a thread in both inboxes
- Gives each user a working Reply button as their entry point
- No user action required to start using the proxy

---

### Reply Flow (GW → Customer)

```
GW clicks "Reply"
    ↓
Email arrives at: job-3491-gw@efactory1.de
    ↓
Email provider (MX) → webhook → backend

Backend pipeline:
  1. Parse address → orderId=3491, role=gw
  2. Load conversation
  3. Validate sender (must match GW email on record)
  4. Strip quoted history from body
  5. Store ChatEntry
  6. Forward to Customer
     To:       customer@email.com
     Reply-To: job-3491-c@efactory1.de  ← closes the loop
```

Customer's reply goes to `job-3491-c@efactory1.de`, runs through the same pipeline, and forwards to GW. The loop is self-sustaining.

---

### Inbound Webhook Handler

```javascript
app.post("/webhook/email", async (req, res) => {
  const { to, from, text } = req.body;
  const { orderId, role } = parseAddress(to);
  const conversation = await db.getConversation(orderId);

  if (!isValidSender(from, role, conversation)) {
    return quarantine(req.body);
  }

  const clean = cleanEmail(text);

  await db.chatEntry.create({ orderId, sender: from, content: clean });

  const target = role === "gw"
    ? conversation.customerEmail
    : conversation.gwEmail;

  await email.send({ to: target, replyTo: to, text: clean });
  res.sendStatus(200);
});

function parseAddress(to) {
  const match = to.match(/job-(\d+)-(c|gw)@/);
  return { orderId: match[1], role: match[2] === "c" ? "customer" : "gw" };
}

function isValidSender(from, role, conversation) {
  const expected = role === "gw" ? conversation.gwEmail : conversation.customerEmail;
  return normalize(from) === normalize(expected);
}
```

Note: `replyTo: to` — `to` here is the proxy address the message arrived at. Setting it as Reply-To on the forwarded message is what closes the routing loop for the recipient.

---

### Email Cleaning

Raw incoming bodies include quoted history:

```
Sure, I will do it.
On Monday, GW wrote:
> previous message
```

Only the new content is stored. Use a dedicated parser library — do not build quote-stripping manually.

---

### Security Model

| Check | Failure action |
|-------|----------------|
| Address matches `job-{id}-(c\|gw)@efactory1.de` format | Reject |
| Sender email matches expected user for that role | Quarantine |
| Webhook signature from email provider valid | Reject before processing |

Sender validation runs before any storage or forwarding. Quarantine means the message is held for admin review, not silently dropped.

---

### What Must NOT Happen

- Real user email addresses exposed to the other party
- Users typing proxy addresses manually (bootstrap phase handles this)
- Sender validation skipped
- Raw email stored without stripping quoted history
- Messages forwarded without passing through the platform

---

### Known Production Issues to Resolve

The following will break this system in staging and must be addressed before go-live:

- **Duplicate webhooks** — email providers retry on timeout; handler must be idempotent
- **Email loops** — a misconfigured Reply-To can cause the system to email itself indefinitely
- **Threading headers** — without `In-Reply-To` and `References` headers, Gmail/Outlook create a new thread per forwarded message instead of keeping one thread
- **Subject line** — hardcoding a generic subject breaks threading; forward the original subject consistently
- **HTML bodies** — handler must process `html` field, not only `text`
- **Retry storms** — provider retries on 5xx; return 200 after quarantine, not an error code
