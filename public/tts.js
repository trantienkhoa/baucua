// MC giọng nói tiếng Việt
// 1) Giọng AI VieNeu-TTS chạy offline trên máy (server game gọi hộ qua /api/tts) — tự nhiên nhất
// 2) Không có / lỗi → giọng có sẵn của trình duyệt (Web Speech API)
(function () {
  const synth = window.speechSynthesis || null;
  const T = { enabled: true, volume: 1, rate: 1, queue: [], speaking: false, voice: null, lastJoin: 0 };
  // giọng tiếng Việt trên máy; mặc định ưu tiên giọng NAM tự nhiên (Microsoft NamMinh Online – Edge) cho đúng chất MC
  T.pref = '';
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
  // bỏ ký tự lạ / emoji trong tên để máy đọc rõ
  T.clean = s => String(s || '').normalize('NFC').replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'bạn';

  // ---------- giọng AI (VieNeu-TTS) ----------
  const N = { on: false, voice: '', status: 'off', failUntil: 0 };
  T.setNeural = (on, voice) => { N.on = !!on; N.voice = String(voice || ''); };
  T.setStatus = st => { N.status = (st && st.status) || 'off'; if (N.status === 'ready') N.failUntil = 0; };
  T.neuralReady = () => N.on && N.status === 'ready' && performance.now() > N.failUntil;
  function fetchNeural(text) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 15000);
    const p = fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: N.voice }), signal: ctl.signal })
      .then(r => { if (!r.ok) throw new Error('tts ' + r.status); return r.blob(); })
      .then(b => URL.createObjectURL(b))
      .finally(() => clearTimeout(to));
    p.catch(() => {});
    return p;
  }
  // tạo sẵn câu kế tiếp trong lúc đang đọc câu này → đọc liền mạch
  function prefetch() { const nx = T.queue[0]; if (nx && !nx.p && T.neuralReady()) nx.p = fetchNeural(nx.text); }

  T.say = function (text, prio, hype) {
    if (!T.enabled || !text || !(synth || T.neuralReady())) return;
    const it = { text: String(text), hype: !!hype };
    // hô hào sự kiện lớn: chen lên đầu, cắt ngang câu cảm ơn thường đang đọc
    if (hype && T.speaking && T.cur && !T.cur.hype) { T.queue.unshift(it); stopCurrent(); return; }
    if (prio) T.queue.unshift(it); else T.queue.push(it);
    if (T.queue.length > 6) T.queue.length = 6;      // không đọc dồn quá nhiều
    if (T.speaking) prefetch(); else pump();
  };
  let audio = null, finish = null;
  function stopCurrent() {
    if (audio) { try { audio.pause(); } catch (e) {} if (finish) finish(); }
    else if (synth) { try { synth.cancel(); } catch (e) {} }
  }
  function pump() {
    if (T.speaking || !T.queue.length) return;
    const it = T.queue.shift(); T.cur = it; T.speaking = true;
    let ended = false;
    const done = () => { if (ended) return; ended = true; finish = null; if (audio) { try { URL.revokeObjectURL(audio.src); } catch (e) {} audio = null; }
      T.speaking = false; T.cur = null; setTimeout(pump, it.hype ? 60 : 150); };
    if (T.neuralReady() || it.p) playNeural(it, done);
    else playSynth(it, done);
  }
  function playNeural(it, done) {
    const p = it.p || fetchNeural(it.text);
    let started = false;
    const guard = setTimeout(() => { if (!started) fallback(); }, 12000);
    function fallback() {   // giọng AI lỗi → đọc bằng giọng trình duyệt, tạm nghỉ giọng AI 20 giây
      clearTimeout(guard); if (started) return; started = true;
      N.failUntil = performance.now() + 20000;
      if (synth) playSynth(it, done); else done();
    }
    p.then(url => {
      if (started) { URL.revokeObjectURL(url); return; }
      started = true; clearTimeout(guard);
      if (!T.cur || T.cur !== it) { URL.revokeObjectURL(url); return; }
      const a = new Audio(url); audio = a; finish = done;
      a.volume = it.hype ? 1 : Math.max(0, Math.min(1, T.volume));
      a.preservesPitch = true; a.playbackRate = Math.max(0.7, Math.min(1.5, T.rate));
      a.onended = done; a.onerror = done;
      setTimeout(() => { if (audio === a) done(); }, 30000);
      a.play().catch(() => { audio = null; finish = null; started = false; fallback(); });
      prefetch();
    }, fallback);
  }
  function playSynth(it, done) {
    if (!synth) return done();
    const u = new SpeechSynthesisUtterance(it.text);
    if (!T.voice) T.voice = pickVoice();   // giọng có thể tải chậm
    u.lang = 'vi-VN'; if (T.voice) try { u.voice = T.voice; } catch (e) {}
    // giọng tự nhiên như các bản trước: không kéo cao giọng / đọc nhanh khi hô (chỉ to hết cỡ và được chen lên trước)
    u.volume = it.hype ? 1 : Math.max(0, Math.min(1, T.volume)); u.rate = Math.max(0.6, Math.min(1.6, T.rate)); u.pitch = 1;
    u.onend = done; u.onerror = done;
    setTimeout(done, 9000);   // phòng trình duyệt treo
    synth.speak(u);
  }
  T.available = () => !!synth || T.neuralReady();
  T.hasVietnamese = () => T.neuralReady() || !!(T.voice || (T.voice = pickVoice()));
  T.voiceName = () => (T.neuralReady() ? 'VieNeu AI · ' + (N.voice || 'mặc định') : T.voice ? T.voice.name : '');
  T.onVoices = null;
  window.MC = T;
})();
