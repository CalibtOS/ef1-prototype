// Admin · Inbox — Berat's WhatsApp + Email aggregation surface.
//
// Per D-28 (docs/communication_architecture.md):
//   - Two raw channel streams, surfaced together. Nothing more.
//   - Conversations are CONTACT-keyed (customer | gw | lead).
//   - No order linkage on external messages — ever.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Icon, Avatar, EmptyState, ChatNotice, ChatMessage, EmailCard, EmailReplyComposer,
  InternalCommentBar, InternalCommentNote, ChatComposer, InboxThreadRow, RegisteredContactBadge,
} from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import { INBOX_TEAMMATES, inboxInternalNotes } from '../core/comms.js';
import {
  inboundContextForReply,
  replySubjectFromTarget,
  buildQuotedMessageSnapshot,
  SUPPORT_INBOX,
  SYSTEM_NOTIFICATION_SENDER,
  isSystemInboxNotification,
} from '../core/external-message-threading.js';
import { InboxContactInfoPanel } from '../components/InboxContactInfoPanel.jsx';

function ContactInfoButton({ open, onClick }) {
  return (
    <button
      type="button"
      className={`inbox-contact-info-btn ${open ? 'is-active' : ''}`}
      onClick={onClick}
      aria-expanded={open}
      aria-label="Contact info"
      title="Contact info"
    >
      <Icon name="info" size={17}/>
    </button>
  );
}

function isRegisteredContact(contactType) {
  return contactType === 'customer' || contactType === 'gw';
}

function inboxListTitle(contact, isWhatsApp, channelNameByKey) {
  if (!isWhatsApp) {
    if (contact.lastIsSystemNotification) return SYSTEM_NOTIFICATION_SENDER.name;
    return contact.name;
  }
  const channelName = channelNameByKey?.get(contact.key);
  if (isRegisteredContact(contact.contactType)) {
    return channelName || contact.phone || 'Contact';
  }
  return contact.phone || contact.name || 'Contact';
}

function channelNameForContact(messages = []) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.direction === 'in' && m.from?.name?.trim()) {
      return m.from.name.trim();
    }
  }
  return null;
}

function contactSearchHaystack(contact, messagesForContact = []) {
  const parts = [
    contact.name,
    contact.email,
    contact.phone,
    contact.lastSubject,
    contact.lastPreview,
  ];
  messagesForContact.forEach(m => {
    parts.push(m.body, m.subject);
  });
  return parts.filter(Boolean).join('\n').toLowerCase();
}

function orderIdFromMentionMessage(message) {
  if (message?.relatedOrderId != null) return Number(message.relatedOrderId);
  const match = String(message?.subject || message?.body || '').match(/#(\d+)\b/);
  return match ? Number(match[1]) : null;
}

function buildEmailDraft(contactName, inboundBody) {
  const first = (contactName || 'there').split(/\s+/)[0];
  if (!inboundBody) {
    return `Hallo ${first},\n\nvielen Dank für Ihre Nachricht.\n\nFreundliche Grüße\nBerat`;
  }
  const short = inboundBody.length < 120;
  const ack = short
    ? 'Zu Ihrer Anfrage: Ich prüfe das und melde mich in Kürze bei Ihnen.'
    : 'Ich habe Ihr Anliegen zur Kenntnis genommen und melde mich zeitnah mit den nächsten Schritten.';
  return `Hallo ${first},\n\nvielen Dank für Ihre Nachricht. ${ack}\n\nFreundliche Grüße\nBerat`;
}

function Inbox({ toast, route, navigate }) {
  const _toast = toast || (m => console.log(m));
  const contacts = EFHooks.useExternalContacts();
  const allExternalMessages = EFHooks.useAllExternalMessages();
  const replyComposerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState('all');

  const medium = ['all', 'email', 'whatsapp'].includes(route?.params?.medium)
    ? route.params.medium
    : 'all';
  const routeContact = route?.params?.contact || null;

  const visibleContacts = useMemo(() => {
    if (medium === 'all') return contacts;
    return contacts.filter(c => (c.mediums || []).includes(medium));
  }, [contacts, medium]);

  const messagesByContactKey = useMemo(() => {
    const map = new Map();
    allExternalMessages.forEach(m => {
      const key = `${m.contactType}:${m.contactId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return map;
  }, [allExternalMessages]);

  const channelNameByContactKey = useMemo(() => {
    const map = new Map();
    const sorted = [...allExternalMessages].sort((a, b) => new Date(a.at) - new Date(b.at));
    sorted.forEach(m => {
      if (m.direction === 'in' && m.from?.name?.trim()) {
        map.set(`${m.contactType}:${m.contactId}`, m.from.name.trim());
      }
    });
    return map;
  }, [allExternalMessages]);

  const searchNorm = searchQuery.trim().toLowerCase();

  const filteredContacts = useMemo(() => {
    let list = visibleContacts;
    if (readFilter === 'unread') {
      list = list.filter(c => c.unread > 0);
    }
    if (searchNorm) {
      list = list.filter(c => {
        const msgs = messagesByContactKey.get(c.key) || [];
        const scoped = medium === 'all' ? msgs : msgs.filter(m => m.medium === medium);
        return contactSearchHaystack(c, scoped).includes(searchNorm);
      });
    }
    return list;
  }, [visibleContacts, readFilter, searchNorm, messagesByContactKey, medium]);

  const unreadInViewCount = useMemo(
    () => visibleContacts.filter(c => c.unread > 0).length,
    [visibleContacts],
  );

  const active = (routeContact && contacts.find(c => c.key === routeContact))
    || filteredContacts[0]
    || visibleContacts[0]
    || contacts[0]
    || null;

  const go = (patch) => navigate('inbox', {
    contact: patch.contact !== undefined ? patch.contact : active?.key,
    medium: patch.medium !== undefined ? patch.medium : medium,
  }, { replace: true });

  const allMessages = EFHooks.useContactMessages(active?.contactType, active?.contactId);
  const internalNotes = EFHooks.useContactInternalNotes(active?.contactType, active?.contactId);

  const filteredMessages = useMemo(() => {
    if (medium === 'all') return allMessages;
    return allMessages.filter(m => m.medium === medium);
  }, [allMessages, medium]);

  const hasEmailInView = filteredMessages.some(m => m.medium === 'email');
  // All + email: email thread view only — never mix WhatsApp bubbles into the email stream.
  const emailOnlyStream = medium === 'all' && hasEmailInView;
  const streamMessages = useMemo(() => {
    if (emailOnlyStream) return filteredMessages.filter(m => m.medium === 'email');
    return filteredMessages;
  }, [filteredMessages, emailOnlyStream]);

  // Internal notes sit on the same timeline as external messages (sorted by `at`).
  const threadTimeline = useMemo(() => {
    const items = [
      ...streamMessages.map(m => ({ kind: 'message', at: m.at, id: m.id, data: m })),
      ...internalNotes.map(n => ({ kind: 'internal', at: n.at, id: n.id, data: n })),
    ];
    return items.sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [streamMessages, internalNotes]);

  const showEmailThreadHero = medium !== 'whatsapp' && hasEmailInView;
  const showInternalPanel = hasEmailInView || showEmailThreadHero;

  const contactTone = !active
    ? 'blue'
    : active.contactType === 'lead'
      ? 'amber'
      : active.contactType === 'gw'
        ? 'slate'
        : 'blue';

  const showWhatsAppContactHeader = !!active && !emailOnlyStream && (
    medium === 'whatsapp' ||
    (medium === 'all' && filteredMessages.length > 0 && !hasEmailInView)
  );

  const waRegistered = active && isRegisteredContact(active.contactType);
  const activeChannelName = active
    ? (channelNameByContactKey.get(active.key) || channelNameForContact(allMessages))
    : null;
  const whatsAppHeaderTitle = waRegistered
    ? (activeChannelName || active.phone || 'WhatsApp')
    : (active.phone || active.name || 'WhatsApp');
  const whatsAppSenderLabel = activeChannelName || active?.phone || active?.name || 'Contact';

  const emailThreadSubject = useMemo(() => {
    if (!active) return '';
    const lastEmail = [...streamMessages].reverse().find(m => m.medium === 'email');
    if (lastEmail?.subject) return lastEmail.subject;
    if (active.lastSubject) return active.lastSubject;
    return '(no subject)';
  }, [active, streamMessages]);

  const lastInbound = useMemo(() => {
    if (medium === 'email' || emailOnlyStream) {
      return [...allMessages].reverse().find(m => m.direction === 'in' && m.medium === 'email');
    }
    return [...allMessages].reverse().find(m => m.direction === 'in');
  }, [allMessages, medium, emailOnlyStream]);
  const showSystemContactInfo = isSystemInboxNotification(lastInbound);
  const channelDisplayName = showSystemContactInfo
    ? SYSTEM_NOTIFICATION_SENDER.name
    : (activeChannelName || lastInbound?.from?.name?.trim() || null);
  const channelNameLabel = lastInbound?.medium === 'whatsapp'
    ? 'WhatsApp name'
    : lastInbound?.medium === 'email'
      ? 'Email display name'
      : 'Channel name';
  const defaultMedium = lastInbound?.medium || active?.lastMedium || 'email';

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyMedium, setReplyMedium] = useState(defaultMedium);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [internalBody, setInternalBody] = useState('');
  const [contactInfoOpen, setContactInfoOpen] = useState(false);

  const contactEntity = EFHooks.useContactEntity(active?.contactType, active?.contactId);
  const allOrders = EFHooks.useOrders();
  const contactOrders = useMemo(() => {
    if (!active) return [];
    if (active.contactType === 'customer') {
      return allOrders.filter(o => o.customerId === active.contactId);
    }
    if (active.contactType === 'gw') {
      return allOrders.filter(o => o.gwId === active.contactId);
    }
    return [];
  }, [allOrders, active]);

  const showWhatsAppComposer = !replyOpen && !emailOnlyStream && (
    medium === 'whatsapp' || (medium === 'all' && !hasEmailInView)
  );

  const messagesById = useMemo(() => {
    const map = {};
    allMessages.forEach(m => { map[m.id] = m; });
    return map;
  }, [allMessages]);

  const draftQuotedSnapshot = useMemo(() => {
    if (!replyTarget) return null;
    return buildQuotedMessageSnapshot(replyTarget);
  }, [replyTarget]);

  const startEmailReply = (msg) => {
    const subj = msg?.subject || emailThreadSubject;
    setReplyMedium('email');
    setReplySubject(subj && !/^re:/i.test(subj) ? `Re: ${subj}` : subj);
    setReplyTarget(msg || lastInbound || null);
    setReplyBody('');
    setReplyOpen(true);
  };

  const closeReply = () => {
    setReplyOpen(false);
    setReplyTarget(null);
    setReplyBody('');
  };

  useEffect(() => {
    if (active?.contactType && active?.contactId && active.unread > 0) {
      EFActions.externalMessages.markContactRead(active.contactType, active.contactId);
    }
  }, [active?.key]);

  useEffect(() => {
    setReplyMedium(defaultMedium);
    setReplyBody('');
    setReplySubject('');
    setReplyOpen(false);
    setReplyTarget(null);
    setInternalBody('');
    setContactInfoOpen(false);
  }, [active?.key, defaultMedium]);

  useEffect(() => {
    if (!replyOpen) return;
    const scrollToReply = () => {
      replyComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };
    requestAnimationFrame(() => requestAnimationFrame(scrollToReply));
  }, [replyOpen, active?.key, threadTimeline.length]);

  const resolveEmailReplySubject = () => {
    if (replySubject.trim()) return replySubject.trim();
    return replySubjectFromTarget(replyTarget, emailThreadSubject);
  };

  const generateEmailDraft = () => {
    const inbound = inboundContextForReply(replyTarget, allMessages);
    return buildEmailDraft(active?.name, inbound?.body);
  };

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
      subject: replyMedium === 'email' ? resolveEmailReplySubject() : null,
      parentMessageId: replyTarget?.id || null,
      quotedMessageSnapshot: draftQuotedSnapshot,
    });
    if (msg) {
      const via = replyMedium === 'whatsapp' ? 'WhatsApp' : 'Email';
      _toast({ text: `Reply sent via ${via} to ${active.name}`, tone: 'success' });
      closeReply();
    }
  };

  const onPostInternalNote = () => {
    if (!internalBody.trim()) return;
    const note = EFActions.inboxInternalNotes.add({
      contactType: active.contactType,
      contactId: active.contactId,
      body: internalBody,
    });
    if (note) {
      setInternalBody('');
      _toast({ text: 'Internal comment added for teammates.', tone: 'success' });
    }
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

      <div
        className={`chat-app-grid mt-3 ${contactInfoOpen && active ? 'with-side' : ''}`}
        style={{ height: 'calc(100vh - 240px)', minHeight: 620 }}
      >
        <div className="chat-shell">
          <div className="chat-header inbox-sidebar-head">
            <div className="inbox-medium-chips flex gap-1">
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
            <div className="topbar-search inbox-sidebar-search">
              <Icon name="search" size={14} className="text-faint topbar-search-icon" aria-hidden="true"/>
              <input
                type="search"
                placeholder="Search messages, subjects, contacts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search inbox"
              />
            </div>
            <div className="inbox-read-filter flex gap-1">
              {[
                ['all', 'All'],
                ['unread', 'Unread', unreadInViewCount],
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
            {visibleContacts.length === 0 && (
              <div className="text-faint fs-12" style={{ padding: 16 }}>No conversations in this view.</div>
            )}
            {visibleContacts.length > 0 && filteredContacts.length === 0 && (
              <div className="text-faint fs-12 inbox-sidebar-empty">
                {searchNorm
                  ? 'No conversations match your search.'
                  : 'No unread conversations in this view.'}
              </div>
            )}
            {filteredContacts.map(c => {
              const contactMsgs = messagesByContactKey.get(c.key) || [];
              const lastEmailMsg = [...contactMsgs]
                .sort((a, b) => new Date(b.at) - new Date(a.at))
                .find(m => m.medium === 'email');
              const emailSystemRow = lastEmailMsg && isSystemInboxNotification(lastEmailMsg);
              const rowMedium = emailSystemRow ? 'email' : (medium === 'all' ? c.lastMedium : medium);
              const isWhatsApp = !emailSystemRow && rowMedium === 'whatsapp';
              const systemRow = emailSystemRow;
              return (
                <InboxThreadRow
                  key={c.key}
                  active={active?.key === c.key}
                  unread={c.unread}
                  initials={systemRow ? 'SU' : c.initials}
                  tone={systemRow ? 'slate' : (c.contactType === 'lead' ? 'amber' : c.contactType === 'gw' ? 'slate' : 'blue')}
                  contactType={systemRow ? null : c.contactType}
                  medium={isWhatsApp ? 'whatsapp' : 'email'}
                  title={systemRow ? SYSTEM_NOTIFICATION_SENDER.name : inboxListTitle(c, isWhatsApp, channelNameByContactKey)}
                  subject={!isWhatsApp ? (c.lastSubject || '(no subject)') : null}
                  preview={c.lastPreview}
                  youReplied={c.lastDirection === 'out'}
                  meta={U.fmtInboxTime(c.lastAt)}
                  onClick={() => go({ contact: c.key })}
                />
              );
            })}
          </div>
        </div>

        {!active ? (
          <div className="chat-shell chat-shell-soft">
            <EmptyState compact icon="inbox" title="Inbox empty" body="No external messages yet. WhatsApp and Email both ingest into this view."/>
          </div>
        ) : (
          <div className="chat-shell chat-shell-soft">
            {showEmailThreadHero && (
              <div className="email-thread-hero">
                <div className="email-thread-hero-head email-thread-hero-head--subject">
                  <h2 className="email-thread-subject">{emailThreadSubject}</h2>
                  <ContactInfoButton
                    open={contactInfoOpen}
                    onClick={() => setContactInfoOpen(v => !v)}
                  />
                </div>
              </div>
            )}

            {showWhatsAppContactHeader && (
              <div className="chat-header inbox-wa-contact-header">
                <div className="chat-title">
                  <span className="inbox-wa-contact-avatar-wrap">
                    <Avatar initials={active.initials} size={40} tone={contactTone}/>
                    <span className="inbox-thread-medium-badge inbox-thread-medium-badge-whatsapp" aria-hidden="true">
                      <Icon name="message-circle" size={9}/>
                    </span>
                  </span>
                  <div className="inbox-wa-contact-titles">
                    <span className="chat-title-main-wrap">
                      <span className="chat-title-main">{whatsAppHeaderTitle}</span>
                      <RegisteredContactBadge contactType={active.contactType} size={15}/>
                    </span>
                  </div>
                </div>
                <ContactInfoButton
                  open={contactInfoOpen}
                  onClick={() => setContactInfoOpen(v => !v)}
                />
              </div>
            )}

            <div className="chat-stream">
              {threadTimeline.length === 0 ? (
                <EmptyState compact icon="message-square" title="No messages in this view" body={allMessages.length ? 'Switch back to All to see the full conversation.' : 'No messages yet.'}/>
              ) : (
                threadTimeline.map(item => {
                  if (item.kind === 'internal') {
                    return (
                      <InternalCommentNote
                        key={item.id}
                        note={item.data}
                        teammates={INBOX_TEAMMATES}
                        inStream
                      />
                    );
                  }
                  const m = item.data;
                  const mine = m.direction === 'out';
                  const systemMsg = isSystemInboxNotification(m);
                  if (m.medium === 'email') {
                    const orderId = systemMsg ? orderIdFromMentionMessage(m) : null;
                    return (
                      <EmailCard
                        key={m.id}
                        message={m}
                        contactInitials={systemMsg ? 'SU' : active.initials}
                        contactTone={systemMsg ? 'slate' : contactTone}
                        contactType={systemMsg ? null : active.contactType}
                        onReply={systemMsg ? undefined : () => startEmailReply(m)}
                        onOpenOrder={orderId
                          ? () => navigate('order-detail', { id: orderId, tab: 'communications' })
                          : undefined}
                        openOrderLabel={orderId ? `Open order #${orderId}` : 'Open order'}
                      />
                    );
                  }
                  return (
                    <ChatMessage
                      key={m.id}
                      mine={mine}
                      sender={mine ? 'efactory1 (Berat)' : (m.medium === 'whatsapp' ? whatsAppSenderLabel : active.name)}
                      initials={mine ? 'BÖ' : active.initials}
                      contactType={mine ? null : active.contactType}
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

              {replyOpen && (
                <div className="inbox-reply-slot" ref={replyComposerRef}>
                  <EmailReplyComposer
                    fromEmail={SUPPORT_INBOX.email}
                    toName={active.name}
                    toEmail={active.email}
                    subject={resolveEmailReplySubject()}
                    quotedMessageSnapshot={draftQuotedSnapshot}
                    composerFrom={SUPPORT_INBOX}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onSend={onSend}
                    onDiscard={closeReply}
                    generateDraft={generateEmailDraft}
                    placeholder={`Reply to ${active.name}…`}
                    sendLabel="Send"
                  />
                </div>
              )}
            </div>

            {showWhatsAppComposer && (
              <ChatComposer
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onSend={onSend}
                placeholder={`Message ${whatsAppHeaderTitle} on WhatsApp…`}
                sendLabel="Send"
              />
            )}

            {showInternalPanel && (
              <div className="inbox-internal-panel">
                <InternalCommentBar
                  teamName={inboxInternalNotes.teamName}
                  teammates={INBOX_TEAMMATES}
                  value={internalBody}
                  onChange={(e) => setInternalBody(e.target.value)}
                  onSubmit={onPostInternalNote}
                />
              </div>
            )}
          </div>
        )}

        {contactInfoOpen && active && (
          <div className="chat-shell inbox-contact-info-shell">
            <InboxContactInfoPanel
              contact={active}
              entity={contactEntity}
              channelDisplayName={channelDisplayName}
              channelNameLabel={channelNameLabel}
              orders={contactOrders}
              systemMode={showSystemContactInfo}
              systemContact={SYSTEM_NOTIFICATION_SENDER}
              onClose={() => setContactInfoOpen(false)}
              onOpenOrder={(id) => navigate('order-detail', { id })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export { Inbox };
