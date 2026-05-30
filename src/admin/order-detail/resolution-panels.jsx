// Admin · Order detail · resolution panels for stuck states.
// Each panel handles one "exit a wait state" admin action — extension,
// delay, dispute, QA violation. Extracted from order-detail.jsx as part of
// the Arch-05 split so the parent shell stays focused on layout.

import React, { useState } from 'react';
import { Icon } from '../../../utils.jsx';
import * as U from '../../../utils.jsx';
import * as W from '../../core/workflow.js';
import EFActions from '../../core/actions.js';
import EF from '../../core/ef.js';
const D = EF;

const DISPUTE_REASON_LABEL = {
  out_of_scope: 'Out of scope',
  unresponsive: 'Unresponsive',
  quality: 'Quality / requirements',
  abusive: 'Abusive behavior',
  late: 'Deadline issue',
  other: 'Other',
};
const DISPUTE_OUTCOME_LABEL = {
  continue_revision: 'A. Continue revision (chat unlocks · GW resumes)',
  reassign_gw: 'B. Reassign GW (back to job board)',
  cancel_refund: 'C. Refund + cancel order',
  scope_amendment: 'D. Scope amendment (extension / extra fee)',
};

function ExtensionResolutionPanel({ order, toast }) {
  const ext = order.extensionPending || {};
  const [overrideDeadline, setOverrideDeadline] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const onApprove = () => {
    EFActions.orders.approveExtension(order.id, overrideDeadline ? { newDeadline: overrideDeadline + 'T18:00:00' } : {});
    toast && toast({ tone: 'success', transition: { entity: `Order #${order.id}`, from: 'Extension Requested', to: 'Customer Approval' }, text: 'Extension approved · sent to customer for approval + payment before scope changes' });
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

// Quick-contact compose modal — opens when admin clicks Email / WhatsApp on
// the dispute panel. Posts into the System B conversation for that contact
// AND auto-logs the message onto the dispute (audit trail per
// docs/flows/dispute/dispute_flow_design_review.md §7).
function QuickContactModal({ orderId, recipient, medium, partyName, onClose, onSent, toast }) {
  const [subject, setSubject] = useState(`Order #${orderId} · dispute`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const isEmail = medium === 'email';
  const canSend = body.trim().length > 0 && !sending;
  const send = () => {
    if (!canSend) return;
    setSending(true);
    const message = EFActions.disputes.sendContact(orderId, {
      recipient,
      medium,
      subject: isEmail ? subject.trim() : undefined,
      body: body.trim(),
    });
    if (message) {
      toast && toast({ tone: 'success', text: `${isEmail ? 'Email' : 'WhatsApp message'} sent to ${partyName} · logged on dispute.` });
      onSent && onSent(message);
    } else {
      setSending(false);
    }
  };
  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 540, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-title flex items-center gap-2">
            <Icon name={isEmail ? 'mail' : 'message-square'} size={14} style={{ color: isEmail ? 'var(--blue)' : 'var(--green)' }}/>
            {isEmail ? 'Email' : 'WhatsApp'} {partyName}
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}><Icon name="x" size={12}/></button>
        </div>
        <div className="card-pad flex-col gap-3">
          <div className="text-faint fs-11">
            Posts into the existing System B conversation for this contact · auto-logged on this dispute.
          </div>
          {isEmail && (
            <div>
              <label className="fs-12 strong mb-1" style={{ display: 'block' }}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
          )}
          <div>
            <label className="fs-12 strong mb-1" style={{ display: 'block' }}>Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={isEmail
                ? `Hi ${partyName},\n\nI'm reaching out about the dispute on order #${orderId}. Could you…`
                : `Hi ${partyName}, just spoke with the other side — could you confirm…`}
              style={{ width: '100%', minHeight: 140, resize: 'vertical', padding: 10, fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-sm btn-primary" disabled={!canSend} onClick={send}>
              <Icon name="send" size={12}/> Send {isEmail ? 'email' : 'WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisputeResolutionPanel({ order, toast }) {
  const dispute = W.currentOpenDispute(order);
  const [outcome, setOutcome] = useState('continue_revision');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [alsoBlockGw, setAlsoBlockGw] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [extraFee, setExtraFee] = useState('');
  const [extraPages, setExtraPages] = useState('');
  const [contactModal, setContactModal] = useState(null); // null | { recipient, medium }
  const [freeNote, setFreeNote] = useState('');
  const cust = D.customer(order.customerId);
  const gw = D.gw(order.gwId);
  const notes = dispute?.adminNotes || [];
  const canResolve = outcomeNote.trim().length >= 10 && (
    outcome !== 'scope_amendment' || !!newDeadline
  );

  const resolve = () => {
    if (!canResolve) return;
    const payload = { outcome, outcomeNote: outcomeNote.trim() };
    if (outcome === 'reassign_gw') {
      payload.alsoBlockGwAccount = alsoBlockGw;
    } else if (outcome === 'cancel_refund') {
      const amount = Number(refundAmount) || 0;
      if (amount > 0) payload.refundAmount = amount;
    } else if (outcome === 'scope_amendment') {
      payload.newDeadline = newDeadline;
      const fee = Number(extraFee) || 0;
      const pages = Number(extraPages) || 0;
      if (fee) payload.extraFee = fee;
      if (pages) payload.extraPages = pages;
    }
    const ok = EFActions.disputes.resolve(order.id, payload);
    if (!ok) return;
    toast && toast({
      tone: 'success',
      transition: { entity: `Order #${order.id}`, from: 'Dispute open', to: DISPUTE_OUTCOME_LABEL[outcome].split(' (')[0] },
      text: 'Dispute closed · customer + GW notified',
    });
  };

  const addFreeNote = () => {
    const body = freeNote.trim();
    if (!body) return;
    EFActions.disputes.addNote(order.id, { body, channel: 'platform_note' });
    setFreeNote('');
    toast && toast({ tone: 'info', text: 'Note added to dispute log.' });
  };

  // The panel only renders when the order is disputed (isOrderDisputed), which
  // is now exactly "has an open structured dispute", so `dispute` is always set.
  // Guard defensively all the same.
  if (!dispute) return null;

  const openerLabel = dispute.openedBy === 'gw' ? `${gw?.name || 'GW'} (ghostwriter)` : `${cust?.name || 'Customer'} (customer)`;
  const partyForContact = (recipient) => recipient === 'gw' ? (gw?.name || 'GW') : (cust?.name || 'Customer');

  return (
    <div className="card mb-3" style={{ borderLeft: '4px solid var(--orange)' }}>
      <div className="card-head">
        <div className="card-title flex items-center gap-2">
          <Icon name="alert-triangle" size={14} style={{ color: 'var(--orange)' }}/>
          Dispute · opened by {dispute.openedBy === 'gw' ? gw?.name || 'GW' : cust?.name || 'Customer'}
        </div>
        <span className="text-faint fs-11">{dispute.openedAt ? U.relTime(dispute.openedAt) : '—'}</span>
      </div>
      <div className="card-pad flex-col gap-3">
        <div className="kv" style={{ fontSize: 12 }}>
          <div className="kv-row"><dt>Opened by</dt><dd><strong>{openerLabel}</strong></dd></div>
          <div className="kv-row"><dt>Category</dt><dd>{DISPUTE_REASON_LABEL[dispute.reasonCategory] || dispute.reasonCategory}</dd></div>
          <div className="kv-row"><dt>Platform chat</dt><dd className="text-faint">PAUSED — customer + GW cannot post</dd></div>
          <div className="kv-row"><dt>Payment</dt><dd className="text-faint">blocked from Friday release</dd></div>
        </div>
        <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
          {dispute.reason}
        </div>

        {/* Quick contact — one click opens compose modal */}
        <div>
          <div className="fs-11 strong mb-1">Quick contact <span className="text-faint">— message posts to System B + auto-logs below</span></div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={() => setContactModal({ recipient: 'customer', medium: 'email' })} disabled={!cust}>
              <Icon name="mail" size={12}/> Email {cust?.name || 'customer'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setContactModal({ recipient: 'customer', medium: 'whatsapp' })} disabled={!cust}>
              <Icon name="message-square" size={12}/> WhatsApp {cust?.name || 'customer'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setContactModal({ recipient: 'gw', medium: 'email' })} disabled={!gw}>
              <Icon name="mail" size={12}/> Email {gw?.name || 'GW'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setContactModal({ recipient: 'gw', medium: 'whatsapp' })} disabled={!gw}>
              <Icon name="message-square" size={12}/> WhatsApp {gw?.name || 'GW'}
            </button>
          </div>
        </div>

        {/* Admin notes log */}
        <div>
          <div className="fs-11 strong mb-1">Admin notes ({notes.length})</div>
          {notes.length === 0 && <div className="text-faint fs-11">No notes yet. Quick-contact messages and free notes appear here.</div>}
          {notes.length > 0 && (
            <div className="flex-col gap-1" style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
              {notes.map(n => {
                const icon = n.channel === 'email' ? 'mail' : n.channel === 'whatsapp' ? 'message-square' : n.channel === 'phone' ? 'phone' : 'edit';
                const label = n.channel === 'email' ? `📧 Email → ${n.recipient || ''}`
                            : n.channel === 'whatsapp' ? `💬 WhatsApp → ${n.recipient || ''}`
                            : n.channel === 'phone' ? `📞 Phone → ${n.recipient || ''}`
                            : `📝 Note`;
                return (
                  <div key={n.id} style={{ padding: 8, background: 'var(--surface-2)', borderRadius: 6, fontSize: 11.5 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={icon} size={11} className="text-faint"/>
                      <span className="strong">{label}</span>
                      <span className="text-faint" style={{ marginLeft: 'auto' }}>{U.relTime(n.at)}</span>
                    </div>
                    <div style={{ lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{n.body}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <input
              value={freeNote}
              onChange={e => setFreeNote(e.target.value)}
              placeholder="Add a free note (e.g. 'phone call with Sven — agreed to ...')"
              style={{ flex: 1, padding: 8, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)' }}
            />
            <button type="button" className="btn btn-sm" onClick={addFreeNote} disabled={!freeNote.trim()}>
              <Icon name="plus" size={11}/> Add note
            </button>
          </div>
        </div>

        {/* Outcome selector */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="fs-11 strong mb-2">Resolve</div>
          <div className="flex-col gap-2">
            {Object.entries(DISPUTE_OUTCOME_LABEL).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 fs-12" style={{ cursor: 'pointer' }}>
                <input type="radio" name="dispute-outcome" value={value} checked={outcome === value} onChange={() => setOutcome(value)}/>
                <span>{label}</span>
              </label>
            ))}
          </div>
          {outcome === 'reassign_gw' && (
            <label className="flex-col gap-1 fs-12 mt-2" style={{ cursor: 'pointer' }}>
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={alsoBlockGw} onChange={e => setAlsoBlockGw(e.target.checked)}/>
                <span>Flag {gw?.name || 'GW'}'s account for review</span>
              </span>
              <span className="text-faint fs-11" style={{ marginLeft: 22 }}>
                Records <code>accountBlockedAt</code> + reason on the GW for follow-up. (Prototype: login is not yet enforced.)
              </span>
            </label>
          )}
          {outcome === 'cancel_refund' && (
            <div className="flex items-center gap-2 mt-2">
              <label className="fs-11 text-muted">Refund amount (€):</label>
              <input type="number" min="0" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0" style={{ width: 120, padding: 6, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)' }}/>
            </div>
          )}
          {outcome === 'scope_amendment' && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <label className="fs-11 text-muted">New deadline:</label>
              <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} style={{ padding: 6, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)' }}/>
              <label className="fs-11 text-muted">Extra fee (€):</label>
              <input type="number" min="0" step="0.01" value={extraFee} onChange={e => setExtraFee(e.target.value)} style={{ width: 100, padding: 6, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)' }}/>
              <label className="fs-11 text-muted">Extra pages:</label>
              <input type="number" min="0" value={extraPages} onChange={e => setExtraPages(e.target.value)} style={{ width: 70, padding: 6, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)' }}/>
            </div>
          )}
          <label className="fs-11 text-muted mt-2 mb-1" style={{ display: 'block' }}>Resolution note (min. 10 chars · explains the decision):</label>
          <textarea
            style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: 10, fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="What was agreed and why this outcome…"
            value={outcomeNote}
            onChange={e => setOutcomeNote(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button type="button" className="btn btn-success btn-sm" disabled={!canResolve} onClick={resolve}>
              <Icon name="check" size={12}/> Close dispute with outcome
            </button>
          </div>
        </div>
      </div>
      {contactModal && (
        <QuickContactModal
          orderId={order.id}
          recipient={contactModal.recipient}
          medium={contactModal.medium}
          partyName={partyForContact(contactModal.recipient)}
          onClose={() => setContactModal(null)}
          onSent={() => setContactModal(null)}
          toast={toast}
        />
      )}
    </div>
  );
}

function ViolationResolutionPanel({ order, submissions, toast }) {
  const isPlag = order.status === 'plagiarism_violation_review';
  const flaggedSub = (submissions || []).find(s => s.flagged) || (submissions || [])[0];
  const gw = D.gw(order.gwId);
  const onConfirm = () => {
    EFActions.orders.confirmViolation(order.id, { reason: order.qaFlagReason });
    toast && toast({ tone: 'danger', transition: { entity: `Order #${order.id}`, from: isPlag ? 'Plagiarism Violation' : 'AI Violation', to: 'On Job Board (reassigning)' }, text: 'Violation confirmed · GW account blocked · customer notified about reassignment' });
  };
  const onClear = () => {
    EFActions.orders.clearViolation(order.id, 'Reviewed and cleared after admin investigation');
    toast && toast({ tone: 'success', transition: { entity: `Order #${order.id}`, from: isPlag ? 'Plagiarism Violation' : 'AI Violation', to: order.finalSubmittedAt ? 'Customer Review' : 'QA Review' }, text: 'False positive · flag cleared · GW + customer notified' });
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
              {gw?.lifetime || 0} jobs · ★{gw?.rating?.toFixed?.(1) || '—'} · on-time {Math.round((gw?.onTime || 0) * 100)}% {gw?.accountBlockedAt ? '· account already blocked' : (gw?.banned && '· already shadow-banned')}
            </div>
          </div>
        </div>
        <div className="text-muted fs-12 mb-2" style={{ lineHeight: 1.5 }}>
          {isPlag
            ? 'Confirm to block the GW account and return the order to the job board for reassignment. Customer is notified about the reassignment without mentioning the violation.'
            : 'Confirm to block the GW account and reassign. Clear if the AI score is a false positive (legitimate writing flagged by GPTZero).'}
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}><Icon name="x" size={12}/> Confirm violation · block + reassign</button>
          <button type="button" className="btn btn-success btn-sm" onClick={onClear}><Icon name="check" size={12}/> False positive · clear flag</button>
          <button type="button" className="btn btn-sm" onClick={() => toast && toast({ tone: 'info', text: `Audit thread opened with ${gw?.name || 'GW'}` })}><Icon name="message-square" size={12}/> Open audit thread</button>
        </div>
      </div>
    </div>
  );
}

export { ExtensionResolutionPanel, DelayResolutionPanel, DisputeResolutionPanel, ViolationResolutionPanel };
