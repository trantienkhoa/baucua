// MC giọng nói tiếng Việt: giọng AI VieNeu-TTS (offline, qua /api/tts) — không có thì giọng có sẵn của trình duyệt (Web Speech API)
// Chống "MC im ru": Chrome/Edge hay treo bộ đọc (không báo đọc xong) hoặc cắt câu dài sau ~15 giây,
// tab chạy nền thì hẹn giờ bị làm chậm. Bộ đọc này: chia câu ngắn, giữ bộ đọc sống, tự gỡ treo, không dựa vào hẹn giờ.
(function () {
  const synth = window.speechSynthesis;
  const T = { enabled: true, volume: 1, rate: 1, queue: [], speaking: false, voice: null, cur: null, pref: '' };
  function viVoices() { return synth ? synth.getVoices().filter(v => /^vi([-_]|$)/i.test(v.lang) || /vietnam|tiếng việt/i.test(v.name)) : []; }
  function pickVoice() {
    const vs = viVoices(); if (!vs.length) return null;
    if (T.pref) { const m = vs.find(v => v.name === T.pref) || vs.find(v => v.name.toLowerCase().includes(T.pref.toLowerCase())); if (m) return m; }
    const score = v => (/natural|online/i.test(v.name) ? 4 : 0) + (/namminh|nam minh/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/microsoft/i.test(v.name) ? 1 : 0);
    return vs.slice().sort((x, y) => score(y) - score(x))[0];
  }
  T.list = () => viVoices().map(v => v.name);
  T.setPref = name => { name = String(name || ''); if (name !== T.pref) { T.pref = name; T.voice = pickVoice(); } };
  if (synth) { T.voice = pickVoice(); synth.onvoiceschanged = () => { T.voice = pickVoice(); if (T.onVoices) T.onVoices(); }; }
  T.clean = s => String(s || '').normalize('NFC').replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'bạn';

  // chia câu dài thành đoạn ≤ 140 ký tự (tránh bị cắt giữa chừng)
  function split(text) {
    const parts = String(text).match(/[^.!?]+[.!?]*/g) || [String(text)];
    const out = []; let buf = '';
    for (let p of parts) { p = p.trim(); if (!p) continue; if ((buf + ' ' + p).length > 140 && buf) { out.push(buf); buf = p; } else buf = buf ? buf + ' ' + p : p; }
    if (buf) out.push(buf);
    return out;
  }
  // ---------- giọng AI VieNeu-TTS (server game gọi hộ qua /api/tts) ----------
  const N = { on: false, voice: '', status: 'off', failUntil: 0, voices: [] };
  T.setNeural = (on, voice) => { N.on = !!on; N.voice = String(voice || ''); };
  T.onlyNeural = true;   // game này chỉ dùng bộ đọc AI VieNeu-TTS, không bao giờ dùng giọng trình duyệt
  T.setStatus = st => { N.status = (st && st.status) || 'off'; if (st && Array.isArray(st.voices) && st.voices.length) N.voices = st.voices; if (N.status === 'ready') { N.failUntil = 0; setTimeout(() => { if (!T.speaking && T.queue.length) pump(); }, 0); } };
  T.neuralReady = () => N.on && N.status === 'ready' && Date.now() > N.failUntil;
  T.neuralStatus = () => N.status;
  // giọng AI theo miền: 'bac' | 'trung' | 'nam'. pick = { bac, trung, nam } giọng chọn sẵn ('' = tự chọn cùng giới với giọng chính)
  const AUTO = { male: { trung: 'Quang Sơn', nam: 'Adam' }, female: { trung: 'Ngọc Trân', nam: 'Thùy Dung' } };
  T.regionVoice = (region, pick) => {
    pick = pick || {};
    if (pick[region]) return pick[region];
    const main = N.voice || 'Hải Đăng';
    if (region === 'bac' || !AUTO.male[region]) return main;
    const info = N.voices.find(v => v.id === main) || {};
    if (new RegExp('·\\s*' + (region === 'trung' ? 'Trung' : 'Nam') + '\\s*·').test(info.desc || '')) return main;   // giọng chính đã là giọng miền này
    const female = info.gender === 'female' || /^Nữ/.test(info.desc || '');
    const v = AUTO[female ? 'female' : 'male'][region];
    return !N.voices.length || N.voices.some(x => x.id === v) ? v : main;
  };
  function fetchNeural(text, voice) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 15000);
    const p = fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: voice || N.voice }), signal: ctl.signal })
      .then(r => { if (!r.ok) throw new Error('tts ' + r.status); return r.blob(); })
      .then(b => URL.createObjectURL(b))
      .finally(() => clearTimeout(to));
    p.catch(() => {});
    return p;
  }
  // tạo sẵn đoạn kế tiếp trong lúc đang đọc → đọc liền mạch
  function prefetch() { const nx = T.queue[0]; if (nx && !nx.p && T.neuralReady()) nx.p = fetchNeural(nx.text, nx.voice); }
  let audio = null;

  T.say = function (text, prio, hype, voice) {
    if (!T.enabled || !(T.onlyNeural || synth || T.neuralReady()) || !text || !String(text).trim()) return;
    const items = split(text).map((t, i) => ({ text: t, hype: !!hype, prio: !!prio, first: i === 0, at: Date.now(), voice: voice || '' }));
    if ((hype || prio) && T.speaking && T.cur && !T.cur.prio && !T.cur.hype && hype) { T.queue.unshift(...items); hardCancel(); return; }
    if (prio || hype) T.queue.unshift(...items); else T.queue.push(...items);
    // không đọc dồn: bỏ câu thường quá cũ, giữ tối đa 8 đoạn
    const now = Date.now();
    T.queue = T.queue.filter(it => it.prio || it.hype || now - it.at < 25000);
    if (T.queue.length > 8) T.queue.length = 8;
    if (T.speaking) prefetch(); else pump();
  };
  let token = 0, watchdog = null, startedAt = 0;
  function hardCancel() {
    if (audio) { try { audio.pause(); } catch (e) {} }
    else if (synth && !T.onlyNeural) { try { synth.cancel(); } catch (e) {} }
    finish(token);
  }
  function finish(tk) {
    if (tk !== token) return;           // sự kiện cũ (đã gỡ treo) — bỏ qua, tránh đọc chồng
    token++; T.speaking = false; T.cur = null; clearTimeout(watchdog);
    if (audio) { try { URL.revokeObjectURL(audio.src); } catch (e) {} audio = null; }
    Promise.resolve().then(pump);        // đọc câu kế ngay, không dùng setTimeout (tab nền bị làm chậm)
  }
  function pump() {
    if (T.speaking || T.hold || !T.queue.length) return; // T.hold: tạm giữ hàng đợi (chờ chuông phát thanh)
    const it = T.queue[0];
    if (T.neuralReady() || it.p) { T.queue.shift(); T.cur = it; return playNeural(it); }
    if (T.onlyNeural) return;            // chỉ dùng bộ đọc AI: chờ VieNeu sẵn sàng rồi đọc tiếp, không dùng giọng trình duyệt
    if (!synth) { T.queue.length = 0; return; }
    T.queue.shift(); T.cur = it;
    playSynth(it);
  }
  function playNeural(it) {
    const tk = token; T.speaking = true; startedAt = Date.now(); it.neural = true;
    const p = it.p || fetchNeural(it.text, it.voice);
    let started = false;
    const fallback = () => {             // giọng AI lỗi → đọc bằng giọng trình duyệt, tạm nghỉ giọng AI 20 giây
      if (started || tk !== token) return; started = true;
      if (T.onlyNeural) {                // chỉ dùng bộ đọc AI: thử lại câu này 1 lần sau 3 giây, vẫn lỗi thì bỏ qua
        N.failUntil = Date.now() + 3000; it.p = null; it.tries = (it.tries || 0) + 1;
        if (it.tries < 2) T.queue.unshift(it);
        finish(tk); setTimeout(pump, 3200); return;
      }
      N.failUntil = Date.now() + 20000; it.neural = false;
      if (synth) playSynth(it, tk); else finish(tk);
    };
    clearTimeout(watchdog); watchdog = setTimeout(fallback, 12000);
    p.then(url => {
      if (started || tk !== token) { URL.revokeObjectURL(url); return; }
      started = true; clearTimeout(watchdog);
      const a = new Audio(url); audio = a;
      a.volume = it.hype ? 1 : Math.max(0, Math.min(1, T.volume));
      a.preservesPitch = true; a.playbackRate = Math.max(0.7, Math.min(1.5, T.rate));
      a.onended = () => finish(tk); a.onerror = () => finish(tk);
      a.onloadedmetadata = () => { clearTimeout(watchdog); watchdog = setTimeout(() => { if (tk === token) hardCancel(); }, (a.duration / a.playbackRate) * 1000 + 3000 || 30000); };
      watchdog = setTimeout(() => { if (tk === token) hardCancel(); }, 30000);
      a.play().catch(() => { audio = null; started = false; fallback(); });
      prefetch();
    }, fallback);
  }
  function playSynth(it, tkIn) {
    if (tkIn !== undefined && tkIn !== token) return;
    // bộ đọc còn kẹt câu cũ → xoá trước khi đọc
    if (synth.speaking || synth.pending) { try { synth.cancel(); } catch (e) {} }
    try { if (synth.paused) synth.resume(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(it.text);
    if (!T.voice) T.voice = pickVoice();
    u.lang = 'vi-VN'; if (T.voice) try { u.voice = T.voice; } catch (e) {}
    u.volume = it.hype ? 1 : Math.max(0, Math.min(1, T.volume)); u.rate = Math.max(0.6, Math.min(1.6, T.rate)); u.pitch = 1;
    const tk = token; T.speaking = true; startedAt = Date.now();
    u.onend = () => finish(tk); u.onerror = () => finish(tk);
    // gỡ treo: quá thời gian đọc hợp lý mà chưa xong → huỷ và đọc tiếp
    const maxMs = 3000 + it.text.length * 110 / u.rate;
    clearTimeout(watchdog); watchdog = setTimeout(() => { if (tk === token) hardCancel(); }, maxMs);
    try { synth.speak(u); } catch (e) { finish(tk); }
  }
  // giữ bộ đọc sống + kiểm tra treo định kỳ (Chrome tự dừng sau ~15 giây nếu không "đánh thức")
  setInterval(() => {
    if (!synth) { if (!T.speaking && T.queue.length) pump(); return; }
    if (T.speaking && synth.speaking && !/edg\//i.test(navigator.userAgent)) { try { synth.pause(); synth.resume(); } catch (e) {} }
    if (T.speaking && !audio && !(T.cur && T.cur.neural) && Date.now() - startedAt > 3000 + (T.cur ? T.cur.text.length * 110 : 0) + 4000) hardCancel();
    if (!T.speaking && T.queue.length) pump();
  }, 5000);
  // quay lại tab: đọc tiếp ngay
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !T.speaking) pump(); });
  T.available = () => T.onlyNeural || !!synth || T.neuralReady();
  T.hasVietnamese = () => T.onlyNeural || T.neuralReady() || !!(T.voice || (T.voice = pickVoice()));
  T.voiceName = () => (T.neuralReady() ? 'VieNeu AI · ' + (N.voice || 'Hải Đăng') : T.voice ? T.voice.name : '');
  T.onVoices = null;
  T.hold = false;
  T.release = () => { T.hold = false; pump(); };
  T.stopAll = () => { T.queue.length = 0; if (T.speaking) hardCancel(); }; // màn hình này không còn được phát tiếng
  window.MC = T;
})();
