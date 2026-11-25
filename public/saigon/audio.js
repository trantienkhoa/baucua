// Âm thanh tự tổng hợp bằng Web Audio: không dùng file nhạc → không lo bản quyền nhạc khi LIVE.
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

// mỗi khu một chất nhạc
const SONGS = {
  neon:   { bpm: 104, chords: [57, 53, 48, 55], minor: [1, 0, 0, 0], scale: [0, 3, 5, 7, 10], lead: 'square' },
  cholon: { bpm: 96,  chords: [50, 46, 48, 45], minor: [1, 0, 0, 1], scale: [0, 2, 5, 7, 9], lead: 'triangle' },
  cang:   { bpm: 100, chords: [52, 48, 55, 50], minor: [1, 0, 0, 0], scale: [0, 3, 5, 7, 10], lead: 'sawtooth' },
  bien:   { bpm: 98,  chords: [54, 50, 57, 52], minor: [1, 0, 0, 0], scale: [0, 2, 4, 7, 9], lead: 'triangle' },
  chonoi: { bpm: 90,  chords: [48, 45, 53, 55], minor: [0, 1, 0, 0], scale: [0, 2, 4, 7, 9], lead: 'triangle' },
  deo:    { bpm: 92,  chords: [47, 43, 50, 45], minor: [1, 0, 0, 0], scale: [0, 3, 5, 7, 10], lead: 'square' },
  boss:   { bpm: 128, chords: [45, 45, 46, 44], minor: [1, 1, 0, 0], scale: [0, 1, 4, 5, 7], lead: 'sawtooth' },
};

export class Audio {
  constructor() {
    this.ctx = null; this.musicOn = true; this.sfxOn = true; this.song = SONGS.neon; this.songKey = 'neon';
    this.step = 0; this.nextT = 0; this.intensity = 0;
  }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createDynamicsCompressor(); this.master.threshold.value = -14; this.master.ratio.value = 4; this.master.connect(c.destination);
    this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0.22; this.music.connect(this.out);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(this.out);
    const len = c.sampleRate * 1.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.nextT = c.currentTime + 0.1;
    setInterval(() => this.schedule(), 50);
  }
  setSong(key) { if (SONGS[key] && key !== this.songKey) { this.songKey = key; this.song = SONGS[key]; } }
  setMusic(on) { this.musicOn = on; if (this.music) this.music.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.2); }
  setSfx(on) { this.sfxOn = on; }
  duck(sec = 2) { if (!this.ctx || !this.musicOn) return; const t = this.ctx.currentTime; this.music.gain.cancelScheduledValues(t); this.music.gain.setTargetAtTime(0.08, t, 0.05); this.music.gain.setTargetAtTime(0.22, t + sec, 0.4); }

  // ---------- nhạc ----------
  schedule() {
    const c = this.ctx; if (!c) return;
    const spb = 60 / this.song.bpm / 4;
    while (this.nextT < c.currentTime + 0.2) { this.playStep(this.step, this.nextT, spb); this.nextT += spb; this.step = (this.step + 1) % 64; }
  }
  playStep(s, t, spb) {
    if (!this.musicOn) return;
    const S = this.song, bar = Math.floor(s / 16), st = s % 16, root = S.chords[bar % 4], minor = S.minor[bar % 4];
    const chord = [0, minor ? 3 : 4, 7];
    if (st % 4 === 0) this.kick(t);
    if (st === 4 || st === 12) this.snare(t);
    if (st % 2 === 1 || this.intensity > 0.5) this.hat(t, st % 4 === 2 ? 0.12 : 0.06);
    if (st % 2 === 0) this.tone('sawtooth', midi(root - 12 + (st % 8 === 6 ? 7 : 0)), t, spb * 1.6, 0.16, 500);
    const arp = [0, 1, 2, 1, 2, 0, 1, 2];
    if (st % 2 === 0) this.tone(S.lead, midi(root + 12 + chord[arp[(st / 2) % 8]]), t, spb * 1.2, 0.05, 2600);
    if (st === 0) for (const n of chord) this.tone('sawtooth', midi(root + n), t, spb * 15, 0.025, 900, 0.4);
    if ((bar % 2 === 1) && (st === 10 || st === 13 || st === 14)) { const sc = S.scale; this.tone(S.lead, midi(root + 24 + sc[(st * 7 + bar) % sc.length]), t, spb * 1.5, 0.045, 3200); }
  }
  kick(t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(this.music); o.start(t); o.stop(t + 0.32); }
  snare(t) { this.noise(t, 0.18, 0.35, 'bandpass', 1800, this.music); this.tone('triangle', 190, t, 0.1, 0.18, 4000, 0, this.music); }
  hat(t, v) { this.noise(t, 0.04, v, 'highpass', 7000, this.music); }
  tone(type, f, t, dur, vol, cutoff = 3000, attack = 0.005, dest) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f, t); fl.type = 'lowpass'; fl.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.max(0.003, attack)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl).connect(g).connect(dest || this.music); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noise(t, dur, vol, ftype, freq, dest, q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(dest || this.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.02);
    return { s, f, g };
  }

  // ---------- hiệu ứng ----------
  play(name) {
    const c = this.ctx; if (!c || !this.sfxOn) return; const t = c.currentTime, S = this.sfx;
    switch (name) {
      case 'honk': for (const [f, d] of [[392, 0], [440, 0]]) { this.tone('square', f, t + d, 0.16, 0.12, 1800, 0.01, S); this.tone('square', f, t + 0.22, 0.22, 0.12, 1800, 0.01, S); } break;
      case 'pop': this.tone('sine', 660, t, 0.12, 0.25, 4000, 0.002, S); this.tone('sine', 990, t + 0.06, 0.12, 0.2, 4000, 0.002, S); break;
      case 'coin': this.tone('square', 988, t, 0.08, 0.1, 5000, 0.002, S); this.tone('square', 1319, t + 0.07, 0.3, 0.1, 5000, 0.002, S); break;
      case 'cash': for (let i = 0; i < 6; i++) this.tone('triangle', 1600 + i * 180, t + i * 0.05, 0.18, 0.12, 6000, 0.002, S); this.noise(t, 0.3, 0.2, 'highpass', 5000, S); break;
      case 'level': [0, 4, 7, 12, 16].forEach((n, i) => this.tone('square', midi(72 + n), t + i * 0.07, 0.25, 0.1, 4000, 0.003, S)); break;
      case 'whoosh': { const n = this.noise(t, 1.6, 0.45, 'bandpass', 300, S, 2); n.f.frequency.setValueAtTime(250, t); n.f.frequency.exponentialRampToValueAtTime(3000, t + 0.8); n.f.frequency.exponentialRampToValueAtTime(400, t + 1.6); n.g.gain.setValueAtTime(0.01, t); n.g.gain.linearRampToValueAtTime(0.45, t + 0.5); n.g.gain.exponentialRampToValueAtTime(0.001, t + 1.6); break; }
      case 'land': this.kick2(t, 0.9); this.noise(t, 0.6, 0.3, 'lowpass', 600, S); break;
      case 'boom': this.kick2(t, 0.8); this.noise(t, 0.9, 0.5, 'lowpass', 900, S); break;
      case 'explode': this.kick2(t, 1); this.noise(t, 1.6, 0.8, 'lowpass', 700, S); this.noise(t, 0.5, 0.4, 'highpass', 3000, S); break;
      case 'nitro': { const o = this.tone('sawtooth', 90, t, 0.9, 0.18, 1200, 0.02, S); o.frequency.exponentialRampToValueAtTime(320, t + 0.7); this.noise(t, 0.8, 0.25, 'bandpass', 1200, S); break; }
      case 'drift': { const n = this.noise(t, 1.8, 0.3, 'bandpass', 2400, S, 12); n.f.frequency.linearRampToValueAtTime(1600, t + 1.8); break; }
      case 'roar': { const o = this.tone('sawtooth', 110, t, 1.8, 0.3, 800, 0.1, S); o.frequency.exponentialRampToValueAtTime(55, t + 1.8); this.noise(t, 1.6, 0.35, 'lowpass', 500, S); break; }
      case 'alarm': for (let i = 0; i < 4; i++) { this.tone('square', 880, t + i * 0.5, 0.25, 0.12, 3000, 0.01, S); this.tone('square', 660, t + i * 0.5 + 0.25, 0.25, 0.12, 3000, 0.01, S); } break;
      case 'hit': this.noise(t, 0.12, 0.3, 'bandpass', 1500, S, 3); this.tone('square', 220, t, 0.08, 0.1, 2000, 0.002, S); break;
      case 'win': [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => this.tone('square', midi(67 + n), t + i * 0.11, 0.3, 0.1, 4000, 0.003, S)); break;
      case 'chopper': for (let i = 0; i < 24; i++) this.noise(t + i * 0.075, 0.05, 0.25, 'lowpass', 400, S); break;
    }
  }
  kick2(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.5); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.75); }
}

// ---------- MC đọc tiếng Việt (giọng có sẵn trên máy) ----------
export class Voice {
  constructor() {
    this.synth = window.speechSynthesis || null; this.enabled = true; this.queue = []; this.busy = false; this.voice = null; this.relay = null;
    if (this.synth) { this.pick(); this.synth.onvoiceschanged = () => this.pick(); }
  }
  pick() {
    const vs = this.synth.getVoices().filter(v => /^vi([-_]|$)/i.test(v.lang) || /vietnam|tiếng việt/i.test(v.name));
    const score = v => (/natural|online/i.test(v.name) ? 4 : 0) + (/namminh/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0);
    this.voice = vs.sort((a, b) => score(b) - score(a))[0] || null;
  }
  clean(s) { return String(s || '').normalize('NFC').replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ' ').replace(/\s+/g, ' ').trim(); }
  say(text, prio) {
    if (!this.enabled || !text) return;
    text = this.clean(text);
    if (!this.voice) { if (this.relay) this.relay(text, prio); return; }   // máy không có giọng Việt: nhờ trang điều khiển đọc
    if (prio) this.queue.unshift(text); else this.queue.push(text);
    if (this.queue.length > 5) this.queue.length = 5;
    this.pump();
  }
  pump() {
    if (this.busy || !this.queue.length) return;
    const u = new SpeechSynthesisUtterance(this.queue.shift()); u.lang = 'vi-VN'; u.voice = this.voice; u.rate = 1.05;
    this.busy = true; const done = () => { this.busy = false; setTimeout(() => this.pump(), 120); };
    u.onend = done; u.onerror = done; setTimeout(() => { if (this.busy) done(); }, 9000);
    this.synth.speak(u);
  }
}
