// Fake Stripe Checkout page rendered at #/sim/sim-stripe-checkout?sid=…
// Lives outside the product shell (sim role) — clearly labelled as a
// simulator. Pay / Fail / Cancel buttons resolve the session and (on
// success) call EFActions.orders.confirmPayment with the right installment.
import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import * as DomainEvents from '../core/events.js';
import * as SimCheckout from './checkout.js';
import * as SimEvents from './events.js';
import { paymentMethodLabel } from './mail.js';

function money(n) {
  return `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function FakeStripeCheckout({ params, navigate, switchRole }) {
  const sid = params?.sid;
  const selectSession = useMemo(() => (state) => sid ? state.entities.checkout_sessions?.byId?.[sid] || null : null, [sid]);
  const session = EFHooks.useStore(selectSession);
  const [busy, setBusy] = useState(null); // 'pay' | 'fail' | 'cancel' | null

  useEffect(() => {
    if (!session) return;
    if (session.status === 'succeeded' || session.status === 'failed' || session.status === 'cancelled') {
      const t = setTimeout(() => returnToCustomer(session.orderId), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [session?.status, session?.orderId]);

  function returnToCustomer() {
    if (switchRole) switchRole('customer', 'cust-orders', {});
    else if (navigate) navigate('cust-orders', {});
  }

  if (!session) {
    return (
      <div style={page}>
        <div style={emptyCard}>
          <Icon name="alert-triangle" size={20}/>
          <div>Session nicht gefunden.</div>
          <button type="button" className="btn" onClick={() => returnToCustomer()}>Zurück zum Dashboard</button>
        </div>
      </div>
    );
  }

  const pay = () => {
    setBusy('pay');
    SimEvents.emit({
      source: 'customer',
      kind: 'customer.payment.start',
      orderId: session.orderId,
      customerId: session.customerId,
      scenarioId: session.scenarioId,
      detail: { sid: session.id, method: session.method },
    });
    setTimeout(() => {
      SimCheckout.patchSession(session.id, { status: 'succeeded', resolvedAt: new Date().toISOString() });
      EFActions.orders.confirmPayment(session.orderId, {
        installmentN: session.installmentN,
        paymentMethodChoice: session.method,
      });
    }, 1400);
  };
  const fail = () => {
    setBusy('fail');
    setTimeout(() => {
      SimCheckout.patchSession(session.id, { status: 'failed', resolvedAt: new Date().toISOString() });
      DomainEvents.emit('payment.failed', {
        orderId: session.orderId,
        customerId: session.customerId,
        scenarioId: session.scenarioId,
        sid: session.id,
        installmentN: session.installmentN,
        amount: session.amount,
        method: session.method,
      });
      SimEvents.emit({
        source: 'stripe',
        kind: 'stripe.webhook.payment_intent.failed',
        orderId: session.orderId,
        customerId: session.customerId,
        scenarioId: session.scenarioId,
        detail: { sid: session.id, method: session.method },
      });
    }, 900);
  };
  const cancel = () => {
    setBusy('cancel');
    SimCheckout.patchSession(session.id, { status: 'cancelled', resolvedAt: new Date().toISOString() });
    SimEvents.emit({
      source: 'customer',
      kind: 'customer.payment.cancel',
      orderId: session.orderId,
      customerId: session.customerId,
      scenarioId: session.scenarioId,
      detail: { sid: session.id },
    });
  };

  const resolved = session.status !== 'pending';

  return (
    <div style={page}>
      <div style={cardWrap}>
        <div style={brandBar}>
          <span style={{ fontWeight: 700, color: '#635bff', fontSize: 20, letterSpacing: '-0.02em' }}>stripe</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>[SIM] Simulator · keine echte Zahlung</span>
        </div>
        <div style={cardBody}>
          <div style={{ fontSize: 13, color: '#5b6473' }}>eFactory1 — Bery Ventures GmbH</div>
          <div style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 14px' }}>Auftrag #{session.orderId}</div>
          <div style={{ borderTop: '1px solid #e4e7ec', borderBottom: '1px solid #e4e7ec', padding: '14px 0', marginBottom: 18 }}>
            <Row label={`Zahlmethode`} value={paymentMethodLabel(session.method)}/>
            {session.installmentN > 0 && <Row label="Rate" value={`${session.installmentN}`}/>}
            <Row label="Heute fällig" value={money(session.amount)} bold/>
          </div>
          {session.status === 'pending' && (
            <button type="button" onClick={pay} disabled={!!busy} style={payBtn}>
              {busy === 'pay' ? 'Wird verarbeitet…' : `Bezahlen ${money(session.amount)} →`}
            </button>
          )}
          {session.status === 'succeeded' && (
            <div style={{ ...stateBox, background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
              <Icon name="check" size={16}/> Zahlung bestätigt. Sie werden weitergeleitet…
            </div>
          )}
          {session.status === 'failed' && (
            <div style={{ ...stateBox, background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              <Icon name="alert-triangle" size={16}/> Zahlung fehlgeschlagen. Weiterleitung…
            </div>
          )}
          {session.status === 'cancelled' && (
            <div style={{ ...stateBox, background: 'rgba(100,116,139,0.08)', color: '#64748b' }}>
              <Icon name="x" size={16}/> Vorgang abgebrochen. Weiterleitung…
            </div>
          )}
        </div>
        <div style={demoBar}>
          <Icon name="zap" size={11}/>
          <span style={{ fontWeight: 600, marginRight: 6 }}>Demo-Steuerung:</span>
          <button type="button" onClick={pay} disabled={resolved || !!busy} style={demoBtn}>Pay</button>
          <button type="button" onClick={fail} disabled={resolved || !!busy} style={demoBtn}>Fail</button>
          <button type="button" onClick={cancel} disabled={resolved || !!busy} style={demoBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#5b6473', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#0f172a', fontSize: 13, fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

const page = { minHeight: 'calc(100vh - 40px)', background: '#f6f9fc', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' };
const cardWrap = { width: 480, maxWidth: '100%', background: '#fff', border: '1px solid #e4e7ec', borderRadius: 12, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', overflow: 'hidden' };
const brandBar = { padding: '16px 22px', borderBottom: '1px solid #e4e7ec', display: 'flex', alignItems: 'center' };
const cardBody = { padding: '22px 22px' };
const payBtn = { width: '100%', padding: '13px 16px', borderRadius: 8, background: '#635bff', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const stateBox = { padding: '12px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 };
const demoBar = { padding: '10px 16px', background: '#fafbfd', borderTop: '1px dashed #d4d8df', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#5b6473' };
const demoBtn = { padding: '4px 10px', border: '1px solid #d4d8df', background: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' };
const emptyCard = { background: '#fff', border: '1px solid #e4e7ec', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' };

export { FakeStripeCheckout };
