// Bình luận viên / người giới thiệu đọc tiếng Việt (Web Speech API, giọng có sẵn trên máy)
(function () {
  const synth = window.speechSynthesis;
  const T = { enabled: true, volume: 1, rate: 1.08, queue: [], speaking: false, pref: ['', ''], cur: null };
  const vi = () => synth ? synth.getVoices().filter(v => /^vi([-_]|$)/i.test(v.lang) || /vietnam|tiếng việt/i.test(v.name)) : [];
  const score = (v, female) => (/natural|online/i.test(v.name) ? 4 : 0) + (female ? (/hoaimy|hoài my|female|nữ/i.test(v.name) ? 3 : 0) : (/namminh|nam minh|male/i.test(v.name) ? 3 : 0)) + (/google/i.test(v.name) ? 2 : 0) + (/microsoft/i.test(v.name) ? 1 : 0);
  function voice(i) {
    const vs = vi(); if (!vs.length) return null;
    const p = T.pref[i]; if (p) { const m = vs.find(v => v.name === p); if (m) return m; }
    return vs.slice().sort((a, b) => score(b, i === 1) - score(a, i === 1))[0];
  }
  T.list = () => vi().map(v => v.name);
  T.clean = s => String(s || '').normalize('NFC').replace(/[^\p{L}\p{N}\s.,!?'%-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'bạn';
  // v: 0 = giọng nam (người giới thiệu / BLV 1), 1 = giọng thứ hai (BLV 2)
  T.say = (text, v = 0, prio = false) => {
    if (!T.enabled || !synth || !text) return;
    const it = { text, v };
    if (prio) { T.queue.unshift(it); if (T.speaking && T.cur && !T.cur.prio) try { synth.cancel(); } catch (e) {} it.prio = true; }
    else T.queue.push(it);
    if (T.queue.length > 4) T.queue.length = 4;
    pump();
  };
  T.busy = () => T.speaking || T.queue.length > 0;
  T.clear = () => { T.queue.length = 0; try { synth.cancel(); } catch (e) {} };
  function pump() {
    if (T.speaking || !T.queue.length) return;
    const it = T.queue.shift(); T.cur = it;
    const u = new SpeechSynthesisUtterance(it.text);
    const vv = voice(it.v); u.lang = 'vi-VN'; if (vv) try { u.voice = vv; } catch (e) {}
    u.volume = Math.max(0, Math.min(1, T.volume)); u.rate = Math.max(0.6, Math.min(1.8, T.rate)); u.pitch = it.v === 1 ? 1.05 : 0.95;
    T.speaking = true;
    const done = () => { if (!T.speaking) return; T.speaking = false; T.cur = null; setTimeout(pump, 120); };
    u.onend = done; u.onerror = done; setTimeout(done, 9000);
    synth.speak(u);
  }
  T.hasVoice = () => !!voice(0);
  if (synth) synth.onvoiceschanged = () => {};
  window.MC = T;
})();
