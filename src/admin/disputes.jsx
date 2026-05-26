// Admin · Disputes — open dispute orders + resolution actions.

// ============ DISPUTES (minimal) ============
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as EFHooks from '../core/hooks.js';
import * as W from '../core/workflow.js';
import EF from '../core/ef.js';
const D = EF;

function DisputesPage({ navigate }) {
  // Sources of truth, in priority order:
  // 1. Real Dispute entities on orders (post-Phase-1 disputes system).
  // 2. AI/plagiarism violations — separate state machine, surfaced here for triage.
  // 3. Revision-required orders (no dispute) — these are not disputes, but the
  //    page historically lumped them in. Kept under a separate category so the
  //    admin can see active revisions in one place without confusing them with
  //    real disputes.
  const allEffective = EFHooks.useOrders();
  const allSubmissions = EFHooks.useSubmissions();

  const realDisputeRows = [];
  const violationRows = [];
  const revisionRows = [];

  allEffective.forEach(o => {
    const open = W.currentOpenDispute(o);
    if (open) {
      realDisputeRows.push({
        orderId: o.id,
        kind: 'dispute',
        raisedBy: open.openedBy,
        category: open.reasonCategory,
        blocksPayment: true,
        status: 'open',
        summary: (open.reason || '').slice(0, 140),
        daysOpen: Math.max(1, Math.round((Date.now() - new Date(open.openedAt || Date.now()).getTime()) / 86400000)),
        disputeId: open.id,
      });
    } else if (o.status === 'ai_violation_review' || o.status === 'plagiarism_violation_review') {
      const sub = allSubmissions.find(s => s.orderId === o.id);
      violationRows.push({
        orderId: o.id,
        kind: 'violation',
        raisedBy: 'qa',
        category: o.status === 'plagiarism_violation_review' ? 'plagiarism' : 'ai_use',
        blocksPayment: true,
        status: 'investigating',
        summary: `${o.status === 'plagiarism_violation_review' ? 'Plagiarism' : `AI score ${sub?.aiScore || '—'}%`} — QA flag routed to admin decision`,
        daysOpen: 1,
      });
    } else if (o.status === 'revision_required' && !o.disputeOpen) {
      const round = W.currentRevisionRound(o) || 1;
      const phase = o.revisionTargetKind === 'final' ? 'final' : 'interim';
      const raisedBy = o.revisionRequestSource === 'qa' ? 'qa' : 'customer';
      revisionRows.push({
        orderId: o.id,
        kind: 'revision',
        raisedBy,
        category: 'quality',
        blocksPayment: true,
        status: 'revision_in_progress',
        summary: `Revision requested — ${phase} round ${round}`,
        daysOpen: 3,
      });
    } else if (o.disputeOpen && !open) {
      // Legacy disputeOpen=true without a disputes[] entry. Show in the
      // disputes section so admin can clean it up via the legacy panel.
      realDisputeRows.push({
        orderId: o.id,
        kind: 'dispute_legacy',
        raisedBy: 'customer',
        category: 'other',
        blocksPayment: true,
        status: 'open',
        summary: '⚠ Legacy disputeOpen flag — open order to resolve',
        daysOpen: 6,
      });
    } else if (o.status === 'on_hold') {
      violationRows.push({
        orderId: o.id,
        kind: 'hold',
        raisedBy: 'admin',
        category: 'deadline',
        blocksPayment: true,
        status: 'investigating',
        summary: o.holdReason || 'Order on hold',
        daysOpen: 5,
      });
    }
  });

  const synthDisputes = [...realDisputeRows, ...violationRows, ...revisionRows];
  if (synthDisputes.length === 0) {
    synthDisputes.push({ orderId: 3496, raisedBy: 'gw', category: 'scope', daysOpen: 8, blocksPayment: false, status: 'open', summary: 'GW Henrik Vogel reports scope creep · customer added 2 new chapters mid-project', kind: 'demo' });
  }

  const blockingPayment = synthDisputes.filter(d => d.blocksPayment).length;
  const avgDays = Math.round(synthDisputes.reduce((s,d) => s + d.daysOpen, 0) / synthDisputes.length);

  const catLabel = { quality: 'Quality', deadline: 'Deadline', scope: 'Scope', ai_use: 'AI use', plagiarism: 'Plagiarism', communication: 'Communication', out_of_scope: 'Out of scope', unresponsive: 'Unresponsive', abusive: 'Abusive', late: 'Late', other: 'Other' };
  const catTone = { quality: 'amber', deadline: 'orange', scope: 'blue', ai_use: 'red', plagiarism: 'red', communication: 'slate', out_of_scope: 'amber', unresponsive: 'amber', abusive: 'red', late: 'orange', other: 'slate' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Disputes']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Disputes</h1>
          <div className="page-subtitle">Customer feedback, GW disagreements, AI/quality flags · resolution blocks Friday payment</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Open disputes</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{synthDisputes.length}</div>
        </div>
        <div className="card" style={{ padding: 14, border: blockingPayment > 0 ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Blocking GW payment</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--red)', marginTop: 4 }}>{blockingPayment}</div>
          <div className="text-faint fs-11 mt-1">Friday batch will skip these</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Avg days open</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{avgDays}d</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Category</th>
              <th>Raised by</th>
              <th>Summary</th>
              <th className="num">Days open</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {synthDisputes.map(d => {
              const o = D.order(d.orderId);
              const cust = o ? D.customer(o.customerId) : null;
              const gw = o ? D.gw(o.gwId) : null;
              return (
                <tr key={d.orderId} style={{ cursor: 'pointer' }} onClick={() => o && navigate('order-detail', { id: d.orderId })}>
                  <td>
                    <div className="flex-col" style={{ lineHeight: 1.25 }}>
                      <span className="mono strong fs-12">#{d.orderId}</span>
                      <span className="text-faint fs-11">{cust?.name} · {gw?.name || '—'}</span>
                    </div>
                  </td>
                  <td><span className={`pill pill-${catTone[d.category]}`}>{catLabel[d.category]}</span></td>
                  <td className="text-muted fs-12" style={{ textTransform: 'capitalize' }}>{d.raisedBy}</td>
                  <td className="fs-12" style={{ maxWidth: 320 }}>{d.summary}</td>
                  <td className="num mono"><span style={{ color: d.daysOpen > 5 ? 'var(--red)' : 'var(--text)' }}>{d.daysOpen}d</span></td>
                  <td>
                    {d.blocksPayment && <span className="pill pill-red" style={{ marginRight: 4 }}><Icon name="lock" size={10}/> Blocks pay</span>}
                    {d.status === 'open' && <span className="pill pill-slate">Open</span>}
                    {d.status === 'investigating' && <span className="pill pill-amber">Investigating</span>}
                    {d.status === 'revision_in_progress' && <span className="pill pill-blue">Revision</span>}
                  </td>
                  <td className="num">
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); o && navigate('order-detail', { id: d.orderId }); }} title="Open order">
                      <Icon name="external-link" size={12}/>
                    </button>
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

export { DisputesPage };
