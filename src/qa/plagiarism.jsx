// QA · Plagiarism reports — Turnitin scan history per submission.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ QA PLAGIARISM REPORTS ============
function QAPlagiarismReports({ navigate }) {
  const reports = [
    { id: 'r1', orderId: 3514, gwName: 'Dr. Henrik Vogel', gwInitials: 'HV', kind: 'final_work', score: 8, status: 'passed', topSource: 'IEEE Xplore — partial citation match', sources: 3, scannedAt: '2026-05-07T11:42:00', words: 28420 },
    { id: 'r2', orderId: 3530, gwName: 'Felix Becker', gwInitials: 'FB', kind: 'final_work', score: 12, status: 'passed', topSource: 'JSTOR — citation properly attributed', sources: 5, scannedAt: '2026-05-07T09:18:00', words: 14200 },
    { id: 'r3', orderId: 3508, gwName: 'Maja Petrović', gwInitials: 'MP', kind: 'interim_2', score: 27, status: 'flagged', topSource: 'Wikipedia (de) — paraphrasing too close', sources: 8, scannedAt: '2026-05-06T16:22:00', words: 9800 },
    { id: 'r4', orderId: 3520, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'interim_1', score: 6, status: 'passed', topSource: 'Springer Link — properly cited', sources: 2, scannedAt: '2026-05-06T14:50:00', words: 6240 },
    { id: 'r5', orderId: 3517, gwName: 'Anna König', gwInitials: 'AK', kind: 'final_work', score: 12, status: 'passed', topSource: 'Standard market terminology — no source flagged', sources: 1, scannedAt: '2026-05-06T08:15:00', words: 18900, note: 'Plag passed but AI-flagged separately' },
    { id: 'r6', orderId: 3540, gwName: 'Isabel Walter', gwInitials: 'IW', kind: 'final_work', score: 9, status: 'passed', topSource: 'Practitioner literature — common phrasing', sources: 4, scannedAt: '2026-04-26T15:30:00', words: 4120 },
    { id: 'r7', orderId: 3499, gwName: 'Lukas Bauer', gwInitials: 'LB', kind: 'final_work', score: 14, status: 'passed', topSource: 'GitHub — code comments paraphrased', sources: 6, scannedAt: '2026-04-25T12:00:00', words: 22400 },
  ];

  const today = reports.filter(r => r.scannedAt.startsWith('2026-05-07'));
  const flagged = reports.filter(r => r.status === 'flagged');
  const avgScore = Math.round(reports.reduce((s,r) => s + r.score, 0) / reports.length);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['QA', 'Plagiarism Reports']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Plagiarism Reports</h1>
          <div className="page-subtitle">Turnitin scan results · per submission · {`<15%`} green · 15–30% amber · {`>30%`} red</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="export-csv" label="Plagiarism CSV export"><Icon name="download" size={14}/> Export CSV</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Scanned today</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{today.length}</div>
        </div>
        <div className="card" style={{ padding: 14, border: flagged.length > 0 ? '1px solid color-mix(in oklab, var(--amber) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Flagged for review</div>
          <div className="mono strong" style={{ fontSize: 22, color: flagged.length ? 'var(--amber)' : 'var(--text)', marginTop: 4 }}>{flagged.length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Avg plagiarism score</div>
          <div className="mono strong" style={{ fontSize: 22, color: avgScore < 15 ? 'var(--green)' : 'var(--amber)', marginTop: 4 }}>{avgScore}%</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Ghostwriter</th>
              <th>Submission</th>
              <th className="num">Score</th>
              <th>Top match</th>
              <th className="num">Sources</th>
              <th>Status</th>
              <th>Scanned</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: r.orderId })}>
                <td className="mono">#{r.orderId}</td>
                <td><div className="flex items-center gap-2"><Avatar initials={r.gwInitials} size={24}/><span className="fs-12">{r.gwName}</span></div></td>
                <td><span className="pill pill-blue" style={{ textTransform: 'capitalize' }}>{r.kind.replace('_', ' ')}</span></td>
                <td className="num mono">
                  <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
                    <div style={{ width: 60, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, r.score*3)}%`, height: '100%', background: r.score < 15 ? 'var(--green)' : r.score < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                    </div>
                    <span style={{ color: r.score < 15 ? 'var(--green)' : r.score < 30 ? 'var(--amber)' : 'var(--red)', minWidth: 36, textAlign: 'right' }}>{r.score}%</span>
                  </div>
                </td>
                <td className="text-muted fs-11" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.topSource}</td>
                <td className="num mono text-muted">{r.sources}</td>
                <td>
                  {r.status === 'passed' && <span className="pill pill-green"><Icon name="check" size={10}/> Passed</span>}
                  {r.status === 'flagged' && <span className="pill pill-amber">Needs review</span>}
                </td>
                <td className="text-faint fs-11 mono">{U.relTime(r.scannedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.QAPlagiarismReports = QAPlagiarismReports;

window.QAPlagiarismReports = QAPlagiarismReports;
})();
