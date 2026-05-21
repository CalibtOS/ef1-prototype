// Entity hydration and normalization.
import {
  ORDERS, GW_DEMO_ASSIGNMENTS, SUBMISSIONS, CUSTOMERS, GHOSTWRITERS,
  INBOX_THREADS, NOTIFICATIONS,
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

function normalizeChannel(value) {
  if (value === 'email_proxy') return 'email';
  if (value === 'whatsapp_proxy') return 'whatsapp';
  if (value === 'platform_chat') return 'platform';
  if (value === 'voice_metadata') return 'voice';
  if (value === 'multi_channel') return 'multi';
  return value || 'platform';
}

function defaultOriginChannel(threadChannel, from) {
  if (from === 'system') return 'system';
  if (from === 'admin') return 'admin';
  return normalizeChannel(threadChannel);
}

function defaultDeliveryChannel(threadChannel, from) {
  const normalized = normalizeChannel(threadChannel);
  if (from === 'system') return 'internal';
  if (normalized === 'voice') return 'none';
  return normalized === 'multi' ? 'email' : normalized;
}

function lastMessageAt(messages, predicate) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (predicate(messages[i])) return messages[i].at;
  }
  return null;
}

// Per-thread message seeds. Keyed by thread id from data.js INBOX_THREADS.
// Each message: { id, from: 'gw'|'customer'|'admin'|'system', body, at,
// origin_channel?, delivery_channel?, attachments?, autoflag? }
const THREAD_MESSAGE_SEEDS = {
  t3492: [
    { from: 'customer', at: '2026-05-04T14:03:00', body: 'Hi, can we move interim #1 by 2 days?', origin_channel: 'whatsapp', delivery_channel: 'whatsapp' },
    { from: 'admin',    at: '2026-05-04T14:40:00', body: 'We can do +2 days if final stays fixed. Confirm?', origin_channel: 'admin', delivery_channel: 'email' },
    { from: 'customer', at: '2026-05-05T09:12:00', body: 'Attached: updated brief PDF + references', origin_channel: 'email', delivery_channel: 'email', attachments: [{ name: 'brief.pdf', meta: '226 KB', icon: 'file-text' }] },
    { from: 'admin',    at: '2026-05-05T09:45:00', body: 'Received — forwarding to GW today.', origin_channel: 'admin', delivery_channel: 'email' },
    { from: 'customer', at: '2026-05-06T11:02:00', body: 'Please confirm you got the email from yesterday.', origin_channel: 'platform', delivery_channel: 'email' },
    { from: 'admin',    at: '2026-05-06T11:18:00', body: 'Yes — logged on the order. All set.', origin_channel: 'admin', delivery_channel: 'email' },
  ],
  t1: [
    { from: 'customer', at: '2026-05-04T09:14:00', body: 'Hallo, kurze Frage zum Aufbau von Kapitel 3 — wollten Sie da eher induktiv oder deduktiv vorgehen?' },
    { from: 'gw',       at: '2026-05-04T11:30:00', body: 'Guten Tag! Geplant ist deduktiv, von der Theorie zur Anwendung. Falls Sie es anders bevorzugen, kann ich das anpassen.' },
    { from: 'customer', at: '2026-05-07T13:38:00', body: 'Klingt gut. Können wir noch ein konkretes Bosch-Beispiel einbauen?' },
    { from: 'customer', at: '2026-05-07T13:42:00', body: 'Und nochmal kurz: Welche Quellen ziehen Sie für die ERP-Diskussion heran?' },
  ],
  t2: [
    { from: 'gw',       at: '2026-05-05T10:00:00', body: 'Liebe Frau Schmidt, die überarbeitete Version (Runde 2) liegt im Dokumente-Bereich.' },
    { from: 'customer', at: '2026-05-06T18:42:00', body: 'Sorry, aber Kapitel 4 ist immer noch nicht das, was wir besprochen haben. Ich brauche das diese Woche fertig.' },
    { from: 'customer', at: '2026-05-07T08:11:00', body: 'Bitte melden Sie sich heute noch — sonst muss ich eskalieren.' },
    { from: 'gw',       at: '2026-05-07T10:50:00', body: 'Ich verstehe Ihren Frust. Ich überarbeite §4 heute komplett neu und melde mich um 17 Uhr mit einem Status.' },
    { from: 'customer', at: '2026-05-07T11:12:00', body: '⚠ Bitte dringend — der Abgabetermin rückt näher.' },
  ],
  t3: [
    { from: 'customer', at: '2026-05-07T09:55:00', body: 'Hallo, kurze Frage: Können wir die letzte Rate noch in zwei Teile splitten? Mir ist gerade etwas dazwischen gekommen mit der Finanzierung.', autoflag: 'financial' },
    { from: 'system',   at: '2026-05-07T09:55:10', body: 'Finanzbezug erkannt — Anfrage automatisch an kundenservice@efactory1.de weitergeleitet. Der Ghostwriter darf finanzielle Themen nicht besprechen.' },
  ],
  t4: [
    { from: 'gw',       at: '2026-05-06T11:02:00', body: 'Zwischenstand 1 ist hochgeladen — bitte schauen Sie über den Dokumente-Bereich rein.' },
    { from: 'customer', at: '2026-05-06T16:30:00', body: 'Vielen Dank, sieht super aus! Können Sie mit Kapitel 4 weitermachen.' },
    { from: 'gw',       at: '2026-05-06T17:10:00', body: 'Sehr gerne — ich starte direkt damit. Zwischenstand 2 dann zum 28.05.' },
  ],
  t5: [
    { from: 'customer', at: '2026-05-07T10:00:00', body: 'Hallo, ich habe meinen Auftrag (#3527) vor zwei Tagen platziert. Wann wird ein Ghostwriter zugewiesen?' },
    { from: 'system',   at: '2026-05-07T10:00:30', body: 'Ihre Anfrage wurde an unser Team weitergeleitet — typische Zuweisung innerhalb 24h.' },
  ],
  t6: [
    { from: 'system',   at: '2026-05-06T18:11:00', body: 'Voicemail von Sven Hartmann eingegangen · 0:42s · Sentiment: angespannt. Audio-Wiedergabe und Transkription sind per Richtlinie deaktiviert. Bitte zurückrufen.' },
  ],
  t7: [
    { from: 'admin',    at: '2026-05-05T13:30:00', body: 'Liebe Frau Lehmann, hier nochmal zur Bestätigung: Coaching-Termin am Montag, 09.05. um 14:00 via Zoom.' },
    { from: 'customer', at: '2026-05-05T14:00:00', body: 'Perfekt, bis Montag!' },
  ],
  // Lead threads
  tl1: [
    { from: 'customer', at: '2026-05-07T12:10:00', body: 'Hallo, ich habe Ihre Webseite gefunden. Können Sie mir kurz erklären wie das Ganze abläuft und was es kostet?' },
  ],
  tl2: [
    { from: 'customer', at: '2026-05-06T14:30:00', body: 'Guten Tag, wir sind ein Unternehmen und haben jährlich rund 5 Doktorarbeiten die begleitet werden müssen. Gibt es Sonderkonditionen für B2B-Kunden?' },
  ],
  // GW direct thread
  tg1: [
    { from: 'gw', at: '2026-05-07T08:45:00', body: 'Hallo Berat, leider bin ich nächste Woche krank. Ich wollte dich kurz informieren, damit wir ggf. meine aktuellen Aufträge umplanen können.' },
  ],
  // Stale offer / pre-payment threads — customers sitting on proposals
  t12: [
    { from: 'admin',    at: '2026-05-04T11:02:00', body: 'Sehr geehrter Herr Weber, anbei unser Angebot AN-2026-3562 für Ihre Doktorarbeit zum Thema Federated Learning. Bitte um kurze Rückmeldung bis Mitte nächster Woche.', attachments: [{ name: 'AN-2026-3562.pdf', meta: '184 KB', icon: 'file-text' }] },
    { from: 'customer', at: '2026-05-06T18:42:00', body: 'Hallo, vielen Dank für das Angebot. Wir besprechen das intern — könnten Sie mir kurz erläutern, wie das mit den Zwischenständen für eine Doktorarbeit dieser Größe konkret funktioniert?' },
  ],
  t13: [
    { from: 'admin',    at: '2026-05-01T15:35:00', body: 'Sehr geehrter Herr Kaiser, anbei AN-2026-3563 für Ihre Bachelorarbeit. Bei Fragen melden Sie sich gerne.' },
  ],
  // Extension request thread — GW asking for scope change
  t14: [
    { from: 'gw',       at: '2026-05-07T10:30:00', body: 'Hallo Berat, Frau Frey möchte ein zusätzliches Kapitel zur EU-Taxonomie aufnehmen — das wären +5 Seiten und voraussichtlich neuer Endtermin 02.06. Bitte um Freigabe.' },
  ],
  // Delay thread — GW reporting illness
  t15: [
    { from: 'gw',       at: '2026-05-06T16:25:00', body: 'Hallo Berat, ich bin seit gestern krank (Grippe, Attest liegt vor) und brauche voraussichtlich 3 Tage Verlängerung. Neuer Termin 15.05. statt 12.05.' },
    { from: 'gw',       at: '2026-05-06T16:30:00', body: 'Attest folgt per WhatsApp.', attachments: [{ name: 'Attest.pdf', meta: '92 KB', icon: 'file-text' }] },
  ],
  // Lukas Bauer (gw-lb) ↔ Elena Krüger (c-ek) — active master's thesis (#3612).
  // Used by the GW Messages view when seated as Lukas, so the surface isn't empty.
  t3612: [
    { from: 'gw',       at: '2026-04-23T20:05:00', body: 'Hallo Frau Krüger, vielen Dank für den Auftrag. Ich schlage vor, Kapitel 2 als methodischen Vergleich (LIME vs. SHAP vs. Grad-CAM) zu strukturieren — passt das zu Ihrer Forschungsfrage?' },
    { from: 'customer', at: '2026-04-23T22:18:00', body: 'Ja, perfekt. Datensatz wird CheXpert oder NIH ChestX-ray — abhängig von der Lizenz. Ich melde mich Mitte der Woche mit Klärung.' },
    { from: 'customer', at: '2026-04-28T09:12:00', body: 'Update: NIH ist freigegeben, anbei das Lizenz-PDF.', attachments: [{ name: 'NIH_License.pdf', meta: '76 KB', icon: 'file-text' }] },
    { from: 'gw',       at: '2026-04-28T19:30:00', body: 'Danke — ich starte direkt mit dem Preprocessing-Kapitel. Zwischenstand 1 lade ich bis 18.05. hoch.' },
    { from: 'gw',       at: '2026-05-04T22:14:00', body: 'Zwischenstand 1 ist hochgeladen (Methodik + erste Modellbaseline). Feedback gern bis Donnerstag.', attachments: [{ name: 'XAI_Medical_Imaging_Zwischenstand_1.docx', meta: '1.4 MB', icon: 'file-text' }] },
  ],
  // Lukas Bauer (gw-lb) ↔ Daniel Weber (c-dw) — revision request thread (#3613).
  t3613: [
    { from: 'customer', at: '2026-05-05T17:55:00', body: 'Hallo Herr Bauer, Kapitel 4 ist inhaltlich solide, aber unser Reviewer möchte eine Cost-of-Ownership-Sicht im Kubeflow-vs-MLflow-Vergleich. Können Sie das bis 30.05. ergänzen?' },
  ],
  // Demo spine — Antigone Berisha ↔ Isabel Walter ↔ Berat ↔ Lina (via QA)
  t8: [
    { from: 'gw',       at: '2026-04-02T09:14:00', body: 'Guten Tag Frau Berisha, vielen Dank für den Auftrag — ich freue mich auf die Zusammenarbeit. Senden Sie mir gerne das Briefing.' },
    { from: 'customer', at: '2026-04-02T18:42:00', body: 'Hallo Frau Walter! Anbei das Briefing und die Vorlesungsfolien. Schwerpunkt soll auf Industrie-4.0-Kennzahlen liegen, Fallbeispiel Bosch.', attachments: [{ name: 'Briefing.pdf', meta: '184 KB', icon: 'file-text' }] },
    { from: 'gw',       at: '2026-04-08T11:02:00', body: 'Outline ist fertig — habe sie unter „Dokumente" hochgeladen.' },
    { from: 'customer', at: '2026-04-09T10:15:00', body: 'Outline passt — bitte mit Kapitel 3 weitermachen.' },
    { from: 'gw',       at: '2026-05-06T15:30:00', body: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.', attachments: [{ name: 'Zwischenstand_1.docx', meta: '1.2 MB', icon: 'file-text' }] },
  ],
};

// Per-thread per-role unread counts. We pre-compute these against THREAD_MESSAGE_SEEDS
// so the seeded inbox states feel authored: tense thread t2 has 4 unread for admin,
// t3 has a redirected pricing flag for admin to action, t8 (demo spine) has 1 unread
// for the customer (Antigone) so her bell shows the freshest GW message after we
// mount it in A2.
const THREAD_UNREAD_SEEDS = {
  t1: { admin: 0, gw: 2, customer: 0 },
  t2: { admin: 1, gw: 4, customer: 0 },
  t3: { admin: 1, gw: 0, customer: 0 },
  t4: { admin: 0, gw: 0, customer: 0 },
  t5: { admin: 1, gw: 0, customer: 0 },
  t6: { admin: 1, gw: 0, customer: 0 },
  t7: { admin: 0, gw: 0, customer: 0 },
  t8: { admin: 0, gw: 0, customer: 1 },
  t12: { admin: 1, gw: 0, customer: 0 },
  t13: { admin: 0, gw: 0, customer: 0 },
  t14: { admin: 1, gw: 0, customer: 0 },
  t15: { admin: 2, gw: 0, customer: 0 },
  tl1: { admin: 1, gw: 0, customer: 0 },
  tl2: { admin: 1, gw: 0, customer: 0 },
  tg1: { admin: 1, gw: 0, customer: 0 },
  t3612: { admin: 0, gw: 0, customer: 0 },
  t3613: { admin: 1, gw: 1, customer: 0 },
};

// Synthetic thread for the demo spine order (#3518) so Antigone and Isabel
// have a real chat history when the demo opens. Mirrors INBOX_THREADS shape.
function demoSpineThread() {
  return {
    id: 't8',
    threadType: 'order',
    orderId: 3518,
    customerId: 'c-ab',
    gwId: 'gw-iw',
    subject: 'Auftrag #3518 — Zwischenstand 1',
    channel: 'platform_chat',
    sentiment: 'positive',
    lastAt: '2026-05-06T15:30:00',
    flagged: false,
  };
}

function hydrateThread(t) {
  const id = t.id;
  const seedMessages = THREAD_MESSAGE_SEEDS[id] || [];
  const threadChannel = t.channel || 'platform_chat';
  const messages = seedMessages.map((m, i) => {
    const msg = {
      id: `${id}-m${i + 1}`,
      threadId: id,
      from: m.from,
      body: m.body,
      at: m.at,
      origin_channel: m.origin_channel || defaultOriginChannel(threadChannel, m.from),
      delivery_channel: m.delivery_channel || defaultDeliveryChannel(threadChannel, m.from),
      external_ref: m.external_ref || null,
      autoflag: m.autoflag || null,
      system: m.from === 'system',
    };
    if (m.attachments && m.attachments.length) msg.attachments = m.attachments;
    return msg;
  });
  const lastAt = messages.length ? messages[messages.length - 1].at : t.lastAt;
  const seedUnread = THREAD_UNREAD_SEEDS[id] || { admin: 0, gw: 0, customer: 0 };
  // Preserve the seed's `unread` boolean as a fallback for anyone reading the
  // pre-A1 shape, but the source of truth is `unread.{role}`.
  return {
    ...t,
    messages,
    lastAt,
    unread: { ...seedUnread },
    flagged: t.flagged || (seedMessages.some(m => m.autoflag === 'financial') ? 'financial' : false),
    followUp: t.followUp || false,
    snoozeUntil: t.snoozeUntil || null,
    lastInboundAt: lastMessageAt(messages, m => m.from === 'customer' || m.from === 'gw'),
    lastOutboundAt: lastMessageAt(messages, m => m.from === 'admin'),
  };
}

function buildThreads() {
  const baseThreads = [...(INBOX_THREADS || [])];
  if (!baseThreads.some(t => t.id === 't8')) baseThreads.push(demoSpineThread());
  return baseThreads.map(hydrateThread);
}

function roleSeedNotifications() {
  const admin = (NOTIFICATIONS || []).map(n => ({ ...n, to: n.to || 'admin' }));
	return [
	  ...admin,
	  { id: 'qn1', to: 'qa', kind: 'final_uploaded', orderId: 3530, customerId: 'c-ni', gwId: 'gw-fb', submissionId: 's1', title: 'New submission · #3530', body: 'Felix Becker · final work · pending', at: '2026-05-07T09:14:00', urgent: false, read: false },
	  { id: 'qn2', to: 'qa', kind: 'ai_violation', orderId: 3517, customerId: 'c-sh', gwId: 'gw-ak', submissionId: 's2', title: 'AI flag · #3517', body: 'Score 87% — verdict required', at: '2026-05-07T08:42:00', urgent: true, read: false },
	  { id: 'gn1', to: 'gw', gwId: 'gw-iw', customerId: 'c-mh', orderId: 3602, kind: 'assignment_approved', title: 'Order #3602 assigned', body: 'Briefing email sent · customer was introduced', at: '2026-05-06T18:40:00', read: false },
	  { id: 'gn2', to: 'gw', gwId: 'gw-iw', customerId: 'c-ak', orderId: 3522, kind: 'interim_due_d1', title: 'Interim deadline today', body: '#3522 · Zwischenstand 1 · 18:00', at: '2026-05-15T09:00:00', read: false },
	  // Lukas Bauer (gw-lb) — second seeded GW persona. Notifications mirror Isabel's:
	  // a fresh assignment, an upcoming deadline, and a returned revision so each surface
	  // (dashboard, bell, assignment detail) is populated when switching into Lukas.
	  { id: 'gn3', to: 'gw', gwId: 'gw-lb', customerId: 'c-rh', orderId: 3611, kind: 'claim_pending_your_approval', title: 'Claim awaiting approval · #3611', body: 'Berat is reviewing your acknowledgements for Edge-Computing Hausarbeit.', at: '2026-05-07T09:18:00', read: false },
	  { id: 'gn4', to: 'gw', gwId: 'gw-lb', customerId: 'c-ek', orderId: 3612, kind: 'interim_due_d1', title: 'Interim 1 deadline tomorrow', body: '#3612 · Zwischenstand 1 · 18:00 · XAI Medical Imaging', at: '2026-05-17T09:00:00', read: false },
	  { id: 'gn5', to: 'gw', gwId: 'gw-lb', customerId: 'c-dw', orderId: 3613, kind: 'revision_required', title: 'Kunde fordert Überarbeitung · #3613', body: 'Daniel Weber: Kapitel 4 — Cost-of-Ownership-Sicht ergänzen · neuer Termin 2026-05-30', at: '2026-05-05T17:55:00', read: false, urgent: true },
	  { id: 'cn1', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'interim_received', title: 'Zwischenstand verfügbar', body: 'Auftrag #3518 — Zwischenstand 1 hochgeladen · bitte prüfen', at: '2026-05-06T15:30:00', read: false, urgent: false },
	  { id: 'cn2', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'payment_confirmed', title: 'Zahlung bestätigt', body: 'Rate 1 von 2 · 1.180,00 € · Kreditkarte · Auftrag #3518', at: '2026-04-01T10:00:00', read: true },
	  { id: 'cn3', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'assignment_intro', title: 'Ihre Ghostwriterin ist zugewiesen', body: 'Isabel Walter übernimmt #3518 — sie meldet sich heute bei Ihnen.', at: '2026-04-01T16:30:00', read: true },
	  // Multi-applicant approval surface — both Isabel and Lukas have a pending
	  // application on #3550 (see seedGwApplications below). Admin sees both,
	  // approves one, the other auto-rejects. Notifications mirror what
	  // applyForJob() would have produced at runtime.
	  { id: 'an-3550-iw', to: 'admin', gwId: 'gw-iw', customerId: 'c-jb', orderId: 3550, kind: 'claim_pending_your_approval', applicationId: 'app-seed-3550-gw-iw', title: 'New application · #3550', body: 'Isabel Walter applied — review & approve.', at: '2026-05-06T20:14:00', read: false },
	  { id: 'an-3550-lb', to: 'admin', gwId: 'gw-lb', customerId: 'c-jb', orderId: 3550, kind: 'claim_pending_your_approval', applicationId: 'app-seed-3550-gw-lb', title: 'New application · #3550', body: 'Lukas Bauer applied — review & approve.', at: '2026-05-07T08:22:00', read: false },
	  // The two GW direct claims (Isabel on #3601, Lukas on #3611) need matching
	  // admin notifications so the dashboard "needs decision" surface sees them.
	  // Times match the order.claimedAt timestamps.
	  { id: 'an-claim-3601', to: 'admin', gwId: 'gw-iw', customerId: 'c-jb', orderId: 3601, kind: 'claim_pending_your_approval', title: 'Isabel Walter claimed Order #3601', body: 'Agile Skalierung mit SAFe in Großkonzernen — Hausarbeit, 16 Seiten · 6 acknowledgements signed', at: '2026-05-07T10:42:00', read: false },
	  { id: 'an-claim-3611', to: 'admin', gwId: 'gw-lb', customerId: 'c-rh', orderId: 3611, kind: 'claim_pending_your_approval', title: 'Lukas Bauer claimed Order #3611', body: 'Edge-Computing in vernetzten Produktionslinien — Hausarbeit, 12 Seiten · 6 acknowledgements signed', at: '2026-05-07T09:18:00', read: false },
	];
}

// Seeded GW applications — both Isabel and Lukas competing for #3550 so the
// multi-applicant approval flow is testable on first load without any runtime
// interaction. Shape mirrors what `applyForJob` produces in actions.js.
function seedGwApplications() {
  return [
    { id: 'app-seed-3550-gw-iw', orderId: 3550, gwId: 'gw-iw', status: 'pending', appliedAt: '2026-05-06T20:14:00', pitch: 'BWL- und Marketing-Schwerpunkt, B2B-Cases bereits begleitet. Verfügbar ab heute.', termsAccepted: true, scenarioId: null },
    { id: 'app-seed-3550-gw-lb', orderId: 3550, gwId: 'gw-lb', status: 'pending', appliedAt: '2026-05-07T08:22:00', pitch: 'Data-Science-Hintergrund mit Marketing-Analytics-Projekten — kann LinkedIn-Engagement-Metriken quantitativ unterlegen.', termsAccepted: true, scenarioId: null },
  ];
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

function hydrate() {
  const baseOrders = [
    ...(ORDERS || []),
    ...(GW_DEMO_ASSIGNMENTS || []),
  ].map(backfillAssignmentTimestamps);
  if (!baseOrders.some(o => Number(o.id) === 3518)) baseOrders.push(backfillAssignmentTimestamps(customerDemoOrder()));

  // Stamp seeded residents so reset can distinguish them from dynamic ones.
  // Origin is consulted only by reset — never by business logic or sim.
  const seededCustomers = (CUSTOMERS || []).map(c => ({ ...c, origin: 'seeded' }));

  return {
    orders: normalize(baseOrders),
    submissions: normalize(SUBMISSIONS || []),
    customers: normalize(seededCustomers),
    ghostwriters: normalize(GHOSTWRITERS || []),
    threads: normalize(buildThreads()),
    notifications: normalize(roleSeedNotifications()),
    sim_events: normalize([]),
    emails: normalize([]),
    tokens: normalize([]),
    checkout_sessions: normalize([]),
    offer_artifacts: normalize([]),
    gw_applications: normalize(seedGwApplications()),
  };
}

export { hydrate, normalize, clone, normalizeChannel };
