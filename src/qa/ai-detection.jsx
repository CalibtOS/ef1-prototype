// QA · AI detection — GPTZero per-paragraph analysis.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ QA AI DETECTION ============
// Q-05: deterministic per-paragraph AI risk distribution.
// High overall score → cluster of high-risk paragraphs at the offending sections;
// review-tier scores get a few amber outliers; clean docs stay green with mild noise.
function buildParaRisks(detection) {
  const total = detection.totalParas;
  const out = [];
  const tag = detection.kind === 'interim_1' ? 'Einleitung'
    : detection.kind === 'interim_2' ? 'Hauptteil'
    : detection.kind === 'revision' ? 'Überarbeitung'
    : 'Kapitel';
  const labels = ['Einleitung','Theoretischer Rahmen','Methodik','Empirische Erhebung','Auswertung','Diskussion','Schlussfolgerung','Limitationen','Ausblick','Anhang'];
  for (let i = 0; i < total; i++) {
    let risk;
    const seed = (detection.orderId * 7 + i * 13) % 17;
    if (detection.status === 'violation') {
      // Heavy AI: most paragraphs above 50%, with sharp peaks
      const isHotSpot = (i % 3 === 1) || (i >= total - 3);
      risk = isHotSpot ? Math.min(98, 70 + seed) : Math.min(94, 45 + seed * 2);
    } else if (detection.status === 'review') {
      risk = (i % 5 === 2) ? 25 + seed : 4 + (seed % 9);
    } else {
      risk = 2 + (seed % 11);
    }
    out.push({
      idx: i + 1,
      label: labels[i] || `${tag} §${i+1}`,
      risk,
      preview: risk >= 70
        ? 'Es ist wichtig zu beachten, dass diese komplexe Thematik vielschichtige Aspekte umfasst, die einer differenzierten Betrachtung bedürfen…'
        : risk >= 30
        ? 'Die Untersuchung zeigt teilweise stilistisch homogene Strukturen, die einer manuellen Prüfung empfohlen werden.'
        : 'Natürliche Satzlänge, idiosynkratische Phrasierung — konsistent mit dem GW-Stilcluster.',
    });
  }
  return out;
}

function QAAIDetection({ navigate }) {
  const detections = [
    { id: 'a1', orderId: 3517, gwName: 'Anna König', gwInitials: 'AK', kind: 'final_work', score: 87, status: 'violation', flaggedParas: 18, totalParas: 22, urgent: true, scannedAt: '2026-05-06T08:12:00', topSig: 'Token entropy + GPT-4 burstiness signature' },
    { id: 'a2', orderId: 3514, gwName: 'Dr. Henrik Vogel', gwInitials: 'HV', kind: 'final_work', score: 4, status: 'passed', flaggedParas: 1, totalParas: 88, scannedAt: '2026-05-07T11:40:00' },
    { id: 'a3', orderId: 3530, gwName: 'Felix Becker', gwInitials: 'FB', kind: 'final_work', score: 11, status: 'passed', flaggedParas: 5, totalParas: 42, scannedAt: '2026-05-07T09:20:00' },
    { id: 'a4', orderId: 3508, gwName: 'Maja Petrović', gwInitials: 'MP', kind: 'interim_2', score: 18, status: 'review', flaggedParas: 4, totalParas: 28, scannedAt: '2026-05-06T16:25:00' },
    { id: 'a5', orderId: 3520, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'interim_1', score: 7, status: 'passed', flaggedParas: 1, totalParas: 18, scannedAt: '2026-05-06T14:55:00' },
    { id: 'a6', orderId: 3540, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'final_work', score: 12, status: 'passed', flaggedParas: 2, totalParas: 12, scannedAt: '2026-04-26T15:32:00' },
  ];

  const [expandedId, setExpandedId] = useStateA('a1');
  const [rescanning, setRescanning] = useStateA(false);
  const [rescanProgress, setRescanProgress] = useStateA(0);

  const rescan = () => {
    if (rescanning) return;
    setRescanning(true);
    setRescanProgress(0);
    const total = 24;
    let step = 0;
    const tick = () => {
      step += 1;
      setRescanProgress(Math.round(step * (100 / total)));
      if (step >= total) {
        setRescanning(false);
      } else {
        setTimeout(tick, 100);
      }
    };
    setTimeout(tick, 100);
  };

  const violations = detections.filter(d => d.status === 'violation');
  const review = detections.filter(d => d.status === 'review');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['QA', 'AI Detection']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>AI Detection</h1>
          <div className="page-subtitle">GPTZero per-paragraph score · AI use is a fraud violation per AGB v3.2 §5</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="export-csv" label="AI detection export"><Icon name="download" size={14}/> Export</NotReady>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="banner danger mb-3">
          <Icon name="alert-triangle" size={16}/>
          <div style={{ flex: 1 }}>
            <strong>🚨 {violations.length} active violation</strong> · GW <strong>{violations[0].gwName}</strong> on Order #{violations[0].orderId} (AI score {violations[0].score}%).
            GW auto-shadow-banned. All pending payments blocked. Reassignment required.
          </div>
          <button className="btn btn-sm" onClick={() => navigate('order-detail', { id: violations[0].orderId })}>Open order</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14, border: violations.length > 0 ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Violations (≥30%)</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--red)', marginTop: 4 }}>{violations.length}</div>
          <div className="text-faint fs-11 mt-1">Auto-shadow-ban triggered</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Needs review (15–29%)</div>
          <div className="mono strong" style={{ fontSize: 22, color: review.length ? 'var(--amber)' : 'var(--text)', marginTop: 4 }}>{review.length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Clean (&lt;15%)</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>{detections.filter(d => d.status === 'passed').length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Ghostwriter</th>
              <th>Submission</th>
              <th className="num">AI Score</th>
              <th className="num">Flagged paragraphs</th>
              <th>Status</th>
              <th>Scanned</th>
            </tr>
          </thead>
          <tbody>
            {detections.map(d => {
              const isOpen = expandedId === d.id;
              const paras = isOpen ? buildParaRisks(d) : null;
              return (
                <React.Fragment key={d.id}>
                  <tr style={{ cursor: 'pointer', background: isOpen ? 'var(--surface-2)' : (d.urgent ? 'color-mix(in oklab, var(--red) 4%, transparent)' : undefined) }} onClick={() => setExpandedId(isOpen ? null : d.id)}>
                    <td className="mono">
                      <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={11} className="text-faint" style={{ marginRight: 4 }}/>
                      #{d.orderId}{d.urgent && ' 🚨'}
                    </td>
                    <td><div className="flex items-center gap-2"><Avatar initials={d.gwInitials} size={24} tone={d.status==='violation'?'red':'neutral'}/><span className="fs-12">{d.gwName}</span></div></td>
                    <td><span className="pill pill-blue" style={{ textTransform: 'capitalize' }}>{d.kind.replace('_', ' ')}</span></td>
                    <td className="num mono">
                      <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
                        <div style={{ width: 60, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${d.score}%`, height: '100%', background: d.score < 15 ? 'var(--green)' : d.score < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                        </div>
                        <span className="strong" style={{ color: d.score < 15 ? 'var(--green)' : d.score < 30 ? 'var(--amber)' : 'var(--red)', minWidth: 36, textAlign: 'right' }}>{d.score}%</span>
                      </div>
                    </td>
                    <td className="num mono text-muted">{d.flaggedParas} / {d.totalParas}</td>
                    <td>
                      {d.status === 'passed' && <span className="pill pill-green">Clean</span>}
                      {d.status === 'review' && <span className="pill pill-amber">Review</span>}
                      {d.status === 'violation' && <span className="pill pill-red">🚨 Violation</span>}
                    </td>
                    <td className="text-faint fs-11 mono">{U.relTime(d.scannedAt)}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, background: 'var(--surface-2)' }}>
                        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
                            <strong className="fs-13">Per-paragraph AI score</strong>
                            <span className="text-faint fs-11">{d.totalParas} paragraphs · top signature: {d.topSig || 'mixed'}</span>
                            <span style={{ flex: 1 }}/>
                            <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); rescan(); }} disabled={rescanning}>
                              <Icon name={rescanning ? 'loader' : 'zap'} size={12}/> {rescanning ? `Re-scanning… ${rescanProgress}%` : 'Re-run AI detector'}
                            </button>
                            <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); navigate('order-detail', { id: d.orderId }); }}>
                              <Icon name="external-link" size={12}/> Open order
                            </button>
                          </div>
                          {rescanning && (
                            <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                              <div style={{ width: `${rescanProgress}%`, height: '100%', background: 'var(--blue)', transition: 'width 100ms linear' }}/>
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {paras.map(p => (
                              <div key={p.idx} className="card" style={{
                                padding: 10,
                                borderColor: p.risk >= 70 ? 'color-mix(in oklab, var(--red) 35%, var(--border))'
                                  : p.risk >= 30 ? 'color-mix(in oklab, var(--amber) 35%, var(--border))'
                                  : undefined,
                                background: p.risk >= 70 ? 'color-mix(in oklab, var(--red) 5%, var(--surface))' : 'var(--surface)',
                              }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-faint mono fs-11" style={{ width: 28 }}>§{p.idx}</span>
                                  <span className="fs-12 strong" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                                  <span className="mono fs-11 strong" style={{ color: p.risk < 15 ? 'var(--green)' : p.risk < 30 ? 'var(--amber)' : 'var(--red)' }}>{p.risk}%</span>
                                </div>
                                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                                  <div style={{ width: `${p.risk}%`, height: '100%', background: p.risk < 15 ? 'var(--green)' : p.risk < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                                </div>
                                <div className="fs-11 text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.preview}</div>
                              </div>
                            ))}
                          </div>
                          <div className="banner info mt-3" style={{ fontSize: 11.5 }}>
                            <Icon name="zap" size={12}/>
                            <span>
                              Paragraphs ≥30% AI score are flagged for human review. ≥70% triggers auto-violation per AGB v3.2 §5.
                              {d.status === 'violation' && <> · GW <strong>{d.gwName}</strong> already shadow-banned.</>}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.QAAIDetection = QAAIDetection;

window.QAAIDetection = QAAIDetection;
})();
