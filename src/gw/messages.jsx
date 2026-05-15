// GW · Messages — anonymized customer threads (admin always CC).

// ============ GW MESSAGES ============
import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, Avatar, NotReady, EmptyState, ChatNotice, ChatMessage, ChatComposer, ChatThreadRow } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

function GWMessages({ navigate }) {
  const [reply, setReply] = useStateA('');
  const allThreads = EFHooks.useThreads();
  // Only threads tied to my (Isabel's) assignments are visible.
  const myThreads = useMemoA(() => allThreads.filter(t => t.gwId === D.GW_ME.id), [allThreads]);
  const [activeId, setActiveId] = useStateA(myThreads[0]?.id || null);
  const active = myThreads.find(t => t.id === activeId) || myThreads[0] || null;

  // Mark as read when a thread is opened.
  useEffectA(() => {
    if (active?.id && (active.unread?.gw || 0) > 0) {
      EFActions.threads.markRead(active.id, 'gw');
    }
  }, [active?.id]);

  const onSend = () => {
    if (!active || !reply.trim()) return;
    const msg = EFActions.threads.send({
      threadId: active.id,
      orderId: active.orderId,
      role: 'gw',
      body: reply,
    });
    if (msg) {
      window.efToast && window.efToast({
        text: msg.autoflag === 'financial'
          ? 'Finanzbezug erkannt — Anfrage wurde an Kundenservice umgeleitet.'
          : `Nachricht an ${D.customer(active.customerId)?.name || 'Kunde'} gesendet · CC kundenservice@efactory1.de`,
        tone: msg.autoflag ? 'info' : 'success',
      });
      setReply('');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <div className="page-subtitle">Customer chats · one thread per assignment · efactory1 always in CC</div>
        </div>
      </div>

      <ChatNotice compact tone="warn">
        Auto-CC is enforced. Financial questions are redirected to <span className="mono">kundenservice@efactory1.de</span>; do not negotiate pricing or invoices in chat.
      </ChatNotice>

      <div className="chat-app-grid mt-3">
        <div className="chat-shell" style={{ minHeight: 620 }}>
          <div className="chat-header">
            <div className="chat-title">
              <div>
                <span className="chat-title-main">Active threads</span>
                <span className="chat-title-sub">{myThreads.length} assignments</span>
              </div>
            </div>
          </div>
          <div className="chat-thread-list">
            {myThreads.map(t => {
              const cust = D.customer(t.customerId);
              const lastMsg = t.messages?.[t.messages.length - 1];
              const previewText = lastMsg ? (lastMsg.body || '').slice(0, 110) : t.subject;
              const isFromGw = lastMsg?.from === 'gw';
              return (
                <ChatThreadRow
                  key={t.id}
                  active={active?.id === t.id}
                  unread={t.unread?.gw || 0}
                  initials={cust?.initials || '··'}
                  title={cust?.name || 'Customer'}
                  subtitle={`#${t.orderId} · ${t.subject}`}
                  preview={<>{isFromGw && 'You: '}{previewText}</>}
                  meta={U.relTime(t.lastAt)}
                  onClick={() => setActiveId(t.id)}
                  badges={t.flagged === 'financial' && <span className="pill pill-amber" style={{ fontSize: 10 }}><Icon name="alert-triangle" size={9}/> redirected</span>}
                />
              );
            })}
            {myThreads.length === 0 && <EmptyState compact icon="message-square" title="No active chats" body="Customer chat unlocks after assignment approval."/>}
          </div>
        </div>

        {active && (
          <div className="chat-shell chat-shell-soft">
            <div className="chat-header">
              <div className="chat-title">
                <Avatar initials={D.customer(active.customerId)?.initials || '··'} size={34} tone="blue"/>
                <div style={{ minWidth: 0 }}>
                  <span className="chat-title-main">{D.customer(active.customerId)?.name || 'Customer'}</span>
                  <span className="chat-title-sub">Order #{active.orderId} · {active.subject}</span>
                </div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => navigate('gw-assignment-detail', { id: active.orderId })}>
                <Icon name="external-link" size={12}/> Auftrag
              </button>
            </div>

            <ChatNotice compact>
              Files stay on-platform. Customer-visible attachments are sent through the document area and mirrored in chat.
            </ChatNotice>

            <div className="chat-stream">
              {(active.messages || []).length === 0 && (
                <EmptyState compact icon="message-square" title="Noch keine Nachrichten" body="Schreiben Sie unten den ersten Beitrag."/>
              )}
              {(active.messages || []).map((m, i) => {
                const mine = m.from === 'gw';
                const sys = m.from === 'system';
                const isAdmin = m.from === 'admin';
                const senderName = mine
                  ? D.GW_ME.name
                  : (m.from === 'customer'
                      ? (D.customer(active.customerId)?.name || 'Customer')
                      : (isAdmin ? 'efactory1' : 'System'));
                const senderInits = mine
                  ? D.GW_ME.initials
                  : (m.from === 'customer'
                      ? (D.customer(active.customerId)?.initials || '··')
                      : (isAdmin ? 'EF' : 'SY'));
                const prev = active.messages[i - 1];
                const grouped = !!prev && prev.from === m.from && !sys;
                return (
                  <ChatMessage
                    key={m.id}
                    mine={mine}
                    system={sys}
                    sender={senderName}
                    initials={senderInits}
                    at={m.at}
                    grouped={grouped}
                    attachments={m.attachments}
                    status={mine ? 'CC aktiv' : null}
                  >
                    {m.body}
                  </ChatMessage>
                );
              })}
            </div>

            <ChatComposer
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onSend={onSend}
              placeholder={`Reply to ${D.customer(active.customerId)?.name || 'customer'}...`}
              sendLabel="Send"
              actions={<NotReady className="chat-icon-action" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={15}/></NotReady>}
            />
          </div>
        )}
      </div>
    </div>
  );
}

window.GWMessages = GWMessages;
