// Admin dashboard
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar } = window;
const { CrumbBar } = window;
const U = window.EFU; // utils
const D = window.EF; // data

// ----- Sparkline -----
function Spark({ values, color = 'var(--blue)', w = 120, h = 28 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const dx = w / (values.length - 1);
  const norm = v => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i*dx).toFixed(1)},${norm(v).toFixed(1)}`).join(' ');
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} className="spark-svg">
      <path d={area} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ----- Mini bar chart -----
function MiniBars({ data, w = 320, h = 110 }) {
  const max = Math.max(...data.map(d => d.v));
  const bw = (w - 24) / data.length - 6;
  return (
    <svg width={w} height={h}>
      {data.map((d, i) => {
        const bh = (d.v / max) * (h - 24);
        const x = 12 + i * (bw + 6);
        const y = h - 18 - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="2" fill={d.color || 'var(--blue)'} opacity={d.faded ? 0.35 : 1} />
            <text x={x + bw/2} y={h - 5} textAnchor="middle" className="chart-axis">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ============ ADMIN DASHBOARD ============
function AdminDashboard({ navigate, openFridayBatch }) {
  const k = window.EFHooks.useKpis();
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good afternoon, Berat.</h1>
          <div className="page-subtitle">Donnerstag, 07.05.2026 · Friday batch tomorrow · {k.fridayCount} releasable · {U.EUR(k.fridayEur)}</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-new')}><Icon name="plus" size={14}/> New order <span className="kbd">⌘N</span></button>
          <button type="button" className="btn btn-primary" onClick={openFridayBatch}><Icon name="zap" size={14}/> Open Friday batch</button>
        </div>
      </div>

      <div className="kpi-grid mb-4">
        <div className="kpi">
          <div className="kpi-label"><Icon name="euro" size={13}/> Open Receivables</div>
          <div className="kpi-value">{U.EUR(k.openReceivables)}</div>
          <div className="kpi-delta"><Icon name="arrow-up-right" size={12}/> +{U.EUR(4120)} this week</div>
          <div className="kpi-icon-bg"><Icon name="euro" size={14}/></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="package" size={13}/> Active Orders</div>
          <div className="kpi-value">{k.activeOrders}</div>
          <div className="kpi-delta"><Icon name="arrow-up-right" size={12}/> +18 this week</div>
          <div className="kpi-icon-bg"><Icon name="package" size={14}/></div>
        </div>
        <div className="kpi" style={{ borderColor: 'color-mix(in oklab, var(--green) 30%, var(--border))' }}>
          <div className="kpi-label"><Icon name="wallet" size={13}/> Friday Releasable</div>
          <div className="kpi-value">{k.fridayCount} · {U.EUR(k.fridayEur)}</div>
          <div className="kpi-cta" onClick={openFridayBatch}>Open Friday batch →</div>
          <div className="kpi-icon-bg"><Icon name="wallet" size={14}/></div>
        </div>
        <div className="kpi warn">
          <div className="kpi-label"><Icon name="shield-check" size={13}/> QA Queue</div>
          <div className="kpi-value">{k.qaPending}</div>
          <div className="kpi-delta danger"><Icon name="flame" size={12}/> {k.aiFlagged} AI flagged</div>
          <div className="kpi-icon-bg"><Icon name="shield-check" size={14}/></div>
        </div>
        <div className={`kpi ${k.overdueInterim > 0 ? 'danger' : ''}`}>
          <div className="kpi-label"><Icon name="clock" size={13}/> Overdue Interim</div>
          <div className="kpi-value">{k.overdueInterim}</div>
          <div className={`kpi-delta ${k.overdueInterim > 0 ? 'danger' : ''}`}><Icon name="arrow-up-right" size={12}/> derived from active orders</div>
          <div className="kpi-icon-bg"><Icon name="clock" size={14}/></div>
        </div>
        <div className="kpi warn">
          <div className="kpi-label"><Icon name="users" size={13}/> Pipedrive Subscribers</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{k.pipedriveSubs}</div>
          <div className="kpi-delta danger">83% of cap — clean up before next campaign</div>
          <div className="kpi-icon-bg"><Icon name="users" size={14}/></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <NeedsYourDecision navigate={navigate}/>
        <TodaysDeadlines navigate={navigate}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Revenue this month</div>
            <div className="flex gap-3 fs-11">
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, background: 'var(--blue)', borderRadius: 2 }}/> Gross</span>
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: 2 }}/> GW Honorar</span>
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, background: 'var(--text-3)', borderRadius: 2, opacity: 0.4 }}/> Margin</span>
            </div>
          </div>
          <div className="card-pad">
            <RevenueChart />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Pipeline funnel</div>
            <span className="text-faint fs-11">last 30 days</span>
          </div>
          <div className="card-pad">
            <FunnelChart />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <LiveActivityFeed/>
        <IntegrationsHealth navigate={navigate}/>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">GW workload heatmap</div>
          <span className="text-faint fs-11">active assignments · next 14 days</span>
        </div>
        <div className="card-pad" style={{ overflowX: 'auto' }}>
          <Heatmap />
        </div>
      </div>
    </div>
  );
}

// ===== Needs Your Decision (derived) =====
// Pulls action items live from the store. Replaces five hardcoded buttons that
// went stale after any user action. Items are ranked by urgency:
//   1. AI / plagiarism violations (red)
//   2. Pending GW claim approvals
//   3. Extension / delay requests awaiting admin
//   4. Disputes open
//   5. Payment-release blocked (gates fail on payment_pending order)
//   6. Threads with financial auto-flag
function buildDecisionItems(orders, submissions, threads) {
  const items = [];
  const seen = new Set();
  const D = window.EF;

  // 1. AI / plagiarism violations
  orders.forEach(o => {
    if (o.status === 'ai_violation_review' || o.status === 'plagiarism_violation_review') {
      items.push({
        kind: 'violation',
        urgency: 1,
        orderId: o.id,
        title: o.status === 'ai_violation_review' ? '🚨 AI Violation' : '🚨 Plagiarism Flag',
        body: `Order #${o.id} — ${o.title}`,
        meta: `GW ${D.gw(o.gwId)?.name || 'unknown'} · ${o.qaFlagReason || 'flagged for admin review'}`,
        cta: 'Review',
        ctaTone: 'red',
        navigate: ['order-detail', { id: o.id }],
      });
      seen.add(o.id);
    }
  });

  // 2. Claim approvals
  orders.forEach(o => {
    if (o.status === 'claimed_pending_approval') {
      const claimer = D.gw(o.gwId);
      items.push({
        kind: 'claim',
        urgency: 2,
        orderId: o.id,
        title: `${claimer?.name || 'GW'} claimed Order #${o.id} — approve to start`,
        body: `${D.WORK_TYPE_LABELS[o.workType] || o.workType} · ${o.title}`,
        meta: `${o.pages || '—'} pages · ${o.netHonorarium ? window.EFU.EUR(o.netHonorarium) : ''} · ${o.claimedAt ? window.EFU.relTime(o.claimedAt) : ''}`,
        cta: 'Review',
        ctaTone: 'blue',
        navigate: ['order-detail', { id: o.id }],
      });
      seen.add(o.id);
    }
  });

  // 3. Extension / delay
  orders.forEach(o => {
    if (o.status === 'extension_requested' || o.status === 'delay_reported') {
      const isExt = o.status === 'extension_requested';
      items.push({
        kind: 'extension',
        urgency: 3,
        orderId: o.id,
        title: `${isExt ? 'Extension requested' : 'Delay reported'} · #${o.id}`,
        body: o.title,
        meta: isExt
          ? `${o.extensionPending?.extraPages ? o.extensionPending.extraPages + ' extra pages · ' : ''}${o.extensionPending?.requestedAt ? window.EFU.relTime(o.extensionPending.requestedAt) : ''}`
          : `Reason: ${o.delayReason || 'unspecified'} · proposed ${o.proposedNewDeadline ? window.EFU.fmtDate(o.proposedNewDeadline) : 'TBD'}`,
        cta: 'Decide',
        ctaTone: 'amber',
        navigate: ['order-detail', { id: o.id }],
      });
      seen.add(o.id);
    }
  });

  // 4. Open disputes
  orders.forEach(o => {
    if (o.disputeOpen && !seen.has(o.id)) {
      items.push({
        kind: 'dispute',
        urgency: 4,
        orderId: o.id,
        title: `Dispute open · #${o.id}`,
        body: o.title,
        meta: `${D.customer(o.customerId)?.name || ''} · revision round ${o.revisionRounds || 0}`,
        cta: 'Open',
        ctaTone: 'orange',
        navigate: ['order-detail', { id: o.id }],
      });
      seen.add(o.id);
    }
  });

  // 5. Friday batch blocked (payment_pending but not all gates green)
  const W = window.EFWorkflow;
  orders.forEach(o => {
    if (o.status !== 'payment_pending' || seen.has(o.id)) return;
    const gates = W.releaseGates(o);
    if (gates.releasable) return;
    const reason = gates.reasons[0] || 'release blocked';
    items.push({
      kind: 'release_blocked',
      urgency: 5,
      orderId: o.id,
      title: `Order #${o.id} ready for payment release — gate blocked`,
      body: `${D.customer(o.customerId)?.name || ''} · GW ${D.gw(o.gwId)?.name || ''}`,
      meta: reason,
      cta: 'Open',
      ctaTone: 'amber',
      navigate: ['order-detail', { id: o.id }],
    });
    seen.add(o.id);
  });

  // 6. Threads flagged financial / follow-up
  threads.forEach(t => {
    if (t.flagged === 'financial' || t.followUp) {
      items.push({
        kind: 'thread_flag',
        urgency: 6,
        orderId: t.orderId,
        title: t.flagged === 'financial' ? `Customer #${t.orderId} asked about pricing — auto-redirected` : `Thread flagged for follow-up · #${t.orderId}`,
        body: t.subject,
        meta: window.EFU.relTime(t.lastAt),
        cta: 'Open inbox',
        ctaTone: 'blue',
        navigate: ['inbox'],
      });
    }
  });

  items.sort((a, b) => a.urgency - b.urgency);
  return items;
}

function NeedsYourDecision({ navigate }) {
  const orders = window.EFHooks.useOrders();
  const submissions = window.EFHooks.useSubmissions();
  const threads = window.EFHooks.useThreads();
  const items = buildDecisionItems(orders, submissions, threads).slice(0, 6);

  const iconFor = (k) => k === 'violation' ? 'alert-triangle'
    : k === 'claim' ? 'feather'
    : k === 'extension' ? 'clock'
    : k === 'dispute' ? 'alert-triangle'
    : k === 'release_blocked' ? 'wallet'
    : 'message-square';
  const iconColor = (tone) => tone === 'red' ? { bg: 'var(--red-soft)', fg: 'var(--red)' }
    : tone === 'blue' ? { bg: 'color-mix(in oklab, var(--blue) 14%, transparent)', fg: 'var(--blue)' }
    : tone === 'amber' ? { bg: 'var(--amber-soft)', fg: '#B45309' }
    : tone === 'orange' ? { bg: 'color-mix(in oklab, var(--orange) 14%, transparent)', fg: 'var(--orange)' }
    : { bg: 'var(--surface-2)', fg: 'var(--text-2)' };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Needs your decision</div>
        <span className="text-faint fs-11">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      <div className="card-pad flex-col gap-2">
        {items.length === 0 && (
          <div className="text-faint fs-12" style={{ padding: '24px 12px', textAlign: 'center' }}>
            <Icon name="check-circle" size={18} className="mb-2" style={{ color: 'var(--green)' }}/>
            <div>0 actions — all clear.</div>
          </div>
        )}
        {items.map((it, i) => {
          const c = iconColor(it.ctaTone);
          return (
            <button key={`${it.kind}-${it.orderId}-${i}`} type="button" className="action-row" onClick={() => navigate(...it.navigate)}>
              <div className="action-icon" style={{ background: c.bg, color: c.fg }}>
                <Icon name={iconFor(it.kind)} size={16}/>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="text-strong fs-12">
                  {it.kind === 'violation' && <span className="pill pill-red" style={{ marginRight: 6 }}>{it.title.replace('🚨 ', '🚨 ')}</span>}
                  {it.kind !== 'violation' && it.title}
                  {it.kind === 'violation' && <span>{it.body}</span>}
                </div>
                <div className="text-muted fs-11">
                  {it.kind === 'violation' ? it.meta : <>{it.body}{it.meta ? ' · ' + it.meta : ''}</>}
                </div>
              </div>
              {it.cta === 'Review' || it.cta === 'Open' || it.cta === 'Decide' || it.cta === 'Open inbox'
                ? <span className={`btn btn-sm ${it.ctaTone === 'blue' ? 'btn-blue' : ''}`}>{it.cta}</span>
                : <Icon name="chevron-right" size={16} className="text-faint"/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Today's Deadlines (derived) =====
// Pulls all interim/final deadlines in a +/- window from the demo NOW. Replaces
// the hardcoded list, so a delay-reported or extension-approved order updates
// the panel immediately on role-switch.
function TodaysDeadlines({ navigate }) {
  const orders = window.EFHooks.useOrders();
  const D = window.EF;
  const NOW = D.DEMO_NOW || new Date();
  const closedStates = new Set(['completed','cancelled','payment_pending','delivered']);
  const items = [];
  orders.forEach(o => {
    if (closedStates.has(o.status)) return;
    if (o.interimDeadline) items.push({ orderId: o.id, kind: 'interim_1', label: 'Zwischenstand 1', date: o.interimDeadline, order: o });
    if (o.interim2Deadline) items.push({ orderId: o.id, kind: 'interim_2', label: 'Zwischenstand 2', date: o.interim2Deadline, order: o });
    if (o.finalDeadline) items.push({ orderId: o.id, kind: 'final', label: 'Final', date: o.finalDeadline, order: o });
  });
  items.sort((a, b) => new Date(a.date) - new Date(b.date));
  // Window: from yesterday to +5 days, capped at 6.
  const windowStart = new Date(NOW); windowStart.setDate(windowStart.getDate() - 1);
  const windowEnd = new Date(NOW); windowEnd.setDate(windowEnd.getDate() + 5);
  const visible = items.filter(d => {
    const dt = new Date(d.date);
    return dt >= windowStart && dt <= windowEnd;
  }).slice(0, 6);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Today's deadlines</div>
        <span className="text-faint fs-11">{visible.length} items · next 5 days</span>
      </div>
      <div className="card-pad">
        {visible.length === 0 ? (
          <div className="text-faint fs-12" style={{ padding: '12px 0' }}>No upcoming deadlines in the window.</div>
        ) : (
          <div className="timeline">
            {visible.map((d, i) => {
              const meta = window.EFU.deadlineMeta(d.date);
              const cust = D.customer(d.order.customerId);
              const gw = D.gw(d.order.gwId);
              const dotTone = meta.tone === 'danger' ? 'red' : meta.tone === 'warn' ? '' : '';
              const pillTone = meta.tone === 'danger' ? 'pill-red' : meta.tone === 'warn' ? 'pill-amber' : 'pill-slate';
              const isFlagged = d.order.flagged || d.order.status === 'ai_violation_review';
              return (
                <div key={`${d.orderId}-${d.kind}-${i}`} className="timeline-item" style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: d.orderId })}>
                  <div className={`timeline-dot ${dotTone}`}><Icon name="dot" size={10}/></div>
                  <div className="timeline-content">
                    <div className="timeline-title">
                      <span className={`pill ${pillTone}`} style={{ marginRight: 6 }}>{meta.label}</span>
                      Order #{d.orderId} · <span className="mono">{d.label}</span> — {window.EFU.fmtDate(d.date)}, 18:00
                      {isFlagged && <span className="pill pill-red" style={{ marginLeft: 6 }}>blocked</span>}
                    </div>
                    <div className="timeline-meta">
                      {cust?.name || ''}{gw ? ` · GW ${gw.name}` : ''} · {D.WORK_TYPE_LABELS[d.order.workType] || d.order.workType}{d.order.pages ? `, ${d.order.pages} pages` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Live activity feed: Pipedrive · Stripe · Cloudflare · Plagiarism · GPTZero
// Deterministic event stream — appends a new event every ~7 s with a flash animation.
const LIVE_SEED = [
  { kind: 'stripe', icon: 'wallet', color: 'var(--green)', text: 'payment_intent.succeeded · #3540 · €686.00 · Klarna', detail: 'pi_3Q8x2pAB' },
  { kind: 'pipedrive', icon: 'git-branch', color: 'var(--blue)', text: 'deal.update · #3526 · stage=Won', detail: 'syncCheck OK' },
  { kind: 'plag', icon: 'shield-check', color: 'var(--green)', text: 'plagiarism.scanned · sub s4 · 6%', detail: 'PlagScan · 2.4s' },
  { kind: 'sevdesk', icon: 'file-text', color: 'var(--blue)', text: 'invoice.changeStatus · RG-2026-3540 · paid', detail: 'sevUser=ef1-platform' },
  { kind: 'cloudflare', icon: 'mail', color: 'var(--text-2)', text: 'email.received · order-3499@orders.efactory1.de', detail: 'keyword=Rate → redirected' },
  { kind: 'ai', icon: 'bot', color: 'var(--red)', text: 'gptzero.flag · sub s2 · 87% (#3517)', detail: 'GPT-4 burstiness signature' },
  { kind: 'pipedrive', icon: 'git-branch', color: 'var(--blue)', text: 'person.update · marketing_status=subscribed', detail: 'PE-2114' },
  { kind: 'stripe', icon: 'wallet', color: 'var(--green)', text: 'payment_intent.succeeded · #3539 · €293.08 · SEPA', detail: 'pi_3QAa1cWv' },
  { kind: 'plag', icon: 'shield-check', color: 'var(--green)', text: 'plagiarism.scanned · sub s7 · 4%', detail: 'PlagScan · 1.9s' },
  { kind: 'cloudflare', icon: 'mail', color: 'var(--text-2)', text: 'email.received · order-3522@orders.efactory1.de', detail: 'GW → customer · CC efactory1' },
  { kind: 'sevdesk', icon: 'file-text', color: 'var(--blue)', text: 'order.sendViaEmail · AN-2026-3527', detail: 'Angebot sent' },
];
function LiveActivityFeed() {
  const { useState, useEffect } = React;
  const [events, setEvents] = useState(() =>
    LIVE_SEED.slice(0, 6).map((e, i) => ({ ...e, id: 'init-' + i, t: new Date(Date.now() - (i + 1) * 32000).toISOString(), fresh: false }))
  );
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    let i = 0;
    const tick = () => {
      const tpl = LIVE_SEED[i % LIVE_SEED.length];
      i++;
      setEvents(prev => [{ ...tpl, id: 'live-' + Date.now(), t: new Date().toISOString(), fresh: true }, ...prev].slice(0, 8));
      setTimeout(() => setEvents(prev => prev.map(x => ({ ...x, fresh: false }))), 1700);
    };
    const handle = setInterval(tick, 7000);
    return () => clearInterval(handle);
  }, [paused]);
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const labelFor = (k) => ({ stripe: 'Stripe', pipedrive: 'Pipedrive', sevdesk: 'Sevdesk', cloudflare: 'Cloudflare', plag: 'PlagScan', ai: 'GPTZero' })[k] || k;
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><span className="ef-live-dot"/> Live activity</div>
        <div className="flex items-center gap-2">
          <span className="text-faint fs-11 mono">{events.length} of last 8</span>
          <button type="button" className="btn btn-sm" onClick={() => setPaused(p => !p)}>
            <Icon name={paused ? 'zap' : 'eye'} size={11}/> {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
      <div className="card-pad" style={{ padding: 0 }}>
        <table className="tbl" style={{ fontSize: 11.5 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }}></th>
              <th>Service</th>
              <th>Event</th>
              <th>Detail</th>
              <th className="num">Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id} className={e.fresh ? 'ef-flash-green' : ''}>
                <td>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: 'color-mix(in oklab, ' + e.color + ' 12%, var(--surface-2))', color: e.color, display: 'grid', placeItems: 'center' }}>
                    <Icon name={e.icon} size={13}/>
                  </div>
                </td>
                <td className="strong">{labelFor(e.kind)}</td>
                <td className="mono fs-11">{e.text}</td>
                <td className="text-faint fs-11 mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{e.detail}</td>
                <td className="num text-faint fs-11 mono">{fmtTime(e.t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Integrations health card with animated sync sweep + retry button per integration
function IntegrationsHealth({ navigate }) {
  const { useState } = React;
  const [syncing, setSyncing] = useState(null);
  const [lastSync, setLastSync] = useState({
    pipedrive: '2026-05-07T13:18:00',
    sevdesk: '2026-05-07T13:18:00',
    stripe: '2026-05-07T14:31:00',
    cloudflare: '2026-05-07T14:32:00',
    plag: '2026-05-07T11:42:00',
    ai: '2026-05-07T09:14:00',
  });
  const triggerSync = (k) => {
    setSyncing(k);
    setTimeout(() => {
      setLastSync(prev => ({ ...prev, [k]: new Date().toISOString() }));
      setSyncing(null);
    }, 850);
  };
  const fmtAgo = (iso) => {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.max(1, Math.floor(ms / 60000));
    if (m < 60) return m + 'm ago';
    return Math.floor(m / 60) + 'h ago';
  };
  const items = [
    { k: 'pipedrive', name: 'Pipedrive', sub: 'CRM · 4,159/5,000 subs', icon: 'git-branch', status: 'warn' },
    { k: 'sevdesk', name: 'Sevdesk', sub: 'Invoicing · 645 RG YTD', icon: 'file-text', status: 'ok' },
    { k: 'stripe', name: 'Stripe', sub: 'payment_intent · 0 fail/7d', icon: 'wallet', status: 'ok' },
    { k: 'cloudflare', name: 'Cloudflare Email', sub: 'Worker order-proxy v4', icon: 'mail', status: 'ok' },
    { k: 'plag', name: 'PlagScan / Turnitin', sub: 'API quota 87% remaining', icon: 'shield-check', status: 'ok' },
    { k: 'ai', name: 'GPTZero', sub: 'Per-paragraph score', icon: 'bot', status: 'ok' },
  ];
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><span className="ef-live-dot blue"/> Integrations</div>
        <button type="button" className="btn btn-sm" onClick={() => navigate('settings')}>
          <Icon name="settings" size={11}/> Manage
        </button>
      </div>
      <div className="card-pad flex-col gap-2">
        {items.map(i => {
          const isSync = syncing === i.k;
          return (
            <div key={i.k} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-2)', display: 'grid', placeItems: 'center' }}>
                <Icon name={i.icon} size={14}/>
              </div>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                <span className="strong fs-12">{i.name}</span>
                <span className="text-faint fs-11">{i.sub} · last sync <span className="mono">{fmtAgo(lastSync[i.k])}</span></span>
              </div>
              {i.status === 'ok' && <span className="pill pill-green" style={{ fontSize: 10 }}>Connected</span>}
              {i.status === 'warn' && <span className="pill pill-amber" style={{ fontSize: 10 }}>Warning</span>}
              <button
                type="button"
                className="btn btn-sm"
                disabled={isSync}
                onClick={() => triggerSync(i.k)}
                aria-label={`Sync ${i.name} now`}
                title="Sync now"
              >
                <Icon name="rotate-ccw" size={11} className={isSync ? 'ef-spin' : ''}/>
              </button>
              {isSync && <span className="ef-sync-sweep"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevenueChart() {
  const w = 660, h = 200, pad = { l: 40, r: 12, t: 12, b: 24 };
  const days = ['01','03','05','07','09','11','13','15','17','19','21','23','25','27'];
  const gross  = [4200, 6100, 5800, 7900, 9100, 8200, 6700, 9800, 11200, 8800, 10100, 9400, 11800, 12100];
  const honor  = [1680, 2440, 2320, 3160, 3640, 3280, 2680, 3920, 4480, 3520, 4040, 3760, 4720, 4840];
  const margin = gross.map((g, i) => g - honor[i]);
  const max = Math.max(...gross) * 1.1;
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const x = i => pad.l + (i / (days.length - 1)) * innerW;
  const y = v => pad.t + innerH - (v / max) * innerH;
  const line = vals => vals.map((v,i)=> `${i===0?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = vals => line(vals) + ` L${x(vals.length-1)},${pad.t+innerH} L${x(0)},${pad.t+innerH} Z`;
  return (
    <svg width={w} height={h} style={{ width: '100%', height: 'auto', maxWidth: w }} viewBox={`0 0 ${w} ${h}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const yy = pad.t + innerH * (1 - p);
        return <g key={i}>
          <line x1={pad.l} x2={w-pad.r} y1={yy} y2={yy} className="chart-grid" />
          <text x={pad.l - 6} y={yy+3} textAnchor="end" className="chart-axis">€{Math.round(max*p/1000)}k</text>
        </g>;
      })}
      <path d={area(gross)} fill="var(--blue)" opacity="0.10" />
      <path d={line(gross)} fill="none" stroke="var(--blue)" strokeWidth="1.8"/>
      <path d={line(honor)} fill="none" stroke="var(--green)" strokeWidth="1.5"/>
      <path d={line(margin)} fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeDasharray="3 3"/>
      {days.map((d, i) => i % 2 === 0 && (
        <text key={i} x={x(i)} y={h - 6} textAnchor="middle" className="chart-axis">{d}.</text>
      ))}
    </svg>
  );
}

function FunnelChart() {
  const stages = [
    { name: 'Anfrage', count: 142, color: 'var(--text-3)' },
    { name: 'Qualifiziert', count: 86, color: '#94A3B8' },
    { name: 'Rückmeldung', count: 54, color: 'var(--blue)' },
    { name: 'Rechnung angefordert', count: 38, color: 'var(--blue)' },
    { name: 'Won', count: 31, color: 'var(--green)' },
  ];
  const max = stages[0].count;
  return (
    <div className="flex-col gap-2">
      {stages.map(s => (
        <div key={s.name} className="flex items-center gap-3">
          <div style={{ width: 130, fontSize: 12 }}>{s.name}</div>
          <div style={{ flex: 1, height: 22, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${(s.count/max)*100}%`, height: '100%', background: s.color, borderRadius: 4, transition: 'width .3s' }}/>
          </div>
          <div className="mono" style={{ width: 36, textAlign: 'right', fontSize: 12 }}>{s.count}</div>
        </div>
      ))}
      <div className="flex justify-between fs-11 text-faint mt-2">
        <span>Conversion: 21.8%</span>
        <span>Avg deal size: {U.EUR(2240)}</span>
      </div>
    </div>
  );
}

function Heatmap() {
  const days = Array.from({length: 14}, (_, i) => {
    const d = new Date('2026-05-08');
    d.setDate(d.getDate() + i);
    return { d: d.getDate(), label: ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()] };
  });
  const gws = D.GHOSTWRITERS.filter(g => !g.isOwner).slice(0, 11);
  const heat = (gw, dayIdx) => {
    const seed = (gw.id.charCodeAt(3) + dayIdx) * 7 % 6;
    if (gw.banned) return 0;
    return seed;
  };
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: 'auto repeat(14, 28px)', gap: 3, fontSize: 11 }}>
      <div></div>
      {days.map((d, i) => (
        <div key={i} style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <div>{d.label}</div>
          <div className="mono" style={{ color: 'var(--text-2)' }}>{String(d.d).padStart(2,'0')}</div>
        </div>
      ))}
      {gws.map(gw => (
        <React.Fragment key={gw.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12, fontSize: 11.5 }}>
            <Avatar initials={gw.initials} size={20} />
            <span style={{ color: gw.banned ? 'var(--text-3)' : 'var(--text)' }}>{gw.name}</span>
            {gw.banned && <Icon name="eye" size={11} className="text-faint" />}
          </div>
          {days.map((_, i) => {
            const v = heat(gw, i);
            return <div key={i} className={`heat-cell heat-${v}`} title={`${gw.name} · day ${i+1}: ${v} active`} />;
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

window.AdminDashboard = AdminDashboard;
window.Spark = Spark;
window.MiniBars = MiniBars;
})();
