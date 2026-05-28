// QA · Order detail — restricted view (no financials per PRD qa.permissions).

import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as W from '../core/workflow.js';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
import { QA_STATUS } from '../core/status.js';
import { SubmissionsTab } from '../admin/order-detail.jsx';
const D = EF;

function QAOrderDetail({ orderId, navigate, toast, initialTab }) {
  // URL-bound (Arch-04): tab clicks push via replaceState; ?tab= is the source.
  const tab = initialTab || 'overview';
  const setTab = (t) => {
    const params = { id: orderId };
    if (t && t !== 'overview') params.tab = t;
    navigate('order-detail', params, { replace: true });
  };
  const order = EFHooks.useOrder(orderId);
  const actualSubs = EFHooks.useSubmissions({ orderId });
  const displaySubs = EFHooks.useDisplaySubmissions(orderId);
  const chat = EFHooks.useOrderChat(orderId);
  if (!order) return <div className="page">Order not found.</div>;
  const cust = D.customer(order.customerId);
  const gw = D.gw(order.gwId);
  const dm = U.deadlineMeta(order.finalDeadline);
  const latest = displaySubs
    .filter(s => W.isQaReviewKind(s.kind))
    .sort((a,b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))[0];
  const latestActionable = latest && actualSubs.find(s => s.id === latest.id && W.isQaReviewKind(s.kind));
  const canReviewLatest = !!(latestActionable && latestActionable.qaStatus === QA_STATUS.PENDING);
  const specAttachments = [order.outlineAttachment, order.exposeAttachment].filter(Boolean);
  const qaMessages = [...(chat?.messages || [])]
    .filter(m => !/preis|kosten|rabatt|nachlass|raten|geld|honorar|bezahl|rechnung|euro|€/i.test(m.body || ''))
    .slice(-6);

  const goToQueue = () => navigate('qa-queue');
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const canSubmitRevision = revisionNote.trim().length >= 10;
  const beginRevision = () => {
    if (!canReviewLatest) return;
    setRevisionOpen(true);
  };
  const cancelRevision = () => { setRevisionOpen(false); setRevisionNote(''); };
  const submitRevision = () => {
    if (!canReviewLatest || !canSubmitRevision) return;
    const ok = EFActions.qa.requestRevision(latestActionable.id, revisionNote.trim());
    if (!ok) return;
    setRevisionOpen(false);
    setRevisionNote('');
    toast({
      tone: 'info',
      transition: { entity: `Order #${orderId}`, from: 'QA Review', to: 'Revision Required' },
      text: 'GW notified · feedback delivered',
    });
  };
  const passToCustomer = () => {
    if (!canReviewLatest) return;
    EFActions.qa.pass(latestActionable.id);
    toast({
      tone: 'success',
      transition: { entity: `Order #${orderId}`, from: 'QA Review', to: 'Customer Review' },
      text: `Forwarded to ${cust?.name}`,
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['QA','Review Queue', `#${order.id}`]} />
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="mono">#{order.id}</span>
            <StatusPill status={order.status} order={order}/>
            <span style={{ fontWeight: 400, color: 'var(--text-2)', fontSize: 16 }}>· {order.titleTBD ? <em>folgt — awaiting customer</em> : order.title}</span>
          </h1>
          <div className="page-subtitle flex gap-3 items-center" style={{ marginTop: 6 }}>
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final deadline <span className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</span></span>
            <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
            {W.isOrderDisputed(order) && <span className="pill pill-orange">Dispute open</span>}
            {(order.finalRevisionRounds || 0) > 0 && <span className="pill pill-amber">Revision round {order.finalRevisionRounds}</span>}
          </div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={goToQueue}><Icon name="arrow-left" size={14}/> Back to queue</button>
        </div>
      </div>

      <div className="banner info mb-3">
        <Icon name="lock" size={14}/>
        <span><strong>QA view.</strong> Financial data (price, honorarium, margin, payments) is hidden by role. You see work spec, submissions, and quality scores only.</span>
      </div>

      <div className="tabs">
        {['overview','submissions','communications'].map(t => (
          <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
            {t}
            {t === 'submissions' && displaySubs.length > 0 && <span className="pill pill-pink">{displaySubs.length}</span>}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          <div className="flex-col gap-3">
            <div className="card">
              <div className="card-head"><div className="card-title">Customer (non-financial)</div></div>
              <div className="card-pad flex items-center gap-3">
                <Avatar initials={cust?.initials} size={40} tone="blue"/>
                <div className="flex-col" style={{ flex: 1 }}>
                  <strong>{cust?.name}</strong>
                  <span className="fs-11 text-faint">{cust?.country} · {cust?.orders} order(s) on file</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Work specification</div></div>
              <div className="card-pad">
                <div className="kv">
                  <div className="kv-row"><dt>Type</dt><dd>{D.WORK_TYPE_LABELS[order.workType]}</dd></div>
                  <div className="kv-row"><dt>Field of study</dt><dd>{order.field}</dd></div>
                  <div className="kv-row"><dt>Pages</dt><dd className="mono">{order.pages || '—'}</dd></div>
                  <div className="kv-row"><dt>Paper title</dt><dd style={{ maxWidth: 360, textAlign: 'right' }}>{order.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : order.title}</dd></div>
                  <div className="kv-row"><dt>Attachments</dt><dd>{specAttachments.length ? specAttachments.map((a, i) => <a key={i} className="flex items-center gap-1" style={{ color: 'var(--blue)' }}><Icon name="paperclip" size={12}/>{a.name || a}</a>) : <span className="text-faint">No outline/exposé uploaded yet</span>}</dd></div>
                  <div className="kv-row"><dt><Bi de="Weitere Notiz" en="Note to GW"/></dt><dd>{order.note || '—'}</dd></div>
                </div>
              </div>
            </div>

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

            {(W.isOrderDisputed(order) || order.revisionRequestSource === 'qa') && (() => {
              const fromQa = order.revisionRequestSource === 'qa';
              const title = fromQa
                ? `QA feedback (round ${W.currentRevisionRound(order) || 1})`
                : `Customer feedback (round ${W.currentRevisionRound(order) || 1})`;
              const note = fromQa
                ? (order.qaRevisionNote || 'QA feedback is open. GW notified · awaiting resubmission.')
                : (order.customerRevisionNote || order.feedbackText || order.disputeReason || 'Customer feedback is open. GW notified · awaiting resubmission.');
              return (
                <div className="card" style={{ borderColor: 'color-mix(in oklab, var(--amber) 35%, var(--border))' }}>
                  <div className="card-head"><div className="card-title">{title}</div></div>
                  <div className="card-pad fs-12 text-muted">{note}</div>
                </div>
              );
            })()}
          </div>

          <div className="flex-col gap-3">
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

            {latest && (
              <div className="card">
                <div className="card-head"><div className="card-title">Latest submission scores</div></div>
                <div className="card-pad flex-col gap-3">
                  {latest.plagiarismScore != null ? <ScoreBar value={latest.plagiarismScore} label="Plagiarism (PlagScan)"/> : <span className="text-faint fs-11">Plagiarism score unavailable in imported history.</span>}
                  {latest.aiScore != null ? <ScoreBar value={latest.aiScore} label="AI detection (GPTZero)"/> : <span className="text-faint fs-11">AI score unavailable in imported history.</span>}
                  <div className="fs-11 text-muted">{latest.kind.replace('_',' ')} · round {latest.round || 1} · {U.relTime(latest.submittedAt)}{latest.synthetic ? ' · imported history' : ''}</div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-head"><div className="card-title">QA actions</div></div>
              <div className="card-pad flex-col gap-2">
                <button type="button" className="btn btn-success w-full" disabled={!canReviewLatest || revisionOpen} onClick={passToCustomer} style={{ justifyContent: 'center' }}>
                  <Icon name="check-circle" size={14}/> Pass · forward to customer
                </button>
                {!revisionOpen && (
                  <button type="button" className="btn w-full" disabled={!canReviewLatest} onClick={beginRevision} style={{ justifyContent: 'center' }}>
                    <Icon name="alert-triangle" size={14}/> Request revision
                  </button>
                )}
                {revisionOpen && (
                  <div className="flex-col gap-2" style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label className="fs-11 text-muted">QA feedback for {gw?.name || 'the ghostwriter'} (min. 10 chars):</label>
                    <textarea
                      style={{ width: '100%', minHeight: 90, resize: 'vertical', padding: 10, fontSize: 13, border: `1px solid ${canSubmitRevision ? 'var(--border)' : 'var(--amber)'}`, borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="e.g. §3 methodology too generic — add concrete sources. §5 conclusion drifts off the research question."
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-sm" onClick={cancelRevision} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary" disabled={!canSubmitRevision} onClick={submitRevision} style={{ flex: 1, justifyContent: 'center' }}>
                        <Icon name="send" size={12}/> Send revision request
                      </button>
                    </div>
                  </div>
                )}
                <button type="button" className="btn w-full" onClick={goToQueue} style={{ justifyContent: 'center' }}>
                  <Icon name="shield-check" size={14}/> Open in queue (full verdict)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'submissions' && (
        <SubmissionsTab order={order} />
      )}
      {tab === 'communications' && (
        <div className="chat-shell chat-shell-soft">
          <div className="chat-header">
            <div className="chat-title">
              <div>
                <span className="chat-title-main">Customer-facing communications</span>
                <span className="chat-title-sub">QA-relevant excerpts only · pricing messages hidden</span>
              </div>
            </div>
          </div>
          <ChatNotice compact icon="lock">
            Messages mentioning pricing or payment are hidden from QA — QA has no financial permission on the order chat.
          </ChatNotice>
          <div className="chat-stream" style={{ maxHeight: 520 }}>
            {qaMessages.length === 0 && (
              <EmptyState compact icon="message-square" title="No QA-visible messages" body="No order chat messages, or all are pricing-related and hidden from QA."/>
            )}
            {qaMessages.map((m, i) => {
              const sender = m.authorRole === 'gw' ? (gw?.name || 'GW') : m.authorRole === 'customer' ? (cust?.name || 'Customer') : 'efactory1';
              const initials = m.authorRole === 'gw' ? (gw?.initials || 'GW') : m.authorRole === 'customer' ? (cust?.initials || 'CU') : 'EF';
              return (
                <ChatMessage
                  key={m.id || i}
                  mine={m.authorRole === 'gw'}
                  sender={sender}
                  initials={initials}
                  at={m.at}
                  attachments={m.attachments}
                  channel="platform"
                >
                  {m.body}
                </ChatMessage>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { QAOrderDetail };
