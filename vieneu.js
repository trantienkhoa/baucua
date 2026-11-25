// MC giọng AI tiếng Việt: VieNeu-TTS (chạy offline trên máy, CPU)
// Tự tìm thư mục VieNeu-TTS (cạnh thư mục game hoặc cao hơn một cấp), tự bật khi game chạy, tự tắt khi đóng game.
// Không có / lỗi → trang LIVE tự đọc bằng giọng có sẵn của trình duyệt.
const path = require('path');
const fs = require('fs');

module.exports = function vieneu({ app, io, log = console.log }) {
  const CANDIDATES = [process.env.VIENEU_DIR, path.join(__dirname, '..', 'VieNeu-TTS'), path.join(__dirname, '..', '..', 'VieNeu-TTS')].filter(Boolean);
  const PORT = Number(process.env.VIENEU_PORT) || 8765;
  const URL = `http://127.0.0.1:${PORT}`;
  const tts = { status: 'off', voices: [], error: '', child: null, cache: new Map(), crashes: [], want: false };

  function findPython() {
    for (const dir of CANDIDATES) {
      const p = path.join(dir, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
      try { if (fs.statSync(p).isFile()) return { dir, py: p }; } catch {}
    }
    return null;
  }
  const pub = () => ({ status: tts.status, voices: tts.voices, error: tts.error, installed: !!findPython() });
  const emit = () => io.emit('ttsStatus', pub());

  async function health() {
    try { const r = await fetch(URL + '/health', { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; }
  }
  async function ready() {
    try {
      const r = await fetch(URL + '/v1/voices', { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      tts.voices = (j.data || []).map(v => ({ id: v.id, gender: v.gender, desc: v.description, featured: v.featured || 0 }));
    } catch {}
    tts.status = 'ready'; tts.error = ''; emit();
    log(`  🎙 MC giọng AI (VieNeu-TTS) sẵn sàng — ${tts.voices.length} giọng`);
  }
  async function start() {
    if (tts.status === 'starting' || tts.status === 'ready' || tts.child) return;
    tts.status = 'starting';                                    // giữ chỗ ngay, tránh bật 2 lần
    if (await health()) return ready();                         // đã bật sẵn (vd game khác đang dùng)
    const found = findPython();
    if (!found) { tts.status = 'missing'; tts.error = 'Chưa cài VieNeu-TTS (thư mục VieNeu-TTS cạnh thư mục game)'; emit(); return; }
    tts.error = ''; emit();
    log('  🎙 Đang bật MC giọng AI (VieNeu-TTS)…');
    const env = Object.assign({}, process.env, { VIENEU_BACKEND: 'onnx', VIENEU_PRECISION: process.env.VIENEU_PRECISION || 'int8',
      HOST: '127.0.0.1', PORT: String(PORT), PYTHONIOENCODING: 'utf-8', HF_HUB_DISABLE_TELEMETRY: '1' });
    const child = require('child_process').spawn(found.py, ['-m', 'apps.openai_speech'], { cwd: found.dir, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    tts.child = child;
    let tail = '';
    const onOut = b => { tail = (tail + b.toString('utf8')).slice(-2000); };
    child.stdout.on('data', onOut); child.stderr.on('data', onOut);
    child.on('error', e => { tts.status = 'error'; tts.error = String(e.message || e); emit(); });
    child.on('exit', () => {
      if (tts.child !== child) return;                          // bị tắt chủ động
      tts.child = null;
      if (tts.status === 'off') return;
      const why = tail.split(/\r?\n/).filter(l => /error|exception|traceback/i.test(l)).slice(-1)[0] || '';
      tts.status = 'error'; tts.error = 'VieNeu-TTS bị tắt' + (why ? ': ' + why.trim().slice(0, 160) : '');
      const n = Date.now(); tts.crashes = tts.crashes.filter(t => n - t < 10 * 60000); tts.crashes.push(n);
      if (tts.crashes.length <= 3) { tts.error += ' — đang tự bật lại…'; setTimeout(() => { if (tts.status === 'error' && !tts.child && tts.want) { tts.status = 'off'; start(); } }, 5000); }
      emit(); log('  🎙 ' + tts.error);
    });
    const t0 = Date.now();   // lần đầu phải tải model từ HuggingFace, có thể vài phút
    while (tts.child === child && Date.now() - t0 < 10 * 60000) {
      await new Promise(r => setTimeout(r, 1500));
      if (await health()) return ready();
    }
    if (tts.child === child) { tts.status = 'error'; tts.error = 'VieNeu-TTS không phản hồi sau 10 phút'; emit(); }
  }
  function stop() {
    tts.status = 'off'; emit();
    if (tts.child) { try { tts.child.kill(); } catch {} tts.child = null; }
  }
  function setWanted(on) { tts.want = !!on; if (on) start(); else if (tts.child || tts.status !== 'off') stop(); }
  const killChild = () => { if (tts.child) try { tts.child.kill(); } catch {} };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { killChild(); process.exit(0); });
  process.on('exit', killChild);

  // WAV từ VieNeu ghi độ dài "không biết trước" → sửa lại cho trình duyệt phát chuẩn
  function fixWav(buf) {
    if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return buf;
    buf.writeUInt32LE(buf.length - 8, 4);
    const d = buf.indexOf('data', 12, 'ascii');
    if (d > 0) buf.writeUInt32LE(buf.length - d - 8, d + 4);
    return buf;
  }
  app.get('/api/tts/status', (req, res) => res.json(pub()));
  app.post('/api/tts/restart', (req, res) => { stop(); tts.want = true; tts.crashes = []; start(); res.json(pub()); });
  app.post('/api/tts', async (req, res) => {
    const text = String((req.body && req.body.text) || '').normalize('NFC').trim().slice(0, 400);
    const voice = String((req.body && req.body.voice) || '').slice(0, 64);
    if (!text) return res.status(400).end();
    if (tts.status !== 'ready') return res.status(503).json({ error: 'VieNeu-TTS chưa sẵn sàng', status: tts.status });
    const key = voice + '|' + text;
    let buf = tts.cache.get(key);
    if (buf) { tts.cache.delete(key); tts.cache.set(key, buf); }   // LRU
    else {
      try {
        const r = await fetch(URL + '/v1/audio/speech', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
          body: JSON.stringify({ input: text, voice: voice || undefined, response_format: 'wav', sample_rate: 24000 }),
        });
        if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: (await r.text().catch(() => '')).slice(0, 200) });
        buf = fixWav(Buffer.from(await r.arrayBuffer()));
      } catch (e) {
        if (!(await health())) { tts.status = 'error'; tts.error = 'Mất kết nối VieNeu-TTS'; const c = tts.child; tts.child = null; if (c) try { c.kill(); } catch {} emit(); setTimeout(() => { if (tts.want) { tts.status = 'off'; start(); } }, 5000); }
        return res.status(502).json({ error: String(e.message || e) });
      }
      tts.cache.set(key, buf);
      while (tts.cache.size > 120) tts.cache.delete(tts.cache.keys().next().value);
    }
    res.set({ 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' }).send(buf);
  });
  io.on('connection', socket => socket.emit('ttsStatus', pub()));

  return { setWanted, status: pub, kill: killChild };
};
