// MC giọng nói tiếng Việt (Web Speech API, giọng có sẵn trên máy, miễn phí)
(function () {
  const synth = window.speechSynthesis;
  const T = { enabled: true, volume: 1, rate: 1.05, queue: [], speaking: false, voice: null, lastJoin: 0 };
  function pickVoice() {
    if (!synth) return null;
    const vs = synth.getVoices();
    return vs.find(v => /vi[-_]VN/i.test(v.lang) && /google|microsoft|natural|online/i.test(v.name))
      || vs.find(v => /^vi/i.test(v.lang)) || null;
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
    u.lang = 'vi-VN'; if (T.voice) u.voice = T.voice;
    // giọng hô: nhanh hơn, cao hơn, to hết cỡ
    u.volume = it.hype ? 1 : Math.max(0, Math.min(1, T.volume)); u.rate = Math.max(0.6, Math.min(1.7, T.rate * (it.hype ? 1.12 : 1))); u.pitch = it.hype ? 1.3 : 1.05;
    T.speaking = true;
    const done = () => { T.speaking = false; T.cur = null; setTimeout(pump, it.hype ? 60 : 150); };
    u.onend = done; u.onerror = done;
    setTimeout(() => { if (T.speaking) done(); }, 9000);   // phòng trình duyệt treo
    synth.speak(u);
  }
  T.available = () => !!synth;
  T.hasVietnamese = () => !!T.voice;
  window.MC = T;
})();
