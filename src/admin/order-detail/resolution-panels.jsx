// Admin · Order detail · resolution panels for stuck states.
// Each panel handles one "exit a wait state" admin action — extension,
// delay, dispute, QA violation. Extracted from order-detail.jsx as part of
// the Arch-05 split so the parent shell stays focused on layout.

import React, { useState } from 'react';
import { Icon } from '../../../utils.jsx';
import * as U from '../../../utils.jsx';
import EFActions from '../../core/actions.js';
import EF from '../../core/ef.js';
const D = EF;

function ExtensionResolutionPanel({ order, toast }) {
  const ext = order.extensionPending || {};
  const [overrideDeadline, setOverrideDeadline] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const onApprove = () => {
    EFActions.orders.approveExtension(order.id, overrideDeadline ? { newDeadline: overrideDeadline + 'T18:00:00' } : {});
    toast && toast({ tone: 'success', transition: { entity: `Order #${order.id}`, from: 'Extension Requested', to: 'Active' }, text: 'Extension approved · GW + customer notified' });
  };
  const onReject = () => {
    EFActions.orders.rejectExtension(order.id, rejectReason);
    toast && toast({ tone: 'info', transition: { entity: `Order #${order.id}`, from: 'Extension Requested', to: 'Active' }, text: 'Extension rejected · GW notified to continue with original scope' });
  };
  return (
    <div className="card mb-3" style={{ borderLeft: '4px solid var(--amber)' }}>
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="plus" size={14} style={{ color: 'var(--amber)' }}/> Extension request — awaiting your decision</div>
        <span className="text-faint fs-11">requested {ext.requestedAt ? U.relTime(ext.requestedAt) : '—'}</span>
      </div>
      <div className="card-pad">
        <div className="kv" style={{ fontSize: 12, marginBottom: 12 }}>
          {ext.description && <div className="kv-row"><dt>Justification</dt><dd style={{ maxWidth: 480, textAlign: 'right' }}>{ext.description}</dd></div>}
          {ext.extraPages && <div className="kv-row"><dt>Extra pages</dt><dd className="mono">+{ext.extraPages}</dd></div>}
          {ext.extraFee && <div className="kv-row"><dt>Extra fee</dt><dd className="mono">+€{ext.extraFee}</dd></div>}
          <div className="kv-row"><dt>Current final deadline</dt><dd className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</dd></div>
        </div>
        <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
          <label className="fs-11 text-muted">Override new deadline (optional):</label>
          <input type="date" className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={overrideDeadline} onChange={(e) => setOverrideDeadline(e.target.value)}/>
        </div>
        <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-success btn-sm" onClick={onApprove}><Icon name="check" size={12}/> Approve extension</button>
          <button type="button" className="btn btn-sm" onClick={onReject}><Icon name="x" size={12}/> Reject</button>
          <input type="text" className="input" placeholder="Reject reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ flex: 1, minWidth: 220, padding: '4px 8px', fontSize: 12 }}/>
        </div>
      </div>
    </div>
  );
}

function DelayResolutionPanel({ order, toast }) {
  const [counter, setCounter] = useState('');
  const onAccept = () => {
    EFActions.orders.acceptDelay(order.id, {});
    toast && toast({ tone: 'success', transition: { entity: `Order #${order.id}`, from: 'Delay Reported', to: 'Active' }, text: 'New deadline confirmed · customer + GW notified' });
  };
  const onCounter = () => {
    if (!counter) return;
    EFActions.orders.proposeNewDelay(order.id, counter + 'T18:00:00');
    toast && toast({ tone: 'info', text: `Counter-deadline ${counter} proposed to customer + GW` });
    setCounter('');
  };
  return (
    <div className="card mb-3" style={{ borderLeft: '4px solid var(--orange)' }}>
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="clock" size={14} style={{ color: 'var(--orange)' }}/> Delay reported — your decision</div>
        <span className="text-faint fs-11">reported {order.delayReportedAt ? U.relTime(order.delayReportedAt) : '—'}</span>
      </div>
      <div className="card-pad">
        <div className="kv" style={{ fontSize: 12, marginBottom: 12 }}>
          <div className="kv-row"><dt>Reason</dt><dd>{order.delayReason || '—'}</dd></div>
          <div className="kv-row"><dt>Original deadline</dt><dd className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</dd></div>
          <div className="kv-row"><dt>GW proposed</dt><dd className="mono">{order.proposedNewDeadline ? U.fmtDate(order.proposedNewDeadline) : '—'}</dd></div>
        </div>
        <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-success btn-sm" onClick={onAccept}><Icon name="check" size={12}/> Accept proposed deadline</button>
          <span className="text-faint fs-11">or counter:</span>
          <input type="date" className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={counter} onChange={(e) => setCounter(e.target.value)}/>
          <button type="button" className="btn btn-sm" onClick={onCounter} disabled={!counter}><Icon name="arrow-right" size={12}/> Send counter-proposal</button>
        </div>
      </div>
    </div>
  );
}

function DisputeResolutionPanel({ order, toast }) {
  const [resolution, setResolution] = useState('');
  const canSubmit = resolution.trim().length >= 10;
  const onClose = () => {
    EFActions.orders.closeDispute(order.id, resolution);
    toast && toast({ tone: 'success', text: 'Dispute closed · customer + GW notified' });
    setResolution('');
  };
  return (
    <div className="card mb-3" style={{ borderLeft: '4px solid var(--orange)' }}>
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="alert-triangle" size={14} style={{ color: 'var(--orange)' }}/> Dispute open — resolve and close</div>
        <span className="text-faint fs-11">since {order.lastDisputeAt ? U.relTime(order.lastDisputeAt) : '—'}</span>
      </div>
      <div className="card-pad">
        <div className="text-muted fs-12 mb-2" style={{ lineHeight: 1.5 }}>
          Customer escalated this order. Document the resolution (mediation outcome, refund decision, scope change) before closing.
        </div>
        <textarea
          style={{ width: '100%', minHeight: 80, resize: 'vertical', padding: 10, fontSize: 13, border: `1px solid ${canSubmit ? 'var(--border)' : 'var(--amber)'}`, borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
          placeholder="Resolution note (min. 10 characters)…"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button type="button" className="btn btn-success btn-sm" disabled={!canSubmit} onClick={onClose}><Icon name="check" size={12}/> Close dispute</button>
        </div>
      </div>
    </div>
  );
}

function ViolationResolutionPanel({ order, submissions, toast }) {
  const isPlag = order.status === 'plagiarism_violation_review';
  const flaggedSub = (submissions || []).find(s => s.flagged) || (submissions || [])[0];
  const gw = D.gw(order.gwId);
  const onConfirm = () => {
    EFActions.orders.confirmViolation(order.id, { reason: order.qaFlagReason });
    toast && toast({ tone: 'danger', transition: { entity: `Order #${order.id}`, from: isPlag ? 'Plagiarism Violation' : 'AI Violation', to: 'On Job Board (reassigning)' }, text: 'Violation confirmed · GW shadow-banned · customer notified about reassignment' });
  };
  const onClear = () => {
    EFActions.orders.clearViolation(order.id, 'Reviewed and cleared after admin investigation');
    toast && toast({ tone: 'success', transition: { entity: `Order #${order.id}`, from: isPlag ? 'Plagiarism Violation' : 'AI Violation', to: order.finalSubmittedAt ? 'Delivered' : 'QA Review' }, text: 'False positive · flag cleared · GW + customer notified' });
  };
  return (
    <div className="card mb-3" style={{ borderLeft: '4px solid var(--red)' }}>
      <div className="card-head">
        <div className="card-title flex items-center gap-2">
          <Icon name="alert-triangle" size={14} style={{ color: 'var(--red)' }}/>
          {isPlag ? '🚨 Plagiarism flag — verdict required' : '🚨 AI use flag — verdict required'}
        </div>
        <span className="text-faint fs-11">flagged {order.qaFlaggedAt ? U.relTime(order.qaFlaggedAt) : '—'}</span>
      </div>
      <div className="card-pad">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
            <div className="fs-11 text-muted mb-1">Submission</div>
            <div className="strong fs-12">{flaggedSub?.fileName || '—'}</div>
            <div className="fs-11 text-faint mt-1">
              AI score <span className="mono">{flaggedSub?.aiScore ?? '—'}%</span> · Plagiarism <span className="mono">{flaggedSub?.plagiarismScore ?? '—'}%</span>
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
            <div className="fs-11 text-muted mb-1">Ghostwriter</div>
            <div className="strong fs-12">{gw?.name || '—'}</div>
            <div className="fs-11 text-faint mt-1">
              {gw?.lifetime || 0} jobs · ★{gw?.rating?.toFixed?.(1) || '—'} · on-time {Math.round((gw?.onTime || 0) * 100)}% {gw?.banned && '· already shadow-banned'}
            </div>
          </div>
        </div>
        <div className="text-muted fs-12 mb-2" style={{ lineHeight: 1.5 }}>
          {isPlag
            ? 'Confirm to shadow-ban the GW and return the order to the job board for reassignment. Customer is notified about the reassignment without mentioning the violation.'
            : 'Confirm to shadow-ban the GW and reassign. Clear if the AI score is a false positive (legitimate writing flagged by GPTZero).'}
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}><Icon name="x" size={12}/> Confirm violation · ban + reassign</button>
          <button type="button" className="btn btn-success btn-sm" onClick={onClear}><Icon name="check" size={12}/> False positive · clear flag</button>
          <button type="button" className="btn btn-sm" onClick={() => toast && toast({ tone: 'info', text: `Audit thread opened with ${gw?.name || 'GW'}` })}><Icon name="message-square" size={12}/> Open audit thread</button>
        </div>
      </div>
    </div>
  );
}

export { ExtensionResolutionPanel, DelayResolutionPanel, DisputeResolutionPanel, ViolationResolutionPanel };
