// Entity-shape documentation. Pure JSDoc — no runtime impact. The store has no
// runtime validation; these typedefs serve as the contract for what each entity
// table looks like, and they enable editor go-to-definition + completions in
// modern editors (VSCode, JetBrains) for code that consumes the store.
//
// To use in another file:
//   /** @typedef {import('./schemas.js').Order} Order */
//   /** @param {Order} order */
//   function statusFor(order) { ... }

/**
 * @typedef {(
 *   'lead' | 'qualified' | 'offer_sent' | 'invoice_sent' | 'available' |
 *   'claimed_pending_approval' | 'active' | 'interim_submitted' |
 *   'under_customer_review' | 'revision_required' |
 *   'qa_review' | 'ai_violation_review' | 'plagiarism_violation_review' |
 *   'delivered' | 'payment_pending' | 'completed' | 'cancelled' | 'on_hold' |
 *   'delay_reported' | 'extension_requested' | 'extension_customer_approval_pending'
 * )} OrderStatus
 */

/** @typedef {'admin' | 'gw' | 'qa' | 'customer'} Role */

/** @typedef {'interim_1' | 'interim_2' | 'final_work' | 'revision'} SubmissionKind */

/**
 * @typedef {Object} Installment
 * @property {number} n
 * @property {number} amt
 * @property {string} date            ISO date, payment due/paid
 * @property {'stripe_card'|'stripe_klarna'|'stripe_paypal'|'bank_transfer_sepa'} method
 * @property {'paid'|'pending'|'scheduled'|'overdue'} status
 * @property {boolean} [isExtension]  true when minted by a paid scope extension (A-03)
 * @property {string} [extensionRef]  FK → Order.extensionApproval.id (when isExtension)
 */

/**
 * @typedef {Object} Order
 * @property {number} id              Display id, e.g. 3499
 * @property {OrderStatus} status
 * @property {string} title           Order title (German)
 * @property {string} customerId      FK → Customer.id
 * @property {string} [gwId]          FK → Ghostwriter.id (null until claimed)
 * @property {string} workType        hausarbeit|bachelorarbeit|...
 * @property {string} field           Academic field
 * @property {number} pages
 * @property {number} grossEur        Customer-facing price
 * @property {number} rate            GW honorarium fraction (0..1)
 * @property {number} netHonorarium   Computed from grossEur * rate
 * @property {number} paidEur
 * @property {number} outstandingEur
 * @property {Installment[]} [installments]
 * @property {string} [acceptedAt]
 * @property {string} [interimDeadline]   ISO datetime
 * @property {string} [interim2Deadline]
 * @property {string} [finalDeadline]
 * @property {string} [firstContactDoneAt]
 * @property {number} [aiScore]            QA AI-detection score 0..100
 * @property {number} [plagiarismScore]
 * @property {string} [qaFlagReason]
 * @property {boolean} [flagged]
 * @property {Dispute[]} [disputes]     Append-only history of disputes opened against this order. Single source of truth for dispute state (read via W.isOrderDisputed / W.currentOpenDispute).
 * @property {string} [lastDisputeAt]   ISO datetime of the most recent dispute open.
 * @property {Refund} [refund]          Set on outcome C (cancel_refund); prototype-only field.
 * @property {ExtensionPending} [extensionPending]    GW-requested scope extension awaiting admin approval (pre-gate).
 * @property {ExtensionApproval} [extensionApproval]  Staged scope change awaiting customer approval + payment (A-03); the only writer of pages/deadline once applied.
 * @property {string} [extensionApprovedAt]           ISO datetime the staged scope change went live.
 * @property {ScopeAmendment[]} [scopeAmendments]     Append-only log of applied scope changes.
 * @property {string} [leadSource]
 * @property {string} [note]
 * @property {number} [revisionRounds]
 * @property {number} [finalRevisionRounds]    Per-kind counter: final/revision rounds burned.
 * @property {number} [interimRevisionRounds]  Per-kind counter: interim rounds burned.
 * @property {'work_in_progress'|'invoice_received'|'claim_pending'|'paid'|'no_payment_self_assigned'} [gwPaymentStatus]
 */

/**
 * @typedef {Object} Dispute
 * @property {string} id                 'd-{ts}-{rand}'
 * @property {'customer'|'gw'} openedBy
 * @property {string} openedById         customerId or gwId
 * @property {string} openedAt           ISO datetime
 * @property {'out_of_scope'|'unresponsive'|'quality'|'abusive'|'late'|'other'} reasonCategory
 * @property {string} reason             min 30 chars
 * @property {'open'|'resolved'} status
 * @property {null|'continue_revision'|'reassign_gw'|'cancel_refund'|'scope_amendment'} outcome
 * @property {string} [outcomeNote]      admin's free-text resolution rationale
 * @property {string|null} resolvedAt    ISO datetime
 * @property {string|null} resolvedBy    admin id
 * @property {DisputeNote[]} adminNotes  chronological audit log
 * @property {string|null} [affectedSubmissionId]
 * @property {boolean} [alsoBlockedGw]   outcome B option
 * @property {string|null} [extensionRef] outcome D link
 */

/**
 * @typedef {Object} DisputeNote
 * @property {string} id
 * @property {string} at                 ISO datetime
 * @property {string} body
 * @property {'platform_note'|'email'|'whatsapp'|'phone'} channel
 * @property {'customer'|'gw'|null} [recipient]    null for free notes
 * @property {string|null} [externalMessageId]     when channel=email/whatsapp, link to the System B message
 */

/**
 * @typedef {Object} Refund
 * @property {number} amount
 * @property {string} reason
 * @property {string} at                 ISO datetime
 */

/**
 * GW-requested scope extension, before admin approval. Lives on the order while
 * status === 'extension_requested'; cleared when approveExtension stages it.
 * @typedef {Object} ExtensionPending
 * @property {string} requestedAt        ISO datetime
 * @property {number} [extraPages]
 * @property {number} [extraFee]
 * @property {string} [proposedNewDeadline]
 * @property {string} [description]
 */

/**
 * Staged scope change awaiting customer approval + payment (audit A-03). Set by
 * approveExtension (source 'extension') or resolveDispute (source
 * 'dispute_scope_amendment'). Pages/price/deadline stay frozen until applied.
 * @typedef {Object} ExtensionApproval
 * @property {string} id                 'ext-live-{ts}-{rand}'
 * @property {'extension'|'dispute_scope_amendment'} source
 * @property {number} extraPages
 * @property {number} extraFee
 * @property {string|null} newDeadline
 * @property {string} description
 * @property {string} resumeStatus       order status to return to once applied
 * @property {'pending_customer'|'pending_payment'|'applied'|'declined'} status
 * @property {string|null} customerApprovedAt
 * @property {string|null} invoiceNo      extension invoice no (when a fee is due)
 * @property {number|null} installmentN   the minted extension installment
 * @property {string|null} [appliedAt]
 * @property {string|null} [declinedAt]
 * @property {string|null} [declineReason]
 */

/**
 * @typedef {Object} ScopeAmendment
 * @property {string} at
 * @property {string} source
 * @property {number} extraPages
 * @property {number} extraFee
 * @property {string|null} newDeadline
 * @property {string} description
 */

/**
 * @typedef {Object} Submission
 * @property {string} id
 * @property {number} orderId
 * @property {SubmissionKind} kind         entity kind: interim_1|interim_2|final_work|revision
 * @property {number} round                revision round (1 for the first submission)
 * @property {string} gwId
 * @property {string} submittedAt          ISO datetime — when GW uploaded
 * @property {string|null} [forwardedAt]   set when auto-forwarded to QA (interims)
 * @property {string} [fileName]
 * @property {string|null} [invoiceFileName]   Honorarrechnung PDF (final only)
 * @property {number} [size]
 * @property {number} [aiScore]
 * @property {number} [plagiarismScore]
 * @property {Object} [selfChecks]         GW attestations (spelling/grammar/plagiarism/requirements/noAi/ready[/individual])
 * @property {string|null} [changeSummary] GW note on what changed (resubmits)
 * @property {'pending'|'auto_forwarded'|'passed'|'revision_requested'|'flagged'|'archived'} qaStatus
 * @property {string} [reviewedAt]
 * @property {string} [clarificationRequestedAt]  set by qa.requestClarification (A-19)
 * @property {string} [clarificationNote]
 */

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} initials
 * @property {string} name
 * @property {string} email
 * @property {string} [phone]
 * @property {'DE'|'AT'|'CH'|string} country
 * @property {string} [leadSource]
 * @property {number} orders               Lifetime order count
 * @property {number} ltv                  Lifetime revenue €
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} Ghostwriter
 * @property {string} id
 * @property {string} initials
 * @property {string} name
 * @property {string} email
 * @property {string[]} expertise
 * @property {string[]} languages
 * @property {number} active               Current open assignments
 * @property {number} lifetime             Lifetime completed
 * @property {number} onTime               0..1 on-time rate
 * @property {number} rating               0..5
 * @property {number|null} rate            GW honorarium fraction
 * @property {boolean} banned
 * @property {string} [banReason]
 * @property {string} [agbsVersion]
 * @property {string} [iban]
 * @property {boolean} [isOwner]
 */

/**
 * A single message inside an order chat — the 3-party platform conversation
 * (customer + ghostwriter + admin) scoped to one order.
 * @typedef {Object} OrderChatMessage
 * @property {string} id
 * @property {string} chatId
 * @property {number} orderId
 * @property {'customer'|'gw'|'admin'} authorRole
 * @property {string|null} authorId
 * @property {string} at                   ISO datetime
 * @property {string} body
 * @property {Array|null} [attachments]
 */

/**
 * @typedef {Object} OrderChat
 * @property {string} id
 * @property {number} orderId
 * @property {string} openedAt
 * @property {string|null} [closedAt]
 * @property {string} [lastAt]
 * @property {{ admin: number, gw: number, customer: number }} unread
 * @property {OrderChatMessage[]} messages
 */

/**
 * One WhatsApp or Email message in the admin inbox. Keyed by CONTACT, never
 * by order — per D-28, external channels carry no order scope.
 * @typedef {Object} ExternalMessage
 * @property {string} id
 * @property {'customer'|'gw'|'lead'} contactType
 * @property {string} contactId
 * @property {'email'|'whatsapp'} medium
 * @property {'in'|'out'} direction
 * @property {string} at                   ISO datetime
 * @property {string} body
 * @property {string|null} [subject]
 * @property {Array|null} [attachments]
 * @property {boolean} readByAdmin
 */

/**
 * Minimal contact entity for non-customer / non-gw inbox contacts.
 * @typedef {Object} Lead
 * @property {string} id
 * @property {string|null} [name]
 * @property {string|null} [phone]
 * @property {string|null} [email]
 * @property {boolean} isB2B
 * @property {string} initials
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {Role | Role[]} to
 * @property {string} kind
 * @property {string} title
 * @property {string} body
 * @property {boolean} urgent
 * @property {boolean} read
 * @property {string} at
 * @property {number} [orderId]
 * @property {string} [customerId]
 * @property {string} [gwId]
 * @property {string} [submissionId]
 * @property {string} [route]
 * @property {Object} [params]
 */

/**
 * @template T
 * @typedef {Object} Table
 * @property {Object.<string, T>} byId
 * @property {string[]} allIds
 */

/**
 * @typedef {Object} Session
 * @property {Role} role
 * @property {string} gwId
 * @property {string} customerId
 */

/**
 * @typedef {Object} RouteState
 * @property {string} name
 * @property {Object} params
 */

/**
 * @typedef {Object} State
 * @property {{ orders: Table<Order>, submissions: Table<Submission>, customers: Table<Customer>, ghostwriters: Table<Ghostwriter>, order_chats: Table<OrderChat>, external_messages: Table<ExternalMessage>, inbox_internal_notes: Table<Object>, leads: Table<Lead>, notifications: Table<Notification>, emails: Table<Object>, gw_applications: Table<Object>, chat_reports: Table<Object>, sim_events: Table<Object> }} entities
 *   NB: assignment + payment/installment data live ON the Order (order.gwId, order.installments, order.gwPaymentStatus); there is no separate `assignments` or `payments` table. See db_schema_draft.md.
 * @property {Session} session
 * @property {{ route: RouteState, tweaks: Object|null }} ui
 * @property {{ version: number, lastAction: string|null }} meta
 */

// Re-export nothing — this file is purely a typedef host. The empty export
// keeps it as a module so JSDoc `import('./schemas.js')` references resolve.
export {};
