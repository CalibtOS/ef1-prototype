// Threads / messaging subsystem.
//
// Threads live in state.entities.threads with shape:
//   { id, orderId, customerId, gwId, subject, channel, sentiment, lastAt,
//     flagged, followUp, snoozeUntil, lastInboundAt, lastOutboundAt,
//     unread: { admin: N, gw: N, customer: N },
//     messages: [{ id, threadId, from, body, at, origin_channel, delivery_channel,
//       external_ref?, attachments?, autoflag?, system? }] }
//
// All composer surfaces (admin/inbox.jsx, gw/messages.jsx, customer/view.jsx)
// route through `send` so a message sent in one persona is visible to the
// others on role switch.
;(function(){
const store = window.EFStore;
const S = window.EFSelectors;
const I = window.EFInternals;
const N = window.EFNotifications;

const FINANCIAL_KEYWORD_RE = /preis|kosten|rabatt|nachlass|raten|geld|honorar|bezahl|rechnung|euro|€/i;

function selectThread(state, threadId) {
  return S.byId(state.entities.threads, threadId);
}

function selectThreadByOrder(state, orderId) {
  const threads = state.entities.threads;
  const id = (threads.allIds || []).find(tid => Number(threads.byId[tid]?.orderId) === Number(orderId));
  return id ? threads.byId[id] : null;
}

function newMessageId(threadId) {
  return `${threadId}-m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function normalizeChannel(value) {
  if (value === 'email_proxy') return 'email';
  if (value === 'whatsapp_proxy') return 'whatsapp';
  if (value === 'platform_chat') return 'platform';
  if (value === 'voice_metadata') return 'voice';
  if (value === 'multi_channel') return 'multi';
  return value || 'platform';
}

function ensureThreadForOrder(orderId) {
  const state = store.getState();
  const existing = selectThreadByOrder(state, orderId);
  if (existing) return existing;
  const o = I.order(orderId);
  if (!o) return null;
  const id = `t-live-${orderId}`;
  const thread = {
    id,
    orderId: Number(orderId),
    customerId: o.customerId,
    gwId: o.gwId || null,
    subject: o.title || `Auftrag #${orderId}`,
    channel: 'multi_channel',
    sentiment: 'neutral',
    lastAt: I.nowIso(),
    lastInboundAt: null,
    lastOutboundAt: null,
    flagged: false,
    followUp: false,
    snoozeUntil: null,
    unread: { admin: 0, gw: 0, customer: 0 },
    messages: [],
  };
  I.upsertEntity('threads', thread, 'threads.create');
  return thread;
}

function appendMessage(threadId, message, label) {
  I.patchEntity('threads', threadId, prev => {
    const messages = [...(prev.messages || []), message];
    return {
      ...prev,
      messages,
      lastAt: message.at,
      lastInboundAt: (message.from === 'customer' || message.from === 'gw') ? message.at : (prev.lastInboundAt || null),
      lastOutboundAt: message.from === 'admin' ? message.at : (prev.lastOutboundAt || null),
    };
  }, label || 'threads.appendMessage');
}

function bumpUnread(threadId, recipientRoles) {
  I.patchEntity('threads', threadId, prev => {
    const unread = { admin: 0, gw: 0, customer: 0, ...(prev.unread || {}) };
    recipientRoles.forEach(r => { unread[r] = (unread[r] || 0) + 1; });
    return { ...prev, unread };
  }, 'threads.bumpUnread');
}

function recipientsForThread(thread, senderRole) {
  // Admin observes every operational thread. Customer/GW bells only exist when
  // that role is an actual participant; lead-only threads stay in the admin inbox.
  const all = ['admin'];
  if (thread?.threadType === 'order') {
    if (thread.customerId) all.push('customer');
    if (thread.gwId) all.push('gw');
  } else if (thread?.threadType === 'gw_direct') {
    if (thread.gwId) all.push('gw');
  }
  return Array.from(new Set(all)).filter(r => r !== senderRole);
}

function send(payload = {}) {
  const role = payload.role || store.getState().session.role || 'admin';
  const orderId = payload.orderId;
  let threadId = payload.threadId;
  let thread = threadId
    ? selectThread(store.getState(), threadId)
    : (orderId != null ? selectThreadByOrder(store.getState(), orderId) : null);

  if (!thread && orderId != null) {
    thread = ensureThreadForOrder(orderId);
  }
  if (!thread) {
    I.toast({ text: 'Thread not found', tone: 'danger' });
    return null;
  }
  threadId = thread.id;

  const body = (payload.body || '').trim();
  if (!body && !(payload.attachments && payload.attachments.length)) return null;

  const at = I.nowIso();
  const isFinancial = !payload.financialPolicyExempt && role !== 'admin' && FINANCIAL_KEYWORD_RE.test(body);
  const threadDefaultChannel = normalizeChannel(thread.channel);
  const defaultDelivery = threadDefaultChannel === 'voice' || threadDefaultChannel === 'multi' ? 'email' : threadDefaultChannel;
  const message = {
    id: newMessageId(threadId),
    threadId,
    from: role,
    body,
    at,
    origin_channel: payload.origin_channel || (role === 'admin' ? 'admin' : 'platform'),
    delivery_channel: payload.delivery_channel || payload.channel || defaultDelivery,
    external_ref: payload.external_ref || null,
    policy_exemption: payload.policy_exemption || null,
    autoflag: isFinancial ? 'financial' : null,
    system: false,
  };
  if (payload.attachments && payload.attachments.length) message.attachments = payload.attachments;
  appendMessage(threadId, message, 'threads.send');

  // Always bump unread for non-sender roles. The financial system message
  // (below) bumps admin again so the redirect is unmistakable in the bell.
  bumpUnread(threadId, recipientsForThread(thread, role));

  if (isFinancial) {
    const sysMsg = {
      id: newMessageId(threadId) + '-sys',
      threadId,
      from: 'system',
      body: 'Finanzbezug erkannt — Anfrage automatisch an kundenservice@efactory1.de weitergeleitet. Der Ghostwriter darf finanzielle Themen nicht besprechen.',
      at: I.nowIso(),
      origin_channel: 'system',
      delivery_channel: 'internal',
      external_ref: null,
      system: true,
      autoflag: 'financial',
    };
    appendMessage(threadId, sysMsg, 'threads.financialRedirect');
    I.patchEntity('threads', threadId, { flagged: 'financial' }, 'threads.flagFinancial');
    N.notify({
      to: 'admin',
      kind: 'message_redirected',
      orderId: thread.orderId,
      customerId: thread.customerId || null,
      gwId: thread.gwId || null,
      threadId,
      title: thread.orderId ? `Finanzfrage umgeleitet · #${thread.orderId}` : 'Finanzfrage umgeleitet',
      body: 'Customer fragte nach Preisen/Raten. Auto-Redirect an kundenservice@efactory1.de.',
      urgent: false,
    });
  }

  // Notify the other participants. Skip admin notification if it's the financial
  // path (already covered above) and skip self.
  const senderName = role === 'gw'
    ? (I.gw(thread.gwId)?.name || 'Ghostwriter')
    : role === 'customer'
      ? (I.customer(thread.customerId)?.name || 'Kunde')
      : 'efactory1';
  const previewBody = body.length > 90 ? body.slice(0, 90) + '…' : body;
  const recipients = recipientsForThread(thread, role)
    .filter(r => !(isFinancial && r === 'admin'));
  if (recipients.length) {
    N.notify({
      to: recipients,
      kind: 'message_received',
      orderId: thread.orderId,
      customerId: thread.customerId || null,
      gwId: thread.gwId || null,
      threadId,
      title: thread.orderId ? `Neue Nachricht · #${thread.orderId}` : 'Neue Nachricht',
      body: `${senderName}: ${previewBody}`,
      urgent: false,
    });
  }

  return message;
}

function markRead(threadId, role) {
  if (!threadId || !role) return false;
  I.patchEntity('threads', threadId, prev => {
    const unread = { admin: 0, gw: 0, customer: 0, ...(prev.unread || {}) };
    unread[role] = 0;
    return { ...prev, unread };
  }, 'threads.markRead');
  return true;
}

function redirect(threadId) {
  const thread = selectThread(store.getState(), threadId);
  if (!thread) return false;
  const sysMsg = {
    id: newMessageId(threadId) + '-redir',
    threadId,
    from: 'system',
    body: 'Admin hat diesen Thread an kundenservice@efactory1.de weitergeleitet. Bitte alle Finanzfragen dort fortführen.',
    at: I.nowIso(),
    system: true,
    autoflag: 'financial',
  };
  appendMessage(threadId, sysMsg, 'threads.redirect');
  I.patchEntity('threads', threadId, { flagged: 'financial' }, 'threads.flagFinancial');
  N.notify({
    to: 'customer',
    kind: 'message_redirected',
    orderId: thread.orderId,
    customerId: thread.customerId || null,
    gwId: thread.gwId || null,
    threadId,
    title: thread.orderId ? `Anfrage an Kundenservice weitergeleitet · #${thread.orderId}` : 'Anfrage an Kundenservice weitergeleitet',
    body: 'Wir kümmern uns von dort um Ihre Frage.',
  });
  return true;
}

function flagFollowUp(threadId) {
  I.patchEntity('threads', threadId, prev => ({ ...prev, followUp: !prev.followUp }), 'threads.followUp');
  return true;
}

function snooze(threadId, hours = 4) {
  const ms = Date.now() + hours * 3600 * 1000;
  I.patchEntity('threads', threadId, { snoozeUntil: new Date(ms).toISOString() }, 'threads.snooze');
  return true;
}

window.EFThreads = {
  send,
  markRead,
  redirect,
  flagFollowUp,
  snooze,
  selectThread,
  selectThreadByOrder,
  ensureThreadForOrder,
};
})();
