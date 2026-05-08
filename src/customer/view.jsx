// Customer · Portal view — orders, messages, files, invoices, downloads, profile.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ CUSTOMER PORTAL ============
// B2C portal — centered, internal tab nav. Demo persona resolves from shell.jsx
// ROLES (Antigona Berisha · c-ab). She has 2 real orders; we synthesize one
// mid-flight (interim awaiting feedback) so the portal can demo all states.

const CUST_PERSONA = (window.EFShell?.ROLES || []).find(r => r.id === 'customer') ||
  { user: 'Antigona Berisha', initials: 'AB', email: 'antigona.berisha@example.com' };
const CUST_ME = D.CUSTOMERS.find(c => c.initials === CUST_PERSONA.initials) ||
  { id: 'c-demo', name: CUST_PERSONA.user, initials: CUST_PERSONA.initials, email: CUST_PERSONA.email };

const CUST_SYNTH_ORDERS = [{
  id: 3518, status: 'under_customer_review', customerId: CUST_ME.id,
  workType: 'bachelorarbeit',
  title: 'Strategisches Controlling im Maschinenbau',
  field: 'BWL', pages: 40,
  finalDeadline: '2026-05-22T18:00:00',
  interimDeadline: '2026-05-08T18:00:00',
  interim2Deadline: '2026-05-15T18:00:00',
  grossEur: 2360, gwId: 'gw-mp', acceptedAt: '2026-04-01',
  paidEur: 1180, outstandingEur: 1180,
  installments: [
    { n: 1, amt: 1180, status: 'paid',      date: '2026-04-01', method: 'stripe_card' },
    { n: 2, amt: 1180, status: 'scheduled', date: '2026-05-15', method: 'stripe_card' },
  ],
  revisionRounds: 0,
  customerNote: 'Fokus auf Industrie-4.0-Kennzahlen; Fallbeispiel Bosch.',
}];

function custOrders() {
  const real = D.liveOrders().filter(o => o.customerId === CUST_ME.id);
  return [...CUST_SYNTH_ORDERS, ...real].sort((a, b) => {
    const ra = a.status === 'completed' ? 1 : 0;
    const rb = b.status === 'completed' ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return new Date(b.finalDeadline) - new Date(a.finalDeadline);
  });
}

function custStatusMeta(o) {
  const s = o.status;
  if (s === 'completed' || s === 'delivered' || s === 'payment_pending')
    return { color: 'green', label: 'Abgeschlossen', icon: 'check-circle' };
  // Pre-payment states: customer must understand we're waiting on the offer/invoice/payment.
  if (s === 'qualified' || s === 'offer_sent')
    return { color: 'blue', label: 'Angebot wird vorbereitet', icon: 'file-text' };
  if (s === 'invoice_sent')
    return { color: 'amber', label: 'Zahlung ausstehend', icon: 'wallet' };
  // Post-payment, pre-assignment / pre-approval:
  if (s === 'available' || s === 'claimed_pending_approval')
    return { color: 'cyan', label: 'GW-Suche läuft', icon: 'search' };
  if (s === 'cancelled') return { color: 'red', label: 'Storniert', icon: 'x-circle' };
  if (s === 'on_hold') return { color: 'amber', label: 'Pausiert', icon: 'pause' };
  if (s === 'delay_reported') return { color: 'orange', label: 'Verzögerung gemeldet', icon: 'alert-triangle' };
  if (s === 'interim_submitted' || s === 'under_customer_review')
    return { color: 'blue', label: 'Zwischenstand prüfen', icon: 'eye' };
  if (s === 'revision_required')
    return { color: 'orange', label: 'Überarbeitung läuft', icon: 'rotate-ccw' };
  if (s === 'final_submitted' || s === 'qa_review')
    return { color: 'purple', label: 'Qualitätsprüfung', icon: 'shield-check' };
  if (s === 'ai_violation_review')
    return { color: 'amber', label: 'In Prüfung', icon: 'shield-check' };
  return { color: 'blue', label: 'In Bearbeitung', icon: 'package' };
}

function custProgress(o) {
  const s = o.status;
  if (s === 'completed' || s === 'delivered' || s === 'payment_pending') return 100;
  if (s === 'cancelled') return 0;
  if (s === 'available' || s === 'qualified' || s === 'invoice_sent') return 5;
  if (s === 'claimed_pending_approval') return 12;
  if (s === 'active') return 35;
  if (s === 'interim_submitted' || s === 'under_customer_review') return 55;
  if (s === 'revision_required') return 50;
  if (s === 'final_submitted') return 80;
  if (s === 'qa_review') return 90;
  if (s === 'on_hold') return 20;
  return 30;
}

// Per business_rules §6 (assignment emails): once Berat approves the claim,
// customer receives the GW's name, email and phone (and vice versa).
// Before approval the customer simply doesn't have a GW yet, so we return null.
function custGwLabel(o) {
  if (!o.gwId) return null;
  const gw = D.gw(o.gwId);
  if (!gw) return null;
  // The order is in claim-pending until admin approves; only then is the contact disclosed.
  if (o.status === 'claimed_pending_approval') return null;
  return gw.name || null;
}
function custGwContact(o) {
  if (!o.gwId) return null;
  const gw = D.gw(o.gwId);
  if (!gw || o.status === 'claimed_pending_approval') return null;
  return { name: gw.name, email: gw.email, phone: gw.phone };
}

function CustHeader({ tab, setTab, role, setRole }) {
  const [open, setOpen] = useStateA(false);
  const tabs = [
    { id: 'orders', label: 'Meine Aufträge', icon: 'package' },
    { id: 'messages', label: 'Nachrichten', icon: 'message-square' },
    { id: 'invoices', label: 'Rechnungen', icon: 'file-text' },
    { id: 'downloads', label: 'Downloads', icon: 'download' },
    { id: 'profile', label: 'Profil', icon: 'user' },
  ];
  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 700, letterSpacing: -0.5, fontSize: 22 }}>
          e<span style={{ color: 'var(--blue)' }}>factory</span>
          <span style={{ fontSize: 14, color: 'var(--text-2)' }}>1</span>
        </div>
        <span style={{ flex: 1 }}/>
        <div style={{ position: 'relative' }}>
          <div onClick={() => setOpen(!open)} className="role-switcher" style={{ cursor: 'pointer' }}>
            <Avatar initials={CUST_PERSONA.initials} size={26} tone="blue"/>
            <div className="flex-col" style={{ lineHeight: 1.2 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Angemeldet als</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{CUST_PERSONA.user}</span>
            </div>
            <Icon name="chevron-down" size={14} className="text-faint"/>
          </div>
          {open && setRole && (
            <div style={{ position: 'absolute', top: 40, right: 0, width: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>Demo persona wechseln</div>
              {(window.EFShell?.ROLES || []).map(r => (
                <div key={r.id} onClick={() => { setRole(r.id); setOpen(false); }} style={{ padding: '9px 12px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onMouseEnter={(e)=>e.currentTarget.style.background='var(--surface-2)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                  <Avatar initials={r.initials} size={24} tone={r.id === role ? 'blue' : 'neutral'}/>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.2 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{r.user}</span>
                  </div>
                  {r.id === role && <Icon name="check" size={12} className="text-faint"/>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4, marginTop: 12 }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 14px', borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
            color: tab === t.id ? 'var(--text)' : 'var(--text-2)', fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1,
          }}>
            <Icon name={t.icon} size={14}/>{t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustFooterBanner() {
  return (
    <div className="banner info" style={{ marginTop: 24 }}>
      <Icon name="lock" size={14}/>
      <span>
        <strong>efactory1 ist Ihre Vertragspartnerin.</strong> Alle Zahlungen, Korrespondenz und Lieferungen laufen über diese Plattform — auch wenn Sie direkt mit Ihrem Ghostwriter chatten. Finanzfragen werden automatisch an <span className="mono">kundenservice@efactory1.de</span> weitergeleitet.
      </span>
    </div>
  );
}

function CustOrderCard({ o, onOpen }) {
  const meta = custStatusMeta(o);
  const progress = custProgress(o);
  const gw = custGwLabel(o);
  const dl = U.deadlineMeta(o.finalDeadline);
  const wt = D.WORK_TYPE_LABELS[o.workType] || o.workType;
  const isComplete = progress >= 100;

  let nextMs = null;
  if (o.status === 'available' || o.status === 'qualified' || o.status === 'claimed_pending_approval') {
    nextMs = { label: 'GW-Zuweisung', date: '2026-05-09' };
  } else if (o.status === 'active' && o.interimDeadline) {
    nextMs = { label: 'Zwischenstand 1', date: o.interimDeadline };
  } else if (o.status === 'interim_submitted' || o.status === 'under_customer_review') {
    nextMs = { label: 'Ihr Feedback', date: null };
  } else if (o.status === 'revision_required') {
    nextMs = { label: 'Überarbeitete Version', date: null };
  } else if (o.status === 'final_submitted' || o.status === 'qa_review') {
    nextMs = { label: 'QA-Freigabe', date: null };
  }

  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'border-color .15s' }}
      onClick={() => onOpen()}
      onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--border-strong)'}
      onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border)'}
    >
      <div className="card-pad">
        <div className="flex items-center gap-2 mb-2">
          <span className="mono fs-11 text-faint">#{o.id}</span>
          <span className={`pill pill-${meta.color}`}><Icon name={meta.icon} size={10}/> {meta.label}</span>
          {o.disputeOpen && <span className="pill pill-red" style={{ fontSize: 10 }}><Icon name="alert-triangle" size={9}/> Streitfall offen</span>}
          <span style={{ flex: 1 }}/>
          <span className={`fs-11 ${dl.tone === 'danger' ? 'text-danger' : 'text-muted'}`}>
            {isComplete ? 'Geliefert' : 'Fällig'} {U.fmtDate(o.finalDeadline)}
          </span>
        </div>

        <div className="strong" style={{ fontSize: 15.5, lineHeight: 1.35 }}>{wt} · {o.title}</div>
        <div className="text-muted fs-12 mt-1">
          {gw ? (
            <>Ihr Ghostwriter: <strong>{gw}</strong> <span className="text-faint">· efactory1 immer in CC</span></>
          ) : (
            <span className="text-faint">Wir suchen den passenden Ghostwriter — typischerweise innerhalb von 24h zugewiesen.</span>
          )}
        </div>

        <div className="mt-3" style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: isComplete ? 'var(--green)' : 'var(--blue)', transition: 'width .3s' }}/>
        </div>
        <div className="flex justify-between fs-11 mt-1">
          <span className="text-faint">{progress}% Fortschritt</span>
          {nextMs && (
            <span className="text-muted">
              Nächster Meilenstein: <strong>{nextMs.label}</strong>{nextMs.date && <> am {U.fmtDate(nextMs.date)}</>}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm" onClick={(e)=>{e.stopPropagation();onOpen('messages');}}>
            <Icon name="message-square" size={12}/> Mit GW chatten
          </button>
          <button type="button" className="btn btn-sm" onClick={(e)=>{e.stopPropagation();onOpen('files');}}>
            <Icon name="file-text" size={12}/> Dokumente
          </button>
          <button type="button" className="btn btn-sm" onClick={(e)=>{e.stopPropagation();onOpen('payments');}}>
            <Icon name="wallet" size={12}/> Zahlungen
          </button>
          {(o.status === 'interim_submitted' || o.status === 'under_customer_review') && (
            <button type="button" className="btn btn-sm btn-primary" onClick={(e)=>{e.stopPropagation();onOpen('files');}}>
              <Icon name="eye" size={12}/> Zwischenstand prüfen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustOrdersList({ openOrder }) {
  const orders = custOrders();
  const active = orders.filter(o => custProgress(o) < 100);
  const done = orders.filter(o => custProgress(o) >= 100);
  const firstName = (CUST_PERSONA.user || '').split(' ')[0];

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6, margin: '24px 0 6px' }}>Hallo {firstName} 👋</h1>
      <div className="text-muted mb-4">Ihre laufenden und abgeschlossenen Aufträge</div>

      {active.length > 0 && (
        <>
          <div className="text-faint fs-11" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Aktiv ({active.length})
          </div>
          <div className="flex-col gap-3 mb-4">
            {active.map(o => <CustOrderCard key={o.id} o={o} onOpen={(t)=>openOrder(o.id, t)}/>)}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="text-faint fs-11" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, marginTop: 8 }}>
            Abgeschlossen ({done.length})
          </div>
          <div className="flex-col gap-3">
            {done.map(o => <CustOrderCard key={o.id} o={o} onOpen={(t)=>openOrder(o.id, t)}/>)}
          </div>
        </>
      )}

      {orders.length === 0 && (
        <div className="card"><div className="card-pad text-center text-muted">Noch keine Aufträge.</div></div>
      )}

      <CustFooterBanner/>
    </div>
  );
}

function CustOrderStatus({ o }) {
  const progress = custProgress(o);
  const meta = custStatusMeta(o);

  const milestones = [
    { id: 'placed',  label: 'Auftrag platziert',          date: o.acceptedAt || '2026-04-01', icon: 'package' },
    { id: 'paid1',   label: 'Anzahlung erhalten',         date: o.installments?.[0]?.status === 'paid' ? o.installments?.[0]?.date : null, icon: 'wallet' },
    { id: 'gw',      label: 'Ghostwriter zugewiesen',     date: o.gwId ? o.acceptedAt : null, icon: 'user' },
    { id: 'interim', label: 'Zwischenstand 1',            date: o.interimDeadline, icon: 'upload-cloud', deadline: true },
    o.interim2Deadline ? { id: 'interim2', label: 'Zwischenstand 2', date: o.interim2Deadline, icon: 'upload-cloud', deadline: true } : null,
    { id: 'final',   label: 'Endabgabe',                  date: o.finalDeadline, icon: 'shield-check', deadline: true },
    { id: 'qa',      label: 'efactory1 Qualitätsprüfung', date: null, icon: 'shield' },
    { id: 'done',    label: 'Geliefert',                  date: o.completedAt, icon: 'check-circle' },
  ].filter(Boolean);

  const stepIndex = (() => {
    if (progress >= 100) return milestones.length;
    if (o.status === 'qa_review' || o.status === 'final_submitted') return milestones.findIndex(m => m.id === 'qa');
    if (o.status === 'revision_required' || o.status === 'interim_submitted' || o.status === 'under_customer_review') return milestones.findIndex(m => m.id === 'final');
    if (o.status === 'active') return milestones.findIndex(m => m.id === 'interim');
    if (o.gwId) return milestones.findIndex(m => m.id === 'interim');
    if (o.installments?.[0]?.status === 'paid') return milestones.findIndex(m => m.id === 'gw');
    return 1;
  })();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Fortschritt</div>
          <span className="mono fs-11 text-faint">{progress}%</span>
        </div>
        <div className="card-pad">
          <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? 'var(--green)' : 'var(--blue)', transition: 'width .3s' }}/>
          </div>

          <div className="timeline">
            {milestones.map((m, i) => {
              const done   = i < stepIndex;
              const active = i === stepIndex;
              const tone = done ? 'green' : (active ? 'blue' : '');
              return (
                <div key={m.id} className="timeline-item" style={{ opacity: !done && !active ? 0.55 : 1 }}>
                  <div className={`timeline-dot ${tone}`}>
                    {done ? <Icon name="check" size={10}/> : <Icon name={m.icon} size={10}/>}
                  </div>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.3, paddingTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{m.label}</span>
                    {m.date && (
                      <span className="text-faint fs-11">
                        {m.deadline && !done ? `Frist ${U.fmtDate(m.date)}` : U.fmtDate(m.date)}
                        {active && m.deadline && <> · {U.deadlineMeta(m.date).label}</>}
                      </span>
                    )}
                    {!m.date && active && <span className="text-faint fs-11">In Bearbeitung</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-col gap-3">
        <div className="card">
          <div className="card-head"><div className="card-title">Aktueller Stand</div></div>
          <div className="card-pad">
            <span className={`pill pill-${meta.color}`} style={{ fontSize: 12 }}><Icon name={meta.icon} size={11}/> {meta.label}</span>
            <div className="text-muted fs-12 mt-3" style={{ lineHeight: 1.5 }}>
              {o.status === 'qualified' || o.status === 'offer_sent' ?
                'Ihre Anfrage ist bei uns eingegangen. Sie erhalten in Kürze ein Angebot per E-Mail.' :
                o.status === 'invoice_sent' ?
                'Ihre Rechnung wurde versendet. Sobald Ihre Zahlung eingegangen ist, starten wir die Ghostwriter-Suche.' :
                o.status === 'available' ?
                'Ihre Zahlung ist eingegangen. Wir suchen aktuell den passenden Ghostwriter mit Expertise in Ihrem Fachgebiet — Zuweisung erfolgt typischerweise innerhalb von 24 Stunden.' :
                o.status === 'claimed_pending_approval' ?
                'Ein Ghostwriter hat Ihren Auftrag angenommen. Berat prüft die Eignung — Sie erhalten in Kürze eine Bestätigung.' :
                o.status === 'active' ?
                'Ihr Ghostwriter arbeitet aktuell an der Ausarbeitung. Der erste Zwischenstand ist für ' + U.fmtDate(o.interimDeadline) + ' geplant.' :
                o.status === 'interim_submitted' || o.status === 'under_customer_review' ?
                'Ein Zwischenstand wurde hochgeladen. Bitte prüfen Sie ihn im Tab „Dokumente" und geben Sie Ihrem Ghostwriter Feedback.' :
                o.status === 'revision_required' ?
                'Ihr Ghostwriter überarbeitet die Arbeit gemäß Ihrem Feedback (Runde ' + (o.revisionRounds || 1) + ').' :
                o.status === 'final_submitted' || o.status === 'qa_review' ?
                'Die Endversion wird derzeit vom efactory1 QA-Team auf Plagiat, KI-Nutzung und Formatierung geprüft.' :
                o.status === 'completed' || o.status === 'delivered' || o.status === 'payment_pending' ?
                'Ihre Arbeit wurde erfolgreich geliefert. Die Endrechnung finden Sie im Tab „Zahlungen".' :
                'Ihr Auftrag wird bearbeitet.'}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Eckdaten</div></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>Art der Arbeit</dt><dd>{D.WORK_TYPE_LABELS[o.workType]}</dd></div>
              <div className="kv-row"><dt>Fachgebiet</dt><dd>{o.field}</dd></div>
              <div className="kv-row"><dt>Umfang</dt><dd className="mono">{o.pages} Seiten</dd></div>
              <div className="kv-row"><dt>Gesamtpreis</dt><dd className="mono">{U.EUR(o.grossEur)}</dd></div>
              <div className="kv-row"><dt>Endabgabe</dt><dd className="mono">{U.fmtDate(o.finalDeadline)}</dd></div>
              {o.customerNote && <div className="kv-row"><dt>Notiz</dt><dd style={{ fontSize: 11.5, fontStyle: 'italic' }}>{o.customerNote}</dd></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderChat({ o, toast }) {
  const [text, setText] = useStateA('');
  const [draftFlag, setDraftFlag] = useStateA(null);

  const baseConv = [
    { from: 'gw',       at: '2026-04-02T09:14:00', text: 'Guten Tag und vielen Dank für Ihren Auftrag! Ich freue mich auf die Zusammenarbeit. Senden Sie mir bitte das Briefing-Dokument und ggf. relevante Vorlesungsfolien.' },
    { from: 'customer', at: '2026-04-02T18:42:00', text: 'Hallo! Anbei das Briefing und die Folien. Schwerpunkt soll auf praxisnahen Beispielen aus dem Maschinenbau liegen.' },
    { from: 'gw',       at: '2026-04-08T11:02:00', text: 'Outline ist fertig. Ich habe sie über die Plattform unter „Dokumente" hochgeladen — bitte schauen Sie es sich an.' },
    { from: 'customer', at: '2026-04-09T10:15:00', text: 'Outline passt — bitte mit Kapitel 3 weitermachen.' },
    { from: 'gw',       at: '2026-05-06T15:30:00', text: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.' },
  ];
  if (o.status === 'completed') {
    baseConv.push(
      { from: 'customer', at: '2026-04-10T16:00:00', text: 'Vielen Dank! Bin sehr zufrieden mit der finalen Version.' },
      { from: 'platform', at: '2026-04-12T10:30:00', text: '✓ Endabgabe geliefert · QA bestanden · Auftrag abgeschlossen.' }
    );
  }
  if (o.status === 'qualified' || o.status === 'offer_sent') {
    baseConv.length = 0;
    baseConv.push({ from: 'platform', at: '2026-05-05T14:00:00', text: 'Ihre Anfrage ist eingegangen. Wir bereiten Ihr Angebot vor.' });
  } else if (o.status === 'invoice_sent') {
    baseConv.length = 0;
    baseConv.push({ from: 'platform', at: '2026-05-05T14:00:00', text: 'Rechnung versendet · Sobald Ihre Zahlung eingegangen ist, starten wir die Ghostwriter-Suche.' });
  } else if (o.status === 'available') {
    baseConv.length = 0;
    baseConv.push({ from: 'platform', at: o.acceptedAt || '2026-05-05T14:00:00', text: 'Zahlung erhalten · Ghostwriter-Suche gestartet · Sie werden benachrichtigt sobald ein passender GW zugewiesen ist.' });
  }

  const detectFinancial = (txt) => /preis|kosten|rabatt|nachlass|raten|geld|honorar|bezahl|rechnung|euro|€/i.test(txt);
  const onChange = (v) => { setText(v); setDraftFlag(detectFinancial(v) ? 'financial' : null); };
  const onSend = () => {
    if (!text.trim()) return;
    if (draftFlag === 'financial') {
      toast && toast({ tone: 'info', text: 'Finanzfrage erkannt — automatisch an kundenservice@efactory1.de weitergeleitet.' });
    } else {
      toast && toast({ tone: 'success', text: 'Nachricht gesendet · efactory1 in CC' });
    }
    setText(''); setDraftFlag(null);
  };
  const isLocked = !o.gwId;
  const gwLabel = custGwLabel(o) || 'GW';
  const gwInits = gwLabel.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-head">
          <div className="card-title">Konversation mit Ihrem Ghostwriter</div>
          <span className="text-faint fs-11">{baseConv.length} Nachrichten</span>
        </div>
        <div className="banner info" style={{ margin: 12, fontSize: 11.5 }}>
          <Icon name="lock" size={12}/>
          <span>Auto-CC: jede Nachricht geht zusätzlich an <span className="mono">kundenservice@efactory1.de</span>. Finanzfragen werden automatisch umgeleitet.</span>
        </div>

        <div style={{ flex: 1, padding: '4px 16px 16px', overflowY: 'auto', maxHeight: 480 }}>
          {baseConv.length === 0 && (
            <div className="text-muted text-center fs-12" style={{ padding: 32 }}>Noch keine Nachrichten.</div>
          )}
          {baseConv.map((m, i) => {
            const mine = m.from === 'customer';
            const sys  = m.from === 'platform';
            if (sys) return (
              <div key={i} className="text-center" style={{ margin: '12px 0' }}>
                <span className="pill pill-slate" style={{ fontSize: 11 }}>{m.text}</span>
                <div className="text-faint fs-11 mt-1">{U.fmtDateTime(m.at)}</div>
              </div>
            );
            return (
              <div key={i} className="cust-msg" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {!mine && <Avatar initials={gwInits} size={28} tone="blue"/>}
                <div className="cust-msg-bubble" data-mine={mine ? '1' : '0'}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  <div className="cust-msg-meta">{mine ? 'Sie' : gwLabel} · {U.fmtDateTime(m.at)}</div>
                </div>
                {mine && <Avatar initials={CUST_PERSONA.initials} size={28} tone="blue"/>}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
          {draftFlag === 'financial' && (
            <div className="banner warn mb-2" style={{ fontSize: 11.5 }}>
              <Icon name="alert-triangle" size={12}/>
              <span><strong>Finanz-Schlüsselwort erkannt.</strong> Diese Nachricht wird automatisch an <span className="mono">kundenservice@efactory1.de</span> weitergeleitet — Ihr Ghostwriter darf keine Preisfragen beantworten.</span>
            </div>
          )}
          {isLocked ? (
            <div className="text-muted text-center fs-12" style={{ padding: 12 }}>
              Chat wird aktiviert, sobald Ihnen ein Ghostwriter zugewiesen ist.
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                style={{ flex: 1, minHeight: 64, resize: 'vertical', padding: 10, fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }}
                placeholder="Nachricht an Ihren Ghostwriter…"
                value={text}
                onChange={(e)=>onChange(e.target.value)}
              />
              <div className="flex-col gap-1">
                <NotReady className="btn btn-sm" ariaLabel="Datei anhängen" feature="attach-file"><Icon name="paperclip" size={12}/></NotReady>
                <button type="button" className="btn btn-sm btn-primary" onClick={onSend} disabled={!text.trim()}>
                  <Icon name="send" size={12}/> Senden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-col gap-3">
        <div className="card">
          <div className="card-head"><div className="card-title">Kommunikationsregeln</div></div>
          <div className="card-pad">
            <ul className="text-muted fs-12" style={{ paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
              <li>Antwortzeit: 24 Stunden</li>
              <li>Keine Preis- oder Honorarverhandlungen mit dem GW</li>
              <li>efactory1 ist immer in CC — auch bei Direktchat</li>
              <li>Direkter Kontakt zum GW per E-Mail/Telefon möglich (Daten in der Auftragsfreigabe)</li>
              <li>Eskalation: <span className="mono">kundenservice@efactory1.de</span></li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Schnellzugriff</div></div>
          <div className="card-pad flex-col gap-2">
            <NotReady className="btn btn-sm" feature="report-dispute" style={{ justifyContent: 'flex-start' }}><Icon name="alert-triangle" size={12}/> Streitfall melden</NotReady>
            <NotReady className="btn btn-sm" feature="request-callback" style={{ justifyContent: 'flex-start' }}><Icon name="phone" size={12}/> Rückruf anfordern</NotReady>
            <a className="btn btn-sm" href="mailto:kundenservice@efactory1.de" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}><Icon name="mail" size={12}/> kundenservice@efactory1.de</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderFiles({ o, toast }) {
  const baseFiles = [
    { id: 'f-brief', kind: 'briefing', name: `${o.workType}_Briefing.pdf`, size: 184021, uploadedBy: 'customer', at: o.acceptedAt || '2026-04-01', icon: 'file-text' },
    { id: 'f-folien', kind: 'briefing', name: 'Vorlesungsfolien_Materialien.zip', size: 4182993, uploadedBy: 'customer', at: o.acceptedAt || '2026-04-01', icon: 'archive' },
  ];
  if (['active','interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','completed'].includes(o.status)) {
    baseFiles.push({ id: 'f-outline', kind: 'gw_doc', name: 'Outline_Gliederung_v2.docx', size: 92341, uploadedBy: 'gw', at: '2026-04-08T11:02:00', icon: 'file-text' });
  }
  if (['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','completed'].includes(o.status)) {
    baseFiles.push({ id: 'f-int1', kind: 'interim', name: `Zwischenstand_1_${o.workType}.docx`, size: 1281022, uploadedBy: 'gw', at: '2026-05-06T15:30:00', icon: 'upload-cloud', qaPassed: true });
  }
  if (['completed','payment_pending','delivered'].includes(o.status)) {
    baseFiles.push(
      { id: 'f-final', kind: 'final', name: `Endversion_${o.workType}_v1.pdf`, size: 2891044, uploadedBy: 'gw', at: '2026-04-10T18:00:00', icon: 'shield-check', qaPassed: true },
      { id: 'f-invoice', kind: 'invoice', name: `Rechnung_${o.id}.pdf`, size: 84201, uploadedBy: 'platform', at: '2026-04-12T08:00:00', icon: 'file-text' }
    );
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes/1024).toFixed(0) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
  };
  const kindLabels = { briefing: 'Briefing', gw_doc: 'GW-Dokument', interim: 'Zwischenstand', final: 'Endversion', invoice: 'Rechnung' };
  const kindPills  = { briefing: 'slate', gw_doc: 'blue', interim: 'teal', final: 'purple', invoice: 'amber' };
  const gwLabel = custGwLabel(o) || 'GW';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Dokumente · {baseFiles.length}</div>
          <button type="button" className="btn btn-sm" onClick={()=>toast&&toast({tone:'info',text:'Datei-Upload wird simuliert.'})}>
            <Icon name="upload-cloud" size={12}/> Hochladen
          </button>
        </div>
        <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
          {baseFiles.map(f => (
            <div key={f.id} className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.icon} size={16} className="text-faint"/>
              </div>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="strong fs-12.5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span className={`pill pill-${kindPills[f.kind]}`} style={{ fontSize: 10 }}>{kindLabels[f.kind]}</span>
                  {f.qaPassed && <span className="pill pill-green" style={{ fontSize: 10 }}><Icon name="shield-check" size={9}/> QA bestanden</span>}
                </div>
                <span className="text-faint fs-11">
                  {f.uploadedBy === 'customer' ? 'Sie' : f.uploadedBy === 'gw' ? gwLabel : 'efactory1'} ·
                  {' '}{formatSize(f.size)} · {U.fmtDateTime(f.at)}
                </span>
              </div>
              <NotReady className="btn btn-sm" ariaLabel="Vorschau" feature="file-preview"><Icon name="eye" size={12}/></NotReady>
              <button type="button" className="btn btn-sm btn-primary" title="Herunterladen" onClick={()=>toast&&toast({tone:'success',text:`${f.name} wird heruntergeladen.`})}>
                <Icon name="download" size={12}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-col gap-3">
        {(o.status === 'interim_submitted' || o.status === 'under_customer_review') && (
          <div className="card">
            <div className="card-head"><div className="card-title">Feedback geben</div></div>
            <div className="card-pad">
              <div className="text-muted fs-12 mb-3">Der Zwischenstand wartet auf Ihre Rückmeldung. Wählen Sie eine der Optionen:</div>
              <div className="flex-col gap-2">
                <button type="button" className="btn btn-success btn-sm" onClick={() => {
                  // Approve interim → order goes back to active (next interim or final to follow).
                  if (window.__patchOrder) window.__patchOrder(o.id, { status: 'active', customerSatisfied: true });
                  toast && toast({ tone: 'success', transition: { entity: `Auftrag #${o.id}`, from: 'Customer Review', to: 'Active' }, text: 'Zwischenstand freigegeben · GW arbeitet weiter' });
                }}>
                  <Icon name="check" size={12}/> Zwischenstand freigeben
                </button>
                <button type="button" className="btn btn-sm" onClick={() => {
                  if (window.__patchOrder) window.__patchOrder(o.id, { status: 'revision_required', revisionRounds: (o.revisionRounds || 0) + 1 });
                  toast && toast({ tone: 'info', transition: { entity: `Auftrag #${o.id}`, from: 'Customer Review', to: 'Revision Required' }, text: 'Überarbeitungsanfrage an GW gesendet' });
                }}>
                  <Icon name="rotate-ccw" size={12}/> Überarbeitung anfordern
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => {
                  if (window.__patchOrder) window.__patchOrder(o.id, { disputeOpen: true });
                  toast && toast({ tone: 'danger', text: 'Streitfall gemeldet · Berat prüft und meldet sich.' });
                }}>
                  <Icon name="alert-triangle" size={12}/> Streitfall melden
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-head"><div className="card-title">Was ist QA?</div></div>
          <div className="card-pad text-muted fs-12" style={{ lineHeight: 1.6 }}>
            Jede Endversion durchläuft unsere unabhängige Qualitätsprüfung — geprüft werden Plagiat, KI-Nutzung und Formatierung. Erst nach erfolgreicher QA wird Ihnen die Endversion freigegeben.
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderPayments({ o }) {
  const installments = o.installments || [];
  const totalPaid = (o.paidEur || 0);
  const totalGross = (o.grossEur || 0);
  const outstanding = Math.max(0, totalGross - totalPaid);

  const methodLabel = (m) => ({
    stripe_card: 'Kreditkarte', stripe_klarna: 'Klarna', stripe_paypal: 'PayPal', bank_transfer_sepa: 'SEPA-Überweisung',
  })[m] || (m || 'Stripe');
  const statusPill = (s) => ({
    paid: { c: 'green', l: 'Bezahlt' },
    scheduled: { c: 'slate', l: 'Geplant' },
    overdue: { c: 'red', l: 'Überfällig' },
    pending: { c: 'amber', l: 'Ausstehend' },
  })[s] || { c: 'slate', l: s };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Ratenplan · {installments.length} Raten</div>
          <span className="text-faint fs-11">Gesamt {U.EUR(totalGross)}</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Datum</th>
                <th>Methode</th>
                <th style={{ textAlign: 'right' }}>Betrag</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Rechnung</th>
              </tr>
            </thead>
            <tbody>
              {installments.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 24 }}>Noch keine Raten geplant.</td></tr>
              ) : installments.map(inst => {
                const sp = statusPill(inst.status);
                return (
                  <tr key={inst.n}>
                    <td className="mono fs-11">#{inst.n}</td>
                    <td className="mono fs-12">{U.fmtDate(inst.date)}</td>
                    <td className="text-muted fs-12">{methodLabel(inst.method)}</td>
                    <td className="mono fs-13" style={{ textAlign: 'right', fontWeight: 500 }}>{U.EUR(inst.amt)}</td>
                    <td><span className={`pill pill-${sp.c}`} style={{ fontSize: 11 }}>{sp.l}</span></td>
                    <td>
                      {inst.status === 'paid' ? (
                        <NotReady className="btn btn-sm" feature="invoice-pdf" style={{ width: '100%' }}><Icon name="download" size={11}/> PDF</NotReady>
                      ) : inst.status === 'overdue' ? (
                        <NotReady className="btn btn-sm btn-danger" feature="invoice-pay" style={{ width: '100%' }}><Icon name="alert-triangle" size={11}/> Jetzt zahlen</NotReady>
                      ) : <span className="text-faint fs-11">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex-col gap-3">
        <div className="card">
          <div className="card-head"><div className="card-title">Übersicht</div></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>Gesamtpreis</dt><dd className="mono">{U.EUR(totalGross)}</dd></div>
              <div className="kv-row"><dt>Bezahlt</dt><dd className="mono" style={{ color: 'var(--green)' }}>{U.EUR(totalPaid)}</dd></div>
              <div className="kv-row"><dt>Offen</dt><dd className="mono" style={{ color: outstanding > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{U.EUR(outstanding)}</dd></div>
            </div>
            <div className="mt-3" style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${totalGross ? (totalPaid/totalGross)*100 : 0}%`, height: '100%', background: 'var(--green)' }}/>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Hinweis</div></div>
          <div className="card-pad text-muted fs-12" style={{ lineHeight: 1.6 }}>
            Alle Rechnungen werden über <strong>Sevdesk</strong> ausgestellt. Bei Fragen zu Zahlungen wenden Sie sich an <span className="mono">kundenservice@efactory1.de</span> — Ihr Ghostwriter darf keine finanziellen Themen besprechen.
          </div>
        </div>
      </div>
    </div>
  );
}

function CustOrderDetail({ orderId, initialTab, onBack, toast }) {
  const [tab, setTab] = useStateA(initialTab || 'status');
  const all = custOrders();
  const o = all.find(x => x.id === orderId);
  if (!o) {
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-pad text-center">
          <div className="text-muted">Auftrag #{orderId} nicht gefunden.</div>
          <button type="button" className="btn mt-3" onClick={onBack}><Icon name="chevron-left" size={12}/> Zurück</button>
        </div>
      </div>
    );
  }
  const meta = custStatusMeta(o);
  const gw = custGwLabel(o);
  const wt = D.WORK_TYPE_LABELS[o.workType] || o.workType;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3" style={{ marginTop: 24 }}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
          <Icon name="chevron-left" size={12}/> Alle Aufträge
        </button>
        <span style={{ flex: 1 }}/>
        <span className={`pill pill-${meta.color}`}><Icon name={meta.icon} size={11}/> {meta.label}</span>
      </div>

      <div className="flex items-baseline gap-2" style={{ marginBottom: 6 }}>
        <span className="mono fs-13 text-faint">#{o.id}</span>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, margin: 0 }}>{wt} · {o.title}</h1>
      </div>
      <div className="text-muted fs-13" style={{ marginBottom: 14 }}>
        {o.field} · {o.pages} Seiten · Endabgabe {U.fmtDate(o.finalDeadline)}
        {gw && <> · GW <strong>{gw}</strong></>}
      </div>

      <div className="tabs" style={{ marginTop: 12 }}>
        {(() => {
          // Tabs are gated by order state so the customer doesn't see actions that aren't possible yet.
          // - Messages: only after GW is approved (active onwards)
          // - Files:    only after a draft has been uploaded (interim/final/delivered/done)
          const gwAssigned = !!o.gwId && !['available','qualified','offer_sent','invoice_sent','claimed_pending_approval','lead'].includes(o.status);
          const hasFiles   = ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status);
          const tabs = [
            { id: 'status',   label: 'Status & Meilensteine', icon: 'clock',         disabled: false, hint: null },
            { id: 'messages', label: 'Nachrichten',            icon: 'message-square', disabled: !gwAssigned, hint: 'Verfügbar, sobald Ihr Ghostwriter zugewiesen ist' },
            { id: 'files',    label: 'Dokumente',              icon: 'file-text',     disabled: !hasFiles,   hint: 'Verfügbar, sobald der erste Zwischenstand hochgeladen wurde' },
            { id: 'payments', label: 'Zahlungen',              icon: 'wallet',        disabled: false, hint: null },
          ];
          return tabs.map(t => (
            <div key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => { if (!t.disabled) setTab(t.id); }}
              title={t.disabled ? t.hint : null}
              style={t.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : null}>
              <Icon name={t.icon} size={12}/> {t.label}
              {t.disabled && <Icon name="lock" size={10} className="ml-1"/>}
            </div>
          ));
        })()}
      </div>

      {tab === 'status'   && <CustOrderStatus o={o}/>}
      {tab === 'messages' && <CustOrderChat o={o} toast={toast}/>}
      {tab === 'files'    && <CustOrderFiles o={o} toast={toast}/>}
      {tab === 'payments' && <CustOrderPayments o={o}/>}

      <CustFooterBanner/>
    </div>
  );
}

function CustMessagesList({ openOrder }) {
  const orders = custOrders().filter(o => o.gwId);
  const snippets = {
    3518: { from: 'gw',       msg: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.', at: '2026-05-06T15:30:00', unread: 1 },
    3492: { from: 'platform', msg: '✓ Endabgabe geliefert · Auftrag abgeschlossen.', at: '2026-04-12T10:30:00', unread: 0 },
  };
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Nachrichten</h1>
      <div className="text-muted mb-4">Eine Konversation pro Auftrag · efactory1 immer in CC</div>

      <div className="banner info mb-3">
        <Icon name="lock" size={14}/>
        <span>Direktnachrichten an Ihren Ghostwriter laufen über die Plattform. Finanzfragen werden automatisch an <span className="mono">kundenservice@efactory1.de</span> weitergeleitet.</span>
      </div>

      {orders.length === 0 ? (
        <div className="card"><div className="card-pad text-center text-muted">Noch keine Konversationen — Ihre Aufträge warten auf GW-Zuweisung.</div></div>
      ) : (
        <div className="card">
          <div className="flex-col">
            {orders.map((o, i) => {
              const sn = snippets[o.id] || { from: 'platform', msg: 'Konversation öffnen…', at: o.acceptedAt, unread: 0 };
              const gw = custGwLabel(o);
              const wt = D.WORK_TYPE_LABELS[o.workType];
              const initials = gw ? gw.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase() : '··';
              return (
                <div key={o.id} className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={()=>openOrder(o.id, 'messages')}>
                  <Avatar initials={initials} size={36} tone="blue"/>
                  <div className="flex-col" style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                    <div className="flex items-center gap-2">
                      <span className="strong fs-13">{gw || 'GW-Suche'}</span>
                      <span className="mono fs-11 text-faint">#{o.id}</span>
                      <span className="text-faint fs-11">· {wt}</span>
                      {sn.unread > 0 && <span className="pill pill-red" style={{ fontSize: 10 }}>{sn.unread} neu</span>}
                    </div>
                    <span className="text-faint fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 600 }}>
                      {sn.from === 'customer' && <span className="text-faint">Sie: </span>}
                      {sn.from === 'platform' && <span className="text-faint" style={{ fontStyle: 'italic' }}>System: </span>}
                      {sn.msg}
                    </span>
                  </div>
                  <span className="text-faint fs-11 mono">{U.relTime(sn.at)}</span>
                  <Icon name="chevron-right" size={14} className="text-faint"/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CustFooterBanner/>
    </div>
  );
}

function CustInvoices() {
  const orders = custOrders();
  const rows = [];
  orders.forEach(o => {
    (o.installments || []).forEach(inst => {
      rows.push({
        invoiceId: `EF-${o.id}-${inst.n}`,
        orderId: o.id,
        orderTitle: D.WORK_TYPE_LABELS[o.workType] + ' · ' + o.title,
        amount: inst.amt,
        status: inst.status,
        date: inst.date,
        method: inst.method,
      });
    });
  });
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  const statusPill = (s) => ({
    paid: { c: 'green', l: 'Bezahlt' },
    scheduled: { c: 'slate', l: 'Geplant' },
    overdue: { c: 'red', l: 'Überfällig' },
    pending: { c: 'amber', l: 'Ausstehend' },
  })[s] || { c: 'slate', l: s };

  const totalPaid = rows.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount, 0);
  const totalOutstanding = rows.filter(r=>['scheduled','overdue','pending'].includes(r.status)).reduce((s,r)=>s+r.amount, 0);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Rechnungen</h1>
      <div className="text-muted mb-4">Alle Zahlungen und Rechnungen Ihrer Aufträge</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        <div className="kpi">
          <span className="kpi-label"><Icon name="check-circle" size={12}/> Bezahlt</span>
          <span className="kpi-value">{U.EUR(totalPaid)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icon name="clock" size={12}/> Ausstehend</span>
          <span className="kpi-value">{U.EUR(totalOutstanding)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icon name="file-text" size={12}/> Anzahl</span>
          <span className="kpi-value">{rows.length}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Rechnungen ({rows.length})</div>
          <span className="text-faint fs-11">via Sevdesk</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rechnung</th>
                <th>Auftrag</th>
                <th>Datum</th>
                <th style={{ textAlign: 'right' }}>Betrag</th>
                <th>Status</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const sp = statusPill(r.status);
                return (
                  <tr key={r.invoiceId}>
                    <td className="mono fs-12">{r.invoiceId}</td>
                    <td>
                      <div className="flex-col" style={{ lineHeight: 1.25 }}>
                        <span className="fs-12.5">{r.orderTitle.length > 60 ? r.orderTitle.slice(0,60) + '…' : r.orderTitle}</span>
                        <span className="mono fs-11 text-faint">#{r.orderId}</span>
                      </div>
                    </td>
                    <td className="mono fs-12">{U.fmtDate(r.date)}</td>
                    <td className="mono fs-13" style={{ textAlign: 'right', fontWeight: 500 }}>{U.EUR(r.amount)}</td>
                    <td><span className={`pill pill-${sp.c}`} style={{ fontSize: 11 }}>{sp.l}</span></td>
                    <td>
                      {r.status === 'paid' ? <NotReady className="btn btn-sm" feature="invoice-pdf"><Icon name="download" size={11}/> PDF</NotReady> :
                       r.status === 'overdue' ? <NotReady className="btn btn-sm btn-danger" feature="invoice-pay"><Icon name="alert-triangle" size={11}/> Zahlen</NotReady> :
                       <span className="text-faint fs-11">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CustFooterBanner/>
    </div>
  );
}

function CustDownloads({ toast }) {
  const orders = custOrders();
  const groups = orders.map(o => {
    const files = [];
    if (o.acceptedAt) {
      files.push({ name: `${o.workType}_Briefing.pdf`, kind: 'briefing', size: '184 KB', uploadedBy: 'customer', at: o.acceptedAt });
    }
    if (o.gwId && ['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','completed'].includes(o.status)) {
      files.push({ name: `Zwischenstand_1.docx`, kind: 'interim', size: '1.2 MB', uploadedBy: 'gw', at: '2026-05-06T15:30:00' });
    }
    if (o.status === 'completed') {
      files.push(
        { name: `Endversion_${o.workType}.pdf`, kind: 'final', size: '2.8 MB', uploadedBy: 'gw', at: '2026-04-10T18:00:00' },
        { name: `Rechnung_${o.id}.pdf`,         kind: 'invoice', size: '84 KB', uploadedBy: 'platform', at: '2026-04-12T08:00:00' }
      );
    }
    return { o, files };
  }).filter(g => g.files.length > 0);

  const kindLabels = { briefing: 'Briefing', interim: 'Zwischenstand', final: 'Endversion', invoice: 'Rechnung' };
  const kindPills  = { briefing: 'slate', interim: 'teal', final: 'purple', invoice: 'amber' };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Downloads</h1>
      <div className="text-muted mb-4">Alle Dokumente Ihrer Aufträge an einem Ort</div>

      {groups.length === 0 ? (
        <div className="card"><div className="card-pad text-center text-muted">Noch keine Dokumente verfügbar.</div></div>
      ) : (
        <div className="flex-col gap-3">
          {groups.map(({ o, files }) => {
            const meta = custStatusMeta(o);
            const wt = D.WORK_TYPE_LABELS[o.workType];
            return (
              <div key={o.id} className="card">
                <div className="card-head">
                  <div className="flex items-center gap-2">
                    <span className="mono fs-11 text-faint">#{o.id}</span>
                    <span className="card-title">{wt} · {o.title.length > 50 ? o.title.slice(0,50) + '…' : o.title}</span>
                    <span className={`pill pill-${meta.color}`} style={{ fontSize: 10 }}>{meta.label}</span>
                  </div>
                  <span className="text-faint fs-11">{files.length} Dateien</span>
                </div>
                <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3" style={{ padding: '10px 16px', borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="file-text" size={14} className="text-faint"/>
                      </div>
                      <div className="flex-col" style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span className="fs-12.5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                          <span className={`pill pill-${kindPills[f.kind]}`} style={{ fontSize: 10 }}>{kindLabels[f.kind]}</span>
                        </div>
                        <span className="text-faint fs-11">{f.size} · {U.fmtDate(f.at)}</span>
                      </div>
                      <button type="button" className="btn btn-sm btn-primary" onClick={()=>toast&&toast({tone:'success',text:`${f.name} wird heruntergeladen.`})}>
                        <Icon name="download" size={11}/> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CustFooterBanner/>
    </div>
  );
}

function CustProfile({ toast }) {
  const me = CUST_ME;
  const orders = custOrders();
  const completedCount = orders.filter(o => custProgress(o) >= 100).length;
  const activeCount    = orders.length - completedCount;
  const ltv = orders.reduce((s, o) => s + (o.paidEur || 0), 0);

  const [notif, setNotif] = useStateA({ email: true, sms: false, milestones: true, marketing: false });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, margin: '24px 0 6px' }}>Profil</h1>
      <div className="text-muted mb-4">Ihr Konto, Benachrichtigungen und Datenschutz</div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-head"><div className="card-title">Persönliche Daten</div><NotReady className="btn btn-sm" feature="profile-edit"><Icon name="edit" size={12}/> Bearbeiten</NotReady></div>
            <div className="card-pad flex items-center gap-3 mb-3">
              <Avatar initials={me?.initials || CUST_PERSONA.initials} size={56} tone="blue"/>
              <div className="flex-col" style={{ lineHeight: 1.3 }}>
                <span className="strong" style={{ fontSize: 16 }}>{me?.name || CUST_PERSONA.user}</span>
                <span className="text-faint fs-12 mono">{me?.email || CUST_PERSONA.email}</span>
                <span className="text-faint fs-12 mono">{me?.phone}</span>
              </div>
            </div>
            <div className="kv">
              <div className="kv-row"><dt>Land</dt><dd>{me?.country || '—'}</dd></div>
              <div className="kv-row"><dt>Mitglied seit</dt><dd className="mono">2025-09-12</dd></div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Benachrichtigungen</div></div>
            <div className="card-pad flex-col gap-2">
              {[
                { k: 'email',      l: 'E-Mail bei Statusänderungen',     s: 'Standard für Meilenstein-Updates' },
                { k: 'sms',        l: 'SMS bei kritischen Updates',      s: 'Nur bei Fristen <24h' },
                { k: 'milestones', l: 'Browser-Push-Benachrichtigungen', s: 'Echtzeit-Updates wenn Sie eingeloggt sind' },
                { k: 'marketing',  l: 'Angebote & Newsletter',           s: 'Tipps zu wissenschaftlichem Schreiben' },
              ].map(item => (
                <label key={item.k} className="flex items-center gap-3" style={{ padding: '8px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={notif[item.k]} onChange={(e)=>setNotif({...notif, [item.k]: e.target.checked})}/>
                  <div className="flex-col" style={{ lineHeight: 1.3 }}>
                    <span className="fs-13">{item.l}</span>
                    <span className="text-faint fs-11">{item.s}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Datenschutz · DSGVO</div></div>
            <div className="card-pad">
              <div className="text-muted fs-12 mb-3" style={{ lineHeight: 1.6 }}>
                Sie können jederzeit eine Kopie Ihrer Daten exportieren oder die vollständige Löschung beantragen. Aktive Aufträge werden bis Abschluss aufbewahrt.
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm" onClick={()=>toast&&toast({tone:'info',text:'Datenexport wird vorbereitet — Sie erhalten eine E-Mail.'})}>
                  <Icon name="download" size={12}/> Daten exportieren
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={()=>toast&&toast({tone:'danger',text:'Löschanfrage erhalten — Bestätigung folgt per E-Mail.'})}>
                  <Icon name="trash" size={12}/> Konto löschen
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-head"><div className="card-title">Konto-Übersicht</div></div>
            <div className="card-pad">
              <div className="kv">
                <div className="kv-row"><dt>Aktive Aufträge</dt><dd className="mono">{activeCount}</dd></div>
                <div className="kv-row"><dt>Abgeschlossen</dt><dd className="mono">{completedCount}</dd></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Hilfe & Support</div></div>
            <div className="card-pad flex-col gap-2">
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="message-square" size={12}/> Live-Chat starten</a>
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="mail" size={12}/> kundenservice@efactory1.de</a>
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="file-text" size={12}/> AGB & Datenschutz</a>
              <a className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><Icon name="external-link" size={12}/> efactory1.de</a>
            </div>
          </div>
        </div>
      </div>

      <CustFooterBanner/>
    </div>
  );
}

// CustomerView is rendered by the shell router. The shell passes a `section` prop
// (orders | messages | invoices | downloads | profile) — that's the source of truth
// for the active tab. Clicking an internal tab navigates so the URL/sidebar stay in sync.
function CustomerView({ role, setRole, toast, section, navigate }) {
  const tab = section || 'orders';
  const [openOrderId, setOpenOrderId] = useStateA(null);
  const [openOrderTab, setOpenOrderTab] = useStateA('status');

  const openOrder = (id, subTab = 'status') => {
    setOpenOrderId(id);
    const map = { messages: 'messages', files: 'files', payments: 'payments', status: 'status' };
    setOpenOrderTab(map[subTab] || 'status');
    window.scrollTo(0, 0);
  };
  const closeOrder = () => { setOpenOrderId(null); window.scrollTo(0, 0); };

  // Map internal tab IDs to the shell route names so inner-tab clicks update the URL
  // and the sidebar highlight at the same time (no more divergent navigation state).
  const ROUTE_FOR_TAB = { orders: 'cust-orders', messages: 'cust-messages', invoices: 'cust-invoices', downloads: 'cust-downloads', profile: 'cust-profile' };
  const switchTab = (t) => {
    setOpenOrderId(null);
    if (navigate && ROUTE_FOR_TAB[t]) navigate(ROUTE_FOR_TAB[t]);
  };

  let body;
  if (openOrderId != null) {
    body = <CustOrderDetail orderId={openOrderId} initialTab={openOrderTab} onBack={closeOrder} toast={toast}/>;
  } else if (tab === 'messages') {
    body = <CustMessagesList openOrder={openOrder}/>;
  } else if (tab === 'invoices') {
    body = <CustInvoices/>;
  } else if (tab === 'downloads') {
    body = <CustDownloads toast={toast}/>;
  } else if (tab === 'profile') {
    body = <CustProfile toast={toast}/>;
  } else {
    body = <CustOrdersList openOrder={openOrder}/>;
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <CustHeader tab={tab} setTab={switchTab} role={role} setRole={setRole}/>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 32px' }}>
        {body}
      </div>
    </div>
  );
}


window.CustomerView = CustomerView;
})();
