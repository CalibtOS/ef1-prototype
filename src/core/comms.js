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
import {
  buildOrderChatQuotedSnapshot,
  getOrderChatMentionables,
  parseOrderChatMentions,
  mentionRecipientRoles,
} from './order-chat-threading.js';
import * as W from './workflow.js';
import { STATUS } from './status.js';
import {
  normalizeExternalMessage,
  buildOutboundReplyFields,
  buildQuotedMessageSnapshot,
  attachQuotedSnapshots,
  participantsForDirection,
  conversationIdFor,
  SUPPORT_INBOX,
  SYSTEM_NOTIFICATION_SENDER,
  isSystemInboxNotification,
} from './external-message-threading.js';
import { orderChatMentionAdminNotify } from '../sim/mail.js';

// Admin teammates who can be @mentioned on inbox internal notes (never customer-visible).
export const INBOX_TEAMMATES = [
  { id: 'admin-sarah', name: 'Sarah Klein', initials: 'SK' },
  { id: 'admin-max', name: 'Max Vogel', initials: 'MV' },
  { id: 'admin-leyla', name: 'Leyla Demir', initials: 'LD' },
  { id: 'admin-berat', name: 'Berat Özdemir', initials: 'BÖ' },
];

const INBOX_TEAM_NAME = 'eFactory Support';

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
    const sorted = [...all].sort((a, b) => new Date(b.at) - new Date(a.at));
    const lastEmail = sorted.find(m => m.medium === 'email');
    const lastIsSystemNotification = isSystemInboxNotification(lastEmail);
    // Every medium this contact has ever used — drives the inbox medium
    // filter. A contact with both email and WhatsApp stays visible under
    // either filter, regardless of which medium their latest message used.
    const mediums = [...new Set(all.map(m => m.medium))];
    contacts.push({
      key,
      contactType,
      contactId,
      name: lastIsSystemNotification
        ? SYSTEM_NOTIFICATION_SENDER.name
        : (entity.name || entity.phone || entity.email || 'Contact'),
      email: entity.email || null,
      phone: entity.phone || null,
      initials: lastIsSystemNotification
        ? 'SU'
        : (entity.initials || initialsFromName(entity.name) || '··'),
      lastIsSystemNotification,
      isB2B: !!entity.isB2B,
      lastAt,
      lastMedium,
      mediums,
      lastPreview: bodyPreview(lastMessage?.body),
      lastDirection: lastMessage?.direction || 'in',
      lastSubject: lastEmail?.subject || null,
      unread,
      messageCount: all.length,
    });
  });
  contacts.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  return contacts;
}

function selectExternalMessagesForContact(state, contactType, contactId) {
  if (!contactType || contactId == null) return [];
  const contactEntity = resolveContactEntity(state, contactType, contactId);
  const filtered = selectAllExternalMessages(state)
    .filter(m => m.contactType === contactType && String(m.contactId) === String(contactId));
  return attachQuotedSnapshots(filtered, contactEntity)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

function selectAllInternalNotes(state) {
  return tableItems(state.entities.inbox_internal_notes || { byId: {}, allIds: [] });
}

function selectInternalNotesForContact(state, contactType, contactId) {
  if (!contactType || contactId == null) return [];
  return selectAllInternalNotes(state)
    .filter(n => n.contactType === contactType && String(n.contactId) === String(contactId))
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
// (completed/cancelled), the chat not explicitly closed, AND no dispute lock
// active (see docs/flows/dispute/dispute_flow_design_review.md §7). `chat` is optional — pass it
// so an explicitly-closed / dispute-locked chat is honoured; omit it when
// checking whether a chat is allowed to be *created* (no chat yet).
function isOrderChatOpen(order, chat, opts = {}) {
  if (!order) return false;
  if (chat && chat.closedAt) return false;
  if (order.status === STATUS.CANCELLED || order.status === STATUS.COMPLETED) return false;
  if (!order.gwId) return false;
  // Dispute lock blocks customer + GW from posting. Admin bypasses via
  // `opts.bypassDisputeLock: true` so the dispute panel can still mediate
  // by posting into the chat directly.
  if (chat && chat.disputeLockedAt && !opts.bypassDisputeLock) return false;
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
function orderChatLockReason(order, chat, opts = {}) {
  if (!order) return 'Order not found.';
  if (isOrderChatArchived(order, chat)) return 'This chat is archived — the order is closed.';
  if (order.status === STATUS.CANCELLED || order.status === STATUS.COMPLETED) return 'The order is closed.';
  if (chat && chat.disputeLockedAt && !opts.bypassDisputeLock) {
    return 'Chat paused — efactory1 is mediating an open dispute.';
  }
  const paid = W.isOrderPaid(order);
  if (!paid && !order.gwId) return 'Opens once payment lands and a ghostwriter is assigned.';
  if (!paid) return 'Opens once payment lands.';
  if (!order.gwId) return 'Opens once a ghostwriter is assigned.';
  return null;
}

// Dispute lock helpers — toggle `chat.disputeLockedAt` without touching the
// terminal-state `closedAt` field. Lock is reversible (cleared on outcome A/D
// resolution); `closedAt` is one-way (only on terminal states / outcome B).
function lockForDispute(orderId, at) {
  const chat = selectOrderChat(store.getState(), orderId);
  if (!chat) return false;
  if (chat.disputeLockedAt) return true; // already locked
  I.patchEntity('order_chats', chat.id, { disputeLockedAt: at || I.nowIso() }, 'order_chats.disputeLock');
  return true;
}

function unlockFromDispute(orderId) {
  const chat = selectOrderChat(store.getState(), orderId);
  if (!chat || !chat.disputeLockedAt) return false;
  I.patchEntity('order_chats', chat.id, { disputeLockedAt: null }, 'order_chats.disputeUnlock');
  return true;
}

// =============================================================================
// Actions
// =============================================================================

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---- external messages ------------------------------------------------------

// payload: { contactType, contactId, medium, direction?, body, subject?, attachments?,
//   parentMessageId?, quotedMessageSnapshot?, from?, to? }
// direction defaults to 'out'. parentMessageId / quotedMessageSnapshot are render-only.
function sendExternal(payload = {}) {
  const body = (payload.body || '').trim();
  if (!body && !(payload.attachments && payload.attachments.length)) return null;
  if (!payload.contactType || payload.contactId == null) {
    I.toast({ text: 'Contact missing.', tone: 'danger' });
    return null;
  }
  const state = store.getState();
  const contactEntity = resolveContactEntity(state, payload.contactType, payload.contactId);
  const at = I.nowIso();
  const direction = payload.direction === 'in' ? 'in' : 'out';
  const defaults = participantsForDirection(direction, contactEntity);
  const threadFields = direction === 'out'
    ? buildOutboundReplyFields({
      contactEntity,
      parentMessageId: payload.parentMessageId,
    })
    : { parentMessageId: payload.parentMessageId ?? null };
  let quotedMessageSnapshot = payload.quotedMessageSnapshot ?? null;
  if (!quotedMessageSnapshot && threadFields.parentMessageId) {
    const parent = selectAllExternalMessages(state).find(m => m.id === threadFields.parentMessageId);
    if (parent) {
      quotedMessageSnapshot = buildQuotedMessageSnapshot(
        normalizeExternalMessage(parent, contactEntity),
      );
    }
  }

  const message = normalizeExternalMessage({
    id: newId('em'),
    contactType: payload.contactType,
    contactId: payload.contactId,
    conversationId: conversationIdFor(payload.contactType, payload.contactId),
    medium: payload.medium === 'whatsapp' ? 'whatsapp' : 'email',
    direction,
    at,
    body,
    subject: payload.subject || null,
    attachments: payload.attachments || null,
    readByAdmin: direction === 'out',
    parentMessageId: threadFields.parentMessageId,
    quotedMessageSnapshot,
    from: payload.from || defaults.from,
    to: payload.to?.length ? payload.to : defaults.to,
  }, contactEntity);
  I.upsertEntity('external_messages', message, 'external_messages.send');
  return message;
}

/** Surface a customer/GW @Berat mention in the admin Inbox (contact thread). */
function postOrderChatMentionToAdminInbox({ order, senderRole, senderName, body, messageId }) {
  if (!order) return null;
  const contactType = senderRole === 'gw' ? 'gw' : 'customer';
  const contactId = senderRole === 'gw' ? order.gwId : order.customerId;
  if (!contactId) return null;
  const excerpt = body.length > 280 ? `${body.slice(0, 280)}…` : body;
  const orderTitle = order.title || order.workType || '';
  return sendExternal({
    contactType,
    contactId,
    medium: 'email',
    direction: 'in',
    subject: `${senderName} mentioned you in order chat · #${order.id}`,
    body: [
      `${senderName} mentioned you (@Berat) in the platform order chat for Auftrag #${order.id}.`,
      orderTitle ? `Order: ${orderTitle}` : '',
      '',
      'Message:',
      excerpt,
      '',
      'Reply in the order communications tab.',
    ].filter(Boolean).join('\n'),
    from: { ...SYSTEM_NOTIFICATION_SENDER },
    to: [{ ...SUPPORT_INBOX }],
    relatedOrderId: order.id,
    source: 'order_chat_mention',
    orderChatMessageId: messageId,
  });
}

function parseMentions(body, teammates = INBOX_TEAMMATES) {
  const text = String(body || '');
  const ids = [];
  teammates.forEach(t => {
    const first = t.name.split(/\s+/)[0];
    const re = new RegExp(`@${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(text)) ids.push(t.id);
  });
  return [...new Set(ids)];
}

// payload: { contactType, contactId, body, authorId?, authorName?, authorInitials? }
function addInternalNote(payload = {}) {
  const body = (payload.body || '').trim();
  if (!body || !payload.contactType || payload.contactId == null) return null;
  const note = {
    id: newId('inote'),
    contactType: payload.contactType,
    contactId: payload.contactId,
    at: I.nowIso(),
    body,
    authorId: payload.authorId || 'admin-berat',
    authorName: payload.authorName || 'Berat Özdemir',
    authorInitials: payload.authorInitials || 'BÖ',
    mentions: parseMentions(body),
  };
  I.upsertEntity('inbox_internal_notes', note, 'inbox_internal_notes.add');
  note.mentions.forEach(mentionId => {
    const person = INBOX_TEAMMATES.find(t => t.id === mentionId);
    if (person && person.id !== note.authorId) {
      N.notify({
        to: 'admin',
        kind: 'inbox_internal_mention',
        title: `${note.authorName} mentioned you`,
        body: body.length > 80 ? body.slice(0, 80) + '…' : body,
        urgent: false,
      });
    }
  });
  return note;
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
  // The gate is enforced for every role — with one carve-out: admin can
  // bypass the *dispute* lock so Berat can mediate from inside the chat
  // (customer + GW still lose composer access). All other lock reasons
  // (intake_in_progress, archived, etc.) still apply to every role. Admin
  // lifecycle notices that need to bypass everything go through
  // postSystemMessage, not this path.
  const chat = selectOrderChat(store.getState(), orderId);
  const sendOpts = role === 'admin' ? { bypassDisputeLock: true } : undefined;
  if (!isOrderChatOpen(o, chat, sendOpts)) {
    I.toast({ text: orderChatLockReason(o, chat, sendOpts) || 'Order chat is not available.', tone: 'info' });
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
  const parentMessageId = payload.parentMessageId || null;
  let quotedMessageSnapshot = payload.quotedMessageSnapshot || null;
  if (parentMessageId && !quotedMessageSnapshot) {
    const parent = (liveChat.messages || []).find(m => m.id === parentMessageId);
    if (parent) quotedMessageSnapshot = buildOrderChatQuotedSnapshot(parent, o);
  }

  const mentionables = getOrderChatMentionables(o, role);
  const mentions = parseOrderChatMentions(body, mentionables);

  const message = {
    id: newId('oc'),
    chatId: liveChat.id,
    orderId: Number(orderId),
    authorRole: role,
    authorId,
    at,
    body,
    attachments: payload.attachments || null,
    parentMessageId,
    quotedMessageSnapshot,
    mentions: mentions.length ? mentions : null,
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
  const mentionedRoles = mentionRecipientRoles(mentions, role);
  // @Berat gets a dedicated mention notification + inbox email — skip the generic one.
  const messageRecipients = mentionedRoles.includes('admin')
    ? recipients.filter(r => r !== 'admin')
    : recipients;
  if (messageRecipients.length) {
    N.notify({
      to: messageRecipients,
      kind: 'message_received',
      orderId: o.id,
      customerId: o.customerId || null,
      gwId: o.gwId || null,
      title: `Neue Nachricht · #${o.id}`,
      body: `${senderName}: ${previewBody}`,
      urgent: false,
    });
  }

  mentionedRoles.forEach(targetRole => {
    if (!['customer', 'gw', 'admin'].includes(targetRole)) return;
    N.notify({
      to: [targetRole],
      kind: 'order_chat_mention',
      orderId: o.id,
      customerId: o.customerId || null,
      gwId: o.gwId || null,
      title: `${senderName} mentioned you · #${o.id}`,
      body: previewBody,
      urgent: targetRole === 'admin',
    });
  });

  if (mentionedRoles.includes('admin') && (role === 'customer' || role === 'gw')) {
    postOrderChatMentionToAdminInbox({
      order: o,
      senderRole: role,
      senderName,
      body,
      messageId: message.id,
    });
    orderChatMentionAdminNotify({
      orderId: o.id,
      customerId: o.customerId || null,
      gwId: o.gwId || null,
      senderName,
      senderRole: role,
      bodyExcerpt: previewBody,
      orderTitle: o.title || o.workType || '',
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
  lockForDispute,
  unlockFromDispute,
};

export const externalMessages = {
  send: sendExternal,
  markContactRead: markExternalContactRead,
};

export const inboxInternalNotes = {
  add: addInternalNote,
  teamName: INBOX_TEAM_NAME,
};

export const select = {
  externalContacts: selectExternalContacts,
  allExternalMessages: selectAllExternalMessages,
  externalMessagesForContact: selectExternalMessagesForContact,
  internalNotesForContact: selectInternalNotesForContact,
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
  parseMentions,
  normalizeExternalMessage,
  getOrderChatMentionables,
  parseOrderChatMentions,
};

// Re-export the order-paid predicate so chat surfaces can read the gate
// status from a single comms entry point.
export { isOrderPaid } from './workflow.js';
