/*
 * Rebuilds slide1-lottie-data.js from slide1-animation.lottie (the source-of-truth .lottie).
 * NOTE: Windows-only — shells out to PowerShell's Expand-Archive to unzip the .lottie.
 * NOTE: Writes the animation UNMODIFIED. Run `node patch-lottie-mail.cjs` AFTER this to
 *       re-apply the mail-icon flap animation, otherwise those tweaks are lost.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const deck = __dirname;
const lottieFile = path.join(deck, 'slide1-animation.lottie');
const outJs = path.join(deck, 'slide1-lottie-data.js');
const zipFile = path.join(deck, '_rebuild.zip');
const tempDir = path.join(deck, '_rebuild-temp');

fs.copyFileSync(lottieFile, zipFile);
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force"`);

const jsonFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.json') && name !== 'manifest.json') jsonFiles.push(p);
  }
})(tempDir);

if (!jsonFiles.length) throw new Error('No animation JSON found in .lottie');

const animation = JSON.parse(fs.readFileSync(jsonFiles[0], 'utf8'));
const payload = JSON.stringify(animation);
fs.writeFileSync(outJs, 'window.SLIDE1_LOTTIE_DATA=' + payload + ';\n', 'utf8');
JSON.parse(payload);

console.log('Rebuilt', outJs, '(' + payload.length + ' bytes, unmodified)');

fs.rmSync(tempDir, { recursive: true, force: true });
fs.unlinkSync(zipFile);
