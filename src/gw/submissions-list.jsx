// GW · Submissions list — all submissions across assignments with QA status.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ GW SUBMISSIONS LIST ============
function GWSubmissionsList({ navigate }) {
  const allSubmissions = window.EFHooks.useSubmissions();
  const myAssignments = window.EFHooks.useOrders({ gwId: D.GW_ME.id });
  // Pull explicit SUBMISSIONS authored by this GW first.
  const explicit = allSubmissions.filter(s => {
    const o = D.order(s.orderId);
    return o && o.gwId === 'gw-iw';
  }).map(s => ({
    id: s.id, orderId: s.orderId, kind: s.kind, round: s.round,
    fileName: s.fileName, size: s.size,
    qaStatus: s.qaStatus, plagScore: s.plagiarismScore, aiScore: s.aiScore,
    submittedAt: s.submittedAt,
  }));
  // Then synthesize one or two submissions per real assignment so the page is never empty.
  const seedHash = (n) => Math.abs(((n * 2654435761) | 0));
  const derived = [];
  myAssignments.forEach(o => {
    const orderHash = seedHash(o.id);
    const submitted = ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status);
    if (!submitted) return;
    if (o.interimDeadline) {
      derived.push({
        id: 'derived-i1-' + o.id, orderId: o.id, kind: 'interim_1', round: 1,
        fileName: `${D.WORK_TYPE_LABELS[o.workType] || 'Arbeit'}_${o.id}_Zwischenstand1.docx`,
        size: 380000 + (orderHash % 700000),
        qaStatus: 'passed',
        plagScore: 4 + (orderHash % 9),
        aiScore: 3 + (orderHash % 12),
        submittedAt: o.interimDeadline,
      });
    }
    if (['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status)) {
      derived.push(
        {
          id: 'derived-final-' + o.id, orderId: o.id, kind: 'final_work', round: (o.revisionRounds || 0) + 1,
          fileName: `Final_${o.id}_${D.WORK_TYPE_LABELS[o.workType] || ''}.docx`,
          size: 1100000 + (orderHash % 1900000),
          qaStatus: o.status === 'completed' || o.qaPassed ? 'passed' : 'pending',
          plagScore: 5 + (orderHash % 10),
          aiScore: 4 + (orderHash % 13),
          submittedAt: o.finalDeadline,
        },
        {
          id: 'derived-inv-' + o.id, orderId: o.id, kind: 'final_invoice', round: 1,
          fileName: `Honorarrechnung_IW-2026-${String(o.id).padStart(3,'0')}.pdf`,
          size: 80000 + (orderHash % 25000),
          qaStatus: 'passed',
          submittedAt: o.finalDeadline,
        }
      );
    }
  });
  // Merge: explicit override derived (same id namespace differs) — explicit first, then any derived not already present
  const seen = new Set(explicit.map(s => `${s.orderId}-${s.kind}-${s.round}`));
  const merged = [
    ...explicit,
    ...derived.filter(d => !seen.has(`${d.orderId}-${d.kind}-${d.round}`)),
  ];
  // Sort newest first
  const all = merged.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  const kindLabel = { interim_1: 'Zwischenstand 1', interim_2: 'Zwischenstand 2', final_work: 'Final work', final_invoice: 'Honorarrechnung', extension_invoice: 'Zusatzrechnung', revision: 'Revision' };
  const fmtSize = (b) => b > 1e6 ? (b/1e6).toFixed(1) + ' MB' : Math.round(b/1024) + ' KB';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Submissions</h1>
          <div className="page-subtitle">Everything you&apos;ve uploaded · interim drafts, final works, invoices · QA status visible</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('gw-submit')}><Icon name="upload-cloud" size={14}/> New submission</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Kind</th>
              <th className="num">Round</th>
              <th>File</th>
              <th className="num">Plagiarism</th>
              <th className="num">AI</th>
              <th>QA status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {all.map(s => {
              const o = D.order(s.orderId);
              return (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: s.orderId })}>
                  <td>
                    <div className="flex-col" style={{ lineHeight: 1.25 }}>
                      <span className="mono strong fs-12">#{s.orderId}</span>
                      <span className="text-faint fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{o?.title || '—'}</span>
                    </div>
                  </td>
                  <td><span className="pill pill-blue">{kindLabel[s.kind] || s.kind}</span></td>
                  <td className="num mono">{s.round || 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Icon name="file-text" size={12} className="text-faint"/>
                      <span className="mono fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{s.fileName}</span>
                      <span className="text-faint fs-11">· {fmtSize(s.size || s.fileSize || 200000)}</span>
                    </div>
                  </td>
                  <td className="num mono">{s.plagScore != null ? <span style={{ color: s.plagScore < 15 ? 'var(--green)' : s.plagScore < 30 ? 'var(--amber)' : 'var(--red)' }}>{s.plagScore}%</span> : '—'}</td>
                  <td className="num mono">{s.aiScore != null ? <span style={{ color: s.aiScore < 15 ? 'var(--green)' : s.aiScore < 30 ? 'var(--amber)' : 'var(--red)' }}>{s.aiScore}%</span> : '—'}</td>
                  <td>
                    {s.qaStatus === 'passed' && <span className="pill pill-green"><Icon name="check" size={10}/> Passed</span>}
                    {s.qaStatus === 'pending' && <span className="pill pill-amber">Pending</span>}
                    {s.qaStatus === 'failed_revision_required' && <span className="pill pill-orange">Revision</span>}
                    {s.qaStatus === 'ai_violation' && <span className="pill pill-red">AI violation</span>}
                  </td>
                  <td className="text-faint fs-11 mono">{U.relTime(s.submittedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.GWSubmissionsList = GWSubmissionsList;

window.GWSubmissionsList = GWSubmissionsList;
})();
