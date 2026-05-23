import React from 'react';
import { Icon } from '../../utils.jsx';

function previewText(text, max = 140) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * WhatsApp-style quoted reply — colored accent bar, sender name, snippet.
 * Used in platform order chat (not admin email inbox).
 */
function ChatInlineReply({
  authorName,
  authorRole = 'customer',
  body,
  mine = false,
  mode = 'message',
  onDismiss,
}) {
  if (!authorName && !body) return null;
  const role = ['customer', 'gw', 'admin'].includes(authorRole) ? authorRole : 'customer';
  const snippet = previewText(body);

  return (
    <div
      className={`chat-inline-reply chat-inline-reply--${role} ${mine ? 'is-mine-bubble' : ''} ${mode === 'composer' ? 'is-composer' : ''}`}
      role={mode === 'composer' ? 'group' : undefined}
      aria-label={mode === 'composer' ? `Replying to ${authorName}` : undefined}
    >
      <span className="chat-inline-reply-accent" aria-hidden="true"/>
      <span className="chat-inline-reply-content">
        {authorName && <span className="chat-inline-reply-name">{authorName}</span>}
        {snippet && <span className="chat-inline-reply-snippet">{snippet}</span>}
      </span>
      {mode === 'composer' && onDismiss && (
        <button
          type="button"
          className="chat-inline-reply-dismiss"
          onClick={onDismiss}
          aria-label="Cancel reply"
        >
          <Icon name="x" size={14}/>
        </button>
      )}
    </div>
  );
}

/** Build props from order-chat quotedMessageSnapshot. */
function ChatInlineReplyFromSnapshot({ snapshot, mine, mode, onDismiss }) {
  if (!snapshot) return null;
  return (
    <ChatInlineReply
      authorName={snapshot.authorName}
      authorRole={snapshot.authorRole || 'customer'}
      body={snapshot.body}
      mine={mine}
      mode={mode}
      onDismiss={onDismiss}
    />
  );
}

export { ChatInlineReply, ChatInlineReplyFromSnapshot };
