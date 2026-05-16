// Sim Console drawer. Lives in the demo harness — never appears as a normal
// product route. Renders the sim_events feed in reverse-chronological order.
import React, { useMemo, useState } from 'react';
import { Icon } from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';

const SOURCES = ['platform', 'mail', 'admin', 'customer', 'auth', 'pipedrive', 'sevdesk', 'stripe', 'gw'];

function shallowArrayEq(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function selectSimEvents(state) {
  const t = state.entities.sim_events;
  return (t?.allIds || []).map(id => t.byId[id]).filter(Boolean);
}

function useSimEvents() {
  return EFHooks.useStore(selectSimEvents, shallowArrayEq);
}

function fmtTime(at) {
  try {
    return new Date(at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return at || '';
  }
}

function sourceColor(source) {
  switch (source) {
    case 'platform': return '#1F62F0';
    case 'mail': return '#0EA5E9';
    case 'admin': return '#7c3aed';
    case 'customer': return '#10b981';
    case 'auth': return '#f59e0b';
    case 'pipedrive': return '#10b981';
    case 'sevdesk': return '#ef4444';
    case 'stripe': return '#635bff';
    default: return '#64748b';
  }
}

function SimConsole({ onClose }) {
  const events = useSimEvents();
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const sorted = [...events].sort((a, b) => new Date(b.at) - new Date(a.at));
    if (!f) return sorted;
    return sorted.filter(e =>
      (e.kind || '').toLowerCase().includes(f) ||
      (e.source || '').toLowerCase().includes(f) ||
      String(e.orderId || '').includes(f) ||
      (e.customerId || '').toLowerCase().includes(f),
    );
  }, [events, filter]);

  const copyJson = (e) => {
    try { navigator.clipboard?.writeText(JSON.stringify(e, null, 2)); } catch {}
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '720px', maxWidth: '95vw',
      background: 'var(--surface)', borderLeft: '1px solid var(--border)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.12)', zIndex: 200, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="zap" size={16}/>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 14 }}>Sim Console</strong>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Behind-the-scenes events · demo-harness only</span>
        </div>
        <span style={{ flex: 1 }}/>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="filter…"
          style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', width: 180 }}
        />
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={14}/></button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={th}>Time</th>
              <th style={th}>Source</th>
              <th style={th}>Kind</th>
              <th style={th}>Order</th>
              <th style={th}>Customer</th>
              <th style={th}>Detail</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, color: 'var(--text-3)', fontSize: 13, textAlign: 'center', fontFamily: 'inherit' }}>
                Keine Events. Reichen Sie das WP-Formular ein oder setzen Sie das Szenario zurück.
              </td></tr>
            )}
            {rows.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={td}>{fmtTime(e.at)}</td>
                <td style={td}><span style={{ color: sourceColor(e.source), fontWeight: 600 }}>{e.source}</span></td>
                <td style={{ ...td, color: 'var(--text)' }}>{e.kind}</td>
                <td style={td}>{e.orderId ? `#${e.orderId}` : '—'}</td>
                <td style={td}>{e.customerId || '—'}</td>
                <td style={{ ...td, color: 'var(--text-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.detail ? JSON.stringify(e.detail) : ''}
                </td>
                <td style={td}>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => copyJson(e)} title="Copy JSON" style={{ padding: '2px 6px' }}>
                    <Icon name="copy" size={11}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: '8px 12px', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, fontFamily: 'system-ui, sans-serif' };
const td = { padding: '6px 12px', verticalAlign: 'top' };

export { SimConsole };
