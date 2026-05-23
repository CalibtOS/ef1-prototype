import React, { useState } from 'react';
import {
  formatGmailQuoteHeader,
  isSameParticipant,
} from '../core/external-message-threading.js';

/** One nested level inside the quoted chain (header + body + deeper quotes). */
function QuoteLevel({ snapshot, formatQuoteHeader }) {
  if (!snapshot) return null;
  return (
    <div className="email-quote-content">
      <div className="email-quote-header">{formatQuoteHeader(snapshot)}</div>
      <div className="email-quote-body">{snapshot.body}</div>
      {snapshot.nestedQuote && <QuoteLevel snapshot={snapshot.nestedQuote} formatQuoteHeader={formatQuoteHeader}/>}
    </div>
  );
}

/**
 * Gmail-style quoted previous message.
 * - message: below sent/received body; … at bottom toggles full chain
 * - composer: inside reply type box; … at top toggles full chain
 */
function QuotedReplyBlock({
  currentMessageFrom,
  quotedMessageSnapshot,
  forceExpanded = false,
  mode = 'message',
  formatQuoteHeader = formatGmailQuoteHeader,
  isSameAuthor = isSameParticipant,
}) {
  if (!quotedMessageSnapshot) return null;

  const hasNestedQuote = !!quotedMessageSnapshot.nestedQuote;
  const isSelfReply = isSameAuthor(currentMessageFrom, quotedMessageSnapshot);
  const showToggle = !isSelfReply || hasNestedQuote;
  const [expanded, setExpanded] = useState(
    forceExpanded || (isSelfReply && !hasNestedQuote),
  );
  const showQuote = forceExpanded || (isSelfReply && !hasNestedQuote) || expanded;
  const isComposer = mode === 'composer';

  const quoteChain = <QuoteLevel snapshot={quotedMessageSnapshot} formatQuoteHeader={formatQuoteHeader}/>;

  const toggleBtn = showToggle && (
    <button
      type="button"
      className="email-quote-toggle"
      onClick={() => setExpanded(v => !v)}
      aria-expanded={showQuote}
      aria-label={showQuote ? 'Hide quoted messages' : 'Show quoted messages'}
    >
      …
    </button>
  );

  if (isComposer) {
    return (
      <div className="compose-quote-panel">
        {toggleBtn && <div className="compose-quote-toolbar">{toggleBtn}</div>}
        {showQuote && <div className="compose-quote-body">{quoteChain}</div>}
      </div>
    );
  }

  return (
    <div className="email-quote-wrap">
      {showQuote && <div className="email-quote-block">{quoteChain}</div>}
      {toggleBtn}
    </div>
  );
}

export { QuotedReplyBlock };
