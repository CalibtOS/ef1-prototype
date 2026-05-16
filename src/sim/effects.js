// Simulation effect subscribers. Listen to canonical domain events emitted
// from core/actions.js and produce demo evidence: sim_events rows, Demo
// Inbox emails, fake external-system artifacts. This module never owns
// workflow state — domain actions remain authoritative.
//
// Importing this module wires the subscriptions. It is imported once from
// main.jsx for the side-effect.
import * as DomainEvents from '../core/events.js';
import store from '../core/store.js';
import * as SimEvents from './events.js';
import * as SimMail from './mail.js';
import * as SimCheckout from './checkout.js';
import * as SimArtifacts from './artifacts.js';

function selectCustomerEmail(customerId) {
  const c = store.getState().entities.customers?.byId?.[customerId];
  return c?.email || '';
}

function selectCustomerName(customerId) {
  const c = store.getState().entities.customers?.byId?.[customerId];
  return c?.name || '';
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

  SimMail.offerSentCustomer({
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

  SimMail.invoiceEmailCustomer({
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
    SimMail.gwJobAvailableToGw({
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
      SimMail.gwApplicationRejected({ orderId, gwId: r.gwId, gwEmail: rg.email, gwName: rg.name, scenarioId });
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
      SimMail.gwApplicationRejected({ orderId, gwId: r.gwId, gwEmail: rg.email, gwName: rg.name, scenarioId });
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
    SimMail.gwAssignedToGw({
      orderId, gwId, gwEmail: g.email, gwName: g.name,
      customerName,
      title: order.title,
      finalDeadline: order.finalDeadline,
      scenarioId,
    });
  }
  if (customerEmail) {
    SimMail.gwAssignedToCustomer({
      orderId, customerId, customerEmail, customerName,
      gwName: selfAssigned ? 'Berat Özdemir' : (g?.name || gwName),
      scenarioId,
    });
  }
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
  SimMail.paymentReceiptCustomer({
    orderId, customerId, customerEmail, customerName,
    installmentN: installmentN || 1,
    amountPaid,
    fullyPaid,
    outstandingEur,
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
