// GW · Assignment detail — privacy-respecting order view (no financials).

// ============ GW ASSIGNMENT DETAIL (privacy-respecting view for GW) ============
// IMPORTANT: GWs may NOT see gross price, VAT, Berat's margin, release gate,
// Pipedrive funnel, Sevdesk invoice details, customer email/phone/LTV/lead source.
// Per PRD: GW sees only job spec, customer name (after approval), their own
// honorarium, submission tiles, messages, templates, deadlines.
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice } from '../../utils.jsx';
import { OrderChat } from '../shared/order-chat.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as W from '../core/workflow.js';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

// Modal: shared dispute open form (used by GW + customer entry points). The
// proposed flow in docs/flows/dispute/dispute_flow_design_review.md §2 step 4 says GW gets a
// dropdown of reason categories + a 30-char textarea. Wired via
// EFActions.disputes.openByGw / openByCustomer depending on the role using it.
const DISPUTE_REASON_OPTIONS = [
  { value: 'out_of_scope',  label: 'Out of scope / scope creep' },
  { value: 'unresponsive',  label: 'Other party is unresponsive' },
  { value: 'quality',       label: 'Disagreement on quality / requirements' },
  { value: 'late',          label: 'Deadline / timing problem' },
  { value: 'abusive',       label: 'Abusive or unprofessional behavior' },
  { value: 'other',         label: 'Other (please describe)' },
];
const DISPUTE_REASON_MIN = 30;

function DisputeOpenModal({ orderId, openedBy, partyName, onClose, onConfirm, toast }) {
  const [category, setCategory] = useState('out_of_scope');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const remaining = Math.max(0, DISPUTE_REASON_MIN - reason.trim().length);
  const canSubmit = remaining === 0 && !submitting;
  const submit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const action = openedBy === 'gw' ? EFActions.disputes.openByGw : EFActions.disputes.openByCustomer;
    const dispute = action(orderId, { reasonCategory: category, reason: reason.trim() });
    if (dispute) {
      toast && toast({
        tone: 'info',
        transition: { entity: `Order #${orderId}`, from: 'Active', to: 'Dispute open' },
        text: 'Dispute submitted · efactory1 will mediate · chat paused.',
      });
      onConfirm && onConfirm(dispute);
    } else {
      setSubmitting(false);
    }
  };
  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 560, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-title flex items-center gap-2">
            <Icon name="alert-triangle" size={14} style={{ color: 'var(--orange)' }}/>
            Escalate to efactory1 · Order #{orderId}
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}><Icon name="x" size={12}/></button>
        </div>
        <div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="info" size={14}/>
            <div style={{ flex: 1, lineHeight: 1.45 }}>
              Use this when you cannot resolve the disagreement with {partyName || 'the other party'} via chat. The order chat will be paused, payment release will be blocked, and efactory1 will mediate. Don't use this for normal revisions.
            </div>
          </div>
          <div>
            <label className="fs-12 strong mb-1" style={{ display: 'block' }}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: 10, fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
            >
              {DISPUTE_REASON_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fs-12 strong mb-1" style={{ display: 'block' }}>What happened? (min. {DISPUTE_REASON_MIN} chars)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the situation in concrete terms — what was asked, what's unreasonable, what you've already tried. Include round numbers if relevant."
              style={{ width: '100%', minHeight: 120, resize: 'vertical', padding: 10, fontSize: 13, border: `1px solid ${remaining ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div className="fs-11 text-faint mt-1">
              {remaining > 0 ? `${remaining} more character${remaining === 1 ? '' : 's'} required` : 'Ready to submit.'}
            </div>
          </div>
          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-sm btn-danger" disabled={!canSubmit} onClick={submit}>
              <Icon name="alert-triangle" size={12}/> Submit dispute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal: GW declares they introduced themselves out-of-band (WhatsApp, phone, etc.)
// Records firstContactDoneAt without sending the SOP D template; audit log captures channel + reason.
function OutOfBandIntroModal({ orderId, customerName, onClose, onConfirm }) {
  const [channel, setChannel] = useState('whatsapp');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = () => {
    if (submitting || !reason.trim()) return;
    setSubmitting(true);
    const ok = EFActions.gw.recordFirstContactOutOfBand(orderId, { channel, reason: reason.trim() });
    if (ok) onConfirm && onConfirm();
    else setSubmitting(false);
  };
  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 520, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-title">Record out-of-band introduction</div>
          <button type="button" className="btn btn-sm" onClick={onClose}><Icon name="x" size={12}/></button>
        </div>
        <div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="alert-triangle" size={14}/>
            <span>The SOP D template won&apos;t be sent. Berat will see this on the admin queue with your reason. Only use this if you already introduced yourself to {customerName} via another channel.</span>
          </div>
          <div className="field">
            <label>Channel</label>
            <select value={channel} onChange={e => setChannel(e.target.value)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone call</option>
              <option value="email_personal">Email (personal account)</option>
              <option value="in_person">In person</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>How did you introduce yourself? <span className="text-faint">— required, recorded for audit</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Spoke on WhatsApp 2026-05-17, confirmed topic + deadlines, explained that all files go via the platform and money questions go to kundenservice@efactory1.de."
              style={{ width: '100%', minHeight: 110, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)', lineHeight: 1.55 }}
            />
            <div className="text-faint fs-11 mt-1">Confirm you covered: topic + scope, file-flow rule (platform only), financial firewall (kundenservice@…), response SLA.</div>
          </div>
          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting || !reason.trim()}>
              <Icon name="check" size={12}/> {submitting ? 'Recording…' : 'Record & unlock submissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GWAssignmentDetail({ orderId, navigate, toast }) {
  const chat = EFHooks.useOrderChat(orderId);
  const displaySubs = EFHooks.useDisplaySubmissions(orderId);
  const order = EFHooks.useOrder(orderId);
  const [outOfBandOpen, setOutOfBandOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [focusChatComposer, setFocusChatComposer] = useState(false);
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
  const hasFirstContactRecord = !!(
    order.firstContactDone ||
    order.firstContactDoneAt ||
    order.firstContactMessageId ||
    order.firstContactChatId
  );
  const latestCustomerMessage = [...(chat?.messages || [])].reverse().find(m => m.authorRole === 'customer');
  const revisionAt = order.lastFeedbackAt || order.lastCustomerFeedbackAt || latestCustomerMessage?.at;
  const scrollToOrderChat = () => {
    document.getElementById('order-platform-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusChatComposer(true);
  };

  useEffect(() => {
    if (!focusChatComposer) return undefined;
    const t = setTimeout(() => setFocusChatComposer(false), 200);
    return () => clearTimeout(t);
  }, [focusChatComposer]);
  // Intro is the first task after approval. Required before any submission per SOP D.
  // We treat it as "done" when the SOP D wizard recorded firstContactDoneAt, or an
  // out-of-band record (firstContactSkippedTemplate) set it.
  const introDone = !!order.firstContactDoneAt || hasFirstContactRecord;
  const showFirstContact = isApproved && order.status === 'active' && !introDone;
  const delivery = W.deliveryProgress(order, displaySubs || []);

  const stages = [
    { id: 'pending', label: 'Pending Approval', done: !isPending },
    { id: 'active', label: 'Active', done: ['active','interim_submitted','under_customer_review','revision_required','qa_review','delivered','payment_pending','completed'].includes(order.status) },
    { id: 'intro', label: 'Introduction', done: introDone },
    { id: 'interim', label: 'Interim', done: delivery.interimsComplete },
    { id: 'final', label: 'Final', done: delivery.finalSubmitted },
    { id: 'qa', label: 'QA Review', done: ['delivered','payment_pending','completed'].includes(order.status) },
    { id: 'review', label: 'Customer Review', done: ['payment_pending','completed'].includes(order.status) },
    { id: 'paid', label: 'Paid', done: order.status === 'completed' || order.gwPaymentStatus === 'paid' },
  ];
  const currentStage = stages.findIndex(s => !s.done);
  const activeStageIdx = currentStage === -1 ? stages.length - 1 : currentStage;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${order.id}`]}/>
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mono">#{order.id}</span>
            <StatusPill status={order.status} order={order}/>
            {showFirstContact && <span className="pill pill-amber" title="You haven't introduced yourself to the customer yet">Intro pending</span>}
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
        <div className="card mb-3" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2">
              <Icon name="mail" size={14} style={{ color: 'var(--blue)' }}/>
              Introduce yourself to {cust?.name?.split(' ')[0] || 'the customer'}
            </div>
            <span className="text-faint fs-11">Required before submissions · SOP D</span>
          </div>
          <div className="card-pad flex-col gap-3">
            <div className="fs-12 text-muted" style={{ lineHeight: 1.55 }}>
              The introduction goes out <strong>two ways at once</strong> — as an email to {cust?.name?.split(' ')[0] || 'the customer'} (CC efactory1) and as the first message in the order chat. It&apos;s the only email you send directly: it onboards the customer into the platform, and every message after it stays in the order chat.
            </div>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('gw-first-contact', { id: order.id })}>
                <Icon name="send" size={12}/> Send introduction
              </button>
              <a
                role="button"
                tabIndex={0}
                className="fs-11"
                style={{ color: 'var(--blue)', cursor: 'pointer' }}
                onClick={() => setOutOfBandOpen(true)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOutOfBandOpen(true)}
              >
                Already introduced via another channel?
              </a>
            </div>
          </div>
        </div>
      )}

      {outOfBandOpen && (
        <OutOfBandIntroModal
          orderId={order.id}
          customerName={cust?.name || 'the customer'}
          onClose={() => setOutOfBandOpen(false)}
          onConfirm={() => { setOutOfBandOpen(false); toast && toast({ text: 'Introduction recorded · submissions unlocked.', tone: 'success' }); }}
        />
      )}

      {disputeOpen && (
        <DisputeOpenModal
          orderId={order.id}
          openedBy="gw"
          partyName={cust?.name || 'the customer'}
          onClose={() => setDisputeOpen(false)}
          onConfirm={() => setDisputeOpen(false)}
          toast={toast}
        />
      )}

      {isRevision && (() => {
        // Source matters: customer revisions carry a name + customerRevisionNote;
        // QA revisions carry "efactory1 QA" + qaRevisionNote and have no customer chat.
        // Falling back to the customer source preserves the pre-source-tracking demos.
        const fromQa = order.revisionRequestSource === 'qa';
        const sourceLabel = fromQa ? 'efactory1 QA' : (cust?.name || 'Customer');
        const headerLabel = fromQa ? 'QA feedback — revision required' : 'Customer feedback — revision required';
        const noteFallback = fromQa
          ? 'QA returned the final for revision. Check the QA verdict in the chat or ask efactory1 for clarification before resubmitting.'
          : 'Revision feedback is open. Check the customer thread or ask efactory1 for clarification before resubmitting.';
        const noteText = fromQa
          ? (order.qaRevisionNote || order.feedbackText || noteFallback)
          : (order.feedbackText || order.customerRevisionNote || latestCustomerMessage?.body || noteFallback);
        const replyTarget = fromQa ? 'efactory1' : 'customer';
        return (
        <div className="card mb-3" style={{ borderLeft: `4px solid ${fromQa ? 'var(--blue)' : 'var(--orange)'}` }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2">
              <Icon name={fromQa ? 'shield' : 'alert-triangle'} size={14} style={{ color: fromQa ? 'var(--blue)' : 'var(--orange)' }}/> {headerLabel} (round {W.currentRevisionRound(order) || 1})
            </div>
            <span className="text-faint fs-11">received {revisionAt ? U.relTime(revisionAt) : 'date not recorded'}</span>
          </div>
          <div className="card-pad">
            <div className="kv" style={{ fontSize: 12, marginBottom: 12 }}>
              <div className="kv-row"><dt>From</dt><dd><strong>{sourceLabel}</strong></dd></div>
              <div className="kv-row"><dt>Round</dt><dd className="mono">{W.currentRevisionRound(order) || 1} of 3</dd></div>
              <div className="kv-row"><dt>Payment impact</dt><dd>Blocked until the revision is accepted</dd></div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
              {noteText}
            </div>
            <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" disabled={order.disputeOpen} title={order.disputeOpen ? 'Paused — dispute under review by efactory1' : undefined} onClick={() => {
                // Route to the submit page using the kind the revision actually targets.
                // For interim revisions we re-upload that interim (kind: 'interim_1' /
                // 'interim_2'); for a final revision (customer- or QA-triggered) the
                // submit page accepts `kind: 'revision'`.
                const target = order.revisionTargetKind;
                const submitKind = (target === 'interim_1' || target === 'interim_2') ? target : 'revision';
                navigate('gw-submit', { id: order.id, kind: submitKind });
              }}>
                <Icon name="upload-cloud" size={12}/> Upload revised version
              </button>
              <button className="btn btn-sm" onClick={scrollToOrderChat}>
                <Icon name="message-square" size={12}/> Reply to {replyTarget}
              </button>
              {!fromQa && !order.disputeOpen && (
                <button className="btn btn-sm" onClick={() => setDisputeOpen(true)}>
                  <Icon name="alert-triangle" size={12}/> Escalate dispute
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

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
            const allowedKinds = W.allowedSubmissionKinds(order, me.id, displaySubs);
            // Soft-block: SOP D requires the GW introduction before any work goes to the customer.
            const introBlocks = !introDone;
            // Dispute freeze — GW production is paused while admin mediates.
            const disputeBlocks = !!order.disputeOpen;
            // Revision upload — the targeted kind comes from lastSubmissionKind.
            // If the customer requested a revision on an interim, the matching
            // interim slot reopens (not the final slot). Falls back to 'final'
            // when the final has been submitted or when no kind signal exists.
            const revisionMode     = isApproved && s === 'revision_required';
            const finalAlreadySubmitted = delivery.finalSubmitted;
            const revisionTargetKind = revisionMode
              ? (order.lastSubmissionKind === 'interim_1' || order.lastSubmissionKind === 'interim_2'
                  ? order.lastSubmissionKind
                  : 'final')
              : null;
            const interim1RevisionMode = revisionTargetKind === 'interim_1';
            const interim2RevisionMode = revisionTargetKind === 'interim_2';
            const finalRevisionMode    = revisionMode && revisionTargetKind === 'final';
            // Interim 1 is allowed while active, or in revision_required when
            // the revision was requested on interim_1.
            const interim1Allowed = isApproved && (allowedKinds.includes('interim_1') || interim1RevisionMode) && !introBlocks && !disputeBlocks;
            // Interim 2 is allowed once interim 1 was approved and we're back to active,
            // or in revision_required when the revision was requested on interim_2.
            const interim2Allowed = isApproved && (allowedKinds.includes('interim_2') || interim2RevisionMode) && !introBlocks && !disputeBlocks;
            // Final is allowed only after both interims (if any) and while still active.
            const interimsComplete = delivery.interimsComplete;
            const finalAllowed   = isApproved && allowedKinds.includes('final') && !introBlocks && !disputeBlocks;
            const finalButtonLabel = finalRevisionMode
              ? 'Upload revision'
              : finalAlreadySubmitted ? 'Final + invoice submitted' : 'Upload final + invoice';
            const stateNote = (allow, fallback) => allow ? null : fallback;
            const reasonFor = {
              interim_submitted: 'Interim already submitted — awaiting customer feedback',
              under_customer_review: 'Awaiting customer review of last submission',
              revision_required: 'Customer requested a revision — use the Revise button',
              qa_review: 'In QA — no further uploads needed',
              delivered: 'Customer is reviewing the final',
              payment_pending: 'Payment pending — work complete',
              completed: 'Order complete',
              on_hold: 'Order on hold',
              delay_reported: 'Delay reported — awaiting admin decision',
              ai_violation_review: 'AI violation flagged — admin review',
              plagiarism_violation_review: 'Plagiarism flagged — admin review',
            };
            const introBlockReason = 'Send your intro email first — required before submissions (SOP D).';
            const disputeBlockReason = 'Dispute under review by efactory1 — work paused until resolved.';
            const stateReason = disputeBlocks
              ? disputeBlockReason
              : introBlocks
              ? introBlockReason
              : (reasonFor[s] || (!interimsComplete ? 'Required interim submissions must be uploaded first' : 'Awaiting approval'));
            return (
          <div className="card">
            <div className="card-head"><div className="card-title">Submissions</div><span className="text-faint fs-11">cutoff 18:00 the day BEFORE due</span></div>
            {disputeBlocks && (
              <div className="banner" style={{ margin: '0 16px', fontSize: 12, background: 'color-mix(in oklab, var(--red) 8%, var(--surface))', border: '1px solid color-mix(in oklab, var(--red) 30%, var(--border))' }}>
                <Icon name="alert-triangle" size={14} style={{ color: 'var(--red)' }}/>
                <div style={{ flex: 1 }}>
                  <strong>Submissions paused.</strong> A dispute is open on this order. efactory1 is reviewing — wait for the outcome before uploading further work.
                </div>
              </div>
            )}
            {!disputeBlocks && introBlocks && isApproved && (
              <div className="banner warn" style={{ margin: '0 16px', fontSize: 12 }}>
                <Icon name="lock" size={14}/>
                <div style={{ flex: 1 }}>
                  <strong>Submissions locked.</strong> Send the intro email to {cust?.name?.split(' ')[0] || 'the customer'} first — required by SOP D so the customer is told that work goes via the platform.
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => navigate('gw-first-contact', { id: order.id })}>
                  <Icon name="send" size={12}/> Send intro email
                </button>
              </div>
            )}
            <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {order.interimDeadline && (
                <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="strong fs-12">{interim1RevisionMode ? <Bi de="Zwischenstand 1 (Überarbeitung)" en="Interim 1 (revision)"/> : <Bi de="Zwischenstand 1" en="Interim 1"/>}</span>
                    <span className={`pill pill-${interim1RevisionMode ? 'amber' : (U.deadlineMeta(order.interimDeadline).tone === 'danger' ? 'red' : 'slate')}`}>{interim1RevisionMode ? 'Revision angefordert' : U.deadlineMeta(order.interimDeadline).label}</span>
                  </div>
                  <div className="text-faint fs-11 mono mb-2">due {U.fmtDate(order.interimDeadline)}, 18:00</div>
                  <button className={`btn btn-sm w-full ${interim1RevisionMode ? 'btn-primary' : ''}`} onClick={() => interim1Allowed && navigate('gw-submit', { id: order.id, kind: 'interim_1' })} disabled={!interim1Allowed} title={stateNote(interim1Allowed, stateReason)} style={{ justifyContent: 'center' }}>
                    <Icon name="upload-cloud" size={12}/> {interim1RevisionMode ? 'Upload revision' : 'Upload interim'}
                  </button>
                </div>
              )}
              {order.interim2Deadline && (
                <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="strong fs-12">{interim2RevisionMode ? <Bi de="Zwischenstand 2 (Überarbeitung)" en="Interim 2 (revision)"/> : <Bi de="Zwischenstand 2" en="Interim 2"/>}</span>
                    <span className={`pill pill-${interim2RevisionMode ? 'amber' : 'slate'}`}>{interim2RevisionMode ? 'Revision angefordert' : U.deadlineMeta(order.interim2Deadline).label}</span>
                  </div>
                  <div className="text-faint fs-11 mono mb-2">due {U.fmtDate(order.interim2Deadline)}, 18:00</div>
                  <button className={`btn btn-sm w-full ${interim2RevisionMode ? 'btn-primary' : ''}`} onClick={() => interim2Allowed && navigate('gw-submit', { id: order.id, kind: 'interim_2' })} disabled={!interim2Allowed} title={stateNote(interim2Allowed, stateReason)} style={{ justifyContent: 'center' }}>
                    <Icon name="upload-cloud" size={12}/> {interim2RevisionMode ? 'Upload revision' : 'Upload interim'}
                  </button>
                </div>
              )}
              <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="strong fs-12">{finalRevisionMode ? 'Revision (re-submit final)' : 'Final + Honorarrechnung'}</span>
                  <span className={`pill pill-${dm.tone === 'danger' ? 'red' : dm.tone === 'warn' ? 'amber' : 'slate'}`}>{dm.label}</span>
                </div>
                <div className="text-faint fs-11 mono mb-2">due {U.fmtDate(order.finalDeadline)}, 18:00</div>
                <button className={`btn btn-sm w-full ${finalRevisionMode ? 'btn-primary' : ''}`} onClick={() => (finalAllowed || (finalRevisionMode && !disputeBlocks)) && navigate('gw-submit', { id: order.id, kind: finalRevisionMode ? 'revision' : 'final' })} disabled={!(finalAllowed || (finalRevisionMode && !disputeBlocks))} title={stateNote(finalAllowed || (finalRevisionMode && !disputeBlocks), stateReason)} style={{ justifyContent: 'center' }}>
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

          {/* Order platform chat — customer · GW · Berat */}
          <div className="card" id="order-platform-chat">
            <div className="card-head">
              <div className="card-title">Order chat</div>
              <div className="flex items-center gap-2">
                <span className="text-faint fs-11">Customer · you · Berat</span>
                {isApproved && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => navigate('gw-messages', { orderId: order.id })}
                  >
                    Open in Messages →
                  </button>
                )}
              </div>
            </div>
            <div className="card-pad" style={{ padding: 0 }}>
              {!isApproved ? (
                <div style={{ padding: 14 }}>
                  <ChatNotice compact icon="lock">Customer chat unlocks after Berat approves your claim.</ChatNotice>
                </div>
              ) : (
                <OrderChat
                  orderId={order.id}
                  currentRole="gw"
                  toast={toast}
                  embedded
                  autoFocusComposer={focusChatComposer}
                />
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
