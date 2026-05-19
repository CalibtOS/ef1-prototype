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
    : { label: 'Jetzt bezahlen', action: 'open_stripe_checkout', sid: checkoutSessionId, orderId };
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
    cta: { label: 'Im Dashboard antworten', action: 'open_customer_dashboard', orderId, customerId },
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
  paymentReceiptCustomer,
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
  payoutReleasedGw,
  payoutBatchAdminNotify,
};
