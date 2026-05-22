// Entity hydration and normalization.
//
// Communication entities (D-28, 2026-05-22):
//   - external_messages  — flat list, contact-keyed (customer | gw | lead)
//                          Aggregated email + WhatsApp for the admin inbox.
//   - order_chats         — 1:1 with an order; 3-party platform chat
//                          (customer + GW + admin).
//   - leads               — minimal contact entities for non-customer/non-gw
//                          contacts (B2B inquiries, anonymous phone leads).
//
// The old `threads` table (per-order/per-lead/per-gw polymorphic) was
// retired in this migration. See docs/communication_architecture.md.
import {
  ORDERS, GW_DEMO_ASSIGNMENTS, SUBMISSIONS, CUSTOMERS, GHOSTWRITERS,
  NOTIFICATIONS,
} from '../../data.js';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalize(list) {
  const byId = {};
  const allIds = [];
  (list || []).forEach(item => {
    if (!item || item.id == null || byId[item.id]) return;
    byId[item.id] = clone(item);
    allIds.push(item.id);
  });
  return { byId, allIds };
}

// Demo spine order: links Antigone Berisha (c-ab) ↔ Isabel Walter (gw-iw)
// so the four canonical demo personas all touch one lifecycle order. paidEur
// and outstandingEur are derived from installment state at construction time
// rather than hardcoded — that way the same numbers can't drift between
// `installments` (the source of truth) and the receivables-aging report.
function customerDemoOrder() {
  const installments = [
    { n: 1, amt: 1180, status: 'paid', date: '2026-04-01', method: 'stripe_card' },
    { n: 2, amt: 1180, status: 'scheduled', date: '2026-05-15', method: 'stripe_card' },
  ];
  const grossEur = installments.reduce((s, i) => s + i.amt, 0);
  const paidEur = installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.amt, 0);
  return {
    id: 3518,
    status: 'under_customer_review',
    customerId: 'c-ab',
    workType: 'bachelorarbeit',
    title: 'Strategisches Controlling im Maschinenbau',
    field: 'BWL',
    pages: 40,
    finalDeadline: '2026-05-22T18:00:00',
    interimDeadline: '2026-05-08T18:00:00',
    interim2Deadline: '2026-05-15T18:00:00',
    grossEur,
    netHonorarium: 793.46,
    rate: 0.36,
    gwId: 'gw-iw',
    acceptedAt: '2026-04-01',
    leadSource: 'ig',
    paidEur,
    outstandingEur: grossEur - paidEur,
    installments,
    revisionRounds: 0,
    gwPaymentStatus: 'work_in_progress',
    customerNote: 'Fokus auf Industrie-4.0-Kennzahlen; Fallbeispiel Bosch.',
  };
}

// ---------------------------------------------------------------------------
// LEADS — minimal contact entities for non-customer / non-gw contacts.
// Only what the admin inbox needs to render a row: name OR phone OR email.
// ---------------------------------------------------------------------------
function buildLeads() {
  return [
    {
      id: 'lead-anon-1',
      name: null,
      phone: '+49 152 3847 2910',
      email: null,
      isB2B: false,
      initials: '??',
    },
    {
      id: 'lead-techventures',
      name: 'TechVentures GmbH',
      phone: null,
      email: 'kontakt@techventures.de',
      isB2B: true,
      initials: 'TV',
    },
  ];
}

// ---------------------------------------------------------------------------
// EXTERNAL MESSAGES — contact-keyed.
//
// Each message: { id, contactType, contactId, medium, direction, at, body,
//   subject?, attachments?, readByAdmin }
//
// Per D-28 (the asymmetry principle): no orderId, no relatedOrderIds. A
// customer with four orders has ONE WhatsApp + ONE email correspondence
// with Berat — the platform does not attribute external messages to orders.
// ---------------------------------------------------------------------------
function externalSeed({ contactType, contactId, medium, direction, at, body, subject, attachments, readByAdmin }) {
  const id = `em-${contactType}-${contactId}-${at.replace(/[^0-9]/g, '')}`;
  return {
    id,
    contactType,
    contactId,
    medium,
    direction,
    at,
    body,
    subject: subject || null,
    attachments: attachments || null,
    readByAdmin: readByAdmin !== undefined ? readByAdmin : direction === 'out',
  };
}

function buildExternalMessages() {
  const seeds = [];

  // -- Customer · Kurt Müller (c-km) ----------------------------------------
  // Real-world case: customer with a paid order (#3499) emails Berat about
  // splitting an installment. In the new model this is just a customer↔Berat
  // email — NOT tagged to the order. Berat reads it and uses judgement.
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-km', medium: 'email', direction: 'in',
    at: '2026-05-07T09:55:00',
    subject: 'Frage zur Restzahlung',
    body: 'Hallo Berat, kurze Frage: Können wir die letzte Rate noch in zwei Teile splitten? Mir ist gerade etwas dazwischen gekommen mit der Finanzierung. Danke!',
    readByAdmin: false,
  }));

  // -- Customer · Moritz Hahn (c-mh) — pre-assignment ----------------------
  // Order #3527 is paid but no GW yet → order chat is locked. Customer
  // naturally pings Berat via email instead. This is a healthy example of
  // why External must exist.
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-mh', medium: 'email', direction: 'in',
    at: '2026-05-07T10:00:00',
    subject: 'Wann wird mir ein Ghostwriter zugewiesen?',
    body: 'Hallo Berat, ich habe meinen Auftrag vor zwei Tagen platziert und die erste Rate bezahlt. Wann kann ich mit der Zuweisung rechnen?',
    readByAdmin: false,
  }));

  // -- Customer · Daniel Weber (c-dw) — offer follow-up --------------------
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-dw', medium: 'email', direction: 'out',
    at: '2026-05-04T11:02:00',
    subject: 'Ihr Angebot AN-2026-3562 — Federated Learning',
    body: 'Sehr geehrter Herr Weber, anbei unser Angebot für Ihre Doktorarbeit zum Thema Federated Learning. Bitte um kurze Rückmeldung bis Mitte nächster Woche.',
    attachments: [{ name: 'AN-2026-3562.pdf', meta: '184 KB', icon: 'file-text' }],
  }));
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-dw', medium: 'email', direction: 'in',
    at: '2026-05-06T18:42:00',
    subject: 'Re: Ihr Angebot AN-2026-3562 — Federated Learning',
    body: 'Hallo, vielen Dank für das Angebot. Wir besprechen das intern — könnten Sie mir kurz erläutern, wie das mit den Zwischenständen für eine Doktorarbeit dieser Größe konkret funktioniert?',
    readByAdmin: false,
  }));

  // -- Customer · Florian Kaiser (c-fk) — stale offer ----------------------
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-fk', medium: 'email', direction: 'out',
    at: '2026-05-01T15:35:00',
    subject: 'AN-2026-3563 — Sustainable Finance',
    body: 'Sehr geehrter Herr Kaiser, anbei AN-2026-3563 für Ihre Bachelorarbeit. Bei Fragen melden Sie sich gerne.',
  }));

  // -- Customer · Antigona Berisha (c-ab) — casual WhatsApp ----------------
  // Repeat customer with TWO orders (#3492 completed, #3518 in progress).
  // She messages Berat on WhatsApp casually; we do NOT pretend to know
  // which order she means.
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-ab', medium: 'whatsapp', direction: 'in',
    at: '2026-05-06T20:15:00',
    body: 'Hi Berat, kurze Frage — könnte ich für ein neues Thema schon ein Vorgespräch bekommen? Diesmal Master, BWL.',
    readByAdmin: false,
  }));
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-ab', medium: 'whatsapp', direction: 'out',
    at: '2026-05-06T20:34:00',
    body: 'Hallo Antigona! Klar, melde dich gerne kurz zur Themenrichtung — wir schauen, wer als GW passt. Donnerstag 15 Uhr?',
  }));
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-ab', medium: 'whatsapp', direction: 'in',
    at: '2026-05-06T20:38:00',
    body: 'Perfekt, Donnerstag passt. Danke!',
    readByAdmin: false,
  }));

  // -- Customer · Lea Schmidt (c-ls) — frustrated WhatsApp -----------------
  // Order #3508 is in QA review; she's frustrated and writing Berat directly
  // on WhatsApp. The right answer is for Berat to step in via the ORDER CHAT
  // (which exists, since #3508 is paid + assigned) — but the customer is
  // using her phone. So this lives in External.
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-ls', medium: 'whatsapp', direction: 'in',
    at: '2026-05-07T08:11:00',
    body: 'Berat, ich brauche das diese Woche fertig. Kapitel 4 ist noch immer nicht das, was wir besprochen haben.',
    readByAdmin: false,
  }));
  seeds.push(externalSeed({
    contactType: 'customer', contactId: 'c-ls', medium: 'whatsapp', direction: 'in',
    at: '2026-05-07T11:12:00',
    body: '⚠ Bitte dringend — der Abgabetermin rückt näher.',
    readByAdmin: false,
  }));

  // -- Lead · anonymous WhatsApp (no customer record) ----------------------
  seeds.push(externalSeed({
    contactType: 'lead', contactId: 'lead-anon-1', medium: 'whatsapp', direction: 'in',
    at: '2026-05-07T12:10:00',
    body: 'Hallo, ich habe Ihre Webseite gefunden. Können Sie mir kurz erklären wie das Ganze abläuft und was es kostet?',
    readByAdmin: false,
  }));

  // -- Lead · TechVentures B2B (email) -------------------------------------
  seeds.push(externalSeed({
    contactType: 'lead', contactId: 'lead-techventures', medium: 'email', direction: 'in',
    at: '2026-05-06T14:30:00',
    subject: 'B2B Anfrage — 5 Doktorarbeiten pro Jahr',
    body: 'Guten Tag, wir sind ein Unternehmen und haben jährlich rund 5 Doktorarbeiten die begleitet werden müssen. Gibt es Sonderkonditionen für B2B-Kunden?',
    readByAdmin: false,
  }));

  // -- GW · Sarah Klein (gw-sk) — illness WhatsApp -------------------------
  // GW contacts are also in Berat's external inbox — same surface, same
  // model. The medium just happens to be WhatsApp.
  seeds.push(externalSeed({
    contactType: 'gw', contactId: 'gw-sk', medium: 'whatsapp', direction: 'in',
    at: '2026-05-07T08:45:00',
    body: 'Hallo Berat, leider bin ich nächste Woche krank. Können wir meine aktuellen Aufträge ggf. umplanen?',
    readByAdmin: false,
  }));

  // -- GW · Pavel Mueller (gw-pm) — delay report email --------------------
  seeds.push(externalSeed({
    contactType: 'gw', contactId: 'gw-pm', medium: 'whatsapp', direction: 'in',
    at: '2026-05-06T16:25:00',
    body: 'Berat, bin seit gestern krank (Grippe). Brauche 3 Tage Verlängerung für #3567. Neuer Termin 15.05. statt 12.05. — Attest folgt.',
    readByAdmin: false,
  }));

  return seeds;
}

// ---------------------------------------------------------------------------
// ORDER CHATS — 1:1 with order. 3-party platform chat. Gated on paid+assigned.
//
// Each chat: { id, orderId, openedAt, closedAt?, unread, messages: [
//   { id, chatId, orderId, authorRole, authorId, at, body, attachments? }
// ] }
// ---------------------------------------------------------------------------
function chatMsg(chatId, orderId, authorRole, authorId, at, body, attachments) {
  return {
    id: `${chatId}-m-${at.replace(/[^0-9]/g, '')}`,
    chatId,
    orderId: Number(orderId),
    authorRole,
    authorId,
    at,
    body,
    attachments: attachments || null,
  };
}

function buildOrderChats() {
  const chats = [];

  // -- #3492 · Antigona Berisha (c-ab) ↔ Sarah Klein (gw-sk) · completed ---
  {
    const id = 'chat-3492';
    const orderId = 3492;
    chats.push({
      id, orderId,
      openedAt: '2026-03-15T16:00:00',
      // #3492 is completed — its chat is archived (read-only). Demonstrates
      // the locked → open → archived lifecycle.
      closedAt: '2026-04-15T12:00:00',
      unread: { admin: 0, customer: 0, gw: 0 },
      messages: [
        chatMsg(id, orderId, 'gw', 'gw-sk', '2026-03-16T10:00:00', 'Hallo Frau Berisha, vielen Dank für den Auftrag — ich freue mich auf die Zusammenarbeit. Senden Sie mir gerne das Briefing.'),
        chatMsg(id, orderId, 'customer', 'c-ab', '2026-03-16T19:14:00', 'Hallo Frau Klein, anbei das Briefing. Schwerpunkt soll Personalentwicklung im Mittelstand sein.', [{ name: 'Briefing_HR.pdf', meta: '142 KB', icon: 'file-text' }]),
        chatMsg(id, orderId, 'gw', 'gw-sk', '2026-03-22T15:30:00', 'Outline ist fertig — habe sie unter „Dokumente" hochgeladen.'),
        chatMsg(id, orderId, 'admin', 'admin', '2026-04-08T11:00:00', 'Kurzer Hinweis: Zwischenstand muss bis 09.04. hochgeladen werden — sonst kollidiert es mit dem Endtermin.'),
        chatMsg(id, orderId, 'gw', 'gw-sk', '2026-04-09T17:42:00', 'Zwischenstand 1 ist im Dokumente-Bereich.', [{ name: 'Zwischenstand_1.docx', meta: '1.1 MB', icon: 'file-text' }]),
        chatMsg(id, orderId, 'customer', 'c-ab', '2026-04-10T09:20:00', 'Vielen Dank! Sieht super aus. Können wir mit Kapitel 4 weitermachen?'),
        { id: `${id}-m-sys-archived`, chatId: id, orderId, authorRole: 'system', authorId: null, at: '2026-04-15T12:00:00', body: 'Auftrag abgeschlossen — dieser Chat ist archiviert.', attachments: null },
      ],
    });
  }

  // -- #3522 · Adrian Kurt (c-ak) ↔ Isabel Walter (gw-iw) · active ---------
  {
    const id = 'chat-3522';
    const orderId = 3522;
    chats.push({
      id, orderId,
      openedAt: '2026-05-03T11:14:00',
      closedAt: null,
      unread: { admin: 0, customer: 0, gw: 2 },
      messages: [
        chatMsg(id, orderId, 'gw', 'gw-iw', '2026-05-03T11:14:00', 'Guten Tag Herr Kurt, schön Sie an Bord zu haben. Ich starte mit Kapitel 1 (Einleitung & Forschungsfrage) — Zwischenstand zum 15.05.'),
        chatMsg(id, orderId, 'customer', 'c-ak', '2026-05-04T09:14:00', 'Hallo, kurze Frage zum Aufbau von Kapitel 3 — wollten Sie eher induktiv oder deduktiv vorgehen?'),
        chatMsg(id, orderId, 'gw', 'gw-iw', '2026-05-04T11:30:00', 'Geplant ist deduktiv, von der Theorie zur Anwendung. Falls Sie es anders bevorzugen, kann ich das anpassen.'),
        chatMsg(id, orderId, 'customer', 'c-ak', '2026-05-07T13:38:00', 'Klingt gut. Können wir noch ein konkretes Bosch-Beispiel einbauen?'),
        chatMsg(id, orderId, 'customer', 'c-ak', '2026-05-07T13:42:00', 'Und kurz: Welche Quellen ziehen Sie für die ERP-Diskussion heran?'),
      ],
    });
  }

  // -- #3508 · Lea Schmidt (c-ls) ↔ Maja Petrović (gw-mp) · qa_review ------
  // Admin steps in here — Lea is frustrated. Real "man in the middle".
  {
    const id = 'chat-3508';
    const orderId = 3508;
    chats.push({
      id, orderId,
      openedAt: '2026-04-01T14:00:00',
      closedAt: null,
      unread: { admin: 1, customer: 0, gw: 0 },
      messages: [
        chatMsg(id, orderId, 'gw', 'gw-mp', '2026-05-05T10:00:00', 'Liebe Frau Schmidt, die überarbeitete Version (Runde 2) liegt im Dokumente-Bereich.'),
        chatMsg(id, orderId, 'customer', 'c-ls', '2026-05-06T18:42:00', 'Kapitel 4 ist immer noch nicht das, was wir besprochen haben. Das frustriert mich.'),
        chatMsg(id, orderId, 'admin', 'admin', '2026-05-06T19:10:00', 'Hallo Frau Schmidt — ich klinke mich kurz ein. Frau Petrović und ich gehen Kapitel 4 morgen früh durch. Sie bekommen bis Donnerstag Mittag eine überarbeitete Fassung. Beste Grüße, Berat.'),
        chatMsg(id, orderId, 'gw', 'gw-mp', '2026-05-07T10:50:00', 'Ich verstehe den Frust. Überarbeite §4 heute komplett neu und melde mich um 17 Uhr mit Status.'),
      ],
    });
  }

  // -- #3520 · Paul Neumann (c-pn) ↔ Isabel Walter (gw-iw) · interim_submitted
  {
    const id = 'chat-3520';
    const orderId = 3520;
    chats.push({
      id, orderId,
      openedAt: '2026-04-02T18:30:00',
      closedAt: null,
      unread: { admin: 0, customer: 0, gw: 0 },
      messages: [
        chatMsg(id, orderId, 'gw', 'gw-iw', '2026-05-06T11:02:00', 'Zwischenstand 1 ist hochgeladen — bitte über den Dokumente-Bereich anschauen.'),
        chatMsg(id, orderId, 'customer', 'c-pn', '2026-05-06T16:30:00', 'Vielen Dank, sieht super aus! Können Sie mit Kapitel 4 weitermachen.'),
        chatMsg(id, orderId, 'gw', 'gw-iw', '2026-05-06T17:10:00', 'Sehr gerne — Zwischenstand 2 dann zum 28.05.'),
      ],
    });
  }

  // -- #3518 · DEMO SPINE · Antigona Berisha ↔ Isabel Walter ---------------
  {
    const id = 'chat-3518';
    const orderId = 3518;
    chats.push({
      id, orderId,
      openedAt: '2026-04-01T16:30:00',
      closedAt: null,
      unread: { admin: 0, customer: 1, gw: 0 },
      messages: [
        chatMsg(id, orderId, 'gw', 'gw-iw', '2026-04-02T09:14:00', 'Guten Tag Frau Berisha, vielen Dank für den Auftrag — ich freue mich auf die Zusammenarbeit. Senden Sie mir gerne das Briefing.'),
        chatMsg(id, orderId, 'customer', 'c-ab', '2026-04-02T18:42:00', 'Hallo Frau Walter! Anbei das Briefing und die Vorlesungsfolien. Schwerpunkt Industrie-4.0-Kennzahlen, Fallbeispiel Bosch.', [{ name: 'Briefing.pdf', meta: '184 KB', icon: 'file-text' }]),
        chatMsg(id, orderId, 'gw', 'gw-iw', '2026-04-08T11:02:00', 'Outline ist fertig — habe sie unter „Dokumente" hochgeladen.'),
        chatMsg(id, orderId, 'customer', 'c-ab', '2026-04-09T10:15:00', 'Outline passt — bitte mit Kapitel 3 weitermachen.'),
        chatMsg(id, orderId, 'gw', 'gw-iw', '2026-05-06T15:30:00', 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.', [{ name: 'Zwischenstand_1.docx', meta: '1.2 MB', icon: 'file-text' }]),
      ],
    });
  }

  // -- #3612 · Elena Krüger (c-ek) ↔ Lukas Bauer (gw-lb) · XAI Imaging ----
  {
    const id = 'chat-3612';
    const orderId = 3612;
    chats.push({
      id, orderId,
      openedAt: '2026-04-23T20:00:00',
      closedAt: null,
      unread: { admin: 0, customer: 0, gw: 0 },
      messages: [
        chatMsg(id, orderId, 'gw', 'gw-lb', '2026-04-23T20:05:00', 'Hallo Frau Krüger, vielen Dank für den Auftrag. Ich schlage vor, Kapitel 2 als methodischen Vergleich (LIME vs. SHAP vs. Grad-CAM) zu strukturieren — passt das zur Forschungsfrage?'),
        chatMsg(id, orderId, 'customer', 'c-ek', '2026-04-23T22:18:00', 'Ja, perfekt. Datensatz wird CheXpert oder NIH ChestX-ray — abhängig von der Lizenz.'),
        chatMsg(id, orderId, 'customer', 'c-ek', '2026-04-28T09:12:00', 'Update: NIH ist freigegeben, anbei das Lizenz-PDF.', [{ name: 'NIH_License.pdf', meta: '76 KB', icon: 'file-text' }]),
        chatMsg(id, orderId, 'gw', 'gw-lb', '2026-04-28T19:30:00', 'Danke — ich starte direkt mit dem Preprocessing-Kapitel.'),
        chatMsg(id, orderId, 'gw', 'gw-lb', '2026-05-04T22:14:00', 'Zwischenstand 1 ist hochgeladen.', [{ name: 'XAI_Zwischenstand_1.docx', meta: '1.4 MB', icon: 'file-text' }]),
      ],
    });
  }

  // -- #3613 · Daniel Weber (c-dw) ↔ Lukas Bauer (gw-lb) · revision ---------
  {
    const id = 'chat-3613';
    const orderId = 3613;
    chats.push({
      id, orderId,
      openedAt: '2026-05-05T17:00:00',
      closedAt: null,
      unread: { admin: 0, customer: 0, gw: 1 },
      messages: [
        chatMsg(id, orderId, 'customer', 'c-dw', '2026-05-05T17:55:00', 'Hallo Herr Bauer, Kapitel 4 ist inhaltlich solide, aber unser Reviewer möchte eine Cost-of-Ownership-Sicht im Kubeflow-vs-MLflow-Vergleich. Können Sie das bis 30.05. ergänzen?'),
      ],
    });
  }

  // -- #3496 · Tobias Reinhardt (c-tr) ↔ Henrik Vogel (gw-hv) · coaching ---
  {
    const id = 'chat-3496';
    const orderId = 3496;
    chats.push({
      id, orderId,
      openedAt: '2026-04-21T09:30:00',
      closedAt: null,
      unread: { admin: 0, customer: 0, gw: 0 },
      messages: [
        chatMsg(id, orderId, 'gw', 'gw-hv', '2026-04-21T09:30:00', 'Guten Tag Herr Reinhardt, Coaching-Termin bestätigt für Montag 14:00 via Zoom.'),
        chatMsg(id, orderId, 'customer', 'c-tr', '2026-04-21T14:00:00', 'Perfekt, bis Montag!'),
      ],
    });
  }

  return chats;
}

function backfillAssignmentTimestamps(o) {
  // Seed orders don't include every audit-trail timestamp. Backfill the bare
  // minimum so the Assignment History timeline can read real fields instead of
  // reconstructing fake events at render time.
  if (!o || !o.gwId) return o;
  if (o.assignedAt) return o;
  const anchor = o.acceptedAt || (o.installments && o.installments.find(i => i.status === 'paid')?.date) || o.createdAt || null;
  if (!anchor) return o;
  const iso = String(anchor).indexOf('T') >= 0 ? anchor : `${anchor}T10:00:00`;
  return { ...o, assignedAt: iso };
}

function roleSeedNotifications() {
  const admin = (NOTIFICATIONS || []).map(n => ({ ...n, to: n.to || 'admin' }));
	return [
	  ...admin,
	  { id: 'qn1', to: 'qa', kind: 'final_uploaded', orderId: 3530, customerId: 'c-ni', gwId: 'gw-fb', submissionId: 's1', title: 'New submission · #3530', body: 'Felix Becker · final work · pending', at: '2026-05-07T09:14:00', urgent: false, read: false },
	  { id: 'qn2', to: 'qa', kind: 'ai_violation', orderId: 3517, customerId: 'c-sh', gwId: 'gw-ak', submissionId: 's2', title: 'AI flag · #3517', body: 'Score 87% — verdict required', at: '2026-05-07T08:42:00', urgent: true, read: false },
	  { id: 'gn1', to: 'gw', gwId: 'gw-iw', customerId: 'c-mh', orderId: 3602, kind: 'assignment_approved', title: 'Order #3602 assigned', body: 'Briefing email sent · customer was introduced', at: '2026-05-06T18:40:00', read: false },
	  { id: 'gn2', to: 'gw', gwId: 'gw-iw', customerId: 'c-ak', orderId: 3522, kind: 'interim_due_d1', title: 'Interim deadline today', body: '#3522 · Zwischenstand 1 · 18:00', at: '2026-05-15T09:00:00', read: false },
	  { id: 'gn3', to: 'gw', gwId: 'gw-lb', customerId: 'c-rh', orderId: 3611, kind: 'claim_pending_your_approval', title: 'Claim awaiting approval · #3611', body: 'Berat is reviewing your acknowledgements for Edge-Computing Hausarbeit.', at: '2026-05-07T09:18:00', read: false },
	  { id: 'gn4', to: 'gw', gwId: 'gw-lb', customerId: 'c-ek', orderId: 3612, kind: 'interim_due_d1', title: 'Interim 1 deadline tomorrow', body: '#3612 · Zwischenstand 1 · 18:00 · XAI Medical Imaging', at: '2026-05-17T09:00:00', read: false },
	  { id: 'gn5', to: 'gw', gwId: 'gw-lb', customerId: 'c-dw', orderId: 3613, kind: 'revision_required', title: 'Kunde fordert Überarbeitung · #3613', body: 'Daniel Weber: Kapitel 4 — Cost-of-Ownership-Sicht ergänzen · neuer Termin 2026-05-30', at: '2026-05-05T17:55:00', read: false, urgent: true },
	  { id: 'cn1', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'interim_received', title: 'Zwischenstand verfügbar', body: 'Auftrag #3518 — Zwischenstand 1 hochgeladen · bitte prüfen', at: '2026-05-06T15:30:00', read: false, urgent: false },
	  { id: 'cn2', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'payment_confirmed', title: 'Zahlung bestätigt', body: 'Rate 1 von 2 · 1.180,00 € · Kreditkarte · Auftrag #3518', at: '2026-04-01T10:00:00', read: true },
	  { id: 'cn3', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'assignment_intro', title: 'Ihre Ghostwriterin ist zugewiesen', body: 'Isabel Walter übernimmt #3518 — sie meldet sich heute bei Ihnen.', at: '2026-04-01T16:30:00', read: true },
	  { id: 'an-3550-iw', to: 'admin', gwId: 'gw-iw', customerId: 'c-jb', orderId: 3550, kind: 'claim_pending_your_approval', applicationId: 'app-seed-3550-gw-iw', title: 'New application · #3550', body: 'Isabel Walter applied — review & approve.', at: '2026-05-06T20:14:00', read: false },
	  { id: 'an-3550-lb', to: 'admin', gwId: 'gw-lb', customerId: 'c-jb', orderId: 3550, kind: 'claim_pending_your_approval', applicationId: 'app-seed-3550-gw-lb', title: 'New application · #3550', body: 'Lukas Bauer applied — review & approve.', at: '2026-05-07T08:22:00', read: false },
	  { id: 'an-claim-3601', to: 'admin', gwId: 'gw-iw', customerId: 'c-jb', orderId: 3601, kind: 'claim_pending_your_approval', title: 'Isabel Walter claimed Order #3601', body: 'Agile Skalierung mit SAFe in Großkonzernen — Hausarbeit, 16 Seiten · 6 acknowledgements signed', at: '2026-05-07T10:42:00', read: false },
	  { id: 'an-claim-3611', to: 'admin', gwId: 'gw-lb', customerId: 'c-rh', orderId: 3611, kind: 'claim_pending_your_approval', title: 'Lukas Bauer claimed Order #3611', body: 'Edge-Computing in vernetzten Produktionslinien — Hausarbeit, 12 Seiten · 6 acknowledgements signed', at: '2026-05-07T09:18:00', read: false },
	];
}

function seedGwApplications() {
  return [
    { id: 'app-seed-3550-gw-iw', orderId: 3550, gwId: 'gw-iw', status: 'pending', appliedAt: '2026-05-06T20:14:00', pitch: 'BWL- und Marketing-Schwerpunkt, B2B-Cases bereits begleitet. Verfügbar ab heute.', termsAccepted: true, scenarioId: null },
    { id: 'app-seed-3550-gw-lb', orderId: 3550, gwId: 'gw-lb', status: 'pending', appliedAt: '2026-05-07T08:22:00', pitch: 'Data-Science-Hintergrund mit Marketing-Analytics-Projekten — kann LinkedIn-Engagement-Metriken quantitativ unterlegen.', termsAccepted: true, scenarioId: null },
  ];
}

function hydrate() {
  const baseOrders = [
    ...(ORDERS || []),
    ...(GW_DEMO_ASSIGNMENTS || []),
  ].map(backfillAssignmentTimestamps);
  if (!baseOrders.some(o => Number(o.id) === 3518)) baseOrders.push(backfillAssignmentTimestamps(customerDemoOrder()));

  const seededCustomers = (CUSTOMERS || []).map(c => ({ ...c, origin: 'seeded' }));

  return {
    orders: normalize(baseOrders),
    submissions: normalize(SUBMISSIONS || []),
    customers: normalize(seededCustomers),
    ghostwriters: normalize(GHOSTWRITERS || []),
    leads: normalize(buildLeads()),
    external_messages: normalize(buildExternalMessages()),
    order_chats: normalize(buildOrderChats()),
    notifications: normalize(roleSeedNotifications()),
    sim_events: normalize([]),
    emails: normalize([]),
    tokens: normalize([]),
    checkout_sessions: normalize([]),
    offer_artifacts: normalize([]),
    gw_applications: normalize(seedGwApplications()),
  };
}

export { hydrate, normalize, clone };
