// GW · Job Board — claimable jobs with admin perspective toggle. Includes ClaimModal.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ GW JOB BOARD ============
// Same surface, two perspectives: GW claims, admin manages (no Claim button).
function GWJobBoard({ navigate, toast, role = 'gw' }) {
  const isAdmin = role === 'admin';
  const [filter, setFilter] = useStateA('all');
  const [claimingId, setClaimingId] = useStateA(null);
  // Source of truth: ORDERS where status === 'available' AND no GW assigned.
  const unclaimed = window.EFHooks.useOrders({ filter: 'available' })
    .filter(o => o.status === 'available' && !o.gwId)
    .map(o => ({
      id: o.id,
      workType: o.workType,
      field: o.field,
      pages: o.pages,
      deadline: o.finalDeadline,
      honorEur: o.netHonorarium,
      grossEur: o.grossEur,
      customerId: o.customerId,
      factor: U.daysTo(o.finalDeadline) < 7 ? '1.5' : '1.0',
      topic: o.titleTBD ? 'Titel folgt — Briefing nach Claim' : o.title,
      urgent: U.daysTo(o.finalDeadline) < 7,
    }));

  const filtered = filter === 'all' ? unclaimed : unclaimed.filter(o => o.workType === filter);

  const onUnpublish = (id) => {
    window.EFActions.orders.patch(id, { status: 'on_hold', holdReason: 'Unpublished by admin' });
    toast && toast({
      tone: 'info',
      transition: { entity: `Order #${id}`, from: 'On Job Board', to: 'On Hold' },
      text: 'Removed by admin',
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Board</h1>
          <div className="page-subtitle">
            {isAdmin
              ? `${unclaimed.length} jobs published · first GW to claim wins · admin must approve claim before customer is unlocked`
              : `${unclaimed.length} unclaimed jobs · first to claim wins · admin must approve`}
          </div>
        </div>
        <div className="page-actions">
          {isAdmin
            ? <button type="button" className="btn btn-primary" onClick={() => navigate('orders')}><Icon name="plus" size={14}/> Publish job</button>
            : <NotReady className="btn" feature="alerts"><Icon name="bell" size={14}/> Alerts</NotReady>}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-pad flex items-center gap-3">
          <div className="flex gap-2 items-center">
            <span className="text-muted fs-12">Filter:</span>
            {[['all','All'],['hausarbeit','Hausarbeit'],['bachelorarbeit','Bachelor'],['masterarbeit','Master'],['lektorat','Lektorat'],['expose','Exposé']].map(([k,l]) => (
              <button type="button" key={k} className={`chip ${filter===k?'active':''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1 }}/>
          <span className="fs-11 text-faint">Sorted by: deadline urgency ↑</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {filtered.map(j => {
          const dm = U.deadlineMeta(j.deadline);
          const cust = isAdmin ? D.customer(j.customerId) : null;
          return (
            <div key={j.id} className="card" style={{ overflow: 'visible' }}>
              <div className="card-pad flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="mono fs-11 text-faint">#{j.id}</span>
                  <span className={`pill pill-${U.WORK_TYPE_TONES?.[j.workType] || 'slate'}`} style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{D.WORK_TYPE_LABELS[j.workType]}</span>
                  {j.urgent && <span className="pill pill-red"><Icon name="flame" size={10}/> Urgent ×{j.factor}</span>}
                  <span style={{ flex: 1 }}/>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
                <div className="strong fs-13">{j.topic}</div>
                <div className="kv">
                  <div className="kv-row"><dt>Field</dt><dd>{j.field}</dd></div>
                  <div className="kv-row"><dt>Pages</dt><dd className="mono">{j.pages}</dd></div>
                  <div className="kv-row"><dt>Deadline</dt><dd className="mono">{U.fmtDate(j.deadline)}, 18:00</dd></div>
                  {isAdmin
                    ? <>
                        <div className="kv-row"><dt>Customer</dt><dd>{cust?.name || '—'}</dd></div>
                        <div className="kv-row"><dt>Gross</dt><dd className="mono">{U.EUR(j.grossEur)}</dd></div>
                        <div className="kv-row"><dt>GW honorar</dt><dd className="mono" style={{ color: 'var(--green)' }}>{U.EUR(j.honorEur)}</dd></div>
                        <div className="kv-row"><dt>Margin</dt><dd className="mono strong">{U.EUR((j.grossEur / 1.07) - j.honorEur)}</dd></div>
                      </>
                    : <div className="kv-row"><dt>Honorar (you receive)</dt><dd className="mono strong" style={{ color: 'var(--green)', fontSize: 14 }}>{U.EUR(j.honorEur)}</dd></div>
                  }
                </div>
                {isAdmin
                  ? (
                    <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11 }}>
                      <Icon name="eye" size={12}/>
                      <span>Admin view · GWs see this job with customer name hidden until their claim is approved.</span>
                    </div>
                  ) : (
                    <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11 }}>
                      <Icon name="lock" size={12}/>
                      <span>Customer name + contact <strong>hidden</strong> until claim is approved.</span>
                    </div>
                  )
                }
                {isAdmin ? (
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('order-detail', { id: j.id })}>
                      <Icon name="eye" size={14}/> Open
                    </button>
                    <button type="button" className="btn" onClick={() => onUnpublish(j.id)} title="Unpublish job">
                      <Icon name="x" size={14}/> Unpublish
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-success" style={{ justifyContent: 'center' }} onClick={() => setClaimingId(j.id)}>
                    <Icon name="check" size={14}/> Claim job
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card"><div className="card-pad text-faint fs-12">No jobs match this filter.</div></div>
        )}
      </div>
      {!isAdmin && claimingId && <ClaimModal job={unclaimed.find(j => j.id === claimingId)} onClose={() => setClaimingId(null)} toast={toast} navigate={navigate}/>}
    </div>
  );
}

function ClaimModal({ job, onClose, toast, navigate }) {
  const [step, setStep] = useStateA(1);
  const [acks, setAcks] = useStateA({ agb: false, ai: false, gdpr: false, deadline: false, fee: false, individual: false });
  const allAcked = Object.values(acks).every(Boolean);
  const submit = () => {
    // Stateful transition: order moves to claimed_pending_approval and is bound
    // to the logged-in GW (Isabel Walter, gw-iw). Visible across all role views.
    window.EFActions.gw.claimJob(job.id, 'gw-iw');
    onClose();
    toast({
      tone: 'info',
      transition: { entity: `Order #${job.id}`, from: 'On Job Board', to: 'GW Claimed — Approve' },
      text: '6 acknowledgements signed · awaiting admin approval',
    });
    setTimeout(() => navigate('gw-active'), 400);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Claim Job #{job.id}</div>
            <div className="text-faint fs-11 mt-1">Step {step} of 2 · acknowledgements</div>
          </div>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          {step === 1 ? (
            <>
              <div className="kv">
                <div className="kv-row"><dt>Type</dt><dd>{D.WORK_TYPE_LABELS[job.workType]}</dd></div>
                <div className="kv-row"><dt>Field</dt><dd>{job.field}</dd></div>
                <div className="kv-row"><dt>Pages</dt><dd className="mono">{job.pages}</dd></div>
                <div className="kv-row"><dt>Final deadline</dt><dd className="mono">{U.fmtDate(job.deadline)}, 18:00</dd></div>
                <div className="kv-row"><dt>Topic</dt><dd>{job.topic}</dd></div>
                <div className="kv-row"><dt>Your honorarium</dt><dd className="mono strong" style={{ color: 'var(--green)', fontSize: 16 }}>{U.EUR(job.honorEur)}</dd></div>
                <div className="kv-row"><dt>Released after</dt><dd>final delivery + customer accepts + payment cleared (next Friday)</dd></div>
              </div>
              <div className="banner danger mt-3" style={{ fontSize: 12 }}>
                <Icon name="alert-triangle" size={14}/>
                <div>
                  <strong>Important:</strong> Claim is <em>provisional</em> until admin approves. Customer details and platform chat unlock only after approval. AGB v3.2 applies.
                </div>
              </div>
            </>
          ) : (
            <div className="flex-col gap-2">
              {[
                { k: 'agb', label: 'I have read and accept the AGB v3.2 (effective 01.04.2026), including kill-fee schedule & confidentiality.' },
                { k: 'ai', label: 'I will NOT use AI tools (ChatGPT, Claude, Gemini, etc.) to generate any part of the work. Per AGB v3.2 §5, any AI use is fraud — exclusion from the platform and forfeit of payment. The AI score is investigative evidence, not a tolerated threshold.' },
                { k: 'gdpr', label: 'I will not store or share customer data outside efactory1 platform. GDPR Art. 28 applies.' },
                { k: 'deadline', label: 'I commit to the final deadline ' + U.fmtDate(job.deadline) + ' 18:00 — late delivery triggers fee reduction.' },
                { k: 'fee', label: 'I accept the honorarium of ' + U.EUR(job.honorEur) + ' as full and final compensation, paid after release gate clears.' },
                { k: 'individual', label: 'I confirm this is an Individual-Werk (Werkvertrag) and I am not employed by efactory1 GmbH.' },
              ].map(a => (
                <label key={a.k} className="flex items-start gap-2" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: acks[a.k] ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
                  <input type="checkbox" checked={acks[a.k]} onChange={() => setAcks({ ...acks, [a.k]: !acks[a.k] })} style={{ marginTop: 2 }}/>
                  <span className="fs-12">{a.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          {step === 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(2)}>Continue to acknowledgements →</button>
          ) : (
            <button className="btn btn-success" disabled={!allAcked} onClick={submit}><Icon name="check" size={14}/> Submit claim · {U.EUR(job.honorEur)}</button>
          )}
        </div>
      </div>
    </div>
  );
}

window.GWJobBoard = GWJobBoard;
})();
