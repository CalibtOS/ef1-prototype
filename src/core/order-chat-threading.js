// Threading + @mentions for per-order platform chats (customer · GW · admin).
import EF from './ef.js';

const D = EF;

export function participantIdForRole(role, authorId) {
  if (role === 'admin') return 'admin:admin';
  if (role === 'gw') return `gw:${authorId || ''}`;
  if (role === 'customer') return `customer:${authorId || ''}`;
  return `system:${authorId || ''}`;
}

export function currentParticipantForOrder(order, role) {
  if (!order) return { id: 'unknown', role, name: 'Unknown' };
  if (role === 'admin') {
    return { id: 'admin:admin', role: 'admin', name: 'Berat (efactory1)' };
  }
  if (role === 'gw') {
    const g = D.gw(order.gwId);
    return { id: `gw:${order.gwId}`, role: 'gw', name: g?.name || 'Ghostwriter' };
  }
  const c = D.customer(order.customerId);
  return { id: `customer:${order.customerId}`, role: 'customer', name: c?.name || 'Customer' };
}

export function authorNameForMessage(m, order) {
  if (!m) return 'Unknown';
  if (m.authorRole === 'system') return 'System';
  if (m.authorRole === 'admin') return 'Berat (efactory1)';
  if (m.authorRole === 'gw') {
    const g = D.gw(m.authorId) || (order?.gwId ? D.gw(order.gwId) : null);
    return g?.name || 'Ghostwriter';
  }
  if (m.authorRole === 'customer') {
    const c = D.customer(m.authorId) || (order?.customerId ? D.customer(order.customerId) : null);
    return c?.name || 'Customer';
  }
  return 'Unknown';
}

export function formatOrderChatQuoteHeader(snapshot) {
  if (!snapshot) return '';
  const d = new Date(snapshot.writtenAt);
  const datePart = d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  const timePart = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `On ${datePart} at ${timePart} ${snapshot.authorName} wrote:`;
}

export function buildOrderChatQuotedSnapshot(parentMessage, order) {
  if (!parentMessage || parentMessage.authorRole === 'system') return null;
  return {
    messageId: parentMessage.id,
    authorParticipantId: participantIdForRole(parentMessage.authorRole, parentMessage.authorId),
    authorName: authorNameForMessage(parentMessage, order),
    authorRole: parentMessage.authorRole,
    writtenAt: parentMessage.at,
    body: parentMessage.body || '',
    nestedQuote: parentMessage.quotedMessageSnapshot
      ? { ...parentMessage.quotedMessageSnapshot }
      : null,
  };
}

export function attachOrderChatQuotedSnapshots(messages, order) {
  const byId = Object.fromEntries(messages.map(m => [m.id, m]));
  return messages.map(m => {
    let next = { ...m };
    if (next.parentMessageId && !next.quotedMessageSnapshot) {
      const parent = byId[next.parentMessageId];
      if (parent) {
        next = {
          ...next,
          quotedMessageSnapshot: buildOrderChatQuotedSnapshot(parent, order),
        };
      }
    }
    return next;
  });
}

function previewText(text, max = 72) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function replyContextForOrderMessage(replyTarget, order) {
  if (!replyTarget || replyTarget.authorRole === 'system') return null;
  const emphasis = authorNameForMessage(replyTarget, order);
  return {
    label: 'Replying to:',
    emphasis,
    preview: previewText(replyTarget.body),
  };
}

/** Mentionable participants for @ picker (first name match in body). */
export function getOrderChatMentionables(order, currentRole) {
  if (!order) return [];
  const list = [];
  const cust = D.customer(order.customerId);
  if (cust && currentRole !== 'customer') {
    list.push({
      id: `customer:${order.customerId}`,
      role: 'customer',
      name: cust.name,
      initials: cust.initials || 'CU',
      mentionKey: cust.name.split(/\s+/)[0],
    });
  }
  if (order.gwId && currentRole !== 'gw') {
    const g = D.gw(order.gwId);
    if (g) {
      list.push({
        id: `gw:${order.gwId}`,
        role: 'gw',
        name: g.name,
        initials: g.initials || 'GW',
        mentionKey: g.name.split(/\s+/)[0],
      });
    }
  }
  if (currentRole !== 'admin') {
    list.push({
      id: 'admin:admin',
      role: 'admin',
      name: 'Berat',
      initials: 'BÖ',
      mentionKey: 'Berat',
    });
  }
  return list;
}

export function parseOrderChatMentions(body, mentionables = []) {
  const text = String(body || '');
  const ids = [];
  mentionables.forEach(t => {
    const key = t.mentionKey || t.name.split(/\s+/)[0];
    const re = new RegExp(`@${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(text)) ids.push(t.id);
  });
  return [...new Set(ids)];
}

export function isSameOrderChatParticipant(currentFrom, snapshot) {
  if (!currentFrom || !snapshot) return false;
  if (currentFrom.id && snapshot.authorParticipantId && currentFrom.id === snapshot.authorParticipantId) {
    return true;
  }
  return currentFrom.role === snapshot.authorRole;
}

export function mentionRecipientRoles(mentionIds, currentRole) {
  const roles = new Set();
  mentionIds.forEach(id => {
    if (id.startsWith('customer:')) roles.add('customer');
    else if (id.startsWith('gw:')) roles.add('gw');
    else if (id.startsWith('admin:')) roles.add('admin');
  });
  roles.delete(currentRole);
  return [...roles];
}
