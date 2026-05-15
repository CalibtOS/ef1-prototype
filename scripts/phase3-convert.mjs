// One-shot Phase 3 conversion. For every feature .jsx file:
//   1. strip the `;(function(){` IIFE wrapper + closing `})();`
//   2. parse top-of-file destructures (`const { ... } = React` etc.) and
//      replace them with explicit ES imports
//   3. rewrite inline `window.EFX.method(...)` references to use the locally
//      imported namespace
//
// Idempotent: skips files that don't have the IIFE wrapper.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const targets = [
  'src/admin/customer-detail.jsx', 'src/admin/customers.jsx',
  'src/admin/dashboard.jsx', 'src/admin/disputes.jsx',
  'src/admin/friday-batch.jsx', 'src/admin/ghostwriter-detail.jsx',
  'src/admin/ghostwriters.jsx', 'src/admin/inbox.jsx',
  'src/admin/offers.jsx', 'src/admin/order-detail.jsx',
  'src/admin/order-new-wizard.jsx', 'src/admin/orders-list.jsx',
  'src/admin/pipeline.jsx', 'src/admin/reports.jsx',
  'src/admin/settings.jsx',
  'src/customer/view.jsx',
  'src/dev/tweaks-panel.jsx',
  'src/gw/active-jobs.jsx', 'src/gw/assignment-detail.jsx',
  'src/gw/dashboard.jsx', 'src/gw/extension-request.jsx',
  'src/gw/first-contact.jsx', 'src/gw/job-board.jsx',
  'src/gw/messages.jsx', 'src/gw/onboarding.jsx',
  'src/gw/payments.jsx', 'src/gw/profile.jsx',
  'src/gw/report-delay.jsx', 'src/gw/submissions-list.jsx',
  'src/gw/submit.jsx', 'src/gw/templates.jsx',
  'src/qa/ai-detection.jsx', 'src/qa/history.jsx',
  'src/qa/order-detail.jsx', 'src/qa/plagiarism.jsx',
  'src/qa/queue.jsx',
];

// Compute relative paths from a feature file dir to its dependencies.
function rel(filePath, target) {
  const from = path.dirname(filePath);
  let r = path.relative(from, target);
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

function convert(filePath) {
  const abs = path.join(root, filePath);
  let src = fs.readFileSync(abs, 'utf8');

  if (!src.includes(';(function(){')) {
    console.log(`SKIP  (no IIFE): ${filePath}`);
    return;
  }

  // 1. Strip IIFE wrapper.
  src = src.replace(/^;\(function\(\)\{\n/m, '');
  src = src.replace(/\n\}\)\(\);\s*$/m, '\n');

  // 2. Find the top destructure block (between start and first blank line).
  // Capture all const { ... } = React | window | window.EFU; const U = window.EFU; etc.
  // We'll extract these specific lines.
  const head = src.split('\n');
  const consumed = new Set();
  const reactHooks = new Set();   // useState, useEffect, useMemo (with aliases)
  const reactAliases = {};        // useState -> useStateA
  let needU = false, needEF = false, needW = false;
  let needEFHooks = false, needEFActions = false, needEFShell = false, needEFSelectors = false;
  const windowComponents = new Set(); // Icon, StatusPill, etc. (from `= window`)

  for (let i = 0; i < head.length; i++) {
    const line = head[i];
    if (line.trim() === '' && consumed.size > 0) break;

    // React destructure with aliases: `const { useState: useStateA, ... } = React;`
    let m = line.match(/^const\s*\{\s*([^}]+)\}\s*=\s*React\s*;?\s*$/);
    if (m) {
      m[1].split(',').forEach(p => {
        const [orig, alias] = p.split(':').map(s => s.trim());
        if (!orig) return;
        reactHooks.add(orig);
        if (alias && alias !== orig) reactAliases[orig] = alias;
      });
      consumed.add(i);
      continue;
    }

    // Components from window: `const { Icon, StatusPill, ... } = window;`
    m = line.match(/^const\s*\{\s*([^}]+)\}\s*=\s*window\s*;?\s*$/);
    if (m) {
      m[1].split(',').forEach(p => {
        const name = p.trim();
        if (name) windowComponents.add(name);
      });
      consumed.add(i);
      continue;
    }

    // Specific aliases (allow trailing comments).
    if (/^const\s+U\s*=\s*window\.EFU\s*;?\s*(\/\/.*)?$/.test(line)) { needU = true; consumed.add(i); continue; }
    if (/^const\s+D\s*=\s*window\.EF\s*;?\s*(\/\/.*)?$/.test(line))  { needEF = true; consumed.add(i); continue; }
    if (/^const\s+W\s*=\s*window\.EFWorkflow\s*;?\s*(\/\/.*)?$/.test(line)) { needW = true; consumed.add(i); continue; }

    // Some files have a comment line we keep.
    if (/^\/\//.test(line)) continue;

    // Non-matching non-empty line → stop scanning if we already consumed something.
    if (consumed.size > 0 && line.trim() !== '') break;
  }

  // Detect inline namespace usage.
  if (/\bwindow\.EFHooks\b/.test(src)) needEFHooks = true;
  if (/\bwindow\.EFActions\b/.test(src)) needEFActions = true;
  if (/\bwindow\.EFShell\b/.test(src)) needEFShell = true;
  if (/\bwindow\.EFSelectors\b/.test(src)) needEFSelectors = true;
  if (/\bwindow\.EFWorkflow\b/.test(src)) needW = true;
  if (/\bwindow\.EFU\b/.test(src)) needU = true;
  if (/\bwindow\.EF\b(?!\w)/.test(src)) needEF = true;

  // Split window-bag components into utils vs shell.
  const utilsComponents = new Set([
    'Icon','StatusPill','Avatar','Money','Bi','ScoreBar','NotReady','PlannedTag',
    'EmptyState','Skeleton','ChatNotice','ChatMessage','ChatComposer','ChatThreadRow',
  ]);
  const shellComponents = new Set([
    'Sidebar','Topbar','ToastStack','CrumbBar','RoleSwitcher','NotifBell',
    'FridayWidget','TopbarClock','AdminGlobalBanners',
  ]);
  const wantedUtils = [];
  const wantedShell = [];
  for (const name of windowComponents) {
    if (utilsComponents.has(name)) wantedUtils.push(name);
    else if (shellComponents.has(name)) wantedShell.push(name);
    else wantedUtils.push(name); // fallback to utils
  }

  // 3. Build the import block.
  const utilsPath = rel(filePath, 'utils.jsx');
  const shellPath = rel(filePath, 'shell.jsx');
  const corePath  = (mod) => rel(filePath, `src/core/${mod}`);
  const dataPath  = rel(filePath, 'data.js');

  const reactImportParts = [];
  for (const h of reactHooks) {
    const alias = reactAliases[h];
    reactImportParts.push(alias ? `${h} as ${alias}` : h);
  }
  const imports = [];
  imports.push(`import React${reactImportParts.length ? `, { ${reactImportParts.join(', ')} }` : ''} from 'react';`);
  if (wantedUtils.length || needU) {
    if (wantedUtils.length) imports.push(`import { ${wantedUtils.join(', ')} } from '${utilsPath}';`);
    if (needU) imports.push(`import * as U from '${utilsPath}';`);
  }
  if (wantedShell.length || needEFShell) {
    if (wantedShell.length) imports.push(`import { ${wantedShell.join(', ')} } from '${shellPath}';`);
    if (needEFShell) imports.push(`import * as EFShell from '${shellPath}';`);
  }
  if (needW) imports.push(`import * as W from '${corePath('workflow.js')}';`);
  if (needEFHooks) imports.push(`import * as EFHooks from '${corePath('hooks.js')}';`);
  if (needEFActions) imports.push(`import EFActions from '${corePath('actions.js')}';`);
  if (needEFSelectors) imports.push(`import * as EFSelectors from '${corePath('selectors.js')}';`);
  if (needEF) imports.push(`import EF from '${corePath('ef.js')}';`);
  if (needEF) imports.push(`const D = EF;`); // many files use D.X

  // 4. Replace inline references.
  src = src
    .replace(/\bwindow\.EFHooks\b/g, 'EFHooks')
    .replace(/\bwindow\.EFActions\b/g, 'EFActions')
    .replace(/\bwindow\.EFShell\b/g, 'EFShell')
    .replace(/\bwindow\.EFSelectors\b/g, 'EFSelectors')
    .replace(/\bwindow\.EFWorkflow\b/g, 'W')
    .replace(/\bwindow\.EFU\b/g, 'U')
    .replace(/\bwindow\.EF(?!\w)/g, 'EF');

  // 5. Stitch the file back: drop consumed lines from the head and prepend imports.
  const newLines = head.filter((_, i) => !consumed.has(i));
  // Find the first non-comment, non-empty line and insert imports right before it.
  let insertAt = 0;
  for (let i = 0; i < newLines.length; i++) {
    const t = newLines[i].trim();
    if (t === '' || t.startsWith('//')) { insertAt = i + 1; continue; }
    break;
  }
  const newSrc = [
    ...newLines.slice(0, insertAt),
    ...imports,
    '',
    ...newLines.slice(insertAt),
  ].join('\n');

  // 6. Apply the inline replacements globally to the new source too — the
  //    head reconstruction above used the un-replaced `src`, so apply once
  //    more to the assembled output.
  const finalSrc = newSrc
    .replace(/\bwindow\.EFHooks\b/g, 'EFHooks')
    .replace(/\bwindow\.EFActions\b/g, 'EFActions')
    .replace(/\bwindow\.EFShell\b/g, 'EFShell')
    .replace(/\bwindow\.EFSelectors\b/g, 'EFSelectors')
    .replace(/\bwindow\.EFWorkflow\b/g, 'W')
    .replace(/\bwindow\.EFU\b/g, 'U')
    .replace(/\bwindow\.EF(?!\w)/g, 'EF');

  fs.writeFileSync(abs, finalSrc);
  console.log(`DONE  ${filePath}`);
}

for (const t of targets) convert(t);
