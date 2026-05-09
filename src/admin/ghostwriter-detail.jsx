// Admin · Ghostwriter detail — assignments, ratings, AGB, payments.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ====================================================================
function GhostwriterDetail({ gwId, navigate, toast }) {
  const g = window.EFHooks.useGw(gwId);
  const allOrders = window.EFHooks.useOrders({ gwId });
  if (!g) return <div className="page">Ghostwriter not found.</div>;
  const orders = allOrders.filter(o => o.gwId === gwId);
  const active = orders.filter(o => !['completed','cancelled','bye'].includes(o.status));
  const completed = orders.filter(o => o.status === 'completed');
  const honorTotal = orders.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const releasable = orders.filter(o => o.gwPaymentStatus === 'invoice_received').reduce((s, o) => s + (o.netHonorarium || 0), 0);

  const [shadowToggle, setShadowToggle] = useStateA(g.banned || false);
  const [reason, setReason] = useStateA(g.banReason || '');
  const applyShadowBan = () => {
    window.EFActions.gws.shadowBan(gwId, { banned: shadowToggle, reason: reason || 'Quality concerns' });
    toast && toast({ text: shadowToggle ? `${g.name} shadow-banned · email alerts paused` : `${g.name} reinstated · email alerts resumed`, tone: shadowToggle ? 'danger' : 'success' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Ghostwriters', g.name]}/>
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar initials={g.initials} size={36} tone={g.banned ? 'red' : 'neutral'}/>
            <span>{g.name}</span>
            {g.banned && <span className="pill pill-red">Shadow-banned</span>}
            {g.isOwner && <span className="pill pill-blue">Owner</span>}
          </h1>
          <div className="page-subtitle"><span className="mono">{g.email}</span> · {g.phone || '—'} · ★ {g.rating?.toFixed(1) || '—'} · {Math.round((g.onTime || 0) * 100)}% on-time · {g.lifetime || 0} lifetime</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('ghostwriters')}><Icon name="chevron-left" size={14}/> Back</button>
          <NotReady className="btn" feature="whatsapp"><Icon name="message-square" size={14}/> WhatsApp</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Active jobs</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{active.length}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Completed</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{completed.length}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Total honorar paid</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{U.EUR(honorTotal)}</div></div>
            <div className="card" style={{ padding: 14, border: releasable > 0 ? '1px solid color-mix(in oklab, var(--green) 30%, var(--border))' : undefined }}><div className="text-faint fs-11">Friday releasable</div><div className="mono strong" style={{ fontSize: 22, color: releasable > 0 ? 'var(--green)' : 'var(--text)', marginTop: 4 }}>{U.EUR(releasable)}</div></div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Expertise</div></div>
            <div className="card-pad flex gap-2" style={{ flexWrap: 'wrap' }}>
              {(g.expertise || []).map(e => <span key={e} className="pill pill-blue">{e}</span>)}
              <span className="pill pill-slate">Languages: {(g.languages || []).join(', ')}</span>
              {g.rate != null && <span className="pill pill-slate">Default rate: {Math.round(g.rate * 100)}%</span>}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Active assignments ({active.length})</div></div>
            <div className="card-pad" style={{ padding: 0 }}>
              {active.length === 0 && <div className="text-faint fs-12" style={{ padding: 16 }}>No active assignments.</div>}
              {active.length > 0 && (
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>ID</th><th>Status</th><th>Title</th><th className="num">Honorar</th><th>Final</th></tr></thead>
                  <tbody>
                    {active.map(o => (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: o.id })}>
                        <td className="mono"><strong>#{o.id}</strong></td>
                        <td><StatusPill status={o.status}/></td>
                        <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</td>
                        <td className="num mono" style={{ color: 'var(--green)' }}>{U.EUR(o.netHonorarium)}</td>
                        <td className="mono fs-11">{U.fmtDate(o.finalDeadline)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Quality stats</div></div>
            <div className="card-pad">
              <div className="kv" style={{ fontSize: 12 }}>
                <div className="kv-row"><dt>On-time delivery</dt><dd className="mono"><span style={{ color: g.onTime >= 0.95 ? 'var(--green)' : g.onTime >= 0.85 ? 'var(--text)' : 'var(--red)' }}>{Math.round((g.onTime || 0) * 100)}%</span></dd></div>
                <div className="kv-row"><dt>Avg customer rating</dt><dd className="mono">★ {g.rating?.toFixed(1) || '—'}</dd></div>
                <div className="kv-row"><dt>Avg revision rounds</dt><dd className="mono">{(orders.reduce((s, o) => s + (o.revisionRounds || 0), 0) / Math.max(1, orders.length)).toFixed(1)}</dd></div>
                <div className="kv-row"><dt>AGB version signed</dt><dd className="mono">{g.agbsVersion || '—'} · {g.agbsAt ? U.fmtDate(g.agbsAt) : '—'}</dd></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-3">
          <div className="card" style={{ borderColor: shadowToggle ? 'color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
            <div className="card-head"><div className="card-title">Shadow-ban</div></div>
            <div className="card-pad flex-col gap-2">
              <div className="text-muted fs-11" style={{ lineHeight: 1.6 }}>
                Silently stops email alerts about new jobs. The board still loads if visited directly. Use for poor-quality or unreliable GWs.
              </div>
              <label className="flex items-center gap-2" style={{ cursor: 'pointer', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
                <input type="checkbox" checked={shadowToggle} onChange={e => setShadowToggle(e.target.checked)}/>
                <span className="fs-12">Shadow-ban this GW</span>
              </label>
              {shadowToggle && (
                <div className="field"><label>Reason (admin-only, never shown to GW)</label>
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Quality declining last 3 jobs"/>
                </div>
              )}
              <button type="button" className="btn btn-sm" onClick={applyShadowBan} style={{ background: shadowToggle ? 'color-mix(in oklab, var(--red) 12%, var(--surface))' : undefined, borderColor: shadowToggle ? 'var(--red)' : undefined, color: shadowToggle ? 'var(--red)' : undefined }}>
                <Icon name={shadowToggle ? 'eye' : 'check'} size={12}/> {shadowToggle ? 'Apply shadow-ban' : 'Reinstate'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Banking</div><span className="pill pill-green" style={{ fontSize: 10 }}><Icon name="check" size={9}/> Verified</span></div>
            <div className="card-pad fs-12">
              <div className="kv">
                <div className="kv-row"><dt>IBAN</dt><dd className="mono">{g.iban || 'DE•• •••• •••• •••• ••••'}</dd></div>
                <div className="kv-row"><dt>Tax ID</dt><dd className="mono">{g.taxId || '••/•••/•••••'}</dd></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Private notes</div></div>
            <div className="card-pad">
              <textarea placeholder="Internal notes only — never shown to the GW." style={{ width: '100%', minHeight: 80, border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 11.5, resize: 'vertical', background: 'var(--surface)' }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.GhostwriterDetail = GhostwriterDetail;

window.GhostwriterDetail = GhostwriterDetail;
})();
