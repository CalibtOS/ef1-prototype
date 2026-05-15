// Named business actions. All entity writes should go through here.
//
// Plumbing (patchEntity/upsertEntity/selector shortcuts/toast) lives in
// `internals.js`. Notifications live in `notifications.js`. Threads/messaging
// lives in `threads.js`. This file is the order-lifecycle state machine:
// claim → assign → submit → QA → customer accept → payment release, plus
// admin resolution paths (extension/delay/dispute/violation).
;(function(){
const store = window.EFStore;
const S = window.EFSelectors;
const W = window.EFWorkflow;
const I = window.EFInternals;
const N = window.EFNotifications;
const T = window.EFThreads;

const nowIso = I.nowIso;
const updateTable = I.updateTable;
const patchEntity = I.patchEntity;
const upsertEntity = I.upsertEntity;
const order = I.order;
const gw = I.gw;
const customer = I.customer;
const toast = I.toast;
const notify = N.notify;

function notifyOrder(orderId, payload) {
  const o = order(orderId);
  return notify({
    ...payload,
    orderId,
    customerId: payload.customerId || o?.customerId || null,
    gwId: Object.prototype.hasOwnProperty.call(payload, 'gwId') ? payload.gwId : (o?.gwId || null),
  });
}

function patchOrder(id, patch) {
  patchEntity('orders', id, prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }), 'orders.patch');
}

function createOrder(draft = {}) {
  const { customer: customerDraft, ...orderDraft } = draft || {};
  const id = orderDraft.id || (9100 + Math.floor(Math.random() * 900));
  const nextCustomer = customerDraft?.id ? { ...customerDraft } : null;
  const next = {
    id,
    revisionRounds: 0,
    ...orderDraft,
    customerId: orderDraft.customerId || nextCustomer?.id || null,
  };
  if (nextCustomer) {
    upsertEntity('customers', nextCustomer, 'customers.upsertFromOrderCreate');
  }
  upsertEntity('orders', next, 'orders.create');
  notifyOrder(id, { to: 'admin', kind: 'order_created', title: `New manual order · #${id}`, body: `${next.title || 'Untitled'} · ready for offer/payment workflow` });
  return next;
}

function approveClaim(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'approve_claim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, { status: 'active', claimApprovedAt: nowIso(), assignedAt: nowIso() });
  const g = gw(o.gwId);
  notifyOrder(orderId, { to: 'gw', kind: 'assignment_approved', gwId: o.gwId, title: `Order #${orderId} approved — you may begin`, body: 'Briefing email sent · customer was introduced' });
  notifyOrder(orderId, { to: 'customer', kind: 'assignment_intro', customerId: o.customerId, title: 'Ihr Ghostwriter wurde zugewiesen', body: `${g?.name || 'Ihr Ghostwriter'} meldet sich heute bei Ihnen.` });
  return true;
}

function rejectClaim(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'reject_claim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  const rejectedGwId = o.gwId;
  patchOrder(orderId, { status: 'available', gwId: null, claimedAt: null, claimTermsAccepted: null });
  if (rejectedGwId) {
    notifyOrder(orderId, {
      to: 'gw',
      kind: 'claim_rejected',
      gwId: rejectedGwId,
      title: `Claim declined · #${orderId}`,
      body: 'efactory1 did not approve this claim. The order is back on the job board.',
      route: 'gw-job-board',
    });
  }
  return true;
}

function assignGw(orderId, gwId, opts = {}) {
  const o = order(orderId);
  const guard = W.canAssign(o);
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  const targetGw = gw(gwId);
  if (!targetGw) { toast({ text: 'Ghostwriter not found', tone: 'danger' }); return false; }
  const selfAssigned = !!targetGw.isOwner || !!opts.selfAssigned;
  patchOrder(orderId, {
    gwId,
    status: 'active',
    assignedAt: nowIso(),
    selfAssigned,
    gwPaymentStatus: selfAssigned ? 'no_payment_self_assigned' : (o.gwPaymentStatus || 'work_in_progress'),
  });
  if (!selfAssigned) {
    notifyOrder(orderId, { to: 'gw', kind: 'assignment_approved', gwId, title: `Order #${orderId} assigned`, body: 'Briefing email sent · NICHT WEITERLEITEN' });
  }
  notifyOrder(orderId, { to: 'customer', kind: 'assignment_intro', customerId: o.customerId, title: 'Ihr Ghostwriter wurde zugewiesen', body: `${targetGw.name} meldet sich heute bei Ihnen.` });
  return true;
}

function markInstallmentPaid(orderId, n) {
  const o = order(orderId);
  if (!o) return false;
  const installments = (o.installments || []).map(i => i.n === n ? { ...i, status: 'paid', date: '2026-05-07' } : i);
  const paid = installments.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amt || 0), 0);
  const outstanding = Math.max(0, (o.grossEur || 0) - paid);
  const nextPatch = { installments, paidEur: paid, outstandingEur: outstanding };
  if (o.status === 'invoice_sent' && paid > 0) nextPatch.status = 'available';
  patchOrder(orderId, nextPatch);
  notifyOrder(orderId, { to: 'admin', kind: 'payment_confirmed', title: `Installment ${n} paid · #${orderId}`, body: `Outstanding balance now €${outstanding.toFixed(2)}` });
  notifyOrder(orderId, { to: 'customer', kind: 'payment_confirmed', title: 'Zahlung bestätigt', body: `Auftrag #${orderId} · Rate ${n} verbucht.` });
  return true;
}

function setHonorRate(orderId, rate) {
  const o = order(orderId);
  if (!o) return false;
  const honor = ((o.grossEur || 0) / 1.07) * rate;
  patchOrder(orderId, { rate, netHonorarium: honor });
  return true;
}

function sendOffer(orderId, patch = {}) {
  const o = order(orderId);
  if (!o) return false;
  const nextPatch = {
    status: 'offer_sent',
    offerSentAt: patch.offerSentAt || nowIso(),
    pipedriveStage: patch.pipedriveStage || 'Proposal',
    ...patch,
  };
  patchOrder(orderId, nextPatch);
  notifyOrder(orderId, {
    to: 'customer',
    kind: 'offer_sent',
    title: `Angebot verfügbar · Auftrag #${orderId}`,
    body: `${o.title || 'Ihr Auftrag'} · bitte Angebot prüfen und Rechnungsdaten bestätigen.`,
  });
  return true;
}

function sendInvoice(orderId, patch = {}) {
  const o = order(orderId);
  if (!o) return false;
  const invoiceNo = patch.sevdeskInvoiceNo || o.sevdeskInvoiceNo || `RG-2026-${orderId}`;
  patchOrder(orderId, {
    status: 'invoice_sent',
    invoiceSentAt: patch.invoiceSentAt || nowIso(),
    sevdeskInvoiceNo: invoiceNo,
    pipedriveStage: patch.pipedriveStage || 'Rechnung angefordert',
    ...patch,
  });
  notifyOrder(orderId, { to: 'admin', kind: 'invoice_sent', title: `Offer accepted · invoice sent · #${orderId}`, body: `${invoiceNo} issued. Waiting for customer payment.` });
  notifyOrder(orderId, { to: 'customer', kind: 'invoice_sent', title: 'Rechnung verfügbar', body: `Auftrag #${orderId} · ${invoiceNo} wurde erstellt. Bitte Zahlung abschließen.` });
  return true;
}

function confirmPayment(orderId, patch = {}) {
  const o = order(orderId);
  if (!o) return false;
  const paidEur = patch.paidEur ?? (o.grossEur || 0);
  const outstandingEur = patch.outstandingEur ?? 0;
  const nextStatus = patch.status || (o.gwId ? 'active' : 'available');
  patchOrder(orderId, {
    status: nextStatus,
    paidEur,
    outstandingEur,
    paymentConfirmedAt: patch.paymentConfirmedAt || nowIso(),
    pipedriveStage: patch.pipedriveStage || 'Won',
    ...patch,
  });
  notifyOrder(orderId, { to: 'admin', kind: 'payment_confirmed', title: `Payment confirmed · #${orderId}`, body: `Pipedrive Won · ${outstandingEur > 0 ? `outstanding €${Number(outstandingEur).toFixed(2)}` : 'ready for fulfillment'}` });
  notifyOrder(orderId, { to: 'customer', kind: 'payment_confirmed', title: 'Zahlung bestätigt', body: `Auftrag #${orderId} · Ihre Zahlung wurde verbucht.` });
  return true;
}

function holdOrder(orderId, reason) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { status: 'on_hold', holdReason: reason || 'On hold', holdAt: nowIso() });
  if (o.gwId) {
    notifyOrder(orderId, { to: 'gw', kind: 'order_on_hold', gwId: o.gwId, title: `Order on hold · #${orderId}`, body: reason || 'efactory1 paused this assignment. Wait for admin follow-up.' });
    notifyOrder(orderId, { to: 'customer', kind: 'order_on_hold', gwId: o.gwId, title: 'Auftrag pausiert', body: `Auftrag #${orderId} wurde vorübergehend pausiert. efactory1 meldet sich mit den nächsten Schritten.` });
  }
  return true;
}

function cancelAssignment(orderId, reason) {
  const o = order(orderId);
  if (!o || !o.gwId) return false;
  const oldGwId = o.gwId;
  patchOrder(orderId, {
    status: 'available',
    gwId: null,
    assignedAt: null,
    assignmentCancelledAt: nowIso(),
    assignmentCancelReason: reason || null,
  });
  notifyOrder(orderId, { to: 'gw', kind: 'assignment_cancelled', gwId: oldGwId, title: `Assignment cancelled · #${orderId}`, body: reason || 'efactory1 cancelled this assignment. Please stop work until contacted.' });
  notifyOrder(orderId, { to: 'customer', kind: 'assignment_cancelled', gwId: oldGwId, title: 'Ghostwriter-Zuweisung geändert', body: `Auftrag #${orderId} · wir organisieren die weitere Bearbeitung und melden uns kurzfristig.` });
  return true;
}

function cancelOrder(orderId, reason) {
  const o = order(orderId);
  if (!o) return false;
  const oldGwId = o.gwId;
  patchOrder(orderId, { status: 'cancelled', cancelledAt: nowIso(), cancelReason: reason || null });
  if (oldGwId) {
    notifyOrder(orderId, { to: 'gw', kind: 'order_cancelled', gwId: oldGwId, title: `Order cancelled · #${orderId}`, body: reason || 'efactory1 cancelled this order. Stop work and wait for settlement instructions.' });
  }
  if (o.customerId) {
    notifyOrder(orderId, { to: 'customer', kind: 'order_cancelled', gwId: oldGwId, title: 'Auftrag storniert', body: `Auftrag #${orderId} wurde storniert. efactory1 meldet sich zur Abwicklung.` });
  }
  return true;
}

function claimJob(orderId, gwId) {
  const o = order(orderId);
  const actualGwId = gwId || store.getState().session.gwId;
  const guard = W.canTransition(o, 'claim_job');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, {
    status: 'claimed_pending_approval',
    gwId: actualGwId,
    claimedAt: nowIso(),
    claimTermsAccepted: {
      deadline: true,
      fee: true,
      noAi: true,
      plagiarismFree: true,
      gdpr: true,
      agbs: 'v3.2',
    },
  });
  const g = gw(actualGwId);
  notifyOrder(orderId, { to: 'admin', kind: 'claim_pending_your_approval', gwId: actualGwId, title: `Claim awaiting approval · #${orderId}`, body: `${g?.name || 'GW'} claimed this job · 6 acknowledgements signed` });
  return true;
}

function confirmFirstContactReceipt(orderId) {
  const o = order(orderId);
  if (!o) return false;
  const currentGwId = store.getState().session.gwId;
  if (o.gwId !== currentGwId) {
    toast({ text: 'This assignment is not assigned to your account.', tone: 'danger' });
    return false;
  }
  if (o.status !== 'active') {
    toast({ text: 'First contact is only available while the assignment is active.', tone: 'danger' });
    return false;
  }
  if (o.firstContactReceiptConfirmedAt) return true;
  const at = nowIso();
  patchOrder(orderId, {
    firstContactReceiptConfirmedAt: at,
    firstContactReceiptConfirmedBy: currentGwId,
  });
  notify({
    to: 'admin',
    kind: 'first_contact_receipt_confirmed',
    orderId,
    gwId: currentGwId,
    customerId: o.customerId,
    title: `Receipt confirmed · #${orderId}`,
    body: `${gw(currentGwId)?.name || 'GW'} confirmed the assignment email and is preparing first customer contact.`,
  });
  return true;
}

function completeFirstContact(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return null;
  if (!confirmFirstContactReceipt(orderId)) return null;

  const beforeThread = T.selectThreadByOrder(store.getState(), orderId);
  const msg = T.send({
    orderId,
    role: 'gw',
    body: payload.body || '',
    origin_channel: 'first_contact_wizard',
    delivery_channel: 'email',
    external_ref: `first-contact-${orderId}`,
    financialPolicyExempt: true,
    policy_exemption: 'sop_first_contact_template',
  });
  if (!msg) {
    toast({ text: 'Intro email body is empty.', tone: 'danger' });
    return null;
  }

  const subject = (payload.subject || '').trim();
  if (!beforeThread && subject) {
    patchEntity('threads', msg.threadId, prev => ({ ...prev, subject }), 'threads.firstContact.subject');
  }
  patchOrder(orderId, prev => ({
    ...prev,
    firstContactDone: true,
    firstContactDoneAt: prev.firstContactDoneAt || msg.at,
    firstContactMessageId: msg.id,
    firstContactThreadId: msg.threadId,
    firstContactSubject: subject || prev.firstContactSubject || null,
    firstContactReceiptConfirmedAt: prev.firstContactReceiptConfirmedAt || msg.at,
    firstContactReceiptConfirmedBy: prev.firstContactReceiptConfirmedBy || store.getState().session.gwId,
  }));
  return msg;
}

function submitWork(orderId, payload = {}) {
  const o = order(orderId);
  const currentGwId = payload.gwId || store.getState().session.gwId;
  const kind = payload.kind || 'final';
  if (!W.allowedSubmissionKinds(o, currentGwId).includes(kind)) {
    toast({ text: W.submissionClosedReason(o), tone: 'danger' });
    return null;
  }
  const entityKind = W.submissionKindToEntityKind(kind);
  const nextStatus = W.nextStateAfterSubmit(kind);
  const existing = S.selectSubmissionsForOrder(store.getState(), orderId);
  const isInterim = W.isInterimKind(kind);
  const submission = {
    id: 's-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    orderId: Number(orderId),
    kind: entityKind,
    round: kind === 'revision' ? (o.revisionRounds || 0) + 1 : 1,
    gwId: currentGwId,
    fileName: payload.fileName || payload.workFile?.name || `${orderId}_${entityKind}.docx`,
    invoiceFileName: payload.invoiceFile?.name || payload.invoiceFileName || null,
    size: payload.size || payload.workFile?.size || 1200000,
    plagiarismScore: payload.plagiarismScore ?? 4,
    aiScore: payload.aiScore ?? 8,
    qaStatus: isInterim ? 'auto_forwarded' : 'pending',
    submittedAt: nowIso(),
    forwardedAt: isInterim ? nowIso() : null,
    selfChecks: payload.selfChecks || { noAi: true, ready: true, individual: true, spelling: true, grammar: true, plagiarism: true, requirements: true },
  };
  upsertEntity('submissions', submission, 'gw.submit.submission');
  patchOrder(orderId, {
    status: nextStatus,
    lastSubmissionAt: submission.submittedAt,
    lastSubmissionFile: submission.fileName,
    lastSubmissionKind: kind,
    lastInvoiceFile: submission.invoiceFileName || undefined,
    finalSubmittedAt: kind === 'final' ? submission.submittedAt : o.finalSubmittedAt,
    revisionRounds: kind === 'revision' ? (o.revisionRounds || 0) + 1 : (o.revisionRounds || 0),
    gwPaymentStatus: kind === 'final' && o.gwPaymentStatus !== 'paid' ? 'invoice_received' : o.gwPaymentStatus,
  });
  const g = gw(currentGwId);
  if (isInterim) {
    notifyOrder(orderId, { to: 'customer', kind: 'interim_received', submissionId: submission.id, title: 'Ihr Zwischenstand ist verfügbar', body: `Auftrag #${orderId} · Bitte prüfen und Feedback geben` });
    notifyOrder(orderId, { to: 'admin', kind: 'interim_received', submissionId: submission.id, title: `Interim forwarded · #${orderId}`, body: `${g?.name || 'GW'} uploaded interim · auto-sent to customer` });
    notifyOrder(orderId, { to: 'qa', kind: 'interim_uploaded_auto_forwarded', submissionId: submission.id, title: `Interim uploaded · #${orderId}`, body: `${g?.name || 'GW'} uploaded ${entityKind}. Auto-forwarded to customer; spot-check if needed.` });
  } else {
    notifyOrder(orderId, { to: 'admin', kind: 'final_uploaded', submissionId: submission.id, title: `${kind === 'final' ? 'Final' : 'Revision'} submission · #${orderId}`, body: `${g?.name || 'GW'} uploaded · pending QA` });
    notifyOrder(orderId, { to: 'qa', kind: 'final_uploaded', submissionId: submission.id, title: `New submission · #${orderId}`, body: `${entityKind} · waiting for QA verdict` });
  }
  return submission;
}

function qaPass(submissionId) {
  const state = store.getState();
  const sub = S.byId(state.entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const isFinal = sub.kind === 'final_work' || sub.kind === 'revision';
  patchEntity('submissions', submissionId, { qaStatus: 'passed', reviewedAt: nowIso(), reviewer: 'qa@efactory1.de' }, 'qa.pass.submission');
  patchOrder(sub.orderId, {
    status: isFinal ? 'delivered' : 'under_customer_review',
    qaPassed: true,
    flagged: false,
    deliveredAt: isFinal ? nowIso() : o.deliveredAt,
  });
  notifyOrder(o.id, { to: 'customer', kind: 'qa_passed', submissionId, title: 'Ihre Arbeit hat die Qualitätsprüfung bestanden', body: `Auftrag #${o.id} · ${isFinal ? 'Endabgabe' : 'Zwischenstand'} freigegeben` });
  notifyOrder(o.id, { to: 'gw', kind: 'qa_passed', submissionId, title: `QA passed · #${o.id}`, body: 'Forwarded to customer · payment release gate progressing' });
  notifyOrder(o.id, { to: 'admin', kind: 'qa_passed', submissionId, title: `QA passed · #${o.id}`, body: `${isFinal ? 'Final' : 'Interim'} passed and was forwarded to the customer.` });
  return true;
}

function qaRequestRevision(submissionId) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  patchEntity('submissions', submissionId, { qaStatus: 'revision_requested', reviewedAt: nowIso() }, 'qa.revision.submission');
  patchOrder(sub.orderId, {
    status: 'revision_required',
    revisionRounds: (o.revisionRounds || 0) + 1,
    qaPassed: false,
  });
  notifyOrder(o.id, { to: 'gw', kind: 'revision_required', submissionId, title: `Revision requested on Order #${o.id}`, body: 'QA returned feedback · please resubmit through the platform' });
  notifyOrder(o.id, { to: 'admin', kind: 'revision_required', submissionId, title: `QA requested revision · #${o.id}`, body: `${gw(o.gwId)?.name || 'GW'} must resubmit before customer delivery.` });
  return true;
}

function qaFlag(submissionId, type) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const status = type === 'plagiarism' ? 'plagiarism_violation_review' : 'ai_violation_review';
  const reason = type === 'plagiarism' ? 'Plagiarism suspected' : 'AI use suspected';
  patchEntity('submissions', submissionId, { qaStatus: 'flagged', flagged: true, flagType: type, reviewedAt: nowIso() }, `qa.flag.${type}.submission`);
  patchOrder(sub.orderId, {
    status,
    flagged: true,
    qaFlaggedAt: nowIso(),
    qaFlagReason: reason,
    qaPassed: false,
    paymentBlocked: true,
  });
  notifyOrder(o.id, { to: 'admin', kind: type === 'plagiarism' ? 'plagiarism_violation' : 'ai_violation', submissionId, title: `🚨 ${reason} · #${o.id}`, body: `QA flagged ${gw(o.gwId)?.name || 'GW'}. Payment is blocked and admin review is required.`, urgent: true });
  return true;
}

function approveInterim(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_approve_interim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, { status: 'active', interimCustomerSatisfied: true, lastCustomerFeedbackAt: nowIso() });
  notifyOrder(orderId, { to: 'gw', kind: 'interim_approved', title: 'Zwischenstand freigegeben', body: `Kunde hat Zwischenstand #${orderId} freigegeben` });
  notifyOrder(orderId, { to: 'admin', kind: 'interim_approved', title: `Customer approved interim · #${orderId}`, body: 'GW can continue to the next milestone' });
  return true;
}

function requestCustomerRevision(orderId, note) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_request_revision');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, {
    status: 'revision_required',
    revisionRounds: (o.revisionRounds || 0) + 1,
    lastCustomerFeedbackAt: nowIso(),
    customerRevisionNote: note || '',
  });
  notifyOrder(orderId, { to: 'gw', kind: 'revision_required', title: 'Überarbeitung angefordert', body: `Auftrag #${orderId}: ${(note || '').slice(0, 80)}` });
  notifyOrder(orderId, { to: 'admin', kind: 'revision_required', title: `Customer requested revision · #${orderId}`, body: (note || '').slice(0, 120) });
  return true;
}

function escalate(orderId) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { disputeOpen: true, status: o.status === 'delivered' ? 'revision_required' : o.status, lastDisputeAt: nowIso() });
  notifyOrder(orderId, { to: 'admin', kind: 'dispute_opened', title: `Dispute opened · #${orderId}`, body: 'Customer escalated from the portal · payment release blocked', urgent: true });
  return true;
}

// Customer accepts the final delivery.
// PRD friday_payment_batch.release_gates: customer_satisfied is the gate that
// only the customer can flip; this action is the *only* place it gets set true
// for a final. Status moves delivered → payment_pending which feeds the Friday batch.
function acceptFinal(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_accept_final');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, {
    status: 'payment_pending',
    customerSatisfied: true,
    finalAcceptedAt: nowIso(),
    lastCustomerFeedbackAt: nowIso(),
  });
  notifyOrder(orderId, { to: 'admin', kind: 'final_accepted', title: `Customer accepted final · #${orderId}`, body: 'Order moved to Friday-batch eligibility — release gate now driven by GW invoice + installments.' });
  notifyOrder(orderId, { to: 'gw', kind: 'final_accepted', title: `Final accepted · #${orderId}`, body: 'Customer signed off. Honorarium queues for the next Friday batch once gates clear.' });
  return true;
}

function reportDelay(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, {
    status: 'delay_reported',
    delayReason: payload.reasonKind || payload.reason || 'other',
    delayReportedAt: nowIso(),
    proposedNewDeadline: payload.newDate ? payload.newDate + 'T18:00:00' : payload.proposedNewDeadline,
  });
  notifyOrder(orderId, { to: 'admin', kind: 'delay_reported', title: `Delay reported · #${orderId}`, body: `New proposed date ${payload.newDate || 'TBD'} · reason: ${payload.reasonKind || payload.reason || 'other'}`, urgent: true });
  notifyOrder(orderId, { to: 'customer', kind: 'delay_reported', title: 'Lieferdatum-Anpassung gemeldet', body: `Neuer Termin: ${payload.newDate || 'TBD'}. Wir kümmern uns.` });
  return true;
}

function requestExtension(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, {
    status: 'extension_requested',
    extensionPending: {
      description: payload.description || '',
      extraPages: payload.extraPages || '',
      extraFee: payload.extraFee || '',
      requestedAt: nowIso(),
    },
  });
  notifyOrder(orderId, { to: 'admin', kind: 'extension_requested', title: `Extension requested · #${orderId}`, body: 'GW requests scope review and customer approval before work proceeds' });
  return true;
}

function releaseBatch(orderIds) {
  const ids = Array.from(orderIds || []);
  const released = [];
  ids.forEach(id => {
    const o = order(id);
    if (!o) return;
    const gates = W.releaseGates(o);
    if (!gates.releasable) return;
    patchOrder(id, { status: 'completed', gwPaymentStatus: 'paid', paidToGwAt: nowIso(), completedAt: nowIso() });
    released.push({ id, amount: o.netHonorarium || 0, gwId: o.gwId });
  });
  released.forEach(x => notifyOrder(x.id, { to: 'gw', kind: 'payment_released', gwId: x.gwId, title: `€${Number(x.amount).toLocaleString('de-DE', { minimumFractionDigits: 2 })} released · #${x.id}`, body: 'See your bank in 1–3 business days' }));
  return released;
}

// ============ A5: ADMIN RESOLUTION FOR EXTENSION / DELAY / DISPUTE ============
// Each closes a state that previously had no admin response path (orders would
// stick in extension_requested / delay_reported / disputeOpen forever).

function approveExtension(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  const ext = o.extensionPending || {};
  const extraPages = Number(ext.extraPages) || 0;
  const extraFee = Number(ext.extraFee) || 0;
  const newDeadline = payload.newDeadline || ext.proposedNewDeadline || o.finalDeadline;
  patchOrder(orderId, prev => ({
    ...prev,
    status: 'active',
    finalDeadline: newDeadline,
    pages: (prev.pages || 0) + extraPages,
    grossEur: (prev.grossEur || 0) + extraFee,
    extensionPending: null,
    extensionApprovedAt: nowIso(),
  }));
  notifyOrder(orderId, { to: 'gw', kind: 'extension_approved', title: `Extension approved · #${orderId}`, body: `Scope updated · ${extraPages ? '+' + extraPages + ' pages · ' : ''}${extraFee ? '+' + extraFee + ' € · ' : ''}new deadline ${newDeadline?.slice?.(0,10) || ''}` });
  notifyOrder(orderId, { to: 'customer', kind: 'extension_approved', title: 'Erweiterung genehmigt', body: `Auftrag #${orderId} wurde erweitert. Neuer Liefertermin: ${newDeadline?.slice?.(0,10) || ''}.` });
  return true;
}

function rejectExtension(orderId, reason) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { status: 'active', extensionPending: null, extensionRejectedAt: nowIso(), extensionRejectReason: reason || null });
  notifyOrder(orderId, { to: 'gw', kind: 'extension_rejected', title: `Extension declined · #${orderId}`, body: reason ? `Reason: ${reason}` : 'Please continue with the original scope.' });
  return true;
}

function acceptDelay(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  const newDeadline = payload.newDeadline || o.proposedNewDeadline || o.finalDeadline;
  patchOrder(orderId, {
    status: 'active',
    finalDeadline: newDeadline,
    delayAcceptedAt: nowIso(),
    proposedNewDeadline: null,
  });
  notifyOrder(orderId, { to: 'gw', kind: 'delay_accepted', title: `New deadline confirmed · #${orderId}`, body: `Final deadline now ${newDeadline?.slice?.(0,10) || ''}` });
  notifyOrder(orderId, { to: 'customer', kind: 'delay_accepted', title: 'Neuer Liefertermin bestätigt', body: `Auftrag #${orderId} · neuer Termin ${newDeadline?.slice?.(0,10) || ''}` });
  return true;
}

function proposeNewDelay(orderId, newDeadline) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { proposedNewDeadline: newDeadline });
  notifyOrder(orderId, { to: 'customer', kind: 'delay_counter', title: 'Gegenvorschlag für Liefertermin', body: `Auftrag #${orderId} · vorgeschlagen: ${newDeadline?.slice?.(0,10) || ''}` });
  notifyOrder(orderId, { to: 'gw', kind: 'delay_counter', title: `Admin proposed new deadline · #${orderId}`, body: newDeadline?.slice?.(0,10) || '' });
  return true;
}

function closeDispute(orderId, resolution) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { disputeOpen: false, disputeResolution: resolution || 'resolved', disputeClosedAt: nowIso() });
  notifyOrder(orderId, { to: 'customer', kind: 'dispute_closed', title: `Streitfall gelöst · Auftrag #${orderId}`, body: resolution ? resolution.slice(0, 140) : 'Der Streitfall wurde geschlossen.' });
  notifyOrder(orderId, { to: 'gw', kind: 'dispute_closed', title: `Dispute closed · #${orderId}`, body: resolution ? resolution.slice(0, 140) : 'Closed by admin.' });
  return true;
}

// ============ A6: ADMIN RESOLUTION FOR AI / PLAGIARISM VIOLATIONS ============

function confirmViolation(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  const reasonText = payload.reason || o.qaFlagReason || 'Quality violation confirmed';
  const violationType = o.status === 'plagiarism_violation_review' ? 'plagiarism' : 'ai';
  const originalGwId = o.gwId;
  // Shadow-ban the GW (already an existing action) and reset the order so a new
  // GW can be assigned; payment stays blocked until reassignment + re-QA.
  if (originalGwId) {
    shadowBan(originalGwId, { banned: true, reason: `${violationType === 'plagiarism' ? 'Plagiarism' : 'AI use'} confirmed on #${orderId}`, notify: false });
  }
  patchOrder(orderId, {
    status: 'available',
    gwId: null,
    flagged: false,
    paymentBlocked: false,
    qaPassed: false,
    violationConfirmedAt: nowIso(),
    violationReason: reasonText,
  });
  if (originalGwId) {
    notifyOrder(orderId, { to: 'gw', kind: 'assignment_cancelled', gwId: originalGwId, title: `Assignment ended · #${orderId}`, body: `${violationType === 'plagiarism' ? 'Plagiarism' : 'AI use'} violation confirmed. The assignment was removed and payment is blocked per policy.` });
  }
  notifyOrder(orderId, { to: 'customer', kind: 'violation_confirmed', gwId: originalGwId, title: 'Wir setzen Ihren Auftrag mit einem neuen Ghostwriter fort', body: `Auftrag #${orderId} · die Qualitätsprüfung hat eine Auffälligkeit bestätigt. Wir weisen Ihnen kurzfristig einen neuen Ghostwriter zu — ohne Mehrkosten.` });
  notifyOrder(orderId, { to: 'admin', kind: 'violation_confirmed', gwId: originalGwId, title: `Violation confirmed · #${orderId}`, body: `Order returned to job board · GW shadow-banned · payment block lifted (no honorarium owed).` });
  return true;
}

function clearViolation(orderId, reason) {
  const o = order(orderId);
  if (!o) return false;
  // Restore the order to the appropriate prior state: if a final was already
  // submitted treat as delivered; otherwise back to qa_review.
  const restoreTo = o.lastSubmissionKind === 'final' || o.finalSubmittedAt ? 'delivered' : 'qa_review';
  patchOrder(orderId, {
    status: restoreTo,
    flagged: false,
    paymentBlocked: false,
    qaPassed: restoreTo === 'delivered' ? true : o.qaPassed,
    violationClearedAt: nowIso(),
    violationClearReason: reason || null,
    qaFlagReason: null,
  });
  notifyOrder(orderId, { to: 'gw', kind: 'violation_cleared', title: `Flag cleared · #${orderId}`, body: reason ? `Admin reviewed and cleared the flag: ${reason}` : 'Admin reviewed the evidence and cleared the flag.' });
  notifyOrder(orderId, { to: 'customer', kind: 'violation_cleared', title: 'Auftrag freigegeben', body: `Auftrag #${orderId} · die Endversion wurde nach Prüfung freigegeben.` });
  return true;
}

function shadowBan(gwId, payload = {}) {
  const target = gw(gwId);
  if (!target) return false;
  const banned = payload.banned !== undefined ? payload.banned : !target.banned;
  patchEntity('ghostwriters', gwId, { banned, banReason: banned ? (payload.reason || target.banReason || 'Admin quality control') : null }, 'gws.shadowBan');
  if (payload.notify !== false) {
    notify({ to: 'admin', kind: 'gw_shadow_ban', gwId, title: `${target.name} ${banned ? 'shadow-banned' : 'restored'}`, body: banned ? 'GW stops receiving job-board email alerts but can still access the board.' : 'GW visibility restored.' });
  }
  return true;
}

function setRole(role) {
  store.setState(prev => ({ ...prev, session: { ...prev.session, role } }), 'session.setRole');
}

function setRoute(route) {
  store.setState(prev => ({ ...prev, ui: { ...prev.ui, route } }), 'ui.setRoute');
}

const actions = {
  toast,
  notify,
  session: { setRole, setRoute },
  orders: {
    patch: patchOrder,
    create: createOrder,
    approveClaim,
    rejectClaim,
    assignGw,
    markInstallmentPaid,
    setHonorRate,
    sendOffer,
    sendInvoice,
    confirmPayment,
    hold: holdOrder,
    cancelAssignment,
    cancel: cancelOrder,
    approveExtension,
    rejectExtension,
    acceptDelay,
    proposeNewDelay,
    closeDispute,
    confirmViolation,
    clearViolation,
  },
  gw: {
    claimJob,
    confirmFirstContactReceipt,
    completeFirstContact,
    submit: submitWork,
    reportDelay,
    requestExtension,
  },
  qa: {
    pass: qaPass,
    requestRevision: qaRequestRevision,
    flagAi: (submissionId) => qaFlag(submissionId, 'ai'),
    flagPlagiarism: (submissionId) => qaFlag(submissionId, 'plagiarism'),
  },
  customer: {
    approveInterim,
    requestRevision: requestCustomerRevision,
    acceptFinal,
    escalate,
  },
  payments: { releaseBatch },
  gws: { shadowBan },
  notifications: { markAllRead: N.markAllRead, markRead: N.markRead },
  threads: {
    send: T.send,
    markRead: T.markRead,
    redirect: T.redirect,
    flagFollowUp: T.flagFollowUp,
    snooze: T.snooze,
  },
};

window.EFActions = actions;
})();
