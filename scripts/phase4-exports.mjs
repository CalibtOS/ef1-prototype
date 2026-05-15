// Phase 4 export sweep: replace `window.X = X;` lines with `export { X };`
// and dedupe any duplicate assignments.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const targets = [
  'src/admin/bi.jsx', 'src/admin/customer-detail.jsx',
  'src/admin/customers.jsx', 'src/admin/dashboard.jsx',
  'src/admin/disputes.jsx', 'src/admin/friday-batch.jsx',
  'src/admin/ghostwriter-detail.jsx', 'src/admin/ghostwriters.jsx',
  'src/admin/inbox.jsx', 'src/admin/offers.jsx',
  'src/admin/order-detail.jsx', 'src/admin/order-new-wizard.jsx',
  'src/admin/orders-list.jsx', 'src/admin/pipeline.jsx',
  'src/admin/reports.jsx', 'src/admin/settings.jsx',
  'src/customer/view.jsx', 'src/dev/tweaks-panel.jsx',
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

function convert(filePath) {
  const abs = path.join(root, filePath);
  let src = fs.readFileSync(abs, 'utf8');

  // Collect all `window.Foo = Foo;` lines (only `window.X = X;` where the
  // identifier on each side matches — i.e. component exports, not state assigns).
  const exportRe = /^window\.([A-Z][A-Za-z0-9_]*)\s*=\s*\1\s*;\s*$/gm;
  const found = new Set();
  let m;
  while ((m = exportRe.exec(src)) !== null) {
    found.add(m[1]);
  }
  if (found.size === 0) {
    console.log(`SKIP  (no window exports): ${filePath}`);
    return;
  }

  // Remove all such lines.
  src = src.replace(exportRe, '');
  // Collapse any resulting runs of blank lines down to one.
  src = src.replace(/\n{3,}/g, '\n\n');
  // Trim trailing whitespace.
  src = src.replace(/\s+$/, '\n');

  // Append the export block.
  const exports = [...found];
  src += `\nexport { ${exports.join(', ')} };\n`;

  fs.writeFileSync(abs, src);
  console.log(`DONE  ${filePath}  →  export { ${exports.join(', ')} }`);
}

for (const t of targets) convert(t);
