// Core workflow rules for eFactory One.
// Pure business logic only: no React, no DOM writes, no side effects.
;(function(){
const ORDER_STATES = [
  'lead','qualified','offer_sent','invoice_sent','available','claimed_pending_approval',
  'active','interim_submitted','under_customer_review','revision_required',
  'final_submitted','qa_review','ai_violation_review','plagiarism_violation_review',
  'delivered','payment_pending','completed','cancelled','on_hold','delay_reported',
  'extension_requested'
];

const PRE_PROPOSAL_STATES = ['lead', 'qualified'];
const PRE_PAYMENT_STATES = ['lead', 'qualified', 'offer_sent', 'invoice_sent'];
const POST_FINAL_STATES = [
  'final_submitted', 'qa_review', 'ai_violation_review', 'plagiarism_violation_review',
  'delivered', 'payment_pending', 'completed'
];
const RELEASE_GATE_RELEVANT_STATES = [
  'delivered', 'payment_pending', 'completed', 'ai_violation_review', 'plagiarism_violation_review'
];
const QA_REVIEW_KINDS = ['final_work', 'revision'];

const CLOSED_SUBMISSION_REASONS = {
  claimed_pending_approval: 'Awaiting admin approval',
  interim_submitted: 'Interim already submitted — awaiting customer feedback',
  under_customer_review: 'Awaiting customer review',
  final_submitted: 'Final submitted — awaiting QA',
  qa_review: 'In QA — no further upload needed',
  delivered: 'Delivered — awaiting customer acceptance/payment gate',
  payment_pending: 'Payment pending — work complete',
  completed: 'Order complete',
  cancelled: 'Order cancelled',
  on_hold: 'Order on hold',
  delay_reported: 'Delay reported — awaiting admin decision',
  extension_requested: 'Extension requested — awaiting admin decision',
  ai_violation_review: 'AI violation under review',
  plagiarism_violation_review: 'Plagiarism violation under review',
};

const TRANSITIONS = {
  approve_claim:        { from: ['claimed_pending_approval'], to: 'active' },
  reject_claim:         { from: ['claimed_pending_approval'], to: 'available' },
  claim_job:            { from: ['available'], to: 'claimed_pending_approval' },
  assign_gw:            { from: ['available','paid_assignment_started','active','delay_reported','extension_requested'], to: 'active' },
  gw_submit_interim:    { from: ['active'], to: 'under_customer_review' },
  gw_submit_final:      { from: ['active','revision_required'], to: 'qa_review' },
  gw_submit_revision:   { from: ['revision_required'], to: 'qa_review' },
  qa_pass_final:        { from: ['qa_review'], to: 'delivered' },
  qa_pass_interim:      { from: ['qa_review','under_customer_review'], to: 'under_customer_review' },
  qa_request_revision:  { from: ['qa_review'], to: 'revision_required' },
  qa_flag_ai:           { from: ['qa_review','final_submitted'], to: 'ai_violation_review' },
  qa_flag_plagiarism:   { from: ['qa_review','final_submitted'], to: 'plagiarism_violation_review' },
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

function allowedSubmissionKinds(order, gwId) {
  if (!order || order.gwId !== gwId) return [];
  if (order.status === 'revision_required') return ['revision'];
  if (order.status !== 'active') return [];
  return [
    order.interimDeadline ? 'interim_1' : null,
    order.interim2Deadline ? 'interim_2' : null,
    'final',
  ].filter(Boolean);
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

function isQaReviewKind(kind) {
  return QA_REVIEW_KINDS.indexOf(kind) >= 0;
}

function isPreProposal(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;
  return PRE_PROPOSAL_STATES.indexOf(status) >= 0;
}

function isPrePayment(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status;
  return PRE_PAYMENT_STATES.indexOf(status) >= 0;
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
    final_submitted: 'Final work is with efactory1/QA. Customer satisfaction and Friday payout are not available yet.',
    qa_review: 'Final work is still in QA. It must pass before the customer can accept it.',
    delivered: 'Final was delivered to the customer. Await customer acceptance before Friday release eligibility.',
    payment_pending: 'Customer accepted the final. Friday release depends on all payout gates.',
    completed: 'Order is complete and the GW payout is already settled.',
    cancelled: 'Order is cancelled. No delivery or payout gate should be shown.',
    on_hold: 'Order is on hold. Resolve the hold before continuing the workflow.',
    delay_reported: 'Delay is awaiting admin decision. Delivery and payout gates are paused.',
    extension_requested: 'Scope extension is awaiting admin/customer approval. Delivery and payout gates are paused.',
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
    revisions_complete:      !order.disputeOpen && order.status !== 'revision_required',
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
  const D = window.EF || {};
  const base = D.STATUS_PILLS?.[order?.status] || { color: 'slate', label: order?.status || 'Unknown' };
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
      final_submitted: 'Qualitätsprüfung',
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

window.EFWorkflow = {
  ORDER_STATES,
  TRANSITIONS,
  CLOSED_SUBMISSION_REASONS,
  canTransition,
  allowedSubmissionKinds,
  submissionClosedReason,
  submissionKindToEntityKind,
  nextStateAfterSubmit,
  isInterimKind,
  isQaReviewKind,
  isPreProposal,
  isPrePayment,
  canShowMoney,
  canShowReceivable,
  isPostFinal,
  isReleaseGateRelevant,
  releaseGateStageNote,
  canAssign,
  releaseGates,
  statusFor,
  allInstallmentsPaid,
};
})();
