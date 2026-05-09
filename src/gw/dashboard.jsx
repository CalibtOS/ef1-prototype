// GW · Dashboard — at-a-glance assignments, on-time rate, rating, lifetime.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

function GWDashboard({ navigate }) {
  const GW_ME = D.GW_ME;
  const mine = window.EFHooks.useOrders({ gwId: GW_ME.id });
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
    .filter(d => U.daysTo(d.date) >= -1 && U.daysTo(d.date) <= 14)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const previewJobs = window.EFHooks.useOrders({ filter: 'available' }).slice(0, 3).map(o => ({
    id: o.id,
    title: o.titleTBD ? 'Titel folgt — Briefing nach Claim' : o.title,
    field: o.field,
    pages: o.pages,
    honorEur: o.netHonorarium,
    deadline: o.finalDeadline,
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hallo {GW_ME.name.split(' ')[0]}</h1>
          <div className="page-subtitle">Donnerstag, {U.fmtDate('2026-05-07')} · Friday payday tomorrow</div>
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
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{U.EUR(earningsThisMonth)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">On-time rate</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{Math.round((GW_ME.onTime||0)*100)}%</div>
          <div className="text-faint fs-11 mt-1">★ {GW_ME.rating?.toFixed(1)} avg rating · {GW_ME.lifetime} lifetime</div>
        </div>
        <div className="card" style={{ padding: 14, border: nextPayday > 0 ? '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Next payday · Friday</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{U.EUR(nextPayday)}</div>
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
              const meta = U.deadlineMeta(d.date);
              return (
                <div key={i} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: d.orderId })}>
                  <div className="action-icon" style={{ background: meta.tone === 'danger' ? 'var(--red-soft)' : 'var(--blue-soft)', color: meta.tone === 'danger' ? 'var(--red)' : 'var(--blue)' }}>
                    <Icon name={d.kind.startsWith('Final') ? 'check-circle' : 'file-text'} size={14}/>
                  </div>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                    <span className="strong fs-12">#{d.orderId} · {d.kind}</span>
                    <span className="text-faint fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>{d.title}</span>
                  </div>
                  <div className="text-faint fs-11 mono">{U.fmtDate(d.date)}, 18:00</div>
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
                    <span className="mono fs-11" style={{ color: 'var(--green)' }}>{U.EUR(j.honorEur)}</span>
                  </div>
                  <div className="strong fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                  <div className="text-faint fs-11">{j.field} · {j.pages} pages · {U.fmtDate(j.deadline)}</div>
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

window.GWDashboard = GWDashboard;
})();
