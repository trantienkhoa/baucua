// Làm hàng loạt nhân vật: sửa khung xương + trọng số, gắn 14 động tác, xuất gif xem trước.
//   node tools/nhan-vat/lam.js <thư mục chứa .glb> [thư mục ra] [--khong-gif]
// Cần: python3 + numpy, playwright (chromium), ffmpeg (cho gif/ảnh tổng quan, không có thì bỏ qua).
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), noGif = process.argv.includes('--khong-gif');
if (!args[0]) { console.log('Cách dùng: node tools/nhan-vat/lam.js <thư mục .glb> [thư mục ra] [--khong-gif]'); process.exit(1); }
const IN = path.resolve(args[0]), OUT = path.resolve(args[1] || path.join(IN, 'da-sua')), TOOL = __dirname;
const THREE = path.join(TOOL, '..', '..', 'node_modules', 'three'), TMP = path.join(OUT, '.tam');
fs.mkdirSync(TMP, { recursive: true }); fs.mkdirSync(path.join(OUT, 'xem'), { recursive: true });
const PY = spawnSync('python3', ['--version']).status === 0 ? 'python3' : 'python';
const hasFF = spawnSync('ffmpeg', ['-version']).status === 0;
const files = fs.readdirSync(IN).filter(f => /\.glb$/i.test(f)).sort();
const run = (cmd, a) => { const r = spawnSync(cmd, a, { encoding: 'utf8' }); return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') }; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext();
  await ctx.route('http://nv.local/**', route => { const u = new URL(route.request().url()); const p = decodeURIComponent(u.pathname);
    const f = p.startsWith('/three/') ? path.join(THREE, p.slice(7)) : p.startsWith('/m/') ? path.join(TMP, p.slice(3)) : path.join(TOOL, p.slice(1));
    fs.existsSync(f) ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: '' }); });
  const report = []; let fixed_bad = false;
  for (const f of files) {
    const base = f.replace(/\.glb$/i, ''), t0 = Date.now(); process.stdout.write(`• ${f} … `);
    const fixed = path.join(TMP, base + '-xuong.glb');
    const r1 = run(PY, ['-I', path.join(TOOL, 'sua-xuong.py'), path.join(IN, f), fixed]);
    if (!r1.ok) { console.log('LỖI sửa xương'); report.push([f, 'lỗi sửa xương', r1.out.trim().split('\n').pop()]); continue; }
    const rg = run(PY, ['-I', path.join(TOOL, 'ganh-doc.py'), fixed, fixed]);
    if (!rg.ok) { console.log('LỖI quang gánh'); report.push([f, 'lỗi quang gánh', rg.out.trim().split('\n').pop()]); continue; }
    let headNote = '';
    for (const st of ['do-vat.py', 'dau-chuan.py']) {   // món đồ xách tay có xương riêng; thay đầu chuẩn + ảnh chân dung
      let rr = run(PY, ['-I', path.join(TOOL, st), fixed, fixed]);
      if (!rr.ok && st === 'dau-chuan.py') rr = run(PY, ['-I', path.join(TOOL, 'mat-2d.py'), fixed, fixed]);   // không thay đầu được -> dán mặt 2D
      if (rr.ok && st === 'dau-chuan.py') headNote = rr.out.trim().split('\n').pop();
      if (!rr.ok) { console.log('LỖI', st); report.push([f, 'lỗi ' + st, rr.out.trim().split('\n').pop()]); fixed_bad = true; break; }
    }
    if (fixed_bad) { fixed_bad = false; continue; }
    const page = await ctx.newPage({ viewport: { width: 1500, height: 1080 } }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && /LOI/.test(m.text())) errs.push(m.text()); });
    const open = async h => { await page.goto('about:blank'); await page.goto('http://nv.local/xem.html#' + encodeURIComponent(JSON.stringify({ m: '/m/' + encodeURIComponent(path.basename(h.file)), ...h }))); await page.waitForFunction(() => window.DONE || window.__err, null, { timeout: 180000 }); if (await page.evaluate(() => window.__err)) throw new Error('trang xem lỗi: ' + errs.join(' | ')); };
    try {
      await open({ file: fixed, only: ['di_bo'], cols: 1 });
      const data = await page.evaluate(() => window.bake(30)); const jf = path.join(TMP, base + '.json'); fs.writeFileSync(jf, JSON.stringify(data));
      const outGlb = path.join(OUT, base + '.glb');
      const r2 = run(PY, ['-I', path.join(TOOL, 'gan-dong-tac.py'), TOOL, fixed, outGlb, jf]);
      if (!r2.ok) throw new Error('gắn động tác: ' + r2.out.trim().split('\n').pop());
      const r3 = run(PY, ['-I', path.join(TOOL, 'lam-nhe.py'), outGlb, outGlb]);   // gộp đỉnh trùng: nhẹ ~3 lần, hình không đổi
      if (!r3.ok) throw new Error('làm nhẹ: ' + r3.out.trim().split('\n').pop());
      // ảnh nhỏ cho bảng tổng quan
      await page.setViewportSize({ width: 300, height: 360 }); await open({ file: fixed, only: ['chay_bo'], cols: 1, label: base });
      await page.evaluate(() => window.frame(0.12)); await page.screenshot({ path: path.join(TMP, base + '-o.png') });
      if (!noGif && hasFF) {
        await page.setViewportSize({ width: 1500, height: 1080 }); await open({ file: fixed, cols: 5 });
        const fd = path.join(TMP, base + '-f'); fs.mkdirSync(fd, { recursive: true });
        for (let i = 0; i < 72; i++) { await page.evaluate(t => window.frame(t), i / 15); await page.screenshot({ path: path.join(fd, `f${String(i).padStart(3, '0')}.png`) }); }
        run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '15', '-i', path.join(fd, 'f%03d.png'), '-vf', 'scale=1050:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[pl];[b][pl]paletteuse=dither=bayer', '-loop', '0', path.join(OUT, 'xem', base + '.gif')]);
        fs.rmSync(fd, { recursive: true, force: true });
      }
      const note = r1.out.split('\n').filter(l => /tay dài|bỏ màng/.test(l)).map(l => l.trim()).join(' | ');
      report.push([f, errs.length ? 'cảnh báo: ' + errs[0] : 'ok', headNote + (note ? ' | ' + note : '')]); console.log(`xong (${Math.round((Date.now() - t0) / 1000)} giây)`);
    } catch (e) { console.log('LỖI', e.message); report.push([f, 'lỗi', e.message]); }
    await page.close();
  }
  await b.close();
  const ok = files.map(f => path.join(TMP, f.replace(/\.glb$/i, '') + '-o.png')).filter(fs.existsSync);
  if (hasFF && ok.length) { const cols = Math.min(10, ok.length), rows = Math.ceil(ok.length / cols); const lst = path.join(TMP, 'ds.txt');
    fs.writeFileSync(lst, ok.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
    run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', `tile=${cols}x${rows}:color=0x9aa0aa`, '-frames:v', '1', path.join(OUT, 'xem', 'tong-quan.png')]); }
  fs.writeFileSync(path.join(OUT, 'bao-cao.csv'), 'file,ket_qua,ghi_chu\n' + report.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n');
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\nXong ${report.filter(r => r[1] !== 'lỗi' && r[1] !== 'lỗi sửa xương').length}/${files.length} nhân vật → ${OUT}`);
})();
