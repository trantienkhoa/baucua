// MC giọng nói tiếng Việt (Web Speech API, giọng có sẵn trên máy, miễn phí)
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
  T.say = function (text, prio, hype) {
    if (!T.enabled || !synth || !text || !String(text).trim()) return;
    const items = split(text).map((t, i) => ({ text: t, hype: !!hype, prio: !!prio, first: i === 0, at: Date.now() }));
    if ((hype || prio) && T.speaking && T.cur && !T.cur.prio && !T.cur.hype && hype) { T.queue.unshift(...items); hardCancel(); return; }
    if (prio || hype) T.queue.unshift(...items); else T.queue.push(...items);
    // không đọc dồn: bỏ câu thường quá cũ, giữ tối đa 8 đoạn
    const now = Date.now();
    T.queue = T.queue.filter(it => it.prio || it.hype || now - it.at < 25000);
    if (T.queue.length > 8) T.queue.length = 8;
    pump();
  };
  let token = 0, watchdog = null, startedAt = 0;
  function hardCancel() { try { synth.cancel(); } catch (e) {} finish(token); }
  function finish(tk) {
    if (tk !== token) return;           // sự kiện cũ (đã gỡ treo) — bỏ qua, tránh đọc chồng
    token++; T.speaking = false; T.cur = null; clearTimeout(watchdog);
    Promise.resolve().then(pump);        // đọc câu kế ngay, không dùng setTimeout (tab nền bị làm chậm)
  }
  function pump() {
    if (T.speaking || !T.queue.length || !synth) return;
    const it = T.queue.shift(); T.cur = it;
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
    if (!synth) return;
    if (T.speaking && synth.speaking && !/edg\//i.test(navigator.userAgent)) { try { synth.pause(); synth.resume(); } catch (e) {} }
    if (T.speaking && Date.now() - startedAt > 3000 + (T.cur ? T.cur.text.length * 110 : 0) + 4000) hardCancel();
    if (!T.speaking && T.queue.length) pump();
  }, 5000);
  // quay lại tab: đọc tiếp ngay
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !T.speaking) pump(); });
  T.available = () => !!synth;
  T.hasVietnamese = () => !!(T.voice || (T.voice = pickVoice()));
  T.voiceName = () => (T.voice ? T.voice.name : '');
  T.onVoices = null;
  window.MC = T;
})();
