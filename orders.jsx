// Orders table + Order detail (with release gate)
;(function(){
const { useState: useStateA, useEffect: useEffectA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag } = window;
const OS = window.EFU;
const OD = window.EF;

function OrdersTable({ navigate, fixState, route }) {
  const [search, setSearch] = useStateA('');
  const [statusFilter, setStatusFilter] = useStateA('all');
  const [view, setView] = useStateA('all');

  // Deep link: if navigated with { id }, open the detail view directly.
  useEffectA(() => {
    const id = route?.params?.id;
    if (id) navigate('order-detail', { id });
  }, [route?.params?.id]);

  const orders = OD.ORDERS.map(o => ({ ...o, ...(fixState[o.id] || {}) }));

  let filtered = orders;
  if (view === 'friday') filtered = filtered.filter(o => o.status === 'payment_pending');
  if (view === 'overdue') filtered = filtered.filter(o => o.interimDeadline && OS.daysTo(o.interimDeadline) < 0 && !['completed','cancelled','payment_pending'].includes(o.status));
  if (view === 'ai') filtered = filtered.filter(o => o.status === 'ai_violation_review');
  if (view === 'self') filtered = filtered.filter(o => o.selfAssigned);
  if (view === 'nogw') filtered = filtered.filter(o => !o.gwId && !['cancelled','completed','qualified'].includes(o.status));
  if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(o => {
      const cust = OD.customer(o.customerId);
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
            {Object.entries(OD.STATUS_PILLS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
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
                const cust = OD.customer(o.customerId);
                const gw = OD.gw(o.gwId);
                const dm = OS.deadlineMeta(o.finalDeadline);
                return (
                  <tr key={o.id} onClick={() => navigate('order-detail', { id: o.id })} className={o.status==='completed'?'row-success': (o.status==='ai_violation_review' || (o.outstandingEur>0 && OS.daysTo(o.finalDeadline)<0)) ?'row-danger':''}>
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
                    <td className="text-muted">{OD.WORK_TYPE_LABELS[o.workType]}</td>
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.title}>
                      {o.titleTBD ? <span className="text-faint"><span style={{ fontStyle: 'italic' }}>folgt</span> — awaiting customer</span> : o.title}
                    </td>
                    <td className="mono">{o.pages || '—'}</td>
                    <td>
                      <div className="deadline">
                        <span className="deadline-date mono">{OS.fmtDate(o.finalDeadline)}</span>
                        <span className={`deadline-when tone-${dm.tone}`}>{dm.label}</span>
                      </div>
                    </td>
                    <td className="num"><Money amount={o.grossEur} /></td>
                    <td className="num">{o.outstandingEur > 0 ? <span className="mono" style={{ color: 'var(--red)', fontWeight: 600 }}>{OS.EUR(o.outstandingEur)}</span> : <span className="text-faint mono">€0,00</span>}</td>
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
        </div>
      </div>
    </div>
  );
}

// ============ ORDER DETAIL ============
function OrderDetail({ orderId, navigate, toast, fixState, setFixState }) {
  const [tab, setTab] = useStateA('overview');
  const [showRateSlider, setShowRateSlider] = useStateA(false);
  const orderBase = OD.order(orderId);
  if (!orderBase) return <div className="page">Order not found.</div>;
  const order = { ...orderBase, ...(fixState[orderId] || {}) };
  const cust = OD.customer(order.customerId);
  const gw = OD.gw(order.gwId);
  const dm = OS.deadlineMeta(order.finalDeadline);
  const isClaim = order.status === 'claimed_pending_approval';

  // Release gate
  const gateChecks = [
    { label: 'Customer satisfied', state: order.customerSatisfied ? 'pass' : (order.disputeOpen ? 'fail' : (order.status==='payment_pending' ? 'pass':'pending')), detail: order.disputeOpen ? 'Dispute open' : null },
    { label: 'Quality approved (no plagiarism, no AI)', state: order.qaPassed ? 'pass' : 'pending' },
    { label: 'Revision rounds complete', state: (order.revisionRounds <= 1 && !order.disputeOpen) ? 'pass' : 'pending' },
    { label: 'All customer installments paid', state: order.outstandingEur === 0 ? 'pass' : 'fail', detail: order.outstandingEur > 0 ? `${order.installments?.filter(i=>i.status!=='paid').length||1} installment(s) outstanding — ${OS.EUR(order.outstandingEur)}` : null },
    { label: 'GW invoice received', state: order.gwPaymentStatus === 'invoice_received' ? 'pass' : (order.gwPaymentStatus === 'paid' ? 'pass' : 'pending') },
  ];
  const gateBlocked = gateChecks.some(c => c.state === 'fail');
  const gateAllPass = gateChecks.every(c => c.state === 'pass');

  // Approve claim (golden path) — plays a dual-email cascade animation
  const [approving, setApproving] = useStateA(null);
  const approveClaim = () => {
    setApproving({ phase: 'gw' });
    setTimeout(() => setApproving({ phase: 'cust' }), 700);
    setTimeout(() => setApproving({ phase: 'done' }), 1400);
    setTimeout(() => {
      setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), status: 'active' }}));
      toast({ text: `Order #${orderId} approved → both intro emails sent · GW briefed, customer introduced`, tone: 'success' });
      if (window.efNotify) {
        window.efNotify({ to: 'gw', title: `Order #${orderId} approved — you may begin`, body: 'Briefing email sent · customer was introduced' });
        window.efNotify({ to: 'customer', title: 'Ihr Ghostwriter wurde zugewiesen', body: `${gw?.name || 'Ihr Ghostwriter'} meldet sich heute bei Ihnen.` });
      }
    }, 1700);
    setTimeout(() => setApproving(null), 2400);
  };
  const rejectClaim = () => {
    setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), status: 'available', gwId: null, claimedAt: null }}));
    toast({ text: `Claim on #${orderId} rejected · job returned to board`, tone: 'info' });
  };
  const markInstallmentPaid = (n) => {
    const installments = order.installments.map(i => i.n === n ? { ...i, status: 'paid', date: '2026-05-07' } : i);
    const paid = installments.filter(i => i.status==='paid').reduce((s,i)=>s+i.amt,0);
    const out = order.grossEur - paid;
    setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), installments, paidEur: paid, outstandingEur: out }}));
    toast({ text: `Installment ${n} marked as paid · ${OS.EUR(installments.find(i=>i.n===n).amt)} via SEPA`, tone: 'success' });
  };
  const releasePayment = () => {
    setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), status: 'completed', gwPaymentStatus: 'paid' }}));
    toast({ text: `Payment released to ${gw?.name} · ${OS.EUR(order.netHonorarium)} · arrives in 1–3 business days`, tone: 'success' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin','Orders', `#${order.id}`]} />
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="mono">#{order.id}</span>
            <StatusPill status={order.status}/>
            <span style={{ fontWeight: 400, color: 'var(--text-2)', fontSize: 16 }}>· {order.titleTBD ? <em>folgt — awaiting customer</em> : order.title}</span>
          </h1>
          <div className="page-subtitle flex gap-3 items-center" style={{ marginTop: 6 }}>
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final deadline <span className="mono">{OS.fmtDate(order.finalDeadline)}, 18:00</span></span>
            <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
            {order.outstandingEur > 0 && <span className="pill pill-amber">Outstanding {OS.EUR(order.outstandingEur)} of {OS.EUR(order.grossEur)}</span>}
            {order.disputeOpen && <span className="pill pill-orange">Dispute open</span>}
          </div>
        </div>
        <div className="page-actions">
          {isClaim ? (
            <>
              <button type="button" className="btn" onClick={rejectClaim}><Icon name="x" size={14}/> Reject claim</button>
              <button type="button" className="btn btn-success" onClick={approveClaim}><Icon name="check" size={14}/> Approve & notify</button>
            </>
          ) : (
            <>
              <NotReady className="btn" feature="edit-record" label="Edit order"><Icon name="edit" size={14}/> Edit</NotReady>
              <button type="button" className="btn" onClick={() => navigate('inbox')}><Icon name="message-square" size={14}/> Open chat</button>
              <NotReady className="btn" ariaLabel="More actions" feature="row-more-actions"><Icon name="more-horizontal" size={14}/></NotReady>
            </>
          )}
        </div>
      </div>

      {isClaim && (
        <div className="banner info mb-3">
          <Icon name="feather" size={16}/>
          <div style={{ flex: 1 }}>
            <strong>{gw?.name}</strong> claimed this job 3h 18m ago. All 6 acknowledgements signed (AGB v3.2, no-AI, GDPR, deadline, fee, individual creation).
            On approve: GW briefing email + customer GW-intro email send simultaneously.
          </div>
          <button type="button" className="btn btn-success btn-sm" onClick={approveClaim}>Approve & notify</button>
        </div>
      )}

      {approving && (
        <div className="modal-backdrop" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Approving claim · sending dual notification</div>
                <div className="text-faint fs-11 mt-1">Both emails fire simultaneously per business rule §6 (NICHT WEITERLEITEN)</div>
              </div>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { side: 'gw', to: gw?.name || 'GW', subj: 'Auftragszuteilung — NICHT WEITERLEITEN', body: 'Anbei die Auftragsdetails, Lieferdaten, Honorar und AGB v3.2…', icon: 'feather' },
                { side: 'cust', to: cust?.name || 'Customer', subj: 'Ihr Ghostwriter wurde zugewiesen', body: 'Liebe/r ' + (cust?.name?.split(' ')[0] || 'Kunde') + ', Ihr Ghostwriter ist zugewiesen…', icon: 'user' },
              ].map(e => {
                const sent = approving.phase === 'cust' && e.side === 'gw' || approving.phase === 'done';
                const sending = (approving.phase === 'gw' && e.side === 'gw') || (approving.phase === 'cust' && e.side === 'cust');
                return (
                  <div key={e.side} className="card" style={{ border: sent ? '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' : sending ? '1px solid var(--blue)' : '1px solid var(--border)', transition: 'all .25s' }}>
                    <div className="card-pad">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name={e.icon} size={14}/>
                        <strong className="fs-12">To: {e.to}</strong>
                        <span style={{ flex: 1 }}/>
                        {sent && <span className="pill pill-green"><Icon name="check" size={10}/> Sent</span>}
                        {sending && <span className="pill pill-blue"><Icon name="zap" size={10}/> Sending…</span>}
                        {!sent && !sending && <span className="pill pill-slate">Queued</span>}
                      </div>
                      <div className="fs-12 strong" style={{ marginBottom: 4 }}>{e.subj}</div>
                      <div className="text-muted fs-11" style={{ lineHeight: 1.5 }}>{e.body}</div>
                      <div style={{ marginTop: 10, height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: sent ? '100%' : sending ? '60%' : '0%',
                          height: '100%',
                          background: sent ? 'var(--green)' : 'var(--blue)',
                          transition: 'width .6s ease',
                        }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <span className="text-faint fs-11">
                {approving.phase === 'gw' && 'Sending GW briefing…'}
                {approving.phase === 'cust' && 'Sending customer intro…'}
                {approving.phase === 'done' && '✓ Both emails delivered · order moved to Active'}
              </span>
              <span style={{ flex: 1 }}/>
            </div>
          </div>
        </div>
      )}

      {order.selfAssigned && (
        <div className="banner" style={{ background: 'color-mix(in oklab, var(--blue) 5%, var(--surface))', border: '1px solid color-mix(in oklab, var(--blue) 30%, var(--border))', marginBottom: 12 }}>
          <Icon name="user" size={16} style={{ color: 'var(--blue)' }}/>
          <div style={{ flex: 1, fontSize: 12.5 }}>
            <strong>Self-assigned to Berat.</strong> This job is hidden from the GW job board · no GW notifications · no honorar payout (Stand der Zahlung: <span className="mono">Keine Auszahlung</span>).
          </div>
        </div>
      )}

      {order.status === 'ai_violation_review' && (
        <div className="banner danger mb-3">
          <Icon name="alert-triangle" size={16}/>
          <div style={{ flex: 1 }}>
            <strong>🚨 AI use suspected.</strong> GW Anna König shadow-banned automatically · AI score 87% · awaiting QA verdict before reassignment. Pending GW payments blocked.
          </div>
          <button className="btn btn-sm" onClick={() => navigate('qa')}>Open in QA</button>
        </div>
      )}

      <div className="tabs">
        {['overview','assignment','submissions','communications','payments','audit'].map(t => (
          <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'audit' ? 'Audit log' : t}
            {t === 'submissions' && <span className="pill pill-pink">3</span>}
            {t === 'payments' && order.outstandingEur > 0 && <span className="pill pill-amber">!</span>}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
          <div className="flex-col gap-3">
            <div className="card">
              <div className="card-head"><div className="card-title">Customer</div><span className="text-faint fs-11">Pipedrive synced · {OS.relTime('2026-05-07T13:42:00')}</span></div>
              <div className="card-pad flex items-center gap-3">
                <Avatar initials={cust.initials} size={44} tone="blue"/>
                <div className="flex-col" style={{ flex: 1 }}>
                  <strong>{cust.name}</strong>
                  <span className="fs-11 text-faint mono">{cust.email} · {cust.phone}</span>
                  <span className="fs-11 text-faint">Lifetime {OS.EUR(cust.ltv)} · {cust.orders} order(s) · {cust.country} · lead via {cust.leadSource}</span>
                </div>
                {cust.tags?.includes('VIP') && <span className="pill pill-yellow">VIP</span>}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Work specification</div></div>
              <div className="card-pad">
                <div className="kv">
                  <div className="kv-row"><dt>Type</dt><dd>{OD.WORK_TYPE_LABELS[order.workType]}</dd></div>
                  <div className="kv-row"><dt>Field of study</dt><dd>{order.field}</dd></div>
                  <div className="kv-row"><dt>Pages</dt><dd className="mono">{order.pages || '—'}</dd></div>
                  <div className="kv-row"><dt>Paper title</dt><dd style={{ maxWidth: 340, textAlign: 'right' }}>{order.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : order.title}</dd></div>
                  <div className="kv-row"><dt>Outline</dt><dd><a className="flex items-center gap-1" style={{ color: 'var(--blue)' }}><Icon name="paperclip" size={12}/>Outline_v2.pdf · 412 KB</a></dd></div>
                  <div className="kv-row"><dt><Bi de="Weitere Notiz" en="Note to GW"/></dt><dd>{order.note || '—'}</dd></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Pricing breakdown</div></div>
              <div className="card-pad">
                <div className="kv">
                  <div className="kv-row"><dt>Gross (Brutto)</dt><dd className="mono">{OS.EUR(order.grossEur)}</dd></div>
                  <div className="kv-row"><dt>VAT 7%</dt><dd className="mono text-muted">−{OS.EUR(order.grossEur * 0.07 / 1.07)}</dd></div>
                  <div className="kv-row"><dt>Net (after VAT)</dt><dd className="mono">{OS.EUR(order.grossEur / 1.07)}</dd></div>
                  <div className="kv-row" style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}><dt>Deadline factor</dt><dd className="mono">{order.deadlineFactor || '1.0'}× <span className="text-faint">(≥72h)</span></dd></div>
                  <div className="kv-row"><dt><Bi de="Honorar" en="GW honorarium"/> <span className="text-faint" style={{ marginLeft: 4 }}>· rate {((order.rate||0)*100).toFixed(0)}%</span></dt><dd className="mono" style={{ color: 'var(--green)' }}>{OS.EUR(order.netHonorarium)}</dd></div>
                  <div className="kv-row"><dt>Berat margin</dt><dd className="mono strong">{OS.EUR((order.grossEur/1.07) - order.netHonorarium)}</dd></div>
                </div>
                {showRateSlider && (
                  <div style={{ marginTop: 12, padding: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>
                    <div className="flex justify-between fs-11 mb-2"><span className="text-muted">GW rate (locked at assignment)</span><span className="mono strong">{((order.rate||0.4)*100).toFixed(0)}%</span></div>
                    <input type="range" min="33" max="62" step="1" value={Math.round((order.rate||0.4)*100)} onChange={(e) => {
                      const r = +e.target.value / 100;
                      const honor = (order.grossEur / 1.07) * r;
                      setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), rate: r, netHonorarium: honor }}));
                    }} style={{ width: '100%' }}/>
                    <div className="flex justify-between fs-11 mt-1 text-faint mono"><span>33%</span><span>40% mode</span><span>62%</span></div>
                  </div>
                )}
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowRateSlider(!showRateSlider)}>
                  {showRateSlider ? 'Hide' : 'Adjust GW rate'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Deadlines</div><span className="text-faint fs-11">cutoff 18:00 the day BEFORE due</span></div>
              <div className="card-pad flex-col gap-2">
                {order.interimDeadline && (
                  <div className="flex items-center gap-3">
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={14}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="fs-12 strong"><Bi de="Zwischenstand 1" en="Interim 1"/></div>
                      <div className="fs-11 text-muted mono">{OS.fmtDate(order.interimDeadline)}, 18:00 · in {OS.daysTo(order.interimDeadline)} days</div>
                    </div>
                    <span className={`pill pill-${OS.deadlineMeta(order.interimDeadline).tone === 'danger' ? 'red' : 'slate'}`}>{OS.deadlineMeta(order.interimDeadline).label}</span>
                  </div>
                )}
                {order.interim2Deadline && (
                  <div className="flex items-center gap-3">
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={14}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="fs-12 strong"><Bi de="Zwischenstand 2" en="Interim 2"/></div>
                      <div className="fs-11 text-muted mono">{OS.fmtDate(order.interim2Deadline)}, 18:00</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="action-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="check-circle" size={14}/></div>
                  <div style={{ flex: 1 }}>
                    <div className="fs-12 strong"><Bi de="Verbindliches finales Lieferdatum" en="Final delivery"/></div>
                    <div className="fs-11 text-muted mono">{OS.fmtDate(order.finalDeadline)}, 18:00</div>
                  </div>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-col gap-3">
            {/* Release gate widget */}
            <div className="card" style={{ border: gateBlocked ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : (gateAllPass ? '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' : undefined) }}>
              <div className="card-head">
                <div className="card-title flex items-center gap-2"><Icon name="shield-check" size={14}/> GW Payment Releasability</div>
                <span className="text-faint fs-11 mono">{OS.EUR(order.netHonorarium)}</span>
              </div>
              <div className="release-gate">
                {gateChecks.map((c, i) => (
                  <div key={i} className="gate-check">
                    <div className={`gate-check-icon ${c.state}`}>
                      {c.state === 'pass' && <Icon name="check" size={11}/>}
                      {c.state === 'fail' && <Icon name="x" size={11}/>}
                      {c.state === 'pending' && <Icon name="dot" size={8}/>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div>{c.label}</div>
                      {c.detail && <div className="gate-check-detail">{c.detail}</div>}
                    </div>
                    {c.state === 'fail' && c.label.includes('installments') && (
                      <button className="btn btn-sm" onClick={() => setTab('payments')}>Resolve →</button>
                    )}
                  </div>
                ))}
                <div className={`gate-result ${gateAllPass ? 'pass' : ''}`}>
                  <Icon name={gateAllPass ? 'check-circle' : 'lock'} size={14}/>
                  <div>
                    <strong>{gateAllPass ? 'Ready to release' : 'Blocked'}</strong>
                    <div className="fs-11" style={{ marginTop: 2 }}>{gateAllPass ? 'All gates green — release in next Friday batch.' : (order.releaseBlockReason || 'Resolve outstanding installment to unblock.')}</div>
                  </div>
                </div>
                <button className="btn w-full mt-3" disabled={!gateAllPass} onClick={releasePayment} style={ gateAllPass ? { background: 'var(--green)', color: 'white', borderColor: 'var(--green)', justifyContent: 'center' } : { justifyContent: 'center' } }>
                  <Icon name="wallet" size={14}/> Release payment {gateAllPass ? '· '+OS.EUR(order.netHonorarium) : ''}
                </button>
              </div>
            </div>

            {gw && (
              <div className="card">
                <div className="card-head"><div className="card-title">Assigned GW</div>{gw.banned && <span className="pill pill-red">Shadow-banned</span>}</div>
                <div className="card-pad flex items-center gap-3">
                  <Avatar initials={gw.initials} size={40}/>
                  <div className="flex-col" style={{ flex: 1 }}>
                    <strong>{gw.name}</strong>
                    <span className="fs-11 text-faint">{gw.expertise?.slice(0,3).join(', ')}</span>
                    <span className="fs-11 text-faint mono">★ {gw.rating} · {(gw.onTime*100).toFixed(0)}% on-time · {gw.lifetime} jobs</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-head"><div className="card-title">Pipedrive</div></div>
              <div className="card-pad">
                <div className="stepper">
                  {['Anfrage','Qualifiziert','Rückmeldung','Rechnung','Won'].map((s, i) => (
                    <div key={i} className={`step ${i < 4 ? 'current' : ''}`}>
                      <div className={`step-bar ${i < 4 ? 'done' : ''}`}/>
                      <div className="step-label">{s}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between fs-11 text-faint mt-3">
                  <span>Deal #{order.id}</span>
                  <a style={{ color: 'var(--blue)' }} className="flex items-center gap-1">Open in Pipedrive <Icon name="external-link" size={11}/></a>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Sevdesk Invoice</div></div>
              <div className="card-pad flex items-center gap-3">
                <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
                <div style={{ flex: 1 }}>
                  <div className="fs-12 strong">RG-2026-{String(order.id).padStart(4,'0')}</div>
                  <div className="fs-11 text-faint">Issued {OS.fmtDate(order.acceptedAt)} · {OS.EUR(order.grossEur)}</div>
                </div>
                <button className="btn btn-sm"><Icon name="download" size={12}/> PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
          <div className="card">
            <div className="card-head"><div className="card-title">Customer installment plan</div><span className="text-faint fs-11">{order.installments?.length || 0} of max 5</span></div>
            <div className="card-pad">
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead>
                  <tr><th>#</th><th>Due date</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {(order.installments || []).map(inst => (
                    <tr key={inst.n} style={{ cursor: 'default' }}>
                      <td className="mono">{inst.n} of {order.installments.length}</td>
                      <td className="mono">{OS.fmtDate(inst.date)}</td>
                      <td className="num mono">{OS.EUR(inst.amt)}</td>
                      <td className="text-muted fs-11">{(inst.method||'—').replace('stripe_','Stripe ').replace('bank_transfer_sepa','SEPA').replace('_',' ')}</td>
                      <td>
                        {inst.status === 'paid' && <span className="pill pill-green"><Icon name="check" size={10}/> Paid {OS.fmtDate(inst.date)}</span>}
                        {inst.status === 'overdue' && <span className="pill pill-red">Overdue {Math.abs(OS.daysTo(inst.date))}d</span>}
                        {inst.status === 'scheduled' && <span className="pill pill-slate">Scheduled</span>}
                        {inst.status === 'pending' && <span className="pill pill-amber">Awaiting</span>}
                      </td>
                      <td className="num">
                        {(inst.status === 'overdue' || inst.status === 'pending' || inst.status === 'scheduled') && (
                          <button className="btn btn-sm btn-success" onClick={() => markInstallmentPaid(inst.n)}><Icon name="check" size={11}/> Mark paid (SEPA)</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between mt-3" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
                <span className="text-muted fs-12">Total billed</span>
                <span className="mono strong">{OS.EUR(order.grossEur)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '4px 12px' }}>
                <span className="text-muted fs-12">Paid to date</span>
                <span className="mono" style={{ color: 'var(--green)' }}>{OS.EUR(order.paidEur)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '4px 12px' }}>
                <span className="text-muted fs-12">Outstanding</span>
                <span className="mono" style={{ color: order.outstandingEur > 0 ? 'var(--red)' : 'var(--text-3)' }}>{OS.EUR(order.outstandingEur)}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Stripe webhook log</div></div>
            <div className="card-pad flex-col gap-2">
              {(order.installments || []).filter(i => i.status === 'paid' && i.method?.startsWith('stripe')).map((i, idx) => {
                // Deterministic id derived from order + installment so it never reshuffles between renders
                const seed = (Number(order.id) * 1009 + i.n * 31 + idx).toString(36).slice(-10).padStart(10, '0');
                return (
                  <div key={idx} className="flex items-start gap-2 fs-11">
                    <div className="timeline-dot green" style={{ width: 16, height: 16 }}><Icon name="check" size={9}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="mono">payment_intent.succeeded</div>
                      <div className="text-faint">pi_3Q{seed} · {OS.fmtDate(i.date)} · {OS.EUR(i.amt)}</div>
                    </div>
                  </div>
                );
              })}
              <div className="banner info" style={{ marginTop: 8, fontSize: 11.5 }}>
                <Icon name="zap" size={14}/>
                <span><code>confirmPayment()</code> auto-fires Pipedrive 'Won' + Sevdesk mark-paid + GW assignment kickoff.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'submissions' && (
        <SubmissionsTab order={order} />
      )}
      {tab === 'communications' && (
        <CommsTab order={order} />
      )}
      {tab === 'assignment' && (
        <AssignmentTab order={order} navigate={navigate} setFixState={setFixState} toast={toast}/>
      )}
      {tab === 'audit' && (
        <AuditTab order={order} />
      )}
    </div>
  );
}

function SubmissionsTab({ order }) {
  const subs = OD.SUBMISSIONS.filter(s => s.orderId === order.id);
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Submissions</div><span className="text-faint fs-11">interim · final · invoices</span></div>
      <div className="card-pad flex-col gap-2">
        {subs.length === 0 && <div className="text-faint fs-12">No submissions yet — GW will upload via /gw/submit.</div>}
        {subs.map(s => (
          <div key={s.id} className="card-pad" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
            <div className="flex items-center gap-3">
              <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
              <div style={{ flex: 1 }}>
                <div className="strong fs-12">{s.fileName}</div>
                <div className="fs-11 text-faint">{(s.size/1024/1024).toFixed(2)} MB · {s.kind.replace('_',' ')} · round {s.round} · submitted {OS.relTime(s.submittedAt)}</div>
              </div>
              {s.qaStatus === 'passed' && <span className="pill pill-green"><Icon name="check" size={10}/> QA passed · forwarded</span>}
              {s.qaStatus === 'pending' && <span className="pill pill-pink">QA pending</span>}
              <button className="btn btn-sm"><Icon name="download" size={12}/></button>
              <button className="btn btn-sm"><Icon name="eye" size={12}/></button>
            </div>
            <div className="flex gap-3 mt-3" style={{ flexWrap: 'wrap' }}>
              <ScoreBar value={s.plagiarismScore} label="Plagiarism" />
              <ScoreBar value={s.aiScore} label="AI detection" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommsTab({ order }) {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Unified communications</div><span className="text-faint fs-11">email · WhatsApp · voice metadata · platform chat</span></div>
      <div className="card-pad">
        <div className="banner info mb-3"><Icon name="lock" size={14}/><span>efactory1 always in CC. Financial keywords auto-redirected to <code>kundenservice@efactory1.de</code>.</span></div>
        <div className="flex-col gap-2">
          {[
            { ch: 'email', from: 'GW', to: 'Customer', text: 'Hallo Adrian, anbei der Zwischenstand für Kapitel 3...', at: '2026-05-06T16:42:00', sentiment: 'neutral' },
            { ch: 'whatsapp', from: 'Customer', to: 'efactory1', text: 'Wann bekomme ich den nächsten Stand?', at: '2026-05-07T09:14:00', sentiment: 'neutral' },
            { ch: 'voice', from: 'Customer', text: 'Voicemail · 0:42 · transcribed', at: '2026-05-07T11:02:00', sentiment: 'tense' },
            { ch: 'email', from: 'efactory1', to: 'Customer', text: 'Lieber Adrian, der Zwischenstand wird morgen früh übermittelt.', at: '2026-05-07T13:42:00', sentiment: 'positive' },
          ].map((m, i) => (
            <div key={i} className="card-pad" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`thread-channel-icon ${m.ch}`}><Icon name={m.ch==='email'?'mail':m.ch==='whatsapp'?'message-circle':m.ch==='voice'?'mic':'message-square'} size={14}/></div>
                <strong className="fs-12">{m.from}</strong>
                <Icon name="arrow-right" size={11} className="text-faint"/>
                <span className="fs-12 text-muted">{m.to || 'efactory1'}</span>
                <span className="text-faint fs-11" style={{ marginLeft: 'auto' }}>{OS.relTime(m.at)}</span>
              </div>
              <div className="fs-12">{m.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssignmentTab({ order, navigate, setFixState, toast }) {
  const gw = OD.gw(order.gwId);
  const onAssign = (g) => {
    if (setFixState) {
      setFixState(prev => ({ ...prev, [order.id]: { ...(prev[order.id] || {}), gwId: g.id, status: 'active' } }));
    }
    if (toast) toast({ text: `${g.name} assigned to #${order.id} · briefing email queued`, tone: 'success' });
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div className="card">
        <div className="card-head"><div className="card-title">GW selection</div></div>
        <div className="card-pad flex-col gap-2">
          {OD.GHOSTWRITERS.filter(g => !g.banned && !g.isOwner).slice(0, 6).map(g => {
            // Deterministic match score — stable across renders, derived from gw + order ids
            const exact = (g.expertise || []).some(e => e.toLowerCase().includes((order.field || '').toLowerCase().slice(0, 4)));
            const seed = ((g.id.charCodeAt(3) * 17) + Number(order.id)) % 41; // 0..40
            const match = exact ? 92 : 50 + seed;
            return (
              <div key={g.id} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                <Avatar initials={g.initials} size={32}/>
                <div className="flex-col" style={{ flex: 1 }}>
                  <strong className="fs-12">{g.name}</strong>
                  <span className="fs-11 text-faint">{g.expertise?.slice(0,3).join(', ')}</span>
                </div>
                <div className="text-right" style={{ width: 120 }}>
                  <div className="fs-11 text-faint">workload</div>
                  <div className="fs-12 mono">{g.active}/{g.active > 4 ? 'overloaded' : 'free'}</div>
                </div>
                <div className="text-right" style={{ width: 80 }}>
                  <div className="fs-11 text-faint">match</div>
                  <div className="mono fs-12 strong" style={{ color: match > 80 ? 'var(--green)' : 'var(--text-2)' }}>{match}%</div>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => onAssign(g)} disabled={order.gwId === g.id}>{order.gwId === g.id ? 'Assigned' : 'Assign'}</button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Notification preview</div></div>
        <div className="card-pad flex-col gap-2 fs-11">
          <div style={{ padding: 10, border: '1px dashed var(--border)', borderRadius: 8 }}>
            <div className="strong mb-1"><Icon name="mail" size={11}/> To: GW · "Briefing — NICHT WEITERLEITEN"</div>
            <div className="text-muted">Auftragsdetails, Lieferdaten, Honorar, AGB v3.2…</div>
          </div>
          <div style={{ padding: 10, border: '1px dashed var(--border)', borderRadius: 8 }}>
            <div className="strong mb-1"><Icon name="mail" size={11}/> To: Customer · "Ihr Ghostwriter wurde zugewiesen"</div>
            <div className="text-muted">GW-Vorstellung, Kontaktdaten, CC kundenservice@efactory1.de</div>
          </div>
          <div className="banner info" style={{ fontSize: 11 }}><Icon name="zap" size={12}/><span>Both emails fire simultaneously on 'Approve & notify'.</span></div>
        </div>
      </div>
    </div>
  );
}

function AuditTab({ order }) {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Audit log</div></div>
      <div className="card-pad">
        <div className="timeline">
          {[
            { t: 'Order created from public form', at: order.acceptedAt || '2026-05-06T10:00:00', dot: 'blue', icon: 'plus' },
            { t: 'Sevdesk invoice RG-2026-' + String(order.id).padStart(4,'0') + ' generated', at: order.acceptedAt, dot: '', icon: 'file-text' },
            { t: 'Stripe payment_intent.succeeded · ' + OS.EUR(order.installments?.[0]?.amt || order.grossEur), at: order.installments?.[0]?.date, dot: 'green', icon: 'check' },
            { t: 'Pipedrive deal moved to Won', at: order.installments?.[0]?.date, dot: '', icon: 'git-branch' },
            order.gwId && { t: 'GW '+OD.gw(order.gwId)?.name+' assigned', at: order.acceptedAt, dot: 'blue', icon: 'feather' },
          ].filter(Boolean).map((e, i) => (
            <div key={i} className="timeline-item">
              <div className={`timeline-dot ${e.dot}`}><Icon name={e.icon} size={10}/></div>
              <div className="timeline-content">
                <div className="timeline-title">{e.t}</div>
                <div className="timeline-meta mono">{OS.fmtDateTime(e.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ QA ORDER DETAIL (no financials) ============
// Q-01: QA reviewers must NOT see release gate, gross/honorarium, margin, payments, Stripe webhooks,
// invoice numbers, lifetime value, or rate sliders. PRD `qa.permissions` = review/approve/reject + orders.read.
// This component renders only QA-relevant fields and submission scores.
function QAOrderDetail({ orderId, navigate, toast, fixState, setFixState }) {
  const [tab, setTab] = useStateA('overview');
  const orderBase = OD.order(orderId);
  if (!orderBase) return <div className="page">Order not found.</div>;
  const order = { ...orderBase, ...(fixState[orderId] || {}) };
  const cust = OD.customer(order.customerId);
  const gw = OD.gw(order.gwId);
  const dm = OS.deadlineMeta(order.finalDeadline);
  const subs = OD.SUBMISSIONS.filter(s => s.orderId === order.id);
  const latest = subs.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

  const goToQueue = () => navigate('qa-queue');
  const requestRevision = () => {
    setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), status: 'revision_required', revisionRounds: ((prev[orderId]?.revisionRounds) ?? order.revisionRounds ?? 0) + 1 }}));
    toast({ text: `Revision requested for #${orderId} · GW notified`, tone: 'info' });
  };
  const passToCustomer = () => {
    setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), status: latest?.kind === 'final_work' ? 'delivered' : 'under_customer_review', qaPassed: true }}));
    toast({ text: `Submission passed QA · forwarded to ${cust?.name}`, tone: 'success' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['QA','Review Queue', `#${order.id}`]} />
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="mono">#{order.id}</span>
            <StatusPill status={order.status}/>
            <span style={{ fontWeight: 400, color: 'var(--text-2)', fontSize: 16 }}>· {order.titleTBD ? <em>folgt — awaiting customer</em> : order.title}</span>
          </h1>
          <div className="page-subtitle flex gap-3 items-center" style={{ marginTop: 6 }}>
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final deadline <span className="mono">{OS.fmtDate(order.finalDeadline)}, 18:00</span></span>
            <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
            {order.disputeOpen && <span className="pill pill-orange">Dispute open</span>}
            {(order.revisionRounds || 0) > 0 && <span className="pill pill-amber">Revision round {order.revisionRounds}</span>}
          </div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={goToQueue}><Icon name="arrow-left" size={14}/> Back to queue</button>
        </div>
      </div>

      <div className="banner info mb-3">
        <Icon name="lock" size={14}/>
        <span><strong>QA view.</strong> Financial data (price, honorarium, margin, payments) is hidden by role. You see work spec, submissions, and quality scores only.</span>
      </div>

      <div className="tabs">
        {['overview','submissions','communications'].map(t => (
          <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
            {t}
            {t === 'submissions' && subs.length > 0 && <span className="pill pill-pink">{subs.length}</span>}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          <div className="flex-col gap-3">
            <div className="card">
              <div className="card-head"><div className="card-title">Customer (non-financial)</div></div>
              <div className="card-pad flex items-center gap-3">
                <Avatar initials={cust?.initials} size={40} tone="blue"/>
                <div className="flex-col" style={{ flex: 1 }}>
                  <strong>{cust?.name}</strong>
                  <span className="fs-11 text-faint">{cust?.country} · {cust?.orders} order(s) on file</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Work specification</div></div>
              <div className="card-pad">
                <div className="kv">
                  <div className="kv-row"><dt>Type</dt><dd>{OD.WORK_TYPE_LABELS[order.workType]}</dd></div>
                  <div className="kv-row"><dt>Field of study</dt><dd>{order.field}</dd></div>
                  <div className="kv-row"><dt>Pages</dt><dd className="mono">{order.pages || '—'}</dd></div>
                  <div className="kv-row"><dt>Paper title</dt><dd style={{ maxWidth: 360, textAlign: 'right' }}>{order.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : order.title}</dd></div>
                  <div className="kv-row"><dt>Outline</dt><dd><a className="flex items-center gap-1" style={{ color: 'var(--blue)' }}><Icon name="paperclip" size={12}/>Outline_v2.pdf · 412 KB</a></dd></div>
                  <div className="kv-row"><dt><Bi de="Weitere Notiz" en="Note to GW"/></dt><dd>{order.note || '—'}</dd></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Deadlines</div><span className="text-faint fs-11">cutoff 18:00 the day BEFORE due</span></div>
              <div className="card-pad flex-col gap-2">
                {order.interimDeadline && (
                  <div className="flex items-center gap-3">
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={14}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="fs-12 strong"><Bi de="Zwischenstand 1" en="Interim 1"/></div>
                      <div className="fs-11 text-muted mono">{OS.fmtDate(order.interimDeadline)}, 18:00 · in {OS.daysTo(order.interimDeadline)} days</div>
                    </div>
                    <span className={`pill pill-${OS.deadlineMeta(order.interimDeadline).tone === 'danger' ? 'red' : 'slate'}`}>{OS.deadlineMeta(order.interimDeadline).label}</span>
                  </div>
                )}
                {order.interim2Deadline && (
                  <div className="flex items-center gap-3">
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={14}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="fs-12 strong"><Bi de="Zwischenstand 2" en="Interim 2"/></div>
                      <div className="fs-11 text-muted mono">{OS.fmtDate(order.interim2Deadline)}, 18:00</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="action-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="check-circle" size={14}/></div>
                  <div style={{ flex: 1 }}>
                    <div className="fs-12 strong"><Bi de="Verbindliches finales Lieferdatum" en="Final delivery"/></div>
                    <div className="fs-11 text-muted mono">{OS.fmtDate(order.finalDeadline)}, 18:00</div>
                  </div>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
              </div>
            </div>

            {order.disputeOpen && (
              <div className="card" style={{ borderColor: 'color-mix(in oklab, var(--amber) 35%, var(--border))' }}>
                <div className="card-head"><div className="card-title">Customer feedback (round {order.revisionRounds || 1})</div></div>
                <div className="card-pad fs-12 text-muted">Customer requested revisions on §3 (methodology) and §5 (conclusion). GW notified · awaiting resubmission.</div>
              </div>
            )}
          </div>

          <div className="flex-col gap-3">
            {gw && (
              <div className="card">
                <div className="card-head"><div className="card-title">Assigned GW</div>{gw.banned && <span className="pill pill-red">Shadow-banned</span>}</div>
                <div className="card-pad flex items-center gap-3">
                  <Avatar initials={gw.initials} size={40}/>
                  <div className="flex-col" style={{ flex: 1 }}>
                    <strong>{gw.name}</strong>
                    <span className="fs-11 text-faint">{gw.expertise?.slice(0,3).join(', ')}</span>
                    <span className="fs-11 text-faint mono">★ {gw.rating} · {(gw.onTime*100).toFixed(0)}% on-time · {gw.lifetime} jobs</span>
                  </div>
                </div>
              </div>
            )}

            {latest && (
              <div className="card">
                <div className="card-head"><div className="card-title">Latest submission scores</div></div>
                <div className="card-pad flex-col gap-3">
                  <ScoreBar value={latest.plagiarismScore} label="Plagiarism (PlagScan)"/>
                  <ScoreBar value={latest.aiScore} label="AI detection (GPTZero)"/>
                  <div className="fs-11 text-muted">{latest.kind.replace('_',' ')} · round {latest.round} · {OS.relTime(latest.submittedAt)}</div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-head"><div className="card-title">QA actions</div></div>
              <div className="card-pad flex-col gap-2">
                <button type="button" className="btn btn-success w-full" disabled={!latest || latest.qaStatus !== 'pending'} onClick={passToCustomer} style={{ justifyContent: 'center' }}>
                  <Icon name="check-circle" size={14}/> Pass · forward to customer
                </button>
                <button type="button" className="btn w-full" disabled={!latest} onClick={requestRevision} style={{ justifyContent: 'center' }}>
                  <Icon name="alert-triangle" size={14}/> Request revision
                </button>
                <button type="button" className="btn w-full" onClick={goToQueue} style={{ justifyContent: 'center' }}>
                  <Icon name="shield-check" size={14}/> Open in queue (full verdict)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'submissions' && (
        <SubmissionsTab order={order} />
      )}
      {tab === 'communications' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Customer-facing communications</div><span className="text-faint fs-11">QA-relevant excerpts only — financial threads hidden</span></div>
          <div className="card-pad flex-col gap-2">
            <div className="banner info"><Icon name="lock" size={14}/><span>Threads containing pricing/payment keywords are auto-redirected to <code>kundenservice@efactory1.de</code> and not visible to QA.</span></div>
            {[
              { from: 'GW', to: 'Customer', text: 'Anbei der Zwischenstand für Kapitel 3. Bitte um Rückmeldung.', at: '2026-05-06T16:42:00' },
              { from: 'Customer', to: 'efactory1', text: 'Inhaltlich gut, aber §3 fehlt die Methodendiskussion.', at: '2026-05-07T09:14:00' },
            ].map((m, i) => (
              <div key={i} className="card-pad" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                <div className="flex items-center gap-2 mb-2">
                  <strong className="fs-12">{m.from}</strong>
                  <Icon name="arrow-right" size={11} className="text-faint"/>
                  <span className="fs-12 text-muted">{m.to}</span>
                  <span className="text-faint fs-11" style={{ marginLeft: 'auto' }}>{OS.relTime(m.at)}</span>
                </div>
                <div className="fs-12">{m.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

window.OrdersTable = OrdersTable;
window.OrderDetail = OrderDetail;
window.QAOrderDetail = QAOrderDetail;
})();
