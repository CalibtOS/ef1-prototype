// OrderChat — the platform-owned 3-party chat for a single order.
//
// Shared by admin (order-detail Communications tab), customer (order view),
// and ghostwriter (assignment-detail + messages list). Same entity, three
// camera angles.
//
// Gated on paid + GW assigned (see comms.orderChatLockReason). When locked,
// renders a soft "not yet" panel. When open, renders the 3-party thread.
//
// The admin is an explicit participant, not a hidden observer. Messages
// carry an `authorRole` ('customer' | 'gw' | 'admin') and the UI renders
// the role badge alongside the sender name so every participant sees who
// is who.

import React, { useState, useEffect, useMemo } from 'react';
import { Icon, Avatar, ChatMessage, ChatComposer, ChatNotice, EmptyState } from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
import { isOrderChatOpen, isOrderChatArchived, orderChatLockReason, isOrderPaid } from '../core/comms.js';

const D = EF;

function OrderChat({ orderId, currentRole = 'admin', toast }) {
  const order = EFHooks.useOrder(orderId);
  const chat = EFHooks.useOrderChat(orderId);
  const cust = order ? D.customer(order.customerId) : null;
  const gw = order?.gwId ? D.gw(order.gwId) : null;

  const archived = isOrderChatArchived(order, chat);
  const open = isOrderChatOpen(order, chat);
  const lockReason = orderChatLockReason(order, chat);

  // Mark chat read once viewed (per current role). Archived chats still get
  // marked read — the transcript is viewable even though it is frozen.
  useEffect(() => {
    if (chat?.id && (chat.unread?.[currentRole] || 0) > 0) {
      EFActions.orderChats.markRead(orderId, currentRole);
    }
  }, [chat?.id, currentRole]);

  if (!order) {
    return (
      <div className="chat-shell chat-shell-soft">
        <div className="card-pad text-muted">Order not found.</div>
      </div>
    );
  }

  // Archived: the order is closed. Render the frozen transcript read-only.
  if (archived) {
    return (
      <OrderChatLive
        order={order} chat={chat} cust={cust} gw={gw}
        currentRole={currentRole} toast={toast} readOnly
      />
    );
  }

  if (!open) {
    return <OrderChatLocked order={order} lockReason={lockReason} currentRole={currentRole}/>;
  }

  return (
    <OrderChatLive
      order={order}
      chat={chat}
      cust={cust}
      gw={gw}
      currentRole={currentRole}
      toast={toast}
    />
  );
}

// ---------------------------------------------------------------------------

function OrderChatLocked({ order, lockReason, currentRole }) {
  const paid = isOrderPaid(order);
  const assigned = !!order.gwId;
  const adminCopy = currentRole === 'admin'
    ? 'Until then, customer questions about this order land in your Inbox (WhatsApp/Email) — same as any other external comms.'
    : null;
  const customerCopy = currentRole === 'customer'
    ? 'Bei Fragen erreichen Sie uns weiterhin per E-Mail oder WhatsApp.'
    : null;
  const gwCopy = currentRole === 'gw'
    ? 'Kundenchat öffnet sich automatisch, sobald die Zuweisung bestätigt ist.'
    : null;
  return (
    <div className="chat-shell chat-shell-soft" style={{ minHeight: 360 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div className="chat-lock-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 999, background: 'var(--surface-2)', marginBottom: 14 }}>
            <Icon name="lock" size={22}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {currentRole === 'customer' ? 'Auftragschat noch nicht aktiv' : currentRole === 'gw' ? 'Customer chat not started yet' : 'Order chat not started yet'}
          </div>
          <div className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {lockReason || 'Opens once payment lands and a ghostwriter is assigned.'}
          </div>
          <div className="flex" style={{ gap: 16, justifyContent: 'center', fontSize: 12, marginBottom: 14 }}>
            <span className={paid ? 'text-success' : 'text-faint'}>
              <Icon name={paid ? 'check-circle' : 'circle'} size={13}/> {paid ? 'Payment received' : 'Payment pending'}
            </span>
            <span className={assigned ? 'text-success' : 'text-faint'}>
              <Icon name={assigned ? 'check-circle' : 'circle'} size={13}/> {assigned ? 'Ghostwriter assigned' : 'No ghostwriter yet'}
            </span>
          </div>
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

// ---------------------------------------------------------------------------

function OrderChatLive({ order, chat, cust, gw, currentRole, toast, readOnly = false }) {
  const [body, setBody] = useState('');
  const messages = useMemo(() => (chat?.messages || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at)), [chat?.messages]);

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

  // Resolve sender identity from the message's OWN authorId, not the order's
  // current gwId. A reassigned order keeps the prior GW's messages attributed
  // to that GW — the transcript stays historically accurate.
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

  const onSend = () => {
    if (!body.trim()) return;
    const msg = EFActions.orderChats.send({
      orderId: order.id,
      role: currentRole,
      body,
    });
    if (msg) {
      toast && toast({ tone: 'success', text: `Nachricht gesendet · #${order.id}` });
      setBody('');
    }
  };

  const composerPlaceholder = currentRole === 'customer'
    ? `Nachricht im Auftragschat...`
    : currentRole === 'gw'
      ? `Nachricht an ${cust?.name || 'Kunde'} (Berat liest mit)...`
      : `Posting as Berat (admin) in order #${order.id}...`;

  return (
    <div className="chat-shell chat-shell-soft">
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

      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
        {participantBlock}
      </div>

      <ChatNotice compact icon="info">
        {currentRole === 'admin'
          ? 'You are a visible participant in this thread. Customer and GW both see your messages.'
          : currentRole === 'customer'
            ? 'Berat (efactory1) liest jeden Beitrag und kann jederzeit einschreiten.'
            : 'Berat (admin) is in this thread and sees every message.'}
      </ChatNotice>

      <div className="chat-stream">
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
            return (
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
              >
                {m.body}
              </ChatMessage>
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
          actions={null}
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
