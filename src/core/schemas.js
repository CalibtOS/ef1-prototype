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
 *   'under_customer_review' | 'revision_required' | 'final_submitted' |
 *   'qa_review' | 'ai_violation_review' | 'plagiarism_violation_review' |
 *   'delivered' | 'payment_pending' | 'completed' | 'cancelled' | 'on_hold' |
 *   'delay_reported' | 'extension_requested'
 * )} OrderStatus
 */

/** @typedef {'admin' | 'gw' | 'qa' | 'customer'} Role */

/** @typedef {'interim_1' | 'interim_2' | 'final_work' | 'revision'} SubmissionKind */

/**
 * @typedef {Object} Installment
 * @property {number} n
 * @property {number} amt
 * @property {string} date            ISO date, payment due/paid
 * @property {'stripe_card'|'paypal'|'sepa'|'manual'} method
 * @property {'paid'|'pending'|'overdue'} status
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
 * @property {boolean} [disputeOpen]
 * @property {string} [leadSource]
 * @property {string} [note]
 * @property {number} [revisionRounds]
 * @property {'not_started'|'work_in_progress'|'ready_for_release'|'released'} [gwPaymentStatus]
 */

/**
 * @typedef {Object} Submission
 * @property {string} id
 * @property {number} orderId
 * @property {SubmissionKind} kind
 * @property {string} at                ISO datetime — when GW uploaded
 * @property {string} [filename]
 * @property {number} [aiScore]
 * @property {number} [plagiarismScore]
 * @property {'pending'|'auto_forwarded'|'passed'|'revision_requested'|'flagged'|'archived'} qaStatus
 * @property {string} [qaNote]
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
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} threadId
 * @property {'admin'|'gw'|'customer'|'system'} from
 * @property {string} body
 * @property {string} at                   ISO datetime
 * @property {string} [origin_channel]
 * @property {string} [delivery_channel]
 * @property {string} [autoflag]
 * @property {boolean} [system]
 */

/**
 * @typedef {Object} Thread
 * @property {string} id
 * @property {number} [orderId]
 * @property {string} [customerId]
 * @property {string} [gwId]
 * @property {string} subject
 * @property {string} channel
 * @property {'positive'|'neutral'|'tense'} [sentiment]
 * @property {string} lastAt
 * @property {boolean|'financial'} [flagged]
 * @property {boolean} [followUp]
 * @property {string|null} [snoozeUntil]
 * @property {string|null} [lastInboundAt]
 * @property {string|null} [lastOutboundAt]
 * @property {{ admin: number, gw: number, customer: number }} unread
 * @property {Message[]} messages
 * @property {'order'|'lead'|'gw_direct'} [threadType]
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
 * @property {string} [threadId]
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
 * @property {{ orders: Table<Order>, submissions: Table<Submission>, customers: Table<Customer>, ghostwriters: Table<Ghostwriter>, threads: Table<Thread>, notifications: Table<Notification> }} entities
 * @property {Session} session
 * @property {{ route: RouteState, tweaks: Object|null }} ui
 * @property {{ version: number, lastAction: string|null }} meta
 */

// Re-export nothing — this file is purely a typedef host. The empty export
// keeps it as a module so JSDoc `import('./schemas.js')` references resolve.
export {};
