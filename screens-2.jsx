// GW Job Board, Friday batch, QA Queue, GW Submission, Inbox
;(function(){
const { useState: useStateA, useEffect: useEffectA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const SS = window.EFU;
const SD = window.EF;

// ============ GW JOB BOARD ============
// Same surface, two perspectives: GW claims, admin manages (no Claim button).
function GWJobBoard({ navigate, fixState, setFixState, toast, role = 'gw' }) {
  const isAdmin = role === 'admin';
  const [filter, setFilter] = useStateA('all');
  const [claimingId, setClaimingId] = useStateA(null);
  // Source of truth: ORDERS where status === 'available' AND no GW assigned.
  // Apply fixState so a successful claim immediately removes the job from the board.
  const unclaimed = SD.ORDERS
    .map(o => ({ ...o, ...(fixState?.[o.id] || {}) }))
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
      factor: SS.daysTo(o.finalDeadline) < 7 ? '1.5' : '1.0',
      topic: o.titleTBD ? 'Titel folgt — Briefing nach Claim' : o.title,
      urgent: SS.daysTo(o.finalDeadline) < 7,
    }));

  const filtered = filter === 'all' ? unclaimed : unclaimed.filter(o => o.workType === filter);

  const onUnpublish = (id) => {
    setFixState && setFixState(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), status: 'on_hold', holdReason: 'Unpublished by admin' },
    }));
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
          const dm = SS.deadlineMeta(j.deadline);
          const cust = isAdmin ? SD.customer(j.customerId) : null;
          return (
            <div key={j.id} className="card" style={{ overflow: 'visible' }}>
              <div className="card-pad flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="mono fs-11 text-faint">#{j.id}</span>
                  <span className={`pill pill-${SS.WORK_TYPE_TONES?.[j.workType] || 'slate'}`} style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{SD.WORK_TYPE_LABELS[j.workType]}</span>
                  {j.urgent && <span className="pill pill-red"><Icon name="flame" size={10}/> Urgent ×{j.factor}</span>}
                  <span style={{ flex: 1 }}/>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
                <div className="strong fs-13">{j.topic}</div>
                <div className="kv">
                  <div className="kv-row"><dt>Field</dt><dd>{j.field}</dd></div>
                  <div className="kv-row"><dt>Pages</dt><dd className="mono">{j.pages}</dd></div>
                  <div className="kv-row"><dt>Deadline</dt><dd className="mono">{SS.fmtDate(j.deadline)}, 18:00</dd></div>
                  {isAdmin
                    ? <>
                        <div className="kv-row"><dt>Customer</dt><dd>{cust?.name || '—'}</dd></div>
                        <div className="kv-row"><dt>Gross</dt><dd className="mono">{SS.EUR(j.grossEur)}</dd></div>
                        <div className="kv-row"><dt>GW honorar</dt><dd className="mono" style={{ color: 'var(--green)' }}>{SS.EUR(j.honorEur)}</dd></div>
                        <div className="kv-row"><dt>Margin</dt><dd className="mono strong">{SS.EUR((j.grossEur / 1.07) - j.honorEur)}</dd></div>
                      </>
                    : <div className="kv-row"><dt>Honorar (you receive)</dt><dd className="mono strong" style={{ color: 'var(--green)', fontSize: 14 }}>{SS.EUR(j.honorEur)}</dd></div>
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
      {!isAdmin && claimingId && <ClaimModal job={unclaimed.find(j => j.id === claimingId)} onClose={() => setClaimingId(null)} toast={toast} navigate={navigate} setFixState={setFixState}/>}
    </div>
  );
}

function ClaimModal({ job, onClose, toast, navigate, setFixState }) {
  const [step, setStep] = useStateA(1);
  const [acks, setAcks] = useStateA({ agb: false, ai: false, gdpr: false, deadline: false, fee: false, individual: false });
  const allAcked = Object.values(acks).every(Boolean);
  const submit = () => {
    // Stateful transition: order moves to claimed_pending_approval and is bound
    // to the logged-in GW (Isabel Walter, gw-iw). Visible across all role views.
    if (setFixState) {
      setFixState(prev => ({
        ...prev,
        [job.id]: {
          ...(prev[job.id] || {}),
          status: 'claimed_pending_approval',
          gwId: 'gw-iw',
          claimedAt: new Date().toISOString(),
        },
      }));
    }
    onClose();
    toast({
      tone: 'info',
      transition: { entity: `Order #${job.id}`, from: 'On Job Board', to: 'GW Claimed — Approve' },
      text: '6 acknowledgements signed · awaiting admin approval',
    });
    if (window.efNotify) window.efNotify({ to: 'admin', title: `Claim awaiting approval · #${job.id}`, body: `Isabel Walter claimed this job · 6 acknowledgements signed` });
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
                <div className="kv-row"><dt>Type</dt><dd>{SD.WORK_TYPE_LABELS[job.workType]}</dd></div>
                <div className="kv-row"><dt>Field</dt><dd>{job.field}</dd></div>
                <div className="kv-row"><dt>Pages</dt><dd className="mono">{job.pages}</dd></div>
                <div className="kv-row"><dt>Final deadline</dt><dd className="mono">{SS.fmtDate(job.deadline)}, 18:00</dd></div>
                <div className="kv-row"><dt>Topic</dt><dd>{job.topic}</dd></div>
                <div className="kv-row"><dt>Your honorarium</dt><dd className="mono strong" style={{ color: 'var(--green)', fontSize: 16 }}>{SS.EUR(job.honorEur)}</dd></div>
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
                { k: 'ai', label: 'I will not use AI tools (ChatGPT, Claude, Gemini, etc.) to generate content. AI score on submissions must be ≤25%.' },
                { k: 'gdpr', label: 'I will not store or share customer data outside efactory1 platform. GDPR Art. 28 applies.' },
                { k: 'deadline', label: 'I commit to the final deadline ' + SS.fmtDate(job.deadline) + ' 18:00 — late delivery triggers fee reduction.' },
                { k: 'fee', label: 'I accept the honorarium of ' + SS.EUR(job.honorEur) + ' as full and final compensation, paid after release gate clears.' },
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
            <button className="btn btn-success" disabled={!allAcked} onClick={submit}><Icon name="check" size={14}/> Submit claim · {SS.EUR(job.honorEur)}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ GW ACTIVE JOBS ============
function GWActiveJobs({ navigate, fixState }) {
  const [filter, setFilter] = useStateA('all');

  // Apply fixState so claims/assignments made elsewhere appear here immediately.
  const realMine = SD.ORDERS
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
    const d = SS.daysTo(o.interimDeadline || o.finalDeadline);
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
          <div className="page-subtitle">{counts.active} active · {counts.pending} awaiting approval · {counts.revision} in revision · {SS.EUR(inFlightHonor)} in flight</div>
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
          <div className="mono strong" style={{ fontSize: 20, color: 'var(--green)', marginTop: 2 }}>{SS.EUR(inFlightHonor)}</div>
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
              const cust = SD.customer(o.customerId);
              const next = ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? null : (o.stage?.interim1 === 'pending' ? o.interimDeadline : o.stage?.interim2 === 'pending' ? o.interim2Deadline : o.finalDeadline);
              const dm = next ? SS.deadlineMeta(next) : { label: '—', tone: 'neutral' };
              return (
                <tr key={o.id} onClick={() => navigate('order-detail', { id: o.id })} style={{ cursor: 'pointer' }}>
                  <td className="mono"><strong>#{o.id}</strong></td>
                  <td><StatusPill status={o.status}/></td>
                  <td className="text-muted fs-12">{SD.WORK_TYPE_LABELS[o.workType] || o.workType}</td>
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
                        <span className="mono fs-11">{SS.fmtDate(next)}</span>
                        <span className={`fs-11 ${dm.tone === 'danger' ? 'text-danger' : dm.tone === 'warn' ? 'text-warn' : 'text-faint'}`} style={{ color: dm.tone === 'danger' ? 'var(--red)' : dm.tone === 'warn' ? 'var(--amber)' : 'var(--text-3)' }}>{dm.label}</span>
                      </div>
                    ) : <span className="text-faint fs-11">—</span>}
                  </td>
                  <td className="num mono strong" style={{ color: 'var(--green)' }}>{SS.EUR(o.netHonorarium)}</td>
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

// ============ FRIDAY BATCH ============
function FridayBatch({ navigate, fixState, setFixState, toast }) {
  // Apply fixState BEFORE filtering, then derive the batch from current state.
  // After release, status becomes 'completed' and the order drops out of the
  // batch entirely — it does not migrate to "Blocked".
  const passesGate = (o) => (
    o.status === 'payment_pending' &&
    o.outstandingEur === 0 &&
    o.qaPassed !== false &&
    !o.disputeOpen &&
    o.gwPaymentStatus !== 'work_in_progress'
  );
  const isInBatch = (o) => o.status === 'payment_pending' || o.status === 'ai_violation_review';
  const allEffective = SD.ORDERS.map(o => ({ ...o, ...(fixState[o.id] || {}) }));
  const considered = allEffective.filter(isInBatch);
  const releaseable = considered.filter(passesGate);
  const blocked = considered.filter(o => !passesGate(o));
  const [selected, setSelected] = useStateA(() => new Set(releaseable.map(o => o.id)));
  const [running, setRunning] = useStateA(false);
  const [done, setDoneState] = useStateA(false);
  // Snapshot the batch the moment it's released, so the audit preview keeps
  // showing what was actually released even after orders move to 'completed'.
  const [releasedSnapshot, setReleasedSnapshot] = useStateA([]);
  // Per-row payout state for cascade animation: 'sending' | 'paid'
  const [rowState, setRowState] = useStateA({});

  const total = releaseable.filter(o => selected.has(o.id)).reduce((s,o) => s + o.netHonorarium, 0);

  const toggle = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const runBatch = () => {
    setRunning(true);
    const targets = releaseable.filter(o => selected.has(o.id));
    const snapshot = targets.map(o => ({ id: o.id, amount: o.netHonorarium }));
    // Cascade: ~250ms per row → "sending" then "paid"
    targets.forEach((o, i) => {
      const start = 200 + i * 220;
      setTimeout(() => setRowState(p => ({ ...p, [o.id]: 'sending' })), start);
      setTimeout(() => {
        setRowState(p => ({ ...p, [o.id]: 'paid' }));
        setFixState(prev => ({ ...prev, [o.id]: { ...(prev[o.id]||{}), status: 'completed', gwPaymentStatus: 'paid' }}));
      }, start + 320);
    });
    const totalDur = 200 + targets.length * 220 + 400;
    setTimeout(() => {
      setRunning(false);
      setDoneState(true);
      setReleasedSnapshot(snapshot);
      toast({ text: `${snapshot.length} payments released · ${SS.EUR(snapshot.reduce((s,x)=>s+x.amount,0))} via SEPA · Sevdesk receipts queued`, tone: 'success' });
      // One notification per released GW
      snapshot.forEach(x => {
        if (window.efNotify) window.efNotify({ to: 'gw', title: `${SS.EUR(x.amount)} released · #${x.id}`, body: 'See your bank in 1–3 business days' });
      });
    }, totalDur);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin','Friday Batch · 08.05.2026']} />
          <h1 className="page-title" style={{ marginTop: 6 }}>Friday Payment Batch <span className="text-faint" style={{ fontWeight: 400, fontSize: 14 }}>· KW 19, 08.05.2026</span></h1>
          <div className="page-subtitle">{releaseable.length} ready · {blocked.length} blocked · {SS.EUR(total)} to release · cutoff 17:00 today</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => toast({ text: 'DATEV CSV exported · /exports/2026-05-08-honoraries.csv', tone: 'success' })}><Icon name="download" size={14}/> Export DATEV CSV</button>
          {!done && <button type="button" className="btn btn-success" disabled={running || selected.size === 0} onClick={runBatch}>
            {running ? <><Icon name="zap" size={14}/> Releasing…</> : <><Icon name="wallet" size={14}/> Release {selected.size} · {SS.EUR(total)}</>}
          </button>}
          {done && <span className="pill pill-green" style={{ fontSize: 13, padding: '6px 12px' }}><Icon name="check" size={12}/> Batch complete</span>}
        </div>
      </div>

      {done && (
        <div className="banner success mb-3">
          <Icon name="check-circle" size={16}/>
          <div style={{ flex: 1 }}>
            <strong>{releasedSnapshot.length} payments released successfully.</strong> SEPA batch ID <span className="mono">SEPA-2026-W19-A</span> queued at Stripe Treasury · Sevdesk receipts auto-mailed to GWs · DATEV export ready.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Ready to release ({releaseable.length})</div>
            <div className="flex items-center gap-2 fs-11">
              <input type="checkbox" checked={selected.size === releaseable.length} onChange={() => setSelected(selected.size === releaseable.length ? new Set() : new Set(releaseable.map(o=>o.id)))}/>
              <span className="text-muted">Select all</span>
            </div>
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="tbl">
              <thead><tr><th style={{ width: 32 }}></th><th>Order</th><th>GW</th><th className="num">Honorar</th><th>Gates</th><th>IBAN</th><th>SEPA</th></tr></thead>
              <tbody>
                {releaseable.map(o => {
                  const gw = SD.gw(o.gwId);
                  const rs = rowState[o.id];
                  const bg = rs === 'paid'
                    ? 'color-mix(in oklab, var(--green) 10%, transparent)'
                    : rs === 'sending'
                      ? 'color-mix(in oklab, var(--blue) 6%, transparent)'
                      : selected.has(o.id) ? 'color-mix(in oklab, var(--green) 4%, transparent)' : undefined;
                  return (
                    <tr key={o.id} className="row-success" style={{ background: bg, transition: 'background .25s' }}>
                      <td><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} disabled={running || done}/></td>
                      <td><strong className="mono">#{o.id}</strong><div className="fs-11 text-faint" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div></td>
                      <td>
                        <div className="flex items-center gap-2"><Avatar initials={gw?.initials||'?'} size={22}/><span className="fs-12">{gw?.name||'—'}</span></div>
                      </td>
                      <td className="num mono strong" style={{ color: 'var(--green)' }}>{SS.EUR(o.netHonorarium)}</td>
                      <td><div className="flex gap-1"><Icon name="check" size={12} style={{ color: 'var(--green)' }}/><Icon name="check" size={12} style={{ color: 'var(--green)' }}/><Icon name="check" size={12} style={{ color: 'var(--green)' }}/><Icon name="check" size={12} style={{ color: 'var(--green)' }}/><Icon name="check" size={12} style={{ color: 'var(--green)' }}/></div></td>
                      <td className="mono fs-11 text-muted">{gw?.iban || 'DE••••3829'}</td>
                      <td>
                        {rs === 'paid' && <span className="pill pill-green"><Icon name="check" size={10}/> Paid</span>}
                        {rs === 'sending' && <span className="pill pill-blue"><Icon name="zap" size={10}/> Sending…</span>}
                        {!rs && (selected.has(o.id) ? <span className="pill pill-slate">Queued</span> : <span className="text-faint fs-11">—</span>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Blocked ({blocked.length})</div></div>
          <div className="card-pad flex-col gap-2">
            {blocked.map(o => {
              const gw = SD.gw(o.gwId);
              return (
                <div key={o.id} className="card-pad" style={{ border: '1px solid color-mix(in oklab, var(--red) 30%, var(--border))', borderRadius: 8, background: 'color-mix(in oklab, var(--red) 3%, var(--surface))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="mono strong">#{o.id}</span>
                    <span className="pill pill-red">{o.status === 'ai_violation_review' ? 'AI violation' : 'Outstanding installment'}</span>
                    <span style={{ flex: 1 }}/>
                    <span className="mono fs-12">{SS.EUR(o.netHonorarium)}</span>
                  </div>
                  <div className="fs-11 text-muted">{gw?.name || '—'} · {o.status === 'ai_violation_review' ? 'awaiting QA verdict — payment frozen' : `Outstanding ${SS.EUR(o.outstandingEur)} from customer`}</div>
                  <button className="btn btn-sm mt-2" onClick={() => navigate('order-detail', { id: o.id })}>Resolve →</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-head"><div className="card-title">Audit preview</div><span className="text-faint fs-11">{done ? 'released log' : 'what gets logged when you release'}</span></div>
        <div className="card-pad fs-11 mono" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
          {(() => {
            const ids = done
              ? releasedSnapshot.map(s => s.id)
              : releaseable.filter(o => selected.has(o.id)).map(o => o.id);
            const count = done ? releasedSnapshot.length : selected.size;
            const cents = Math.round((done ? releasedSnapshot.reduce((s,x)=>s+x.amount,0) : total) * 100);
            return (
              <>
                <div>2026-05-08T14:00:00Z · admin@efactory1.de · BATCH_PAYMENT_RELEASE · batch_id=SEPA-2026-W19-A</div>
                <div>2026-05-08T14:00:00Z · stripe.treasury · payouts.created · count={count} amount_cents={cents}</div>
                <div>2026-05-08T14:00:01Z · sevdesk.api · honorary_invoices.mark_paid · order_ids=[{ids.join(', ')}]</div>
                <div>2026-05-08T14:00:02Z · datev.export · csv_generated · path=/exports/2026-05-08-honoraries.csv</div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ============ QA DOCUMENT PREVIEW (inline) ============
// Q-04: replaces the old "Open document viewer" toast with an inline mock preview.
// Shows a synthetic first page derived from the order title so QA can see what they're judging.
function QADocumentPreview({ submission, order }) {
  const accent = submission.aiScore >= 70 ? 'var(--red)' : submission.aiScore >= 30 ? 'var(--amber)' : 'var(--green)';
  // Synthetic body — 8 paragraphs with seeded AI-risk rendering on the flagged ones.
  const seedAI = submission.aiScore || 0;
  const paragraphs = [
    `Die vorliegende Arbeit untersucht ${order.title || 'das Themenfeld'} im Kontext aktueller Forschung. Methodisch wird ein gemischter Ansatz aus qualitativen und quantitativen Verfahren verfolgt.`,
    `Im ersten Kapitel wird der theoretische Rahmen entwickelt. Hierbei werden die Arbeiten von Müller (2021) und Schmidt et al. (2022) als Ausgangspunkt verwendet.`,
    `Es ist wichtig zu beachten, dass die Methodik einen interdisziplinären Charakter aufweist. Insgesamt zeigt sich, dass mehrere Faktoren zusammenwirken.`,
    `Die empirische Erhebung umfasste n=148 Teilnehmende aus drei deutschen Großstädten. Die Auswertung erfolgte mittels SPSS v28.`,
    `Zusammenfassend lässt sich festhalten, dass die Hypothese H1 mit p<0.05 signifikant gestützt wird. Dieser Befund deckt sich mit der internationalen Literatur.`,
    `Limitationen: Die Stichprobe ist auf Deutschland beschränkt. Künftige Studien sollten kulturell vergleichende Ansätze einbeziehen.`,
    `Im Folgenden werden die Implikationen für die Praxis diskutiert. Es sei darauf hingewiesen, dass eine Übertragung sektorspezifisch zu prüfen ist.`,
    `Abschließend lässt sich festhalten, dass die Ergebnisse einen wertvollen Beitrag zur aktuellen Debatte leisten und neue Forschungsfragen aufwerfen.`,
  ];
  // Assign per-paragraph AI risk so flagged ones can be visually highlighted.
  const risks = paragraphs.map((_, i) => {
    if (seedAI < 15) return Math.max(0, seedAI - i*2);
    if (seedAI < 30) return [4, 8, 22, 6, 12, 5, 18, 9][i] ?? 8;
    // High-risk distribution mimics GPTZero output for AI-generated text
    return [12, 18, 92, 14, 88, 22, 78, 36][i] ?? 40;
  });

  return (
    <div className="card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="file-text" size={14}/> Document preview · {submission.fileName}</div>
        <span className="text-faint fs-11 mono">page 1 of {Math.max(8, Math.round((order.pages || 12) / 2))} · {(submission.size/1024/1024).toFixed(2)} MB</span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '24px 32px', minHeight: 420, fontFamily: 'Georgia, serif', lineHeight: 1.6, fontSize: 12.5 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{order.titleTBD ? '[Titel folgt]' : order.title}</div>
            <div className="fs-11 text-faint" style={{ marginTop: 4 }}>{order.field} · {order.pages} Seiten · Vorgelegt von Auftrag #{order.id}</div>
          </div>
          {paragraphs.map((p, i) => {
            const risk = risks[i];
            const tone = risk >= 70 ? 'var(--red)' : risk >= 30 ? 'var(--amber)' : 'transparent';
            return (
              <p key={i} style={{
                margin: '0 0 10px 0',
                padding: '4px 8px',
                borderLeft: tone !== 'transparent' ? `3px solid ${tone}` : '3px solid transparent',
                background: tone !== 'transparent' ? `color-mix(in oklab, ${tone} 7%, transparent)` : 'transparent',
                position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: -28, top: 4, fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>§{i+1}</span>
                {p}
                {risk >= 70 && <span className="pill pill-red" style={{ marginLeft: 8, fontSize: 10 }}>AI {risk}%</span>}
                {risk >= 30 && risk < 70 && <span className="pill pill-amber" style={{ marginLeft: 8, fontSize: 10 }}>review {risk}%</span>}
              </p>
            );
          })}
        </div>
        <div className="flex-col gap-3">
          <div className="card" style={{ padding: 12 }}>
            <div className="fs-11 text-muted mb-2">Per-paragraph AI risk</div>
            <div className="flex-col gap-1">
              {risks.map((r, i) => (
                <div key={i} className="flex items-center gap-2 fs-11">
                  <span className="text-faint mono" style={{ width: 22 }}>§{i+1}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${r}%`, height: '100%', background: r < 15 ? 'var(--green)' : r < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                  </div>
                  <span className="mono" style={{ width: 32, textAlign: 'right', color: r < 15 ? 'var(--green)' : r < 30 ? 'var(--amber)' : 'var(--red)' }}>{r}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="fs-11 text-muted mb-2">Document metadata</div>
            <div className="kv" style={{ fontSize: 11 }}>
              <div className="kv-row"><dt>Words</dt><dd className="mono">{((order.pages || 12) * 320).toLocaleString('de-DE')}</dd></div>
              <div className="kv-row"><dt>Citations</dt><dd className="mono">47 (APA)</dd></div>
              <div className="kv-row"><dt>Language</dt><dd>DE</dd></div>
              <div className="kv-row"><dt>Plag</dt><dd className="mono" style={{ color: submission.plagiarismScore < 15 ? 'var(--green)' : 'var(--amber)' }}>{submission.plagiarismScore}%</dd></div>
              <div className="kv-row"><dt>AI</dt><dd className="mono" style={{ color: submission.aiScore < 15 ? 'var(--green)' : submission.aiScore < 30 ? 'var(--amber)' : 'var(--red)' }}>{submission.aiScore}%</dd></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ QA COMPARE VS INTERIM ============
// Q-03: side-by-side mock diff — final/revision submission vs prior interim from same order.
function QACompareInterim({ submission, order }) {
  // Find prior interim submission for the same order; fall back to a synthesized stub.
  const priors = SD.SUBMISSIONS
    .filter(s => s.orderId === submission.orderId && s.id !== submission.id && (s.kind === 'interim_1' || s.kind === 'interim_2' || s.round < submission.round))
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const prior = priors[priors.length - 1];

  // Synthetic diff lines so the comparison feels real even when no interim seed exists.
  const diff = [
    { kind: 'context', l: 'Die vorliegende Arbeit untersucht', r: 'Die vorliegende Arbeit untersucht' },
    { kind: 'changed', l: 'das Themenfeld im Kontext der Literatur.', r: 'das Themenfeld im Kontext aktueller Forschung.' },
    { kind: 'context', l: 'Methodisch wird ein qualitativer Ansatz', r: 'Methodisch wird ein gemischter Ansatz' },
    { kind: 'changed', l: 'verfolgt.', r: 'aus qualitativen und quantitativen Verfahren verfolgt.' },
    { kind: 'added', l: '', r: 'Die Stichprobengröße wurde von n=80 auf n=148 erweitert.' },
    { kind: 'context', l: 'Die Hypothese H1 wird signifikant gestützt.', r: 'Die Hypothese H1 wird mit p<0.05 signifikant gestützt.' },
    { kind: 'removed', l: 'Eine ausführliche Darstellung erfolgt im Anhang A.', r: '' },
    { kind: 'changed', l: 'Insgesamt zeigt sich ein Trend.', r: 'Insgesamt zeigt sich, dass mehrere Faktoren zusammenwirken.' },
  ];
  const stats = {
    added: diff.filter(d => d.kind === 'added').length,
    removed: diff.filter(d => d.kind === 'removed').length,
    changed: diff.filter(d => d.kind === 'changed').length,
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="git-branch" size={14}/> Compare vs interim</div>
        <span className="text-faint fs-11">
          {prior ? `${prior.kind.replace('_',' ')} · round ${prior.round}` : 'no prior interim — showing synthetic baseline'}
          {' · '}
          <span style={{ color: 'var(--green)' }}>+{stats.added}</span>{' '}
          <span style={{ color: 'var(--red)' }}>−{stats.removed}</span>{' '}
          <span style={{ color: 'var(--amber)' }}>~{stats.changed}</span>
        </span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600 }}>
            <Icon name="file-text" size={11}/> {prior ? prior.fileName : `${order.id}_Zwischenstand_baseline.docx`}
            <span className="text-faint" style={{ marginLeft: 8, fontWeight: 400 }}>{prior ? SS.relTime(prior.submittedAt) : 'baseline'}</span>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.55, padding: '12px 16px', minHeight: 280 }}>
            {diff.map((d, i) => {
              if (d.kind === 'added') return <div key={i} style={{ color: 'var(--text-3)', fontStyle: 'italic', padding: '2px 0' }}>—</div>;
              const bg = d.kind === 'removed' ? 'color-mix(in oklab, var(--red) 12%, transparent)'
                : d.kind === 'changed' ? 'color-mix(in oklab, var(--amber) 10%, transparent)'
                : 'transparent';
              return <div key={i} style={{ padding: '2px 4px', background: bg, marginBottom: 2 }}>{d.l || ' '}</div>;
            })}
          </div>
        </div>
        <div>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600 }}>
            <Icon name="file-text" size={11}/> {submission.fileName}
            <span className="text-faint" style={{ marginLeft: 8, fontWeight: 400 }}>{SS.relTime(submission.submittedAt)}</span>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.55, padding: '12px 16px', minHeight: 280 }}>
            {diff.map((d, i) => {
              if (d.kind === 'removed') return <div key={i} style={{ color: 'var(--text-3)', fontStyle: 'italic', padding: '2px 0' }}>—</div>;
              const bg = d.kind === 'added' ? 'color-mix(in oklab, var(--green) 12%, transparent)'
                : d.kind === 'changed' ? 'color-mix(in oklab, var(--amber) 10%, transparent)'
                : 'transparent';
              return <div key={i} style={{ padding: '2px 4px', background: bg, marginBottom: 2 }}>{d.r || ' '}</div>;
            })}
          </div>
        </div>
      </div>
      <div className="card-pad" style={{ borderTop: '1px solid var(--border)', fontSize: 11 }}>
        <div className="banner info" style={{ fontSize: 11 }}>
          <Icon name="zap" size={12}/>
          <span>Stylometric distance vs prior interim: <strong>{submission.aiScore >= 70 ? '4.2σ outside cluster' : '0.6σ — consistent author voice'}</strong>. Sentence-length variance: {submission.aiScore >= 70 ? 'flattened (typical AI signature)' : 'natural'}.</span>
        </div>
      </div>
    </div>
  );
}

// ============ QA REVIEW QUEUE ============
// ===== Animated PlagScan / Turnitin runner — paragraph-by-paragraph scan
function PlagScanRunner({ submission }) {
  const { useState, useEffect } = React;
  const totalParagraphs = 22;
  const [scanned, setScanned] = useState(0);
  const [done, setDone] = useState(false);
  const [hits, setHits] = useState([]);
  // Deterministic match positions seeded from submission id
  const seed = (s) => Math.abs([...(s || 's')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const matchAt = (() => {
    const sd = seed(submission?.id);
    const target = Math.max(1, Math.min(8, Math.round((submission?.plagiarismScore || 6) / 4)));
    const positions = [];
    for (let i = 0; i < target; i++) positions.push((sd * (i + 1)) % totalParagraphs);
    return new Set(positions);
  })();
  useEffect(() => {
    setScanned(0); setDone(false); setHits([]);
    let i = 0;
    const tick = () => {
      i++;
      setScanned(i);
      if (matchAt.has(i - 1)) {
        setHits(prev => [...prev, { pIdx: i - 1, similarity: 6 + (seed(submission?.id) * (i + 1)) % 18, source: ['IEEE Xplore', 'JSTOR', 'Springer Link', 'Wikipedia', 'arXiv', 'GitHub Gist'][i % 6] }]);
      }
      if (i >= totalParagraphs) {
        clearInterval(handle);
        setTimeout(() => setDone(true), 200);
      }
    };
    const handle = setInterval(tick, 110);
    return () => clearInterval(handle);
  }, [submission?.id]);
  const pct = Math.round((scanned / totalParagraphs) * 100);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2">
          <Icon name="shield-check" size={14}/> PlagScan / Turnitin · {submission?.fileName || 'submission'}
        </div>
        <span className="text-faint fs-11 mono">
          {done ? `${hits.length} matches · ${submission?.plagiarismScore || 0}% overall` : `Scanning paragraph ${scanned} / ${totalParagraphs}`}
        </span>
      </div>
      <div className="card-pad">
        <div style={{ position: 'relative', minHeight: 240, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
          {/* Scanning overlay */}
          {!done && <div className="ef-scan-overlay"/>}
          <div style={{ padding: 12 }}>
            {Array.from({ length: totalParagraphs }).map((_, i) => {
              const isScanned = i < scanned;
              const hit = hits.find(h => h.pIdx === i);
              return (
                <div key={i} style={{ marginBottom: 6, padding: '4px 8px', borderRadius: 4, background: hit ? 'color-mix(in oklab, var(--red) 14%, transparent)' : isScanned ? 'color-mix(in oklab, var(--green) 6%, transparent)' : 'transparent', transition: 'background .25s', opacity: isScanned ? 1 : 0.4, fontSize: 11.5, lineHeight: 1.5 }}>
                  <div className="flex items-center gap-2">
                    <span className="mono fs-11 text-faint" style={{ minWidth: 22 }}>§{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      {hit
                        ? `Possible match — ${hit.source} · ${hit.similarity}% overlap`
                        : isScanned
                          ? '✓ no significant match'
                          : 'queued…'}
                    </span>
                    {hit && <span className="pill pill-red" style={{ fontSize: 10 }}>flag</span>}
                    {isScanned && !hit && <span className="text-faint fs-11">clean</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--green)' : 'var(--blue)', transition: 'width .15s linear' }}/>
          </div>
          <span className="mono fs-11 text-faint" style={{ minWidth: 56, textAlign: 'right' }}>{pct}%</span>
          {done && <span className="pill pill-green"><Icon name="check" size={10}/> Done · {hits.length} flagged</span>}
        </div>
      </div>
    </div>
  );
}

// ===== Animated GPTZero AI detector re-scan
function AIDetectionRunner({ submission }) {
  const { useState, useEffect } = React;
  const totalParagraphs = 22;
  const [scanned, setScanned] = useState(0);
  const [scores, setScores] = useState([]); // per-paragraph AI score 0-100
  const [done, setDone] = useState(false);
  const seed = (s) => Math.abs([...(s || 'a')].reduce((a, c) => a * 33 + c.charCodeAt(0), 11));
  const target = submission?.aiScore || 8;
  const sd = seed(submission?.id);
  // Generate per-paragraph scores that average to target
  const paraScores = (() => {
    const arr = [];
    for (let i = 0; i < totalParagraphs; i++) {
      const noise = ((sd * (i + 1)) % 31) - 15;
      // High overall → cluster many > 70%; low → most < 15%
      const base = target >= 70
        ? (i % 3 === 0 ? 30 : 80)
        : target;
      arr.push(Math.max(0, Math.min(100, base + noise)));
    }
    return arr;
  })();
  useEffect(() => {
    setScanned(0); setScores([]); setDone(false);
    let i = 0;
    const tick = () => {
      i++;
      setScanned(i);
      setScores(prev => [...prev, paraScores[i - 1]]);
      if (i >= totalParagraphs) {
        clearInterval(handle);
        setTimeout(() => setDone(true), 200);
      }
    };
    const handle = setInterval(tick, 130);
    return () => clearInterval(handle);
  }, [submission?.id]);
  const pct = Math.round((scanned / totalParagraphs) * 100);
  const flagged = scores.filter(x => x >= 70).length;
  const consensus = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const colorFor = (v) => v < 15 ? 'var(--green)' : v < 30 ? 'var(--amber)' : v < 70 ? 'var(--orange)' : 'var(--red)';
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2">
          <Icon name="bot" size={14}/> GPTZero · per-paragraph AI score · {submission?.fileName || 'submission'}
        </div>
        <span className="text-faint fs-11 mono">
          {done ? `${flagged} flagged · consensus ${consensus}%` : `Scoring paragraph ${scanned} / ${totalParagraphs}`}
        </span>
      </div>
      <div className="card-pad">
        <div style={{ position: 'relative', minHeight: 240, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
          {!done && <div className="ef-scan-overlay"/>}
          <div style={{ padding: 12 }}>
            {Array.from({ length: totalParagraphs }).map((_, i) => {
              const isScanned = i < scores.length;
              const v = scores[i];
              return (
                <div key={i} style={{ marginBottom: 4, padding: '4px 8px', borderRadius: 4, opacity: isScanned ? 1 : 0.4, fontSize: 11.5 }}>
                  <div className="flex items-center gap-2">
                    <span className="mono fs-11 text-faint" style={{ minWidth: 22 }}>§{i + 1}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                      <div className="ef-fill-anim" style={{ '--ef-fill': isScanned ? `${v}%` : '0%', width: isScanned ? `${v}%` : '0%', height: '100%', background: isScanned ? colorFor(v) : 'transparent' }}/>
                    </div>
                    <span className="mono fs-11" style={{ minWidth: 40, textAlign: 'right', color: isScanned ? colorFor(v) : 'var(--text-3)' }}>
                      {isScanned ? `${v}%` : '…'}
                    </span>
                    {isScanned && v >= 70 && <span className="pill pill-red" style={{ fontSize: 10 }}>AI</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: done ? colorFor(consensus) : 'var(--blue)', transition: 'width .15s linear' }}/>
          </div>
          <span className="mono fs-11 text-faint" style={{ minWidth: 56, textAlign: 'right' }}>{pct}%</span>
          {done && (
            <span className={`pill ${consensus >= 70 ? 'pill-red' : consensus >= 30 ? 'pill-amber' : 'pill-green'}`}>
              <Icon name={consensus >= 70 ? 'alert-triangle' : 'check'} size={10}/> Consensus {consensus}%
            </span>
          )}
        </div>
        {done && consensus >= 70 && (
          <div className="banner danger mt-3" style={{ fontSize: 11.5 }}>
            <Icon name="alert-triangle" size={14}/>
            <span><strong>Strong AI signature detected.</strong> {flagged} of {totalParagraphs} paragraphs ≥ 70% — recommend "Reject · AI violation confirmed" verdict.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function QAQueue({ navigate, toast, fixState, setFixState }) {
  const [activeId, setActiveId] = useStateA(3517);
  const subs = SD.SUBMISSIONS.filter(s => s.qaStatus === 'pending' || s.aiScore > 50);
  const active = subs.find(s => s.orderId === activeId) || subs[0];
  const order = active && SD.order(active.orderId);
  const cust = order && SD.customer(order.customerId);
  const gw = order && SD.gw(order.gwId);

  const [verdict, setVerdict] = useStateA(null);
  const [previewOpen, setPreviewOpen] = useStateA(false);
  const [compareOpen, setCompareOpen] = useStateA(false);
  const [plagOpen, setPlagOpen] = useStateA(false);
  const [aiOpen, setAiOpen] = useStateA(false);

  // Reset detail panels when switching submissions
  useEffectA(() => { setPreviewOpen(false); setCompareOpen(false); setPlagOpen(false); setAiOpen(false); setVerdict(null); }, [active?.id]);

  const decide = (kind) => {
    setVerdict(kind);
    if (kind === 'reject_ai') {
      setFixState(prev => ({ ...prev, [order.id]: { ...(prev[order.id]||{}), status: 'ai_violation_review' }}));
      toast({
        tone: 'danger',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: '🚨 AI Violation' },
        text: `${gw.name} flagged · payments held · reassignment in 2h`,
      });
      if (window.efNotify) window.efNotify({ to: 'admin', title: `🚨 AI violation confirmed · #${order.id}`, body: `${gw.name} flagged · payments held · reassignment queued`, urgent: true });
    } else if (kind === 'flag_plagiarism') {
      setFixState(prev => ({ ...prev, [order.id]: { ...(prev[order.id]||{}), status: 'plagiarism_violation_review', flagged: true }}));
      toast({
        tone: 'danger',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: 'Plagiarism Violation' },
        text: `${gw.name} payments held · 90d audit queued`,
      });
    } else if (kind === 'pass') {
      // Stateful: forward to customer review, mark QA passed
      setFixState(prev => ({
        ...prev,
        [order.id]: {
          ...(prev[order.id] || {}),
          status: active.kind === 'final_work' ? 'delivered' : 'under_customer_review',
          qaPassed: true,
        },
      }));
      toast({
        tone: 'success',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: active.kind === 'final_work' ? 'Delivered' : 'Customer Review' },
        text: `Forwarded to ${cust.name} · 14-day review timer started`,
      });
      if (window.efNotify) {
        window.efNotify({ to: 'customer', title: 'Ihre Arbeit hat die Qualitätsprüfung bestanden', body: `Auftrag #${order.id} · ${active.kind === 'final_work' ? 'Endabgabe' : 'Zwischenstand'} freigegeben` });
        window.efNotify({ to: 'gw', title: `QA passed · #${order.id}`, body: 'Forwarded to customer · payment release gate progressing' });
      }
    } else if (kind === 'request_revision') {
      setFixState(prev => ({
        ...prev,
        [order.id]: {
          ...(prev[order.id] || {}),
          status: 'revision_required',
          revisionRounds: ((prev[order.id]?.revisionRounds) ?? order.revisionRounds ?? 0) + 1,
        },
      }));
      toast({
        tone: 'info',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: 'Revision Required' },
        text: 'GW notified',
      });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">QA Review Queue</h1>
          <div className="page-subtitle">{subs.length} pending · 1 AI flagged 🚨 · oldest: 16h</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '8px 12px' }}><div className="card-title fs-12">Queue</div></div>
          <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
            {subs.map(s => {
              const o = SD.order(s.orderId);
              const isActive = s.orderId === activeId;
              return (
                <div key={s.id} onClick={() => { setActiveId(s.orderId); setVerdict(null); }} style={{
                  padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: isActive ? 'var(--surface-3)' : 'var(--surface)',
                  borderLeft: isActive ? '3px solid var(--blue)' : '3px solid transparent'
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono strong fs-12">#{s.orderId}</span>
                    {s.aiScore >= 70 && <span className="pill pill-red">AI {s.aiScore}%</span>}
                    {s.plagiarismScore >= 10 && <span className="pill pill-amber">Plag {s.plagiarismScore}%</span>}
                  </div>
                  <div className="fs-11 text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o?.title}</div>
                  <div className="fs-11 text-faint mt-1">{s.kind} · round {s.round} · {SS.relTime(s.submittedAt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {active && order && (
          <div className="flex-col gap-3">
            <div className="card" style={{ borderColor: active.aiScore >= 70 ? 'color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
              <div className="card-pad">
                <div className="flex items-center gap-3 mb-3">
                  <span className="mono strong fs-14">#{order.id}</span>
                  <span className="text-muted fs-13">· {order.title}</span>
                  <span style={{ flex: 1 }}/>
                  {active.aiScore >= 70 && <span className="pill pill-red"><Icon name="alert-triangle" size={11}/> Auto-flagged: AI score {active.aiScore}%</span>}
                </div>
                <div className="flex gap-3" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
                  <ScoreBar value={active.plagiarismScore} label="Plagiarism (PlagScan)" />
                  <ScoreBar value={active.aiScore} label="AI detection (GPTZero+Originality)" />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="fs-11 text-muted mb-1">QA checklist (auto)</div>
                    <div className="fs-11">
                      <div><Icon name="check" size={11} style={{ color: 'var(--green)' }}/> Citations: 47 (APA)</div>
                      <div><Icon name="check" size={11} style={{ color: 'var(--green)' }}/> Word count: matches</div>
                      <div><Icon name="check" size={11} style={{ color: 'var(--green)' }}/> Outline alignment: 92%</div>
                      <div><Icon name="x" size={11} style={{ color: 'var(--red)' }}/> AI score above 25% threshold</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                    <div className="fs-11 text-muted mb-2">From</div>
                    <div className="flex items-center gap-2"><Avatar initials={gw?.initials} size={28}/><div><strong className="fs-12">{gw?.name}</strong><div className="fs-11 text-faint">{gw?.lifetime} jobs · ★{gw?.rating}</div></div></div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                    <div className="fs-11 text-muted mb-2">For customer</div>
                    <div className="flex items-center gap-2"><Avatar initials={cust?.initials} size={28} tone="blue"/><div><strong className="fs-12">{cust?.name}</strong><div className="fs-11 text-faint">{cust?.country} · {cust?.orders} order(s)</div></div></div>
                  </div>
                </div>

                <div className="banner danger mb-3">
                  <Icon name="alert-triangle" size={16}/>
                  <div style={{ flex: 1 }}>
                    <strong>AI detector flagged §3 Methodology and §5 Conclusion (87% AI probability).</strong>
                    <div className="fs-11 mt-1">Stylometric drift + repeated phrase templates ("It is important to note that...", "In conclusion, this paper..."). Compare with GW's prior 22 submissions: stylometric distance 4.2σ outside cluster.</div>
                  </div>
                </div>

                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className={`btn ${previewOpen ? 'btn-primary' : ''}`} onClick={() => setPreviewOpen(o => !o)}><Icon name="eye" size={14}/> {previewOpen ? 'Hide' : 'Open'} document preview</button>
                  <button type="button" className="btn" onClick={() => navigate('order-detail', { id: order.id })}><Icon name="external-link" size={14}/> Open order detail</button>
                  {(active.kind === 'final_work' || active.kind === 'revision' || active.round > 1) && (
                    <button type="button" className={`btn ${compareOpen ? 'btn-primary' : ''}`} onClick={() => setCompareOpen(o => !o)}><Icon name="git-branch" size={14}/> {compareOpen ? 'Hide' : 'Compare vs interim'}</button>
                  )}
                  <button type="button" className={`btn ${plagOpen ? 'btn-primary' : ''}`} onClick={() => setPlagOpen(o => !o)}><Icon name="file-text" size={14}/> {plagOpen ? 'Hide' : 'View'} PlagScan report</button>
                  <button type="button" className={`btn ${aiOpen ? 'btn-primary' : ''}`} onClick={() => setAiOpen(o => !o)}><Icon name="zap" size={14}/> {aiOpen ? 'Hide' : 'Re-run'} AI detector</button>
                </div>
              </div>
            </div>

            {previewOpen && <QADocumentPreview submission={active} order={order} />}
            {compareOpen && <QACompareInterim submission={active} order={order} />}
            {plagOpen && <PlagScanRunner key={`plag-${active.id}`} submission={active} />}
            {aiOpen && <AIDetectionRunner key={`ai-${active.id}`} submission={active} />}

            <div className="card">
              <div className="card-head"><div className="card-title">Verdict</div></div>
              <div className="card-pad flex gap-2" style={{ flexWrap: 'wrap' }}>
                <button type="button" className={`btn ${verdict==='pass'?'btn-success':''}`} onClick={() => decide('pass')}>
                  <Icon name="check-circle" size={14}/> Pass · forward to customer
                </button>
                <button type="button" className={`btn ${verdict==='request_revision'?'btn-primary':''}`} onClick={() => decide('request_revision')}>
                  <Icon name="alert-triangle" size={14}/> Request revision (round {(order.revisionRounds || 0) + 1})
                </button>
                <button type="button" className="btn" onClick={() => toast({ text: `Clarification request sent to ${gw?.name}`, tone: 'info' })}>
                  <Icon name="message-square" size={14}/> Send to GW for clarification
                </button>
                <button type="button" className={`btn ${verdict==='flag_plagiarism'?'btn-danger':''}`} style={ verdict !== 'flag_plagiarism' ? { background: 'color-mix(in oklab, var(--red) 8%, var(--surface))', borderColor: 'color-mix(in oklab, var(--red) 25%, var(--border))', color: 'var(--red)' } : {}} onClick={() => decide('flag_plagiarism')}>
                  <Icon name="search" size={14}/> Flag plagiarism violation
                </button>
                <button type="button" className={`btn ${verdict==='reject_ai'?'btn-danger':''}`} style={ verdict !== 'reject_ai' ? { background: 'color-mix(in oklab, var(--red) 8%, var(--surface))', borderColor: 'color-mix(in oklab, var(--red) 25%, var(--border))', color: 'var(--red)' } : {}} onClick={() => decide('reject_ai')}>
                  <Icon name="x" size={14}/> Reject · AI violation confirmed
                </button>
              </div>
              {verdict === 'reject_ai' && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="banner danger mb-2"><Icon name="zap" size={14}/><span>The following actions will trigger:</span></div>
                  <div className="kv" style={{ fontSize: 12 }}>
                    <div className="kv-row"><dt>1. GW {gw?.name}</dt><dd>shadow-banned from job board</dd></div>
                    <div className="kv-row"><dt>2. Active jobs ({gw?.active})</dt><dd>frozen, payments held</dd></div>
                    <div className="kv-row"><dt>3. Past 90d submissions</dt><dd>queued for re-audit</dd></div>
                    <div className="kv-row"><dt>4. Customer #{order.id}</dt><dd>"submission delayed, replacement assigned" email</dd></div>
                    <div className="kv-row"><dt>5. New GW assignment</dt><dd>auto-suggested · top 3 matches</dd></div>
                    <div className="kv-row"><dt>6. Contract review</dt><dd>flagged for legal — kill-fee §7</dd></div>
                  </div>
                </div>
              )}
              {verdict === 'flag_plagiarism' && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="banner danger mb-2"><Icon name="zap" size={14}/><span>The following actions will trigger:</span></div>
                  <div className="kv" style={{ fontSize: 12 }}>
                    <div className="kv-row"><dt>1. Submission</dt><dd>marked as plagiarism violation · AGB v3.2 §6</dd></div>
                    <div className="kv-row"><dt>2. GW {gw?.name}</dt><dd>shadow-banned · payments on this order held</dd></div>
                    <div className="kv-row"><dt>3. Past 90d submissions</dt><dd>queued for plagiarism re-audit (Turnitin batch)</dd></div>
                    <div className="kv-row"><dt>4. Customer #{order.id}</dt><dd>"replacement assignment" email · ETA 24h</dd></div>
                    <div className="kv-row"><dt>5. Sevdesk credit-note</dt><dd>drafted (pending Berat review)</dd></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ GW SUBMIT ============
// Per-assignment submit. Routes:
//   #/gw/gw-submit?id=3520&kind=interim_1
//   #/gw/gw-submit?id=3540&kind=final
// Per PRD/SOP: final requires TWO files (work + Honorarrechnung) and shows the
// legal invoice address. All variants gate Submit behind a self-check checklist.
function GWSubmit({ orderId, kind, navigate, toast, setFixState }) {
  // No orderId → show picker of my active assignments.
  if (!orderId) return <GWSubmitPicker navigate={navigate}/>;
  const order = SD.order(orderId);
  if (!order) return <div className="page">Assignment #{orderId} not found.</div>;
  if (order.gwId !== 'gw-iw') return <div className="page">This assignment isn't yours.</div>;

  // Resolve kind from route + order context
  const resolvedKind = (() => {
    if (kind === 'interim_1' || kind === 'interim_2' || kind === 'final' || kind === 'revision') return kind;
    // Fallback: pick the next due milestone based on status
    if (order.status === 'revision_required') return 'revision';
    if (order.interimDeadline && SS.daysTo(order.interimDeadline) >= -1 && order.status === 'active') return 'interim_1';
    return 'final';
  })();
  const isFinal = resolvedKind === 'final';
  const isRevision = resolvedKind === 'revision';
  const kindLabel = {
    interim_1: 'Zwischenstand 1 / Interim 1',
    interim_2: 'Zwischenstand 2 / Interim 2',
    final: 'Final delivery + Honorarrechnung',
    revision: `Revision (round ${(order.revisionRounds || 0) + 1})`,
  }[resolvedKind];
  const dueDate = resolvedKind === 'interim_1' ? order.interimDeadline
    : resolvedKind === 'interim_2' ? order.interim2Deadline
    : order.finalDeadline;

  // ---- self-check state ----
  const baseChecks = { spelling: false, grammar: false, plagiarism: false, requirements: false };
  const finalExtras = { noAi: false, ready: false, individual: false };
  const [checks, setChecks] = useStateA({ ...baseChecks, ...(isFinal ? finalExtras : {}) });
  const allChecksDone = Object.values(checks).every(Boolean);

  // ---- file state ----
  const [workFile, setWorkFile] = useStateA(null);
  const [invoiceFile, setInvoiceFile] = useStateA(null);
  const [workErr, setWorkErr] = useStateA(null);
  const [invoiceErr, setInvoiceErr] = useStateA(null);
  const workInputRef = window.React.useRef(null);
  const invoiceInputRef = window.React.useRef(null);

  // ---- pipeline state ----
  const [step, setStep] = useStateA(0); // 0 idle, 1 upload, 2 plag, 3 ai, 4 qa, 5 done

  const MAX_BYTES = 5 * 1024 * 1024;
  // PRD: .doc, .docx, .pdf, .xls, .xlsx — max 5 MB
  const ACCEPTED_MIME = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const ACCEPTED_EXT = ['.pdf', '.docx', '.doc', '.xls', '.xlsx'];
  const ACCEPT_ATTR = ACCEPTED_EXT.join(',') + ',' + ACCEPTED_MIME.join(',');
  // Honorarrechnung must be a PDF — invoices are non-editable in DE practice
  const INVOICE_EXT = ['.pdf'];
  const INVOICE_ACCEPT = '.pdf,application/pdf';

  const validate = (f, allowedExt) => {
    if (!f) return 'No file selected.';
    const lower = (f.name || '').toLowerCase();
    const extOk = allowedExt.some(e => lower.endsWith(e));
    if (!extOk) return `Unsupported file type. Allowed: ${allowedExt.join(', ')}.`;
    if (f.size > MAX_BYTES) return `File too large (${(f.size/1024/1024).toFixed(1)} MB). Max 5 MB.`;
    if (f.size === 0) return 'File is empty.';
    return null;
  };

  const onWorkPicked = (f) => {
    const err = validate(f, ACCEPTED_EXT);
    if (err) { setWorkErr(err); toast({ text: err, tone: 'danger' }); return; }
    setWorkErr(null); setWorkFile({ name: f.name, size: f.size });
  };
  const onInvoicePicked = (f) => {
    const err = validate(f, INVOICE_EXT);
    if (err) { setInvoiceErr(err); toast({ text: err, tone: 'danger' }); return; }
    setInvoiceErr(null); setInvoiceFile({ name: f.name, size: f.size });
  };

  const filesReady = isFinal ? (workFile && invoiceFile) : !!workFile;
  const canSubmit = allChecksDone && filesReady && step === 0;

  const submit = () => {
    if (!canSubmit) return;
    setStep(1);
    setTimeout(() => setStep(2), 1100);
    setTimeout(() => setStep(3), 2400);
    setTimeout(() => setStep(4), 3500);
    setTimeout(() => {
      setStep(5);
      if (setFixState) {
        // Interim → qa_review (per workflow). Final → qa_review until QA passes.
        // Revision → qa_review (round bump).
        const newStatus = isFinal ? 'qa_review' : isRevision ? 'qa_review' : 'qa_review';
        setFixState(prev => ({
          ...prev,
          [order.id]: {
            ...(prev[order.id] || {}),
            status: newStatus,
            lastSubmissionAt: new Date().toISOString(),
            lastSubmissionFile: workFile.name,
            lastSubmissionKind: resolvedKind,
            lastInvoiceFile: isFinal ? invoiceFile.name : undefined,
            revisionRounds: isRevision ? (order.revisionRounds || 0) + 1 : (order.revisionRounds || 0),
          },
        }));
      }
      toast({
        tone: 'success',
        transition: {
          entity: `Order #${order.id}`,
          from: isFinal ? 'Active' : isRevision ? 'Revision Required' : 'Active',
          to: 'QA Review',
        },
        text: 'Plag 4% · AI 8% · forwarded to QA queue',
      });
      if (window.efNotify) {
        window.efNotify({ to: 'admin', title: `${isFinal ? 'Final' : isRevision ? 'Revision' : 'Interim'} submission · #${order.id}`, body: `${SD.gw(order.gwId)?.name || 'GW'} uploaded · pending QA` });
        window.efNotify({ to: 'qa', title: `New submission · #${order.id}`, body: `${kindLabel} · waiting for QA verdict` });
        if (!isFinal) {
          window.efNotify({ to: 'customer', title: 'Zwischenstand verfügbar', body: `Ihr Ghostwriter hat einen Zwischenstand für #${order.id} hochgeladen` });
        }
      }
    }, 4600);
  };

  const stages = [
    { name: 'Upload', icon: 'upload-cloud' },
    { name: 'Plagiarism', icon: 'shield-check' },
    { name: 'AI detector', icon: 'zap' },
    { name: 'QA queue', icon: 'inbox' },
  ];

  const Check = ({ k, label, why }) => (
    <label className="flex items-start gap-2" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: checks[k] ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
      <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks(c => ({ ...c, [k]: e.target.checked }))} style={{ marginTop: 2 }}/>
      <div className="flex-col" style={{ lineHeight: 1.35 }}>
        <span className="fs-12 strong">{label}</span>
        {why && <span className="fs-11 text-faint">{why}</span>}
      </div>
    </label>
  );

  const FilePicker = ({ label, current, err, onPicked, accept, allowedExt, inputRef, hint }) => {
    const [drag, setDrag] = useStateA(false);
    const onChange = (e) => { const f = e.target.files?.[0]; if (f) onPicked(f); e.target.value = ''; };
    const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f) onPicked(f); };
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="fs-12 strong">{label}</span>
          {current && <span className="pill pill-green"><Icon name="check" size={10}/> ready</span>}
        </div>
        <input ref={inputRef} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} aria-label={label}/>
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); }}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${drag ? 'var(--blue)' : (err ? 'var(--red)' : 'var(--border)')}`,
            borderRadius: 10, padding: current ? 14 : 24, cursor: 'pointer',
            background: drag ? 'color-mix(in oklab, var(--blue) 6%, var(--surface-2))' : 'var(--surface-2)',
            transition: 'border-color .15s, background .15s', textAlign: 'center',
          }}
        >
          {current ? (
            <div className="flex items-center gap-2" style={{ justifyContent: 'center' }}>
              <Icon name="file-text" size={16} className="text-muted"/>
              <span className="fs-12 mono">{current.name}</span>
              <span className="text-faint fs-11">· {(current.size/1024).toFixed(0)} KB</span>
              <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Replace</button>
            </div>
          ) : (
            <>
              <Icon name="upload-cloud" size={22} className="text-faint"/>
              <div className="fs-12 strong mt-1">{drag ? 'Drop to attach' : 'Click or drop file'}</div>
              <div className="fs-11 text-faint mt-1">{allowedExt.join(', ')} · max 5 MB</div>
            </>
          )}
        </div>
        {hint && <div className="fs-11 text-faint mt-1">{hint}</div>}
        {err && <div className="banner danger mt-2" style={{ fontSize: 11.5 }}><Icon name="alert-triangle" size={12}/> <span>{err}</span></div>}
      </div>
    );
  };

  // ---- Pipeline view ----
  if (step >= 1) {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <CrumbBar trail={['My Assignments', `#${order.id}`, 'Submit']}/>
            <h1 className="page-title" style={{ marginTop: 6 }}>Submitting · {kindLabel}</h1>
            <div className="page-subtitle">Order #{order.id} · scanning, scoring and forwarding to QA</div>
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-pad">
            <div className="flex justify-between items-center">
              {stages.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex-col items-center gap-1" style={{ flex: 1, opacity: step >= i+1 ? 1 : 0.4 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 18, background: step > i+1 ? 'var(--green)' : step === i+1 ? 'var(--blue)' : 'var(--surface-3)', color: step >= i+1 ? 'white' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step > i+1 ? <Icon name="check" size={16}/> : <Icon name={s.icon} size={16}/>}
                    </div>
                    <div className="fs-11 strong">{s.name}</div>
                  </div>
                  {i < stages.length - 1 && <div style={{ flex: 0.4, height: 2, background: step > i+1 ? 'var(--green)' : 'var(--border)', marginBottom: 18 }}/>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-pad flex-col gap-3">
            <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
              <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
              <div style={{ flex: 1 }}>
                <strong className="fs-12">{workFile?.name}</strong>
                <div className="fs-11 text-faint">{(workFile.size/1024).toFixed(0)} KB · uploaded just now</div>
              </div>
              <span className="pill pill-green"><Icon name="check" size={10}/> Uploaded</span>
            </div>
            {isFinal && invoiceFile && (
              <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
                <div style={{ flex: 1 }}>
                  <strong className="fs-12">{invoiceFile.name}</strong>
                  <div className="fs-11 text-faint">Honorarrechnung · {(invoiceFile.size/1024).toFixed(0)} KB</div>
                </div>
                <span className="pill pill-green"><Icon name="check" size={10}/> Uploaded</span>
              </div>
            )}
            <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
              <Icon name="shield-check" size={20} className={step >= 2 ? 'text-success' : 'text-muted'} />
              <div style={{ flex: 1 }}><strong className="fs-12">Plagiarism scan (PlagScan)</strong><div className="fs-11 text-faint">{step >= 2 ? '4% — within tolerance' : 'Scanning…'}</div></div>
              {step >= 2 && <span className="pill pill-green">PASS</span>}
            </div>
            <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
              <Icon name="zap" size={20} className={step >= 3 ? 'text-success' : 'text-muted'} />
              <div style={{ flex: 1 }}><strong className="fs-12">AI detector (GPTZero + Originality.ai consensus)</strong><div className="fs-11 text-faint">{step >= 3 ? '8% AI probability — clean' : step >= 2 ? 'Running consensus…' : 'Waiting'}</div></div>
              {step >= 3 && <span className="pill pill-green">PASS</span>}
            </div>
            <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
              <Icon name="inbox" size={20} className={step >= 4 ? 'text-success' : 'text-muted'} />
              <div style={{ flex: 1 }}><strong className="fs-12">QA queue</strong><div className="fs-11 text-faint">{step >= 4 ? 'Forwarded · admin will review within 4h' : 'Queueing…'}</div></div>
              {step >= 4 && <span className="pill pill-green"><Icon name="check" size={10}/> DONE</span>}
            </div>
            {step >= 5 && (
              <div className="banner success">
                <Icon name="check-circle" size={16}/>
                <div>
                  <strong>Submission complete.</strong>
                  <div className="fs-11 mt-1">{isFinal
                    ? `Final + Honorarrechnung received. Once QA passes and customer accepts, your honorarium of ${SS.EUR(order.netHonorarium)} releases on the next Friday batch.`
                    : `efactory1 handles forwarding to the customer after QA. You don't need to email them.`}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-sm" onClick={() => navigate('gw-assignment-detail', { id: order.id })}>Back to assignment</button>
                    <button className="btn btn-sm" onClick={() => navigate('gw-submissions-list')}>My submissions</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Form view ----
  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['My Assignments', `#${order.id}`, 'Submit']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>{kindLabel}</h1>
          <div className="page-subtitle">Order #{order.id} · {order.titleTBD ? 'folgt' : order.title}{dueDate ? <> · due <span className="mono">{SS.fmtDate(dueDate)}, 18:00</span></> : null}</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('gw-assignment-detail', { id: order.id })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      <div className="banner info mb-3">
        <Icon name="lock" size={14}/>
        <span>Files are uploaded directly to efactory1 and never sent to the customer. Send-to-customer is platform-controlled after QA passes.</span>
      </div>

      {isRevision && (
        <div className="banner warn mb-3">
          <Icon name="alert-triangle" size={14}/>
          <span><strong>Revision round {(order.revisionRounds || 0) + 1}.</strong> Address customer feedback before re-uploading. Round 3+ requires Berat's approval.</span>
        </div>
      )}

      {/* Self-check checklist — Submit gated until all true */}
      <div className="card mb-3">
        <div className="card-head">
          <div className="card-title">Self-check before upload</div>
          <span className="text-faint fs-11">All boxes required · SOP E</span>
        </div>
        <div className="card-pad flex-col gap-2">
          <Check k="spelling" label="Spelling reviewed" why="Run a German spell-check pass — no obvious typos"/>
          <Check k="grammar" label="Grammar reviewed" why="Sentence structure, agreement, punctuation"/>
          <Check k="plagiarism" label="Plagiarism self-check completed" why="I've quoted/cited every external source. PlagScan will run again on upload."/>
          <Check k="requirements" label="Customer requirements re-read" why="Aligned to brief, outline, page count, citation style"/>
          {isFinal && (
            <>
              <div style={{ borderTop: '1px dashed var(--border)', margin: '6px 0', paddingTop: 6 }}/>
              <Check k="noAi" label="No AI tools used" why="ChatGPT, Claude, Gemini etc. are forbidden under AGB v3.2 (max 25% AI score)"/>
              <Check k="ready" label="Work is ready to send to the customer" why="Final formatting, deckblatt, references, appendices — all done"/>
              <Check k="individual" label="Individually created for this customer" why="No reused content from prior jobs (Werkvertrag requirement)"/>
            </>
          )}
        </div>
      </div>

      {/* File pickers */}
      <div className="card mb-3">
        <div className="card-head">
          <div className="card-title">Files</div>
          <span className="text-faint fs-11">.doc · .docx · .pdf · .xls · .xlsx · max 5 MB each</span>
        </div>
        <div className="card-pad flex-col gap-3">
          <FilePicker
            label={isFinal ? 'Final work' : isRevision ? `Revised work (round ${(order.revisionRounds || 0) + 1})` : 'Work file'}
            current={workFile}
            err={workErr}
            onPicked={onWorkPicked}
            accept={ACCEPT_ATTR}
            allowedExt={ACCEPTED_EXT}
            inputRef={workInputRef}
          />
          {isFinal && (
            <FilePicker
              label="Honorarrechnung (your invoice — PDF)"
              current={invoiceFile}
              err={invoiceErr}
              onPicked={onInvoicePicked}
              accept={INVOICE_ACCEPT}
              allowedExt={INVOICE_EXT}
              inputRef={invoiceInputRef}
              hint="One invoice per assignment · numbered with your prefix (e.g. IW-2026-014)"
            />
          )}
        </div>
      </div>

      {isFinal && (
        <div className="card mb-3" style={{ border: '1px solid color-mix(in oklab, var(--blue) 25%, var(--border))' }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2"><Icon name="file-text" size={14}/> Invoice address (Rechnungsadresse)</div>
            <span className="pill pill-blue">required</span>
          </div>
          <div className="card-pad">
            <div className="fs-12 text-muted mb-2">Address your Honorarrechnung to the legal entity below — copy &amp; paste into your invoice tool:</div>
            <div className="mono fs-12" style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, lineHeight: 1.6 }}>
              Bery Ventures GmbH<br/>
              c/o WeWork Friesenplatz 4<br/>
              50672 Köln<br/>
              Germany
            </div>
            <div className="fs-11 text-faint mt-2">Tax: indicate the small-business clause (§19 UStG) if applicable. Honorarium gross = the net amount you see on this assignment.</div>
          </div>
        </div>
      )}

      {/* Pre-flight summary */}
      <div className="card">
        <div className="card-pad flex items-center gap-3">
          <div className="flex-col" style={{ flex: 1, lineHeight: 1.4 }}>
            <span className="fs-12 strong">{allChecksDone && filesReady ? 'Ready to submit' : 'Pre-flight'}</span>
            <span className="fs-11 text-faint">
              {!allChecksDone && `Checklist: ${Object.values(checks).filter(Boolean).length}/${Object.keys(checks).length} done · `}
              {!workFile && 'work file missing · '}
              {isFinal && !invoiceFile && 'Honorarrechnung missing · '}
              {allChecksDone && filesReady && 'Plagiarism + AI scans run on upload, then forwarded to QA'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSubmit}
            onClick={submit}
            title={!canSubmit ? 'Complete the checklist and attach all required files first' : 'Submit'}
          >
            <Icon name="upload-cloud" size={14}/> Submit{isFinal ? ' final + invoice' : isRevision ? ' revision' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component: when GW navigates to /gw/gw-submit without an id, list active assignments.
function GWSubmitPicker({ navigate }) {
  const myActive = SD.liveOrders().filter(o => o.gwId === 'gw-iw' && !['available','qualified','offer_sent','invoice_sent','completed','cancelled','lead'].includes(o.status));
  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">New submission</h1>
          <div className="page-subtitle">Pick the assignment and milestone you want to upload for.</div>
        </div>
      </div>
      {myActive.length === 0 ? (
        <div className="card"><div className="card-pad text-faint fs-12">You have no active assignments to submit for.</div></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {myActive.map(o => {
            const interimDue = o.interimDeadline && SS.daysTo(o.interimDeadline);
            const finalDue = SS.daysTo(o.finalDeadline);
            return (
              <div key={o.id} style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-col" style={{ lineHeight: 1.3 }}>
                    <span className="strong fs-12 mono">#{o.id} · {o.titleTBD ? 'folgt' : o.title}</span>
                    <span className="text-faint fs-11">{SD.WORK_TYPE_LABELS[o.workType]} · final {SS.fmtDate(o.finalDeadline)}</span>
                  </div>
                  <StatusPill status={o.status}/>
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {o.interimDeadline && (
                    <button className="btn btn-sm" onClick={() => navigate('gw-submit', { id: o.id, kind: 'interim_1' })}>
                      <Icon name="upload-cloud" size={11}/> Interim 1 · {SS.fmtDate(o.interimDeadline)}
                    </button>
                  )}
                  {o.interim2Deadline && (
                    <button className="btn btn-sm" onClick={() => navigate('gw-submit', { id: o.id, kind: 'interim_2' })}>
                      <Icon name="upload-cloud" size={11}/> Interim 2 · {SS.fmtDate(o.interim2Deadline)}
                    </button>
                  )}
                  <button className="btn btn-sm btn-primary" onClick={() => navigate('gw-submit', { id: o.id, kind: 'final' })}>
                    <Icon name="upload-cloud" size={11}/> Final + invoice
                  </button>
                  {o.status === 'revision_required' && (
                    <button className="btn btn-sm" onClick={() => navigate('gw-submit', { id: o.id, kind: 'revision' })}>
                      <Icon name="rotate-ccw" size={11}/> Revision (round {(o.revisionRounds || 0) + 1})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ INBOX ============
function Inbox({ toast }) {
  const [activeId, setActiveId] = useStateA('th-1');
  const [tab, setTab] = useStateA('Inbox');
  const [reply, setReply] = useStateA('');
  const _toast = toast || (m => console.log(m));
  const threads = [
    { id: 'th-1', subject: 'Re: Bachelorarbeit – Zwischenstand', last: 'Wann bekomme ich den nächsten Stand?', from: 'Lea Schmidt', orderId: 3508, ch: 'whatsapp', sentiment: 'tense', unread: true, at: '2026-05-07T11:14:00' },
    // Voice channel: metadata-only per PRD constraint (no transcript content)
    { id: 'th-2', subject: 'Voicemail · 0:42', last: 'Voicemail received · 0:42 · sentiment: tense', from: 'Lea Schmidt', orderId: 3508, ch: 'voice', sentiment: 'tense', unread: true, at: '2026-05-07T11:02:00', voiceMeta: { duration: '0:42', from: '+49 •••• 8821', recordedAt: '2026-05-07T11:02:00' } },
    { id: 'th-3', subject: 'Hausarbeit Marketing — claim approved?', last: 'GW Maja hat sich gemeldet, ich frage mich, ob...', from: 'Sebastian Wolf', orderId: 3526, ch: 'email', sentiment: 'neutral', unread: false, at: '2026-05-07T10:43:00' },
    { id: 'th-4', subject: 'Frage zur Rate', last: 'Können wir die zweite Rate splitten?', from: 'Kurt Müller', orderId: 3499, ch: 'email', sentiment: 'neutral', unread: false, at: '2026-05-07T09:55:00', autoflag: 'pricing' },
    { id: 'th-5', subject: 'Danke!', last: 'Die Arbeit ist genau das, was ich mir vorgestellt habe.', from: 'Adrian Berger', orderId: 3520, ch: 'email', sentiment: 'positive', unread: false, at: '2026-05-06T18:22:00' },
    { id: 'th-6', subject: 'Internal: GW Anna König', last: 'AI score 87% — auto shadow-ban applied. Awaiting QA verdict.', from: 'System', orderId: 3517, ch: 'platform', sentiment: 'tense', unread: true, at: '2026-05-07T09:02:00', system: true },
  ];

  const filteredThreads = tab === 'Mentions'
    ? threads.filter(t => t.system || t.from?.toLowerCase().includes('berat'))
    : tab === 'Auto-flagged'
    ? threads.filter(t => t.autoflag || t.flagged)
    : threads;

  const active = filteredThreads.find(t => t.id === activeId) || filteredThreads[0] || threads[0];

  // AI assist suggestions — deterministic per active thread
  const suggestions = active && (
    active.autoflag === 'pricing' ? {
      summary: 'Customer asking about installment split — pricing-related → must redirect.',
      reply: 'Lieber Kurt, vielen Dank für Ihre Nachricht. Für Fragen zu Zahlungen oder Raten wenden Sie sich bitte direkt an kundenservice@efactory1.de — wir kümmern uns dort gerne darum. Beste Grüße, efactory1',
      tone: 'redirect',
      actions: ['suggest', 'redirect', 'escalate'],
    } : active.ch === 'voice' ? {
      summary: 'Voicemail received — sentiment tense. Do not transcribe content; respond by phone or email.',
      reply: 'Liebe Frau Schmidt, ich habe Ihre Nachricht erhalten. Ich rufe Sie heute zwischen 16 und 18 Uhr zurück. Beste Grüße, efactory1',
      tone: 'callback',
      actions: ['suggest', 'escalate'],
    } : active.sentiment === 'tense' ? {
      summary: 'Tense customer — acknowledge concern, set clear next step, no defensive language.',
      reply: 'Liebe Frau Schmidt, vielen Dank für Ihre Nachricht. Der nächste Zwischenstand erreicht Sie morgen vor 18:00 Uhr. Bei Rückfragen melden Sie sich gerne. Beste Grüße, efactory1',
      tone: 'reassure',
      actions: ['suggest', 'escalate'],
    } : active.sentiment === 'positive' ? {
      summary: 'Positive feedback — short thank-you, prompt for review/referral.',
      reply: 'Lieber Adrian, vielen Dank für Ihr Feedback! Falls Sie zufrieden sind, freuen wir uns über eine Empfehlung oder Bewertung. Herzliche Grüße, efactory1',
      tone: 'thank',
      actions: ['suggest'],
    } : {
      summary: 'Neutral — concise factual reply.',
      reply: 'Vielen Dank für Ihre Nachricht. Wir melden uns mit einer ausführlichen Antwort innerhalb von 24 Stunden. Beste Grüße, efactory1',
      tone: 'standard',
      actions: ['suggest'],
    }
  );

  const onUseSuggestion = () => { if (suggestions) setReply(suggestions.reply); };
  const onSend = () => {
    if (!reply.trim()) {
      _toast({ text: 'Reply is empty.', tone: 'danger' });
      return;
    }
    _toast({ text: `Reply sent via ${active.ch} to ${active.from} · CC kundenservice@efactory1.de`, tone: 'success' });
    setReply('');
  };
  const onRedirect = () => _toast({ text: `Thread #${active.orderId} redirected to kundenservice@efactory1.de`, tone: 'info' });
  const onEscalate = () => _toast({ text: `Thread escalated · admin Berat notified`, tone: 'info' });

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Unified Inbox</h1>
          <div className="page-subtitle">all channels · efactory1 always in CC · sentiment-tagged · pricing keywords auto-redirected</div>
        </div>
      </div>
      <div className="inbox-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 16, height: 'calc(100vh - 220px)', minHeight: 560 }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-head" style={{ padding: '8px 12px' }}>
            <div className="flex gap-1">
              {['Inbox', 'Mentions', 'Auto-flagged'].map(t => (
                <button type="button" key={t} className={`chip ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredThreads.map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => setActiveId(t.id)}
                aria-current={activeId === t.id}
                style={{
                  display: 'block', textAlign: 'left', width: '100%',
                  padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: activeId === t.id ? 'var(--surface-3)' : (t.unread ? 'color-mix(in oklab, var(--blue) 3%, var(--surface))' : 'var(--surface)'),
                  borderLeft: activeId === t.id ? '3px solid var(--blue)' : (t.unread ? '3px solid color-mix(in oklab, var(--blue) 50%, transparent)' : '3px solid transparent'),
                  borderTop: 'none', borderRight: 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`thread-channel-icon ${t.ch}`} style={{ width: 22, height: 22 }}><Icon name={t.ch==='email'?'mail':t.ch==='whatsapp'?'message-circle':t.ch==='voice'?'mic':'message-square'} size={11}/></div>
                  <strong className={`fs-12 ${t.unread ? '' : 'text-muted'}`}>{t.from}</strong>
                  {t.system && <span className="pill pill-red">System</span>}
                  <span style={{ flex: 1 }}/>
                  <span className="fs-11 text-faint">{SS.relTime(t.at).split(' ')[0]+'h'}</span>
                </div>
                <div className={`fs-12 ${t.unread ? 'strong' : 'text-muted'}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                <div className="fs-11 text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{t.last}</div>
                <div className="flex gap-1 mt-1">
                  <span className="fs-11 text-faint mono">#{t.orderId}</span>
                  <span style={{ flex: 1 }}/>
                  {t.sentiment === 'tense' && <span className="pill pill-amber" style={{ fontSize: 10 }}>tense</span>}
                  {t.sentiment === 'positive' && <span className="pill pill-green" style={{ fontSize: 10 }}>positive</span>}
                  {t.autoflag && <span className="pill pill-orange" style={{ fontSize: 10 }}>auto: {t.autoflag}</span>}
                </div>
              </button>
            ))}
            {filteredThreads.length === 0 && (
              <div className="text-faint fs-12" style={{ padding: 16 }}>No threads in this tab.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <div>
              <div className="card-title">{active.subject}</div>
              <div className="fs-11 text-faint">From <strong>{active.from}</strong> · order #{active.orderId} · {active.ch}</div>
            </div>
            {active.autoflag && <span className="pill pill-orange"><Icon name="alert-triangle" size={11}/> Pricing keyword detected → auto-redirected to <span className="mono">kundenservice@efactory1.de</span></span>}
          </div>
          <div className="card-pad flex-col gap-3" style={{ flex: 1, overflowY: 'auto' }}>
            {active.ch === 'voice' ? (
              // Metadata-only per PRD constraint — no transcript or translation
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="mic" size={14} className="text-muted"/>
                  <span className="fs-11 text-muted">Voicemail metadata · transcript not available by policy</span>
                </div>
                <div className="kv" style={{ fontSize: 12 }}>
                  <div className="kv-row"><dt>Duration</dt><dd className="mono">{active.voiceMeta?.duration || '—'}</dd></div>
                  <div className="kv-row"><dt>From</dt><dd className="mono">{active.voiceMeta?.from || active.from}</dd></div>
                  <div className="kv-row"><dt>Recorded at</dt><dd className="mono">{SS.fmtDateTime(active.voiceMeta?.recordedAt || active.at)}</dd></div>
                  <div className="kv-row"><dt>Sentiment tag</dt><dd><span className="pill pill-amber">{active.sentiment}</span></dd></div>
                </div>
                <div className="banner info mt-2" style={{ fontSize: 11.5 }}>
                  <Icon name="lock" size={12}/>
                  <span>Audio playback and transcription are disabled. Reply by phone or email.</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="fs-11 text-muted mb-2">{SS.fmtDateTime(active.at)} · {active.from}</div>
                <div className="fs-12">{active.last}</div>
              </div>
            )}
            {active.id === 'th-4' && (
              <div className="banner info">
                <Icon name="zap" size={14}/>
                <span>This message was auto-redirected. Berat → Kurt: "Für Fragen zu Zahlungen/Raten bitte kundenservice@efactory1.de — der GW darf darauf nicht antworten."</span>
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', padding: 12, background: 'var(--surface-2)' }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply…"
              aria-label="Reply"
              style={{ width: '100%', minHeight: 80, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}
            />
            <div className="flex justify-between mt-2">
              <div className="flex gap-1">
                <NotReady className="btn btn-sm" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={12}/></NotReady>
                <span className="chip">Auto-translate DE → EN: ON</span>
                <span className="chip">CC: kundenservice@efactory1.de</span>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={onSend} disabled={!reply.trim()}>
                <Icon name="send" size={12}/> Send via {active.ch}
              </button>
            </div>
          </div>
        </div>

        {/* AI assist pane — 3rd column per PRD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2"><Icon name="sparkles" size={14}/> AI assist</div>
            <span className="pill pill-blue" style={{ fontSize: 10 }}>Beta</span>
          </div>
          <div className="card-pad flex-col gap-3" style={{ flex: 1, overflowY: 'auto' }}>
            <div>
              <div className="fs-11 text-muted mb-1">Context summary</div>
              <div className="fs-12">{suggestions?.summary}</div>
            </div>
            <div>
              <div className="fs-11 text-muted mb-1">Suggested reply <span className="text-faint">· tone: {suggestions?.tone}</span></div>
              <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>{suggestions?.reply}</div>
              <button type="button" className="btn btn-sm w-full mt-2" onClick={onUseSuggestion} style={{ justifyContent: 'center' }}>
                <Icon name="zap" size={12}/> Use suggestion
              </button>
            </div>
            <div>
              <div className="fs-11 text-muted mb-1">Actions</div>
              <div className="flex-col gap-1">
                {suggestions?.actions?.includes('redirect') && (
                  <button type="button" className="btn btn-sm" onClick={onRedirect}><Icon name="arrow-right" size={12}/> Redirect to kundenservice</button>
                )}
                {suggestions?.actions?.includes('escalate') && (
                  <button type="button" className="btn btn-sm" onClick={onEscalate}><Icon name="alert-triangle" size={12}/> Escalate to admin</button>
                )}
                <button type="button" className="btn btn-sm" onClick={() => _toast({ text: 'Thread snoozed for 4h', tone: 'info' })}>
                  <Icon name="clock" size={12}/> Snooze 4h
                </button>
              </div>
            </div>
            <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11 }}>
              <Icon name="lock" size={12}/>
              <span>Suggestions are drafts only — review before sending. Pricing terms are auto-redirected and never sent to GWs.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.GWJobBoard = GWJobBoard;
window.GWActiveJobs = GWActiveJobs;
window.FridayBatch = FridayBatch;
window.QAQueue = QAQueue;
window.GWSubmit = GWSubmit;
window.Inbox = Inbox;

// ====================================================================
// GW — Report Delay (SOP B) — dual notification
// ====================================================================
function GWReportDelay({ orderId, navigate, toast, setFixState }) {
  const order = SD.order(orderId);
  if (!order) return <div className="page">Assignment not found.</div>;
  const cust = SD.customer(order.customerId);
  const [reason, setReason] = useStateA('');
  const [reasonKind, setReasonKind] = useStateA('illness');
  const [newDate, setNewDate] = useStateA('');
  const [customerInformed, setCustomerInformed] = useStateA(false);
  const [phase, setPhase] = useStateA('form'); // form | sending | sent
  const [sentSteps, setSentSteps] = useStateA({ customer: false, kundenservice: false });

  const valid = reason.trim().length > 10 && newDate;

  const send = () => {
    setPhase('sending');
    // Simulate dual notification
    setTimeout(() => setSentSteps({ customer: true, kundenservice: false }), 600);
    setTimeout(() => {
      setSentSteps({ customer: true, kundenservice: true });
      if (setFixState) {
        setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), status: 'on_hold', holdReason: 'Delay reported by GW · ' + reasonKind, proposedNewDeadline: newDate + 'T18:00:00' } }));
      }
      toast({
        tone: 'info',
        transition: { entity: `Order #${orderId}`, from: 'Active', to: 'On Hold' },
        text: 'Delay reported · customer + kundenservice notified',
      });
      if (window.efNotify) {
        window.efNotify({ to: 'admin', title: `Delay reported · #${orderId}`, body: `New proposed date ${newDate} · reason: ${reasonKind}`, urgent: true });
        window.efNotify({ to: 'customer', title: 'Lieferdatum-Anpassung gemeldet', body: `Neuer Termin: ${newDate}. Wir kümmern uns.` });
      }
      setPhase('sent');
    }, 1400);
  };

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${orderId}`, 'Report delay']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Report delay · #{orderId}</h1>
          <div className="page-subtitle">SOP B · dual-channel notification: customer AND kundenservice@efactory1.de — simultaneous</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      {phase === 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="alert-triangle" size={14}/>
            <span><strong>Act immediately.</strong> Per SOP B, you must notify both the customer AND efactory1 simultaneously — not sequentially. Acting late further damages trust.</span>
          </div>
          <div className="kv" style={{ fontSize: 12 }}>
            <div className="kv-row"><dt>Customer</dt><dd>{cust?.name}</dd></div>
            <div className="kv-row"><dt>Original final deadline</dt><dd className="mono">{SS.fmtDate(order.finalDeadline)}, 18:00</dd></div>
            <div className="kv-row"><dt>Order</dt><dd>{SD.WORK_TYPE_LABELS[order.workType]} · {order.pages} pages</dd></div>
          </div>
          <div className="field"><label>Reason</label>
            <select value={reasonKind} onChange={e => setReasonKind(e.target.value)}>
              <option value="illness">Illness (Krankheit)</option>
              <option value="emergency">Personal emergency (Notfall)</option>
              <option value="scope">Scope clarification needed</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field"><label>Brief description (sent verbatim)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Z. B. Akute Erkrankung mit AU bis Freitag — kann den Zwischenstand am Montag liefern." style={{ width: '100%', minHeight: 90, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}/>
            <div className="text-faint fs-11 mt-1">Min. 10 characters · written in German for the customer email.</div>
          </div>
          <div className="field"><label>Proposed new delivery date</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}/>
          </div>
          <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={customerInformed} onChange={e => setCustomerInformed(e.target.checked)}/>
            <span className="fs-12">I have already informed the customer separately (informational; platform sends both notifications regardless)</span>
          </label>
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="zap" size={12}/>
            <span>On submit, two emails fire simultaneously: <code className="mono">{cust?.email}</code> + <code className="mono">kundenservice@efactory1.de</code>. Order moves to <strong>On hold</strong> with new proposed date.</span>
          </div>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={send} style={{ justifyContent: 'center' }}>
            <Icon name="alert-triangle" size={14}/> Send dual notification
          </button>
        </div></div>
      )}

      {phase !== 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span>Sending dual notification — both recipients in parallel.</span>
          </div>
          {[
            { id: 'customer', label: `Email → ${cust?.name} <${cust?.email}>`, body: 'Liebe/r ' + (cust?.name?.split(' ')[0] || 'Kunde') + ', ich muss leider eine Verzögerung melden. Grund: ' + reasonKind + '. Neuer Liefertermin: ' + newDate + '.' },
            { id: 'kundenservice', label: 'Email → kundenservice@efactory1.de', body: `Customer ${cust?.name} · Order #${orderId} · reason ${reasonKind} · new date ${newDate} · customer informed: ${customerInformed ? 'yes' : 'no'}` },
          ].map(e => {
            const sent = sentSteps[e.id];
            return (
              <div key={e.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: sent ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="mail" size={14}/>
                  <span className="fs-12 strong">{e.label}</span>
                  <span style={{ flex: 1 }}/>
                  {sent ? <span className="pill pill-green"><Icon name="check" size={10}/> Sent</span> : <span className="pill pill-blue"><Icon name="zap" size={10}/> Sending…</span>}
                </div>
                <div className="text-muted fs-11" style={{ lineHeight: 1.5 }}>{e.body}</div>
                <div style={{ marginTop: 8, height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: sent ? '100%' : '40%', height: '100%', background: sent ? 'var(--green)' : 'var(--blue)', transition: 'width .6s ease' }}/>
                </div>
              </div>
            );
          })}
          {phase === 'sent' && (
            <div className="banner success">
              <Icon name="check-circle" size={14}/>
              <div>
                <strong>Notification sent.</strong> Order <span className="mono">#{orderId}</span> is now <strong>On hold</strong>. Resume work as soon as you can; tell both parties when you're back on track.
              </div>
            </div>
          )}
          {phase === 'sent' && (
            <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })} style={{ alignSelf: 'flex-start' }}>
              <Icon name="chevron-left" size={14}/> Back to assignment
            </button>
          )}
        </div></div>
      )}
    </div>
  );
}
window.GWReportDelay = GWReportDelay;

// ====================================================================
// GW — Extension Request (SOP 6)
// ====================================================================
function GWExtensionRequest({ orderId, navigate, toast, setFixState }) {
  const order = SD.order(orderId);
  if (!order) return <div className="page">Assignment not found.</div>;
  const [desc, setDesc] = useStateA('');
  const [extraPages, setExtraPages] = useStateA(5);
  const [extraFee, setExtraFee] = useStateA(150);
  const [phase, setPhase] = useStateA('form');

  const valid = desc.trim().length > 15 && extraPages > 0 && extraFee >= 0;

  const submit = () => {
    setPhase('sending');
    setTimeout(() => {
      if (setFixState) {
        setFixState(prev => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), extensionPending: { description: desc, extraPages, extraFee, requestedAt: new Date().toISOString() } } }));
      }
      toast({ text: `Extension request submitted · Berat will review and ask the customer · you'll be notified to proceed`, tone: 'info' });
      setPhase('sent');
    }, 1100);
  };

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${orderId}`, 'Extension']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Request extension · #{orderId}</h1>
          <div className="page-subtitle">SOP 6 · scope expansion · customer must approve + pay before you're paid for the extra work</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      {phase === 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="plus" size={14}/>
            <span><strong>Three-party approval:</strong> you flag → Berat reviews → customer approves + pays the extension first → you do the extra work → upload Zusatzrechnung via Final upload (flagged as extension).</span>
          </div>
          <div className="field"><label>What additional work is needed?</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="z. B. Ergänzung Kapitel 5 (empirische Erhebung) — Customer wants quantitative survey added; ~500 responses analysed in SPSS." style={{ width: '100%', minHeight: 100, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Estimated extra pages</label>
              <input type="number" min="1" value={extraPages} onChange={e => setExtraPages(+e.target.value || 1)}/>
            </div>
            <div className="field"><label>Proposed extra fee (€ net)</label>
              <input type="number" min="0" step="10" value={extraFee} onChange={e => setExtraFee(+e.target.value || 0)}/>
            </div>
          </div>
          <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11.5 }}>
            <Icon name="lock" size={12}/>
            <span>You can <strong>decline</strong> if you don't have capacity — just close this form.</span>
          </div>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={submit} style={{ justifyContent: 'center' }}>
            <Icon name="check" size={14}/> Submit extension request
          </button>
        </div></div>
      )}

      {phase !== 'form' && (
        <div className="card"><div className="card-pad flex-col gap-2">
          <div className="banner success">
            <Icon name="check-circle" size={14}/>
            <span><strong>Extension request submitted.</strong> Berat is notified · he will discuss with the customer · you'll get a green-light notification when approved.</span>
          </div>
          <div className="kv" style={{ fontSize: 12, marginTop: 8 }}>
            <div className="kv-row"><dt>Description</dt><dd>{desc}</dd></div>
            <div className="kv-row"><dt>Extra pages</dt><dd className="mono">{extraPages}</dd></div>
            <div className="kv-row"><dt>Proposed extra fee</dt><dd className="mono" style={{ color: 'var(--green)' }}>{SS.EUR(extraFee)}</dd></div>
          </div>
          <button type="button" className="btn mt-3" onClick={() => navigate('order-detail', { id: orderId })} style={{ alignSelf: 'flex-start' }}>
            <Icon name="chevron-left" size={14}/> Back to assignment
          </button>
        </div></div>
      )}
    </div>
  );
}
window.GWExtensionRequest = GWExtensionRequest;

// ====================================================================
// GW — First-contact wizard (SOP D)
// ====================================================================
function GWFirstContact({ orderId, navigate, toast }) {
  const order = SD.order(orderId);
  if (!order) return <div className="page">Assignment not found.</div>;
  const cust = SD.customer(order.customerId);
  const [step, setStep] = useStateA(1);
  const [confirmed, setConfirmed] = useStateA(false);
  const baseSubject = `Auftrag #${orderId} · ${SD.WORK_TYPE_LABELS[order.workType]} — Erstkontakt`;
  const baseBody = `Hallo ${cust?.name?.split(' ')[0] || ''},

ich freue mich, dass ich Ihren Auftrag übernehmen darf. Kurz zur Bestätigung:

• Thema: ${order.titleTBD ? '„folgt — ich freue mich auf Ihren Vorschlag"' : order.title}
• Umfang: ${order.pages} Seiten · ${order.field}
• Endabgabe: ${SS.fmtDate(order.finalDeadline)}, 18:00 Uhr
${order.interimDeadline ? '• Zwischenstand 1: ' + SS.fmtDate(order.interimDeadline) + ', 18:00 Uhr\n' : ''}
Bitte senden Sie mir noch:
• Ggf. Formatierungs-/Zitierrichtlinie der Hochschule
• Bestehendes Exposé / Gliederung (falls vorhanden)
• Spezifische Wünsche oder Sperrthemen

Wichtig — Bitte beachten:
• Zwischenstand und Endabgabe erhalten Sie ausschließlich über die efactory1-Plattform — niemals direkt von mir.
• Fragen zu Preisen, Raten oder Rechnungen wenden Sie bitte an kundenservice@efactory1.de — diese darf ich nicht beantworten.
• Antwortzeit von meiner Seite: i. d. R. innerhalb von 24 Stunden, Mo–Fr 18–23 Uhr.

Beste Grüße
Isabel Walter`;
  const [subject, setSubject] = useStateA(baseSubject);
  const [body, setBody] = useStateA(baseBody);

  const finishConfirm = () => { setConfirmed(true); setStep(2); toast({ text: 'Receipt confirmed to efactory1 · proceed to customer email', tone: 'success' }); };
  const sendEmail = () => {
    toast({ text: `Email sent to ${cust?.name} · CC kundenservice@efactory1.de`, tone: 'success' });
    setTimeout(() => navigate('order-detail', { id: orderId }), 600);
  };

  return (
    <div className="page" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${orderId}`, 'First contact']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>First contact · #{orderId}</h1>
          <div className="page-subtitle">SOP D · 2 steps: confirm receipt to efactory1 → send pre-filled customer intro email</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      <div className="card mb-3"><div className="card-pad flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
        {[
          { i: 1, label: 'Confirm receipt to efactory1' },
          { i: 2, label: 'Email customer (template)' },
        ].map(s => (
          <div key={s.i} className="flex items-center gap-2" style={{ flex: 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: step > s.i || (step === s.i && step === 2 && confirmed) ? 'var(--green)' : step === s.i ? 'var(--blue)' : 'var(--surface-2)', color: step >= s.i ? 'white' : 'var(--text-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {step > s.i || (s.i === 1 && confirmed) ? <Icon name="check" size={14}/> : <span className="fs-12 strong">{s.i}</span>}
            </div>
            <span className={`fs-12 ${step === s.i ? 'strong' : 'text-faint'}`}>{s.label}</span>
            {s.i === 1 && <div style={{ flex: 1, height: 2, background: confirmed ? 'var(--green)' : 'var(--border)' }}/>}
          </div>
        ))}
      </div></div>

      {step === 1 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span><strong>Step 1 · Confirm receipt.</strong> Reply to the assignment email so Berat knows you've started. The platform records this in the audit log.</span>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
            <div className="fs-11 text-muted mb-1">Reply to: berat@efactory1.de</div>
            <div className="fs-12 strong mb-1">Re: Auftragszuteilung #{orderId}</div>
            <div className="fs-12" style={{ lineHeight: 1.55 }}>
              Auftrag erhalten und bestätigt · ich nehme heute Kontakt zum Kunden auf.<br/>
              Zwischenstand 1 plane ich auf {order.interimDeadline ? SS.fmtDate(order.interimDeadline) : SS.fmtDate(order.finalDeadline)}, vor 18:00 Uhr.<br/>
              Beste Grüße — Isabel
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={finishConfirm} style={{ alignSelf: 'flex-start' }}><Icon name="check" size={14}/> Confirm receipt to efactory1</button>
        </div></div>
      )}

      {step === 2 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="lock" size={14}/>
            <span><strong>Auto-CC enforced.</strong> kundenservice@efactory1.de is in CC. Financial keywords (price, rate, invoice) are intercepted and redirected automatically. Work files never go directly — only via this platform.</span>
          </div>
          <div className="field"><label>To</label><input value={`${cust?.name} <${cust?.email}>`} disabled style={{ background: 'var(--surface-2)' }}/></div>
          <div className="field"><label>CC <span className="text-faint">— enforced, non-removable</span></label><input value="kundenservice@efactory1.de" disabled style={{ background: 'var(--surface-2)' }}/></div>
          <div className="field"><label>Subject</label><input value={subject} onChange={e => setSubject(e.target.value)}/></div>
          <div className="field"><label>Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} style={{ width: '100%', minHeight: 320, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)', lineHeight: 1.55 }}/>
            <div className="text-faint fs-11 mt-1">Template includes: topic confirmation, scope, deadlines, file-flow rule, financial firewall, response SLA.</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={sendEmail} style={{ alignSelf: 'flex-start' }}><Icon name="send" size={14}/> Send email · CC kundenservice@efactory1.de</button>
        </div></div>
      )}
    </div>
  );
}
window.GWFirstContact = GWFirstContact;

// ====================================================================
// GW — Onboarding wizard (form 7880 → platform)
// ====================================================================
function GWOnboarding({ navigate, toast }) {
  const [step, setStep] = useStateA(0);
  const [draft, setDraft] = useStateA({
    firstName: 'Isabel', lastName: 'Walter',
    phone: '+49 ', email: 'isabel.walter@gw.efactory1.de',
    expertise: ['Wirtschaftsinformatik', 'BWL'],
    languages: ['DE', 'EN'],
    avail: 'Mo–Fr 18–23',
    iban: '', taxId: '',
    agbsAccepted: false, contractSigned: false, gdprAccepted: false,
  });
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const steps = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'expertise', label: 'Expertise', icon: 'feather' },
    { id: 'banking', label: 'Banking', icon: 'wallet' },
    { id: 'agbs', label: 'AGB & contract', icon: 'file-text' },
    { id: 'done', label: 'Submit', icon: 'check-circle' },
  ];
  const canNext = (() => {
    if (step === 0) return draft.firstName && draft.lastName && draft.phone.length > 5;
    if (step === 1) return draft.expertise.length > 0 && draft.languages.length > 0;
    if (step === 2) return draft.iban.length >= 6 && draft.taxId.length >= 6;
    if (step === 3) return draft.agbsAccepted && draft.contractSigned && draft.gdprAccepted;
    return true;
  })();
  const finish = () => {
    toast({ text: 'Onboarding submitted · Berat will review · confirmation email follows when approved', tone: 'success' });
    setTimeout(() => navigate('gw-profile'), 600);
  };
  const expTags = ['BWL','Marketing','Personal','VWL','Wirtschaftsinformatik','Informatik','ML','Soziologie','Pädagogik','Jura','Mode','Statistik','Maschinenbau','Bauingenieurwesen','Psychologie','Medizin','Architektur'];
  const langTags = ['DE','EN','FR','TR','ES','SR','RU','IT'];

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome — onboarding</h1>
          <div className="page-subtitle">5 steps · replaces /ghostwriter-onboarding/ form 7880</div>
        </div>
      </div>

      <div className="card mb-3"><div className="card-pad flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2" style={{ flex: 1, minWidth: 100 }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: step > i ? 'var(--green)' : step === i ? 'var(--blue)' : 'var(--surface-2)', color: step >= i ? 'white' : 'var(--text-3)', display: 'grid', placeItems: 'center' }}>
              {step > i ? <Icon name="check" size={12}/> : <span className="fs-11 strong">{i+1}</span>}
            </div>
            <span className={`fs-11 ${step === i ? 'strong' : 'text-faint'}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > i ? 'var(--green)' : 'var(--border)' }}/>}
          </div>
        ))}
      </div></div>

      {step === 0 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>First name</label><input value={draft.firstName} onChange={e => set('firstName', e.target.value)}/></div>
            <div className="field"><label>Last name</label><input value={draft.lastName} onChange={e => set('lastName', e.target.value)}/></div>
            <div className="field"><label>Email</label><input value={draft.email} onChange={e => set('email', e.target.value)}/></div>
            <div className="field"><label>Phone</label><input value={draft.phone} onChange={e => set('phone', e.target.value)}/></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Availability hours</label><input value={draft.avail} onChange={e => set('avail', e.target.value)} placeholder="Mo–Fr 18–23"/></div>
          </div>
        </div></div>
      )}

      {step === 1 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div>
            <div className="text-faint fs-11 mb-2">Expertise tags <span className="text-faint">— Berat assigns based on these</span></div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {expTags.map(t => {
                const on = draft.expertise.includes(t);
                return <button type="button" key={t} className={`chip ${on ? 'active' : ''}`} onClick={() => set('expertise', on ? draft.expertise.filter(x => x !== t) : [...draft.expertise, t])}>{t}</button>;
              })}
            </div>
          </div>
          <div>
            <div className="text-faint fs-11 mb-2">Languages</div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {langTags.map(t => {
                const on = draft.languages.includes(t);
                return <button type="button" key={t} className={`chip ${on ? 'active' : ''}`} onClick={() => set('languages', on ? draft.languages.filter(x => x !== t) : [...draft.languages, t])}>{t}</button>;
              })}
            </div>
          </div>
        </div></div>
      )}

      {step === 2 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="lock" size={12}/>
            <span>Banking is encrypted at rest · used only for SEPA payouts every Friday after the release gate clears.</span>
          </div>
          <div className="field"><label>IBAN</label><input value={draft.iban} onChange={e => set('iban', e.target.value)} placeholder="DE…"/></div>
          <div className="field"><label>Tax ID (Steuernummer)</label><input value={draft.taxId} onChange={e => set('taxId', e.target.value)} placeholder="XX/XXX/XXXXX"/></div>
          <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11.5 }}>
            <Icon name="zap" size={12}/>
            <span><strong>Honorar invoice address (always):</strong> Bery Ventures GmbH · c/o WeWork Friesenplatz 4 · 50672 Köln</span>
          </div>
        </div></div>
      )}

      {step === 3 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="alert-triangle" size={14}/>
            <span>You'll re-confirm key clauses on every job claim. These are the foundational terms.</span>
          </div>
          {[
            { k: 'agbsAccepted', l: 'AGB v3.2 (effective 01.04.2026) — kill-fee schedule, confidentiality, response SLA' },
            { k: 'contractSigned', l: 'Werkvertrag (Individual-Werk) — freelance, not employment · GW responsible for own taxes & invoicing' },
            { k: 'gdprAccepted', l: 'GDPR — confidential customer data · delete after assignment completion' },
          ].map(c => (
            <label key={c.k} className="flex items-start gap-2" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: draft[c.k] ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
              <input type="checkbox" checked={draft[c.k]} onChange={e => set(c.k, e.target.checked)} style={{ marginTop: 2 }}/>
              <span className="fs-12">{c.l}</span>
            </label>
          ))}
        </div></div>
      )}

      {step === 4 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner success">
            <Icon name="check-circle" size={14}/>
            <div><strong>Ready to submit.</strong> Berat reviews onboarding within ~24h · you'll receive a confirmation email when approved · jobs from the board will start matching your expertise tags.</div>
          </div>
          <div className="kv" style={{ fontSize: 12 }}>
            <div className="kv-row"><dt>Name</dt><dd>{draft.firstName} {draft.lastName}</dd></div>
            <div className="kv-row"><dt>Expertise</dt><dd>{draft.expertise.join(', ')}</dd></div>
            <div className="kv-row"><dt>Languages</dt><dd>{draft.languages.join(', ')}</dd></div>
            <div className="kv-row"><dt>Banking</dt><dd className="mono">{draft.iban.slice(0, 4)}•••• · Tax {draft.taxId.slice(0, 3)}•••</dd></div>
            <div className="kv-row"><dt>AGB / Werkvertrag / GDPR</dt><dd><span className="pill pill-green"><Icon name="check" size={10}/> All accepted</span></dd></div>
          </div>
        </div></div>
      )}

      <div className="flex justify-between mt-3">
        <button type="button" className="btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}><Icon name="chevron-left" size={14}/> Back</button>
        {step < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext}>Continue <Icon name="chevron-right" size={14}/></button>
        ) : (
          <button type="button" className="btn btn-success" onClick={finish}><Icon name="check" size={14}/> Submit onboarding</button>
        )}
      </div>
    </div>
  );
}
window.GWOnboarding = GWOnboarding;

})();
