#!/usr/bin/env node
// Convert SVG sources in this folder into the PNGs Expo expects.
// Run: node generate.js  (after `npm i sharp`)

const fs = require('fs');
const path = require('path');

let sharp;
try { sharp = require('sharp'); }
catch (err) {
  console.error('Missing dependency. Run: npm install sharp');
  process.exit(1);
}

const SRC = __dirname;
const OUT = path.resolve(__dirname, '..');

const targets = [
  { svg: 'icon.svg',              png: 'icon.png',              w: 1024, h: 1024 },
  { svg: 'adaptive-icon.svg',     png: 'adaptive-icon.png',     w: 1024, h: 1024 },
  { svg: 'splash.svg',            png: 'splash.png',            w: 1284, h: 2778 },
  { svg: 'notification-icon.svg', png: 'notification-icon.png', w: 96,   h: 96   },
];

(async () => {
  for (const { svg, png, w, h } of targets) {
    const inPath  = path.join(SRC, svg);
    const outPath = path.join(OUT, png);
    if (!fs.existsSync(inPath)) {
      console.warn(`skip: ${svg} (not found)`);
      continue;
    }
    await sharp(inPath, { density: 384 })
      .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`wrote ${png} (${w}×${h})`);
  }
})().catch((err) => { console.error(err); process.exit(1); });
