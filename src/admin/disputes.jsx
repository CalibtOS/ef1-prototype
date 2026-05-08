// Admin · Disputes — open dispute orders + resolution actions.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ DISPUTES (minimal) ============
function DisputesPage({ navigate, fixState }) {
  // Derive disputes from real order state. Categorize by what's actually wrong.
  const allEffective = D.ORDERS.map(o => ({ ...o, ...(fixState?.[o.id] || {}) }));
  const summarizeOrder = (o) => {
    if (o.status === 'ai_violation_review') {
      const sub = D.SUBMISSIONS?.find(s => s.orderId === o.id);
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
              const o = D.order(d.orderId);
              const cust = o ? D.customer(o.customerId) : null;
              const gw = o ? D.gw(o.gwId) : null;
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

window.DisputesPage = DisputesPage;
})();
