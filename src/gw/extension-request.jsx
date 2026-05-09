// GW · Extension request — formal extension to admin for approval.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ====================================================================
// GW — Extension Request (SOP 6)
// ====================================================================
function GWExtensionRequest({ orderId, navigate, toast }) {
  const order = D.order(orderId);
  if (!order) return <div className="page">Assignment not found.</div>;
  const [desc, setDesc] = useStateA('');
  const [extraPages, setExtraPages] = useStateA(5);
  const [extraFee, setExtraFee] = useStateA(150);
  const [phase, setPhase] = useStateA('form');

  const valid = desc.trim().length > 15 && extraPages > 0 && extraFee >= 0;

  const submit = () => {
    setPhase('sending');
    setTimeout(() => {
      window.EFActions.gw.requestExtension(orderId, { description: desc, extraPages, extraFee });
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
            <div className="kv-row"><dt>Proposed extra fee</dt><dd className="mono" style={{ color: 'var(--green)' }}>{U.EUR(extraFee)}</dd></div>
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

window.GWExtensionRequest = GWExtensionRequest;
})();
