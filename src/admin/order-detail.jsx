// Admin · Order detail — overview, payments, submissions, comms, assignment, audit tabs.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage, ChatComposer } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import { liveNow } from '../../data.js';
import * as W from '../core/workflow.js';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
import { QA_STATUS } from '../core/status.js';
const D = EF;

function initialsFor(name, email) {
  const text = String(name || email || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map(part => part[0]).join('').slice(0, 2).toUpperCase();
  return text.slice(0, 2).toUpperCase() || 'CU';
}

function fallbackCustomer(order) {
  const snapshot = order.customer || {};
  return {
    id: order.customerId || snapshot.id || 'unknown-customer',
    initials: snapshot.initials || initialsFor(snapshot.name || order.customerName, snapshot.email || order.customerEmail),
    name: snapshot.name || order.customerName || 'Unknown customer',
    email: snapshot.email || order.customerEmail || 'no-email@example.com',
    phone: snapshot.phone || order.customerPhone || '—',
    country: snapshot.country || order.country || '—',
    leadSource: snapshot.leadSource || order.leadSource || '—',
    orders: snapshot.orders || 0,
    ltv: snapshot.ltv || 0,
    tags: snapshot.tags || [],
  };
}

// =============================================================================
// A5 / A6 — Admin resolution panels
// Each panel renders inline in OrderDetail when the order is in a state that
// previously had no admin response path (extension/delay/dispute) or required
// a verdict (AI / plagiarism violation). Every action calls EFActions.* so the
// store mutates and notifies the affected personas.
// =============================================================================

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

function OrderDetail({ orderId, navigate, toast, initialTab, focusSubmissionId }) {
  const [tab, setTab] = useState(initialTab || 'overview');
  const [showRateSlider, setShowRateSlider] = useState(false);
  const [approving, setApproving] = useState(null);
  useEffect(() => {
    setTab(initialTab || 'overview');
  }, [orderId, initialTab]);
  // Store-backed read so newly-created orders resolve across all role views.
  const order = EFHooks.useOrder(orderId);
  const submissions = EFHooks.useSubmissions({ orderId });
  const orderEvents = EFHooks.useOrderEvents(orderId);
  if (!order) return <div className="page">Order not found.</div>;
  const cust = D.customer(order.customerId) || fallbackCustomer(order);
  const gw = D.gw(order.gwId);
  const submissionsCount = submissions.length;
  const dm = U.deadlineMeta(order.finalDeadline);
  const isClaim = order.status === 'claimed_pending_approval';
  const hasOfferHistory = !!(order.sevdeskOfferNo || order.offerSentAt || order.sevdeskInvoiceNo || order.invoiceSentAt);
  const showOfferTab = ['qualified','offer_sent','invoice_sent'].includes(order.status) || hasOfferHistory;
  const normalizedTab = tab === 'communication' ? 'communications' : tab;
  const activeTab = normalizedTab === 'offer' && !showOfferTab ? 'overview' : normalizedTab;
  const showMoney = W.canShowMoney(order);
  const showReceivable = W.canShowReceivable(order);
  const releaseGateRelevant = W.isReleaseGateRelevant(order);
  const invoiceAvailable = showMoney && (order.status === 'invoice_sent' || order.invoiceSentAt || order.paymentConfirmedAt || order.installments?.length);
  const offerAvailable = order.status === 'offer_sent' || order.offerSentAt || order.sevdeskOfferNo;
  const attachments = [order.outlineAttachment, order.exposeAttachment].filter(Boolean);
  const paidStripeInstallments = (order.installments || []).filter(i => i.status === 'paid' && i.method?.startsWith('stripe'));
  const pipedriveIndex = order.pipedriveStage === 'Won' || !['lead','qualified','offer_sent','invoice_sent'].includes(order.status)
    ? 4
    : order.status === 'invoice_sent'
      ? 3
      : order.status === 'offer_sent'
        ? 2
        : order.status === 'qualified'
          ? 1
          : 0;
  const pipedriveEvents = orderEvents
    .filter(e => ['sales', 'proposal', 'payment'].includes(e.domain))
    .slice(0, 4);
  const lastPipedriveEvent = pipedriveEvents[0];

  // Release gate — canonical 5-condition check from D.releaseGates() (PRD friday_payment_batch).
  // All five must be green AND release happens via the Friday batch screen, not directly here.
  const _gates = D.releaseGates(order);
  const completedPaid = order.status === 'completed' && order.gwPaymentStatus === 'paid';
  const gateChecks = releaseGateRelevant ? [
    { key: 'customer_satisfied',    label: 'Customer satisfied',                state: _gates.gates.customer_satisfied    ? 'pass' : (order.disputeOpen ? 'fail' : 'pending'), detail: order.disputeOpen ? 'Dispute open' : null },
    { key: 'quality_approved',      label: 'Quality approved (no plagiarism, no AI)', state: _gates.gates.quality_approved      ? 'pass' : (order.flagged ? 'fail' : 'pending') },
    { key: 'revisions_complete',    label: 'Revision rounds complete',          state: _gates.gates.revisions_complete    ? 'pass' : (order.status === 'revision_required' ? 'fail' : 'pending') },
    { key: 'all_installments_paid', label: 'All customer installments paid',    state: _gates.gates.all_installments_paid ? 'pass' : 'fail', detail: (order.outstandingEur || 0) > 0 ? `${order.installments?.filter(i=>i.status!=='paid').length||1} installment(s) outstanding — ${U.EUR(order.outstandingEur)}` : null },
    { key: 'gw_invoice_received',   label: 'GW invoice received',               state: _gates.gates.gw_invoice_received   ? 'pass' : 'pending' },
  ] : [];
  const gateBlocked = releaseGateRelevant && !_gates.releasable && !completedPaid && gateChecks.some(c => c.state === 'fail');
  const gateAllPass = _gates.releasable;

  // Approve claim (golden path) — plays a dual-email cascade animation
  const approveClaim = () => {
    setApproving({ phase: 'gw' });
    setTimeout(() => setApproving({ phase: 'cust' }), 700);
    setTimeout(() => setApproving({ phase: 'done' }), 1400);
    setTimeout(() => {
      EFActions.orders.approveClaim(orderId);
      toast({
        tone: 'success',
        transition: { entity: `Order #${orderId}`, from: 'GW Claimed — Approve', to: 'Active' },
        text: 'Briefing email sent · customer introduced',
      });
    }, 1700);
    setTimeout(() => setApproving(null), 2400);
  };
  const rejectClaim = () => {
    EFActions.orders.rejectClaim(orderId);
    toast({
      tone: 'info',
      transition: { entity: `Order #${orderId}`, from: 'GW Claimed — Approve', to: 'On Job Board' },
      text: 'Claim rejected · job returned to board',
    });
  };
  const markInstallmentPaid = (n) => {
    const installment = (order.installments || []).find(i => i.n === n);
    EFActions.orders.confirmPayment(orderId, { installmentN: n });
    toast({ text: `Installment ${n} marked as paid · ${U.EUR(installment?.amt)} via SEPA`, tone: 'success' });
  };
  // Direct release is intentionally removed: per business_rules §5 GW payments are released
  // via the Friday batch — never ad-hoc. The button on this card just navigates there.
  const goToFridayBatch = () => navigate('friday-batch');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin','Orders', `#${order.id}`]} />
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="mono">#{order.id}</span>
            <StatusPill status={order.status} order={order}/>
            <span style={{ fontWeight: 400, color: 'var(--text-2)', fontSize: 16 }}>· {order.titleTBD ? <em>folgt — awaiting customer</em> : order.title}</span>
          </h1>
          <div className="page-subtitle flex gap-3 items-center" style={{ marginTop: 6 }}>
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final deadline <span className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</span></span>
            <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
            {showReceivable && order.outstandingEur > 0 && <span className="pill pill-amber">Outstanding {U.EUR(order.outstandingEur)} of {U.EUR(order.grossEur)}</span>}
            {order.disputeOpen && <span className="pill pill-orange">Dispute open</span>}
          </div>
        </div>
        <div className="page-actions">
          {isClaim ? (
            <>
              <button type="button" className="btn" onClick={rejectClaim}><Icon name="x" size={14}/> Reject claim</button>
              <button type="button" className="btn btn-success" onClick={approveClaim}><Icon name="check" size={14}/> Approve & notify</button>
            </>
          ) : (
            <>
              <NotReady className="btn" feature="edit-record" label="Edit order"><Icon name="edit" size={14}/> Edit</NotReady>
              <button type="button" className="btn" onClick={() => navigate('inbox')}><Icon name="message-square" size={14}/> Open chat</button>
              <NotReady className="btn" ariaLabel="More actions" feature="row-more-actions"><Icon name="more-horizontal" size={14}/></NotReady>
            </>
          )}
        </div>
      </div>

      {isClaim && (
        <div className="banner info mb-3">
          <Icon name="feather" size={16}/>
          <div style={{ flex: 1 }}>
            <strong>{gw?.name}</strong> claimed this job 3h 18m ago. All 6 acknowledgements signed (AGB v3.2, no-AI, GDPR, deadline, fee, individual creation).
            On approve: GW briefing email + customer GW-intro email send simultaneously.
          </div>
          <button type="button" className="btn btn-success btn-sm" onClick={approveClaim}>Approve & notify</button>
        </div>
      )}

      {approving && (
        <div className="modal-backdrop" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Approving claim · sending dual notification</div>
                <div className="text-faint fs-11 mt-1">Both emails fire simultaneously per business rule §6 (NICHT WEITERLEITEN)</div>
              </div>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { side: 'gw', to: gw?.name || 'GW', subj: 'Auftragszuteilung — NICHT WEITERLEITEN', body: 'Anbei die Auftragsdetails, Lieferdaten, Honorar und AGB v3.2…', icon: 'feather' },
                { side: 'cust', to: cust?.name || 'Customer', subj: 'Ihr Ghostwriter wurde zugewiesen', body: 'Liebe/r ' + (cust?.name?.split(' ')[0] || 'Kunde') + ', Ihr Ghostwriter ist zugewiesen…', icon: 'user' },
              ].map(e => {
                const sent = approving.phase === 'cust' && e.side === 'gw' || approving.phase === 'done';
                const sending = (approving.phase === 'gw' && e.side === 'gw') || (approving.phase === 'cust' && e.side === 'cust');
                return (
                  <div key={e.side} className="card" style={{ border: sent ? '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' : sending ? '1px solid var(--blue)' : '1px solid var(--border)', transition: 'all .25s' }}>
                    <div className="card-pad">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name={e.icon} size={14}/>
                        <strong className="fs-12">To: {e.to}</strong>
                        <span style={{ flex: 1 }}/>
                        {sent && <span className="pill pill-green"><Icon name="check" size={10}/> Sent</span>}
                        {sending && <span className="pill pill-blue"><Icon name="zap" size={10}/> Sending…</span>}
                        {!sent && !sending && <span className="pill pill-slate">Queued</span>}
                      </div>
                      <div className="fs-12 strong" style={{ marginBottom: 4 }}>{e.subj}</div>
                      <div className="text-muted fs-11" style={{ lineHeight: 1.5 }}>{e.body}</div>
                      <div style={{ marginTop: 10, height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: sent ? '100%' : sending ? '60%' : '0%',
                          height: '100%',
                          background: sent ? 'var(--green)' : 'var(--blue)',
                          transition: 'width .6s ease',
                        }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <span className="text-faint fs-11">
                {approving.phase === 'gw' && 'Sending GW briefing…'}
                {approving.phase === 'cust' && 'Sending customer intro…'}
                {approving.phase === 'done' && '✓ Both emails delivered · order moved to Active'}
              </span>
              <span style={{ flex: 1 }}/>
            </div>
          </div>
        </div>
      )}

      {order.selfAssigned && (
        <div className="banner" style={{ background: 'color-mix(in oklab, var(--blue) 5%, var(--surface))', border: '1px solid color-mix(in oklab, var(--blue) 30%, var(--border))', marginBottom: 12 }}>
          <Icon name="user" size={16} style={{ color: 'var(--blue)' }}/>
          <div style={{ flex: 1, fontSize: 12.5 }}>
            <strong>Self-assigned to Berat.</strong> This job is hidden from the GW job board · no GW notifications · no honorar payout (Stand der Zahlung: <span className="mono">Keine Auszahlung</span>).
          </div>
        </div>
      )}

      {(order.status === 'ai_violation_review' || order.status === 'plagiarism_violation_review') && (
        <ViolationResolutionPanel order={order} submissions={submissions} toast={toast}/>
      )}

      {order.status === 'extension_requested' && (
        <ExtensionResolutionPanel order={order} toast={toast}/>
      )}

      {order.status === 'delay_reported' && (
        <DelayResolutionPanel order={order} toast={toast}/>
      )}

      {order.disputeOpen && (
        <DisputeResolutionPanel order={order} toast={toast}/>
      )}

      <div className="tabs">
        {['overview', ...(showOfferTab ? ['offer'] : []), 'assignment','submissions','communications','payments','audit'].map(t => (
          <div key={t} className={`tab ${activeTab===t?'active':''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'audit' ? 'Audit log' : t}
            {t === 'offer' && order.status === 'qualified' && <span className="pill pill-blue">Next</span>}
            {t === 'offer' && order.status === 'offer_sent' && <span className="pill pill-blue">Sent</span>}
            {t === 'offer' && order.status === 'invoice_sent' && <span className="pill pill-amber">Invoice</span>}
            {t === 'submissions' && submissionsCount > 0 && <span className="pill pill-pink">{submissionsCount}</span>}
            {t === 'payments' && showReceivable && order.outstandingEur > 0 && <span className="pill pill-amber">!</span>}
          </div>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
          <div className="flex-col gap-3">
            <div className="card">
              <div className="card-head"><div className="card-title">Customer</div><span className="text-faint fs-11">Pipedrive synced · {lastPipedriveEvent ? U.relTime(lastPipedriveEvent.at) : 'not yet'}</span></div>
              <div className="card-pad flex items-center gap-3">
                <Avatar initials={cust.initials} size={44} tone="blue"/>
                <div className="flex-col" style={{ flex: 1 }}>
                  <strong>{cust.name}</strong>
                  <span className="fs-11 text-faint mono">{cust.email} · {cust.phone}</span>
                  <span className="fs-11 text-faint">Lifetime {U.EUR(cust.ltv)} · {cust.orders} order(s) · {cust.country} · lead via {cust.leadSource}</span>
                </div>
                {cust.tags?.includes('VIP') && <span className="pill pill-yellow">VIP</span>}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Work specification</div></div>
              <div className="card-pad">
                <div className="kv">
                  <div className="kv-row"><dt>Type</dt><dd>{D.WORK_TYPE_LABELS[order.workType]}</dd></div>
                  <div className="kv-row"><dt>Field of study</dt><dd>{order.field}</dd></div>
                  <div className="kv-row"><dt>Pages</dt><dd className="mono">{order.pages || '—'}</dd></div>
                  <div className="kv-row"><dt>Paper title</dt><dd style={{ maxWidth: 340, textAlign: 'right' }}>{order.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : order.title}</dd></div>
                  <div className="kv-row"><dt>Attachments</dt><dd>{attachments.length ? attachments.map((a, i) => <a key={i} className="flex items-center gap-1" style={{ color: 'var(--blue)' }}><Icon name="paperclip" size={12}/>{a.name || a}</a>) : <span className="text-faint">No outline/exposé uploaded yet</span>}</dd></div>
                  <div className="kv-row"><dt><Bi de="Weitere Notiz" en="Note to GW"/></dt><dd>{order.note || '—'}</dd></div>
                </div>
              </div>
            </div>

            {showMoney ? (
              <div className="card">
                <div className="card-head"><div className="card-title">Pricing breakdown</div></div>
                <div className="card-pad">
                  <div className="kv">
                    <div className="kv-row"><dt>Gross (Brutto)</dt><dd className="mono">{U.EUR(order.grossEur)}</dd></div>
                    <div className="kv-row"><dt>VAT 7%</dt><dd className="mono text-muted">−{U.EUR(order.grossEur * 0.07 / 1.07)}</dd></div>
                    <div className="kv-row"><dt>Net (after VAT)</dt><dd className="mono">{U.EUR(order.grossEur / 1.07)}</dd></div>
                    <div className="kv-row" style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}><dt>Deadline factor</dt><dd className="mono">{order.deadlineFactor || '1.0'}× <span className="text-faint">(≥72h)</span></dd></div>
                    <div className="kv-row"><dt><Bi de="Honorar" en="GW honorarium"/> <span className="text-faint" style={{ marginLeft: 4 }}>· rate {((order.rate||0)*100).toFixed(0)}%</span></dt><dd className="mono" style={{ color: 'var(--green)' }}>{U.EUR(order.netHonorarium)}</dd></div>
                    <div className="kv-row"><dt>Berat margin</dt><dd className="mono strong">{U.EUR((order.grossEur/1.07) - order.netHonorarium)}</dd></div>
                  </div>
                  {showRateSlider && (
                    <div style={{ marginTop: 12, padding: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>
                      <div className="flex justify-between fs-11 mb-2"><span className="text-muted">GW rate (locked at assignment)</span><span className="mono strong">{((order.rate||0.4)*100).toFixed(0)}%</span></div>
                      <input type="range" min="33" max="62" step="1" value={Math.round((order.rate||0.4)*100)} onChange={(e) => {
                        const r = +e.target.value / 100;
                        EFActions.orders.setHonorRate(orderId, r);
                      }} style={{ width: '100%' }}/>
                      <div className="flex justify-between fs-11 mt-1 text-faint mono"><span>33%</span><span>40% mode</span><span>62%</span></div>
                    </div>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowRateSlider(!showRateSlider)}>
                    {showRateSlider ? 'Hide' : 'Adjust GW rate'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-head"><div className="card-title">Pricing</div><span className="pill pill-slate">Not proposed</span></div>
                <div className="card-pad">
                  <div className="banner info" style={{ fontSize: 12 }}>
                    <Icon name="lock" size={13}/>
                    <span>No money is shown in Inquiry/Qualified. Create the Sevdesk proposal to move this order into Proposal and expose customer price, installments, and GW honorarium.</span>
                  </div>
                  {order.status === 'qualified' && (
                    <button className="btn btn-primary btn-sm mt-3" onClick={() => setTab('offer')}><Icon name="file-text" size={12}/> Create proposal</button>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-head"><div className="card-title">Deadlines</div><span className="text-faint fs-11">cutoff 18:00 the day BEFORE due</span></div>
              <div className="card-pad flex-col gap-2">
                {order.interimDeadline && (
                  <div className="flex items-center gap-3">
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={14}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="fs-12 strong"><Bi de="Zwischenstand 1" en="Interim 1"/></div>
                      <div className="fs-11 text-muted mono">{U.fmtDate(order.interimDeadline)}, 18:00 · in {U.daysTo(order.interimDeadline)} days</div>
                    </div>
                    <span className={`pill pill-${U.deadlineMeta(order.interimDeadline).tone === 'danger' ? 'red' : 'slate'}`}>{U.deadlineMeta(order.interimDeadline).label}</span>
                  </div>
                )}
                {order.interim2Deadline && (
                  <div className="flex items-center gap-3">
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={14}/></div>
                    <div style={{ flex: 1 }}>
                      <div className="fs-12 strong"><Bi de="Zwischenstand 2" en="Interim 2"/></div>
                      <div className="fs-11 text-muted mono">{U.fmtDate(order.interim2Deadline)}, 18:00</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="action-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="check-circle" size={14}/></div>
                  <div style={{ flex: 1 }}>
                    <div className="fs-12 strong"><Bi de="Verbindliches finales Lieferdatum" en="Final delivery"/></div>
                    <div className="fs-11 text-muted mono">{U.fmtDate(order.finalDeadline)}, 18:00</div>
                  </div>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-col gap-3">
            {/* Release gate widget */}
            {releaseGateRelevant ? (
              <div className="card" style={{ border: gateBlocked ? '1px solid color-mix(in oklab, var(--red) 35%, var(--border))' : (gateAllPass || completedPaid ? '1px solid color-mix(in oklab, var(--green) 35%, var(--border))' : undefined) }}>
                <div className="card-head">
                  <div className="card-title flex items-center gap-2"><Icon name="shield-check" size={14}/> GW Payment Releasability</div>
                  <span className="text-faint fs-11 mono">{U.EUR(order.netHonorarium)}</span>
                </div>
                <div className="release-gate">
                  {completedPaid ? (
                    <div className="gate-result pass">
                      <Icon name="check-circle" size={14}/>
                      <div>
                        <strong>Already released</strong>
                        <div className="fs-11" style={{ marginTop: 2 }}>GW honorarium was paid in a prior Friday batch.</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {gateChecks.map((c, i) => (
                        <div key={i} className="gate-check">
                          <div className={`gate-check-icon ${c.state}`}>
                            {c.state === 'pass' && <Icon name="check" size={11}/>}
                            {c.state === 'fail' && <Icon name="x" size={11}/>}
                            {c.state === 'pending' && <Icon name="dot" size={8}/>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div>{c.label}</div>
                            {c.detail && <div className="gate-check-detail">{c.detail}</div>}
                          </div>
                          {c.state === 'fail' && c.label.includes('installments') && (
                            <button className="btn btn-sm" onClick={() => setTab('payments')}>Resolve →</button>
                          )}
                        </div>
                      ))}
                      <div className={`gate-result ${gateAllPass ? 'pass' : ''}`}>
                        <Icon name={gateAllPass ? 'check-circle' : 'lock'} size={14}/>
                        <div>
                          <strong>{gateAllPass ? 'Ready to release' : 'Blocked'}</strong>
                          <div className="fs-11" style={{ marginTop: 2 }}>{gateAllPass ? 'All gates green — release in next Friday batch.' : (_gates.reasons.find(r => r !== 'Order is not awaiting Friday release') || _gates.reasons[0] || 'Resolve the blocked gate before Friday release.')}</div>
                        </div>
                      </div>
                      <button className="btn w-full mt-3" disabled={!gateAllPass} onClick={goToFridayBatch} style={ gateAllPass ? { background: 'var(--green)', color: 'white', borderColor: 'var(--green)', justifyContent: 'center' } : { justifyContent: 'center' } }>
                        <Icon name="wallet" size={14}/> {gateAllPass ? `Open Friday batch · ${U.EUR(order.netHonorarium)}` : 'Release happens in Friday batch'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-head">
                  <div className="card-title flex items-center gap-2"><Icon name="lock" size={14}/> GW Payment Releasability</div>
                  {showMoney && <span className="text-faint fs-11 mono">{U.EUR(order.netHonorarium)}</span>}
                </div>
                <div className="card-pad">
                  <div className="banner info" style={{ fontSize: 12 }}>
                    <Icon name="lock" size={13}/>
                    <span>{W.releaseGateStageNote(order)}</span>
                  </div>
                </div>
              </div>
            )}

            {gw && (
              <div className="card">
                <div className="card-head"><div className="card-title">Assigned GW</div>{gw.banned && <span className="pill pill-red">Shadow-banned</span>}</div>
                <div className="card-pad flex items-center gap-3">
                  <Avatar initials={gw.initials} size={40}/>
                  <div className="flex-col" style={{ flex: 1 }}>
                    <strong>{gw.name}</strong>
                    <span className="fs-11 text-faint">{gw.expertise?.slice(0,3).join(', ')}</span>
                    <span className="fs-11 text-faint mono">★ {gw.rating} · {(gw.onTime*100).toFixed(0)}% on-time · {gw.lifetime} jobs</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-head"><div className="card-title">Pipedrive</div></div>
              <div className="card-pad">
                <div className="stepper">
                  {['Inquiry','Qualified','Proposal','Invoice','Won'].map((s, i) => (
                    <div key={i} className={`step ${i === pipedriveIndex ? 'current' : ''}`}>
                      <div className={`step-bar ${i < pipedriveIndex ? 'done' : i === pipedriveIndex ? 'current' : ''}`}/>
                      <div className="step-label">{s}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between fs-11 text-faint mt-3">
                  <span>Deal #{order.id}</span>
                  <a style={{ color: 'var(--blue)' }} className="flex items-center gap-1">Open in Pipedrive <Icon name="external-link" size={11}/></a>
                </div>
                <div className="timeline mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {pipedriveEvents.length === 0 ? (
                    <EmptyState compact icon="git-branch" title="No CRM events yet" body="The stage bar will fill as sales/payment events are recorded."/>
                  ) : pipedriveEvents.map(e => (
                    <div key={`${e.key}-${e.at}`} className="timeline-item">
                      <div className={`timeline-dot ${e.dot || ''}`}><Icon name={e.icon || 'dot'} size={10}/></div>
                      <div className="timeline-content">
                        <div className="timeline-title">{e.title}</div>
                        <div className="timeline-meta mono">{U.fmtDateTime(e.at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Sevdesk</div></div>
              <div className="card-pad flex items-center gap-3">
                <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
                <div style={{ flex: 1 }}>
                  {invoiceAvailable ? (
                    <>
                      <div className="fs-12 strong">{order.sevdeskInvoiceNo || `RG-2026-${String(order.id).padStart(4,'0')}`}</div>
                      <div className="fs-11 text-faint">Invoice issued {U.fmtDate(order.invoiceSentAt || order.paymentConfirmedAt || order.acceptedAt)} · {U.EUR(order.grossEur)}</div>
                    </>
                  ) : offerAvailable ? (
                    <>
                      <div className="fs-12 strong">{order.sevdeskOfferNo || offerNoFor(order)}</div>
                      <div className="fs-11 text-faint">Proposal sent · waiting for customer acceptance</div>
                    </>
                  ) : (
                    <>
                      <div className="fs-12 strong">No Sevdesk document yet</div>
                      <div className="fs-11 text-faint">Qualified orders get a proposal first; invoice appears only after acceptance.</div>
                    </>
                  )}
                </div>
                {invoiceAvailable && <NotReady className="btn btn-sm" feature="invoice-pdf"><Icon name="download" size={12}/> PDF</NotReady>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
          <div className="card">
            <div className="card-head"><div className="card-title">Customer installment plan</div><span className="text-faint fs-11">{order.installments?.length || 0} of max 5</span></div>
            <div className="card-pad">
              {!showMoney ? (
                <EmptyState compact icon="lock" title="No payment plan yet" body="Inquiry and Qualified orders should not show money. Send a proposal first."/>
              ) : !showReceivable ? (
                <EmptyState compact icon="wallet" title="No receivable yet" body="The proposal amount is visible, but no customer debt exists until the customer accepts the offer and the invoice is sent."/>
              ) : (order.installments || []).length === 0 ? (
                <EmptyState compact icon="wallet" title="No installments recorded" body="The installment plan appears after customer acceptance or payment confirmation."/>
              ) : (
                <>
                  <table className="tbl" style={{ fontSize: 12 }}>
                    <thead>
                      <tr><th>#</th><th>Due date</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {(order.installments || []).map(inst => (
                        <tr key={inst.n} style={{ cursor: 'default' }}>
                          <td className="mono">{inst.n} of {order.installments.length}</td>
                          <td className="mono">{U.fmtDate(inst.date)}</td>
                          <td className="num mono">{U.EUR(inst.amt)}</td>
                          <td className="text-muted fs-11">{(inst.method||'—').replace('stripe_','Stripe ').replace('bank_transfer_sepa','SEPA').replace('_',' ')}</td>
                          <td>
                            {inst.status === 'paid' && <span className="pill pill-green"><Icon name="check" size={10}/> Paid {U.fmtDate(inst.date)}</span>}
                            {inst.status === 'overdue' && <span className="pill pill-red">Overdue {Math.abs(U.daysTo(inst.date))}d</span>}
                            {inst.status === 'scheduled' && <span className="pill pill-slate">Scheduled</span>}
                            {inst.status === 'pending' && <span className="pill pill-amber">Awaiting</span>}
                          </td>
                          <td className="num">
                            {(inst.status === 'overdue' || inst.status === 'pending' || inst.status === 'scheduled') && (
                              <button className="btn btn-sm btn-success" onClick={() => markInstallmentPaid(inst.n)}><Icon name="check" size={11}/> Mark paid (SEPA)</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between mt-3" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
                    <span className="text-muted fs-12">Total billed</span>
                    <span className="mono strong">{U.EUR(order.grossEur)}</span>
                  </div>
                  <div className="flex justify-between" style={{ padding: '4px 12px' }}>
                    <span className="text-muted fs-12">Paid to date</span>
                    <span className="mono" style={{ color: 'var(--green)' }}>{U.EUR(order.paidEur)}</span>
                  </div>
                  <div className="flex justify-between" style={{ padding: '4px 12px' }}>
                    <span className="text-muted fs-12">Outstanding</span>
                    <span className="mono" style={{ color: order.outstandingEur > 0 ? 'var(--red)' : 'var(--text-3)' }}>{U.EUR(order.outstandingEur)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex-col gap-3">
            <div className="card">
              <div className="card-head"><div className="card-title">Stripe webhook log</div></div>
              <div className="card-pad flex-col gap-2">
                {!showMoney ? (
                  <EmptyState compact icon="lock" title="No payment events yet" body="Stripe/SEPA events start after an invoice exists."/>
                ) : !showReceivable ? (
                  <EmptyState compact icon="wallet" title="No invoice event yet" body="The customer has a proposal, but no invoice/payment link exists until they accept it."/>
                ) : paidStripeInstallments.length === 0 ? (
                  <EmptyState compact icon="wallet" title="No Stripe payment events" body="SEPA/manual payments are tracked in the installment plan."/>
                ) : paidStripeInstallments.map((i, idx) => {
                  // Deterministic id derived from order + installment so it never reshuffles between renders
                  const seed = (Number(order.id) * 1009 + i.n * 31 + idx).toString(36).slice(-10).padStart(10, '0');
                  return (
                    <div key={idx} className="flex items-start gap-2 fs-11">
                      <div className="timeline-dot green" style={{ width: 16, height: 16 }}><Icon name="check" size={9}/></div>
                      <div style={{ flex: 1 }}>
                        <div className="mono">payment_intent.succeeded</div>
                        <div className="text-faint">pi_3Q{seed} · {U.fmtDate(i.date)} · {U.EUR(i.amt)}</div>
                      </div>
                    </div>
                  );
                })}
                {showReceivable && <div className="banner info" style={{ marginTop: 8, fontSize: 11.5 }}>
                  <Icon name="zap" size={14}/>
                  <span><code>confirmPayment()</code> auto-fires Pipedrive 'Won' + Sevdesk mark-paid + GW assignment kickoff.</span>
                </div>}
              </div>
            </div>

            {releaseGateRelevant && (
              <div className="card">
                <div className="card-head">
                  <div className="card-title">GW payout gate</div>
                  <span className="text-faint fs-11 mono">{U.EUR(order.netHonorarium)}</span>
                </div>
                <div className="card-pad flex-col gap-2">
                  {gateChecks.map(c => (
                    <div key={c.key} className="flex items-start gap-2 fs-11">
                      <div className={`gate-check-icon ${c.state}`} style={{ marginTop: 1 }}>
                        {c.state === 'pass' && <Icon name="check" size={11}/>}
                        {c.state === 'fail' && <Icon name="x" size={11}/>}
                        {c.state === 'pending' && <Icon name="dot" size={8}/>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div>{c.label}</div>
                        {c.detail && <div className="text-faint">{c.detail}</div>}
                      </div>
                    </div>
                  ))}
                  <div className={`banner ${gateAllPass ? 'info' : 'warn'}`} style={{ marginTop: 6, fontSize: 11.5 }}>
                    <Icon name={gateAllPass ? 'check-circle' : 'lock'} size={14}/>
                    <span>{gateAllPass ? 'All gates are clear for the next Friday batch.' : (_gates.reasons.find(r => r !== 'Order is not awaiting Friday release') || _gates.reasons[0] || 'Resolve the blocked gate before Friday release.')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'offer' && (
        <OfferTab order={order} toast={toast} setTab={setTab}/>
      )}

      {activeTab === 'submissions' && (
        <SubmissionsTab order={order} navigate={navigate} focusSubmissionId={focusSubmissionId} />
      )}
      {activeTab === 'communications' && (
        <CommsTab order={order} toast={toast} />
      )}
      {activeTab === 'assignment' && (
        <AssignmentTab order={order} navigate={navigate} toast={toast}/>
      )}
      {activeTab === 'audit' && (
        <AuditTab order={order} events={orderEvents} />
      )}
    </div>
  );
}

function offerFirstName(cust) {
  return (cust?.name || 'Kunde').split(' ')[0] || 'Kunde';
}

function offerNoFor(order) {
  return order.sevdeskOfferNo || `AN-${String(10300 + (Number(order.id) % 100)).padStart(5, '0')}`;
}

function invoiceNoFor(order) {
  return order.sevdeskInvoiceNo || `RG-${String(26000 + (Number(order.id) % 100)).padStart(5, '0')}`;
}

function dateInputValue(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

function midpointDate(finalIso) {
  const now = liveNow();
  const final = new Date(finalIso || now);
  const mid = new Date(now.getTime() + ((final.getTime() - now.getTime()) / 2));
  return mid.toISOString().slice(0, 10);
}

function germanMoney(n) {
  return U.EUR(Number(n) || 0);
}

function OfferFlowStep({ icon, title, body, state }) {
  const tone = state === 'done' ? 'green' : state === 'current' ? 'blue' : '';
  return (
    <div className="offer-flow-step">
      <div className={`timeline-dot ${tone}`}><Icon name={state === 'done' ? 'check' : icon || 'dot'} size={11}/></div>
      <div>
        <div className="timeline-title">{title}</div>
        {body && <div className="timeline-meta">{body}</div>}
      </div>
    </div>
  );
}

function ContactFormEmailCard({ order, cust }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="inbox" size={14}/> Contact Form 7 intake email</div>
        <span className="pill pill-slate">Parsed</span>
      </div>
      <div className="card-pad">
        <div className="offer-mail-card">
          <div className="offer-mail-title">Neue Anfrage von efactory1.de</div>
          <div className="offer-mail-meta">From: wordpress@efactory1.de · To: berat@efactory1.de · {U.fmtDateTime('2026-05-07T13:58:00')}</div>
          <div className="offer-mail-body">
            <strong>Name:</strong> {cust?.name}<br/>
            <strong>E-Mail:</strong> {cust?.email}<br/>
            <strong>Thema:</strong> {order.titleTBD ? 'folgt' : order.title}<br/>
            <strong>Seiten:</strong> {order.pages || '—'} · <strong>Deadline:</strong> {U.fmtDate(order.finalDeadline)} · <strong>Fach:</strong> {order.field}
          </div>
        </div>
        <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
          <span className="chip active"><Icon name="user" size={11}/>{cust?.name}</span>
          <span className="chip active"><Icon name="file-text" size={11}/>{order.pages || 0} Seiten</span>
          <span className="chip active"><Icon name="calendar" size={11}/>{U.fmtDate(order.finalDeadline)}</span>
          <span className="chip active"><Icon name="tag" size={11}/>{order.field}</span>
        </div>
      </div>
    </div>
  );
}

function SevdeskPdfPreview({ order, cust, offerNo, pageRate, discount, totalGross, interimDate, finalDate, customNote }) {
  const pages = Number(order.pages) || 0;
  const baseGross = pages * pageRate;
  const vat = totalGross * 0.07 / 1.07;
  const net = totalGross / 1.07;
  const topic = order.titleTBD ? 'folgt' : order.title;
  return (
    <div className="offer-pdf-shell">
      <div className="offer-pdf-toolbar">
        <div className="flex items-center gap-2"><span className="offer-pdf-dot red"/><span className="offer-pdf-dot amber"/><span className="offer-pdf-dot green"/></div>
        <span className="mono fs-11">{offerNo}.pdf</span>
        <span style={{ flex: 1 }}/>
        <span className="pill pill-blue"><Icon name="eye" size={10}/> PDF preview</span>
      </div>
      <div className="offer-pdf-frame">
        <div className="offer-pdf-page">
          <div className="offer-pdf-top">
            <div>
              <div className="offer-pdf-brand">efactory1.de by Bery Ventures GmbH</div>
              <div className="offer-pdf-address">{cust?.name}<br/>{cust?.country === 'DE' ? 'Deutschland' : cust?.country || 'Deutschland'}</div>
            </div>
            <div className="offer-pdf-logo">EF1</div>
          </div>
          <div className="offer-pdf-docgrid">
            <div>
              <div className="offer-pdf-kicker">Angebot {offerNo}</div>
              <h3>Angebot {offerNo}</h3>
            </div>
            <div className="offer-pdf-facts">
              <div><span>Angebots-Nr.</span><strong>{offerNo}</strong></div>
              <div><span>Datum</span><strong>{U.fmtDate(liveNow().toISOString())}</strong></div>
              <div><span>Ihr Ansprechpartner</span><strong>Berat Özdemir</strong></div>
            </div>
          </div>
          <p className="offer-pdf-copy">Liebe/r {offerFirstName(cust)},</p>
          <p className="offer-pdf-copy">über 9700 Kunden vertrauen unserem Unternehmen efactory1.de GmbH aus Köln schon. Seit 2015 bringen wir Student:innen und Autor:innen zusammen. Vielen Dank auch für Deine Anfrage.</p>
          <table className="offer-pdf-table">
            <thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th>Rabatt</th><th>Gesamtpreis</th></tr></thead>
            <tbody>
              <tr>
                <td>1.</td>
                <td>
                  <strong>Erstellung einer wissenschaftlichen Arbeit inkl. Beratung & Coaching</strong>
                  <div>Thema: {topic}</div>
                  <div>Arbeitsart: {D.WORK_TYPE_LABELS[order.workType] || order.workType}</div>
                  <div>Fachrichtung: {order.field}</div>
                  <div>Umfang: {pages} Seiten · Land: Deutschland</div>
                </td>
                <td>{pages}</td>
                <td>{germanMoney(pageRate)}</td>
                <td>{discount}%</td>
                <td>{germanMoney(totalGross)}</td>
              </tr>
            </tbody>
          </table>
          <div className="offer-pdf-section">
            <strong>Termine</strong>
            <div>1. Teillieferung am {U.fmtDate(interimDate)}</div>
            <div>Fertigstellung / Auslieferung am {U.fmtDate(finalDate)}</div>
          </div>
          <div className="offer-pdf-section">
            <strong>Zahlungsbeispiel in Raten</strong>
            <div>50,00% bei Beginn der Zusammenarbeit. Den passenden Ratenplan kannst du individuell mit Klarna abstimmen. Selbstverständlich stehen dir weiterhin alle bewährten Zahlungsarten offen.</div>
          </div>
          {customNote && (
            <div className="offer-pdf-section"><strong>Weitere Notiz von efactory1</strong><div>{customNote}</div></div>
          )}
          <div className="offer-pdf-total">
            <div><span>Zwischensumme</span><strong>{germanMoney(baseGross)}</strong></div>
            <div><span>Rabatt</span><strong>-{germanMoney(baseGross - totalGross)}</strong></div>
            <div><span>USt. 7%</span><strong>{germanMoney(vat)}</strong></div>
            <div><span>Netto</span><strong>{germanMoney(net)}</strong></div>
            <div className="offer-pdf-grand"><span>Gesamtbetrag</span><strong>{germanMoney(totalGross)}</strong></div>
          </div>
        </div>
        <div className="offer-pdf-thumbs">
          <div className="offer-pdf-thumb active"/>
          <div className="offer-pdf-thumb"/>
          <div className="offer-pdf-thumb"/>
        </div>
      </div>
    </div>
  );
}

function OfferEmailCard({ email, status }) {
  return (
    <div className={`offer-email-preview ${status === 'sent' ? 'sent' : status === 'sending' ? 'sending' : ''}`}>
      <div className="offer-email-top">
        <Icon name="mail" size={14}/>
        <strong>{email.label}</strong>
        <span style={{ flex: 1 }}/>
        {status === 'sent' && <span className="pill pill-green"><Icon name="check" size={10}/> Sent</span>}
        {status === 'sending' && <span className="pill pill-blue"><Icon name="zap" size={10}/> Sending</span>}
        {!status && <span className="pill pill-slate">Queued</span>}
      </div>
      <div className="kv" style={{ gap: 6 }}>
        <div className="kv-row"><dt>From</dt><dd className="mono">{email.from}</dd></div>
        <div className="kv-row"><dt>To</dt><dd className="mono">{email.to}</dd></div>
        <div className="kv-row"><dt>Subject</dt><dd style={{ maxWidth: 360, textAlign: 'right' }}>{email.subject}</dd></div>
      </div>
      <div className="offer-email-body">{email.body}</div>
      <div className="offer-email-attachments">
        {email.attachment && <span className="chip active"><Icon name="paperclip" size={11}/>{email.attachment}</span>}
        {email.link && <span className="chip active"><Icon name="external-link" size={11}/>{email.link}</span>}
      </div>
    </div>
  );
}

function InvoiceAutomationPanel({ order, cust, totalGross, toast }) {
  const [method, setMethod] = useState(order.paymentMethodChoice || 'stripe_card');
  const [phase, setPhase] = useState(null);
  const [paying, setPaying] = useState(false);
  const offerSent = ['offer_sent','invoice_sent'].includes(order.status) || order.offerSentAt;
  const invoiceSent = order.status === 'invoice_sent' || order.invoiceSentAt;
  const invoiceNo = invoiceNoFor(order);
  const methodLabel = {
    bank_transfer_sepa: 'Bank transfer',
    stripe_paypal: 'PayPal',
    stripe_klarna: 'Klarna',
    stripe_card: 'Credit Card',
  }[method] || method;
  const needsStripe = method !== 'bank_transfer_sepa';
  const createInvoice = () => {
    if (!offerSent) return;
    const steps = ['accepted', 'invoice', 'stripe', 'email'];
    steps.forEach((p, i) => setTimeout(() => setPhase(p), i * 520));
    setTimeout(() => {
      const link = needsStripe ? `https://pay.stripe.com/ef1/${order.id}-${method.replace('stripe_', '')}` : null;
      EFActions.orders.sendInvoice(order.id, {
        status: 'invoice_sent',
        sevdeskInvoiceNo: invoiceNo,
        invoiceRequestAt: '2026-05-07T15:08:00',
        invoiceSentAt: '2026-05-07T15:10:00',
        paymentMethodChoice: method,
        stripePaymentLink: link,
        pipedriveStage: 'Rechnung angefordert',
        paidEur: 0,
        outstandingEur: totalGross,
        installments: [{ n: 1, amt: totalGross, status: 'pending', date: '2026-05-08', method }],
      });
      toast && toast({ tone: 'success', text: `Invoice ${invoiceNo} sent · ${needsStripe ? 'Stripe payment link included' : 'SEPA bank details included'}` });
    }, steps.length * 520 + 100);
  };
  const confirmPayment = () => {
    setPaying(true);
    setTimeout(() => {
      EFActions.orders.confirmPayment(order.id, {
        status: order.gwId ? 'active' : 'available',
        paidEur: totalGross,
        outstandingEur: 0,
        paymentConfirmedAt: '2026-05-07T15:42:00',
        pipedriveStage: 'Won',
        installments: (order.installments?.length ? order.installments : [{ n: 1, amt: totalGross, method, date: '2026-05-08' }]).map(i => ({ ...i, status: 'paid', date: '2026-05-07' })),
      });
      toast && toast({ tone: 'success', text: `Payment confirmed · Pipedrive Won · order ready for GW assignment` });
      setPaying(false);
    }, 900);
  };
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="wallet" size={14}/> Acceptance → invoice automation</div>
        {invoiceSent ? <span className="pill pill-amber">Invoice sent</span> : <span className="pill pill-slate">Waiting for customer</span>}
      </div>
      <div className="card-pad flex-col gap-3">
        <div className="offer-acceptance-box">
          <div className="strong fs-12">Customer clicks invoice-request link</div>
          <div className="text-faint fs-11">Personal data captured · payment method selected · contract accepted</div>
          <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
            {[
              ['bank_transfer_sepa', 'Bank transfer'],
              ['stripe_paypal', 'PayPal'],
              ['stripe_klarna', 'Klarna'],
              ['stripe_card', 'Credit Card'],
            ].map(([id, label]) => (
              <button key={id} type="button" className={`chip ${method === id ? 'active' : ''}`} disabled={invoiceSent} onClick={() => setMethod(id)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="timeline">
          <OfferFlowStep state={phase || invoiceSent ? 'done' : 'pending'} icon="external-link" title="Invoice request received" body={`${cust?.name || 'Customer'} selected ${methodLabel} and accepted the contract.`}/>
          <OfferFlowStep state={phase === 'invoice' || invoiceSent ? 'done' : 'pending'} icon="file-text" title={`POST /Invoice/Factory/createInvoiceFromOrder → ${invoiceNo}`} body="Sevdesk inherits customer, line items, discount, VAT, and dates from the offer."/>
          <OfferFlowStep state={(phase === 'stripe' || invoiceSent) ? 'done' : 'pending'} icon="wallet" title={needsStripe ? 'Stripe payment link generated' : 'SEPA payment instructions prepared'} body={needsStripe ? (order.stripePaymentLink || `https://pay.stripe.com/ef1/${order.id}`) : 'Bank transfer details inserted into invoice email.'}/>
          <OfferFlowStep state={(phase === 'email' || invoiceSent) ? 'done' : 'pending'} icon="mail" title="Invoice email sent from kundenservice@efactory1.de" body="Rechnungsversand Mail template + invoice PDF + payment link."/>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" disabled={!offerSent || invoiceSent || phase} onClick={createInvoice}><Icon name="zap" size={14}/> Simulate customer acceptance + send invoice</button>
          <button type="button" className="btn btn-success" disabled={!invoiceSent || order.outstandingEur === 0 || paying} onClick={confirmPayment}><Icon name="check" size={14}/> Confirm payment</button>
        </div>
      </div>
    </div>
  );
}

function OfferTab({ order, toast, setTab }) {
  const cust = D.customer(order.customerId);
  const defaultRate = order.pages ? Math.round((order.grossEur || 0) / order.pages) : 49;
  const [pageRate, setPageRate] = useState(order.offerPageRate || defaultRate || 49);
  const [discount, setDiscount] = useState(order.discountPct || 0);
  const [interimDate, setInterimDate] = useState(dateInputValue(order.interimDeadline) || midpointDate(order.finalDeadline));
  const [finalDate, setFinalDate] = useState(dateInputValue(order.finalDeadline));
  const [customNote, setCustomNote] = useState(order.offerNote || '');
  const [pdfReviewed, setPdfReviewed] = useState(!!order.offerPdfPreviewedAt);
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [sending, setSending] = useState(false);
  const offerNo = offerNoFor(order);
  const pages = Number(order.pages) || 0;
  const baseGross = pages * Number(pageRate || 0);
  const totalGross = Math.max(0, Math.round(baseGross * (1 - (Number(discount) || 0) / 100) * 100) / 100);
  const alreadySent = order.status === 'offer_sent' || order.status === 'invoice_sent' || !!order.offerSentAt;
  const offerSentDisplayAt = order.offerSentAt || W.lifecycleDates(order, []).offerAt;
  const canCreateOffer = order.status === 'qualified' && !alreadySent;
  const offerStatusCopy = order.status === 'qualified'
    ? 'This order is qualified. The next realistic step is creating and sending the Sevdesk offer.'
    : order.status === 'offer_sent'
      ? 'Offer already sent. Creation is locked; the next step is customer acceptance or sales follow-up.'
      : order.status === 'invoice_sent'
        ? 'Invoice already sent. The offer is read-only; the next step is payment confirmation.'
        : 'Offer creation is not available for this order status.';
  const emails = [
    {
      label: 'Email 1 · Angebot PDF',
      from: 'efactory1@efactory1.de',
      to: cust?.email || 'kunde@example.com',
      subject: 'Angebot zu deiner Arbeit von efactory1.de | Vielen Dank für dein Vertrauen!',
      attachment: `${offerNo}.pdf`,
      body: `Hallo ${offerFirstName(cust)}, herzlichen Dank für Deine Anfrage bei efactory1.de. Im Anhang findest Du unser unverbindliches Angebot über ${pages} Seiten zu ${germanMoney(totalGross)}. Bei Fragen kannst Du jederzeit direkt antworten oder telefonisch Kontakt aufnehmen.`,
    },
    {
      label: 'Email 2 · Kennenlernen + Dashboard',
      from: 'kundenservice@efactory1.de',
      to: cust?.email || 'kunde@example.com',
      subject: 'Erstes Kennenlernen mit efactory1',
      link: 'Notion Dashboard',
      body: `Hallo ${offerFirstName(cust)}, zu deinem Angebot bekommst Du hier dein persönliches Dashboard. Dort findest Du alle Antworten zum Ablauf, Kommunikation und unseren nächsten Schritten. Du kannst auch direkt ein Kennenlernen mit Berat buchen.`,
    },
  ];
  const steps = [
    ['inbox', 'Contact checked / created in Sevdesk', `${cust?.name || 'Customer'} · Kunden-Nr ${order.sevdeskCustomerNo || '9507'}`],
    ['file-text', `Offer ${offerNo} created`, `${pages} Seiten × ${germanMoney(pageRate)} · Rabatt ${discount}% · ${germanMoney(totalGross)}`],
    ['eye', 'PDF preview reviewed before send', 'Sevdesk PDF visualized with live offer data.'],
    ['mail', 'Email 1 sent with PDF attachment', 'From efactory1@efactory1.de · Angebotsversand Mail 1'],
    ['mail', 'Email 2 sent with dashboard link', 'From kundenservice@efactory1.de · Erstes Kennenlernen'],
    ['git-branch', 'Pipedrive moved to Proposal', 'Deal leaves "Qualifiziert für Ghostwriting".'],
  ];
  const sendOffer = () => {
    if (!canCreateOffer) {
      toast && toast({ tone: 'danger', text: 'Create Offer is only available while the order is Qualifiziert.' });
      return;
    }
    if (!pdfReviewed) {
      toast && toast({ tone: 'danger', text: 'Open and review the PDF preview before sending the offer emails.' });
      return;
    }
    setSending(true);
    steps.forEach((_, i) => setTimeout(() => setPhaseIndex(i), i * 540));
    setTimeout(() => {
      EFActions.orders.sendOffer(order.id, {
        status: 'offer_sent',
        sevdeskCustomerNo: order.sevdeskCustomerNo || '9507',
        sevdeskOfferNo: offerNo,
        offerPageRate: Number(pageRate) || 0,
        discountPct: Number(discount) || 0,
        grossEur: totalGross,
        outstandingEur: 0,
        paidEur: 0,
        netHonorarium: (totalGross / 1.07) * (order.rate || 0.4),
        interimDeadline: interimDate ? `${interimDate}T18:00:00` : order.interimDeadline,
        finalDeadline: finalDate ? `${finalDate}T18:00:00` : order.finalDeadline,
        offerNote: customNote,
        offerPdfPreviewedAt: '2026-05-07T14:36:00',
        offerSentAt: '2026-05-07T14:41:00',
        offerEmails: [
          { from: emails[0].from, subject: emails[0].subject, sentAt: '2026-05-07T14:39:00', attachment: `${offerNo}.pdf` },
          { from: emails[1].from, subject: emails[1].subject, sentAt: '2026-05-07T14:40:00', link: 'Notion Dashboard' },
        ],
        pipedriveStage: 'Proposal',
      });
      toast && toast({ tone: 'success', text: `${offerNo} sent · 2 Outlook emails queued exactly like Berat's manual flow` });
      setSending(false);
    }, steps.length * 540 + 120);
  };
  return (
    <div className="offer-console">
      <div className="offer-left">
        <div className={`banner ${order.status === 'invoice_sent' ? 'warn' : 'info'}`}>
          <Icon name={canCreateOffer ? 'file-text' : 'lock'} size={14}/>
          <span><strong>{canCreateOffer ? 'Next step: Create Sevdesk offer.' : 'Offer flow locked for creation.'}</strong> {offerStatusCopy}</span>
        </div>
        <ContactFormEmailCard order={order} cust={cust}/>
        <div className="card">
          <div className="card-head">
            <div className="card-title flex items-center gap-2"><Icon name="file-text" size={14}/> Sevdesk offer editor</div>
            <span className="pill pill-blue">{offerNo}</span>
          </div>
          <div className="card-pad">
            <div className="offer-editor-grid">
              <div className="field"><label>Pages</label><input value={pages} disabled/></div>
              <div className="field"><label>Price per page</label><input type="number" min="0" value={pageRate} disabled={!canCreateOffer || sending} onChange={e => setPageRate(Number(e.target.value))}/></div>
              <div className="field"><label>Discount %</label><input type="number" min="0" max="50" value={discount} disabled={!canCreateOffer || sending} onChange={e => setDiscount(Number(e.target.value))}/></div>
              <div className="field"><label>Total brutto</label><input value={germanMoney(totalGross)} disabled/></div>
              <div className="field"><label>Teillieferung</label><input type="date" value={interimDate} disabled={!canCreateOffer || sending} onChange={e => setInterimDate(e.target.value)}/></div>
              <div className="field"><label>Fertigstellung</label><input type="date" value={finalDate} disabled={!canCreateOffer || sending} onChange={e => setFinalDate(e.target.value)}/></div>
            </div>
            <div className="field mt-3">
              <label>Weitere Notiz von efactory1</label>
              <textarea rows="3" value={customNote} disabled={!canCreateOffer || sending} onChange={e => setCustomNote(e.target.value)} placeholder="Optional custom note for this proposal"/>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title flex items-center gap-2"><Icon name="zap" size={14}/> Automated send run</div>
            {alreadySent && <span className="pill pill-green">Sent {U.fmtDateTime(offerSentDisplayAt)}</span>}
          </div>
          <div className="card-pad flex-col gap-3">
            <div className="timeline">
              {steps.map((s, i) => (
                <OfferFlowStep key={s[1]} icon={s[0]} title={s[1]} body={s[2]} state={alreadySent || phaseIndex > i ? 'done' : phaseIndex === i ? 'current' : 'pending'}/>
              ))}
            </div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <button type="button" className={`btn ${pdfReviewed ? 'btn-success' : ''}`} onClick={() => setPdfReviewed(true)} disabled={!canCreateOffer || sending}>
                <Icon name={pdfReviewed ? 'check' : 'eye'} size={14}/> {pdfReviewed ? 'PDF preview reviewed' : 'Review PDF preview'}
              </button>
              <button type="button" className="btn btn-primary" onClick={sendOffer} disabled={!canCreateOffer || sending || !pdfReviewed}>
                <Icon name="send" size={14}/> {sending ? 'Sending both emails…' : 'Generate & send 2 emails'}
              </button>
            </div>
          </div>
        </div>
        <div className="offer-email-grid">
          {emails.map((email, i) => (
            <OfferEmailCard
              key={email.label}
              email={email}
              status={alreadySent ? 'sent' : phaseIndex === i + 3 ? 'sending' : phaseIndex > i + 3 ? 'sent' : null}
            />
          ))}
        </div>
        <InvoiceAutomationPanel order={order} cust={cust} totalGross={totalGross} toast={toast}/>
      </div>
      <div className="offer-right">
        <SevdeskPdfPreview
          order={order}
          cust={cust}
          offerNo={offerNo}
          pageRate={Number(pageRate) || 0}
          discount={Number(discount) || 0}
          totalGross={totalGross}
          interimDate={interimDate}
          finalDate={finalDate}
          customNote={customNote}
        />
        <div className="banner info mt-3" style={{ fontSize: 11.5 }}>
          <Icon name="lock" size={13}/>
          <span>Send is intentionally gated by PDF review so the prototype mirrors Berat opening the generated Sevdesk PDF before sending the emails.</span>
        </div>
        {order.outstandingEur === 0 && order.status === 'available' && (
          <button type="button" className="btn btn-success w-full mt-3" onClick={() => setTab('assignment')}><Icon name="feather" size={14}/> Continue to GW assignment</button>
        )}
      </div>
    </div>
  );
}

function SubmissionsTab({ order, navigate, focusSubmissionId }) {
  const subs = EFHooks.useDisplaySubmissions(order.id);
  const hasQaPending = subs.some(s => !W.isInterimKind(s.kind) && s.kind !== 'gw_invoice' && s.kind !== 'final_invoice' && s.qaStatus === QA_STATUS.PENDING);
  const focusRef = useRef(null);
  const [highlightedId, setHighlightedId] = useState(null);
  useEffect(() => {
    if (!focusSubmissionId) return;
    if (!subs.some(s => s.id === focusSubmissionId)) return;
    setHighlightedId(focusSubmissionId);
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    const fade = setTimeout(() => setHighlightedId(null), 4000);
    return () => { clearTimeout(t); clearTimeout(fade); };
  }, [focusSubmissionId, subs.length]);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Submissions</div>
        <div className="flex items-center gap-2">
          {hasQaPending && navigate && (
            <button type="button" className="btn btn-sm" onClick={() => navigate('qa', { orderId: order.id })}>
              <Icon name="shield" size={12}/> Go to QA Queue <Icon name="arrow-right" size={12}/>
            </button>
          )}
          <span className="text-faint fs-11">interim · final · invoices</span>
        </div>
      </div>
      <div className="card-pad flex-col gap-2">
        {subs.length === 0 && <div className="text-faint fs-12">No submissions yet — GW will upload via /gw/submit.</div>}
        {subs.map(s => {
          const isInterim = W.isInterimKind(s.kind);
          const isInvoice = s.kind === 'gw_invoice' || s.kind === 'final_invoice';
          const isHighlighted = highlightedId === s.id;
          return (
          <div
            key={s.id}
            ref={focusSubmissionId === s.id ? focusRef : null}
            className="card-pad"
            style={{
              border: isHighlighted ? '1px solid var(--blue)' : '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: isHighlighted ? '0 0 0 3px var(--blue-soft)' : 'none',
              transition: 'box-shadow 400ms ease, border-color 400ms ease',
            }}>
            {isHighlighted && (
              <div className="fs-11 strong" style={{ color: 'var(--blue)', marginBottom: 6 }}>
                <Icon name="navigation" size={11}/> From email · this is the new submission
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
              <div style={{ flex: 1 }}>
                <div className="strong fs-12">{s.fileName}</div>
                <div className="fs-11 text-faint">{(s.size/1024/1024).toFixed(2)} MB · {s.kind.replace('_',' ')} · round {s.round || 1} · submitted {U.relTime(s.submittedAt)}{s.synthetic ? ' · imported history' : ''}</div>
              </div>
              {isInterim && <span className="pill pill-blue"><Icon name="send" size={10}/> Auto-forwarded to customer</span>}
              {isInvoice && <span className="pill pill-slate">Archived invoice</span>}
              {!isInterim && !isInvoice && s.qaStatus === QA_STATUS.PASSED && <span className="pill pill-green"><Icon name="check" size={10}/> QA passed · forwarded</span>}
              {!isInterim && !isInvoice && s.qaStatus === QA_STATUS.PENDING && <span className="pill pill-pink">QA pending</span>}
              {!isInterim && !isInvoice && s.qaStatus === QA_STATUS.REVISION_REQUESTED && <span className="pill pill-orange">Revision requested</span>}
              {!isInterim && !isInvoice && (s.qaStatus === QA_STATUS.FLAGGED || s.flagged) && <span className="pill pill-red">QA flag</span>}
              <NotReady className="btn btn-sm" feature="submission-download" ariaLabel="Download submission"><Icon name="download" size={12}/></NotReady>
              <NotReady className="btn btn-sm" feature="submission-preview" ariaLabel="Preview submission"><Icon name="eye" size={12}/></NotReady>
            </div>
            {!isInterim && !isInvoice ? (
              <div className="flex gap-3 mt-3" style={{ flexWrap: 'wrap' }}>
                {s.plagiarismScore != null ? <ScoreBar value={s.plagiarismScore} label="Plagiarism" /> : <span className="text-faint fs-11">Plagiarism score unavailable in imported history.</span>}
                {s.aiScore != null ? <ScoreBar value={s.aiScore} label="AI detection" /> : <span className="text-faint fs-11">AI score unavailable in imported history.</span>}
              </div>
            ) : isInterim ? (
              <div className="banner info mt-3" style={{ fontSize: 11.5 }}>
                <Icon name="send" size={12}/>
                <span>Interim submissions bypass manual QA and are sent to the customer immediately after upload per SOP 2.</span>
              </div>
            ) : (
              <div className="banner info mt-3" style={{ fontSize: 11.5 }}>
                <Icon name="file-text" size={12}/>
                <span>GW invoice is stored for Friday-batch payout checks; it is not a QA submission.</span>
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}

function CommsTab({ order, toast }) {
  const [channelFilter, setChannelFilter] = useState('all');
  const [reply, setReply] = useState('');
  const [deliveryRail, setDeliveryRail] = useState('email');
  const cust = D.customer(order.customerId);
  const gw = D.gw(order.gwId);
  const customerInitials = cust?.initials || 'CU';
  const gwInitials = gw?.initials || 'GW';
  const thread = EFHooks.useThreadByOrder(order.id);

  const normalizeLegacyChannel = (value) => {
    if (value === 'email_proxy') return 'email';
    if (value === 'whatsapp_proxy') return 'whatsapp';
    if (value === 'platform_chat') return 'platform';
    if (value === 'voice_metadata') return 'voice';
    if (value === 'multi_channel') return 'multi';
    return value || 'platform';
  };
  const fallbackOrigin = normalizeLegacyChannel(thread?.channel);
  const enriched = useMemo(() => {
    return [...(thread?.messages || [])]
      .map(m => ({
        ...m,
        origin_channel: m.origin_channel || (m.from === 'admin' ? 'admin' : m.from === 'system' ? 'system' : fallbackOrigin),
        delivery_channel: m.delivery_channel || (m.from === 'system' ? 'internal' : fallbackOrigin === 'multi' ? 'email' : fallbackOrigin),
      }))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [thread?.messages, fallbackOrigin]);

  const channelLabel = (channel) => {
    if (channel === 'whatsapp') return 'WhatsApp';
    if (channel === 'platform') return 'Platform';
    if (channel === 'voice') return 'Voice';
    if (channel === 'system' || channel === 'internal') return 'System';
    return 'Email';
  };
  const displayChannel = (m) => {
    if (m.from === 'admin') return m.delivery_channel || 'email';
    return m.origin_channel || m.delivery_channel || 'platform';
  };
  const matchesFilter = (m) => {
    if (channelFilter === 'all') return true;
    if (channelFilter === 'email') return m.origin_channel === 'email' || (m.from === 'admin' && m.delivery_channel === 'email');
    if (channelFilter === 'whatsapp') return m.origin_channel === 'whatsapp' || (m.from === 'admin' && m.delivery_channel === 'whatsapp');
    if (channelFilter === 'platform') return m.origin_channel === 'platform' || (m.from === 'admin' && m.delivery_channel === 'platform');
    return true;
  };
  const visibleMessages = enriched.filter(matchesFilter);
  const hiddenCount = enriched.length - visibleMessages.length;
  const hiddenLabel = channelFilter === 'all' ? '' : ['email', 'whatsapp', 'platform']
    .filter(ch => ch !== channelFilter)
    .map(channelLabel)
    .join('/');

  const sendReply = () => {
    if (!reply.trim()) return;
    const msg = EFActions.threads.send({
      threadId: thread?.id,
      orderId: order.id,
      role: 'admin',
      body: reply,
      origin_channel: 'admin',
      delivery_channel: deliveryRail,
    });
    if (msg) {
      toast && toast({ tone: 'success', text: `Reply sent via ${channelLabel(deliveryRail)} · order #${order.id}` });
      setReply('');
    }
  };

  return (
    <div className="chat-shell chat-shell-soft">
      <div className="chat-header">
        <div className="chat-title">
          <div>
            <span className="chat-title-main">Unified communications</span>
            <span className="chat-title-sub">Order #{order.id} · channel is metadata on each bubble</span>
          </div>
        </div>
        <div className="flex gap-1">
          {[
            ['all', 'All'],
            ['email', 'Email'],
            ['whatsapp', 'WhatsApp'],
            ['platform', 'Platform'],
          ].map(([id, label]) => (
            <button type="button" key={id} className={`chip ${channelFilter === id ? 'active' : ''}`} onClick={() => setChannelFilter(id)}>{label}</button>
          ))}
        </div>
      </div>
      <ChatNotice compact>
        One order thread, multiple doors in. Email, WhatsApp and portal rows stay chronological; filters only hide rows temporarily.
      </ChatNotice>
      {hiddenCount > 0 && (
        <ChatNotice compact icon="eye-off">
          {hiddenCount} message{hiddenCount === 1 ? '' : 's'} hidden while filtered to {channelLabel(channelFilter)} ({hiddenLabel}).
        </ChatNotice>
      )}
      <div className="chat-stream" style={{ maxHeight: 560 }}>
        {visibleMessages.length === 0 && (
          <EmptyState compact icon="message-square" title="No messages in this view" body={enriched.length ? 'Switch back to All to see the full order thread.' : 'Messages for this order will appear here.'}/>
        )}
        {visibleMessages.map((m, i) => {
          const sys = m.from === 'system' || m.system;
          if (sys) return <ChatMessage key={m.id || i} system at={m.at}>{m.body}</ChatMessage>;
          const mine = m.from === 'admin';
          const sender = m.from === 'gw'
            ? (gw?.name || 'Ghostwriter')
            : m.from === 'customer'
              ? (cust?.name || 'Customer')
              : 'efactory1';
          const initials = m.from === 'gw'
            ? gwInitials
            : m.from === 'customer'
              ? customerInitials
              : 'EF';
          const prev = visibleMessages[i - 1];
          const grouped = !!prev && prev.from === m.from && !(prev.from === 'system' || prev.system);
          return (
            <ChatMessage
              key={m.id || i}
              mine={mine}
              sender={sender}
              initials={initials}
              at={m.at}
              grouped={grouped}
              channel={!grouped ? channelLabel(displayChannel(m)) : null}
              attachments={m.attachments}
              status={mine ? `sent via ${channelLabel(m.delivery_channel)}` : null}
            >
              {m.body}
            </ChatMessage>
          );
        })}
      </div>
      <ChatComposer
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        onSend={sendReply}
        placeholder={`Reply about order #${order.id}...`}
        sendLabel={`Send via ${channelLabel(deliveryRail)}`}
        actions={<>
          <div className="flex gap-1">
            {['email', 'whatsapp'].map(ch => (
              <button type="button" key={ch} className={`chip ${deliveryRail === ch ? 'active' : ''}`} onClick={() => setDeliveryRail(ch)}>{channelLabel(ch)}</button>
            ))}
          </div>
          <NotReady className="chat-icon-action" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={15}/></NotReady>
        </>}
      />
    </div>
  );
}

function AssignmentTab({ order, navigate, toast }) {
  const gw = D.gw(order.gwId);
  const assignmentEvents = EFHooks.useOrderEvents(order.id).filter(e => e.domain === 'assignment');
  // Phase 4 — three assignment paths + multi-applicant approval. Pulls live
  // applications from the store so admins see new GW applications appear.
  EFHooks.useStore(s => s.meta.version);
  const applicationsTable = EFHooks.useStore(s => s.entities.gw_applications);
  const pendingApplications = (applicationsTable?.allIds || [])
    .map(id => applicationsTable.byId[id])
    .filter(a => a && a.orderId === order.id && a.status === 'pending');
  const allApplications = (applicationsTable?.allIds || [])
    .map(id => applicationsTable.byId[id])
    .filter(a => a && a.orderId === order.id);
  const boardOpen = order.assignmentMode === 'job_board' && order.jobBoardStatus === 'open';
  const [postModalOpen, setPostModalOpen] = useState(false);
  const onPostToBoard = () => setPostModalOpen(true);
  const onConfirmPost = (patch) => {
    const res = EFActions.orders.publishJobToBoard(order.id, { patch });
    if (res?.ok && toast) toast({ tone: 'success', text: `#${order.id} published to GW Job Board · ${res.alreadyOpen ? 'still open' : 'eligible GWs notified'}` });
    setPostModalOpen(false);
  };
  const onSelfAssign = () => {
    const owner = D.GHOSTWRITERS.find(g => g.isOwner) || { id: 'gw-bo', name: 'Berat Özdemir', isOwner: true };
    EFActions.orders.assignGw(order.id, owner.id, { selfAssigned: true });
    if (toast) toast({ tone: 'success', text: `Self-assigned · no GW payout workflow` });
  };
  const onApproveApplication = (appId) => {
    const res = EFActions.orders.approveApplication(appId);
    if (res?.ok && toast) toast({ tone: 'success', text: `Application approved · ${res.rejectedCount} other applicant(s) auto-rejected` });
  };
  // Per PRD order_lifecycle: assignment can happen only after the offer/invoice has been paid
  // (state ≥ "paid"/"available"). Earlier states must complete the offer→invoice→payment path
  // first. Self-assign goes straight to active without posting to the board.
  const isPrePay = W.isPrePayment(order);
  const isPostFinal = W.isPostFinal(order) || order.status === 'cancelled';
  const assignBlocked = isPrePay || isPostFinal;
  const blockReason = isPrePay
    ? 'Order must be paid before GW assignment. Send invoice and confirm payment first.'
    : isPostFinal
      ? 'Order is past the assignment window. Use “Reassign” from Disputes if a switch is needed.'
      : null;
  const onAssign = (g) => {
    if (assignBlocked) {
      if (toast) toast({ text: blockReason, tone: 'danger' });
      return;
    }
    EFActions.orders.assignGw(order.id, g.id, { selfAssigned: !!g.isOwner });
    if (toast) toast({
      tone: 'success',
      transition: { entity: `Order #${order.id}`, from: order.status === 'available' ? 'On Job Board' : 'Awaiting Assignment', to: 'Active' },
      text: `${g.name} assigned · briefing + customer intro emails queued`,
    });
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {assignBlocked && (
        <div className="banner warn" style={{ gridColumn: '1 / -1' }}>
          <Icon name="lock" size={14}/>
          <span><strong>Assignment locked.</strong> {blockReason}</span>
        </div>
      )}

      {!assignBlocked && !order.gwId && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-head">
            <div className="card-title">Assignment path</div>
            {boardOpen && <span className="pill pill-blue">On Job Board · {pendingApplications.length} pending</span>}
          </div>
          <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <button type="button" className="btn" disabled={boardOpen} onClick={() => document.getElementById('assignment-direct-list')?.scrollIntoView({ behavior: 'smooth' })}>
              <Icon name="user" size={14}/> Direct assign
            </button>
            <button type="button" className="btn" disabled={boardOpen} onClick={onSelfAssign}>
              <Icon name="feather" size={14}/> Self-assign (Berat)
            </button>
            <button type="button" className={`btn ${boardOpen ? '' : 'btn-primary'}`} disabled={boardOpen} onClick={onPostToBoard}>
              <Icon name="clipboard-list" size={14}/> {boardOpen ? 'Published to board' : 'Post to GW board'}
            </button>
          </div>
          <div className="card-pad" style={{ paddingTop: 0, fontSize: 11.5, color: 'var(--text-3)' }}>
            <Icon name="zap" size={12}/> Posting opens the order to all eligible (non-shadow-banned) GWs. Berat then approves exactly one application; others are auto-rejected.
          </div>
        </div>
      )}

      {!assignBlocked && boardOpen && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-head">
            <div className="card-title">Pending applications</div>
            <span className="text-faint fs-11">{pendingApplications.length} pending · {allApplications.length} total</span>
          </div>
          <div className="card-pad flex-col gap-2">
            {pendingApplications.length === 0 && (
              <div className="text-faint fs-12">Noch keine Bewerbungen. Wechseln Sie in die GW-Rolle und reichen Sie eine Bewerbung über das Job Board ein.</div>
            )}
            {pendingApplications.map(app => {
              const g = D.gw(app.gwId);
              return (
                <div key={app.id} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <Avatar initials={g?.initials || app.gwId.slice(-2).toUpperCase()} size={32}/>
                  <div className="flex-col" style={{ flex: 1 }}>
                    <strong className="fs-12">{g?.name || app.gwId}</strong>
                    <span className="fs-11 text-faint">{g?.expertise?.slice(0, 3).join(', ') || '—'}</span>
                    {app.pitch && <span className="fs-11" style={{ color: 'var(--text-2)', marginTop: 4 }}>“{app.pitch}”</span>}
                  </div>
                  <span className="fs-11 text-faint mono">{U.fmtDateTime(app.appliedAt)}</span>
                  <button type="button" className="btn btn-sm btn-success" onClick={() => onApproveApplication(app.id)}>
                    <Icon name="check" size={11}/> Approve
                  </button>
                </div>
              );
            })}
            {allApplications.filter(a => a.status !== 'pending').length > 0 && (
              <div className="fs-11 text-faint" style={{ marginTop: 6 }}>
                <Icon name="history" size={11}/> {allApplications.filter(a => a.status === 'approved').length} approved · {allApplications.filter(a => a.status === 'rejected').length} auto-rejected
              </div>
            )}
          </div>
        </div>
      )}

      <div id="assignment-direct-list" className="card">
        <div className="card-head"><div className="card-title">GW selection</div></div>
        <div className="card-pad flex-col gap-2">
          {D.GHOSTWRITERS.filter(g => !g.banned && !g.isOwner).slice(0, 6).map(g => {
            // Deterministic match score — stable across renders, derived from gw + order ids
            const exact = (g.expertise || []).some(e => e.toLowerCase().includes((order.field || '').toLowerCase().slice(0, 4)));
            const seed = ((g.id.charCodeAt(3) * 17) + Number(order.id)) % 41; // 0..40
            const match = exact ? 92 : 50 + seed;
            return (
              <div key={g.id} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                <Avatar initials={g.initials} size={32}/>
                <div className="flex-col" style={{ flex: 1 }}>
                  <strong className="fs-12">{g.name}</strong>
                  <span className="fs-11 text-faint">{g.expertise?.slice(0,3).join(', ')}</span>
                </div>
                <div className="text-right" style={{ width: 120 }}>
                  <div className="fs-11 text-faint">workload</div>
                  <div className="fs-12 mono">{g.active}/{g.active > 4 ? 'overloaded' : 'free'}</div>
                </div>
                <div className="text-right" style={{ width: 80 }}>
                  <div className="fs-11 text-faint">match</div>
                  <div className="mono fs-12 strong" style={{ color: match > 80 ? 'var(--green)' : 'var(--text-2)' }}>{match}%</div>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => onAssign(g)} disabled={order.gwId === g.id || assignBlocked} title={assignBlocked ? blockReason : null}>{order.gwId === g.id ? 'Assigned' : 'Assign'}</button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Notification preview</div></div>
        <div className="card-pad flex-col gap-2 fs-11">
          <div style={{ padding: 10, border: '1px dashed var(--border)', borderRadius: 8 }}>
            <div className="strong mb-1"><Icon name="mail" size={11}/> To: GW · "Briefing — NICHT WEITERLEITEN"</div>
            <div className="text-muted">Auftragsdetails, Lieferdaten, Honorar, AGB v3.2…</div>
          </div>
          <div style={{ padding: 10, border: '1px dashed var(--border)', borderRadius: 8 }}>
            <div className="strong mb-1"><Icon name="mail" size={11}/> To: Customer · "Ihr Ghostwriter wurde zugewiesen"</div>
            <div className="text-muted">GW-Vorstellung, Kontaktdaten, CC kundenservice@efactory1.de</div>
          </div>
          <div className="banner info" style={{ fontSize: 11 }}><Icon name="zap" size={12}/><span>Both emails fire simultaneously on 'Approve & notify'.</span></div>
        </div>
      </div>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="card-head"><div className="card-title">Assignment history</div><span className="text-faint fs-11">{assignmentEvents.length} event(s)</span></div>
        <div className="card-pad">
          {assignmentEvents.length === 0 ? (
            <EmptyState compact icon="briefcase" title="Assignment not reached" body={blockReason || 'The order has no job-board or GW assignment events yet.'}/>
          ) : (
            <div className="timeline">
              {assignmentEvents.map(e => (
                <div key={`${e.key}-${e.at}`} className="timeline-item">
                  <div className={`timeline-dot ${e.dot || ''}`}><Icon name={e.icon || 'dot'} size={10}/></div>
                  <div className="timeline-content">
                    <div className="timeline-title">{e.title}</div>
                    {e.detail && <div className="timeline-meta">{e.detail}</div>}
                    <div className="timeline-meta mono">{U.fmtDateTime(e.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {postModalOpen && (
        <PostToBoardModal order={order} onCancel={() => setPostModalOpen(false)} onConfirm={onConfirmPost}/>
      )}
    </div>
  );
}

function PostToBoardModal({ order, onCancel, onConfirm }) {
  const toDateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');
  const [form, setForm] = useState({
    title: order.titleTBD ? '' : (order.title || ''),
    workType: order.workType || 'hausarbeit',
    field: order.field || '',
    pages: order.pages ?? '',
    finalDeadline: toDateInput(order.finalDeadline),
    interimDeadline: toDateInput(order.interimDeadline),
    netHonorarium: order.netHonorarium ?? '',
    gwBoardNote: order.gwBoardNote || order.offerNote || '',
  });
  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const submit = () => {
    const patch = {
      title: form.title.trim() || order.title || 'Titel folgt',
      titleTBD: !form.title.trim(),
      workType: form.workType,
      field: form.field.trim(),
      pages: form.pages === '' ? null : Number(form.pages),
      finalDeadline: form.finalDeadline ? `${form.finalDeadline}T18:00:00` : null,
      interimDeadline: form.interimDeadline ? `${form.interimDeadline}T18:00:00` : null,
      netHonorarium: form.netHonorarium === '' ? null : Number(form.netHonorarium),
      gwBoardNote: form.gwBoardNote.trim() || null,
    };
    onConfirm(patch);
  };
  const workTypeOptions = Object.entries(D.WORK_TYPE_LABELS || {});
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Auftrag für GW Job Board veröffentlichen · #{order.id}</div>
            <div className="text-faint fs-11 mt-1">Felder anpassen — so erscheint der Auftrag auf dem Board.</div>
          </div>
          <button className="btn btn-sm" onClick={onCancel}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Titel der Arbeit</span>
            <input type="text" value={form.title} onChange={set('title')} placeholder="z.B. BWIP01 – Wirtschaftspolitik" className="input"/>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Art der Arbeit</span>
            <select value={form.workType} onChange={set('workType')} className="input">
              {workTypeOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Fachbereich</span>
            <input type="text" value={form.field} onChange={set('field')} placeholder="z.B. BWL, Jura" className="input"/>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Seitenanzahl</span>
            <input type="number" min={1} max={400} value={form.pages} onChange={set('pages')} className="input"/>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Gesamthonorar Netto (€)</span>
            <input type="number" min={0} step="0.01" value={form.netHonorarium} onChange={set('netHonorarium')} className="input"/>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Verbindlicher 1. Zwischenstand (bis 18 Uhr)</span>
            <input type="date" value={form.interimDeadline} onChange={set('interimDeadline')} className="input"/>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Verbindliches Finales Lieferdatum (bis 18 Uhr)</span>
            <input type="date" value={form.finalDeadline} onChange={set('finalDeadline')} className="input"/>
          </label>
          <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="fs-11 strong">Weitere Notiz von efactory1.de</span>
            <textarea rows={3} value={form.gwBoardNote} onChange={set('gwBoardNote')} placeholder="z.B. 10 Seiten Hausarbeit + 5 Folien PowerPoint" className="input" style={{ resize: 'vertical' }}/>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Abbrechen</button>
          <button className="btn btn-primary" onClick={submit}>
            <Icon name="clipboard-list" size={14}/> Auf Job Board veröffentlichen
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditTab({ order, events }) {
  const fallbackRows = EFHooks.useOrderEvents(order.id);
  const rows = events || fallbackRows;
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Audit log</div><span className="text-faint fs-11">{rows.length} synchronized event(s)</span></div>
      <div className="card-pad">
        {rows.length === 0 ? (
          <EmptyState compact icon="history" title="No audit events" body="This order has no lifecycle events yet."/>
        ) : (
          <div className="timeline">
            {rows.map(e => (
            <div key={`${e.key}-${e.at}`} className="timeline-item">
              <div className={`timeline-dot ${e.dot || ''}`}><Icon name={e.icon || 'dot'} size={10}/></div>
              <div className="timeline-content">
                <div className="timeline-title">{e.title} <span className="pill pill-slate" style={{ fontSize: 9, marginLeft: 6 }}>{e.domain}</span></div>
                {e.detail && <div className="timeline-meta">{e.detail}</div>}
                <div className="timeline-meta mono">{U.fmtDateTime(e.at)}</div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ QA ORDER DETAIL (no financials) ============
// Q-01: QA reviewers must NOT see release gate, gross/honorarium, margin, payments, Stripe webhooks,
// invoice numbers, lifetime value, or rate sliders. PRD `qa.permissions` = review/approve/reject + orders.read.
// This component renders only QA-relevant fields and submission scores.

export { OrderDetail, SubmissionsTab, CommsTab, AssignmentTab, AuditTab };
