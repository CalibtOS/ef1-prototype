import React, { useState } from 'react';
import { Icon } from '../../utils.jsx';

const REPORT_REASONS = [
  { value: 'harassment', label: 'Belästigung oder unangemessenes Verhalten' },
  { value: 'unprofessional', label: 'Unprofessionelles Verhalten' },
  { value: 'misinformation', label: 'Falsche oder irreführende Informationen' },
  { value: 'spam', label: 'Spam oder unerwünschte Inhalte' },
  { value: 'other', label: 'Anderer Grund' },
];

function ReportMessagesPanel({ selectedCount, onCancel, onSubmit }) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const effectiveReason = reason === 'other'
    ? customReason.trim()
    : (REPORT_REASONS.find(r => r.value === reason)?.label || reason);

  const canSubmit = selectedCount > 0
    && reason
    && (reason !== 'other' || customReason.trim().length >= 5);

  return (
    <div style={{ border: '1px solid var(--amber)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
      <div className="card-head" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="card-title" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="flag" size={13}/> Nachricht melden
        </div>
      </div>
      <div className="card-pad flex-col gap-2">
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          <strong>{selectedCount}</strong> {selectedCount === 1 ? 'Nachricht' : 'Nachrichten'} ausgewählt
        </div>

        <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>Grund für die Meldung:</div>
        <div className="flex-col" style={{ gap: 2 }}>
          {REPORT_REASONS.map(r => (
            <label
              key={r.value}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', padding: '5px 6px', borderRadius: 6, background: reason === r.value ? 'var(--surface-2)' : 'transparent', transition: 'background 0.12s' }}
            >
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                style={{ accentColor: 'var(--amber)' }}
              />
              {r.label}
            </label>
          ))}
        </div>

        {reason === 'other' && (
          <textarea
            style={{ width: '100%', minHeight: 68, resize: 'vertical', padding: '7px 9px', fontSize: 12.5, border: `1px solid ${customReason.trim().length >= 5 ? 'var(--border)' : 'var(--amber)'}`, borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', marginTop: 2 }}
            placeholder="Bitte beschreiben Sie den Grund (mind. 5 Zeichen)…"
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            autoFocus
          />
        )}

        <div className="flex gap-2" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-sm" onClick={onCancel} style={{ flex: 1 }}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit(effectiveReason)}
            style={{ flex: 1 }}
          >
            <Icon name="flag" size={11}/> Meldung absenden
          </button>
        </div>
      </div>
    </div>
  );
}

export { ReportMessagesPanel };
