// QA · History — last reviewed submissions audit trail.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

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
                  <span className="text-faint fs-11 mono">{U.relTime(h.at)}</span>
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

window.QAHistory = QAHistory;
})();
