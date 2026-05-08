// Admin · Inbox — customer & GW threads with reply, redirect-to-kundenservice.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ INBOX ============
function Inbox({ toast }) {
  const [activeId, setActiveId] = useStateA('th-1');
  const [tab, setTab] = useStateA('Inbox');
  const [reply, setReply] = useStateA('');
  const _toast = toast || (m => console.log(m));
  const threads = [
    { id: 'th-1', subject: 'Re: Bachelorarbeit – Zwischenstand', last: 'Wann bekomme ich den nächsten Stand?', from: 'Lea Schmidt', orderId: 3508, ch: 'whatsapp', sentiment: 'tense', unread: true, at: '2026-05-07T11:14:00' },
    // Voice channel: metadata-only per PRD constraint (no transcript content)
    { id: 'th-2', subject: 'Voicemail · 0:42', last: 'Voicemail received · 0:42 · sentiment: tense', from: 'Lea Schmidt', orderId: 3508, ch: 'voice', sentiment: 'tense', unread: true, at: '2026-05-07T11:02:00', voiceMeta: { duration: '0:42', from: '+49 •••• 8821', recordedAt: '2026-05-07T11:02:00' } },
    { id: 'th-3', subject: 'Hausarbeit Marketing — claim approved?', last: 'GW Maja hat sich gemeldet, ich frage mich, ob...', from: 'Sebastian Wolf', orderId: 3526, ch: 'email', sentiment: 'neutral', unread: false, at: '2026-05-07T10:43:00' },
    { id: 'th-4', subject: 'Frage zur Rate', last: 'Können wir die zweite Rate splitten?', from: 'Kurt Müller', orderId: 3499, ch: 'email', sentiment: 'neutral', unread: false, at: '2026-05-07T09:55:00', autoflag: 'pricing' },
    { id: 'th-5', subject: 'Danke!', last: 'Die Arbeit ist genau das, was ich mir vorgestellt habe.', from: 'Adrian Berger', orderId: 3520, ch: 'email', sentiment: 'positive', unread: false, at: '2026-05-06T18:22:00' },
    { id: 'th-6', subject: 'Internal: GW Anna König', last: 'AI score 87% — auto shadow-ban applied. Awaiting QA verdict.', from: 'System', orderId: 3517, ch: 'platform', sentiment: 'tense', unread: true, at: '2026-05-07T09:02:00', system: true },
  ];

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

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Unified Inbox</h1>
          <div className="page-subtitle">all channels · efactory1 always in CC · sentiment-tagged · pricing keywords auto-redirected</div>
        </div>
      </div>
      <div className="inbox-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 16, height: 'calc(100vh - 220px)', minHeight: 560 }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-head" style={{ padding: '8px 12px' }}>
            <div className="flex gap-1">
              {['Inbox', 'Mentions', 'Auto-flagged'].map(t => (
                <button type="button" key={t} className={`chip ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredThreads.map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => setActiveId(t.id)}
                aria-current={activeId === t.id}
                style={{
                  display: 'block', textAlign: 'left', width: '100%',
                  padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: activeId === t.id ? 'var(--surface-3)' : (t.unread ? 'color-mix(in oklab, var(--blue) 3%, var(--surface))' : 'var(--surface)'),
                  borderLeft: activeId === t.id ? '3px solid var(--blue)' : (t.unread ? '3px solid color-mix(in oklab, var(--blue) 50%, transparent)' : '3px solid transparent'),
                  borderTop: 'none', borderRight: 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`thread-channel-icon ${t.ch}`} style={{ width: 22, height: 22 }}><Icon name={t.ch==='email'?'mail':t.ch==='whatsapp'?'message-circle':t.ch==='voice'?'mic':'message-square'} size={11}/></div>
                  <strong className={`fs-12 ${t.unread ? '' : 'text-muted'}`}>{t.from}</strong>
                  {t.system && <span className="pill pill-red">System</span>}
                  <span style={{ flex: 1 }}/>
                  <span className="fs-11 text-faint">{U.relTime(t.at).split(' ')[0]+'h'}</span>
                </div>
                <div className={`fs-12 ${t.unread ? 'strong' : 'text-muted'}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                <div className="fs-11 text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{t.last}</div>
                <div className="flex gap-1 mt-1">
                  <span className="fs-11 text-faint mono">#{t.orderId}</span>
                  <span style={{ flex: 1 }}/>
                  {t.sentiment === 'tense' && <span className="pill pill-amber" style={{ fontSize: 10 }}>tense</span>}
                  {t.sentiment === 'positive' && <span className="pill pill-green" style={{ fontSize: 10 }}>positive</span>}
                  {t.autoflag && <span className="pill pill-orange" style={{ fontSize: 10 }}>auto: {t.autoflag}</span>}
                </div>
              </button>
            ))}
            {filteredThreads.length === 0 && (
              <div className="text-faint fs-12" style={{ padding: 16 }}>No threads in this tab.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <div>
              <div className="card-title">{active.subject}</div>
              <div className="fs-11 text-faint">From <strong>{active.from}</strong> · order #{active.orderId} · {active.ch}</div>
            </div>
            {active.autoflag && <span className="pill pill-orange"><Icon name="alert-triangle" size={11}/> Pricing keyword detected → auto-redirected to <span className="mono">kundenservice@efactory1.de</span></span>}
          </div>
          <div className="card-pad flex-col gap-3" style={{ flex: 1, overflowY: 'auto' }}>
            {active.ch === 'voice' ? (
              // Metadata-only per PRD constraint — no transcript or translation
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="mic" size={14} className="text-muted"/>
                  <span className="fs-11 text-muted">Voicemail metadata · transcript not available by policy</span>
                </div>
                <div className="kv" style={{ fontSize: 12 }}>
                  <div className="kv-row"><dt>Duration</dt><dd className="mono">{active.voiceMeta?.duration || '—'}</dd></div>
                  <div className="kv-row"><dt>From</dt><dd className="mono">{active.voiceMeta?.from || active.from}</dd></div>
                  <div className="kv-row"><dt>Recorded at</dt><dd className="mono">{U.fmtDateTime(active.voiceMeta?.recordedAt || active.at)}</dd></div>
                  <div className="kv-row"><dt>Sentiment tag</dt><dd><span className="pill pill-amber">{active.sentiment}</span></dd></div>
                </div>
                <div className="banner info mt-2" style={{ fontSize: 11.5 }}>
                  <Icon name="lock" size={12}/>
                  <span>Audio playback and transcription are disabled. Reply by phone or email.</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="fs-11 text-muted mb-2">{U.fmtDateTime(active.at)} · {active.from}</div>
                <div className="fs-12">{active.last}</div>
              </div>
            )}
            {active.id === 'th-4' && (
              <div className="banner info">
                <Icon name="zap" size={14}/>
                <span>This message was auto-redirected. Berat → Kurt: "Für Fragen zu Zahlungen/Raten bitte kundenservice@efactory1.de — der GW darf darauf nicht antworten."</span>
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', padding: 12, background: 'var(--surface-2)' }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply…"
              aria-label="Reply"
              style={{ width: '100%', minHeight: 80, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}
            />
            <div className="flex justify-between mt-2">
              <div className="flex gap-1">
                <NotReady className="btn btn-sm" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={12}/></NotReady>
                <span className="chip">Auto-translate DE → EN: ON</span>
                <span className="chip">CC: kundenservice@efactory1.de</span>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={onSend} disabled={!reply.trim()}>
                <Icon name="send" size={12}/> Send via {active.ch}
              </button>
            </div>
          </div>
        </div>

        {/* AI assist pane — 3rd column per PRD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2"><Icon name="sparkles" size={14}/> AI assist</div>
            <span className="pill pill-blue" style={{ fontSize: 10 }}>Beta</span>
          </div>
          <div className="card-pad flex-col gap-3" style={{ flex: 1, overflowY: 'auto' }}>
            <div>
              <div className="fs-11 text-muted mb-1">Context summary</div>
              <div className="fs-12">{suggestions?.summary}</div>
            </div>
            <div>
              <div className="fs-11 text-muted mb-1">Suggested reply <span className="text-faint">· tone: {suggestions?.tone}</span></div>
              <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>{suggestions?.reply}</div>
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
                {suggestions?.actions?.includes('escalate') && (
                  <button type="button" className="btn btn-sm" onClick={onEscalate}><Icon name="alert-triangle" size={12}/> Escalate to admin</button>
                )}
                <button type="button" className="btn btn-sm" onClick={() => _toast({ text: 'Thread snoozed for 4h', tone: 'info' })}>
                  <Icon name="clock" size={12}/> Snooze 4h
                </button>
              </div>
            </div>
            <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11 }}>
              <Icon name="lock" size={12}/>
              <span>Suggestions are drafts only — review before sending. Pricing terms are auto-redirected and never sent to GWs.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


window.Inbox = Inbox;
})();
