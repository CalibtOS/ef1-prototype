// Admin · Inbox — customer & GW threads with reply, redirect-to-kundenservice.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage, ChatComposer, ChatThreadRow } = window;
const U = window.EFU;
const D = window.EF;

// ============ INBOX ============
function Inbox({ toast, route }) {
  const [activeId, setActiveId] = useStateA('t1');
  const [tab, setTab] = useStateA('All');
  const [channelFilter, setChannelFilter] = useStateA('all');
  const [deliveryRail, setDeliveryRail] = useStateA('email');
  const [reply, setReply] = useStateA('');
  const appliedRouteTarget = useRefA(null);
  const _toast = toast || (m => console.log(m));
  const rawThreads = window.EFHooks.useThreads();
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
    const threadType = t.threadType || 'order';

    // Compute display name and subtitle based on thread type
    let displayName, displaySubtitle;
    if (threadType === 'lead') {
      displayName = t.contactName || t.phone || 'Unknown contact';
      displaySubtitle = t.subject;
    } else if (threadType === 'gw_direct') {
      displayName = gw?.name || 'Ghostwriter';
      displaySubtitle = t.subject;
    } else {
      displayName = cust?.name || 'Customer';
      displaySubtitle = `#${t.orderId} · ${t.subject}`;
    }

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

  const routeTargetKey = [
    route?.params?.thread || route?.params?.threadId || '',
    route?.params?.orderId || route?.params?.id || '',
  ].join('|');

  useEffectA(() => {
    if (routeTargetKey === '|') {
      appliedRouteTarget.current = null;
      return;
    }
    if (appliedRouteTarget.current === routeTargetKey) return;
    const params = route?.params || {};
    const requestedThreadId = params.thread || params.threadId;
    const requestedOrderId = params.orderId || params.id;
    const target = (requestedThreadId && threads.find(t => t.id === requestedThreadId))
      || (requestedOrderId != null && threads.find(t => Number(t.orderId) === Number(requestedOrderId)));
    if (target) {
      appliedRouteTarget.current = routeTargetKey;
      setActiveId(target.id);
    }
  }, [routeTargetKey, route?.params, threads]);

  const filteredThreads = tab === 'Orders'
    ? threads.filter(t => t.threadType === 'order')
    : tab === 'Leads'
    ? threads.filter(t => t.threadType === 'lead')
    : tab === 'GWs'
    ? threads.filter(t => t.threadType === 'gw_direct')
    : threads;

  const active = filteredThreads.find(t => t.id === activeId) || filteredThreads[0] || threads[0];

  // Mark the active thread read for admin once it's open. Effect runs on selection change.
  useEffectA(() => {
    if (active?.id && active.unread > 0) {
      window.EFActions.threads.markRead(active.id, 'admin');
    }
  }, [active?.id]);

  // AI assist suggestions — deterministic per active thread
  const suggestions = active && (
    active.autoflag === 'pricing' ? {
      summary: 'Customer asking about installment split — pricing-related → must redirect.',
      reply: 'Lieber Kurt, vielen Dank für Ihre Nachricht. Für Fragen zu Zahlungen oder Raten wenden Sie sich bitte direkt an kundenservice@efactory1.de — wir kümmern uns dort gerne darum. Beste Grüße, efactory1',
      tone: 'redirect',
      actions: ['suggest', 'redirect', 'escalate'],
    } : active.ch === 'voice' ? {
      summary: 'Voicemail received — sentiment tense. Do not transcribe content; respond by phone or email.',
      reply: 'Liebe Frau Schmidt, ich habe Ihre Nachricht erhalten. Ich rufe Sie heute zwischen 16 und 18 Uhr zurück. Beste Grüße, efactory1',
      tone: 'callback',
      actions: ['suggest', 'escalate'],
    } : active.sentiment === 'tense' ? {
      summary: 'Tense customer — acknowledge concern, set clear next step, no defensive language.',
      reply: 'Liebe Frau Schmidt, vielen Dank für Ihre Nachricht. Der nächste Zwischenstand erreicht Sie morgen vor 18:00 Uhr. Bei Rückfragen melden Sie sich gerne. Beste Grüße, efactory1',
      tone: 'reassure',
      actions: ['suggest', 'escalate'],
    } : active.sentiment === 'positive' ? {
      summary: 'Positive feedback — short thank-you, prompt for review/referral.',
      reply: 'Lieber Adrian, vielen Dank für Ihr Feedback! Falls Sie zufrieden sind, freuen wir uns über eine Empfehlung oder Bewertung. Herzliche Grüße, efactory1',
      tone: 'thank',
      actions: ['suggest'],
    } : {
      summary: 'Neutral — concise factual reply.',
      reply: 'Vielen Dank für Ihre Nachricht. Wir melden uns mit einer ausführlichen Antwort innerhalb von 24 Stunden. Beste Grüße, efactory1',
      tone: 'standard',
      actions: ['suggest'],
    }
  );

  const onUseSuggestion = () => { if (suggestions) setReply(suggestions.reply); };
  const onSend = () => {
    if (!reply.trim()) {
      _toast({ text: 'Reply is empty.', tone: 'danger' });
      return;
    }
    const msg = window.EFActions.threads.send({
      threadId: active.id,
      orderId: active.orderId,
      role: 'admin',
      body: reply,
      origin_channel: 'admin',
      delivery_channel: deliveryRail,
    });
    if (msg) {
      _toast({ text: `Reply sent via ${channelLabel(deliveryRail)} to ${active.from} · CC kundenservice@efactory1.de`, tone: 'success' });
      setReply('');
    }
  };
  const onRedirect = () => {
    const ok = window.EFActions.threads.redirect(active.id);
    const label = active.orderId ? `Thread #${active.orderId}` : `Thread (${active.from})`;
    if (ok) _toast({ text: `${label} redirected to kundenservice@efactory1.de`, tone: 'info' });
  };
  const onSnooze = () => {
    window.EFActions.threads.snooze(active.id, 4);
    _toast({ text: 'Thread snoozed for 4h', tone: 'info' });
  };
  const onFollowUp = () => {
    window.EFActions.threads.flagFollowUp(active.id);
    _toast({ text: active.followUp ? 'Follow-up flag cleared' : 'Thread flagged for follow-up', tone: 'info' });
  };
  const initialsFor = (name) => (name || 'EF').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const activeInitials = active.system ? 'EF' : initialsFor(active.from);
  const activeChannel = active.ch === 'whatsapp' ? 'WhatsApp' : active.ch === 'voice' ? 'Voice' : active.ch === 'platform' ? 'Platform' : active.ch === 'multi' ? 'Multi-channel' : 'Email';
  const channelLabel = (channel) => {
    if (channel === 'whatsapp') return 'WhatsApp';
    if (channel === 'platform') return 'Platform';
    if (channel === 'voice') return 'Voice';
    if (channel === 'system' || channel === 'internal') return 'System';
    return 'Email';
  };
  const displayChannel = (m) => {
    if (m.from === 'admin') return m.delivery_channel || 'email';
    return m.origin_channel || m.delivery_channel || active.ch;
  };
  const messageChannel = (m) => {
    const ch = displayChannel(m);
    return channelLabel(ch);
  };
  const enrichedMessages = useMemoA(() => {
    return [...(active?.messages || [])]
      .map(m => ({
        ...m,
        origin_channel: m.origin_channel || (m.from === 'admin' ? 'admin' : m.from === 'system' ? 'system' : active?.ch || 'platform'),
        delivery_channel: m.delivery_channel || (m.from === 'system' ? 'internal' : active?.ch === 'multi' || active?.ch === 'voice' ? 'email' : active?.ch || 'email'),
      }))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [active?.id, active?.messages, active?.ch]);
  const matchesChannelFilter = (m) => {
    if (channelFilter === 'all') return true;
    if (channelFilter === 'email') return m.origin_channel === 'email' || (m.from === 'admin' && m.delivery_channel === 'email');
    if (channelFilter === 'whatsapp') return m.origin_channel === 'whatsapp' || (m.from === 'admin' && m.delivery_channel === 'whatsapp');
    if (channelFilter === 'platform') return m.origin_channel === 'platform' || (m.from === 'admin' && m.delivery_channel === 'platform');
    return true;
  };
  const visibleMessages = enrichedMessages.filter(matchesChannelFilter);
  const hiddenCount = enrichedMessages.length - visibleMessages.length;
  const hiddenLabel = channelFilter === 'all' ? '' : ['email', 'whatsapp', 'platform']
    .filter(ch => ch !== channelFilter)
    .map(channelLabel)
    .join('/');
  const activeContextLine = active.threadType === 'lead'
    ? `Lead · ${active.from} · ${activeChannel}`
    : active.threadType === 'gw_direct'
    ? `GW Direct · ${active.from} · ${activeChannel}`
    : `${active.from} · order #${active.orderId} · unified thread`;
  const orderBadge = (t) => {
    const config = t.order?.status ? D.STATUS_PILLS?.[t.order.status] : null;
    if (!config) return null;
    const tone = config.color === 'yellow' ? 'amber' : config.color;
    return <span className={`pill pill-${tone}`} style={{ fontSize: 10 }}>{config.label}</span>;
  };
  const triageBadges = (t) => {
    if (t.threadType === 'order') {
      return <>
        {t.awaitingReply && <span className="pill pill-blue" style={{ fontSize: 10 }}>awaiting reply</span>}
        {t.autoflag && <span className="pill pill-orange" style={{ fontSize: 10 }}>pricing</span>}
        {t.sentiment === 'tense' || t.sentiment === 'frustrated' ? <span className="pill pill-amber" style={{ fontSize: 10 }}>tense</span> : null}
        {t.followUp && <span className="pill pill-blue" style={{ fontSize: 10 }}>follow-up</span>}
        {!t.awaitingReply && !t.autoflag && t.sentiment !== 'tense' && t.sentiment !== 'frustrated' && !t.followUp && orderBadge(t)}
      </>;
    }
    return <>
      <span className={`pill pill-${t.ch === 'whatsapp' ? 'green' : t.ch === 'voice' ? 'orange' : t.ch === 'platform' ? 'slate' : 'blue'}`} style={{ fontSize: 10 }}>{t.ch}</span>
      {t.isB2B && <span className="pill pill-purple" style={{ fontSize: 10 }}>B2B</span>}
      {t.threadType === 'gw_direct' && <span className="pill pill-amber" style={{ fontSize: 10 }}>GW direct</span>}
      {t.sentiment === 'tense' || t.sentiment === 'frustrated' ? <span className="pill pill-amber" style={{ fontSize: 10 }}>tense</span> : null}
      {t.sentiment === 'positive' && <span className="pill pill-green" style={{ fontSize: 10 }}>positive</span>}
      {t.autoflag && <span className="pill pill-orange" style={{ fontSize: 10 }}>auto: {t.autoflag}</span>}
      {t.followUp && <span className="pill pill-blue" style={{ fontSize: 10 }}>follow-up</span>}
    </>;
  };

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Unified Inbox</h1>
          <div className="page-subtitle">all channels · sentiment-tagged · pricing keywords auto-redirected</div>
        </div>
      </div>
      <ChatNotice compact>
        efactory1 remains in CC on platform, email and WhatsApp replies. Pricing/payment threads are routed to <span className="mono">kundenservice@efactory1.de</span>.
      </ChatNotice>

      <div className="chat-app-grid with-side mt-3" style={{ height: 'calc(100vh - 240px)', minHeight: 620 }}>
        <div className="chat-shell">
          <div className="chat-header" style={{ padding: '8px 12px' }}>
            <div className="flex gap-1">
              {[
                ['All', 'All threads'],
                ['Orders', 'Orders'],
                ['Leads', 'Leads'],
                ['GWs', 'GWs'],
              ].map(([id, label]) => (
                <button type="button" key={id} className={`chip ${tab===id?'active':''}`} onClick={() => setTab(id)}>{label}</button>
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
                tone={t.threadType === 'order' ? 'blue' : t.threadType === 'gw_direct' ? 'amber' : t.ch === 'whatsapp' ? 'emerald' : 'blue'}
                title={t.from}
                subtitle={t.displaySubtitle}
                preview={t.last}
                meta={U.relTime(t.at)}
                onClick={() => setActiveId(t.id)}
                badges={triageBadges(t)}
              />
            ))}
            {filteredThreads.length === 0 && (
              <div className="text-faint fs-12" style={{ padding: 16 }}>No threads in this tab.</div>
            )}
          </div>
        </div>

        <div className="chat-shell chat-shell-soft">
          <div className="chat-header">
            <div className="chat-title">
              <Avatar initials={activeInitials} size={34} tone={active.system ? 'amber' : 'blue'}/>
              <div style={{ minWidth: 0 }}>
                <span className="chat-title-main">{active.subject}</span>
                <span className="chat-title-sub">{activeContextLine}</span>
              </div>
            </div>
            <div className="flex gap-1" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {['all', 'email', 'whatsapp', 'platform'].map(ch => (
                <button type="button" key={ch} className={`chip ${channelFilter === ch ? 'active' : ''}`} onClick={() => setChannelFilter(ch)}>
                  {ch === 'all' ? 'All' : channelLabel(ch)}
                </button>
              ))}
              {active.autoflag && <span className="pill pill-orange"><Icon name="alert-triangle" size={11}/> pricing redirect</span>}
            </div>
          </div>

          <ChatNotice compact>
            Same order-thread structure as Communications: chronological messages with channel metadata. The left list is only a triage lens across orders, leads and GW-direct threads.
          </ChatNotice>
          {hiddenCount > 0 && (
            <ChatNotice compact icon="eye-off">
              {hiddenCount} message{hiddenCount === 1 ? '' : 's'} hidden while filtered to {channelLabel(channelFilter)} ({hiddenLabel}).
            </ChatNotice>
          )}

          <div className="chat-stream">
            {active.ch === 'voice' && channelFilter === 'all' ? (
              <>
                <ChatMessage system at={active.voiceMeta?.recordedAt || active.at}>Voicemail received · metadata only</ChatMessage>
                <div className="chat-row is-theirs">
                  <Avatar initials={activeInitials} size={30} tone="blue"/>
                  <div className="chat-bubble-wrap">
                    <div className="chat-name"><span>{active.from}</span><span className="chat-channel">voice</span></div>
                    <div className="chat-bubble">
                      <div className="kv" style={{ fontSize: 12 }}>
                        <div className="kv-row"><dt>Duration</dt><dd className="mono">{active.voiceMeta?.duration || '—'}</dd></div>
                        <div className="kv-row"><dt>From</dt><dd className="mono">{active.voiceMeta?.from || active.from}</dd></div>
                        <div className="kv-row"><dt>Recorded at</dt><dd className="mono">{U.fmtDateTime(active.voiceMeta?.recordedAt || active.at)}</dd></div>
                        <div className="kv-row"><dt>Sentiment tag</dt><dd><span className="pill pill-amber">{active.sentiment}</span></dd></div>
                      </div>
                    </div>
                    <div className="chat-meta"><span>Transcript disabled by policy</span></div>
                  </div>
                </div>
                <ChatNotice compact icon="lock">Audio playback and transcription are disabled. Reply by phone or email.</ChatNotice>
              </>
            ) : (visibleMessages.length === 0 ? (
              <EmptyState compact icon="message-square" title="No messages in this view" body={enrichedMessages.length ? 'Switch back to All to see the full thread.' : 'Sobald jemand schreibt, erscheint die Unterhaltung hier.'}/>
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
                const prev = visibleMessages[i - 1];
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
                    channel={!grouped && !sys ? messageChannel(m) : null}
                    tone={mine ? 'blue' : sys ? 'amber' : 'slate'}
                  >
                    {m.body}
                  </ChatMessage>
                );
              })
            ))}
          </div>

          <ChatComposer
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onSend={onSend}
            placeholder={`Reply in ${active.threadType === 'order' ? `order #${active.orderId}` : active.from}...`}
            sendLabel={`Send via ${channelLabel(deliveryRail)}`}
            actions={<>
              <div className="flex gap-1">
                {['email', 'whatsapp'].map(ch => (
                  <button type="button" key={ch} className={`chip ${deliveryRail === ch ? 'active' : ''}`} onClick={() => setDeliveryRail(ch)}>{channelLabel(ch)}</button>
                ))}
              </div>
              <NotReady className="chat-icon-action" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={15}/></NotReady>
              <span className="chip">DE → EN</span>
              <span className="chip">CC active</span>
            </>}
          />
        </div>

        {/* AI assist pane — 3rd column per PRD */}
        <div className="chat-shell">
          <div className="chat-header">
            <div className="chat-title-main flex items-center gap-2"><Icon name="sparkles" size={14}/> AI assist</div>
            <span className="pill pill-blue" style={{ fontSize: 10 }}>Beta</span>
          </div>
          <div className="card-pad flex-col gap-3" style={{ flex: 1, overflowY: 'auto' }}>
            <div>
              <div className="fs-11 text-muted mb-1">Context summary</div>
              <div className="fs-12">{suggestions?.summary}</div>
            </div>
            <div>
              <div className="fs-11 text-muted mb-1">Suggested reply <span className="text-faint">· tone: {suggestions?.tone}</span></div>
              <div className="chat-bubble" style={{ background: 'var(--surface-2)', color: 'var(--text)', borderBottomLeftRadius: 5, fontSize: 12 }}>{suggestions?.reply}</div>
              <button type="button" className="btn btn-sm w-full mt-2" onClick={onUseSuggestion} style={{ justifyContent: 'center' }}>
                <Icon name="zap" size={12}/> Use suggestion
              </button>
            </div>
            <div>
              <div className="fs-11 text-muted mb-1">Actions</div>
              <div className="flex-col gap-1">
                {suggestions?.actions?.includes('redirect') && (
                  <button type="button" className="btn btn-sm" onClick={onRedirect}><Icon name="arrow-right" size={12}/> Redirect to kundenservice</button>
                )}
                {/* "Escalate to admin" is hidden for the admin role — admin IS the escalation target.
                    Replaced with "Mark for follow-up" to flag the thread for the admin's own queue. */}
                {suggestions?.actions?.includes('escalate') && (
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


window.Inbox = Inbox;
})();
