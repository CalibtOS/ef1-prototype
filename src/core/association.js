// Centralized inbound-message → thread association (D-26, System B only).
//
// Single source of truth for "given an inbound email or WhatsApp message,
// which thread does it belong to?". Components, scenarios, sim effects, and
// future webhook handlers all call resolveInbound() — they never do their own
// `find(t => t.orderId === …)` matching. That's the whole point of having
// this module.
//
// System A (in-platform customer↔GW chat) does NOT pass through here — those
// messages are written directly via threads.send({ threadType: 'order' }) from
// a known platform participant.
//
// Inbound shape we accept (subset of what a real webhook would deliver):
//   {
//     medium:        'email' | 'whatsapp',
//     fromAddress:   string,    // email address or phone
//     fromName?:     string,
//     subject?:      string,    // email-only
//     inReplyTo?:    string,    // email-only — Message-ID of the prior message
//     references?:   string[],  // email-only
//     orderHint?:    number,    // optional explicit order id (e.g. plus-tag)
//   }
//
// Returns one of:
//   { kind: 'order_admin', thread, order, contact }       // attached to known order
//   { kind: 'lead',        thread, contact }              // unmatched person thread
//   { kind: 'gw_direct',   thread, gw }                   // GW direct (no order)
//
// All branches return an existing thread or create one. Side effects on the
// store are minimal — only thread creation for the lead/gw_direct cases.

import store from './store.js';
import * as S from './selectors.js';
import * as I from './internals.js';
import { ensureAdminThreadForOrder } from './threads.js';

function normalizeEmail(e) {
  return (e || '').trim().toLowerCase();
}

function normalizePhone(p) {
  return (p || '').replace(/[\s\-()]/g, '');
}

function findCustomerByAddress(state, medium, address) {
  const customers = S.tableItems(state.entities.customers);
  if (medium === 'email') {
    const target = normalizeEmail(address);
    return customers.find(c => normalizeEmail(c.email) === target) || null;
  }
  if (medium === 'whatsapp') {
    const target = normalizePhone(address);
    return customers.find(c => normalizePhone(c.phone) === target) || null;
  }
  return null;
}

function findGwByAddress(state, medium, address) {
  const gws = S.tableItems(state.entities.ghostwriters);
  if (medium === 'email') {
    const target = normalizeEmail(address);
    return gws.find(g => normalizeEmail(g.email) === target) || null;
  }
  if (medium === 'whatsapp') {
    const target = normalizePhone(address);
    return gws.find(g => normalizePhone(g.phone) === target) || null;
  }
  return null;
}

// Pick the order this inbound message most likely belongs to. Strategy:
//   1. Explicit orderHint (e.g. plus-tag in `to`, hidden marker in subject).
//   2. Email `inReplyTo` / `references` against stored external_ref values.
//   3. Otherwise: most recently active order belonging to that customer/GW.
// Returns the order entity, or null if the contact has no orders.
function chooseOrderForContact(state, contact, hint, inReplyTo) {
  if (hint != null) {
    const o = S.selectOrder(state, hint);
    if (o) return o;
  }
  // Try in-reply-to chain.
  if (inReplyTo) {
    const threads = S.tableItems(state.entities.threads);
    for (const t of threads) {
      if ((t.threadType || 'order') !== 'order_admin') continue;
      const hit = (t.messages || []).some(m => m.external_ref === inReplyTo);
      if (hit && t.orderId != null) {
        const o = S.selectOrder(state, t.orderId);
        if (o) return o;
      }
    }
  }
  // Fallback: most-recent non-closed order for this contact.
  const orders = S.selectAllOrders(state)
    .filter(o => (contact.role === 'gw' ? o.gwId === contact.id : o.customerId === contact.id))
    .filter(o => !['completed', 'cancelled', 'bye'].includes(o.status))
    .sort((a, b) => new Date(b.acceptedAt || b.createdAt || 0) - new Date(a.acceptedAt || a.createdAt || 0));
  return orders[0] || null;
}

function findLeadThread(state, medium, address) {
  const threads = S.tableItems(state.entities.threads);
  if (medium === 'whatsapp') {
    const target = normalizePhone(address);
    return threads.find(t => t.threadType === 'lead' && normalizePhone(t.phone) === target) || null;
  }
  // Email leads aren't keyed by a stable field today — match by stored contactEmail.
  const target = normalizeEmail(address);
  return threads.find(t => t.threadType === 'lead' && normalizeEmail(t.contactEmail) === target) || null;
}

function ensureLeadThread(state, inbound) {
  const existing = findLeadThread(state, inbound.medium, inbound.fromAddress);
  if (existing) return existing;
  const id = `tl-live-${Date.now().toString(36)}`;
  const thread = {
    id,
    threadType: 'lead',
    orderId: null,
    customerId: null,
    gwId: null,
    contactName: inbound.fromName || null,
    contactEmail: inbound.medium === 'email' ? inbound.fromAddress : null,
    phone: inbound.medium === 'whatsapp' ? inbound.fromAddress : null,
    subject: inbound.subject || 'Neue Anfrage',
    channel: inbound.medium === 'email' ? 'email_proxy' : 'whatsapp_proxy',
    sentiment: 'neutral',
    lastAt: I.nowIso(),
    flagged: false,
    unread: { admin: 1, gw: 0, customer: 0 },
    messages: [],
  };
  I.upsertEntity('threads', thread, 'threads.create.lead');
  return thread;
}

function ensureGwDirectThread(state, gw) {
  const existing = S.tableItems(state.entities.threads)
    .find(t => t.threadType === 'gw_direct' && t.gwId === gw.id);
  if (existing) return existing;
  const id = `tg-live-${gw.id}-${Date.now().toString(36)}`;
  const thread = {
    id,
    threadType: 'gw_direct',
    orderId: null,
    customerId: null,
    gwId: gw.id,
    contactName: gw.name,
    subject: `Direct · ${gw.name}`,
    channel: 'multi_channel',
    sentiment: 'neutral',
    lastAt: I.nowIso(),
    flagged: false,
    unread: { admin: 1, gw: 0, customer: 0 },
    messages: [],
  };
  I.upsertEntity('threads', thread, 'threads.create.gw_direct');
  return thread;
}

// Public: given an inbound email/whatsapp envelope, return where to put it.
function resolveInbound(inbound) {
  if (!inbound || !inbound.medium || !inbound.fromAddress) {
    return { kind: 'lead', thread: null, contact: null, reason: 'invalid_inbound' };
  }
  const state = store.getState();

  // 1) Known customer?
  const customer = findCustomerByAddress(state, inbound.medium, inbound.fromAddress);
  if (customer) {
    const order = chooseOrderForContact(state, { ...customer, role: 'customer' }, inbound.orderHint, inbound.inReplyTo);
    if (order) {
      const thread = ensureAdminThreadForOrder(order.id);
      return { kind: 'order_admin', thread, order, contact: customer };
    }
    // Customer is known but has no open order — treat as a person/lead thread
    // (Berat may still want to surface this; it just isn't order-scoped).
    const thread = ensureLeadThread(state, { ...inbound, fromName: customer.name });
    return { kind: 'lead', thread, contact: customer };
  }

  // 2) Known GW?
  const gw = findGwByAddress(state, inbound.medium, inbound.fromAddress);
  if (gw) {
    const order = chooseOrderForContact(state, { ...gw, role: 'gw' }, inbound.orderHint, inbound.inReplyTo);
    if (order) {
      const thread = ensureAdminThreadForOrder(order.id);
      return { kind: 'order_admin', thread, order, contact: gw, gw };
    }
    const thread = ensureGwDirectThread(state, gw);
    return { kind: 'gw_direct', thread, gw };
  }

  // 3) Unknown — pure lead.
  const thread = ensureLeadThread(state, inbound);
  return { kind: 'lead', thread, contact: null };
}

export { resolveInbound };
