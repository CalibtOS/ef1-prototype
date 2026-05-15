// QA · Review queue — submissions pending QA verdict. Includes plagiarism + AI runners and document preview/compare.

// ============ QA DOCUMENT PREVIEW (inline) ============
// Q-04: replaces the old "Open document viewer" toast with an inline mock preview.
// Shows a synthetic first page derived from the order title so QA can see what they're judging.
import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

function QADocumentPreview({ submission, order }) {
  const accent = submission.aiScore >= 70 ? 'var(--red)' : submission.aiScore >= 30 ? 'var(--amber)' : 'var(--green)';
  // Synthetic body — 8 paragraphs with seeded AI-risk rendering on the flagged ones.
  const seedAI = submission.aiScore || 0;
  const paragraphs = [
    `Die vorliegende Arbeit untersucht ${order.title || 'das Themenfeld'} im Kontext aktueller Forschung. Methodisch wird ein gemischter Ansatz aus qualitativen und quantitativen Verfahren verfolgt.`,
    `Im ersten Kapitel wird der theoretische Rahmen entwickelt. Hierbei werden die Arbeiten von Müller (2021) und Schmidt et al. (2022) als Ausgangspunkt verwendet.`,
    `Es ist wichtig zu beachten, dass die Methodik einen interdisziplinären Charakter aufweist. Insgesamt zeigt sich, dass mehrere Faktoren zusammenwirken.`,
    `Die empirische Erhebung umfasste n=148 Teilnehmende aus drei deutschen Großstädten. Die Auswertung erfolgte mittels SPSS v28.`,
    `Zusammenfassend lässt sich festhalten, dass die Hypothese H1 mit p<0.05 signifikant gestützt wird. Dieser Befund deckt sich mit der internationalen Literatur.`,
    `Limitationen: Die Stichprobe ist auf Deutschland beschränkt. Künftige Studien sollten kulturell vergleichende Ansätze einbeziehen.`,
    `Im Folgenden werden die Implikationen für die Praxis diskutiert. Es sei darauf hingewiesen, dass eine Übertragung sektorspezifisch zu prüfen ist.`,
    `Abschließend lässt sich festhalten, dass die Ergebnisse einen wertvollen Beitrag zur aktuellen Debatte leisten und neue Forschungsfragen aufwerfen.`,
  ];
  // Assign per-paragraph AI risk so flagged ones can be visually highlighted.
  const risks = paragraphs.map((_, i) => {
    if (seedAI < 15) return Math.max(0, seedAI - i*2);
    if (seedAI < 30) return [4, 8, 22, 6, 12, 5, 18, 9][i] ?? 8;
    // High-risk distribution mimics GPTZero output for AI-generated text
    return [12, 18, 92, 14, 88, 22, 78, 36][i] ?? 40;
  });

  return (
    <div className="card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="file-text" size={14}/> Document preview · {submission.fileName}</div>
        <span className="text-faint fs-11 mono">page 1 of {Math.max(8, Math.round((order.pages || 12) / 2))} · {(submission.size/1024/1024).toFixed(2)} MB</span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '24px 32px', minHeight: 420, fontFamily: 'Georgia, serif', lineHeight: 1.6, fontSize: 12.5 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{order.titleTBD ? '[Titel folgt]' : order.title}</div>
            <div className="fs-11 text-faint" style={{ marginTop: 4 }}>{order.field} · {order.pages} Seiten · Vorgelegt von Auftrag #{order.id}</div>
          </div>
          {paragraphs.map((p, i) => {
            const risk = risks[i];
            const tone = risk >= 70 ? 'var(--red)' : risk >= 30 ? 'var(--amber)' : 'transparent';
            return (
              <p key={i} style={{
                margin: '0 0 10px 0',
                padding: '4px 8px',
                borderLeft: tone !== 'transparent' ? `3px solid ${tone}` : '3px solid transparent',
                background: tone !== 'transparent' ? `color-mix(in oklab, ${tone} 7%, transparent)` : 'transparent',
                position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: -28, top: 4, fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>§{i+1}</span>
                {p}
                {risk >= 70 && <span className="pill pill-red" style={{ marginLeft: 8, fontSize: 10 }}>AI {risk}%</span>}
                {risk >= 30 && risk < 70 && <span className="pill pill-amber" style={{ marginLeft: 8, fontSize: 10 }}>review {risk}%</span>}
              </p>
            );
          })}
        </div>
        <div className="flex-col gap-3">
          <div className="card" style={{ padding: 12 }}>
            <div className="fs-11 text-muted mb-2">Per-paragraph AI risk</div>
            <div className="flex-col gap-1">
              {risks.map((r, i) => (
                <div key={i} className="flex items-center gap-2 fs-11">
                  <span className="text-faint mono" style={{ width: 22 }}>§{i+1}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${r}%`, height: '100%', background: r < 15 ? 'var(--green)' : r < 30 ? 'var(--amber)' : 'var(--red)' }}/>
                  </div>
                  <span className="mono" style={{ width: 32, textAlign: 'right', color: r < 15 ? 'var(--green)' : r < 30 ? 'var(--amber)' : 'var(--red)' }}>{r}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="fs-11 text-muted mb-2">Document metadata</div>
            <div className="kv" style={{ fontSize: 11 }}>
              <div className="kv-row"><dt>Words</dt><dd className="mono">{((order.pages || 12) * 320).toLocaleString('de-DE')}</dd></div>
              <div className="kv-row"><dt>Citations</dt><dd className="mono">47 (APA)</dd></div>
              <div className="kv-row"><dt>Language</dt><dd>DE</dd></div>
              <div className="kv-row"><dt>Plag</dt><dd className="mono" style={{ color: submission.plagiarismScore < 15 ? 'var(--green)' : 'var(--amber)' }}>{submission.plagiarismScore}%</dd></div>
              <div className="kv-row"><dt>AI</dt><dd className="mono" style={{ color: submission.aiScore < 15 ? 'var(--green)' : submission.aiScore < 30 ? 'var(--amber)' : 'var(--red)' }}>{submission.aiScore}%</dd></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ QA COMPARE VS INTERIM ============
// Q-03: side-by-side mock diff — final/revision submission vs prior interim from same order.
function QACompareInterim({ submission, order }) {
  // Find prior interim submission for the same order; fall back to a synthesized stub.
  const orderSubs = EFHooks.useSubmissions({ orderId: submission.orderId });
  const priors = orderSubs
    .filter(s => s.id !== submission.id && (s.kind === 'interim_1' || s.kind === 'interim_2' || s.round < submission.round))
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const prior = priors[priors.length - 1];

  // Synthetic diff lines so the comparison feels real even when no interim seed exists.
  const diff = [
    { kind: 'context', l: 'Die vorliegende Arbeit untersucht', r: 'Die vorliegende Arbeit untersucht' },
    { kind: 'changed', l: 'das Themenfeld im Kontext der Literatur.', r: 'das Themenfeld im Kontext aktueller Forschung.' },
    { kind: 'context', l: 'Methodisch wird ein qualitativer Ansatz', r: 'Methodisch wird ein gemischter Ansatz' },
    { kind: 'changed', l: 'verfolgt.', r: 'aus qualitativen und quantitativen Verfahren verfolgt.' },
    { kind: 'added', l: '', r: 'Die Stichprobengröße wurde von n=80 auf n=148 erweitert.' },
    { kind: 'context', l: 'Die Hypothese H1 wird signifikant gestützt.', r: 'Die Hypothese H1 wird mit p<0.05 signifikant gestützt.' },
    { kind: 'removed', l: 'Eine ausführliche Darstellung erfolgt im Anhang A.', r: '' },
    { kind: 'changed', l: 'Insgesamt zeigt sich ein Trend.', r: 'Insgesamt zeigt sich, dass mehrere Faktoren zusammenwirken.' },
  ];
  const stats = {
    added: diff.filter(d => d.kind === 'added').length,
    removed: diff.filter(d => d.kind === 'removed').length,
    changed: diff.filter(d => d.kind === 'changed').length,
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><Icon name="git-branch" size={14}/> Compare vs interim</div>
        <span className="text-faint fs-11">
          {prior ? `${prior.kind.replace('_',' ')} · round ${prior.round}` : 'no prior interim — showing synthetic baseline'}
          {' · '}
          <span style={{ color: 'var(--green)' }}>+{stats.added}</span>{' '}
          <span style={{ color: 'var(--red)' }}>−{stats.removed}</span>{' '}
          <span style={{ color: 'var(--amber)' }}>~{stats.changed}</span>
        </span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600 }}>
            <Icon name="file-text" size={11}/> {prior ? prior.fileName : `${order.id}_Zwischenstand_baseline.docx`}
            <span className="text-faint" style={{ marginLeft: 8, fontWeight: 400 }}>{prior ? U.relTime(prior.submittedAt) : 'baseline'}</span>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.55, padding: '12px 16px', minHeight: 280 }}>
            {diff.map((d, i) => {
              if (d.kind === 'added') return <div key={i} style={{ color: 'var(--text-3)', fontStyle: 'italic', padding: '2px 0' }}>—</div>;
              const bg = d.kind === 'removed' ? 'color-mix(in oklab, var(--red) 12%, transparent)'
                : d.kind === 'changed' ? 'color-mix(in oklab, var(--amber) 10%, transparent)'
                : 'transparent';
              return <div key={i} style={{ padding: '2px 4px', background: bg, marginBottom: 2 }}>{d.l || ' '}</div>;
            })}
          </div>
        </div>
        <div>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600 }}>
            <Icon name="file-text" size={11}/> {submission.fileName}
            <span className="text-faint" style={{ marginLeft: 8, fontWeight: 400 }}>{U.relTime(submission.submittedAt)}</span>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.55, padding: '12px 16px', minHeight: 280 }}>
            {diff.map((d, i) => {
              if (d.kind === 'removed') return <div key={i} style={{ color: 'var(--text-3)', fontStyle: 'italic', padding: '2px 0' }}>—</div>;
              const bg = d.kind === 'added' ? 'color-mix(in oklab, var(--green) 12%, transparent)'
                : d.kind === 'changed' ? 'color-mix(in oklab, var(--amber) 10%, transparent)'
                : 'transparent';
              return <div key={i} style={{ padding: '2px 4px', background: bg, marginBottom: 2 }}>{d.r || ' '}</div>;
            })}
          </div>
        </div>
      </div>
      <div className="card-pad" style={{ borderTop: '1px solid var(--border)', fontSize: 11 }}>
        <div className="banner info" style={{ fontSize: 11 }}>
          <Icon name="zap" size={12}/>
          <span>Stylometric distance vs prior interim: <strong>{submission.aiScore >= 70 ? '4.2σ outside cluster' : '0.6σ — consistent author voice'}</strong>. Sentence-length variance: {submission.aiScore >= 70 ? 'flattened (typical AI signature)' : 'natural'}.</span>
        </div>
      </div>
    </div>
  );
}

// ============ QA REVIEW QUEUE ============
// ===== Animated PlagScan / Turnitin runner — paragraph-by-paragraph scan
function PlagScanRunner({ submission }) {
  const { useState, useEffect } = React;
  const totalParagraphs = 22;
  const [scanned, setScanned] = useState(0);
  const [done, setDone] = useState(false);
  const [hits, setHits] = useState([]);
  // Deterministic match positions seeded from submission id
  const seed = (s) => Math.abs([...(s || 's')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const matchAt = (() => {
    const sd = seed(submission?.id);
    const target = Math.max(1, Math.min(8, Math.round((submission?.plagiarismScore || 6) / 4)));
    const positions = [];
    for (let i = 0; i < target; i++) positions.push((sd * (i + 1)) % totalParagraphs);
    return new Set(positions);
  })();
  useEffect(() => {
    setScanned(0); setDone(false); setHits([]);
    let i = 0;
    const tick = () => {
      i++;
      setScanned(i);
      if (matchAt.has(i - 1)) {
        setHits(prev => [...prev, { pIdx: i - 1, similarity: 6 + (seed(submission?.id) * (i + 1)) % 18, source: ['IEEE Xplore', 'JSTOR', 'Springer Link', 'Wikipedia', 'arXiv', 'GitHub Gist'][i % 6] }]);
      }
      if (i >= totalParagraphs) {
        clearInterval(handle);
        setTimeout(() => setDone(true), 200);
      }
    };
    const handle = setInterval(tick, 110);
    return () => clearInterval(handle);
  }, [submission?.id]);
  const pct = Math.round((scanned / totalParagraphs) * 100);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2">
          <Icon name="shield-check" size={14}/> PlagScan / Turnitin · {submission?.fileName || 'submission'}
        </div>
        <span className="text-faint fs-11 mono">
          {done ? `${hits.length} matches · ${submission?.plagiarismScore || 0}% overall` : `Scanning paragraph ${scanned} / ${totalParagraphs}`}
        </span>
      </div>
      <div className="card-pad">
        <div style={{ position: 'relative', minHeight: 240, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
          {/* Scanning overlay */}
          {!done && <div className="ef-scan-overlay"/>}
          <div style={{ padding: 12 }}>
            {Array.from({ length: totalParagraphs }).map((_, i) => {
              const isScanned = i < scanned;
              const hit = hits.find(h => h.pIdx === i);
              return (
                <div key={i} style={{ marginBottom: 6, padding: '4px 8px', borderRadius: 4, background: hit ? 'color-mix(in oklab, var(--red) 14%, transparent)' : isScanned ? 'color-mix(in oklab, var(--green) 6%, transparent)' : 'transparent', transition: 'background .25s', opacity: isScanned ? 1 : 0.4, fontSize: 11.5, lineHeight: 1.5 }}>
                  <div className="flex items-center gap-2">
                    <span className="mono fs-11 text-faint" style={{ minWidth: 22 }}>§{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      {hit
                        ? `Possible match — ${hit.source} · ${hit.similarity}% overlap`
                        : isScanned
                          ? '✓ no significant match'
                          : 'queued…'}
                    </span>
                    {hit && <span className="pill pill-red" style={{ fontSize: 10 }}>flag</span>}
                    {isScanned && !hit && <span className="text-faint fs-11">clean</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--green)' : 'var(--blue)', transition: 'width .15s linear' }}/>
          </div>
          <span className="mono fs-11 text-faint" style={{ minWidth: 56, textAlign: 'right' }}>{pct}%</span>
          {done && <span className="pill pill-green"><Icon name="check" size={10}/> Done · {hits.length} flagged</span>}
        </div>
      </div>
    </div>
  );
}

// ===== Animated GPTZero AI detector re-scan
function AIDetectionRunner({ submission }) {
  const { useState, useEffect } = React;
  const totalParagraphs = 22;
  const [scanned, setScanned] = useState(0);
  const [scores, setScores] = useState([]); // per-paragraph AI score 0-100
  const [done, setDone] = useState(false);
  const seed = (s) => Math.abs([...(s || 'a')].reduce((a, c) => a * 33 + c.charCodeAt(0), 11));
  const target = submission?.aiScore || 8;
  const sd = seed(submission?.id);
  // Generate per-paragraph scores that average to target
  const paraScores = (() => {
    const arr = [];
    for (let i = 0; i < totalParagraphs; i++) {
      const noise = ((sd * (i + 1)) % 31) - 15;
      // High overall → cluster many > 70%; low → most < 15%
      const base = target >= 70
        ? (i % 3 === 0 ? 30 : 80)
        : target;
      arr.push(Math.max(0, Math.min(100, base + noise)));
    }
    return arr;
  })();
  useEffect(() => {
    setScanned(0); setScores([]); setDone(false);
    let i = 0;
    const tick = () => {
      i++;
      setScanned(i);
      setScores(prev => [...prev, paraScores[i - 1]]);
      if (i >= totalParagraphs) {
        clearInterval(handle);
        setTimeout(() => setDone(true), 200);
      }
    };
    const handle = setInterval(tick, 130);
    return () => clearInterval(handle);
  }, [submission?.id]);
  const pct = Math.round((scanned / totalParagraphs) * 100);
  const flagged = scores.filter(x => x >= 70).length;
  const consensus = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const colorFor = (v) => v < 15 ? 'var(--green)' : v < 30 ? 'var(--amber)' : v < 70 ? 'var(--orange)' : 'var(--red)';
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2">
          <Icon name="bot" size={14}/> GPTZero · per-paragraph AI score · {submission?.fileName || 'submission'}
        </div>
        <span className="text-faint fs-11 mono">
          {done ? `${flagged} flagged · consensus ${consensus}%` : `Scoring paragraph ${scanned} / ${totalParagraphs}`}
        </span>
      </div>
      <div className="card-pad">
        <div style={{ position: 'relative', minHeight: 240, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
          {!done && <div className="ef-scan-overlay"/>}
          <div style={{ padding: 12 }}>
            {Array.from({ length: totalParagraphs }).map((_, i) => {
              const isScanned = i < scores.length;
              const v = scores[i];
              return (
                <div key={i} style={{ marginBottom: 4, padding: '4px 8px', borderRadius: 4, opacity: isScanned ? 1 : 0.4, fontSize: 11.5 }}>
                  <div className="flex items-center gap-2">
                    <span className="mono fs-11 text-faint" style={{ minWidth: 22 }}>§{i + 1}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                      <div className="ef-fill-anim" style={{ '--ef-fill': isScanned ? `${v}%` : '0%', width: isScanned ? `${v}%` : '0%', height: '100%', background: isScanned ? colorFor(v) : 'transparent' }}/>
                    </div>
                    <span className="mono fs-11" style={{ minWidth: 40, textAlign: 'right', color: isScanned ? colorFor(v) : 'var(--text-3)' }}>
                      {isScanned ? `${v}%` : '…'}
                    </span>
                    {isScanned && v >= 70 && <span className="pill pill-red" style={{ fontSize: 10 }}>AI</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: done ? colorFor(consensus) : 'var(--blue)', transition: 'width .15s linear' }}/>
          </div>
          <span className="mono fs-11 text-faint" style={{ minWidth: 56, textAlign: 'right' }}>{pct}%</span>
          {done && (
            <span className={`pill ${consensus >= 70 ? 'pill-red' : consensus >= 30 ? 'pill-amber' : 'pill-green'}`}>
              <Icon name={consensus >= 70 ? 'alert-triangle' : 'check'} size={10}/> Consensus {consensus}%
            </span>
          )}
        </div>
        {done && consensus >= 70 && (
          <div className="banner danger mt-3" style={{ fontSize: 11.5 }}>
            <Icon name="alert-triangle" size={14}/>
            <span><strong>Strong AI signature detected.</strong> {flagged} of {totalParagraphs} paragraphs ≥ 70% — recommend "Reject · AI violation confirmed" verdict.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function QAQueue({ navigate, toast }) {
  const [activeId, setActiveId] = useStateA(3517);
  const subs = EFHooks.useSubmissions({ qaQueue: true });
  const active = subs.find(s => s.orderId === activeId) || subs[0];
  const order = active && D.order(active.orderId);
  const cust = order && D.customer(order.customerId);
  const gw = order && D.gw(order.gwId);
  const aiFlaggedCount = subs.filter(s => s.aiScore >= 70 || s.flagged).length;

  const [verdict, setVerdict] = useStateA(null);
  const [previewOpen, setPreviewOpen] = useStateA(false);
  const [compareOpen, setCompareOpen] = useStateA(false);
  const [plagOpen, setPlagOpen] = useStateA(false);
  const [aiOpen, setAiOpen] = useStateA(false);

  // Reset detail panels when switching submissions
  useEffectA(() => { setPreviewOpen(false); setCompareOpen(false); setPlagOpen(false); setAiOpen(false); setVerdict(null); }, [active?.id]);

  const decide = (kind) => {
    setVerdict(kind);
    // Per PRD `qa.permissions = review/approve/reject + orders.read`: QA may FLAG quality
    // problems, but enforcement (shadow-ban, payment blocks, GW exclusion, reassignment,
    // contract/legal review) is admin-only. QA decisions therefore route to admin.
    if (kind === 'reject_ai') {
      EFActions.qa.flagAi(active.id);
      toast({
        tone: 'danger',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: '🚨 AI Violation — flagged for admin' },
        text: `Flag raised · ${gw.name} · awaiting admin decision`,
      });
    } else if (kind === 'flag_plagiarism') {
      EFActions.qa.flagPlagiarism(active.id);
      toast({
        tone: 'danger',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: '🚨 Plagiarism — flagged for admin' },
        text: `Flag raised · admin will review`,
      });
    } else if (kind === 'pass') {
      // Stateful: forward to customer review, mark QA passed
      EFActions.qa.pass(active.id);
      toast({
        tone: 'success',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: (active.kind === 'final_work' || active.kind === 'revision') ? 'Delivered' : 'Customer Review' },
        text: `Forwarded to ${cust.name} · 14-day review timer started`,
      });
    } else if (kind === 'request_revision') {
      EFActions.qa.requestRevision(active.id);
      toast({
        tone: 'info',
        transition: { entity: `Order #${order.id}`, from: 'QA Review', to: 'Revision Required' },
        text: 'GW notified',
      });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">QA Review Queue</h1>
          <div className="page-subtitle">{subs.length} pending final/revision submission{subs.length === 1 ? '' : 's'} · {aiFlaggedCount} AI flagged · interims auto-forward outside QA</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '8px 12px' }}><div className="card-title fs-12">Queue</div></div>
          <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
            {subs.map(s => {
              const o = D.order(s.orderId);
              const isActive = s.orderId === activeId;
              return (
                <div key={s.id} onClick={() => { setActiveId(s.orderId); setVerdict(null); }} style={{
                  padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: isActive ? 'var(--surface-3)' : 'var(--surface)',
                  borderLeft: isActive ? '3px solid var(--blue)' : '3px solid transparent'
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono strong fs-12">#{s.orderId}</span>
                    {s.aiScore >= 70 && <span className="pill pill-red">AI {s.aiScore}%</span>}
                    {s.plagiarismScore >= 10 && <span className="pill pill-amber">Plag {s.plagiarismScore}%</span>}
                  </div>
                  <div className="fs-11 text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o?.title}</div>
                  <div className="fs-11 text-faint mt-1">{s.kind} · round {s.round} · {U.relTime(s.submittedAt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {active && order && (
          <div className="flex-col gap-3">
            <div className="card" style={{ borderColor: active.aiScore >= 70 ? 'color-mix(in oklab, var(--red) 35%, var(--border))' : undefined }}>
              <div className="card-pad">
                <div className="flex items-center gap-3 mb-3">
                  <span className="mono strong fs-14">#{order.id}</span>
                  <span className="text-muted fs-13">· {order.title}</span>
                  <span style={{ flex: 1 }}/>
                  {active.aiScore >= 70 && <span className="pill pill-red"><Icon name="alert-triangle" size={11}/> Auto-flagged: AI score {active.aiScore}%</span>}
                </div>
                <div className="flex gap-3" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
                  <ScoreBar value={active.plagiarismScore} label="Plagiarism (PlagScan)" />
                  <ScoreBar value={active.aiScore} label="AI detection (GPTZero+Originality)" />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="fs-11 text-muted mb-1">QA checklist (auto)</div>
                    <div className="fs-11">
                      <div><Icon name="check" size={11} style={{ color: 'var(--green)' }}/> Citations: 47 (APA)</div>
                      <div><Icon name="check" size={11} style={{ color: 'var(--green)' }}/> Word count: matches</div>
                      <div><Icon name="check" size={11} style={{ color: 'var(--green)' }}/> Outline alignment: 92%</div>
                      {active.aiScore >= 70
                        ? <div><Icon name="x" size={11} style={{ color: 'var(--red)' }}/> AI detector raised flags ({active.aiScore}% — any AI use = fraud · §5)</div>
                        : <div><Icon name="check" size={11} style={{ color: 'var(--green)' }}/> AI score within threshold ({active.aiScore}%)</div>
                      }
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                    <div className="fs-11 text-muted mb-2">From</div>
                    <div className="flex items-center gap-2"><Avatar initials={gw?.initials} size={28}/><div><strong className="fs-12">{gw?.name}</strong><div className="fs-11 text-faint">{gw?.lifetime} jobs · ★{gw?.rating}</div></div></div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                    <div className="fs-11 text-muted mb-2">For customer</div>
                    <div className="flex items-center gap-2"><Avatar initials={cust?.initials} size={28} tone="blue"/><div><strong className="fs-12">{cust?.name}</strong><div className="fs-11 text-faint">{cust?.country} · {cust?.orders} order(s)</div></div></div>
                  </div>
                </div>

                {active.aiScore >= 70 && (
                  <div className="banner danger mb-3">
                    <Icon name="alert-triangle" size={16}/>
                    <div style={{ flex: 1 }}>
                      <strong>AI detector flagged §3 Methodology and §5 Conclusion ({active.aiScore}% AI probability).</strong>
                      <div className="fs-11 mt-1">Stylometric drift + repeated phrase templates ("It is important to note that...", "In conclusion, this paper..."). Compare with GW's prior {gw?.lifetime || 22} submissions: stylometric distance {active.aiScore >= 85 ? '4.2σ' : '2.8σ'} outside cluster.</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className={`btn ${previewOpen ? 'btn-primary' : ''}`} onClick={() => setPreviewOpen(o => !o)}><Icon name="eye" size={14}/> {previewOpen ? 'Hide' : 'Open'} document preview</button>
                  <button type="button" className="btn" onClick={() => navigate('order-detail', { id: order.id })}><Icon name="external-link" size={14}/> Open order detail</button>
                  {(active.kind === 'final_work' || active.kind === 'revision' || active.round > 1) && (
                    <button type="button" className={`btn ${compareOpen ? 'btn-primary' : ''}`} onClick={() => setCompareOpen(o => !o)}><Icon name="git-branch" size={14}/> {compareOpen ? 'Hide' : 'Compare vs interim'}</button>
                  )}
                  <button type="button" className={`btn ${plagOpen ? 'btn-primary' : ''}`} onClick={() => setPlagOpen(o => !o)}><Icon name="file-text" size={14}/> {plagOpen ? 'Hide' : 'View'} PlagScan report</button>
                  <button type="button" className={`btn ${aiOpen ? 'btn-primary' : ''}`} onClick={() => setAiOpen(o => !o)}><Icon name="zap" size={14}/> {aiOpen ? 'Hide' : 'Re-run'} AI detector</button>
                </div>
              </div>
            </div>

            {previewOpen && <QADocumentPreview submission={active} order={order} />}
            {compareOpen && <QACompareInterim submission={active} order={order} />}
            {plagOpen && <PlagScanRunner key={`plag-${active.id}`} submission={active} />}
            {aiOpen && <AIDetectionRunner key={`ai-${active.id}`} submission={active} />}

            <div className="card">
              <div className="card-head"><div className="card-title">Verdict</div></div>
              <div className="card-pad flex gap-2" style={{ flexWrap: 'wrap' }}>
                <button type="button" className={`btn ${verdict==='pass'?'btn-success':''}`} onClick={() => decide('pass')}>
                  <Icon name="check-circle" size={14}/> Pass · forward to customer
                </button>
                <button type="button" className={`btn ${verdict==='request_revision'?'btn-primary':''}`} onClick={() => decide('request_revision')}>
                  <Icon name="alert-triangle" size={14}/> Request revision (round {(order.revisionRounds || 0) + 1})
                </button>
                <button type="button" className="btn" onClick={() => toast({ text: `Clarification request sent to ${gw?.name}`, tone: 'info' })}>
                  <Icon name="message-square" size={14}/> Send to GW for clarification
                </button>
                <button type="button" className={`btn ${verdict==='flag_plagiarism'?'btn-danger':''}`} style={ verdict !== 'flag_plagiarism' ? { background: 'color-mix(in oklab, var(--red) 8%, var(--surface))', borderColor: 'color-mix(in oklab, var(--red) 25%, var(--border))', color: 'var(--red)' } : {}} onClick={() => decide('flag_plagiarism')}>
                  <Icon name="search" size={14}/> Flag plagiarism · escalate to admin
                </button>
                <button type="button" className={`btn ${verdict==='reject_ai'?'btn-danger':''}`} style={ verdict !== 'reject_ai' ? { background: 'color-mix(in oklab, var(--red) 8%, var(--surface))', borderColor: 'color-mix(in oklab, var(--red) 25%, var(--border))', color: 'var(--red)' } : {}} onClick={() => decide('reject_ai')}>
                  <Icon name="x" size={14}/> Flag AI use · escalate to admin
                </button>
              </div>
              {verdict === 'reject_ai' && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="banner warn mb-2"><Icon name="alert-triangle" size={14}/><span>QA flag raised — admin (Berat) decides what happens next:</span></div>
                  <div className="kv" style={{ fontSize: 12 }}>
                    <div className="kv-row"><dt>1. Order #{order.id}</dt><dd>marked <span className="pill pill-red">AI Violation — pending admin</span></dd></div>
                    <div className="kv-row"><dt>2. Admin notified</dt><dd>urgent in-app + email · awaiting confirmation</dd></div>
                    <div className="kv-row"><dt>3. GW {gw?.name}</dt><dd className="text-faint">no automated ban — admin will review evidence</dd></div>
                    <div className="kv-row"><dt>4. Payments</dt><dd className="text-faint">no automated hold — admin gates Friday batch</dd></div>
                  </div>
                </div>
              )}
              {verdict === 'flag_plagiarism' && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="banner warn mb-2"><Icon name="alert-triangle" size={14}/><span>QA flag raised — admin (Berat) decides what happens next:</span></div>
                  <div className="kv" style={{ fontSize: 12 }}>
                    <div className="kv-row"><dt>1. Order #{order.id}</dt><dd>marked <span className="pill pill-red">Plagiarism — pending admin</span></dd></div>
                    <div className="kv-row"><dt>2. Admin notified</dt><dd>urgent in-app + email · awaiting confirmation</dd></div>
                    <div className="kv-row"><dt>3. Sanctions</dt><dd className="text-faint">re-audit, ban, credit-note all gated to admin</dd></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.QAQueue = QAQueue;
