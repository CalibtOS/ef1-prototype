// Shared report-messages sidebar panel + state hook.
// Used by customer/view.jsx and gw/assignment-detail.jsx.
import React, { useState } from 'react';
import { Icon } from '../../utils.jsx';
import { ReportMessagesPanel } from './ReportMessages.jsx';
import EFActions from '../core/actions.js';

const STRINGS = {
  de: {
    trigger: 'Nachricht melden',
    selectionHint: 'Klicken Sie auf die Nachrichten, die Sie melden möchten.',
    selected: (n) => `${n} ${n === 1 ? 'Nachricht' : 'Nachrichten'} ausgewählt`,
    proceed: 'Weiter zur Meldung',
    cancel: 'Abbrechen',
    successToast: 'Meldung wurde übermittelt.',
  },
  en: {
    trigger: 'Report a message',
    selectionHint: 'Click the messages you want to report.',
    selected: (n) => `${n} ${n === 1 ? 'message' : 'messages'} selected`,
    proceed: 'Proceed to report',
    cancel: 'Cancel',
    successToast: 'Report submitted.',
  },
};

function useReportChat(orderId, toast) {
  const [reportMode, setReportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  const enterReportMode = () => {
    setReportMode(true);
    setSelectedIds(new Set());
    setShowReasonPicker(false);
  };

  const exitReportMode = () => {
    setReportMode(false);
    setSelectedIds(new Set());
    setShowReasonPicker(false);
  };

  const toggleMessage = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (lang = 'de') => (reason) => {
    EFActions.customer.reportChatMessages(orderId, [...selectedIds], reason);
    const s = STRINGS[lang] || STRINGS.de;
    toast && toast({ tone: 'success', text: s.successToast });
    exitReportMode();
  };

  return {
    reportMode,
    selectedIds,
    showReasonPicker,
    setShowReasonPicker,
    enterReportMode,
    exitReportMode,
    toggleMessage,
    handleSubmit,
  };
}

// Renders the sidebar section for the report feature.
// In idle mode: shows the "Report a message" trigger button.
// In selection mode: shows count + proceed/cancel.
// In reason-picker mode: shows the reason form.
function ReportChatPanel({ reportState, lang = 'de' }) {
  const {
    reportMode,
    selectedIds,
    showReasonPicker,
    setShowReasonPicker,
    enterReportMode,
    exitReportMode,
    handleSubmit,
  } = reportState;

  const s = STRINGS[lang] || STRINGS.de;
  const count = selectedIds.size;

  if (!reportMode) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={{ justifyContent: 'flex-start', fontSize: 11.5, color: 'var(--text-3)' }}
        onClick={enterReportMode}
      >
        <Icon name="flag" size={11}/> {s.trigger}
      </button>
    );
  }

  if (showReasonPicker) {
    return (
      <ReportMessagesPanel
        selectedCount={count}
        onCancel={exitReportMode}
        onSubmit={handleSubmit(lang)}
        lang={lang}
      />
    );
  }

  return (
    <div className="flex-col gap-2">
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
        {s.selectionHint}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: count > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
        {s.selected(count)}
      </div>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={count === 0}
        onClick={() => setShowReasonPicker(true)}
        style={{ justifyContent: 'flex-start' }}
      >
        <Icon name="flag" size={11}/> {s.proceed}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={exitReportMode}
        style={{ justifyContent: 'flex-start', fontSize: 11.5, color: 'var(--text-3)' }}
      >
        {s.cancel}
      </button>
    </div>
  );
}

export { useReportChat, ReportChatPanel };
