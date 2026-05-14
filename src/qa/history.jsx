// QA · History — last reviewed submissions audit trail.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ QA HISTORY ============
function QAHistory({ navigate }) {
  const reviewRows = window.EFHooks.useQaHistory();
  const initialsFor = (name) => (name || 'QA')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase();
  const history = reviewRows.map(({ order, submission }) => {
    const gw = D.gw(submission.gwId || order.gwId);
    const reviewer = submission.reviewer || 'Lina Hoffmann';
    const action = submission.qaStatus === 'passed'
      ? 'approved'
      : submission.qaStatus === 'revision_requested'
        ? 'revision'
        : (submission.flagType === 'plagiarism' || order.status === 'plagiarism_violation_review' ? 'plag_violation' : 'ai_violation');
    const at = submission.reviewedAt || submission.forwardedAt || order.qaFlaggedAt || submission.submittedAt;
    const note = action === 'approved'
      ? (submission.synthetic ? 'Imported final QA pass · forwarded to customer' : 'Forwarded to customer')
      : action === 'revision'
        ? `Revision requested · round ${submission.round || order.revisionRounds || 1}`
        : action === 'plag_violation'
          ? `Plagiarism ${submission.plagiarismScore ?? '—'}% · routed to admin review`
          : `AI ${submission.aiScore ?? '—'}% · routed to admin review`;
    return {
      id: submission.id,
      orderId: order.id,
      action,
      kind: submission.kind,
      gw: gw?.name || 'Unassigned GW',
      gwI: gw?.initials || initialsFor(gw?.name),
      reviewer,
      revI: initialsFor(reviewer),
      plag: submission.plagiarismScore,
      ai: submission.aiScore,
      at,
      note,
    };
  });

  const counts = {
    approved: history.filter(h => h.action === 'approved').length,
    revision: history.filter(h => h.action === 'revision').length,
    violation: history.filter(h => h.action === 'ai_violation' || h.action === 'plag_violation').length,
  };

  const actionPill = (a) => {
    if (a === 'approved') return <span className="pill pill-green"><Icon name="check" size={10}/> Approved</span>;
    if (a === 'revision') return <span className="pill pill-orange">Revision requested</span>;
    if (a === 'ai_violation') return <span className="pill pill-red">AI violation</span>;
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
          {history.length === 0 && (
            <EmptyState compact icon="history" title="No QA decisions yet" body="Final and revision QA decisions will appear here after review."/>
          )}
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
                  <span className="fs-11 mono text-faint">
                    plag <span style={{ color: h.plag == null ? 'var(--text-3)' : h.plag < 15 ? 'var(--green)' : h.plag < 30 ? 'var(--amber)' : 'var(--red)' }}>{h.plag ?? '—'}{h.plag == null ? '' : '%'}</span>
                    {' '}· AI <span style={{ color: h.ai == null ? 'var(--text-3)' : h.ai < 15 ? 'var(--green)' : h.ai < 30 ? 'var(--amber)' : 'var(--red)' }}>{h.ai ?? '—'}{h.ai == null ? '' : '%'}</span>
                  </span>
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
})();
