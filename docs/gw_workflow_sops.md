# eFactory — GW Workflow SOPs
> **Sources:**
> - Notion GW Dashboard — all sections (Allgemeine Zusammenarbeit, Ablauf, Kommunikation). Written by Berat Özdemir for ghostwriters.
> - Official English translation PDF: `efactory1_author_dashboard_translation.pdf` (26 pages, prepared May 5, 2026)
> - URL: https://efactory1.notion.site/efactory1-Dashboard-f-r-Autor-innen-7e234b5b5ead404aa75eb7c668794762
> **Status:** Confirmed — Berat's own written SOPs. All 11 sub-pages now fully documented. Treat as binding business logic.
> Raw German text → [`source/notion_gw_dashboard.md`](source/notion_gw_dashboard.md)
> Confirmed rules extracted → [`business_rules.md`](business_rules.md) §11–12
> Closed open questions: N-01, N-02, N-03, N-04, N-05, N-06, N-07, N-08
> Last updated: May 6, 2026

---

## Overview

All 11 Notion sub-pages are now fully documented. The dashboard has 3 sections — General Collaboration (SOPs A–C), Workflow/Ablauf (SOPs 1–6), and Communication (SOPs D–E). Together they define the complete GW operating model the platform must replicate.

### Section A — Allgemeine Zusammenarbeit (General Collaboration)

| # | SOP | German Title | Platform Module |
|---|-----|--------------|-----------------|
| A | [Workflow with Clients](#sop-a-workflow-with-clients) | Ablauf mit Kund:innen | GW portal global rules — deadlines, quality, GDPR |
| B | [Missed Deadlines / Illness](#sop-b-missed-deadlines--illness) | Nichteinhaltung von Terminen bei Krankheit | Admin → Delay notification flow |
| C | [Successful Collaboration](#sop-c-successful-collaboration) | Erfolgreiche Zusammenarbeit mit Kunden | GW profile + onboarding guidelines |

### Section 1–6 — Ablauf (Workflow)

| # | SOP | German Title | Platform Module |
|---|-----|--------------|-----------------|
| 1 | [Accepting an Order](#1-accepting-an-order) | Annahme von Aufträgen bei efactory1 | GW Portal → Job Board → Claim Job |
| 2 | [Uploading an Interim Draft](#2-uploading-an-interim-draft) | Hochladen eines Zwischenstands | GW Portal → Interim Submission |
| 3 | [Uploading Final Work + Invoice](#3-uploading-final-work--invoice) | Hochladen der finalen Mustervorlage und Rechnung | GW Portal → Final Submission |
| 4 | [Fee Payment](#4-fee-payment) | Auszahlung des Honorars bei efactory1 | Admin → Payment Release |
| 5 | [Handling Negative Feedback](#5-handling-negative-feedback) | Umgang mit negativem Feedback | Admin → Dispute / Revision Flow |
| 6 | [Order Extensions + Additional Invoices](#6-order-extensions--additional-invoices) | Auftragserweiterung und Zusatzrechnungen | GW Portal → Extension Request |

### Section D–E — Kommunikation (Communication)

| # | SOP | German Title | Platform Module |
|---|-----|--------------|-----------------|
| D | [First Contact with Clients](#sop-d-first-contact-with-clients) | Erstkontakt mit Kunden | GW Portal → Assignment accepted → First contact checklist |
| E | [Quality Assurance by GW](#sop-e-quality-assurance-by-ghostwriters) | Qualitätssicherung durch Ghostwriter | Submission gate → QA checklist → efactory1 QA team review |

---

## 1. Accepting an Order

**German title:** Annahme von Aufträgen bei efactory1
**Current WordPress form:** https://efactory1.de/ghostwriter-dashboard/

### Purpose
Standardized procedure for a GW to formally claim a job — including reviewing details, confirming eligibility, agreeing to terms, and waiting for efactory1's approval before starting work.

### Flowchart

```
[GW sees job on Notion board]
        │
        ▼
[GW reviews order details]
    - Order ID
    - Delivery deadline
    - Subject area / field
    - Paper topic
    - Offered fee (Honorar)
        │
        ▼
[GW self-checks eligibility]
    - Do I have the required expertise?
    - Do I have capacity for this deadline?
        │
     Yes│                    │No
        │                    ▼
        │            [GW does not apply]
        ▼
[GW fills out acceptance form]
    Confirms:
    - Agreement to delivery deadlines
    - Agreement to the offered fee
    - No AI tools will be used
    - Work will be plagiarism-free
    - GDPR compliance (delete customer data after job ends)
    - Has read and agrees to AGBs + freelance contract
        │
        ▼
[GW submits form]
        │
        ▼
[Berat receives submission — reviews + approves]
        │
        ▼
[efactory1 sends confirmation email to GW]
    Contains:
    - Formal job approval
    - All job details and materials
        │
        ▼
[GW confirms acceptance + begins work]
        │
        ▼
[GW documents all communications with efactory1 and customer]
[GW commits to delete all customer PII after job completion — GDPR]
```

### Key Business Rules Confirmed

| Rule | Detail |
|------|--------|
| GW cannot just start — must be approved | Submitting the form = signal of interest. efactory1 sends a confirmation email. Work begins only after that email. |
| GW self-selects based on expertise + capacity | No platform assignment algorithm at this step — GW initiative |
| Legal agreement at claim time | GW confirms AGBs + freelance contract at every single job claim |
| No AI, no plagiarism | Confirmed at claim time (not just at submission) |
| GDPR | GW must delete all customer PII after the job ends |

### Platform Implications

- The "Claim Job" button on the GW portal must trigger a **confirmation modal or form** where the GW actively checks:
  - Delivery deadline agreement
  - Fee agreement
  - No AI / no plagiarism checkbox
  - GDPR checkbox
  - AGBs agreement
- After submission, order status → **"Pending efactory1 approval"** — not "Active"
- Only after Berat approves (admin action) does the order become **"Active"** and GW can begin
- Platform sends the GW a **confirmation email** with full job details upon approval

---

## 2. Uploading an Interim Draft

**German title:** Hochladen eines Zwischenstands bei efactory1
**Current WordPress form:** https://efactory1.de/ghostwriter-zwischenstand/

### Purpose
Standardized procedure for uploading a partial draft (Zwischenstand) at the interim deadline. The submitted draft is **automatically forwarded to the customer** by the platform.

### Flowchart

```
[GW reaches interim deadline]
        │
        ▼
[GW prepares the interim draft]
    Checks:
    - Content matches agreed scope and requirements
    - File size ≤ 5 MB
    - File format: .doc / .pdf / .xls only
    - No AI tools used
    - Work is ready to be sent directly to customer
        │
        ▼
[GW visits upload platform / form]
        │
        ▼
[GW enters Order ID to identify the job]
        │
        ▼
[GW uploads file]
        │
        ▼
[GW confirms checkboxes]:
    ✓ No AI / no automated tools used
    ✓ Work is ready to be forwarded to customer in this state
    ✓ Understood and complying with efactory1 guidelines
        │
        ▼
[GW submits]
        │
        ▼
[Platform auto-sends draft to customer's email]
        │
        ▼
[GW receives confirmation of successful upload + forwarding]
        │
        ▼
[GW keeps a copy + stays available for customer feedback]
```

### Key Business Rules Confirmed

| Rule | Detail |
|------|--------|
| Auto-forward to customer | Interim draft is sent directly to customer upon upload — no manual step by Berat |
| GW must confirm "ready to send" | GW explicitly certifies the draft can go to the customer as-is |
| File constraints | Max 5 MB; formats: .doc, .pdf, .xls only |
| Order ID required | GW must enter the Order ID — this is how the platform links the upload to the correct order |
| No AI — confirmed again at upload | GW re-confirms no AI use at every submission, not just at claim |

### Platform Implications

- Interim submission must accept **Order ID as input** to link upload to order
- After submission, platform **automatically emails the draft to the customer** — Berat does not need to forward it manually
- Upload form must have explicit **checkboxes** (no AI, ready-to-send, guidelines understood)
- GW receives upload confirmation (email or in-portal notification)
- Order status → **"Interim submitted — awaiting customer feedback"**
- Platform must enforce file type (.doc, .pdf, .xls) and size (5 MB max) server-side

---

## 3. Uploading Final Work + Invoice

**German title:** Hochladen der finalen Mustervorlage und Rechnung
**Current WordPress form:** https://efactory1.de/ghostwriter-endstand/

### Purpose
Procedure for submitting the finished work AND the fee invoice simultaneously. After upload, efactory1 receives the work and then forwards it to the customer. The GW's payment process begins from here.

### Flowchart

```
[GW completes the final work]
        │
        ▼
[GW prepares TWO documents]:
    1. Final template (Mustervorlage)
       - Meets customer requirements
       - Plagiarism-free
       - File ≤ 5 MB, format: .doc / .pdf / .xls
    2. Fee invoice (Honorarrechnung)
       - Contains all required billing information
       - Addressed to: Bery Ventures GmbH, c/o WeWork Friesenplatz 4, 50672 Köln
       - File ≤ 5 MB
        │
        ▼
[GW visits upload platform / form]
        │
        ▼
[GW uploads both files]
        │
        ▼
[GW confirms checkboxes]:
    ✓ Final work created without AI / automated tools
    ✓ Work can be sent to customer as-is (final state)
    ✓ Work is individually created — not a copy
        │
        ▼
[GW submits]
        │
        ▼
[Platform sends final work to efactory1]
        │
        ▼
[efactory1 reviews → forwards to customer]
        │
        ▼
[GW receives confirmation of upload + processing]
        │
        ▼
[GW keeps copies of both files + confirmations]
        │
        ▼
[GW waits for efactory1 confirmation and payment processing]
```

### Key Business Rules Confirmed

| Rule | Detail |
|------|--------|
| Final work goes to efactory1 first — not directly to customer | Unlike interim (auto-forwarded), the final is reviewed by efactory1 before reaching the customer |
| Invoice submitted at the same time as the work | Both files uploaded together in the same form — not two separate steps |
| Legal invoice address | Bery Ventures GmbH, c/o WeWork Friesenplatz 4, 50672 Köln |
| GW explicitly confirms "individually created" | Not just no-AI — also not a copy/reused work |
| Three confirmations required at final submission | No AI, ready to send as-is, individually created |

### Platform Implications

- Final submission form needs **two file upload fields**: one for the work, one for the invoice
- After submission, order status → **"Final submitted — pending efactory1 review"**
- Platform does NOT auto-forward to customer — Berat reviews first (admin action required)
- Invoice address must be shown on the upload screen so GWs address the invoice correctly
- Revision rounds can begin after efactory1 forwards to customer — see SOP 5
- Payment process starts only after customer satisfaction confirmed — see SOP 4

---

## 4. Fee Payment

**German title:** Auszahlung des Honorars bei efactory1
**Current WordPress form:** https://efactory1.de/ghostwriter-endstand/ (same as final upload)

### Purpose
Defines the exact conditions under which efactory1 releases the GW fee. Payment is conditional — not automatic after submission.

### Flowchart

```
[GW has uploaded final work + invoice — SOP 3 complete]
        │
        ▼
[efactory1 checks customer satisfaction]
    Evaluates:
    - Quality of the work
    - Academic level / standard
    - Plagiarism-free (checked)
    - No AI-generated content (checked)
        │
        ▼
[efactory1 communicates with customer — collects feedback]
        │
   Satisfied?
     Yes │                         │ No / Issues
         ▼                         ▼
[efactory1 creates              [efactory1 creates review report]
 review report —                [GW is informed of issues]
 confirms satisfaction]         [GW corrects / revises]
         │                              │
         │◄─────────────────────────────┘
         │         (revision loop)
         ▼
[efactory1 approves payment — "Freigabe"]
    Conditions ALL met:
    ✓ Customer satisfied
    ✓ No quality issues
    ✓ No plagiarism issues
    ✓ No AI issues
    ✓ Revision rounds complete
        │
        ▼
[GW invoice is processed]
        │
        ▼
[Payment sent to GW via agreed payment method]
    Within the agreed timeframe after approval
        │
        ▼
[efactory1 sends payment confirmation to GW]
    Contains transaction details for GW records
        │
        ▼
[Both parties archive all documents + communications]
```

### Key Excerpts from AGBs (Terms & Conditions) Confirmed

| AGB Section | Rule |
|-------------|------|
| §1.2 + §1.3 — Vergütung und Fälligkeit | Fee amount fixed in advance. Payment due within **30 days** of invoice after job completion. |
| §13 + §14 — Bedingungen für die Auszahlung | Quality must meet agreed standards. No plagiarism, no AI. Violations → work not paid. |
| §5.2 — Recht auf Nacharbeit | If client reports defects, GW must fix immediately. Payment can be delayed until fully compliant. |
| §6 — Verantwortung und Haftung | GW liability for damages is capped at the agreed fee amount. |
| §13.3 — Überprüfung und Freigabe | efactory1 reserves the right to check quality and authenticity. Payment only after positive review AND customer satisfaction. |
| §1.6 — Korrekte Rechnungsstellung | GW is responsible for correct invoicing and for their own tax obligations. |

### Key Business Rules Confirmed

| Rule | Detail |
|------|--------|
| Payment is NOT automatic after submission | Payment only happens after efactory1 confirms customer satisfaction |
| efactory1 creates a review report | Formal documentation of customer satisfaction or issues before any payment |
| Payment withheld during disputes | Any unresolved quality / AI / plagiarism issue blocks payment |
| Revision loop before payment | GW fixes issues → resubmits → efactory1 re-reviews → customer re-confirms. Repeats until satisfied. |
| Payment within 30 days of invoice (per AGBs) | Once approved, payment must be processed within 30 days |
| If revisions repeatedly fail | efactory1 can reassign the order to a different GW (and withhold payment from original GW) |

### Platform Implications

- Admin needs a **"Payment Review" screen** per order showing:
  - Customer satisfaction status
  - Quality check status (plagiarism, AI)
  - Revision round status
  - Invoice details
- Three-way release gate: customer satisfied ✓ + quality approved ✓ + revisions complete ✓ → "Release Payment" button unlocks
- Platform must support the **revision loop**: GW re-uploads → efactory1 re-reviews → status updated
- Payment confirmation notification sent to GW after release
- 30-day payment SLA from invoice receipt must be tracked

---

## 5. Handling Negative Feedback

**German title:** Umgang mit negativem Feedback
**Current platform:** Managed via email/WhatsApp by Berat (no dedicated form)

### Purpose
Defines how negative customer feedback is handled, how revision work is tracked, and under what conditions payment is suspended.

### Flowchart

```
[Customer gives negative feedback on submitted work]
        │
        ▼
[efactory1 receives feedback]
        │
        ▼
[efactory1 immediately forwards feedback to GW]
        │
        ▼
[GW reads and understands feedback carefully]
[GW shows understanding of customer perspective]
        │
        ▼
[GW analyzes feedback]
    - Identifies core problems
    - Plans concrete improvement steps
    - If unclear → consults efactory1 or customer
        │
        ▼
[GW carries out revision / Nacharbeit]
    - Makes corrections per feedback
    - Must be done quickly and thoroughly
        │
        ▼
[GW re-submits revised work via efactory1 platform]
[GW notifies efactory1 of re-submission]
        │
        ▼
[efactory1 + customer review revised work]
        │
   Satisfied?
     Yes │                         │ No — further feedback
         ▼                         ▼
[Customer satisfied —          [Further feedback given]
 payment unblocked]            [Loop repeats]
         │                              │
         │◄─────────────────────────────┘
         ▼
[Payment approved — see SOP 4]

        ⚠️ ESCALATION PATH:
[If after multiple revisions, major deficiencies remain]
        │
        ▼
[efactory1 takes action — options:]
    A. Extend payment suspension
    B. Reassign order to a different GW
       (original GW loses payment)
```

### Key Business Rules Confirmed

| Rule | Detail |
|------|--------|
| efactory1 is the intermediary | Customer never sends feedback directly to GW — always via efactory1 |
| GW must revise promptly | "Zügig und gründlich" — quickly and thoroughly |
| Payment suspended until customer is satisfied | Not just "submitted" — customer must explicitly confirm satisfaction |
| Escalation exists | After repeated failed revisions, efactory1 can reassign to another GW. Original GW forfeits payment. |
| All steps must be documented | Every feedback message, revision, and communication must be recorded |

### Platform Implications

- Admin needs a **Dispute / Feedback Thread** on each order — a place to log customer feedback and GW responses
- GW re-submission must be a **separate status** from original final submission ("Revision submitted — round N")
- Platform tracks **revision round count** — Berat can see how many rounds have occurred
- **"Customer satisfied" toggle** (admin-only) is what unblocks payment — not the GW's submission itself
- Escalation action needed: "Reassign order" button that transfers to a new GW and blocks original GW's payment

---

## 6. Order Extensions + Additional Invoices

**German title:** Auftragserweiterung und Zusatzrechnungen
**Current upload link:** Same as final template — https://efactory1.de/ghostwriter-endstand/

### Purpose
Defines how to handle scope changes during an active order — when the customer wants more pages, additional chapters, or extra work beyond the original scope.

### Flowchart

```
[During active order — GW or customer identifies need for more work]
    Examples: more pages, additional chapter, extended scope
        │
        ▼
[GW communicates to efactory1]
    Provides:
    - Description of the additional requirement
    - Estimated extra effort / hours / pages
        │
        ▼
⚠️ [GW can DECLINE the extension if no capacity]
        │
        ▼ (if GW accepts)
[efactory1 reviews request]
        │
        ▼
[efactory1 discusses extension with customer]
    Including: additional cost
        │
   Approved by customer?
     Yes │                    │ No
         ▼                    ▼
[efactory1 informs GW   [Extension dropped]
 of customer approval]
         │
         ▼
[GW performs additional work]
[GW documents extra effort carefully]
         │
         ▼
[GW creates detailed Zusatzrechnung (additional invoice)]
    Contains:
    - Scope of additional work
    - Corresponding costs (breakdown)
         │
         ▼
[GW uploads Zusatzrechnung via the final template upload link]
    (same form as SOP 3 — ghostwriter-endstand)
         │
         ▼
[Customer pays the additional invoice FIRST]
    ⚠️ Customer must pay BEFORE GW is paid for the extension
         │
         ▼
[After customer payment received → efactory1 forwards to GW]
         │
         ▼
[Both parties document and archive everything]
[efactory1 confirms successful completion of extension]
```

### Key Business Rules Confirmed

| Rule | Detail |
|------|--------|
| GW can refuse an extension | If no capacity — GW has the right to decline |
| Three-party approval required | GW flags need → efactory1 approves → customer approves → work begins |
| Customer pays extension FIRST | Extension fee must be fully paid by the customer before efactory1 pays the GW for the extra work |
| Same upload link as final submission | Zusatzrechnung uploaded via /ghostwriter-endstand/ — no separate form |
| Detailed breakdown required | Zusatzrechnung must itemize the scope and cost of additional work |

### Platform Implications

- GW portal needs an **"Extension Request" button** on active orders
- Extension request triggers a workflow: GW submits reason + estimate → Berat reviews → customer notified + approves → GW notified to proceed
- GW must be able to **decline** the extension from the portal
- Additional invoice uses the same **final submission upload**, but the order system must distinguish between "original final invoice" and "extension invoice"
- Payment for extension is gated on **customer payment received** — separate payment tracking entry per extension
- Extension history must be visible on the order detail screen

---

## SOP A: Workflow with Clients

**German title:** Ablauf mit Kund:innen
**Notion section:** Allgemeine Zusammenarbeit (General Collaboration)

### Purpose
General operating rules for how GWs manage their assignments — covering deadlines, quality, communication, and legal obligations. This is the foundational SOP every GW must follow.

### Key Rules Confirmed

#### Accepting an Assignment
- Carefully check subject area, topic, fee, and deadlines **before** accepting
- Confirm acceptance via the form with the work ID, agreeing to all conditions including **no AI use**

#### Meeting Deadlines ⚠️ NEW FACT
- Work must be uploaded **no later than the day before the due date**, and **before 18:00**
- If delays are foreseeable: inform **efactory1 AND the customer immediately** and propose new deadlines

#### Partial Deliveries (confirms business_rules.md §3)
- **3-delivery structure** (>20 pages): 1st date = 1/3 of work, 2nd date = 2/3, 3rd date = full scope
- **2-delivery structure** (≤20 pages): 1st date = half, 2nd date = full scope
- Structure ensures continuous quality control and customer + efactory1 are regularly informed

#### Quality of Work
- Create all works from scratch — plagiarism-free
- Use professional knowledge and expertise to create high-quality academic content
- Be prepared to respond to feedback from customer or efactory1 and make corrections promptly

#### Communication and Feedback
- Maintain regular contact with efactory1 and customer, provide updates and clarify questions promptly
- Be open to feedback — use it as an opportunity to improve

#### Legal and Ethical Obligations ⚠️ NEW FACTS
- Treat all personal customer data confidentially per GDPR — **delete it after assignment completion**
- Comply with contractual agreements: no AI, guarantee originality
- **Respect copyrights — works may not be used elsewhere without the client's express consent**

### Platform Implications
- Upload deadline enforcement: platform alerts GW when deadline is tomorrow (D-1 warning), not on the day itself
- Partial delivery structure must be calculated at order creation and shown clearly to GW
- GDPR compliance flag: platform should prompt GW to confirm data deletion upon order completion
- Copyright notice must be displayed on the submission screen

---

## SOP B: Missed Deadlines / Illness

**German title:** Nichteinhaltung von Terminen bei efactory1 bspw. bei Krankheit
**Notion section:** Allgemeine Zusammenarbeit (General Collaboration)

### Purpose
Standardized procedure for when a GW cannot meet a delivery deadline due to illness or other unforeseen circumstances. Ensures transparency and trust.

### Flowchart

```
[GW realizes delivery deadline cannot be met]
    (illness, emergency, or other unforeseen reason)
        │
        ▼
[GW acts IMMEDIATELY — no waiting]
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
[Email to CUSTOMER]                    [Email to kundenservice@efactory1.de]
  - Brief reason (e.g. illness)          - Customer name
  - Proposed new delivery date           - Order / assignment number
  - Ask for understanding                - Reason for delay
  - Signal willingness to deliver        - New expected delivery date
    as quickly as possible               - Whether customer has already been informed
        │                                          │
        └──────────────────┬───────────────────────┘
                           ▼
              [GW documents all communications]
                (proof for follow-up questions)
                           │
                           ▼
              [GW recovers — resumes work ASAP]
                           │
                           ▼
[GW informs BOTH customer AND efactory1 that work is resuming]
[GW drives work forward quickly per new schedule]
                           │
                           ▼
[GW delivers work]
                           │
                           ▼
[GW obtains confirmation from BOTH customer AND efactory1]
  - Delayed delivery was accepted
  - Work meets requirements
                           │
                           ▼
[GW collects feedback to improve future processes]
```

### Key Business Rules Confirmed

| Rule | Detail |
|------|--------|
| Both parties notified simultaneously | Customer AND kundenservice@efactory1.de must be informed at the same time — not sequentially |
| Email to efactory1 must include 4 fields | Customer name, order number, reason, new delivery date, whether customer already informed |
| GW must propose new date proactively | Not just report the delay — must propose when they'll deliver |
| After recovery: drive forward quickly | GW does not just resume quietly — must actively notify both parties work is back on track |
| Post-delivery: get double confirmation | Both customer AND efactory1 must confirm the delayed work was accepted |

### Platform Implications
- GW portal needs a **"Report Delay"** button on active orders
- Delay report form captures: reason, proposed new date → auto-notifies both customer and efactory1
- Order status → **"Delayed — new deadline [date]"** — visible to admin
- Admin alert when a delay is reported
- After delivery: platform prompts for confirmation from both sides before proceeding to payment flow

---

## SOP C: Successful Collaboration

**German title:** Erfolgreiche Zusammenarbeit mit Kunden bei efactory1
**Notion section:** Allgemeine Zusammenarbeit (General Collaboration)

### Purpose
Guide for GWs on how to ensure effective, transparent, and successful cooperation with customers. Goal: maximize customer satisfaction, ensure work quality, build long-term relationships.

### 6 Principles for Successful Collaboration

| # | Principle | Key points |
|---|-----------|-----------|
| 1 | **Communication and clarity** | Communicate professionally from the start. Fully understand customer requirements before starting. Keep customer informed. Remain reachable for questions. |
| 2 | **Time management and reliability** | Create a realistic schedule. Meet deadlines. If delays likely — inform customer AND efactory1 as early as possible. Use partial deliveries to make progress transparent. |
| 3 | **Quality and professionalism** | All content: high quality, meets customer requirements, plagiarism-free. No AI unless expressly permitted. |
| 4 | **Feedback and adaptability** | Be open to customer feedback. Implement required changes or improvements promptly. Use feedback to develop skills. |
| 5 | **Data protection and confidentiality** | All personal customer data strictly confidential per GDPR. Delete or return all personal data after completion unless legally required otherwise. |
| 6 | **Contract and terms compliance** | Always comply with efactory1 AGBs and specific contract agreements. Understand rights and obligations including copyright provisions and use of created works. |

### Review and Improvement
- After each project: carry out a self-assessment — what went well, where to improve
- Use efactory1 resources and training to continuously improve skills

### Platform Implications
- GW profile could include a self-assessment / rating history section
- Platform should surface efactory1 resources/training materials in the GW portal
- GDPR data deletion prompt at order completion (same as SOP A)

---

## SOP D: First Contact with Clients

**German title:** Erstkontakt mit Kunden
**Notion section:** Kommunikation (Communication)

### Purpose
Standardize the process of first contact between GWs and customers — ensuring clear, professional, and efficient communication from day one of the assignment.

### Flowchart

```
[GW receives efactory1 assignment email]
        │
        ▼
[Step 1: GW immediately replies to efactory1 email]
    Confirms receipt of the assignment
        │
        ▼
[Step 2: GW reviews the email carefully]
    - Assignment details
    - Customer contact data
    - Specified dates
    - If outlines / exposés attached → use for planning
        │
        ▼
[Step 3: GW writes professional email to CUSTOMER]
    Content:
    - Express acceptance of the project
    - Express understanding of the assignment
    - Express pleasure about the upcoming cooperation
    - Confirm: topic, scope, deadlines (to avoid misunderstandings)
    ⚠️ efactory1 is placed in CC on this email (and ALL future emails to customer)
        │
        ▼
[Step 4: GW clarifies requirements]
    Asks customer for:
    - Confirmation or further details on requirements
    - Topics, outlines, formatting guidelines, specific wishes
        │
        ▼
[Step 5: GW explains communication rules to customer]
    - Preferred contact channels and times for questions
    - Timely replies promised (with reference to GW's working hours + boundaries)
    - ⚠️ Interim drafts and final work uploaded via efactory1 platform — NEVER sent directly
        │
        ▼
[Step 6: Financial firewall]
    ⚠️ All questions about prices, payments, or invoices:
    Customer must contact efactory1 customer service DIRECTLY
    GW does NOT discuss money with customer
        │
        ▼
[Step 7: GW confirms next steps for customer]
    - Creating and uploading interim draft
    - Creating and uploading final work
    - Invoice creation after second partial delivery (if customer satisfied)
        │
        ▼
[Step 8: GW documents all communication]
    For internal purposes + quality and traceability
```

### Key Business Rules Confirmed ⚠️ ALL NEW

| Rule | Detail |
|------|--------|
| GW replies to efactory1 email first | Before contacting the customer, GW must confirm receipt to efactory1 by replying to the assignment email |
| efactory1 CC'd on ALL customer emails | Every single email from GW to customer must have efactory1 in CC — man-in-the-middle enforced at email level |
| Work never sent directly to customer | Interim drafts and final work only go via the efactory1 platform — GW explicitly tells the customer this |
| Financial firewall | GW never discusses prices, payments, or invoices with customer — all financial questions redirected to kundenservice@efactory1.de |
| Invoice timing | Invoice is created after the second partial delivery, if the customer is satisfied |
| GW sets communication boundaries | GW can state their own working hours/availability in the first contact email |

### Platform Implications
- Assignment email from platform should include a **"Reply to confirm receipt"** prompt
- GW portal first contact wizard: pre-filled email template with all required elements (CC field pre-set to efactory1, confirmation of topic/scope/dates)
- Platform must make the CC rule enforceable: if GW uses the platform's messaging, efactory1 is automatically included
- Financial question redirect: auto-reply or warning if customer asks GW about pricing in the platform chat
- GW availability/hours field on GW profile (shown to admin, referenced in first contact)

---

## SOP E: Quality Assurance by Ghostwriters

**German title:** Qualitätssicherung durch Ghostwriter
**Notion section:** Kommunikation (Communication)

### Purpose
Procedure for ensuring and checking the quality of GW-created works before submission — including GW self-check, efactory1 QA team review, and final approval before delivery to customer.

### Flowchart

```
[GW creates the work]
    - Per assignment requirements (topic, scope, formatting, deadlines)
    - Content: original, meets academic standards, plagiarism-free
        │
        ▼
[GW performs mandatory self-check BEFORE submission]
    ✓ Spelling and grammar
    ✓ Plagiarism check
    ✓ Customer-specific requirements met
    ✓ No obvious defects or errors
        │
        ▼
[GW submits work via efactory1 platform]
    + Declaration that work meets requirements and is plagiarism-free
        │
        ▼
[efactory1 QA team reviews submitted work]
    ⚠️ Dedicated QA team — not just Berat reviewing alone
    Checks:
    - Plagiarism (specialized software may be used)
    - Formatting requirements compliance
    - Content quality review
        │
   Pass?
    Yes │                          │ No — deficiencies found
        ▼                          ▼
[QA team approves]         [Work returned to GW with feedback]
        │                  [GW makes corrections / revisions]
        │                  [GW resubmits]
        │                  [Review loop repeats until standards met]
        │◄──────────────────────────┘
        ▼
[Approved work sent to customer]
    + Message: "quality check has been successfully completed"
        │
        ▼
[All QA steps documented and archived]
    (submitted versions, feedback, final approval)
    → Proof of QA; can be reviewed for future inquiries or audits
```

### Key Business Rules Confirmed ⚠️ ALL NEW

| Rule | Detail |
|------|--------|
| GW self-check is mandatory | Not optional — GW must check spelling, grammar, plagiarism, and requirements before every submission |
| efactory1 has a dedicated QA team | Not just Berat — there is a quality assurance team responsible for checking all submitted works |
| Specialized plagiarism software | efactory1 may use specialized software for plagiarism checks (not just manual review) |
| Customer-facing quality signal | When work reaches the customer, it comes with a message stating the quality check has been successfully completed |
| Full QA audit trail | All steps (submitted versions, feedback rounds, final approval) are archived and can be reviewed for audits |

### Platform Implications
- Submission form must include a **mandatory self-check declaration** checklist (spelling ✓, grammar ✓, plagiarism ✓, requirements ✓)
- Admin/QA team needs a **work review queue** — where submitted works appear for QA team to review before forwarding
- Platform must track each QA round (submission → feedback → revision → resubmission)
- When work is forwarded to customer: platform auto-attaches "quality check passed" confirmation message
- QA archive: all submission versions, feedback notes, approval records stored per order — viewable on order detail screen
- Plagiarism check integration: platform could integrate a plagiarism API (e.g. Turnitin, PlagScan) at submission gate

---

## Summary: Key New Facts for Platform Design

### Critical New Facts (from PDF — May 6, 2026)

| Fact | Source | Platform action |
|------|--------|-----------------|
| Upload deadline = **day before due date, before 18:00** (not on the day itself) | SOP A | D-1 warning alert; submission gate blocks on due date |
| GW must reply to efactory1 assignment email **before** contacting customer | SOP D | Assignment accepted → "Confirm receipt" prompt in portal |
| efactory1 CC'd on **every single email** GW sends to customer | SOP D | Platform CC field pre-set; messaging system includes efactory1 by default |
| GW **never discusses money** with customer — all to kundenservice@efactory1.de | SOP D | Financial question auto-redirect in platform chat |
| Interim/final work **never sent directly** — only via efactory1 platform | SOP D | GW tells customer this on first contact; platform is the only submission channel |
| efactory1 has a **dedicated QA team** (not just Berat) | SOP E | Admin side needs QA queue; QA team role in platform |
| **Specialized plagiarism software** used for QA | SOP E | Plagiarism API integration at submission gate |
| GW **self-check mandatory** before every submission | SOP E | Submission form: mandatory checklist (spelling, grammar, plagiarism, requirements) |
| Customer receives work with **"quality check passed"** message | SOP E | Platform auto-attaches QA confirmation on forward to customer |
| **Delay notification** goes simultaneously to customer AND kundenservice@efactory1.de | SOP B | "Report Delay" button sends dual notification |
| Works may **not be used elsewhere** without client's express consent | SOP A | Copyright notice on submission screen |
| Invoice created after **second partial delivery** (if customer satisfied) | SOP D | Invoice step triggered at second delivery confirmation, not first |

---

### Payment Release Gate (confirmed across SOPs 4 + 5)

The platform must enforce ALL of the following before marking a GW payment as releasable:

```
Payment Releasable = 
    customer_satisfied == true
    AND quality_approved == true          (no plagiarism, no AI)
    AND revision_rounds_complete == true
    AND all_customer_installments_paid == true
    AND invoice_received == true
```

### Revision Loop (confirmed in SOPs 4 + 5)

```
Revision rounds are NOT optional.
Each round = GW re-submits → efactory1 reviews → customer confirms.
After N failed rounds: efactory1 can reassign order → original GW forfeits fee.
```

### Order Status Machine (derived from all 6 SOPs)

```
[Available]           ← job on Notion board, not yet claimed
      ↓ GW submits claim form
[Pending Approval]    ← waiting for Berat to approve the GW's claim
      ↓ Berat approves
[Active]              ← GW working
      ↓ GW uploads interim
[Interim Submitted]   ← auto-forwarded to customer
      ↓ Customer reviews (feedback loop possible)
[Active — post-interim]
      ↓ GW uploads final + invoice
[Final Submitted]     ← efactory1 reviews before forwarding
      ↓ Berat forwards to customer
[Under Customer Review]
      ↓ Customer gives negative feedback
[Revision Required]   ← GW must re-submit
      ↓ GW re-submits
[Under Customer Review] ← loop repeats
      ↓ Customer satisfied
[Payment Pending]     ← all gates checked; awaiting Friday batch
      ↓ Berat releases on Friday
[Paid / Completed]
```

### Invoice Address (confirmed from SOP 3 + 4)

```
Bery Ventures GmbH
c/o WeWork Friesenplatz 4
50672 Köln
```

This is the legal entity name — **not efactory1.de** and not Berat Özdemir personally. The platform must show this address to GWs on the invoice submission screen.

### AGB Summary (confirmed from SOP 4)

| § | Rule | Platform action needed |
|---|------|----------------------|
| §1.2 | Fee fixed in advance in job confirmation | Fee displayed on order; GW confirms at claim |
| §1.3 | Payment due within 30 days of invoice | Track invoice date; alert if 30-day SLA approaching |
| §5.2 | GW must fix defects immediately on request | Revision round timer; alert if GW hasn't re-submitted within X days |
| §6 | GW liability capped at fee amount | Dispute resolution: max deduction = honorar |
| §13 | No AI, no plagiarism — else no pay | AI/plagiarism check status tracked per submission |
| §13.3 | efactory1 reviews before payment | Admin approval required before payment release |
| §1.6 | GW responsible for own taxes + invoicing | Platform shows invoice address; GW uploads their own invoice |

---

## WordPress Forms Connected to Each SOP

> Full form inventory with IDs, URLs, and SQL queries → [`source/wordpress_forms.md`](source/wordpress_forms.md)
> Every form below is a **Contact Form 7** form stored in the `cqen_posts` table on Raidboxes. Flamingo logs every submission. All GW-facing pages are **not indexed** (hidden from search engines and sitemap).

### Complete GW Form Map

| SOP Step | Action | Current WordPress Form | Form ID | Page URL | Page ID | Platform Replacement |
|----------|--------|----------------------|---------|----------|---------|---------------------|
| Pre-onboarding | GW applies to join efactory1 | Bewerbung (Application) | **6514** | /als-ghostwriterin-bewerben/ | 13963 | GW registration + application module |
| 1 — Accept order | GW claims a job (enters Order ID + confirms checkboxes) | Ghostwriter ID Anfrage | **6736** | /ghostwriter-dashboard/ | 6730 | GW portal → "Claim Job" flow |
| 2 — Upload interim | GW submits partial draft (file + Order ID + AI checkbox) | Ghostwriter Zwischenstand | **7893** | /ghostwriter-zwischenstand/ | 7894 | GW portal → Interim Submission |
| 3 — Upload final + invoice | GW submits finished work AND fee invoice together | Ghostwriter Finale Mustervorlage | **7897** | /ghostwriter-endstand/ | 7898 | GW portal → Final Submission (two file fields) |
| 3 — Invoice info | GW submits billing information for payment | Rechungsinformationen | **8132** | /rechnung-anfordern/ | 8128 | GW portal → Invoice Details (merged with final submission or separate step) |
| 4 — Onboarding setup | New GW completes onboarding (profile, banking info, contract) | Ghostwriter Onboarding | **7880** | /ghostwriter-onboarding/ | 7881 | GW portal → Onboarding wizard |
| 6 — Extension invoice | GW uploads Zusatzrechnung (same URL as SOP 3) | Ghostwriter Finale Mustervorlage | **7897** | /ghostwriter-endstand/ | 7898 | GW portal → "Extension Invoice" upload (same module as final, flagged as extension) |

### What Each Form Currently Captures (vs. What the Platform Needs)

#### Form 6736 — Ghostwriter ID Anfrage (/ghostwriter-dashboard/)
**Current:** GW enters their ID to identify themselves and access a job.
**Problem:** No session, no authentication — any person can type any ID.
**Platform replacement:** Authenticated GW session. "Claim Job" button on the order card, with confirmation modal for all SOP 1 checkboxes (deadline agreement, fee agreement, no AI, no plagiarism, GDPR, AGBs).

#### Form 7880 — Ghostwriter Onboarding (/ghostwriter-onboarding/)
**Current:** New GW fills a CF7 form with their details. Flamingo logs it. Berat reviews manually.
**Platform replacement:** Full onboarding wizard: profile creation, expertise tags, banking details for payment, upload of ID/contract, Berat approval step.

#### Form 7893 — Ghostwriter Zwischenstand (/ghostwriter-zwischenstand/)
**Current:** GW enters Order ID + uploads file. Submission auto-emails file to customer.
**Missing today:** No authentication, no file type validation enforced, no link to an actual order record, no status update on the order.
**Platform replacement:** GW portal → Interim Submission. Authenticated. Linked to order. Enforces file type (.doc/.pdf/.xls) and 5 MB limit. Auto-emails customer. Updates order status to "Interim Submitted."

#### Form 7897 — Ghostwriter Finale Mustervorlage (/ghostwriter-endstand/)
**Current:** GW uploads final work. Submission goes to efactory1 (not directly to customer). Also reused for Zusatzrechnungen.
**Missing today:** No distinction between "original final" and "extension invoice." No review queue for Berat. No order status update.
**Platform replacement:** GW portal → Final Submission. Two file fields (work + invoice). Confirmation checkboxes (no AI, individually created, can send as-is). Updates order status to "Final Submitted — pending efactory1 review." Berat gets admin notification to review before forwarding to customer.

#### Form 8132 — Rechungsinformationen (/rechnung-anfordern/)
**Current:** GW submits billing/invoice information separately.
**Note:** This may be a legacy standalone form — SOP 3 says the invoice is uploaded together with the final work via /ghostwriter-endstand/. Needs clarification whether 8132 is still actively used or redundant.
**Platform replacement:** Either merge into the final submission step or deprecate if 7897 covers it.

### Forms NOT Part of the GW Workflow (for context)

| Form ID | Name | What it is |
|---------|------|-----------|
| 6378 | Anfrage | Customer intake — on 40+ public service pages |
| 41156 | Anfrage KURZ | Short customer intake — homepage only |
| 42844 | Anfrage B2B | B2B customer intake |
| 7308 | Anfrage Lektorat | Proofreading customer intake |
| 6514 | Bewerbung | GW + Expert recruitment (pre-workflow) |
| 41607 | Ressourcen_download | Lead capture — thesis resources PDF |
| 41819 | ThesisCrashkurs_download | Lead capture — thesis crash course PDF |
| 8150 | Freunde werben Freunde | Referral program |
| 38976 | Partnerprogramm Registrierung | Partner/affiliate onboarding |
| 38981 | Partneranfrage | Partner inquiry |
| 6348 | Kontaktformular 1 | **DELETE** — orphaned, unused |
| 25962 | Test222334 | **DELETE** — test debris |

### Full Flow: Current WordPress System vs. Future Platform

```
TODAY (WordPress + CF7 + Flamingo + Notion + Email)
══════════════════════════════════════════════════════════════

[Notion job board] → GW sees job
        ↓
[/ghostwriter-dashboard/ — form 6736] → GW enters ID to claim
        ↓ (CF7 submission → Flamingo logs it → email to Berat)
[Berat reviews email → manually approves → sends email to GW]
        ↓
[GW works on paper]
        ↓
[/ghostwriter-zwischenstand/ — form 7893] → GW uploads interim
        ↓ (CF7 submission → Flamingo logs it → auto-email to customer)
[Customer reviews interim draft]
        ↓
[/ghostwriter-endstand/ — form 7897] → GW uploads final + invoice
        ↓ (CF7 submission → Flamingo logs it → email to Berat)
[Berat reviews → manually sends to customer]
[Customer reviews → Berat collects feedback manually]
[Revision loop via email/WhatsApp — no platform tracking]
        ↓
[Berat manually releases payment on Friday]
[/rechnung-anfordern/ — form 8132] → GW submits billing info
        ↓
[Berat pays manually via bank transfer]


FUTURE PLATFORM
══════════════════════════════════════════════════════════════

[GW portal job board] → GW clicks "Claim Job"
        ↓
[Confirmation modal: deadline ✓ fee ✓ no AI ✓ GDPR ✓ AGBs ✓]
        ↓ → Order status: "Pending Approval"
[Admin notification → Berat clicks "Approve"]
        ↓ → Order status: "Active" + GW gets confirmation email
[GW works on paper]
        ↓
[GW portal → "Submit Interim Draft"]
    File upload (validated: .doc/.pdf/.xls, ≤5MB)
    Checkboxes: no AI ✓ ready to send ✓
        ↓ → Order status: "Interim Submitted"
    Platform auto-emails draft to customer
        ↓
[Customer reviews — feedback via platform or email]
        ↓
[GW portal → "Submit Final Work + Invoice"]
    File 1: final work | File 2: invoice (to Bery Ventures GmbH)
    Checkboxes: no AI ✓ individually created ✓ can send ✓
        ↓ → Order status: "Final Submitted — Pending Review"
[Admin notification → Berat reviews → clicks "Forward to Customer"]
        ↓ → Platform emails final work to customer
[Customer reviews]
    ↓ Satisfied → Admin clicks "Mark Customer Satisfied"
    ↓ Issues → Admin adds feedback → Order status: "Revision Required"
        → GW notified → re-submits → loop
        ↓ (all gates met)
[Every Friday: batch payment review]
[Admin sees all "Payment Releasable" orders]
[Admin clicks "Release Payment" for each]
        ↓ → GW gets payment confirmation email
        ↓ → Order status: "Completed"
```
