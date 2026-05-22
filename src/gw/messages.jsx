// GW · Messages — list of the GW's active order chats.
//
// Per D-28: GW only ever sees ORDER chats (per-order, platform-owned). The
// admin's external WhatsApp/Email inbox is admin-only.

import React, { useState, useEffect, useMemo } from 'react';
import { Icon, Avatar, EmptyState, ChatNotice, ChatThreadRow } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import * as EFSelectors from '../core/selectors.js';
import store from '../core/store.js';
import EF from '../core/ef.js';
import { OrderChat } from '../shared/order-chat.jsx';
const D = EF;

function GWMessages({ navigate, initialOrderId }) {
  // Re-render on store version bumps so new messages appear immediately.
  EFHooks.useStore(s => s.meta.version);
  const myId = D.GW_ME.id;
  const myOrders = EFHooks.useOrders({ gwId: myId });

  const orderChats = useMemo(() => {
    const state = store.getState();
    return myOrders
      .map(o => ({
        order: o,
        chat: EFSelectors.selectOrderChat(state, o.id),
      }))
      .filter(({ chat }) => chat) // only orders with an actual chat
      .sort((a, b) => {
        const aAt = a.chat.messages?.slice(-1)[0]?.at || a.chat.openedAt;
        const bAt = b.chat.messages?.slice(-1)[0]?.at || b.chat.openedAt;
        return new Date(bAt) - new Date(aAt);
      });
  }, [myOrders.map(o => o.id).join(','), store.getState().meta.version]);

  const [activeOrderId, setActiveOrderId] = useState(
    initialOrderId != null ? Number(initialOrderId) : (orderChats[0]?.order.id || null)
  );
  const activeEntry = orderChats.find(e => e.order.id === activeOrderId) || orderChats[0] || null;

  useEffect(() => {
    if (!activeOrderId && orderChats[0]) setActiveOrderId(orderChats[0].order.id);
  }, [orderChats.length]);

  // A notification deep-link (gw-messages?orderId=…) selects that chat.
  useEffect(() => {
    if (initialOrderId != null) setActiveOrderId(Number(initialOrderId));
  }, [initialOrderId]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <div className="page-subtitle">Customer chats · one thread per assignment · Berat (admin) is in every thread</div>
        </div>
      </div>

      <ChatNotice compact icon="users">
        Each order chat has three participants: you, the customer, and Berat (admin). All three see every message.
      </ChatNotice>

      <div className="chat-app-grid mt-3">
        <div className="chat-shell" style={{ minHeight: 620 }}>
          <div className="chat-header">
            <div className="chat-title">
              <div>
                <span className="chat-title-main">Active orders</span>
                <span className="chat-title-sub">{orderChats.length} chat{orderChats.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
          <div className="chat-thread-list">
            {orderChats.length === 0 && <EmptyState compact icon="message-square" title="No active chats" body="Customer chat unlocks after assignment approval."/>}
            {orderChats.map(({ order: o, chat }) => {
              const cust = D.customer(o.customerId);
              const lastMsg = chat.messages?.[chat.messages.length - 1];
              const previewText = lastMsg ? (lastMsg.body || '').slice(0, 110) : 'Auftragschat öffnen…';
              const isMine = lastMsg?.authorRole === 'gw';
              const fromLabel = lastMsg?.authorRole === 'admin' ? 'Berat: ' : isMine ? 'You: ' : '';
              return (
                <ChatThreadRow
                  key={o.id}
                  active={activeEntry?.order.id === o.id}
                  unread={chat.unread?.gw || 0}
                  initials={cust?.initials || '··'}
                  title={cust?.name || 'Customer'}
                  subtitle={`#${o.id} · ${o.title?.slice(0, 50) || ''}`}
                  preview={<>{fromLabel}{previewText}</>}
                  meta={U.relTime(lastMsg?.at || chat.openedAt)}
                  onClick={() => setActiveOrderId(o.id)}
                />
              );
            })}
          </div>
        </div>

        {activeEntry && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <OrderChat orderId={activeEntry.order.id} currentRole="gw"/>
            <div className="flex gap-2 mt-2">
              <button type="button" className="btn btn-sm" onClick={() => navigate('gw-assignment-detail', { id: activeEntry.order.id })}>
                <Icon name="external-link" size={12}/> Open assignment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { GWMessages };
