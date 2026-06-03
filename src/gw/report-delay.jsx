// GW · Report delay — propose a new deadline for the customer to approve.

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
  const [phase, setPhase] = useState('form'); // form | sent

  const valid = reason.trim().length > 10 && newDate;

  const send = () => {
    const ok = EFActions.gw.reportDelay(orderId, { reasonKind, reason, newDate });
    if (!ok) return;
    toast({
      tone: 'info',
      transition: { entity: `Order #${orderId}`, from: 'Active', to: 'Delay Reported' },
      text: 'New deadline proposed · awaiting customer approval · efactory1 informed',
    });
    setPhase('sent');
  };

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Ghostwriter', 'My Assignments', `#${orderId}`, 'Report delay']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Report delay · #{orderId}</h1>
          <div className="page-subtitle">SOP B · propose a new deadline — the customer approves it in the platform; efactory1 is informed</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })}><Icon name="chevron-left" size={14}/> Back</button>
        </div>
      </div>

      {phase === 'form' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="alert-triangle" size={14}/>
            <span><strong>Act immediately.</strong> Per SOP B, report a foreseeable delay as soon as you know — and propose a realistic new date. The customer must approve the new deadline before it takes effect.</span>
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
          <div className="field"><label>Brief description (shown to the customer)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Z. B. Akute Erkrankung mit AU bis Freitag — kann den Zwischenstand am Montag liefern." style={{ width: '100%', minHeight: 90, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}/>
            <div className="text-faint fs-11 mt-1">Min. 10 characters · written in German — the customer sees this with your proposed date.</div>
          </div>
          <div className="field"><label>Proposed new delivery date</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}/>
          </div>
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="zap" size={12}/>
            <span>On submit, the order moves to <strong>Delay reported</strong>. The customer is asked <strong>in the platform</strong> to approve the new date (they also get an email link); efactory1 is informed and can step in. The new deadline applies <strong>only after the customer approves</strong>.</span>
          </div>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={send} style={{ justifyContent: 'center' }}>
            <Icon name="send" size={14}/> Propose new deadline
          </button>
        </div></div>
      )}

      {phase === 'sent' && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner success">
            <Icon name="check-circle" size={14}/>
            <div>
              <strong>New deadline proposed.</strong> {cust?.name} has been asked to approve <span className="mono">{newDate}</span> in the platform; efactory1 is informed. Order <span className="mono">#{orderId}</span> is now <strong>Delay reported</strong>.
            </div>
          </div>
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="info" size={12}/>
            <span>You'll be notified once the customer approves. When you're back on track, post an update in the order chat so the customer and efactory1 know (SOP B).</span>
          </div>
          <button type="button" className="btn" onClick={() => navigate('order-detail', { id: orderId })} style={{ alignSelf: 'flex-start' }}>
            <Icon name="chevron-left" size={14}/> Back to assignment
          </button>
        </div></div>
      )}
    </div>
  );
}

export { GWReportDelay };
