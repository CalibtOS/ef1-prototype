import React, { useState } from 'react';
import { Icon } from '../../utils.jsx';

const REASONS = {
  de: [
    { value: 'harassment', label: 'Belästigung oder unangemessenes Verhalten' },
    { value: 'unprofessional', label: 'Unprofessionelles Verhalten' },
    { value: 'misinformation', label: 'Falsche oder irreführende Informationen' },
    { value: 'spam', label: 'Spam oder unerwünschte Inhalte' },
    { value: 'other', label: 'Anderer Grund' },
  ],
  en: [
    { value: 'harassment', label: 'Harassment or inappropriate behaviour' },
    { value: 'unprofessional', label: 'Unprofessional conduct' },
    { value: 'misinformation', label: 'False or misleading information' },
    { value: 'spam', label: 'Spam or unwanted content' },
    { value: 'other', label: 'Other reason' },
  ],
};

const PANEL_STRINGS = {
  de: {
    title: 'Nachricht melden',
    selected: (n) => `${n} ${n === 1 ? 'Nachricht' : 'Nachrichten'} ausgewählt`,
    reasonLabel: 'Grund für die Meldung:',
    otherPlaceholder: 'Bitte beschreiben Sie den Grund (mind. 5 Zeichen)…',
    cancel: 'Abbrechen',
    submit: 'Meldung absenden',
  },
  en: {
    title: 'Report message',
    selected: (n) => `${n} ${n === 1 ? 'message' : 'messages'} selected`,
    reasonLabel: 'Reason for report:',
    otherPlaceholder: 'Please describe the reason (min. 5 characters)…',
    cancel: 'Cancel',
    submit: 'Submit report',
  },
};

function ReportMessagesPanel({ selectedCount, onCancel, onSubmit, lang = 'de' }) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const reasons = REASONS[lang] || REASONS.de;
  const s = PANEL_STRINGS[lang] || PANEL_STRINGS.de;

  const effectiveReason = reason === 'other'
    ? customReason.trim()
    : (reasons.find(r => r.value === reason)?.label || reason);

  const canSubmit = selectedCount > 0
    && reason
    && (reason !== 'other' || customReason.trim().length >= 5);

  return (
    <div style={{ border: '1px solid var(--amber)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
      <div className="card-head" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="card-title" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="flag" size={13}/> {s.title}
        </div>
      </div>
      <div className="card-pad flex-col gap-2">
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          <strong>{selectedCount}</strong> {s.selected(selectedCount).replace(`${selectedCount} `, '')}
        </div>

        <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{s.reasonLabel}</div>
        <div className="flex-col" style={{ gap: 2 }}>
          {reasons.map(r => (
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
            placeholder={s.otherPlaceholder}
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            autoFocus
          />
        )}

        <div className="flex gap-2" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-sm" onClick={onCancel} style={{ flex: 1 }}>
            {s.cancel}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit(effectiveReason)}
            style={{ flex: 1 }}
          >
            <Icon name="flag" size={11}/> {s.submit}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ReportMessagesPanel };
