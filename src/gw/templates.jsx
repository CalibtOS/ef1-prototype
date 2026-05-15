// GW · Templates — document & email templates for assignments.

// ============ GW TEMPLATES ============
import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import EF from '../core/ef.js';
const D = EF;

function GWTemplates() {
  const templates = [
    { name: 'Vorlage_Deckblatt_efactory1.de.docx', label: 'Cover page template', sub: 'Deckblatt für jede Arbeit · DE/EN', size: '184 KB', icon: 'file-text', tone: 'blue' },
    { name: 'Expose_Vorlage_efactory1.docx', label: 'Exposé template', sub: 'Strukturvorlage für Forschungsantrag', size: '212 KB', icon: 'file-text', tone: 'blue' },
    { name: 'Thesis_Vorlage_efactory1.docx', label: 'Thesis template', sub: 'Bachelor- und Masterarbeit · APA/Harvard', size: '276 KB', icon: 'file-text', tone: 'blue' },
    { name: '200_Formulierungen_efactory1.docx', label: '200 academic phrases', sub: 'Bewährte Formulierungen für jeden Abschnitt', size: '88 KB', icon: 'file-text', tone: 'green' },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates</h1>
          <div className="page-subtitle">Mustervorlagen für jede Arbeit · download once, reuse always</div>
        </div>
      </div>

      <div className="banner info mb-3">
        <Icon name="zap" size={14}/>
        <span>Use these templates as the starting point for every submission. They embed the efactory1 Deckblatt, footer and citation style — required by AGB v3.2.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {templates.map(t => (
          <div key={t.name} className="card" style={{ padding: 16 }}>
            <div className="flex items-start gap-3">
              <div className="action-icon" style={{ background: t.tone === 'green' ? 'var(--green-soft)' : 'var(--blue-soft)', color: t.tone === 'green' ? 'var(--green)' : 'var(--blue)', width: 40, height: 40 }}>
                <Icon name={t.icon} size={18}/>
              </div>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.3 }}>
                <span className="strong fs-13">{t.label}</span>
                <span className="text-faint fs-11 mono">{t.name}</span>
                <span className="text-muted fs-11 mt-1">{t.sub}</span>
              </div>
              <span className="text-faint fs-11">{t.size}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <NotReady className="btn btn-sm" feature="template-download" style={{ flex: 1, justifyContent: 'center' }}><Icon name="download" size={12}/> Download .docx</NotReady>
              <NotReady className="btn btn-sm" feature="file-preview" ariaLabel="Preview template"><Icon name="eye" size={12}/></NotReady>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { GWTemplates };
