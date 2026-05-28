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
      outcome === 'scope_amendment' ? `Der angepasste Umfang inkl. ggf. zusätzlicher Kosten und neuer Frist wurde übernommen.` : null,
    ].filter(v => v !== null).join('\n'),
    cta: { label: 'Auftrag öffnen', action: 'open_customer_order', orderId, tab: 'files' },
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
      outcome === 'scope_amendment' ? `Scope has been updated — check the order detail for the new deadline and any extra-fee adjustment.` : null,
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

function firstContactSentToCustomer({ orderId, customerId, customerEmail, customerName, gwEmail, gwName, ccEmail, subject, body, scenarioId }) {
  return createEmail({
    to: customerEmail,
    toRole: 'customer',
    cc: ccEmail || 'kundenservice@efactory1.de',
    from: gwEmail || 'kundenservice@efactory1.de',
    subject: subject || `Auftrag #${orderId} · Erstkontakt`,
    bodyMd: body || '',
    // CTA lands the customer directly in the order chat — the email's whole
    // job is to funnel them into the platform, where all further
    // communication continues.
    cta: { label: 'Im Auftragschat antworten', action: 'open_customer_dashboard', orderId, customerId, tab: 'messages' },
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
  firstContactSentToCustomer,
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
  disputeOpenedAdminNotify,
  disputeOpenedCounterpartyNotify,
  disputeResolvedCustomerNotify,
  disputeResolvedGwNotify,
  payoutReleasedGw,
  payoutBatchAdminNotify,
  chatReportAdminNotify,
  chatReportReviewedNotify,
};
