// Builds a single self-contained HTML file of the whole app with API
// responses baked in — useful for hosting a demo anywhere static.
// Usage: start the API (npm start), build the client (npm run build), then:
//   node scripts/build-static-demo.mjs
// Output: client/dist-static/xorai-demo.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'client', 'dist');
const OUT_DIR = path.join(root, 'client', 'dist-static');
const API = process.env.API_URL || 'http://localhost:5000/api';

// 1. Capture every response the UI can request.
const demo = await (await fetch(`${API}/auth/demo`, { method: 'POST' })).json();
const headers = { Authorization: `Bearer ${demo.token}` };
const ranges = ['7d', '30d', '90d', '12m', 'all'];
const paths = ranges.flatMap((r) => [
  `/analytics/summary?range=${r}`,
  `/analytics/revenue?range=${r}`,
  `/analytics/categories?range=${r}`,
  `/analytics/channels?range=${r}`,
  `/analytics/products/top?range=${r}&limit=5`,
  `/analytics/customers/top?range=${r}&limit=5`,
  `/analytics/products?range=${r}`,
]);
paths.push('/analytics/orders/recent?limit=7', '/analytics/orders/recent?limit=50', '/analytics/customers?limit=50');

const responses = {};
for (const p of paths) {
  responses[p] = await (await fetch(API + p, { headers })).json();
}
const data = JSON.stringify({ user: demo.user, responses }).replaceAll('</script', '<\\/script');

// 2. Inline the built bundle.
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const cssFile = html.match(/assets\/index-[\w-]+\.css/)[0];
const jsFile = html.match(/assets\/index-[\w-]+\.js/)[0];
const css = fs.readFileSync(path.join(DIST, cssFile), 'utf8');
const js = fs
  .readFileSync(path.join(DIST, jsFile), 'utf8')
  .replaceAll('</script', '<\\/script')
  .replaceAll('<!--', '<\\!--');

// 3. Inline the latin subsets of the web fonts so the file needs no network.
const fontsCssUrl =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';
let fontFaces = '';
try {
  const fontsCss = await (
    await fetch(fontsCssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } })
  ).text();
  for (const block of fontsCss.split('/* ').filter((b) => b.startsWith('latin */'))) {
    const face = block.slice('latin */'.length).trim();
    const url = face.match(/url\((https:[^)]+\.woff2)\)/)[1];
    const buf = await (await fetch(url)).arrayBuffer();
    fontFaces += face.replace(url, `data:font/woff2;base64,${Buffer.from(buf).toString('base64')}`) + '\n';
  }
} catch {
  console.warn('Fonts could not be fetched — the demo will fall back to system fonts.');
}

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Xorai — Live Demo</title>
<style>
${fontFaces}
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>window.__XORAI_DATA__ = ${data};</script>
<script type="module">
${js}
</script>
</body>
</html>
`;
fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, 'xorai-demo.html');
fs.writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${(out.length / 1024 / 1024).toFixed(2)} MB)`);
