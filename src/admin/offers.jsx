// Admin · Offers / Sevdesk — generate offers and invoices.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ====================================================================
function OffersPage({ navigate, toast }) {
  const [tab, setTab] = useStateA('all');
  const [genFor, setGenFor] = useStateA(null); // order id while wizard open

  // Source: every order with status qualified | offer_sent | invoice_sent | paid+
  const allEffective = window.EFHooks.useOrders();
  const offerable = allEffective.filter(o => ['qualified','offer_sent','invoice_sent'].includes(o.status));
  const accepted = allEffective.filter(o => !['qualified','offer_sent','invoice_sent','lead','cancelled','bye'].includes(o.status));

  const offerRows = (() => {
    const rows = offerable.map(o => ({
      id: 'AN-2026-' + String(o.id).padStart(4, '0'),
      orderId: o.id,
      customer: D.customer(o.customerId),
      workType: o.workType,
      grossEur: o.grossEur,
      status: o.status === 'qualified' ? 'draft' : o.status === 'offer_sent' ? 'sent' : o.status === 'invoice_sent' ? 'accepted_invoice' : 'sent',
      sentAt: o.acceptedAt,
    }));
    return rows;
  })();

  const filtered = tab === 'all' ? offerRows
    : tab === 'drafts' ? offerRows.filter(r => r.status === 'draft')
    : tab === 'sent' ? offerRows.filter(r => r.status === 'sent')
    : tab === 'accepted' ? accepted.map(o => ({
        id: 'AN-2026-' + String(o.id).padStart(4, '0'),
        orderId: o.id,
        customer: D.customer(o.customerId),
        workType: o.workType,
        grossEur: o.grossEur,
        status: 'accepted',
        sentAt: o.acceptedAt,
      }))
    : offerRows.filter(r => r.status === 'rejected');

  const generate = (orderId) => setGenFor(orderId);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Offers / Sevdesk']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Offers · Sevdesk</h1>
          <div className="page-subtitle">Angebot drafts → sent → accepted (auto-creates Rechnung + Stripe link) · sync {U.relTime('2026-05-07T13:18:00')}</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('orders')}><Icon name="package" size={14}/> Open Orders</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Open offers</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{offerRows.filter(r => r.status === 'sent').length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Drafts</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{offerRows.filter(r => r.status === 'draft').length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Pending invoice payment</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--amber)', marginTop: 4 }}>{offerRows.filter(r => r.status === 'accepted_invoice').length}</div>
        </div>
        <div className="card" style={{ padding: 14, border: '1px solid color-mix(in oklab, var(--green) 30%, var(--border))' }}>
          <div className="text-faint fs-11">Accepted (Won)</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{accepted.length}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {[['all','All'],['drafts','Drafts'],['sent','Sent'],['accepted','Accepted']].map(([v,l]) => (
          <button key={v} type="button" className={`chip ${tab===v?'active':''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} rows</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr><th>Sevdesk ID</th><th>Order</th><th>Customer</th><th>Type</th><th className="num">Gross</th><th>Status</th><th>Last activity</th><th></th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: r.orderId })}>
                <td className="mono fs-12">{r.id}</td>
                <td className="mono">#{r.orderId}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar initials={r.customer?.initials || '··'} size={24}/>
                    <span className="fs-12">{r.customer?.name || '—'}</span>
                  </div>
                </td>
                <td className="text-muted">{D.WORK_TYPE_LABELS[r.workType] || r.workType}</td>
                <td className="num mono">{U.EUR(r.grossEur || 0)}</td>
                <td>
                  {r.status === 'draft' && <span className="pill pill-slate">Draft</span>}
                  {r.status === 'sent' && <span className="pill pill-blue">Sent · awaiting accept</span>}
                  {r.status === 'accepted_invoice' && <span className="pill pill-amber">Invoice sent · awaiting payment</span>}
                  {r.status === 'accepted' && <span className="pill pill-green">Accepted · Won</span>}
                </td>
                <td className="text-faint fs-11">{r.sentAt ? U.fmtDate(r.sentAt) : '—'}</td>
                <td className="num">
                  {r.status === 'draft' && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); generate(r.orderId); }}>
                      <Icon name="zap" size={12}/> Generate offer
                    </button>
                  )}
                  {r.status === 'sent' && (
                    <button type="button" className="btn btn-sm" onClick={e => { e.stopPropagation(); toast && toast({ text: `Resent Angebot ${r.id} via Sevdesk · sendViaEmail`, tone: 'success' }); }}>
                      <Icon name="mail" size={12}/> Resend
                    </button>
                  )}
                  {r.status === 'accepted_invoice' && (
                    <button type="button" className="btn btn-sm" onClick={e => { e.stopPropagation(); toast && toast({ text: `Dunning email sent · Stripe link refreshed`, tone: 'info' }); }}>
                      <Icon name="alert-triangle" size={12}/> Chase
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11.5, marginTop: 16 }}>
        <Icon name="zap" size={12}/>
        <span>Endpoints used: <code className="mono">POST /Order/Factory/saveOrder</code> (proposal), <code className="mono">/Order/:id/sendViaEmail</code> (send), <code className="mono">/Invoice/Factory/createInvoiceFromOrder</code> (on accept), <code className="mono">/Invoice/:id/sendViaEmail</code> (send invoice with Stripe link).</span>
      </div>

      {genFor && (
        <GenerateOfferModal orderId={genFor} toast={toast} onClose={() => setGenFor(null)}/>
      )}
    </div>
  );
}
window.OffersPage = OffersPage;

function GenerateOfferModal({ orderId, toast, onClose }) {
  const order = window.EFHooks.useOrder(orderId);
  const cust = D.customer(order.customerId);
  const [phase, setPhase] = useStateA('preview'); // preview → sending → sent
  const [progress, setProgress] = useStateA([
    { label: 'Verifying Sevdesk Contact', done: false, running: false },
    { label: 'POST /Order/Factory/saveOrder · pricing engine', done: false, running: false },
    { label: 'Generating PDF', done: false, running: false },
    { label: 'POST /Order/:id/sendViaEmail · to ' + (cust?.email || 'customer'), done: false, running: false },
    { label: 'PATCH Pipedrive deal → Rückmeldung', done: false, running: false },
  ]);

  const send = () => {
    setPhase('sending');
    progress.forEach((_, i) => {
      setTimeout(() => setProgress(p => p.map((s, j) => j < i ? { ...s, done: true, running: false } : j === i ? { ...s, running: true } : s)), i * 600);
      setTimeout(() => setProgress(p => p.map((s, j) => j <= i ? { ...s, done: true, running: false } : s)), (i + 1) * 600);
    });
    setTimeout(() => {
      setPhase('sent');
      window.EFActions.orders.patch(orderId, { status: 'offer_sent' });
      toast && toast({ text: `Angebot AN-2026-${String(orderId).padStart(4, '0')} sent · Pipedrive Rückmeldung`, tone: 'success' });
    }, progress.length * 600 + 200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Generate Sevdesk Angebot · #{orderId}</div>
            <div className="text-faint fs-11 mt-1">Pricing engine · email send · Pipedrive sync · all in one click</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          {phase === 'preview' && (
            <div className="flex-col gap-3">
              <div className="kv" style={{ fontSize: 12 }}>
                <div className="kv-row"><dt>Customer</dt><dd>{cust?.name} · <span className="mono">{cust?.email}</span></dd></div>
                <div className="kv-row"><dt>Work</dt><dd>{D.WORK_TYPE_LABELS[order.workType]} · {order.pages} p · {order.field}</dd></div>
                <div className="kv-row"><dt>Final deadline</dt><dd className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</dd></div>
                <div className="kv-row"><dt>Gross (Brutto)</dt><dd className="mono strong">{U.EUR(order.grossEur)}</dd></div>
                <div className="kv-row"><dt>VAT 7%</dt><dd className="mono text-muted">−{U.EUR(order.grossEur * 0.07 / 1.07)}</dd></div>
                <div className="kv-row"><dt>Net</dt><dd className="mono">{U.EUR(order.grossEur / 1.07)}</dd></div>
              </div>
              <div className="banner info" style={{ fontSize: 11.5 }}>
                <Icon name="lock" size={12}/>
                <span>Angebot is a legal Rechnung-Vorbereitung. On accept → invoice auto-created via <code className="mono">/Invoice/Factory/createInvoiceFromOrder</code>.</span>
              </div>
            </div>
          )}
          {phase !== 'preview' && (
            <div className="flex-col gap-2">
              {progress.map((s, i) => (
                <div key={i} className="flex items-center gap-2" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: s.done ? 'color-mix(in oklab, var(--green) 4%, var(--surface))' : 'var(--surface)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: s.done ? 'var(--green)' : s.running ? 'var(--blue)' : 'var(--surface-2)', color: s.done || s.running ? 'white' : 'var(--text-3)', display: 'grid', placeItems: 'center' }}>
                    {s.done ? <Icon name="check" size={11}/> : s.running ? <Icon name="zap" size={11}/> : <Icon name="dot" size={6}/>}
                  </div>
                  <span className="fs-12">{s.label}</span>
                  {s.running && <span className="text-faint fs-11" style={{ marginLeft: 'auto' }}>working…</span>}
                </div>
              ))}
              {phase === 'sent' && (
                <div className="banner success mt-2"><Icon name="check-circle" size={14}/><span>Angebot sent · order moved to <strong>Offer Sent</strong> · Pipedrive deal in <strong>Rückmeldung</strong>.</span></div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {phase === 'preview' ? (
            <>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={send}><Icon name="zap" size={14}/> Generate & send via Sevdesk</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1 }}/>
              <button type="button" className="btn" onClick={onClose} disabled={phase === 'sending'}>{phase === 'sent' ? 'Done' : 'Working…'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
window.GenerateOfferModal = GenerateOfferModal;

window.OffersPage = OffersPage;
window.GenerateOfferModal = GenerateOfferModal;
})();
