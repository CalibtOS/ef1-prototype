// Derived reads. Components should prefer hooks that wrap these selectors.
import * as W from './workflow.js';
import { QA_STATUS } from './status.js';
import { liveNow } from '../../data.js';

function tableItems(table) {
  return (table?.allIds || []).map(id => table.byId[id]).filter(Boolean);
}

function byId(table, id) {
  if (id == null) return null;
  const numericId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
  return table?.byId?.[numericId] || table?.byId?.[id] || null;
}

function selectAllOrders(state) {
  return tableItems(state.entities.orders);
}

function selectOrder(state, id) {
  return byId(state.entities.orders, id);
}

function selectAllSubmissions(state) {
  return tableItems(state.entities.submissions).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

function selectSubmissionsForOrder(state, orderId) {
  return selectAllSubmissions(state).filter(s => Number(s.orderId) === Number(orderId));
}

function selectDisplaySubmissionsForOrder(state, orderId) {
  const order = selectOrder(state, orderId);
  return W.deriveSubmissions(order, selectSubmissionsForOrder(state, orderId));
}

function selectQaQueue(state) {
  return selectAllSubmissions(state).filter(s =>
    W.isQaReviewKind(s.kind) && s.qaStatus === QA_STATUS.PENDING
  );
}

function enrichCustomerSummary(state, customer) {
  if (!customer) return null;
  const bookedOrders = selectAllOrders(state).filter(o =>
    o.customerId === customer.id &&
    o.status !== 'cancelled' &&
    !!o.acceptedAt
  );
  const ltv = bookedOrders.reduce((s, o) => s + (o.grossEur || 0), 0);
  return {
    ...customer,
    orders: bookedOrders.length,
    ltv: Math.round(ltv * 100) / 100,
  };
}

function selectAllCustomers(state) {
  return tableItems(state.entities.customers).map(c => enrichCustomerSummary(state, c));
}

function selectCustomer(state, id) {
  return enrichCustomerSummary(state, byId(state.entities.customers, id));
}

const { ACTIVE_GW_ORDER_STATUSES, IN_DELIVERY_STATUSES } = W;

function isActiveGwAssignment(order) {
  return order?.gwId && ACTIVE_GW_ORDER_STATUSES.includes(order.status);
}

function enrichGhostwriterSummary(state, gw) {
  if (!gw) return null;
  const active = selectAllOrders(state).filter(o => o.gwId === gw.id && isActiveGwAssignment(o)).length;
  return { ...gw, active };
}

function selectAllGhostwriters(state) {
  return tableItems(state.entities.ghostwriters).map(g => enrichGhostwriterSummary(state, g));
}

function selectGhostwriter(state, id) {
  return enrichGhostwriterSummary(state, byId(state.entities.ghostwriters, id));
}

function selectOrdersByGw(state, gwId) {
  return selectAllOrders(state).filter(o => o.gwId === gwId);
}

function selectOrdersByCustomer(state, customerId) {
  return selectAllOrders(state).filter(o => o.customerId === customerId);
}

function selectThreads(state) {
  return tableItems(state.entities.threads).sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));
}

function selectThread(state, id) {
  return byId(state.entities.threads, id);
}

function selectThreadByOrder(state, orderId) {
  if (orderId == null) return null;
  return tableItems(state.entities.threads).find(t => Number(t.orderId) === Number(orderId)) || null;
}

function selectNotifications(state, role) {
  const target = role || state.session.role || 'admin';
  return tableItems(state.entities.notifications)
    .filter(n => {
      const to = Array.isArray(n.to) ? n.to : [n.to || 'admin'];
      if (!to.includes(target) && !to.includes('all')) return false;
      if (target === 'gw' && n.gwId && n.gwId !== state.session.gwId) return false;
      if (target === 'customer' && n.customerId && n.customerId !== state.session.customerId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

function selectAllNotifications(state) {
  return tableItems(state.entities.notifications);
}

function selectApplicationsForOrder(state, orderId) {
  const table = state.entities.gw_applications;
  if (!table) return [];
  return (table.allIds || [])
    .map(id => table.byId[id])
    .filter(a => a && Number(a.orderId) === Number(orderId));
}

function selectOrderEvents(state, orderId) {
  const order = selectOrder(state, orderId);
  if (!order) return [];
  const applications = selectApplicationsForOrder(state, orderId);
  const gwById = {};
  applications.forEach(a => {
    if (a.gwId && !gwById[a.gwId]) gwById[a.gwId] = selectGhostwriter(state, a.gwId);
  });
  if (order.gwId && !gwById[order.gwId]) gwById[order.gwId] = selectGhostwriter(state, order.gwId);
  return W.buildOrderEvents(order, {
    submissions: selectSubmissionsForOrder(state, orderId),
    thread: selectThreadByOrder(state, orderId),
    notifications: selectAllNotifications(state).filter(n => Number(n.orderId) === Number(orderId) || String(n.title || '').includes(`#${orderId}`) || String(n.body || '').includes(`#${orderId}`)),
    customer: selectCustomer(state, order.customerId),
    gw: selectGhostwriter(state, order.gwId),
    applications,
    gwById,
  });
}

function selectQaHistory(state) {
  return selectAllOrders(state)
    .flatMap(order => selectDisplaySubmissionsForOrder(state, order.id)
      .filter(s => W.isQaReviewKind(s.kind))
      .filter(s =>
        (s.qaStatus && s.qaStatus !== QA_STATUS.PENDING) ||
        s.flagged ||
        order.status === 'ai_violation_review' ||
        order.status === 'plagiarism_violation_review'
      )
      .map(s => ({ order, submission: s })))
    .sort((a, b) => new Date((b.submission.reviewedAt || b.submission.forwardedAt || b.submission.submittedAt || 0)) - new Date((a.submission.reviewedAt || a.submission.forwardedAt || a.submission.submittedAt || 0)));
}

// =========================================================================
// Dashboard queue thresholds. Single source of truth so dashboard, orders
// list, and KPIs cannot drift apart. Tweaking a number here propagates
// everywhere automatically.
// =========================================================================
const QUEUE_THRESHOLDS = {
  staleOfferDays: 3,       // offer_sent > 3d with no acceptance → "stale offer"
  staleInvoiceDays: 5,     // invoice_sent > 5d unpaid → "stale invoice"
  noIntroHours: 24,        // GW assigned but first customer contact > 24h ago → SLA breach
  paidNoGwHours: 24,       // Paid order in `available` > 24h with no GW → SLA breach
  folgtStaleDays: 5,       // titleTBD > 5d → chase customer
  idleLeadDays: 7,         // lead/qualified/offer_sent > 7d with no movement → cancellation risk
  qualifiedAgingDays: 2,   // qualified > 2d with no offer → flag (separate from cancellation)
};

function daysSince(iso, now) {
  if (!iso) return null;
  return (now.getTime() - new Date(iso).getTime()) / 86400000;
}
function hoursSince(iso, now) {
  if (!iso) return null;
  return (now.getTime() - new Date(iso).getTime()) / 3600000;
}

function paidAt(order) {
  // Earliest paid installment date — the moment money landed and the SLA clock starts.
  const paid = (order.installments || []).filter(i => i.status === 'paid');
  if (!paid.length) return null;
  const earliest = paid.reduce((a, b) => new Date(a.date) < new Date(b.date) ? a : b);
  return earliest.date;
}

function overdueInstallments(order) {
  return (order.installments || []).filter(i => i.status === 'overdue');
}

function latestThreadActivityAt(state, orderId) {
  const thread = selectThreadByOrder(state, orderId);
  if (!thread) return null;
  const messageTimes = (thread.messages || []).map(m => m.at).filter(Boolean);
  const times = [thread.lastAt, ...messageTimes].filter(Boolean);
  if (!times.length) return null;
  return times.reduce((latest, iso) => new Date(iso) > new Date(latest) ? iso : latest);
}

function hasThreadActivityAfter(state, orderId, iso) {
  const lastAt = latestThreadActivityAt(state, orderId);
  if (!lastAt || !iso) return false;
  return new Date(lastAt) > new Date(iso);
}

function hasCustomerThreadActivityAfter(state, orderId, iso) {
  const thread = selectThreadByOrder(state, orderId);
  if (!thread || !iso) return false;
  return (thread.messages || []).some(m => m.from === 'customer' && m.at && new Date(m.at) > new Date(iso));
}

// -------- Revenue at risk --------
// Anything where money is leaking (or about to) from inaction at the top of the funnel.
function selectRevenueAtRisk(state) {
  const orders = selectAllOrders(state);
  const now = liveNow();
  const items = [];
  const seen = new Set();
  const push = (kind, order, opts) => {
    if (seen.has(order.id)) return;
    seen.add(order.id);
    items.push({ kind, orderId: order.id, order, ...opts });
  };

  orders.forEach(o => {
    // 1. Qualified, no offer yet. Title-TBD orders are tracked separately (SLA queue)
    //    because the blocker is the customer, not Berat.
    if (o.status === 'qualified' && !o.offerSentAt && !o.sevdeskOfferNo && !o.titleTBD) {
      const age = daysSince(o.qualifiedAt || o.leadCreatedAt, now);
      push('needs_offer', o, {
        ageDays: age,
        atRiskEur: o.grossEur || 0,
        urgency: age != null && age > QUEUE_THRESHOLDS.qualifiedAgingDays ? 1 : 2,
      });
    }
    // 2. Offer sent and customer is sitting on it.
    if (o.status === 'offer_sent' && o.offerSentAt && !hasCustomerThreadActivityAfter(state, o.id, o.offerSentAt)) {
      const age = daysSince(o.offerSentAt, now);
      if (age != null && age >= QUEUE_THRESHOLDS.staleOfferDays) {
        push('stale_offer', o, { ageDays: age, atRiskEur: o.grossEur || 0, urgency: age >= 5 ? 1 : 2 });
      }
    }
    // 3. Invoice sent but unpaid — blocks GW assignment.
    if (o.status === 'invoice_sent' && (o.outstandingEur || 0) > 0) {
      const age = daysSince(o.invoiceSentAt || o.acceptedAt, now);
      if (age != null && age >= QUEUE_THRESHOLDS.staleInvoiceDays) {
        push('stale_invoice', o, { ageDays: age, atRiskEur: o.outstandingEur || o.grossEur || 0, urgency: 1 });
      }
    }
    // 4. Any active order with an overdue installment — ages receivables + blocks Friday.
    const overdue = overdueInstallments(o);
    if (overdue.length && !['cancelled','bye'].includes(o.status)) {
      push('installment_overdue', o, {
        overdueCount: overdue.length,
        overdueAmt: overdue.reduce((s, i) => s + (i.amt || 0), 0),
        atRiskEur: overdue.reduce((s, i) => s + (i.amt || 0), 0),
        urgency: 1,
      });
    }
    // 5. Cancellation risk: order sitting in early funnel > 7d with no activity.
    if (['lead','qualified','offer_sent'].includes(o.status)) {
      const anchor = o.offerSentAt || o.qualifiedAt || o.leadCreatedAt;
      const age = daysSince(anchor, now);
      if (age != null && age >= QUEUE_THRESHOLDS.idleLeadDays && !hasThreadActivityAfter(state, o.id, anchor)) {
        push('cancellation_risk', o, { ageDays: age, atRiskEur: o.grossEur || 0, urgency: 3 });
      }
    }
  });

  items.sort((a, b) => (a.urgency - b.urgency) || ((b.atRiskEur || 0) - (a.atRiskEur || 0)));
  return items;
}

// -------- Needs your decision --------
// Items that require Berat's subjective judgement — not data-fixable.
function selectNeedsDecision(state) {
  const orders = selectAllOrders(state);
  const threads = selectThreads(state);
  const items = [];
  const seen = new Set();
  const push = (kind, urgency, order, opts) => {
    const key = `${kind}:${order ? order.id : opts?.threadId}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ kind, urgency, orderId: order ? order.id : null, order, ...opts });
  };

  orders.forEach(o => {
    if (o.status === 'ai_violation_review') push('ai_violation', 1, o, { reason: o.qaFlagReason || `AI score ${o.aiScore || '—'}%` });
    else if (o.status === 'plagiarism_violation_review') push('plagiarism_violation', 1, o, { reason: o.qaFlagReason || `Plagiarism ${o.plagiarismScore || '—'}%` });
  });
  orders.forEach(o => {
    if (o.status === 'claimed_pending_approval') push('claim_approval', 2, o, { claimerName: selectGhostwriter(state, o.gwId)?.name });
  });
  orders.forEach(o => {
    if (o.status === 'extension_requested') push('extension', 3, o);
    if (o.status === 'delay_reported') push('delay', 3, o);
  });
  orders.forEach(o => {
    if (o.disputeOpen && !['ai_violation_review','plagiarism_violation_review','extension_requested','delay_reported'].includes(o.status)) {
      push('dispute', 4, o);
    }
  });
  threads.forEach(t => {
    if (t.flagged === 'financial' || t.followUp) {
      push('thread_flag', 5, t.orderId ? selectOrder(state, t.orderId) : null, { threadId: t.id, subject: t.subject, lastAt: t.lastAt });
    }
  });

  items.sort((a, b) => a.urgency - b.urgency);
  return items;
}

// -------- SLA & operational --------
// Routing / follow-through items, not subjective decisions.
function selectSlaOperational(state) {
  const orders = selectAllOrders(state);
  const submissions = state.entities.submissions ? tableItems(state.entities.submissions) : [];
  const now = liveNow();
  const items = [];
  const seen = new Set();
  const push = (kind, order, opts) => {
    const key = `${kind}:${order.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ kind, orderId: order.id, order, ...opts });
  };

  orders.forEach(o => {
    // 1. Paid, no GW yet — SLA is 24h from payment.
    if (!o.gwId && W.canAssign(o).ok) {
      const paidIso = paidAt(o);
      const hrs = hoursSince(paidIso, now);
      if (hrs != null && hrs >= QUEUE_THRESHOLDS.paidNoGwHours) {
        push('paid_no_gw', o, { hours: hrs, urgency: hrs >= 48 ? 1 : 2 });
      }
    }
    // 2. GW assigned, no customer intro > 24h after assignment.
    //    Only surface during 'active' (first leg). Any submission or status
    //    advance proves the GW has been working with the customer — intro is implicit.
    if (o.status === 'active' && o.gwId && !o.firstContactDoneAt && !o.selfAssigned) {
      const hasSubmission = submissions.some(s => Number(s.orderId) === Number(o.id));
      if (!hasSubmission) {
        const anchor = o.assignedAt || o.claimApprovedAt || paidAt(o) || o.acceptedAt;
        const hrs = hoursSince(anchor, now);
        if (hrs != null && hrs >= QUEUE_THRESHOLDS.noIntroHours && hrs <= 24 * 14) {
          push('no_intro', o, { hours: hrs, urgency: 1 });
        }
      }
    }
    // 3. Interim deadline passed, no interim submission, order still active.
    if (o.status === 'active') {
      const interims = submissions.filter(s => Number(s.orderId) === Number(o.id) && W.isInterimKind(s.kind));
      const due = o.interimDeadline ? new Date(o.interimDeadline) : null;
      if (due && due < now && !interims.length) {
        push('interim_missed', o, { dueAt: o.interimDeadline, daysPast: Math.floor((now - due) / 86400000), urgency: 1 });
      }
    }
    // 4. Final submitted / in QA — Berat must review (final isn't auto-sent).
    if (['final_submitted','qa_review'].includes(o.status) && !o.disputeOpen) {
      const pendingFinal = submissions.some(s =>
        Number(s.orderId) === Number(o.id) &&
        W.isQaReviewKind(s.kind) &&
        s.qaStatus === QA_STATUS.PENDING
      );
      if (pendingFinal) push('final_qa', o, { urgency: 2 });
    }
    // 5. Title still "folgt" too long — chase customer.
    if (o.titleTBD && !['completed','cancelled'].includes(o.status)) {
      const anchor = o.leadCreatedAt || o.qualifiedAt || o.acceptedAt;
      const age = daysSince(anchor, now);
      if (age != null && age >= QUEUE_THRESHOLDS.folgtStaleDays) {
        push('folgt_stale', o, { ageDays: age, urgency: 3 });
      }
    }
  });

  items.sort((a, b) => (a.urgency - b.urgency) || (new Date(a.dueAt || 0) - new Date(b.dueAt || 0)));
  return items;
}

// -------- Cash & Friday --------
// Money-side queues grouped: Friday batch, blockers, GW invoices missing,
// receivables aging, refund/cancel pipeline.
//
function selectCashFriday(state) {
  const orders = selectAllOrders(state);
  const now = liveNow();
  const fridayConsidered = orders.filter(o =>
    o.status === 'payment_pending' ||
    o.status === 'ai_violation_review' ||
    o.status === 'plagiarism_violation_review'
  );
  const fridayRows = fridayConsidered.map(o => ({ order: o, gates: W.releaseGates(o) }));
  const releaseable = fridayRows.filter(r => r.gates.releasable).map(r => r.order);

  // Payment_pending orders missing GW invoice (data-fixable; not "needs decision").
  const missingInvoice = orders.filter(o =>
    o.status === 'payment_pending' &&
    o.gwId &&
    !o.selfAssigned &&
    o.gwPaymentStatus !== 'invoice_received' &&
    o.gwPaymentStatus !== 'paid'
  );
  const blocked = fridayRows
    .filter(r => !r.gates.releasable)
    .map(r => ({ order: r.order, gates: r.gates }));

  // Receivables aging — only for accepted orders with money outstanding.
  const aged = { '0_30': 0, '30_60': 0, '60_plus': 0 };
  let openReceivables = 0;
  orders.forEach(o => {
    if (!W.canShowReceivable(o)) return;
    if ((o.outstandingEur || 0) <= 0) return;
    openReceivables += o.outstandingEur;
    const overdue = (o.installments || []).filter(i => i.status === 'overdue');
    const oldestOverdue = overdue.length
      ? overdue.reduce((a, b) => new Date(a.date) < new Date(b.date) ? a : b).date
      : null;
    const anchor = oldestOverdue || o.invoiceSentAt || o.acceptedAt;
    const age = daysSince(anchor, now);
    if (age == null) return;
    if (age <= 30) aged['0_30'] += o.outstandingEur;
    else if (age <= 60) aged['30_60'] += o.outstandingEur;
    else aged['60_plus'] += o.outstandingEur;
  });
  Object.keys(aged).forEach(k => { aged[k] = Math.round(aged[k] * 100) / 100; });

  const refundPending = orders.filter(o => o.status === 'cancelled' && (o.paidEur || 0) > 0);

  return {
    releaseable,
    blocked,
    missingInvoice,
    aged,
    openReceivables: Math.round(openReceivables * 100) / 100,
    refundPending,
  };
}

function selectKpis(state) {
  const orders = selectAllOrders(state);
  const submissions = selectAllSubmissions(state);
  const friday = orders.filter(o => W.releaseGates(o).releasable);
  const fridayEur = friday.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const now = liveNow();
  const risk = selectRevenueAtRisk(state);
  const sla = selectSlaOperational(state);
  const eurAtRisk = risk.reduce((s, it) => s + (it.atRiskEur || 0), 0);
  const openReceivables = orders.reduce((s, o) => s + (W.canShowReceivable(o) ? (o.outstandingEur || 0) : 0), 0);
  const newReceivables7d = orders.reduce((s, o) => {
    if (!W.canShowReceivable(o) || (o.outstandingEur || 0) <= 0) return s;
    const anchor = o.invoiceSentAt || o.acceptedAt;
    const age = daysSince(anchor, now);
    return age != null && age <= 7 ? s + (o.outstandingEur || 0) : s;
  }, 0);
  // KPI counts are over real orders only (synthetic:false). Demo fixtures or
  // wizard-marked rows that carry `_synthetic: true` are excluded so they
  // don't inflate the dashboard. Submissions are likewise filtered.
  const isReal = (o) => !o?._synthetic && !o?.synthetic;
  const realOrders = orders.filter(isReal);
  const realSubs = submissions.filter(isReal);
  const closedStates = new Set(['completed', 'cancelled', 'bye']);
  return {
    openReceivables: Math.round(openReceivables * 100) / 100,
    newReceivables7d: Math.round(newReceivables7d * 100) / 100,
    agedReceivables: Math.round((openReceivables - newReceivables7d) * 100) / 100,
    activeOrders: realOrders.filter(o => !closedStates.has(o.status)).length,
    completedLifetime: realOrders.filter(o => o.status === 'completed').length,
    totalLifetime: realOrders.length,
    fridayCount: friday.length,
    fridayEur: Math.round(fridayEur * 100) / 100,
    qaPending: realSubs.filter(s => W.isQaReviewKind(s.kind) && s.qaStatus === QA_STATUS.PENDING).length,
    overdueInterim: sla.filter(it => it.kind === 'interim_missed').length,
    aiFlagged: realSubs.filter(s => s.aiScore >= 70 || s.flagged).length,
    disputesOpen: realOrders.filter(o => o.disputeOpen).length,
    pipedriveSubs: `${realOrders.length} / 5,000`,
    eurAtRisk: Math.round(eurAtRisk * 100) / 100,
    riskItemCount: risk.length,
  };
}

// Friday batch page = authoritative full list (no dedup). The dashboard's
// Cash & Friday card uses selectCashFriday for its compact, deduped view.
function selectFridayBatch(state) {
  const considered = selectAllOrders(state).filter(o =>
    o.status === 'payment_pending' ||
    o.status === 'ai_violation_review' ||
    o.status === 'plagiarism_violation_review'
  );
  const rows = considered.map(o => ({ order: o, gates: W.releaseGates(o) }));
  return {
    releaseable: rows.filter(r => r.gates.releasable).map(r => r.order),
    blocked: rows.filter(r => !r.gates.releasable).map(r => ({ order: r.order, gates: r.gates })),
  };
}

export {
  tableItems,
  byId,
  selectAllOrders,
  selectOrder,
  selectAllSubmissions,
  selectSubmissionsForOrder,
  selectDisplaySubmissionsForOrder,
  selectQaQueue,
  selectAllCustomers,
  selectCustomer,
  selectAllGhostwriters,
  selectGhostwriter,
  selectOrdersByGw,
  selectOrdersByCustomer,
  selectThreads,
  selectThread,
  selectThreadByOrder,
  selectNotifications,
  selectAllNotifications,
  selectOrderEvents,
  selectApplicationsForOrder,
  selectQaHistory,
  selectKpis,
  selectFridayBatch,
  selectRevenueAtRisk,
  selectNeedsDecision,
  selectSlaOperational,
  selectCashFriday,
  QUEUE_THRESHOLDS,
  ACTIVE_GW_ORDER_STATUSES,
  IN_DELIVERY_STATUSES,
};
