// Entity hydration and normalization.
;(function(){
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
// so the four canonical demo personas all touch one lifecycle order.
function customerDemoOrder() {
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
    grossEur: 2360,
    netHonorarium: 793.46,
    rate: 0.36,
    gwId: 'gw-iw',
    acceptedAt: '2026-04-01',
    leadSource: 'ig',
    paidEur: 1180,
    outstandingEur: 1180,
    installments: [
      { n: 1, amt: 1180, status: 'paid', date: '2026-04-01', method: 'stripe_card' },
      { n: 2, amt: 1180, status: 'scheduled', date: '2026-05-15', method: 'stripe_card' },
    ],
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

function buildThreads(D) {
  const baseThreads = [...(D.INBOX_THREADS || [])];
  if (!baseThreads.some(t => t.id === 't8')) baseThreads.push(demoSpineThread());
  return baseThreads.map(hydrateThread);
}

function roleSeedNotifications(D) {
  const admin = (D.NOTIFICATIONS || []).map(n => ({ ...n, to: n.to || 'admin' }));
	return [
	  ...admin,
	  { id: 'qn1', to: 'qa', kind: 'final_uploaded', orderId: 3530, customerId: 'c-ni', gwId: 'gw-fb', submissionId: 's1', title: 'New submission · #3530', body: 'Felix Becker · final work · pending', at: '2026-05-07T09:14:00', urgent: false, read: false },
	  { id: 'qn2', to: 'qa', kind: 'ai_violation', orderId: 3517, customerId: 'c-sh', gwId: 'gw-ak', submissionId: 's2', title: 'AI flag · #3517', body: 'Score 87% — verdict required', at: '2026-05-07T08:42:00', urgent: true, read: false },
	  { id: 'qn3', to: 'qa', kind: 'interim_uploaded_auto_forwarded', orderId: 3520, customerId: 'c-pn', gwId: 'gw-iw', submissionId: 's4', title: 'Interim uploaded · #3520', body: 'Isabel Walter · auto-forwarded to customer · spot-check if needed', at: '2026-05-06T11:02:00', urgent: false, read: false },
	  { id: 'gn1', to: 'gw', gwId: 'gw-iw', customerId: 'c-mh', orderId: 3602, kind: 'assignment_approved', title: 'Order #3602 assigned', body: 'Briefing email sent · customer was introduced', at: '2026-05-06T18:40:00', read: false },
	  { id: 'gn2', to: 'gw', gwId: 'gw-iw', customerId: 'c-ak', orderId: 3522, kind: 'interim_due_d1', title: 'Interim deadline today', body: '#3522 · Zwischenstand 1 · 18:00', at: '2026-05-15T09:00:00', read: false },
	  { id: 'cn1', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'interim_received', title: 'Zwischenstand verfügbar', body: 'Auftrag #3518 — Zwischenstand 1 hochgeladen · bitte prüfen', at: '2026-05-06T15:30:00', read: false, urgent: false },
	  { id: 'cn2', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'payment_confirmed', title: 'Zahlung bestätigt', body: 'Rate 1 von 2 · 1.180,00 € · Kreditkarte · Auftrag #3518', at: '2026-04-01T10:00:00', read: true },
	  { id: 'cn3', to: 'customer', customerId: 'c-ab', gwId: 'gw-iw', orderId: 3518, kind: 'assignment_intro', title: 'Ihre Ghostwriterin ist zugewiesen', body: 'Isabel Walter übernimmt #3518 — sie meldet sich heute bei Ihnen.', at: '2026-04-01T16:30:00', read: true },
	];
}

function hydrate() {
  const D = window.EF || {};
  const baseOrders = [
    ...(D.ORDERS || []),
    ...(D.GW_DEMO_ASSIGNMENTS || []),
  ];
  if (!baseOrders.some(o => Number(o.id) === 3518)) baseOrders.push(customerDemoOrder());

  return {
    orders: normalize(baseOrders),
    submissions: normalize(D.SUBMISSIONS || []),
    customers: normalize(D.CUSTOMERS || []),
    ghostwriters: normalize(D.GHOSTWRITERS || []),
    threads: normalize(buildThreads(D)),
    notifications: normalize(roleSeedNotifications(D)),
  };
}

window.EFEntities = { hydrate, normalize, clone };
})();
