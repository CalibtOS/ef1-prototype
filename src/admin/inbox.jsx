// Admin · Inbox (System B) — Berat's external comms surface (email + WhatsApp).
//
// D-26 (May 21 2026): this view is **System B only**. It aggregates the admin
// inbox threads (order_admin + lead + gw_direct). System A — the in-platform
// customer↔GW order chat — is NOT shown here; it lives on the order detail's
// "Order Chat" tab.
//
// Selection / filter / scope state is read from store.ui.inboxNav (single
// source of truth — see docs/inbox_architecture_plan.md §3a). Components do
// not hold local copies of these.
import React, { useEffect, useMemo } from 'react';
import { Icon, Avatar, NotReady, EmptyState, ChatNotice, ChatMessage, EmailCard, MediumChip, ChatComposer, ChatThreadRow } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

const SCOPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'leads', label: 'Leads' },
  { id: 'gws', label: 'GWs' },
];

const VIEW_TABS = [
  { id: 'combined', label: 'Combined' },
  { id: 'email', label: 'Email only' },
  { id: 'whatsapp', label: 'WhatsApp only' },
];

function initialsFor(name) {
  return (name || 'EF').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
}

function mediumOf(message) {
  // Per D-26: System B messages carry their wire medium on delivery_channel
  // (email | whatsapp | voice | internal for system events).
  if (!message) return 'platform';
  if (message.from === 'system') return 'system';
  return message.delivery_channel || message.origin_channel || 'platform';
}

function channelLabel(medium) {
  if (medium === 'whatsapp') return 'WhatsApp';
  if (medium === 'email') return 'Email';
  if (medium === 'voice') return 'Voice';
  if (medium === 'platform') return 'Platform';
  if (medium === 'system' || medium === 'internal') return 'System';
  return String(medium || '—');
}

function Inbox({ toast, route }) {
  const _toast = toast || (m => console.log(m));
  const rawThreads = EFHooks.useInboxThreads();
  const nav = EFHooks.useInboxNav();
  const { scope, view, selectedId } = nav;

  // ─── Decorate threads with display fields ────────────────────────────────
  const threads = rawThreads.map(t => {
    const cust = D.customer(t.customerId);
    const gw = D.gw(t.gwId);
    const order = t.orderId ? D.order(t.orderId) : null;
    const ch = t.channel === 'whatsapp_proxy' ? 'whatsapp'
      : t.channel === 'voice_metadata' ? 'voice'
      : t.channel === 'platform_chat' ? 'platform'
      : t.channel === 'multi_channel' ? 'multi'
      : 'email';
    const lastMsg = (t.messages && t.messages.length) ? t.messages[t.messages.length - 1] : null;
    const unreadAdmin = (t.unread && typeof t.unread === 'object') ? (t.unread.admin || 0) : (t.unread ? 1 : 0);
    const threadType = t.threadType || 'order_admin';

    let displayName, displaySubtitle;
    if (threadType === 'lead') {
      displayName = t.contactName || t.phone || t.contactEmail || 'Unknown contact';
      displaySubtitle = t.subject;
    } else if (threadType === 'gw_direct') {
      displayName = gw?.name || 'Ghostwriter';
      displaySubtitle = t.subject;
    } else {
      displayName = cust?.name || 'Customer';
      displaySubtitle = t.orderId ? `#${t.orderId} · ${t.subject}` : t.subject;
    }

    // Mediums present in this thread (for the medium icons in the list row).
    const mediumsPresent = Array.from(new Set((t.messages || []).map(mediumOf).filter(m => m && m !== 'system' && m !== 'internal' && m !== 'platform')));

    return {
      id: t.id,
      threadType,
      subject: t.subject,
      last: ch === 'voice' ? 'Voicemail received · metadata only'
        : (lastMsg ? (lastMsg.body || '').slice(0, 110) : t.subject),
      from: displayName,
      displaySubtitle,
      orderId: t.orderId,
      order,
      ch,
      mediumsPresent,
      sentiment: t.sentiment || 'neutral',
      unread: unreadAdmin,
      at: t.lastAt,
      awaitingReply: !!(t.lastInboundAt && (!t.lastOutboundAt || new Date(t.lastInboundAt) > new Date(t.lastOutboundAt))),
      flagged: !!t.flagged,
      autoflag: t.flagged === 'financial' || t.flaggedReason === 'financial_question' ? 'pricing' : null,
      voiceMeta: ch === 'voice' ? { duration: '0:42', from: cust?.phone || 'unknown', recordedAt: t.lastAt } : null,
      followUp: !!t.followUp,
      snoozeUntil: t.snoozeUntil || null,
      isB2B: !!t.isB2B,
      messages: t.messages || [],
      raw: t,
    };
  });

  // ─── Deep-link / notification-click → inboxNav.select sync ───────────────
  // The route may carry ?thread=… or ?orderId=… — we apply it into the nav
  // slice once per change so subsequent local actions take over without
  // re-running this effect on every re-render.
  const requestedThreadId = route?.params?.thread || route?.params?.threadId || null;
  const requestedOrderId = route?.params?.orderId || route?.params?.id || null;
  useEffect(() => {
    if (!requestedThreadId && !requestedOrderId) return;
    const target = (requestedThreadId && threads.find(t => t.id === requestedThreadId))
      || (requestedOrderId != null && threads.find(t => Number(t.orderId) === Number(requestedOrderId)));
    if (target && target.id !== selectedId) {
      EFActions.inboxNav.select(target.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedThreadId, requestedOrderId]);

  // ─── Scope (left rail tabs) → narrows the thread list ───────────────────
  const filteredThreads = scope === 'orders'
    ? threads.filter(t => t.threadType === 'order_admin')
    : scope === 'leads'
    ? threads.filter(t => t.threadType === 'lead')
    : scope === 'gws'
    ? threads.filter(t => t.threadType === 'gw_direct')
    : threads;

  // Default selection — first thread in the current scope when none selected.
  const active = filteredThreads.find(t => t.id === selectedId) || filteredThreads[0] || threads[0];
  useEffect(() => {
    if (active?.id && active.id !== selectedId) {
      EFActions.inboxNav.select(active.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // ─── View (Combined / Email / WhatsApp) → render-time message filter ────
  const enrichedMessages = useMemo(() => {
    return [...(active?.messages || [])]
      .map(m => ({ ...m, _medium: mediumOf(m) }))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [active?.id, active?.messages]);
  const matchesView = (m) => {
    if (view === 'combined') return true;
    if (m._medium === 'system' || m._medium === 'internal') return true; // system messages always shown
    return m._medium === view;
  };
  const visibleMessages = enrichedMessages.filter(matchesView);
  const hiddenCount = enrichedMessages.length - visibleMessages.length;

  // ─── Composer state (still local — it's about the current draft) ────────
  const [reply, setReply] = React.useState('');
  const [deliveryRail, setDeliveryRail] = React.useState('email');
  // Default the composer's outgoing channel to the channel of the latest
  // inbound message, so admin doesn't have to think.
  useEffect(() => {
    const lastInbound = [...enrichedMessages].reverse().find(m => m.from !== 'admin' && m.from !== 'system');
    if (lastInbound) {
      const m = lastInbound._medium;
      if (m === 'email' || m === 'whatsapp') setDeliveryRail(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  if (!active) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Inbox</h1>
            <div className="page-subtitle">External communications — email + WhatsApp aggregated</div>
          </div>
        </div>
        <EmptyState icon="inbox" title="No threads" body="No admin-side threads to show. New emails or WhatsApp messages will appear here."/>
      </div>
    );
  }

  const onSend = () => {
    if (!reply.trim()) {
      _toast({ text: 'Reply is empty.', tone: 'danger' });
      return;
    }
    const msg = EFActions.threads.send({
      threadId: active.id,
      threadType: active.threadType === 'order_admin' ? 'order_admin' : undefined,
      orderId: active.orderId,
      role: 'admin',
      body: reply,
      origin_channel: 'admin',
      delivery_channel: deliveryRail,
    });
    if (msg) {
      _toast({ text: `Reply sent via ${channelLabel(deliveryRail)} to ${active.from}`, tone: 'success' });
      setReply('');
    }
  };
  const onRedirect = () => {
    const ok = EFActions.threads.redirect(active.id);
    if (ok) _toast({ text: `Thread redirected to kundenservice@efactory1.de`, tone: 'info' });
  };
  const onSnooze = () => {
    EFActions.threads.snooze(active.id, 4);
    _toast({ text: 'Thread snoozed for 4h', tone: 'info' });
  };
  const onFollowUp = () => {
    EFActions.threads.flagFollowUp(active.id);
    _toast({ text: active.followUp ? 'Follow-up flag cleared' : 'Thread flagged for follow-up', tone: 'info' });
  };

  const activeInitials = initialsFor(active.from);
  const activeContextLine = active.threadType === 'lead'
    ? `Lead · ${active.from}`
    : active.threadType === 'gw_direct'
    ? `GW Direct · ${active.from}`
    : active.orderId
      ? `${active.from} · order #${active.orderId}`
      : active.from;

  // AI assist suggestions (deterministic per active thread)
  const suggestions = active.autoflag === 'pricing' ? {
    summary: 'Customer asking about installment split — pricing-related → must redirect.',
    reply: 'Lieber Kunde, vielen Dank für Ihre Nachricht. Für Fragen zu Zahlungen oder Raten wenden Sie sich bitte direkt an kundenservice@efactory1.de. Beste Grüße, efactory1',
    tone: 'redirect',
    actions: ['suggest', 'redirect', 'escalate'],
  } : active.ch === 'voice' ? {
    summary: 'Voicemail received — sentiment tense. Do not transcribe content; respond by phone or email.',
    reply: 'Liebe Frau Schmidt, ich habe Ihre Nachricht erhalten. Ich rufe Sie heute zwischen 16 und 18 Uhr zurück. Beste Grüße, efactory1',
    tone: 'callback',
    actions: ['suggest', 'escalate'],
  } : {
    summary: 'Neutral — concise factual reply.',
    reply: 'Vielen Dank für Ihre Nachricht. Wir melden uns mit einer ausführlichen Antwort innerhalb von 24 Stunden. Beste Grüße, efactory1',
    tone: 'standard',
    actions: ['suggest'],
  };
  const onUseSuggestion = () => setReply(suggestions.reply);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Inbox</h1>
          <div className="page-subtitle">
            External communications — email + WhatsApp aggregated · System B (D-26)
          </div>
        </div>
      </div>
      <ChatNotice compact>
        Customer ↔ Ghostwriter chat lives on each order's <strong>Order Chat</strong> tab (System A). This inbox is only Berat's email + WhatsApp with customers, leads, and GWs.
      </ChatNotice>

      <div className="chat-app-grid with-side mt-3" style={{ height: 'calc(100vh - 240px)', minHeight: 620 }}>
        {/* ── LEFT: thread list with scope tabs ─────────────────────────── */}
        <div className="chat-shell">
          <div className="chat-header" style={{ padding: '8px 12px' }}>
            <div className="flex gap-1">
              {SCOPE_TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${scope === t.id ? 'active' : ''}`}
                  onClick={() => EFActions.inboxNav.setScope(t.id)}
                >{t.label}</button>
              ))}
            </div>
          </div>
          <div className="chat-thread-list">
            {filteredThreads.map(t => (
              <ChatThreadRow
                key={t.id}
                active={active?.id === t.id}
                unread={t.unread || 0}
                initials={initialsFor(t.from)}
                tone={t.threadType === 'lead' ? 'slate' : t.threadType === 'gw_direct' ? 'amber' : 'blue'}
                title={t.from}
                subtitle={t.displaySubtitle}
                preview={t.last}
                meta={U.relTime(t.at)}
                onClick={() => EFActions.inboxNav.select(t.id)}
                badges={
                  <>
                    {t.mediumsPresent.map(m => <MediumChip key={m} medium={m}/>)}
                    {t.isB2B && <span className="pill pill-purple" style={{ fontSize: 10 }}>B2B</span>}
                    {t.threadType === 'gw_direct' && <span className="pill pill-amber" style={{ fontSize: 10 }}>GW direct</span>}
                    {t.threadType === 'lead' && <span className="pill pill-slate" style={{ fontSize: 10 }}>Lead</span>}
                    {t.autoflag && <span className="pill pill-orange" style={{ fontSize: 10 }}>{t.autoflag}</span>}
                    {t.followUp && <span className="pill pill-blue" style={{ fontSize: 10 }}>follow-up</span>}
                  </>
                }
              />
            ))}
            {filteredThreads.length === 0 && (
              <div className="text-faint fs-12" style={{ padding: 16 }}>No threads in this tab.</div>
            )}
          </div>
        </div>

        {/* ── CENTER: active thread with view filter + composer ─────────── */}
        <div className="chat-shell chat-shell-soft">
          <div className="chat-header">
            <div className="chat-title">
              <Avatar initials={activeInitials} size={34} tone="blue"/>
              <div style={{ minWidth: 0 }}>
                <span className="chat-title-main">{active.subject}</span>
                <span className="chat-title-sub">{activeContextLine}</span>
              </div>
            </div>
            <div className="flex gap-1" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {VIEW_TABS.map(v => (
                <button
                  key={v.id}
                  type="button"
                  className={`chip ${view === v.id ? 'active' : ''}`}
                  onClick={() => EFActions.inboxNav.setView(v.id)}
                >{v.label}</button>
              ))}
              {active.autoflag && <span className="pill pill-orange"><Icon name="alert-triangle" size={11}/> pricing redirect</span>}
            </div>
          </div>

          {hiddenCount > 0 && (
            <ChatNotice compact icon="eye-off">
              {hiddenCount} message{hiddenCount === 1 ? '' : 's'} hidden by view filter — switch to Combined to see everything.
            </ChatNotice>
          )}

          <div className="chat-stream">
            {visibleMessages.length === 0 ? (
              <EmptyState compact icon="message-square" title="No messages in this view" body={enrichedMessages.length ? 'Switch to Combined to see the full thread.' : 'Sobald jemand schreibt, erscheint die Unterhaltung hier.'}/>
            ) : (
              visibleMessages.map((m, i) => {
                const sys = m.from === 'system';
                const mine = m.from === 'admin';
                const senderName = m.from === 'gw'
                  ? (D.gw(active.raw.gwId)?.name || 'Ghostwriter')
                  : m.from === 'customer'
                    ? active.from
                    : m.from === 'admin' ? 'efactory1 (Berat)' : 'System';
                const senderInits = m.from === 'gw'
                  ? (D.gw(active.raw.gwId)?.initials || '··')
                  : m.from === 'customer'
                    ? activeInitials
                    : m.from === 'admin' ? 'BÖ' : 'EF';
                // Email-medium messages render as cards (subject/recipients/
                // attachments/expandable body). Everything else renders as a
                // chat bubble.
                if (m._medium === 'email' && !sys) {
                  return (
                    <EmailCard
                      key={m.id}
                      message={m}
                      direction={mine ? 'outbound' : 'inbound'}
                      senderName={senderName}
                      initialExpanded={i === visibleMessages.length - 1}
                    />
                  );
                }
                const prev = visibleMessages[i - 1];
                const grouped = !!prev && prev.from === m.from && !sys && prev._medium === m._medium;
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
                    channel={!grouped && !sys ? channelLabel(m._medium) : null}
                    tone={mine ? 'blue' : sys ? 'amber' : 'slate'}
                  >
                    {m.body}
                  </ChatMessage>
                );
              })
            )}
          </div>

          <ChatComposer
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onSend={onSend}
            placeholder={`Reply to ${active.from}…`}
            sendLabel={`Send via ${channelLabel(deliveryRail)}`}
            actions={<>
              <div className="flex gap-1">
                {['email', 'whatsapp'].map(ch => (
                  <button type="button" key={ch} className={`chip ${deliveryRail === ch ? 'active' : ''}`} onClick={() => setDeliveryRail(ch)}>{channelLabel(ch)}</button>
                ))}
              </div>
              <NotReady className="chat-icon-action" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={15}/></NotReady>
            </>}
          />
        </div>

        {/* ── RIGHT: AI assist ───────────────────────────────────────────── */}
        <div className="chat-shell">
          <div className="chat-header">
            <div className="chat-title-main flex items-center gap-2"><Icon name="sparkles" size={14}/> AI assist</div>
            <span className="pill pill-blue" style={{ fontSize: 10 }}>Beta</span>
          </div>
          <div className="card-pad flex-col gap-3" style={{ flex: 1, overflowY: 'auto' }}>
            <div>
              <div className="fs-11 text-muted mb-1">Context summary</div>
              <div className="fs-12">{suggestions.summary}</div>
            </div>
            <div>
              <div className="fs-11 text-muted mb-1">Suggested reply <span className="text-faint">· tone: {suggestions.tone}</span></div>
              <div className="chat-bubble" style={{ background: 'var(--surface-2)', color: 'var(--text)', borderBottomLeftRadius: 5, fontSize: 12 }}>{suggestions.reply}</div>
              <button type="button" className="btn btn-sm w-full mt-2" onClick={onUseSuggestion} style={{ justifyContent: 'center' }}>
                <Icon name="zap" size={12}/> Use suggestion
              </button>
            </div>
            <div>
              <div className="fs-11 text-muted mb-1">Actions</div>
              <div className="flex-col gap-1">
                {suggestions.actions.includes('redirect') && (
                  <button type="button" className="btn btn-sm" onClick={onRedirect}><Icon name="arrow-right" size={12}/> Redirect to kundenservice</button>
                )}
                {suggestions.actions.includes('escalate') && (
                  <button type="button" className="btn btn-sm" onClick={onFollowUp}>
                    <Icon name="flag" size={12}/> {active.followUp ? 'Clear follow-up flag' : 'Flag for follow-up'}
                  </button>
                )}
                <button type="button" className="btn btn-sm" onClick={onSnooze}>
                  <Icon name="clock" size={12}/> Snooze 4h
                </button>
              </div>
            </div>
            <ChatNotice compact icon="lock">Suggestions are drafts only. Pricing terms are auto-redirected and never sent to GWs.</ChatNotice>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Inbox };
