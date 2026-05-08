// GW · Active Jobs — assignments-in-progress view with deadlines and submissions.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ GW ACTIVE JOBS ============
function GWActiveJobs({ navigate, fixState }) {
  const [filter, setFilter] = useStateA('all');

  // Apply fixState so claims/assignments made elsewhere appear here immediately.
  const realMine = D.ORDERS
    .map(o => ({ ...o, ...((fixState || {})[o.id] || {}) }))
    .filter(o => o.gwId === 'gw-iw');

  // Synthetic extras to make the page feel populated for the demo
  const synthMine = [
    { id: 3548, status: 'claimed_pending_approval', workType: 'hausarbeit', title: 'Agile Skalierung mit SAFe in Großkonzernen', field: 'Wirtschaftsinformatik', pages: 16, finalDeadline: '2026-05-26T18:00:00', interimDeadline: '2026-05-18T18:00:00', netHonorarium: 313.46, rate: 0.40, customerId: 'c-jb', claimedAt: '2026-05-07T10:42:00', stage: { interim1: 'pending', interim2: null, final: 'pending' } },
    { id: 3549, status: 'active', workType: 'hausarbeit', title: 'KPI-Dashboards für Marketing-Controlling', field: 'Marketing', pages: 18, finalDeadline: '2026-05-24T18:00:00', interimDeadline: '2026-05-12T18:00:00', netHonorarium: 392.52, rate: 0.40, customerId: 'c-mh', stage: { interim1: 'pending', interim2: null, final: 'pending' } },
    { id: 3550, status: 'revision_required', workType: 'bachelorarbeit', title: 'IT-Security in der Smart-Factory', field: 'Wirtschaftsinformatik', pages: 38, finalDeadline: '2026-05-30T18:00:00', interimDeadline: '2026-05-09T18:00:00', interim2Deadline: '2026-05-20T18:00:00', netHonorarium: 745.79, rate: 0.40, customerId: 'c-pn', revisionRounds: 1, stage: { interim1: 'done', interim2: 'pending', final: 'pending' } },
    { id: 3551, status: 'qa_review', workType: 'hausarbeit', title: 'Personalcontrolling im Mittelstand', field: 'BWL', pages: 14, finalDeadline: '2026-05-06T18:00:00', netHonorarium: 256.45, rate: 0.40, customerId: 'c-vs', gwPaymentStatus: 'invoice_received', stage: { interim1: 'done', interim2: null, final: 'done' } },
  ];

  // Augment real with derived stage info
  const realAugmented = realMine.map(o => {
    const stage = {
      interim1: o.interimDeadline ? (['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? 'done' : 'pending') : null,
      interim2: o.interim2Deadline ? (['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? 'done' : 'pending') : null,
      final: ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? 'done' : 'pending',
    };
    return { ...o, stage };
  });

  const all = [...realAugmented, ...synthMine].sort((a,b) => {
    // Pending approval first, then by deadline ascending
    if (a.status === 'claimed_pending_approval' && b.status !== 'claimed_pending_approval') return -1;
    if (b.status === 'claimed_pending_approval' && a.status !== 'claimed_pending_approval') return 1;
    return new Date(a.finalDeadline || '2099-01-01') - new Date(b.finalDeadline || '2099-01-01');
  });

  const filterMap = {
    all: () => true,
    pending: o => o.status === 'claimed_pending_approval',
    active: o => ['active', 'interim_submitted', 'under_customer_review'].includes(o.status),
    revision: o => o.status === 'revision_required',
    qa: o => ['final_submitted', 'qa_review'].includes(o.status),
    done: o => ['delivered', 'payment_pending', 'completed'].includes(o.status),
  };
  const filtered = all.filter(filterMap[filter] || (() => true));

  // KPIs
  const counts = {
    active: all.filter(o => ['active','interim_submitted','under_customer_review'].includes(o.status)).length,
    pending: all.filter(o => o.status === 'claimed_pending_approval').length,
    revision: all.filter(o => o.status === 'revision_required').length,
    qa: all.filter(o => ['final_submitted','qa_review'].includes(o.status)).length,
  };
  const inFlightHonor = all.filter(o => !['completed','cancelled'].includes(o.status)).reduce((s,o) => s + (o.netHonorarium||0), 0);
  const thisWeek = all.filter(o => {
    const d = U.daysTo(o.interimDeadline || o.finalDeadline);
    return d != null && d >= 0 && d <= 7;
  }).length;

  const StageDots = ({ stage }) => {
    const dots = [];
    if (stage?.interim1 != null) dots.push({ k: 'I1', state: stage.interim1, label: 'Zwischenstand 1' });
    if (stage?.interim2 != null) dots.push({ k: 'I2', state: stage.interim2, label: 'Zwischenstand 2' });
    dots.push({ k: 'F', state: stage?.final || 'pending', label: 'Final' });
    return (
      <div className="flex items-center gap-1">
        {dots.map((d, i) => (
          <span key={i} title={`${d.label}: ${d.state}`} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 18, fontSize: 9, fontWeight: 600, borderRadius: 4,
            background: d.state === 'done' ? 'var(--green)' : 'var(--surface-2)',
            color: d.state === 'done' ? 'white' : 'var(--text-3)',
            border: d.state === 'done' ? '1px solid var(--green)' : '1px solid var(--border)',
          }}>{d.state === 'done' ? '✓' : d.k}</span>
        ))}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Assignments</h1>
          <div className="page-subtitle">{counts.active} active · {counts.pending} awaiting approval · {counts.revision} in revision · {U.EUR(inFlightHonor)} in flight</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('gw-job-board')}><Icon name="clipboard-list" size={14}/> Browse job board</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="text-faint fs-11">Active</div>
          <div className="mono strong" style={{ fontSize: 20, marginTop: 2 }}>{counts.active}</div>
        </div>
        <div className="card" style={{ padding: 12, border: counts.pending > 0 ? '1px solid color-mix(in oklab, var(--blue) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Awaiting approval</div>
          <div className="mono strong" style={{ fontSize: 20, color: counts.pending ? 'var(--blue)' : 'var(--text)', marginTop: 2 }}>{counts.pending}</div>
        </div>
        <div className="card" style={{ padding: 12, border: counts.revision > 0 ? '1px solid color-mix(in oklab, var(--orange) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Revision</div>
          <div className="mono strong" style={{ fontSize: 20, color: counts.revision ? 'var(--orange)' : 'var(--text)', marginTop: 2 }}>{counts.revision}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="text-faint fs-11">Deadlines this week</div>
          <div className="mono strong" style={{ fontSize: 20, color: thisWeek > 0 ? 'var(--amber)' : 'var(--text)', marginTop: 2 }}>{thisWeek}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="text-faint fs-11">In-flight honor (net)</div>
          <div className="mono strong" style={{ fontSize: 20, color: 'var(--green)', marginTop: 2 }}>{U.EUR(inFlightHonor)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        {[
          ['all', `All (${all.length})`],
          ['pending', `Awaiting approval (${counts.pending})`],
          ['active', `Active (${counts.active})`],
          ['revision', `Revision (${counts.revision})`],
          ['qa', `In QA (${counts.qa})`],
          ['done', 'Done'],
        ].map(([v, l]) => (
          <button key={v} className={`chip ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} of {all.length}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Type</th>
              <th>Topic</th>
              <th className="num">Pages</th>
              <th>Stage</th>
              <th>Next deadline</th>
              <th className="num">Honorar (net)</th>
              <th>Customer</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-faint fs-12" style={{ padding: 20, textAlign: 'center' }}>No assignments match this filter.</td></tr>
            )}
            {filtered.map(o => {
              const cust = D.customer(o.customerId);
              const next = ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? null : (o.stage?.interim1 === 'pending' ? o.interimDeadline : o.stage?.interim2 === 'pending' ? o.interim2Deadline : o.finalDeadline);
              const dm = next ? U.deadlineMeta(next) : { label: '—', tone: 'neutral' };
              return (
                <tr key={o.id} onClick={() => navigate('order-detail', { id: o.id })} style={{ cursor: 'pointer' }}>
                  <td className="mono"><strong>#{o.id}</strong></td>
                  <td><StatusPill status={o.status}/></td>
                  <td className="text-muted fs-12">{D.WORK_TYPE_LABELS[o.workType] || o.workType}</td>
                  <td style={{ maxWidth: 260 }}>
                    <div className="fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : o.title}
                    </div>
                    {o.revisionRounds > 0 && <div className="text-faint fs-11">round {o.revisionRounds + 1}</div>}
                  </td>
                  <td className="num mono">{o.pages || '—'}</td>
                  <td><StageDots stage={o.stage}/></td>
                  <td>
                    {next ? (
                      <div className="flex-col" style={{ lineHeight: 1.2 }}>
                        <span className="mono fs-11">{U.fmtDate(next)}</span>
                        <span className={`fs-11 ${dm.tone === 'danger' ? 'text-danger' : dm.tone === 'warn' ? 'text-warn' : 'text-faint'}`} style={{ color: dm.tone === 'danger' ? 'var(--red)' : dm.tone === 'warn' ? 'var(--amber)' : 'var(--text-3)' }}>{dm.label}</span>
                      </div>
                    ) : <span className="text-faint fs-11">—</span>}
                  </td>
                  <td className="num mono strong" style={{ color: 'var(--green)' }}>{U.EUR(o.netHonorarium)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar initials={cust?.initials || '··'} size={20}/>
                      <span className="fs-11 text-muted">{cust?.name?.split(' ')[0] || '—'} {cust?.name?.split(' ')[1]?.[0] || ''}.</span>
                    </div>
                  </td>
                  <td className="num">
                    {o.status === 'active' && (
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); navigate('gw-submit'); }} title="Upload submission"><Icon name="upload-cloud" size={12}/></button>
                    )}
                    <button className="btn btn-sm" onClick={(e) => e.stopPropagation()}><Icon name="more-horizontal" size={12}/></button>
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

window.GWActiveJobs = GWActiveJobs;
})();
