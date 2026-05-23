// Threading + participant semantics for contact-keyed external messages.
//
// A reply (parentMessageId) is a LOGICAL relationship only. Delivery
// participants are always contact ↔ support inbox based on direction,
// never "reply target" addressing.

export const SUPPORT_INBOX = {
  id: 'support',
  name: 'efactory1 (Berat)',
  email: 'berat@efactory1.de',
  role: 'support',
};

/** Platform-generated inbox notifications (order-chat @mentions, etc.). */
export const SYSTEM_NOTIFICATION_SENDER = {
  id: 'system-notifications',
  name: 'Support',
  email: 'notifications@efactory1.de',
  role: 'system',
};

export function isSystemInboxNotification(message) {
  return message?.source === 'order_chat_mention' || message?.from?.role === 'system';
}

/** @param {{ id?: string, name?: string, email?: string, phone?: string }} entity */
export function contactParticipant(entity = {}) {
  return {
    id: entity.id || entity.contactId || 'contact',
    name: entity.name || entity.email || entity.phone || 'Contact',
    email: entity.email || null,
    phone: entity.phone || null,
    role: 'contact',
  };
}

/** Real From/To for a stored delivery direction — independent of parentMessageId. */
export function participantsForDirection(direction, contactEntity) {
  const contact = contactParticipant(contactEntity);
  if (direction === 'out') {
    return { from: { ...SUPPORT_INBOX }, to: [contact] };
  }
  return { from: contact, to: [{ ...SUPPORT_INBOX }] };
}

export function conversationIdFor(contactType, contactId) {
  return `${contactType}:${contactId}`;
}

/** Backfill from/to/parentMessageId/quotedMessageSnapshot on legacy rows. */
export function normalizeExternalMessage(msg, contactEntity) {
  if (!msg) return msg;
  const direction = msg.direction === 'out' ? 'out' : 'in';
  const defaults = participantsForDirection(direction, contactEntity);
  return {
    ...msg,
    conversationId: msg.conversationId || conversationIdFor(msg.contactType, msg.contactId),
    parentMessageId: msg.parentMessageId ?? null,
    quotedMessageSnapshot: msg.quotedMessageSnapshot ?? null,
    from: msg.from?.name ? msg.from : defaults.from,
    to: Array.isArray(msg.to) && msg.to.length > 0 ? msg.to : defaults.to,
  };
}

export function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

/** Stable sender identity — participantId, email, phone, or support role. */
export function isSameParticipant(currentFrom, snapshotOrAuthor) {
  if (!currentFrom || !snapshotOrAuthor) return false;
  const authorId = snapshotOrAuthor.authorParticipantId ?? snapshotOrAuthor.id;
  const authorEmail = snapshotOrAuthor.authorEmail ?? snapshotOrAuthor.email;
  const authorPhone = snapshotOrAuthor.authorPhone ?? snapshotOrAuthor.phone;
  const authorRole = snapshotOrAuthor.role;

  if (currentFrom.id && authorId && currentFrom.id === authorId) return true;
  if (currentFrom.role === 'support' && (authorId === 'support' || authorRole === 'support')) return true;

  const emailA = normalizeIdentity(currentFrom.email);
  const emailB = normalizeIdentity(authorEmail);
  if (emailA && emailB && emailA === emailB) return true;

  const phoneA = normalizeIdentity(currentFrom.phone);
  const phoneB = normalizeIdentity(authorPhone);
  if (phoneA && phoneB && phoneA === phoneB) return true;

  return false;
}

export function formatGmailQuoteHeader(snapshot) {
  if (!snapshot) return '';
  const d = new Date(snapshot.writtenAt);
  const datePart = d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  const timePart = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const email = snapshot.authorEmail ? ` <${snapshot.authorEmail}>` : '';
  return `On ${datePart} at ${timePart} ${snapshot.authorName}${email} wrote:`;
}

/** Snapshot of the message being quoted (render-only; does not change delivery). */
export function buildQuotedMessageSnapshot(parentMessage) {
  if (!parentMessage) return null;
  const from = parentMessage.from || {};
  return {
    messageId: parentMessage.id,
    authorParticipantId: from.id || null,
    authorName: from.name || 'Unknown',
    authorEmail: from.email || null,
    authorPhone: from.phone || null,
    writtenAt: parentMessage.at,
    body: parentMessage.body || '',
    nestedQuote: parentMessage.quotedMessageSnapshot
      ? { ...parentMessage.quotedMessageSnapshot }
      : null,
  };
}

/** Hydrate quotedMessageSnapshot from parentMessageId for legacy rows. */
export function attachQuotedSnapshots(messages, contactEntity) {
  const byId = Object.fromEntries(messages.map(m => [m.id, m]));
  return messages.map(m => {
    let next = normalizeExternalMessage(m, contactEntity);
    if (next.parentMessageId && !next.quotedMessageSnapshot) {
      const parent = byId[next.parentMessageId];
      if (parent) {
        const parentNorm = normalizeExternalMessage(parent, contactEntity);
        next = {
          ...next,
          quotedMessageSnapshot: buildQuotedMessageSnapshot(parentNorm),
        };
      }
    }
    return next;
  });
}

export function formatParticipantLine(participant) {
  if (!participant) return '';
  if (participant.email) return `${participant.name} <${participant.email}>`;
  if (participant.phone) return `${participant.name} (${participant.phone})`;
  return participant.name || '';
}

/** UI display for EmailCard — always from stored participants. */
export function emailDisplayForMessage(message) {
  const outbound = message.direction === 'out';
  return {
    direction: outbound ? 'outbound' : 'inbound',
    fromLine: formatParticipantLine(message.from),
    to: (message.to || []).map(formatParticipantLine),
  };
}

/**
 * Outbound reply payload: always to contact, optional parentMessageId for thread link.
 * @param {{ contactEntity: object, body: string, subject?: string, parentMessageId?: string|null, medium: string, attachments?: unknown }}
 */
export function buildOutboundReplyFields({ contactEntity, parentMessageId = null }) {
  const { from, to } = participantsForDirection('out', contactEntity);
  return {
    direction: 'out',
    from,
    to,
    parentMessageId: parentMessageId || null,
  };
}

/** Draft context: prefer inbound body even when replying to own outbound message. */
export function inboundContextForReply(replyTarget, messages = []) {
  if (replyTarget?.direction === 'in') return replyTarget;
  return [...messages].reverse().find(m => m.direction === 'in') || null;
}

export function replySubjectFromTarget(replyTarget, fallbackSubject = 'Anfrage') {
  const base = replyTarget?.subject || fallbackSubject;
  if (!base) return 'Anfrage';
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

function previewText(text, max = 72) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Composer banner while replying. */
export function replyContextForTarget(replyTarget) {
  if (!replyTarget) return null;
  const preview = previewText(replyTarget.body);
  if (replyTarget.direction === 'out') {
    return { label: 'Replying to:', emphasis: 'my message', preview };
  }
  const emphasis = replyTarget.from?.name || 'customer message';
  return { label: 'Replying to:', emphasis, preview };
}

/** Card hint for a message that has parentMessageId. */
export function threadHintForMessage(message, messagesById = {}) {
  if (!message?.parentMessageId) return null;
  const parent = messagesById[message.parentMessageId];
  if (!parent) {
    return { label: 'Replying to:', emphasis: 'earlier message', preview: '' };
  }
  const preview = previewText(parent.body);
  if (parent.direction === 'out') {
    return { label: 'Replying to:', emphasis: 'my message', preview };
  }
  return {
    label: 'Replying to:',
    emphasis: parent.from?.name || 'customer message',
    preview,
  };
}
