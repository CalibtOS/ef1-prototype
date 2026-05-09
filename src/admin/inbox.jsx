// Admin · Inbox — customer & GW threads with reply, redirect-to-kundenservice.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage, ChatComposer, ChatThreadRow } = window;
const U = window.EFU;
const D = window.EF;

// ============ INBOX ============
function Inbox({ toast }) {
  const [activeId, setActiveId] = useStateA('t1');
  const [tab, setTab] = useStateA('Inbox');
  const [reply, setReply] = useStateA('');
  const _toast = toast || (m => console.log(m));
  const threads = window.EFHooks.useThreads().map(t => {
    const cust = D.customer(t.customerId);
    const ch = t.channel === 'whatsapp_proxy' ? 'whatsapp'
      : t.channel === 'voice_metadata' ? 'voice'
      : t.channel === 'platform_chat' ? 'platform'
      : 'email';
    return {
      id: t.id,
      subject: t.subject,
      last: t.channel === 'voice_metadata' ? 'Voicemail received · metadata only' : t.subject,
      from: cust?.name || (t.system ? 'System' : 'Customer'),
      orderId: t.orderId,
      ch,
      sentiment: t.sentiment || 'neutral',
      unread: !!t.unread,
      at: t.lastAt,
      flagged: !!t.flagged,
      autoflag: t.flaggedReason === 'financial_question' ? 'pricing' : null,
      voiceMeta: t.channel === 'voice_metadata' ? { duration: '0:42', from: cust?.phone || 'unknown', recordedAt: t.lastAt } : null,
      system: t.channel === 'system',
    };
  });

  const filteredThreads = tab === 'Mentions'
    ? threads.filter(t => t.system || t.from?.toLowerCase().includes('berat'))
    : tab === 'Auto-flagged'
    ? threads.filter(t => t.autoflag || t.flagged)
    : threads;

  const active = filteredThreads.find(t => t.id === activeId) || filteredThreads[0] || threads[0];

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
    _toast({ text: `Reply sent via ${active.ch} to ${active.from} · CC kundenservice@efactory1.de`, tone: 'success' });
    setReply('');
  };
  const onRedirect = () => _toast({ text: `Thread #${active.orderId} redirected to kundenservice@efactory1.de`, tone: 'info' });
  const onEscalate = () => _toast({ text: `Thread escalated · admin Berat notified`, tone: 'info' });
  const initialsFor = (name) => (name || 'EF').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const activeInitials = active.system ? 'EF' : initialsFor(active.from);
  const activeChannel = active.ch === 'whatsapp' ? 'WhatsApp' : active.ch === 'voice' ? 'Voice' : active.ch === 'platform' ? 'Platform' : 'Email';

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
              {['Inbox', 'Mentions', 'Auto-flagged'].map(t => (
                <button type="button" key={t} className={`chip ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="chat-thread-list">
            {filteredThreads.map(t => (
              <ChatThreadRow
                key={t.id}
                active={active?.id === t.id}
                unread={t.unread ? 1 : 0}
                initials={t.system ? 'EF' : initialsFor(t.from)}
                tone={t.system ? 'amber' : t.ch === 'whatsapp' ? 'emerald' : 'blue'}
                title={t.from}
                subtitle={`#${t.orderId} · ${t.subject}`}
                preview={t.last}
                meta={U.relTime(t.at)}
                onClick={() => setActiveId(t.id)}
                badges={<>
                  <span className={`pill pill-${t.ch === 'whatsapp' ? 'green' : t.ch === 'voice' ? 'orange' : t.ch === 'platform' ? 'slate' : 'blue'}`} style={{ fontSize: 10 }}>{t.ch}</span>
                  {t.sentiment === 'tense' && <span className="pill pill-amber" style={{ fontSize: 10 }}>tense</span>}
                  {t.sentiment === 'positive' && <span className="pill pill-green" style={{ fontSize: 10 }}>positive</span>}
                  {t.autoflag && <span className="pill pill-orange" style={{ fontSize: 10 }}>auto: {t.autoflag}</span>}
                </>}
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
                <span className="chat-title-sub">{active.from} · order #{active.orderId} · {activeChannel}</span>
              </div>
            </div>
            {active.autoflag && <span className="pill pill-orange"><Icon name="alert-triangle" size={11}/> pricing redirect</span>}
          </div>

          <div className="chat-stream">
            {active.ch === 'voice' ? (
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
            ) : (
              <ChatMessage
                sender={active.from}
                initials={activeInitials}
                at={active.at}
                channel={activeChannel}
                tone={active.system ? 'amber' : 'blue'}
              >
                {active.last}
              </ChatMessage>
            )}
            {active.id === 'th-4' && (
              <ChatMessage system at={active.at}>Pricing question auto-routed to kundenservice. The GW is not allowed to answer financial terms.</ChatMessage>
            )}
          </div>

          <ChatComposer
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onSend={onSend}
            placeholder={`Reply via ${activeChannel}...`}
            sendLabel={`Send via ${activeChannel}`}
            actions={<>
              <NotReady className="chat-icon-action" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={15}/></NotReady>
              <span className="chip">DE -> EN</span>
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
                  <button type="button" className="btn btn-sm" onClick={() => _toast({ text: 'Thread flagged for follow-up', tone: 'info' })}>
                    <Icon name="flag" size={12}/> Flag for follow-up
                  </button>
                )}
                <button type="button" className="btn btn-sm" onClick={() => _toast({ text: 'Thread snoozed for 4h', tone: 'info' })}>
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
