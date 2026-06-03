// Core workflow rules for eFactory One.
// Pure business logic only: no React, no DOM writes, no side effects.
import { STATUS_PILLS } from '../../data.js';
import { QA_STATUS, STATUS } from './status.js';

const ORDER_STATES = [
  'lead','qualified','offer_sent','invoice_sent','available','claimed_pending_approval',
  'active','interim_submitted','under_customer_review','revision_required',
  'qa_review','ai_violation_review','plagiarism_violation_review',
  'delivered','payment_pending','completed','cancelled','on_hold','delay_reported',
  'extension_requested','extension_customer_approval_pending'
];

const PRE_PROPOSAL_STATES = ['lead', 'qualified'];
const PRE_PAYMENT_STATES = ['lead', 'qualified', 'offer_sent', 'invoice_sent'];
const POST_FINAL_STATES = [
  'qa_review', 'ai_violation_review', 'plagiarism_violation_review',
  'delivered', 'payment_pending', 'completed'
];
const RELEASE_GATE_RELEVANT_STATES = [
  'delivered', 'payment_pending', 'completed', 'ai_violation_review', 'plagiarism_violation_review'
];

// Order is claimed by a GW and inside the delivery loop. Used to scope the GW
// calendar to "my live work".
const ACTIVE_GW_ORDER_STATUSES = [
  STATUS.ACTIVE,
  STATUS.INTERIM_SUBMITTED,
  STATUS.UNDER_CUSTOMER_REVIEW,
  STATUS.REVISION_REQUIRED,
  STATUS.QA_REVIEW,
  STATUS.DELAY_REPORTED,
  STATUS.EXTENSION_REQUESTED,
];

// Admin calendar superset: every status where a deadline is still meaningful.
// Adds pre-claim (available, claimed_pending_approval) and flagged-but-not-resolved
// states that the admin must keep watching even though the GW shouldn't.
const IN_DELIVERY_STATUSES = [
  ...ACTIVE_GW_ORDER_STATUSES,
  STATUS.AVAILABLE,
  STATUS.CLAIMED_PENDING_APPROVAL,
  STATUS.AI_VIOLATION_REVIEW,
  STATUS.PLAGIARISM_VIOLATION_REVIEW,
];
const QA_REVIEW_KINDS = ['final_work', 'revision'];
const STATUS_RANK = {
  lead: 0,
  qualified: 1,
  offer_sent: 2,
  invoice_sent: 3,
  available: 4,
  claimed_pending_approval: 5,
  active: 6,
  interim_submitted: 7,
  under_customer_review: 8,
  revision_required: 9,
  qa_review: 11,
  ai_violation_review: 12,
  plagiarism_violation_review: 12,
  delivered: 13,
  payment_pending: 14,
  completed: 15,
  on_hold: 4,
  delay_reported: 6,
  extension_requested: 6,
  extension_customer_approval_pending: 6,
  cancelled: 0,
  bye: 0,
};

const CLOSED_SUBMISSION_REASONS = {
  claimed_pending_approval: 'Awaiting admin approval',
  interim_submitted: 'Interim already submitted — awaiting customer feedback',
  under_customer_review: 'Awaiting customer review',
  qa_review: 'In QA — no further upload needed',
  delivered: 'Delivered — awaiting customer acceptance/payment gate',
  payment_pending: 'Payment pending — work complete',
  completed: 'Order complete',
  cancelled: 'Order cancelled',
  on_hold: 'Order on hold',
  delay_reported: 'Delay reported — awaiting customer approval',
  extension_requested: 'Extension requested — awaiting admin decision',
  extension_customer_approval_pending: 'Scope change awaiting customer approval + payment — no upload yet',
  ai_violation_review: 'AI violation under review',
  plagiarism_violation_review: 'Plagiarism violation under review',
};

const TRANSITIONS = {
  send_offer:           { from: ['qualified'], to: 'offer_sent' },
  approve_claim:        { from: ['claimed_pending_approval'], to: 'active' },
  reject_claim:         { from: ['claimed_pending_approval'], to: 'available' },
  claim_job:            { from: ['available'], to: 'claimed_pending_approval' },
  assign_gw:            { from: ['available','active','delay_reported','extension_requested'], to: 'active' },
  // Interim resubmissions reopen the interim slot when a revision was requested
  // on it — so 'revision_required' is a valid `from` (slot routing in
  // `allowedSubmissionKinds`). `gw_submit_revision` here is the FINAL-revision
  // resubmit; an interim revision resubmits as `gw_submit_interim` and lands
  // back in 'under_customer_review'.
  gw_submit_interim:    { from: ['active','revision_required'], to: 'under_customer_review' },
  gw_submit_final:      { from: ['active'], to: 'qa_review' },
  gw_submit_revision:   { from: ['revision_required'], to: 'qa_review' },
  qa_pass_final:        { from: ['qa_review'], to: 'delivered' },
  qa_pass_interim:      { from: ['qa_review','under_customer_review'], to: 'under_customer_review' },
  qa_request_revision:  { from: ['qa_review'], to: 'revision_required' },
  qa_flag_ai:           { from: ['qa_review'], to: 'ai_violation_review' },
  qa_flag_plagiarism:   { from: ['qa_review'], to: 'plagiarism_violation_review' },
  customer_approve_interim: { from: ['under_customer_review','interim_submitted'], to: 'active' },
  customer_request_revision:{ from: ['under_customer_review','interim_submitted','delivered'], to: 'revision_required' },
  customer_accept_final:{ from: ['delivered'], to: 'payment_pending' },
  report_delay:         { from: ['active','revision_required'], to: 'delay_reported' },
  request_extension:    { from: ['active'], to: 'extension_requested' },
  release_batch:        { from: ['payment_pending'], to: 'completed' },
};

function includesStatus(list, status) {
  return list.indexOf(status) >= 0;
}

function canTransition(order, name) {
  const rule = TRANSITIONS[name];
  if (!order || !rule) return { ok: false, reason: 'Unknown transition' };
  if (!includesStatus(rule.from, order.status)) {
    return { ok: false, reason: `Cannot ${name.replace(/_/g, ' ')} while order is ${order.status}` };
  }
  return { ok: true, to: rule.to };
}

// Admin resolution actions (approveExtension, rejectExtension, acceptDelay,
// confirmViolation, clearViolation) don't fit the normal
// transition graph because they exit a "stuck" state by patching multiple
// fields at once. Rather than add transitions for every admin verb (and lose
// the action-body semantics), each admin action declares its required
// preconditions here and calls canResolve(order, kind) before patching.
//
// Missing this guard is how A-008 / A-010 slipped past review: extension
// approval could be triggered from any status because nothing asserted that
// the order was actually in `extension_requested`.
const RESOLUTION_PRECONDITIONS = {
  approve_extension: (o) => o.status === 'extension_requested' || !!o.extensionPending,
  reject_extension:  (o) => o.status === 'extension_requested' || !!o.extensionPending,
  accept_delay:      (o) => o.status === 'delay_reported',
  propose_delay:     (o) => o.status === 'delay_reported',
  confirm_violation: (o) => o.status === 'ai_violation_review' || o.status === 'plagiarism_violation_review',
  clear_violation:   (o) => o.status === 'ai_violation_review' || o.status === 'plagiarism_violation_review',
};

function canResolve(order, kind) {
  const check = RESOLUTION_PRECONDITIONS[kind];
  if (!order) return { ok: false, reason: 'Order not found' };
  if (!check) return { ok: false, reason: `Unknown resolution kind: ${kind}` };
  if (!check(order)) {
    return { ok: false, reason: `Cannot ${kind.replace(/_/g, ' ')} while order is ${order.status}` };
  }
  return { ok: true };
}

function allowedSubmissionKinds(order, gwId, submissions = []) {
  if (!order || order.gwId !== gwId) return [];
  if (order.status === 'revision_required') {
    // If the revision request was on an interim, the GW re-uploads that interim
    // (not a final-revision). The slot reopens for the same kind so customer
    // review resumes after re-submission. Falls back to 'revision' (final) when
    // the last submission was the final or when no signal is available.
    const lastKind = order.lastSubmissionKind;
    if (lastKind === 'interim_1' || lastKind === 'interim_2') return [lastKind];
    return ['revision'];
  }
  if (order.status !== 'active') return [];
  const next = nextExpectedSubmissionKind(order, submissions);
  return next ? [next] : [];
}

function submissionClosedReason(order) {
  return CLOSED_SUBMISSION_REASONS[order?.status] || 'No submission is currently expected for this assignment';
}

function submissionKindToEntityKind(kind) {
  if (kind === 'final') return 'final_work';
  if (kind === 'revision') return 'revision';
  return kind || 'final_work';
}

function nextStateAfterSubmit(kind) {
  if (kind === 'interim_1' || kind === 'interim_2') return 'under_customer_review';
  return 'qa_review';
}

function isInterimKind(kind) {
  return kind === 'interim_1' || kind === 'interim_2';
}

// =============================================================================
// Dispute helpers
// =============================================================================
// Disputes live as an append-only array on the order. `order.disputes` is the
// SINGLE source of truth — when at least one entry has `status === 'open'`, the
// order is disputed. The legacy `disputeOpen` boolean was removed (it was a
// second, hand-mirrored source of truth); see
// docs/audits/implementation_completion_audit.md.
//
// Design rationale: per docs/flows/dispute/dispute_flow_design_review.md §4, dispute is
// orthogonal to status. Opening a dispute pushes to disputes[] and locks the
// chat (chat.disputeLockedAt). Closing applies an outcome that may or may not
// move status — but the open/close itself never does.

function disputes(order) {
  return Array.isArray(order?.disputes) ? order.disputes : [];
}

function openDisputes(order) {
  return disputes(order).filter(d => d?.status === 'open');
}

function currentOpenDispute(order) {
  // Return the most recently opened dispute that's still open (typically there's
  // at most one — concurrent disputes are blocked in the open action).
  const open = openDisputes(order);
  if (!open.length) return null;
  return [...open].sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0))[0];
}

function isOrderDisputed(order) {
  // Single source of truth: an order is disputed iff it has an open structured
  // dispute. (The legacy `disputeOpen` boolean was removed; disputes[] is the
  // only record. Seeds are backfilled.)
  return openDisputes(order).length > 0;
}

// A GW account is BLOCKED (hard) when a confirmed AI/plagiarism violation
// revoked platform access. Distinct from `banned` (shadow-ban) — a softer
// job-board visibility throttle (see docs/business_rules.md). A blocked account
// cannot claim or apply for jobs; a shadow-banned one still can, it just stops
// receiving job-availability alerts.
function isGwBlocked(gw) {
  return !!gw?.accountBlockedAt;
}

// Per-kind revision round policy.
//   - Interim revisions: max 3 rounds (across interim_1 + interim_2 cumulatively).
//   - Final revisions:   max 3 rounds (customer + QA combined).
// Hitting the cap forces the dispute/escalation fallback — see Annex A / P2.1
// of docs/flows/dispute/dispute_flow_design_review.md.
const MAX_REVISION_ROUNDS_PER_KIND = 3;

// Which counter does a customer "request revision" target right now? Derived
// from order.status because the status decides whether the open milestone is
// an interim under review or a delivered final.
function revisionKindForCustomerRequest(order) {
  if (!order) return null;
  if (order.status === 'delivered') return 'final';
  if (order.status === 'under_customer_review' || order.status === 'interim_submitted') {
    return order.pendingCustomerReviewKind || order.lastSubmittedInterimKind || order.lastSubmissionKind || 'interim_1';
  }
  return null;
}

// Returns the count of revision rounds already burned for the given kind.
// 'final' / 'interim_1' / 'interim_2' all share the per-kind counters that
// requestCustomerRevision / qaRequestRevision maintain.
function revisionRoundsForKind(order, kind) {
  if (!order || !kind) return 0;
  if (kind === 'final') return order.finalRevisionRounds || 0;
  // Interim 1 and interim 2 share `interimRevisionRounds` — the cap is for
  // the interim phase as a whole, not per slot.
  return order.interimRevisionRounds || 0;
}

// Single source of truth for "can another revision round be requested?".
//   - Returns { ok: true } when the round is allowed.
//   - Returns { ok: false, reason, escalationRecommended } otherwise.
// Use in `requestCustomerRevision`, `qaRequestRevision`, and any UI gate that
// shows / hides revision CTAs vs. the "open dispute" fallback.
function canRequestRevision(order, kind /* optional */) {
  if (!order) return { ok: false, reason: 'Order not found.' };
  if (isOrderDisputed(order)) {
    return { ok: false, reason: 'Dispute is open — admin must resolve before another revision.', escalationRecommended: false };
  }
  const targetKind = kind || revisionKindForCustomerRequest(order) || 'final';
  const rounds = revisionRoundsForKind(order, targetKind);
  if (rounds >= MAX_REVISION_ROUNDS_PER_KIND) {
    const phaseLabel = targetKind === 'final' ? 'final' : 'interim';
    return {
      ok: false,
      reason: `Max ${MAX_REVISION_ROUNDS_PER_KIND} ${phaseLabel} revision rounds reached. Open a dispute to escalate.`,
      escalationRecommended: true,
    };
  }
  return { ok: true };
}

// Per-kind revision round counter. Interim and Final revisions each have their
// own 1..3 cycle; the legacy `revisionRounds` field stays as a total. Reads the
// kind-scoped counter that matches the revision currently in flight (or the
// last one that was requested).
function currentRevisionRound(order) {
  if (!order) return 0;
  const kind = order.revisionTargetKind;
  if (kind === 'final') return order.finalRevisionRounds || 0;
  if (kind === 'interim_1' || kind === 'interim_2') return order.interimRevisionRounds || 0;
  // Fallback for orders that pre-date the per-kind split: derive from status.
  if (order.status === 'revision_required') {
    if (order.finalSubmittedAt) return order.finalRevisionRounds || order.revisionRounds || 0;
    return order.interimRevisionRounds || order.revisionRounds || 0;
  }
  return order.revisionRounds || 0;
}

function isQaReviewKind(kind) {
  return QA_REVIEW_KINDS.indexOf(kind) >= 0;
}

function configuredInterimKinds(order) {
  return [
    order?.interimDeadline ? 'interim_1' : null,
    order?.interim2Deadline ? 'interim_2' : null,
  ].filter(Boolean);
}

function addInterimAndPrior(set, kind) {
  if (kind === 'interim_1' || kind === 'interim_2') set.add('interim_1');
  if (kind === 'interim_2') set.add('interim_2');
}

function submittedSubmissionKinds(order, submissions = []) {
  const kinds = new Set();
  (submissions || []).forEach(s => {
    if (isInterimKind(s?.kind)) kinds.add(s.kind);
    if (isQaReviewKind(s?.kind)) kinds.add('final');
  });
  if (isInterimKind(order?.lastSubmissionKind)) kinds.add(order.lastSubmissionKind);
  if (isInterimKind(order?.lastSubmittedInterimKind)) kinds.add(order.lastSubmittedInterimKind);
  if (order?.interimSubmittedAt || order?.interim1SubmittedAt) kinds.add('interim_1');
  if (order?.interim2SubmittedAt) kinds.add('interim_2');
  if (order?.finalSubmittedAt || statusRank(order) >= STATUS_RANK.qa_review) kinds.add('final');
  return kinds;
}

function latestInterimKind(order, submissions = []) {
  if ((order?.status === 'under_customer_review' || order?.status === 'interim_submitted') && isInterimKind(order?.pendingCustomerReviewKind)) {
    return order.pendingCustomerReviewKind;
  }
  if (isInterimKind(order?.lastSubmittedInterimKind)) return order.lastSubmittedInterimKind;
  if (isInterimKind(order?.lastSubmissionKind)) return order.lastSubmissionKind;
  const latest = [...(submissions || [])]
    .filter(s => isInterimKind(s?.kind))
    .sort((a, b) => {
      const byDate = new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
      if (byDate) return byDate;
      return (b.kind === 'interim_2' ? 1 : 0) - (a.kind === 'interim_2' ? 1 : 0);
    })[0];
  if (latest?.kind) return latest.kind;
  if (order?.interim2SubmittedAt) return 'interim_2';
  if (order?.interimSubmittedAt || order?.interim1SubmittedAt) return 'interim_1';
  return null;
}

function completedInterimKinds(order, submissions = []) {
  const done = new Set();
  if (!order?.interimDeadline) return done;

  if (statusRank(order) >= STATUS_RANK.qa_review || order.finalSubmittedAt) {
    configuredInterimKinds(order).forEach(kind => addInterimAndPrior(done, kind));
    return done;
  }

  if (order.interim1ApprovedAt) addInterimAndPrior(done, 'interim_1');
  if (order.interim2ApprovedAt) addInterimAndPrior(done, 'interim_2');
  if (isInterimKind(order.lastApprovedInterimKind)) addInterimAndPrior(done, order.lastApprovedInterimKind);

  const latest = latestInterimKind(order, submissions);
  if (latest === 'interim_2') done.add('interim_1');
  if (order.status === 'active' && latest) addInterimAndPrior(done, latest);
  if (order.status === 'active' && order.interimCustomerSatisfied) {
    addInterimAndPrior(done, isInterimKind(order.lastApprovedInterimKind) ? order.lastApprovedInterimKind : (latest || 'interim_1'));
  }
  return done;
}

function isFinalSubmitted(order, submissions = []) {
  return submittedSubmissionKinds(order, submissions).has('final');
}

function nextExpectedSubmissionKind(order, submissions = []) {
  if (!order) return null;
  if (order.status === 'revision_required') return 'revision';
  if (order.status !== 'active') return null;

  const completedInterims = completedInterimKinds(order, submissions);
  if (order.interimDeadline && !completedInterims.has('interim_1')) return 'interim_1';
  if (order.interim2Deadline && !completedInterims.has('interim_2')) return 'interim_2';
  if (!isFinalSubmitted(order, submissions)) return 'final';
  return null;
}

function deliveryProgress(order, submissions = []) {
  const submitted = submittedSubmissionKinds(order, submissions);
  const completedInterims = completedInterimKinds(order, submissions);
  const latestInterim = latestInterimKind(order, submissions);
  const currentKind = order?.status === 'under_customer_review' || order?.status === 'interim_submitted'
    ? (latestInterim || (completedInterims.has('interim_1') && order?.interim2Deadline ? 'interim_2' : 'interim_1'))
    : nextExpectedSubmissionKind(order, submissions);
  const interim1Complete = !order?.interimDeadline || completedInterims.has('interim_1');
  const interim2Complete = !order?.interim2Deadline || completedInterims.has('interim_2');
  return {
    submittedKinds: submitted,
    completedInterimKinds: completedInterims,
    latestInterimKind: latestInterim,
    currentKind,
    interim1Submitted: submitted.has('interim_1') || completedInterims.has('interim_1'),
    interim2Submitted: submitted.has('interim_2') || completedInterims.has('interim_2'),
    interim1Complete,
    interim2Complete,
    interimsComplete: interim1Complete && interim2Complete,
    finalSubmitted: isFinalSubmitted(order, submissions),
  };
}

function isPreProposal(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;
  return PRE_PROPOSAL_STATES.indexOf(status) >= 0;
}

function isPrePayment(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;
  return PRE_PAYMENT_STATES.indexOf(status) >= 0;
}

// Has the customer's first payment landed? Real money recorded against the
// order, any paid installment, or simply being past the invoice stage all
// count. Single source of truth for "is this order paid" — used by the order
// chat gate (comms.js) and anywhere else that branches on payment.
function isOrderPaid(order) {
  if (!order) return false;
  if ((order.paidEur || 0) > 0) return true;
  if ((order.installments || []).some(i => i.status === 'paid')) return true;
  return !isPrePayment(order);
}

function canShowMoney(orderOrStatus) {
  return !isPreProposal(orderOrStatus);
}

function canShowReceivable(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;
  return !isPreProposal(status) && !['offer_sent', 'cancelled', 'bye'].includes(status);
}

function isPostFinal(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;
  return POST_FINAL_STATES.indexOf(status) >= 0;
}

function isReleaseGateRelevant(order) {
  if (!order) return false;
  if (RELEASE_GATE_RELEVANT_STATES.indexOf(order.status) >= 0) return true;
  return !!(order.finalSubmittedAt || order.deliveredAt || order.customerSatisfied || order.qaPassed || order.gwPaymentStatus === 'invoice_received' || order.gwPaymentStatus === 'paid');
}

function releaseGateStageNote(order) {
  if (!order) return 'Order not found';
  const map = {
    lead: 'Lead is not qualified yet. No proposal, invoice, work, QA, customer acceptance, or GW payout exists.',
    qualified: 'Qualified lead only. Create and send the proposal before showing invoice, assignment, QA, revision, or payout gates.',
    offer_sent: 'Proposal sent. Wait for customer acceptance and invoice/payment before GW assignment or delivery gates apply.',
    invoice_sent: 'Invoice sent. Confirm the first customer payment before starting GW assignment or delivery work.',
    available: 'Payment received. Assign or approve a GW before delivery, QA, revisions, or payout gates can start.',
    claimed_pending_approval: 'GW claim is waiting for admin approval. Work has not started until both assignment emails are sent.',
    active: 'Work is in progress. Release gates start only after final work passes QA and the customer accepts it.',
    interim_submitted: 'Interim was auto-forwarded to the customer. Final QA, customer acceptance, and payout are not reached yet.',
    under_customer_review: 'Customer is reviewing an interim delivery. Final QA and payout gates are not reached yet.',
    revision_required: 'A revision/dispute is open. Payment remains blocked until the corrected final is accepted.',
    qa_review: 'Final work is still in QA. It must pass before the customer can accept it.',
    delivered: 'Final was delivered to the customer. Await customer acceptance before Friday release eligibility.',
    payment_pending: 'Customer accepted the final. Friday release depends on all payout gates.',
    completed: 'Order is complete and the GW payout is already settled.',
    cancelled: 'Order is cancelled. No delivery or payout gate should be shown.',
    on_hold: 'Order is on hold. Resolve the hold before continuing the workflow.',
    delay_reported: 'Delay is awaiting customer approval of the new date. Delivery and payout gates are paused.',
    extension_requested: 'Scope extension is awaiting admin/customer approval. Delivery and payout gates are paused.',
    extension_customer_approval_pending: 'Scope change approved by admin — waiting for the customer to approve and pay the extension invoice before work resumes.',
  };
  return map[order.status] || 'This workflow stage has not reached payout gating yet.';
}

function canAssign(order) {
  if (!order) return { ok: false, reason: 'Order not found' };
  if (isPrePayment(order)) return { ok: false, reason: 'Order must be paid before GW assignment. Send invoice and confirm payment first.' };
  if (isPostFinal(order) || order.status === 'cancelled') return { ok: false, reason: 'Order is past the assignment window. Use reassign from dispute handling if a switch is needed.' };
  return { ok: true };
}

function allInstallmentsPaid(order) {
  const installments = order?.installments || [];
  return installments.length > 0 &&
    installments.every(i => i.status === 'paid') &&
    (order.outstandingEur || 0) === 0;
}

// Friday release gate from SOP 4/5 and PRD:
// customer satisfied + quality approved + revisions complete + all customer installments + GW invoice.
function releaseGates(order) {
  if (!order) return { releasable: false, blocked: true, reasons: ['Order not found'], gates: {} };
  const gates = {
    customer_satisfied:      order.customerSatisfied === true,
    quality_approved:        order.qaPassed === true && !order.flagged && order.status !== 'ai_violation_review' && order.status !== 'plagiarism_violation_review',
    // An open structured dispute (or an active revision) blocks the Friday batch.
    revisions_complete:      !isOrderDisputed(order) && order.status !== 'revision_required',
    all_installments_paid:   allInstallmentsPaid(order),
    gw_invoice_received:     order.gwPaymentStatus === 'invoice_received' || order.gwPaymentStatus === 'paid',
  };
  const reasons = [];
  if (order.status !== 'payment_pending') reasons.push('Order is not awaiting Friday release');
  if (!gates.customer_satisfied) reasons.push('Customer satisfaction not confirmed');
  if (!gates.quality_approved) reasons.push('Quality not approved (QA pending, AI, or plagiarism flag)');
  if (!gates.revisions_complete) reasons.push('Revision rounds or dispute still open');
  if (!gates.all_installments_paid) reasons.push(`Installments outstanding (€${(order.outstandingEur || 0).toFixed(2)})`);
  if (!gates.gw_invoice_received) reasons.push('GW invoice not received');
  return {
    releasable: order.status === 'payment_pending' && reasons.length === 0,
    blocked: reasons.length > 0,
    reasons,
    gates,
  };
}

function statusFor(order, role) {
  const base = STATUS_PILLS[order?.status] || { color: 'slate', label: order?.status || 'Unknown' };
  if (role === 'customer') {
    const map = {
      qualified: 'Angebot wird vorbereitet',
      offer_sent: 'Angebot wird vorbereitet',
      invoice_sent: 'Zahlung ausstehend',
      available: 'GW-Suche läuft',
      claimed_pending_approval: 'GW-Suche läuft',
      active: 'In Bearbeitung',
      interim_submitted: 'Zwischenstand prüfen',
      under_customer_review: 'Zwischenstand prüfen',
      revision_required: 'Überarbeitung läuft',
      extension_customer_approval_pending: 'Erweiterung bestätigen',
      qa_review: 'Qualitätsprüfung',
      delivered: 'Endabgabe prüfen',
      payment_pending: 'Abgeschlossen',
      completed: 'Abgeschlossen',
      delay_reported: 'Verzögerung gemeldet',
    };
    return { ...base, label: map[order?.status] || base.label };
  }
  if (role === 'gw' && order?.status === 'claimed_pending_approval') {
    return { ...base, label: 'Waiting for efactory1 approval' };
  }
  return base;
}

function statusRank(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;
  return STATUS_RANK[status] ?? 0;
}

function asIso(value, time) {
  if (!value) return null;
  const s = String(value);
  if (s.indexOf('T') >= 0) return s;
  return `${s}T${time || '10:00:00'}`;
}

function addHours(value, hours) {
  const iso = asIso(value);
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function firstByDate(list, field) {
  return [...(list || [])]
    .filter(x => x && x[field])
    .sort((a, b) => new Date(a[field]) - new Date(b[field]))[0] || null;
}

function lastByDate(list, field) {
  return [...(list || [])]
    .filter(x => x && x[field])
    .sort((a, b) => new Date(b[field]) - new Date(a[field]))[0] || null;
}

function firstPaidInstallment(order) {
  return firstByDate((order?.installments || []).filter(i => i.status === 'paid'), 'date');
}

function firstInstallment(order) {
  return firstByDate(order?.installments || [], 'date');
}

// Returns a flat object of lifecycle timestamps for the order timeline.
// Real timestamps (createdAt, offerSentAt, acceptedAt, …) are used when present.
// When a stage is implied by status rank but no real timestamp exists, synthetic
// values are derived from `anchor` — e.g. leadAt defaults to `anchor − 72h`.
// Each returned date is paired with a `_synthetic` set on the result under
// `.__synthetic` (a set of keys that were fabricated) so consumers can render
// fabricated values differently and selectors can exclude them from KPIs.
function lifecycleDates(order, submissions) {
  if (!order) return {};
  const rank = statusRank(order);
  const subs = submissions || [];
  const latestSub = lastByDate(subs, 'submittedAt');
  const latestInterim = lastByDate(subs.filter(s => isInterimKind(s.kind)), 'submittedAt');
  const latestFinal = lastByDate(subs.filter(s => isQaReviewKind(s.kind)), 'submittedAt');
  const firstPaid = firstPaidInstallment(order);
  const firstInst = firstInstallment(order);
  const anchor = order.createdAt || order.leadCreatedAt || order.acceptedAt || firstPaid?.date || firstInst?.date || latestSub?.submittedAt || '2026-05-07T10:00:00';
  const synth = new Set();
  const mark = (key, real, derived) => {
    if (real) return real;
    if (derived) synth.add(key);
    return derived;
  };
  const leadAt = mark('leadAt', order.createdAt || order.leadCreatedAt, addHours(anchor, -72));
  const qualifiedAt = mark('qualifiedAt', order.qualifiedAt, rank >= 1 ? addHours(leadAt, 2) : null);
  const paymentAt = mark('paymentAt', order.paymentConfirmedAt,
    (order.paidEur || 0) > 0 || (rank >= 4 && order.status !== 'invoice_sent')
      ? asIso(firstPaid?.date || order.acceptedAt || firstInst?.date, '12:20:00')
      : null);
  const offerAt = mark('offerAt', order.offerSentAt,
    rank >= 2 || canShowMoney(order)
      ? addHours(order.acceptedAt || paymentAt || qualifiedAt, -24)
      : null);
  const invoiceAt = mark('invoiceAt', order.invoiceSentAt || order.invoiceRequestAt,
    rank >= 3 || (canShowReceivable(order) && ((order.installments || []).length || (order.outstandingEur || 0) > 0))
      ? addHours(order.acceptedAt || paymentAt || firstInst?.date || offerAt, -2)
      : null);
  const acceptedAt = mark('acceptedAt', order.acceptedAt, rank >= 3 ? addHours(invoiceAt || offerAt, 1) : null);
  const boardAt = order.jobBoardPublishedAt || null;
  const claimedAt = order.claimedAt || null;
  const assignedAt = order.assignedAt || order.claimApprovedAt || null;
  const interimAt = mark('interimAt',
    latestInterim?.submittedAt || order.interimSubmittedAt,
    rank >= 7 && order.interimDeadline ? asIso(order.interimDeadline, '17:50:00') : null);
  const finalSubmittedAt = mark('finalSubmittedAt',
    order.finalSubmittedAt || latestFinal?.submittedAt,
    rank >= 10 ? addHours(order.finalDeadline, -3) : null);
  const qaReviewedAt = mark('qaReviewedAt',
    latestFinal?.reviewedAt || order.qaReviewedAt || order.deliveredAt,
    (order.qaPassed || rank >= 13) && finalSubmittedAt ? addHours(finalSubmittedAt, 2) : null);
  const deliveredAt = mark('deliveredAt',
    order.deliveredAt || latestFinal?.forwardedAt,
    rank >= 13 ? addHours(qaReviewedAt || finalSubmittedAt, 0.1) : null);
  const finalAcceptedAt = mark('finalAcceptedAt',
    order.finalAcceptedAt,
    (order.customerSatisfied || rank >= 14) ? addHours(order.completedAt || deliveredAt, order.completedAt ? -24 : 24) : null);
  const paidToGwAt = mark('paidToGwAt',
    order.paidToGwAt,
    order.gwPaymentStatus === 'paid' ? (order.completedAt || addHours(finalAcceptedAt, 48)) : null);
  const completedAt = mark('completedAt',
    order.completedAt,
    order.status === 'completed' ? paidToGwAt || finalAcceptedAt : null);
  const result = {
    leadAt, qualifiedAt, offerAt, invoiceAt, acceptedAt, paymentAt, boardAt,
    claimedAt, assignedAt, interimAt, finalSubmittedAt, qaReviewedAt,
    deliveredAt, finalAcceptedAt, paidToGwAt, completedAt,
  };
  // Non-enumerable so existing JSON snapshots and shallow copies don't change.
  Object.defineProperty(result, '__synthetic', { value: synth, enumerable: false });
  return result;
}

// Helper for consumers that want to know whether a specific date is fabricated.
function isSyntheticDate(lifecycle, key) {
  return !!(lifecycle && lifecycle.__synthetic && lifecycle.__synthetic.has(key));
}

function qaStatusForDerivedFinal(order) {
  if (!order) return QA_STATUS.PENDING;
  if (order.status === 'ai_violation_review' || order.status === 'plagiarism_violation_review' || order.flagged) return QA_STATUS.FLAGGED;
  if (order.status === 'revision_required' && !order.qaPassed) return QA_STATUS.REVISION_REQUESTED;
  if (order.qaPassed || statusRank(order) >= 13) return QA_STATUS.PASSED;
  return QA_STATUS.PENDING;
}

function deriveSubmissions(order, submissions) {
  if (!order) return [];
  const actual = [...(submissions || [])].map(s => ({ ...s, synthetic: false }));
  const dates = lifecycleDates(order, actual);
  const rows = [...actual];
  const hasInterim = rows.some(s => isInterimKind(s.kind));
  const hasFinal = rows.some(s => isQaReviewKind(s.kind));
  const hasInvoice = rows.some(s => s.kind === 'final_invoice' || s.kind === 'gw_invoice' || s.invoiceFileName);

  if (!hasInterim && dates.interimAt) {
    rows.push({
      id: `derived-interim-${order.id}`,
      orderId: order.id,
      kind: order.interim2Deadline && statusRank(order) >= 8 ? 'interim_2' : 'interim_1',
      round: 1,
      gwId: order.gwId,
      fileName: `${order.id}_Zwischenstand_${order.interim2Deadline && statusRank(order) >= 8 ? '2' : '1'}.docx`,
      size: 1100000,
      plagiarismScore: null,
      aiScore: null,
      qaStatus: QA_STATUS.AUTO_FORWARDED,
      submittedAt: dates.interimAt,
      forwardedAt: dates.interimAt,
      synthetic: true,
    });
  }

  if (!hasFinal && dates.finalSubmittedAt) {
    rows.push({
      id: `derived-final-${order.id}`,
      orderId: order.id,
      kind: order.status === 'revision_required' ? 'revision' : 'final_work',
      round: Math.max(1, order.revisionRounds || 1),
      gwId: order.gwId,
      fileName: `${order.id}_${order.status === 'revision_required' ? 'Revision' : 'Final'}.docx`,
      size: 2100000,
      plagiarismScore: order.plagiarismScore ?? null,
      aiScore: order.aiScore ?? null,
      qaStatus: qaStatusForDerivedFinal(order),
      submittedAt: dates.finalSubmittedAt,
      reviewedAt: dates.qaReviewedAt,
      forwardedAt: dates.deliveredAt,
      synthetic: true,
    });
  }

  if (!hasInvoice && order.gwId && (order.gwPaymentStatus === 'invoice_received' || order.gwPaymentStatus === 'paid')) {
    rows.push({
      id: `derived-gw-invoice-${order.id}`,
      orderId: order.id,
      kind: 'gw_invoice',
      round: 1,
      gwId: order.gwId,
      fileName: `Honorarrechnung_${order.id}.pdf`,
      size: 90000,
      qaStatus: QA_STATUS.ARCHIVED,
      submittedAt: dates.finalSubmittedAt || dates.deliveredAt || dates.finalAcceptedAt,
      synthetic: true,
    });
  }

  return rows.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

function event(key, at, title, opts) {
  if (!at || !title) return null;
  return { key, at, title, icon: 'dot', dot: '', domain: 'workflow', ...(opts || {}) };
}

function addEvent(list, item) {
  if (!item) return;
  const id = `${item.key || item.title}-${item.at}`;
  if (list.some(e => `${e.key || e.title}-${e.at}` === id)) return;
  list.push(item);
}

function bodyPreview(text) {
  if (!text) return '';
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > 96 ? s.slice(0, 96) + '...' : s;
}

function buildOrderEvents(order, context) {
  if (!order) return [];
  const ctx = context || {};
  const submissions = deriveSubmissions(order, ctx.submissions || []);
  const chat = ctx.chat || null;
  const gw = ctx.gw || null;
  const cust = ctx.customer || null;
  const dates = lifecycleDates(order, submissions);
  const events = [];
  const rank = statusRank(order);

  addEvent(events, event('lead.created', dates.leadAt, 'Inquiry captured in Pipedrive', { icon: 'inbox', dot: 'blue', domain: 'sales', detail: `Lead source: ${order.leadSource || cust?.leadSource || 'unknown'}` }));
  if (rank >= 1) addEvent(events, event('lead.qualified', dates.qualifiedAt, 'Lead qualified for ghostwriting', { icon: 'check', dot: 'blue', domain: 'sales', detail: 'No customer price is exposed before Proposal.' }));
  if (order.offerPdfPreviewedAt) addEvent(events, event('offer.preview', order.offerPdfPreviewedAt, 'Sevdesk proposal PDF preview reviewed', { icon: 'eye', dot: 'blue', domain: 'proposal' }));
  if (dates.offerAt) addEvent(events, event('offer.sent', dates.offerAt, `Proposal ${order.sevdeskOfferNo || ''}`.trim() || 'Proposal created and sent', { icon: 'file-text', dot: 'blue', domain: 'proposal', detail: order.offerSentAt ? 'Sent via Sevdesk/Outlook workflow.' : 'Imported from legacy Pipedrive/Sevdesk snapshot.' }));
  (order.offerEmails || []).forEach((m, i) => addEvent(events, event(`offer.email.${i}`, m.sentAt, `Offer email sent from ${m.from}`, { icon: 'mail', dot: 'green', domain: 'communications', detail: m.subject })));
  if (dates.invoiceAt) addEvent(events, event('invoice.sent', dates.invoiceAt, `Customer accepted proposal; invoice ${order.sevdeskInvoiceNo || ''}`.trim() || 'Customer accepted proposal; invoice issued', { icon: 'file-text', dot: 'blue', domain: 'payment', detail: 'Payment plan and receivable start here.' }));
  (order.installments || []).forEach(i => {
    if (i.status === 'paid') addEvent(events, event(`installment.${i.n}.paid`, asIso(i.date, '12:20:00'), `Installment ${i.n}/${order.installments.length} paid`, { icon: 'wallet', dot: 'green', domain: 'payment', detail: `${i.method || 'payment'} · ${i.amt != null ? 'customer payment recorded' : ''}` }));
    if (i.status === 'overdue') addEvent(events, event(`installment.${i.n}.overdue`, asIso(i.date, '18:01:00'), `Installment ${i.n}/${order.installments.length} became overdue`, { icon: 'alert-triangle', dot: 'red', domain: 'payment', detail: 'Blocks GW Friday release until resolved.' }));
  });
  if (dates.paymentAt && rank >= 4) addEvent(events, event('pipedrive.won', dates.paymentAt, 'Pipedrive deal moved to Won', { icon: 'git-branch', dot: 'green', domain: 'sales', detail: 'Payment confirmed; operational fulfillment can start.' }));
  if (dates.boardAt && order.assignmentMode === 'job_board') {
    addEvent(events, event('jobboard.published', dates.boardAt, 'Order published to GW job board', { icon: 'briefcase', dot: 'blue', domain: 'assignment' }));
  }
  const applications = ctx.applications || [];
  const gwById = ctx.gwById || {};
  const gwNameFor = (gwId) => gwById[gwId]?.name || (gwId === order.gwId ? gw?.name : null) || gwId || 'GW';
  applications.forEach(app => {
    if (!app?.appliedAt) return;
    addEvent(events, event(`gw.application.${app.id}.applied`, app.appliedAt, `${gwNameFor(app.gwId)} applied for the job`, {
      icon: 'send', dot: 'blue', domain: 'assignment',
      detail: app.pitch ? bodyPreview(app.pitch) : 'Awaiting admin review.',
    }));
    if (app.status === 'approved' && app.resolvedAt) {
      addEvent(events, event(`gw.application.${app.id}.approved`, app.resolvedAt, `Admin approved ${gwNameFor(app.gwId)}'s application`, {
        icon: 'check-circle', dot: 'green', domain: 'assignment',
      }));
    }
    if (app.status === 'rejected' && app.resolvedAt) {
      const reasonLabel = app.rejectedBy === 'cascade'
        ? 'Another applicant was approved.'
        : app.rejectedBy === 'direct_assigned_outside_board'
          ? 'Admin assigned a different GW directly.'
          : null;
      addEvent(events, event(`gw.application.${app.id}.rejected`, app.resolvedAt, `${gwNameFor(app.gwId)}'s application rejected`, {
        icon: 'x', dot: 'amber', domain: 'assignment', detail: reasonLabel,
      }));
    }
  });
  const hasApprovedApplicationForGw = applications.some(a => a.gwId === order.gwId && a.status === 'approved');
  if (dates.claimedAt && order.gwId && !order.selfAssigned && !hasApprovedApplicationForGw) {
    addEvent(events, event('gw.claimed', dates.claimedAt, `${gw?.name || 'GW'} claimed the assignment`, {
      icon: 'feather',
      dot: order.status === 'claimed_pending_approval' ? 'amber' : 'blue',
      domain: 'assignment',
      detail: order.status === 'claimed_pending_approval' ? 'Awaiting admin approval.' : null,
    }));
    if (order.claimApprovedAt && order.status !== 'claimed_pending_approval') {
      addEvent(events, event('gw.claim.approved', order.claimApprovedAt, `Admin approved ${gw?.name || 'GW'}'s claim`, {
        icon: 'check-circle', dot: 'green', domain: 'assignment',
      }));
    }
  }
  if (dates.assignedAt && order.gwId) {
    let title;
    let detail;
    if (order.selfAssigned) {
      title = `Self-assigned to ${gw?.name || 'Berat'}`;
      detail = 'Hidden from GW board; no external GW payout.';
    } else if (hasApprovedApplicationForGw || order.assignmentMode === 'job_board') {
      title = `${gw?.name || 'GW'} assigned · briefing sent`;
      detail = 'Application approved — GW briefed; customer notified their writer is assigned (intro follows in the order chat).';
    } else if (order.claimedAt) {
      title = `${gw?.name || 'GW'} assigned · briefing sent`;
      detail = 'Claim approved — GW briefed; customer notified their writer is assigned (intro follows in the order chat).';
    } else {
      title = `${gw?.name || 'GW'} directly assigned · briefing sent`;
      detail = 'Admin assigned without job-board posting — GW briefed; customer notified their writer is assigned (intro follows in the order chat).';
    }
    addEvent(events, event('gw.assigned', dates.assignedAt, title, { icon: 'user', dot: 'green', domain: 'assignment', detail }));
  }
  if (order.firstContactReceiptConfirmedAt) addEvent(events, event('gw.first_contact.receipt', order.firstContactReceiptConfirmedAt, 'GW confirmed assignment receipt to efactory1', { icon: 'check', dot: 'green', domain: 'assignment', detail: gw?.name || null }));
  if (order.firstContactDoneAt) addEvent(events, event('gw.first_contact.posted', order.firstContactDoneAt, 'Introduction posted to order chat', { icon: 'message-square', dot: 'green', domain: 'communications', detail: 'Customer notified to open the chat' }));

  submissions.forEach(s => {
    if (isInterimKind(s.kind)) {
      addEvent(events, event(`submission.${s.id}.interim`, s.submittedAt, `Interim ${s.kind === 'interim_2' ? '2' : '1'} uploaded and auto-forwarded`, { icon: 'send', dot: 'blue', domain: 'submission', detail: s.fileName }));
      return;
    }
    if (s.kind === 'gw_invoice' || s.kind === 'final_invoice') {
      addEvent(events, event(`submission.${s.id}.invoice`, s.submittedAt, 'GW invoice received', { icon: 'file-text', dot: 'blue', domain: 'payment', detail: s.fileName }));
      return;
    }
    addEvent(events, event(`submission.${s.id}.uploaded`, s.submittedAt, `${s.kind === 'revision' ? 'Revision' : 'Final work'} uploaded to efactory1`, { icon: 'upload-cloud', dot: 'blue', domain: 'submission', detail: s.fileName }));
    if (s.qaStatus === QA_STATUS.PENDING) addEvent(events, event(`submission.${s.id}.qa.pending`, s.submittedAt, 'Submission queued for QA', { icon: 'shield', dot: 'amber', domain: 'qa' }));
    if (s.qaStatus === QA_STATUS.PASSED) addEvent(events, event(`submission.${s.id}.qa.passed`, s.reviewedAt || s.forwardedAt || dates.qaReviewedAt, 'QA passed; final forwarded to customer', { icon: 'shield-check', dot: 'green', domain: 'qa', detail: `Plagiarism ${s.plagiarismScore ?? '-'}% · AI ${s.aiScore ?? '-'}%` }));
    if (s.qaStatus === QA_STATUS.REVISION_REQUESTED) addEvent(events, event(`submission.${s.id}.qa.revision`, s.reviewedAt || dates.qaReviewedAt || s.submittedAt, 'QA requested a revision', { icon: 'rotate-ccw', dot: 'amber', domain: 'qa' }));
    if (s.qaStatus === QA_STATUS.FLAGGED || s.flagged) addEvent(events, event(`submission.${s.id}.qa.flagged`, s.reviewedAt || order.qaFlaggedAt || s.submittedAt, order.status === 'plagiarism_violation_review' ? 'QA flagged plagiarism for admin review' : 'QA flagged AI use for admin review', { icon: 'alert-triangle', dot: 'red', domain: 'qa', detail: `Plagiarism ${s.plagiarismScore ?? '-'}% · AI ${s.aiScore ?? '-'}%` }));
  });

  if (order.lastCustomerFeedbackAt && order.status === 'revision_required') addEvent(events, event('customer.revision', order.lastCustomerFeedbackAt, 'Customer requested revision', { icon: 'message-square', dot: 'amber', domain: 'customer', detail: bodyPreview(order.customerRevisionNote) }));
  if (isOrderDisputed(order) || order.lastDisputeAt) addEvent(events, event('customer.dispute', order.lastDisputeAt || order.lastCustomerFeedbackAt || dates.deliveredAt || dates.interimAt, 'Customer dispute opened', { icon: 'alert-triangle', dot: 'amber', domain: 'customer', detail: 'Blocks payout until resolved.' }));
  if (dates.finalAcceptedAt) addEvent(events, event('customer.final.accepted', dates.finalAcceptedAt, 'Customer accepted final delivery', { icon: 'check-circle', dot: 'green', domain: 'customer' }));
  if (order.delayReportedAt) addEvent(events, event('gw.delay', order.delayReportedAt, 'GW reported a delivery delay', { icon: 'clock', dot: 'amber', domain: 'assignment', detail: order.delayReason || null }));
  if (order.extensionPending?.requestedAt) addEvent(events, event('gw.extension', order.extensionPending.requestedAt, 'GW requested scope extension', { icon: 'plus', dot: 'amber', domain: 'assignment', detail: order.extensionPending.description || null }));
  if (order.status === 'on_hold') addEvent(events, event('order.hold', order.holdAt || dates.paymentAt || dates.invoiceAt, 'Order placed on hold', { icon: 'pause-circle', dot: 'amber', domain: 'workflow', detail: order.holdReason || null }));
  if (order.status === 'cancelled') addEvent(events, event('order.cancelled', order.cancelledAt || order.acceptedAt || dates.leadAt, 'Order cancelled', { icon: 'x', dot: 'red', domain: 'workflow', detail: order.cancelReason || order.title }));
  if (order.gwPaymentStatus === 'invoice_received' || order.gwPaymentStatus === 'paid') addEvent(events, event('gw.invoice.received', dates.finalSubmittedAt || dates.deliveredAt || dates.finalAcceptedAt, 'GW invoice is on file', { icon: 'file-text', dot: 'blue', domain: 'payment', detail: order.lastInvoiceFile || 'Required for Friday batch.' }));
  if (order.status === 'payment_pending') addEvent(events, event('release.gate', dates.finalAcceptedAt, releaseGates(order).releasable ? 'Friday release gates clear' : 'Friday release gate evaluated with blockers', { icon: 'shield-check', dot: releaseGates(order).releasable ? 'green' : 'amber', domain: 'payment', detail: releaseGates(order).reasons.filter(r => r !== 'Order is not awaiting Friday release').join(' · ') }));
  if (dates.paidToGwAt || dates.completedAt) addEvent(events, event('gw.paid', dates.paidToGwAt || dates.completedAt, 'Friday batch released GW honorarium', { icon: 'wallet', dot: 'green', domain: 'payment' }));

  (chat?.messages || []).forEach(m => {
    const sender = m.authorRole === 'customer' ? (cust?.name || 'Customer') : m.authorRole === 'gw' ? (gw?.name || 'GW') : 'efactory1';
    addEvent(events, event(`message.${m.id}`, m.at, `${sender} message`, { icon: 'message-square', dot: '', domain: 'communications', detail: bodyPreview(m.body) }));
  });
  (ctx.notifications || []).forEach((n, i) => {
    addEvent(events, event(`notification.${n.id || i}`, n.at, `Notification sent: ${n.title}`, {
      icon: 'bell',
      dot: n.urgent ? 'red' : 'blue',
      domain: 'notification',
      detail: bodyPreview(n.body),
    }));
  });

  return events.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

export {
  ORDER_STATES,
  ACTIVE_GW_ORDER_STATUSES,
  IN_DELIVERY_STATUSES,
  TRANSITIONS,
  CLOSED_SUBMISSION_REASONS,
  canTransition,
  canResolve,
  allowedSubmissionKinds,
  nextExpectedSubmissionKind,
  submissionClosedReason,
  submissionKindToEntityKind,
  nextStateAfterSubmit,
  isInterimKind,
  isQaReviewKind,
  currentRevisionRound,
  canRequestRevision,
  revisionKindForCustomerRequest,
  revisionRoundsForKind,
  MAX_REVISION_ROUNDS_PER_KIND,
  disputes,
  openDisputes,
  currentOpenDispute,
  isOrderDisputed,
  isGwBlocked,
  isPreProposal,
  isPrePayment,
  isOrderPaid,
  canShowMoney,
  canShowReceivable,
  isPostFinal,
  isReleaseGateRelevant,
  releaseGateStageNote,
  canAssign,
  releaseGates,
  statusFor,
  statusRank,
  asIso,
  addHours,
  lifecycleDates,
  isSyntheticDate,
  deliveryProgress,
  completedInterimKinds,
  isFinalSubmitted,
  deriveSubmissions,
  buildOrderEvents,
  allInstallmentsPaid,
};
