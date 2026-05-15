// Admin · Settings — team, AGB versions, integrations, locales, templates.

// ============ SETTINGS ============
import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import EF from '../core/ef.js';
const D = EF;

function SettingsPage({ navigate, toast }) {
  const [section, setSection] = useStateA('integrations');
  const sections = [
    { id: 'integrations', label: 'Integrations', icon: 'git-branch' },
    { id: 'email_routing', label: 'Email Routing', icon: 'mail' },
    { id: 'team', label: 'Team & roles', icon: 'users' },
    { id: 'templates', label: 'Templates', icon: 'folder' },
    { id: 'agbs', label: 'AGBs (Terms)', icon: 'file-text' },
    { id: 'localization', label: 'Localization', icon: 'globe' },
    { id: 'automations', label: 'Automations / Cron', icon: 'zap' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Settings']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Settings</h1>
          <div className="page-subtitle">Workspace, integrations and operational rules · scoped to Bery Ventures GmbH</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 8, alignSelf: 'flex-start' }}>
          {sections.map(s => (
            <a key={s.id} className={`sidebar-item ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              <Icon name={s.icon} size={14}/>
              <span>{s.label}</span>
            </a>
          ))}
        </div>

        <div className="flex-col gap-3">
          {section === 'team' && (
            <>
              <div className="card">
                <div className="card-head"><div className="card-title">Team members</div><NotReady className="btn btn-sm btn-primary" feature="team-invite"><Icon name="plus" size={12}/> Invite</NotReady></div>
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>MFA</th><th>Last seen</th><th></th></tr></thead>
                  <tbody>
                    {[
                      { initials: 'BÖ', name: 'Berat Özdemir', email: 'berat@efactory1.de', role: 'Admin (owner)', mfa: true, last: '2 min ago', tone: 'blue' },
                      { initials: 'LH', name: 'Lina Hoffmann', email: 'qa@efactory1.de', role: 'QA Reviewer', mfa: true, last: '23 min ago', tone: 'neutral' },
                      { initials: 'MS', name: 'Marwan Shakib', email: 'marwan@efactory1.de', role: 'Service Worker', mfa: false, last: 'Yesterday 17:42', tone: 'neutral' },
                    ].map(m => (
                      <tr key={m.email}>
                        <td><div className="flex items-center gap-2"><Avatar initials={m.initials} size={26} tone={m.tone}/><span className="strong fs-12">{m.name}</span></div></td>
                        <td className="mono fs-11 text-muted">{m.email}</td>
                        <td>{m.role === 'Admin (owner)' ? <span className="pill pill-blue">{m.role}</span> : <span className="pill pill-slate">{m.role}</span>}</td>
                        <td>{m.mfa ? <span className="pill pill-green"><Icon name="check" size={10}/> TOTP</span> : <span className="pill pill-amber">Off</span>}</td>
                        <td className="text-faint fs-11">{m.last}</td>
                        <td className="num"><NotReady className="btn btn-sm" feature="row-more-actions" ariaLabel="Team member actions"><Icon name="more-horizontal" size={12}/></NotReady></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Permission matrix</div></div>
                <div className="card-pad text-muted fs-12">
                  Role definitions and granular permissions are derived from the AGB v3.2 employment contracts. Edit at the role level — propagates to all members.
                </div>
              </div>
            </>
          )}

          {section === 'templates' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Document & email templates</div><NotReady className="btn btn-sm" feature="template-new"><Icon name="plus" size={12}/> New</NotReady></div>
              <div className="card-pad flex-col gap-2">
                {[
                  { name: 'Vorlage_Deckblatt_efactory1.de.docx', sub: 'Cover page · DE/EN', size: '184 KB', updated: '12.04.2026' },
                  { name: 'Expose_Vorlage_efactory1.docx', sub: 'Exposé template', size: '212 KB', updated: '04.03.2026' },
                  { name: 'Thesis_Vorlage_efactory1.docx', sub: 'Thesis (Bachelor/Master)', size: '276 KB', updated: '01.02.2026' },
                  { name: '200_Formulierungen_efactory1.docx', sub: '200 academic phrases', size: '88 KB', updated: '15.01.2026' },
                  { name: 'Email_Auftragszuteilung.html', sub: 'GW assignment briefing — NICHT WEITERLEITEN', size: '4.2 KB', updated: '07.05.2026' },
                  { name: 'Email_Kunde_Intro.html', sub: 'Customer GW-intro', size: '3.8 KB', updated: '07.05.2026' },
                  { name: 'Email_Mahnung_1.html', sub: 'Dunning level 1 (friendly)', size: '2.1 KB', updated: '20.04.2026' },
                ].map(t => (
                  <div key={t.name} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div className="action-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="file-text" size={16}/></div>
                    <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                      <span className="strong fs-12 mono">{t.name}</span>
                      <span className="text-faint fs-11">{t.sub} · {t.size} · updated {t.updated}</span>
                    </div>
                    <NotReady className="btn btn-sm" ariaLabel="Edit template" feature="template-edit"><Icon name="edit" size={12}/></NotReady>
                    <NotReady className="btn btn-sm" ariaLabel="Download template" feature="template-download"><Icon name="download" size={12}/></NotReady>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'integrations' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Integrations</div></div>
              <div className="card-pad flex-col gap-2">
                {[
                  { name: 'Pipedrive', sub: 'CRM source of truth', status: 'warn', detail: '4,159 / 5,000 subscribers (83%)', icon: 'git-branch' },
                  { name: 'Sevdesk', sub: 'Invoicing (Rechnung)', status: 'ok', detail: 'Last sync 3 min ago · 645 invoices YTD', icon: 'file-text' },
                  { name: 'Stripe', sub: 'Payments (card · Klarna · PayPal)', status: 'ok', detail: 'Webhook payment_intent.succeeded · 0 failures last 7d', icon: 'wallet' },
                  { name: 'Cloudflare Email Routing', sub: 'Email proxy', status: 'ok', detail: 'Worker order-proxy-router v4', icon: 'mail' },
                  { name: 'WhatsApp Proxy', sub: 'Channel — under exploration', status: 'pending', detail: 'Decision: virtual numbers vs groups', icon: 'message-circle' },
                  { name: 'Voice (Twilio / SIPGATE)', sub: 'Metadata only · no recordings', status: 'pending', detail: 'Provider TBD (D-16)', icon: 'phone' },
                  { name: 'Plagiarism (Turnitin / PlagScan)', sub: 'QA submission gate', status: 'ok', detail: 'API quota 87% remaining', icon: 'search' },
                  { name: 'AI Detection (GPTZero)', sub: 'Per-paragraph score', status: 'ok', detail: '1 violation flagged today (#3517)', icon: 'bot' },
                ].map(i => (
                  <div key={i.name} className="flex items-center gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div className="action-icon" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><Icon name={i.icon} size={16}/></div>
                    <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                      <span className="strong fs-12">{i.name}</span>
                      <span className="text-faint fs-11">{i.sub} · {i.detail}</span>
                    </div>
                    {i.status === 'ok' && <span className="pill pill-green">Connected</span>}
                    {i.status === 'warn' && <span className="pill pill-amber">Warning</span>}
                    {i.status === 'pending' && <span className="pill pill-slate">Not configured</span>}
                    <NotReady className="btn btn-sm" feature="integration-config" label="Configure integration">Configure</NotReady>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'email_routing' && (
            <div className="flex-col gap-3">
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Cloudflare Email Routing</div>
                  <span className="pill pill-green"><Icon name="check" size={10}/> Worker active</span>
                </div>
                <div className="card-pad">
                  <div className="banner info" style={{ fontSize: 11.5 }}>
                    <Icon name="zap" size={12}/>
                    <span>Worker <code className="mono">order-proxy-router v4</code> · per-order disposable address routes through Cloudflare → backend webhook → unified inbox.</span>
                  </div>
                  <div className="kv mt-3">
                    <div className="kv-row"><dt>Catch-all domain</dt><dd className="mono">orders.efactory1.de</dd></div>
                    <div className="kv-row"><dt>Active mappings</dt><dd className="mono">23 orders · 1 catch-all rule</dd></div>
                    <div className="kv-row"><dt>Auto-CC enforcement</dt><dd><span className="pill pill-green">kundenservice@efactory1.de always CC'd</span></dd></div>
                    <div className="kv-row"><dt>Last delivery</dt><dd className="text-faint">{U.relTime('2026-05-07T13:42:00')}</dd></div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Per-order proxy mapping</div><span className="text-faint fs-11">5 most recent</span></div>
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>Proxy address</th><th>Order</th><th>GW</th><th>Customer</th><th>Last activity</th></tr></thead>
                  <tbody>
                    {[
                      { addr: 'order-3522@orders.efactory1.de', oid: 3522, gw: 'Isabel Walter', cust: 'Adrian Kurt', at: '2026-05-07T13:42:00' },
                      { addr: 'order-3508@orders.efactory1.de', oid: 3508, gw: 'Maja Petrović', cust: 'Lea Schmidt', at: '2026-05-07T11:14:00' },
                      { addr: 'order-3526@orders.efactory1.de', oid: 3526, gw: 'Maja Petrović', cust: 'Jana Brandt', at: '2026-05-07T10:43:00' },
                      { addr: 'order-3520@orders.efactory1.de', oid: 3520, gw: 'Isabel Walter', cust: 'Paul Neumann', at: '2026-05-06T16:30:00' },
                      { addr: 'order-3530@orders.efactory1.de', oid: 3530, gw: 'Felix Becker', cust: 'Nina Iversen', at: '2026-05-06T09:14:00' },
                    ].map(m => (
                      <tr key={m.oid}>
                        <td className="mono fs-11">{m.addr}</td>
                        <td className="mono">#{m.oid}</td>
                        <td className="fs-12">{m.gw}</td>
                        <td className="fs-12">{m.cust}</td>
                        <td className="text-faint fs-11">{U.relTime(m.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Worker logs</div><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'Worker logs streamed · last 24h imported', tone: 'info' })}><Icon name="download" size={12}/> Tail</button></div>
                <div className="card-pad fs-11 mono" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, lineHeight: 1.7 }}>
                  <div>14:32:01 · email.received · order-3522 · sender=adrian.kurt@example.com · routed to Isabel Walter + CC kundenservice@</div>
                  <div>13:42:18 · email.received · order-3522 · sender=isabel.walter@gw.efactory1.de · routed to Adrian Kurt + CC kundenservice@</div>
                  <div>11:14:07 · email.received · order-3508 · sender=lea.schmidt@example.com · sentiment=tense → flagged</div>
                  <div>09:55:42 · email.received · order-3499 · keyword=Rate → auto-redirected to kundenservice@</div>
                </div>
              </div>
            </div>
          )}

          {section === 'agbs' && (
            <div className="flex-col gap-3">
              <div className="card">
                <div className="card-head"><div className="card-title">AGB versions</div><NotReady className="btn btn-sm btn-primary" feature="agb-publish"><Icon name="plus" size={12}/> Publish new version</NotReady></div>
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>Version</th><th>Effective</th><th>Status</th><th className="num">Signed by GWs</th><th></th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="mono strong">v3.2</td>
                      <td className="mono">01.04.2026</td>
                      <td><span className="pill pill-green">Active</span></td>
                      <td className="num mono">11 / 12</td>
                      <td className="num"><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'AGB v3.2 PDF download started', tone: 'info' })}><Icon name="download" size={11}/> PDF</button></td>
                    </tr>
                    <tr>
                      <td className="mono">v3.1</td>
                      <td className="mono">15.10.2025</td>
                      <td><span className="pill pill-slate">Superseded</span></td>
                      <td className="num mono text-faint">12 / 12</td>
                      <td className="num"><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'AGB v3.1 PDF download started', tone: 'info' })}><Icon name="download" size={11}/> PDF</button></td>
                    </tr>
                    <tr>
                      <td className="mono">v3.0</td>
                      <td className="mono">01.06.2025</td>
                      <td><span className="pill pill-slate">Archived</span></td>
                      <td className="num mono text-faint">—</td>
                      <td className="num"><button type="button" className="btn btn-sm" onClick={() => toast && toast({ text: 'AGB v3.0 PDF download started', tone: 'info' })}><Icon name="download" size={11}/> PDF</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title">Key clauses (v3.2)</div></div>
                <div className="card-pad">
                  <div className="kv" style={{ fontSize: 12 }}>
                    <div className="kv-row"><dt>§1.2 Vergütung</dt><dd>Fee fixed in advance in job confirmation</dd></div>
                    <div className="kv-row"><dt>§1.3 Fälligkeit</dt><dd>Payment due within 30 days of invoice after job completion</dd></div>
                    <div className="kv-row"><dt>§5.2 Nacharbeit</dt><dd>GW must fix defects immediately on request</dd></div>
                    <div className="kv-row"><dt>§13 Ausschluss</dt><dd>No AI, no plagiarism — violations void payment</dd></div>
                    <div className="kv-row"><dt>§13.3 Freigabe</dt><dd>efactory1 reviews quality + customer satisfaction before release</dd></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'localization' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Languages & currencies</div><span className="pill pill-blue" style={{ fontSize: 10 }}>D-12 / D-13</span></div>
              <div className="card-pad flex-col gap-3">
                <div className="banner info" style={{ fontSize: 11.5 }}>
                  <Icon name="globe" size={12}/>
                  <span>App built English-first. All user-facing strings live in i18n resource files. Currency-aware data model · pluggable tax engine.</span>
                </div>
                <div>
                  <div className="text-faint fs-11 mb-2">Active locales</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="pill pill-green">de-DE · German (default for content)</span>
                    <span className="pill pill-green">en-US · English (UI default)</span>
                    <span className="pill pill-slate">de-AT <PlannedTag/></span>
                    <span className="pill pill-slate">de-CH <PlannedTag/></span>
                    <span className="pill pill-slate">tr-TR <PlannedTag/></span>
                  </div>
                </div>
                <div>
                  <div className="text-faint fs-11 mb-2">Currencies</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="pill pill-green">EUR · default</span>
                    <span className="pill pill-slate">CHF · pending Swiss VAT engine</span>
                  </div>
                </div>
                <div>
                  <div className="text-faint fs-11 mb-2">VAT engines</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="pill pill-green">DE · 7% educational</span>
                    <span className="pill pill-green">DE · 19% non-educational</span>
                    <span className="pill pill-slate">AT · pending</span>
                    <span className="pill pill-slate">CH · pending</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'automations' && (
            <div className="flex-col gap-3">
              <div className="card">
                <div className="card-head"><div className="card-title">Scheduled automations</div><span className="pill pill-green"><Icon name="check" size={10}/> Cron healthy</span></div>
                <table className="tbl" style={{ fontSize: 12 }}>
                  <thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {[
                      { name: 'Deadline alerts (D-2 / D-1)', cron: 'Daily 09:00', last: '2026-05-07T09:00:00', status: 'ok', detail: '7 alerts sent' },
                      { name: 'Friday batch reminder', cron: 'Friday 09:00', last: '2026-05-02T09:00:00', status: 'ok', detail: 'Last week: 14 releasable' },
                      { name: 'Pipedrive sync', cron: 'Every 5 min', last: '2026-05-07T13:18:00', status: 'ok', detail: '0 errors last 7d' },
                      { name: 'Sevdesk sync', cron: 'Every 15 min', last: '2026-05-07T13:18:00', status: 'ok', detail: '645 invoices YTD' },
                      { name: 'Stripe webhook health', cron: 'Continuous', last: '2026-05-07T14:31:00', status: 'ok', detail: '0 failures last 7d' },
                      { name: 'Subscriber-limit watcher (Pipedrive)', cron: 'Daily 06:00', last: '2026-05-07T06:00:00', status: 'warn', detail: '4,159/5,000 subscribers' },
                      { name: 'AI/Plagiarism re-scan queue', cron: 'On submission', last: '2026-05-07T09:14:00', status: 'ok', detail: '7 scans today' },
                    ].map(a => (
                      <tr key={a.name}>
                        <td className="strong fs-12">{a.name}</td>
                        <td className="mono fs-11 text-muted">{a.cron}</td>
                        <td className="text-faint fs-11">{U.relTime(a.last)}</td>
                        <td>{a.status === 'ok' ? <span className="pill pill-green">OK</span> : <span className="pill pill-amber">Warning</span>}</td>
                        <td className="text-faint fs-11">{a.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
window.SettingsPage = SettingsPage;

window.SettingsPage = SettingsPage;
