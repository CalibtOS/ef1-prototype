// Fake WordPress service page hosting the f6378-style intake form.
// Lives at #/wp/hausarbeit. Outside the product shell — no sidebar, no
// product topbar. Submit calls into the sim domain action and routes the
// visitor to /wp/vielen-dank.
import React, { useState } from 'react';
import { Icon } from '../../utils.jsx';
import * as Scenarios from '../sim/scenarios.js';

function WpHausarbeit({ navigate }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    field: '',
    pages: '',
    deadline: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.name.trim() || !form.email.trim()) return;
    if (!form.field.trim() || !form.pages || !form.deadline) return;
    setSubmitting(true);
    const result = Scenarios.submitInquiry({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      subject: form.message?.split('\n')[0]?.slice(0, 80) || `Hausarbeit (${form.pages || '?'} Seiten)`,
      workType: 'hausarbeit',
      field: form.field.trim(),
      pages: form.pages,
      deadline: form.deadline,
      message: form.message,
    });
    const params = {
      tokenId: result.token.id,
      isNew: result.isNew ? 1 : 0,
      orderId: result.order.id,
    };
    navigate('wp-vielen-dank', params);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fb' }}>
      <WpHeader />
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div className="banner info" style={{ marginBottom: 20, background: 'rgba(31,98,240,0.06)', border: '1px dashed rgba(31,98,240,0.4)' }}>
          <Icon name="zap" size={14}/>
          <span><strong>Simulated marketing page.</strong> Submitting this form creates a real in-memory order and triggers the intake event chain (Sim Console).</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 600, margin: '8px 0 4px' }}>Hausarbeit Ghostwriting</h1>
        <div style={{ color: '#5b6473', marginBottom: 24, fontSize: 14 }}>
          Wissenschaftliche Hausarbeiten · termingerecht · plagiatfrei · diskret.
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 12, padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px' }}>Anfrage anfordern</h2>
          <div style={{ color: '#5b6473', fontSize: 13, marginBottom: 16 }}>
            Unverbindliches Angebot innerhalb von 24 Stunden.
          </div>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Name *">
              <input required type="text" value={form.name} onChange={update('name')} placeholder="Vor- und Nachname" style={inp}/>
            </Field>
            <Field label="E-Mail *">
              <input required type="email" value={form.email} onChange={update('email')} placeholder="ihre@email.de" style={inp}/>
            </Field>
            <Field label="Telefon">
              <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+49 …" style={inp}/>
            </Field>
            <Field label="Fachrichtung *">
              <input required type="text" value={form.field} onChange={update('field')} placeholder="z.B. BWL, Jura, Informatik" style={inp}/>
            </Field>
            <Field label="Seitenzahl *">
              <input required type="number" min={1} max={200} value={form.pages} onChange={update('pages')} placeholder="z.B. 15" style={inp}/>
            </Field>
            <Field label="Abgabetermin *">
              <input required type="date" value={form.deadline} onChange={update('deadline')} style={inp}/>
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Ihre Nachricht">
                <textarea value={form.message} onChange={update('message')} rows={4} placeholder="Thema, Schwerpunkte, ggf. Vorgaben Ihrer Hochschule …" style={{ ...inp, resize: 'vertical' }}/>
              </Field>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: '#73828f', fontSize: 12 }}>Mit dem Absenden stimmen Sie der Datenschutzerklärung zu.</span>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '10px 22px', fontSize: 14, fontWeight: 600 }}>
                {submitting ? 'Wird gesendet…' : 'Anfrage senden →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function WpHeader() {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e4e7ec' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ fontWeight: 700, letterSpacing: 0, fontSize: 22 }}>
          e<span style={{ color: '#1F62F0' }}>factory</span>
          <span style={{ fontSize: 14, color: '#5b6473' }}>1</span>
        </div>
        <nav style={{ display: 'flex', gap: 20, fontSize: 13.5, color: '#5b6473' }}>
          <span>Services</span><span>Über uns</span><span>Kontakt</span>
        </nav>
        <span style={{ flex: 1 }}/>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Simulated marketing site</span>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#34404f' }}>{label}</span>
      {children}
    </label>
  );
}

const inp = {
  border: '1px solid #d4d8df',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13.5,
  background: '#fff',
  outline: 'none',
};

export { WpHausarbeit };
