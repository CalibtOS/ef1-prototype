// Simulation effect subscribers. Listen to canonical domain events emitted
// from core/actions.js and produce demo evidence: sim_events rows, Demo
// Inbox emails, fake external-system artifacts. This module never owns
// workflow state — domain actions remain authoritative.
//
// Importing this module wires the subscriptions. It is imported once from
// main.jsx for the side-effect.
import * as DomainEvents from '../core/events.js';
import store from '../core/store.js';
import { notify } from '../core/notifications.js';
import * as SimEvents from './events.js';
import * as SimMail from './mail.js';
import * as SimCheckout from './checkout.js';
import * as SimArtifacts from './artifacts.js';

// MAIL_TEMPLATES — declarative manifest of which SimMail builders should fire
// on each domain event. The listener bodies below still own conditional
// gating (e.g. don't resend Kennenlernen on re-offer), but every call to a
// builder goes through `sendMail(eventName, builderName, payload)` which
// validates against this map: a rename, deletion, or typo fails loud at
// startup. See audit Arch-06.
const MAIL_TEMPLATES = {
  'wp.intake_submitted':              ['intakeAdminNotify', 'magicLinkLogin'],
  'order.offer_sent':                 ['offerSentCustomer', 'offerKennenlernenCustomer'],
  'order.offer_accepted':             ['invoiceEmailCustomer'],
  'order.assignment.posted_to_board': ['gwJobAvailableToGw'],
  'gw.application.created':           ['gwApplicationAdminNotify'],
  'order.assignment.approved':        ['gwAssignedToGw', 'gwApplicationRejected'],
  'order.assignment.board_cancelled': ['gwApplicationRejected'],
  'order.gw_assigned':                ['gwAssignedToGw', 'gwAssignedToCustomer'],
  'gw.first_contact_sent':            ['firstContactSentToCustomer'],
  'customer.interim.approved':        ['interimApprovedGwNotify'],
  'gw.submission.interim':            ['interimSubmittedCustomerNotify', 'interimSubmittedAdminNotify'],
  'gw.submission.final':              ['finalSubmittedAdminNotify'],
  'customer.final.accepted':          ['finalAcceptedAdminNotify'],
  'qa.final.released':                ['finalReleasedCustomerNotify'],
  'payments.batch.released':          ['payoutReleasedGw', 'payoutBatchAdminNotify'],
  'payment.failed':                   ['paymentFailedRetryCustomer'],
  'payment.confirmed':                ['paymentReceiptCustomer', 'paymentReceivedAdminNotify'],
  'chat.report_submitted':            ['chatReportAdminNotify'],
  'chat.report_reviewed':             ['chatReportReviewedNotify'],
};

// Startup validation: every builder referenced in MAIL_TEMPLATES must exist
// on SimMail; warn loudly if not. Catches half-finished migrations like
// intakeWelcomeCustomer that get added to a builder list but never wired (or
// vice-versa: renamed mail builders that leave dangling references).
(function validateMailTemplates() {
  const missing = [];
  for (const [event, builders] of Object.entries(MAIL_TEMPLATES)) {
    for (const b of builders) {
      if (typeof SimMail[b] !== 'function') missing.push(`${event} → SimMail.${b}`);
    }
  }
  if (missing.length) {
    console.warn(`[effects/sim] MAIL_TEMPLATES references ${missing.length} missing builder(s):\n  - ${missing.join('\n  - ')}`);
  }
})();

// sendMail — proxy every SimMail call through the manifest. The builder name
// must be listed under the event in MAIL_TEMPLATES; otherwise the dispatch is
// dropped with a dev warning. Production keeps the call but warns to console.
function sendMail(eventName, builderName, payload) {
  const allowed = MAIL_TEMPLATES[eventName];
  if (!allowed || !allowed.includes(builderName)) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn(`[effects/sim] sendMail("${eventName}", "${builderName}") not declared in MAIL_TEMPLATES — declare it or remove the call`);
    }
  }
  const fn = SimMail[builderName];
  if (typeof fn !== 'function') return null;
  return fn(payload);
}

function selectCustomerEmail(customerId) {
  const c = store.getState().entities.customers?.byId?.[customerId];
  return c?.email || '';
}

function selectCustomerName(customerId) {
  const c = store.getState().entities.customers?.byId?.[customerId];
  return c?.name || '';
}

function selectGwEmail(gwId) {
  const g = store.getState().entities.ghostwriters?.byId?.[gwId];
  return g?.email || '';
}

function selectGwName(gwId) {
  const g = store.getState().entities.ghostwriters?.byId?.[gwId];
  return g?.name || '';
}

DomainEvents.on('order.offer_sent', (payload) => {
  const { order, customerId, scenarioId, offerNo, totalGross, pageRate, discountPct, finalDeadline } = payload;
  if (!order) return;
  const orderId = order.id;

  SimEvents.emit({
    source: 'sevdesk',
    kind: 'sevdesk.contact.upsert',
    orderId,
    customerId,
    scenarioId,
    detail: { customerName: selectCustomerName(customerId) },
  });
  SimEvents.emit({
    source: 'sevdesk',
    kind: 'sevdesk.angebot.create',
    orderId,
    customerId,
    scenarioId,
    detail: { offerNo, totalEur: totalGross, pages: order.pages, pageRate, discountPct },
  });
  SimArtifacts.create({
    kind: 'offer_pdf',
    orderId,
    customerId,
    fileName: offerNo ? `${offerNo}.pdf` : `offer-${orderId}.pdf`,
    label: `Angebot ${offerNo || `#${orderId}`}`,
    externalRef: offerNo,
    scenarioId,
  });
  SimEvents.emit({
    source: 'platform',
    kind: 'artifact.offer_pdf.created',
    orderId,
    customerId,
    scenarioId,
    detail: { offerNo, fileName: offerNo ? `${offerNo}.pdf` : `offer-${orderId}.pdf` },
  });

  sendMail('order.offer_sent', 'offerSentCustomer', {
    orderId,
    customerId,
    customerEmail: selectCustomerEmail(customerId),
    customerName: selectCustomerName(customerId),
    offerNo,
    totalGross,
    pages: order.pages,
    pageRate,
    discountPct,
    finalDeadline,
    scenarioId,
  });

  sendMail('order.offer_sent', 'offerKennenlernenCustomer', {
    orderId,
    customerId,
    customerEmail: selectCustomerEmail(customerId),
    customerName: selectCustomerName(customerId),
    scenarioId,
  });

  SimEvents.emit({
    source: 'pipedrive',
    kind: 'pipedrive.deal.move',
    orderId,
    customerId,
    scenarioId,
    detail: { stage: 'Proposal' },
  });
});

DomainEvents.on('order.offer_accepted', (payload) => {
  const { order, customerId, scenarioId, invoiceNo, paymentMethod, installments, totalGross } = payload;
  if (!order) return;
  const orderId = order.id;
  const customerEmail = selectCustomerEmail(customerId);
  const customerName = selectCustomerName(customerId);

  SimEvents.emit({
    source: 'customer',
    kind: 'customer.offer.accept',
    orderId, customerId, scenarioId,
    detail: { paymentMethod, totalGross },
  });
  SimEvents.emit({
    source: 'sevdesk',
    kind: 'sevdesk.rechnung.create',
    orderId, customerId, scenarioId,
    detail: { invoiceNo, totalGross, installmentCount: installments?.length },
  });
  SimArtifacts.create({
    kind: 'invoice_pdf',
    orderId, customerId, scenarioId,
    fileName: invoiceNo ? `${invoiceNo}.pdf` : `invoice-${orderId}.pdf`,
    label: `Rechnung ${invoiceNo || `#${orderId}`}`,
    externalRef: invoiceNo,
  });
  SimEvents.emit({
    source: 'platform',
    kind: 'artifact.invoice_pdf.created',
    orderId, customerId, scenarioId,
    detail: { invoiceNo },
  });

  let checkoutSessionId = null;
  if (paymentMethod && paymentMethod !== 'bank_transfer_sepa') {
    const firstInstallment = installments?.[0];
    const session = SimCheckout.createSession({
      orderId, customerId, scenarioId,
      method: paymentMethod,
      amount: firstInstallment?.amt ?? totalGross,
      installmentN: firstInstallment?.n || 1,
    });
    checkoutSessionId = session.id;
    SimEvents.emit({
      source: 'stripe',
      kind: 'stripe.checkout_session.create',
      orderId, customerId, scenarioId,
      detail: { sid: session.id, method: paymentMethod, amount: session.amount },
    });
  }

  sendMail('order.offer_accepted', 'invoiceEmailCustomer', {
    orderId, customerId, customerEmail, customerName,
    invoiceNo, paymentMethod,
    amountDueNow: installments?.[0]?.amt ?? totalGross,
    totalGross,
    checkoutSessionId,
    scenarioId,
  });

  SimEvents.emit({
    source: 'pipedrive',
    kind: 'pipedrive.deal.move',
    orderId, customerId, scenarioId,
    detail: { stage: 'Rechnung angefordert' },
  });
});

function selectGw(gwId) {
  return store.getState().entities.ghostwriters?.byId?.[gwId] || null;
}

function eligibleGws() {
  const t = store.getState().entities.ghostwriters;
  return (t?.allIds || []).map(id => t.byId[id]).filter(g => g && !g.banned);
}

DomainEvents.on('order.assignment.posted_to_board', (payload) => {
  const { order, customerId, scenarioId } = payload;
  if (!order) return;
  const orderId = order.id;
  SimEvents.emit({
    source: 'platform',
    kind: 'gw_board.job.published',
    orderId, customerId, scenarioId,
    detail: { title: order.title, field: order.field, pages: order.pages },
  });
  const fee = order.netHonorarium || (order.grossEur ? Math.round((order.grossEur / 1.07) * (order.rate || 0.4) * 100) / 100 : null);
  eligibleGws().slice(0, 5).forEach(g => {
    sendMail('order.assignment.posted_to_board', 'gwJobAvailableToGw', {
      orderId,
      gwId: g.id,
      gwEmail: g.email,
      gwName: g.name,
      title: order.title,
      field: order.field,
      pages: order.pages,
      finalDeadline: order.finalDeadline,
      fee,
      scenarioId,
    });
  });
});

DomainEvents.on('gw.application.created', (payload) => {
  const { application, orderId, customerId, scenarioId, gwId } = payload;
  const g = selectGw(gwId);
  SimEvents.emit({
    source: 'gw',
    kind: 'gw.application.created',
    orderId, customerId, scenarioId,
    detail: { applicationId: application.id, gwId, gwName: g?.name },
  });
  sendMail('gw.application.created', 'gwApplicationAdminNotify', {
    orderId,
    customerId,
    customerName: selectCustomerName(customerId),
    gwId,
    gwName: g?.name || null,
    applicationId: application.id,
    pitch: application.pitch || '',
    scenarioId,
  });
});

DomainEvents.on('order.assignment.approved', (payload) => {
  const { order, orderId, customerId, scenarioId, approvedApplicationId, approvedGwId, rejectedApplications } = payload;
  const approved = selectGw(approvedGwId);
  SimEvents.emit({
    source: 'admin',
    kind: 'admin.gw_application.approved',
    orderId, customerId, scenarioId,
    detail: { applicationId: approvedApplicationId, gwId: approvedGwId, gwName: approved?.name },
  });
  (rejectedApplications || []).forEach(r => {
    const rg = selectGw(r.gwId);
    SimEvents.emit({
      source: 'admin',
      kind: 'admin.gw_application.rejected',
      orderId, customerId, scenarioId,
      detail: { applicationId: r.id, gwId: r.gwId, gwName: rg?.name, reason: 'cascade' },
    });
    if (rg?.email) {
      sendMail('order.assignment.approved', 'gwApplicationRejected', { orderId, gwId: r.gwId, gwEmail: rg.email, gwName: rg.name, scenarioId });
    }
  });
});

DomainEvents.on('order.assignment.board_cancelled', (payload) => {
  const { orderId, customerId, scenarioId, rejectedApplications } = payload;
  SimEvents.emit({
    source: 'admin',
    kind: 'admin.gw_board.cancelled',
    orderId, customerId, scenarioId,
    detail: { rejectedCount: (rejectedApplications || []).length, reason: 'direct_assigned_outside_board' },
  });
  (rejectedApplications || []).forEach(r => {
    const rg = selectGw(r.gwId);
    if (rg?.email) {
      sendMail('order.assignment.board_cancelled', 'gwApplicationRejected', { orderId, gwId: r.gwId, gwEmail: rg.email, gwName: rg.name, scenarioId });
    }
  });
});

DomainEvents.on('order.gw_assigned', (payload) => {
  const { order, orderId, customerId, scenarioId, gwId, gwName, assignmentMode, selfAssigned } = payload;
  if (!order) return;
  const customerEmail = selectCustomerEmail(customerId);
  const customerName = selectCustomerName(customerId);
  SimEvents.emit({
    source: 'platform',
    kind: 'platform.gw_assignment.completed',
    orderId, customerId, scenarioId,
    detail: { gwId, gwName, assignmentMode, selfAssigned },
  });
  const g = selectGw(gwId);
  if (!selfAssigned && g?.email) {
    sendMail('order.gw_assigned', 'gwAssignedToGw', {
      orderId, gwId, gwEmail: g.email, gwName: g.name,
      customerName,
      title: order.title,
      finalDeadline: order.finalDeadline,
      scenarioId,
    });
  }
  if (customerEmail) {
    sendMail('order.gw_assigned', 'gwAssignedToCustomer', {
      orderId, customerId, customerEmail, customerName,
      gwName: selfAssigned ? 'Berat Özdemir' : (g?.name || gwName),
      scenarioId,
    });
  }
});

DomainEvents.on('gw.first_contact_sent', (payload) => {
  const { orderId, customerId, scenarioId, gwId, gwName, gwEmail, subject, body, ccEmail } = payload;
  const customerEmail = selectCustomerEmail(customerId);
  const customerName = selectCustomerName(customerId);
  if (!customerEmail) return;
  SimEvents.emit({
    source: 'gw',
    kind: 'gw.first_contact.sent',
    orderId, customerId, scenarioId,
    detail: { gwId, gwName, subject },
  });
  sendMail('gw.first_contact_sent', 'firstContactSentToCustomer', {
    orderId,
    customerId,
    customerEmail,
    customerName,
    gwEmail,
    gwName,
    ccEmail,
    subject,
    body,
    scenarioId,
  });
});

DomainEvents.on('customer.interim.approved', (payload) => {
  const { orderId, customerId, scenarioId, gwId } = payload;
  const g = selectGw(gwId);
  if (!g?.email) return;
  const order = store.getState().entities.orders?.byId?.[orderId];
  SimEvents.emit({
    source: 'customer',
    kind: 'customer.interim.approved',
    orderId, customerId, scenarioId,
    detail: { gwId, gwName: g.name },
  });
  sendMail('customer.interim.approved', 'interimApprovedGwNotify', {
    orderId,
    gwId,
    gwEmail: g.email,
    gwName: g.name,
    customerName: selectCustomerName(customerId),
    finalDeadline: order?.finalDeadline || null,
    scenarioId,
  });
});

DomainEvents.on('gw.submission.interim', (payload) => {
  const { orderId, customerId, scenarioId, gwId, gwName, submissionKind, fileName, submission } = payload;
  SimEvents.emit({
    source: 'gw',
    kind: 'gw.submission.interim',
    orderId, customerId, scenarioId,
    detail: { gwId, gwName, submissionKind, fileName, submissionId: submission?.id },
  });
  sendMail('gw.submission.interim', 'interimSubmittedCustomerNotify', {
    orderId,
    customerId,
    customerEmail: selectCustomerEmail(customerId),
    customerName: selectCustomerName(customerId),
    gwName,
    submissionId: submission?.id,
    submissionKind,
    fileName,
    scenarioId,
  });
  sendMail('gw.submission.interim', 'interimSubmittedAdminNotify', {
    orderId,
    customerId,
    customerName: selectCustomerName(customerId),
    gwId,
    gwName,
    submissionId: submission?.id,
    submissionKind,
    fileName,
    scenarioId,
  });
});

DomainEvents.on('gw.submission.final', (payload) => {
  const { orderId, customerId, scenarioId, gwId, gwName, submissionKind, fileName, submission } = payload;
  SimEvents.emit({
    source: 'gw',
    kind: 'gw.submission.final',
    orderId, customerId, scenarioId,
    detail: { gwId, gwName, submissionKind, fileName, submissionId: submission?.id },
  });
  sendMail('gw.submission.final', 'finalSubmittedAdminNotify', {
    orderId,
    customerId,
    customerName: selectCustomerName(customerId),
    gwId,
    gwName,
    submissionId: submission?.id,
    submissionKind,
    fileName,
    scenarioId,
  });
});

DomainEvents.on('customer.final.accepted', (payload) => {
  const { orderId, customerId, scenarioId, gwId, gwName } = payload;
  SimEvents.emit({
    source: 'customer',
    kind: 'customer.final.accepted',
    orderId, customerId, scenarioId,
    detail: { gwId, gwName },
  });
  sendMail('customer.final.accepted', 'finalAcceptedAdminNotify', {
    orderId,
    customerId,
    customerName: selectCustomerName(customerId),
    gwId,
    gwName,
    scenarioId,
  });
});

DomainEvents.on('qa.final.released', (payload) => {
  const { orderId, customerId, scenarioId, gwId, gwName, submissionKind, fileName, submission } = payload;
  SimEvents.emit({
    source: 'qa',
    kind: 'qa.final.released',
    orderId, customerId, scenarioId,
    detail: { gwId, gwName, submissionKind, fileName, submissionId: submission?.id },
  });
  sendMail('qa.final.released', 'finalReleasedCustomerNotify', {
    orderId,
    customerId,
    customerEmail: selectCustomerEmail(customerId),
    customerName: selectCustomerName(customerId),
    gwName,
    submissionId: submission?.id,
    submissionKind,
    fileName,
    scenarioId,
  });
});

DomainEvents.on('payments.batch.released', (payload) => {
  const { released, count, totalAmount } = payload;
  released.forEach(r => {
    const g = selectGw(r.gwId);
    if (!g?.email) return;
    sendMail('payments.batch.released', 'payoutReleasedGw', {
      orderId: r.id,
      gwId: r.gwId,
      gwEmail: g.email,
      gwName: g.name,
      amount: r.amount,
      scenarioId: r.scenarioId || null,
    });
  });
  sendMail('payments.batch.released', 'payoutBatchAdminNotify', {
    count,
    totalAmount,
    scenarioId: released[0]?.scenarioId || null,
  });
  SimEvents.emit({
    source: 'platform',
    kind: 'payments.batch.released',
    detail: { count, totalAmount },
  });
});

DomainEvents.on('payment.confirmed', (payload) => {
  const { order, orderId, customerId, scenarioId, installment, installmentN, paidEur, outstandingEur, fullyPaid, method } = payload;
  if (!order) return;
  const customerEmail = selectCustomerEmail(customerId);
  const customerName = selectCustomerName(customerId);
  const amountPaid = installment?.amt || paidEur;
  if (method && method.startsWith('stripe')) {
    SimEvents.emit({
      source: 'stripe',
      kind: 'stripe.webhook.payment_intent.succeeded',
      orderId, customerId, scenarioId,
      detail: { installmentN, amount: amountPaid, method },
    });
  }
  SimEvents.emit({
    source: 'platform',
    kind: 'platform.confirmPayment',
    orderId, customerId, scenarioId,
    detail: { installmentN, paidEur, outstandingEur, fullyPaid },
  });
  SimEvents.emit({
    source: 'sevdesk',
    kind: fullyPaid ? 'sevdesk.rechnung.mark_paid' : 'sevdesk.rechnung.mark_paid_partial',
    orderId, customerId, scenarioId,
    detail: { invoiceNo: order.sevdeskInvoiceNo, installmentN },
  });
  if (fullyPaid) {
    SimEvents.emit({
      source: 'pipedrive',
      kind: 'pipedrive.deal.move',
      orderId, customerId, scenarioId,
      detail: { stage: 'Won' },
    });
  }
  sendMail('payment.confirmed', 'paymentReceiptCustomer', {
    orderId, customerId, customerEmail, customerName,
    installmentN: installmentN || 1,
    amountPaid,
    fullyPaid,
    outstandingEur,
    scenarioId,
  });
  sendMail('payment.confirmed', 'paymentReceivedAdminNotify', {
    orderId, customerId, customerName,
    installmentN: installmentN || 1,
    amountPaid,
    fullyPaid,
    outstandingEur,
    method,
    scenarioId,
  });
  if (order.status === 'available' || order.status === 'active') {
    SimEvents.emit({
      source: 'platform',
      kind: 'platform.gw_assignment.queue',
      orderId, customerId, scenarioId,
      detail: { status: order.status },
    });
  }
});

DomainEvents.on('payment.failed', (payload) => {
  const { orderId, customerId, scenarioId, installmentN, method, sid } = payload || {};
  const currentOrder = store.getState().entities.orders?.byId?.[orderId];
  if (!currentOrder || !method || method === 'bank_transfer_sepa') return;
  const customerEmail = selectCustomerEmail(customerId);
  if (!customerEmail) return;
  const customerName = selectCustomerName(customerId);
  const installment = (currentOrder.installments || []).find(i => i.n === installmentN)
    || (currentOrder.installments || []).find(i => i.status !== 'paid')
    || null;
  const retrySession = SimCheckout.ensureOpenSession({
    orderId,
    customerId,
    scenarioId: scenarioId || currentOrder.scenarioId || null,
    method,
    amount: installment?.amt ?? currentOrder.outstandingEur ?? currentOrder.grossEur ?? 0,
    installmentN: installment?.n || installmentN || 1,
  });
  if (!retrySession) return;
  SimEvents.emit({
    source: 'stripe',
    kind: 'stripe.checkout_session.create',
    orderId, customerId, scenarioId,
    detail: { sid: retrySession.id, previousSid: sid || null, method, amount: retrySession.amount, reason: 'payment_failed_retry' },
  });
  sendMail('payment.failed', 'paymentFailedRetryCustomer', {
    orderId,
    customerId,
    customerEmail,
    customerName,
    invoiceNo: currentOrder.sevdeskInvoiceNo || null,
    installmentN: retrySession.installmentN,
    amountDueNow: retrySession.amount,
    paymentMethod: method,
    checkoutSessionId: retrySession.id,
    scenarioId,
  });
  notify({
    to: 'customer',
    kind: 'payment_failed',
    orderId,
    customerId,
    title: 'Zahlung fehlgeschlagen',
    body: `Auftrag #${orderId} · Bitte Zahlung erneut starten.`,
  });
});

DomainEvents.on('chat.report_submitted', (payload) => {
  const { reportId, orderId, reporterRole, reportedRole, count, reason, scenarioId } = payload;
  sendMail('chat.report_submitted', 'chatReportAdminNotify', {
    reportId,
    orderId,
    reporterRole,
    reportedRole,
    count,
    reason,
    scenarioId,
  });
});

DomainEvents.on('chat.report_reviewed', (payload) => {
  const { reportId, orderId, customerId, gwId, reporterRole, count, reviewNote, scenarioId } = payload;
  const isCustomer = reporterRole === 'customer';
  const reporterEmail = isCustomer ? selectCustomerEmail(customerId) : selectGwEmail(gwId);
  const reporterName = isCustomer ? selectCustomerName(customerId) : selectGwName(gwId);
  sendMail('chat.report_reviewed', 'chatReportReviewedNotify', {
    reportId,
    orderId,
    customerId,
    gwId,
    reporterRole,
    count,
    reviewNote,
    reporterEmail,
    reporterName,
    scenarioId,
  });
});
