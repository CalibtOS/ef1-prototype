// Communication subsystem — TWO independent entity models.
//
// Per docs/communication_architecture.md (D-28 direction, 2026-05-22):
//
//   1. external_messages  — keyed by CONTACT (customer | gw | lead).
//      WhatsApp + Email aggregation for the admin inbox. No orderId.
//      No relatedOrderIds. No inference of order scope. The asymmetry
//      principle: external channels have no concept of "order" — we
//      do not invent one.
//
//   2. order_chats        — 1:1 with an order. Three participants:
//      customer, ghostwriter, admin. Platform-owned chat. Gated:
//      opens only when the order is paid AND a GW is assigned.
//
// These two slices share NO foreign keys. Their only connection is
// the contact identity (same person, two surfaces).
//
// All composer surfaces (admin inbox, admin order-detail, customer
// order view, GW messages, GW assignment-detail) route writes through
// the actions exported here.

import store from './store.js';
import * as I from './internals.js';
import * as S from './selectors.js';
import * as N from './notifications.js';
import * as W from './workflow.js';
import { STATUS } from './status.js';

// =============================================================================
// Selectors
// =============================================================================

function tableItems(table) {
  return (table?.allIds || []).map(id => table.byId[id]).filter(Boolean);
}

// ---- external_messages ------------------------------------------------------

function selectAllExternalMessages(state) {
  return tableItems(state.entities.external_messages || { byId: {}, allIds: [] });
}

// Contacts derived from external_messages — each contact is the entity
// (customer/gw/lead) that has at least one external message with Berat.
// Order is by most-recent activity, like Gmail/WhatsApp.
function selectExternalContacts(state) {
  const messages = selectAllExternalMessages(state);
  const byKey = new Map();
  messages.forEach(m => {
    const key = `${m.contactType}:${m.contactId}`;
    const prev = byKey.get(key);
    if (!prev || new Date(m.at) > new Date(prev.lastAt)) {
      byKey.set(key, {
        key,
        contactType: m.contactType,
        contactId: m.contactId,
        lastAt: m.at,
        lastMessage: m,
      });
    }
  });
  const contacts = [];
  byKey.forEach(({ key, contactType, contactId, lastAt, lastMessage }) => {
    const entity = resolveContactEntity(state, contactType, contactId);
    if (!entity) return;
    const all = messages.filter(m => m.contactType === contactType && m.contactId === contactId);
    const unread = all.filter(m => m.direction === 'in' && !m.readByAdmin).length;
    const lastMedium = lastMessage?.medium || 'email';
    // Every medium this contact has ever used — drives the inbox medium
    // filter. A contact with both email and WhatsApp stays visible under
    // either filter, regardless of which medium their latest message used.
    const mediums = [...new Set(all.map(m => m.medium))];
    contacts.push({
      key,
      contactType,
      contactId,
      name: entity.name || entity.phone || entity.email || 'Contact',
      email: entity.email || null,
      phone: entity.phone || null,
      initials: entity.initials || initialsFromName(entity.name) || '··',
      isB2B: !!entity.isB2B,
      lastAt,
      lastMedium,
      mediums,
      lastPreview: bodyPreview(lastMessage?.body),
      unread,
      messageCount: all.length,
    });
  });
  contacts.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  return contacts;
}

function selectExternalMessagesForContact(state, contactType, contactId) {
  if (!contactType || contactId == null) return [];
  return selectAllExternalMessages(state)
    .filter(m => m.contactType === contactType && String(m.contactId) === String(contactId))
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

function resolveContactEntity(state, contactType, contactId) {
  if (contactType === 'customer') return S.selectCustomer(state, contactId);
  if (contactType === 'gw') return S.selectGhostwriter(state, contactId);
  if (contactType === 'lead') {
    const table = state.entities.leads;
    if (!table) return null;
    return table.byId?.[contactId] || null;
  }
  return null;
}

// ---- order_chats ------------------------------------------------------------

function selectOrderChat(state, orderId) {
  if (orderId == null) return null;
  return tableItems(state.entities.order_chats || { byId: {}, allIds: [] })
    .find(c => Number(c.orderId) === Number(orderId)) || null;
}

function selectAllOrderChats(state) {
  return tableItems(state.entities.order_chats || { byId: {}, allIds: [] });
}

// Whether an order chat is open for posting. The lifecycle is:
//   locked  →  open  →  archived
// Open requires: order paid + GW assigned, the order not in a terminal state
// (completed/cancelled), and the chat not explicitly closed.
// `chat` is optional — pass it so an explicitly-closed chat is honoured; omit
// it when checking whether a chat is allowed to be *created* (no chat yet).
function isOrderChatOpen(order, chat) {
  if (!order) return false;
  if (chat && chat.closedAt) return false;
  if (order.status === STATUS.CANCELLED || order.status === STATUS.COMPLETED) return false;
  if (!order.gwId) return false;
  return W.isOrderPaid(order);
}

// Whether an existing order chat is archived (frozen, read-only). True once
// the chat is explicitly closed OR the order reaches a terminal state — the
// latter covers seeded history that predates an explicit close. Returns false
// when no chat exists (nothing to archive).
function isOrderChatArchived(order, chat) {
  if (!chat) return false;
  return !!chat.closedAt
    || order?.status === STATUS.COMPLETED
    || order?.status === STATUS.CANCELLED;
}

// Reason an order chat is not open for posting, or null if open.
function orderChatLockReason(order, chat) {
  if (!order) return 'Order not found.';
  if (isOrderChatArchived(order, chat)) return 'This chat is archived — the order is closed.';
  if (order.status === STATUS.CANCELLED || order.status === STATUS.COMPLETED) return 'The order is closed.';
  const paid = W.isOrderPaid(order);
  if (!paid && !order.gwId) return 'Opens once payment lands and a ghostwriter is assigned.';
  if (!paid) return 'Opens once payment lands.';
  if (!order.gwId) return 'Opens once a ghostwriter is assigned.';
  return null;
}

// =============================================================================
// Actions
// =============================================================================

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---- external messages ------------------------------------------------------

// payload: { contactType, contactId, medium: 'email'|'whatsapp', direction?, body, subject?, attachments? }
// direction defaults to 'out' (Berat replying via the platform surface).
function sendExternal(payload = {}) {
  const body = (payload.body || '').trim();
  if (!body && !(payload.attachments && payload.attachments.length)) return null;
  if (!payload.contactType || payload.contactId == null) {
    I.toast({ text: 'Contact missing.', tone: 'danger' });
    return null;
  }
  const at = I.nowIso();
  const direction = payload.direction === 'in' ? 'in' : 'out';
  const message = {
    id: newId('em'),
    contactType: payload.contactType,
    contactId: payload.contactId,
    medium: payload.medium === 'whatsapp' ? 'whatsapp' : 'email',
    direction,
    at,
    body,
    subject: payload.subject || null,
    attachments: payload.attachments || null,
    readByAdmin: direction === 'out',
  };
  I.upsertEntity('external_messages', message, 'external_messages.send');
  return message;
}

function markExternalContactRead(contactType, contactId) {
  if (!contactType || contactId == null) return false;
  I.updateTable('external_messages', table => {
    const next = { ...table, byId: { ...table.byId } };
    (table.allIds || []).forEach(id => {
      const m = table.byId[id];
      if (!m || m.contactType !== contactType || String(m.contactId) !== String(contactId)) return;
      if (m.direction === 'in' && !m.readByAdmin) {
        next.byId[id] = { ...m, readByAdmin: true };
      }
    });
    return next;
  }, 'external_messages.markRead');
  return true;
}

// ---- order chats ------------------------------------------------------------

// Create the order chat if the gate allows it (paid + GW assigned). Returns
// the existing chat, the freshly created one, or null when the order does
// not yet qualify. The gate lives here so no caller can conjure a chat for
// an order that has not reached paid + assigned.
function ensureOrderChat(orderId) {
  const state = store.getState();
  const existing = selectOrderChat(state, orderId);
  if (existing) return existing;
  const o = I.order(orderId);
  if (!o || !isOrderChatOpen(o)) return null;
  const chat = {
    id: `chat-${orderId}`,
    orderId: Number(orderId),
    openedAt: I.nowIso(),
    closedAt: null,
    unread: { admin: 0, gw: 0, customer: 0 },
    messages: [],
  };
  I.upsertEntity('order_chats', chat, 'order_chats.create');
  return chat;
}

// Append a message object to a chat and bump unread for the given recipient
// roles. Shared by sendOrderChat and postSystemMessage.
function appendChatMessage(chat, message, recipientRoles, label) {
  I.patchEntity('order_chats', chat.id, prev => {
    const messages = [...(prev.messages || []), message];
    const unread = { ...(prev.unread || { admin: 0, gw: 0, customer: 0 }) };
    recipientRoles.forEach(r => { unread[r] = (unread[r] || 0) + 1; });
    return { ...prev, messages, unread, lastAt: message.at };
  }, label);
}

// payload: { orderId, role: 'customer'|'gw'|'admin', body, attachments? }
function sendOrderChat(payload = {}) {
  const orderId = payload.orderId;
  const role = payload.role || store.getState().session.role || 'admin';
  if (orderId == null) {
    I.toast({ text: 'Order missing.', tone: 'danger' });
    return null;
  }
  const o = I.order(orderId);
  if (!o) {
    I.toast({ text: 'Order not found.', tone: 'danger' });
    return null;
  }
  // The gate is enforced for every role — admin included. There is no
  // lifecycle reason to post into a locked or archived chat; admin lifecycle
  // notices go through postSystemMessage, which is the only sanctioned
  // bypass and never produces a participant message.
  const chat = selectOrderChat(store.getState(), orderId);
  if (!isOrderChatOpen(o, chat)) {
    I.toast({ text: orderChatLockReason(o, chat) || 'Order chat is not available.', tone: 'info' });
    return null;
  }
  const body = (payload.body || '').trim();
  if (!body && !(payload.attachments && payload.attachments.length)) return null;
  const liveChat = chat || ensureOrderChat(orderId);
  if (!liveChat) return null;
  const at = I.nowIso();
  const authorId = role === 'admin'
    ? 'admin'
    : role === 'gw' ? (o.gwId || null) : (o.customerId || null);
  const message = {
    id: newId('oc'),
    chatId: liveChat.id,
    orderId: Number(orderId),
    authorRole: role,
    authorId,
    at,
    body,
    attachments: payload.attachments || null,
  };
  appendChatMessage(liveChat, message, ['customer', 'gw', 'admin'].filter(r => r !== role), 'order_chats.send');

  // Notify the other participants. Admin observes all chats.
  const senderName = role === 'gw'
    ? (I.gw(o.gwId)?.name || 'Ghostwriter')
    : role === 'customer'
      ? (I.customer(o.customerId)?.name || 'Kunde')
      : 'efactory1';
  const previewBody = body.length > 90 ? body.slice(0, 90) + '…' : body;
  const recipients = [];
  if (role !== 'admin') recipients.push('admin');
  if (role !== 'customer' && o.customerId) recipients.push('customer');
  if (role !== 'gw' && o.gwId) recipients.push('gw');
  if (recipients.length) {
    N.notify({
      to: recipients,
      kind: 'message_received',
      orderId: o.id,
      customerId: o.customerId || null,
      gwId: o.gwId || null,
      title: `Neue Nachricht · #${o.id}`,
      body: `${senderName}: ${previewBody}`,
      urgent: false,
    });
  }
  return message;
}

function markOrderChatRead(orderId, role) {
  const chat = selectOrderChat(store.getState(), orderId);
  if (!chat || !role) return false;
  I.patchEntity('order_chats', chat.id, prev => {
    const unread = { ...(prev.unread || { admin: 0, gw: 0, customer: 0 }) };
    unread[role] = 0;
    return { ...prev, unread };
  }, 'order_chats.markRead');
  return true;
}

// Append a system notice (GW reassigned, chat archived, …) to an existing
// order chat. Not a participant message — `authorRole: 'system'`, no author.
// Skips the open-gate on purpose: a system message records a lifecycle
// change and may be the message that accompanies archiving the chat. Returns
// null when there is no chat to annotate.
function postSystemMessage(orderId, body) {
  const text = (body || '').trim();
  if (orderId == null || !text) return null;
  const chat = selectOrderChat(store.getState(), orderId);
  if (!chat) return null;
  const message = {
    id: newId('oc'),
    chatId: chat.id,
    orderId: Number(orderId),
    authorRole: 'system',
    authorId: null,
    at: I.nowIso(),
    body: text,
    attachments: null,
  };
  appendChatMessage(chat, message, ['customer', 'gw', 'admin'], 'order_chats.system');
  return message;
}

// Archive an order chat — read-only from here on. An optional reason is
// posted as a system message first, so the frozen transcript explains why
// it closed. Called when the order is completed or cancelled.
function closeOrderChat(orderId, reason) {
  const chat = selectOrderChat(store.getState(), orderId);
  if (!chat || chat.closedAt) return false;
  if (reason) postSystemMessage(orderId, reason);
  I.patchEntity('order_chats', chat.id, { closedAt: I.nowIso() }, 'order_chats.close');
  return true;
}

// =============================================================================
// Helpers
// =============================================================================

function initialsFromName(name) {
  if (!name) return null;
  return name.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
}

function bodyPreview(text, max = 110) {
  if (!text) return '';
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// =============================================================================
// Public API
// =============================================================================

export const orderChats = {
  send: sendOrderChat,
  markRead: markOrderChatRead,
  ensure: ensureOrderChat,
  postSystem: postSystemMessage,
  close: closeOrderChat,
};

export const externalMessages = {
  send: sendExternal,
  markContactRead: markExternalContactRead,
};

export const select = {
  externalContacts: selectExternalContacts,
  externalMessagesForContact: selectExternalMessagesForContact,
  orderChat: selectOrderChat,
  allOrderChats: selectAllOrderChats,
  resolveContactEntity,
};

export {
  isOrderChatOpen,
  isOrderChatArchived,
  orderChatLockReason,
  bodyPreview,
  initialsFromName,
};

// Re-export the order-paid predicate so chat surfaces can read the gate
// status from a single comms entry point.
export { isOrderPaid } from './workflow.js';
