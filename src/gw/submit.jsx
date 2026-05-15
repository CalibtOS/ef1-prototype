// GW · Submission flow — interim/final/revision upload with QA preview pipeline.

import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA, useRef as useRefA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as W from '../core/workflow.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

const CLOSED_SUBMISSION_REASONS = {
  claimed_pending_approval: 'Awaiting admin approval',
  interim_submitted: 'Interim already submitted — awaiting customer feedback',
  under_customer_review: 'Awaiting customer review',
  final_submitted: 'Final submitted — awaiting QA',
  qa_review: 'In QA — no further upload needed',
  delivered: 'Delivered — awaiting customer acceptance/payment gate',
  payment_pending: 'Payment pending — work complete',
  completed: 'Order complete',
  cancelled: 'Order cancelled',
  on_hold: 'Order on hold',
  delay_reported: 'Delay reported — awaiting admin decision',
  extension_requested: 'Extension requested — awaiting admin decision',
  ai_violation_review: 'AI violation under review',
  plagiarism_violation_review: 'Plagiarism violation under review',
};

function allowedSubmissionKinds(order) {
  return W.allowedSubmissionKinds(order, D.GW_ME.id);
}

function submissionClosedReason(order) {
  return W.submissionClosedReason(order);
}

// ============ GW SUBMIT ============
// Per-assignment submit. Routes:
//   #/gw/gw-submit?id=3520&kind=interim_1
//   #/gw/gw-submit?id=3540&kind=final
// Per PRD/SOP: final requires TWO files (work + Honorarrechnung) and shows the
// legal invoice address. All variants gate Submit behind a self-check checklist.
function GWSubmit({ orderId, kind, navigate, toast }) {
  // No orderId → show picker of my active assignments.
  if (!orderId) return <GWSubmitPicker navigate={navigate}/>;
  const order = D.liveOrder(orderId);
  if (!order) return <div className="page">Assignment #{orderId} not found.</div>;
  if (order.gwId !== 'gw-iw') return <div className="page">This assignment isn't yours.</div>;

  // Resolve kind from route + order context
  const resolvedKind = (() => {
    if (kind === 'interim_1' || kind === 'interim_2' || kind === 'final' || kind === 'revision') return kind;
    // Fallback: pick the next due milestone based on status
    if (order.status === 'revision_required') return 'revision';
    if (order.interimDeadline && U.daysTo(order.interimDeadline) >= -1 && order.status === 'active') return 'interim_1';
    return 'final';
  })();
  const allowedKinds = allowedSubmissionKinds(order);
  if (!allowedKinds.includes(resolvedKind)) {
    return (
      <div className="page" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <CrumbBar trail={['My Assignments', `#${order.id}`, 'Submit']}/>
            <h1 className="page-title" style={{ marginTop: 6 }}>Submission closed</h1>
            <div className="page-subtitle">Order #{order.id} · {order.titleTBD ? 'folgt' : order.title}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-pad flex-col gap-3" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
              <Icon name="lock" size={20}/>
            </div>
            <div>
              <div className="strong fs-13">{submissionClosedReason(order)}</div>
              <div className="text-muted fs-12 mt-1">The final work and invoice are already recorded for this workflow state. Wait for the next platform action instead of uploading another file.</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('order-detail', { id: order.id })} style={{ alignSelf: 'center' }}>
              <Icon name="chevron-left" size={14}/> Back to assignment
            </button>
          </div>
        </div>
      </div>
    );
  }
  const isFinal = resolvedKind === 'final';
  const isRevision = resolvedKind === 'revision';
  const isInterim = !isFinal && !isRevision;
  const kindLabel = {
    interim_1: 'Zwischenstand 1 / Interim 1',
    interim_2: 'Zwischenstand 2 / Interim 2',
    final: 'Final delivery + Honorarrechnung',
    revision: `Revision (round ${(order.revisionRounds || 0) + 1})`,
  }[resolvedKind];
  const dueDate = resolvedKind === 'interim_1' ? order.interimDeadline
    : resolvedKind === 'interim_2' ? order.interim2Deadline
    : order.finalDeadline;

  // ---- self-check state ----
  const baseChecks = { spelling: false, grammar: false, plagiarism: false, requirements: false, noAi: false, ready: false };
  const finalExtras = { individual: false };
  const [checks, setChecks] = useStateA({ ...baseChecks, ...((isFinal || isRevision) ? finalExtras : {}) });
  const allChecksDone = Object.values(checks).every(Boolean);

  // ---- file state ----
  const [workFile, setWorkFile] = useStateA(null);
  const [invoiceFile, setInvoiceFile] = useStateA(null);
  const [workErr, setWorkErr] = useStateA(null);
  const [invoiceErr, setInvoiceErr] = useStateA(null);
  const workInputRef = useRefA(null);
  const invoiceInputRef = useRefA(null);

  // ---- pipeline state ----
  const [step, setStep] = useStateA(0); // 0 idle, 1 upload, 2 plag, 3 ai, 4 qa, 5 done

  const MAX_BYTES = 5 * 1024 * 1024;
  // PRD: .doc, .docx, .pdf, .xls, .xlsx — max 5 MB
  const ACCEPTED_MIME = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const ACCEPTED_EXT = ['.pdf', '.docx', '.doc', '.xls', '.xlsx'];
  const ACCEPT_ATTR = ACCEPTED_EXT.join(',') + ',' + ACCEPTED_MIME.join(',');
  // Honorarrechnung must be a PDF — invoices are non-editable in DE practice
  const INVOICE_EXT = ['.pdf'];
  const INVOICE_ACCEPT = '.pdf,application/pdf';

  const validate = (f, allowedExt) => {
    if (!f) return 'No file selected.';
    const lower = (f.name || '').toLowerCase();
    const extOk = allowedExt.some(e => lower.endsWith(e));
    if (!extOk) return `Unsupported file type. Allowed: ${allowedExt.join(', ')}.`;
    if (f.size > MAX_BYTES) return `File too large (${(f.size/1024/1024).toFixed(1)} MB). Max 5 MB.`;
    if (f.size === 0) return 'File is empty.';
    return null;
  };

  const onWorkPicked = (f) => {
    const err = validate(f, ACCEPTED_EXT);
    if (err) { setWorkErr(err); toast({ text: err, tone: 'danger' }); return; }
    setWorkErr(null); setWorkFile({ name: f.name, size: f.size });
  };
  const onInvoicePicked = (f) => {
    const err = validate(f, INVOICE_EXT);
    if (err) { setInvoiceErr(err); toast({ text: err, tone: 'danger' }); return; }
    setInvoiceErr(null); setInvoiceFile({ name: f.name, size: f.size });
  };

  const filesReady = isFinal ? (workFile && invoiceFile) : !!workFile;
  const canSubmit = allChecksDone && filesReady && step === 0;

  const submit = () => {
    if (!canSubmit) return;
    setStep(1);
    setTimeout(() => setStep(2), 1100);
    setTimeout(() => setStep(3), 2400);
    setTimeout(() => setStep(4), 3500);
    setTimeout(() => {
      setStep(5);
      EFActions.gw.submit(order.id, {
        kind: resolvedKind,
        workFile,
        invoiceFile,
        selfChecks: checks,
      });
      toast({
        tone: 'success',
        transition: {
          entity: `Order #${order.id}`,
          from: isFinal ? 'Active' : isRevision ? 'Revision Required' : 'Active',
          to: isInterim ? 'Customer Review' : 'QA Review',
        },
        text: isInterim
          ? 'Auto-forwarded to customer · awaiting feedback'
          : 'Plag 4% · AI 8% · forwarded to QA queue',
      });
    }, 4600);
  };

  // Interim is auto-forwarded to the customer; final/revision goes through QA first.
  const stages = (isFinal || isRevision)
    ? [
        { name: 'Upload', icon: 'upload-cloud' },
        { name: 'Plagiarism', icon: 'shield-check' },
        { name: 'AI detector', icon: 'zap' },
        { name: 'QA queue', icon: 'inbox' },
      ]
    : [
        { name: 'Upload', icon: 'upload-cloud' },
        { name: 'Self-check logged', icon: 'check-circle' },
        { name: 'Auto-forwarded', icon: 'send' },
      ];

  const Check = ({ k, label, why }) => (
    <label className="flex items-start gap-2" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: checks[k] ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
      <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks(c => ({ ...c, [k]: e.target.checked }))} style={{ marginTop: 2 }}/>
      <div className="flex-col" style={{ lineHeight: 1.35 }}>
        <span className="fs-12 strong">{label}</span>
        {why && <span className="fs-11 text-faint">{why}</span>}
      </div>
    </label>
  );

  const FilePicker = ({ label, current, err, onPicked, accept, allowedExt, inputRef, hint }) => {
    const [drag, setDrag] = useStateA(false);
    const onChange = (e) => { const f = e.target.files?.[0]; if (f) onPicked(f); e.target.value = ''; };
    const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f) onPicked(f); };
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="fs-12 strong">{label}</span>
          {current && <span className="pill pill-green"><Icon name="check" size={10}/> ready</span>}
        </div>
        <input ref={inputRef} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} aria-label={label}/>
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); }}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${drag ? 'var(--blue)' : (err ? 'var(--red)' : 'var(--border)')}`,
            borderRadius: 10, padding: current ? 14 : 24, cursor: 'pointer',
            background: drag ? 'color-mix(in oklab, var(--blue) 6%, var(--surface-2))' : 'var(--surface-2)',
            transition: 'border-color .15s, background .15s', textAlign: 'center',
          }}
        >
          {current ? (
            <div className="flex items-center gap-2" style={{ justifyContent: 'center' }}>
              <Icon name="file-text" size={16} className="text-muted"/>
              <span className="fs-12 mono">{current.name}</span>
              <span className="text-faint fs-11">· {(current.size/1024).toFixed(0)} KB</span>
              <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Replace</button>
            </div>
          ) : (
            <>
              <Icon name="upload-cloud" size={22} className="text-faint"/>
              <div className="fs-12 strong mt-1">{drag ? 'Drop to attach' : 'Click or drop file'}</div>
              <div className="fs-11 text-faint mt-1">{allowedExt.join(', ')} · max 5 MB</div>
            </>
          )}
        </div>
        {hint && <div className="fs-11 text-faint mt-1">{hint}</div>}
        {err && <div className="banner danger mt-2" style={{ fontSize: 11.5 }}><Icon name="alert-triangle" size={12}/> <span>{err}</span></div>}
      </div>
    );
  };

  // ---- Pipeline view ----
  if (step >= 1) {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <CrumbBar trail={['My Assignments', `#${order.id}`, 'Submit']}/>
            <h1 className="page-title" style={{ marginTop: 6 }}>Submitting · {kindLabel}</h1>
            <div className="page-subtitle">Order #{order.id} · {isInterim ? 'uploading and auto-forwarding to customer' : 'scanning, scoring and forwarding to QA'}</div>
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-pad">
            <div className="flex justify-between items-center">
              {stages.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex-col items-center gap-1" style={{ flex: 1, opacity: step >= i+1 ? 1 : 0.4 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 18, background: step > i+1 ? 'var(--green)' : step === i+1 ? 'var(--blue)' : 'var(--surface-3)', color: step >= i+1 ? 'white' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step > i+1 ? <Icon name="check" size={16}/> : <Icon name={s.icon} size={16}/>}
                    </div>
                    <div className="fs-11 strong">{s.name}</div>
                  </div>
                  {i < stages.length - 1 && <div style={{ flex: 0.4, height: 2, background: step > i+1 ? 'var(--green)' : 'var(--border)', marginBottom: 18 }}/>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-pad flex-col gap-3">
            <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
              <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
              <div style={{ flex: 1 }}>
                <strong className="fs-12">{workFile?.name}</strong>
                <div className="fs-11 text-faint">{(workFile.size/1024).toFixed(0)} KB · uploaded just now</div>
              </div>
              <span className="pill pill-green"><Icon name="check" size={10}/> Uploaded</span>
            </div>
            {isFinal && invoiceFile && (
              <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
                <div style={{ flex: 1 }}>
                  <strong className="fs-12">{invoiceFile.name}</strong>
                  <div className="fs-11 text-faint">Honorarrechnung · {(invoiceFile.size/1024).toFixed(0)} KB</div>
                </div>
                <span className="pill pill-green"><Icon name="check" size={10}/> Uploaded</span>
              </div>
            )}
            {isInterim ? (
              <>
                <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <Icon name="check-circle" size={20} className={step >= 2 ? 'text-success' : 'text-muted'} />
                  <div style={{ flex: 1 }}><strong className="fs-12">Customer-ready self-check recorded</strong><div className="fs-11 text-faint">{step >= 2 ? 'No-AI / ready-to-send / guidelines acknowledgements stored' : 'Recording checklist…'}</div></div>
                  {step >= 2 && <span className="pill pill-green">DONE</span>}
                </div>
                <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <Icon name="send" size={20} className={step >= 3 ? 'text-success' : 'text-muted'} />
                  <div style={{ flex: 1 }}><strong className="fs-12">Auto-forward to customer</strong><div className="fs-11 text-faint">{step >= 3 ? 'Sent immediately to customer · efactory1 remains in CC' : 'Forwarding…'}</div></div>
                  {step >= 3 && <span className="pill pill-green"><Icon name="check" size={10}/> SENT</span>}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <Icon name="shield-check" size={20} className={step >= 2 ? 'text-success' : 'text-muted'} />
                  <div style={{ flex: 1 }}><strong className="fs-12">Plagiarism scan (PlagScan)</strong><div className="fs-11 text-faint">{step >= 2 ? '4% — within tolerance' : 'Scanning…'}</div></div>
                  {step >= 2 && <span className="pill pill-green">PASS</span>}
                </div>
                <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <Icon name="zap" size={20} className={step >= 3 ? 'text-success' : 'text-muted'} />
                  <div style={{ flex: 1 }}><strong className="fs-12">AI detector (GPTZero + Originality.ai consensus)</strong><div className="fs-11 text-faint">{step >= 3 ? '8% AI probability — clean' : step >= 2 ? 'Running consensus…' : 'Waiting'}</div></div>
                  {step >= 3 && <span className="pill pill-green">PASS</span>}
                </div>
                <div className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <Icon name="inbox" size={20} className={step >= 4 ? 'text-success' : 'text-muted'} />
                  <div style={{ flex: 1 }}><strong className="fs-12">QA queue</strong><div className="fs-11 text-faint">{step >= 4 ? 'Forwarded · admin will review within 4h' : 'Queueing…'}</div></div>
                  {step >= 4 && <span className="pill pill-green"><Icon name="check" size={10}/> DONE</span>}
                </div>
              </>
            )}
            {step >= 5 && (
              <div className="banner success">
                <Icon name="check-circle" size={16}/>
                <div>
                  <strong>Submission complete.</strong>
                  <div className="fs-11 mt-1">{isFinal
                    ? `Final + Honorarrechnung received. Once QA passes and customer accepts, your honorarium of ${U.EUR(order.netHonorarium)} releases on the next Friday batch.`
                    : `Interim auto-forwarded to the customer immediately. You don't need to email it manually.`}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-sm" onClick={() => navigate('gw-assignment-detail', { id: order.id })}>Back to assignment</button>
                    <button className="btn btn-sm" onClick={() => navigate('gw-submissions-list')}>My submissions</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Form view ----
  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['My Assignments', `#${order.id}`, 'Submit']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>{kindLabel}</h1>
          <div className="page-subtitle">Order #{order.id} · {order.titleTBD ? 'folgt' : order.title}{dueDate ? <> · due <span className="mono">{U.fmtDate(dueDate)}, 18:00</span></> : null}</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('gw-assignment-detail', { id: order.id })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      <div className="banner info mb-3">
        <Icon name="lock" size={14}/>
        <span>{isInterim ? 'Interim drafts are auto-forwarded to the customer immediately after upload. Final work still goes to efactory1/QA first.' : 'Final work and revisions are uploaded to efactory1 first. Send-to-customer is platform-controlled after QA passes.'}</span>
      </div>

      {isRevision && (
        <div className="banner warn mb-3">
          <Icon name="alert-triangle" size={14}/>
          <span><strong>Revision round {(order.revisionRounds || 0) + 1}.</strong> Address customer feedback before re-uploading. Payment remains blocked until the corrected final is accepted.</span>
        </div>
      )}

      {/* Self-check checklist — Submit gated until all true */}
      <div className="card mb-3">
        <div className="card-head">
          <div className="card-title">Self-check before upload</div>
          <span className="text-faint fs-11">All boxes required · SOP E</span>
        </div>
        <div className="card-pad flex-col gap-2">
          <Check k="spelling" label="Spelling reviewed" why="Run a German spell-check pass — no obvious typos"/>
          <Check k="grammar" label="Grammar reviewed" why="Sentence structure, agreement, punctuation"/>
          <Check k="plagiarism" label="Plagiarism self-check completed" why="I've quoted/cited every external source. PlagScan will run again on upload."/>
          <Check k="requirements" label="Customer requirements re-read" why="Aligned to brief, outline, page count, citation style"/>
          <div style={{ borderTop: '1px dashed var(--border)', margin: '6px 0', paddingTop: 6 }}/>
          <Check k="noAi" label="No AI tools used" why="ChatGPT, Claude, Gemini etc. are forbidden under AGB v3.2"/>
          <Check k="ready" label={isInterim ? 'Interim is ready to send to the customer' : 'Work is ready to send to the customer'} why={isInterim ? 'Interim drafts auto-forward immediately after upload.' : 'Final formatting, deckblatt, references, appendices — all done'}/>
          {(isFinal || isRevision) && (
            <Check k="individual" label="Individually created for this customer" why="No reused content from prior jobs (Werkvertrag requirement)"/>
          )}
        </div>
      </div>

      {/* File pickers */}
      <div className="card mb-3">
        <div className="card-head">
          <div className="card-title">Files</div>
          <span className="text-faint fs-11">.doc · .docx · .pdf · .xls · .xlsx · max 5 MB each</span>
        </div>
        <div className="card-pad flex-col gap-3">
          <FilePicker
            label={isFinal ? 'Final work' : isRevision ? `Revised work (round ${(order.revisionRounds || 0) + 1})` : 'Work file'}
            current={workFile}
            err={workErr}
            onPicked={onWorkPicked}
            accept={ACCEPT_ATTR}
            allowedExt={ACCEPTED_EXT}
            inputRef={workInputRef}
          />
          {isFinal && (
            <FilePicker
              label="Honorarrechnung (your invoice — PDF)"
              current={invoiceFile}
              err={invoiceErr}
              onPicked={onInvoicePicked}
              accept={INVOICE_ACCEPT}
              allowedExt={INVOICE_EXT}
              inputRef={invoiceInputRef}
              hint="One invoice per assignment · numbered with your prefix (e.g. IW-2026-014)"
            />
          )}
        </div>
      </div>

      {isFinal && (
        <div className="card mb-3" style={{ border: '1px solid color-mix(in oklab, var(--blue) 25%, var(--border))' }}>
          <div className="card-head">
            <div className="card-title flex items-center gap-2"><Icon name="file-text" size={14}/> Invoice address (Rechnungsadresse)</div>
            <span className="pill pill-blue">required</span>
          </div>
          <div className="card-pad">
            <div className="fs-12 text-muted mb-2">Address your Honorarrechnung to the legal entity below — copy &amp; paste into your invoice tool:</div>
            <div className="mono fs-12" style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, lineHeight: 1.6 }}>
              Bery Ventures GmbH<br/>
              c/o WeWork Friesenplatz 4<br/>
              50672 Köln<br/>
              Germany
            </div>
            <div className="fs-11 text-faint mt-2">Tax: indicate the small-business clause (§19 UStG) if applicable. Honorarium gross = the net amount you see on this assignment.</div>
          </div>
        </div>
      )}

      {/* Pre-flight summary */}
      <div className="card">
        <div className="card-pad flex items-center gap-3">
          <div className="flex-col" style={{ flex: 1, lineHeight: 1.4 }}>
            <span className="fs-12 strong">{allChecksDone && filesReady ? 'Ready to submit' : 'Pre-flight'}</span>
            <span className="fs-11 text-faint">
              {!allChecksDone && `Checklist: ${Object.values(checks).filter(Boolean).length}/${Object.keys(checks).length} done · `}
              {!workFile && 'work file missing · '}
              {isFinal && !invoiceFile && 'Honorarrechnung missing · '}
              {allChecksDone && filesReady && 'Plagiarism + AI scans run on upload, then forwarded to QA'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSubmit}
            onClick={submit}
            title={!canSubmit ? 'Complete the checklist and attach all required files first' : 'Submit'}
          >
            <Icon name="upload-cloud" size={14}/> Submit{isFinal ? ' final + invoice' : isRevision ? ' revision' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component: when GW navigates to /gw/gw-submit without an id, list active assignments.
function GWSubmitPicker({ navigate }) {
  const myActive = D.liveOrders().filter(o => allowedSubmissionKinds(o).length > 0);
  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">New submission</h1>
          <div className="page-subtitle">Pick the assignment and milestone you want to upload for.</div>
        </div>
      </div>
      {myActive.length === 0 ? (
        <div className="card"><div className="card-pad text-faint fs-12">You have no active assignments to submit for.</div></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {myActive.map(o => {
            const allowedKinds = allowedSubmissionKinds(o);
            const interimDue = o.interimDeadline && U.daysTo(o.interimDeadline);
            const finalDue = U.daysTo(o.finalDeadline);
            return (
              <div key={o.id} style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-col" style={{ lineHeight: 1.3 }}>
                    <span className="strong fs-12 mono">#{o.id} · {o.titleTBD ? 'folgt' : o.title}</span>
                    <span className="text-faint fs-11">{D.WORK_TYPE_LABELS[o.workType]} · final {U.fmtDate(o.finalDeadline)}</span>
                  </div>
                  <StatusPill status={o.status}/>
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {allowedKinds.includes('interim_1') && (
                    <button className="btn btn-sm" onClick={() => navigate('gw-submit', { id: o.id, kind: 'interim_1' })}>
                      <Icon name="upload-cloud" size={11}/> Interim 1 · {U.fmtDate(o.interimDeadline)}
                    </button>
                  )}
                  {allowedKinds.includes('interim_2') && (
                    <button className="btn btn-sm" onClick={() => navigate('gw-submit', { id: o.id, kind: 'interim_2' })}>
                      <Icon name="upload-cloud" size={11}/> Interim 2 · {U.fmtDate(o.interim2Deadline)}
                    </button>
                  )}
                  {allowedKinds.includes('final') && (
                    <button className="btn btn-sm btn-primary" onClick={() => navigate('gw-submit', { id: o.id, kind: 'final' })}>
                      <Icon name="upload-cloud" size={11}/> Final + invoice
                    </button>
                  )}
                  {allowedKinds.includes('revision') && (
                    <button className="btn btn-sm" onClick={() => navigate('gw-submit', { id: o.id, kind: 'revision' })}>
                      <Icon name="rotate-ccw" size={11}/> Revision (round {(o.revisionRounds || 0) + 1})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { GWSubmit };
