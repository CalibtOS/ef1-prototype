// Admin · Orders list — top-level orders table with filters, KPIs and saved views.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

function OrdersTable({ navigate, fixState, route }) {
  const [search, setSearch] = useStateA('');
  const [statusFilter, setStatusFilter] = useStateA('all');
  const [view, setView] = useStateA('all');

  // Deep link: if navigated with { id }, open the detail view directly.
  useEffectA(() => {
    const id = route?.params?.id;
    if (id) navigate('order-detail', { id });
  }, [route?.params?.id]);

  const orders = D.ORDERS.map(o => ({ ...o, ...(fixState[o.id] || {}) }));

  let filtered = orders;
  if (view === 'friday') filtered = filtered.filter(o => o.status === 'payment_pending');
  if (view === 'overdue') filtered = filtered.filter(o => o.interimDeadline && U.daysTo(o.interimDeadline) < 0 && !['completed','cancelled','payment_pending'].includes(o.status));
  if (view === 'ai') filtered = filtered.filter(o => o.status === 'ai_violation_review');
  if (view === 'self') filtered = filtered.filter(o => o.selfAssigned);
  if (view === 'nogw') filtered = filtered.filter(o => !o.gwId && !['cancelled','completed','qualified'].includes(o.status));
  if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(o => {
      const cust = D.customer(o.customerId);
      return String(o.id).includes(s) || (o.title||'').toLowerCase().includes(s) || (cust?.name||'').toLowerCase().includes(s);
    });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders <span className="text-faint" style={{ fontWeight: 400, fontSize: 14 }}>· Bestellungen</span></h1>
          <div className="page-subtitle">{filtered.length} of {orders.length} orders · 645 active lifetime · 3,359 completed</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="filters-advanced"><Icon name="filter" size={14}/> Filters</NotReady>
          <NotReady className="btn" feature="export-csv"><Icon name="download" size={14}/> Export CSV</NotReady>
          <button type="button" className="btn" onClick={() => navigate('offers')}><Icon name="file-text" size={14}/> Offers / Sevdesk</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('order-new')}><Icon name="plus" size={14}/> New order</button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="tbl-toolbar">
          <input type="text" placeholder="Search ID, customer, paper title…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="saved-views">
            {[['all','All'],['friday','Friday batch'],['overdue','Overdue interim'],['ai','AI flagged'],['self','Self-assigned'],['nogw','Without GW']].map(([k,l]) => (
              <span key={k} className={`chip ${view===k?'active':''}`} onClick={() => setView(k)}>{l}</span>
            ))}
          </div>
          <div style={{ flex: 1 }}/>
          <select className="chip" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '4px 8px' }}>
            <option value="all">All statuses</option>
            {Object.entries(D.STATUS_PILLS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="table-wrap" style={{ borderRadius: 0, border: 'none', overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Title</th>
                <th style={{ width: 50 }}>Pages</th>
                <th>Final deadline</th>
                <th className="num">Gross</th>
                <th className="num">Outstanding</th>
                <th>GW</th>
                <th>Lead</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const cust = D.customer(o.customerId);
                const gw = D.gw(o.gwId);
                const dm = U.deadlineMeta(o.finalDeadline);
                return (
                  <tr key={o.id} onClick={() => navigate('order-detail', { id: o.id })} className={
                    o.status==='ai_violation_review' ? 'row-danger'
                    : o.status==='completed' || o.status==='delivered' ? 'row-success'
                    : (U.daysTo(o.finalDeadline) < 0 && !['completed','cancelled'].includes(o.status)) ? 'row-overdue'
                    : ['qa_review','final_submitted','revision_required','under_customer_review','payment_pending','claimed_pending_approval'].includes(o.status) ? 'row-warn'
                    : o.status==='active' || o.status==='interim_submitted' ? 'row-active'
                    : ''
                  }>
                    <td className="mono"><strong>#{o.id}</strong></td>
                    <td><StatusPill status={o.status}/></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar initials={cust?.initials||'??'} size={22} tone="blue"/>
                        <div className="flex-col" style={{ lineHeight: 1.2 }}>
                          <span className="fs-12">{cust?.name||'—'}</span>
                          <span className="fs-11 text-faint">{cust?.country||''}{cust?.tags?.length ? ' · ' + cust.tags.join(', ') : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{D.WORK_TYPE_LABELS[o.workType]}</td>
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.title}>
                      {o.titleTBD ? <span className="text-faint"><span style={{ fontStyle: 'italic' }}>folgt</span> — awaiting customer</span> : o.title}
                    </td>
                    <td className="mono">{o.pages || '—'}</td>
                    <td>
                      <div className="deadline">
                        <span className="deadline-date mono">{U.fmtDate(o.finalDeadline)}</span>
                        <span className={`deadline-when tone-${dm.tone}`}>{dm.label}</span>
                      </div>
                    </td>
                    <td className="num"><Money amount={o.grossEur} /></td>
                    <td className="num">{o.outstandingEur > 0 ? <span className="mono" style={{ color: 'var(--red)', fontWeight: 600 }}>{U.EUR(o.outstandingEur)}</span> : <span className="text-faint mono">€0,00</span>}</td>
                    <td>
                      {gw ? (
                        <div className="flex items-center gap-2">
                          <Avatar initials={gw.initials} size={20}/>
                          <span className="fs-12">{gw.name}{gw.banned && <Icon name="eye" size={11} className="text-faint" style={{ marginLeft: 4 }}/>}</span>
                        </div>
                      ) : <span className="pill pill-gray">unassigned</span>}
                    </td>
                    <td className="text-faint fs-11">{o.leadSource}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon="search"
              title={search ? `No orders match "${search}"` : 'No orders in this view'}
              body={search ? 'Try a different ID, customer name, or paper title.' : 'Create one to get started.'}
              actionLabel={search ? null : 'New order'}
              onAction={search ? null : () => navigate('order-new')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ ORDER DETAIL ============

window.OrdersTable = OrdersTable;
})();
