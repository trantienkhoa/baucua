// Nhạc nền + đồng hồ nhịp. Có bài tải lên → phát bài và dò nhịp; không có → máy tự đánh nhạc EDM.
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const A = {
    ctx: null, master: null, analyser: null, freq: null,
    el: null, src: null,
    playlist: [], order: [], idx: -1,
    mode: 'none',          // track | synth | none
    bpm: 124, interval: 60 / 124,
    beat: 0, nextBeat: 0, phase: 0, energy: 0, onset: false,
    hist: [], lastOnset: 0, iois: [],
    settings: { musicEnabled: true, synthMusic: true, volume: 0.35 },
    nextNoteTime: 0, step: 0, startAt: 0,
  };

  function now() { return A.ctx ? A.ctx.currentTime : performance.now() / 1000; }

  A.init = function () {
    if (A.ctx) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    A.master = A.ctx.createGain(); A.master.gain.value = A.settings.volume;
    A.analyser = A.ctx.createAnalyser(); A.analyser.fftSize = 1024; A.analyser.smoothingTimeConstant = 0.6;
    A.freq = new Uint8Array(A.analyser.frequencyBinCount);
    A.master.connect(A.analyser); A.analyser.connect(A.ctx.destination);
    A.el = new Audio(); A.el.crossOrigin = 'anonymous'; A.el.preload = 'auto';
    A.src = A.ctx.createMediaElementSource(A.el); A.src.connect(A.master);
    A.el.addEventListener('ended', () => A.nextTrack());
    A.el.addEventListener('error', () => setTimeout(() => A.nextTrack(), 500));
    A.nextBeat = now() + A.interval;
    A.apply();
  };
  A.suspended = () => !A.ctx || A.ctx.state !== 'running';
  A.resume = () => { if (A.ctx) A.ctx.resume(); };

  A.setSettings = function (s) {
    Object.assign(A.settings, { musicEnabled: !!s.musicEnabled, synthMusic: !!s.synthMusic, volume: Number(s.volume) });
    if (A.master) A.master.gain.setTargetAtTime(Math.max(0, Math.min(1, A.settings.volume || 0)), A.ctx.currentTime, 0.1);
    A.apply();
  };
  A.setPlaylist = function (list) {
    const changed = JSON.stringify(list) !== JSON.stringify(A.playlist);
    A.playlist = list || [];
    if (changed) { A.order = shuffle(A.playlist.slice()); A.idx = -1; if (A.mode === 'track' || A.playlist.length) A.apply(true); }
  };
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  A.apply = function (force) {
    if (!A.ctx) return;
    const want = A.settings.musicEnabled && A.playlist.length ? 'track' : (A.settings.synthMusic ? 'synth' : 'none');
    if (want === A.mode && !force) return;
    if (A.mode === 'track' && want !== 'track') A.el.pause();
    A.mode = want;
    if (want === 'track') A.nextTrack();
    if (want === 'synth') { A.bpm = 124; A.interval = 60 / A.bpm; A.nextNoteTime = A.ctx.currentTime + 0.1; A.step = 0; A.startAt = A.nextNoteTime; A.nextBeat = A.startAt; }
  };
  A.nextTrack = function () {
    if (A.mode !== 'track' || !A.playlist.length) return;
    A.idx = (A.idx + 1) % A.order.length;
    if (A.idx === 0) A.order = shuffle(A.playlist.slice());
    A.el.src = '/music/' + encodeURIComponent(A.order[A.idx]);
    A.iois = []; A.hist = [];
    A.el.play().catch(() => {});
  };
  A.trackName = () => A.mode === 'track' && A.order[A.idx] ? A.order[A.idx].replace(/\.[^.]+$/, '') : '';

  // ---------- máy tự đánh nhạc ----------
  const BASS = [41.2, 41.2, 49.0, 55.0, 36.7, 36.7, 49.0, 43.65]; // E1.. tiến trình
  const CHORDS = [[329.6, 392, 493.9], [293.7, 370, 440], [261.6, 329.6, 392], [293.7, 370, 440]];
  function kick(t) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.4);
  }
  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = A.ctx.createBuffer(1, A.ctx.sampleRate * 0.5, A.ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function hat(t, open) {
    const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    s.buffer = noise(); f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(open ? 0.18 : 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.2 : 0.05));
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t + 0.25);
  }
  function clap(t) {
    const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    s.buffer = noise(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t + 0.2);
  }
  function bass(t, fr, dur) {
    const o = A.ctx.createOscillator(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = fr * 2;
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05);
  }
  function stab(t, notes) {
    for (const fr of notes) {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = 'square'; o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.25);
    }
  }
  function scheduleSynth() {
    const spb = A.interval / 4; // nốt móc kép
    while (A.nextNoteTime < A.ctx.currentTime + 0.15) {
      const t = A.nextNoteTime, s = A.step % 16, bar = Math.floor(A.step / 16) % 8, section = Math.floor(A.step / 128) % 4;
      if (s % 4 === 0 && !(section === 3 && bar >= 6)) kick(t);
      if (s % 4 === 2) hat(t, true); else if (section > 0) hat(t, false);
      if ((s === 4 || s === 12) && section > 0) clap(t);
      if (s % 4 === 2 || s === 15) bass(t, BASS[bar], spb * 1.8);
      if (section >= 2 && (s === 3 || s === 6 || s === 10)) stab(t, CHORDS[Math.floor(bar / 2)]);
      A.nextNoteTime += spb; A.step++;
    }
  }

  // ---------- đồng hồ nhịp ----------
  A.update = function () {
    const t = now();
    A.onset = false;
    if (A.ctx && A.mode === 'synth') {
      scheduleSynth();
      const el = t - A.startAt;
      const bf = el / A.interval;
      A.beat = Math.max(0, Math.floor(bf)); A.phase = bf - Math.floor(bf);
      if (bf < 0) A.phase = 0;
      A.analyser.getByteFrequencyData(A.freq);
      A.energy = bandEnergy();
      return;
    }
    if (A.ctx && A.mode === 'track' && !A.el.paused) {
      A.analyser.getByteFrequencyData(A.freq);
      const e = bandEnergy();
      A.energy = e;
      A.hist.push(e); if (A.hist.length > 60) A.hist.shift();
      const avg = A.hist.reduce((x, y) => x + y, 0) / A.hist.length;
      if (e > avg * 1.3 && e > 0.25 && t - A.lastOnset > 0.28) {
        let ioi = t - A.lastOnset;
        A.lastOnset = t; A.onset = true;
        while (ioi > 0.75 && ioi < 3) ioi /= 2;
        while (ioi < 0.35 && ioi > 0.1) ioi *= 2;
        if (ioi >= 0.35 && ioi <= 0.75) { A.iois.push(ioi); if (A.iois.length > 24) A.iois.shift(); }
        if (A.iois.length > 4) {
          const s = A.iois.slice().sort((a, b) => a - b), med = s[s.length >> 1];
          A.interval += (med - A.interval) * 0.15; A.bpm = 60 / A.interval;
        }
        // kéo pha về phía nhịp vừa nghe
        let diff = t - (A.nextBeat - A.interval);
        if (diff > A.interval / 2) diff -= A.interval;
        A.nextBeat += diff * 0.35;
      }
    } else {
      A.energy *= 0.95;
      if (A.mode !== 'synth') { A.interval += (60 / 120 - A.interval) * 0.01; }
    }
    while (t >= A.nextBeat) { A.nextBeat += A.interval; A.beat++; }
    if (A.nextBeat - t > A.interval * 1.5) A.nextBeat = t + A.interval;
    A.phase = Math.max(0, Math.min(0.999, 1 - (A.nextBeat - t) / A.interval));
  };
  function bandEnergy() {
    let s = 0; const n = 6; for (let i = 1; i <= n; i++) s += A.freq[i];
    return s / n / 255;
  }
  A.spectrum = () => A.freq;

  window.Music = A;
})();
