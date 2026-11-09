// MC giọng nói tiếng Việt (Web Speech API, giọng có sẵn trên máy, miễn phí)
(function () {
  const synth = window.speechSynthesis;
  const T = { enabled: true, volume: 1, rate: 1, queue: [], speaking: false, voice: null, lastJoin: 0 };
  // chọn giọng tiếng Việt hay nhất trên máy: Microsoft HoaiMy/NamMinh Online (Edge) → Google Tiếng Việt (Chrome) → giọng Việt khác
  function pickVoice() {
    if (!synth) return null;
    const vs = synth.getVoices().filter(v => /^vi([-_]|$)/i.test(v.lang) || /vietnam|tiếng việt/i.test(v.name));
    const score = v => (/natural|online/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/microsoft/i.test(v.name) ? 1 : 0);
    vs.sort((a, b) => score(b) - score(a));
    return vs[0] || null;
  }
  if (synth) { T.voice = pickVoice(); synth.onvoiceschanged = () => { T.voice = pickVoice(); }; }
  // bỏ ký tự lạ / emoji trong tên để máy đọc rõ
  T.clean = s => String(s || '').normalize('NFC').replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'bạn';
  T.say = function (text, prio, hype) {
    if (!T.enabled || !synth || !text) return;
    const it = { text, hype: !!hype };
    // hô hào sự kiện lớn: chen lên đầu, cắt ngang câu cảm ơn thường đang đọc
    if (hype && T.speaking && T.cur && !T.cur.hype) { T.queue.unshift(it); try { synth.cancel(); } catch (e) {} return; }
    if (prio) T.queue.unshift(it); else T.queue.push(it);
    if (T.queue.length > 6) T.queue.length = 6;      // không đọc dồn quá nhiều
    pump();
  };
  function pump() {
    if (T.speaking || !T.queue.length) return;
    const it = T.queue.shift(); T.cur = it;
    const u = new SpeechSynthesisUtterance(it.text);
    if (!T.voice) T.voice = pickVoice();   // giọng có thể tải chậm
    u.lang = 'vi-VN'; if (T.voice) u.voice = T.voice;
    // giọng tự nhiên như các bản trước: không kéo cao giọng / đọc nhanh khi hô (chỉ to hết cỡ và được chen lên trước)
    u.volume = it.hype ? 1 : Math.max(0, Math.min(1, T.volume)); u.rate = Math.max(0.6, Math.min(1.6, T.rate)); u.pitch = 1;
    T.speaking = true;
    const done = () => { T.speaking = false; T.cur = null; setTimeout(pump, it.hype ? 60 : 150); };
    u.onend = done; u.onerror = done;
    setTimeout(() => { if (T.speaking) done(); }, 9000);   // phòng trình duyệt treo
    synth.speak(u);
  }
  T.available = () => !!synth;
  T.hasVietnamese = () => !!(T.voice || (T.voice = pickVoice()));
  T.voiceName = () => (T.voice ? T.voice.name : '');
  window.MC = T;
})();
