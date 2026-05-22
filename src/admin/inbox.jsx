// Admin · Inbox — Berat's WhatsApp + Email aggregation surface.
//
// Per D-28 (docs/communication_architecture.md):
//   - Two raw channel streams, surfaced together. Nothing more.
//   - Conversations are CONTACT-keyed (customer | gw | lead).
//   - No order linkage on external messages — ever. The "Orders by this
//     contact" sidebar is navigation only, not a claim about what the
//     current conversation is about.
//   - Filter: All / Email / WhatsApp only. No Orders/Leads/GWs scope tabs.

import React, { useState, useEffect, useMemo } from 'react';
import { Icon, Avatar, EmptyState, ChatNotice, ChatMessage, EmailCard, MediumChip, ChatComposer, ChatThreadRow } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

function Inbox({ toast, route, navigate }) {
  const _toast = toast || (m => console.log(m));
  const contacts = EFHooks.useExternalContacts();

  // The URL is the single source of truth for both the medium filter and the
  // selected contact (Arch-04 — see order-detail.jsx). No local "remember
  // last contact" state: refresh, back, and shared links all resolve here.
  const medium = ['all', 'email', 'whatsapp'].includes(route?.params?.medium)
    ? route.params.medium
    : 'all';
  const routeContact = route?.params?.contact || null;

  // Medium filter keeps a contact visible if it has used that medium at any
  // point — not just on its most recent message.
  const visibleContacts = useMemo(() => {
    if (medium === 'all') return contacts;
    return contacts.filter(c => (c.mediums || []).includes(medium));
  }, [contacts, medium]);

  // Active contact resolves from the URL against the full contact set, so a
  // selected contact stays selected even when the medium filter hides it from
  // the list. Absent/stale param falls back to the first visible contact.
  const active = (routeContact && contacts.find(c => c.key === routeContact))
    || visibleContacts[0]
    || contacts[0]
    || null;

  // Push a URL update for selection / filter changes. Replace (not push) so
  // browsing the inbox doesn't flood history.
  const go = (patch) => navigate('inbox', {
    contact: patch.contact !== undefined ? patch.contact : active?.key,
    medium: patch.medium !== undefined ? patch.medium : medium,
  }, { replace: true });

  const allMessages = EFHooks.useContactMessages(active?.contactType, active?.contactId);

  // Apply the medium filter to the right-pane stream as well so the
  // chronological view feels consistent.
  const filteredMessages = useMemo(() => {
    if (medium === 'all') return allMessages;
    return allMessages.filter(m => m.medium === medium);
  }, [allMessages, medium]);

  // Mark this contact's inbound messages as read once they're opened.
  useEffect(() => {
    if (active?.contactType && active?.contactId && active.unread > 0) {
      EFActions.externalMessages.markContactRead(active.contactType, active.contactId);
    }
  }, [active?.key]);

  // Composer state. Default reply medium = the medium of the contact's
  // most recent inbound message (or fall back to lastMedium).
  const lastInbound = [...allMessages].reverse().find(m => m.direction === 'in');
  const defaultMedium = lastInbound?.medium || active?.lastMedium || 'email';
  const [replyMedium, setReplyMedium] = useState(defaultMedium);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');

  useEffect(() => {
    setReplyMedium(defaultMedium);
    setReplyBody('');
    setReplySubject('');
  }, [active?.key, defaultMedium]);

  const onSend = () => {
    if (!replyBody.trim()) {
      _toast({ text: 'Reply is empty.', tone: 'danger' });
      return;
    }
    const msg = EFActions.externalMessages.send({
      contactType: active.contactType,
      contactId: active.contactId,
      medium: replyMedium,
      direction: 'out',
      body: replyBody,
      subject: replyMedium === 'email' ? (replySubject.trim() || `Re: ${lastInbound?.subject || 'Anfrage'}`) : null,
    });
    if (msg) {
      _toast({ text: `Reply sent via ${replyMedium === 'whatsapp' ? 'WhatsApp' : 'Email'} to ${active.name}`, tone: 'success' });
      setReplyBody('');
      setReplySubject('');
    }
  };

  // Orders this contact has — pure navigation convenience, NOT a claim
  // that any external message is about any specific order.
  const contactOrders = useMemo(() => {
    if (!active) return [];
    if (active.contactType === 'customer') {
      return (D.ORDERS || []).filter(o => o.customerId === active.contactId);
    }
    if (active.contactType === 'gw') {
      return (D.ORDERS || []).filter(o => o.gwId === active.contactId);
    }
    return [];
  }, [active?.key]);

  const onJumpToOrder = (orderId) => {
    if (navigate) navigate('order-detail', { id: orderId, tab: 'communications' });
  };

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inbox</h1>
          <div className="page-subtitle">Berat's WhatsApp + Email · aggregated read/reply surface</div>
        </div>
      </div>
      <ChatNotice compact icon="info">
        This is an aggregation of Berat's real WhatsApp and Email. It does not own these messages — your phone and Gmail/Outlook stay the source of truth. External messages are never tagged to specific orders.
      </ChatNotice>

      <div className="chat-app-grid mt-3" style={{ height: 'calc(100vh - 240px)', minHeight: 620 }}>
        <div className="chat-shell">
          <div className="chat-header" style={{ padding: '8px 12px' }}>
            <div className="flex gap-1">
              {[
                ['all', 'All'],
                ['email', 'Email'],
                ['whatsapp', 'WhatsApp'],
              ].map(([id, label]) => (
                <button type="button" key={id} className={`chip ${medium === id ? 'active' : ''}`} onClick={() => go({ medium: id })}>
                  {id !== 'all' && <Icon name={id === 'email' ? 'mail' : 'message-circle'} size={11}/>} {label}
                </button>
              ))}
            </div>
          </div>
          <div className="chat-thread-list">
            {visibleContacts.length === 0 && (
              <div className="text-faint fs-12" style={{ padding: 16 }}>No conversations in this view.</div>
            )}
            {visibleContacts.map(c => (
              <ChatThreadRow
                key={c.key}
                active={active?.key === c.key}
                unread={c.unread}
                initials={c.initials}
                tone={c.contactType === 'lead' ? 'amber' : c.contactType === 'gw' ? 'slate' : 'blue'}
                title={c.name}
                subtitle={c.email || c.phone || (c.contactType === 'lead' ? 'Lead' : c.contactType === 'gw' ? 'Ghostwriter' : 'Customer')}
                preview={c.lastPreview}
                meta={U.relTime(c.lastAt)}
                onClick={() => go({ contact: c.key })}
                badges={<>
                  <MediumChip medium={c.lastMedium}/>
                  {c.contactType === 'lead' && <span className="pill pill-amber" style={{ fontSize: 10 }}>Lead</span>}
                  {c.contactType === 'gw' && <span className="pill pill-slate" style={{ fontSize: 10 }}>GW</span>}
                  {c.isB2B && <span className="pill pill-purple" style={{ fontSize: 10 }}>B2B</span>}
                </>}
              />
            ))}
          </div>
        </div>

        {!active ? (
          <div className="chat-shell chat-shell-soft">
            <EmptyState compact icon="inbox" title="Inbox empty" body="No external messages yet. WhatsApp and Email both ingest into this view."/>
          </div>
        ) : (
          <div className="chat-shell chat-shell-soft">
            <div className="chat-header">
              <div className="chat-title">
                <Avatar initials={active.initials} size={34} tone={active.contactType === 'lead' ? 'amber' : 'blue'}/>
                <div style={{ minWidth: 0 }}>
                  <span className="chat-title-main">{active.name}</span>
                  <span className="chat-title-sub">{[active.email, active.phone].filter(Boolean).join(' · ') || (active.contactType === 'lead' ? 'Lead contact' : '—')}</span>
                </div>
              </div>
              <div className="flex gap-1" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <MediumChip medium={active.lastMedium}/>
                {active.contactType === 'lead' && <span className="pill pill-amber" style={{ fontSize: 10 }}>Lead</span>}
                {active.contactType === 'gw' && <span className="pill pill-slate" style={{ fontSize: 10 }}>GW contact</span>}
              </div>
            </div>

            <div className="chat-stream">
              {filteredMessages.length === 0 ? (
                <EmptyState compact icon="message-square" title="No messages in this view" body={allMessages.length ? 'Switch back to All to see the full conversation.' : 'No messages yet.'}/>
              ) : (
                filteredMessages.map(m => {
                  const mine = m.direction === 'out';
                  if (m.medium === 'email') {
                    return (
                      <EmailCard
                        key={m.id}
                        message={{
                          subject: m.subject,
                          body: m.body,
                          at: m.at,
                          attachments: m.attachments || [],
                          to: mine ? [active.email || active.name] : ['berat@efactory1.de'],
                        }}
                        direction={mine ? 'outbound' : 'inbound'}
                        senderName={mine ? 'efactory1 (Berat)' : active.name}
                        initialExpanded
                      />
                    );
                  }
                  // WhatsApp → chat bubble
                  return (
                    <ChatMessage
                      key={m.id}
                      mine={mine}
                      sender={mine ? 'efactory1 (Berat)' : active.name}
                      initials={mine ? 'BÖ' : active.initials}
                      at={m.at}
                      attachments={m.attachments}
                      channel="WhatsApp"
                      tone={mine ? 'blue' : 'slate'}
                    >
                      {m.body}
                    </ChatMessage>
                  );
                })
              )}
            </div>

            <ChatComposer
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onSend={onSend}
              placeholder={`Reply to ${active.name} via ${replyMedium === 'whatsapp' ? 'WhatsApp' : 'Email'}...`}
              sendLabel={`Send via ${replyMedium === 'whatsapp' ? 'WhatsApp' : 'Email'}`}
              actions={<>
                <div className="flex gap-1">
                  {[['email', 'Email', 'mail'], ['whatsapp', 'WhatsApp', 'message-circle']].map(([id, label, icon]) => (
                    <button type="button" key={id} className={`chip ${replyMedium === id ? 'active' : ''}`} onClick={() => setReplyMedium(id)}>
                      <Icon name={icon} size={11}/> {label}
                    </button>
                  ))}
                </div>
              </>}
              helper={replyMedium === 'email' && (
                <input
                  className="input mb-2"
                  placeholder={`Subject (default: Re: ${lastInbound?.subject || 'Anfrage'})`}
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  style={{ fontSize: 12 }}
                />
              )}
            />
          </div>
        )}

        {/* Contact sidecar — navigation only. Lists orders this contact has,
            so Berat can jump into an order's chat. The platform makes no
            claim that the current conversation is about any of these orders. */}
        {active && (
          <div className="chat-shell">
            <div className="chat-header">
              <div className="chat-title-main flex items-center gap-2">
                <Icon name="user" size={14}/> {active.name}
              </div>
              {active.contactType === 'gw' && <span className="pill pill-slate" style={{ fontSize: 10 }}>GW</span>}
            </div>
            <div className="card-pad flex-col gap-3" style={{ flex: 1, overflowY: 'auto' }}>
              <div>
                <div className="fs-11 text-muted mb-1">Contact</div>
                <div className="fs-12">
                  {active.email && <div><Icon name="mail" size={11}/> {active.email}</div>}
                  {active.phone && <div className="mono"><Icon name="phone" size={11}/> {active.phone}</div>}
                  {active.isB2B && <div className="mt-1"><span className="pill pill-purple" style={{ fontSize: 10 }}>B2B</span></div>}
                </div>
              </div>
              {contactOrders.length > 0 && (
                <div>
                  <div className="fs-11 text-muted mb-1">
                    Orders by this contact
                  </div>
                  <div className="fs-10 text-faint mb-2" style={{ lineHeight: 1.4 }}>
                    Navigation only. External messages are <strong>not</strong> attributed to any order — clicking jumps you into that order's platform chat.
                  </div>
                  <div className="flex-col gap-1">
                    {contactOrders.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onJumpToOrder(o.id)}
                        style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      >
                        <Icon name="briefcase" size={11}/>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          #{o.id} · {(o.title || '').slice(0, 32)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ChatNotice compact icon="info">
                Reply medium defaults to the channel the contact last used. Override per message.
              </ChatNotice>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { Inbox };
