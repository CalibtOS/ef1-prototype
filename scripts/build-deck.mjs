// Publishes the standalone proposal deck into the Vite build output so the
// GitHub Pages pipeline serves it at ef1.calibtos.com/deck/.
//
// The deck lives in ef1-deck/ as a hand-authored, self-contained page
// (HTML + deck-stage.js + slide1-lottie-data.js + lottie-web/Google Fonts via
// CDN). Vite never sees it, so we copy the files it needs into dist/deck/ after
// `vite build`. The HTML is renamed to index.html so GitHub Pages serves it
// directly at /deck/. NOTE: the HTML loads slide1-lottie-data.js at runtime for
// the slide-1 Lottie background — it MUST be copied or the animation 404s live.
// (The .lottie source + *-lottie*.cjs scripts are build-time only; not shipped.)
import { cpSync, mkdirSync } from 'node:fs'

const SRC = 'ef1-deck'
const OUT = 'dist/deck'

mkdirSync(OUT, { recursive: true })
cpSync(`${SRC}/eFactory Proposal.html`, `${OUT}/index.html`)
cpSync(`${SRC}/deck-stage.js`, `${OUT}/deck-stage.js`)
cpSync(`${SRC}/slide1-lottie-data.js`, `${OUT}/slide1-lottie-data.js`)

console.log(`Deck published to ${OUT}/ (index.html + deck-stage.js + slide1-lottie-data.js) -> served at /deck/`)
