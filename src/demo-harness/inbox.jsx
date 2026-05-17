// Demo Inbox drawer. Lives in the demo harness — never appears as a
// Customer/Admin/GW sidebar route. Shows simulated emails filtered by
// persona. Magic-link CTAs consume tokens and route the visitor.
import React, { useMemo, useState } from 'react';
import { Icon } from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import * as SimMail from '../sim/mail.js';
import * as Scenarios from '../sim/scenarios.js';

function relTime(at) {
  if (!at) return '';
  const t = new Date(at).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.round(diff / 60)} Min`;
  if (diff < 86400) return `vor ${Math.round(diff / 3600)} Std`;
  return new Date(at).toLocaleDateString('de-DE');
}

function shallowArrayEq(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function useEmailsForRole(role) {
  const selector = useMemo(() => (state) => SimMail.listForRole(state, role), [role]);
  return EFHooks.useStore(selector, shallowArrayEq);
}

function DemoInbox({ onClose, navigate, switchRole }) {
  const [persona, setPersona] = useState('customer');
  const [selectedId, setSelectedId] = useState(null);
  const list = useEmailsForRole(persona);
  const selected = list.find(e => e.id === selectedId) || null;

  const handleCta = (email) => {
    const cta = email.cta;
    if (!cta) return;
    if (!email.read) SimMail.markRead(email.id);
    if (cta.action === 'consume_token' && cta.tokenId) {
      const res = Scenarios.consumeFirstLoginAndAttach(cta.tokenId);
      if (res.ok) {
        onClose && onClose();
        switchRole && switchRole('customer', 'cust-orders', { orderId: cta.orderId });
      } else {
        alert(`Link ${res.reason === 'expired' ? 'ist abgelaufen' : res.reason === 'already_consumed' ? 'wurde bereits verwendet' : 'ist ungültig'}.`);
      }
      return;
    }
    if (cta.action === 'open_customer_dashboard') {
      onClose && onClose();
      switchRole && switchRole('customer', 'cust-orders', { orderId: cta.orderId });
      return;
    }
    if (cta.action === 'open_admin_order') {
      onClose && onClose();
      switchRole && switchRole('admin', 'order-detail', { id: cta.orderId, ...(cta.tab ? { tab: cta.tab } : {}) });
      return;
    }
    if (cta.action === 'open_gw_job_board') {
      onClose && onClose();
      switchRole && switchRole('gw', 'gw-job-board', cta.orderId ? { orderId: cta.orderId } : {});
      return;
    }
    if (cta.action === 'open_gw_assignment') {
      onClose && onClose();
      switchRole && switchRole('gw', 'gw-assignment-detail', { id: cta.orderId });
      return;
    }
    if (cta.action === 'open_gw_payments') {
      onClose && onClose();
      switchRole && switchRole('gw', 'gw-payments', {});
      return;
    }
    if (cta.action === 'open_admin_friday_batch') {
      onClose && onClose();
      switchRole && switchRole('admin', 'friday-batch', {});
      return;
    }
  };

  return (
    <Drawer title="Demo Inbox" onClose={onClose} subtitle="Demo-harness · simulation-only">
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Persona</span>
            <select value={persona} onChange={e => { setPersona(e.target.value); setSelectedId(null); }}
              style={{ flex: 1, padding: '6px 8px', fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
              <option value="gw">Ghostwriter</option>
            </select>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {list.length === 0 && (
              <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 12.5, textAlign: 'center' }}>
                Noch keine simulierten E-Mails für <strong>{persona}</strong>.
              </div>
            )}
            {list.map(email => (
              <button key={email.id} type="button" onClick={() => { setSelectedId(email.id); if (!email.read) SimMail.markRead(email.id); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '11px 14px',
                  background: selectedId === email.id ? 'var(--surface-2)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  font: 'inherit', color: 'inherit',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  {!email.read && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--blue)', display: 'inline-block' }}/>}
                  <span style={{ fontSize: 12, fontWeight: email.read ? 400 : 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.from}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{relTime(email.sentAt)}</span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: email.read ? 400 : 500, color: 'var(--text)', marginBottom: 2 }}>{email.subject}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  [SIM] {email.kind}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {!selected && (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
              Wählen Sie eine E-Mail aus der Liste.
            </div>
          )}
          {selected && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{selected.kind}</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{selected.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  <strong>Von:</strong> {selected.from}<br/>
                  <strong>An:</strong> {selected.to}<br/>
                  <strong>Gesendet:</strong> {new Date(selected.sentAt).toLocaleString('de-DE')}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {selected.bodyMd}
              </div>
              {selected.cta && (
                <button type="button" onClick={() => handleCta(selected)}
                  className="btn btn-primary"
                  style={{ marginTop: 14, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
                  {selected.cta.label} →
                </button>
              )}
              {selected.tokenId && (
                <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                  [SIM] Token: {selected.tokenId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function Drawer({ title, subtitle, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '880px', maxWidth: '95vw',
      background: 'var(--surface)', borderLeft: '1px solid var(--border)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.12)', zIndex: 200, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="inbox" size={16}/>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 14 }}>{title}</strong>
          {subtitle && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{subtitle}</span>}
        </div>
        <span style={{ flex: 1 }}/>
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={14}/></button>
      </div>
      {children}
    </div>
  );
}

export { DemoInbox };
