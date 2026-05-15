// Canonical names for every order status, submission kind, and the small set
// of role/channel strings the codebase compares against. Use these constants
// instead of string literals so a typo becomes a build error, not a silent
// "order never advances" bug.
//
// Keep this file pure data — no functions, no React. Predicates over these
// values live in workflow.js (isPostFinal, statusRank, etc.).

// ---- Order statuses ----
export const STATUS = Object.freeze({
  LEAD: 'lead',
  QUALIFIED: 'qualified',
  OFFER_SENT: 'offer_sent',
  INVOICE_SENT: 'invoice_sent',
  AVAILABLE: 'available',
  CLAIMED_PENDING_APPROVAL: 'claimed_pending_approval',
  ACTIVE: 'active',
  INTERIM_SUBMITTED: 'interim_submitted',
  UNDER_CUSTOMER_REVIEW: 'under_customer_review',
  REVISION_REQUIRED: 'revision_required',
  FINAL_SUBMITTED: 'final_submitted',
  QA_REVIEW: 'qa_review',
  AI_VIOLATION_REVIEW: 'ai_violation_review',
  PLAGIARISM_VIOLATION_REVIEW: 'plagiarism_violation_review',
  DELIVERED: 'delivered',
  PAYMENT_PENDING: 'payment_pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
  DELAY_REPORTED: 'delay_reported',
  EXTENSION_REQUESTED: 'extension_requested',
});

// ---- Submission kinds (what a GW uploads) ----
export const SUBMISSION_KIND = Object.freeze({
  INTERIM_1: 'interim_1',
  INTERIM_2: 'interim_2',
  FINAL: 'final_work',
  REVISION: 'revision',
});

// ---- QA verdicts ----
export const QA_VERDICT = Object.freeze({
  PASS: 'pass',
  AI_VIOLATION: 'ai_violation',
  PLAGIARISM_VIOLATION: 'plagiarism_violation',
  REVISION_REQUIRED: 'revision_required',
});

export const QA_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

// ---- Roles ----
export const ROLE = Object.freeze({
  ADMIN: 'admin',
  GW: 'gw',
  QA: 'qa',
  CUSTOMER: 'customer',
});

// ---- Communication channels (thread.channel + delivery rails) ----
export const CHANNEL = Object.freeze({
  EMAIL: 'email',
  WHATSAPP_PROXY: 'whatsapp_proxy',
  VOICE_METADATA: 'voice_metadata',
  PLATFORM_CHAT: 'platform_chat',
  MULTI_CHANNEL: 'multi_channel',
});

// ---- GW payment status (per order) ----
export const GW_PAYMENT = Object.freeze({
  NOT_STARTED: 'not_started',
  WORK_IN_PROGRESS: 'work_in_progress',
  READY_FOR_RELEASE: 'ready_for_release',
  RELEASED: 'released',
});
