// Demo Inbox email creator. Emails are entities in state.entities.emails.
// Each email may carry a magic-link CTA referencing a token in state.entities.tokens.
import store from '../core/store.js';
import { emit } from './events.js';

function nowIso() {
  return new Date().toISOString();
}

let counter = 0;
function nextId(kind, orderId) {
  counter += 1;
  return `mail-${orderId || 'na'}-${kind}-${counter}`;
}

function createEmail(payload) {
  const email = {
    id: payload.id || nextId(payload.kind || 'mail', payload.orderId),
    to: payload.to,
    toRole: payload.toRole || 'customer',
    cc: payload.cc || null,
    from: payload.from || 'kundenservice@efactory1.de',
    subject: payload.subject || '',
    bodyMd: payload.bodyMd || '',
    cta: payload.cta || null,
    kind: payload.kind || 'mail',
    orderId: payload.orderId ?? null,
    customerId: payload.customerId ?? null,
    gwId: payload.gwId ?? null,
    sentAt: payload.sentAt || nowIso(),
    read: false,
    scenarioId: payload.scenarioId || null,
    tokenId: payload.tokenId || null,
  };
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      emails: store.tableUpsert(prev.entities.emails, email),
    },
  }), `sim.mail.send:${email.kind}`);
  emit({
    source: 'mail',
    kind: `mail.${email.kind}`,
    orderId: email.orderId,
    customerId: email.customerId,
    scenarioId: email.scenarioId,
    detail: { to: email.to, subject: email.subject, tokenId: email.tokenId },
  });
  return email;
}

function markRead(emailId) {
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      emails: store.tablePatch(prev.entities.emails, emailId, { read: true }),
    },
  }), `sim.mail.read:${emailId}`);
}

// Demo Inbox surfaces mail addressed to the *seated* resident in the selected
// role: the active GW (session.gwId) and the active customer
// (session.customerId). Two exceptions preserve the intake flow:
//   - Mail to any dynamic-origin customer is always shown in the customer
//     view. The magic-link / welcome mail that brings a new resident into the
//     village arrives BEFORE their session attaches; gating it on the active
//     session would hide intake mail until after login (chicken-and-egg).
//   - Mail with no addressee id (broadcast / system) is shown.
function listForRole(state, role) {
  const all = (state.entities.emails?.allIds || []).map(id => state.entities.emails.byId[id]).filter(Boolean);
  const session = state.session || {};
  const customers = state.entities.customers;
  return all
    .filter(e => {
      if (e.toRole !== role) return false;
      if (role === 'gw') return !e.gwId || e.gwId === session.gwId;
      if (role === 'customer') {
        if (!e.customerId) return true;
        if (e.customerId === session.customerId) return true;
        const c = customers?.byId?.[e.customerId];
        return c?.origin === 'dynamic';
      }
      return true;
    })
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

function clearForScenario(scenarioId) {
  if (!scenarioId) return;
  store.setState(prev => {
    const t = prev.entities.emails;
    const keepIds = t.allIds.filter(id => t.byId[id]?.scenarioId !== scenarioId);
    const byId = {};
    keepIds.forEach(id => { byId[id] = t.byId[id]; });
    return {
      ...prev,
      entities: { ...prev.entities, emails: { byId, allIds: keepIds } },
    };
  }, `sim.mail.clearScenario:${scenarioId}`);
}

// === Template helpers (Phase 1 covers intake/magic-link/admin notify) ===

function intakeAdminNotify({ orderId, customerId, customerName, subject, pages, scenarioId }) {
  return createEmail({
    to: 'berat@efactory1.de',
    toRole: 'admin',
    from: 'no-reply@efactory1.de',
    subject: `Neue Anfrage · ${customerName} (#${orderId})`,
    bodyMd: [
      `**Neue Anfrage** eingegangen.`,
      ``,
      `**Kunde:** ${customerName}`,
      `**Auftrag:** #${orderId}`,
      `**Thema:** ${subject || '—'}`,
      `**Seiten:** ${pages || '—'}`,
      ``,
      `Im Admin-Dashboard prüfen und Angebot vorbereiten.`,
    ].join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'intake_admin_notify',
    orderId,
    customerId,
    scenarioId,
  });
}

function magicLinkLogin({ orderId, customerId, customerEmail, customerName, tokenId, scenarioId }) {
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Ihr Zugang zu eFactory1 — Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `vielen Dank für Ihre Anfrage. Klicken Sie auf den Button unten, um sich anzumelden und Ihren Auftrag einzusehen.`,
      ``,
      `_Der Link ist 30 Minuten gültig und kann einmalig verwendet werden._`,
    ].join('\n'),
    cta: { label: 'Zum Dashboard anmelden', action: 'consume_token', tokenId, orderId, customerId },
    kind: 'magic_link_login',
    orderId,
    customerId,
    scenarioId,
    tokenId,
  });
}

function intakeWelcomeCustomer({ orderId, customerId, customerEmail, customerName, scenarioId }) {
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Wir haben Ihre Anfrage erhalten — Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `vielen Dank für Ihre Anfrage. Sie sind bereits in Ihrem Dashboard angemeldet.`,
      `Wir bereiten Ihr Angebot vor und melden uns kurzfristig.`,
    ].join('\n'),
    cta: { label: 'Dashboard öffnen', action: 'open_customer_dashboard', orderId, customerId },
    kind: 'intake_welcome',
    orderId,
    customerId,
    scenarioId,
  });
}

function offerSentCustomer({ orderId, customerId, customerEmail, customerName, offerNo, totalGross, pages, pageRate, discountPct, finalDeadline, scenarioId }) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  const totalLabel = totalGross != null ? money(totalGross) : null;
  const deadline = finalDeadline ? new Date(finalDeadline).toLocaleDateString('de-DE') : '—';
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Angebot ${offerNo || `#${orderId}`} · Ihre Arbeit bei eFactory1`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `vielen Dank für Ihre Anfrage. Anbei unser unverbindliches Angebot.`,
      ``,
      `**Angebot:** ${offerNo || '—'}`,
      `**Umfang:** ${pages != null ? `${pages} Seiten` : '—'}${pageRate != null ? ` · ${money(pageRate)}/Seite` : ''}${discountPct ? ` · ${discountPct}% Rabatt` : ''}`,
      totalLabel ? `**Gesamtbetrag:** ${totalLabel}` : null,
      `**Liefertermin:** ${deadline}`,
      ``,
      `Klicken Sie auf den Button unten, um das Angebot in Ihrem Dashboard zu prüfen und anzunehmen.`,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Angebot ansehen', action: 'open_customer_dashboard', orderId, customerId },
    kind: 'offer_sent',
    orderId,
    customerId,
    scenarioId,
  });
}

function offerKennenlernenCustomer({ orderId, customerId, customerEmail, customerName, scenarioId }) {
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Erstes Kennenlernen mit efactory1`,
    bodyMd: [
      `Liebe/r ${customerName || ''},`,
      ``,
      `vielen Dank für Deine Anfrage!`,
      ``,
      `Unser Angebot für die Arbeit hast Du gerade in einer separaten E-Mail erhalten. Gerne auch den Spam-Ordner kontrollieren.`,
      ``,
      `Zudem haben wir Dich jetzt für dein persönliches Dashboard freigeschaltet. Dort bekommst Du alle Antworten zu deiner Anfrage, zum Ablauf, zur Kommunikation und unseren Versprechen. Im Dashboard findest Du außerdem unseren Thesis-Crashkurs als PDF mit über 30 Seiten von der Forschungsfrage bis zur Abgabe.`,
      ``,
      `Um etwaige nächste Schritte mit Dir zu besprechen, freuen wir uns über ein Telefonat oder einen Video-Call. Optional kannst Du uns in unserem Büro in Köln besuchen.`,
      ``,
      `Mit freundlichen Grüßen,`,
      `Berat Özdemir, M.Sc.`,
      `Geschäftsführer`,
    ].join('\n'),
    cta: { label: 'Zum Dashboard', action: 'open_customer_dashboard', orderId, customerId },
    kind: 'offer_kennenlernen',
    orderId,
    customerId,
    scenarioId,
  });
}

function invoiceEmailCustomer({ orderId, customerId, customerEmail, customerName, invoiceNo, paymentMethod, amountDueNow, totalGross, checkoutSessionId, scenarioId }) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  const isBank = paymentMethod === 'bank_transfer_sepa';
  const cta = isBank
    ? { label: 'Überweisungsdaten ansehen', action: 'open_customer_dashboard', orderId, customerId }
    : { label: 'Jetzt bezahlen', action: 'open_stripe_checkout', sid: checkoutSessionId, orderId, customerId };
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Rechnung ${invoiceNo} · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `vielen Dank für Ihre Annahme. Anbei Ihre Rechnung.`,
      ``,
      `**Rechnungs-Nr.:** ${invoiceNo}`,
      `**Gesamtbetrag:** ${money(totalGross)}`,
      amountDueNow != null ? `**Heute fällig:** ${money(amountDueNow)}` : null,
      `**Zahlmethode:** ${paymentMethodLabel(paymentMethod)}`,
    ].filter(Boolean).join('\n'),
    cta,
    kind: 'invoice_email',
    orderId,
    customerId,
    scenarioId,
  });
}

function paymentFailedRetryCustomer({ orderId, customerId, customerEmail, customerName, invoiceNo, installmentN, amountDueNow, paymentMethod, checkoutSessionId, scenarioId }) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'noreply@stripe.com',
    subject: `Zahlung fehlgeschlagen · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `Ihre Zahlung für Auftrag #${orderId} konnte leider nicht abgeschlossen werden.`,
      ``,
      invoiceNo ? `**Rechnungs-Nr.:** ${invoiceNo}` : null,
      installmentN ? `**Rate:** ${installmentN}` : null,
      amountDueNow != null ? `**Offener Betrag:** ${money(amountDueNow)}` : null,
      paymentMethod ? `**Zahlmethode:** ${paymentMethodLabel(paymentMethod)}` : null,
      ``,
      `Bitte klicken Sie auf den Button unten, um die Zahlung erneut zu starten.`,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Erneut bezahlen', action: 'open_stripe_checkout', sid: checkoutSessionId, orderId, customerId },
    kind: 'payment_failed_retry',
    orderId,
    customerId,
    scenarioId,
  });
}

function paymentReceiptCustomer({ orderId, customerId, customerEmail, customerName, installmentN, amountPaid, fullyPaid, outstandingEur, scenarioId }) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'noreply@stripe.com',
    subject: fullyPaid
      ? `Zahlungsbestätigung · Auftrag #${orderId}`
      : `Rate ${installmentN} bestätigt · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      fullyPaid
        ? `Ihre Zahlung in Höhe von ${money(amountPaid)} wurde vollständig verbucht.`
        : `Rate ${installmentN} in Höhe von ${money(amountPaid)} wurde verbucht. Verbleibender Betrag: ${money(outstandingEur)}.`,
      ``,
      `Wir starten nun die Ghostwriter-Suche und melden uns kurzfristig.`,
    ].join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_customer_dashboard', orderId, customerId },
    kind: 'payment_receipt',
    orderId,
    customerId,
    scenarioId,
  });
}

function paymentMethodLabel(m) {
  return {
    stripe_card: 'Kreditkarte',
    stripe_klarna: 'Klarna (3 Raten)',
    stripe_paypal: 'PayPal',
    bank_transfer_sepa: 'Banküberweisung',
  }[m] || m;
}

function orderChatMentionAdminNotify({
  orderId,
  customerId,
  gwId,
  senderName,
  senderRole,
  bodyExcerpt,
  orderTitle,
}) {
  const roleLabel = senderRole === 'gw' ? 'Ghostwriter' : 'Customer';
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'notifications@efactory1.de',
    subject: `${senderName} mentioned you in order chat · #${orderId}`,
    bodyMd: [
      `**${senderName}** (${roleLabel}) mentioned you (@Berat) in the platform order chat.`,
      ``,
      `**Order:** #${orderId}${orderTitle ? ` · ${orderTitle}` : ''}`,
      bodyExcerpt ? `**Message:** ${bodyExcerpt}` : '',
      ``,
      `Open the order to reply in the communications tab.`,
    ].filter(line => line !== '').join('\n'),
    cta: { label: 'Open order chat', action: 'open_admin_order', orderId, tab: 'communications' },
    kind: 'order_chat_mention',
    orderId,
    customerId,
    gwId,
  });
}

function paymentReceivedAdminNotify({ orderId, customerId, customerName, installmentN, amountPaid, fullyPaid, outstandingEur, method, scenarioId }) {
  const amt = Number(amountPaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 });
  const outstanding = Number(outstandingEur || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 });
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@stripe.com',
    subject: `Zahlung eingegangen · Auftrag #${orderId} · ${amt} €`,
    bodyMd: [
      `Eine Zahlung wurde verbucht.`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Rate:** ${installmentN || 1}`,
      `**Betrag:** ${amt} €`,
      `**Zahlungsweg:** ${paymentMethodLabel(method)}`,
      fullyPaid ? `**Status:** Vollständig bezahlt — bereit für Fulfillment.` : `**Offen:** ${outstanding} €`,
    ].join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'payment_received_admin',
    orderId,
    customerId,
    scenarioId,
  });
}

function interimApprovedGwNotify({ orderId, gwId, gwEmail, gwName, customerName, finalDeadline, scenarioId }) {
  const dl = finalDeadline ? new Date(finalDeadline).toLocaleDateString('de-DE') : null;
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Zwischenstand freigegeben · Auftrag #${orderId} · weiter zur nächsten Phase`,
    bodyMd: [
      `Hallo ${gwName || ''},`,
      ``,
      `gute Nachricht: **${customerName || 'Der Kunde'}** hat Ihren Zwischenstand für Auftrag #${orderId} geprüft und **akzeptiert**.`,
      ``,
      `**Status:** Freigegeben — keine Überarbeitung angefordert.`,
      `**Nächster Schritt:** Sie können direkt mit der nächsten Phase fortfahren${dl ? ` (Endabgabe bis ${dl})` : ''}.`,
      ``,
      `Vielen Dank für Ihre Arbeit.`,
    ].join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_gw_assignment', orderId },
    kind: 'interim_approved_gw',
    orderId,
    customerId: null,
    gwId,
    scenarioId,
  });
}

function interimSubmittedCustomerNotify({ orderId, customerId, customerEmail, customerName, gwName, submissionId, submissionKind, fileName, scenarioId }) {
  const label = submissionKind === 'interim_2' ? 'Zwischenstand 2' : 'Zwischenstand 1';
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `${label} verfügbar · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `Ihr **${label}** für Auftrag #${orderId} wurde von ${gwName || 'Ihrem Ghostwriter'} hochgeladen und steht jetzt in Ihrem Dashboard zur Ansicht bereit.`,
      ``,
      fileName ? `**Datei:** ${fileName}` : null,
      ``,
      `Bitte prüfen Sie den Zwischenstand und geben Sie Ihr Feedback im Dashboard.`,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Zwischenstand ansehen', action: 'open_customer_dashboard', orderId, customerId, tab: 'files' },
    kind: 'interim_submitted_customer',
    orderId,
    customerId,
    scenarioId,
  });
}

function revisionRequestedGwNotify({ orderId, gwId, gwEmail, gwName, customerName, note, revisionRound, revisionTargetKind, scenarioId }) {
  const targetLabel = revisionTargetKind === 'final'
    ? 'Endabgabe'
    : revisionTargetKind === 'interim_2' ? 'Zwischenstand 2'
    : revisionTargetKind === 'interim_1' ? 'Zwischenstand 1'
    : 'Zwischenstand';
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Überarbeitung angefordert · Auftrag #${orderId} · Runde ${revisionRound || 1}`,
    bodyMd: [
      `Hallo ${gwName || ''},`,
      ``,
      `**${customerName || 'Der Kunde'}** hat zu Ihrer **${targetLabel}** für Auftrag #${orderId} eine Überarbeitung angefordert.`,
      ``,
      `**Runde:** ${revisionRound || 1} von 3`,
      `**Betrifft:** ${targetLabel}`,
      `**Status:** Überarbeitung erforderlich — Honorar bleibt bis zur Annahme blockiert.`,
      ``,
      note ? `**Feedback des Kunden:**` : null,
      note ? `> ${note}` : null,
      note ? `` : null,
      `Bitte öffnen Sie den Auftrag, prüfen Sie das Feedback und laden Sie die überarbeitete Version hoch.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_gw_assignment', orderId },
    kind: 'revision_requested_gw',
    orderId,
    customerId: null,
    gwId,
    scenarioId,
  });
}

function revisionRequestedAdminNotify({ orderId, customerId, customerName, gwId, gwName, note, revisionRound, revisionTargetKind, scenarioId }) {
  const targetLabel = revisionTargetKind === 'final'
    ? 'Final delivery'
    : revisionTargetKind === 'interim_2' ? 'Interim 2'
    : revisionTargetKind === 'interim_1' ? 'Interim 1'
    : 'Interim';
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Revision requested by customer · Order #${orderId} · Round ${revisionRound || 1}`,
    bodyMd: [
      `**${customerName || customerId || 'The customer'}** requested a revision on the **${targetLabel}** for order #${orderId}.`,
      ``,
      `**Round:** ${revisionRound || 1} of 3`,
      `**Target:** ${targetLabel}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId || '—'}\`)`,
      `**Payment:** blocked until the revision is accepted.`,
      ``,
      note ? `**Customer feedback:**` : null,
      note ? `> ${note}` : null,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open order', action: 'open_admin_order', orderId },
    kind: 'revision_requested_admin',
    orderId,
    customerId,
    gwId,
    scenarioId,
  });
}

function qaRevisionRequestedGwNotify({ orderId, submissionId, gwId, gwEmail, gwName, customerName, note, revisionRound, scenarioId }) {
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'qa@efactory1.de',
    subject: `QA Überarbeitung angefordert · Auftrag #${orderId} · Runde ${revisionRound || 1}`,
    bodyMd: [
      `Hallo ${gwName || ''},`,
      ``,
      `**efactory1 QA** hat Ihre Endabgabe für Auftrag #${orderId} (Kunde: ${customerName || '—'}) geprüft und Korrekturbedarf festgestellt.`,
      ``,
      `**Runde:** ${revisionRound || 1} von 3`,
      `**Status:** Überarbeitung erforderlich — Datei wird nicht an den Kunden weitergeleitet, bevor QA freigibt.`,
      ``,
      note ? `**QA-Feedback:**` : null,
      note ? `> ${note}` : null,
      note ? `` : null,
      `Bitte öffnen Sie den Auftrag, lesen Sie das QA-Feedback und laden Sie die überarbeitete Version hoch.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_gw_assignment', orderId },
    kind: 'qa_revision_requested_gw',
    orderId,
    submissionId,
    customerId: null,
    gwId,
    scenarioId,
  });
}

function qaRevisionRequestedAdminNotify({ orderId, submissionId, customerId, customerName, gwId, gwName, note, revisionRound, scenarioId }) {
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'qa@efactory1.de',
    subject: `QA requested revision · Order #${orderId} · Round ${revisionRound || 1}`,
    bodyMd: [
      `**efactory1 QA** requested a revision on the final delivery for order #${orderId}.`,
      ``,
      `**Round:** ${revisionRound || 1} of 3`,
      `**Customer:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId || '—'}\`)`,
      `**Payment:** blocked until the revised final passes QA and is accepted by the customer.`,
      ``,
      note ? `**QA feedback:**` : null,
      note ? `> ${note}` : null,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open order', action: 'open_admin_order', orderId },
    kind: 'qa_revision_requested_admin',
    orderId,
    submissionId,
    customerId,
    gwId,
    scenarioId,
  });
}

// QA → GW clarification (audit A-19). NOT a rejection: QA needs an answer before
// signing off, the work stays in review. GW-scoped (never the customer). CTA
// opens the GW assignment.
function qaClarificationGwNotify({ orderId, submissionId, gwId, gwEmail, gwName, note, scenarioId }) {
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'qa@efactory1.de',
    subject: `Clarification needed before QA sign-off · Order #${orderId}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `Our QA reviewer needs a quick clarification on your submission for order #${orderId} before the review can be completed. Your work is **not** rejected — we just need an answer to proceed.`,
      ``,
      note ? `**QA's question:**` : null,
      note ? `> ${note}` : null,
      ``,
      `Please reply with the clarification (or re-upload if you decide a change is warranted).`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'qa_clarification_gw',
    orderId,
    submissionId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

function disputeOpenedAdminNotify({ orderId, disputeId, openedBy, customerId, customerName, gwId, gwName, reasonCategory, reason, scenarioId }) {
  const openerLabel = openedBy === 'gw' ? `${gwName || 'The ghostwriter'} (GW)` : `${customerName || 'The customer'} (customer)`;
  const categoryLabel = (reasonCategory || 'other').replace(/_/g, ' ');
  const snippet = (reason || '').length > 280 ? reason.slice(0, 280) + '…' : (reason || '');
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `🚨 Dispute opened · Order #${orderId} · ${categoryLabel}`,
    bodyMd: [
      `**${openerLabel}** escalated order #${orderId}.`,
      ``,
      `**Category:** ${categoryLabel}`,
      `**Customer:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId || '—'}\`)`,
      `**Platform chat:** PAUSED — customer + GW cannot post until you resolve.`,
      `**Payment:** blocked from Friday release.`,
      ``,
      `**Reason:**`,
      `> ${snippet}`,
      ``,
      `Open the dispute panel to mediate — you can email or WhatsApp either party with one click from there.`,
    ].join('\n'),
    cta: { label: 'View dispute', action: 'open_admin_dispute', orderId, disputeId },
    kind: 'dispute_opened_admin',
    orderId,
    customerId,
    gwId,
    scenarioId,
  });
}

function disputeOpenedCounterpartyNotify({ orderId, disputeId, openedBy, counterparty, recipientEmail, recipientName, recipientEntityId, reasonCategory, scenarioId }) {
  const isGw = counterparty === 'gw';
  return createEmail({
    to: recipientEmail,
    toRole: counterparty,
    from: 'kundenservice@efactory1.de',
    subject: isGw
      ? `Dispute opened by customer · Order #${orderId}`
      : `Streitfall eröffnet · Auftrag #${orderId}`,
    bodyMd: isGw
      ? [
          `Hi ${recipientName || ''},`,
          ``,
          `The customer escalated order #${orderId} (category: ${(reasonCategory || 'other').replace(/_/g, ' ')}).`,
          ``,
          `**Platform chat is paused** until efactory1 mediates and resolves the dispute. Please don't contact the customer directly until you hear from us.`,
          ``,
          `If you have additional context, reply to this email and Berat will read it before deciding.`,
        ].join('\n')
      : [
          `Hallo ${recipientName || ''},`,
          ``,
          `Ihr Ghostwriter hat einen Streitfall zu Auftrag #${orderId} eröffnet.`,
          ``,
          `**Der Plattform-Chat ist pausiert**, während efactory1 prüft. Wir melden uns kurzfristig zur Klärung.`,
          ``,
          `Falls Sie zusätzlichen Kontext haben, antworten Sie gerne auf diese E-Mail.`,
        ].join('\n'),
    cta: isGw
      ? { label: 'Open order', action: 'open_gw_assignment', orderId }
      : { label: 'Auftrag öffnen', action: 'open_customer_order', orderId },
    kind: 'dispute_opened_counterparty',
    orderId,
    // Demo Inbox filters by entity id (session.customerId / session.gwId),
    // not by email address, so these MUST be the entity ids — otherwise
    // listForRole hides the mail.
    customerId: counterparty === 'customer' ? recipientEntityId : null,
    gwId: counterparty === 'gw' ? recipientEntityId : null,
    scenarioId,
  });
}

function disputeResolvedCustomerNotify({ orderId, disputeId, outcome, outcomeNote, customerEmail, customerName, customerId, scenarioId }) {
  const outcomeLabel = {
    continue_revision: 'Bearbeitung läuft weiter',
    reassign_gw: 'Wir weisen Ihnen einen neuen Ghostwriter zu',
    cancel_refund: 'Auftrag storniert · Erstattung in Bearbeitung',
    scope_amendment: 'Umfang angepasst · Bearbeitung läuft weiter',
  }[outcome] || 'Streitfall gelöst';
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Streitfall gelöst · Auftrag #${orderId} · ${outcomeLabel}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `Wir haben den Streitfall zu Auftrag #${orderId} geprüft und entschieden:`,
      ``,
      `**Ergebnis:** ${outcomeLabel}`,
      ``,
      outcomeNote ? `**Hinweis von efactory1:**` : null,
      outcomeNote ? `> ${outcomeNote}` : null,
      outcomeNote ? `` : null,
      outcome === 'continue_revision' ? `Der Plattform-Chat ist wieder freigegeben. Ihr Ghostwriter arbeitet an Ihrer Überarbeitung weiter.` : null,
      outcome === 'cancel_refund' ? `Die Erstattung wird über Sevdesk angestoßen — Sie erhalten eine separate Bestätigung.` : null,
      outcome === 'reassign_gw' ? `Wir suchen kurzfristig einen neuen Ghostwriter und melden uns mit der Zuweisung.` : null,
      outcome === 'scope_amendment' ? `Bitte geben Sie die vorgeschlagene Umfangsanpassung in Ihrem Auftrag frei und begleichen Sie ggf. die Erweiterungsrechnung — erst danach wird der neue Umfang (Seiten, Frist, Preis) aktiv.` : null,
    ].filter(v => v !== null).join('\n'),
    // A scope amendment parks the order in extension_customer_approval_pending —
    // the approve/pay panel lives on the customer order's STATUS tab, so route
    // there. Other outcomes deep-link to files (delivery/refund evidence).
    cta: {
      label: outcome === 'scope_amendment' ? 'Anpassung freigeben' : 'Auftrag öffnen',
      action: 'open_customer_order', orderId,
      tab: outcome === 'scope_amendment' ? 'status' : 'files',
    },
    kind: 'dispute_resolved_customer',
    orderId,
    // Scope to the affected customer so the demo inbox doesn't broadcast this
    // resolution mail to every customer persona. listForRole filters on
    // session.customerId === mail.customerId; null means "broadcast".
    customerId: customerId || null,
    scenarioId,
  });
}

function disputeResolvedGwNotify({ orderId, disputeId, outcome, outcomeNote, gwEmail, gwName, gwId, scenarioId }) {
  const outcomeLabel = {
    continue_revision: 'Continue revision',
    reassign_gw: 'Order reassigned to another GW',
    cancel_refund: 'Order cancelled',
    scope_amendment: 'Scope amended · keep working',
  }[outcome] || 'Dispute resolved';
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Dispute resolved · Order #${orderId} · ${outcomeLabel}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `efactory1 reviewed the dispute on order #${orderId}.`,
      ``,
      `**Outcome:** ${outcomeLabel}`,
      ``,
      outcomeNote ? `**efactory1 note:**` : null,
      outcomeNote ? `> ${outcomeNote}` : null,
      outcomeNote ? `` : null,
      outcome === 'continue_revision' ? `Platform chat is unlocked. Please continue with the revision as originally requested.` : null,
      outcome === 'reassign_gw' ? `This assignment has been ended. Honorarium does not apply (Werkvertrag). Other orders are unaffected.` : null,
      outcome === 'cancel_refund' ? `The order was cancelled. No honorarium for unfinished work (Werkvertrag).` : null,
      outcome === 'scope_amendment' ? `A scope amendment was proposed. Do not start the extra work yet — it applies only once the customer approves and pays the extension invoice.` : null,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open order', action: 'open_gw_assignment', orderId },
    kind: 'dispute_resolved_gw',
    orderId,
    // Scope to the affected GW. Reassignment is the critical case: by the time
    // this mail goes out, order.gwId is null, so we rely on the explicit gwId
    // passed in from the resolved-event payload (originalGwId captured in
    // resolveDispute before side effects).
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// ---------------------------------------------------------------------------
// Extension / scope-amendment customer-approval flow (audit A-03).
// The core gate parks the order in extension_customer_approval_pending and
// pings the in-app bell. These builders give the same milestones a Demo Inbox
// email with a CTA that deep-links to the customer order STATUS tab, where the
// CustExtensionApproval approve/pay/decline panel lives. Without them the
// customer would have to notice a bell to act on a scope change they must
// approve and pay — every other customer-money milestone arrives by email.
// ---------------------------------------------------------------------------

// Customer raised a scope extension (D-31). The in-app bells fire in
// core/actions.customerRequestExtension; these add the Demo Inbox emails so the
// admin + GW also get an inbox trail (every other order milestone arrives by
// email, not just an in-app bell). The customer is the actor here, so they get
// no email — they'll receive extensionApprovalRequestCustomer once admin prices
// it and sends it back for approval.
function extensionRequestedAdminNotify({ orderId, initiatedBy, customerId, customerName, gwId, gwName, description, extraPages, extraFee, scenarioId }) {
  const byGw = initiatedBy === 'gw';
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  const requester = byGw ? (gwName || 'Der Ghostwriter') : (customerName || customerId || 'Der Kunde');
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: byGw
      ? `Erweiterung vom Ghostwriter angefragt · Auftrag #${orderId}`
      : `Erweiterung vom Kunden angefragt · Auftrag #${orderId}`,
    bodyMd: [
      `**${requester}** hat zusätzliche Arbeit für Auftrag #${orderId} angefragt.`,
      ``,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId || '—'}\`)`,
      extraPages ? `**Geschätzte Mehrseiten:** +${extraPages}` : null,
      (byGw && Number(extraFee) > 0) ? `**Vom GW geschätztes Honorar:** ${money(extraFee)} (Sie legen den finalen Preis mit dem Kunden fest)` : null,
      ``,
      description ? `**Beschreibung:**` : null,
      description ? `> ${description}` : null,
      description ? `` : null,
      `Bitte Umfang prüfen, den Preis mit dem Kunden festlegen und zur Freigabe senden. Der Ghostwriter startet erst nach Freigabe + Zahlung mit der Mehrleistung.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'extension_requested_admin',
    orderId,
    customerId: customerId || null,
    gwId: gwId || null,
    scenarioId,
  });
}

function extensionRequestedGwNotify({ orderId, gwId, gwEmail, gwName, customerName, description, extraPages, scenarioId }) {
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Customer requested more work · Order #${orderId}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `**${customerName || 'the customer'}** asked for additional work on order #${orderId}.`,
      ``,
      extraPages ? `**Estimated extra pages:** +${extraPages}` : null,
      description ? `**Customer's request:**` : null,
      description ? `> ${description}` : null,
      description ? `` : null,
      `efactory1 will confirm the scope, effort and price with you — **do not start the extra work yet**. You'll get a green light once the customer approves and pays the extension.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'extension_requested_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Admin rejected an extension request before it reached the customer
// (rejectExtension). GW parity for the in-app "extension declined" bell — note
// this is the ADMIN rejecting the request, distinct from extensionDeclinedGw
// (the CUSTOMER declining an already-staged scope change).
function extensionRejectedGwNotify({ orderId, gwId, gwEmail, gwName, reason, scenarioId }) {
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Extension request declined · Order #${orderId}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `efactory1 reviewed the extension request on order #${orderId} and decided not to proceed.`,
      reason ? `` : null,
      reason ? `**Reason:** ${reason}` : null,
      reason ? `` : null,
      `Please continue with the original scope, page count and deadline.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'extension_rejected_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Admin staged the scope change (approveExtension) → it now waits on the
// customer to approve + pay. GW parity for the in-app "do not start yet" bell.
function extensionApprovalPendingGwNotify({ orderId, gwId, gwEmail, gwName, extraPages, extraFee, newDeadline, scenarioId }) {
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Extension approved by efactory1 — awaiting customer · Order #${orderId}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `efactory1 reviewed the scope extension on order #${orderId} and sent it to the customer for approval.`,
      ``,
      extraPages ? `**Extra pages:** +${extraPages}` : null,
      ddl ? `**Proposed new deadline:** ${ddl}` : null,
      ``,
      `**Do not start the extra work yet** — it applies only once the customer approves${Number(extraFee) > 0 ? ' and pays the extension invoice' : ''}. You'll get a green light then.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'extension_pending_customer_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Customer approved a fee-bearing extension → invoice issued (customerApproveExtension).
// Admin parity for the in-app "invoice issued" bell (customer gets extensionInvoiceCustomer).
function extensionInvoiceAdminNotify({ orderId, customerId, customerName, invoiceNo, extraFee, scenarioId }) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Erweiterung vom Kunden freigegeben · Auftrag #${orderId}`,
    bodyMd: [
      `**${customerName || customerId || 'Der Kunde'}** hat die Umfangserweiterung für Auftrag #${orderId} freigegeben.`,
      ``,
      invoiceNo ? `**Erweiterungsrechnung:** ${invoiceNo}` : null,
      `**Betrag:** ${money(extraFee)}`,
      ``,
      `Der erweiterte Umfang wird aktiv, sobald die Zahlung eingegangen ist — dann darf der Ghostwriter mit der Mehrleistung starten.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'extension_invoice_admin',
    orderId,
    customerId: customerId || null,
    scenarioId,
  });
}

// Scope change is live (applyExtensionScope). Admin parity for the in-app
// "extension applied" bell (customer + GW get their own confirmations). Fires
// for both the dedicated extension path and the dispute scope-amendment path.
function extensionAppliedAdminNotify({ orderId, customerId, customerName, gwId, gwName, source, extraPages, extraFee, newDeadline, scenarioId }) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  const srcLabel = source === 'dispute_scope_amendment' ? 'Streitfall-Anpassung' : 'Umfangserweiterung';
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `${srcLabel} aktiv · Auftrag #${orderId}`,
    bodyMd: [
      `Die ${srcLabel} für Auftrag #${orderId} ist jetzt aktiv — der Auftrag läuft weiter.`,
      ``,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId || '—'}\`)`,
      extraPages ? `**Zusätzliche Seiten:** +${extraPages}` : null,
      Number(extraFee) > 0 ? `**Mehrkosten:** ${money(extraFee)}` : null,
      ddl ? `**Neuer Liefertermin:** ${ddl}` : null,
      ``,
      `**Status:** Aktiv — keine Aktion nötig.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'extension_applied_admin',
    orderId,
    customerId: customerId || null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Customer declined the staged scope change (declineExtension). Admin parity for
// the in-app "declined by customer" bell (the GW gets extensionDeclinedGw).
function extensionDeclinedAdminNotify({ orderId, customerId, customerName, gwId, gwName, reason, scenarioId }) {
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Erweiterung vom Kunden abgelehnt · Auftrag #${orderId}`,
    bodyMd: [
      `**${customerName || customerId || 'Der Kunde'}** hat die vorgeschlagene Umfangsanpassung für Auftrag #${orderId} abgelehnt.`,
      ``,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId || '—'}\`)`,
      ``,
      reason ? `**Begründung:** ${reason}` : null,
      reason ? `` : null,
      `Eine etwaige Erweiterungsrechnung wurde storniert. Ursprünglicher Umfang, Preis und Liefertermin bleiben unverändert.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'extension_declined_admin',
    orderId,
    customerId: customerId || null,
    gwId: gwId || null,
    scenarioId,
  });
}

function extensionScopeLines(extraPages, extraFee, newDeadline) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  return [
    extraPages > 0 ? `**Zusätzliche Seiten:** +${extraPages}` : null,
    `**Mehrkosten:** ${extraFee > 0 ? money(extraFee) : 'keine'}`,
    ddl ? `**Neuer Liefertermin:** ${ddl}` : null,
  ].filter(Boolean);
}

// Admin approved a scope change — customer must approve (and pay any fee) before
// pages/price/deadline move. Reused for the dedicated extension path; the
// dispute scope-amendment path is covered by disputeResolvedCustomerNotify.
function extensionApprovalRequestCustomer({ orderId, customerId, customerEmail, customerName, source, extraPages, extraFee, newDeadline, description, scenarioId }) {
  const fee = Number(extraFee) || 0;
  const fromDispute = source === 'dispute_scope_amendment';
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Umfangserweiterung — Ihre Freigabe nötig · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      fromDispute
        ? `im Rahmen der Streitfall-Lösung schlägt efactory1 eine Umfangsanpassung für Auftrag #${orderId} vor:`
        : `efactory1 schlägt eine Umfangserweiterung für Auftrag #${orderId} vor:`,
      ``,
      ...extensionScopeLines(extraPages, fee, newDeadline),
      description ? `` : null,
      description ? `> ${description}` : null,
      ``,
      `Wichtig: Umfang, Preis und Liefertermin bleiben unverändert, bis Sie zustimmen${fee > 0 ? ' und die Erweiterungsrechnung bezahlen' : ''}. Ihr Ghostwriter beginnt erst danach mit der Mehrleistung.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: fee > 0 ? 'Prüfen & freigeben' : 'Erweiterung freigeben', action: 'open_customer_order', orderId, tab: 'status', customerId },
    kind: 'extension_approval_request',
    orderId,
    customerId: customerId || null,
    scenarioId,
  });
}

// Customer approved a fee-bearing scope change — the extension invoice (a new
// installment) was issued. Pay to activate the extended scope.
function extensionInvoiceCustomer({ orderId, customerId, customerEmail, customerName, invoiceNo, extraFee, scenarioId }) {
  const money = (n) => `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Erweiterungsrechnung ${invoiceNo || ''} · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `vielen Dank für Ihre Freigabe. Für die vereinbarte Umfangserweiterung zu Auftrag #${orderId} haben wir folgende Rechnung erstellt:`,
      ``,
      invoiceNo ? `**Rechnungs-Nr.:** ${invoiceNo}` : null,
      `**Betrag:** ${money(extraFee)}`,
      ``,
      `Sobald die Zahlung eingegangen ist, wird der erweiterte Umfang aktiv und Ihr Ghostwriter setzt die Mehrleistung um.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Erweiterungsrechnung bezahlen', action: 'open_customer_order', orderId, tab: 'status', customerId },
    kind: 'extension_invoice',
    orderId,
    customerId: customerId || null,
    scenarioId,
  });
}

// Scope change is live — customer confirmation.
function extensionAppliedCustomer({ orderId, customerId, customerEmail, customerName, extraPages, extraFee, newDeadline, scenarioId }) {
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Erweiterung bestätigt · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `der erweiterte Umfang für Auftrag #${orderId} ist jetzt aktiv.`,
      ``,
      ...extensionScopeLines(Number(extraPages) || 0, Number(extraFee) || 0, newDeadline),
      ``,
      ddl ? `Ihr Ghostwriter arbeitet bis zum neuen Liefertermin ${ddl} an Ihrem Auftrag weiter.` : `Ihr Ghostwriter setzt die Mehrleistung nun um.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_customer_order', orderId, tab: 'status', customerId },
    kind: 'extension_applied_customer',
    orderId,
    customerId: customerId || null,
    scenarioId,
  });
}

// Scope change is live — GW may now start the extra work.
function extensionAppliedGw({ orderId, gwId, gwEmail, gwName, extraPages, newDeadline, scenarioId }) {
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Scope change confirmed · Order #${orderId} — you may proceed`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `the customer approved${extraPages > 0 ? ` and the +${extraPages} page` : ''} scope change on order #${orderId}, and any extension invoice is paid.`,
      ``,
      ddl ? `**New deadline:** ${ddl}` : null,
      ``,
      `You may now start the additional work.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'extension_applied_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Customer declined the staged scope change — GW continues with original scope.
function extensionDeclinedGw({ orderId, gwId, gwEmail, gwName, reason, scenarioId }) {
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Scope change declined · Order #${orderId}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `the customer declined the proposed scope change on order #${orderId}. Please continue with the original scope, deadline and page count.`,
      reason ? `` : null,
      reason ? `**Customer note:** ${reason}` : null,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'extension_declined_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// GW proposed a new deadline (delay). Customer CTA to review & approve/reject.
// Platform-initiated (not a GW-authored email); the new date applies only on
// customer approval (G-05 / SOP B).
const DELAY_REASON_LABELS = {
  illness: 'Krankheit',
  emergency: 'Notfall',
  scope: 'Rückfrage zum Umfang',
  other: 'Sonstiges',
};
function delayApprovalRequestCustomer({ orderId, customerId, customerEmail, customerName, reasonKind, reasonNote, newDate, proposedBy, scenarioId }) {
  const reasonLabel = DELAY_REASON_LABELS[reasonKind] || reasonKind || 'Sonstiges';
  // proposedBy === 'admin' → this is an admin counter-proposal after the customer
  // rejected the GW's date; otherwise it's the GW's original delay report.
  const fromAdmin = proposedBy === 'admin';
  const lead = fromAdmin
    ? `efactory1 hat die Situation geprüft und schlägt für Auftrag #${orderId} einen neuen Liefertermin vor:`
    : `Ihr Ghostwriter muss den Liefertermin für Auftrag #${orderId} anpassen und schlägt einen neuen Termin vor:`;
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: fromAdmin
      ? `Neuer Terminvorschlag — Ihre Freigabe nötig · Auftrag #${orderId}`
      : `Neuer Liefertermin — Ihre Freigabe nötig · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      lead,
      ``,
      fromAdmin ? null : `• Grund: ${reasonLabel}`,
      (!fromAdmin && reasonNote) ? `• Details: ${reasonNote}` : null,
      newDate ? `• Neuer Liefertermin: ${newDate}` : null,
      ``,
      `Bitte prüfen Sie den Vorschlag und geben Sie ihn frei oder lehnen Sie ihn ab. Der neue Termin gilt erst, wenn Sie zustimmen.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Termin prüfen & freigeben', action: 'open_customer_order', orderId, tab: 'status', customerId },
    kind: 'delay_approval_request',
    orderId,
    customerId: customerId || null,
    scenarioId,
  });
}

// Customer approved the new deadline — GW may resume.
function delayAcceptedGw({ orderId, gwId, gwEmail, gwName, newDeadline, scenarioId }) {
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `New deadline confirmed · Order #${orderId} — resume work`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `the customer approved the new deadline on order #${orderId}${ddl ? ` (**${ddl}**)` : ''}. You may resume work.`,
      ``,
      `Per SOP B, tell the customer and efactory1 in the order chat once you're back on track.`,
    ].join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'delay_accepted_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// GW reported a delay (proposed a new deadline). Admin parity email → lands in
// the Demo Inbox (toRole 'admin'). Informational: the happy path is still the
// CUSTOMER's approval (G-05); the admin monitors, can counter-propose or step
// in. Mirrors the customer CTA above so both sides have an inbox trail.
function delayReportedAdmin({ orderId, customerId, customerName, gwId, gwName, reasonKind, reasonNote, newDate, scenarioId }) {
  const reasonLabel = DELAY_REASON_LABELS[reasonKind] || reasonKind || 'Sonstiges';
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Verzögerung gemeldet · Auftrag #${orderId} · Kundenfreigabe ausstehend`,
    bodyMd: [
      `${gwName || gwId || 'Ein Ghostwriter'} hat eine **Verzögerung** gemeldet und einen neuen Liefertermin vorgeschlagen. Der Kunde wurde um Freigabe gebeten — der neue Termin gilt erst nach dessen Zustimmung (G-05).`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId}\`)`,
      `**Grund:** ${reasonLabel}`,
      reasonNote ? `**Details:** ${reasonNote}` : null,
      newDate ? `**Vorgeschlagener neuer Termin:** ${newDate}` : null,
      ``,
      `**Status:** Wartet auf Kundenfreigabe. Sie können den Vorgang beobachten, einen Gegenvorschlag senden oder eingreifen.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'delay_reported_admin',
    orderId,
    customerId: customerId || null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Customer APPROVED the new deadline → admin parity email (Demo Inbox trail).
// Pairs with delayAcceptedGw; both fire when the customer approves (G-05).
function delayAcceptedAdmin({ orderId, customerId, customerName, gwId, gwName, newDeadline, scenarioId }) {
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Verzögerung bestätigt · Auftrag #${orderId} · neuer Termin steht`,
    bodyMd: [
      `Der Kunde hat den vorgeschlagenen neuen Liefertermin **freigegeben**. Der Auftrag läuft weiter.`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId}\`)`,
      ddl ? `**Neuer Liefertermin:** ${ddl}` : null,
      ``,
      `**Status:** Aktiv — keine Aktion nötig.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'delay_accepted_admin',
    orderId,
    customerId: customerId || null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Admin OVERRODE / confirmed the new deadline (acceptDelay) → tell the customer.
// (On a customer-driven approval the customer is the actor and gets no email.)
function delayAcceptedCustomer({ orderId, customerId, customerEmail, customerName, newDeadline, scenarioId }) {
  const ddl = newDeadline ? String(newDeadline).slice(0, 10) : null;
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Liefertermin bestätigt · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `efactory1 hat den neuen Liefertermin für Auftrag #${orderId} bestätigt${ddl ? ` (**${ddl}**)` : ''}. Ihr Ghostwriter arbeitet weiter.`,
      ``,
      `Bei Fragen sind wir jederzeit für Sie da.`,
    ].join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_customer_order', orderId, tab: 'status', customerId },
    kind: 'delay_accepted_customer',
    orderId,
    customerId: customerId || null,
    scenarioId,
  });
}

// Customer REJECTED the new deadline → GW informed to hold for mediation.
function delayRejectedGw({ orderId, gwId, gwEmail, gwName, reason, scenarioId }) {
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Customer declined the new deadline · Order #${orderId}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `the customer declined the new delivery date you proposed on order #${orderId}.`,
      reason ? `\n> ${reason}\n` : null,
      `efactory1 will mediate — please hold for instructions before continuing.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'delay_rejected_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Customer REJECTED the new deadline → admin parity email (Demo Inbox), mediation
// needed. Carries the customer's reason so the admin can choose counter / reassign
// / cancel without chasing it down.
function delayRejectedAdmin({ orderId, customerId, customerName, gwId, gwName, reason, scenarioId }) {
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Verzögerung abgelehnt · Auftrag #${orderId} · Mediation nötig`,
    bodyMd: [
      `Der Kunde hat den vorgeschlagenen neuen Liefertermin **abgelehnt**. Bitte vermitteln Sie: Gegenvorschlag senden, neu zuweisen oder stornieren.`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId}\`)`,
      reason ? `**Begründung des Kunden:** ${reason}` : null,
      ``,
      `**Status:** Wartet auf Ihre Entscheidung.`,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'delay_rejected_admin',
    orderId,
    customerId: customerId || null,
    gwId: gwId || null,
    scenarioId,
  });
}

// Admin sent the customer a COUNTER-proposal (proposeNewDelay) → GW informed to
// hold until the customer approves. (The customer gets delayApprovalRequestCustomer
// with proposedBy='admin'.)
function delayCounterGw({ orderId, gwId, gwEmail, gwName, newDate, scenarioId }) {
  const ddl = newDate ? String(newDate).slice(0, 10) : null;
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `efactory1 proposed a new deadline to the customer · Order #${orderId}`,
    bodyMd: [
      `Hi ${gwName || ''},`,
      ``,
      `efactory1 has sent the customer a new proposed delivery date${ddl ? ` (**${ddl}**)` : ''} on order #${orderId} for approval.`,
      ``,
      `Please hold until the customer approves — we'll let you know once it's confirmed.`,
    ].join('\n'),
    cta: { label: 'Open assignment', action: 'open_gw_assignment', orderId },
    kind: 'delay_counter_gw',
    orderId,
    customerId: null,
    gwId: gwId || null,
    scenarioId,
  });
}

function interimSubmittedAdminNotify({ orderId, customerId, customerName, gwId, gwName, submissionId, submissionKind, fileName, scenarioId }) {
  const label = submissionKind === 'interim_2' ? 'Zwischenstand 2' : 'Zwischenstand 1';
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `${label} eingereicht · Auftrag #${orderId} · an Kunde weitergeleitet`,
    bodyMd: [
      `${gwName || gwId || 'Ein Ghostwriter'} hat den **${label}** hochgeladen. Die Datei wurde automatisch an den Kunden weitergeleitet (keine QA-Prüfung bei Zwischenständen).`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId}\`)`,
      fileName ? `**Datei:** ${fileName}` : null,
      `**Status:** Wartet auf Kundenfeedback.`,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Submissions öffnen', action: 'open_admin_order', orderId, tab: 'submissions', submissionId },
    kind: 'interim_submitted_admin',
    orderId,
    customerId,
    gwId,
    scenarioId,
  });
}

function finalSubmittedAdminNotify({ orderId, customerId, customerName, gwId, gwName, submissionId, submissionKind, fileName, scenarioId }) {
  const isRevision = submissionKind === 'revision';
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `${isRevision ? 'Überarbeitung' : 'Endabgabe'} eingereicht · Auftrag #${orderId} · QA prüft`,
    bodyMd: [
      `${gwName || gwId || 'Ein Ghostwriter'} hat die ${isRevision ? 'Überarbeitung' : 'Endabgabe'} hochgeladen.`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId}\`)`,
      fileName ? `**Datei:** ${fileName}` : null,
      `**Status:** In der QA-Prüfung — bitte gegenprüfen, bevor die Endabgabe an den Kunden freigegeben wird.`,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Submissions öffnen', action: 'open_admin_order', orderId, tab: 'submissions', submissionId },
    kind: 'final_submitted_admin',
    orderId,
    customerId,
    gwId,
    scenarioId,
  });
}

function finalAcceptedAdminNotify({ orderId, customerId, customerName, gwId, gwName, scenarioId }) {
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Endabgabe akzeptiert · Auftrag #${orderId} · bereit für Friday-Batch`,
    bodyMd: [
      `${customerName || customerId || 'Der Kunde'} hat die Endabgabe für Auftrag #${orderId} **akzeptiert**.`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      gwName || gwId ? `**Ghostwriter:** ${gwName || '—'}${gwId ? ` (\`${gwId}\`)` : ''}` : null,
      `**Status:** Auftrag in \`payment_pending\` — Honorar wartet auf den nächsten Friday-Batch (Release-Gate jetzt vom GW-Rechnungs- und Ratenstatus getrieben).`,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_admin_order', orderId },
    kind: 'final_accepted_admin',
    orderId,
    customerId,
    gwId,
    scenarioId,
  });
}

function finalReleasedCustomerNotify({ orderId, customerId, customerEmail, customerName, gwName, submissionId, submissionKind, fileName, scenarioId }) {
  const isRevision = submissionKind === 'revision';
  const label = isRevision ? 'Überarbeitete Endabgabe' : 'Endabgabe';
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `${label} freigegeben · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `Ihre **${label}** für Auftrag #${orderId} hat die Qualitätsprüfung bestanden und steht jetzt in Ihrem Dashboard zur Verfügung.`,
      ``,
      fileName ? `**Datei:** ${fileName}` : null,
      gwName ? `**Ghostwriter:** ${gwName}` : null,
      ``,
      `Bitte prüfen Sie das Dokument und melden Sie sich bei Rückfragen über Ihr Dashboard.`,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Endabgabe ansehen', action: 'open_customer_dashboard', orderId, customerId, tab: 'files' },
    kind: 'final_released_customer',
    orderId,
    customerId,
    scenarioId,
  });
}

function gwApplicationAdminNotify({ orderId, customerId, customerName, gwId, gwName, applicationId, pitch, scenarioId }) {
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Neue Bewerbung · Auftrag #${orderId} · ${gwName || gwId}`,
    bodyMd: [
      `Ein Ghostwriter hat sich für einen Job auf dem Board beworben.`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Kunde:** ${customerName || customerId || '—'}`,
      `**Ghostwriter:** ${gwName || '—'} (\`${gwId}\`)`,
      `**Bewerbungs-ID:** ${applicationId || '—'}`,
      pitch ? `\n**Pitch:**\n${pitch}` : null,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Bewerbungen prüfen', action: 'open_admin_order', orderId, tab: 'assignment' },
    kind: 'gw_application_admin',
    orderId,
    customerId,
    gwId,
    scenarioId,
  });
}

function gwJobAvailableToGw({ orderId, gwId, gwEmail, gwName, title, field, pages, finalDeadline, fee, scenarioId }) {
  const dl = finalDeadline ? new Date(finalDeadline).toLocaleDateString('de-DE') : '—';
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Neuer Auftrag verfügbar · #${orderId} · ${field || 'Allgemein'}`,
    bodyMd: [
      `Hallo ${gwName || ''},`,
      ``,
      `ein neuer Auftrag passt zu Ihrem Profil:`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Thema:** ${title || '—'}`,
      `**Fach:** ${field || '—'}`,
      `**Seiten:** ${pages != null ? pages : '—'}`,
      `**Liefertermin:** ${dl}`,
      fee != null ? `**Honorar (Schätzung):** ${Number(fee).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €` : null,
    ].filter(Boolean).join('\n'),
    cta: { label: 'Auftrag auf dem Job Board ansehen', action: 'open_gw_job_board', orderId },
    kind: 'gw_job_available',
    orderId,
    customerId: null,
    gwId,
    scenarioId,
  });
}

function gwAssignedToGw({ orderId, gwId, gwEmail, gwName, customerName, title, finalDeadline, scenarioId }) {
  const dl = finalDeadline ? new Date(finalDeadline).toLocaleDateString('de-DE') : '—';
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Sie wurden zugewiesen · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${gwName || ''},`,
      ``,
      `Sie wurden für folgenden Auftrag freigegeben. Bitte erste Kontaktaufnahme heute.`,
      ``,
      `**Auftrag:** #${orderId}`,
      `**Thema:** ${title || '—'}`,
      `**Kunde:** ${customerName || '—'}`,
      `**Liefertermin:** ${dl}`,
    ].join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_gw_assignment', orderId },
    kind: 'gw_assigned_gw',
    orderId,
    customerId: null,
    gwId,
    scenarioId,
  });
}

// CTA-only onboarding ping (D-28). NOT a GW-authored email: no GW body, not
// `from` the GW, no customer-visible GW address. The actual introduction lives
// in the order chat; this email only tells the customer a new message is
// waiting and deep-links them into the platform.
function firstContactCtaCustomer({ orderId, customerId, customerEmail, customerName, gwName, scenarioId }) {
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'notifications@efactory1.de',
    subject: `Neue Nachricht im Auftragschat · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `Ihr Ghostwriter${gwName ? ` ${gwName}` : ''} hat Ihnen die erste Nachricht im Auftragschat zu Auftrag #${orderId} geschrieben.`,
      ``,
      `Der gesamte Austausch zu Ihrem Auftrag — Nachrichten, Dateien und Updates — läuft ab jetzt direkt im efactory1-Auftragschat. Öffnen Sie den Chat, um die Nachricht zu lesen und zu antworten.`,
    ].join('\n'),
    cta: { label: 'Auftragschat öffnen', action: 'open_customer_dashboard', orderId, customerId, tab: 'messages' },
    kind: 'gw_first_contact',
    orderId,
    customerId,
    scenarioId,
  });
}

function gwAssignedToCustomer({ orderId, customerId, customerEmail, customerName, gwName, scenarioId }) {
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    from: 'kundenservice@efactory1.de',
    subject: `Ihr Ghostwriter ist zugewiesen · Auftrag #${orderId}`,
    bodyMd: [
      `Hallo ${customerName || ''},`,
      ``,
      `**${gwName}** übernimmt Ihren Auftrag #${orderId} und meldet sich heute bei Ihnen.`,
      ``,
      `Alle Nachrichten laufen über die efactory1-Plattform — efactory1 bleibt Ihre Vertragspartnerin.`,
    ].join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_customer_dashboard', orderId, customerId, tab: 'status' },
    kind: 'gw_assigned_customer',
    orderId,
    customerId,
    scenarioId,
  });
}

function payoutReleasedGw({ orderId, gwId, gwEmail, gwName, amount, scenarioId }) {
  const amt = Number(amount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 });
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Honorar freigegeben · Auftrag #${orderId} · ${amt} €`,
    bodyMd: [
      `Hallo ${gwName || ''},`,
      ``,
      `Ihr Honorar für Auftrag #${orderId} wurde im Friday-Batch freigegeben.`,
      ``,
      `**Betrag:** ${amt} €`,
      `**Eingang:** Wir-Soldatentag · 1–3 Bankarbeitstage`,
    ].join('\n'),
    cta: { label: 'Auszahlungen ansehen', action: 'open_gw_payments', orderId },
    kind: 'payout_released_gw',
    orderId,
    customerId: null,
    gwId,
    scenarioId,
  });
}

function payoutBatchAdminNotify({ count, totalAmount, scenarioId }) {
  const amt = Number(totalAmount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 });
  return createEmail({
    to: 'kundenservice@efactory1.de',
    toRole: 'admin',
    from: 'noreply@efactory1.de',
    subject: `Friday-Payout abgeschlossen · ${count} Auszahlungen · ${amt} €`,
    bodyMd: [
      `Der Friday-Payout-Batch wurde ausgeführt.`,
      ``,
      `**Aufträge:** ${count}`,
      `**Gesamtbetrag:** ${amt} €`,
    ].join('\n'),
    cta: { label: 'Friday-Batch öffnen', action: 'open_admin_friday_batch' },
    kind: 'payout_batch_admin',
    orderId: null,
    customerId: null,
    scenarioId,
  });
}

function gwApplicationRejected({ orderId, gwId, gwEmail, gwName, scenarioId }) {
  return createEmail({
    to: gwEmail,
    toRole: 'gw',
    from: 'kundenservice@efactory1.de',
    subject: `Auftrag #${orderId} vergeben`,
    bodyMd: [
      `Hallo ${gwName || ''},`,
      ``,
      `der Auftrag #${orderId} wurde an einen anderen Ghostwriter vergeben.`,
      `Vielen Dank für Ihre Bewerbung — weitere passende Aufträge folgen kurzfristig.`,
    ].join('\n'),
    cta: { label: 'Zum Job Board', action: 'open_gw_job_board' },
    kind: 'gw_application_rejected',
    orderId,
    customerId: null,
    gwId,
    scenarioId,
  });
}

function chatReportAdminNotify({ reportId, orderId, reporterRole, reportedRole, count, reason, scenarioId }) {
  const reporterLabel = reporterRole === 'customer' ? 'Customer' : 'Ghostwriter';
  const reportedLabel = reportedRole === 'customer' ? 'Customer' : 'Ghostwriter';
  return createEmail({
    to: 'berat@efactory1.de',
    toRole: 'admin',
    from: 'notifications@efactory1.de',
    subject: `Chat report · ${reporterLabel} reported ${reportedLabel} · Order #${orderId}`,
    bodyMd: [
      `A **${reporterLabel}** has reported a **${reportedLabel}** in order **#${orderId}**.`,
      ``,
      `**Messages reported:** ${count}`,
      `**Reason:** ${reason}`,
      ``,
      `Click the button below to open the chat. The reported messages will be highlighted so you can review them and enter your verdict.`,
    ].join('\n'),
    cta: { label: 'Review Reported Messages', target: { kind: 'admin-order', orderId, tab: 'communications', reportId } },
    kind: 'chat_report',
    orderId,
    scenarioId,
  });
}

function chatReportReviewedNotify({ reportId, orderId, customerId, gwId, reporterRole, count, reviewNote, reporterEmail, reporterName, scenarioId }) {
  const isCustomer = reporterRole === 'customer';
  return createEmail({
    to: reporterEmail || '',
    toRole: reporterRole,
    from: 'kundenservice@efactory1.de',
    subject: `Your chat report has been reviewed · Order #${orderId}`,
    bodyMd: [
      `Dear ${reporterName || 'User'},`,
      ``,
      `your report about **${count} ${count === 1 ? 'message' : 'messages'}** in order **#${orderId}** has been reviewed by the eFactory1 team.`,
      ``,
      `**Admin feedback:** ${reviewNote}`,
      ``,
      `You can view all your submitted reports in the My Reports section of your dashboard.`,
    ].join('\n'),
    cta: isCustomer
      ? { label: 'View My Reports', target: { kind: 'customer-section', section: 'reports' } }
      : { label: 'View My Reports', target: { kind: 'gw-reports' } },
    kind: 'chat_report_reviewed',
    orderId,
    customerId: isCustomer ? customerId : null,
    gwId: !isCustomer ? gwId : null,
    scenarioId,
  });
}

export {
  createEmail,
  markRead,
  listForRole,
  clearForScenario,
  intakeAdminNotify,
  magicLinkLogin,
  intakeWelcomeCustomer,
  offerSentCustomer,
  offerKennenlernenCustomer,
  invoiceEmailCustomer,
  paymentFailedRetryCustomer,
  paymentReceiptCustomer,
  orderChatMentionAdminNotify,
  paymentReceivedAdminNotify,
  paymentMethodLabel,
  gwJobAvailableToGw,
  gwAssignedToGw,
  gwAssignedToCustomer,
  firstContactCtaCustomer,
  gwApplicationRejected,
  gwApplicationAdminNotify,
  finalSubmittedAdminNotify,
  finalAcceptedAdminNotify,
  finalReleasedCustomerNotify,
  interimSubmittedCustomerNotify,
  interimSubmittedAdminNotify,
  interimApprovedGwNotify,
  revisionRequestedGwNotify,
  revisionRequestedAdminNotify,
  qaRevisionRequestedGwNotify,
  qaRevisionRequestedAdminNotify,
  qaClarificationGwNotify,
  disputeOpenedAdminNotify,
  disputeOpenedCounterpartyNotify,
  disputeResolvedCustomerNotify,
  disputeResolvedGwNotify,
  extensionRequestedAdminNotify,
  extensionRequestedGwNotify,
  extensionRejectedGwNotify,
  extensionApprovalPendingGwNotify,
  extensionInvoiceAdminNotify,
  extensionAppliedAdminNotify,
  extensionDeclinedAdminNotify,
  extensionApprovalRequestCustomer,
  extensionInvoiceCustomer,
  extensionAppliedCustomer,
  extensionAppliedGw,
  extensionDeclinedGw,
  delayApprovalRequestCustomer,
  delayAcceptedGw,
  delayReportedAdmin,
  delayAcceptedAdmin,
  delayAcceptedCustomer,
  delayRejectedGw,
  delayRejectedAdmin,
  delayCounterGw,
  payoutReleasedGw,
  payoutBatchAdminNotify,
  chatReportAdminNotify,
  chatReportReviewedNotify,
};
