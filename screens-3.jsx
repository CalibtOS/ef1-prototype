// AI BI Dashboard, Customer view, Tweaks panel
;(function(){
const { useState: useStateA, useEffect: useEffectA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const TS = window.EFU;
const TD = window.EF;

// ============ AI BI DASHBOARD ============
function AIBIDashboard() {
  const [prompt, setPrompt] = useStateA('');
  const [activePrompt, setActivePrompt] = useStateA(null);
  const [running, setRunning] = useStateA(false);

  const cannedPrompts = [
    {
      id: 'p1',
      q: 'Why is our pipeline funnel converting at 21.8%? Is that good?',
      reasoning: [
        'Loaded Pipedrive deals (last 90 days, n=421)',
        'Computed stage-to-stage drop-offs',
        'Joined to Sevdesk invoices for "Won" verification',
        'Compared to industry benchmark (academic services, EU)'
      ],
      answer: '21.8% (Anfrage → Won) is **above** the EU academic-services benchmark of 14–18%. The largest drop is **Qualifiziert → Rückmeldung (-37%)** — 32 leads went silent after first quote. Common pattern: leads asking about Bachelorarbeit > 60 pages with deadline < 2 weeks, where pricing factor jumps to 1.5×. Recommend: A/B-test a sub-quote ("staged delivery option") for these leads. Projected lift: +6 deals/month.',
      sources: ['Pipedrive (live)', 'Sevdesk (synced 2h ago)', 'Internal benchmarks doc']
    },
    {
      id: 'p2',
      q: 'Show me ghostwriters with declining quality. Who should I talk to?',
      reasoning: [
        'Pulled QA scores last 60 days (n=47 GWs, 184 submissions)',
        'Ran rolling 14-day average per GW',
        'Flagged GWs with 2+ consecutive declining periods',
        'Cross-referenced with revision-round counts and customer NPS'
      ],
      answer: '**3 ghostwriters** show statistically significant decline:\n\n1. **GW Anna König** — flagged today (AI score 87% on #3517). Already shadow-banned. Decision needed: terminate or 30-day probation?\n\n2. **GW Tomás Rodriguez** — avg revision rounds went from 1.2 → 2.1 over last 30 days. Customer NPS dropped from 8.4 → 6.7. **Possible cause:** took 4 jobs simultaneously last week. Recommend cap at 3.\n\n3. **GW Dr. Henrik Vogel** — slower deliveries (4 of 6 last jobs delivered within 12h of cutoff). Quality still ★4.6. **Action:** courtesy check-in.',
      sources: ['QA results table', 'Revision logs', 'Customer NPS post-delivery survey']
    },
    {
      id: 'p3',
      q: 'How much would I save if I increased GW rate from 40% to 45%?',
      reasoning: [
        'Loaded last 12 months of completed orders (n=1,247)',
        'Modeled GW retention curve from rate-change cohort data (n=23 GWs who switched tiers)',
        'Estimated reduction in GW churn → reduction in onboarding costs',
        'Computed net delta: lost margin vs. retention savings'
      ],
      answer: 'A 5pp rate increase would cost **−€38,200/year** in direct margin on current volume. However, modeled retention impact suggests:\n\n• GW churn drops from 18% → 11% (saves ~€14k in onboarding/training)\n• Avg jobs/GW/month rises 2.1 → 2.6 (more capacity, 7% more deals closable)\n• Top-quartile GW retention ↑12%\n\n**Net: −€18.4k to +€6.8k depending on volume growth**. Below 8% YoY growth, you lose money. Above, you gain. Recommend: pilot with top 10 GWs only first.',
      sources: ['Sevdesk (12mo)', 'GW table', 'Onboarding cost ledger', 'Industry retention curves']
    }
  ];

  const runPrompt = (p) => {
    setActivePrompt(p);
    setRunning(true);
    setTimeout(() => setRunning(false), 1600);
  };

  const askFreeForm = () => {
    if (!prompt.trim()) return;
    // Lightweight free-form ask: route through canned reasoning template
    const adhoc = {
      id: 'pad-' + Date.now(),
      q: prompt.trim(),
      reasoning: [
        'Parsed question and identified relevant data sources',
        'Pulled latest snapshot from Pipedrive + Sevdesk',
        'Computed initial pass; running consistency checks',
        'Drafted answer with cited sources',
      ],
      answer: 'I can sketch a directional answer here. Hooking into your live Pipedrive + Sevdesk data is required for a precise number — the canned prompts above show the kind of reasoning trace you can expect once the data layer is wired.',
      sources: ['Pipedrive (live)', 'Sevdesk', 'Internal benchmarks'],
    };
    runPrompt(adhoc);
    setPrompt('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Business Intelligence</h1>
          <div className="page-subtitle">Ask anything · queries Pipedrive, Sevdesk, internal data · Berat-only · audit-logged</div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-pad">
          <div className="flex gap-2 items-start">
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                placeholder="Ask in German or English: e.g. 'Welche Kundensegmente haben die höchste LTV?' or 'Why are revision rounds spiking this month?'"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askFreeForm(); } }}
                aria-label="Ask AI BI"
                style={{ width: '100%', minHeight: 70, border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', background: 'var(--surface)' }}
              />
              <div className="fs-11 text-faint mt-1">↩ to send · shift+enter for newline</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={askFreeForm} disabled={!prompt.trim() || running}><Icon name="zap" size={14}/> Ask</button>
          </div>

          <div className="mt-3">
            <div className="fs-11 text-muted mb-2">Or try one of these saved prompts:</div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {cannedPrompts.map(p => (
                <button key={p.id} className="chip" onClick={() => runPrompt(p)} style={{ padding: '8px 12px', fontSize: 12 }}>
                  <Icon name="zap" size={11}/> {p.q.length > 60 ? p.q.slice(0, 60) + '…' : p.q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activePrompt && (
        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-pad">
              <div className="fs-11 text-faint mb-1">Question</div>
              <div className="fs-14 strong">{activePrompt.q}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title flex items-center gap-2"><Icon name="zap" size={14}/> Reasoning trace</div>{running && <span className="text-faint fs-11">running…</span>}</div>
            <div className="card-pad flex-col gap-2">
              {activePrompt.reasoning.map((r, i) => (
                <div key={i} className="flex items-center gap-2 fs-12" style={{ opacity: running && i > 1 ? 0.4 : 1 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: running && i > 1 ? 'var(--surface-3)' : 'var(--green-soft)', color: running && i > 1 ? 'var(--text-3)' : 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {running && i > 1 ? <Icon name="dot" size={6}/> : <Icon name="check" size={11}/>}
                  </div>
                  <span className="text-muted">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {!running && (
            <>
              <div className="card" style={{ borderColor: 'color-mix(in oklab, var(--blue) 25%, var(--border))' }}>
                <div className="card-head"><div className="card-title">Answer</div></div>
                <div className="card-pad">
                  <div className="fs-13" style={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>{activePrompt.answer.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>)}</div>
                </div>
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="text-muted fs-11">Sources:</span>
                  {activePrompt.sources.map(s => <span key={s} className="chip" style={{ fontSize: 11 }}><Icon name="file-text" size={10}/> {s}</span>)}
                  <span style={{ flex: 1 }}/>
                  <NotReady className="btn btn-sm" feature="bi-save"><Icon name="bookmark" size={12}/> Save</NotReady>
                  <NotReady className="btn btn-sm" feature="bi-export"><Icon name="download" size={12}/> Export</NotReady>
                </div>
              </div>

              {activePrompt.id === 'p1' && (
                <div className="card">
                  <div className="card-head"><div className="card-title">Visualization</div></div>
                  <div className="card-pad">
                    <FunnelDropoff />
                  </div>
                </div>
              )}

              {activePrompt.id === 'p3' && (
                <div className="card">
                  <div className="card-head"><div className="card-title">Sensitivity table</div></div>
                  <div className="card-pad">
                    <table className="tbl" style={{ fontSize: 12 }}>
                      <thead><tr><th>YoY volume growth</th><th>Direct margin Δ</th><th>Retention savings</th><th>Net</th></tr></thead>
                      <tbody>
                        <tr><td>0%</td><td className="num mono" style={{color:'var(--red)'}}>−€38.2k</td><td className="num mono" style={{color:'var(--green)'}}>+€14.1k</td><td className="num mono strong" style={{color:'var(--red)'}}>−€24.1k</td></tr>
                        <tr><td>5%</td><td className="num mono" style={{color:'var(--red)'}}>−€38.2k</td><td className="num mono" style={{color:'var(--green)'}}>+€19.8k</td><td className="num mono strong" style={{color:'var(--red)'}}>−€18.4k</td></tr>
                        <tr style={{ background: 'color-mix(in oklab, var(--green) 4%, transparent)' }}><td><strong>10%</strong></td><td className="num mono" style={{color:'var(--red)'}}>−€38.2k</td><td className="num mono" style={{color:'var(--green)'}}>+€31.5k</td><td className="num mono strong" style={{color:'var(--green)'}}>+€6.8k</td></tr>
                        <tr><td>15%</td><td className="num mono" style={{color:'var(--red)'}}>−€38.2k</td><td className="num mono" style={{color:'var(--green)'}}>+€48.2k</td><td className="num mono strong" style={{color:'var(--green)'}}>+€20.0k</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FunnelDropoff() {
  const stages = [
    { name: 'Anfrage', pct: 100 },
    { name: 'Qualifiziert', pct: 60.5 },
    { name: 'Rückmeldung', pct: 38.0 },
    { name: 'Rechnung', pct: 26.7 },
    { name: 'Won', pct: 21.8 },
  ];
  return (
    <div className="flex-col gap-2">
      {stages.map((s, i) => {
        const drop = i > 0 ? ((stages[i-1].pct - s.pct) / stages[i-1].pct * 100) : 0;
        return (
          <div key={s.name} className="flex items-center gap-3">
            <div style={{ width: 130, fontSize: 12 }}>{s.name}</div>
            <div style={{ flex: 1, height: 26, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${s.pct}%`, height: '100%', background: i === 1 ? 'var(--red)' : 'var(--blue)', borderRadius: 4 }}/>
            </div>
            <div className="mono" style={{ width: 64, textAlign: 'right', fontSize: 12 }}>{s.pct.toFixed(1)}%</div>
            {drop > 0 && <div className="mono fs-11" style={{ width: 80, textAlign: 'right', color: drop > 30 ? 'var(--red)' : 'var(--text-3)' }}>−{drop.toFixed(1)}%</div>}
          </div>
        );
      })}
    </div>
  );
}

// ============ CUSTOMER PORTAL ============
// B2C portal — centered, internal tab nav. Demo persona resolves from shell.jsx
// ROLES (Antigona Berisha · c-ab). She has 2 real orders; we synthesize one
// mid-flight (interim awaiting feedback) so the portal can demo all states.

const CUST_PERSONA = (window.EFShell?.ROLES || []).find(r => r.id === 'customer') ||
  { user: 'Antigona Berisha', initials: 'AB', email: 'antigona.berisha@example.com' };
const CUST_ME = TD.CUSTOMERS.find(c => c.initials === CUST_PERSONA.initials) ||
  { id: 'c-demo', name: CUST_PERSONA.user, initials: CUST_PERSONA.initials, email: CUST_PERSONA.email };

const CUST_SYNTH_ORDERS = [{
  id: 3518, status: 'under_customer_review', customerId: CUST_ME.id,
  workType: 'bachelorarbeit',
  title: 'Strategisches Controlling im Maschinenbau',
  field: 'BWL', pages: 40,
  finalDeadline: '2026-05-22T18:00:00',
  interimDeadline: '2026-05-08T18:00:00',
  interim2Deadline: '2026-05-15T18:00:00',
  grossEur: 2360, gwId: 'gw-mp', acceptedAt: '2026-04-01',
  paidEur: 1180, outstandingEur: 1180,
  installments: [
    { n: 1, amt: 1180, status: 'paid',      date: '2026-04-01', method: 'stripe_card' },
    { n: 2, amt: 1180, status: 'scheduled', date: '2026-05-15', method: 'stripe_card' },
  ],
  revisionRounds: 0,
  customerNote: 'Fokus auf Industrie-4.0-Kennzahlen; Fallbeispiel Bosch.',
}];

function custOrders() {
  const real = TD.liveOrders().filter(o => o.customerId === CUST_ME.id);
  return [...CUST_SYNTH_ORDERS, ...real].sort((a, b) => {
    const ra = a.status === 'completed' ? 1 : 0;
    const rb = b.status === 'completed' ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return new Date(b.finalDeadline) - new Date(a.finalDeadline);
  });
}

function custStatusMeta(o) {
  const s = o.status;
  if (s === 'completed' || s === 'delivered' || s === 'payment_pending')
    return { color: 'green', label: 'Abgeschlossen', icon: 'check-circle' };
  if (s === 'available' || s === 'qualified' || s === 'invoice_sent' || s === 'claimed_pending_approval')
    return { color: 'cyan', label: 'GW-Suche läuft', icon: 'search' };
  if (s === 'cancelled') return { color: 'red', label: 'Storniert', icon: 'x-circle' };
  if (s === 'on_hold') return { color: 'amber', label: 'Pausiert', icon: 'pause' };
  if (s === 'interim_submitted' || s === 'under_customer_review')
    return { color: 'blue', label: 'Zwischenstand prüfen', icon: 'eye' };
  if (s === 'revision_required')
    return { color: 'orange', label: 'Überarbeitung läuft', icon: 'rotate-ccw' };
  if (s === 'final_submitted' || s === 'qa_review')
    return { color: 'purple', label: 'Qualitätsprüfung', icon: 'shield-check' };
  if (s === 'ai_violation_review')
    return { color: 'amber', label: 'In Prüfung', icon: 'shield-check' };
  return { color: 'blue', label: 'In Bearbeitung', icon: 'package' };
}

function custProgress(o) {
  const s = o.status;
  if (s === 'completed' || s === 'delivered' || s === 'payment_pending') return 100;
  if (s === 'cancelled') return 0;
  if (s === 'available' || s === 'qualified' || s === 'invoice_sent') return 5;
  if (s === 'claimed_pending_approval') return 12;
  if (s === 'active') return 35;
  if (s === 'interim_submitted' || s === 'under_customer_review') return 55;
  if (s === 'revision_required') return 50;
  if (s === 'final_submitted') return 80;
  if (s === 'qa_review') return 90;
  if (s === 'on_hold') return 20;
  return 30;
}

function custGwLabel(o) {
  if (!o.gwId) return null;
  const gw = TD.gw(o.gwId);
  if (!gw) return null;
  const parts = (gw.name || '').split(' ');
  const first = parts[0] || '';
  const lastInit = parts[1] ? parts[1][0] + '.' : '';
  return (first + ' ' + lastInit).trim();
}

function CustHeader({ tab, setTab, role, setRole }) {
  const [open, setOpen] = useStateA(false);
  const tabs = [
    { id: 'orders', label: 'Meine Aufträge', icon: 'package' },
    { id: 'messages', label: 'Nachrichten', icon: 'message-square' },
    { id: 'invoices', label: 'Rechnungen', icon: 'file-text' },
    { id: 'downloads', label: 'Downloads', icon: 'download' },
    { id: 'profile', label: 'Profil', icon: 'user' },
  ];
  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 700, letterSpacing: -0.5, fontSize: 22 }}>
          e<span style={{ color: 'var(--blue)' }}>factory</span>
          <span style={{ fontSize: 14, color: 'var(--text-2)' }}>1</span>
        </div>
        <span style={{ flex: 1 }}/>
        <div style={{ position: 'relative' }}>
          <div onClick={() => setOpen(!open)} className="role-switcher" style={{ cursor: 'pointer' }}>
            <Avatar initials={CUST_PERSONA.initials} size={26} tone="blue"/>
            <div className="flex-col" style={{ lineHeight: 1.2 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Angemeldet als</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{CUST_PERSONA.user}</span>
            </div>
            <Icon name="chevron-down" size={14} className="text-faint"/>
          </div>
          {open && setRole && (
            <div style={{ position: 'absolute', top: 40, right: 0, width: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>Demo persona wechseln</div>
              {(window.EFShell?.ROLES || []).map(r => (
                <div key={r.id} onClick={() => { setRole(r.id); setOpen(false); }} style={{ padding: '9px 12px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onMouseEnter={(e)=>e.currentTarget.style.background='var(--surface-2)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                  <Avatar initials={r.initials} size={24} tone={r.id === role ? 'blue' : 'neutral'}/>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.2 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{r.user}</span>
                  </div>
                  {r.id === role && <Icon name="check" size={12} className="text-faint"/>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4, marginTop: 12 }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 14px', borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
            color: tab === t.id ? 'var(--text)' : 'var(--text-2)', fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1,
          }}>
            <Icon name={t.icon} size={14}/>{t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustFooterBanner() {
  return (
    <div className="banner info" style={{ marginTop: 24 }}>
      <Icon name="lock" size={14}/>
      <span>
        <strong>efactory1 ist Ihre Vertragspartnerin.</strong> Alle Zahlungen, Korrespondenz und Lieferungen laufen über diese Plattform — auch wenn Sie direkt mit Ihrem Ghostwriter chatten. Finanzfragen werden automatisch an <span className="mono">kundenservice@efactory1.de</span> weitergeleitet.
      </span>
    </div>
  );
}

function CustOrderCard({ o, onOpen }) {
  const meta = custStatusMeta(o);
  const progress = custProgress(o);
  const gw = custGwLabel(o);
  const dl = TS.deadlineMeta(o.finalDeadline);
  const wt = TD.WORK_TYPE_LABELS[o.workType] || o.workType;
  const isComplete = progress >= 100;

  let nextMs = null;
  if (o.status === 'available' || o.status === 'qualified' || o.status === 'claimed_pending_approval') {
    nextMs = { label: 'GW-Zuweisung', date: '2026-05-09' };
  } else if (o.status === 'active' && o.interimDeadline) {
    nextMs = { label: 'Zwischenstand 1', date: o.interimDeadline };
  } else if (o.status === 'interim_submitted' || o.status === 'under_customer_review') {
    nextMs = { label: 'Ihr Feedback', date: null };
  } else if (o.status === 'revision_required') {
    nextMs = { label: 'Überarbeitete Version', date: null };
  } else if (o.status === 'final_submitted' || o.status === 'qa_review') {
    nextMs = { label: 'QA-Freigabe', date: null };
  }

  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'border-color .15s' }}
      onClick={() => onOpen()}
      onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--border-strong)'}
      onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border)'}
    >
      <div className="card-pad">
        <div className="flex items-center gap-2 mb-2">
          <span className="mono fs-11 text-faint">#{o.id}</span>
          <span className={`pill pill-${meta.color}`}><Icon name={meta.icon} size={10}/> {meta.label}</span>
          {o.disputeOpen && <span className="pill pill-red" style={{ fontSize: 10 }}><Icon name="alert-triangle" size={9}/> Streitfall offen</span>}
          <span style={{ flex: 1 }}/>
          <span className={`fs-11 ${dl.tone === 'danger' ? 'text-danger' : 'text-muted'}`}>
            {isComplete ? 'Geliefert' : 'Fällig'} {TS.fmtDate(o.finalDeadline)}
          </span>
        </div>

        <div className="strong" style={{ fontSize: 15.5, lineHeight: 1.35 }}>{wt} · {o.title}</div>
        <div className="text-muted fs-12 mt-1">
          {gw ? (
            <>Ihr Ghostwriter: <strong>{gw}</strong> <span className="text-faint">(anonymisiert · Kontakt nur über die Plattform)</span></>
          ) : (
            <span className="text-faint">Wir suchen den passenden Ghostwriter — typischerweise innerhalb von 24h zugewiesen.</span>
          )}
        </div>

        <div className="mt-3" style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: isComplete ? 'var(--green)' : 'var(--blue)', transition: 'width .3s' }}/>
        </div>
        <div className="flex justify-between fs-11 mt-1">
          <span className="text-faint">{progress}% Fortschritt</span>
          {nextMs && (
            <span className="text-muted">
              Nächster Meilenstein: <strong>{nextMs.label}</strong>{nextMs.date && <> am {TS.fmtDate(nextMs.date)}</>}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm" onClick={(e)=>{e.stopPropagation();onOpen('messages');}}>
            <Icon name="message-square" size={12}/> Mit GW chatten
          </button>
          <button type="button" className="btn btn-sm" onClick={(e)=>{e.stopPropagation();onOpen('files');}}>
            <Icon name="file-text" size={12}/> Dokumente
          </button>
          <button type="button" className="btn btn-sm" onClick={(e)=>{e.stopPropagation();onOpen('payments');}}>
            <Icon name="wallet" size={12}/> Zahlungen
          </button>
          {(o.status === 'interim_submitted' || o.status === 'under_customer_review') && (
            <button type="button" className="btn btn-sm btn-primary" onClick={(e)=>{e.stopPropagation();onOpen('files');}}>
              <Icon name="eye" size={12}/> Zwischenstand prüfen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustOrdersList({ openOrder }) {
  const orders = custOrders();
  const active = orders.filter(o => custProgress(o) < 100);
  const done = orders.filter(o => custProgress(o) >= 100);
  const firstName = (CUST_PERSONA.user || '').split(' ')[0];

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6, margin: '24px 0 6px' }}>Hallo {firstName} 👋</h1>
      <div className="text-muted mb-4">Ihre laufenden und abgeschlossenen Aufträge</div>

      {active.length > 0 && (
        <>
          <div className="text-faint fs-11" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Aktiv ({active.length})
          </div>
          <div className="flex-col gap-3 mb-4">
            {active.map(o => <CustOrderCard key={o.id} o={o} onOpen={(t)=>openOrder(o.id, t)}/>)}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="text-faint fs-11" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, marginTop: 8 }}>
            Abgeschlossen ({done.length})
          </div>
          <div className="flex-col gap-3">
            {done.map(o => <CustOrderCard key={o.id} o={o} onOpen={(t)=>openOrder(o.id, t)}/>)}
          </div>
        </>
      )}

      {orders.length === 0 && (
        <div className="card"><div className="card-pad text-center text-muted">Noch keine Aufträge.</div></div>
      )}

      <CustFooterBanner/>
    </div>
  );
}

function CustOrderStatus({ o }) {
  const progress = custProgress(o);
  const meta = custStatusMeta(o);

  const milestones = [
    { id: 'placed',  label: 'Auftrag platziert',          date: o.acceptedAt || '2026-04-01', icon: 'package' },
    { id: 'paid1',   label: 'Anzahlung erhalten',         date: o.installments?.[0]?.status === 'paid' ? o.installments?.[0]?.date : null, icon: 'wallet' },
    { id: 'gw',      label: 'Ghostwriter zugewiesen',     date: o.gwId ? o.acceptedAt : null, icon: 'user' },
    { id: 'interim', label: 'Zwischenstand 1',            date: o.interimDeadline, icon: 'upload-cloud', deadline: true },
    o.interim2Deadline ? { id: 'interim2', label: 'Zwischenstand 2', date: o.interim2Deadline, icon: 'upload-cloud', deadline: true } : null,
    { id: 'final',   label: 'Endabgabe',                  date: o.finalDeadline, icon: 'shield-check', deadline: true },
    { id: 'qa',      label: 'efactory1 Qualitätsprüfung', date: null, icon: 'shield' },
    { id: 'done',    label: 'Geliefert',                  date: o.completedAt, icon: 'check-circle' },
  ].filter(Boolean);

  const stepIndex = (() => {
    if (progress >= 100) return milestones.length;
    if (o.status === 'qa_review' || o.status === 'final_submitted') return milestones.findIndex(m => m.id === 'qa');
    if (o.status === 'revision_required' || o.status === 'interim_submitted' || o.status === 'under_customer_review') return milestones.findIndex(m => m.id === 'final');
    if (o.status === 'active') return milestones.findIndex(m => m.id === 'interim');
    if (o.gwId) return milestones.findIndex(m => m.id === 'interim');
    if (o.installments?.[0]?.status === 'paid') return milestones.findIndex(m => m.id === 'gw');
    return 1;
  })();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Fortschritt</div>
          <span className="mono fs-11 text-faint">{progress}%</span>
        </div>
        <div className="card-pad">
          <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? 'var(--green)' : 'var(--blue)', transition: 'width .3s' }}/>
          </div>

          <div className="timeline">
            {milestones.map((m, i) => {
              const done   = i < stepIndex;
              const active = i === stepIndex;
              const tone = done ? 'green' : (active ? 'blue' : '');
              return (
                <div key={m.id} className="timeline-item" style={{ opacity: !done && !active ? 0.55 : 1 }}>
                  <div className={`timeline-dot ${tone}`}>
                    {done ? <Icon name="check" size={10}/> : <Icon name={m.icon} size={10}/>}
                  </div>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.3, paddingTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{m.label}</span>
                    {m.date && (
                      <span className="text-faint fs-11">
                        {m.deadline && !done ? `Frist ${TS.fmtDate(m.date)}` : TS.fmtDate(m.date)}
                        {active && m.deadline && <> · {TS.deadlineMeta(m.date).label}</>}
                      </span>
                    )}
                    {!m.date && active && <span className="text-faint fs-11">In Bearbeitung</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-col gap-3">
        <div className="card">
          <div className="card-head"><div className="card-title">Aktueller Stand</div></div>
          <div className="card-pad">
            <span className={`pill pill-${meta.color}`} style={{ fontSize: 12 }}><Icon name={meta.icon} size={11}/> {meta.label}</span>
            <div className="text-muted fs-12 mt-3" style={{ lineHeight: 1.5 }}>
              {o.status === 'available' || o.status === 'qualified' || o.status === 'invoice_sent' ?
                'Ihre Anzahlung ist eingegangen. Wir suchen aktuell den passenden Ghostwriter mit Expertise in Ihrem Fachgebiet — Zuweisung erfolgt typischerweise innerhalb von 24 Stunden.' :
                o.status === 'claimed_pending_approval' ?
                'Ein Ghostwriter hat Ihren Auftrag angenommen. Berat prüft die Eignung — Sie erhalten in Kürze eine Bestätigung.' :
                o.status === 'active' ?
                'Ihr Ghostwriter arbeitet aktuell an der Ausarbeitung. Der erste Zwischenstand ist für ' + TS.fmtDate(o.interimDeadline) + ' geplant.' :
                o.status === 'interim_submitted' || o.status === 'under_customer_review' ?
                'Ein Zwischenstand wurde hochgeladen. Bitte prüfen Sie ihn im Tab „Dokumente" und geben Sie Ihrem Ghostwriter Feedback.' :
                o.status === 'revision_required' ?
                'Ihr Ghostwriter überarbeitet die Arbeit gemäß Ihrem Feedback (Runde ' + (o.revisionRounds || 1) + ').' :
                o.status === 'final_submitted' || o.status === 'qa_review' ?
                'Die Endversion wird derzeit vom efactory1 QA-Team auf Plagiat, KI-Nutzung und Formatierung geprüft.' :
                o.status === 'completed' || o.status === 'delivered' || o.status === 'payment_pending' ?
                'Ihre Arbeit wurde erfolgreich geliefert. Die Endrechnung finden Sie im Tab „Zahlungen".' :
                'Ihr Auftrag wird bearbeitet.'}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Eckdaten</div></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>Art der Arbeit</dt><dd>{TD.WORK_TYPE_LABELS[o.workType]}</dd></div>
              <div className="kv-row"><dt>Fachgebiet</dt><dd>{o.field}</dd></div>
              <div className="kv-row"><dt>Umfang</dt><dd className="mono">{o.pages} Seiten</dd></div>
              <div className="kv-row"><dt>Gesamtpreis</dt><dd className="mono">{TS.EUR(o.grossEur)}</dd></div>
              <div className="kv-row"><dt>Endabgabe</dt><dd className="mono">{TS.fmtDate(o.finalDeadline)}</dd></div>
              {o.customerNote && <div className="kv-row"><dt>Notiz</dt><dd style={{ fontSize: 11.5, fontStyle: 'italic' }}>{o.customerNote}</dd></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderChat({ o, toast }) {
  const [text, setText] = useStateA('');
  const [draftFlag, setDraftFlag] = useStateA(null);

  const baseConv = [
    { from: 'gw',       at: '2026-04-02T09:14:00', text: 'Guten Tag und vielen Dank für Ihren Auftrag! Ich freue mich auf die Zusammenarbeit. Senden Sie mir bitte das Briefing-Dokument und ggf. relevante Vorlesungsfolien.' },
    { from: 'customer', at: '2026-04-02T18:42:00', text: 'Hallo! Anbei das Briefing und die Folien. Schwerpunkt soll auf praxisnahen Beispielen aus dem Maschinenbau liegen.' },
    { from: 'gw',       at: '2026-04-08T11:02:00', text: 'Outline ist fertig. Ich habe sie über die Plattform unter „Dokumente" hochgeladen — bitte schauen Sie es sich an.' },
    { from: 'customer', at: '2026-04-09T10:15:00', text: 'Outline passt — bitte mit Kapitel 3 weitermachen.' },
    { from: 'gw',       at: '2026-05-06T15:30:00', text: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.' },
  ];
  if (o.status === 'completed') {
    baseConv.push(
      { from: 'customer', at: '2026-04-10T16:00:00', text: 'Vielen Dank! Bin sehr zufrieden mit der finalen Version.' },
      { from: 'platform', at: '2026-04-12T10:30:00', text: '✓ Endabgabe geliefert · QA bestanden · Auftrag abgeschlossen.' }
    );
  }
  if (o.status === 'available' || o.status === 'qualified' || o.status === 'invoice_sent') {
    baseConv.length = 0;
    baseConv.push({ from: 'platform', at: o.acceptedAt || '2026-05-05T14:00:00', text: 'Anzahlung erhalten · Ghostwriter-Suche gestartet · Sie werden benachrichtigt sobald ein passender GW zugewiesen ist.' });
  }

  const detectFinancial = (txt) => /preis|kosten|rabatt|nachlass|raten|geld|honorar|bezahl|rechnung|euro|€/i.test(txt);
  const onChange = (v) => { setText(v); setDraftFlag(detectFinancial(v) ? 'financial' : null); };
  const onSend = () => {
    if (!text.trim()) return;
    if (draftFlag === 'financial') {
      toast && toast({ tone: 'info', text: 'Finanzfrage erkannt — automatisch an kundenservice@efactory1.de weitergeleitet.' });
    } else {
      toast && toast({ tone: 'success', text: 'Nachricht gesendet · efactory1 in CC' });
    }
    setText(''); setDraftFlag(null);
  };
  const isLocked = !o.gwId;
  const gwLabel = custGwLabel(o) || 'GW';
  const gwInits = gwLabel.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-head">
          <div className="card-title">Konversation mit Ihrem Ghostwriter</div>
          <span className="text-faint fs-11">{baseConv.length} Nachrichten</span>
        </div>
        <div className="banner info" style={{ margin: 12, fontSize: 11.5 }}>
          <Icon name="lock" size={12}/>
          <span>Auto-CC: jede Nachricht geht zusätzlich an <span className="mono">kundenservice@efactory1.de</span>. Finanzfragen werden automatisch umgeleitet.</span>
        </div>

        <div style={{ flex: 1, padding: '4px 16px 16px', overflowY: 'auto', maxHeight: 480 }}>
          {baseConv.length === 0 && (
            <div className="text-muted text-center fs-12" style={{ padding: 32 }}>Noch keine Nachrichten.</div>
          )}
          {baseConv.map((m, i) => {
            const mine = m.from === 'customer';
            const sys  = m.from === 'platform';
            if (sys) return (
              <div key={i} className="text-center" style={{ margin: '12px 0' }}>
                <span className="pill pill-slate" style={{ fontSize: 11 }}>{m.text}</span>
                <div className="text-faint fs-11 mt-1">{TS.fmtDateTime(m.at)}</div>
              </div>
            );
            return (
              <div key={i} className="cust-msg" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {!mine && <Avatar initials={gwInits} size={28} tone="blue"/>}
                <div className="cust-msg-bubble" data-mine={mine ? '1' : '0'}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  <div className="cust-msg-meta">{mine ? 'Sie' : gwLabel} · {TS.fmtDateTime(m.at)}</div>
                </div>
                {mine && <Avatar initials={CUST_PERSONA.initials} size={28} tone="blue"/>}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
          {draftFlag === 'financial' && (
            <div className="banner warn mb-2" style={{ fontSize: 11.5 }}>
              <Icon name="alert-triangle" size={12}/>
              <span><strong>Finanz-Schlüsselwort erkannt.</strong> Diese Nachricht wird automatisch an <span className="mono">kundenservice@efactory1.de</span> weitergeleitet — Ihr Ghostwriter darf keine Preisfragen beantworten.</span>
            </div>
          )}
          {isLocked ? (
            <div className="text-muted text-center fs-12" style={{ padding: 12 }}>
              Chat wird aktiviert, sobald Ihnen ein Ghostwriter zugewiesen ist.
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                style={{ flex: 1, minHeight: 64, resize: 'vertical', padding: 10, fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }}
                placeholder="Nachricht an Ihren Ghostwriter…"
                value={text}
                onChange={(e)=>onChange(e.target.value)}
              />
              <div className="flex-col gap-1">
                <NotReady className="btn btn-sm" ariaLabel="Datei anhängen" feature="attach-file"><Icon name="paperclip" size={12}/></NotReady>
                <button type="button" className="btn btn-sm btn-primary" onClick={onSend} disabled={!text.trim()}>
                  <Icon name="send" size={12}/> Senden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-col gap-3">
        <div className="card">
          <div className="card-head"><div className="card-title">Kommunikationsregeln</div></div>
          <div className="card-pad">
            <ul className="text-muted fs-12" style={{ paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
              <li>Antwortzeit: 24 Stunden</li>
              <li>Keine Preis- oder Honorarverhandlungen mit dem GW</li>
              <li>efactory1 ist immer in CC — auch bei Direktchat</li>
              <li>Voll-Anonymität: GW-Realnamen werden nie geteilt</li>
              <li>Eskalation: <span className="mono">kundenservice@efactory1.de</span></li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Schnellzugriff</div></div>
          <div className="card-pad flex-col gap-2">
            <NotReady className="btn btn-sm" feature="report-dispute" style={{ justifyContent: 'flex-start' }}><Icon name="alert-triangle" size={12}/> Streitfall melden</NotReady>
            <NotReady className="btn btn-sm" feature="request-callback" style={{ justifyContent: 'flex-start' }}><Icon name="phone" size={12}/> Rückruf anfordern</NotReady>
            <a className="btn btn-sm" href="mailto:kundenservice@efactory1.de" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}><Icon name="mail" size={12}/> kundenservice@efactory1.de</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderFiles({ o, toast }) {
  const baseFiles = [
    { id: 'f-brief', kind: 'briefing', name: `${o.workType}_Briefing.pdf`, size: 184021, uploadedBy: 'customer', at: o.acceptedAt || '2026-04-01', icon: 'file-text' },
    { id: 'f-folien', kind: 'briefing', name: 'Vorlesungsfolien_Materialien.zip', size: 4182993, uploadedBy: 'customer', at: o.acceptedAt || '2026-04-01', icon: 'archive' },
  ];
  if (['active','interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','completed'].includes(o.status)) {
    baseFiles.push({ id: 'f-outline', kind: 'gw_doc', name: 'Outline_Gliederung_v2.docx', size: 92341, uploadedBy: 'gw', at: '2026-04-08T11:02:00', icon: 'file-text' });
  }
  if (['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','completed'].includes(o.status)) {
    baseFiles.push({ id: 'f-int1', kind: 'interim', name: `Zwischenstand_1_${o.workType}.docx`, size: 1281022, uploadedBy: 'gw', at: '2026-05-06T15:30:00', icon: 'upload-cloud', qaPassed: true });
  }
  if (['completed','payment_pending','delivered'].includes(o.status)) {
    baseFiles.push(
      { id: 'f-final', kind: 'final', name: `Endversion_${o.workType}_v1.pdf`, size: 2891044, uploadedBy: 'gw', at: '2026-04-10T18:00:00', icon: 'shield-check', qaPassed: true },
      { id: 'f-invoice', kind: 'invoice', name: `Rechnung_${o.id}.pdf`, size: 84201, uploadedBy: 'platform', at: '2026-04-12T08:00:00', icon: 'file-text' }
    );
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes/1024).toFixed(0) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
  };
  const kindLabels = { briefing: 'Briefing', gw_doc: 'GW-Dokument', interim: 'Zwischenstand', final: 'Endversion', invoice: 'Rechnung' };
  const kindPills  = { briefing: 'slate', gw_doc: 'blue', interim: 'teal', final: 'purple', invoice: 'amber' };
  const gwLabel = custGwLabel(o) || 'GW';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Dokumente · {baseFiles.length}</div>
          <button type="button" className="btn btn-sm" onClick={()=>toast&&toast({tone:'info',text:'Datei-Upload wird simuliert.'})}>
            <Icon name="upload-cloud" size={12}/> Hochladen
          </button>
        </div>
        <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
          {baseFiles.map(f => (
            <div key={f.id} className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.icon} size={16} className="text-faint"/>
              </div>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="strong fs-12.5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span className={`pill pill-${kindPills[f.kind]}`} style={{ fontSize: 10 }}>{kindLabels[f.kind]}</span>
                  {f.qaPassed && <span className="pill pill-green" style={{ fontSize: 10 }}><Icon name="shield-check" size={9}/> QA bestanden</span>}
                </div>
                <span className="text-faint fs-11">
                  {f.uploadedBy === 'customer' ? 'Sie' : f.uploadedBy === 'gw' ? gwLabel : 'efactory1'} ·
                  {' '}{formatSize(f.size)} · {TS.fmtDateTime(f.at)}
                </span>
              </div>
              <NotReady className="btn btn-sm" ariaLabel="Vorschau" feature="file-preview"><Icon name="eye" size={12}/></NotReady>
              <button type="button" className="btn btn-sm btn-primary" title="Herunterladen" onClick={()=>toast&&toast({tone:'success',text:`${f.name} wird heruntergeladen.`})}>
                <Icon name="download" size={12}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-col gap-3">
        {(o.status === 'interim_submitted' || o.status === 'under_customer_review') && (
          <div className="card">
            <div className="card-head"><div className="card-title">Feedback geben</div></div>
            <div className="card-pad">
              <div className="text-muted fs-12 mb-3">Der Zwischenstand wartet auf Ihre Rückmeldung. Wählen Sie eine der Optionen:</div>
              <div className="flex-col gap-2">
                <button type="button" className="btn btn-success btn-sm" onClick={()=>toast&&toast({tone:'success',text:'Zwischenstand freigegeben — Endabgabe wird vorbereitet.'})}>
                  <Icon name="check" size={12}/> Zwischenstand freigeben
                </button>
                <button type="button" className="btn btn-sm" onClick={()=>toast&&toast({tone:'info',text:'Überarbeitungsanfrage an GW gesendet.'})}>
                  <Icon name="rotate-ccw" size={12}/> Überarbeitung anfordern
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={()=>toast&&toast({tone:'danger',text:'Streitfall gemeldet — Berat prüft.'})}>
                  <Icon name="alert-triangle" size={12}/> Streitfall melden
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-head"><div className="card-title">Was ist QA?</div></div>
          <div className="card-pad text-muted fs-12" style={{ lineHeight: 1.6 }}>
            Jede Endversion durchläuft unsere unabhängige Qualitätsprüfung — geprüft werden Plagiat, KI-Nutzung und Formatierung. Erst nach erfolgreicher QA wird Ihnen die Endversion freigegeben.
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderPayments({ o }) {
  const installments = o.installments || [];
  const totalPaid = (o.paidEur || 0);
  const totalGross = (o.grossEur || 0);
  const outstanding = Math.max(0, totalGross - totalPaid);

  const methodLabel = (m) => ({
    stripe_card: 'Kreditkarte', stripe_klarna: 'Klarna', stripe_paypal: 'PayPal', bank_transfer_sepa: 'SEPA-Überweisung',
  })[m] || (m || 'Stripe');
  const statusPill = (s) => ({
    paid: { c: 'green', l: 'Bezahlt' },
    scheduled: { c: 'slate', l: 'Geplant' },
    overdue: { c: 'red', l: 'Überfällig' },
    pending: { c: 'amber', l: 'Ausstehend' },
  })[s] || { c: 'slate', l: s };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Ratenplan · {installments.length} Raten</div>
          <span className="text-faint fs-11">Gesamt {TS.EUR(totalGross)}</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Datum</th>
                <th>Methode</th>
                <th style={{ textAlign: 'right' }}>Betrag</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Rechnung</th>
              </tr>
            </thead>
            <tbody>
              {installments.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 24 }}>Noch keine Raten geplant.</td></tr>
              ) : installments.map(inst => {
                const sp = statusPill(inst.status);
                return (
                  <tr key={inst.n}>
                    <td className="mono fs-11">#{inst.n}</td>
                    <td className="mono fs-12">{TS.fmtDate(inst.date)}</td>
                    <td className="text-muted fs-12">{methodLabel(inst.method)}</td>
                    <td className="mono fs-13" style={{ textAlign: 'right', fontWeight: 500 }}>{TS.EUR(inst.amt)}</td>
                    <td><span className={`pill pill-${sp.c}`} style={{ fontSize: 11 }}>{sp.l}</span></td>
                    <td>
                      {inst.status === 'paid' ? (
                        <NotReady className="btn btn-sm" feature="invoice-pdf" style={{ width: '100%' }}><Icon name="download" size={11}/> PDF</NotReady>
                      ) : inst.status === 'overdue' ? (
                        <NotReady className="btn btn-sm btn-danger" feature="invoice-pay" style={{ width: '100%' }}><Icon name="alert-triangle" size={11}/> Jetzt zahlen</NotReady>
                      ) : <span className="text-faint fs-11">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex-col gap-3">
        <div className="card">
          <div className="card-head"><div className="card-title">Übersicht</div></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>Gesamtpreis</dt><dd className="mono">{TS.EUR(totalGross)}</dd></div>
              <div className="kv-row"><dt>Bezahlt</dt><dd className="mono" style={{ color: 'var(--green)' }}>{TS.EUR(totalPaid)}</dd></div>
              <div className="kv-row"><dt>Offen</dt><dd className="mono" style={{ color: outstanding > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{TS.EUR(outstanding)}</dd></div>
            </div>
            <div className="mt-3" style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${totalGross ? (totalPaid/totalGross)*100 : 0}%`, height: '100%', background: 'var(--green)' }}/>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Hinweis</div></div>
          <div className="card-pad text-muted fs-12" style={{ lineHeight: 1.6 }}>
            Alle Rechnungen werden über <strong>Sevdesk</strong> ausgestellt. Bei Fragen zu Zahlungen wenden Sie sich an <span className="mono">kundenservice@efactory1.de</span> — Ihr Ghostwriter darf keine finanziellen Themen besprechen.
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderDetail({ orderId, initialTab, onBack, toast }) {
  const [tab, setTab] = useStateA(initialTab || 'status');
  const all = custOrders();
  const o = all.find(x => x.id === orderId);
  if (!o) {
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-pad text-center">
          <div className="text-muted">Auftrag #{orderId} nicht gefunden.</div>
          <button type="button" className="btn mt-3" onClick={onBack}><Icon name="chevron-left" size={12}/> Zurück</button>
        </div>
      </div>
    );
  }
  const meta = custStatusMeta(o);
  const gw = custGwLabel(o);
  const wt = TD.WORK_TYPE_LABELS[o.workType] || o.workType;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3" style={{ marginTop: 24 }}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
          <Icon name="chevron-left" size={12}/> Alle Aufträge
        </button>
        <span style={{ flex: 1 }}/>
        <span className={`pill pill-${meta.color}`}><Icon name={meta.icon} size={11}/> {meta.label}</span>
      </div>

      <div className="flex items-baseline gap-2" style={{ marginBottom: 6 }}>
        <span className="mono fs-13 text-faint">#{o.id}</span>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, margin: 0 }}>{wt} · {o.title}</h1>
      </div>
      <div className="text-muted fs-13" style={{ marginBottom: 14 }}>
        {o.field} · {o.pages} Seiten · Endabgabe {TS.fmtDate(o.finalDeadline)}
        {gw && <> · GW <strong>{gw}</strong></>}
      </div>

      <div className="tabs" style={{ marginTop: 12 }}>
        {[
          { id: 'status',   label: 'Status & Meilensteine', icon: 'clock' },
          { id: 'messages', label: 'Nachrichten',            icon: 'message-square' },
          { id: 'files',    label: 'Dokumente',              icon: 'file-text' },
          { id: 'payments', label: 'Zahlungen',              icon: 'wallet' },
        ].map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={12}/> {t.label}
          </div>
        ))}
      </div>

      {tab === 'status'   && <CustOrderStatus o={o}/>}
      {tab === 'messages' && <CustOrderChat o={o} toast={toast}/>}
      {tab === 'files'    && <CustOrderFiles o={o} toast={toast}/>}
      {tab === 'payments' && <CustOrderPayments o={o}/>}

      <CustFooterBanner/>
    </div>
  );
}

function CustMessagesList({ openOrder }) {
  const orders = custOrders().filter(o => o.gwId);
  const snippets = {
    3518: { from: 'gw',       msg: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.', at: '2026-05-06T15:30:00', unread: 1 },
    3492: { from: 'platform', msg: '✓ Endabgabe geliefert · Auftrag abgeschlossen.', at: '2026-04-12T10:30:00', unread: 0 },
  };
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Nachrichten</h1>
      <div className="text-muted mb-4">Eine Konversation pro Auftrag · efactory1 immer in CC</div>

      <div className="banner info mb-3">
        <Icon name="lock" size={14}/>
        <span>Direktnachrichten an Ihren Ghostwriter laufen über die Plattform. Finanzfragen werden automatisch an <span className="mono">kundenservice@efactory1.de</span> weitergeleitet.</span>
      </div>

      {orders.length === 0 ? (
        <div className="card"><div className="card-pad text-center text-muted">Noch keine Konversationen — Ihre Aufträge warten auf GW-Zuweisung.</div></div>
      ) : (
        <div className="card">
          <div className="flex-col">
            {orders.map((o, i) => {
              const sn = snippets[o.id] || { from: 'platform', msg: 'Konversation öffnen…', at: o.acceptedAt, unread: 0 };
              const gw = custGwLabel(o);
              const wt = TD.WORK_TYPE_LABELS[o.workType];
              const initials = gw ? gw.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase() : '··';
              return (
                <div key={o.id} className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={()=>openOrder(o.id, 'messages')}>
                  <Avatar initials={initials} size={36} tone="blue"/>
                  <div className="flex-col" style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                    <div className="flex items-center gap-2">
                      <span className="strong fs-13">{gw || 'GW-Suche'}</span>
                      <span className="mono fs-11 text-faint">#{o.id}</span>
                      <span className="text-faint fs-11">· {wt}</span>
                      {sn.unread > 0 && <span className="pill pill-red" style={{ fontSize: 10 }}>{sn.unread} neu</span>}
                    </div>
                    <span className="text-faint fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 600 }}>
                      {sn.from === 'customer' && <span className="text-faint">Sie: </span>}
                      {sn.from === 'platform' && <span className="text-faint" style={{ fontStyle: 'italic' }}>System: </span>}
                      {sn.msg}
                    </span>
                  </div>
                  <span className="text-faint fs-11 mono">{TS.relTime(sn.at)}</span>
                  <Icon name="chevron-right" size={14} className="text-faint"/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CustFooterBanner/>
    </div>
  );
}

function CustInvoices() {
  const orders = custOrders();
  const rows = [];
  orders.forEach(o => {
    (o.installments || []).forEach(inst => {
      rows.push({
        invoiceId: `EF-${o.id}-${inst.n}`,
        orderId: o.id,
        orderTitle: TD.WORK_TYPE_LABELS[o.workType] + ' · ' + o.title,
        amount: inst.amt,
        status: inst.status,
        date: inst.date,
        method: inst.method,
      });
    });
  });
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  const statusPill = (s) => ({
    paid: { c: 'green', l: 'Bezahlt' },
    scheduled: { c: 'slate', l: 'Geplant' },
    overdue: { c: 'red', l: 'Überfällig' },
    pending: { c: 'amber', l: 'Ausstehend' },
  })[s] || { c: 'slate', l: s };

  const totalPaid = rows.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount, 0);
  const totalOutstanding = rows.filter(r=>['scheduled','overdue','pending'].includes(r.status)).reduce((s,r)=>s+r.amount, 0);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Rechnungen</h1>
      <div className="text-muted mb-4">Alle Zahlungen und Rechnungen Ihrer Aufträge</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        <div className="kpi">
          <span className="kpi-label"><Icon name="check-circle" size={12}/> Bezahlt</span>
          <span className="kpi-value">{TS.EUR(totalPaid)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icon name="clock" size={12}/> Ausstehend</span>
          <span className="kpi-value">{TS.EUR(totalOutstanding)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icon name="file-text" size={12}/> Anzahl</span>
          <span className="kpi-value">{rows.length}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Rechnungen ({rows.length})</div>
          <span className="text-faint fs-11">via Sevdesk</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rechnung</th>
                <th>Auftrag</th>
                <th>Datum</th>
                <th style={{ textAlign: 'right' }}>Betrag</th>
                <th>Status</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const sp = statusPill(r.status);
                return (
                  <tr key={r.invoiceId}>
                    <td className="mono fs-12">{r.invoiceId}</td>
                    <td>
                      <div className="flex-col" style={{ lineHeight: 1.25 }}>
                        <span className="fs-12.5">{r.orderTitle.length > 60 ? r.orderTitle.slice(0,60) + '…' : r.orderTitle}</span>
                        <span className="mono fs-11 text-faint">#{r.orderId}</span>
                      </div>
                    </td>
                    <td className="mono fs-12">{TS.fmtDate(r.date)}</td>
                    <td className="mono fs-13" style={{ textAlign: 'right', fontWeight: 500 }}>{TS.EUR(r.amount)}</td>
                    <td><span className={`pill pill-${sp.c}`} style={{ fontSize: 11 }}>{sp.l}</span></td>
                    <td>
                      {r.status === 'paid' ? <NotReady className="btn btn-sm" feature="invoice-pdf"><Icon name="download" size={11}/> PDF</NotReady> :
                       r.status === 'overdue' ? <NotReady className="btn btn-sm btn-danger" feature="invoice-pay"><Icon name="alert-triangle" size={11}/> Zahlen</NotReady> :
                       <span className="text-faint fs-11">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CustFooterBanner/>
    </div>
  );
}

function CustDownloads({ toast }) {
  const orders = custOrders();
  const groups = orders.map(o => {
    const files = [];
    if (o.acceptedAt) {
      files.push({ name: `${o.workType}_Briefing.pdf`, kind: 'briefing', size: '184 KB', uploadedBy: 'customer', at: o.acceptedAt });
    }
    if (o.gwId && ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','completed'].includes(o.status)) {
      files.push({ name: `Zwischenstand_1.docx`, kind: 'interim', size: '1.2 MB', uploadedBy: 'gw', at: '2026-05-06T15:30:00' });
    }
    if (o.status === 'completed') {
      files.push(
        { name: `Endversion_${o.workType}.pdf`, kind: 'final', size: '2.8 MB', uploadedBy: 'gw', at: '2026-04-10T18:00:00' },
        { name: `Rechnung_${o.id}.pdf`,         kind: 'invoice', size: '84 KB', uploadedBy: 'platform', at: '2026-04-12T08:00:00' }
      );
    }
    return { o, files };
  }).filter(g => g.files.length > 0);

  const kindLabels = { briefing: 'Briefing', interim: 'Zwischenstand', final: 'Endversion', invoice: 'Rechnung' };
  const kindPills  = { briefing: 'slate', interim: 'teal', final: 'purple', invoice: 'amber' };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Downloads</h1>
      <div className="text-muted mb-4">Alle Dokumente Ihrer Aufträge an einem Ort</div>

      {groups.length === 0 ? (
        <div className="card"><div className="card-pad text-center text-muted">Noch keine Dokumente verfügbar.</div></div>
      ) : (
        <div className="flex-col gap-3">
          {groups.map(({ o, files }) => {
            const meta = custStatusMeta(o);
            const wt = TD.WORK_TYPE_LABELS[o.workType];
            return (
              <div key={o.id} className="card">
                <div className="card-head">
                  <div className="flex items-center gap-2">
                    <span className="mono fs-11 text-faint">#{o.id}</span>
                    <span className="card-title">{wt} · {o.title.length > 50 ? o.title.slice(0,50) + '…' : o.title}</span>
                    <span className={`pill pill-${meta.color}`} style={{ fontSize: 10 }}>{meta.label}</span>
                  </div>
                  <span className="text-faint fs-11">{files.length} Dateien</span>
                </div>
                <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3" style={{ padding: '10px 16px', borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="file-text" size={14} className="text-faint"/>
                      </div>
                      <div className="flex-col" style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span className="fs-12.5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                          <span className={`pill pill-${kindPills[f.kind]}`} style={{ fontSize: 10 }}>{kindLabels[f.kind]}</span>
                        </div>
                        <span className="text-faint fs-11">{f.size} · {TS.fmtDate(f.at)}</span>
                      </div>
                      <button type="button" className="btn btn-sm btn-primary" onClick={()=>toast&&toast({tone:'success',text:`${f.name} wird heruntergeladen.`})}>
                        <Icon name="download" size={11}/> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CustFooterBanner/>
    </div>
  );
}

function CustProfile({ toast }) {
  const me = CUST_ME;
  const orders = custOrders();
  const completedCount = orders.filter(o => custProgress(o) >= 100).length;
  const activeCount    = orders.length - completedCount;
  const ltv = orders.reduce((s, o) => s + (o.paidEur || 0), 0);

  const [notif, setNotif] = useStateA({ email: true, sms: false, milestones: true, marketing: false });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Profil</h1>
      <div className="text-muted mb-4">Ihr Konto, Benachrichtigungen und Datenschutz</div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-head"><div className="card-title">Persönliche Daten</div><NotReady className="btn btn-sm" feature="profile-edit"><Icon name="edit" size={12}/> Bearbeiten</NotReady></div>
            <div className="card-pad flex items-center gap-3 mb-3">
              <Avatar initials={me?.initials || CUST_PERSONA.initials} size={56} tone="blue"/>
              <div className="flex-col" style={{ lineHeight: 1.3 }}>
                <span className="strong" style={{ fontSize: 16 }}>{me?.name || CUST_PERSONA.user}</span>
                <span className="text-faint fs-12 mono">{me?.email || CUST_PERSONA.email}</span>
                <span className="text-faint fs-12 mono">{me?.phone}</span>
              </div>
            </div>
            <div className="kv">
              <div className="kv-row"><dt>Land</dt><dd>{me?.country || '—'}</dd></div>
              <div className="kv-row"><dt>Lead-Quelle</dt><dd className="text-faint" style={{ fontSize: 11 }}>{me?.leadSource || '—'}</dd></div>
              <div className="kv-row"><dt>Mitglied seit</dt><dd className="mono">2025-09-12</dd></div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Benachrichtigungen</div></div>
            <div className="card-pad flex-col gap-2">
              {[
                { k: 'email',      l: 'E-Mail bei Statusänderungen',     s: 'Standard für Meilenstein-Updates' },
                { k: 'sms',        l: 'SMS bei kritischen Updates',      s: 'Nur bei Fristen <24h' },
                { k: 'milestones', l: 'Browser-Push-Benachrichtigungen', s: 'Echtzeit-Updates wenn Sie eingeloggt sind' },
                { k: 'marketing',  l: 'Angebote & Newsletter',           s: 'Tipps zu wissenschaftlichem Schreiben' },
              ].map(item => (
                <label key={item.k} className="flex items-center gap-3" style={{ padding: '8px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={notif[item.k]} onChange={(e)=>setNotif({...notif, [item.k]: e.target.checked})}/>
                  <div className="flex-col" style={{ lineHeight: 1.3 }}>
                    <span className="fs-13">{item.l}</span>
                    <span className="text-faint fs-11">{item.s}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Datenschutz · DSGVO</div></div>
            <div className="card-pad">
              <div className="text-muted fs-12 mb-3" style={{ lineHeight: 1.6 }}>
                Sie können jederzeit eine Kopie Ihrer Daten exportieren oder die vollständige Löschung beantragen. Aktive Aufträge werden bis Abschluss aufbewahrt.
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm" onClick={()=>toast&&toast({tone:'info',text:'Datenexport wird vorbereitet — Sie erhalten eine E-Mail.'})}>
                  <Icon name="download" size={12}/> Daten exportieren
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={()=>toast&&toast({tone:'danger',text:'Löschanfrage erhalten — Bestätigung folgt per E-Mail.'})}>
                  <Icon name="trash" size={12}/> Konto löschen
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-head"><div className="card-title">Konto-Übersicht</div></div>
            <div className="card-pad">
              <div className="kv">
                <div className="kv-row"><dt>Aktive Aufträge</dt><dd className="mono">{activeCount}</dd></div>
                <div className="kv-row"><dt>Abgeschlossen</dt><dd className="mono">{completedCount}</dd></div>
                <div className="kv-row"><dt>Gesamt-Wert</dt><dd className="mono">{TS.EUR(ltv)}</dd></div>
                <div className="kv-row"><dt>Status</dt><dd><span className="pill pill-blue" style={{ fontSize: 11 }}>Stammkunde</span></dd></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Hilfe & Support</div></div>
            <div className="card-pad flex-col gap-2">
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="message-square" size={12}/> Live-Chat starten</a>
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="mail" size={12}/> kundenservice@efactory1.de</a>
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="file-text" size={12}/> AGB & Datenschutz</a>
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="external-link" size={12}/> efactory1.de</a>
            </div>
          </div>
        </div>
      </div>

      <CustFooterBanner/>
    </div>
  );
}

function CustomerView({ role, setRole, toast }) {
  const [tab, setTab] = useStateA('orders');
  const [openOrderId, setOpenOrderId] = useStateA(null);
  const [openOrderTab, setOpenOrderTab] = useStateA('status');

  const openOrder = (id, subTab = 'status') => {
    setOpenOrderId(id);
    const map = { messages: 'messages', files: 'files', payments: 'payments', status: 'status' };
    setOpenOrderTab(map[subTab] || 'status');
    window.scrollTo(0, 0);
  };
  const closeOrder = () => { setOpenOrderId(null); window.scrollTo(0, 0); };

  const switchTab = (t) => { setOpenOrderId(null); setTab(t); };

  let body;
  if (openOrderId != null) {
    body = <CustOrderDetail orderId={openOrderId} initialTab={openOrderTab} onBack={closeOrder} toast={toast}/>;
  } else if (tab === 'messages') {
    body = <CustMessagesList openOrder={openOrder}/>;
  } else if (tab === 'invoices') {
    body = <CustInvoices/>;
  } else if (tab === 'downloads') {
    body = <CustDownloads toast={toast}/>;
  } else if (tab === 'profile') {
    body = <CustProfile toast={toast}/>;
  } else {
    body = <CustOrdersList openOrder={openOrder}/>;
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <CustHeader tab={tab} setTab={switchTab} role={role} setRole={setRole}/>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 32px' }}>
        {body}
      </div>
    </div>
  );
}

window.AIBIDashboard = AIBIDashboard;
window.CustomerView = CustomerView;

// ============ GHOSTWRITERS REGISTRY ============
function GhostwritersList({ navigate }) {
  const [search, setSearch] = useStateA('');
  const [filter, setFilter] = useStateA('all'); // all | active | banned | overloaded | free
  const all = TD.GHOSTWRITERS;

  const filtered = all.filter(g => {
    if (filter === 'banned' && !g.banned) return false;
    if (filter === 'active' && g.banned) return false;
    if (filter === 'overloaded' && (g.active || 0) < 4) return false;
    if (filter === 'free' && (g.active || 0) > 1) return false;
    if (search && !((g.name + ' ' + (g.expertise||[]).join(' ')).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const capacity = (n) => n >= 5 ? 'overloaded' : n >= 3 ? 'busy' : n >= 1 ? 'available' : 'free';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Ghostwriters']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Ghostwriters</h1>
          <div className="page-subtitle">{all.length} active GWs · deduped from 258 sheet strings · last sync {TS.relTime('2026-05-07T13:18:00')}</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="export-csv"><Icon name="download" size={14}/> Export CSV</NotReady>
          <NotReady className="btn" feature="invite-gw"><Icon name="plus" size={14}/> Invite GW</NotReady>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        <div className="topbar-search" style={{ width: 280, background: 'var(--surface)' }}>
          <Icon name="search" size={14} className="text-faint"/>
          <input style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 12.5, color: 'var(--text)' }} placeholder="Search name or expertise…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        {[['all','All'],['active','Active'],['free','Available'],['overloaded','Overloaded'],['banned','Shadow-banned']].map(([v,l]) => (
          <button key={v} className={`chip ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} of {all.length}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Expertise</th>
              <th>Languages</th>
              <th className="num">Active</th>
              <th className="num">Lifetime</th>
              <th className="num">On-time</th>
              <th className="num">Rating</th>
              <th className="num">Rate</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(g => {
              const cap = capacity(g.active || 0);
              return (
                <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => navigate('ghostwriter-detail', { id: g.id })}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar initials={g.initials} size={28} tone={g.banned ? 'red' : (g.isOwner ? 'blue' : 'neutral')}/>
                      <div className="flex-col" style={{ lineHeight: 1.25 }}>
                        <span className="strong fs-12">{g.name}</span>
                        <span className="text-faint fs-11 mono">{g.email}</span>
                      </div>
                      {g.banned && <Icon name="alert-triangle" size={12} className="text-faint" />}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1" style={{ flexWrap: 'wrap', maxWidth: 220 }}>
                      {(g.expertise || []).slice(0, 3).map(e => <span key={e} className="pill pill-slate" style={{ fontSize: 10.5 }}>{e}</span>)}
                      {(g.expertise || []).length > 3 && <span className="text-faint fs-11">+{g.expertise.length - 3}</span>}
                    </div>
                  </td>
                  <td className="mono fs-11 text-muted">{(g.languages || []).join(' · ')}</td>
                  <td className="num mono">
                    <span style={{ color: cap === 'overloaded' ? 'var(--red)' : cap === 'busy' ? 'var(--amber)' : 'var(--text)' }}>{g.active || 0}</span>
                  </td>
                  <td className="num mono text-muted">{g.lifetime || 0}</td>
                  <td className="num mono">
                    <span style={{ color: g.onTime >= 0.95 ? 'var(--green)' : g.onTime >= 0.85 ? 'var(--text)' : 'var(--red)' }}>
                      {g.onTime != null ? Math.round(g.onTime * 100) + '%' : '—'}
                    </span>
                  </td>
                  <td className="num mono">{g.rating ? '★ ' + g.rating.toFixed(1) : '—'}</td>
                  <td className="num mono">{g.rate != null ? Math.round(g.rate * 100) + '%' : <span className="text-faint">self</span>}</td>
                  <td>
                    {g.banned
                      ? <span className="pill pill-red" title={g.banReason}>Shadow-banned</span>
                      : g.isOwner
                        ? <span className="pill pill-blue">Owner</span>
                        : cap === 'overloaded'
                          ? <span className="pill pill-amber">Overloaded</span>
                          : cap === 'busy'
                            ? <span className="pill pill-slate">Busy</span>
                            : <span className="pill pill-green">Available</span>
                    }
                  </td>
                  <td className="num">
                    <button type="button" className="btn btn-sm" aria-label="Open profile" onClick={e => { e.stopPropagation(); navigate('ghostwriter-detail', { id: g.id }); }}><Icon name="chevron-right" size={12}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.find(g => g.banned) && (
        <div className="banner danger mt-3">
          <Icon name="alert-triangle" size={14}/>
          <span><strong>Anna König</strong> auto-shadow-banned by QA on Order #3517 — AI score 87%. All pending payments blocked. Reverse manually from her profile.</span>
        </div>
      )}
    </div>
  );
}

window.GhostwritersList = GhostwritersList;

// ============ PIPELINE (Pipedrive kanban mirror) ============
function PipelineKanban({ navigate }) {
  const stageDefs = [
    { id: 'anfrage', label: 'Anfrage', sub: 'Inquiry', color: 'slate' },
    { id: 'qualifiziert', label: 'Qualifiziert', sub: 'Qualified for Ghostwriting', color: 'blue' },
    { id: 'rueckmeldung', label: 'Rückmeldung', sub: 'Negotiation', color: 'amber' },
    { id: 'rechnung', label: 'Rechnung angefordert', sub: 'Invoice requested', color: 'orange' },
    { id: 'won', label: 'Won', sub: 'Closed', color: 'green' },
    { id: 'lost', label: 'Lost', sub: 'Lost / Storno', color: 'red' },
  ];
  const orderToStage = (o) => {
    if (o.status === 'cancelled' || o.status === 'bye') return 'lost';
    if (['lead'].includes(o.status)) return 'anfrage';
    if (['qualified'].includes(o.status)) return 'qualifiziert';
    if (['offer_sent'].includes(o.status)) return 'rueckmeldung';
    if (['invoice_sent'].includes(o.status)) return 'rechnung';
    return 'won';
  };
  const synthLeads = [
    { id: 9012, customerName: 'Hannes Reuter', customerInitials: 'HR', workType: 'bachelorarbeit', field: 'BWL', pages: 40, grossEur: 2360, ageHours: 2, lastTouch: '2026-05-07T13:14:00', stage: 'anfrage', leadSource: 'ig' },
    { id: 9015, customerName: 'Sabine Vogt', customerInitials: 'SV', workType: 'masterarbeit', field: 'Wirtschaftspsychologie', pages: 60, grossEur: 4140, ageHours: 5, lastTouch: '2026-05-07T10:02:00', stage: 'anfrage', leadSource: 'ef1' },
    { id: 9020, customerName: 'Tim Albrecht', customerInitials: 'TA', workType: 'hausarbeit', field: 'Marketing', pages: 14, grossEur: 686, ageHours: 12, lastTouch: '2026-05-07T03:40:00', stage: 'anfrage', leadSource: 'ws1' },
    { id: 9028, customerName: 'Olivia Stein', customerInitials: 'OS', workType: 'bachelorarbeit', field: 'Soziologie', pages: 38, grossEur: 2242, ageHours: 26, lastTouch: '2026-05-06T14:00:00', stage: 'qualifiziert', leadSource: 'ef1' },
    { id: 9031, customerName: 'Jonas Eberle', customerInitials: 'JE', workType: 'masterarbeit', field: 'Informatik', pages: 70, grossEur: 4830, ageHours: 38, lastTouch: '2026-05-06T01:18:00', stage: 'qualifiziert', leadSource: 'b1' },
    { id: 9035, customerName: 'Karen Pohl', customerInitials: 'KP', workType: 'hausarbeit', field: 'Personal', pages: 20, grossEur: 980, ageHours: 50, lastTouch: '2026-05-05T13:30:00', stage: 'rueckmeldung', leadSource: 'ig' },
    { id: 9039, customerName: 'Yusuf Demir', customerInitials: 'YD', workType: 'expose', field: 'VWL', pages: 8, grossEur: 480, ageHours: 70, lastTouch: '2026-05-04T17:20:00', stage: 'rueckmeldung', leadSource: 'referral' },
    { id: 9042, customerName: 'Greta Lindner', customerInitials: 'GL', workType: 'bachelorarbeit', field: 'Pädagogik', pages: 35, grossEur: 2065, ageHours: 92, lastTouch: '2026-05-03T19:00:00', stage: 'rechnung', leadSource: 'ef1' },
  ];
  const realOrders = TD.liveOrders().map(o => ({
    id: o.id,
    customerName: TD.customer(o.customerId)?.name,
    customerInitials: TD.customer(o.customerId)?.initials || '··',
    workType: o.workType, field: o.field, pages: o.pages,
    grossEur: o.grossEur, lastTouch: o.acceptedAt, stage: orderToStage(o),
    leadSource: o.leadSource, status: o.status, real: true,
  }));
  const cards = [...synthLeads, ...realOrders];
  const byStage = stageDefs.reduce((acc, s) => { acc[s.id] = cards.filter(c => c.stage === s.id); return acc; }, {});
  const stageTotal = (s) => byStage[s].reduce((sum, c) => sum + (c.grossEur || 0), 0);
  const totalPipeline = cards.filter(c => c.stage !== 'lost' && c.stage !== 'won').reduce((s,c) => s + (c.grossEur||0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Pipeline']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Pipedrive Pipeline</h1>
          <div className="page-subtitle">{cards.length} deals · open pipeline value <span className="mono strong" style={{ color: 'var(--text)' }}>{TS.EUR(totalPipeline)}</span> · sync {TS.relTime('2026-05-07T14:18:00')}</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="filters-advanced"><Icon name="filter" size={14}/> Filters</NotReady>
          <NotReady className="btn" feature="pipedrive-open"><Icon name="external-link" size={14}/> Open in Pipedrive</NotReady>
          <NotReady className="btn btn-primary" feature="pipedrive-new-deal"><Icon name="plus" size={14}/> New deal</NotReady>
        </div>
      </div>

      <div className="banner warn mb-3">
        <Icon name="alert-triangle" size={14}/>
        <span><strong>Pipedrive subscriber cap:</strong> 4,159 / 5,000 used (83%). Clean up Lost deals before next campaign or upgrade tier.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stageDefs.length}, minmax(220px, 1fr))`, gap: 12, alignItems: 'flex-start' }}>
        {stageDefs.map(s => (
          <div key={s.id} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 10, minHeight: 200 }}>
            <div className="flex items-center justify-between mb-2" style={{ padding: '0 4px' }}>
              <div className="flex-col" style={{ lineHeight: 1.15 }}>
                <span className="strong fs-12">{s.label}</span>
                <span className="text-faint fs-11">{s.sub}</span>
              </div>
              <span className={`pill pill-${s.color}`}>{byStage[s.id].length}</span>
            </div>
            <div className="text-faint fs-11 mono mb-2" style={{ padding: '0 4px' }}>{TS.EUR(stageTotal(s.id))}</div>
            <div className="flex-col gap-2">
              {byStage[s.id].slice(0, 12).map(c => (
                <div key={c.id} className="card" style={{ padding: 10, cursor: 'pointer' }} onClick={() => c.real && navigate('order-detail', { id: c.id })}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="mono fs-11 text-faint">#{c.id}</span>
                    <span className="text-faint fs-11">{c.leadSource}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar initials={c.customerInitials} size={20}/>
                    <span className="strong fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customerName}</span>
                  </div>
                  <div className="text-muted fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {TD.WORK_TYPE_LABELS[c.workType] || c.workType} · {c.field}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="mono fs-11" style={{ color: 'var(--text)' }}>{TS.EUR(c.grossEur)}</span>
                    {c.ageHours != null && <span className="text-faint fs-11">{c.ageHours < 24 ? c.ageHours + 'h' : Math.round(c.ageHours/24) + 'd'}</span>}
                  </div>
                </div>
              ))}
              {byStage[s.id].length > 12 && (
                <NotReady className="btn btn-ghost btn-sm" feature="pipeline-load-more" style={{ justifyContent: 'center' }}>+{byStage[s.id].length - 12} more</NotReady>
              )}
              {byStage[s.id].length === 0 && (
                <div className="text-faint fs-11" style={{ padding: 12, textAlign: 'center' }}>No deals</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.PipelineKanban = PipelineKanban;

// ============ STUB SCREENS for unimplemented sidebar items ============
function ComingSoon({ title, blurb, icon = 'sparkles' }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', title]}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>{title}</h1>
          <div className="page-subtitle">{blurb}</div>
        </div>
      </div>
      <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 520, margin: '40px auto', borderStyle: 'dashed' }}>
        <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 14, background: 'var(--surface-2)', color: 'var(--text-3)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name={icon} size={26}/>
        </div>
        <div className="strong" style={{ fontSize: 15, marginBottom: 6 }}>Scoped — not built in prototype</div>
        <div className="text-muted fs-12" style={{ maxWidth: 360, margin: '0 auto' }}>{blurb}</div>
      </div>
    </div>
  );
}
// (Customers + Disputes are full pages now — see below)

// ============ CUSTOMERS (minimal) ============
function CustomersPage({ navigate }) {
  const [search, setSearch] = useStateA('');
  const [filter, setFilter] = useStateA('all');

  const liveOrders = TD.liveOrders();
  const customersWithStats = TD.CUSTOMERS.map(c => {
    const orders = liveOrders.filter(o => o.customerId === c.id);
    const openBalance = orders.reduce((s, o) => s + (o.outstandingEur || 0), 0);
    const hasDispute = orders.some(o => o.disputeOpen);
    const lastOrder = orders.sort((a,b) => (b.acceptedAt||'').localeCompare(a.acceptedAt||''))[0];
    return { ...c, orderCount: orders.length, openBalance, hasDispute, lastOrderDate: lastOrder?.acceptedAt };
  });

  const filtered = customersWithStats.filter(c => {
    if (filter === 'open' && c.openBalance === 0) return false;
    if (filter === 'vip' && !c.tags?.includes('VIP')) return false;
    if (filter === 'dispute' && !c.hasDispute) return false;
    if (search && !((c.name + ' ' + c.email).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const totalOpen = customersWithStats.reduce((s,c) => s + c.openBalance, 0);
  const vipCount = customersWithStats.filter(c => c.tags?.includes('VIP')).length;
  const disputeCount = customersWithStats.filter(c => c.hasDispute).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Customers']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Customers</h1>
          <div className="page-subtitle">{TD.CUSTOMERS.length} customers · synced from Pipedrive</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Open balance owed</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--red)', marginTop: 4 }}>{TS.EUR(totalOpen)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">VIP customers</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{vipCount}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">In dispute</div>
          <div className="mono strong" style={{ fontSize: 22, color: disputeCount ? 'var(--amber)' : 'var(--text)', marginTop: 4 }}>{disputeCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        <div className="topbar-search" style={{ width: 280, background: 'var(--surface)' }}>
          <Icon name="search" size={14} className="text-faint"/>
          <input style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 12.5, color: 'var(--text)' }} placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        {[['all','All'],['open','Has open balance'],['vip','VIP'],['dispute','In dispute']].map(([v,l]) => (
          <button key={v} className={`chip ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} of {TD.CUSTOMERS.length}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Customer</th>
              <th className="num">Orders</th>
              <th className="num">Lifetime</th>
              <th className="num">Open balance</th>
              <th>Last order</th>
              <th>Lead source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate('customer-detail', { id: c.id })}>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar initials={c.initials} size={28}/>
                    <div className="flex-col" style={{ lineHeight: 1.25 }}>
                      <div className="flex items-center gap-1">
                        <span className="strong fs-12">{c.name}</span>
                        {c.tags?.includes('VIP') && <span className="pill pill-yellow" style={{ fontSize: 9 }}>VIP</span>}
                        {c.hasDispute && <span className="pill pill-orange" style={{ fontSize: 9 }}>Dispute</span>}
                      </div>
                      <span className="text-faint fs-11 mono">{c.email}</span>
                    </div>
                  </div>
                </td>
                <td className="num mono">{c.orderCount}</td>
                <td className="num mono">{TS.EUR(c.ltv || 0)}</td>
                <td className="num mono" style={{ color: c.openBalance > 0 ? 'var(--red)' : 'var(--text-3)' }}>
                  {c.openBalance > 0 ? TS.EUR(c.openBalance) : '—'}
                </td>
                <td className="text-faint fs-11">{c.lastOrderDate ? TS.fmtDate(c.lastOrderDate) : '—'}</td>
                <td className="text-muted fs-11">{c.leadSource}</td>
                <td className="num">
                  {c.openBalance > 0 && <button type="button" className="btn btn-sm" title="Send dunning" onClick={e => e.stopPropagation()}><Icon name="mail" size={12}/></button>}
                  <button type="button" className="btn btn-sm" aria-label="Open customer 360" onClick={e => { e.stopPropagation(); navigate('customer-detail', { id: c.id }); }}><Icon name="chevron-right" size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.CustomersPage = CustomersPage;

// ============ DISPUTES (minimal) ============
function DisputesPage({ navigate, fixState }) {
  // Derive disputes from real order state. Categorize by what's actually wrong.
  const allEffective = TD.ORDERS.map(o => ({ ...o, ...(fixState?.[o.id] || {}) }));
  const summarizeOrder = (o) => {
    if (o.status === 'ai_violation_review') {
      const sub = TD.SUBMISSIONS?.find(s => s.orderId === o.id);
      return { category: 'ai_use', raisedBy: 'admin', blocksPayment: true, status: 'investigating', summary: `AI score ${sub?.aiScore || '—'}% — payment frozen pending QA verdict`, daysOpen: 1 };
    }
    if (o.disputeOpen) {
      return { category: 'quality', raisedBy: 'customer', blocksPayment: true, status: o.status === 'revision_required' ? 'revision_in_progress' : 'investigating', summary: `Customer feedback open · revision round ${o.revisionRounds || 1}`, daysOpen: 6 };
    }
    if (o.status === 'on_hold') {
      return { category: 'deadline', raisedBy: 'admin', blocksPayment: true, status: 'investigating', summary: o.holdReason || 'Order on hold', daysOpen: 5 };
    }
    if (o.status === 'revision_required') {
      return { category: 'quality', raisedBy: 'customer', blocksPayment: true, status: 'revision_in_progress', summary: `Revision requested — round ${o.revisionRounds || 1}`, daysOpen: 3 };
    }
    return null;
  };
  const synthDisputes = allEffective
    .map(o => { const d = summarizeOrder(o); return d ? { orderId: o.id, ...d } : null; })
    .filter(Boolean);
  if (synthDisputes.length === 0) {
    synthDisputes.push({ orderId: 3496, raisedBy: 'gw', category: 'scope', daysOpen: 8, blocksPayment: false, status: 'open', summary: 'GW Henrik Vogel reports scope creep · customer added 2 new chapters mid-project' });
  }

  const blockingPayment = synthDisputes.filter(d => d.blocksPayment).length;
  const avgDays = Math.round(synthDisputes.reduce((s,d) => s + d.daysOpen, 0) / synthDisputes.length);

  const catLabel = { quality: 'Quality', deadline: 'Deadline', scope: 'Scope', ai_use: 'AI use', plagiarism: 'Plagiarism', communication: 'Communication' };
  const catTone = { quality: 'amber', deadline: 'orange', scope: 'blue', ai_use: 'red', plagiarism: 'red', communication: 'slate' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Disputes']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Disputes</h1>
          <div className="page-subtitle">Customer feedback, GW disagreements, AI/quality flags · resolution blocks Friday payment</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Open disputes</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{synthDisputes.length}</div>
        </div>
        <div className="card" style={{ padding: 14, border: blockingPayment > 0 ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Blocking GW payment</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--red)', marginTop: 4 }}>{blockingPayment}</div>
          <div className="text-faint fs-11 mt-1">Friday batch will skip these</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Avg days open</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{avgDays}d</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Category</th>
              <th>Raised by</th>
              <th>Summary</th>
              <th className="num">Days open</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {synthDisputes.map(d => {
              const o = TD.order(d.orderId);
              const cust = o ? TD.customer(o.customerId) : null;
              const gw = o ? TD.gw(o.gwId) : null;
              return (
                <tr key={d.orderId} style={{ cursor: 'pointer' }} onClick={() => o && navigate('order-detail', { id: d.orderId })}>
                  <td>
                    <div className="flex-col" style={{ lineHeight: 1.25 }}>
                      <span className="mono strong fs-12">#{d.orderId}</span>
                      <span className="text-faint fs-11">{cust?.name} · {gw?.name || '—'}</span>
                    </div>
                  </td>
                  <td><span className={`pill pill-${catTone[d.category]}`}>{catLabel[d.category]}</span></td>
                  <td className="text-muted fs-12" style={{ textTransform: 'capitalize' }}>{d.raisedBy}</td>
                  <td className="fs-12" style={{ maxWidth: 320 }}>{d.summary}</td>
                  <td className="num mono"><span style={{ color: d.daysOpen > 5 ? 'var(--red)' : 'var(--text)' }}>{d.daysOpen}d</span></td>
                  <td>
                    {d.blocksPayment && <span className="pill pill-red" style={{ marginRight: 4 }}><Icon name="lock" size={10}/> Blocks pay</span>}
                    {d.status === 'open' && <span className="pill pill-slate">Open</span>}
                    {d.status === 'investigating' && <span className="pill pill-amber">Investigating</span>}
                    {d.status === 'revision_in_progress' && <span className="pill pill-blue">Revision</span>}
                  </td>
                  <td className="num">
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); }} title="Reassign GW"><Icon name="rotate-ccw" size={12}/></button>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); }} title="Open chat"><Icon name="message-square" size={12}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.DisputesPage = DisputesPage;

// ============ REPORTS (minimal — 3 widgets) ============
function ReportsPage({ navigate }) {
  const [period, setPeriod] = useStateA('apr2026');
  const periods = [
    { id: 'apr2026', label: 'April 2026' },
    { id: 'mar2026', label: 'March 2026' },
    { id: 'q1_2026', label: 'Q1 2026' },
    { id: 'ytd', label: 'YTD 2026' },
  ];

  const orders = TD.liveOrders();
  const completed = orders.filter(o => o.status === 'completed');
  const grossSum = orders.reduce((s, o) => s + (o.grossEur || 0), 0);
  const honorSum = orders.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const vatSum = orders.reduce((s, o) => s + ((o.grossEur || 0) * 0.07 / 1.07), 0);
  const netSum = grossSum - vatSum;
  const margin = netSum - honorSum;

  const honorarLedger = orders.filter(o => o.gwId && o.netHonorarium > 0).slice(0, 8).map(o => ({
    orderId: o.id,
    gw: TD.gw(o.gwId)?.name,
    gwInitials: TD.gw(o.gwId)?.initials,
    honorEur: o.netHonorarium,
    rate: o.rate,
    status: o.gwPaymentStatus,
    date: o.acceptedAt,
  }));

  const leadSources = [
    { id: 'ef1', label: 'efactory1.de (org)', leads: 142, won: 28, revenue: 16240 },
    { id: 'ig', label: 'Instagram', leads: 86, won: 14, revenue: 9420 },
    { id: 'b1', label: 'Backlink network', leads: 54, won: 11, revenue: 18620 },
    { id: 'ws1', label: 'WhatsApp inbound', leads: 38, won: 9, revenue: 7240 },
    { id: 'sp1', label: 'Sponsored search', leads: 32, won: 5, revenue: 4180 },
    { id: 'referral', label: 'Customer referral', leads: 18, won: 8, revenue: 8920 },
    { id: 'ebay', label: 'Kleinanzeigen', leads: 14, won: 2, revenue: 1862 },
    { id: 'ac', label: 'Academic forums', leads: 9, won: 3, revenue: 3245 },
  ];
  const maxRevenue = Math.max(...leadSources.map(l => l.revenue));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Reports']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Reports</h1>
          <div className="page-subtitle">Operational, financial and compliance reports · all values net of VAT 7% unless noted</div>
        </div>
        <div className="page-actions">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="btn" style={{ paddingRight: 24 }}>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <NotReady className="btn" feature="export-bundle"><Icon name="download" size={14}/> Export bundle</NotReady>
        </div>
      </div>

      {/* P&L summary */}
      <div className="card mb-3">
        <div className="card-head"><div className="card-title">Monthly P&L · {periods.find(p=>p.id===period)?.label}</div><span className="text-faint fs-11">computed from {orders.length} orders</span></div>
        <div className="card-pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { label: 'Gross revenue', val: grossSum, sub: 'incl. VAT', tone: 'text' },
              { label: 'VAT 7% (collected)', val: vatSum, sub: 'remit to Finanzamt', tone: 'muted' },
              { label: 'Net revenue', val: netSum, sub: 'after VAT', tone: 'text' },
              { label: 'GW honorarium', val: honorSum, sub: '−paid out', tone: 'red' },
              { label: 'Margin (Berat)', val: margin, sub: `${((margin/netSum)*100).toFixed(1)}% of net`, tone: 'green' },
            ].map((k, i) => (
              <div key={i} style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="text-faint fs-11">{k.label}</div>
                <div className="mono strong" style={{ fontSize: 18, marginTop: 4, color: k.tone === 'green' ? 'var(--green)' : k.tone === 'red' ? 'var(--red)' : k.tone === 'muted' ? 'var(--text-2)' : 'var(--text)' }}>
                  {TS.EUR(k.val)}
                </div>
                <div className="text-faint fs-11 mt-1">{k.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        {/* GW Honorarium ledger */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">GW Honorarium ledger</div>
            <NotReady className="btn btn-sm" feature="export-csv" label="GW Honorarium CSV"><Icon name="download" size={12}/> CSV</NotReady>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th><th>Ghostwriter</th><th className="num">Rate</th><th className="num">Honorar</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {honorarLedger.map(r => (
                  <tr key={r.orderId}>
                    <td className="mono">#{r.orderId}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar initials={r.gwInitials} size={22}/>
                        <span className="fs-12">{r.gw}</span>
                      </div>
                    </td>
                    <td className="num mono">{Math.round((r.rate||0)*100)}%</td>
                    <td className="num mono">{TS.EUR(r.honorEur)}</td>
                    <td>
                      {r.status === 'paid' && <span className="pill pill-green">Paid</span>}
                      {r.status === 'invoice_received' && <span className="pill pill-amber">Awaiting Friday</span>}
                      {r.status === 'work_in_progress' && <span className="pill pill-slate">In progress</span>}
                      {r.status === 'no_payment_self_assigned' && <span className="pill pill-blue">Self</span>}
                    </td>
                    <td className="mono fs-11 text-muted">{TS.fmtDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-pad flex justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-muted fs-12">{honorarLedger.length} of {orders.filter(o=>o.gwId).length} entries shown</span>
            <span className="mono strong">Total {TS.EUR(honorarLedger.reduce((s,r) => s + r.honorEur, 0))}</span>
          </div>
        </div>

        {/* VAT report */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">VAT 7% report</div>
            <span className="pill pill-amber">due 10.06.2026</span>
          </div>
          <div className="card-pad flex-col gap-3">
            <div className="kv">
              <div className="kv-row"><dt>Gross collected (Apr)</dt><dd className="mono">{TS.EUR(grossSum)}</dd></div>
              <div className="kv-row"><dt>Net base</dt><dd className="mono">{TS.EUR(netSum)}</dd></div>
              <div className="kv-row" style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
                <dt><strong>VAT to remit (7%)</strong></dt><dd className="mono strong" style={{ color: 'var(--red)' }}>{TS.EUR(vatSum)}</dd>
              </div>
            </div>
            <div className="banner info" style={{ fontSize: 11.5 }}>
              <Icon name="zap" size={12}/>
              <span>Auto-export to Sevdesk on the 1st of each month. ELSTER filing handled by Steuerberater.</span>
            </div>
            <NotReady className="btn" feature="ustva-preview"><Icon name="download" size={14}/> Download UStVA preview</NotReady>
          </div>
        </div>
      </div>

      {/* Lead source ROI */}
      <div className="card mt-3">
        <div className="card-head"><div className="card-title">Lead source ROI</div><span className="text-faint fs-11">last 30 days · revenue € net</span></div>
        <div className="card-pad flex-col gap-2">
          {leadSources.map(l => (
            <div key={l.id} className="flex items-center gap-3">
              <div style={{ width: 160 }} className="fs-12">{l.label}</div>
              <div style={{ flex: 1, position: 'relative', height: 22, background: 'var(--surface-2)', borderRadius: 4 }}>
                <div style={{ width: `${(l.revenue / maxRevenue) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 4, transition: 'width .3s' }}/>
                <span className="mono fs-11" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text)', mixBlendMode: 'difference', filter: 'invert(1)' }}>{TS.EUR(l.revenue)}</span>
              </div>
              <div style={{ width: 110 }} className="text-faint fs-11 mono">{l.won}/{l.leads} won · {Math.round((l.won/l.leads)*100)}%</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
window.ReportsPage = ReportsPage;

// ============ SETTINGS ============
function SettingsPage({ navigate, toast }) {
  const [section, setSection] = useStateA('integrations');
  const sections = [
    { id: 'integrations', label: 'Integrations', icon: 'git-branch' },
    { id: 'email_routing', label: 'Email Routing', icon: 'mail' },
    { id: 'team', label: 'Team & roles', icon: 'users' },
    { id: 'templates', label: 'Templates', icon: 'folder' },
    { id: 'agbs', label: 'AGBs (Terms)', icon: 'file-text' },
    { id: 'localization', label: 'Localization', icon: 'globe' },
    { id: 'automations', label: 'Automations / Cron', icon: 'zap' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Settings']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Settings</h1>
          <div className="page-subtitle">Workspace, integrations and operational rules · scoped to Bery Ventures GmbH</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 8, alignSelf: 'flex-start' }}>
          {sections.map(s => (
            <a key={s.id} className={`sidebar-item ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              <Icon name={s.icon} size={14}/>
              <span>{s.label}</span>
            </a>
          ))}
        </div>

        <div className="flex-col gap-3">
          {section === 'team' && (
            <>
              <div className="card">
                <div className="card-head"><div className="card-title">Team members</div><NotReady className="btn btn-sm btn-primary" feature="team-invite"><Icon name="plus" size={12}/> Invite</NotReady></div>
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>MFA</th><th>Last seen</th><th></th></tr></thead>
                  <tbody>
                    {[
                      { initials: 'BÖ', name: 'Berat Özdemir', email: 'berat@efactory1.de', role: 'Admin (owner)', mfa: true, last: '2 min ago', tone: 'blue' },
                      { initials: 'LH', name: 'Lina Hoffmann', email: 'qa@efactory1.de', role: 'QA Reviewer', mfa: true, last: '23 min ago', tone: 'neutral' },
                      { initials: 'MS', name: 'Marwan Shakib', email: 'marwan@efactory1.de', role: 'Service Worker', mfa: false, last: 'Yesterday 17:42', tone: 'neutral' },
                    ].map(m => (
                      <tr key={m.email}>
                        <td><div className="flex items-center gap-2"><Avatar initials={m.initials} size={26} tone={m.tone}/><span className="strong fs-12">{m.name}</span></div></td>
                        <td className="mono fs-11 text-muted">{m.email}</td>
                        <td>{m.role === 'Admin (owner)' ? <span className="pill pill-blue">{m.role}</span> : <span className="pill pill-slate">{m.role}</span>}</td>
                        <td>{m.mfa ? <span className="pill pill-green"><Icon name="check" size={10}/> TOTP</span> : <span className="pill pill-amber">Off</span>}</td>
                        <td className="text-faint fs-11">{m.last}</td>
                        <td className="num"><NotReady className="btn btn-sm" feature="row-more-actions" ariaLabel="Team member actions"><Icon name="more-horizontal" size={12}/></NotReady></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Permission matrix</div></div>
                <div className="card-pad text-muted fs-12">
                  Role definitions and granular permissions are derived from the AGB v3.2 employment contracts. Edit at the role level — propagates to all members.
                </div>
              </div>
            </>
          )}

          {section === 'templates' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Document & email templates</div><NotReady className="btn btn-sm" feature="template-new"><Icon name="plus" size={12}/> New</NotReady></div>
              <div className="card-pad flex-col gap-2">
                {[
                  { name: 'Vorlage_Deckblatt_efactory1.de.docx', sub: 'Cover page · DE/EN', size: '184 KB', updated: '12.04.2026' },
                  { name: 'Expose_Vorlage_efactory1.docx', sub: 'Exposé template', size: '212 KB', updated: '04.03.2026' },
                  { name: 'Thesis_Vorlage_efactory1.docx', sub: 'Thesis (Bachelor/Master)', size: '276 KB', updated: '01.02.2026' },
                  { name: '200_Formulierungen_efactory1.docx', sub: '200 academic phrases', size: '88 KB', updated: '15.01.2026' },
                  { name: 'Email_Auftragszuteilung.html', sub: 'GW assignment briefing — NICHT WEITERLEITEN', size: '4.2 KB', updated: '07.05.2026' },
                  { name: 'Email_Kunde_Intro.html', sub: 'Customer GW-intro', size: '3.8 KB', updated: '07.05.2026' },
                  { name: 'Email_Mahnung_1.html', sub: 'Dunning level 1 (friendly)', size: '2.1 KB', updated: '20.04.2026' },
                ].map(t => (
                  <div key={t.name} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
                    <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                      <span className="strong fs-12 mono">{t.name}</span>
                      <span className="text-faint fs-11">{t.sub} · {t.size} · updated {t.updated}</span>
                    </div>
                    <NotReady className="btn btn-sm" ariaLabel="Edit template" feature="template-edit"><Icon name="edit" size={12}/></NotReady>
                    <NotReady className="btn btn-sm" ariaLabel="Download template" feature="template-download"><Icon name="download" size={12}/></NotReady>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'integrations' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Integrations</div></div>
              <div className="card-pad flex-col gap-2">
                {[
                  { name: 'Pipedrive', sub: 'CRM source of truth', status: 'warn', detail: '4,159 / 5,000 subscribers (83%)', icon: 'git-branch' },
                  { name: 'Sevdesk', sub: 'Invoicing (Rechnung)', status: 'ok', detail: 'Last sync 3 min ago · 645 invoices YTD', icon: 'file-text' },
                  { name: 'Stripe', sub: 'Payments (card · Klarna · PayPal)', status: 'ok', detail: 'Webhook payment_intent.succeeded · 0 failures last 7d', icon: 'wallet' },
                  { name: 'Cloudflare Email Routing', sub: 'Email proxy', status: 'ok', detail: 'Worker order-proxy-router v4', icon: 'mail' },
                  { name: 'WhatsApp Proxy', sub: 'Channel — under exploration', status: 'pending', detail: 'Decision: virtual numbers vs groups', icon: 'message-circle' },
                  { name: 'Voice (Twilio / SIPGATE)', sub: 'Metadata only · no recordings', status: 'pending', detail: 'Provider TBD (D-16)', icon: 'phone' },
                  { name: 'Plagiarism (Turnitin / PlagScan)', sub: 'QA submission gate', status: 'ok', detail: 'API quota 87% remaining', icon: 'search' },
                  { name: 'AI Detection (GPTZero)', sub: 'Per-paragraph score', status: 'ok', detail: '1 violation flagged today (#3517)', icon: 'bot' },
                ].map(i => (
                  <div key={i.name} className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div className="action-icon" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><Icon name={i.icon} size={16}/></div>
                    <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                      <span className="strong fs-12">{i.name}</span>
                      <span className="text-faint fs-11">{i.sub} · {i.detail}</span>
                    </div>
                    {i.status === 'ok' && <span className="pill pill-green">Connected</span>}
                    {i.status === 'warn' && <span className="pill pill-amber">Warning</span>}
                    {i.status === 'pending' && <span className="pill pill-slate">Not configured</span>}
                    <NotReady className="btn btn-sm" feature="integration-config" label="Configure integration">Configure</NotReady>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'email_routing' && (
            <div className="flex-col gap-3">
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Cloudflare Email Routing</div>
                  <span className="pill pill-green"><Icon name="check" size={10}/> Worker active</span>
                </div>
                <div className="card-pad">
                  <div className="banner info" style={{ fontSize: 11.5 }}>
                    <Icon name="zap" size={12}/>
                    <span>Worker <code className="mono">order-proxy-router v4</code> · per-order disposable address routes through Cloudflare → backend webhook → unified inbox.</span>
                  </div>
                  <div className="kv mt-3">
                    <div className="kv-row"><dt>Catch-all domain</dt><dd className="mono">orders.efactory1.de</dd></div>
                    <div className="kv-row"><dt>Active mappings</dt><dd className="mono">23 orders · 1 catch-all rule</dd></div>
                    <div className="kv-row"><dt>Auto-CC enforcement</dt><dd><span className="pill pill-green">kundenservice@efactory1.de always CC'd</span></dd></div>
                    <div className="kv-row"><dt>Last delivery</dt><dd className="text-faint">{TS.relTime('2026-05-07T13:42:00')}</dd></div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Per-order proxy mapping</div><span className="text-faint fs-11">5 most recent</span></div>
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>Proxy address</th><th>Order</th><th>GW</th><th>Customer</th><th>Last activity</th></tr></thead>
                  <tbody>
                    {[
                      { addr: 'order-3522@orders.efactory1.de', oid: 3522, gw: 'Isabel Walter', cust: 'Adrian Kurt', at: '2026-05-07T13:42:00' },
                      { addr: 'order-3508@orders.efactory1.de', oid: 3508, gw: 'Maja Petrović', cust: 'Lea Schmidt', at: '2026-05-07T11:14:00' },
                      { addr: 'order-3526@orders.efactory1.de', oid: 3526, gw: 'Maja Petrović', cust: 'Jana Brandt', at: '2026-05-07T10:43:00' },
                      { addr: 'order-3520@orders.efactory1.de', oid: 3520, gw: 'Isabel Walter', cust: 'Paul Neumann', at: '2026-05-06T16:30:00' },
                      { addr: 'order-3530@orders.efactory1.de', oid: 3530, gw: 'Felix Becker', cust: 'Nina Iversen', at: '2026-05-06T09:14:00' },
                    ].map(m => (
                      <tr key={m.oid}>
                        <td className="mono fs-11">{m.addr}</td>
                        <td className="mono">#{m.oid}</td>
                        <td className="fs-12">{m.gw}</td>
                        <td className="fs-12">{m.cust}</td>
                        <td className="text-faint fs-11">{TS.relTime(m.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Worker logs</div><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'Worker logs streamed · last 24h imported', tone: 'info' })}><Icon name="download" size={12}/> Tail</button></div>
                <div className="card-pad fs-11 mono" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, lineHeight: 1.7 }}>
                  <div>14:32:01 · email.received · order-3522 · sender=adrian.kurt@example.com · routed to Isabel Walter + CC kundenservice@</div>
                  <div>13:42:18 · email.received · order-3522 · sender=isabel.walter@gw.efactory1.de · routed to Adrian Kurt + CC kundenservice@</div>
                  <div>11:14:07 · email.received · order-3508 · sender=lea.schmidt@example.com · sentiment=tense → flagged</div>
                  <div>09:55:42 · email.received · order-3499 · keyword=Rate → auto-redirected to kundenservice@</div>
                </div>
              </div>
            </div>
          )}

          {section === 'agbs' && (
            <div className="flex-col gap-3">
              <div className="card">
                <div className="card-head"><div className="card-title">AGB versions</div><NotReady className="btn btn-sm btn-primary" feature="agb-publish"><Icon name="plus" size={12}/> Publish new version</NotReady></div>
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>Version</th><th>Effective</th><th>Status</th><th className="num">Signed by GWs</th><th></th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="mono strong">v3.2</td>
                      <td className="mono">01.04.2026</td>
                      <td><span className="pill pill-green">Active</span></td>
                      <td className="num mono">11 / 12</td>
                      <td className="num"><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'AGB v3.2 PDF download started', tone: 'info' })}><Icon name="download" size={11}/> PDF</button></td>
                    </tr>
                    <tr>
                      <td className="mono">v3.1</td>
                      <td className="mono">15.10.2025</td>
                      <td><span className="pill pill-slate">Superseded</span></td>
                      <td className="num mono text-faint">12 / 12</td>
                      <td className="num"><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'AGB v3.1 PDF download started', tone: 'info' })}><Icon name="download" size={11}/> PDF</button></td>
                    </tr>
                    <tr>
                      <td className="mono">v3.0</td>
                      <td className="mono">01.06.2025</td>
                      <td><span className="pill pill-slate">Archived</span></td>
                      <td className="num mono text-faint">—</td>
                      <td className="num"><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'AGB v3.0 PDF download started', tone: 'info' })}><Icon name="download" size={11}/> PDF</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Key clauses (v3.2)</div></div>
                <div className="card-pad">
                  <div className="kv" style={{ fontSize: 12 }}>
                    <div className="kv-row"><dt>§1.2 Vergütung</dt><dd>Fee fixed in advance in job confirmation</dd></div>
                    <div className="kv-row"><dt>§1.3 Fälligkeit</dt><dd>Payment due within 30 days of invoice after job completion</dd></div>
                    <div className="kv-row"><dt>§5.2 Nacharbeit</dt><dd>GW must fix defects immediately on request</dd></div>
                    <div className="kv-row"><dt>§13 Ausschluss</dt><dd>No AI, no plagiarism — violations void payment</dd></div>
                    <div className="kv-row"><dt>§13.3 Freigabe</dt><dd>efactory1 reviews quality + customer satisfaction before release</dd></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'localization' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Languages & currencies</div><span className="pill pill-blue" style={{ fontSize: 10 }}>D-12 / D-13</span></div>
              <div className="card-pad flex-col gap-3">
                <div className="banner info" style={{ fontSize: 11.5 }}>
                  <Icon name="globe" size={12}/>
                  <span>App built English-first. All user-facing strings live in i18n resource files. Currency-aware data model · pluggable tax engine.</span>
                </div>
                <div>
                  <div className="text-faint fs-11 mb-2">Active locales</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="pill pill-green">de-DE · German (default for content)</span>
                    <span className="pill pill-green">en-US · English (UI default)</span>
                    <span className="pill pill-slate">de-AT <PlannedTag/></span>
                    <span className="pill pill-slate">de-CH <PlannedTag/></span>
                    <span className="pill pill-slate">tr-TR <PlannedTag/></span>
                  </div>
                </div>
                <div>
                  <div className="text-faint fs-11 mb-2">Currencies</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="pill pill-green">EUR · default</span>
                    <span className="pill pill-slate">CHF · pending Swiss VAT engine</span>
                  </div>
                </div>
                <div>
                  <div className="text-faint fs-11 mb-2">VAT engines</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="pill pill-green">DE · 7% educational</span>
                    <span className="pill pill-green">DE · 19% non-educational</span>
                    <span className="pill pill-slate">AT · pending</span>
                    <span className="pill pill-slate">CH · pending</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'automations' && (
            <div className="flex-col gap-3">
              <div className="card">
                <div className="card-head"><div className="card-title">Scheduled automations</div><span className="pill pill-green"><Icon name="check" size={10}/> Cron healthy</span></div>
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {[
                      { name: 'Deadline alerts (D-2 / D-1)', cron: 'Daily 09:00', last: '2026-05-07T09:00:00', status: 'ok', detail: '7 alerts sent' },
                      { name: 'Friday batch reminder', cron: 'Friday 09:00', last: '2026-05-02T09:00:00', status: 'ok', detail: 'Last week: 14 releasable' },
                      { name: 'Pipedrive sync', cron: 'Every 5 min', last: '2026-05-07T13:18:00', status: 'ok', detail: '0 errors last 7d' },
                      { name: 'Sevdesk sync', cron: 'Every 15 min', last: '2026-05-07T13:18:00', status: 'ok', detail: '645 invoices YTD' },
                      { name: 'Stripe webhook health', cron: 'Continuous', last: '2026-05-07T14:31:00', status: 'ok', detail: '0 failures last 7d' },
                      { name: 'Subscriber-limit watcher (Pipedrive)', cron: 'Daily 06:00', last: '2026-05-07T06:00:00', status: 'warn', detail: '4,159/5,000 subscribers' },
                      { name: 'AI/Plagiarism re-scan queue', cron: 'On submission', last: '2026-05-07T09:14:00', status: 'ok', detail: '7 scans today' },
                    ].map(a => (
                      <tr key={a.name}>
                        <td className="strong fs-12">{a.name}</td>
                        <td className="mono fs-11 text-muted">{a.cron}</td>
                        <td className="text-faint fs-11">{TS.relTime(a.last)}</td>
                        <td>{a.status === 'ok' ? <span className="pill pill-green">OK</span> : <span className="pill pill-amber">Warning</span>}</td>
                        <td className="text-faint fs-11">{a.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
window.SettingsPage = SettingsPage;

// ============ TWEAKS PANEL ============
function TweaksPanel({ tweaks, setTweak, onClose }) {
  return (
    <div className="modal-backdrop" style={{ alignItems: 'flex-start', justifyContent: 'flex-end', background: 'transparent', pointerEvents: 'none' }}>
      <div style={{ width: 320, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', margin: 16, marginTop: 76, pointerEvents: 'auto' }}>
        <div className="flex items-center justify-between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <strong style={{ fontSize: 13 }}>Tweaks</strong>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="card-pad flex-col gap-3" style={{ fontSize: 12 }}>
          <div>
            <div className="text-muted mb-2">Theme</div>
            <div className="flex gap-1">
              {[['light','Light'],['dark','Dark'],['hc','High contrast']].map(([v,l]) => (
                <button key={v} className={`chip ${tweaks.theme===v?'active':''}`} onClick={() => setTweak('theme', v)} style={{ flex: 1, justifyContent: 'center' }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-muted mb-2">Density</div>
            <div className="flex gap-1">
              {[['compact','Compact'],['cozy','Cozy']].map(([v,l]) => (
                <button key={v} className={`chip ${tweaks.density===v?'active':''}`} onClick={() => setTweak('density', v)} style={{ flex: 1, justifyContent: 'center' }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-muted mb-2">Locale</div>
            <div className="flex gap-1">
              {[['de','Deutsch'],['en','English'],['both','Bilingual']].map(([v,l]) => (
                <button key={v} className={`chip ${tweaks.locale===v?'active':''}`} onClick={() => setTweak('locale', v)} style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-muted mb-2">Accent color</div>
            <div className="flex gap-2">
              {[
                { v: '#1F62F0', name: 'Blue' },
                { v: '#0F766E', name: 'Teal' },
                { v: '#7c3aed', name: 'Violet' },
                { v: '#DC2626', name: 'Red' },
                { v: '#0EA5E9', name: 'Sky' },
              ].map(c => (
                <button key={c.v} onClick={() => setTweak('accent', c.v)} title={c.name}
                  style={{ width: 28, height: 28, borderRadius: 14, background: c.v, border: tweaks.accent === c.v ? '2px solid var(--text)' : '2px solid var(--border)', cursor: 'pointer' }}/>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
            <span className="text-muted">Show debug overlay</span>
            <input type="checkbox" checked={tweaks.debug} onChange={e => setTweak('debug', e.target.checked)}/>
          </div>
          <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
            <span className="text-muted">Animate KPI counters</span>
            <input type="checkbox" checked={tweaks.animateCounters} onChange={e => setTweak('animateCounters', e.target.checked)}/>
          </div>
          <div className="banner info" style={{ fontSize: 11 }}>
            <Icon name="zap" size={12}/>
            <span>Tweaks persist live across the prototype.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.TweaksPanel = TweaksPanel;

// ====================================================================
// GHOSTWRITER PERSONA SCREENS — minimal, top priority per PRD
// ====================================================================

// "Isabel Walter" is the demo GW
const GW_ME = TD.gw('gw-iw') || { name: 'Isabel Walter', initials: 'IW', email: 'isabel.walter@gw.efactory1.de' };
// My assignments derived from data
const myAssignments = () => TD.liveOrders().filter(o => o.gwId === 'gw-iw');

// ============ GW DASHBOARD ============
function GWDashboard({ navigate }) {
  const mine = myAssignments();
  const activeCount = mine.filter(o => ['active','interim_submitted','under_customer_review','revision_required','final_submitted','qa_review'].includes(o.status)).length;
  // Earnings split (G-10):
  //   paid this month → already in bank (gwPaymentStatus === 'paid')
  //   releasable Friday → invoice received but not yet paid out
  const earningsThisMonth = mine.filter(o => o.gwPaymentStatus === 'paid').reduce((s,o) => s + (o.netHonorarium||0), 0);
  const nextPayday = mine.filter(o => o.gwPaymentStatus === 'invoice_received').reduce((s,o) => s + (o.netHonorarium||0), 0);
  const upcomingDeadlines = mine
    .filter(o => o.finalDeadline || o.interimDeadline)
    .flatMap(o => [
      o.interimDeadline && { orderId: o.id, kind: 'Zwischenstand 1 / Interim 1', date: o.interimDeadline, title: o.title },
      o.finalDeadline && { orderId: o.id, kind: 'Final delivery', date: o.finalDeadline, title: o.title },
    ].filter(Boolean))
    .filter(d => TS.daysTo(d.date) >= -1 && TS.daysTo(d.date) <= 14)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const previewJobs = [
    { id: 9101, title: 'Cloud-native Architekturen für Mittelstand', field: 'Wirtschaftsinformatik', pages: 14, honorEur: 318.75, deadline: '2026-05-19' },
    { id: 9102, title: 'DSGVO Compliance bei KI-gestützten HR-Tools', field: 'Recht', pages: 22, honorEur: 538.10, deadline: '2026-05-25' },
    { id: 9103, title: 'Bindungsstile und digitale Intimität', field: 'Psychologie', pages: 45, honorEur: 1296.40, deadline: '2026-06-08' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hallo {GW_ME.name.split(' ')[0]}</h1>
          <div className="page-subtitle">Donnerstag, {TS.fmtDate('2026-05-07')} · Friday payday tomorrow</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('gw-job-board')}><Icon name="clipboard-list" size={14}/> Browse job board</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Active jobs</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{activeCount}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Earnings this month</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{TS.EUR(earningsThisMonth)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">On-time rate</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{Math.round((GW_ME.onTime||0)*100)}%</div>
          <div className="text-faint fs-11 mt-1">★ {GW_ME.rating?.toFixed(1)} avg rating · {GW_ME.lifetime} lifetime</div>
        </div>
        <div className="card" style={{ padding: 14, border: nextPayday > 0 ? '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Next payday · Friday</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{TS.EUR(nextPayday)}</div>
          <div className="text-faint fs-11 mt-1">{nextPayday > 0 ? '1 invoice cleared · arrives 1–3 business days' : 'Nothing releasable this week'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Upcoming deadlines</div>
            <span className="text-faint fs-11">next 14 days · cutoff 18:00</span>
          </div>
          <div className="card-pad flex-col gap-2">
            {upcomingDeadlines.length === 0 && <div className="text-faint fs-12">No deadlines in the next two weeks.</div>}
            {upcomingDeadlines.map((d, i) => {
              const meta = TS.deadlineMeta(d.date);
              return (
                <div key={i} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: d.orderId })}>
                  <div className="action-icon" style={{ background: meta.tone === 'danger' ? 'var(--red-soft)' : 'var(--blue-soft)', color: meta.tone === 'danger' ? 'var(--red)' : 'var(--blue)' }}>
                    <Icon name={d.kind.startsWith('Final') ? 'check-circle' : 'file-text'} size={14}/>
                  </div>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                    <span className="strong fs-12">#{d.orderId} · {d.kind}</span>
                    <span className="text-faint fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>{d.title}</span>
                  </div>
                  <div className="text-faint fs-11 mono">{TS.fmtDate(d.date)}, 18:00</div>
                  <span className={`pill pill-${meta.tone === 'danger' ? 'red' : meta.tone === 'warn' ? 'amber' : 'slate'}`}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Available jobs · {previewJobs.length}</div>
              <button className="btn btn-sm" onClick={() => navigate('gw-job-board')}>Open board →</button>
            </div>
            <div className="card-pad flex-col gap-2">
              {previewJobs.map(j => (
                <div key={j.id} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="mono fs-11 text-faint">#{j.id}</span>
                    <span className="mono fs-11" style={{ color: 'var(--green)' }}>{TS.EUR(j.honorEur)}</span>
                  </div>
                  <div className="strong fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                  <div className="text-faint fs-11">{j.field} · {j.pages} pages · {TS.fmtDate(j.deadline)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="banner info">
            <Icon name="lock" size={14}/>
            <span>All customer chats are auto-CC&apos;d to efactory1. Financial questions auto-redirect to kundenservice@efactory1.de.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
window.GWDashboard = GWDashboard;

// ============ GW PAYMENTS ============
function GWPayments({ navigate }) {
  const mine = myAssignments();
  const releasable = mine.filter(o => o.gwPaymentStatus === 'invoice_received');
  const pending = mine.filter(o => o.gwPaymentStatus === 'work_in_progress');
  const paid = mine.filter(o => o.gwPaymentStatus === 'paid');
  const sumOf = (xs) => xs.reduce((s,o) => s + (o.netHonorarium||0), 0);

  const Row = ({ o, blocker }) => (
    <tr style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: o.id })}>
      <td className="mono">#{o.id}</td>
      <td className="fs-12" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</td>
      <td className="num mono">{Math.round((o.rate||0)*100)}%</td>
      <td className="num mono strong" style={{ color: 'var(--green)' }}>{TS.EUR(o.netHonorarium)}</td>
      <td className="text-muted fs-11">{blocker || '—'}</td>
    </tr>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Payments</h1>
          <div className="page-subtitle">Honoraria are released every Friday after customer satisfaction + revisions complete + all installments paid + invoice received</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="export-ledger"><Icon name="download" size={14}/> Export ledger</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14, border: '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' }}>
          <div className="text-faint fs-11">Releasable Friday</div>
          <div className="mono strong" style={{ fontSize: 24, color: 'var(--green)', marginTop: 4 }}>{TS.EUR(sumOf(releasable))}</div>
          <div className="text-faint fs-11 mt-1">{releasable.length} assignment(s) · arrives 1–3 business days after release</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Pending (work in progress)</div>
          <div className="mono strong" style={{ fontSize: 24, marginTop: 4 }}>{TS.EUR(sumOf(pending))}</div>
          <div className="text-faint fs-11 mt-1">{pending.length} assignment(s) · upload final + invoice to unlock</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Paid (lifetime · last 12 mo)</div>
          <div className="mono strong" style={{ fontSize: 24, marginTop: 4 }}>{TS.EUR(sumOf(paid) + 14820)}</div>
          <div className="text-faint fs-11 mt-1">{(paid.length || 0) + 38} payouts · avg {TS.EUR(((sumOf(paid) + 14820) / ((paid.length||0) + 38)))}</div>
        </div>
      </div>

      <div className="card mb-3" style={{ border: '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' }}>
        <div className="card-head"><div className="card-title flex items-center gap-2"><Icon name="wallet" size={14}/> Releasing this Friday · {TS.fmtDate('2026-05-08')}</div><span className="pill pill-green">Ready</span></div>
        {releasable.length === 0 ? (
          <div className="card-pad text-faint fs-12">No releases this week.</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Order</th><th>Title</th><th className="num">Rate</th><th className="num">Honorar (net)</th><th>Note</th></tr></thead>
            <tbody>{releasable.map(o => <Row key={o.id} o={o} blocker="invoice received · awaiting Friday batch"/>)}</tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Pending — work in progress</div></div>
        <table className="tbl">
          <thead><tr><th>Order</th><th>Title</th><th className="num">Rate</th><th className="num">Honorar (net)</th><th>Blocker</th></tr></thead>
          <tbody>
            {pending.length === 0 && <tr><td colSpan={5} className="text-faint fs-12" style={{ padding: 16, textAlign: 'center' }}>Nothing pending — claim a job on the board.</td></tr>}
            {pending.map(o => {
              const blocker = o.status === 'active' ? 'upload interim or final to advance' : o.status === 'qa_review' ? 'awaiting QA verdict' : o.status === 'revision_required' ? 'customer requested revision' : 'awaiting next milestone';
              return <Row key={o.id} o={o} blocker={blocker}/>;
            })}
          </tbody>
        </table>
      </div>

      <div className="banner info mt-3">
        <Icon name="lock" size={14}/>
        <span><strong>Payment policy:</strong> Honoraria release after the 5-gate check passes (customer satisfied · QA approved · revisions complete · all customer installments paid · GW invoice received). See AGB v3.2 §4.</span>
      </div>
    </div>
  );
}
window.GWPayments = GWPayments;

// ============ GW TEMPLATES ============
function GWTemplates() {
  const templates = [
    { name: 'Vorlage_Deckblatt_efactory1.de.docx', label: 'Cover page template', sub: 'Deckblatt für jede Arbeit · DE/EN', size: '184 KB', icon: 'file-text', tone: 'blue' },
    { name: 'Expose_Vorlage_efactory1.docx', label: 'Exposé template', sub: 'Strukturvorlage für Forschungsantrag', size: '212 KB', icon: 'file-text', tone: 'blue' },
    { name: 'Thesis_Vorlage_efactory1.docx', label: 'Thesis template', sub: 'Bachelor- und Masterarbeit · APA/Harvard', size: '276 KB', icon: 'file-text', tone: 'blue' },
    { name: '200_Formulierungen_efactory1.docx', label: '200 academic phrases', sub: 'Bewährte Formulierungen für jeden Abschnitt', size: '88 KB', icon: 'file-text', tone: 'green' },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates</h1>
          <div className="page-subtitle">Mustervorlagen für jede Arbeit · download once, reuse always</div>
        </div>
      </div>

      <div className="banner info mb-3">
        <Icon name="zap" size={14}/>
        <span>Use these templates as the starting point for every submission. They embed the efactory1 Deckblatt, footer and citation style — required by AGB v3.2.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {templates.map(t => (
          <div key={t.name} className="card" style={{ padding: 16 }}>
            <div className="flex items-start gap-3">
              <div className="action-icon" style={{ background: t.tone === 'green' ? 'var(--green-soft)' : 'var(--blue-soft)', color: t.tone === 'green' ? 'var(--green)' : 'var(--blue)', width: 40, height: 40 }}>
                <Icon name={t.icon} size={18}/>
              </div>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.3 }}>
                <span className="strong fs-13">{t.label}</span>
                <span className="text-faint fs-11 mono">{t.name}</span>
                <span className="text-muted fs-11 mt-1">{t.sub}</span>
              </div>
              <span className="text-faint fs-11">{t.size}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <NotReady className="btn btn-sm" feature="template-download" style={{ flex: 1, justifyContent: 'center' }}><Icon name="download" size={12}/> Download .docx</NotReady>
              <NotReady className="btn btn-sm" feature="file-preview" ariaLabel="Preview template"><Icon name="eye" size={12}/></NotReady>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.GWTemplates = GWTemplates;

// ============ GW MESSAGES ============
function GWMessages({ navigate }) {
  const snippets = [
    { msg: 'Passt so — bitte mit Kapitel 3 weitermachen. Ich melde mich wieder zum Zwischenstand.', at: '2026-05-07T10:34:00', from: 'customer' },
    { msg: 'Ich habe die Outline angepasst und an Sie über die Plattform gesendet.', at: '2026-05-07T08:12:00', from: 'me' },
    { msg: 'Frage: Können wir noch eine empirische Erhebung ergänzen? Budget bitte über kundenservice@efactory1.de klären.', at: '2026-05-06T16:45:00', from: 'customer', flag: 'redirect' },
    { msg: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.', at: '2026-05-06T11:20:00', from: 'me' },
    { msg: 'Vielen Dank für die schnelle Rückmeldung — sehr gute Arbeit bisher!', at: '2026-05-05T17:08:00', from: 'customer' },
  ];

  const threads = myAssignments().slice(0, 5).map((o, i) => {
    const s = snippets[i % snippets.length];
    return {
      orderId: o.id,
      title: o.title,
      customer: TD.customer(o.customerId)?.name || 'Customer',
      customerInitials: TD.customer(o.customerId)?.initials || '··',
      lastMsg: s.msg,
      lastAt: s.at,
      lastFrom: s.from,
      flag: s.flag,
      unread: s.from === 'customer' && i < 2 ? 1 : 0,
    };
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <div className="page-subtitle">Customer threads · per-order · efactory1 always in CC</div>
        </div>
      </div>

      <div className="banner warn mb-3">
        <Icon name="lock" size={14}/>
        <div style={{ flex: 1 }}>
          <strong>Auto-CC enforced.</strong> Every message you send is automatically CC&apos;d to <span className="mono">kundenservice@efactory1.de</span>.
          Financial questions ("price", "rate", "invoice") are intercepted and redirected to efactory1 — do not negotiate money with customers.
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Active threads</div><span className="text-faint fs-11">{threads.length} threads</span></div>
        <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
          {threads.map(t => (
            <div key={t.orderId} className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate('gw-assignment-detail', { id: t.orderId })}>
              <Avatar initials={t.customerInitials} size={32}/>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.3 }}>
                <div className="flex items-center gap-2">
                  <span className="strong fs-12">{t.customer}</span>
                  <span className="mono fs-11 text-faint">#{t.orderId}</span>
                  {t.unread > 0 && <span className="pill pill-red" style={{ fontSize: 10 }}>{t.unread} new</span>}
                  {t.flag === 'redirect' && <span className="pill pill-amber" style={{ fontSize: 10 }} title="Financial keyword detected — auto-redirected to kundenservice@efactory1.de"><Icon name="alert-triangle" size={9}/> redirected</span>}
                </div>
                <span className="text-faint fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 540 }}>
                  {t.lastFrom === 'me' && <span className="text-faint">You: </span>}
                  {t.lastMsg}
                </span>
              </div>
              <span className="text-faint fs-11 mono">{TS.relTime(t.lastAt)}</span>
              <Icon name="chevron-right" size={14} className="text-faint"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.GWMessages = GWMessages;

// ============ GW PROFILE ============
function GWProfile() {
  const me = GW_ME;
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <div className="page-subtitle">Account, banking and freelance contract</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="edit-record" label="Edit ghostwriter"><Icon name="edit" size={14}/> Edit</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Personal info</div></div>
          <div className="card-pad flex items-center gap-3 mb-3">
            <Avatar initials={me.initials} size={56} tone="blue"/>
            <div className="flex-col" style={{ lineHeight: 1.3 }}>
              <span className="strong" style={{ fontSize: 16 }}>{me.name}</span>
              <span className="text-faint fs-11 mono">{me.email}</span>
              <span className="text-faint fs-11 mono">{me.phone}</span>
            </div>
          </div>
          <div className="kv">
            <div className="kv-row"><dt>Languages</dt><dd>{(me.languages||[]).join(' · ')}</dd></div>
            <div className="kv-row"><dt>Availability</dt><dd className="mono">{me.avail || 'Mo–Fr 18–23'}</dd></div>
            <div className="kv-row"><dt>Member since</dt><dd className="mono">2024-08-12</dd></div>
            <div className="kv-row"><dt>Lifetime jobs</dt><dd className="mono">{me.lifetime} · ★ {me.rating?.toFixed(1)} · {Math.round((me.onTime||0)*100)}% on-time</dd></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Expertise</div><NotReady className="btn btn-sm" feature="expertise-tag"><Icon name="plus" size={12}/> Tag</NotReady></div>
          <div className="card-pad">
            <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
              {(me.expertise||[]).map(e => <span key={e} className="pill pill-blue">{e}</span>)}
            </div>
            <div className="text-muted fs-11">Berat assigns jobs based on these tags — keep them precise.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Banking (Honorar payouts)</div><span className="pill pill-green"><Icon name="check" size={10}/> Verified</span></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>IBAN</dt><dd className="mono">{me.iban || 'DE•• •••• •••• •••• ••••'}</dd></div>
              <div className="kv-row"><dt>Tax ID (Steuernummer)</dt><dd className="mono">{me.taxId || '••/•••/•••••'}</dd></div>
              <div className="kv-row"><dt>Invoice prefix</dt><dd className="mono">IW-2026-•••</dd></div>
            </div>
            <div className="banner info mt-3" style={{ fontSize: 11.5 }}>
              <Icon name="lock" size={12}/>
              <span>Bank details are masked. Click Edit to reveal & change. Payouts are SEPA · 1–3 business days.</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Freelance contract / AGB</div><span className="pill pill-green">Signed</span></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>Current version</dt><dd className="mono">{me.agbsVersion || 'v3.2'}</dd></div>
              <div className="kv-row"><dt>Signed at</dt><dd className="mono">{TS.fmtDate(me.agbsAt || '2025-09-12')}</dd></div>
              <div className="kv-row"><dt>Werkvertrag</dt><dd>Individual-Werk · not employment</dd></div>
            </div>
            <NotReady className="btn btn-sm mt-3" feature="agb-download"><Icon name="download" size={12}/> Download signed PDF</NotReady>
          </div>
        </div>
      </div>
    </div>
  );
}
window.GWProfile = GWProfile;

// ============ GW SUBMISSIONS LIST ============
function GWSubmissionsList({ navigate }) {
  // Pull explicit SUBMISSIONS authored by this GW first.
  const explicit = (TD.SUBMISSIONS || []).filter(s => {
    const o = TD.order(s.orderId);
    return o && o.gwId === 'gw-iw';
  }).map(s => ({
    id: s.id, orderId: s.orderId, kind: s.kind, round: s.round,
    fileName: s.fileName, size: s.size,
    qaStatus: s.qaStatus, plagScore: s.plagiarismScore, aiScore: s.aiScore,
    submittedAt: s.submittedAt,
  }));
  // Then synthesize one or two submissions per real assignment so the page is never empty.
  const myAssignments = TD.liveOrders().filter(o => o.gwId === 'gw-iw');
  const seedHash = (n) => Math.abs(((n * 2654435761) | 0));
  const derived = [];
  myAssignments.forEach(o => {
    const orderHash = seedHash(o.id);
    const submitted = ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status);
    if (!submitted) return;
    if (o.interimDeadline) {
      derived.push({
        id: 'derived-i1-' + o.id, orderId: o.id, kind: 'interim_1', round: 1,
        fileName: `${TD.WORK_TYPE_LABELS[o.workType] || 'Arbeit'}_${o.id}_Zwischenstand1.docx`,
        size: 380000 + (orderHash % 700000),
        qaStatus: 'passed',
        plagScore: 4 + (orderHash % 9),
        aiScore: 3 + (orderHash % 12),
        submittedAt: o.interimDeadline,
      });
    }
    if (['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status)) {
      derived.push(
        {
          id: 'derived-final-' + o.id, orderId: o.id, kind: 'final_work', round: (o.revisionRounds || 0) + 1,
          fileName: `Final_${o.id}_${TD.WORK_TYPE_LABELS[o.workType] || ''}.docx`,
          size: 1100000 + (orderHash % 1900000),
          qaStatus: o.status === 'completed' || o.qaPassed ? 'passed' : 'pending',
          plagScore: 5 + (orderHash % 10),
          aiScore: 4 + (orderHash % 13),
          submittedAt: o.finalDeadline,
        },
        {
          id: 'derived-inv-' + o.id, orderId: o.id, kind: 'final_invoice', round: 1,
          fileName: `Honorarrechnung_IW-2026-${String(o.id).padStart(3,'0')}.pdf`,
          size: 80000 + (orderHash % 25000),
          qaStatus: 'passed',
          submittedAt: o.finalDeadline,
        }
      );
    }
  });
  // Merge: explicit override derived (same id namespace differs) — explicit first, then any derived not already present
  const seen = new Set(explicit.map(s => `${s.orderId}-${s.kind}-${s.round}`));
  const merged = [
    ...explicit,
    ...derived.filter(d => !seen.has(`${d.orderId}-${d.kind}-${d.round}`)),
  ];
  // Sort newest first
  const all = merged.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  const kindLabel = { interim_1: 'Zwischenstand 1', interim_2: 'Zwischenstand 2', final_work: 'Final work', final_invoice: 'Honorarrechnung', extension_invoice: 'Zusatzrechnung', revision: 'Revision' };
  const fmtSize = (b) => b > 1e6 ? (b/1e6).toFixed(1) + ' MB' : Math.round(b/1024) + ' KB';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Submissions</h1>
          <div className="page-subtitle">Everything you&apos;ve uploaded · interim drafts, final works, invoices · QA status visible</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('gw-submit')}><Icon name="upload-cloud" size={14}/> New submission</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Kind</th>
              <th className="num">Round</th>
              <th>File</th>
              <th className="num">Plagiarism</th>
              <th className="num">AI</th>
              <th>QA status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {all.map(s => {
              const o = TD.order(s.orderId);
              return (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: s.orderId })}>
                  <td>
                    <div className="flex-col" style={{ lineHeight: 1.25 }}>
                      <span className="mono strong fs-12">#{s.orderId}</span>
                      <span className="text-faint fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{o?.title || '—'}</span>
                    </div>
                  </td>
                  <td><span className="pill pill-blue">{kindLabel[s.kind] || s.kind}</span></td>
                  <td className="num mono">{s.round || 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Icon name="file-text" size={12} className="text-faint"/>
                      <span className="mono fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{s.fileName}</span>
                      <span className="text-faint fs-11">· {fmtSize(s.size || s.fileSize || 200000)}</span>
                    </div>
                  </td>
                  <td className="num mono">{s.plagScore != null ? <span style={{ color: s.plagScore < 15 ? 'var(--green)' : s.plagScore < 30 ? 'var(--amber)' : 'var(--red)' }}>{s.plagScore}%</span> : '—'}</td>
                  <td className="num mono">{s.aiScore != null ? <span style={{ color: s.aiScore < 15 ? 'var(--green)' : s.aiScore < 30 ? 'var(--amber)' : 'var(--red)' }}>{s.aiScore}%</span> : '—'}</td>
                  <td>
                    {s.qaStatus === 'passed' && <span className="pill pill-green"><Icon name="check" size={10}/> Passed</span>}
                    {s.qaStatus === 'pending' && <span className="pill pill-amber">Pending</span>}
                    {s.qaStatus === 'failed_revision_required' && <span className="pill pill-orange">Revision</span>}
                    {s.qaStatus === 'ai_violation' && <span className="pill pill-red">AI violation</span>}
                  </td>
                  <td className="text-faint fs-11 mono">{TS.relTime(s.submittedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.GWSubmissionsList = GWSubmissionsList;

// ============ GW ASSIGNMENT DETAIL (privacy-respecting view for GW) ============
// IMPORTANT: GWs may NOT see gross price, VAT, Berat's margin, release gate,
// Pipedrive funnel, Sevdesk invoice details, customer email/phone/LTV/lead source.
// Per PRD: GW sees only job spec, customer name (after approval), their own
// honorarium, submission tiles, messages, templates, deadlines.
function GWAssignmentDetail({ orderId, navigate, toast, fixState, setFixState }) {
  const baseOrder = TD.order(orderId);
  if (!baseOrder) return <div className="page">Assignment not found.</div>;
  const order = { ...baseOrder, ...((fixState || {})[baseOrder.id] || {}) };
  const cust = TD.customer(order.customerId);
  const dm = TS.deadlineMeta(order.finalDeadline);
  const isPending = order.status === 'claimed_pending_approval';
  const isApproved = !isPending && !['available','qualified','offer_sent','invoice_sent','paid','lead'].includes(order.status);
  const isRevision = order.status === 'revision_required';
  // First-contact wizard surfaces only after approval, before any submission, and once per assignment.
  const showFirstContact = isApproved && order.status === 'active' && !order.firstContactDone;

  const stages = [
    { id: 'pending', label: 'Pending Approval', done: !isPending },
    { id: 'active', label: 'Active', done: ['active','interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(order.status) },
    { id: 'interim', label: 'Interim', done: ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(order.status) },
    { id: 'final', label: 'Final', done: ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(order.status) },
    { id: 'review', label: 'Customer Review', done: ['delivered','payment_pending','completed'].includes(order.status) },
    { id: 'paid', label: 'Paid', done: order.status === 'completed' || order.gwPaymentStatus === 'paid' },
  ];
  const currentStage = stages.findIndex(s => !s.done);
  const activeStageIdx = currentStage === -1 ? stages.length - 1 : currentStage;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${order.id}`]}/>
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="mono">#{order.id}</span>
            <StatusPill status={order.status}/>
            <span style={{ fontWeight: 400, color: 'var(--text-2)', fontSize: 16 }}>· {order.titleTBD ? <em>folgt</em> : order.title}</span>
          </h1>
          <div className="page-subtitle flex gap-3 items-center" style={{ marginTop: 6 }}>
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final delivery <span className="mono">{TS.fmtDate(order.finalDeadline)}, 18:00</span></span>
            <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('gw-active')}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      {isPending && (
        <div className="banner info mb-3">
          <Icon name="clock" size={14}/>
          <span><strong>Awaiting Berat&apos;s approval.</strong> Customer details and platform chat unlock once approved (avg 3h 18m). You can browse the job spec below.</span>
        </div>
      )}

      {showFirstContact && (
        <div className="banner success mb-3" style={{ borderLeft: '4px solid var(--blue)' }}>
          <Icon name="zap" size={14}/>
          <div style={{ flex: 1 }}>
            <strong>Your next step → First-contact wizard.</strong>
            <div className="fs-11 mt-1">Step-by-step intro to {cust?.name?.split(' ')[0] || 'the customer'} · pre-filled with the financial-firewall reminder · CC kundenservice@efactory1.de.</div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('gw-first-contact', { id: order.id })}>
            <Icon name="arrow-right" size={12}/> Open wizard
          </button>
        </div>
      )}

      {isRevision && (
        <div className="card mb-3" style={{ borderLeft: '4px solid var(--orange)' }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2">
              <Icon name="alert-triangle" size={14} style={{ color: 'var(--orange)' }}/> Customer feedback — revision required (round {(order.revisionRounds || 1)})
            </div>
            <span className="text-faint fs-11">received {order.lastFeedbackAt ? TS.relTime(order.lastFeedbackAt) : '6h ago'}</span>
          </div>
          <div className="card-pad">
            <div className="kv" style={{ fontSize: 12, marginBottom: 12 }}>
              <div className="kv-row"><dt>From</dt><dd><strong>{cust?.name || 'Customer'}</strong></dd></div>
              <div className="kv-row"><dt>Round</dt><dd className="mono">{order.revisionRounds || 1} of 3</dd></div>
              <div className="kv-row"><dt>Free revisions remaining</dt><dd>{Math.max(0, 3 - (order.revisionRounds || 1))} (AGB v3.2 §5)</dd></div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
              {order.feedbackText || `Die Methodik in Kapitel 3 ist mir noch zu oberflächlich — bitte mit zusätzlichen empirischen Beispielen ergänzen. Quellenlage in §5 wirkt zu schmal (nur 4 Quellen für die Konklusion). Sonst passt der Stil sehr gut, danke!`}
            </div>
            <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('gw-submit', { id: order.id, kind: 'final' })}>
                <Icon name="upload-cloud" size={12}/> Upload revised version
              </button>
              <button className="btn btn-sm" onClick={() => navigate('gw-messages')}>
                <Icon name="message-square" size={12}/> Reply to customer
              </button>
              <button className="btn btn-sm" onClick={() => toast && toast({ text: 'Clarification request sent to efactory1 — Berat will mediate.', tone: 'info' })}>
                <Icon name="help-circle" size={12}/> Ask efactory1 to clarify
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="flex-col gap-3">
          {/* Stepper */}
          <div className="card">
            <div className="card-pad">
              <div className="stepper">
                {stages.map((s, i) => (
                  <div key={s.id} className={`step ${i === activeStageIdx ? 'current' : ''}`}>
                    <div className={`step-bar ${s.done ? 'done' : i === activeStageIdx ? 'current' : ''}`}/>
                    <div className="step-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Job spec (no money intel) */}
          <div className="card">
            <div className="card-head"><div className="card-title">Job specification</div></div>
            <div className="card-pad">
              <div className="kv">
                <div className="kv-row"><dt>Type</dt><dd>{TD.WORK_TYPE_LABELS[order.workType] || order.workType}</dd></div>
                <div className="kv-row"><dt>Field of study</dt><dd>{order.field}</dd></div>
                <div className="kv-row"><dt>Pages</dt><dd className="mono">{order.pages || '—'}</dd></div>
                <div className="kv-row"><dt>Topic</dt><dd style={{ maxWidth: 360, textAlign: 'right' }}>{order.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : order.title}</dd></div>
                <div className="kv-row"><dt>Outline (briefing)</dt><dd><a className="flex items-center gap-1" style={{ color: 'var(--blue)' }}><Icon name="paperclip" size={12}/>Outline_v2.pdf · 412 KB</a></dd></div>
                {order.note && <div className="kv-row"><dt>Note from efactory1</dt><dd className="text-muted" style={{ maxWidth: 360, textAlign: 'right' }}>{order.note}</dd></div>}
              </div>
            </div>
          </div>

          {/* Submission tiles */}
          <div className="card">
            <div className="card-head"><div className="card-title">Submissions</div><span className="text-faint fs-11">cutoff 18:00 the day BEFORE due</span></div>
            <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {order.interimDeadline && (
                <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="strong fs-12"><Bi de="Zwischenstand 1" en="Interim 1"/></span>
                    <span className={`pill pill-${TS.deadlineMeta(order.interimDeadline).tone === 'danger' ? 'red' : 'slate'}`}>{TS.deadlineMeta(order.interimDeadline).label}</span>
                  </div>
                  <div className="text-faint fs-11 mono mb-2">due {TS.fmtDate(order.interimDeadline)}, 18:00</div>
                  <button className="btn btn-sm w-full" onClick={() => isApproved && navigate('gw-submit', { id: order.id, kind: 'interim_1' })} disabled={!isApproved} style={{ justifyContent: 'center' }}>
                    <Icon name="upload-cloud" size={12}/> Upload interim
                  </button>
                </div>
              )}
              {order.interim2Deadline && (
                <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="strong fs-12"><Bi de="Zwischenstand 2" en="Interim 2"/></span>
                    <span className="pill pill-slate">{TS.deadlineMeta(order.interim2Deadline).label}</span>
                  </div>
                  <div className="text-faint fs-11 mono mb-2">due {TS.fmtDate(order.interim2Deadline)}, 18:00</div>
                  <button className="btn btn-sm w-full" onClick={() => isApproved && navigate('gw-submit', { id: order.id, kind: 'interim_2' })} disabled={!isApproved} style={{ justifyContent: 'center' }}>
                    <Icon name="upload-cloud" size={12}/> Upload interim
                  </button>
                </div>
              )}
              <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="strong fs-12">Final + Honorarrechnung</span>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
                <div className="text-faint fs-11 mono mb-2">due {TS.fmtDate(order.finalDeadline)}, 18:00</div>
                <button className="btn btn-sm w-full" onClick={() => isApproved && navigate('gw-submit', { id: order.id, kind: 'final' })} disabled={!isApproved} style={{ justifyContent: 'center' }}>
                  <Icon name="upload-cloud" size={12}/> Upload final + invoice
                </button>
              </div>
              <div style={{ padding: 14, border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
                <div className="strong fs-12 mb-1">Need more time / scope?</div>
                <div className="text-faint fs-11 mb-2">Report a delay or request an extension (Zusatzrechnung).</div>
                <div className="flex gap-1">
                  <button className="btn btn-sm" disabled={!isApproved} onClick={() => navigate('gw-report-delay', { id: order.id })} style={{ flex: 1, justifyContent: 'center' }}><Icon name="clock" size={11}/> Report delay</button>
                  <button className="btn btn-sm" disabled={!isApproved} onClick={() => navigate('gw-extension', { id: order.id })} style={{ flex: 1, justifyContent: 'center' }}><Icon name="plus" size={11}/> Extension</button>
                </div>
              </div>
            </div>
          </div>

          {/* Messages preview */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Messages with customer</div>
              <button className="btn btn-sm" onClick={() => navigate('gw-messages')}>Open thread →</button>
            </div>
            <div className="card-pad">
              {!isApproved ? (
                <div className="banner info" style={{ fontSize: 11.5 }}>
                  <Icon name="lock" size={12}/>
                  <span>Customer chat unlocks after Berat approves your claim.</span>
                </div>
              ) : (
                <div className="text-muted fs-12">
                  Last message: <em>&quot;Vielen Dank für die schnelle Rückmeldung — passt so!&quot;</em>
                  <div className="text-faint fs-11 mt-1">Auto-CC kundenservice@efactory1.de · financial keywords intercepted.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — minimal, GW-safe */}
        <div className="flex-col gap-3">
          {/* Your honorarium ONLY — no gross, no VAT, no margin */}
          <div className="card" style={{ border: '1px solid color-mix(in oklab, var(--green) 30%, var(--border))' }}>
            <div className="card-head"><div className="card-title">Your honorarium</div></div>
            <div className="card-pad">
              <div className="mono strong" style={{ fontSize: 26, color: 'var(--green)' }}>{TS.EUR(order.netHonorarium)}</div>
              <div className="text-faint fs-11 mt-1">Net · paid via SEPA · arrives 1–3 days after Friday batch</div>
              <div className="banner info mt-3" style={{ fontSize: 11 }}>
                <Icon name="lock" size={12}/>
                <span>Released after final delivery + customer accepts + revisions complete + customer payment cleared.</span>
              </div>
            </div>
          </div>

          {/* Customer (name only, after approval) */}
          <div className="card">
            <div className="card-head"><div className="card-title">Customer</div></div>
            <div className="card-pad">
              {!isApproved ? (
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                    <Icon name="lock" size={16}/>
                  </div>
                  <div className="flex-col" style={{ lineHeight: 1.25 }}>
                    <span className="text-faint fs-12">Hidden</span>
                    <span className="text-faint fs-11">Unlocks after approval</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar initials={cust?.initials || '··'} size={40}/>
                  <div className="flex-col" style={{ lineHeight: 1.25 }}>
                    <strong className="fs-12">{cust?.name}</strong>
                    <span className="text-faint fs-11">Contact only via platform chat</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Templates shortcut */}
          <div className="card">
            <div className="card-head"><div className="card-title">Templates</div></div>
            <div className="card-pad flex-col gap-1">
              <a className="flex items-center gap-2" style={{ padding: 6, borderRadius: 4, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => navigate('gw-templates')}>
                <Icon name="file-text" size={12} className="text-faint"/>
                <span className="fs-11 mono">Vorlage_Deckblatt.docx</span>
              </a>
              <a className="flex items-center gap-2" style={{ padding: 6, borderRadius: 4, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => navigate('gw-templates')}>
                <Icon name="file-text" size={12} className="text-faint"/>
                <span className="fs-11 mono">Thesis_Vorlage.docx</span>
              </a>
              <a className="flex items-center gap-2" style={{ padding: 6, borderRadius: 4, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => navigate('gw-templates')}>
                <Icon name="file-text" size={12} className="text-faint"/>
                <span className="fs-11 mono">200_Formulierungen.docx</span>
              </a>
              <button className="btn btn-sm mt-2" onClick={() => navigate('gw-templates')} style={{ justifyContent: 'center' }}>Open library →</button>
            </div>
          </div>

          {/* Compliance reminders */}
          <div className="banner warn" style={{ fontSize: 11.5 }}>
            <Icon name="alert-triangle" size={12}/>
            <div>
              <strong>AGB v3.2 reminders:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                <li>No AI tools (≤25% AI score)</li>
                <li>No direct delivery to customer</li>
                <li>No money discussion — redirect to kundenservice@efactory1.de</li>
                <li>Delete customer PII after delivery (GDPR)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.GWAssignmentDetail = GWAssignmentDetail;

// ====================================================================
// QA REVIEWER PERSONA SCREENS
// ====================================================================

// ============ QA PLAGIARISM REPORTS ============
function QAPlagiarismReports({ navigate }) {
  const reports = [
    { id: 'r1', orderId: 3514, gwName: 'Dr. Henrik Vogel', gwInitials: 'HV', kind: 'final_work', score: 8, status: 'passed', topSource: 'IEEE Xplore — partial citation match', sources: 3, scannedAt: '2026-05-07T11:42:00', words: 28420 },
    { id: 'r2', orderId: 3530, gwName: 'Felix Becker', gwInitials: 'FB', kind: 'final_work', score: 12, status: 'passed', topSource: 'JSTOR — citation properly attributed', sources: 5, scannedAt: '2026-05-07T09:18:00', words: 14200 },
    { id: 'r3', orderId: 3508, gwName: 'Maja Petrović', gwInitials: 'MP', kind: 'interim_2', score: 27, status: 'flagged', topSource: 'Wikipedia (de) — paraphrasing too close', sources: 8, scannedAt: '2026-05-06T16:22:00', words: 9800 },
    { id: 'r4', orderId: 3520, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'interim_1', score: 6, status: 'passed', topSource: 'Springer Link — properly cited', sources: 2, scannedAt: '2026-05-06T14:50:00', words: 6240 },
    { id: 'r5', orderId: 3517, gwName: 'Anna König', gwInitials: 'AK', kind: 'final_work', score: 12, status: 'passed', topSource: 'Standard market terminology — no source flagged', sources: 1, scannedAt: '2026-05-06T08:15:00', words: 18900, note: 'Plag passed but AI-flagged separately' },
    { id: 'r6', orderId: 3540, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'final_work', score: 9, status: 'passed', topSource: 'Practitioner literature — common phrasing', sources: 4, scannedAt: '2026-04-26T15:30:00', words: 4120 },
    { id: 'r7', orderId: 3499, gwName: 'Lukas Bauer', gwInitials: 'LB', kind: 'final_work', score: 14, status: 'passed', topSource: 'GitHub — code comments paraphrased', sources: 6, scannedAt: '2026-04-25T12:00:00', words: 22400 },
  ];

  const today = reports.filter(r => r.scannedAt.startsWith('2026-05-07'));
  const flagged = reports.filter(r => r.status === 'flagged');
  const avgScore = Math.round(reports.reduce((s,r) => s + r.score, 0) / reports.length);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['QA', 'Plagiarism Reports']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Plagiarism Reports</h1>
          <div className="page-subtitle">Turnitin scan results · per submission · {`<15%`} green · 15–30% amber · {`>30%`} red</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="export-csv" label="Plagiarism CSV export"><Icon name="download" size={14}/> Export CSV</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Scanned today</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{today.length}</div>
        </div>
        <div className="card" style={{ padding: 14, border: flagged.length > 0 ? '1px solid color-mix(in oklab, var(--amber) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Flagged for review</div>
          <div className="mono strong" style={{ fontSize: 22, color: flagged.length ? 'var(--amber)' : 'var(--text)', marginTop: 4 }}>{flagged.length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Avg plagiarism score</div>
          <div className="mono strong" style={{ fontSize: 22, color: avgScore < 15 ? 'var(--green)' : 'var(--amber)', marginTop: 4 }}>{avgScore}%</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Ghostwriter</th>
              <th>Submission</th>
              <th className="num">Score</th>
              <th>Top match</th>
              <th className="num">Sources</th>
              <th>Status</th>
              <th>Scanned</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: r.orderId })}>
                <td className="mono">#{r.orderId}</td>
                <td><div className="flex items-center gap-2"><Avatar initials={r.gwInitials} size={24}/><span className="fs-12">{r.gwName}</span></div></td>
                <td><span className="pill pill-blue" style={{ textTransform: 'capitalize' }}>{r.kind.replace('_', ' ')}</span></td>
                <td className="num mono">
                  <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
                    <div style={{ width: 60, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, r.score*3)}%`, height: '100%', background: r.score < 15 ? 'var(--green)' : r.score < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                    </div>
                    <span style={{ color: r.score < 15 ? 'var(--green)' : r.score < 30 ? 'var(--amber)' : 'var(--red)', minWidth: 36, textAlign: 'right' }}>{r.score}%</span>
                  </div>
                </td>
                <td className="text-muted fs-11" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.topSource}</td>
                <td className="num mono text-muted">{r.sources}</td>
                <td>
                  {r.status === 'passed' && <span className="pill pill-green"><Icon name="check" size={10}/> Passed</span>}
                  {r.status === 'flagged' && <span className="pill pill-amber">Needs review</span>}
                </td>
                <td className="text-faint fs-11 mono">{TS.relTime(r.scannedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.QAPlagiarismReports = QAPlagiarismReports;

// ============ QA AI DETECTION ============
// Q-05: deterministic per-paragraph AI risk distribution.
// High overall score → cluster of high-risk paragraphs at the offending sections;
// review-tier scores get a few amber outliers; clean docs stay green with mild noise.
function buildParaRisks(detection) {
  const total = detection.totalParas;
  const out = [];
  const tag = detection.kind === 'interim_1' ? 'Einleitung'
    : detection.kind === 'interim_2' ? 'Hauptteil'
    : detection.kind === 'revision' ? 'Überarbeitung'
    : 'Kapitel';
  const labels = ['Einleitung','Theoretischer Rahmen','Methodik','Empirische Erhebung','Auswertung','Diskussion','Schlussfolgerung','Limitationen','Ausblick','Anhang'];
  for (let i = 0; i < total; i++) {
    let risk;
    const seed = (detection.orderId * 7 + i * 13) % 17;
    if (detection.status === 'violation') {
      // Heavy AI: most paragraphs above 50%, with sharp peaks
      const isHotSpot = (i % 3 === 1) || (i >= total - 3);
      risk = isHotSpot ? Math.min(98, 70 + seed) : Math.min(94, 45 + seed * 2);
    } else if (detection.status === 'review') {
      risk = (i % 5 === 2) ? 25 + seed : 4 + (seed % 9);
    } else {
      risk = 2 + (seed % 11);
    }
    out.push({
      idx: i + 1,
      label: labels[i] || `${tag} §${i+1}`,
      risk,
      preview: risk >= 70
        ? 'Es ist wichtig zu beachten, dass diese komplexe Thematik vielschichtige Aspekte umfasst, die einer differenzierten Betrachtung bedürfen…'
        : risk >= 30
        ? 'Die Untersuchung zeigt teilweise stilistisch homogene Strukturen, die einer manuellen Prüfung empfohlen werden.'
        : 'Natürliche Satzlänge, idiosynkratische Phrasierung — konsistent mit dem GW-Stilcluster.',
    });
  }
  return out;
}

function QAAIDetection({ navigate }) {
  const detections = [
    { id: 'a1', orderId: 3517, gwName: 'Anna König', gwInitials: 'AK', kind: 'final_work', score: 87, status: 'violation', flaggedParas: 18, totalParas: 22, urgent: true, scannedAt: '2026-05-06T08:12:00', topSig: 'Token entropy + GPT-4 burstiness signature' },
    { id: 'a2', orderId: 3514, gwName: 'Dr. Henrik Vogel', gwInitials: 'HV', kind: 'final_work', score: 4, status: 'passed', flaggedParas: 1, totalParas: 88, scannedAt: '2026-05-07T11:40:00' },
    { id: 'a3', orderId: 3530, gwName: 'Felix Becker', gwInitials: 'FB', kind: 'final_work', score: 11, status: 'passed', flaggedParas: 5, totalParas: 42, scannedAt: '2026-05-07T09:20:00' },
    { id: 'a4', orderId: 3508, gwName: 'Maja Petrović', gwInitials: 'MP', kind: 'interim_2', score: 18, status: 'review', flaggedParas: 4, totalParas: 28, scannedAt: '2026-05-06T16:25:00' },
    { id: 'a5', orderId: 3520, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'interim_1', score: 7, status: 'passed', flaggedParas: 1, totalParas: 18, scannedAt: '2026-05-06T14:55:00' },
    { id: 'a6', orderId: 3540, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'final_work', score: 12, status: 'passed', flaggedParas: 2, totalParas: 12, scannedAt: '2026-04-26T15:32:00' },
  ];

  const [expandedId, setExpandedId] = useStateA('a1');
  const [rescanning, setRescanning] = useStateA(false);
  const [rescanProgress, setRescanProgress] = useStateA(0);

  const rescan = () => {
    if (rescanning) return;
    setRescanning(true);
    setRescanProgress(0);
    const total = 24;
    let step = 0;
    const tick = () => {
      step += 1;
      setRescanProgress(Math.round(step * (100 / total)));
      if (step >= total) {
        setRescanning(false);
      } else {
        setTimeout(tick, 100);
      }
    };
    setTimeout(tick, 100);
  };

  const violations = detections.filter(d => d.status === 'violation');
  const review = detections.filter(d => d.status === 'review');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['QA', 'AI Detection']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>AI Detection</h1>
          <div className="page-subtitle">GPTZero per-paragraph score · AI use is a fraud violation per AGB v3.2 §5</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="export-csv" label="AI detection export"><Icon name="download" size={14}/> Export</NotReady>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="banner danger mb-3">
          <Icon name="alert-triangle" size={16}/>
          <div style={{ flex: 1 }}>
            <strong>🚨 {violations.length} active violation</strong> · GW <strong>{violations[0].gwName}</strong> on Order #{violations[0].orderId} (AI score {violations[0].score}%).
            GW auto-shadow-banned. All pending payments blocked. Reassignment required.
          </div>
          <button className="btn btn-sm" onClick={() => navigate('order-detail', { id: violations[0].orderId })}>Open order</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14, border: violations.length > 0 ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Violations (≥30%)</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--red)', marginTop: 4 }}>{violations.length}</div>
          <div className="text-faint fs-11 mt-1">Auto-shadow-ban triggered</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Needs review (15–29%)</div>
          <div className="mono strong" style={{ fontSize: 22, color: review.length ? 'var(--amber)' : 'var(--text)', marginTop: 4 }}>{review.length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Clean (&lt;15%)</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{detections.filter(d => d.status === 'passed').length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Ghostwriter</th>
              <th>Submission</th>
              <th className="num">AI Score</th>
              <th className="num">Flagged paragraphs</th>
              <th>Status</th>
              <th>Scanned</th>
            </tr>
          </thead>
          <tbody>
            {detections.map(d => {
              const isOpen = expandedId === d.id;
              const paras = isOpen ? buildParaRisks(d) : null;
              return (
                <React.Fragment key={d.id}>
                  <tr style={{ cursor: 'pointer', background: isOpen ? 'var(--surface-2)' : (d.urgent ? 'color-mix(in oklab, var(--red) 4%, transparent)' : undefined) }} onClick={() => setExpandedId(isOpen ? null : d.id)}>
                    <td className="mono">
                      <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={11} className="text-faint" style={{ marginRight: 4 }}/>
                      #{d.orderId}{d.urgent && ' 🚨'}
                    </td>
                    <td><div className="flex items-center gap-2"><Avatar initials={d.gwInitials} size={24} tone={d.status==='violation'?'red':'neutral'}/><span className="fs-12">{d.gwName}</span></div></td>
                    <td><span className="pill pill-blue" style={{ textTransform: 'capitalize' }}>{d.kind.replace('_', ' ')}</span></td>
                    <td className="num mono">
                      <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
                        <div style={{ width: 60, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${d.score}%`, height: '100%', background: d.score < 15 ? 'var(--green)' : d.score < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                        </div>
                        <span className="strong" style={{ color: d.score < 15 ? 'var(--green)' : d.score < 30 ? 'var(--amber)' : 'var(--red)', minWidth: 36, textAlign: 'right' }}>{d.score}%</span>
                      </div>
                    </td>
                    <td className="num mono text-muted">{d.flaggedParas} / {d.totalParas}</td>
                    <td>
                      {d.status === 'passed' && <span className="pill pill-green">Clean</span>}
                      {d.status === 'review' && <span className="pill pill-amber">Review</span>}
                      {d.status === 'violation' && <span className="pill pill-red">🚨 Violation</span>}
                    </td>
                    <td className="text-faint fs-11 mono">{TS.relTime(d.scannedAt)}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, background: 'var(--surface-2)' }}>
                        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
                            <strong className="fs-13">Per-paragraph AI score</strong>
                            <span className="text-faint fs-11">{d.totalParas} paragraphs · top signature: {d.topSig || 'mixed'}</span>
                            <span style={{ flex: 1 }}/>
                            <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); rescan(); }} disabled={rescanning}>
                              <Icon name={rescanning ? 'loader' : 'zap'} size={12}/> {rescanning ? `Re-scanning… ${rescanProgress}%` : 'Re-run AI detector'}
                            </button>
                            <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); navigate('order-detail', { id: d.orderId }); }}>
                              <Icon name="external-link" size={12}/> Open order
                            </button>
                          </div>
                          {rescanning && (
                            <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                              <div style={{ width: `${rescanProgress}%`, height: '100%', background: 'var(--blue)', transition: 'width 100ms linear' }}/>
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {paras.map(p => (
                              <div key={p.idx} className="card" style={{
                                padding: 10,
                                borderColor: p.risk >= 70 ? 'color-mix(in oklab, var(--red) 35%, var(--border))'
                                  : p.risk >= 30 ? 'color-mix(in oklab, var(--amber) 35%, var(--border))'
                                  : undefined,
                                background: p.risk >= 70 ? 'color-mix(in oklab, var(--red) 5%, var(--surface))' : 'var(--surface)',
                              }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-faint mono fs-11" style={{ width: 28 }}>§{p.idx}</span>
                                  <span className="fs-12 strong" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                                  <span className="mono fs-11 strong" style={{ color: p.risk < 15 ? 'var(--green)' : p.risk < 30 ? 'var(--amber)' : 'var(--red)' }}>{p.risk}%</span>
                                </div>
                                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                                  <div style={{ width: `${p.risk}%`, height: '100%', background: p.risk < 15 ? 'var(--green)' : p.risk < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                                </div>
                                <div className="fs-11 text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.preview}</div>
                              </div>
                            ))}
                          </div>
                          <div className="banner info mt-3" style={{ fontSize: 11.5 }}>
                            <Icon name="zap" size={12}/>
                            <span>
                              Paragraphs ≥30% AI score are flagged for human review. ≥70% triggers auto-violation per AGB v3.2 §5.
                              {d.status === 'violation' && <> · GW <strong>{d.gwName}</strong> already shadow-banned.</>}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.QAAIDetection = QAAIDetection;

// ============ QA HISTORY ============
function QAHistory({ navigate }) {
  const history = [
    { id: 'h1', orderId: 3530, action: 'approved', kind: 'final_work', gw: 'Felix Becker', gwI: 'FB', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 12, ai: 11, at: '2026-05-07T11:48:00', note: 'Forwarded to customer' },
    { id: 'h2', orderId: 3514, action: 'approved', kind: 'final_work', gw: 'Dr. Henrik Vogel', gwI: 'HV', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 8, ai: 4, at: '2026-05-07T09:22:00', note: 'Forwarded to customer · Doktorarbeit · 120 pages' },
    { id: 'h3', orderId: 3508, action: 'revision', kind: 'interim_2', gw: 'Maja Petrović', gwI: 'MP', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 27, ai: 18, at: '2026-05-06T16:30:00', note: 'Plagiarism 27% — paraphrase too close to Wikipedia. Round 3 requested.' },
    { id: 'h4', orderId: 3520, action: 'approved', kind: 'interim_1', gw: 'Isabel Walter', gwI: 'IW', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 6, ai: 7, at: '2026-05-06T14:58:00', note: 'Forwarded to customer' },
    { id: 'h5', orderId: 3517, action: 'ai_violation', kind: 'final_work', gw: 'Anna König', gwI: 'AK', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 12, ai: 87, at: '2026-05-06T08:20:00', note: '🚨 AI score 87% — GW shadow-banned, payment frozen. Berat to reassign.' },
    { id: 'h6', orderId: 3540, action: 'approved', kind: 'final_work', gw: 'Isabel Walter', gwI: 'IW', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 9, ai: 12, at: '2026-04-26T15:35:00', note: 'Forwarded to customer · invoice attached' },
    { id: 'h7', orderId: 3499, action: 'approved', kind: 'final_work', gw: 'Lukas Bauer', gwI: 'LB', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 14, ai: 8, at: '2026-04-25T12:08:00', note: 'Forwarded to customer · Masterarbeit · ML-Pipelines' },
    { id: 'h8', orderId: 3492, action: 'approved', kind: 'final_work', gw: 'Sarah Klein', gwI: 'SK', reviewer: 'Lina Hoffmann', revI: 'LH', plag: 10, ai: 6, at: '2026-04-12T11:14:00' },
  ];

  const counts = {
    approved: history.filter(h => h.action === 'approved').length,
    revision: history.filter(h => h.action === 'revision').length,
    violation: history.filter(h => h.action === 'ai_violation' || h.action === 'plag_violation').length,
  };

  const actionPill = (a) => {
    if (a === 'approved') return <span className="pill pill-green"><Icon name="check" size={10}/> Approved</span>;
    if (a === 'revision') return <span className="pill pill-orange">Revision requested</span>;
    if (a === 'ai_violation') return <span className="pill pill-red">🚨 AI violation</span>;
    if (a === 'plag_violation') return <span className="pill pill-red">Plag violation</span>;
    return <span className="pill pill-slate">{a}</span>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['QA', 'History']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>QA History</h1>
          <div className="page-subtitle">Last {history.length} reviewed submissions · audit trail for accountability</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="filters-advanced" label="QA history filters"><Icon name="filter" size={14}/> Filter</NotReady>
          <NotReady className="btn" feature="export-csv" label="QA history export"><Icon name="download" size={14}/> Export</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Approved</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{counts.approved}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Revisions requested</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--amber)', marginTop: 4 }}>{counts.revision}</div>
        </div>
        <div className="card" style={{ padding: 14, border: counts.violation ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Violations flagged</div>
          <div className="mono strong" style={{ fontSize: 22, color: counts.violation ? 'var(--red)' : 'var(--text)', marginTop: 4 }}>{counts.violation}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Decision log</div><span className="text-faint fs-11">most recent first</span></div>
        <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
          {history.map(h => (
            <div key={h.id} className="flex items-start gap-3" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: h.orderId })}>
              <div className={`timeline-dot ${h.action === 'approved' ? 'green' : h.action.includes('violation') ? 'red' : 'amber'}`} style={{ width: 24, height: 24, marginTop: 2 }}>
                <Icon name={h.action === 'approved' ? 'check' : h.action.includes('violation') ? 'alert-triangle' : 'rotate-ccw'} size={12}/>
              </div>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.35 }}>
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <span className="mono strong fs-12">#{h.orderId}</span>
                  {actionPill(h.action)}
                  <span className="text-muted fs-11" style={{ textTransform: 'capitalize' }}>· {h.kind.replace('_',' ')}</span>
                  <span style={{ flex: 1 }}/>
                  <span className="text-faint fs-11 mono">{TS.relTime(h.at)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar initials={h.gwI} size={18}/>
                  <span className="fs-11 text-muted">GW {h.gw}</span>
                  <span className="text-faint">·</span>
                  <Avatar initials={h.revI} size={18} tone="blue"/>
                  <span className="fs-11 text-muted">reviewed by {h.reviewer}</span>
                  <span className="text-faint">·</span>
                  <span className="fs-11 mono text-faint">plag <span style={{ color: h.plag < 15 ? 'var(--green)' : h.plag < 30 ? 'var(--amber)' : 'var(--red)' }}>{h.plag}%</span> · AI <span style={{ color: h.ai < 15 ? 'var(--green)' : h.ai < 30 ? 'var(--amber)' : 'var(--red)' }}>{h.ai}%</span></span>
                </div>
                {h.note && <div className="text-muted fs-11 mt-1">{h.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.QAHistory = QAHistory;

// ====================================================================
// ADMIN — /admin/orders/new — Create Order wizard
// Off-form / WhatsApp customers (D-09 guest flow). 6-step wizard.
// ====================================================================
function OrderNewWizard({ navigate, toast, setFixState }) {
  const [step, setStep] = useStateA(0);
  const [draft, setDraft] = useStateA({
    customerId: null,
    customerName: '', customerEmail: '', customerPhone: '', country: 'DE',
    workType: 'hausarbeit', field: '', pages: 14, paperTitle: '',
    finalDeadline: '', interimMode: 'auto',
    rate: 0.40, deadlineFactor: 1.0, discount: 0, installments: 1,
    notes: '', leadSource: 'ws1',
  });

  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const pricePerPage = { hausarbeit: 49, bachelorarbeit: 59, masterarbeit: 69, doktorarbeit: 79 };
  const ppp = pricePerPage[draft.workType] || 49;
  const grossEur = +(draft.pages * ppp * draft.deadlineFactor * (1 - draft.discount)).toFixed(2);
  const netHonor = +((grossEur / 1.07) * draft.rate).toFixed(2);
  const margin = +((grossEur / 1.07) - netHonor).toFixed(2);

  const fmtDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
  const todayPlus = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const interimDates = () => {
    if (!draft.finalDeadline) return [];
    const today = new Date();
    const final = new Date(draft.finalDeadline);
    const diffMs = final.getTime() - today.getTime();
    if (diffMs <= 0) return [];
    if (draft.pages <= 20) {
      return [new Date(today.getTime() + diffMs * 0.5).toISOString().slice(0, 10)];
    }
    return [
      new Date(today.getTime() + diffMs * 0.3).toISOString().slice(0, 10),
      new Date(today.getTime() + diffMs * 0.6).toISOString().slice(0, 10),
    ];
  };
  const interims = interimDates();

  const customerCandidates = TD.CUSTOMERS.filter(c => {
    if (!draft.customerName) return false;
    const q = draft.customerName.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  }).slice(0, 4);

  const steps = [
    { id: 'customer', label: 'Customer', icon: 'user' },
    { id: 'work', label: 'Work spec', icon: 'file-text' },
    { id: 'pricing', label: 'Pricing', icon: 'euro' },
    { id: 'deadlines', label: 'Deadlines', icon: 'calendar' },
    { id: 'notes', label: 'Notes', icon: 'edit' },
    { id: 'confirm', label: 'Confirm', icon: 'check-circle' },
  ];
  const canNext = (() => {
    if (step === 0) return draft.customerName.trim() && draft.customerEmail.trim();
    if (step === 1) return draft.field.trim() && draft.pages > 0;
    if (step === 2) return draft.rate >= 0.33 && draft.rate <= 0.62;
    if (step === 3) return !!draft.finalDeadline;
    return true;
  })();

  const create = () => {
    const newId = 9100 + Math.floor((TD.ORDERS.length + Date.now()) % 900);
    const newOrder = {
      id: newId,
      status: 'qualified',
      customerId: draft.customerId || ('c-new-' + newId),
      workType: draft.workType,
      title: draft.paperTitle || 'folgt',
      titleTBD: !draft.paperTitle,
      field: draft.field,
      pages: draft.pages,
      finalDeadline: draft.finalDeadline + 'T18:00:00',
      interimDeadline: interims[0] ? interims[0] + 'T18:00:00' : null,
      interim2Deadline: interims[1] ? interims[1] + 'T18:00:00' : null,
      grossEur, netHonorarium: netHonor, rate: draft.rate,
      gwId: null,
      leadSource: draft.leadSource,
      acceptedAt: new Date().toISOString().slice(0, 10),
      paidEur: 0,
      outstandingEur: grossEur,
      installments: [],
      revisionRounds: 0,
      note: draft.notes,
      _synthetic: true,
    };
    if (setFixState) {
      setFixState(prev => ({ ...prev, [newId]: newOrder }));
    }
    toast && toast({
      text: `Order #${newId} created · Pipedrive deal Qualifiziert · Sevdesk contact created`,
      tone: 'success',
    });
    setTimeout(() => navigate('order-detail', { id: newId }), 600);
  };

  return (
    <div className="page" style={{ maxWidth: 920, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Orders', 'New']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Create order — manual entry</h1>
          <div className="page-subtitle">For off-form / WhatsApp customers · Pipedrive deal will be created on save · D-09 guest flow</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('orders')}><Icon name="x" size={14}/> Cancel</button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-pad flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2" style={{ flex: 1, minWidth: 130 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: step > i ? 'var(--green)' : step === i ? 'var(--blue)' : 'var(--surface-2)',
                color: step >= i ? 'white' : 'var(--text-3)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {step > i ? <Icon name="check" size={14}/> : <span className="fs-12 strong">{i+1}</span>}
              </div>
              <div className="flex-col" style={{ lineHeight: 1.15, minWidth: 0 }}>
                <span className={`fs-11 ${step === i ? 'strong' : 'text-faint'}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > i ? 'var(--green)' : 'var(--border)' }}/>}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span>Search Pipedrive by name or email. New customers create a Pipedrive Person + Sevdesk Contact on save.</span>
          </div>
          <div className="field"><label>Full name</label>
            <input value={draft.customerName} onChange={e => { setField('customerName', e.target.value); setField('customerId', null); }} placeholder="Erika Mustermann"/>
          </div>
          {customerCandidates.length > 0 && !draft.customerId && (
            <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 8 }}>
              <div className="text-faint fs-11 mb-2">Pipedrive matches</div>
              {customerCandidates.map(c => (
                <button type="button" key={c.id} className="action-row" style={{ marginBottom: 4 }} onClick={() => {
                  setField('customerId', c.id);
                  setField('customerName', c.name);
                  setField('customerEmail', c.email);
                  setField('customerPhone', c.phone);
                  setField('country', c.country || 'DE');
                  setField('leadSource', c.leadSource || 'ws1');
                }}>
                  <Avatar initials={c.initials} size={28}/>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.25, textAlign: 'left' }}>
                    <span className="strong fs-12">{c.name}</span>
                    <span className="text-faint fs-11 mono">{c.email} · {c.country}{c.tags?.includes('VIP') ? ' · VIP' : ''}</span>
                  </div>
                  <span className="pill pill-blue" style={{ fontSize: 10 }}>Use</span>
                </button>
              ))}
            </div>
          )}
          {draft.customerId && (
            <div className="banner success" style={{ fontSize: 12 }}>
              <Icon name="check" size={14}/>
              <span>Linked to existing Pipedrive contact <strong>{draft.customerName}</strong></span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Email</label>
              <input value={draft.customerEmail} onChange={e => setField('customerEmail', e.target.value)} placeholder="erika@example.com" type="email"/>
            </div>
            <div className="field"><label>Phone</label>
              <input value={draft.customerPhone} onChange={e => setField('customerPhone', e.target.value)} placeholder="+49 …"/>
            </div>
            <div className="field"><label>Country</label>
              <select value={draft.country} onChange={e => setField('country', e.target.value)}>
                <option value="DE">DE — Germany</option><option value="AT">AT — Austria</option><option value="CH">CH — Switzerland</option>
              </select>
            </div>
            <div className="field"><label>Lead source</label>
              <select value={draft.leadSource} onChange={e => setField('leadSource', e.target.value)}>
                <option value="ef1">ef1 — Website (direct)</option>
                <option value="ws1">ws1 — WhatsApp</option>
                <option value="ig">ig — Instagram</option>
                <option value="referral">referral — Word of mouth</option>
                <option value="b1">b1 — Review platform</option>
                <option value="ebay">ebay — eBay Kleinanzeigen</option>
              </select>
            </div>
          </div>
        </div></div>
      )}

      {step === 1 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Work type</label>
              <select value={draft.workType} onChange={e => setField('workType', e.target.value)}>
                {Object.entries(TD.WORK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label>Pages (Seitenanzahl)</label>
              <input type="number" min="1" value={draft.pages} onChange={e => setField('pages', +e.target.value || 1)}/>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Field of study (Fachbereich)</label>
              <input value={draft.field} onChange={e => setField('field', e.target.value)} placeholder="z.B. Wirtschaftsinformatik"/>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Paper title (Titel der Arbeit) <span className="text-faint">— optional, can be "folgt"</span></label>
              <input value={draft.paperTitle} onChange={e => setField('paperTitle', e.target.value)} placeholder="Leer lassen für „folgt — awaiting customer"/>
            </div>
          </div>
        </div></div>
      )}

      {step === 2 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="euro" size={14}/>
            <span>Gross = Pages × Price/page × Deadline factor. VAT 7% educational. GW rate locked at assignment.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Price per page (gross, incl. 7% VAT)</label>
              <input value={`${ppp} €`} disabled style={{ background: 'var(--surface-2)' }}/>
            </div>
            <div className="field"><label>Deadline factor</label>
              <select value={draft.deadlineFactor} onChange={e => setField('deadlineFactor', +e.target.value)}>
                <option value="1.0">1.0× (≥72h)</option>
                <option value="1.25">1.25× (48–72h)</option>
                <option value="1.5">1.5× (24–48h)</option>
                <option value="2.0">2.0× (&lt;24h)</option>
              </select>
            </div>
            <div className="field"><label>Discount (full upfront)</label>
              <select value={draft.discount} onChange={e => setField('discount', +e.target.value)}>
                <option value="0">No discount</option>
                <option value="0.10">10% (full upfront — D-business_rules §2)</option>
              </select>
            </div>
            <div className="field"><label>Installments</label>
              <select value={draft.installments} onChange={e => setField('installments', +e.target.value)}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} × {TS.EUR(grossEur / n)}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>GW rate <span className="text-faint">— typical 33–62% of net (peak 40%)</span></label>
              <input type="range" min="33" max="62" step="1" value={Math.round(draft.rate * 100)} onChange={e => setField('rate', +e.target.value / 100)}/>
              <div className="flex justify-between fs-11 mono mt-1"><span>33%</span><span className="strong">{Math.round(draft.rate * 100)}%</span><span>62%</span></div>
            </div>
          </div>
          <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8 }}>
            <div className="kv">
              <div className="kv-row"><dt>Gross (Brutto)</dt><dd className="mono strong">{TS.EUR(grossEur)}</dd></div>
              <div className="kv-row"><dt>Net (after 7% VAT)</dt><dd className="mono">{TS.EUR(grossEur / 1.07)}</dd></div>
              <div className="kv-row"><dt>GW Honorar ({Math.round(draft.rate * 100)}%)</dt><dd className="mono" style={{ color: 'var(--green)' }}>{TS.EUR(netHonor)}</dd></div>
              <div className="kv-row"><dt>Margin</dt><dd className="mono strong">{TS.EUR(margin)}</dd></div>
            </div>
          </div>
        </div></div>
      )}

      {step === 3 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="calendar" size={14}/>
            <span>Cutoff is 18:00 the day BEFORE the due date. Interim deadlines auto-compute from page count: ≤20 pages → 1 interim at 50%; &gt;20 pages → 2 interims at 30% / 60%.</span>
          </div>
          <div className="field"><label>Customer final deadline</label>
            <input type="date" value={draft.finalDeadline} onChange={e => setField('finalDeadline', e.target.value)} min={todayPlus(1)}/>
          </div>
          {interims.length > 0 && (
            <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8 }}>
              <div className="text-faint fs-11 mb-2">Auto-computed Teillieferungen ({draft.pages} pages → {draft.pages <= 20 ? '1 interim' : '2 interims'})</div>
              {interims.map((d, i) => (
                <div key={i} className="flex items-center gap-2" style={{ padding: 6 }}>
                  <Icon name="file-text" size={12} className="text-muted"/>
                  <span className="fs-12 strong">Zwischenstand {i + 1}</span>
                  <span style={{ flex: 1 }}/>
                  <span className="mono fs-12">{TS.fmtDate(d)}, 18:00</span>
                </div>
              ))}
              <div className="flex items-center gap-2" style={{ padding: 6, borderTop: '1px dashed var(--border)', marginTop: 4 }}>
                <Icon name="check-circle" size={12} className="text-success"/>
                <span className="fs-12 strong">Final delivery</span>
                <span style={{ flex: 1 }}/>
                <span className="mono fs-12">{TS.fmtDate(draft.finalDeadline)}, 18:00</span>
              </div>
            </div>
          )}
        </div></div>
      )}

      {step === 4 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="field"><label>Internal note for GW (Weitere Notiz von efactory1.de)</label>
            <textarea value={draft.notes} onChange={e => setField('notes', e.target.value)} placeholder="z.B. IU Fallstudie · APA-Zitierweise · Kapitel 3 mit Praxisbeispielen aus dem Maschinenbau" style={{ width: '100%', minHeight: 100, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}/>
          </div>
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="paperclip" size={14}/>
            <span>Outline / Exposé attachments will be uploadable from the order detail screen after creation.</span>
          </div>
        </div></div>
      )}

      {step === 5 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner success" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <div>
              <strong>On Save, the platform will:</strong>
              <ol style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 11.5 }}>
                <li>Create platform Order #{draft.customerId ? '[generated]' : '[new]'}</li>
                <li>{draft.customerId ? 'Link to existing Pipedrive Person' : 'Create Pipedrive Person + set marketing_status = subscribed'}</li>
                <li>Create Pipedrive Deal in stage <strong>Qualifiziert</strong></li>
                <li>{draft.customerId ? 'Reuse Sevdesk Contact' : 'Create Sevdesk Contact'}</li>
                <li>Order ready for <strong>"Generate offer"</strong> next</li>
              </ol>
            </div>
          </div>
          <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8 }}>
            <div className="kv">
              <div className="kv-row"><dt>Customer</dt><dd>{draft.customerName} <span className="text-faint">· {draft.customerEmail}</span></dd></div>
              <div className="kv-row"><dt>Work</dt><dd>{TD.WORK_TYPE_LABELS[draft.workType]} · {draft.pages} pages · {draft.field}</dd></div>
              <div className="kv-row"><dt>Paper title</dt><dd>{draft.paperTitle || <em className="text-faint">folgt — awaiting customer</em>}</dd></div>
              <div className="kv-row"><dt>Final deadline</dt><dd className="mono">{draft.finalDeadline ? TS.fmtDate(draft.finalDeadline) + ', 18:00' : '—'}</dd></div>
              <div className="kv-row"><dt>Gross / GW Honorar / Margin</dt><dd className="mono">{TS.EUR(grossEur)} / <span style={{ color: 'var(--green)' }}>{TS.EUR(netHonor)}</span> / <strong>{TS.EUR(margin)}</strong></dd></div>
              <div className="kv-row"><dt>Lead source</dt><dd>{draft.leadSource}</dd></div>
            </div>
          </div>
        </div></div>
      )}

      <div className="flex justify-between mt-3">
        <button type="button" className="btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          <Icon name="chevron-left" size={14}/> Back
        </button>
        {step < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext}>
            Continue <Icon name="chevron-right" size={14}/>
          </button>
        ) : (
          <button type="button" className="btn btn-success" onClick={create}>
            <Icon name="check" size={14}/> Create order · sync to Pipedrive + Sevdesk
          </button>
        )}
      </div>
    </div>
  );
}
window.OrderNewWizard = OrderNewWizard;

// ====================================================================
// ADMIN — /admin/offers — Sevdesk Offers
// ====================================================================
function OffersPage({ navigate, toast, fixState, setFixState }) {
  const [tab, setTab] = useStateA('all');
  const [genFor, setGenFor] = useStateA(null); // order id while wizard open

  // Source: every order with status qualified | offer_sent | invoice_sent | paid+
  const allEffective = TD.ORDERS.map(o => ({ ...o, ...(fixState?.[o.id] || {}) }));
  const offerable = allEffective.filter(o => ['qualified','offer_sent','invoice_sent'].includes(o.status));
  const accepted = allEffective.filter(o => !['qualified','offer_sent','invoice_sent','lead','cancelled','bye'].includes(o.status));

  const offerRows = (() => {
    const rows = offerable.map(o => ({
      id: 'AN-2026-' + String(o.id).padStart(4, '0'),
      orderId: o.id,
      customer: TD.customer(o.customerId),
      workType: o.workType,
      grossEur: o.grossEur,
      status: o.status === 'qualified' ? 'draft' : o.status === 'offer_sent' ? 'sent' : o.status === 'invoice_sent' ? 'accepted_invoice' : 'sent',
      sentAt: o.acceptedAt,
    }));
    return rows;
  })();

  const filtered = tab === 'all' ? offerRows
    : tab === 'drafts' ? offerRows.filter(r => r.status === 'draft')
    : tab === 'sent' ? offerRows.filter(r => r.status === 'sent')
    : tab === 'accepted' ? accepted.map(o => ({
        id: 'AN-2026-' + String(o.id).padStart(4, '0'),
        orderId: o.id,
        customer: TD.customer(o.customerId),
        workType: o.workType,
        grossEur: o.grossEur,
        status: 'accepted',
        sentAt: o.acceptedAt,
      }))
    : offerRows.filter(r => r.status === 'rejected');

  const generate = (orderId) => setGenFor(orderId);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Offers / Sevdesk']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Offers · Sevdesk</h1>
          <div className="page-subtitle">Angebot drafts → sent → accepted (auto-creates Rechnung + Stripe link) · sync {TS.relTime('2026-05-07T13:18:00')}</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('orders')}><Icon name="package" size={14}/> Open Orders</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Open offers</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{offerRows.filter(r => r.status === 'sent').length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Drafts</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{offerRows.filter(r => r.status === 'draft').length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Pending invoice payment</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--amber)', marginTop: 4 }}>{offerRows.filter(r => r.status === 'accepted_invoice').length}</div>
        </div>
        <div className="card" style={{ padding: 14, border: '1px solid color-mix(in oklab, var(--green) 30%, var(--border))' }}>
          <div className="text-faint fs-11">Accepted (Won)</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{accepted.length}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {[['all','All'],['drafts','Drafts'],['sent','Sent'],['accepted','Accepted']].map(([v,l]) => (
          <button key={v} type="button" className={`chip ${tab===v?'active':''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} rows</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr><th>Sevdesk ID</th><th>Order</th><th>Customer</th><th>Type</th><th className="num">Gross</th><th>Status</th><th>Last activity</th><th></th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: r.orderId })}>
                <td className="mono fs-12">{r.id}</td>
                <td className="mono">#{r.orderId}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar initials={r.customer?.initials || '··'} size={24}/>
                    <span className="fs-12">{r.customer?.name || '—'}</span>
                  </div>
                </td>
                <td className="text-muted">{TD.WORK_TYPE_LABELS[r.workType] || r.workType}</td>
                <td className="num mono">{TS.EUR(r.grossEur || 0)}</td>
                <td>
                  {r.status === 'draft' && <span className="pill pill-slate">Draft</span>}
                  {r.status === 'sent' && <span className="pill pill-blue">Sent · awaiting accept</span>}
                  {r.status === 'accepted_invoice' && <span className="pill pill-amber">Invoice sent · awaiting payment</span>}
                  {r.status === 'accepted' && <span className="pill pill-green">Accepted · Won</span>}
                </td>
                <td className="text-faint fs-11">{r.sentAt ? TS.fmtDate(r.sentAt) : '—'}</td>
                <td className="num">
                  {r.status === 'draft' && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); generate(r.orderId); }}>
                      <Icon name="zap" size={12}/> Generate offer
                    </button>
                  )}
                  {r.status === 'sent' && (
                    <button type="button" className="btn btn-sm" onClick={e => { e.stopPropagation(); toast && toast({ text: `Resent Angebot ${r.id} via Sevdesk · sendViaEmail`, tone: 'success' }); }}>
                      <Icon name="mail" size={12}/> Resend
                    </button>
                  )}
                  {r.status === 'accepted_invoice' && (
                    <button type="button" className="btn btn-sm" onClick={e => { e.stopPropagation(); toast && toast({ text: `Dunning email sent · Stripe link refreshed`, tone: 'info' }); }}>
                      <Icon name="alert-triangle" size={12}/> Chase
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11.5, marginTop: 16 }}>
        <Icon name="zap" size={12}/>
        <span>Endpoints used: <code className="mono">POST /Order/Factory/saveOrder</code> (proposal), <code className="mono">/Order/:id/sendViaEmail</code> (send), <code className="mono">/Invoice/Factory/createInvoiceFromOrder</code> (on accept), <code className="mono">/Invoice/:id/sendViaEmail</code> (send invoice with Stripe link).</span>
      </div>

      {genFor && (
        <GenerateOfferModal orderId={genFor} fixState={fixState} setFixState={setFixState} toast={toast} onClose={() => setGenFor(null)}/>
      )}
    </div>
  );
}
window.OffersPage = OffersPage;

function GenerateOfferModal({ orderId, fixState, setFixState, toast, onClose }) {
  const orderBase = TD.order(orderId);
  const order = { ...orderBase, ...(fixState?.[orderId] || {}) };
  const cust = TD.customer(order.customerId);
  const [phase, setPhase] = useStateA('preview'); // preview → sending → sent
  const [progress, setProgress] = useStateA([
    { label: 'Verifying Sevdesk Contact', done: false, running: false },
    { label: 'POST /Order/Factory/saveOrder · pricing engine', done: false, running: false },
    { label: 'Generating PDF', done: false, running: false },
    { label: 'POST /Order/:id/sendViaEmail · to ' + (cust?.email || 'customer'), done: false, running: false },
    { label: 'PATCH Pipedrive deal → Rückmeldung', done: false, running: false },
  ]);

  const send = () => {
    setPhase('sending');
    progress.forEach((_, i) => {
      setTimeout(() => setProgress(p => p.map((s, j) => j < i ? { ...s, done: true, running: false } : j === i ? { ...s, running: true } : s)), i * 600);
      setTimeout(() => setProgress(p => p.map((s, j) => j <= i ? { ...s, done: true, running: false } : s)), (i + 1) * 600);
    });
    setTimeout(() => {
      setPhase('sent');
      if (setFixState) setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), status: 'offer_sent' } }));
      toast && toast({ text: `Angebot AN-2026-${String(orderId).padStart(4, '0')} sent · Pipedrive Rückmeldung`, tone: 'success' });
    }, progress.length * 600 + 200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Generate Sevdesk Angebot · #{orderId}</div>
            <div className="text-faint fs-11 mt-1">Pricing engine · email send · Pipedrive sync · all in one click</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          {phase === 'preview' && (
            <div className="flex-col gap-3">
              <div className="kv" style={{ fontSize: 12 }}>
                <div className="kv-row"><dt>Customer</dt><dd>{cust?.name} · <span className="mono">{cust?.email}</span></dd></div>
                <div className="kv-row"><dt>Work</dt><dd>{TD.WORK_TYPE_LABELS[order.workType]} · {order.pages} p · {order.field}</dd></div>
                <div className="kv-row"><dt>Final deadline</dt><dd className="mono">{TS.fmtDate(order.finalDeadline)}, 18:00</dd></div>
                <div className="kv-row"><dt>Gross (Brutto)</dt><dd className="mono strong">{TS.EUR(order.grossEur)}</dd></div>
                <div className="kv-row"><dt>VAT 7%</dt><dd className="mono text-muted">−{TS.EUR(order.grossEur * 0.07 / 1.07)}</dd></div>
                <div className="kv-row"><dt>Net</dt><dd className="mono">{TS.EUR(order.grossEur / 1.07)}</dd></div>
              </div>
              <div className="banner info" style={{ fontSize: 11.5 }}>
                <Icon name="lock" size={12}/>
                <span>Angebot is a legal Rechnung-Vorbereitung. On accept → invoice auto-created via <code className="mono">/Invoice/Factory/createInvoiceFromOrder</code>.</span>
              </div>
            </div>
          )}
          {phase !== 'preview' && (
            <div className="flex-col gap-2">
              {progress.map((s, i) => (
                <div key={i} className="flex items-center gap-2" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: s.done ? 'color-mix(in oklab, var(--green) 4%, var(--surface))' : 'var(--surface)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: s.done ? 'var(--green)' : s.running ? 'var(--blue)' : 'var(--surface-2)', color: s.done || s.running ? 'white' : 'var(--text-3)', display: 'grid', placeItems: 'center' }}>
                    {s.done ? <Icon name="check" size={11}/> : s.running ? <Icon name="zap" size={11}/> : <Icon name="dot" size={6}/>}
                  </div>
                  <span className="fs-12">{s.label}</span>
                  {s.running && <span className="text-faint fs-11" style={{ marginLeft: 'auto' }}>working…</span>}
                </div>
              ))}
              {phase === 'sent' && (
                <div className="banner success mt-2"><Icon name="check-circle" size={14}/><span>Angebot sent · order moved to <strong>Offer Sent</strong> · Pipedrive deal in <strong>Rückmeldung</strong>.</span></div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {phase === 'preview' ? (
            <>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={send}><Icon name="zap" size={14}/> Generate & send via Sevdesk</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1 }}/>
              <button type="button" className="btn" onClick={onClose} disabled={phase === 'sending'}>{phase === 'sent' ? 'Done' : 'Working…'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
window.GenerateOfferModal = GenerateOfferModal;

// ====================================================================
// ADMIN — /admin/customers/:id — Customer 360
// ====================================================================
function CustomerDetail({ customerId, navigate, fixState }) {
  const c = TD.customer(customerId);
  if (!c) return <div className="page">Customer not found.</div>;
  const orders = TD.ORDERS
    .map(o => ({ ...o, ...(fixState?.[o.id] || {}) }))
    .filter(o => o.customerId === customerId)
    .sort((a, b) => (b.acceptedAt || '').localeCompare(a.acceptedAt || ''));
  const ltv = orders.reduce((s, o) => s + (o.paidEur || 0), 0);
  const open = orders.reduce((s, o) => s + (o.outstandingEur || 0), 0);
  const inflight = orders.filter(o => !['completed', 'cancelled', 'bye'].includes(o.status)).length;

  const timeline = orders.flatMap(o => ([
    o.acceptedAt && { kind: 'order', t: o.acceptedAt, text: `Order #${o.id} · ${TD.WORK_TYPE_LABELS[o.workType]} · ${TS.EUR(o.grossEur)}`, icon: 'package' },
    ...(o.installments || []).filter(i => i.status === 'paid').map(i => ({ kind: 'pay', t: i.date, text: `Installment ${i.n}/${o.installments.length} paid · ${TS.EUR(i.amt)} · ${(i.method || '').replace('stripe_', 'Stripe ').replace('bank_transfer_sepa', 'SEPA').replace('_', ' ')} · #${o.id}`, icon: 'check-circle' })),
  ])).filter(Boolean).sort((a, b) => (b.t || '').localeCompare(a.t || '')).slice(0, 10);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Customers', c.name]}/>
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar initials={c.initials} size={36} tone="blue"/>
            <span>{c.name}</span>
            {c.tags?.includes('VIP') && <span className="pill pill-yellow">VIP</span>}
            {orders.some(o => o.disputeOpen) && <span className="pill pill-orange">Dispute open</span>}
          </h1>
          <div className="page-subtitle"><span className="mono">{c.email}</span> · <span className="mono">{c.phone}</span> · {c.country} · lead via {c.leadSource}</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('customers')}><Icon name="chevron-left" size={14}/> Back</button>
          <NotReady className="btn" feature="pipedrive-open"><Icon name="external-link" size={14}/> Open in Pipedrive</NotReady>
          <button type="button" className="btn btn-primary" onClick={() => navigate('order-new')}><Icon name="plus" size={14}/> New order for this customer</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Lifetime value</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{TS.EUR(ltv)}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Orders</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{orders.length}</div></div>
            <div className="card" style={{ padding: 14, border: open > 0 ? '1px solid color-mix(in oklab, var(--red) 30%, var(--border))' : undefined }}><div className="text-faint fs-11">Open balance</div><div className="mono strong" style={{ fontSize: 22, color: open > 0 ? 'var(--red)' : 'var(--text)', marginTop: 4 }}>{TS.EUR(open)}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">In-flight orders</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{inflight}</div></div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Order history ({orders.length})</div>
              <span className="text-faint fs-11">click row → order detail</span>
            </div>
            <div className="card-pad" style={{ padding: 0 }}>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>ID</th><th>Status</th><th>Type</th><th>Title</th><th className="num">Gross</th><th className="num">Outstanding</th><th>Final deadline</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} onClick={() => navigate('order-detail', { id: o.id })} style={{ cursor: 'pointer' }}>
                      <td className="mono"><strong>#{o.id}</strong></td>
                      <td><StatusPill status={o.status}/></td>
                      <td className="text-muted">{TD.WORK_TYPE_LABELS[o.workType]}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.titleTBD ? <em className="text-faint">folgt</em> : o.title}</td>
                      <td className="num mono">{TS.EUR(o.grossEur)}</td>
                      <td className="num mono">{o.outstandingEur > 0 ? <span style={{ color: 'var(--red)' }}>{TS.EUR(o.outstandingEur)}</span> : <span className="text-faint">€0</span>}</td>
                      <td className="mono fs-11">{o.finalDeadline ? TS.fmtDate(o.finalDeadline) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Activity timeline</div><span className="text-faint fs-11">last 10 events</span></div>
            <div className="card-pad">
              <div className="timeline">
                {timeline.map((e, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${e.kind === 'pay' ? 'green' : 'blue'}`}><Icon name={e.icon} size={10}/></div>
                    <div className="timeline-content">
                      <div className="timeline-title">{e.text}</div>
                      <div className="timeline-meta mono">{TS.fmtDate(e.t)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-head"><div className="card-title">Pipedrive sync</div><span className="pill pill-green"><Icon name="check" size={10}/> Live</span></div>
            <div className="card-pad fs-12">
              <div className="kv">
                <div className="kv-row"><dt>Pipedrive person</dt><dd className="mono">#PE-{customerId}</dd></div>
                <div className="kv-row"><dt>Marketing status</dt><dd><span className="pill pill-green" style={{ fontSize: 10 }}>subscribed</span></dd></div>
                <div className="kv-row"><dt>Last sync</dt><dd className="text-faint">{TS.relTime('2026-05-07T13:42:00')}</dd></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Tags</div></div>
            <div className="card-pad">
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {(c.tags || []).map(t => <span key={t} className="pill pill-blue">{t}</span>)}
                {!c.tags?.length && <span className="text-faint fs-12">No tags</span>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Quick actions</div></div>
            <div className="card-pad flex-col gap-2">
              <button type="button" className="btn btn-sm" onClick={() => navigate('inbox')}><Icon name="message-square" size={12}/> Open inbox thread</button>
              <button type="button" className="btn btn-sm" onClick={() => navigate('order-new')}><Icon name="plus" size={12}/> Create new order</button>
              <NotReady className="btn btn-sm" label="Send dunning email"><Icon name="mail" size={12}/> Send dunning</NotReady>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.CustomerDetail = CustomerDetail;

// ====================================================================
// ADMIN — /admin/ghostwriters/:id — Admin GW Profile (with shadow-ban)
// ====================================================================
function GhostwriterDetail({ gwId, navigate, fixState, setFixState, toast }) {
  const g = TD.gw(gwId);
  if (!g) return <div className="page">Ghostwriter not found.</div>;
  const orders = TD.ORDERS.map(o => ({ ...o, ...(fixState?.[o.id] || {}) })).filter(o => o.gwId === gwId);
  const active = orders.filter(o => !['completed','cancelled','bye'].includes(o.status));
  const completed = orders.filter(o => o.status === 'completed');
  const honorTotal = orders.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const releasable = orders.filter(o => o.gwPaymentStatus === 'invoice_received').reduce((s, o) => s + (o.netHonorarium || 0), 0);

  const [shadowToggle, setShadowToggle] = useStateA(g.banned || false);
  const [reason, setReason] = useStateA(g.banReason || '');
  const applyShadowBan = () => {
    // Demo-side mutate: store on fixState under a synthetic key
    if (setFixState) setFixState(prev => ({ ...prev, ['__gw_' + gwId]: { banned: shadowToggle, banReason: reason } }));
    toast && toast({ text: shadowToggle ? `${g.name} shadow-banned · email alerts paused` : `${g.name} reinstated · email alerts resumed`, tone: shadowToggle ? 'danger' : 'success' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Ghostwriters', g.name]}/>
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar initials={g.initials} size={36} tone={g.banned ? 'red' : 'neutral'}/>
            <span>{g.name}</span>
            {g.banned && <span className="pill pill-red">Shadow-banned</span>}
            {g.isOwner && <span className="pill pill-blue">Owner</span>}
          </h1>
          <div className="page-subtitle"><span className="mono">{g.email}</span> · {g.phone || '—'} · ★ {g.rating?.toFixed(1) || '—'} · {Math.round((g.onTime || 0) * 100)}% on-time · {g.lifetime || 0} lifetime</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('ghostwriters')}><Icon name="chevron-left" size={14}/> Back</button>
          <NotReady className="btn" feature="whatsapp"><Icon name="message-square" size={14}/> WhatsApp</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Active jobs</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{active.length}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Completed</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{completed.length}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Total honorar paid</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{TS.EUR(honorTotal)}</div></div>
            <div className="card" style={{ padding: 14, border: releasable > 0 ? '1px solid color-mix(in oklab, var(--green) 30%, var(--border))' : undefined }}><div className="text-faint fs-11">Friday releasable</div><div className="mono strong" style={{ fontSize: 22, color: releasable > 0 ? 'var(--green)' : 'var(--text)', marginTop: 4 }}>{TS.EUR(releasable)}</div></div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Expertise</div></div>
            <div className="card-pad flex gap-2" style={{ flexWrap: 'wrap' }}>
              {(g.expertise || []).map(e => <span key={e} className="pill pill-blue">{e}</span>)}
              <span className="pill pill-slate">Languages: {(g.languages || []).join(', ')}</span>
              {g.rate != null && <span className="pill pill-slate">Default rate: {Math.round(g.rate * 100)}%</span>}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Active assignments ({active.length})</div></div>
            <div className="card-pad" style={{ padding: 0 }}>
              {active.length === 0 && <div className="text-faint fs-12" style={{ padding: 16 }}>No active assignments.</div>}
              {active.length > 0 && (
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>ID</th><th>Status</th><th>Title</th><th className="num">Honorar</th><th>Final</th></tr></thead>
                  <tbody>
                    {active.map(o => (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: o.id })}>
                        <td className="mono"><strong>#{o.id}</strong></td>
                        <td><StatusPill status={o.status}/></td>
                        <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</td>
                        <td className="num mono" style={{ color: 'var(--green)' }}>{TS.EUR(o.netHonorarium)}</td>
                        <td className="mono fs-11">{TS.fmtDate(o.finalDeadline)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Quality stats</div></div>
            <div className="card-pad">
              <div className="kv" style={{ fontSize: 12 }}>
                <div className="kv-row"><dt>On-time delivery</dt><dd className="mono"><span style={{ color: g.onTime >= 0.95 ? 'var(--green)' : g.onTime >= 0.85 ? 'var(--text)' : 'var(--red)' }}>{Math.round((g.onTime || 0) * 100)}%</span></dd></div>
                <div className="kv-row"><dt>Avg customer rating</dt><dd className="mono">★ {g.rating?.toFixed(1) || '—'}</dd></div>
                <div className="kv-row"><dt>Avg revision rounds</dt><dd className="mono">{(orders.reduce((s, o) => s + (o.revisionRounds || 0), 0) / Math.max(1, orders.length)).toFixed(1)}</dd></div>
                <div className="kv-row"><dt>AGB version signed</dt><dd className="mono">{g.agbsVersion || '—'} · {g.agbsAt ? TS.fmtDate(g.agbsAt) : '—'}</dd></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-3">
          <div className="card" style={{ borderColor: shadowToggle ? 'color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
            <div className="card-head"><div className="card-title">Shadow-ban</div></div>
            <div className="card-pad flex-col gap-2">
              <div className="text-muted fs-11" style={{ lineHeight: 1.6 }}>
                Silently stops email alerts about new jobs. The board still loads if visited directly. Use for poor-quality or unreliable GWs.
              </div>
              <label className="flex items-center gap-2" style={{ cursor: 'pointer', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
                <input type="checkbox" checked={shadowToggle} onChange={e => setShadowToggle(e.target.checked)}/>
                <span className="fs-12">Shadow-ban this GW</span>
              </label>
              {shadowToggle && (
                <div className="field"><label>Reason (admin-only, never shown to GW)</label>
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Quality declining last 3 jobs"/>
                </div>
              )}
              <button type="button" className="btn btn-sm" onClick={applyShadowBan} style={{ background: shadowToggle ? 'color-mix(in oklab, var(--red) 12%, var(--surface))' : undefined, borderColor: shadowToggle ? 'var(--red)' : undefined, color: shadowToggle ? 'var(--red)' : undefined }}>
                <Icon name={shadowToggle ? 'eye' : 'check'} size={12}/> {shadowToggle ? 'Apply shadow-ban' : 'Reinstate'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Banking</div><span className="pill pill-green" style={{ fontSize: 10 }}><Icon name="check" size={9}/> Verified</span></div>
            <div className="card-pad fs-12">
              <div className="kv">
                <div className="kv-row"><dt>IBAN</dt><dd className="mono">{g.iban || 'DE•• •••• •••• •••• ••••'}</dd></div>
                <div className="kv-row"><dt>Tax ID</dt><dd className="mono">{g.taxId || '••/•••/•••••'}</dd></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Private notes</div></div>
            <div className="card-pad">
              <textarea placeholder="Internal notes only — never shown to the GW." style={{ width: '100%', minHeight: 80, border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 11.5, resize: 'vertical', background: 'var(--surface)' }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.GhostwriterDetail = GhostwriterDetail;

})();
