// GW · First contact — initial customer message after claim approval.

// ====================================================================
// GW — First-contact wizard (SOP D)
// ====================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

function GWFirstContact({ orderId, navigate, toast }) {
  const order = EFHooks.useOrder(orderId);
  const cust = order ? D.customer(order.customerId) : null;
  const gwSelf = order?.gwId ? D.gw(order.gwId) : null;
  const gwSignName = gwSelf?.name || 'Ihr Ghostwriter';
  const receiptAlreadyConfirmed = !!order?.firstContactReceiptConfirmedAt;
  const baseBody = order ? `Hallo ${cust?.name?.split(' ')[0] || ''},

ich freue mich, dass ich Ihren Auftrag übernehmen darf. Kurz zur Bestätigung:

• Thema: ${order.titleTBD ? '„folgt — ich freue mich auf Ihren Vorschlag"' : order.title}
• Umfang: ${order.pages} Seiten · ${order.field}
• Endabgabe: ${U.fmtDate(order.finalDeadline)}, 18:00 Uhr
${order.interimDeadline ? '• Zwischenstand 1: ' + U.fmtDate(order.interimDeadline) + ', 18:00 Uhr\n' : ''}
So arbeiten wir ab jetzt zusammen:
Sie lesen diese Nachricht direkt im Auftragsbereich der efactory1-Plattform — hier läuft ab jetzt unser gesamter Austausch. Bitte antworten Sie einfach hier im Chat. Im Auftragsbereich finden Sie:
• unseren Nachrichtenverlauf — Fragen und Rückmeldungen jederzeit
• alle Dateien und Unterlagen
• Zwischenstände und die Endabgabe
• alle Updates zum Fortschritt

Bitte laden Sie als Erstes direkt im Auftragsbereich hoch:
• Ggf. Formatierungs-/Zitierrichtlinie der Hochschule
• Bestehendes Exposé / Gliederung (falls vorhanden)
• Spezifische Wünsche oder Sperrthemen

Gut zu wissen:
• Fragen zu Preisen, Raten oder Rechnungen richten Sie bitte an kundenservice@efactory1.de — diese darf ich nicht beantworten.
• Antwortzeit von meiner Seite: i. d. R. innerhalb von 24 Stunden, Mo–Fr 18–23 Uhr.

Beste Grüße
${gwSignName}` : '';
  const [step, setStep] = useState(receiptAlreadyConfirmed ? 2 : 1);
  const [confirmed, setConfirmed] = useState(receiptAlreadyConfirmed);
  const [body, setBody] = useState(baseBody);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!order) return;
    setBody(baseBody);
  }, [order?.id]);

  useEffect(() => {
    if (!receiptAlreadyConfirmed) return;
    setConfirmed(true);
    setStep(s => Math.max(s, 2));
  }, [receiptAlreadyConfirmed]);

  if (!order) return <div className="page">Assignment not found.</div>;

  const finishConfirm = () => {
    const ok = EFActions.gw.confirmFirstContactReceipt(order.id);
    if (!ok) return;
    setConfirmed(true);
    setStep(2);
    toast && toast({ text: 'Receipt confirmed to efactory1 · proceed to your introduction', tone: 'success' });
  };
  const postIntro = () => {
    if (sending) return;
    setSending(true);
    const msg = EFActions.gw.completeFirstContact(order.id, { body });
    if (!msg) {
      setSending(false);
      return;
    }
    toast && toast({
      text: `Introduction posted to the order chat — ${cust?.name} notified by email to open it`,
      tone: 'success',
    });
    setTimeout(() => navigate('order-detail', { id: orderId }), 600);
  };

  if (order.firstContactDone) {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${orderId}`, 'Introduction']}/>
            <h1 className="page-title" style={{ marginTop: 6 }}>Introduction complete · #{orderId}</h1>
            <div className="page-subtitle">Posted to the order chat — communication now continues in the platform.</div>
          </div>
          <div className="page-actions">
            <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
          </div>
        </div>
        <div className="card">
          <div className="card-pad flex-col gap-3">
            <div className="banner success">
              <Icon name="check-circle" size={14}/>
              <span>Introduction posted to the order chat — the customer was notified by email to open it. All further communication stays in the platform.</span>
            </div>
            <div className="kv" style={{ fontSize: 12 }}>
              <div className="kv-row"><dt>Receipt confirmed</dt><dd>{order.firstContactReceiptConfirmedAt ? U.relTime(order.firstContactReceiptConfirmedAt) : 'Recorded'}</dd></div>
              <div className="kv-row"><dt>Introduction posted</dt><dd>{order.firstContactDoneAt ? U.relTime(order.firstContactDoneAt) : 'Posted'} · order chat</dd></div>
              <div className="kv-row"><dt>Order chat</dt><dd className="mono">{order.firstContactChatId || 'order chat'}</dd></div>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('order-detail', { id: orderId })} style={{ alignSelf: 'flex-start' }}>
              <Icon name="chevron-left" size={14}/> Back to assignment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${orderId}`, 'Introduction']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Introduce yourself to {cust?.name?.split(' ')[0] || 'the customer'} · #{orderId}</h1>
          <div className="page-subtitle">Confirm receipt to efactory1, then post your introduction to the order chat. The customer gets an email with a link to open the chat — you never see their email address.</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      <div className="card mb-3"><div className="card-pad flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
        {[
          { i: 1, label: 'Confirm receipt to efactory1' },
          { i: 2, label: 'Post introduction to order chat' },
        ].map(s => (
          <div key={s.i} className="flex items-center gap-2" style={{ flex: 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: step > s.i || (step === s.i && step === 2 && confirmed) ? 'var(--green)' : step === s.i ? 'var(--blue)' : 'var(--surface-2)', color: step >= s.i ? 'white' : 'var(--text-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {step > s.i || (s.i === 1 && confirmed) ? <Icon name="check" size={14}/> : <span className="fs-12 strong">{s.i}</span>}
            </div>
            <span className={`fs-12 ${step === s.i ? 'strong' : 'text-faint'}`}>{s.label}</span>
            {s.i === 1 && <div style={{ flex: 1, height: 2, background: confirmed ? 'var(--green)' : 'var(--border)' }}/>}
          </div>
        ))}
      </div></div>

      {step === 1 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span><strong>Step 1 · Confirm receipt.</strong> Reply to the assignment email so Berat knows you've started. The platform records this in the audit log.</span>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
            <div className="fs-11 text-muted mb-1">Reply to: berat@efactory1.de</div>
            <div className="fs-12 strong mb-1">Re: Auftragszuteilung #{orderId}</div>
            <div className="fs-12" style={{ lineHeight: 1.55 }}>
              Auftrag erhalten und bestätigt · ich nehme heute Kontakt zum Kunden auf.<br/>
              Zwischenstand 1 plane ich auf {order.interimDeadline ? U.fmtDate(order.interimDeadline) : U.fmtDate(order.finalDeadline)}, vor 18:00 Uhr.<br/>
              Beste Grüße — {gwSelf?.name?.split(' ')[0] || gwSignName}
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={finishConfirm} style={{ alignSelf: 'flex-start' }}><Icon name="check" size={14}/> Confirm receipt to efactory1</button>
        </div></div>
      )}

      {step === 2 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span><strong>This is your first message in the order chat.</strong> It posts as a chat message to {cust?.name?.split(' ')[0] || 'the customer'} — you never see their email address and never email them directly. The platform notifies them by email with a link to open the chat. From here on, all communication, files, and updates stay in the order chat. The message below tells the customer exactly that.</span>
          </div>
          <div className="field"><label>Posts to</label><input value={`Order chat · #${orderId} (Customer · You · Berat)`} disabled style={{ background: 'var(--surface-2)' }}/></div>
          <div className="field"><label>Your introduction message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} style={{ width: '100%', minHeight: 340, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)', lineHeight: 1.55 }}/>
            <div className="text-faint fs-11 mt-1">Template includes: topic confirmation, scope, deadlines, and the handover into the platform order chat (where files, updates, and interim/final discussion happen). Response SLA included.</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={postIntro} disabled={sending || !body.trim()} style={{ alignSelf: 'flex-start' }}><Icon name="send" size={14}/> {sending ? 'Posting…' : 'Post introduction to chat'}</button>
        </div></div>
      )}
    </div>
  );
}

export { GWFirstContact };
