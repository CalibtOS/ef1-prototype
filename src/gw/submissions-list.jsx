// GW · Submissions list — submissions grouped by order, each order in its own card.

import React, { useMemo } from 'react';
import { Icon, StatusPill } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EF from '../core/ef.js';
const D = EF;

const KIND_LABEL = {
  interim_1: 'Zwischenstand 1',
  interim_2: 'Zwischenstand 2',
  final_work: 'Final work',
  final_invoice: 'Honorarrechnung',
  extension_invoice: 'Zusatzrechnung',
  revision: 'Revision',
};

const KIND_PILL = {
  interim_1: 'pill-blue',
  interim_2: 'pill-indigo',
  final_work: 'pill-emerald',
  final_invoice: 'pill-slate',
  extension_invoice: 'pill-slate',
  revision: 'pill-orange',
};

const fmtSize = (b) => b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
const seedHash = (n) => Math.abs(((n * 2654435761) | 0));

function QAPill({ status }) {
  if (status === 'auto_forwarded') return <span className="pill pill-blue"><Icon name="send" size={10}/> Auto-forwarded</span>;
  if (status === 'passed')         return <span className="pill pill-green"><Icon name="check" size={10}/> Passed</span>;
  if (status === 'pending')        return <span className="pill pill-amber">Pending</span>;
  if (status === 'archived')       return <span className="pill pill-slate">Archived</span>;
  if (status === 'failed_revision_required') return <span className="pill pill-orange">Revision req.</span>;
  if (status === 'ai_violation')   return <span className="pill pill-red">AI violation</span>;
  return null;
}

function ScoreCell({ value, label }) {
  if (value == null) return <span className="text-faint fs-11 mono">—</span>;
  const color = value < 15 ? 'var(--green)' : value < 30 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="flex-col" style={{ alignItems: 'flex-end', lineHeight: 1.2 }}>
      <span className="mono fs-11 strong" style={{ color }}>{value}%</span>
      <span className="text-faint" style={{ fontSize: 10 }}>{label}</span>
    </div>
  );
}

function GWSubmissionsList({ navigate }) {
  const allSubmissions = EFHooks.useSubmissions();
  const myAssignments = EFHooks.useOrders({ gwId: D.GW_ME.id });

  const groups = useMemo(() => {
    // Explicit submissions belonging to this GW
    const explicit = allSubmissions.filter(s => {
      const o = D.order(s.orderId);
      return o && o.gwId === D.GW_ME.id;
    }).map(s => ({
      id: s.id, orderId: s.orderId, kind: s.kind, round: s.round,
      fileName: s.fileName, size: s.size,
      qaStatus: s.qaStatus, plagScore: s.plagiarismScore, aiScore: s.aiScore,
      submittedAt: s.submittedAt,
    }));

    // Derived submissions synthesised from assignment state
    const derived = [];
    myAssignments.forEach(o => {
      const h = seedHash(o.id);
      const submitted = ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status);
      if (!submitted) return;
      if (o.interimDeadline) {
        derived.push({
          id: 'derived-i1-' + o.id, orderId: o.id, kind: 'interim_1', round: 1,
          fileName: `${D.WORK_TYPE_LABELS[o.workType] || 'Arbeit'}_${o.id}_Zwischenstand1.docx`,
          size: 380000 + (h % 700000), qaStatus: 'auto_forwarded',
          plagScore: 4 + (h % 9), aiScore: 3 + (h % 12),
          submittedAt: o.interimDeadline,
        });
      }
      if (['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status)) {
        derived.push(
          {
            id: 'derived-final-' + o.id, orderId: o.id, kind: 'final_work', round: (o.revisionRounds || 0) + 1,
            fileName: `Final_${o.id}_${D.WORK_TYPE_LABELS[o.workType] || ''}.docx`,
            size: 1100000 + (h % 1900000),
            qaStatus: o.status === 'completed' || o.qaPassed ? 'passed' : 'pending',
            plagScore: 5 + (h % 10), aiScore: 4 + (h % 13),
            submittedAt: o.finalDeadline,
          },
          {
            id: 'derived-inv-' + o.id, orderId: o.id, kind: 'final_invoice', round: 1,
            fileName: `Honorarrechnung_IW-2026-${String(o.id).padStart(3,'0')}.pdf`,
            size: 80000 + (h % 25000), qaStatus: 'archived',
            submittedAt: o.finalDeadline,
          }
        );
      }
    });

    const seen = new Set(explicit.map(s => `${s.orderId}-${s.kind}-${s.round}`));
    const all = [
      ...explicit,
      ...derived.filter(d => !seen.has(`${d.orderId}-${d.kind}-${d.round}`)),
    ].sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

    // Group by order, preserving most-recent-first order
    const byOrder = new Map();
    all.forEach(s => {
      if (!byOrder.has(s.orderId)) byOrder.set(s.orderId, []);
      byOrder.get(s.orderId).push(s);
    });

    return Array.from(byOrder.entries()).map(([orderId, subs]) => ({
      order: D.order(Number(orderId)),
      submissions: subs,
    }));
  }, [allSubmissions, myAssignments]);

  const totalSubs = groups.reduce((n, g) => n + g.submissions.length, 0);
  const passed    = groups.reduce((n, g) => n + g.submissions.filter(s => s.qaStatus === 'passed').length, 0);
  const pending   = groups.reduce((n, g) => n + g.submissions.filter(s => s.qaStatus === 'pending').length, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Submissions</h1>
          <div className="page-subtitle">
            {groups.length} order{groups.length !== 1 ? 's' : ''} · {totalSubs} file{totalSubs !== 1 ? 's' : ''} uploaded · interim drafts auto-forward, finals go through QA
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('gw-submit')}>
            <Icon name="upload-cloud" size={14}/> New submission
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Orders with submissions</div>
          <div className="mono strong" style={{ fontSize: 20, marginTop: 2 }}>{groups.length}</div>
        </div>
        <div className="card" style={{ padding: 14, border: passed > 0 ? '1px solid color-mix(in oklab, var(--green) 30%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">QA passed</div>
          <div className="mono strong" style={{ fontSize: 20, color: passed > 0 ? 'var(--green)' : 'var(--text)', marginTop: 2 }}>{passed}</div>
        </div>
        <div className="card" style={{ padding: 14, border: pending > 0 ? '1px solid color-mix(in oklab, var(--amber) 30%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Pending QA review</div>
          <div className="mono strong" style={{ fontSize: 20, color: pending > 0 ? 'var(--amber)' : 'var(--text)', marginTop: 2 }}>{pending}</div>
        </div>
      </div>

      {/* One card per order */}
      <div className="flex-col gap-3">
        {groups.map(({ order, submissions }) => (
          <div key={order?.id ?? submissions[0].orderId} className="card">
            {/* Card header — clicking navigates to the order */}
            <div
              className="card-head"
              style={{ cursor: 'pointer', gap: 12 }}
              onClick={() => navigate('order-detail', { id: order?.id ?? submissions[0].orderId })}
            >
              <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                <span className="mono strong fs-12">#{order?.id ?? submissions[0].orderId}</span>
                {order && <StatusPill status={order.status}/>}
                <span
                  className="fs-12"
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)' }}
                >
                  {order?.titleTBD ? <em className="text-faint">Title TBD — awaiting customer</em> : (order?.title || '—')}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-none">
                {order && (
                  <span className="text-faint fs-11">
                    {D.WORK_TYPE_LABELS[order.workType] || order.workType}
                    {order.pages ? ` · ${order.pages} pages` : ''}
                  </span>
                )}
                <span className="text-faint fs-11">{submissions.length} file{submissions.length !== 1 ? 's' : ''}</span>
                <Icon name="chevron-right" size={14} className="text-faint"/>
              </div>
            </div>

            {/* Submission rows */}
            <div className="flex-col" style={{ padding: '4px 0' }}>
              {submissions.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3"
                  style={{
                    padding: '9px 16px',
                    borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('order-detail', { id: s.orderId })}
                >
                  {/* File icon */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                    background: s.kind === 'final_invoice' ? 'var(--surface-2)' : 'var(--blue-soft)',
                    color: s.kind === 'final_invoice' ? 'var(--text-3)' : 'var(--blue)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Icon name={s.kind === 'final_invoice' || s.kind === 'extension_invoice' ? 'receipt' : 'file-text'} size={14}/>
                  </div>

                  {/* Kind + filename */}
                  <div className="flex-col" style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                    <div className="flex items-center gap-2">
                      <span className={`pill ${KIND_PILL[s.kind] || 'pill-slate'}`} style={{ flexShrink: 0 }}>
                        {KIND_LABEL[s.kind] || s.kind}
                      </span>
                      {s.round > 1 && <span className="text-faint fs-11">round {s.round}</span>}
                    </div>
                    <span className="mono fs-11 text-faint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {s.fileName}
                      {s.size ? <span> · {fmtSize(s.size)}</span> : null}
                    </span>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-4" style={{ flexShrink: 0 }}>
                    <ScoreCell value={s.plagScore} label="plag"/>
                    <ScoreCell value={s.aiScore} label="AI"/>
                  </div>

                  {/* QA status */}
                  <div style={{ flexShrink: 0, minWidth: 110, textAlign: 'right' }}>
                    <QAPill status={s.qaStatus}/>
                  </div>

                  {/* Date */}
                  <div className="text-faint fs-11 mono" style={{ flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                    {U.relTime(s.submittedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="card card-pad" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-3)' }}>
            <Icon name="upload-cloud" size={28} style={{ marginBottom: 10, opacity: 0.4 }}/>
            <div className="fs-13 strong" style={{ marginBottom: 4 }}>No submissions yet</div>
            <div className="fs-12">Files you upload will appear here, grouped by assignment.</div>
          </div>
        )}
      </div>
    </div>
  );
}

export { GWSubmissionsList };
