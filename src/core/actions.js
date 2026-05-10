// Named business actions. All entity writes should go through here.
;(function(){
const store = window.EFStore;
const S = window.EFSelectors;
const W = window.EFWorkflow;

function nowIso() {
  return new Date().toISOString();
}

function updateTable(kind, updater, label) {
  store.setState(prev => ({
    ...prev,
    entities: { ...prev.entities, [kind]: updater(prev.entities[kind]) },
  }), label);
}

function patchEntity(kind, id, patch, label) {
  updateTable(kind, table => store.tablePatch(table, id, patch), label || `${kind}.patch`);
}

function upsertEntity(kind, item, label) {
  updateTable(kind, table => store.tableUpsert(table, item), label || `${kind}.upsert`);
}

function order(id) {
  return S.selectOrder(store.getState(), id);
}

function gw(id) {
  return S.selectGhostwriter(store.getState(), id);
}

function customer(id) {
  return S.selectCustomer(store.getState(), id);
}

function toast(payload) {
  if (window.efToast) window.efToast(payload);
}

function notify(payload) {
  const targets = Array.isArray(payload.to) ? payload.to : [payload.to || 'admin'];
  const id = payload.id || ('n-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  const note = {
    id,
    to: targets,
    kind: payload.kind || 'event',
    title: payload.title || 'Notification',
    body: payload.body || '',
    urgent: !!payload.urgent,
    read: false,
    at: payload.at || nowIso(),
  };
  upsertEntity('notifications', note, 'notifications.add');
  try { window.dispatchEvent(new CustomEvent('efactory:notify', { detail: note })); } catch(e) {}
  return note;
}

function patchOrder(id, patch) {
  patchEntity('orders', id, prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }), 'orders.patch');
}

function createOrder(draft) {
  const id = draft.id || (9100 + Math.floor(Math.random() * 900));
  const next = { id, revisionRounds: 0, ...draft };
  upsertEntity('orders', next, 'orders.create');
  notify({ to: 'admin', kind: 'order_created', title: `New manual order · #${id}`, body: `${next.title || 'Untitled'} · ready for offer/payment workflow` });
  return next;
}

function approveClaim(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'approve_claim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, { status: 'active', claimApprovedAt: nowIso(), assignedAt: nowIso() });
  const g = gw(o.gwId);
  const c = customer(o.customerId);
  notify({ to: 'gw', kind: 'assignment_approved', title: `Order #${orderId} approved — you may begin`, body: 'Briefing email sent · customer was introduced' });
  notify({ to: 'customer', kind: 'assignment_intro', title: 'Ihr Ghostwriter wurde zugewiesen', body: `${g?.name || 'Ihr Ghostwriter'} meldet sich heute bei Ihnen.` });
  return true;
}

function rejectClaim(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'reject_claim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, { status: 'available', gwId: null, claimedAt: null, claimTermsAccepted: null });
  notify({ to: 'admin', kind: 'claim_rejected', title: `Claim rejected · #${orderId}`, body: 'Job returned to the GW board' });
  return true;
}

function assignGw(orderId, gwId, opts = {}) {
  const o = order(orderId);
  const guard = W.canAssign(o);
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  const targetGw = gw(gwId);
  if (!targetGw) { toast({ text: 'Ghostwriter not found', tone: 'danger' }); return false; }
  const selfAssigned = !!targetGw.isOwner || !!opts.selfAssigned;
  patchOrder(orderId, {
    gwId,
    status: 'active',
    assignedAt: nowIso(),
    selfAssigned,
    gwPaymentStatus: selfAssigned ? 'no_payment_self_assigned' : (o.gwPaymentStatus || 'work_in_progress'),
  });
  if (!selfAssigned) {
    notify({ to: 'gw', kind: 'assignment_approved', title: `Order #${orderId} assigned`, body: 'Briefing email sent · NICHT WEITERLEITEN' });
  }
  notify({ to: 'customer', kind: 'assignment_intro', title: 'Ihr Ghostwriter wurde zugewiesen', body: `${targetGw.name} meldet sich heute bei Ihnen.` });
  return true;
}

function markInstallmentPaid(orderId, n) {
  const o = order(orderId);
  if (!o) return false;
  const installments = (o.installments || []).map(i => i.n === n ? { ...i, status: 'paid', date: '2026-05-07' } : i);
  const paid = installments.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amt || 0), 0);
  const outstanding = Math.max(0, (o.grossEur || 0) - paid);
  const nextPatch = { installments, paidEur: paid, outstandingEur: outstanding };
  if (o.status === 'invoice_sent' && outstanding === 0) nextPatch.status = 'available';
  patchOrder(orderId, nextPatch);
  notify({ to: 'admin', kind: 'payment_confirmed', title: `Installment ${n} paid · #${orderId}`, body: `Outstanding balance now €${outstanding.toFixed(2)}` });
  return true;
}

function setHonorRate(orderId, rate) {
  const o = order(orderId);
  if (!o) return false;
  const honor = ((o.grossEur || 0) / 1.07) * rate;
  patchOrder(orderId, { rate, netHonorarium: honor });
  return true;
}

function claimJob(orderId, gwId) {
  const o = order(orderId);
  const actualGwId = gwId || store.getState().session.gwId;
  const guard = W.canTransition(o, 'claim_job');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, {
    status: 'claimed_pending_approval',
    gwId: actualGwId,
    claimedAt: nowIso(),
    claimTermsAccepted: {
      deadline: true,
      fee: true,
      noAi: true,
      plagiarismFree: true,
      gdpr: true,
      agbs: 'v3.2',
    },
  });
  const g = gw(actualGwId);
  notify({ to: 'admin', kind: 'claim_pending_your_approval', title: `Claim awaiting approval · #${orderId}`, body: `${g?.name || 'GW'} claimed this job · 6 acknowledgements signed` });
  return true;
}

function submitWork(orderId, payload = {}) {
  const o = order(orderId);
  const currentGwId = payload.gwId || store.getState().session.gwId;
  const kind = payload.kind || 'final';
  if (!W.allowedSubmissionKinds(o, currentGwId).includes(kind)) {
    toast({ text: W.submissionClosedReason(o), tone: 'danger' });
    return null;
  }
  const entityKind = W.submissionKindToEntityKind(kind);
  const nextStatus = W.nextStateAfterSubmit(kind);
  const existing = S.selectSubmissionsForOrder(store.getState(), orderId);
  const submission = {
    id: 's-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    orderId: Number(orderId),
    kind: entityKind,
    round: kind === 'revision' ? (o.revisionRounds || 0) + 1 : 1,
    gwId: currentGwId,
    fileName: payload.fileName || payload.workFile?.name || `${orderId}_${entityKind}.docx`,
    invoiceFileName: payload.invoiceFile?.name || payload.invoiceFileName || null,
    size: payload.size || payload.workFile?.size || 1200000,
    plagiarismScore: payload.plagiarismScore ?? 4,
    aiScore: payload.aiScore ?? 8,
    qaStatus: W.isInterimKind(kind) ? 'passed' : 'pending',
    submittedAt: nowIso(),
    forwardedAt: W.isInterimKind(kind) ? nowIso() : null,
    selfChecks: payload.selfChecks || { noAi: true, ready: true, individual: true, spelling: true, grammar: true, plagiarism: true, requirements: true },
  };
  upsertEntity('submissions', submission, 'gw.submit.submission');
  patchOrder(orderId, {
    status: nextStatus,
    lastSubmissionAt: submission.submittedAt,
    lastSubmissionFile: submission.fileName,
    lastSubmissionKind: kind,
    lastInvoiceFile: submission.invoiceFileName || undefined,
    finalSubmittedAt: kind === 'final' ? submission.submittedAt : o.finalSubmittedAt,
    revisionRounds: kind === 'revision' ? (o.revisionRounds || 0) + 1 : (o.revisionRounds || 0),
    gwPaymentStatus: kind === 'final' && o.gwPaymentStatus !== 'paid' ? 'invoice_received' : o.gwPaymentStatus,
  });
  const g = gw(currentGwId);
  if (W.isInterimKind(kind)) {
    notify({ to: 'customer', kind: 'interim_received', title: 'Ihr Zwischenstand ist verfügbar', body: `Auftrag #${orderId} · Bitte prüfen und Feedback geben` });
    notify({ to: 'admin', kind: 'interim_received', title: `Interim forwarded · #${orderId}`, body: `${g?.name || 'GW'} uploaded interim · auto-sent to customer` });
  } else {
    notify({ to: 'admin', kind: 'final_uploaded', title: `${kind === 'final' ? 'Final' : 'Revision'} submission · #${orderId}`, body: `${g?.name || 'GW'} uploaded · pending QA` });
    notify({ to: 'qa', kind: 'final_uploaded', title: `New submission · #${orderId}`, body: `${entityKind} · waiting for QA verdict` });
  }
  return submission;
}

function qaPass(submissionId) {
  const state = store.getState();
  const sub = S.byId(state.entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const isFinal = sub.kind === 'final_work';
  patchEntity('submissions', submissionId, { qaStatus: 'passed', reviewedAt: nowIso(), reviewer: 'qa@efactory1.de' }, 'qa.pass.submission');
  patchOrder(sub.orderId, {
    status: isFinal ? 'delivered' : 'under_customer_review',
    qaPassed: true,
    flagged: false,
    deliveredAt: isFinal ? nowIso() : o.deliveredAt,
  });
  const c = customer(o.customerId);
  notify({ to: 'customer', kind: 'qa_passed', title: 'Ihre Arbeit hat die Qualitätsprüfung bestanden', body: `Auftrag #${o.id} · ${isFinal ? 'Endabgabe' : 'Zwischenstand'} freigegeben` });
  notify({ to: 'gw', kind: 'qa_passed', title: `QA passed · #${o.id}`, body: 'Forwarded to customer · payment release gate progressing' });
  return true;
}

function qaRequestRevision(submissionId) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  patchEntity('submissions', submissionId, { qaStatus: 'revision_requested', reviewedAt: nowIso() }, 'qa.revision.submission');
  patchOrder(sub.orderId, {
    status: 'revision_required',
    revisionRounds: (o.revisionRounds || 0) + 1,
    qaPassed: false,
  });
  notify({ to: 'gw', kind: 'revision_required', title: `Revision requested on Order #${o.id}`, body: 'QA returned feedback · please resubmit through the platform' });
  return true;
}

function qaFlag(submissionId, type) {
  const sub = S.byId(store.getState().entities.submissions, submissionId);
  if (!sub) return false;
  const o = order(sub.orderId);
  const status = type === 'plagiarism' ? 'plagiarism_violation_review' : 'ai_violation_review';
  const reason = type === 'plagiarism' ? 'Plagiarism suspected' : 'AI use suspected';
  patchEntity('submissions', submissionId, { qaStatus: 'flagged', flagged: true, flagType: type, reviewedAt: nowIso() }, `qa.flag.${type}.submission`);
  patchOrder(sub.orderId, {
    status,
    flagged: true,
    qaFlaggedAt: nowIso(),
    qaFlagReason: reason,
    qaPassed: false,
    paymentBlocked: true,
  });
  notify({ to: 'admin', kind: type === 'plagiarism' ? 'plagiarism_violation' : 'ai_violation', title: `🚨 ${reason} · #${o.id}`, body: `QA flagged ${gw(o.gwId)?.name || 'GW'}. Payment is blocked and admin review is required.`, urgent: true });
  return true;
}

function approveInterim(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_approve_interim');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, { status: 'active', interimCustomerSatisfied: true, lastCustomerFeedbackAt: nowIso() });
  notify({ to: 'gw', kind: 'interim_approved', title: 'Zwischenstand freigegeben', body: `Kunde hat Zwischenstand #${orderId} freigegeben` });
  notify({ to: 'admin', kind: 'interim_approved', title: `Customer approved interim · #${orderId}`, body: 'GW can continue to the next milestone' });
  return true;
}

function requestCustomerRevision(orderId, note) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_request_revision');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, {
    status: 'revision_required',
    revisionRounds: (o.revisionRounds || 0) + 1,
    lastCustomerFeedbackAt: nowIso(),
    customerRevisionNote: note || '',
  });
  notify({ to: 'gw', kind: 'revision_required', title: 'Überarbeitung angefordert', body: `Auftrag #${orderId}: ${(note || '').slice(0, 80)}` });
  notify({ to: 'admin', kind: 'revision_required', title: `Customer requested revision · #${orderId}`, body: (note || '').slice(0, 120) });
  return true;
}

function escalate(orderId) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { disputeOpen: true, status: o.status === 'delivered' ? 'revision_required' : o.status, lastDisputeAt: nowIso() });
  notify({ to: 'admin', kind: 'dispute_opened', title: `Dispute opened · #${orderId}`, body: 'Customer escalated from the portal · payment release blocked', urgent: true });
  return true;
}

// Customer accepts the final delivery.
// PRD friday_payment_batch.release_gates: customer_satisfied is the gate that
// only the customer can flip; this action is the *only* place it gets set true
// for a final. Status moves delivered → payment_pending which feeds the Friday batch.
function acceptFinal(orderId) {
  const o = order(orderId);
  const guard = W.canTransition(o, 'customer_accept_final');
  if (!guard.ok) { toast({ text: guard.reason, tone: 'danger' }); return false; }
  patchOrder(orderId, {
    status: 'payment_pending',
    customerSatisfied: true,
    finalAcceptedAt: nowIso(),
    lastCustomerFeedbackAt: nowIso(),
  });
  notify({ to: 'admin', kind: 'final_accepted', title: `Customer accepted final · #${orderId}`, body: 'Order moved to Friday-batch eligibility — release gate now driven by GW invoice + installments.' });
  notify({ to: 'gw', kind: 'final_accepted', title: `Final accepted · #${orderId}`, body: 'Customer signed off. Honorarium queues for the next Friday batch once gates clear.' });
  return true;
}

function reportDelay(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, {
    status: 'delay_reported',
    delayReason: payload.reasonKind || payload.reason || 'other',
    delayReportedAt: nowIso(),
    proposedNewDeadline: payload.newDate ? payload.newDate + 'T18:00:00' : payload.proposedNewDeadline,
  });
  notify({ to: 'admin', kind: 'delay_reported', title: `Delay reported · #${orderId}`, body: `New proposed date ${payload.newDate || 'TBD'} · reason: ${payload.reasonKind || payload.reason || 'other'}`, urgent: true });
  notify({ to: 'customer', kind: 'delay_reported', title: 'Lieferdatum-Anpassung gemeldet', body: `Neuer Termin: ${payload.newDate || 'TBD'}. Wir kümmern uns.` });
  return true;
}

function requestExtension(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, {
    status: 'extension_requested',
    extensionPending: {
      description: payload.description || '',
      extraPages: payload.extraPages || '',
      extraFee: payload.extraFee || '',
      requestedAt: nowIso(),
    },
  });
  notify({ to: 'admin', kind: 'extension_requested', title: `Extension requested · #${orderId}`, body: 'GW requests scope review and customer approval before work proceeds' });
  return true;
}

function releaseBatch(orderIds) {
  const ids = Array.from(orderIds || []);
  const released = [];
  ids.forEach(id => {
    const o = order(id);
    if (!o) return;
    const gates = W.releaseGates(o);
    if (!gates.releasable) return;
    patchOrder(id, { status: 'completed', gwPaymentStatus: 'paid', paidToGwAt: nowIso(), completedAt: nowIso() });
    released.push({ id, amount: o.netHonorarium || 0 });
  });
  released.forEach(x => notify({ to: 'gw', kind: 'payment_released', title: `€${Number(x.amount).toLocaleString('de-DE', { minimumFractionDigits: 2 })} released · #${x.id}`, body: 'See your bank in 1–3 business days' }));
  return released;
}

// ============ A5: ADMIN RESOLUTION FOR EXTENSION / DELAY / DISPUTE ============
// Each closes a state that previously had no admin response path (orders would
// stick in extension_requested / delay_reported / disputeOpen forever).

function approveExtension(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  const ext = o.extensionPending || {};
  const extraPages = Number(ext.extraPages) || 0;
  const extraFee = Number(ext.extraFee) || 0;
  const newDeadline = payload.newDeadline || ext.proposedNewDeadline || o.finalDeadline;
  patchOrder(orderId, prev => ({
    ...prev,
    status: 'active',
    finalDeadline: newDeadline,
    pages: (prev.pages || 0) + extraPages,
    grossEur: (prev.grossEur || 0) + extraFee,
    extensionPending: null,
    extensionApprovedAt: nowIso(),
  }));
  notify({ to: 'gw', kind: 'extension_approved', title: `Extension approved · #${orderId}`, body: `Scope updated · ${extraPages ? '+' + extraPages + ' pages · ' : ''}${extraFee ? '+' + extraFee + ' € · ' : ''}new deadline ${newDeadline?.slice?.(0,10) || ''}` });
  notify({ to: 'customer', kind: 'extension_approved', title: 'Erweiterung genehmigt', body: `Auftrag #${orderId} wurde erweitert. Neuer Liefertermin: ${newDeadline?.slice?.(0,10) || ''}.` });
  return true;
}

function rejectExtension(orderId, reason) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { status: 'active', extensionPending: null, extensionRejectedAt: nowIso(), extensionRejectReason: reason || null });
  notify({ to: 'gw', kind: 'extension_rejected', title: `Extension declined · #${orderId}`, body: reason ? `Reason: ${reason}` : 'Please continue with the original scope.' });
  return true;
}

function acceptDelay(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  const newDeadline = payload.newDeadline || o.proposedNewDeadline || o.finalDeadline;
  patchOrder(orderId, {
    status: 'active',
    finalDeadline: newDeadline,
    delayAcceptedAt: nowIso(),
    proposedNewDeadline: null,
  });
  notify({ to: 'gw', kind: 'delay_accepted', title: `New deadline confirmed · #${orderId}`, body: `Final deadline now ${newDeadline?.slice?.(0,10) || ''}` });
  notify({ to: 'customer', kind: 'delay_accepted', title: 'Neuer Liefertermin bestätigt', body: `Auftrag #${orderId} · neuer Termin ${newDeadline?.slice?.(0,10) || ''}` });
  return true;
}

function proposeNewDelay(orderId, newDeadline) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { proposedNewDeadline: newDeadline });
  notify({ to: 'customer', kind: 'delay_counter', title: 'Gegenvorschlag für Liefertermin', body: `Auftrag #${orderId} · vorgeschlagen: ${newDeadline?.slice?.(0,10) || ''}` });
  notify({ to: 'gw', kind: 'delay_counter', title: `Admin proposed new deadline · #${orderId}`, body: newDeadline?.slice?.(0,10) || '' });
  return true;
}

function closeDispute(orderId, resolution) {
  const o = order(orderId);
  if (!o) return false;
  patchOrder(orderId, { disputeOpen: false, disputeResolution: resolution || 'resolved', disputeClosedAt: nowIso() });
  notify({ to: 'customer', kind: 'dispute_closed', title: `Streitfall gelöst · Auftrag #${orderId}`, body: resolution ? resolution.slice(0, 140) : 'Der Streitfall wurde geschlossen.' });
  notify({ to: 'gw', kind: 'dispute_closed', title: `Dispute closed · #${orderId}`, body: resolution ? resolution.slice(0, 140) : 'Closed by admin.' });
  return true;
}

// ============ A6: ADMIN RESOLUTION FOR AI / PLAGIARISM VIOLATIONS ============

function confirmViolation(orderId, payload = {}) {
  const o = order(orderId);
  if (!o) return false;
  const reasonText = payload.reason || o.qaFlagReason || 'Quality violation confirmed';
  const violationType = o.status === 'plagiarism_violation_review' ? 'plagiarism' : 'ai';
  // Shadow-ban the GW (already an existing action) and reset the order so a new
  // GW can be assigned; payment stays blocked until reassignment + re-QA.
  if (o.gwId) {
    shadowBan(o.gwId, { banned: true, reason: `${violationType === 'plagiarism' ? 'Plagiarism' : 'AI use'} confirmed on #${orderId}` });
  }
  patchOrder(orderId, {
    status: 'available',
    gwId: null,
    flagged: false,
    paymentBlocked: false,
    qaPassed: false,
    violationConfirmedAt: nowIso(),
    violationReason: reasonText,
  });
  notify({ to: 'customer', kind: 'violation_confirmed', title: 'Wir setzen Ihren Auftrag mit einem neuen Ghostwriter fort', body: `Auftrag #${orderId} · die Qualitätsprüfung hat eine Auffälligkeit bestätigt. Wir weisen Ihnen kurzfristig einen neuen Ghostwriter zu — ohne Mehrkosten.` });
  notify({ to: 'admin', kind: 'violation_confirmed', title: `Violation confirmed · #${orderId}`, body: `Order returned to job board · GW shadow-banned · payment block lifted (no honorarium owed).` });
  return true;
}

function clearViolation(orderId, reason) {
  const o = order(orderId);
  if (!o) return false;
  // Restore the order to the appropriate prior state: if a final was already
  // submitted treat as delivered; otherwise back to qa_review.
  const restoreTo = o.lastSubmissionKind === 'final' || o.finalSubmittedAt ? 'delivered' : 'qa_review';
  patchOrder(orderId, {
    status: restoreTo,
    flagged: false,
    paymentBlocked: false,
    qaPassed: restoreTo === 'delivered' ? true : o.qaPassed,
    violationClearedAt: nowIso(),
    violationClearReason: reason || null,
    qaFlagReason: null,
  });
  notify({ to: 'gw', kind: 'violation_cleared', title: `Flag cleared · #${orderId}`, body: reason ? `Admin reviewed and cleared the flag: ${reason}` : 'Admin reviewed the evidence and cleared the flag.' });
  notify({ to: 'customer', kind: 'violation_cleared', title: 'Auftrag freigegeben', body: `Auftrag #${orderId} · die Endversion wurde nach Prüfung freigegeben.` });
  return true;
}

function shadowBan(gwId, payload = {}) {
  const target = gw(gwId);
  if (!target) return false;
  const banned = payload.banned !== undefined ? payload.banned : !target.banned;
  patchEntity('ghostwriters', gwId, { banned, banReason: banned ? (payload.reason || target.banReason || 'Admin quality control') : null }, 'gws.shadowBan');
  notify({ to: 'admin', kind: 'gw_shadow_ban', title: `${target.name} ${banned ? 'shadow-banned' : 'restored'}`, body: banned ? 'GW stops receiving job-board email alerts but can still access the board.' : 'GW visibility restored.' });
  return true;
}

function markAllNotificationsRead(role) {
  updateTable('notifications', table => {
    const byId = { ...table.byId };
    table.allIds.forEach(id => {
      const n = byId[id];
      const targets = Array.isArray(n.to) ? n.to : [n.to || 'admin'];
      if (targets.includes(role) || targets.includes('all')) byId[id] = { ...n, read: true };
    });
    return { ...table, byId };
  }, 'notifications.markAllRead');
}

function setRole(role) {
  store.setState(prev => ({ ...prev, session: { ...prev.session, role } }), 'session.setRole');
}

function setRoute(route) {
  store.setState(prev => ({ ...prev, ui: { ...prev.ui, route } }), 'ui.setRoute');
}

// ============ THREADS / MESSAGING (A1) ============
//
// Threads live in state.entities.threads with shape:
//   { id, orderId, customerId, gwId, subject, channel, sentiment, lastAt,
//     flagged, followUp, snoozeUntil,
//     unread: { admin: N, gw: N, customer: N },
//     messages: [{ id, threadId, from, body, at, attachments?, autoflag?, system? }] }
//
// All composer surfaces (admin/inbox.jsx, gw/messages.jsx, customer/view.jsx)
// route through `threads.send` so a message sent in one persona is visible to
// the others on role switch.
const FINANCIAL_KEYWORD_RE = /preis|kosten|rabatt|nachlass|raten|geld|honorar|bezahl|rechnung|euro|€/i;

function selectThread(state, threadId) {
  return S.byId(state.entities.threads, threadId);
}

function selectThreadByOrder(state, orderId) {
  const threads = state.entities.threads;
  const id = (threads.allIds || []).find(tid => Number(threads.byId[tid]?.orderId) === Number(orderId));
  return id ? threads.byId[id] : null;
}

function newMessageId(threadId) {
  return `${threadId}-m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function ensureThreadForOrder(orderId, sender) {
  const state = store.getState();
  const existing = selectThreadByOrder(state, orderId);
  if (existing) return existing;
  const o = order(orderId);
  if (!o) return null;
  const id = `t-live-${orderId}`;
  const thread = {
    id,
    orderId: Number(orderId),
    customerId: o.customerId,
    gwId: o.gwId || null,
    subject: o.title || `Auftrag #${orderId}`,
    channel: 'platform_chat',
    sentiment: 'neutral',
    lastAt: nowIso(),
    flagged: false,
    followUp: false,
    snoozeUntil: null,
    unread: { admin: 0, gw: 0, customer: 0 },
    messages: [],
  };
  upsertEntity('threads', thread, 'threads.create');
  return thread;
}

function appendMessage(threadId, message, label) {
  patchEntity('threads', threadId, prev => {
    const messages = [...(prev.messages || []), message];
    return {
      ...prev,
      messages,
      lastAt: message.at,
    };
  }, label || 'threads.appendMessage');
}

function bumpUnread(threadId, recipientRoles) {
  patchEntity('threads', threadId, prev => {
    const unread = { admin: 0, gw: 0, customer: 0, ...(prev.unread || {}) };
    recipientRoles.forEach(r => { unread[r] = (unread[r] || 0) + 1; });
    return { ...prev, unread };
  }, 'threads.bumpUnread');
}

function recipientsForThread(thread, senderRole) {
  // Admin always observes (CC). The other side of the conversation gets a ping.
  const all = ['admin', 'gw', 'customer'];
  return all.filter(r => r !== senderRole);
}

function sendMessage(payload = {}) {
  const role = payload.role || store.getState().session.role || 'admin';
  const orderId = payload.orderId;
  let threadId = payload.threadId;
  let thread = threadId
    ? selectThread(store.getState(), threadId)
    : (orderId != null ? selectThreadByOrder(store.getState(), orderId) : null);

  if (!thread && orderId != null) {
    thread = ensureThreadForOrder(orderId, role);
  }
  if (!thread) {
    toast({ text: 'Thread not found', tone: 'danger' });
    return null;
  }
  threadId = thread.id;

  const body = (payload.body || '').trim();
  if (!body && !(payload.attachments && payload.attachments.length)) return null;

  const at = nowIso();
  const isFinancial = role !== 'admin' && FINANCIAL_KEYWORD_RE.test(body);
  const message = {
    id: newMessageId(threadId),
    threadId,
    from: role,
    body,
    at,
    autoflag: isFinancial ? 'financial' : null,
    system: false,
  };
  if (payload.attachments && payload.attachments.length) message.attachments = payload.attachments;
  appendMessage(threadId, message, 'threads.send');

  // Always bump unread for non-sender roles. The financial system message
  // (below) bumps admin again so the redirect is unmistakable in the bell.
  bumpUnread(threadId, recipientsForThread(thread, role));

  if (isFinancial) {
    const sysMsg = {
      id: newMessageId(threadId) + '-sys',
      threadId,
      from: 'system',
      body: 'Finanzbezug erkannt — Anfrage automatisch an kundenservice@efactory1.de weitergeleitet. Der Ghostwriter darf finanzielle Themen nicht besprechen.',
      at: nowIso(),
      system: true,
      autoflag: 'financial',
    };
    appendMessage(threadId, sysMsg, 'threads.financialRedirect');
    patchEntity('threads', threadId, { flagged: 'financial' }, 'threads.flagFinancial');
    notify({
      to: 'admin',
      kind: 'message_redirected',
      title: `Finanzfrage umgeleitet · #${thread.orderId}`,
      body: 'Customer fragte nach Preisen/Raten. Auto-Redirect an kundenservice@efactory1.de.',
      urgent: false,
    });
  }

  // Notify the other participants. Skip admin notification if it's the financial
  // path (already covered above) and skip self.
  const senderName = role === 'gw'
    ? (gw(thread.gwId)?.name || 'Ghostwriter')
    : role === 'customer'
      ? (customer(thread.customerId)?.name || 'Kunde')
      : 'efactory1';
  const previewBody = body.length > 90 ? body.slice(0, 90) + '…' : body;
  const recipients = recipientsForThread(thread, role)
    .filter(r => !(isFinancial && r === 'admin'));
  if (recipients.length) {
    notify({
      to: recipients,
      kind: 'message_received',
      title: `Neue Nachricht · #${thread.orderId}`,
      body: `${senderName}: ${previewBody}`,
      urgent: false,
    });
  }

  return message;
}

function markThreadRead(threadId, role) {
  if (!threadId || !role) return false;
  patchEntity('threads', threadId, prev => {
    const unread = { admin: 0, gw: 0, customer: 0, ...(prev.unread || {}) };
    unread[role] = 0;
    return { ...prev, unread };
  }, 'threads.markRead');
  return true;
}

function redirectThread(threadId) {
  const thread = selectThread(store.getState(), threadId);
  if (!thread) return false;
  const sysMsg = {
    id: newMessageId(threadId) + '-redir',
    threadId,
    from: 'system',
    body: 'Admin hat diesen Thread an kundenservice@efactory1.de weitergeleitet. Bitte alle Finanzfragen dort fortführen.',
    at: nowIso(),
    system: true,
    autoflag: 'financial',
  };
  appendMessage(threadId, sysMsg, 'threads.redirect');
  patchEntity('threads', threadId, { flagged: 'financial' }, 'threads.flagFinancial');
  notify({
    to: 'customer',
    kind: 'message_redirected',
    title: `Anfrage an Kundenservice weitergeleitet · #${thread.orderId}`,
    body: 'Wir kümmern uns von dort um Ihre Frage.',
  });
  return true;
}

function flagThreadFollowUp(threadId) {
  patchEntity('threads', threadId, prev => ({ ...prev, followUp: !prev.followUp }), 'threads.followUp');
  return true;
}

function snoozeThread(threadId, hours = 4) {
  const ms = Date.now() + hours * 3600 * 1000;
  patchEntity('threads', threadId, { snoozeUntil: new Date(ms).toISOString() }, 'threads.snooze');
  return true;
}

const actions = {
  toast,
  notify,
  session: { setRole, setRoute },
  orders: {
    patch: patchOrder,
    create: createOrder,
    approveClaim,
    rejectClaim,
    assignGw,
    markInstallmentPaid,
    setHonorRate,
    approveExtension,
    rejectExtension,
    acceptDelay,
    proposeNewDelay,
    closeDispute,
    confirmViolation,
    clearViolation,
  },
  gw: {
    claimJob,
    submit: submitWork,
    reportDelay,
    requestExtension,
  },
  qa: {
    pass: qaPass,
    requestRevision: qaRequestRevision,
    flagAi: (submissionId) => qaFlag(submissionId, 'ai'),
    flagPlagiarism: (submissionId) => qaFlag(submissionId, 'plagiarism'),
  },
  customer: {
    approveInterim,
    requestRevision: requestCustomerRevision,
    acceptFinal,
    escalate,
  },
  payments: { releaseBatch },
  gws: { shadowBan },
  notifications: { markAllRead: markAllNotificationsRead },
  threads: {
    send: sendMessage,
    markRead: markThreadRead,
    redirect: redirectThread,
    flagFollowUp: flagThreadFollowUp,
    snooze: snoozeThread,
  },
};

window.EFActions = actions;

// Backward-compatible shims for any not-yet-migrated demo hooks.
window.efNotify = notify;
})();
