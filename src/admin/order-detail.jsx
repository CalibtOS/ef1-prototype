// Admin · Order detail — overview, payments, submissions, comms, assignment, audit tabs.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage } = window;
const U = window.EFU;
const D = window.EF;

function OrderDetail({ orderId, navigate, toast }) {
  const [tab, setTab] = useStateA('overview');
  const [showRateSlider, setShowRateSlider] = useStateA(false);
  const [approving, setApproving] = useStateA(null);
  // Store-backed read so newly-created orders resolve across all role views.
  const order = window.EFHooks.useOrder(orderId);
  const submissions = window.EFHooks.useSubmissions({ orderId });
  if (!order) return <div className="page">Order not found.</div>;
  const cust = D.customer(order.customerId);
  const gw = D.gw(order.gwId);
  const submissionsCount = submissions.length;
  const dm = U.deadlineMeta(order.finalDeadline);
  const isClaim = order.status === 'claimed_pending_approval';

  // Release gate — canonical 5-condition check from D.releaseGates() (PRD friday_payment_batch).
  // All five must be green AND release happens via the Friday batch screen, not directly here.
  const _gates = D.releaseGates(order);
  const gateChecks = [
    { key: 'customer_satisfied',    label: 'Customer satisfied',                state: _gates.gates.customer_satisfied    ? 'pass' : (order.disputeOpen ? 'fail' : 'pending'), detail: order.disputeOpen ? 'Dispute open' : null },
    { key: 'quality_approved',      label: 'Quality approved (no plagiarism, no AI)', state: _gates.gates.quality_approved      ? 'pass' : (order.flagged ? 'fail' : 'pending') },
    { key: 'revisions_complete',    label: 'Revision rounds complete',          state: _gates.gates.revisions_complete    ? 'pass' : (order.status === 'revision_required' ? 'fail' : 'pending') },
    { key: 'all_installments_paid', label: 'All customer installments paid',    state: _gates.gates.all_installments_paid ? 'pass' : 'fail', detail: (order.outstandingEur || 0) > 0 ? `${order.installments?.filter(i=>i.status!=='paid').length||1} installment(s) outstanding — ${U.EUR(order.outstandingEur)}` : null },
    { key: 'gw_invoice_received',   label: 'GW invoice received',               state: _gates.gates.gw_invoice_received   ? 'pass' : 'pending' },
  ];
  const gateBlocked = !_gates.releasable && gateChecks.some(c => c.state === 'fail');
  const gateAllPass = _gates.releasable;

  // Approve claim (golden path) — plays a dual-email cascade animation
  const approveClaim = () => {
    setApproving({ phase: 'gw' });
    setTimeout(() => setApproving({ phase: 'cust' }), 700);
    setTimeout(() => setApproving({ phase: 'done' }), 1400);
    setTimeout(() => {
      window.EFActions.orders.approveClaim(orderId);
      toast({
        tone: 'success',
        transition: { entity: `Order #${orderId}`, from: 'GW Claimed — Approve', to: 'Active' },
        text: 'Briefing email sent · customer introduced',
      });
    }, 1700);
    setTimeout(() => setApproving(null), 2400);
  };
  const rejectClaim = () => {
    window.EFActions.orders.rejectClaim(orderId);
    toast({
      tone: 'info',
      transition: { entity: `Order #${orderId}`, from: 'GW Claimed — Approve', to: 'On Job Board' },
      text: 'Claim rejected · job returned to board',
    });
  };
  const markInstallmentPaid = (n) => {
    const installment = (order.installments || []).find(i => i.n === n);
    window.EFActions.orders.markInstallmentPaid(orderId, n);
    toast({ text: `Installment ${n} marked as paid · ${U.EUR(installment?.amt)} via SEPA`, tone: 'success' });
  };
  // Direct release is intentionally removed: per business_rules §5 GW payments are released
  // via the Friday batch — never ad-hoc. The button on this card just navigates there.
  const goToFridayBatch = () => navigate('friday-batch');

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
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final deadline <span className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</span></span>
            <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
            {order.outstandingEur > 0 && <span className="pill pill-amber">Outstanding {U.EUR(order.outstandingEur)} of {U.EUR(order.grossEur)}</span>}
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
            {t === 'submissions' && submissionsCount > 0 && <span className="pill pill-pink">{submissionsCount}</span>}
            {t === 'payments' && order.outstandingEur > 0 && <span className="pill pill-amber">!</span>}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
          <div className="flex-col gap-3">
            <div className="card">
              <div className="card-head"><div className="card-title">Customer</div><span className="text-faint fs-11">Pipedrive synced · {U.relTime('2026-05-07T13:42:00')}</span></div>
              <div className="card-pad flex items-center gap-3">
                <Avatar initials={cust.initials} size={44} tone="blue"/>
                <div className="flex-col" style={{ flex: 1 }}>
                  <strong>{cust.name}</strong>
                  <span className="fs-11 text-faint mono">{cust.email} · {cust.phone}</span>
                  <span className="fs-11 text-faint">Lifetime {U.EUR(cust.ltv)} · {cust.orders} order(s) · {cust.country} · lead via {cust.leadSource}</span>
                </div>
                {cust.tags?.includes('VIP') && <span className="pill pill-yellow">VIP</span>}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Work specification</div></div>
              <div className="card-pad">
                <div className="kv">
                  <div className="kv-row"><dt>Type</dt><dd>{D.WORK_TYPE_LABELS[order.workType]}</dd></div>
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
                  <div className="kv-row"><dt>Gross (Brutto)</dt><dd className="mono">{U.EUR(order.grossEur)}</dd></div>
                  <div className="kv-row"><dt>VAT 7%</dt><dd className="mono text-muted">−{U.EUR(order.grossEur * 0.07 / 1.07)}</dd></div>
                  <div className="kv-row"><dt>Net (after VAT)</dt><dd className="mono">{U.EUR(order.grossEur / 1.07)}</dd></div>
                  <div className="kv-row" style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}><dt>Deadline factor</dt><dd className="mono">{order.deadlineFactor || '1.0'}× <span className="text-faint">(≥72h)</span></dd></div>
                  <div className="kv-row"><dt><Bi de="Honorar" en="GW honorarium"/> <span className="text-faint" style={{ marginLeft: 4 }}>· rate {((order.rate||0)*100).toFixed(0)}%</span></dt><dd className="mono" style={{ color: 'var(--green)' }}>{U.EUR(order.netHonorarium)}</dd></div>
                  <div className="kv-row"><dt>Berat margin</dt><dd className="mono strong">{U.EUR((order.grossEur/1.07) - order.netHonorarium)}</dd></div>
                </div>
                {showRateSlider && (
                  <div style={{ marginTop: 12, padding: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>
                    <div className="flex justify-between fs-11 mb-2"><span className="text-muted">GW rate (locked at assignment)</span><span className="mono strong">{((order.rate||0.4)*100).toFixed(0)}%</span></div>
                    <input type="range" min="33" max="62" step="1" value={Math.round((order.rate||0.4)*100)} onChange={(e) => {
                      const r = +e.target.value / 100;
                      const honor = (order.grossEur / 1.07) * r;
                      window.EFActions.orders.setHonorRate(orderId, r);
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
          </div>

          <div className="flex-col gap-3">
            {/* Release gate widget */}
            <div className="card" style={{ border: gateBlocked ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : (gateAllPass ? '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' : undefined) }}>
              <div className="card-head">
                <div className="card-title flex items-center gap-2"><Icon name="shield-check" size={14}/> GW Payment Releasability</div>
                <span className="text-faint fs-11 mono">{U.EUR(order.netHonorarium)}</span>
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
                <button className="btn w-full mt-3" disabled={!gateAllPass} onClick={goToFridayBatch} style={ gateAllPass ? { background: 'var(--green)', color: 'white', borderColor: 'var(--green)', justifyContent: 'center' } : { justifyContent: 'center' } }>
                  <Icon name="wallet" size={14}/> {gateAllPass ? `Open Friday batch · ${U.EUR(order.netHonorarium)}` : 'Release happens in Friday batch'}
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
                  <div className="fs-11 text-faint">Issued {U.fmtDate(order.acceptedAt)} · {U.EUR(order.grossEur)}</div>
                </div>
                <NotReady className="btn btn-sm" feature="invoice-pdf"><Icon name="download" size={12}/> PDF</NotReady>
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
                      <td className="mono">{U.fmtDate(inst.date)}</td>
                      <td className="num mono">{U.EUR(inst.amt)}</td>
                      <td className="text-muted fs-11">{(inst.method||'—').replace('stripe_','Stripe ').replace('bank_transfer_sepa','SEPA').replace('_',' ')}</td>
                      <td>
                        {inst.status === 'paid' && <span className="pill pill-green"><Icon name="check" size={10}/> Paid {U.fmtDate(inst.date)}</span>}
                        {inst.status === 'overdue' && <span className="pill pill-red">Overdue {Math.abs(U.daysTo(inst.date))}d</span>}
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
                <span className="mono strong">{U.EUR(order.grossEur)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '4px 12px' }}>
                <span className="text-muted fs-12">Paid to date</span>
                <span className="mono" style={{ color: 'var(--green)' }}>{U.EUR(order.paidEur)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '4px 12px' }}>
                <span className="text-muted fs-12">Outstanding</span>
                <span className="mono" style={{ color: order.outstandingEur > 0 ? 'var(--red)' : 'var(--text-3)' }}>{U.EUR(order.outstandingEur)}</span>
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
                      <div className="text-faint">pi_3Q{seed} · {U.fmtDate(i.date)} · {U.EUR(i.amt)}</div>
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
        <AssignmentTab order={order} navigate={navigate} toast={toast}/>
      )}
      {tab === 'audit' && (
        <AuditTab order={order} />
      )}
    </div>
  );
}

function SubmissionsTab({ order }) {
  const subs = window.EFHooks.useSubmissions({ orderId: order.id });
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
                <div className="fs-11 text-faint">{(s.size/1024/1024).toFixed(2)} MB · {s.kind.replace('_',' ')} · round {s.round} · submitted {U.relTime(s.submittedAt)}</div>
              </div>
              {s.qaStatus === 'passed' && <span className="pill pill-green"><Icon name="check" size={10}/> QA passed · forwarded</span>}
              {s.qaStatus === 'pending' && <span className="pill pill-pink">QA pending</span>}
              <NotReady className="btn btn-sm" feature="submission-download" ariaLabel="Download submission"><Icon name="download" size={12}/></NotReady>
              <NotReady className="btn btn-sm" feature="submission-preview" ariaLabel="Preview submission"><Icon name="eye" size={12}/></NotReady>
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
  const cust = D.customer(order.customerId);
  const gw = D.gw(order.gwId);
  const customerInitials = cust?.initials || 'CU';
  const gwInitials = gw?.initials || 'GW';
  const comms = [
    { ch: 'email', from: 'GW', sender: gw?.name || 'Ghostwriter', initials: gwInitials, text: 'Hallo Adrian, anbei der Zwischenstand für Kapitel 3...', at: '2026-05-06T16:42:00', attachments: [{ name: 'Zwischenstand_Kapitel_3.pdf', meta: '812 KB', icon: 'file-text' }] },
    { ch: 'whatsapp', from: 'Customer', sender: cust?.name || 'Customer', initials: customerInitials, text: 'Wann bekomme ich den nächsten Stand?', at: '2026-05-07T09:14:00' },
    { ch: 'voice', from: 'Customer', sender: cust?.name || 'Customer', initials: customerInitials, text: 'Voicemail received · 0:42 · metadata only', at: '2026-05-07T11:02:00', system: true },
    { ch: 'email', from: 'efactory1', sender: 'efactory1', initials: 'EF', text: 'Lieber Adrian, der Zwischenstand wird morgen früh übermittelt.', at: '2026-05-07T13:42:00' },
  ];
  return (
    <div className="chat-shell chat-shell-soft">
      <div className="chat-header">
        <div className="chat-title">
          <div>
            <span className="chat-title-main">Unified communications</span>
            <span className="chat-title-sub">email · WhatsApp · voice metadata · platform chat</span>
          </div>
        </div>
      </div>
      <ChatNotice compact>
        efactory1 stays in CC. Financial keywords are auto-redirected to <code>kundenservice@efactory1.de</code>.
      </ChatNotice>
      <div className="chat-stream" style={{ maxHeight: 560 }}>
        {comms.map((m, i) => {
          if (m.system) return <ChatMessage key={i} system at={m.at}>{m.text}</ChatMessage>;
          const mine = m.from === 'efactory1';
          return (
            <ChatMessage
              key={i}
              mine={mine}
              sender={m.sender}
              initials={m.initials}
              at={m.at}
              channel={m.ch}
              attachments={m.attachments}
              status={mine ? 'sent' : null}
            >
              {m.text}
            </ChatMessage>
          );
        })}
      </div>
    </div>
  );
}

function AssignmentTab({ order, navigate, toast }) {
  const gw = D.gw(order.gwId);
  // Per PRD order_lifecycle: assignment can happen only after the offer/invoice has been paid
  // (state ≥ "paid"/"available"). Earlier states must complete the offer→invoice→payment path
  // first. Self-assign goes straight to active without posting to the board.
  const isPrePay = ['lead','qualified','offer_sent','invoice_sent'].includes(order.status);
  const isPostFinal = ['final_submitted','qa_review','delivered','payment_pending','completed','cancelled','ai_violation_review','plagiarism_violation_review'].includes(order.status);
  const assignBlocked = isPrePay || isPostFinal;
  const blockReason = isPrePay
    ? 'Order must be paid before GW assignment. Send invoice and confirm payment first.'
    : isPostFinal
      ? 'Order is past the assignment window. Use “Reassign” from Disputes if a switch is needed.'
      : null;
  const onAssign = (g) => {
    if (assignBlocked) {
      if (toast) toast({ text: blockReason, tone: 'danger' });
      return;
    }
    window.EFActions.orders.assignGw(order.id, g.id, { selfAssigned: !!g.isOwner });
    if (toast) toast({
      tone: 'success',
      transition: { entity: `Order #${order.id}`, from: order.status === 'available' ? 'On Job Board' : 'Awaiting Assignment', to: 'Active' },
      text: `${g.name} assigned · briefing + customer intro emails queued`,
    });
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {assignBlocked && (
        <div className="banner warn" style={{ gridColumn: '1 / -1' }}>
          <Icon name="lock" size={14}/>
          <span><strong>Assignment locked.</strong> {blockReason}</span>
        </div>
      )}
      <div className="card">
        <div className="card-head"><div className="card-title">GW selection</div></div>
        <div className="card-pad flex-col gap-2">
          {D.GHOSTWRITERS.filter(g => !g.banned && !g.isOwner).slice(0, 6).map(g => {
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
                <button type="button" className="btn btn-sm" onClick={() => onAssign(g)} disabled={order.gwId === g.id || assignBlocked} title={assignBlocked ? blockReason : null}>{order.gwId === g.id ? 'Assigned' : 'Assign'}</button>
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
            { t: 'Stripe payment_intent.succeeded · ' + U.EUR(order.installments?.[0]?.amt || order.grossEur), at: order.installments?.[0]?.date, dot: 'green', icon: 'check' },
            { t: 'Pipedrive deal moved to Won', at: order.installments?.[0]?.date, dot: '', icon: 'git-branch' },
            order.gwId && { t: 'GW '+D.gw(order.gwId)?.name+' assigned', at: order.acceptedAt, dot: 'blue', icon: 'feather' },
          ].filter(Boolean).map((e, i) => (
            <div key={i} className="timeline-item">
              <div className={`timeline-dot ${e.dot}`}><Icon name={e.icon} size={10}/></div>
              <div className="timeline-content">
                <div className="timeline-title">{e.t}</div>
                <div className="timeline-meta mono">{U.fmtDateTime(e.at)}</div>
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

window.OrderDetail = OrderDetail;
window.SubmissionsTab = SubmissionsTab;
window.CommsTab = CommsTab;
window.AssignmentTab = AssignmentTab;
window.AuditTab = AuditTab;
})();
