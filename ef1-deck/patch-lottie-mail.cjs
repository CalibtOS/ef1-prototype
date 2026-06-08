const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'slide1-lottie-data.js');
const prefix = 'window.SLIDE1_LOTTIE_DATA=';
const src = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(src.slice(prefix.length).replace(/;\s*$/, ''));

const LOOP = 120;
const mail = data.layers.find((l) => l.nm === 'mail');
if (!mail) throw new Error('mail layer not found');

const maxInd = Math.max(...data.layers.map((l) => l.ind));
mail.ind = maxInd + 1;

const sx = mail.ks.s.k[0]?.s?.[0] ?? mail.ks.s.k[0];
const sy = mail.ks.s.k[0]?.s?.[1] ?? mail.ks.s.k[1] ?? sx;

function ease(t, mul) {
  return {
    t,
    s: [sx * mul, sy * mul, 100],
    i: { x: [0.42], y: [0] },
    o: { x: [0.58], y: [1] }
  };
}

mail.ks.s = {
  a: 1,
  k: [ease(0, 1), ease(30, 1.05), ease(60, 1), ease(90, 1.03), { t: LOOP, s: [sx, sy, 100] }]
};
mail.ks.o = { a: 0, k: 100 };
mail.ks.r = { a: 0, k: 0 };

const asset = data.assets.find((a) => a.id === mail.refId);
const layer = asset.layers[0];

// Trim path was clipping the icon — keep it fully visible
layer.shapes = layer.shapes.filter((s) => s.ty !== 'tm');

const group = layer.shapes.find((s) => s.ty === 'gr');
const flap = group.it.find((s) => s.nm === 'Path 2');
const closed = JSON.parse(JSON.stringify(flap.ks.k));
const open = JSON.parse(JSON.stringify(closed));
open.v = [
  [460.09, 82],
  [272, 278],
  [240, 278],
  [51.91, 82],
  [460.09, 82]
];

flap.ks = {
  a: 1,
  k: [
    { t: 0, s: [closed] },
    { t: 28, s: [open], i: { x: 0.42, y: 0 }, o: { x: 0.58, y: 1 } },
    { t: 56, s: [closed], i: { x: 0.42, y: 0 }, o: { x: 0.58, y: 1 } },
    { t: LOOP, s: [closed] }
  ]
};

const tr = group.it.find((s) => s.ty === 'tr');
tr.s = {
  a: 1,
  k: [
    { t: 0, s: [100, 100, 100] },
    { t: 30, s: [103, 103, 100] },
    { t: LOOP, s: [100, 100, 100] }
  ]
};

fs.writeFileSync(file, prefix + JSON.stringify(data) + ';\n', 'utf8');
console.log('Fixed mail: moved to top (ind', mail.ind, '), removed trim clip, kept flap animation');
