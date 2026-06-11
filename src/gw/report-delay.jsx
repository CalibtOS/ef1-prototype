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
  const [sentSteps, setSentSteps] = useState({ chat: false, review: false });

  const valid = reason.trim().length > 10 && newDate;

  const send = () => {
    setPhase('sending');
    // Simulate the platform filing: chat post first, then the review ticket.
    setTimeout(() => setSentSteps({ chat: true, review: false }), 600);
    setTimeout(() => {
      setSentSteps({ chat: true, review: true });
      EFActions.gw.reportDelay(orderId, { reasonKind, reason, newDate, customerInformed });
      toast({
        tone: 'info',
        transition: { entity: `Order #${orderId}`, from: 'Active', to: 'Delay Reported' },
        text: 'Delay posted to the order chat · awaiting efactory1 review',
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
          <div className="page-subtitle">Filed in the platform · posts to the order chat — efactory1 reviews, the customer approves any new date</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      {phase === 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="alert-triangle" size={14}/>
            <span><strong>Act immediately.</strong> Report a delay the moment you see it coming — the report posts to the order chat, where the customer and efactory1 (Berat) both see it. Acting late further damages trust.</span>
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
          <div className="field"><label>Brief description (posted verbatim to the order chat)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Z. B. Akute Erkrankung mit AU bis Freitag — kann den Zwischenstand am Montag liefern." style={{ width: '100%', minHeight: 90, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}/>
            <div className="text-faint fs-11 mt-1">Min. 10 characters · written in German — the customer reads it in the order chat.</div>
          </div>
          <div className="field"><label>Proposed new delivery date</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}/>
          </div>
          <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={customerInformed} onChange={e => setCustomerInformed(e.target.checked)}/>
            <span className="fs-12">I&apos;ve already mentioned this in the order chat (informational — the structured report is filed regardless)</span>
          </label>
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="zap" size={12}/>
            <span>On submit, the report posts to the order chat and goes to efactory1 for review — the customer approves the new date before the deadline moves. Order moves to <strong>On hold</strong> with the proposed date.</span>
          </div>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={send} style={{ justifyContent: 'center' }}>
            <Icon name="send" size={14}/> File delay report
          </button>
        </div></div>
      )}

      {phase !== 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span>Filing the delay report — order chat + efactory1 review.</span>
          </div>
          {[
            { id: 'chat', icon: 'message-square', label: `Order chat → ${cust?.name?.split(' ')[0] || 'customer'} + efactory1 (Berat)`, body: 'Liebe/r ' + (cust?.name?.split(' ')[0] || 'Kunde') + ', ich muss leider eine Verzögerung melden. Grund: ' + reasonKind + '. Vorgeschlagener neuer Liefertermin: ' + newDate + '.' },
            { id: 'review', icon: 'shield-check', label: 'Review → efactory1 · proposed new date', body: `Order #${orderId} · reason ${reasonKind} · proposed ${newDate} · flagged in chat: ${customerInformed ? 'yes' : 'no'} · customer approval required before the deadline moves` },
          ].map(e => {
            const sent = sentSteps[e.id];
            return (
              <div key={e.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: sent ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={e.icon} size={14}/>
                  <span className="fs-12 strong">{e.label}</span>
                  <span style={{ flex: 1 }}/>
                  {sent ? <span className="pill pill-green"><Icon name="check" size={10}/> Done</span> : <span className="pill pill-blue"><Icon name="zap" size={10}/> Filing…</span>}
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
                <strong>Delay reported.</strong> Order <span className="mono">#{orderId}</span> is now <strong>On hold</strong>. The customer sees your report in the order chat, and efactory1 will confirm the new date with them — keep posting progress updates in the chat.
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
