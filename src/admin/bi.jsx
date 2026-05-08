// Admin · AI Business Intelligence dashboard — natural-language analytics + funnel.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

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

window.AIBIDashboard = AIBIDashboard;
})();
