// QA · Order detail — restricted view (no financials per PRD qa.permissions).
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

function QAOrderDetail({ orderId, navigate, toast, fixState, setFixState }) {
  const [tab, setTab] = useStateA('overview');
  const order = D.liveOrder(orderId);
  if (!order) return <div className="page">Order not found.</div>;
  const cust = D.customer(order.customerId);
  const gw = D.gw(order.gwId);
  const dm = U.deadlineMeta(order.finalDeadline);
  const subs = D.SUBMISSIONS.filter(s => s.orderId === order.id);
  const latest = subs.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

  const goToQueue = () => navigate('qa-queue');
  const requestRevision = () => {
    setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), status: 'revision_required', revisionRounds: ((prev[orderId]?.revisionRounds) ?? order.revisionRounds ?? 0) + 1 }}));
    toast({
      tone: 'info',
      transition: { entity: `Order #${orderId}`, from: 'QA Review', to: 'Revision Required' },
      text: 'GW notified · awaiting fix',
    });
  };
  const passToCustomer = () => {
    const isFinal = latest?.kind === 'final_work';
    setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId]||{}), status: isFinal ? 'delivered' : 'under_customer_review', qaPassed: true }}));
    toast({
      tone: 'success',
      transition: { entity: `Order #${orderId}`, from: 'QA Review', to: isFinal ? 'Delivered' : 'Customer Review' },
      text: `Forwarded to ${cust?.name}`,
    });
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
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final deadline <span className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</span></span>
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
                  <div className="kv-row"><dt>Type</dt><dd>{D.WORK_TYPE_LABELS[order.workType]}</dd></div>
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
                      <div className="fs-11 text-muted mono">{U.fmtDate(order.interimDeadline)}, 18:00 · in {U.daysTo(order.interimDeadline)} days</div>
                    </div>
                    <span className={`pill pill-${U.deadlineMeta(order.interimDeadline).tone === 'danger' ? 'red' : 'slate'}`}>{U.deadlineMeta(order.interimDeadline).label}</span>
                  </div>
                )}
                {order.interim2Deadline && (
                  <div className="flex items-center gap-3">
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={14}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="fs-12 strong"><Bi de="Zwischenstand 2" en="Interim 2"/></div>
                      <div className="fs-11 text-muted mono">{U.fmtDate(order.interim2Deadline)}, 18:00</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="action-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="check-circle" size={14}/></div>
                  <div style={{ flex: 1 }}>
                    <div className="fs-12 strong"><Bi de="Verbindliches finales Lieferdatum" en="Final delivery"/></div>
                    <div className="fs-11 text-muted mono">{U.fmtDate(order.finalDeadline)}, 18:00</div>
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
                  <div className="fs-11 text-muted">{latest.kind.replace('_',' ')} · round {latest.round} · {U.relTime(latest.submittedAt)}</div>
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
                  <span className="text-faint fs-11" style={{ marginLeft: 'auto' }}>{U.relTime(m.at)}</span>
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


window.QAOrderDetail = QAOrderDetail;
})();
