// Named business actions. All entity writes should go through here.
//
// Plumbing (patchEntity/upsertEntity/selector shortcuts/toast) lives in
// `internals.js`. Notifications live in `notifications.js`. Messaging lives in
// `comms.js` (order chats + external messages). This file is the order-
// lifecycle state machine: claim → assign → submit → QA → customer accept →
// payment release, plus admin resolution paths (extension/delay/dispute/violation).
import store from './store.js';
import * as S from './selectors.js';
import * as W from './workflow.js';
import * as I from './internals.js';
import * as N from './notifications.js';
import { orderChats as OC, externalMessages as EM, inboxInternalNotes as IN } from './comms.js';
import * as DomainEvents from './events.js';
import { QA_STATUS } from './status.js';

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
  // No-op on a first assignment (no chat yet); on a re-claim after a prior
  // GW left, this records the handover in the existing transcript.
  OC.postSystem(orderId, `${g?.name || 'Der Ghostwriter'} hat die Bearbeitung dieses Auftrags übernommen.`);
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
  const assignmentMode = opts.assignmentMode || (selfAssigned ? 'self' : 'direct');
  const cascadingFromBoard = opts.assignmentMode !== 'job_board' && o.assignmentMode === 'job_board' && o.jobBoardStatus === 'open';
  let cascadeRejections = [];
  if (cascadingFromBoard) {
    const at = nowIso();
    cascadeRejections = tableItemsByOrder('gw_applications', orderId).filter(a => a.status === 'pending');
    cascadeRejections.forEach(a => {
      patchEntity('gw_applications', a.id, { status: 'rejected', resolvedAt: at, rejectedBy: 'direct_assigned_outside_board' }, 'gw_applications.cascade_reject');
    });
  }
  patchOrder(orderId, {
    gwId,
    status: 'active',
    assignedAt: nowIso(),
    selfAssigned,
    assignmentMode,
    jobBoardStatus: (cascadingFromBoard || assignmentMode === 'job_board') ? 'closed' : null,
    gwPaymentStatus: selfAssigned ? 'no_payment_self_assigned' : (o.gwPaymentStatus || 'work_in_progress'),
  });
  if (!selfAssigned) {
    notifyOrder(orderId, { to: 'gw', kind: 'assignment_approved', gwId, title: `Order #${orderId} assigned`, body: 'Briefing email sent · NICHT WEITERLEITEN' });
  }
  notifyOrder(orderId, { to: 'customer', kind: 'assignment_intro', customerId: o.customerId, title: 'Ihr Ghostwriter wurde zugewiesen', body: `${targetGw.name} meldet sich heute bei Ihnen.` });
  const after = order(orderId);
  DomainEvents.emit('order.gw_assigned', {
    order: after,
    orderId,
    customerId: after?.customerId,
    scenarioId: after?.scenarioId || null,
    gwId,
    gwName: targetGw.name,
    assignmentMode,
    selfAssigned,
  });
  if (cascadingFromBoard && cascadeRejections.length) {
    DomainEvents.emit('order.assignment.board_cancelled', {
      order: after,
      orderId,
      customerId: after?.customerId,
      scenarioId: after?.scenarioId || null,
      rejectedApplications: cascadeRejections.map(a => ({ id: a.id, gwId: a.gwId })),
      reason: 'direct_assigned_outside_board',
    });
  }
  // No-op on a first assignment (no chat yet); on a reassignment this records
  // the new GW joining the existing transcript.
  OC.postSystem(orderId, `${targetGw.name} hat die Bearbeitung dieses Auftrags übernommen.`);
  return true;
}

function publishJobToBoard(orderId, opts = {}) {
  const o = order(orderId);
  if (!o) return { ok: false, reason: 'not_found' };
  if (o.gwId) return { ok: false, reason: 'already_assigned' };
  if (o.assignmentMode === 'job_board' && o.jobBoardStatus === 'open') {
    return { ok: true, order: o, alreadyOpen: true };
  }
  // Admin may edit a small whitelist of fields right before publishing so the
  // GW job board row reflects the final brief. Anything not in the whitelist
  // is ignored — this is not a generic order-edit endpoint.
  const allowed = ['title', 'titleTBD', 'workType', 'field', 'pages', 'finalDeadline', 'interimDeadline', 'netHonorarium', 'gwBoardNote'];
  const editPatch = {};
  if (opts.patch) {
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(opts.patch, k)) editPatch[k] = opts.patch[k];
    }
  }
  patchOrder(orderId, {
    ...editPatch,
    assignmentMode: 'job_board',
    jobBoardStatus: 'open',
    jobBoardPublishedAt: nowIso(),
    status: o.status === 'invoice_sent' ? o.status : (o.status === 'qualified' || o.status === 'offer_sent' ? o.status : 'available'),
  });
  const after = order(orderId);
  const feeLabel = after?.netHonorarium != null ? `€${after.netHonorarium}` : '';
  const detailParts = [after?.title || 'Untitled', after?.field, after?.pages ? `${after.pages} S.` : null, feeLabel].filter(Boolean);
  notifyOrder(orderId, {
    to: 'gw',
    kind: 'job_available',
    title: `New job available · #${orderId}`,
    body: detailParts.join(' · '),
    route: 'gw-job-board',
    params: { orderId },
  });
  DomainEvents.emit('order.assignment.posted_to_board', {
    order: after,
    orderId,
    customerId: after?.customerId,
    scenarioId: after?.scenarioId || null,
  });
  return { ok: true, order: after };
}

function applyForJob(orderId, gwId, payload = {}) {
  const o = order(orderId);
  if (!o) return { ok: false, reason: 'not_found' };
  if (o.gwId) return { ok: false, reason: 'already_assigned' };
  if (o.scenarioId && o.jobBoardStatus !== 'open') return { ok: false, reason: 'board_closed' };
  if (!o.scenarioId && o.status !== 'available') return { ok: false, reason: 'board_closed' };
  const requiredAcks = ['agb', 'noAi', 'gdpr', 'deadline', 'fee', 'individual'];
  const acks = payload.claimTermsAccepted || null;
  const allAcked = !!acks && requiredAcks.every(k => acks[k] === true);
  if (!allAcked) return { ok: false, reason: 'terms_incomplete', missing: requiredAcks.filter(k => !acks || acks[k] !== true) };
  const existing = tableItemsByOrder('gw_applications', orderId).find(a => a.gwId === gwId && a.status === 'pending');
  if (existing) return { ok: true, application: existing, dup: true };
  const application = {
    id: `app-${orderId}-${gwId}-${Date.now().toString(36)}`,
    orderId,
    gwId,
    status: 'pending',
    appliedAt: nowIso(),
    pitch: payload.pitch || '',
    termsAccepted: !!payload.termsAccepted,
    claimTermsAccepted: {
      agb: !!acks.agb,
      noAi: !!acks.noAi,
      gdpr: !!acks.gdpr,
      deadline: !!acks.deadline,
      fee: !!acks.fee,
      individual: !!acks.individual,
      agbs: acks.agbs || 'v3.2',
    },
    scenarioId: o.scenarioId || null,
  };
  upsertEntity('gw_applications', application, 'gw_applications.create');
  const applicantGw = gw(gwId);
  notifyOrder(orderId, {
    to: 'admin',
    kind: 'claim_pending_your_approval',
    gwId,
    applicationId: application.id,
    title: `New application · #${orderId}`,
    body: `${applicantGw?.name || gwId} applied — review & approve.`,
  });
  DomainEvents.emit('gw.application.created', {
    application,
    orderId,
    customerId: o.customerId,
    scenarioId: o.scenarioId || null,
    gwId,
    gwName: applicantGw?.name || null,
  });
  return { ok: true, application };
}

function approveApplication(applicationId) {
  const state = store.getState();
  const app = state.entities.gw_applications?.byId?.[applicationId];
  if (!app) return { ok: false, reason: 'not_found' };
  if (app.status !== 'pending') return { ok: false, reason: 'not_pending' };
  const o = order(app.orderId);
  if (!o) return { ok: false, reason: 'order_missing' };
  if (o.gwId) return { ok: false, reason: 'already_assigned' };
  const approvedAt = nowIso();
  patchEntity('gw_applications', applicationId, { status: 'approved', resolvedAt: approvedAt }, 'gw_applications.approve');
  const peers = tableItemsByOrder('gw_applications', app.orderId).filter(a => a.id !== applicationId && a.status === 'pending');
  peers.forEach(p => {
    patchEntity('gw_applications', p.id, { status: 'rejected', resolvedAt: approvedAt, rejectedBy: 'cascade' }, 'gw_applications.cascade_reject');
  });
  assignGw(app.orderId, app.gwId, { assignmentMode: 'job_board' });
  patchOrder(app.orderId, { jobBoardStatus: 'closed' });
  const after = order(app.orderId);
  DomainEvents.emit('order.assignment.approved', {
    order: after,
    orderId: app.orderId,
    customerId: after?.customerId,
    scenarioId: after?.scenarioId || null,
    approvedApplicationId: applicationId,
    approvedGwId: app.gwId,
    rejectedApplications: peers.map(p => ({ id: p.id, gwId: p.gwId })),
  });
  return { ok: true, application: { ...app, status: 'approved' }, rejectedCount: peers.length };
}

function tableItemsByOrder(kind, orderId) {
  const t = store.getState().entities[kind];
  return (t?.allIds || []).map(id => t.byId[id]).filter(x => x && x.orderId === orderId);
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
  const after = order(orderId);
  DomainEvents.emit('order.offer_sent', {
    order: after,
    customerId: after?.customerId || o.customerId,
    scenarioId: after?.scenarioId || o.scenarioId || null,
    offerNo: after?.sevdeskOfferNo || null,
    totalGross: after?.grossEur ?? null,
    pageRate: after?.offerPageRate ?? null,
    discountPct: after?.discountPct ?? null,
    interimDeadline: after?.interimDeadline || null,
    finalDeadline: after?.finalDeadline || null,
    note: after?.offerNote || null,
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

function defaultInstallmentPlan(totalGross, paymentMethod) {
  const total = Math.max(0, Math.round((Number(totalGross) || 0) * 100) / 100);
  if (paymentMethod === 'stripe_klarna') {
    const each = Math.round((total / 3) * 100) / 100;
    return [
      { n: 1, amt: each, status: 'pending', method: paymentMethod },
      { n: 2, amt: each, status: 'scheduled', method: paymentMethod },
      { n: 3, amt: Math.max(0, Math.round((total - 2 * each) * 100) / 100), status: 'scheduled', method: paymentMethod },
    ];
  }
  if (paymentMethod === 'bank_transfer_sepa') {
    const half = Math.round((total / 2) * 100) / 100;
    return [
      { n: 1, amt: half, status: 'pending', method: paymentMethod },
      { n: 2, amt: Math.max(0, Math.round((total - half) * 100) / 100), status: 'scheduled', method: paymentMethod },
    ];
  }
  return [{ n: 1, amt: total, status: 'pending', method: paymentMethod }];
}

// Customer accepts the offer. Captures billing/AGB/payment-method, transitions
// the order to invoice_sent, builds the installment plan, and emits the
// domain event so sim effects can create the Rechnung artifact, checkout
// session, and email. Idempotent: re-accepting a non-offer_sent order is a
// no-op.
function acceptOffer(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return { ok: false, reason: 'not_found' };
  if (o.status !== 'offer_sent' && o.status !== 'qualified') {
    return { ok: false, reason: 'already_accepted', order: o };
  }
  const paymentMethod = payload.paymentMethod || 'stripe_card';
  const totalGross = o.grossEur || 0;
  const installments = payload.installments || defaultInstallmentPlan(totalGross, paymentMethod);
  const invoiceNo = payload.sevdeskInvoiceNo || o.sevdeskInvoiceNo || `RG-${String(26000 + (Number(orderId) % 100)).padStart(5, '0')}`;
  const acceptedAt = payload.acceptedAt || nowIso();
  const acceptance = {
    acceptedAt,
    billingAddress: payload.billingAddress || null,
    agbVersion: payload.agbVersion || 'v3.2',
    agbAcceptedAt: acceptedAt,
    marketingOptIn: !!payload.marketingOptIn,
  };
  patchOrder(orderId, {
    status: 'invoice_sent',
    invoiceSentAt: acceptedAt,
    sevdeskInvoiceNo: invoiceNo,
    paymentMethodChoice: paymentMethod,
    paidEur: 0,
    outstandingEur: totalGross,
    installments,
    pipedriveStage: 'Rechnung angefordert',
    customerAcceptance: acceptance,
  });
  notifyOrder(orderId, { to: 'admin', kind: 'invoice_sent', title: `Offer accepted · invoice sent · #${orderId}`, body: `${invoiceNo} issued (${paymentMethod}). Waiting for customer payment.` });
  const after = order(orderId);
  DomainEvents.emit('order.offer_accepted', {
    order: after,
    customerId: after?.customerId,
    scenarioId: after?.scenarioId || null,
    invoiceNo,
    paymentMethod,
    installments,
    totalGross,
    billingAddress: acceptance.billingAddress,
  });
  return { ok: true, order: after, invoiceNo, paymentMethod, installments };
}

function confirmPayment(orderId, patch = {}) {
  const o = order(orderId);
  if (!o) return false;
  const installmentN = patch.installmentN ?? null;
  let installments = o.installments ? o.installments.map(i => ({ ...i })) : [];
  let installmentPaid = null;
  if (installmentN != null && installments.length) {
    const idx = installments.findIndex(i => i.n === installmentN);
    if (idx >= 0) {
      if (installments[idx].status === 'paid') return false;
      installments[idx] = { ...installments[idx], status: 'paid', date: patch.paidAt || nowIso().slice(0, 10) };
      installmentPaid = installments[idx];
    }
  } else if (patch.installments) {
    installments = patch.installments;
  } else if (installments.length) {
    installments = installments.map(i => ({ ...i, status: 'paid', date: i.date || nowIso().slice(0, 10) }));
  }
  const paidEur = installments.length
    ? Math.round(installments.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amt) || 0), 0) * 100) / 100
    : (patch.paidEur ?? (o.grossEur || 0));
  const totalGross = Number(o.grossEur || 0);
  const outstandingEur = patch.outstandingEur ?? Math.max(0, Math.round((totalGross - paidEur) * 100) / 100);
  const fullyPaid = installments.length ? installments.every(i => i.status === 'paid') : true;
  const firstInstallmentPaid = installments.length ? installments.find(i => i.n === 1)?.status === 'paid' : true;
  const nextStatus = patch.status || ((firstInstallmentPaid && o.status === 'invoice_sent') ? (o.gwId ? 'active' : 'available') : o.status);
  patchOrder(orderId, {
    status: nextStatus,
    paidEur,
    outstandingEur,
    paymentConfirmedAt: patch.paymentConfirmedAt || nowIso(),
    pipedriveStage: fullyPaid ? (patch.pipedriveStage || 'Won') : (o.pipedriveStage || 'Won'),
    installments,
    ...patch,
  });
  const after = order(orderId);
  notifyOrder(orderId, {
    to: 'admin',
    kind: 'payment_confirmed',
    title: `Payment confirmed · #${orderId}`,
    body: fullyPaid
      ? `All installments paid · ready for fulfillment`
      : `Rate ${installmentPaid?.n || installmentN || 1} confirmed · outstanding €${Number(outstandingEur).toFixed(2)}`,
  });
  notifyOrder(orderId, {
    to: 'customer',
    kind: 'payment_confirmed',
    title: fullyPaid ? 'Zahlung vollständig bestätigt' : `Rate ${installmentPaid?.n || installmentN || 1} bestätigt`,
    body: fullyPaid
      ? `Auftrag #${orderId} · Ihre Zahlung wurde vollständig verbucht.`
      : `Auftrag #${orderId} · Rate ${installmentPaid?.n || installmentN || 1} ist eingegangen.`,
  });
  DomainEvents.emit('payment.confirmed', {
    order: after,
    orderId,
    customerId: after?.customerId,
    scenarioId: after?.scenarioId || null,
    installmentN: installmentPaid?.n || installmentN || null,
    installment: installmentPaid,
    paidEur,
    outstandingEur,
    fullyPaid,
    method: installmentPaid?.method || after?.paymentMethodChoice || null,
  });
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
  OC.postSystem(orderId, `${gw(oldGwId)?.name || 'Der Ghostwriter'} wurde von diesem Auftrag abgezogen. efactory1 organisiert die weitere Bearbeitung.`);
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
  OC.close(orderId, 'Auftrag storniert — dieser Chat ist archiviert.');
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

// The GW introduction is the one dual-channel message in the system: the same
// body is posted into the order chat AND sent to the customer as an email (via
// the `gw.first_contact_sent` event → firstContactSentToCustomer mail). It is
// the only GW-initiated email to the customer — it onboards them into the
// platform, and every message after this stays in the order chat.
function completeFirstContact(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return null;
  if (!confirmFirstContactReceipt(orderId)) return null;

  // Channel 1 — post the introduction into the platform order chat.
  const msg = OC.send({
    orderId,
    role: 'gw',
    body: payload.body || '',
  });
  if (!msg) {
    toast({ text: 'Introduction body is empty.', tone: 'danger' });
    return null;
  }

  const subject = (payload.subject || '').trim();
  patchOrder(orderId, prev => ({
    ...prev,
    firstContactDone: true,
    firstContactDoneAt: prev.firstContactDoneAt || msg.at,
    firstContactMessageId: msg.id,
    firstContactChatId: msg.chatId,
    firstContactSubject: subject || prev.firstContactSubject || null,
    firstContactReceiptConfirmedAt: prev.firstContactReceiptConfirmedAt || msg.at,
    firstContactReceiptConfirmedBy: prev.firstContactReceiptConfirmedBy || store.getState().session.gwId,
  }));
  const after = order(orderId);
  const sendingGw = gw(store.getState().session.gwId);
  // Channel 2 — the same body goes out to the customer as an email. The sim
  // effects layer turns this event into firstContactSentToCustomer.
  DomainEvents.emit('gw.first_contact_sent', {
    order: after,
    orderId,
    customerId: after?.customerId,
    scenarioId: after?.scenarioId || null,
    gwId: sendingGw?.id || null,
    gwName: sendingGw?.name || null,
    gwEmail: sendingGw?.email || null,
    subject: subject || after?.firstContactSubject || null,
    body: payload.body || '',
    ccEmail: 'kundenservice@efactory1.de',
    sentAt: msg.at,
  });
  return msg;
}

function recordFirstContactOutOfBand(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  const currentGwId = store.getState().session.gwId;
  if (o.gwId !== currentGwId) {
    toast({ text: 'This assignment is not assigned to your account.', tone: 'danger' });
    return false;
  }
  if (o.firstContactDoneAt) return true;
  const reason = (payload.reason || '').trim();
  if (!reason) {
    toast({ text: 'Please describe how you contacted the customer.', tone: 'danger' });
    return false;
  }
  const channel = (payload.channel || 'other').trim();
  const at = nowIso();
  patchOrder(orderId, prev => ({
    ...prev,
    firstContactDone: true,
    firstContactDoneAt: at,
    firstContactReceiptConfirmedAt: prev.firstContactReceiptConfirmedAt || at,
    firstContactReceiptConfirmedBy: prev.firstContactReceiptConfirmedBy || currentGwId,
    firstContactSkippedTemplate: true,
    firstContactSkipChannel: channel,
    firstContactSkipReason: reason,
  }));
  DomainEvents.emit('gw.first_contact.recorded_out_of_band', {
    orderId,
    gwId: currentGwId,
    customerId: o.customerId,
    channel,
    reason,
    at,
  });
  notify({
    to: 'admin',
    kind: 'first_contact_out_of_band',
    orderId,
    gwId: currentGwId,
    customerId: o.customerId,
    title: `Intro recorded out-of-band · #${orderId}`,
    body: `${gw(currentGwId)?.name || 'GW'} skipped the intro-email template (channel: ${channel}). Reason: ${reason}`,
  });
  toast({ text: 'Recorded · submissions unlocked. Berat will see this on the admin queue.', tone: 'success' });
  return true;
}

function submitWork(orderId, payload = {}) {
  const o = order(orderId);
  const currentGwId = payload.gwId || store.getState().session.gwId;
  const kind = payload.kind || 'final';
  // Dispute freeze — defense in depth for the UI gate. An open dispute pauses
  // GW production until admin resolves; without this guard a stale route or a
  // direct EFActions.gw.submit call could push work into qa_review while admin
  // is still mediating.
  if (W.isOrderDisputed(o)) {
    toast({ text: 'A dispute is open on this order — work is paused until efactory1 resolves it.', tone: 'danger' });
    return null;
  }
  const existing = S.selectSubmissionsForOrder(store.getState(), orderId);
  if (!W.allowedSubmissionKinds(o, currentGwId, existing).includes(kind)) {
    toast({ text: W.submissionClosedReason(o), tone: 'danger' });
    return null;
  }
  // SOP D intro lock — defense in depth. The GW assignment-detail UI greys out
  // the submission tiles until firstContactDoneAt is set, but a direct call to
  // EFActions.gw.submit (or a stale route) could otherwise post work before
  // the customer has been introduced. Mirror the same gate the UI uses:
  // either the SOP D wizard recorded firstContactDoneAt, or an out-of-band
  // record was logged (firstContactMessageId / firstContactChatId / explicit
  // firstContactSkippedTemplate flag).
  const introDone = !!(o?.firstContactDoneAt || o?.firstContactDone || o?.firstContactMessageId || o?.firstContactChatId || o?.firstContactSkippedTemplate);
  if (!introDone) {
    toast({ text: 'Send the intro email first — required by SOP D before any submission.', tone: 'danger' });
    return null;
  }
  const entityKind = W.submissionKindToEntityKind(kind);
  const nextStatus = W.nextStateAfterSubmit(kind);
  const isInterim = W.isInterimKind(kind);
  const submission = {
    id: 's-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    orderId: Number(orderId),
    kind: entityKind,
    round: kind === 'revision' ? (W.currentRevisionRound(o) || 1) : 1,
    gwId: currentGwId,
    fileName: payload.fileName || payload.workFile?.name || `${orderId}_${entityKind}.docx`,
    invoiceFileName: payload.invoiceFile?.name || payload.invoiceFileName || null,
    size: payload.size || payload.workFile?.size || 1200000,
    plagiarismScore: payload.plagiarismScore ?? 4,
    aiScore: payload.aiScore ?? 8,
    qaStatus: isInterim ? QA_STATUS.AUTO_FORWARDED : QA_STATUS.PENDING,
    submittedAt: nowIso(),
    forwardedAt: isInterim ? nowIso() : null,
    selfChecks: payload.selfChecks || { noAi: true, ready: true, individual: true, spelling: true, grammar: true, plagiarism: true, requirements: true },
    // Optional GW-authored summary of what changed since the prior submission.
    // Set only for resubmits triggered by a revision request — see gw/submit.jsx.
    changeSummary: payload.changeSummary || null,
  };
  upsertEntity('submissions', submission, 'gw.submit.submission');
  const orderPatch = {
    status: nextStatus,
    lastSubmissionAt: submission.submittedAt,
    lastSubmissionFile: submission.fileName,
    lastSubmissionKind: kind,
    lastInvoiceFile: submission.invoiceFileName || undefined,
    finalSubmittedAt: kind === 'final' ? submission.submittedAt : o.finalSubmittedAt,
    // The round counter is bumped only by requestCustomerRevision (one
    // increment per customer feedback). The GW's revision submission is a
    // response, not a new round — so don't increment here.
    revisionRounds: o.revisionRounds || 0,
    gwPaymentStatus: kind === 'final' && o.gwPaymentStatus !== 'paid' ? 'invoice_received' : o.gwPaymentStatus,
    nextExpectedSubmissionKind: null,
    // Clear the open revision request now that the GW has responded. Keep the
    // counters intact — they're the historical record. The next revision (if
    // any) will overwrite source + note + targetKind via the request action.
    revisionRequestSource: o.status === 'revision_required' ? null : o.revisionRequestSource,
    revisionTargetKind: o.status === 'revision_required' ? null : o.revisionTargetKind,
    customerRevisionNote: o.status === 'revision_required' ? null : o.customerRevisionNote,
    qaRevisionNote: o.status === 'revision_required' ? null : o.qaRevisionNote,
  };
  if (isInterim) {
    orderPatch.interimSubmittedAt = submission.submittedAt;
    orderPatch.lastSubmittedInterimKind = kind;
    orderPatch.pendingCustomerReviewKind = kind;
    orderPatch[kind === 'interim_2' ? 'interim2SubmittedAt' : 'interim1SubmittedAt'] = submission.submittedAt;
  } else {
    orderPatch.pendingCustomerReviewKind = null;
  }
  patchOrder(orderId, orderPatch);
  const g = gw(currentGwId);
  if (isInterim) {
    // Interim submissions go DIRECTLY to the customer. No QA review stage.
    notifyOrder(orderId, { to: 'customer', kind: 'interim_received', submissionId: submission.id, title: 'Ihr Zwischenstand ist verfügbar', body: `Auftrag #${orderId} · Bitte prüfen und Feedback geben` });
    notifyOrder(orderId, { to: 'admin', kind: 'interim_received', submissionId: submission.id, title: `Interim forwarded · #${orderId}`, body: `${g?.name || 'GW'} uploaded interim · auto-sent to customer` });
    DomainEvents.emit('gw.submission.interim', {
      submission,
      orderId,
      customerId: o?.customerId,
      scenarioId: o?.scenarioId || null,
      gwId: currentGwId,
      gwName: g?.name || null,
      submissionKind: kind,
      fileName: submission.fileName,
    });
  } else {
    // Final submissions go to QA first; QA forwards to customer on pass.
    notifyOrder(orderId, { to: 'admin', kind: 'final_uploaded', submissionId: submission.id, title: `${kind === 'final' ? 'Final' : 'Revision'} submission · #${orderId}`, body: `${g?.name || 'GW'} uploaded · pending QA` });
    notifyOrder(orderId, { to: 'qa', kind: 'final_uploaded', submissionId: submission.id, title: `New submission · #${orderId}`, body: `${entityKind} · waiting for QA verdict` });
    DomainEvents.emit('gw.submission.final', {
      submission,
      orderId,
      customerId: o?.customerId,
      scenarioId: o?.scenarioId || null,
      gwId: currentGwId,
      gwName: g?.name || null,
      submissionKind: kind,
      fileName: submission.fileName,
    });
  }
  return submission;
}

function qaPass(submissionId) {
  const state = store.getState();
  const sub = S.byId(state.entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const isFinal = sub.kind === 'final_work' || sub.kind === 'revision';
  const guard = W.canTransition(o, isFinal ? 'qa_pass_final' : 'qa_pass_interim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchEntity('submissions', submissionId, { qaStatus: QA_STATUS.PASSED, reviewedAt: nowIso(), reviewer: 'qa@efactory1.de' }, 'qa.pass.submission');
  patchOrder(sub.orderId, {
    status: isFinal ? 'delivered' : 'under_customer_review',
    qaPassed: true,
    flagged: false,
    deliveredAt: isFinal ? nowIso() : o.deliveredAt,
  });
  // Customer is notified ONLY when QA passes a final/revision. Interim does
  // not pass through QA in the canonical workflow (auto-forwarded at submit
  // time), so this branch is also a defensive guard against any non-canonical
  // path that might invoke qaPass on a non-final submission.
  if (isFinal) {
    notifyOrder(o.id, { to: 'customer', kind: 'qa_passed', submissionId, title: 'Ihre Endabgabe ist freigegeben', body: `Auftrag #${o.id} · die Endabgabe wurde nach Qualitätsprüfung an Sie weitergeleitet.` });
  }
  notifyOrder(o.id, { to: 'gw', kind: 'qa_passed', submissionId, title: `QA passed · #${o.id}`, body: isFinal ? 'Final forwarded to customer · payment release gate progressing' : 'QA spot-check passed' });
  notifyOrder(o.id, { to: 'admin', kind: 'qa_passed', submissionId, title: `QA passed · #${o.id}`, body: isFinal ? 'Final passed QA and was forwarded to the customer.' : 'QA spot-check passed (interim).' });
  if (isFinal) {
    DomainEvents.emit('qa.final.released', {
      submission: sub,
      orderId: o.id,
      customerId: o?.customerId,
      scenarioId: o?.scenarioId || null,
      gwId: o?.gwId || sub.gwId || null,
      gwName: gw(o?.gwId || sub.gwId)?.name || null,
      submissionKind: sub.kind === 'revision' ? 'revision' : 'final',
      fileName: sub.fileName,
    });
  }
  return true;
}

function qaRequestRevision(submissionId, note) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const guard = W.canTransition(o, 'qa_request_revision');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  // Defense in depth: the QA queue gates the verdict button on a 10-char
  // textarea, but the QA order-detail page used to call this with no note.
  // Match the policy in one place so any call site without feedback is rejected.
  if (!note || String(note).trim().length < 10) {
    toast({ text: 'Add at least 10 characters of QA feedback before requesting a revision.', tone: 'danger' });
    return false;
  }
  // Same max-round policy as the customer path — QA cannot bypass the cap.
  // Past the limit, admin must mediate via dispute (outcome reassign / refund
  // / scope amendment), not just loop another revision.
  const policy = W.canRequestRevision(o, 'final');
  if (!policy.ok) { toast({ text: policy.reason, tone: 'danger' }); return false; }
  patchEntity('submissions', submissionId, { qaStatus: QA_STATUS.REVISION_REQUESTED, reviewedAt: nowIso() }, 'qa.revision.submission');
  // QA-triggered revision is always on the final (QA only sees final/revision submissions).
  // Mirror the per-kind counter + source tracking that the customer flow already does,
  // so the GW banner can label the feedback source and the round counter actually moves.
  const nextRound = (o.finalRevisionRounds || 0) + 1;
  patchOrder(sub.orderId, {
    status: 'revision_required',
    revisionRequestSource: 'qa',
    revisionTargetKind: 'final',
    revisionRounds: (o.revisionRounds || 0) + 1,
    finalRevisionRounds: nextRound,
    qaRevisionNote: note || '',
    lastCustomerFeedbackAt: nowIso(),
    qaPassed: false,
  });
  const noteSnippet = (note || '').slice(0, 120);
  notifyOrder(o.id, { to: 'gw', kind: 'revision_required', submissionId, title: `QA requested revision · Order #${o.id} (round ${nextRound})`, body: noteSnippet || 'QA returned feedback · please resubmit through the platform' });
  notifyOrder(o.id, { to: 'admin', kind: 'revision_required', submissionId, title: `QA requested revision · #${o.id}`, body: noteSnippet || `${gw(o.gwId)?.name || 'GW'} must resubmit before customer delivery.` });
  DomainEvents.emit('qa.revision.requested', {
    orderId: o.id,
    submissionId,
    customerId: o?.customerId,
    scenarioId: o?.scenarioId || null,
    gwId: o?.gwId || null,
    note: note || '',
    revisionRound: nextRound,
  });
  return true;
}

function qaFlag(submissionId, type) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const guard = W.canTransition(o, type === 'plagiarism' ? 'qa_flag_plagiarism' : 'qa_flag_ai');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  const status = type === 'plagiarism' ? 'plagiarism_violation_review' : 'ai_violation_review';
  const reason = type === 'plagiarism' ? 'Plagiarism suspected' : 'AI use suspected';
  patchEntity('submissions', submissionId, { qaStatus: QA_STATUS.FLAGGED, flagged: true, flagType: type, reviewedAt: nowIso() }, `qa.flag.${type}.submission`);
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
  // Dispute freeze: once a customer has escalated, all customer-side workflow
  // transitions wait for admin resolution. Without this, an "active +
  // disputeOpen" zombie state was reachable by approving an interim mid-dispute.
  if (W.isOrderDisputed(o)) {
    toast({ text: 'Dispute is open — waiting for efactory1 to resolve before workflow can continue.', tone: 'danger' });
    return false;
  }
  const submissions = S.selectSubmissionsForOrder(store.getState(), orderId);
  const progress = W.deliveryProgress(o, submissions);
  const approvedKind = W.isInterimKind(o.pendingCustomerReviewKind)
    ? o.pendingCustomerReviewKind
    : W.isInterimKind(progress.currentKind)
      ? progress.currentKind
      : W.isInterimKind(o.lastSubmissionKind)
        ? o.lastSubmissionKind
        : 'interim_1';
  const nextExpected = approvedKind === 'interim_1' && o.interim2Deadline ? 'interim_2' : 'final';
  const at = nowIso();
  patchOrder(orderId, {
    status: 'active',
    interimCustomerSatisfied: true,
    lastApprovedInterimKind: approvedKind,
    interimApprovedAt: at,
    [approvedKind === 'interim_2' ? 'interim2ApprovedAt' : 'interim1ApprovedAt']: at,
    pendingCustomerReviewKind: null,
    nextExpectedSubmissionKind: nextExpected,
    lastCustomerFeedbackAt: at,
  });
  notifyOrder(orderId, { to: 'gw', kind: 'interim_approved', title: 'Zwischenstand freigegeben', body: `Kunde hat Zwischenstand #${orderId} freigegeben` });
  notifyOrder(orderId, { to: 'admin', kind: 'interim_approved', title: `Customer approved interim · #${orderId}`, body: 'GW can continue to the next milestone' });
  DomainEvents.emit('customer.interim.approved', {
    orderId,
    customerId: o?.customerId,
    gwId: o?.gwId,
    scenarioId: o?.scenarioId || null,
  });
  return true;
}

function requestCustomerRevision(orderId, note) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_request_revision');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  // Per-kind counters: interim and final each get their own independent
  // 1..3 cycle. Status === 'delivered' is the only path where the revision
  // is on the final; everything else (under_customer_review / interim_submitted)
  // is on an interim. `revisionRounds` stays as the legacy total so admin
  // aggregates (dispute summaries, GW averages) keep working.
  const isFinalRevision = o.status === 'delivered';
  const revisionTargetKind = isFinalRevision
    ? 'final'
    : (o.pendingCustomerReviewKind || o.lastSubmittedInterimKind || o.lastSubmissionKind || 'interim_1');
  // Policy gate: max 3 rounds per kind + dispute freeze. Hitting either case
  // means the customer must escalate via dispute instead of looping more
  // revisions. See W.canRequestRevision (workflow.js).
  const policy = W.canRequestRevision(o, revisionTargetKind);
  if (!policy.ok) { toast({ text: policy.reason, tone: 'danger' }); return false; }
  const nextRoundTotal = (o.revisionRounds || 0) + 1;
  // Per-kind round — this is what the email/UI should display so each
  // submission type has its own 1..3 cycle. The legacy total stays on
  // `revisionRounds` for admin aggregates only.
  const nextRoundForKind = isFinalRevision
    ? (o.finalRevisionRounds || 0) + 1
    : (o.interimRevisionRounds || 0) + 1;
  patchOrder(orderId, {
    status: 'revision_required',
    revisionRequestSource: 'customer',
    revisionTargetKind,
    revisionRounds: nextRoundTotal,
    finalRevisionRounds: isFinalRevision ? (o.finalRevisionRounds || 0) + 1 : (o.finalRevisionRounds || 0),
    interimRevisionRounds: isFinalRevision ? (o.interimRevisionRounds || 0) : (o.interimRevisionRounds || 0) + 1,
    lastCustomerFeedbackAt: nowIso(),
    customerRevisionNote: note || '',
    qaRevisionNote: null,
    // Final revision: the previously QA-passed file is no longer the "current"
    // deliverable. The next resubmit goes back through QA, so the timeline /
    // release-gates / customer view must stop treating QA as approved. Interim
    // revisions skip QA entirely so qaPassed (which only applies to finals) is
    // left untouched.
    qaPassed: isFinalRevision ? false : o.qaPassed,
    deliveredAt: isFinalRevision ? null : o.deliveredAt,
  });
  notifyOrder(orderId, { to: 'gw', kind: 'revision_required', title: 'Überarbeitung angefordert', body: `Auftrag #${orderId}: ${(note || '').slice(0, 80)}` });
  notifyOrder(orderId, { to: 'admin', kind: 'revision_required', title: `Customer requested revision · #${orderId}`, body: (note || '').slice(0, 120) });
  DomainEvents.emit('customer.revision.requested', {
    orderId,
    customerId: o?.customerId,
    gwId: o?.gwId,
    scenarioId: o?.scenarioId || null,
    note: note || '',
    revisionRound: nextRoundForKind,
    revisionTargetKind,
  });
  return true;
}

// =============================================================================
// Dispute open / close
// =============================================================================
// Per docs/flows/dispute/dispute_flow_design_review.md §4: opening a dispute does NOT change
// order.status. It pushes a new dispute object to `order.disputes[]`, locks
// the platform chat asymmetrically (admin can still post, customer + GW
// can't), and notifies admin. Closing applies an outcome via `closeDispute`
// — outcome side effects (reassign / cancel / extension) may change status,
// but the close itself never does.
//
// The legacy `disputeOpen` boolean is kept for back-compat with seed fixtures
// and read predicates that haven't been migrated yet; new code should prefer
// W.isOrderDisputed(order) which honors both the boolean and the array.

const DISPUTE_REASON_CATEGORIES = ['out_of_scope', 'unresponsive', 'quality', 'abusive', 'late', 'other'];
const DISPUTE_REASON_MIN_LENGTH = 30;

function nextDisputeId() {
  return 'd-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
}

function openDispute(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) { toast({ text: 'Order not found.', tone: 'danger' }); return null; }

  // Pre-paid orders can't reach a state where a dispute makes sense — escalation
  // assumes work has started and money is involved. Terminal states are also
  // blocked: completed/cancelled orders are closed business, no live mediation.
  if (W.isPrePayment(o)) {
    toast({ text: 'Disputes are only available after payment.', tone: 'danger' });
    return null;
  }
  if (['completed', 'cancelled'].includes(o.status)) {
    toast({ text: 'This order is closed — disputes cannot be opened on it.', tone: 'danger' });
    return null;
  }

  // Prevent concurrent disputes — the rare case of customer+GW opening at the
  // same time is confusing for admin. Whoever clicks first owns the dispute.
  if (W.currentOpenDispute(o)) {
    toast({ text: 'A dispute is already under review for this order.', tone: 'danger' });
    return null;
  }

  const openedBy = payload.openedBy === 'gw' ? 'gw' : 'customer';
  const openedById = openedBy === 'gw' ? (payload.openedById || o.gwId) : (payload.openedById || o.customerId);
  const reasonCategory = DISPUTE_REASON_CATEGORIES.includes(payload.reasonCategory) ? payload.reasonCategory : 'other';
  const reason = String(payload.reason || '').trim();
  if (reason.length < DISPUTE_REASON_MIN_LENGTH) {
    toast({ text: `Describe the issue in at least ${DISPUTE_REASON_MIN_LENGTH} characters before opening a dispute.`, tone: 'danger' });
    return null;
  }

  const at = nowIso();
  const dispute = {
    id: nextDisputeId(),
    openedBy,
    openedById,
    openedAt: at,
    reasonCategory,
    reason,
    status: 'open',
    outcome: null,
    outcomeNote: '',
    resolvedAt: null,
    resolvedBy: null,
    adminNotes: [],
    affectedSubmissionId: payload.affectedSubmissionId || null,
    alsoBlockedGw: false,
    extensionRef: null,
  };

  patchOrder(orderId, prev => ({
    ...prev,
    disputes: [...(prev.disputes || []), dispute],
    disputeOpen: true,        // keep the legacy boolean in sync for back-compat
    lastDisputeAt: at,
  }));

  // Asymmetric chat lock — see §7 of the design doc. Customer + GW composers
  // honor this and refuse new posts; admin's composer bypasses it.
  OC.lockForDispute(orderId, at);

  // Other-party + admin notifications. The opener gets a confirmation via
  // toast on the UI side; no in-app duplicate here.
  const otherParty = openedBy === 'gw' ? 'customer' : 'gw';
  const reasonSnippet = reason.length > 120 ? reason.slice(0, 120) + '…' : reason;
  notifyOrder(orderId, {
    to: 'admin',
    kind: 'dispute_opened',
    title: `Dispute opened · #${orderId}`,
    body: `${openedBy === 'gw' ? (gw(o.gwId)?.name || 'GW') : (customer(o.customerId)?.name || 'Customer')} escalated · ${reasonCategory.replace('_', ' ')} · ${reasonSnippet}`,
    urgent: true,
  });
  if (otherParty === 'customer' && o.customerId) {
    notifyOrder(orderId, {
      to: 'customer',
      kind: 'dispute_opened',
      title: `Streitfall eröffnet · #${orderId}`,
      body: 'Ihr Ghostwriter hat einen Streitfall eröffnet. efactory1 prüft und meldet sich kurzfristig. Der Chat ist während der Klärung pausiert.',
    });
  }
  if (otherParty === 'gw' && o.gwId) {
    notifyOrder(orderId, {
      to: 'gw',
      kind: 'dispute_opened',
      title: `Dispute opened · #${orderId}`,
      body: 'The customer escalated this order. efactory1 will mediate. Platform chat is paused until resolution.',
    });
  }

  DomainEvents.emit('dispute.opened', {
    orderId,
    disputeId: dispute.id,
    openedBy,
    openedById,
    customerId: o.customerId,
    gwId: o.gwId,
    scenarioId: o.scenarioId || null,
    reasonCategory,
    reason,
  });

  return dispute;
}

// Back-compat shim: existing customer.escalate() callers (Eskalieren button)
// route through openDispute. The old signature took just orderId — new
// signature accepts a payload, so old call sites must be migrated to pass
// reason text or they'll fail the min-length guard.
function customerEscalate(orderId, payload = {}) {
  return openDispute(orderId, { ...payload, openedBy: 'customer' });
}

function gwEscalate(orderId, payload = {}) {
  return openDispute(orderId, { ...payload, openedBy: 'gw' });
}

// Customer accepts the final delivery.
// PRD friday_payment_batch.release_gates: customer_satisfied is the gate that
// only the customer can flip; this action is the *only* place it gets set true
// for a final. Status moves delivered → payment_pending which feeds the Friday batch.
function acceptFinal(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_accept_final');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  // See approveInterim — same dispute-freeze invariant. A customer who has
  // escalated can't slide the order into payment_pending while admin is still
  // mediating; the release-gate would otherwise count this as customer_satisfied.
  if (W.isOrderDisputed(o)) {
    toast({ text: 'Dispute is open — waiting for efactory1 to resolve before workflow can continue.', tone: 'danger' });
    return false;
  }
  patchOrder(orderId, {
    status: 'payment_pending',
    customerSatisfied: true,
    finalAcceptedAt: nowIso(),
    lastCustomerFeedbackAt: nowIso(),
  });
  notifyOrder(orderId, { to: 'admin', kind: 'final_accepted', title: `Customer accepted final · #${orderId}`, body: 'Order moved to Friday-batch eligibility — release gate now driven by GW invoice + installments.' });
  notifyOrder(orderId, { to: 'gw', kind: 'final_accepted', title: `Final accepted · #${orderId}`, body: 'Customer signed off. Honorarium queues for the next Friday batch once gates clear.' });
  DomainEvents.emit('customer.final.accepted', {
    orderId,
    customerId: o?.customerId,
    scenarioId: o?.scenarioId || null,
    gwId: o?.gwId || null,
    gwName: gw(o?.gwId)?.name || null,
  });
  return true;
}

function reportChatMessages(orderId, messageIds, reason) {
  if (!messageIds || messageIds.length === 0) return false;
  const o = order(orderId);
  if (!o) return false;
  const count = messageIds.length;
  const reporterRole = store.getState().session.role || 'customer';
  const reportedRole = reporterRole === 'customer' ? 'gw' : 'customer';
  const reportId = 'cr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  upsertEntity('chat_reports', {
    id: reportId,
    orderId: Number(orderId),
    customerId: o.customerId,
    gwId: o.gwId,
    messageIds: [...messageIds],
    reason,
    count,
    reporterRole,
    reportedRole,
    reportedAt: nowIso(),
    status: 'pending',
    reviewNote: null,
    reviewedAt: null,
  }, 'chat_reports.add');

  N.notify({
    to: 'admin',
    kind: 'chat_report',
    orderId,
    urgent: true,
    title: `Chat report · #${orderId}`,
    body: `${count} ${count === 1 ? 'message' : 'messages'} reported by ${reporterRole} · Reason: ${reason}`,
    params: { reportId },
  });

  DomainEvents.emit('chat.report_submitted', {
    reportId,
    orderId: Number(orderId),
    customerId: o.customerId,
    gwId: o.gwId,
    reporterRole,
    reportedRole,
    count,
    reason,
    scenarioId: o.scenarioId || null,
  });

  return true;
}

function reviewChatReport(reportId, reviewNote) {
  const report = S.selectChatReport(store.getState(), reportId);
  if (!report || report.status === 'reviewed') return false;
  const note = reviewNote.trim();

  patchEntity('chat_reports', reportId, prev => ({
    ...prev,
    status: 'reviewed',
    reviewNote: note,
    reviewedAt: nowIso(),
  }), 'chat_reports.review');

  const count = report.count;

  N.notify({
    to: report.reporterRole,
    kind: 'chat_report_reviewed',
    orderId: report.orderId,
    title: 'Your report has been reviewed',
    body: `Your report (${count} ${count === 1 ? 'message' : 'messages'}) has been reviewed. Admin: ${note}`,
    params: { reportId },
    customerId: report.customerId,
    gwId: report.gwId,
  });

  DomainEvents.emit('chat.report_reviewed', {
    reportId,
    orderId: report.orderId,
    customerId: report.customerId,
    gwId: report.gwId,
    reporterRole: report.reporterRole,
    count,
    reviewNote: note,
    scenarioId: null,
  });

  return true;
}

function dismissChatReport(reportId) {
  patchEntity('chat_reports', reportId, prev => ({ ...prev, status: 'dismissed' }), 'chat_reports.dismiss');
  return true;
}

function deleteChatReport(reportId) {
  const report = S.selectChatReport(store.getState(), reportId);
  if (!report || report.status !== 'reviewed') return false;
  I.updateTable('chat_reports', table => {
    const byId = { ...table.byId };
    delete byId[reportId];
    const allIds = (table.allIds || []).filter(id => id !== reportId);
    return { ...table, byId, allIds };
  }, 'chat_reports.delete');
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
    OC.close(id, 'Auftrag abgeschlossen — dieser Chat ist archiviert.');
    released.push({ id, amount: o.netHonorarium || 0, gwId: o.gwId, customerId: o.customerId, scenarioId: o.scenarioId || null });
  });
  released.forEach(x => notifyOrder(x.id, { to: 'gw', kind: 'payment_released', gwId: x.gwId, title: `€${Number(x.amount).toLocaleString('de-DE', { minimumFractionDigits: 2 })} released · #${x.id}`, body: 'See your bank in 1–3 business days' }));
  if (released.length > 0) {
    const total = released.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    notify({
      to: 'admin',
      kind: 'payment_released',
      title: `Friday-Batch released · ${released.length} payouts · €${Number(total).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`,
      body: `${released.length} ghostwriter payouts confirmed.`,
    });
    DomainEvents.emit('payments.batch.released', {
      count: released.length,
      totalAmount: total,
      released,
    });
  }
  return released;
}

// ============ A5: ADMIN RESOLUTION FOR EXTENSION / DELAY / DISPUTE ============
// Each closes a state that previously had no admin response path (orders would
// stick in extension_requested / delay_reported / disputeOpen forever).

function approveExtension(orderId, payload = {}) {
  const o = order(orderId);
  const guard = W.canResolve(o, 'approve_extension');
  if (!guard.ok) {
    if (import.meta.env?.DEV) console.warn(`[approveExtension] ${guard.reason}`);
    return false;
  }
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
  const guard = W.canResolve(o, 'reject_extension');
  if (!guard.ok) {
    if (import.meta.env?.DEV) console.warn(`[rejectExtension] ${guard.reason}`);
    return false;
  }
  patchOrder(orderId, { status: 'active', extensionPending: null, extensionRejectedAt: nowIso(), extensionRejectReason: reason || null });
  notifyOrder(orderId, { to: 'gw', kind: 'extension_rejected', title: `Extension declined · #${orderId}`, body: reason ? `Reason: ${reason}` : 'Please continue with the original scope.' });
  return true;
}

function acceptDelay(orderId, payload = {}) {
  const o = order(orderId);
  const guard = W.canResolve(o, 'accept_delay');
  if (!guard.ok) {
    if (import.meta.env?.DEV) console.warn(`[acceptDelay] ${guard.reason}`);
    return false;
  }
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
  const guard = W.canResolve(o, 'propose_delay');
  if (!guard.ok) {
    if (import.meta.env?.DEV) console.warn(`[proposeNewDelay] ${guard.reason}`);
    return false;
  }
  patchOrder(orderId, { proposedNewDeadline: newDeadline });
  notifyOrder(orderId, { to: 'customer', kind: 'delay_counter', title: 'Gegenvorschlag für Liefertermin', body: `Auftrag #${orderId} · vorgeschlagen: ${newDeadline?.slice?.(0,10) || ''}` });
  notifyOrder(orderId, { to: 'gw', kind: 'delay_counter', title: `Admin proposed new deadline · #${orderId}`, body: newDeadline?.slice?.(0,10) || '' });
  return true;
}

// =============================================================================
// Dispute close — outcome-driven resolution.
// =============================================================================
// Per docs/flows/dispute/dispute_flow_design_review.md §9: admin picks one of A/B/C/D and the
// close action wires the appropriate side effects. The dispute close itself
// only updates the dispute object — status changes (if any) come from the
// delegated primitives (cancelAssignment / cancelOrder / approveExtension).
//
// Outcome A — continue_revision : just unlock the chat. GW resumes.
// Outcome B — reassign_gw       : call cancelAssignment + optional blockGwAccount.
// Outcome C — cancel_refund     : call cancelOrder + log refund on order.
// Outcome D — scope_amendment   : call approveExtension (extra fee/pages/deadline).

const DISPUTE_OUTCOMES = ['continue_revision', 'reassign_gw', 'cancel_refund', 'scope_amendment'];
const DISPUTE_NOTE_MIN_LENGTH = 10;

function resolveDispute(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) { toast({ text: 'Order not found.', tone: 'danger' }); return false; }
  const open = W.currentOpenDispute(o);
  if (!open) {
    toast({ text: 'No open dispute on this order.', tone: 'danger' });
    return false;
  }
  const outcome = DISPUTE_OUTCOMES.includes(payload.outcome) ? payload.outcome : null;
  if (!outcome) {
    toast({ text: 'Pick an outcome before closing the dispute.', tone: 'danger' });
    return false;
  }
  const outcomeNote = String(payload.outcomeNote || '').trim();
  if (outcomeNote.length < DISPUTE_NOTE_MIN_LENGTH) {
    toast({ text: `Write at least ${DISPUTE_NOTE_MIN_LENGTH} characters explaining the resolution.`, tone: 'danger' });
    return false;
  }
  const at = nowIso();
  const resolverId = payload.resolvedBy || 'admin-berat';
  // Capture identity scope BEFORE outcome side effects — reassign clears
  // order.gwId, so any post-resolution GW notification/email built off the
  // current order would have `gwId: null` and broadcast to every GW persona
  // in the prototype. Same for customer (defense in depth — currently no
  // outcome clears customerId, but the pattern keeps both paths symmetric).
  const originalGwId = o.gwId;
  const originalCustomerId = o.customerId;

  // Apply outcome side effects FIRST so any failure (e.g. extension fields
  // missing) doesn't leave a half-resolved dispute. Each outcome is delegated
  // to existing primitives so the dispute close itself stays minimal.
  switch (outcome) {
    case 'continue_revision': {
      // No status change. Chat unlocks below. GW resumes work on whatever
      // revision was already active.
      break;
    }
    case 'reassign_gw': {
      const blockGw = payload.alsoBlockGwAccount === true;
      const gwId = o.gwId;
      // cancelAssignment removes the GW and sends the order back to 'available'.
      // The old chat must be archived — disputeLockedAt alone would leave a
      // half-locked chat hanging once the dispute is resolved, and the new GW
      // gets a fresh chat when claimed. Unlock first so the field is clean
      // even though closedAt makes it read-only either way.
      cancelAssignment(orderId, payload.reassignReason || 'Dispute outcome — reassigning to a new ghostwriter');
      OC.unlockFromDispute(orderId);
      OC.close(orderId, 'Ghostwriter wurde abgezogen — Chat archiviert. Neue Zuweisung erhält einen neuen Chat.');
      if (blockGw && gwId) blockGwAccount(gwId, { reason: payload.blockReason || `Dispute on order #${orderId}` });
      break;
    }
    case 'cancel_refund': {
      const refundAmount = Number(payload.refundAmount) || 0;
      // cancelOrder archives the chat via OC.close; unlock first so the
      // dispute-lock field is cleared too (closedAt is one-way, lock is not).
      OC.unlockFromDispute(orderId);
      cancelOrder(orderId, payload.cancelReason || 'Dispute outcome — order cancelled');
      if (refundAmount > 0) {
        patchOrder(orderId, prev => ({
          ...prev,
          refund: { amount: refundAmount, reason: payload.refundReason || 'Dispute refund', at },
        }));
      }
      break;
    }
    case 'scope_amendment': {
      const newDeadline = payload.newDeadline;
      const extraFee = Number(payload.extraFee) || 0;
      const extraPages = Number(payload.extraPages) || 0;
      // Apply scope changes inline so we can preserve the current status — a
      // dispute opened from revision_required must stay in revision_required
      // after the amendment, otherwise the GW gets routed to the wrong
      // upload. approveExtension would force status='active', which is right
      // for the dedicated extension flow but wrong here.
      const normalizedDeadline = newDeadline
        ? (newDeadline.includes('T') ? newDeadline : newDeadline + 'T18:00:00')
        : null;
      patchOrder(orderId, prev => ({
        ...prev,
        pages: (prev.pages || 0) + extraPages,
        grossEur: (prev.grossEur || 0) + extraFee,
        finalDeadline: normalizedDeadline || prev.finalDeadline,
        extensionApprovedAt: at,
        scopeAmendments: [
          ...(prev.scopeAmendments || []),
          { at, extraPages, extraFee, newDeadline: normalizedDeadline, description: payload.amendmentDescription || 'Scope amendment via dispute resolution' },
        ],
      }));
      notifyOrder(orderId, { to: 'gw', kind: 'scope_amended', title: `Scope amended · #${orderId}`, body: `${extraPages ? '+' + extraPages + ' pages · ' : ''}${extraFee ? '+' + extraFee + ' € · ' : ''}${normalizedDeadline ? 'new deadline ' + normalizedDeadline.slice(0,10) : 'deadline unchanged'}` });
      notifyOrder(orderId, { to: 'customer', kind: 'scope_amended', title: 'Umfang angepasst', body: `Auftrag #${orderId} · Umfang aktualisiert${normalizedDeadline ? ` · neuer Liefertermin ${normalizedDeadline.slice(0,10)}` : ''}.` });
      break;
    }
    default:
      break;
  }

  // Mark dispute resolved + clear the chat dispute lock. Outcomes B and C
  // already archived the chat above (closedAt is one-way and supersedes
  // disputeLockedAt for rendering), but we still unlock to keep the field
  // clean. Outcomes A and D need the unlock to actually restore the
  // customer + GW composer.
  patchOrder(orderId, prev => {
    const disputes = (prev.disputes || []).map(d => d.id === open.id
      ? { ...d, status: 'resolved', outcome, outcomeNote, resolvedAt: at, resolvedBy: resolverId,
          alsoBlockedGw: outcome === 'reassign_gw' && payload.alsoBlockGwAccount === true }
      : d);
    return {
      ...prev,
      disputes,
      disputeOpen: false,
      disputeResolution: outcomeNote,
      disputeClosedAt: at,
    };
  });
  if (outcome === 'continue_revision' || outcome === 'scope_amendment') {
    OC.unlockFromDispute(orderId);
  }

  // Customer + GW notifications. Localized per outcome — see fan-out matrix in
  // docs/flows/dispute/dispute_flow_design_review.md §11. Pass the *original*
  // ids explicitly: after reassign, order.gwId is null and notifyOrder would
  // emit `gwId: null` notifications that any GW persona picks up.
  const notifBody = outcomeNote.length > 140 ? outcomeNote.slice(0, 140) + '…' : outcomeNote;
  notifyOrder(orderId, { to: 'customer', kind: 'dispute_resolved', customerId: originalCustomerId, gwId: originalGwId, title: `Streitfall gelöst · Auftrag #${orderId}`, body: notifBody });
  notifyOrder(orderId, { to: 'gw', kind: 'dispute_resolved', customerId: originalCustomerId, gwId: originalGwId, title: `Dispute resolved · #${orderId}`, body: notifBody });

  DomainEvents.emit('dispute.resolved', {
    orderId,
    disputeId: open.id,
    outcome,
    outcomeNote,
    customerId: originalCustomerId,
    gwId: originalGwId,
    scenarioId: o.scenarioId || null,
  });

  return true;
}

// Back-compat shim — keeps any caller that still passes a free-text resolution
// working until they migrate. If a structured open dispute exists, route through
// the proper outcome=continue_revision resolution. Otherwise (legacy boolean-only
// `disputeOpen=true` rows from seeds), clear the boolean + chat lock directly so
// admin can dismiss the stale flag without inventing a fake structured dispute.
function closeDispute(orderId, resolution) {
  const o = order(orderId);
  if (!o) { toast({ text: 'Order not found.', tone: 'danger' }); return false; }
  if (W.currentOpenDispute(o)) {
    return resolveDispute(orderId, {
      outcome: 'continue_revision',
      outcomeNote: resolution || 'Resolved by admin.',
    });
  }
  // Legacy path: disputeOpen=true with no entry in disputes[]. Just clear the
  // flag, unlock the chat if it was locked, stamp the resolution metadata.
  if (!o.disputeOpen) {
    toast({ text: 'No dispute is open on this order.', tone: 'info' });
    return false;
  }
  const at = nowIso();
  patchOrder(orderId, {
    disputeOpen: false,
    disputeResolution: resolution || 'Legacy dispute cleared by admin.',
    disputeClosedAt: at,
  });
  OC.unlockFromDispute(orderId);
  notifyOrder(orderId, { to: 'admin', kind: 'dispute_resolved', title: `Legacy dispute cleared · #${orderId}`, body: resolution || 'Legacy disputeOpen flag cleared.' });
  return true;
}

// =============================================================================
// Dispute admin notes — both manual "+ add note" and quick-contact auto-log.
// =============================================================================

function addDisputeNote(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return null;
  // Notes attach to whichever dispute is open right now (or to the most recent
  // resolved one if admin is still wrapping up). Phase 1: only attach to open
  // disputes. Future: support targeting a specific dispute by id.
  const open = W.currentOpenDispute(o);
  if (!open) {
    if (import.meta.env?.DEV) console.warn('[addDisputeNote] no open dispute');
    return null;
  }
  const note = {
    id: 'dn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    at: nowIso(),
    body: String(payload.body || '').trim(),
    channel: ['platform_note', 'email', 'whatsapp', 'phone'].includes(payload.channel) ? payload.channel : 'platform_note',
    recipient: ['customer', 'gw'].includes(payload.recipient) ? payload.recipient : null,
    externalMessageId: payload.externalMessageId || null,
  };
  if (!note.body) return null;
  patchOrder(orderId, prev => {
    const disputes = (prev.disputes || []).map(d => d.id === open.id
      ? { ...d, adminNotes: [...(d.adminNotes || []), note] }
      : d);
    return { ...prev, disputes };
  });
  return note;
}

// Quick-contact action: admin sends an email/WhatsApp to customer or GW from
// the dispute panel. Posts into the existing System B conversation for that
// contact (so the message lives in the normal inbox thread) AND auto-logs a
// note onto the dispute — the audit trail the design doc §7 calls for.
function sendDisputeContact(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) { toast({ text: 'Order not found.', tone: 'danger' }); return null; }
  const recipient = payload.recipient === 'gw' ? 'gw' : 'customer';
  const medium = payload.medium === 'whatsapp' ? 'whatsapp' : 'email';
  const body = String(payload.body || '').trim();
  if (!body) { toast({ text: 'Write a message before sending.', tone: 'danger' }); return null; }
  const contactId = recipient === 'gw' ? o.gwId : o.customerId;
  if (!contactId) { toast({ text: `No ${recipient} on file for this order.`, tone: 'danger' }); return null; }
  // Hand off to the existing System B sender — message becomes part of the
  // normal contact thread, visible in the admin inbox just like any other
  // email/WhatsApp message.
  const message = EM.send({
    contactType: recipient,
    contactId,
    medium,
    direction: 'out',
    subject: payload.subject || `Dispute · Order #${orderId}`,
    body,
  });
  if (!message) return null;
  // Audit-log onto the dispute. Body is the actual message body — the
  // externalMessageId links back to the System B message if admin wants to
  // jump to the inbox thread.
  addDisputeNote(orderId, {
    body,
    channel: medium,
    recipient,
    externalMessageId: message.id,
  });
  return message;
}

// =============================================================================
// GW account block — platform-era replacement for the legacy shadowBan.
// =============================================================================
// shadowBan only stopped Berat's job-availability emails to a GW (manual-world
// workaround). On the platform the right semantic is full account block: the
// GW persona can't log in. See docs/flows/dispute/dispute_flow_design_review.md §1.3.

function blockGwAccount(gwId, payload = {}) {
  const target = gw(gwId);
  if (!target) return false;
  patchEntity('ghostwriters', gwId, {
    accountBlockedAt: nowIso(),
    accountBlockReason: payload.reason || 'Blocked by admin',
  }, 'gws.accountBlock');
  notify({
    to: 'admin',
    kind: 'gw_account_blocked',
    gwId,
    title: `${target.name} blocked from platform`,
    body: payload.reason || 'GW account access revoked. They can no longer log into the platform.',
  });
  return true;
}

function unblockGwAccount(gwId) {
  const target = gw(gwId);
  if (!target) return false;
  patchEntity('ghostwriters', gwId, {
    accountBlockedAt: null,
    accountBlockReason: null,
  }, 'gws.accountUnblock');
  return true;
}

// ============ A6: ADMIN RESOLUTION FOR AI / PLAGIARISM VIOLATIONS ============

function confirmViolation(orderId, payload = {}) {
  const o = order(orderId);
  const guard = W.canResolve(o, 'confirm_violation');
  if (!guard.ok) {
    if (import.meta.env?.DEV) console.warn(`[confirmViolation] ${guard.reason}`);
    return false;
  }
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
  // Archive the flagged submission so the reassigned GW's work doesn't render
  // alongside the rejected one in customer files / QA history. `flagged: true`
  // stays as the historical record (audit trail); qaStatus changes from flagged
  // to archived so file-visibility filters can hide it.
  const subs = S.selectSubmissionsForOrder(store.getState(), orderId);
  const flaggedSub = [...subs].filter(s => s.flagged || s.qaStatus === QA_STATUS.FLAGGED)
    .sort((a, b) => new Date(b.reviewedAt || b.submittedAt || 0) - new Date(a.reviewedAt || a.submittedAt || 0))[0];
  if (flaggedSub) {
    patchEntity('submissions', flaggedSub.id, {
      qaStatus: QA_STATUS.ARCHIVED,
      reviewedAt: nowIso(),
      reviewer: 'qa@efactory1.de (violation confirmed by admin)',
    }, 'qa.confirm.violation.submission');
  }
  if (originalGwId) {
    notifyOrder(orderId, { to: 'gw', kind: 'assignment_cancelled', gwId: originalGwId, title: `Assignment ended · #${orderId}`, body: `${violationType === 'plagiarism' ? 'Plagiarism' : 'AI use'} violation confirmed. The assignment was removed and payment is blocked per policy.` });
  }
  notifyOrder(orderId, { to: 'customer', kind: 'violation_confirmed', gwId: originalGwId, title: 'Wir setzen Ihren Auftrag mit einem neuen Ghostwriter fort', body: `Auftrag #${orderId} · die Qualitätsprüfung hat eine Auffälligkeit bestätigt. Wir weisen Ihnen kurzfristig einen neuen Ghostwriter zu — ohne Mehrkosten.` });
  notifyOrder(orderId, { to: 'admin', kind: 'violation_confirmed', gwId: originalGwId, title: `Violation confirmed · #${orderId}`, body: `Order returned to job board · GW shadow-banned · payment block lifted (no honorarium owed).` });
  OC.postSystem(orderId, `${gw(originalGwId)?.name || 'Der Ghostwriter'} wurde nach einer bestätigten Qualitätsverletzung von diesem Auftrag entfernt. efactory1 weist kurzfristig einen neuen Ghostwriter zu.`);
  return true;
}

function clearViolation(orderId, reason) {
  const o = order(orderId);
  const guard = W.canResolve(o, 'clear_violation');
  if (!guard.ok) {
    if (import.meta.env?.DEV) console.warn(`[clearViolation] ${guard.reason}`);
    return false;
  }
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
  // The submission row that triggered the flag still carries qaStatus='flagged'
  // and flagged=true. Without resetting these the customer-files / QA-history
  // views keep showing the file as flagged even after admin cleared it. Patch
  // the latest flagged submission for the order to match the restored state.
  const subs = S.selectSubmissionsForOrder(store.getState(), orderId);
  const flaggedSub = [...subs].filter(s => s.flagged || s.qaStatus === QA_STATUS.FLAGGED)
    .sort((a, b) => new Date(b.reviewedAt || b.submittedAt || 0) - new Date(a.reviewedAt || a.submittedAt || 0))[0];
  if (flaggedSub) {
    patchEntity('submissions', flaggedSub.id, {
      qaStatus: restoreTo === 'delivered' ? QA_STATUS.PASSED : QA_STATUS.PENDING,
      flagged: false,
      flagType: null,
      reviewedAt: nowIso(),
      reviewer: restoreTo === 'delivered' ? 'qa@efactory1.de (cleared by admin)' : (flaggedSub.reviewer || null),
      forwardedAt: restoreTo === 'delivered' ? nowIso() : flaggedSub.forwardedAt,
    }, 'qa.clear.submission');
  }
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

// Atomic persona switch: role + optional customerId/gwId in one transition.
// Used by the persona dropdown so that switching into a customer (seeded or
// dynamic) attaches the correct identity in the same tick the role flips.
function setPersona({ role, customerId, gwId }) {
  store.setState(prev => {
    const next = { ...prev.session };
    if (role) next.role = role;
    if (customerId) next.customerId = customerId;
    if (gwId) next.gwId = gwId;
    return { ...prev, session: next };
  }, 'session.setPersona');
}

function setRoute(route) {
  store.setState(prev => ({ ...prev, ui: { ...prev.ui, route } }), 'ui.setRoute');
}

const actions = {
  toast,
  notify,
  session: { setRole, setPersona, setRoute },
  orders: {
    patch: patchOrder,
    create: createOrder,
    approveClaim,
    rejectClaim,
    assignGw,
    setHonorRate,
    sendOffer,
    sendInvoice,
    acceptOffer,
    confirmPayment,
    publishJobToBoard,
    approveApplication,
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
    applyForJob,
    confirmFirstContactReceipt,
    completeFirstContact,
    recordFirstContactOutOfBand,
    submit: submitWork,
    reportDelay,
    requestExtension,
    escalate: gwEscalate,
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
    escalate: customerEscalate,
    reportChatMessages,
  },
  disputes: {
    open: openDispute,
    openByCustomer: customerEscalate,
    openByGw: gwEscalate,
    resolve: resolveDispute,
    addNote: addDisputeNote,
    sendContact: sendDisputeContact,
  },
  chatReports: {
    review: reviewChatReport,
    dismiss: dismissChatReport,
    delete: deleteChatReport,
  },
  payments: { releaseBatch },
  gws: { shadowBan, blockAccount: blockGwAccount, unblockAccount: unblockGwAccount },
  notifications: { markAllRead: N.markAllRead, markRead: N.markRead },
  orderChats: {
    send: OC.send,
    markRead: OC.markRead,
    ensure: OC.ensure,
  },
  externalMessages: {
    send: EM.send,
    markContactRead: EM.markContactRead,
  },
  inboxInternalNotes: {
    add: IN.add,
  },
};

export default actions;
