// Chụp nhanh một nhân vật: node tools/nhan-vat/chup.js <file.glb> <ra.png> [giây] [tham số JSON cho xem.html]
// ví dụ: node tools/nhan-vat/chup.js da-sua/tp-004.glb soi.png 0.1 '{"only":["chay_bo"],"cols":1,"ry":2.4}'
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const [glb, out, T = '0', js = '{}'] = process.argv.slice(2), TOOL = __dirname, THREE = path.join(TOOL, '..', '..', 'node_modules', 'three');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 1080 }, deviceScaleFactor: 2 });
  await p.route('http://nv.local/**', r => { const u = decodeURIComponent(new URL(r.request().url()).pathname);
    const f = u.startsWith('/three/') ? path.join(THREE, u.slice(7)) : u === '/m.glb' ? path.resolve(glb) : path.join(TOOL, u.slice(1));
    fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
  p.on('pageerror', e => console.log(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.text()); });
  await p.goto('http://nv.local/xem.html#' + encodeURIComponent(JSON.stringify({ m: '/m.glb', ...JSON.parse(js) })));
  await p.waitForFunction(() => window.DONE || window.__err, null, { timeout: 180000 });
  const [w, h] = await p.evaluate(() => window.SIZE); await p.setViewportSize({ width: w, height: h });
  await p.evaluate(t => window.frame(t), +T); await p.screenshot({ path: out }); await b.close();
})();
