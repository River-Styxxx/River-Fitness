/**
 * Post-process the Expo web export into a PWA.
 * - copies public/ assets into dist/
 * - injects manifest + theme-color + SW registration into index.html
 * - rewrites every absolute path for the deploy base path (EXPO_BASE_URL)
 * - writes 404.html (SPA fallback for deep links on static hosts)
 * - writes .nojekyll (GitHub Pages would otherwise drop Expo's _expo/ folder)
 *
 * Run via: npm run build:web   (EXPO_BASE_URL=/river-fitness for GitHub Pages)
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const pub = path.join(__dirname, '..', 'public');

// normalise: '' for root hosting, '/river-fitness' for a sub-path host
const BASE = (process.env.EXPO_BASE_URL || '').replace(/\/+$/, '');

if (!fs.existsSync(dist)) {
  console.error('dist/ not found — run expo export first');
  process.exit(1);
}

for (const f of fs.readdirSync(pub)) {
  fs.copyFileSync(path.join(pub, f), path.join(dist, f));
}

// --- manifest: start_url + icon srcs are absolute, so they need the base ---
const manifestPath = path.join(dist, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.start_url = `${BASE}/`;
manifest.scope = `${BASE}/`;
manifest.icons = manifest.icons.map((i) => ({
  ...i,
  src: i.src.startsWith('/') ? `${BASE}${i.src}` : i.src,
}));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// --- service worker: shell cache key and offline fallback are base-relative ---
const swPath = path.join(dist, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/__BASE__/g, BASE);
fs.writeFileSync(swPath, sw);

// --- index.html: inject PWA tags ---
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const inject = [
  `<link rel="manifest" href="${BASE}/manifest.json"/>`,
  '<meta name="theme-color" content="#0b0e14"/>',
  `<link rel="apple-touch-icon" href="${BASE}/icon-192.png"/>`,
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
  `<script>if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("${BASE}/sw.js",{scope:"${BASE}/"}))}</script>`,
].join('');

if (!html.includes('manifest.json')) {
  html = html.replace('</head>', inject + '</head>');
  fs.writeFileSync(indexPath, html);
}

// --- SPA fallback + Jekyll opt-out ---
fs.copyFileSync(indexPath, path.join(dist, '404.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`PWA assets injected into dist/ (base: "${BASE || '/'}")`);
