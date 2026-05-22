// eFactory One — seed data
// Demo data stays seeded, but the app clock is the user's live local time.
const liveNow = () => new Date();

// ---- Ghostwriters (12) ----
const GHOSTWRITERS = [
  { id: 'gw-iw', initials: 'IW', name: 'Isabel Walter', email: 'isabel.walter@gw.efactory1.de', phone: '+49 •••• 4421', expertise: ['Wirtschaftsinformatik', 'BWL', 'IU'], languages: ['DE','EN'], active: 4, lifetime: 87, onTime: 0.96, rating: 4.7, rate: 0.40, banned: false, iban: 'DE•• •••• •••• •••• 8842', taxId: '••/•••/41928', agbsVersion: 'v3.2', agbsAt: '2025-09-12', avail: 'Mo–Fr 18–23' },
  { id: 'gw-lb', initials: 'LB', name: 'Lukas Bauer', email: 'lukas.bauer@gw.efactory1.de', phone: '+49 •••• 7712', expertise: ['Informatik','Data Science','ML'], languages: ['DE','EN'], active: 2, lifetime: 54, onTime: 0.92, rating: 4.8, rate: 0.42, banned: false, iban: 'DE•• •••• •••• •••• 2207', taxId: '••/•••/77129', agbsVersion: 'v3.2', agbsAt: '2025-11-04', avail: 'Mo–Fr 19–24, Sa 10–14' },
  { id: 'gw-hv', initials: 'HV', name: 'Dr. Henrik Vogel', email: 'henrik.vogel@gw.efactory1.de', phone: '+49 •••• 1190', expertise: ['Soziologie','Pädagogik','Doktorarbeiten'], languages: ['DE'], active: 3, lifetime: 142, onTime: 0.98, rating: 4.9, rate: 0.50, banned: false, agbsVersion: 'v3.2' },
  { id: 'gw-sk', initials: 'SK', name: 'Sarah Klein', email: 'sarah.klein@gw.efactory1.de', phone: '+49 •••• 5511', expertise: ['BWL','Marketing','Personal'], languages: ['DE','EN'], active: 5, lifetime: 203, onTime: 0.94, rating: 4.6, rate: 0.38, banned: false, agbsVersion: 'v3.2' },
  { id: 'gw-mp', initials: 'MP', name: 'Maja Petrović', email: 'maja.petrovic@gw.efactory1.de', phone: '+49 •••• 0033', expertise: ['Marketing','Mode','Nachhaltigkeit'], languages: ['DE','EN','SR'], active: 3, lifetime: 31, onTime: 0.81, rating: 4.0, rate: 0.36, banned: false, agbsVersion: 'v3.2' },
  { id: 'gw-ak', initials: 'AK', name: 'Anna König', email: 'anna.koenig@gw.efactory1.de', phone: '+49 •••• 8800', expertise: ['VWL','Statistik'], languages: ['DE'], active: 1, lifetime: 12, onTime: 0.67, rating: 3.4, rate: 0.40, banned: true, banReason: 'AI use suspected on Order #3517', agbsVersion: 'v3.1' },
  { id: 'gw-tr', initials: 'TR', name: 'Tomás Rodriguez', email: 'tomas.rodriguez@gw.efactory1.de', phone: '+49 •••• 2241', expertise: ['Maschinenbau','Physik'], languages: ['DE','EN','ES'], active: 2, lifetime: 41, onTime: 0.93, rating: 4.5, rate: 0.40, banned: false },
  { id: 'gw-jw', initials: 'JW', name: 'Julia Weber', email: 'julia.weber@gw.efactory1.de', phone: '+49 •••• 9128', expertise: ['Jura','Wirtschaftsrecht'], languages: ['DE'], active: 2, lifetime: 76, onTime: 0.97, rating: 4.8, rate: 0.45, banned: false },
  { id: 'gw-fb', initials: 'FB', name: 'Felix Becker', email: 'felix.becker@gw.efactory1.de', phone: '+49 •••• 3367', expertise: ['Psychologie','Neurowissenschaften'], languages: ['DE','EN'], active: 1, lifetime: 23, onTime: 0.89, rating: 4.3, rate: 0.39, banned: false },
  { id: 'gw-ns', initials: 'NS', name: 'Nadja Steiner', email: 'nadja.steiner@gw.efactory1.de', phone: '+49 •••• 4452', expertise: ['Medizin','Gesundheitswissenschaften'], languages: ['DE','EN'], active: 3, lifetime: 58, onTime: 0.95, rating: 4.7, rate: 0.43, banned: false },
  { id: 'gw-pm', initials: 'PM', name: 'Pavel Mueller', email: 'pavel.mueller@gw.efactory1.de', phone: '+49 •••• 1185', expertise: ['Architektur','Bauingenieurwesen'], languages: ['DE','EN','RU'], active: 2, lifetime: 34, onTime: 0.91, rating: 4.4, rate: 0.38, banned: false },
  { id: 'gw-bo', initials: 'BÖ', name: 'Berat Özdemir (self)', email: 'berat@efactory1.de', expertise: ['any'], languages: ['DE','EN','TR'], active: 6, lifetime: 311, onTime: 1.0, rating: 5.0, rate: null, banned: false, isOwner: true },
];

// ---- Customers (20) ----
const CUSTOMERS = [
  { id: 'c-ak', initials: 'AK', name: 'Adrian Kurt', email: 'adrian.kurt@example.com', phone: '+49 •••• 1234', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 490, tags: ['IU'] },
  { id: 'c-ab', initials: 'AB', name: 'Antigona Berisha', email: 'antigona.berisha@example.com', phone: '+49 •••• 5678', country: 'DE', leadSource: 'ig', orders: 2, ltv: 3636, tags: ['repeat'] },
  { id: 'c-ml', initials: 'ML', name: 'Marie Lehmann', email: 'marie.lehmann@example.com', phone: '+49 •••• 7711', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 735 },
  { id: 'c-km', initials: 'KM', name: 'Kurt Müller', email: 'kurt.mueller@example.com', phone: '+49 •••• 3902', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 4485, tags: ['VIP'] },
  { id: 'c-tr', initials: 'TR', name: 'Tobias Reinhardt', email: 'tobias.r@example.com', phone: '+49 •••• 4501', country: 'DE', leadSource: 'referral', orders: 1, ltv: 1200 },
  { id: 'c-ls', initials: 'LS', name: 'Lea Schmidt', email: 'lea.schmidt@example.com', phone: '+49 •••• 8821', country: 'DE', leadSource: 'ig', orders: 1, ltv: 2360, tags: ['dispute'] },
  { id: 'c-dw', initials: 'DW', name: 'Daniel Weber', email: 'daniel.weber@example.com', phone: '+49 •••• 0044', country: 'AT', leadSource: 'b1', orders: 1, ltv: 9480, tags: ['VIP','repeat'] },
  { id: 'c-sh', initials: 'SH', name: 'Sven Hartmann', email: 'sven.hartmann@example.com', phone: '+49 •••• 6677', country: 'DE', leadSource: 'ws1', orders: 1, ltv: 4830 },
  { id: 'c-jb', initials: 'JB', name: 'Jana Brandt', email: 'jana.brandt@example.com', phone: '+49 •••• 1129', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 686 },
  { id: 'c-mh', initials: 'MH', name: 'Moritz Hahn', email: 'moritz.hahn@example.com', phone: '+49 •••• 4490', country: 'DE', leadSource: 'sp1', orders: 1, ltv: 1470 },
  { id: 'c-ek', initials: 'EK', name: 'Elena Krüger', email: 'elena.krueger@example.com', phone: '+49 •••• 7102', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 980 },
  { id: 'c-pn', initials: 'PN', name: 'Paul Neumann', email: 'paul.neumann@example.com', phone: '+49 •••• 2238', country: 'DE', leadSource: 'ig', orders: 1, ltv: 1715 },
  { id: 'c-vs', initials: 'VS', name: 'Vanessa Schäfer', email: 'vanessa.schaefer@example.com', phone: '+49 •••• 9911', country: 'CH', leadSource: 'b1', orders: 1, ltv: 2655 },
  { id: 'c-rh', initials: 'RH', name: 'Robert Hofmann', email: 'robert.hofmann@example.com', phone: '+49 •••• 3344', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 588 },
  { id: 'c-ni', initials: 'NI', name: 'Nina Iversen', email: 'nina.iversen@example.com', phone: '+49 •••• 5577', country: 'DE', leadSource: 'ac', orders: 1, ltv: 3245 },
  { id: 'c-fk', initials: 'FK', name: 'Florian Kaiser', email: 'florian.kaiser@example.com', phone: '+49 •••• 6622', country: 'DE', leadSource: 'av', orders: 1, ltv: 1029 },
  { id: 'c-as', initials: 'AS', name: 'Aylin Sayed', email: 'aylin.sayed@example.com', phone: '+49 •••• 8810', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 2065 },
  { id: 'c-mw', initials: 'MW', name: 'Max Wagner', email: 'max.wagner@example.com', phone: '+49 •••• 7799', country: 'DE', leadSource: 'ig', orders: 1, ltv: 686 },
  { id: 'c-bf', initials: 'BF', name: 'Britta Frey', email: 'britta.frey@example.com', phone: '+49 •••• 4400', country: 'DE', leadSource: 'ebay', orders: 1, ltv: 1862 },
  { id: 'c-cs', initials: 'CS', name: 'Constantin Strobel', email: 'constantin.strobel@example.com', phone: '+49 •••• 9988', country: 'DE', leadSource: 'ef1', orders: 1, ltv: 5340, tags: ['VIP'] },
];

// ---- Orders (30) ----
const ORDERS = [
  // Spec orders
  { id: 3522, status: 'active', customerId: 'c-ak', workType: 'hausarbeit', title: 'DLMWIWPBA02 – Betriebliche Anwendungssysteme', field: 'Wirtschaftsinformatik', pages: 10, finalDeadline: '2026-05-27T18:00:00', interimDeadline: '2026-05-15T18:00:00', grossEur: 490, netHonorarium: 169.44, rate: 0.37, gwId: 'gw-iw', leadSource: 'ef1', note: 'IU Fallstudie', acceptedAt: '2026-05-02', paidEur: 490, outstandingEur: 0, installments: [{n:1,amt:490,status:'paid',date:'2026-05-02',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-05-03T11:14:00' },
  { id: 3524, status: 'available', customerId: 'c-ab', workType: 'bachelorarbeit', title: 'Konzept zur strukturierten Umsetzung von Arbeitssicherheitsmaßnahmen auf Baustellen', field: 'Bauingenieurwesen', pages: 50, finalDeadline: '2026-07-01T18:00:00', interimDeadline: '2026-05-15T18:00:00', interim2Deadline: '2026-06-08T18:00:00', grossEur: 2950, netHonorarium: 992.52, rate: 0.36, gwId: null, leadSource: 'ig', acceptedAt: '2026-05-05', paidEur: 1475, outstandingEur: 1475, installments: [{n:1,amt:1475,status:'paid',date:'2026-05-05',method:'stripe_klarna'},{n:2,amt:737.5,status:'scheduled',date:'2026-06-01',method:'stripe_klarna'},{n:3,amt:737.5,status:'scheduled',date:'2026-06-25',method:'stripe_klarna'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0 },
  { id: 3525, status: 'active', customerId: 'c-ml', workType: 'sonstiges', title: 'folgt — awaiting customer', field: 'Wirtschaftspsychologie', pages: 15, finalDeadline: '2026-05-30T18:00:00', interimDeadline: '2026-05-24T18:00:00', grossEur: 735, netHonorarium: 240.42, rate: 0.35, gwId: 'gw-bo', leadSource: 'ef1', acceptedAt: '2026-05-04', paidEur: 735, outstandingEur: 0, installments: [{n:1,amt:735,status:'paid',date:'2026-05-04',method:'stripe_paypal'}], gwPaymentStatus: 'no_payment_self_assigned', selfAssigned: true, titleTBD: true, revisionRounds: 0, firstContactDoneAt: '2026-05-04T18:30:00' },
  { id: 3499, status: 'payment_pending', customerId: 'c-km', workType: 'masterarbeit', title: 'Skalierbare ML-Pipelines für Predictive Maintenance', field: 'Wirtschaftsinformatik', pages: 65, finalDeadline: '2026-04-28T18:00:00', grossEur: 4485, netHonorarium: 1675.93, rate: 0.40, gwId: 'gw-lb', leadSource: 'ef1', acceptedAt: '2026-02-15', paidEur: 2990, outstandingEur: 1495, installments: [{n:1,amt:1495,status:'paid',date:'2026-02-15',method:'stripe_card'},{n:2,amt:1495,status:'paid',date:'2026-03-20',method:'stripe_card'},{n:3,amt:1495,status:'overdue',date:'2026-04-25',method:'stripe_card'}], releaseBlockReason: '1 of 3 installments outstanding — €1,495.00', gwPaymentStatus: 'invoice_received', revisionRounds: 1, qaPassed: true, customerSatisfied: true, firstContactDoneAt: '2026-02-16T20:25:00' },
  { id: 3492, status: 'completed', customerId: 'c-ab', workType: 'hausarbeit', title: 'Personalentwicklung in mittelständischen Unternehmen', field: 'BWL', pages: 14, finalDeadline: '2026-04-10T18:00:00', grossEur: 686, netHonorarium: 256.45, rate: 0.40, gwId: 'gw-sk', leadSource: 'ef1', acceptedAt: '2026-03-15', paidEur: 686, outstandingEur: 0, installments: [{n:1,amt:686,status:'paid',date:'2026-03-15',method:'bank_transfer_sepa'}], gwPaymentStatus: 'paid', revisionRounds: 0, completedAt: '2026-04-12' },
  { id: 3496, status: 'active', customerId: 'c-tr', workType: 'coaching', title: 'Bachelorarbeit Coaching — Methodenberatung', field: 'Soziologie', pages: 0, finalDeadline: '2026-06-15T18:00:00', grossEur: 1200, netHonorarium: 420, rate: 0.375, gwId: 'gw-hv', leadSource: 'referral', acceptedAt: '2026-04-20', paidEur: 1200, outstandingEur: 0, installments: [{n:1,amt:1200,status:'paid',date:'2026-04-20',method:'bank_transfer_sepa'}], gwPaymentStatus: 'work_in_progress', isCoaching: true, revisionRounds: 0, firstContactDoneAt: '2026-04-21T09:30:00' },
  { id: 3508, status: 'qa_review', customerId: 'c-ls', workType: 'bachelorarbeit', title: 'Nachhaltigkeit in der Modeindustrie', field: 'Marketing', pages: 40, finalDeadline: '2026-05-20T18:00:00', interimDeadline: '2026-05-08T18:00:00', grossEur: 2360, netHonorarium: 793.46, rate: 0.36, gwId: 'gw-mp', leadSource: 'ig', acceptedAt: '2026-04-01', paidEur: 1180, outstandingEur: 1180, installments: [{n:1,amt:1180,status:'paid',date:'2026-04-01',method:'stripe_card'},{n:2,amt:1180,status:'scheduled',date:'2026-05-15',method:'stripe_card'}], revisionRounds: 2, disputeOpen: true, gwPaymentStatus: 'work_in_progress' },
  { id: 3514, status: 'qa_review', customerId: 'c-dw', workType: 'doktorarbeit', title: 'Quantum-resistente Kryptographie in IoT-Netzwerken', field: 'Informatik', pages: 120, finalDeadline: '2026-06-30T18:00:00', grossEur: 9480, netHonorarium: 4426.17, rate: 0.50, gwId: 'gw-hv', leadSource: 'b1', acceptedAt: '2026-01-10', paidEur: 9480, outstandingEur: 0, installments: [{n:1,amt:3160,status:'paid',date:'2026-01-10'},{n:2,amt:3160,status:'paid',date:'2026-03-15'},{n:3,amt:3160,status:'paid',date:'2026-05-01'}], gwPaymentStatus: 'invoice_received', revisionRounds: 0 },
  { id: 3517, status: 'ai_violation_review', customerId: 'c-sh', workType: 'masterarbeit', title: 'Verhaltensökonomie und Konsumentscheidungen', field: 'VWL', pages: 70, finalDeadline: '2026-05-12T18:00:00', grossEur: 4830, netHonorarium: 1804.67, rate: 0.40, gwId: 'gw-ak', leadSource: 'ws1', acceptedAt: '2026-03-20', paidEur: 4830, outstandingEur: 0, installments: [{n:1,amt:2415,status:'paid',date:'2026-03-20'},{n:2,amt:2415,status:'paid',date:'2026-04-25'}], aiScore: 87, plagiarismScore: 12, flagged: true, gwPaymentStatus: 'work_in_progress', revisionRounds: 0 },
  // Extrapolated 21 more
  { id: 3526, status: 'claimed_pending_approval', customerId: 'c-jb', workType: 'hausarbeit', title: 'Agile Transformation im Mittelstand', field: 'BWL', pages: 12, finalDeadline: '2026-05-30T18:00:00', interimDeadline: '2026-05-20T18:00:00', grossEur: 588, netHonorarium: 219.78, rate: 0.40, gwId: 'gw-mp', claimedAt: '2026-05-07T11:14:00', leadSource: 'ef1', acceptedAt: '2026-05-06', paidEur: 588, outstandingEur: 0, installments: [{n:1,amt:588,status:'paid',date:'2026-05-06',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0 },
  { id: 3527, status: 'available', customerId: 'c-mh', workType: 'masterarbeit', title: 'Resiliente Lieferketten in der Pharmaindustrie', field: 'BWL', pages: 60, finalDeadline: '2026-07-15T18:00:00', interimDeadline: '2026-05-30T18:00:00', interim2Deadline: '2026-06-22T18:00:00', grossEur: 4140, netHonorarium: 1547.66, rate: 0.40, gwId: null, leadSource: 'sp1', acceptedAt: '2026-05-06', paidEur: 1380, outstandingEur: 2760, installments: [{n:1,amt:1380,status:'paid',date:'2026-05-06'},{n:2,amt:1380,status:'scheduled',date:'2026-06-10'},{n:3,amt:1380,status:'scheduled',date:'2026-07-05'}], revisionRounds: 0 },
  { id: 3528, status: 'invoice_sent', customerId: 'c-ek', workType: 'hausarbeit', title: 'Gender Pay Gap in deutschen DAX-Unternehmen', field: 'VWL', pages: 18, finalDeadline: '2026-06-04T18:00:00', interimDeadline: '2026-05-22T18:00:00', grossEur: 882, netHonorarium: 329.91, rate: 0.40, gwId: null, leadSource: 'ef1', leadCreatedAt: '2026-04-28T09:15:00', qualifiedAt: '2026-04-28T11:00:00', offerSentAt: '2026-04-29T15:00:00', acceptedAt: '2026-05-01T10:30:00', invoiceSentAt: '2026-05-01T15:30:00', sevdeskInvoiceNo: 'RG-2026-3528', paidEur: 0, outstandingEur: 882, installments: [{n:1,amt:882,status:'pending',date:'2026-05-08'}], revisionRounds: 0 },
  { id: 3520, status: 'interim_submitted', customerId: 'c-pn', workType: 'bachelorarbeit', title: 'Blockchain-Anwendungen in der Logistikbranche', field: 'Wirtschaftsinformatik', pages: 45, finalDeadline: '2026-06-10T18:00:00', interimDeadline: '2026-05-12T18:00:00', interim2Deadline: '2026-05-28T18:00:00', grossEur: 2655, netHonorarium: 992.99, rate: 0.40, gwId: 'gw-iw', leadSource: 'ig', acceptedAt: '2026-04-01', paidEur: 1327.5, outstandingEur: 1327.5, installments: [{n:1,amt:1327.5,status:'paid',date:'2026-04-01'},{n:2,amt:1327.5,status:'scheduled',date:'2026-05-25'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-02T18:30:00' },
  { id: 3521, status: 'under_customer_review', customerId: 'c-vs', workType: 'masterarbeit', title: 'Customer Journey Analytics im E-Commerce', field: 'Marketing', pages: 55, finalDeadline: '2026-06-20T18:00:00', interimDeadline: '2026-05-10T18:00:00', interim2Deadline: '2026-06-02T18:00:00', grossEur: 3795, netHonorarium: 1419.16, rate: 0.40, gwId: 'gw-sk', leadSource: 'b1', acceptedAt: '2026-03-25', paidEur: 1897.5, outstandingEur: 1897.5, installments: [{n:1,amt:1897.5,status:'paid',date:'2026-03-25'},{n:2,amt:1897.5,status:'scheduled',date:'2026-06-01'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0 },
  { id: 3505, status: 'completed', customerId: 'c-rh', workType: 'hausarbeit', title: 'Mitarbeitermotivation in Remote-Teams', field: 'Personal', pages: 12, finalDeadline: '2026-04-05T18:00:00', grossEur: 588, netHonorarium: 219.78, rate: 0.40, gwId: 'gw-sk', leadSource: 'ef1', acceptedAt: '2026-03-01', paidEur: 588, outstandingEur: 0, installments: [{n:1,amt:588,status:'paid',date:'2026-03-01'}], gwPaymentStatus: 'paid', completedAt: '2026-04-07', revisionRounds: 0 },
  { id: 3530, status: 'final_submitted', customerId: 'c-ni', workType: 'bachelorarbeit', title: 'Künstliche Intelligenz in der Personalauswahl', field: 'Wirtschaftspsychologie', pages: 55, finalDeadline: '2026-05-08T18:00:00', interimDeadline: '2026-04-15T18:00:00', interim2Deadline: '2026-04-30T18:00:00', grossEur: 3245, netHonorarium: 1213.55, rate: 0.40, gwId: 'gw-fb', leadSource: 'ac', acceptedAt: '2026-02-20', paidEur: 3245, outstandingEur: 0, installments: [{n:1,amt:1622.5,status:'paid',date:'2026-02-20'},{n:2,amt:1622.5,status:'paid',date:'2026-04-15'}], gwPaymentStatus: 'invoice_received', revisionRounds: 0 },
  { id: 3531, status: 'active', customerId: 'c-fk', workType: 'hausarbeit', title: 'Sustainable Finance: Green Bonds', field: 'VWL', pages: 21, finalDeadline: '2026-06-12T18:00:00', interimDeadline: '2026-05-15T18:00:00', interim2Deadline: '2026-05-28T18:00:00', grossEur: 1029, netHonorarium: 384.67, rate: 0.40, gwId: 'gw-sk', leadSource: 'av', acceptedAt: '2026-04-28', paidEur: 1029, outstandingEur: 0, installments: [{n:1,amt:1029,status:'paid',date:'2026-04-28'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-29T10:30:00' },
  { id: 3532, status: 'active', customerId: 'c-as', workType: 'bachelorarbeit', title: 'Digitalisierung kommunaler Verwaltungen', field: 'Verwaltungswissenschaft', pages: 35, finalDeadline: '2026-05-22T18:00:00', interimDeadline: '2026-05-08T18:00:00', interim2Deadline: '2026-05-15T18:00:00', grossEur: 2065, netHonorarium: 772.34, rate: 0.40, gwId: 'gw-jw', leadSource: 'ef1', acceptedAt: '2026-04-12', paidEur: 1032.5, outstandingEur: 1032.5, installments: [{n:1,amt:1032.5,status:'paid',date:'2026-04-12'},{n:2,amt:1032.5,status:'scheduled',date:'2026-05-19'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-13T09:45:00' },
  { id: 3503, status: 'completed', customerId: 'c-mw', workType: 'hausarbeit', title: 'Influencer-Marketing auf TikTok', field: 'Marketing', pages: 14, finalDeadline: '2026-03-30T18:00:00', grossEur: 686, netHonorarium: 256.45, rate: 0.40, gwId: 'gw-mp', leadSource: 'ig', acceptedAt: '2026-03-01', paidEur: 686, outstandingEur: 0, installments: [{n:1,amt:686,status:'paid',date:'2026-03-01'}], gwPaymentStatus: 'paid', completedAt: '2026-04-01', revisionRounds: 0 },
  { id: 3533, status: 'qualified', customerId: 'c-bf', workType: 'bachelorarbeit', title: 'folgt — awaiting customer', field: 'Soziologie', pages: 38, finalDeadline: '2026-07-20T18:00:00', interimDeadline: '2026-06-15T18:00:00', interim2Deadline: '2026-07-05T18:00:00', grossEur: 1862, netHonorarium: 696.45, rate: 0.40, gwId: null, leadSource: 'ebay', leadCreatedAt: '2026-05-01T09:42:00', qualifiedAt: '2026-05-01T12:18:00', acceptedAt: null, paidEur: 0, outstandingEur: 0, installments: [], titleTBD: true, revisionRounds: 0 },
  { id: 3534, status: 'active', customerId: 'c-cs', workType: 'doktorarbeit', title: 'Algorithmen für Quantum Machine Learning', field: 'Informatik', pages: 80, finalDeadline: '2026-08-30T18:00:00', interimDeadline: '2026-06-10T18:00:00', interim2Deadline: '2026-07-25T18:00:00', grossEur: 5340, netHonorarium: 2495.33, rate: 0.50, gwId: 'gw-lb', leadSource: 'ef1', acceptedAt: '2026-04-15', paidEur: 3560, outstandingEur: 1780, installments: [{n:1,amt:1780,status:'paid',date:'2026-04-15'},{n:2,amt:1780,status:'paid',date:'2026-05-05'},{n:3,amt:1780,status:'scheduled',date:'2026-07-01'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-16T14:00:00' },
  { id: 3535, status: 'available', customerId: 'c-ek', workType: 'masterarbeit', title: 'Mental Health in Hochleistungssport', field: 'Psychologie', pages: 65, finalDeadline: '2026-08-10T18:00:00', interimDeadline: '2026-06-20T18:00:00', interim2Deadline: '2026-07-20T18:00:00', grossEur: 4485, netHonorarium: 1675.93, rate: 0.40, gwId: null, leadSource: 'ef1', acceptedAt: '2026-05-07', paidEur: 1495, outstandingEur: 2990, installments: [{n:1,amt:1495,status:'paid',date:'2026-05-07'},{n:2,amt:1495,status:'scheduled',date:'2026-06-15'},{n:3,amt:1495,status:'scheduled',date:'2026-07-25'}], revisionRounds: 0 },
  { id: 3536, status: 'on_hold', customerId: 'c-pn', workType: 'lektorat', title: 'Lektorat Masterarbeit — Smart Contracts in DeFi', field: 'Informatik', pages: 80, finalDeadline: '2026-05-25T18:00:00', grossEur: 1200, netHonorarium: 420, rate: 0.35, gwId: null, leadSource: 'ef1', acceptedAt: '2026-04-30', paidEur: 0, outstandingEur: 1200, installments: [{n:1,amt:1200,status:'overdue',date:'2026-05-02'}], holdReason: 'Customer payment overdue 5 days', revisionRounds: 0 },
  { id: 3537, status: 'active', customerId: 'c-jb', workType: 'expose', title: 'Exposé Doktorarbeit — Behavioral Economics', field: 'VWL', pages: 8, finalDeadline: '2026-05-18T18:00:00', interimDeadline: '2026-05-12T18:00:00', grossEur: 480, netHonorarium: 192, rate: 0.40, gwId: 'gw-hv', leadSource: 'referral', acceptedAt: '2026-05-01', assignedAt: '2026-05-01T15:20:00', paidEur: 480, outstandingEur: 0, installments: [{n:1,amt:480,status:'paid',date:'2026-05-01'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0 },
  { id: 3538, status: 'active', customerId: 'c-rh', workType: 'seminararbeit', title: 'Industrie 4.0 in der deutschen Automobilindustrie', field: 'Maschinenbau', pages: 22, finalDeadline: '2026-05-15T18:00:00', interimDeadline: '2026-05-10T18:00:00', interim2Deadline: '2026-05-12T18:00:00', grossEur: 1078, netHonorarium: 403.18, rate: 0.40, gwId: 'gw-tr', leadSource: 'ef1', acceptedAt: '2026-04-22', paidEur: 1078, outstandingEur: 0, installments: [{n:1,amt:1078,status:'paid',date:'2026-04-22'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-23T10:00:00' },
  { id: 3539, status: 'payment_pending', customerId: 'c-vs', workType: 'hausarbeit', title: 'Diversity Management in NGOs', field: 'Soziologie', pages: 16, finalDeadline: '2026-04-25T18:00:00', grossEur: 784, netHonorarium: 293.08, rate: 0.40, gwId: 'gw-sk', leadSource: 'b1', acceptedAt: '2026-03-30', paidEur: 784, outstandingEur: 0, installments: [{n:1,amt:784,status:'paid',date:'2026-03-30'}], gwPaymentStatus: 'invoice_received', revisionRounds: 0, qaPassed: true, customerSatisfied: true },
  { id: 3540, status: 'payment_pending', customerId: 'c-mh', workType: 'hausarbeit', title: 'Robotic Process Automation in der Buchhaltung', field: 'Wirtschaftsinformatik', pages: 14, finalDeadline: '2026-04-30T18:00:00', grossEur: 686, netHonorarium: 256.45, rate: 0.40, gwId: 'gw-iw', leadSource: 'sp1', acceptedAt: '2026-04-01', paidEur: 686, outstandingEur: 0, installments: [{n:1,amt:686,status:'paid',date:'2026-04-01'}], gwPaymentStatus: 'invoice_received', revisionRounds: 0, qaPassed: true, customerSatisfied: true, firstContactDoneAt: '2026-04-02T19:05:00' },
  { id: 3541, status: 'payment_pending', customerId: 'c-fk', workType: 'masterarbeit', title: 'Datenethik in Predictive Policing', field: 'Jura', pages: 70, finalDeadline: '2026-04-22T18:00:00', grossEur: 4830, netHonorarium: 1804.67, rate: 0.40, gwId: 'gw-jw', leadSource: 'av', acceptedAt: '2026-02-01', paidEur: 4830, outstandingEur: 0, installments: [{n:1,amt:1610,status:'paid',date:'2026-02-01'},{n:2,amt:1610,status:'paid',date:'2026-03-15'},{n:3,amt:1610,status:'paid',date:'2026-04-10'}], gwPaymentStatus: 'invoice_received', revisionRounds: 1, qaPassed: true, customerSatisfied: true },
  { id: 3542, status: 'payment_pending', customerId: 'c-as', workType: 'hausarbeit', title: 'Resilience Engineering in IT-Operations', field: 'Wirtschaftsinformatik', pages: 13, finalDeadline: '2026-04-28T18:00:00', grossEur: 637, netHonorarium: 238.20, rate: 0.40, gwId: 'gw-iw', leadSource: 'ef1', acceptedAt: '2026-03-25', paidEur: 637, outstandingEur: 0, installments: [{n:1,amt:637,status:'paid',date:'2026-03-25'}], gwPaymentStatus: 'invoice_received', revisionRounds: 0, qaPassed: true, customerSatisfied: true, firstContactDoneAt: '2026-03-26T18:42:00' },
  { id: 3543, status: 'cancelled', customerId: 'c-mw', workType: 'hausarbeit', title: 'Storno — Customer rückgetreten innerhalb 14d', field: 'BWL', pages: 10, finalDeadline: '2026-05-15T18:00:00', grossEur: 490, netHonorarium: 0, rate: 0, gwId: null, leadSource: 'ig', acceptedAt: '2026-05-01', cancelledAt: '2026-05-03T11:18:00', cancelReason: 'Rückgaberecht (14-Tage)', paidEur: 0, outstandingEur: 0, installments: [], revisionRounds: 0 },
  // ---- Sales pipeline pre-payment orders (revenue-at-risk surface) ----
  // 3560 / 3561: qualified leads that still need an offer.
  // 3562 / 3563: offers sent days ago, customer hasn't responded → stale.
  // 3564:        offer sent today, fresh — should NOT appear in the stale queue.
  // 3565:        brand-new lead (still being qualified).
  { id: 3560, status: 'qualified', customerId: 'c-cs', workType: 'hausarbeit', title: 'Datengetriebene Vertriebsstrategien im B2B', field: 'BWL', pages: 16, finalDeadline: '2026-07-08T18:00:00', interimDeadline: '2026-06-20T18:00:00', grossEur: 784, netHonorarium: 293.46, rate: 0.40, gwId: null, leadSource: 'ef1', leadCreatedAt: '2026-05-06T09:12:00', qualifiedAt: '2026-05-06T11:40:00', acceptedAt: null, paidEur: 0, outstandingEur: 0, installments: [], revisionRounds: 0 },
  { id: 3561, status: 'qualified', customerId: 'c-mw', workType: 'hausarbeit', title: 'Self-Service Analytics im Mittelstand', field: 'Wirtschaftsinformatik', pages: 12, finalDeadline: '2026-06-20T18:00:00', interimDeadline: '2026-06-05T18:00:00', grossEur: 588, netHonorarium: 219.78, rate: 0.40, gwId: null, leadSource: 'ig', leadCreatedAt: '2026-05-03T14:08:00', qualifiedAt: '2026-05-03T16:22:00', acceptedAt: null, paidEur: 0, outstandingEur: 0, installments: [], revisionRounds: 0 },
  { id: 3562, status: 'offer_sent', customerId: 'c-dw', workType: 'doktorarbeit', title: 'Federated Learning für Pharma-RWE-Analytik', field: 'Informatik', pages: 90, finalDeadline: '2026-10-15T18:00:00', interimDeadline: '2026-07-20T18:00:00', interim2Deadline: '2026-09-01T18:00:00', grossEur: 7110, netHonorarium: 2657.94, rate: 0.40, gwId: null, leadSource: 'b1', leadCreatedAt: '2026-05-02T08:30:00', qualifiedAt: '2026-05-02T11:12:00', offerSentAt: '2026-05-04T11:00:00', sevdeskOfferNo: 'AN-2026-3562', acceptedAt: null, paidEur: 0, outstandingEur: 0, installments: [], revisionRounds: 0 },
  { id: 3563, status: 'offer_sent', customerId: 'c-fk', workType: 'bachelorarbeit', title: 'Cyber Resilience in kritischer Infrastruktur', field: 'Wirtschaftsinformatik', pages: 35, finalDeadline: '2026-08-05T18:00:00', interimDeadline: '2026-06-25T18:00:00', interim2Deadline: '2026-07-20T18:00:00', grossEur: 2065, netHonorarium: 772.34, rate: 0.40, gwId: null, leadSource: 'av', leadCreatedAt: '2026-04-29T15:18:00', qualifiedAt: '2026-04-30T09:42:00', offerSentAt: '2026-05-01T15:30:00', sevdeskOfferNo: 'AN-2026-3563', acceptedAt: null, paidEur: 0, outstandingEur: 0, installments: [], revisionRounds: 0 },
  { id: 3564, status: 'offer_sent', customerId: 'c-rh', workType: 'hausarbeit', title: 'Employer Branding für Pflegeberufe', field: 'Personal', pages: 14, finalDeadline: '2026-06-25T18:00:00', interimDeadline: '2026-06-08T18:00:00', grossEur: 686, netHonorarium: 256.45, rate: 0.40, gwId: null, leadSource: 'ef1', leadCreatedAt: '2026-05-06T18:42:00', qualifiedAt: '2026-05-07T08:30:00', offerSentAt: '2026-05-07T09:15:00', sevdeskOfferNo: 'AN-2026-3564', acceptedAt: null, paidEur: 0, outstandingEur: 0, installments: [], revisionRounds: 0 },
  { id: 3565, status: 'lead', customerId: 'c-pn', workType: 'hausarbeit', title: 'folgt — qualification call open', field: 'Wirtschaftsinformatik', pages: 18, finalDeadline: '2026-07-01T18:00:00', grossEur: 882, netHonorarium: 0, rate: 0, gwId: null, leadSource: 'wp_form', leadCreatedAt: '2026-05-07T13:42:00', acceptedAt: null, paidEur: 0, outstandingEur: 0, installments: [], titleTBD: true, revisionRounds: 0 },

  // ---- Admin decision queue: extension + delay (no synthetic items — these are real workflow states) ----
  { id: 3566, status: 'extension_requested', customerId: 'c-bf', workType: 'bachelorarbeit', title: 'Greenwashing-Risiken in der ESG-Bericht­erstattung', field: 'BWL', pages: 35, finalDeadline: '2026-05-26T18:00:00', interimDeadline: '2026-05-09T18:00:00', interim2Deadline: '2026-05-17T18:00:00', grossEur: 2065, netHonorarium: 772.34, rate: 0.40, gwId: 'gw-sk', leadSource: 'b1', acceptedAt: '2026-04-15', paidEur: 1032.5, outstandingEur: 1032.5, installments: [{n:1,amt:1032.5,status:'paid',date:'2026-04-15',method:'stripe_card'},{n:2,amt:1032.5,status:'scheduled',date:'2026-05-20',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-16T10:15:00', extensionPending: { requestedAt: '2026-05-07T10:30:00', extraPages: 5, extraFee: 245, description: 'Kunde möchte Kapitel zu EU-Taxonomie ergänzen — Umfang +5 Seiten, neuer Endtermin 2026-06-02.' } },
  { id: 3567, status: 'delay_reported', customerId: 'c-tr', workType: 'bachelorarbeit', title: 'Kreislaufwirtschaft in der Bauwirtschaft', field: 'Bauingenieurwesen', pages: 32, finalDeadline: '2026-05-12T18:00:00', interimDeadline: '2026-05-04T18:00:00', interim2Deadline: '2026-05-08T18:00:00', grossEur: 1888, netHonorarium: 706.17, rate: 0.40, gwId: 'gw-pm', leadSource: 'referral', acceptedAt: '2026-04-08', paidEur: 944, outstandingEur: 944, installments: [{n:1,amt:944,status:'paid',date:'2026-04-08',method:'stripe_card'},{n:2,amt:944,status:'scheduled',date:'2026-05-10',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-09T11:20:00', delayReportedAt: '2026-05-06T16:30:00', delayReason: 'Krankheit (Grippe, ärztl. Attest) — Verzögerung 3 Tage', proposedNewDeadline: '2026-05-15T18:00:00' },

  // ---- Cash & Friday surface: payment_pending whose GW invoice is still missing.
  { id: 3568, status: 'payment_pending', customerId: 'c-ek', workType: 'hausarbeit', title: 'Diversity-KPIs im DAX-30', field: 'BWL', pages: 18, finalDeadline: '2026-04-26T18:00:00', grossEur: 882, netHonorarium: 329.91, rate: 0.40, gwId: 'gw-mp', leadSource: 'ef1', acceptedAt: '2026-03-28', paidEur: 882, outstandingEur: 0, installments: [{n:1,amt:882,status:'paid',date:'2026-03-28',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-03-29T11:40:00', qaPassed: true, customerSatisfied: true },

  // ---- SLA queue: active order whose interim was due 2 days ago and never arrived.
  { id: 3569, status: 'active', customerId: 'c-mw', workType: 'hausarbeit', title: 'Customer Lifetime Value in Abonnement-Modellen', field: 'Marketing', pages: 22, finalDeadline: '2026-05-22T18:00:00', interimDeadline: '2026-05-05T18:00:00', interim2Deadline: '2026-05-15T18:00:00', grossEur: 1078, netHonorarium: 403.18, rate: 0.40, gwId: 'gw-fb', leadSource: 'ig', acceptedAt: '2026-04-18', paidEur: 539, outstandingEur: 539, installments: [{n:1,amt:539,status:'paid',date:'2026-04-18',method:'stripe_card'},{n:2,amt:539,status:'scheduled',date:'2026-05-18',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-19T10:00:00' },

  // ---- Job board fillers (status: available) ----
  { id: 3550, status: 'available', customerId: 'c-jb', workType: 'hausarbeit', title: 'Influencer Marketing in B2B Kontexten', field: 'Marketing', pages: 18, finalDeadline: '2026-05-22T18:00:00', interimDeadline: '2026-05-15T18:00:00', grossEur: 1029, netHonorarium: 412.36, rate: 0.40, gwId: null, leadSource: 'ig', acceptedAt: '2026-05-05', paidEur: 1029, outstandingEur: 0, installments: [{n:1,amt:1029,status:'paid',date:'2026-05-05',method:'stripe_card'}], revisionRounds: 0, assignmentMode: 'job_board', jobBoardStatus: 'open', jobBoardPublishedAt: '2026-05-06T09:00:00', gwBoardNote: 'B2B-Fokus — Erfahrung mit LinkedIn/Brand-Cases willkommen.' },
  { id: 3551, status: 'available', customerId: 'c-mh', workType: 'seminararbeit', title: 'Cloud-native Architekturen für Mittelstand', field: 'Wirtschaftsinformatik', pages: 14, finalDeadline: '2026-05-19T18:00:00', interimDeadline: '2026-05-13T18:00:00', grossEur: 833, netHonorarium: 318.75, rate: 0.41, gwId: null, leadSource: 'sp1', acceptedAt: '2026-05-06', paidEur: 833, outstandingEur: 0, installments: [{n:1,amt:833,status:'paid',date:'2026-05-06',method:'stripe_card'}], revisionRounds: 0 },
  { id: 3552, status: 'available', customerId: 'c-fk', workType: 'lektorat', title: 'Lektorat Bachelorarbeit · Strategisches Controlling', field: 'BWL', pages: 60, finalDeadline: '2026-05-12T18:00:00', grossEur: 686, netHonorarium: 248.50, rate: 0.39, gwId: null, leadSource: 'av', acceptedAt: '2026-05-04', paidEur: 686, outstandingEur: 0, installments: [{n:1,amt:686,status:'paid',date:'2026-05-04',method:'stripe_card'}], revisionRounds: 0 },
  { id: 3553, status: 'available', customerId: 'c-bf', workType: 'expose', title: 'Exposé Masterarbeit: Generation Z & Arbeitsethik', field: 'Soziologie', pages: 8, finalDeadline: '2026-05-15T18:00:00', grossEur: 490, netHonorarium: 184.20, rate: 0.40, gwId: null, leadSource: 'ebay', acceptedAt: '2026-05-03', paidEur: 490, outstandingEur: 0, installments: [{n:1,amt:490,status:'paid',date:'2026-05-03',method:'stripe_card'}], revisionRounds: 0 },
];

// Demo GW assignments are real routeable orders for the Ghostwriter persona.
// Keeping them in shared data avoids list/detail mismatches such as #3601 opening as "not found".
const GW_DEMO_ASSIGNMENTS = [
  { id: 3601, status: 'claimed_pending_approval', customerId: 'c-jb', workType: 'hausarbeit', title: 'Agile Skalierung mit SAFe in Großkonzernen', field: 'Wirtschaftsinformatik', pages: 16, finalDeadline: '2026-05-26T18:00:00', interimDeadline: '2026-05-18T18:00:00', grossEur: 784, netHonorarium: 313.46, rate: 0.40, gwId: 'gw-iw', claimedAt: '2026-05-07T10:42:00', leadSource: 'ef1', acceptedAt: '2026-05-07', paidEur: 784, outstandingEur: 0, installments: [{n:1,amt:784,status:'paid',date:'2026-05-07',method:'stripe_card'}], gwPaymentStatus: 'claim_pending', revisionRounds: 0 },
  { id: 3602, status: 'active', customerId: 'c-mh', workType: 'hausarbeit', title: 'KPI-Dashboards für Marketing-Controlling', field: 'Marketing', pages: 18, finalDeadline: '2026-05-24T18:00:00', interimDeadline: '2026-05-12T18:00:00', grossEur: 1050, netHonorarium: 392.52, rate: 0.40, gwId: 'gw-iw', leadSource: 'sp1', acceptedAt: '2026-05-06', paidEur: 1050, outstandingEur: 0, installments: [{n:1,amt:1050,status:'paid',date:'2026-05-06',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-05-06T18:40:00' },
  { id: 3603, status: 'revision_required', customerId: 'c-pn', workType: 'bachelorarbeit', title: 'IT-Security in der Smart-Factory', field: 'Wirtschaftsinformatik', pages: 38, finalDeadline: '2026-05-30T18:00:00', interimDeadline: '2026-05-09T18:00:00', interim2Deadline: '2026-05-20T18:00:00', grossEur: 1995, netHonorarium: 745.79, rate: 0.40, gwId: 'gw-iw', leadSource: 'ig', acceptedAt: '2026-04-26', paidEur: 997.5, outstandingEur: 997.5, installments: [{n:1,amt:997.5,status:'paid',date:'2026-04-26',method:'stripe_card'},{n:2,amt:997.5,status:'scheduled',date:'2026-05-20',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 1, disputeOpen: true, firstContactDoneAt: '2026-04-27T19:15:00', qaPassed: true, lastCustomerFeedbackAt: '2026-05-03T11:24:00', customerRevisionNote: 'Kapitel 3 (Industrie-4.0-Anbindung) ist zu generisch — bitte um konkretere Bosch/Siemens-Beispiele und Quellenarbeit; Endtermin bleibt 30.05.', lastDisputeAt: '2026-05-03T11:24:00' },
  { id: 3604, status: 'qa_review', customerId: 'c-vs', workType: 'hausarbeit', title: 'Personalcontrolling im Mittelstand', field: 'BWL', pages: 14, finalDeadline: '2026-05-06T18:00:00', grossEur: 686, netHonorarium: 256.45, rate: 0.40, gwId: 'gw-iw', leadSource: 'b1', acceptedAt: '2026-04-18', paidEur: 686, outstandingEur: 0, installments: [{n:1,amt:686,status:'paid',date:'2026-04-18',method:'stripe_card'}], gwPaymentStatus: 'invoice_received', revisionRounds: 0, firstContactDoneAt: '2026-04-19T19:30:00' },
  // Lukas Bauer (gw-lb) — second first-class GW persona. Coverage spans claim/active/revision/qa
  // so the GW dashboard, assignments list, submissions, and revision flows are all populated.
  { id: 3611, status: 'claimed_pending_approval', customerId: 'c-rh', workType: 'hausarbeit', title: 'Edge-Computing in vernetzten Produktionslinien', field: 'Informatik', pages: 12, finalDeadline: '2026-05-28T18:00:00', interimDeadline: '2026-05-20T18:00:00', grossEur: 588, netHonorarium: 246.96, rate: 0.42, gwId: 'gw-lb', claimedAt: '2026-05-07T09:18:00', leadSource: 'ef1', acceptedAt: '2026-05-06', paidEur: 588, outstandingEur: 0, installments: [{n:1,amt:588,status:'paid',date:'2026-05-06',method:'stripe_card'}], gwPaymentStatus: 'claim_pending', revisionRounds: 0 },
  { id: 3612, status: 'active', customerId: 'c-ek', workType: 'masterarbeit', title: 'Erklärbare KI-Modelle für medizinische Bildklassifikation', field: 'Data Science', pages: 60, finalDeadline: '2026-06-22T18:00:00', interimDeadline: '2026-05-18T18:00:00', interim2Deadline: '2026-06-08T18:00:00', grossEur: 2940, netHonorarium: 1234.80, rate: 0.42, gwId: 'gw-lb', leadSource: 'b1', acceptedAt: '2026-04-22', paidEur: 1470, outstandingEur: 1470, installments: [{n:1,amt:1470,status:'paid',date:'2026-04-22',method:'stripe_klarna'},{n:2,amt:735,status:'scheduled',date:'2026-05-25',method:'stripe_klarna'},{n:3,amt:735,status:'scheduled',date:'2026-06-15',method:'stripe_klarna'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 0, firstContactDoneAt: '2026-04-23T19:45:00' },
  { id: 3613, status: 'revision_required', customerId: 'c-dw', workType: 'bachelorarbeit', title: 'MLOps-Pipelines mit Kubeflow im Mittelstand', field: 'Informatik', pages: 42, finalDeadline: '2026-05-30T18:00:00', interimDeadline: '2026-05-10T18:00:00', interim2Deadline: '2026-05-22T18:00:00', grossEur: 2058, netHonorarium: 864.36, rate: 0.42, gwId: 'gw-lb', leadSource: 'ef1', acceptedAt: '2026-04-10', paidEur: 2058, outstandingEur: 0, installments: [{n:1,amt:1029,status:'paid',date:'2026-04-10',method:'stripe_card'},{n:2,amt:1029,status:'paid',date:'2026-05-05',method:'stripe_card'}], gwPaymentStatus: 'work_in_progress', revisionRounds: 1, firstContactDoneAt: '2026-04-11T20:10:00', qaPassed: true, lastCustomerFeedbackAt: '2026-05-05T17:55:00', customerRevisionNote: 'Kapitel 4: bitte den Vergleich Kubeflow vs. MLflow um Cost-of-Ownership-Sicht ergänzen.' },
  { id: 3614, status: 'qa_review', customerId: 'c-sh', workType: 'hausarbeit', title: 'Federated Learning für datenschutzkonforme Analytik', field: 'Data Science', pages: 16, finalDeadline: '2026-05-07T18:00:00', grossEur: 784, netHonorarium: 329.28, rate: 0.42, gwId: 'gw-lb', leadSource: 'ws1', acceptedAt: '2026-04-20', paidEur: 784, outstandingEur: 0, installments: [{n:1,amt:784,status:'paid',date:'2026-04-20',method:'stripe_card'}], gwPaymentStatus: 'invoice_received', revisionRounds: 0, firstContactDoneAt: '2026-04-21T20:00:00' },
];

// ---- QA queue submissions ----
const SUBMISSIONS = [
  { id: 's1', orderId: 3530, kind: 'final_work', round: 1, gwId: 'gw-fb', fileName: 'KI_Personalauswahl_Final_v1.docx', size: 4123881, plagiarismScore: 8, aiScore: 11, qaStatus: 'pending', submittedAt: '2026-05-07T09:14:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  { id: 's2', orderId: 3517, kind: 'final_work', round: 1, gwId: 'gw-ak', fileName: 'Verhaltensoekonomie_Final.docx', size: 3982104, plagiarismScore: 12, aiScore: 87, qaStatus: 'flagged', flagType: 'ai', reviewedAt: '2026-05-07T09:02:00', submittedAt: '2026-05-07T08:42:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true }, flagged: true },
  { id: 's3', orderId: 3514, kind: 'final_work', round: 1, gwId: 'gw-hv', fileName: 'Quantum_Krypto_Final.pdf', size: 4892011, plagiarismScore: 5, aiScore: 7, qaStatus: 'pending', submittedAt: '2026-05-06T17:22:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  { id: 's4', orderId: 3520, kind: 'interim_1', round: 1, gwId: 'gw-iw', fileName: 'Blockchain_Logistik_Zwischenstand_1.docx', size: 1182022, plagiarismScore: 6, aiScore: 9, qaStatus: 'auto_forwarded', submittedAt: '2026-05-06T11:02:00', forwardedAt: '2026-05-06T11:02:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  { id: 's5', orderId: 3521, kind: 'interim_2', round: 1, gwId: 'gw-sk', fileName: 'Customer_Journey_Zwischenstand_2.docx', size: 2102001, plagiarismScore: 9, aiScore: 13, qaStatus: 'auto_forwarded', submittedAt: '2026-05-07T10:15:00', forwardedAt: '2026-05-07T10:15:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  { id: 's6', orderId: 3508, kind: 'revision', round: 3, gwId: 'gw-mp', fileName: 'Nachhaltigkeit_Mode_Revision_3.docx', size: 2382010, plagiarismScore: 14, aiScore: 22, qaStatus: 'pending', submittedAt: '2026-05-07T07:30:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  { id: 's7', orderId: 3540, kind: 'final_work', round: 1, gwId: 'gw-iw', fileName: 'RPA_Buchhaltung_Final.pdf', size: 1882044, plagiarismScore: 4, aiScore: 6, qaStatus: 'passed', submittedAt: '2026-04-28T16:42:00', forwardedAt: '2026-04-28T18:11:00' },
  { id: 's8', orderId: 3604, kind: 'final_work', round: 1, gwId: 'gw-iw', fileName: 'Personalcontrolling_Final_v1.docx', size: 1782044, plagiarismScore: 7, aiScore: 10, qaStatus: 'pending', submittedAt: '2026-05-06T16:10:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  // Lukas Bauer (gw-lb) submissions — interim for #3612 (auto-forwarded), final for #3614 (in QA),
  // and a round-1 final on #3613 that was returned for revision.
  { id: 's9', orderId: 3612, kind: 'interim_1', round: 1, gwId: 'gw-lb', fileName: 'XAI_Medical_Imaging_Zwischenstand_1.docx', size: 1492011, plagiarismScore: 5, aiScore: 8, qaStatus: 'auto_forwarded', submittedAt: '2026-05-04T22:14:00', forwardedAt: '2026-05-04T22:14:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  { id: 's10', orderId: 3614, kind: 'final_work', round: 1, gwId: 'gw-lb', fileName: 'Federated_Learning_Final_v1.pdf', size: 2104488, plagiarismScore: 6, aiScore: 9, qaStatus: 'pending', submittedAt: '2026-05-07T11:32:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  { id: 's11', orderId: 3613, kind: 'final_work', round: 1, gwId: 'gw-lb', fileName: 'MLOps_Kubeflow_Final_v1.docx', size: 2602044, plagiarismScore: 8, aiScore: 11, qaStatus: 'passed', reviewedAt: '2026-05-05T11:08:00', forwardedAt: '2026-05-05T11:08:00', submittedAt: '2026-05-05T09:20:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
  // Isabel's #3603 was returned by the customer — round 1 final was forwarded
  // by QA, customer flagged Kapitel 3 (Industrie-4.0-Anbindung) as too thin,
  // dispute is open. Without this row, the order's revisionRounds=1 is
  // unevidenced and the Submissions tab shows nothing.
  { id: 's12', orderId: 3603, kind: 'final_work', round: 1, gwId: 'gw-iw', fileName: 'IT_Security_SmartFactory_Final_v1.docx', size: 2942011, plagiarismScore: 7, aiScore: 12, qaStatus: 'passed', reviewedAt: '2026-05-02T14:30:00', forwardedAt: '2026-05-02T14:30:00', submittedAt: '2026-05-02T12:15:00', selfChecks: { noAi: true, ready: true, individual: true, spelling: true, plagiarism: true } },
];

// ---- Friday batch (12 releasable) ----
const FRIDAY_BATCH = [
  { orderId: 3499, gwId: 'gw-lb', amount: 1675.93, blocked: true, blockReason: '1 of 3 installments outstanding — €1,495.00' },
  { orderId: 3492, gwId: 'gw-sk', amount: 256.45, blocked: false },
  { orderId: 3539, gwId: 'gw-sk', amount: 293.08, blocked: false },
  { orderId: 3540, gwId: 'gw-iw', amount: 256.45, blocked: false },
  { orderId: 3541, gwId: 'gw-jw', amount: 1804.67, blocked: false },
  { orderId: 3542, gwId: 'gw-iw', amount: 238.20, blocked: false },
  { orderId: 3503, gwId: 'gw-mp', amount: 256.45, blocked: false },
  { orderId: 3505, gwId: 'gw-sk', amount: 219.78, blocked: false },
  { orderId: 3490, gwId: 'gw-hv', amount: 980.00, blocked: false, hint: '(prior period)' },
  { orderId: 3488, gwId: 'gw-tr', amount: 412.30, blocked: false, hint: '(prior period)' },
  { orderId: 3486, gwId: 'gw-ns', amount: 642.10, blocked: false, hint: '(prior period)' },
  { orderId: 3484, gwId: 'gw-pm', amount: 384.59, blocked: false, hint: '(prior period)' },
];

// ---- Notifications ----
const NOTIFICATIONS = [
  { id: 'n1', kind: 'ai_violation', title: 'AI violation flagged on Order #3517', body: 'GW Anna König — score 87%. Review required.', at: '2026-05-07T09:02:00', read: false, urgent: true },
  { id: 'n2', kind: 'claim_pending_your_approval', title: 'Maja Petrović claimed Order #3526', body: 'Agile Transformation im Mittelstand — Hausarbeit, 12 pages', at: '2026-05-07T11:14:00', read: false },
  { id: 'n3', kind: 'final_uploaded', title: 'Final submission for Order #3530 — pending QA', body: 'Felix Becker uploaded KI_Personalauswahl_Final_v1.docx', at: '2026-05-07T09:14:00', read: false },
  { id: 'n4', kind: 'interim_due_d1', title: 'Interim deadline tomorrow 18:00 — Order #3508', body: 'Lea Schmidt — Nachhaltigkeit in der Modeindustrie', at: '2026-05-07T09:00:00', read: true },
  { id: 'n5', kind: 'subscriber_limit_warning', title: 'Pipedrive: 4,159 / 5,000 subscribers used', body: 'Clean up before next campaign', at: '2026-05-07T07:00:00', read: true },
  { id: 'n6', kind: 'delay_reported', title: 'Delay reported on Order #3536 — new date 2026-06-02', body: 'Customer payment overdue 5 days', at: '2026-05-06T16:30:00', read: true },
  { id: 'n7', kind: 'extension_requested', title: 'Extension requested · Order #3566', body: 'Sarah Klein asked for +5 pages / new deadline 2026-06-02', at: '2026-05-07T10:30:00', read: false, urgent: false },
  { id: 'n8', kind: 'delay_reported', title: 'Delay reported · Order #3567', body: 'Pavel Mueller: Grippe — 3-day delay, new deadline 2026-05-15', at: '2026-05-06T16:30:00', read: false },
  { id: 'n9', kind: 'invoice_unpaid_5d', title: 'Invoice unpaid 6 days · Order #3528', body: 'Elena Krüger — RG-2026-3528 · €882.00 outstanding', at: '2026-05-07T08:00:00', read: false },
  { id: 'n10', kind: 'offer_stale', title: 'Offer awaiting 6 days · Order #3563', body: 'Florian Kaiser — AN-2026-3563 · no response since 01.05.', at: '2026-05-07T07:30:00', read: true },
];

// ---- Lookups ----
const WORK_TYPE_LABELS = {
  hausarbeit: 'Hausarbeit',
  bachelorarbeit: 'Bachelorarbeit',
  masterarbeit: 'Masterarbeit',
  doktorarbeit: 'Doktorarbeit',
  diplomarbeit: 'Diplomarbeit',
  seminararbeit: 'Seminararbeit',
  facharbeit: 'Facharbeit',
  projektarbeit: 'Projektarbeit',
  expose: 'Exposé',
  praesentation: 'Präsentation',
  lektorat: 'Lektorat',
  workbook: 'Workbook',
  formatierung: 'Formatierung',
  coaching: 'Coaching',
  sonstiges: 'Sonstiges',
};

// Color scheme (per product feedback):
//   blue   = active / in-progress
//   yellow = pending / awaiting-review
//   green  = completed / delivered
//   orange = overdue (used by deadlineMeta, NOT a status)
//   red    = violations / cancelled / errors
//   gray   = on-hold / inactive
//   slate  = early/neutral (e.g. fresh lead)
const STATUS_PILLS = {
  // Sales pipeline (slate → blue progression)
  lead:                     { color: 'slate',  label: 'Lead' },
  qualified:                { color: 'blue',   label: 'Qualifiziert' },
  offer_sent:               { color: 'blue',   label: 'Offer Sent' },
  invoice_sent:             { color: 'yellow', label: 'Awaiting Payment' },
  // Job board
  available:                { color: 'blue',   label: 'On Job Board' },
  // Synthetic pill for the same DB status when the order is paid but the
  // admin hasn't actually published it to the GW board yet. Resolved in
  // StatusPill by inspecting the order's jobBoardStatus.
  available_ready:          { color: 'teal',   label: 'Paid · Ready for Job Board' },
  claimed_pending_approval: { color: 'yellow', label: 'GW Claimed — Approve' },
  // Active work (blue = in-progress)
  active:                   { color: 'blue',   label: 'Active' },
  interim_submitted:        { color: 'blue',   label: 'Interim Submitted' },
  // Pending review (yellow = awaiting human action)
  under_customer_review:    { color: 'yellow', label: 'Customer Review' },
  revision_required:        { color: 'yellow', label: 'Revision Required' },
  final_submitted:          { color: 'yellow', label: 'Final Submitted' },
  qa_review:                { color: 'yellow', label: 'QA Review' },
  payment_pending:          { color: 'yellow', label: 'Payment Pending' },
  // Completed (green)
  delivered:                { color: 'green',  label: 'Delivered' },
  completed:                { color: 'green',  label: 'Done' },
  // Halt / fail
  on_hold:                  { color: 'gray',   label: 'On Hold' },
  delay_reported:           { color: 'orange', label: 'Delay Reported' },
  extension_requested:      { color: 'yellow', label: 'Extension Requested' },
  cancelled:                { color: 'red',    label: 'Storno' },
  ai_violation_review:      { color: 'red',    label: '🚨 AI Violation' },
  plagiarism_violation_review: { color: 'red', label: '🚨 Plagiarism Flag' },
};

// KPI is derived live by selectKpis in src/core/selectors.js so dashboards
// always see post-mutation counts. Lifetime totals (645 active, 3,359
// completed, 3,522 total) live in that selector.

// Feature flags — single source of truth for "what is real vs. planned" in the prototype.
// Status: 'live' (wired through), 'beta' (partial), 'planned' (UI present but inert).
// Used by <NotReady> in utils.jsx so flipping a feature live is a one-line change here.
const FEATURE_FLAGS = {
  // Common cross-page actions
  'export-csv':         { status: 'planned', label: 'CSV export', note: 'Wired to a download endpoint in v1.3.' },
  'export-bundle':      { status: 'planned', label: 'Bundle export' },
  'export-ledger':      { status: 'planned', label: 'Ledger export' },
  'export-datev':       { status: 'live',    label: 'DATEV export' },
  'filters-advanced':   { status: 'planned', label: 'Advanced filters' },
  'edit-record':        { status: 'planned', label: 'Inline edit' },
  'row-more-actions':   { status: 'planned', label: 'Row actions menu' },
  // Admin
  'invite-gw':          { status: 'planned', label: 'Invite ghostwriter' },
  'expertise-tag':      { status: 'planned', label: 'Tag expertise' },
  'pipedrive-open':     { status: 'planned', label: 'Open in Pipedrive' },
  'pipedrive-new-deal': { status: 'planned', label: 'New Pipedrive deal' },
  'agb-publish':        { status: 'planned', label: 'Publish AGB version' },
  'integration-config': { status: 'planned', label: 'Integration setup' },
  'ustva-preview':      { status: 'planned', label: 'UStVA preview' },
  // Templates
  'template-new':       { status: 'planned', label: 'New template' },
  'template-edit':      { status: 'planned', label: 'Edit template' },
  'template-download':  { status: 'planned', label: 'Download template' },
  // Customer
  'invoice-pdf':        { status: 'planned', label: 'Invoice PDF download' },
  'invoice-pay':        { status: 'planned', label: 'Pay invoice' },
  'profile-edit':       { status: 'planned', label: 'Edit personal data' },
  // Files / submissions / messages
  'submission-download':{ status: 'planned', label: 'Download submission' },
  'submission-preview': { status: 'planned', label: 'Preview submission' },
  'file-preview':       { status: 'planned', label: 'File preview' },
  'attach-file':        { status: 'planned', label: 'Attach file' },
  // BI
  'bi-save':            { status: 'planned', label: 'Save BI prompt' },
  'bi-export':          { status: 'planned', label: 'Export BI result' },
  // Pipeline
  'pipeline-load-more': { status: 'planned', label: 'Load more pipeline deals' },
  // Settings / team / AGB
  'team-invite':        { status: 'planned', label: 'Invite team member' },
  'agb-download':       { status: 'planned', label: 'Download signed AGB PDF' },
  // GW
  'whatsapp':           { status: 'planned', label: 'WhatsApp' },
  'report-dispute':     { status: 'planned', label: 'Report dispute' },
  'request-callback':   { status: 'planned', label: 'Request callback' },
  // Misc
  'alerts':             { status: 'planned', label: 'Alerts' },
};

const featureStatus = (key) => FEATURE_FLAGS[key] || null;
const isFeatureLive = (key) => (FEATURE_FLAGS[key]?.status === 'live');

// Reactive GW_ME wrapper lives on EF (src/core/ef.js) so it follows
// session.gwId. Static fixture only.

export {
  liveNow,
  GHOSTWRITERS, CUSTOMERS, ORDERS, GW_DEMO_ASSIGNMENTS, SUBMISSIONS,
  FRIDAY_BATCH, NOTIFICATIONS,
  WORK_TYPE_LABELS, STATUS_PILLS, FEATURE_FLAGS,
  featureStatus, isFeatureLive,
};
