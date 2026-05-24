// OrderChat — the platform-owned 3-party chat for a single order.
//
// Shared by admin (order-detail Communications tab), customer (order view),
// and ghostwriter (assignment-detail). Supports @mentions and reply threading.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon, Avatar, ChatMessage, ChatComposer, ChatNotice, EmptyState, renderBodyWithMentions } from '../../utils.jsx';
import { ChatInlineReply, ChatInlineReplyFromSnapshot } from '../components/ChatInlineReply.jsx';
import { authorNameForMessage } from '../core/order-chat-threading.js';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
import { isOrderChatOpen, isOrderChatArchived, orderChatLockReason, isOrderPaid } from '../core/comms.js';
import {
  attachOrderChatQuotedSnapshots,
  buildOrderChatQuotedSnapshot,
  getOrderChatMentionables,
} from '../core/order-chat-threading.js';

const D = EF;

function OrderChat({ orderId, currentRole = 'admin', toast, embedded = false, autoFocusComposer = false, fillHeight = false, reportMode = false, selectedMessageIds, onToggleMessage, reportTargetRole, highlightedMessageIds }) {
  const order = EFHooks.useOrder(orderId);
  const chat = EFHooks.useOrderChat(orderId);
  const cust = order ? D.customer(order.customerId) : null;
  const gw = order?.gwId ? D.gw(order.gwId) : null;

  const archived = isOrderChatArchived(order, chat);
  const open = isOrderChatOpen(order, chat);
  const lockReason = orderChatLockReason(order, chat);

  useEffect(() => {
    if (chat?.id && (chat.unread?.[currentRole] || 0) > 0) {
      EFActions.orderChats.markRead(orderId, currentRole);
    }
  }, [chat?.id, currentRole, orderId]);

  if (!order) {
    return (
      <div className="chat-shell chat-shell-soft">
        <div className="card-pad text-muted">Order not found.</div>
      </div>
    );
  }

  if (archived) {
    return (
      <OrderChatLive
        order={order} chat={chat} cust={cust} gw={gw}
        currentRole={currentRole} toast={toast} readOnly embedded={embedded} fillHeight={fillHeight}
      />
    );
  }

  if (!open) {
    return <OrderChatLocked order={order} lockReason={lockReason} currentRole={currentRole} embedded={embedded} fillHeight={fillHeight}/>;
  }

  return (
    <OrderChatLive
      order={order}
      chat={chat}
      cust={cust}
      gw={gw}
      currentRole={currentRole}
      toast={toast}
      embedded={embedded}
      autoFocusComposer={autoFocusComposer}
      fillHeight={fillHeight}
      reportMode={reportMode}
      selectedMessageIds={selectedMessageIds}
      onToggleMessage={onToggleMessage}
      reportTargetRole={reportTargetRole}
      highlightedMessageIds={highlightedMessageIds}
    />
  );
}

function OrderChatLocked({ order, lockReason, currentRole, embedded, fillHeight = false }) {
  const paid = isOrderPaid(order);
  const assigned = !!order.gwId;
  const adminCopy = currentRole === 'admin'
    ? 'Until then, customer questions about this order land in your Inbox (WhatsApp/Email).'
    : null;
  const customerCopy = currentRole === 'customer'
    ? 'Bei Fragen erreichen Sie uns weiterhin per E-Mail oder WhatsApp.'
    : null;
  const gwCopy = currentRole === 'gw'
    ? 'Kundenchat öffnet sich automatisch, sobald die Zuweisung bestätigt ist.'
    : null;
  return (
    <div className={[
      'chat-shell', 'chat-shell-soft',
      embedded ? 'chat-shell-embedded' : '',
      fillHeight ? 'order-chat--fill' : '',
    ].filter(Boolean).join(' ')}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div className="chat-lock-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 999, background: 'var(--surface-2)', marginBottom: 14 }}>
            <Icon name="lock" size={22}/>
          </div>
          <div style={{ fontSize: embedded ? 14 : 16, fontWeight: 600, marginBottom: 6 }}>
            {currentRole === 'customer' ? 'Auftragschat noch nicht aktiv' : currentRole === 'gw' ? 'Customer chat not started yet' : 'Order chat not started yet'}
          </div>
          <div className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {lockReason || 'Opens once payment lands and a ghostwriter is assigned.'}
          </div>
          {!embedded && (
            <div className="flex" style={{ gap: 16, justifyContent: 'center', fontSize: 12, marginBottom: 14 }}>
              <span className={paid ? 'text-success' : 'text-faint'}>
                <Icon name={paid ? 'check-circle' : 'circle'} size={13}/> {paid ? 'Payment received' : 'Payment pending'}
              </span>
              <span className={assigned ? 'text-success' : 'text-faint'}>
                <Icon name={assigned ? 'check-circle' : 'circle'} size={13}/> {assigned ? 'Ghostwriter assigned' : 'No ghostwriter yet'}
              </span>
            </div>
          )}
          {(adminCopy || customerCopy || gwCopy) && (
            <div className="text-faint" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              {adminCopy || customerCopy || gwCopy}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderChatLive({
  order, chat, cust, gw, currentRole, toast, readOnly = false, embedded = false, autoFocusComposer = false, fillHeight = false,
  reportMode = false, selectedMessageIds, onToggleMessage, reportTargetRole, highlightedMessageIds,
}) {
  const [body, setBody] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const composerRef = useRef(null);
  const streamRef = useRef(null);

  const mentionables = useMemo(
    () => getOrderChatMentionables(order, currentRole),
    [order?.id, order?.gwId, order?.customerId, currentRole],
  );

  const allMentionables = useMemo(() => {
    const byId = new Map();
    ['admin', 'gw', 'customer'].forEach(role => {
      getOrderChatMentionables(order, role).forEach(m => byId.set(m.id, m));
    });
    return [...byId.values()];
  }, [order?.id, order?.gwId, order?.customerId]);

  const messages = useMemo(() => {
    const raw = (chat?.messages || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at));
    return attachOrderChatQuotedSnapshots(raw, order);
  }, [chat?.messages, order]);

  useEffect(() => {
    if (autoFocusComposer && composerRef.current) composerRef.current.focus();
  }, [autoFocusComposer]);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, replyTarget?.id]);

  const participantBlock = (
    <div className="order-chat-participants">
      <span className="order-chat-participant">
        <Avatar initials={cust?.initials || '··'} size={22} tone="blue"/>
        <span className="order-chat-name">{cust?.name || 'Customer'}</span>
        <span className="order-chat-role">customer</span>
      </span>
      <span className="order-chat-participant">
        <Avatar initials={gw?.initials || '··'} size={22} tone="amber"/>
        <span className="order-chat-name">{gw?.name || 'Ghostwriter'}</span>
        <span className="order-chat-role">ghostwriter</span>
      </span>
      <span className="order-chat-participant">
        <Avatar initials="BÖ" size={22} tone="slate"/>
        <span className="order-chat-name">Berat (efactory1)</span>
        <span className="order-chat-role">admin</span>
      </span>
    </div>
  );

  const senderInfoFor = (m) => {
    if (m.authorRole === 'customer') {
      const c = D.customer(m.authorId) || cust;
      return { name: c?.name || 'Customer', initials: c?.initials || '··', tone: 'blue' };
    }
    if (m.authorRole === 'gw') {
      const g = D.gw(m.authorId) || gw;
      return { name: g?.name || 'Ghostwriter', initials: g?.initials || '··', tone: 'amber' };
    }
    if (m.authorRole === 'admin') return { name: 'Berat (efactory1)', initials: 'BÖ', tone: 'slate' };
    return { name: 'System', initials: '··', tone: 'slate' };
  };

  const clearReply = () => setReplyTarget(null);

  const onSend = () => {
    if (!body.trim()) return;
    const msg = EFActions.orderChats.send({
      orderId: order.id,
      role: currentRole,
      body,
      parentMessageId: replyTarget?.id || null,
      quotedMessageSnapshot: replyTarget ? buildOrderChatQuotedSnapshot(replyTarget, order) : null,
    });
    if (msg) {
      toast && toast({ tone: 'success', text: `Nachricht gesendet · #${order.id}` });
      setBody('');
      clearReply();
    }
  };

  const composerReplyPreview = replyTarget ? (
    <ChatInlineReply
      mode="composer"
      authorName={authorNameForMessage(replyTarget, order)}
      authorRole={replyTarget.authorRole}
      body={replyTarget.body}
      onDismiss={clearReply}
    />
  ) : null;

  const composerPlaceholder = currentRole === 'customer'
    ? 'Nachricht im Auftragschat… (@Berat oder Ghostwriter)'
    : currentRole === 'gw'
      ? `Nachricht an ${cust?.name?.split(' ')[0] || 'Kunde'} — @ für Erwähnung…`
      : `Posting as Berat in #${order.id} — @ für Erwähnung…`;

  const shellClass = [
    'chat-shell',
    'chat-shell-soft',
    embedded ? 'chat-shell-embedded' : '',
    fillHeight ? 'order-chat--fill' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={shellClass}>
      {!embedded && (
        <div className="chat-header">
          <div className="chat-title">
            <div>
              <span className="chat-title-main">Auftragschat · #{order.id}</span>
              <span className="chat-title-sub">3 participants · platform-owned · Berat moderiert mit</span>
            </div>
          </div>
          <div className="flex gap-1">
            <span className="pill pill-blue" style={{ fontSize: 10 }}><Icon name="lock" size={9}/> platform-only</span>
          </div>
        </div>
      )}

      <div style={{ padding: embedded ? '6px 10px' : '8px 14px', borderBottom: '1px solid var(--border)' }}>
        {participantBlock}
      </div>

      {!embedded && (
        <ChatNotice compact icon="info">
          {currentRole === 'admin'
            ? 'You are a visible participant. Customer and GW see your messages. Use @ to mention someone or Reply on a message.'
            : currentRole === 'customer'
              ? 'Berat liest jeden Beitrag mit. @Berat oder @Ghostwriter für eine direkte Erwähnung.'
              : 'Berat sieht jeden Beitrag. @ für Erwähnung · Reply auf eine Nachricht für Kontext.'}
        </ChatNotice>
      )}

      <div className="chat-stream" ref={streamRef}>
        {reportMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'color-mix(in oklab, var(--amber) 10%, var(--surface))', borderBottom: '1px solid color-mix(in oklab, var(--amber) 25%, var(--border))', fontSize: 12.5, color: 'var(--text-2)' }}>
            <Icon name="flag" size={13} style={{ color: 'var(--amber)', flexShrink: 0 }}/>
            {currentRole === 'gw'
              ? 'Select the customer messages you want to report.'
              : 'Wählen Sie die Nachrichten des Ghostwriters aus, die Sie melden möchten.'}
          </div>
        )}
        {messages.length === 0 ? (
          <EmptyState compact icon="message-square" title="No messages yet" body="Start the conversation with the first message."/>
        ) : (
          messages.map((m, i) => {
            if (m.authorRole === 'system') {
              return <ChatMessage key={m.id} system at={m.at}>{m.body}</ChatMessage>;
            }
            const mine = m.authorRole === currentRole;
            const info = senderInfoFor(m);
            const prev = messages[i - 1];
            const grouped = !!prev && prev.authorRole === m.authorRole
              && prev.authorRole !== 'system' && prev.authorId === m.authorId;
            const quotedBlock = m.quotedMessageSnapshot ? (
              <ChatInlineReplyFromSnapshot
                snapshot={m.quotedMessageSnapshot}
                mine={mine}
              />
            ) : null;

            const targetRole = reportTargetRole || (currentRole === 'gw' ? 'customer' : 'gw');
            const isReportable = reportMode && m.authorRole === targetRole;
            const isSelected = isReportable && selectedMessageIds?.has(m.id);
            const isHighlighted = !reportMode && highlightedMessageIds?.has(m.id);

            const bubble = (
              <ChatMessage
                key={m.id}
                mine={mine}
                sender={info.name}
                initials={info.initials}
                at={m.at}
                grouped={grouped}
                attachments={m.attachments}
                channel={!grouped ? roleChip(m.authorRole) : null}
                tone={info.tone}
                quotedBlock={quotedBlock}
                onReply={reportMode ? null : (readOnly ? null : () => setReplyTarget(m))}
                replyDisabled={readOnly || reportMode}
              >
                {renderBodyWithMentions(m.body, allMentionables)}
              </ChatMessage>
            );

            if (isHighlighted) {
              return (
                <div
                  key={m.id}
                  style={{ borderLeft: '3px solid var(--amber)', background: 'color-mix(in oklab, var(--amber) 7%, var(--surface)', paddingLeft: 6, position: 'relative' }}
                >
                  <div style={{ position: 'absolute', top: 6, right: 10, fontSize: 10, fontWeight: 600, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Icon name="flag" size={10}/> reported
                  </div>
                  {bubble}
                </div>
              );
            }

            if (!isReportable) return <div key={m.id}>{bubble}</div>;

            return (
              <div
                key={m.id}
                onClick={() => onToggleMessage && onToggleMessage(m.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, cursor: 'pointer', background: isSelected ? 'color-mix(in oklab, var(--amber) 8%, var(--surface))' : 'transparent', transition: 'background 0.12s' }}
              >
                <div
                  style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 999, border: `2px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`, background: isSelected ? 'var(--amber)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                >
                  {isSelected && <Icon name="check" size={11} style={{ color: 'white' }}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>{bubble}</div>
              </div>
            );
          })
        )}
      </div>

      {readOnly ? (
        <ChatNotice compact icon="lock">
          This chat is archived — the order is closed. The transcript is read-only.
        </ChatNotice>
      ) : (
        <ChatComposer
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onSend={onSend}
          placeholder={composerPlaceholder}
          sendLabel={currentRole === 'admin' ? 'Send as admin' : 'Senden'}
          mentionables={mentionables}
          quotedBlock={composerReplyPreview}
          onCancelReply={replyTarget ? clearReply : null}
          inputRef={composerRef}
        />
      )}
    </div>
  );
}

function roleChip(role) {
  if (role === 'customer') return 'customer';
  if (role === 'gw') return 'ghostwriter';
  if (role === 'admin') return 'admin';
  return null;
}

export { OrderChat };
