// Customer-side acceptance + checkout modal. Opens from the order card's
// "Angebot ansehen" CTA when status === 'offer_sent'. Collects billing
// address, payment method, AGB. Calls EFActions.orders.acceptOffer.
//
// After acceptance:
//   - Stripe methods navigate to the fake Stripe Checkout page (#/sim/sim-stripe-checkout)
//   - Bank transfer stays in the dashboard and shows the IBAN/reference panel
import React, { useMemo, useState } from 'react';
import { Icon } from '../../utils.jsx';
import EFActions from '../core/actions.js';

const METHODS = [
  { id: 'stripe_card',       label: 'Kreditkarte',            sub: 'Sofort · einmalig',           icon: 'wallet' },
  { id: 'stripe_klarna',     label: 'Klarna · 3 Raten',       sub: 'Heute 1/3 fällig',            icon: 'wallet' },
  { id: 'stripe_paypal',     label: 'PayPal',                 sub: 'Sofort · einmalig',           icon: 'wallet' },
  { id: 'bank_transfer_sepa', label: 'Banküberweisung (SEPA)', sub: 'Manuelle Bestätigung · 1-3 Tage', icon: 'file-text' },
];

function money(n) {
  return `${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function CheckoutModal({ order, customer, onClose, onAccepted }) {
  const [paymentMethod, setPaymentMethod] = useState('stripe_card');
  const [billing, setBilling] = useState({
    name: customer?.name || '',
    street: '',
    zip: '',
    city: '',
    country: customer?.country || 'DE',
  });
  const [agb, setAgb] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const total = order?.grossEur || 0;
  const dueNow = useMemo(() => {
    if (paymentMethod === 'stripe_klarna') return Math.round((total / 3) * 100) / 100;
    if (paymentMethod === 'bank_transfer_sepa') return Math.round((total / 2) * 100) / 100;
    return total;
  }, [paymentMethod, total]);

  const canSubmit = agb && billing.name.trim() && billing.street.trim() && billing.zip.trim() && billing.city.trim() && !submitting;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const res = EFActions.orders.acceptOffer(order.id, {
      paymentMethod,
      billingAddress: { ...billing },
      marketingOptIn: marketing,
    });
    if (!res?.ok) {
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onAccepted && onAccepted({ ...res, paymentMethod });
  };

  return (
    <div role="dialog" aria-label="Angebot annehmen" style={backdrop}>
      <div style={panel}>
        <div style={head}>
          <Icon name="file-text" size={16}/>
          <strong style={{ fontSize: 14 }}>Angebot {order?.sevdeskOfferNo || `#${order?.id}`} annehmen</strong>
          <span style={{ flex: 1 }}/>
          <button type="button" className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>

        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
          <div style={{ padding: '18px 22px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto', maxHeight: '70vh' }}>
            <Section title="1 · Rechnungsadresse">
              <Row>
                <Field label="Name *"><input required value={billing.name} onChange={e => setBilling(p => ({ ...p, name: e.target.value }))} style={inp}/></Field>
                <Field label="Land"><input value={billing.country} onChange={e => setBilling(p => ({ ...p, country: e.target.value }))} style={inp}/></Field>
              </Row>
              <Field label="Straße + Hausnummer *"><input required value={billing.street} onChange={e => setBilling(p => ({ ...p, street: e.target.value }))} style={inp}/></Field>
              <Row>
                <Field label="PLZ *"><input required value={billing.zip} onChange={e => setBilling(p => ({ ...p, zip: e.target.value }))} style={inp}/></Field>
                <Field label="Ort *"><input required value={billing.city} onChange={e => setBilling(p => ({ ...p, city: e.target.value }))} style={inp}/></Field>
              </Row>
            </Section>

            <Section title="2 · Zahlmethode">
              <div style={{ display: 'grid', gap: 8 }}>
                {METHODS.map(m => (
                  <label key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${paymentMethod === m.id ? 'var(--blue)' : 'var(--border)'}`,
                    background: paymentMethod === m.id ? 'rgba(31,98,240,0.05)' : 'var(--surface)',
                    cursor: 'pointer',
                  }}>
                    <input type="radio" name="pm" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)}/>
                    <Icon name={m.icon} size={14} className="text-faint"/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{m.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="3 · Bestätigung">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.45 }}>
                <input type="checkbox" checked={agb} onChange={e => setAgb(e.target.checked)} style={{ marginTop: 2 }}/>
                <span>Ich akzeptiere die AGB (v3.2) und die Datenschutzerklärung von efactory1.</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.45, marginTop: 8 }}>
                <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} style={{ marginTop: 2 }}/>
                <span>Ich möchte gelegentlich Tipps & Angebote von efactory1 per E-Mail erhalten (optional).</span>
              </label>
            </Section>
          </div>

          <div style={{ padding: '18px 22px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Zusammenfassung</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{order?.title}</div>
            <Row><span style={lbl}>Pos.</span><span style={val}>{order?.pages || 0} Seiten</span></Row>
            <Row><span style={lbl}>Angebot</span><span style={val}>{order?.sevdeskOfferNo || '—'}</span></Row>
            <Row><span style={lbl}>Gesamtbetrag</span><span style={val}>{money(total)}</span></Row>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }}/>
            <Row><span style={{ ...lbl, fontSize: 13 }}>Heute fällig</span><span style={{ ...val, fontSize: 16, fontWeight: 700 }}>{money(dueNow)}</span></Row>
            {paymentMethod === 'stripe_klarna' && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Verbleibende 2 Raten werden monatlich abgebucht.</div>}
            {paymentMethod === 'bank_transfer_sepa' && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Sie erhalten die SEPA-Daten nach Bestätigung.</div>}
            <button type="submit" disabled={!canSubmit} className="btn btn-primary" style={{ marginTop: 10, padding: '12px 16px', fontSize: 13.5, fontWeight: 600 }}>
              {submitting ? 'Wird übermittelt…' : (paymentMethod === 'bank_transfer_sepa' ? 'Bestätigen & SEPA anzeigen' : 'Bestätigen & bezahlen')}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              <Icon name="lock" size={11}/> efactory1 ist Ihre Vertragspartnerin.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}
function Row({ children }) { return <div style={{ display: 'flex', gap: 8 }}>{children}</div>; }
function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{label}</span>
      {children}
    </label>
  );
}

const backdrop = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 220, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px', overflow: 'auto' };
const panel = { width: 880, maxWidth: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 30px 60px rgba(0,0,0,0.2)', overflow: 'hidden' };
const head = { padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 };
const inp = { width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, background: 'var(--surface)' };
const lbl = { fontSize: 12, color: 'var(--text-3)', flex: 1 };
const val = { fontSize: 12.5, color: 'var(--text)', fontWeight: 500 };

export { CheckoutModal };
