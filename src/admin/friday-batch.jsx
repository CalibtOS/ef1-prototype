// Admin · Friday payout batch — gates eligible orders and runs DATEV export.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ FRIDAY BATCH ============
function FridayBatch({ navigate, toast }) {
  const batch = window.EFHooks.useFridayBatch();
  const releaseable = batch.releaseable;
  const blocked = batch.blocked;
  const [selected, setSelected] = useStateA(() => new Set(releaseable.map(o => o.id)));
  const [running, setRunning] = useStateA(false);
  const [done, setDoneState] = useStateA(false);
  // Snapshot the batch the moment it's released, so the audit preview keeps
  // showing what was actually released even after orders move to 'completed'.
  const [releasedSnapshot, setReleasedSnapshot] = useStateA([]);
  const [runningTargets, setRunningTargets] = useStateA([]);
  // Per-row payout state for cascade animation: 'sending' | 'paid'
  const [rowState, setRowState] = useStateA({});

  const total = releaseable.filter(o => selected.has(o.id)).reduce((s,o) => s + o.netHonorarium, 0);
  const visibleReleaseable = (running || done) ? runningTargets : releaseable;

  const toggle = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const runBatch = () => {
    setRunning(true);
    const targets = releaseable.filter(o => selected.has(o.id));
    setRunningTargets(targets);
    const snapshot = targets.map(o => ({ id: o.id, amount: o.netHonorarium }));
    // Cascade: ~250ms per row → "sending" then "paid"
    targets.forEach((o, i) => {
      const start = 200 + i * 220;
      setTimeout(() => setRowState(p => ({ ...p, [o.id]: 'sending' })), start);
      setTimeout(() => {
        setRowState(p => ({ ...p, [o.id]: 'paid' }));
        window.EFActions.payments.releaseBatch([o.id]);
      }, start + 320);
    });
    const totalDur = 200 + targets.length * 220 + 400;
    setTimeout(() => {
      setRunning(false);
      setDoneState(true);
      setReleasedSnapshot(snapshot);
      toast({ text: `${snapshot.length} payments released · ${U.EUR(snapshot.reduce((s,x)=>s+x.amount,0))} via SEPA · Sevdesk receipts queued`, tone: 'success' });
    }, totalDur);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin','Friday Batch · 08.05.2026']} />
          <h1 className="page-title" style={{ marginTop: 6 }}>Friday Payment Batch <span className="text-faint" style={{ fontWeight: 400, fontSize: 14 }}>· KW 19, 08.05.2026</span></h1>
          <div className="page-subtitle">{releaseable.length} ready · {blocked.length} blocked · {U.EUR(total)} to release · cutoff 17:00 today</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => toast({ text: 'DATEV CSV exported · /exports/2026-05-08-honoraries.csv', tone: 'success' })}><Icon name="download" size={14}/> Export DATEV CSV</button>
          {!done && <button type="button" className="btn btn-success" disabled={running || selected.size === 0} onClick={runBatch}>
            {running ? <><Icon name="zap" size={14}/> Releasing…</> : <><Icon name="wallet" size={14}/> Release {selected.size} · {U.EUR(total)}</>}
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
              {visibleReleaseable.map(o => {
                  const gw = D.gw(o.gwId);
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
                      <td className="num mono strong" style={{ color: 'var(--green)' }}>{U.EUR(o.netHonorarium)}</td>
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
            {blocked.map(({ order: o, gates }) => {
              const gw = D.gw(o.gwId);
              const mainReason = gates.reasons.find(r => r !== 'Order is not awaiting Friday release') || gates.reasons[0];
              const reasonKey = String(mainReason || '').toLowerCase();
              const reasonLabel = o.status === 'ai_violation_review'
                ? 'AI violation'
                : o.status === 'plagiarism_violation_review'
                  ? 'Plagiarism flag'
                  : reasonKey.includes('installment')
                    ? 'Installment blocked'
                    : reasonKey.includes('gw invoice')
                      ? 'GW invoice missing'
                    : reasonKey.includes('customer')
                      ? 'Customer gate'
                      : reasonKey.includes('quality')
                        ? 'QA gate'
                        : 'Release blocked';
              return (
                <div key={o.id} className="card-pad" style={{ border: '1px solid color-mix(in oklab, var(--red) 30%, var(--border))', borderRadius: 8, background: 'color-mix(in oklab, var(--red) 3%, var(--surface))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="mono strong">#{o.id}</span>
                    <span className="pill pill-red">{reasonLabel}</span>
                    <span style={{ flex: 1 }}/>
                    <span className="mono fs-12">{U.EUR(o.netHonorarium)}</span>
                  </div>
                  <div className="fs-11 text-muted">{gw?.name || '—'} · {mainReason || 'Release gate blocked'}</div>
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

window.FridayBatch = FridayBatch;
})();
