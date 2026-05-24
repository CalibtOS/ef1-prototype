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
  const existing = S.selectSubmissionsForOrder(store.getState(), orderId);
  if (!W.allowedSubmissionKinds(o, currentGwId, existing).includes(kind)) {
    toast({ text: W.submissionClosedReason(o), tone: 'danger' });
    return null;
  }
  const entityKind = W.submissionKindToEntityKind(kind);
  const nextStatus = W.nextStateAfterSubmit(kind);
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
    qaStatus: isInterim ? QA_STATUS.AUTO_FORWARDED : QA_STATUS.PENDING,
    submittedAt: nowIso(),
    forwardedAt: isInterim ? nowIso() : null,
    selfChecks: payload.selfChecks || { noAi: true, ready: true, individual: true, spelling: true, grammar: true, plagiarism: true, requirements: true },
  };
  upsertEntity('submissions', submission, 'gw.submit.submission');
  const orderPatch = {
    status: nextStatus,
    lastSubmissionAt: submission.submittedAt,
    lastSubmissionFile: submission.fileName,
    lastSubmissionKind: kind,
    lastInvoiceFile: submission.invoiceFileName || undefined,
    finalSubmittedAt: kind === 'final' ? submission.submittedAt : o.finalSubmittedAt,
    revisionRounds: kind === 'revision' ? (o.revisionRounds || 0) + 1 : (o.revisionRounds || 0),
    gwPaymentStatus: kind === 'final' && o.gwPaymentStatus !== 'paid' ? 'invoice_received' : o.gwPaymentStatus,
    nextExpectedSubmissionKind: null,
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

function qaRequestRevision(submissionId) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const guard = W.canTransition(o, 'qa_request_revision');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchEntity('submissions', submissionId, { qaStatus: QA_STATUS.REVISION_REQUESTED, reviewedAt: nowIso() }, 'qa.revision.submission');
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
  N.notify({
    to: 'admin',
    kind: 'chat_report',
    orderId,
    urgent: true,
    title: `Chat-Meldung · #${orderId}`,
    body: `${count} ${count === 1 ? 'Nachricht' : 'Nachrichten'} gemeldet · Grund: ${reason}`,
  });
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

function closeDispute(orderId, resolution) {
  const o = order(orderId);
  const guard = W.canResolve(o, 'close_dispute');
  if (!guard.ok) {
    if (import.meta.env?.DEV) console.warn(`[closeDispute] ${guard.reason}`);
    return false;
  }
  patchOrder(orderId, { disputeOpen: false, disputeResolution: resolution || 'resolved', disputeClosedAt: nowIso() });
  notifyOrder(orderId, { to: 'customer', kind: 'dispute_closed', title: `Streitfall gelöst · Auftrag #${orderId}`, body: resolution ? resolution.slice(0, 140) : 'Der Streitfall wurde geschlossen.' });
  notifyOrder(orderId, { to: 'gw', kind: 'dispute_closed', title: `Dispute closed · #${orderId}`, body: resolution ? resolution.slice(0, 140) : 'Closed by admin.' });
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
    reportChatMessages,
  },
  payments: { releaseBatch },
  gws: { shadowBan },
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
