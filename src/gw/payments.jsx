// GW · Payments — honorarium history, Friday batches, IBAN reference.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ GW PAYMENTS ============
function GWPayments({ navigate }) {
  const mine = D.myAssignments();
  const releasable = mine.filter(o => o.gwPaymentStatus === 'invoice_received');
  const pending = mine.filter(o => o.gwPaymentStatus === 'work_in_progress');
  const paid = mine.filter(o => o.gwPaymentStatus === 'paid');
  const sumOf = (xs) => xs.reduce((s,o) => s + (o.netHonorarium||0), 0);

  const Row = ({ o, blocker }) => (
    <tr style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: o.id })}>
      <td className="mono">#{o.id}</td>
      <td className="fs-12" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</td>
      <td className="num mono">{Math.round((o.rate||0)*100)}%</td>
      <td className="num mono strong" style={{ color: 'var(--green)' }}>{U.EUR(o.netHonorarium)}</td>
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
          <div className="mono strong" style={{ fontSize: 24, color: 'var(--green)', marginTop: 4 }}>{U.EUR(sumOf(releasable))}</div>
          <div className="text-faint fs-11 mt-1">{releasable.length} assignment(s) · arrives 1–3 business days after release</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Pending (work in progress)</div>
          <div className="mono strong" style={{ fontSize: 24, marginTop: 4 }}>{U.EUR(sumOf(pending))}</div>
          <div className="text-faint fs-11 mt-1">{pending.length} assignment(s) · upload final + invoice to unlock</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Paid (lifetime · last 12 mo)</div>
          <div className="mono strong" style={{ fontSize: 24, marginTop: 4 }}>{U.EUR(sumOf(paid) + 14820)}</div>
          <div className="text-faint fs-11 mt-1">{(paid.length || 0) + 38} payouts · avg {U.EUR(((sumOf(paid) + 14820) / ((paid.length||0) + 38)))}</div>
        </div>
      </div>

      <div className="card mb-3" style={{ border: '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' }}>
        <div className="card-head"><div className="card-title flex items-center gap-2"><Icon name="wallet" size={14}/> Releasing this Friday · {U.fmtDate('2026-05-08')}</div><span className="pill pill-green">Ready</span></div>
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

window.GWPayments = GWPayments;
})();
