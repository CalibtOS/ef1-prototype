// GW · Assignment detail — privacy-respecting order view (no financials).

// ============ GW ASSIGNMENT DETAIL (privacy-respecting view for GW) ============
// IMPORTANT: GWs may NOT see gross price, VAT, Berat's margin, release gate,
// Pipedrive funnel, Sevdesk invoice details, customer email/phone/LTV/lead source.
// Per PRD: GW sees only job spec, customer name (after approval), their own
// honorarium, submission tiles, messages, templates, deadlines.
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as W from '../core/workflow.js';
import * as EFHooks from '../core/hooks.js';
import EF from '../core/ef.js';
const D = EF;

function GWAssignmentDetail({ orderId, navigate, toast }) {
  const thread = EFHooks.useThreadByOrder(orderId);
  const displaySubs = EFHooks.useDisplaySubmissions(orderId);
  const order = EFHooks.useOrder(orderId);
  if (!order) return <div className="page">Assignment not found.</div>;
  // Ownership guard — a GW may only view assignments where they are the assigned writer
  // OR the order is on the public job board. Otherwise no leakage of customer/order data.
  // (PRD ghostwriter.permissions: "assignments.own".)
  const me = D.GW_ME;
  const isOwn       = order.gwId === me.id;
  const isOnBoard   = order.status === 'available' && !order.gwId;
  const isClaimedByMe = order.status === 'claimed_pending_approval' && order.gwId === me.id;
  if (!isOwn && !isOnBoard && !isClaimedByMe) {
    return (
      <div className="page" style={{ maxWidth: 560, margin: '60px auto' }}>
        <div className="card">
          <div className="card-pad" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <Icon name="lock" size={20}/>
            </div>
            <div className="strong fs-13" style={{ marginBottom: 6 }}>This assignment isn't yours</div>
            <div className="text-muted fs-12" style={{ maxWidth: 380, margin: '0 auto 16px' }}>
              You can only view jobs you've claimed or that are listed on the public board. Contact <span className="mono">kundenservice@efactory1.de</span> if you think this is a mistake.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('gw-active')}>← Back to my assignments</button>
          </div>
        </div>
      </div>
    );
  }
  const cust = D.customer(order.customerId);
  const dm = U.deadlineMeta(order.finalDeadline);
  const isPending = order.status === 'claimed_pending_approval';
  const isApproved = !isPending && !['available','qualified','offer_sent','invoice_sent','paid','lead'].includes(order.status);
  const isRevision = order.status === 'revision_required';
  const specAttachments = [order.outlineAttachment, order.exposeAttachment].filter(Boolean);
  const hasGwContact = (thread?.messages || []).some(m => m.from === 'gw' || m.from === 'customer');
  const hasFirstContactThread = !!(
    order.firstContactDone ||
    order.firstContactDoneAt ||
    order.firstContactMessageId ||
    order.firstContactThreadId ||
    (thread?.messages || []).some(m => m.policy_exemption === 'sop_first_contact_template' || m.origin_channel === 'first_contact_wizard')
  );
  const latestCustomerMessage = [...(thread?.messages || [])].reverse().find(m => m.from === 'customer');
  const revisionAt = order.lastFeedbackAt || order.lastCustomerFeedbackAt || latestCustomerMessage?.at;
  const visibleMessages = [...(thread?.messages || [])]
    .filter(m => m.policy_exemption === 'sop_first_contact_template' || !/preis|kosten|rabatt|nachlass|raten|geld|honorar|bezahl|rechnung|euro|€/i.test(m.body || ''))
    .slice(-3);
  // First-contact wizard surfaces only after approval, before any submission, and once per assignment.
  const showFirstContact = isApproved && order.status === 'active' && !hasFirstContactThread && !hasGwContact;

  const stages = [
    { id: 'pending', label: 'Pending Approval', done: !isPending },
    { id: 'active', label: 'Active', done: ['active','interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(order.status) },
    { id: 'interim', label: 'Interim', done: ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(order.status) },
    { id: 'final', label: 'Final', done: ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(order.status) },
    { id: 'review', label: 'Customer Review', done: ['delivered','payment_pending','completed'].includes(order.status) },
    { id: 'paid', label: 'Paid', done: order.status === 'completed' || order.gwPaymentStatus === 'paid' },
  ];
  const currentStage = stages.findIndex(s => !s.done);
  const activeStageIdx = currentStage === -1 ? stages.length - 1 : currentStage;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${order.id}`]}/>
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="mono">#{order.id}</span>
            <StatusPill status={order.status} order={order}/>
            <span style={{ fontWeight: 400, color: 'var(--text-2)', fontSize: 16 }}>· {order.titleTBD ? <em>folgt</em> : order.title}</span>
          </h1>
          <div className="page-subtitle flex gap-3 items-center" style={{ marginTop: 6 }}>
            <span><Icon name="calendar" size={12} style={{ verticalAlign: 'text-bottom' }}/> Final delivery <span className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</span></span>
            <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('gw-active')}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      {isPending && (
        <div className="banner info mb-3">
          <Icon name="clock" size={14}/>
          <span><strong>Awaiting Berat&apos;s approval.</strong> Customer details and platform chat unlock once approved (avg 3h 18m). You can browse the job spec below.</span>
        </div>
      )}

      {showFirstContact && (
        <div className="banner success mb-3" style={{ borderLeft: '4px solid var(--blue)' }}>
          <Icon name="zap" size={14}/>
          <div style={{ flex: 1 }}>
            <strong>Your next step → First-contact wizard.</strong>
            <div className="fs-11 mt-1">Step-by-step intro to {cust?.name?.split(' ')[0] || 'the customer'} · pre-filled with the financial-firewall reminder · CC kundenservice@efactory1.de.</div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('gw-first-contact', { id: order.id })}>
            <Icon name="arrow-right" size={12}/> Open wizard
          </button>
        </div>
      )}

      {isRevision && (
        <div className="card mb-3" style={{ borderLeft: '4px solid var(--orange)' }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2">
              <Icon name="alert-triangle" size={14} style={{ color: 'var(--orange)' }}/> Customer feedback — revision required (round {(order.revisionRounds || 1)})
            </div>
            <span className="text-faint fs-11">received {revisionAt ? U.relTime(revisionAt) : 'date not recorded'}</span>
          </div>
          <div className="card-pad">
            <div className="kv" style={{ fontSize: 12, marginBottom: 12 }}>
              <div className="kv-row"><dt>From</dt><dd><strong>{cust?.name || 'Customer'}</strong></dd></div>
              <div className="kv-row"><dt>Round</dt><dd className="mono">{order.revisionRounds || 1} of 3</dd></div>
              <div className="kv-row"><dt>Payment impact</dt><dd>Blocked until the revision is accepted</dd></div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
              {order.feedbackText || order.customerRevisionNote || latestCustomerMessage?.body || 'Revision feedback is open. Check the customer thread or ask efactory1 for clarification before resubmitting.'}
            </div>
            <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('gw-submit', { id: order.id, kind: 'revision' })}>
                <Icon name="upload-cloud" size={12}/> Upload revised version
              </button>
              <button className="btn btn-sm" onClick={() => navigate('gw-messages')}>
                <Icon name="message-square" size={12}/> Reply to customer
              </button>
              <button className="btn btn-sm" onClick={() => toast && toast({ text: 'Clarification request sent to efactory1 — Berat will mediate.', tone: 'info' })}>
                <Icon name="help-circle" size={12}/> Ask efactory1 to clarify
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="flex-col gap-3">
          {/* Stepper */}
          <div className="card">
            <div className="card-pad">
              <div className="stepper">
                {stages.map((s, i) => (
                  <div key={s.id} className={`step ${i === activeStageIdx ? 'current' : ''}`}>
                    <div className={`step-bar ${s.done ? 'done' : i === activeStageIdx ? 'current' : ''}`}/>
                    <div className="step-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Job spec (no money intel) */}
          <div className="card">
            <div className="card-head"><div className="card-title">Job specification</div></div>
            <div className="card-pad">
              <div className="kv">
                <div className="kv-row"><dt>Type</dt><dd>{D.WORK_TYPE_LABELS[order.workType] || order.workType}</dd></div>
                <div className="kv-row"><dt>Field of study</dt><dd>{order.field}</dd></div>
                <div className="kv-row"><dt>Pages</dt><dd className="mono">{order.pages || '—'}</dd></div>
                <div className="kv-row"><dt>Topic</dt><dd style={{ maxWidth: 360, textAlign: 'right' }}>{order.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : order.title}</dd></div>
                <div className="kv-row"><dt>Attachments</dt><dd>{specAttachments.length ? specAttachments.map((a, i) => <a key={i} className="flex items-center gap-1" style={{ color: 'var(--blue)' }}><Icon name="paperclip" size={12}/>{a.name || a}</a>) : <span className="text-faint">No outline/exposé uploaded yet</span>}</dd></div>
                {order.note && <div className="kv-row"><dt>Note from efactory1</dt><dd className="text-muted" style={{ maxWidth: 360, textAlign: 'right' }}>{order.note}</dd></div>}
              </div>
            </div>
          </div>

          {/* Submission tiles — gated by current order state so impossible uploads are disabled. */}
          {(() => {
            const s = order.status;
            const hasInterim1 = displaySubs.some(sub => sub.kind === 'interim_1');
            const hasInterim2 = displaySubs.some(sub => sub.kind === 'interim_2');
            const hasFinal = displaySubs.some(sub => W.isQaReviewKind(sub.kind));
            // Interim 1 is allowed only while the order is "active" (i.e. before any interim has been sent).
            const interim1Allowed = isApproved && s === 'active' && !!order.interimDeadline && !hasInterim1;
            // Interim 2 is allowed once the customer has reviewed/approved interim 1 and we're back to active.
            const interim2Allowed = isApproved && s === 'active' && !!order.interim2Deadline && hasInterim1 && !hasInterim2;
            // Final is allowed only after both interims (if any) and while still active.
            const interimsComplete = (!order.interimDeadline || hasInterim1) && (!order.interim2Deadline || hasInterim2);
            const finalAllowed   = isApproved && s === 'active' && interimsComplete && !hasFinal;
            // Revision upload (re-routed to the GWSubmit kind=final flow with revisionRounds++).
            const revisionMode   = isApproved && s === 'revision_required';
            const finalAlreadySubmitted = ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(s);
            const finalButtonLabel = finalAlreadySubmitted
              ? 'Final + invoice submitted'
              : revisionMode ? 'Upload revision' : 'Upload final + invoice';
            const stateNote = (allow, fallback) => allow ? null : fallback;
            const reasonFor = {
              interim_submitted: 'Interim already submitted — awaiting customer feedback',
              under_customer_review: 'Awaiting customer review of last submission',
              revision_required: 'Customer requested a revision — use the Revise button',
              final_submitted: 'Final submitted — awaiting QA',
              qa_review: 'In QA — no further uploads needed',
              delivered: 'Order delivered',
              payment_pending: 'Payment pending — work complete',
              completed: 'Order complete',
              on_hold: 'Order on hold',
              delay_reported: 'Delay reported — awaiting admin decision',
              ai_violation_review: 'AI violation flagged — admin review',
              plagiarism_violation_review: 'Plagiarism flagged — admin review',
            };
            const stateReason = reasonFor[s] || (!interimsComplete ? 'Required interim submissions must be uploaded first' : 'Awaiting approval');
            return (
          <div className="card">
            <div className="card-head"><div className="card-title">Submissions</div><span className="text-faint fs-11">cutoff 18:00 the day BEFORE due</span></div>
            <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {order.interimDeadline && (
                <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="strong fs-12"><Bi de="Zwischenstand 1" en="Interim 1"/></span>
                    <span className={`pill pill-${U.deadlineMeta(order.interimDeadline).tone === 'danger' ? 'red' : 'slate'}`}>{U.deadlineMeta(order.interimDeadline).label}</span>
                  </div>
                  <div className="text-faint fs-11 mono mb-2">due {U.fmtDate(order.interimDeadline)}, 18:00</div>
                  <button className="btn btn-sm w-full" onClick={() => interim1Allowed && navigate('gw-submit', { id: order.id, kind: 'interim_1' })} disabled={!interim1Allowed} title={stateNote(interim1Allowed, stateReason)} style={{ justifyContent: 'center' }}>
                    <Icon name="upload-cloud" size={12}/> Upload interim
                  </button>
                </div>
              )}
              {order.interim2Deadline && (
                <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="strong fs-12"><Bi de="Zwischenstand 2" en="Interim 2"/></span>
                    <span className="pill pill-slate">{U.deadlineMeta(order.interim2Deadline).label}</span>
                  </div>
                  <div className="text-faint fs-11 mono mb-2">due {U.fmtDate(order.interim2Deadline)}, 18:00</div>
                  <button className="btn btn-sm w-full" onClick={() => interim2Allowed && navigate('gw-submit', { id: order.id, kind: 'interim_2' })} disabled={!interim2Allowed} title={stateNote(interim2Allowed, stateReason)} style={{ justifyContent: 'center' }}>
                    <Icon name="upload-cloud" size={12}/> Upload interim
                  </button>
                </div>
              )}
              <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="strong fs-12">{revisionMode ? 'Revision (re-submit final)' : 'Final + Honorarrechnung'}</span>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
                <div className="text-faint fs-11 mono mb-2">due {U.fmtDate(order.finalDeadline)}, 18:00</div>
                <button className="btn btn-sm w-full" onClick={() => (finalAllowed || revisionMode) && navigate('gw-submit', { id: order.id, kind: revisionMode ? 'revision' : 'final' })} disabled={!(finalAllowed || revisionMode)} title={stateNote(finalAllowed || revisionMode, stateReason)} style={{ justifyContent: 'center' }}>
                  <Icon name={finalAlreadySubmitted ? 'check-circle' : 'upload-cloud'} size={12}/> {finalButtonLabel}
                </button>
              </div>
              <div style={{ padding: 14, border: '1px dashed var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
                <div className="strong fs-12 mb-1">Need more time / scope?</div>
                <div className="text-faint fs-11 mb-2">Report a delay or request an extension (Zusatzrechnung).</div>
                <div className="flex gap-1">
                  <button className="btn btn-sm" disabled={!isApproved} onClick={() => navigate('gw-report-delay', { id: order.id })} style={{ flex: 1, justifyContent: 'center' }}><Icon name="clock" size={11}/> Report delay</button>
                  <button className="btn btn-sm" disabled={!isApproved} onClick={() => navigate('gw-extension', { id: order.id })} style={{ flex: 1, justifyContent: 'center' }}><Icon name="plus" size={11}/> Extension</button>
                </div>
              </div>
            </div>
          </div>
          );
          })()}

          {/* Messages preview */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Messages with customer</div>
              <button className="btn btn-sm" onClick={() => navigate('gw-messages')}>Open thread →</button>
            </div>
            <div className="card-pad">
              {!isApproved ? (
                <ChatNotice compact icon="lock">Customer chat unlocks after Berat approves your claim.</ChatNotice>
              ) : (
                <div className="chat-shell chat-shell-soft" style={{ minHeight: 0 }}>
                  <div className="chat-stream" style={{ padding: 12, maxHeight: 170 }}>
                    {visibleMessages.length === 0 && (
                      <EmptyState compact icon="message-square" title="No customer thread yet" body="The first-contact wizard starts the shared order thread after approval."/>
                    )}
                    {visibleMessages.map((m, i) => (
                      <ChatMessage
                        key={m.id || i}
                        mine={m.from === 'gw'}
                        system={m.from === 'system' || m.system}
                        sender={m.from === 'gw' ? 'You' : m.from === 'customer' ? (D.customer(order.customerId)?.name || 'Customer') : 'efactory1'}
                        initials={m.from === 'customer' ? (D.customer(order.customerId)?.initials || 'CU') : m.from === 'gw' ? me.initials : 'EF'}
                        at={m.at}
                        attachments={m.attachments}
                      >
                        {m.body}
                      </ChatMessage>
                    ))}
                  </div>
                  <ChatNotice compact>Auto-CC kundenservice@efactory1.de · financial keywords intercepted.</ChatNotice>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — minimal, GW-safe */}
        <div className="flex-col gap-3">
          {/* Your honorarium ONLY — no gross, no VAT, no margin */}
          <div className="card" style={{ border: '1px solid color-mix(in oklab, var(--green) 30%, var(--border))' }}>
            <div className="card-head"><div className="card-title">Your honorarium</div></div>
            <div className="card-pad">
              <div className="mono strong" style={{ fontSize: 26, color: 'var(--green)' }}>{U.EUR(order.netHonorarium)}</div>
              <div className="text-faint fs-11 mt-1">Net · paid via SEPA · arrives 1–3 days after Friday batch</div>
              <div className="banner info mt-3" style={{ fontSize: 11 }}>
                <Icon name="lock" size={12}/>
                <span>Released after final delivery + customer accepts + revisions complete + customer payment cleared.</span>
              </div>
            </div>
          </div>

          {/* Customer (name only, after approval) */}
          <div className="card">
            <div className="card-head"><div className="card-title">Customer</div></div>
            <div className="card-pad">
              {!isApproved ? (
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                    <Icon name="lock" size={16}/>
                  </div>
                  <div className="flex-col" style={{ lineHeight: 1.25 }}>
                    <span className="text-faint fs-12">Hidden</span>
                    <span className="text-faint fs-11">Unlocks after approval</span>
                  </div>
                </div>
              ) : (
                <div className="flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar initials={cust?.initials || '··'} size={40}/>
                    <div className="flex-col" style={{ lineHeight: 1.25 }}>
                      <strong className="fs-12">{cust?.name}</strong>
                      <span className="text-faint fs-11">efactory1 always in CC</span>
                    </div>
                  </div>
                  {/* Per business_rules §6: after admin approval, GW receives customer email + phone. */}
                  {cust?.email && <div className="fs-11 mono text-muted">{cust.email}</div>}
                  {cust?.phone && <div className="fs-11 mono text-muted">{cust.phone}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Templates shortcut */}
          <div className="card">
            <div className="card-head"><div className="card-title">Templates</div></div>
            <div className="card-pad flex-col gap-1">
              <a className="flex items-center gap-2" style={{ padding: 6, borderRadius: 4, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => navigate('gw-templates')}>
                <Icon name="file-text" size={12} className="text-faint"/>
                <span className="fs-11 mono">Vorlage_Deckblatt.docx</span>
              </a>
              <a className="flex items-center gap-2" style={{ padding: 6, borderRadius: 4, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => navigate('gw-templates')}>
                <Icon name="file-text" size={12} className="text-faint"/>
                <span className="fs-11 mono">Thesis_Vorlage.docx</span>
              </a>
              <a className="flex items-center gap-2" style={{ padding: 6, borderRadius: 4, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => navigate('gw-templates')}>
                <Icon name="file-text" size={12} className="text-faint"/>
                <span className="fs-11 mono">200_Formulierungen.docx</span>
              </a>
              <button className="btn btn-sm mt-2" onClick={() => navigate('gw-templates')} style={{ justifyContent: 'center' }}>Open library →</button>
            </div>
          </div>

          {/* Compliance reminders */}
          <div className="banner warn" style={{ fontSize: 11.5 }}>
            <Icon name="alert-triangle" size={12}/>
            <div>
              <strong>AGB v3.2 reminders:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                <li>No AI tools — any use = fraud (§5)</li>
                <li>No direct delivery to customer</li>
                <li>No money discussion — redirect to kundenservice@efactory1.de</li>
                <li>Delete customer PII after delivery (GDPR)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { GWAssignmentDetail };
