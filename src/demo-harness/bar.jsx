// Top demo-harness bar. Visible on every route in every persona; clearly
// labelled as simulation tooling so reviewers do not mistake it for product
// chrome. Opens Demo Inbox / Sim Console drawers and exposes the scenario
// reset control.
import React, { useMemo, useState } from 'react';
import { Icon } from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import * as Scenarios from '../sim/scenarios.js';
import { DemoInbox } from './inbox.jsx';
import { SimConsole } from './console.jsx';

function selectUnreadEmailCount(state) {
  const t = state.entities.emails;
  return (t?.allIds || []).reduce((n, id) => n + (t.byId[id]?.read ? 0 : 1), 0);
}

function selectEventCount(state) {
  return (state.entities.sim_events?.allIds || []).length;
}

function useUnreadEmailCount() {
  return EFHooks.useStore(selectUnreadEmailCount);
}

function useEventCount() {
  return EFHooks.useStore(selectEventCount);
}

function DemoHarnessBar({ navigate, switchRole, role }) {
  const [open, setOpen] = useState(null); // 'inbox' | 'console' | null
  const unread = useUnreadEmailCount();
  const events = useEventCount();

  const reset = () => {
    if (!window.confirm('Szenarien zurücksetzen? Demo-Kunden, -Aufträge, simulierte E-Mails und Events werden gelöscht.')) return;
    Scenarios.resetScenarios();
    switchRole && switchRole('admin');
  };

  const openWp = () => {
    switchRole && switchRole('wp');
  };

  return (
    <>
      <div style={barStyle} aria-label="Demo harness">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.18)' }}>
          <Icon name="zap" size={12}/>
          <strong style={{ fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Demo Tools</strong>
        </div>
        <BarButton icon="globe" label="WP intake" onClick={openWp}/>
        <BarButton
          icon="inbox" label="Demo Inbox"
          onClick={() => setOpen(open === 'inbox' ? null : 'inbox')}
          badge={unread > 0 ? String(unread) : null}
          active={open === 'inbox'}
        />
        <BarButton
          icon="list" label="Sim Console"
          onClick={() => setOpen(open === 'console' ? null : 'console')}
          badge={events > 0 ? String(events) : null}
          active={open === 'console'}
        />
        <BarButton icon="rotate-ccw" label="Reset scenarios" onClick={reset}/>
        <span style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
          Acting as: <strong style={{ color: '#fff' }}>{role}</strong>
        </span>
      </div>

      {open === 'inbox' && (
        <DemoInbox onClose={() => setOpen(null)} navigate={navigate} switchRole={switchRole}/>
      )}
      {open === 'console' && (
        <SimConsole onClose={() => setOpen(null)}/>
      )}
    </>
  );
}

function BarButton({ icon, label, onClick, badge, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.18)',
        background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
        color: '#fff', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'inherit',
      }}>
      <Icon name={icon} size={12}/>
      <span>{label}</span>
      {badge && (
        <span style={{
          background: '#fff', color: '#1e293b', borderRadius: 8, padding: '0 6px',
          fontSize: 10, fontWeight: 700,
        }}>{badge}</span>
      )}
    </button>
  );
}

const barStyle = {
  position: 'sticky', top: 0, zIndex: 150,
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 14px',
  background: 'linear-gradient(90deg, #0f172a, #1e293b)',
  color: '#fff', fontSize: 12,
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

export { DemoHarnessBar };
