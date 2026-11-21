// Erzeugt App-Icon, Android-Adaptive-Icon, Splash und Favicon aus einem SVG (Playwright/Chromium).
// Aufruf: node scripts/generate-icons.js
const { chromium } = require('playwright');
const path = require('path');

const BG = '#0B0D12';
// Kristall-Emblem mit aufsteigendem Chevron – eigenes Design
const mark = (s = 1) => `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6C5CFF"/><stop offset="1" stop-color="#B05CFF"/></linearGradient>
    <linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00E0B8"/><stop offset="1" stop-color="#6C5CFF"/></linearGradient>
  </defs>
  <g transform="translate(512 512) scale(${s}) translate(-512 -512)">
    <path d="M512 112 858 312 858 712 512 912 166 712 166 312Z" fill="url(#g)"/>
    <path d="M512 196 786 354 786 670 512 828 238 670 238 354Z" fill="${BG}" fill-opacity="0.55"/>
    <path d="M512 300 700 560 612 560 512 420 412 560 324 560Z" fill="#FFFFFF"/>
    <path d="M512 520 652 714 576 714 512 626 448 714 372 714Z" fill="url(#m)"/>
  </g>`;

// Monochrom (Android Themed Icon): nur Alpha zählt → Ring + Chevrons, Innenfläche transparent
const monoMark = (s) => `
  <g transform="translate(512 512) scale(${s}) translate(-512 -512)" fill="#FFFFFF">
    <path fill-rule="evenodd" d="M512 112 858 312 858 712 512 912 166 712 166 312Z M512 196 238 354 238 670 512 828 786 670 786 354Z"/>
    <path d="M512 300 700 560 612 560 512 420 412 560 324 560Z"/>
    <path d="M512 520 652 714 576 714 512 626 448 714 372 714Z"/>
  </g>`;

const svg = ({ bg = BG, s = 1, mono = false, size = 1024 }) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
    ${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}
    ${mono ? monoMark(s) : mark(s)}
  </svg>`;

const out = [
  ['icon.png', svg({ s: 0.92 }), 1024],
  ['android-icon-foreground.png', svg({ bg: null, s: 0.62 }), 1024], // Safe Zone 66 %
  ['android-icon-background.png', `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`, 1024],
  ['android-icon-monochrome.png', svg({ bg: null, s: 0.62, mono: true }), 1024],
  ['splash-icon.png', svg({ bg: null, s: 1 }), 1024],
  ['favicon.png', svg({ s: 0.95 }), 48],
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [file, s, size] of out) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${s.replace(/width="1024" height="1024" viewBox/, `width="${size}" height="${size}" viewBox`)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '..', 'assets', file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('assets/' + file);
  }
  await b.close();
})();
