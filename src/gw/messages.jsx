// GW · Messages — inbox of all active order chats (platform 3-party threads).
//
// The same chat also appears on each assignment detail page for in-context work.
// This tab is the cross-order overview and notification landing surface.

import React, { useState, useEffect, useMemo } from 'react';
import { Icon, EmptyState, ChatNotice, GwOrderChatThreadRow } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import * as EFSelectors from '../core/selectors.js';
import store from '../core/store.js';
import EF from '../core/ef.js';
import { OrderChat } from '../shared/order-chat.jsx';

const D = EF;

function orderChatSearchHaystack(entry, cust) {
  const { order, chat } = entry;
  const lastMsg = [...(chat.messages || [])].reverse().find(m => m.authorRole !== 'system');
  return [
    order.id,
    order.title,
    cust?.name,
    cust?.email,
    lastMsg?.body,
    lastMsg?.authorRole === 'gw' ? 'you' : lastMsg?.authorRole === 'admin' ? 'berat' : cust?.name?.split(/\s+/)[0],
  ].filter(Boolean).join(' ').toLowerCase();
}

function GWMessages({ navigate, initialOrderId, toast }) {
  EFHooks.useStore(s => s.meta.version);
  const myId = D.GW_ME.id;
  const myOrders = EFHooks.useOrders({ gwId: myId });
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState('all');

  const orderChats = useMemo(() => {
    const state = store.getState();
    return myOrders
      .map(o => ({
        order: o,
        chat: EFSelectors.selectOrderChat(state, o.id),
      }))
      .filter(({ chat }) => chat)
      .sort((a, b) => {
        const aAt = a.chat.messages?.slice(-1)[0]?.at || a.chat.openedAt;
        const bAt = b.chat.messages?.slice(-1)[0]?.at || b.chat.openedAt;
        return new Date(bAt) - new Date(aAt);
      });
  }, [myOrders.map(o => o.id).join(','), store.getState().meta.version]);

  const searchNorm = searchQuery.trim().toLowerCase();

  const filteredOrderChats = useMemo(() => orderChats.filter(entry => {
    if (readFilter === 'unread' && !(entry.chat.unread?.gw > 0)) return false;
    if (!searchNorm) return true;
    const cust = D.customer(entry.order.customerId);
    return orderChatSearchHaystack(entry, cust).includes(searchNorm);
  }), [orderChats, readFilter, searchNorm]);

  const unreadChatCount = useMemo(
    () => orderChats.filter(e => (e.chat.unread?.gw || 0) > 0).length,
    [orderChats],
  );

  const [activeOrderId, setActiveOrderId] = useState(
    initialOrderId != null ? Number(initialOrderId) : (orderChats[0]?.order.id || null),
  );
  const activeEntry = filteredOrderChats.find(e => e.order.id === activeOrderId)
    || filteredOrderChats[0]
    || null;

  useEffect(() => {
    if (!activeOrderId && filteredOrderChats[0]) setActiveOrderId(filteredOrderChats[0].order.id);
  }, [filteredOrderChats.length]);

  useEffect(() => {
    if (initialOrderId != null) setActiveOrderId(Number(initialOrderId));
  }, [initialOrderId]);

  useEffect(() => {
    if (!filteredOrderChats.length) return;
    if (!filteredOrderChats.some(e => e.order.id === activeOrderId)) {
      setActiveOrderId(filteredOrderChats[0].order.id);
    }
  }, [filteredOrderChats, activeOrderId]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <div className="page-subtitle">
            All order chats in one place · same threads as on each assignment · Berat in every thread
          </div>
        </div>
      </div>

      <ChatNotice compact icon="users">
        Each order has one platform chat (you, the customer, Berat). You can also reply from the assignment page without leaving the job context.
      </ChatNotice>

      <div className="chat-app-grid mt-3" style={{ height: 'calc(100vh - 240px)', minHeight: 560 }}>
        <div className="chat-shell">
          <div className="chat-header inbox-sidebar-head">
            <div className="chat-title" style={{ marginBottom: 2 }}>
              <div>
                <span className="chat-title-main">Active orders</span>
                <span className="chat-title-sub">
                  {filteredOrderChats.length === orderChats.length
                    ? `${orderChats.length} chat${orderChats.length === 1 ? '' : 's'}`
                    : `${filteredOrderChats.length} of ${orderChats.length}`}
                </span>
              </div>
            </div>
            <div className="topbar-search inbox-sidebar-search">
              <Icon name="search" size={14} className="text-faint topbar-search-icon" aria-hidden="true"/>
              <input
                type="search"
                placeholder="Search orders, customers, messages…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search order chats"
              />
            </div>
            <div className="inbox-read-filter flex gap-1">
              {[
                ['all', 'All'],
                ['unread', 'Unread', unreadChatCount],
              ].map(([id, label, count]) => (
                <button
                  type="button"
                  key={id}
                  className={`chip ${readFilter === id ? 'active' : ''}`}
                  onClick={() => setReadFilter(id)}
                >
                  {label}
                  {id === 'unread' && count > 0 && (
                    <span className="inbox-read-filter-count">{count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="chat-thread-list">
            {orderChats.length === 0 && (
              <EmptyState compact icon="message-square" title="No active chats" body="Customer chat unlocks after assignment approval."/>
            )}
            {orderChats.length > 0 && filteredOrderChats.length === 0 && (
              <div className="text-faint fs-12 inbox-sidebar-empty">
                {searchNorm
                  ? 'No chats match your search.'
                  : 'No unread chats.'}
              </div>
            )}
            {filteredOrderChats.map(({ order: o, chat }) => {
              const cust = D.customer(o.customerId);
              const lastMsg = [...(chat.messages || [])].reverse().find(m => m.authorRole !== 'system');
              const previewSnippet = lastMsg ? (lastMsg.body || '').replace(/\s+/g, ' ').trim().slice(0, 100) : null;
              const previewSender = !lastMsg
                ? null
                : lastMsg.authorRole === 'gw'
                  ? 'You'
                  : lastMsg.authorRole === 'admin'
                    ? 'Berat'
                    : (cust?.name?.split(/\s+/)[0] || 'Customer');
              return (
                <GwOrderChatThreadRow
                  key={o.id}
                  active={activeEntry?.order.id === o.id}
                  unread={chat.unread?.gw || 0}
                  initials={cust?.initials || '··'}
                  orderId={o.id}
                  orderTitle={o.title || 'Untitled order'}
                  previewSender={previewSender}
                  previewSnippet={previewSnippet}
                  onClick={() => setActiveOrderId(o.id)}
                />
              );
            })}
          </div>
        </div>

        {activeEntry ? (
          <div className="chat-pane-right">
            <OrderChat orderId={activeEntry.order.id} currentRole="gw" toast={toast} fillHeight/>
            <div className="chat-pane-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => navigate('gw-assignment-detail', { id: activeEntry.order.id })}
              >
                <Icon name="external-link" size={12}/> Open assignment
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-shell chat-shell-soft chat-pane-empty">
            <EmptyState compact icon="message-square" title="Select a chat" body="Pick an order on the left, or open an assignment to chat in context."/>
          </div>
        )}
      </div>
    </div>
  );
}

export { GWMessages };
