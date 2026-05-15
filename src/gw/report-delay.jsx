// GW · Report delay — request a deadline shift before D-2.

import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

function GWReportDelay({ orderId, navigate, toast }) {
  const order = D.order(orderId);
  if (!order) return <div className="page">Assignment not found.</div>;
  const cust = D.customer(order.customerId);
  const [reason, setReason] = useState('');
  const [reasonKind, setReasonKind] = useState('illness');
  const [newDate, setNewDate] = useState('');
  const [customerInformed, setCustomerInformed] = useState(false);
  const [phase, setPhase] = useState('form'); // form | sending | sent
  const [sentSteps, setSentSteps] = useState({ customer: false, kundenservice: false });

  const valid = reason.trim().length > 10 && newDate;

  const send = () => {
    setPhase('sending');
    // Simulate dual notification
    setTimeout(() => setSentSteps({ customer: true, kundenservice: false }), 600);
    setTimeout(() => {
      setSentSteps({ customer: true, kundenservice: true });
      EFActions.gw.reportDelay(orderId, { reasonKind, reason, newDate, customerInformed });
      toast({
        tone: 'info',
        transition: { entity: `Order #${orderId}`, from: 'Active', to: 'Delay Reported' },
        text: 'Customer + kundenservice notified · awaiting admin review',
      });
      setPhase('sent');
    }, 1400);
  };

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${orderId}`, 'Report delay']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Report delay · #{orderId}</h1>
          <div className="page-subtitle">SOP B · dual-channel notification: customer AND kundenservice@efactory1.de — simultaneous</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      {phase === 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="alert-triangle" size={14}/>
            <span><strong>Act immediately.</strong> Per SOP B, you must notify both the customer AND efactory1 simultaneously — not sequentially. Acting late further damages trust.</span>
          </div>
          <div className="kv" style={{ fontSize: 12 }}>
            <div className="kv-row"><dt>Customer</dt><dd>{cust?.name}</dd></div>
            <div className="kv-row"><dt>Original final deadline</dt><dd className="mono">{U.fmtDate(order.finalDeadline)}, 18:00</dd></div>
            <div className="kv-row"><dt>Order</dt><dd>{D.WORK_TYPE_LABELS[order.workType]} · {order.pages} pages</dd></div>
          </div>
          <div className="field"><label>Reason</label>
            <select value={reasonKind} onChange={e => setReasonKind(e.target.value)}>
              <option value="illness">Illness (Krankheit)</option>
              <option value="emergency">Personal emergency (Notfall)</option>
              <option value="scope">Scope clarification needed</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field"><label>Brief description (sent verbatim)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Z. B. Akute Erkrankung mit AU bis Freitag — kann den Zwischenstand am Montag liefern." style={{ width: '100%', minHeight: 90, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}/>
            <div className="text-faint fs-11 mt-1">Min. 10 characters · written in German for the customer email.</div>
          </div>
          <div className="field"><label>Proposed new delivery date</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}/>
          </div>
          <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={customerInformed} onChange={e => setCustomerInformed(e.target.checked)}/>
            <span className="fs-12">I have already informed the customer separately (informational; platform sends both notifications regardless)</span>
          </label>
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="zap" size={12}/>
            <span>On submit, two emails fire simultaneously: <code className="mono">{cust?.email}</code> + <code className="mono">kundenservice@efactory1.de</code>. Order moves to <strong>On hold</strong> with new proposed date.</span>
          </div>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={send} style={{ justifyContent: 'center' }}>
            <Icon name="alert-triangle" size={14}/> Send dual notification
          </button>
        </div></div>
      )}

      {phase !== 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span>Sending dual notification — both recipients in parallel.</span>
          </div>
          {[
            { id: 'customer', label: `Email → ${cust?.name} <${cust?.email}>`, body: 'Liebe/r ' + (cust?.name?.split(' ')[0] || 'Kunde') + ', ich muss leider eine Verzögerung melden. Grund: ' + reasonKind + '. Neuer Liefertermin: ' + newDate + '.' },
            { id: 'kundenservice', label: 'Email → kundenservice@efactory1.de', body: `Customer ${cust?.name} · Order #${orderId} · reason ${reasonKind} · new date ${newDate} · customer informed: ${customerInformed ? 'yes' : 'no'}` },
          ].map(e => {
            const sent = sentSteps[e.id];
            return (
              <div key={e.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: sent ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="mail" size={14}/>
                  <span className="fs-12 strong">{e.label}</span>
                  <span style={{ flex: 1 }}/>
                  {sent ? <span className="pill pill-green"><Icon name="check" size={10}/> Sent</span> : <span className="pill pill-blue"><Icon name="zap" size={10}/> Sending…</span>}
                </div>
                <div className="text-muted fs-11" style={{ lineHeight: 1.5 }}>{e.body}</div>
                <div style={{ marginTop: 8, height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: sent ? '100%' : '40%', height: '100%', background: sent ? 'var(--green)' : 'var(--blue)', transition: 'width .6s ease' }}/>
                </div>
              </div>
            );
          })}
          {phase === 'sent' && (
            <div className="banner success">
              <Icon name="check-circle" size={14}/>
              <div>
                <strong>Notification sent.</strong> Order <span className="mono">#{orderId}</span> is now <strong>On hold</strong>. Resume work as soon as you can; tell both parties when you're back on track.
              </div>
            </div>
          )}
          {phase === 'sent' && (
            <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })} style={{ alignSelf: 'flex-start' }}>
              <Icon name="chevron-left" size={14}/> Back to assignment
            </button>
          )}
        </div></div>
      )}
    </div>
  );
}

export { GWReportDelay };
