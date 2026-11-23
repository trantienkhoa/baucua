// Ngọn Đèn Cuối Cùng — âm thanh rùng rợn tự tổng hợp bằng Web Audio (không cần file nhạc)
(function () {
  const A = { ctx: null, master: null, vol: 0.6, tension: 0, amb: null, box: null, heartAt: 0 };
  const AC = window.AudioContext || window.webkitAudioContext;

  A.init = function () {
    if (A.ctx || !AC) return;
    const c = A.ctx = new AC();
    A.master = c.createGain(); A.master.gain.value = A.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    A.master.connect(comp); comp.connect(c.destination);
    // vang nhẹ cho không gian nhà cổ
    A.verb = c.createConvolver(); A.verb.buffer = impulse(2.6, 2.2);
    A.verbIn = c.createGain(); A.verbIn.gain.value = 0.35;
    A.verbIn.connect(A.verb); A.verb.connect(A.master);
    A.noise = noiseBuf(2);
    startAmbient();
    A.preload();
  };
  A.resume = () => { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {}); };
  A.suspended = () => !A.ctx || A.ctx.state !== 'running';
  A.setVolume = v => { A.vol = Math.max(0, Math.min(1, +v || 0)); if (A.master) A.master.gain.setTargetAtTime(A.vol, A.ctx.currentTime, 0.1); };
  A.setTension = t => { A.tension = Math.max(0, Math.min(1, t)); };
  A.fire = 0; A.setFire = f => { A.fire = Math.max(0, Math.min(1, f)); };

  function noiseBuf(sec) {
    const c = A.ctx, b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function impulse(sec, decay) {
    const c = A.ctx, n = c.sampleRate * sec, b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  const T = () => A.ctx.currentTime;
  function out(node, wet = 0.4, gain = 1) {
    const g = A.ctx.createGain(); g.gain.value = gain; node.connect(g); g.connect(A.master);
    if (wet > 0) { const w = A.ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(A.verbIn); }
    return g;
  }
  function env(g, t0, a, peak, d, end = 0.0001) {
    g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(end, t0 + a + d);
  }
  function osc(type, f, t0, dur, peak, dest, a = 0.01) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    env(g, t0, a, peak, Math.max(0.02, dur - a)); o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.05); return o;
  }
  function noise(t0, dur, peak, dest, type = 'bandpass', freq = 1000, q = 1, a = 0.005) {
    const s = A.ctx.createBufferSource(); s.buffer = A.noise; s.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = A.ctx.createGain(); env(g, t0, a, peak, Math.max(0.02, dur - a));
    s.connect(f); f.connect(g); g.connect(dest); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
    return { s, f, g };
  }

  // ---------- nền: gió, tiếng ù trầm, dế, tim đập theo âm khí ----------
  function startAmbient() {
    const c = A.ctx, bus = out(c.createGain(), 0.25, 1);
    const busIn = c.createGain(); busIn.gain.value = 0.9; busIn.connect(bus);
    // gió
    const w = c.createBufferSource(); w.buffer = A.noise; w.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.7;
    const wg = c.createGain(); wg.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(wf.frequency);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.11; const lg2 = c.createGain(); lg2.gain.value = 0.035; lfo2.connect(lg2); lg2.connect(wg.gain);
    w.connect(wf); wf.connect(wg); wg.connect(busIn); w.start(); lfo.start(); lfo2.start();
    // ù trầm
    const dg = c.createGain(); dg.gain.value = 0.0; dg.connect(busIn);
    for (const f of [41, 41.7, 61.5]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(dg); o.start(); }
    A.amb = { dg, wg };
    setInterval(ambientTick, 250);
  }
  let nextCricket = 0, nextCreak = 8, nextOwl = 30;
  function ambientTick() {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const t = T(), ten = A.tension;
    A.amb.dg.gain.setTargetAtTime(0.03 + ten * 0.16, t, 1.5);
    // dế: im dần khi âm khí cao
    if (t > nextCricket) {
      nextCricket = t + 0.6 + Math.random() * 2.5 + ten * 4;
      if (ten < 0.85 && !A.realReady()) { const n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) osc('sine', 4300 + Math.random() * 300, t + i * 0.07, 0.04, 0.012 * (1 - ten), A.master, 0.003); }
    }
    if (t > nextCreak) { nextCreak = t + 10 + Math.random() * 25; A.play('creak', 0.4); }
    if (t > nextOwl) { nextOwl = t + 35 + Math.random() * 50; if (!A.realReady()) owl(t); }
    // lửa củi lách tách
    if (A.fire > 0 && !A.realReady() && Math.random() < 0.25 + A.fire * 0.5) { const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) noise(t + Math.random() * 0.25, 0.012 + Math.random() * 0.02, 0.15 + A.fire * 0.35, A.master, 'bandpass', 1500 + Math.random() * 3500, 1.5, 0.001); }
    // tim đập khi âm khí > 45%
    if (ten > 0.45) {
      const gap = 1.25 - (ten - 0.45) * 1.3;
      if (t - A.heartAt > gap) { A.heartAt = t; heart(t, 0.25 + ten * 0.45); }
    }
  }
  function heart(t, v) {
    for (const [dt, k] of [[0, 1], [0.18, 0.7]]) {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(70, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.14);
      env(g, t + dt, 0.008, v * k, 0.16); o.connect(g); g.connect(A.master); o.start(t + dt); o.stop(t + dt + 0.25);
    }
  }
  function owl(t) {
    const d = out(A.ctx.createGain(), 0.8, 0.5);
    for (const [dt, len] of [[0, 0.35], [0.55, 0.2], [0.85, 0.6]]) {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(390, t + dt); o.frequency.linearRampToValueAtTime(350, t + dt + len);
      env(g, t + dt, 0.06, 0.05, len); o.connect(g); g.connect(d); o.start(t + dt); o.stop(t + dt + len + 0.1);
    }
  }

  // ---------- hiệu ứng ----------
  const FX = {
    knock(t, v) {
      const d = out(A.ctx.createGain(), 0.5, v);
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.42;
        noise(tt, 0.12, 0.9, d, 'lowpass', 260, 4, 0.002);
        osc('sine', 95, tt, 0.14, 0.7, d, 0.002);
      }
    },
    door(t, v) {
      const d = out(A.ctx.createGain(), 0.5, v);
      creak(t, 1.4, d, 0.5); noise(t + 1.35, 0.3, 0.8, d, 'lowpass', 180, 2, 0.003); osc('sine', 60, t + 1.35, 0.3, 0.8, d, 0.003);
    },
    creak(t, v) { creak(t, 0.9 + Math.random() * 0.8, out(A.ctx.createGain(), 0.5, v), 0.35); },
    steps(t, v) {
      const d = out(A.ctx.createGain(), 0.4, v);
      for (let i = 0; i < 6; i++) { const tt = t + i * 0.55 + Math.random() * 0.05; noise(tt, 0.1, 0.5 * (0.5 + i / 10), d, 'lowpass', 400, 1.5, 0.003); osc('sine', 80, tt, 0.08, 0.3, d, 0.003); }
    },
    whisper(t, v) {
      const d = out(A.ctx.createGain(), 0.7, v);
      for (let i = 0; i < 9; i++) {
        const tt = t + i * 0.18 + Math.random() * 0.1;
        const n = noise(tt, 0.16 + Math.random() * 0.15, 0.25, d, 'bandpass', 2400 + Math.random() * 2600, 6, 0.04);
        n.f.frequency.linearRampToValueAtTime(1800 + Math.random() * 3000, tt + 0.2);
      }
    },
    laugh(t, v) {   // tiếng trẻ con cười khúc khích, vọng
      const d = out(A.ctx.createGain(), 0.9, v * 0.6);
      for (let i = 0; i < 6; i++) {
        const tt = t + i * 0.16, o = A.ctx.createOscillator(), g = A.ctx.createGain(), vib = A.ctx.createOscillator(), vg = A.ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(880 - i * 25, tt); o.frequency.exponentialRampToValueAtTime(620 - i * 20, tt + 0.12);
        vib.frequency.value = 28; vg.gain.value = 30; vib.connect(vg); vg.connect(o.frequency);
        env(g, tt, 0.01, 0.22, 0.11); o.connect(g); g.connect(d); o.start(tt); vib.start(tt); o.stop(tt + 0.16); vib.stop(tt + 0.16);
      }
    },
    cry(t, v) {
      const d = out(A.ctx.createGain(), 0.9, v * 0.5);
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.9, o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(620, tt); o.frequency.linearRampToValueAtTime(480, tt + 0.7);
        const vib = A.ctx.createOscillator(), vg = A.ctx.createGain(); vib.frequency.value = 6; vg.gain.value = 14; vib.connect(vg); vg.connect(o.frequency);
        env(g, tt, 0.15, 0.18, 0.6); o.connect(g); g.connect(d); o.start(tt); vib.start(tt); o.stop(tt + 0.8); vib.stop(tt + 0.8);
      }
    },
    scream(t, v) {
      const d = out(A.ctx.createGain(), 0.6, v);
      for (const f of [740, 783, 1046, 1108]) {
        const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.82, t + 1.2);
        const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
        env(g, t, 0.02, 0.12, 1.2); o.connect(lp); lp.connect(g); g.connect(d); o.start(t); o.stop(t + 1.3);
      }
      noise(t, 0.9, 0.5, d, 'highpass', 1500, 0.5, 0.01);
    },
    jump(t, v) { FX.scream(t, v * 1.2); osc('sine', 48, t, 0.9, 0.9, out(A.ctx.createGain(), 0, v), 0.005); noise(t, 0.5, 0.8, out(A.ctx.createGain(), 0.3, v), 'lowpass', 900, 0.7, 0.003); },
    bell(t, v) {   // chuông chùa
      const d = out(A.ctx.createGain(), 0.8, v);
      for (const [f, k, len] of [[196, 0.5, 5], [392.5, 0.3, 4], [523, 0.18, 3], [657, 0.12, 2.5], [987, 0.06, 1.6]]) osc('sine', f, t, len, k, d, 0.004);
    },
    wind(t, v) { const n = noise(t, 3, 0.35, out(A.ctx.createGain(), 0.4, v), 'bandpass', 300, 1.2, 1); n.f.frequency.linearRampToValueAtTime(900, t + 1.4); n.f.frequency.linearRampToValueAtTime(250, t + 3); },
    heart(t, v) { for (let i = 0; i < 4; i++) heart(t + i * 0.7, 0.7 * v); },
    flicker(t, v) { const d = out(A.ctx.createGain(), 0.2, v); for (let i = 0; i < 5; i++) noise(t + i * 0.07 + Math.random() * 0.05, 0.04, 0.25, d, 'highpass', 3000, 0.5, 0.002); },
    dark(t, v) { const n = noise(t, 1.1, 0.4, out(A.ctx.createGain(), 0.5, v), 'lowpass', 1200, 0.8, 0.02); n.f.frequency.exponentialRampToValueAtTime(120, t + 1); },
    shadow(t, v) { FX.dark(t, v * 0.6); },
    eyes(t, v) { const d = out(A.ctx.createGain(), 0.6, v); osc('sine', 55, t, 2.5, 0.35, d, 0.6); osc('sine', 58.3, t, 2.5, 0.3, d, 0.6); },
    ghost(t, v) { const d = out(A.ctx.createGain(), 0.9, v); const o = osc('sine', 300, t, 2.2, 0.12, d, 0.5); o.frequency.linearRampToValueAtTime(240, t + 2.2); osc('sine', 317, t, 2.2, 0.1, d, 0.5); },
    musicbox(t, v) {
      const d = out(A.ctx.createGain(), 0.7, v * 0.55);
      const mel = [76, 79, 83, 81, 79, 76, 74, 76, 0, 76, 79, 83, 84, 83, 81, 79];   // giai điệu hộp nhạc lệch tông
      mel.forEach((m, i) => { if (!m) return; const f = 440 * Math.pow(2, (m - 69) / 12) * (1 - i * 0.002); osc('triangle', f, t + i * 0.32, 0.6, 0.25, d, 0.002); osc('sine', f * 2.01, t + i * 0.32, 0.3, 0.06, d, 0.002); });
    },
    phone(t, v) { const d = out(A.ctx.createGain(), 0.3, v * 0.5); for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) { osc('square', i % 2 ? 1320 : 1180, t + r * 1.4 + i * 0.05, 0.05, 0.08, d, 0.002); } },
    drip(t, v) { const d = out(A.ctx.createGain(), 0.8, v); for (let i = 0; i < 5; i++) { const tt = t + i * 0.6 + Math.random() * 0.2, o = osc('sine', 1400, tt, 0.09, 0.25, d, 0.002); o.frequency.exponentialRampToValueAtTime(500, tt + 0.08); } },
    clock(t, v) { const d = out(A.ctx.createGain(), 0.6, v); for (let i = 0; i < 6; i++) noise(t + i * 0.5, 0.03, 0.4, d, 'bandpass', i % 2 ? 2500 : 1800, 8, 0.001); for (let i = 0; i < 3; i++) FX.bell(t + 3.2 + i * 1.3, v * 0.35); },
    mirror(t, v) { const d = out(A.ctx.createGain(), 1, v * 0.6); for (const f of [1567, 1661, 2093]) osc('sine', f, t, 2.4, 0.06, d, 0.3); },
    match(t, v) { const d = out(A.ctx.createGain(), 0.3, v); noise(t, 0.25, 0.6, d, 'highpass', 2000, 0.6, 0.005); noise(t + 0.2, 0.8, 0.25, d, 'bandpass', 700, 0.8, 0.05); },
    salt(t, v) { const d = out(A.ctx.createGain(), 0.3, v); for (let i = 0; i < 25; i++) noise(t + Math.random() * 0.6, 0.02, 0.18, d, 'highpass', 5000, 0.5, 0.001); },
    incense(t, v) { const d = out(A.ctx.createGain(), 0.8, v * 0.5); osc('sine', 1046, t, 1.6, 0.12, d, 0.004); osc('sine', 1568, t + 0.12, 1.4, 0.07, d, 0.004); },
    tick(t, v) { noise(t, 0.03, 0.35 * v, A.master, 'bandpass', 2600, 10, 0.001); },
    vote(t, v) { osc('triangle', 660, t, 0.12, 0.12 * v, A.master, 0.004); },
    possess(t, v) {   // tiếng gầm trầm
      const d = out(A.ctx.createGain(), 0.6, v);
      const o = A.ctx.createOscillator(), g = A.ctx.createGain(), lp = A.ctx.createBiquadFilter(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(48, t + 2); lp.type = 'lowpass'; lp.frequency.value = 400;
      const am = A.ctx.createOscillator(), ag = A.ctx.createGain(); am.frequency.value = 23; ag.gain.value = 0.25; am.connect(ag); ag.connect(g.gain);
      env(g, t, 0.3, 0.4, 1.8); o.connect(lp); lp.connect(g); g.connect(d); o.start(t); am.start(t); o.stop(t + 2.2); am.stop(t + 2.2);
    },
    taken(t, v) { const n = noise(t, 1.4, 0.6, out(A.ctx.createGain(), 0.7, v), 'bandpass', 1800, 2, 0.02); n.f.frequency.exponentialRampToValueAtTime(150, t + 1.3); const o = osc('sawtooth', 900, t + 0.1, 1.2, 0.08, out(A.ctx.createGain(), 0.9, v), 0.02); o.frequency.exponentialRampToValueAtTime(200, t + 1.3); },
    lampout(t, v) { const n = noise(t, 0.7, 0.6, out(A.ctx.createGain(), 0.4, v), 'lowpass', 2500, 0.5, 0.01); n.f.frequency.exponentialRampToValueAtTime(100, t + 0.6); },
    success(t, v) { FX.bell(t, v); const d = out(A.ctx.createGain(), 0.9, v * 0.5); for (const f of [261.6, 329.6, 392, 523.2]) osc('sine', f, t + 0.1, 3.5, 0.08, d, 0.6); },
    ouija(t, v) { const d = out(A.ctx.createGain(), 0.6, v); osc('sine', 110, t, 1, 0.12, d, 0.2); osc('sine', 116.5, t, 1, 0.1, d, 0.2); },
    crackle(t, v) { const d = out(A.ctx.createGain(), 0.2, v); for (let i = 0; i < 12; i++) noise(t + Math.random() * 0.5, 0.015 + Math.random() * 0.03, 0.4 + Math.random() * 0.4, d, 'bandpass', 1200 + Math.random() * 4000, 1.2, 0.001); noise(t, 0.6, 0.18, d, 'lowpass', 500, 0.7, 0.05); },
    slide(t, v) { noise(t, 0.4, 0.1 * v, out(A.ctx.createGain(), 0.2, 1), 'bandpass', 900, 2, 0.05); },
  };
  function creak(t, dur, dest, peak) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain(), bp = A.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(38 + Math.random() * 20, t);
    for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(30 + Math.random() * 60, t + dur * i / 8);
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6;
    env(g, t, 0.1, peak, dur - 0.1); o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- giọng kể VieNeu: hạ giọng, chậm lại, vang nhà hoang, tiếng vọng, lớp thì thầm ----------
  // lvl: 0 = giọng gốc, 1 = hơi rợn, 2 = rợn, 3 = rất rợn
  const VOICE_FX = [
    { rate: 1, wet: 0, fb: 0, delay: 0, ghost: 0, trem: 0, low: 0, high: 0 },
    { rate: 0.95, wet: 0.22, fb: 0.12, delay: 0.21, ghost: 0.05, trem: 0, low: 3, high: -3 },
    { rate: 0.9, wet: 0.38, fb: 0.22, delay: 0.24, ghost: 0.11, trem: 0.07, low: 5, high: -5 },
    { rate: 0.84, wet: 0.55, fb: 0.32, delay: 0.27, ghost: 0.18, trem: 0.14, low: 7, high: -7 },
    // 4–5: giọng ông Tư
    // xử lý nhẹ thôi: hạ giọng / làm rè / rung đều đặn nhiều sẽ thành giọng máy. Độ già chủ yếu nhờ chọn giọng VieNeu trầm, chậm (Đức Trí, Thiền Tâm Đức)
    { rate: 0.88, wet: 0.12, fb: 0, delay: 0, ghost: 0, trem: 0, low: 4, high: -6 },   // 4: chậm + trầm 12%
    { rate: 0.84, wet: 0.12, fb: 0, delay: 0, ghost: 0, trem: 0, low: 4, high: -6 },   // 5: 16%
    { rate: 0.80, wet: 0.12, fb: 0, delay: 0, ghost: 0, trem: 0, low: 4, high: -6 },   // 6: 20%
  ];
  A.voiceBusy = false;
  A.decode = buf => A.ctx.decodeAudioData(buf);
  A.playVoice = function (buffer, lvl = 2, vol = 1) {
    return new Promise(resolve => {
      if (!A.ctx || A.ctx.state !== 'running') return resolve(false);
      const c = A.ctx, P = VOICE_FX[Math.max(0, Math.min(VOICE_FX.length - 1, lvl | 0))], t = c.currentTime + 0.03;
      const bus = c.createGain(); bus.gain.value = Math.max(0, Math.min(1.5, vol)) * 1.6; bus.connect(A.master);
      const src = c.createBufferSource(); src.buffer = buffer; src.playbackRate.value = P.rate;
      const lo = c.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = 220; lo.gain.value = P.low;
      const hi = c.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 4500; hi.gain.value = P.high;
      const dry = c.createGain(); dry.gain.value = 1;
      let head = src;
      if (P.mid) { const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1400; pk.Q.value = 1; pk.gain.value = P.mid; src.connect(pk); head = pk; }
      head.connect(lo); lo.connect(hi); hi.connect(dry); dry.connect(bus);
      if (P.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 4.6; lg.gain.value = P.rate * P.vib; l.connect(lg); lg.connect(src.playbackRate); l.start(t); l.stop(t + buffer.duration / P.rate + 3); }   // giọng run của người già
      if (P.rasp) {   // tiếng khàn: dải giữa được bóp méo nhẹ trộn lại
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 0.8;
        const ws = c.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 9) * 0.6; } ws.curve = curve;
        const rg = c.createGain(); rg.gain.value = P.rasp; src.connect(bp); bp.connect(ws); ws.connect(rg); rg.connect(lo);
      }
      const an = c.createAnalyser(); an.fftSize = 512; hi.connect(an); A.voiceAn = an;   // đo độ to giọng để nhân vật nhép miệng
      if (P.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = P.trem; l.connect(lg); lg.connect(dry.gain); l.start(t); l.stop(t + buffer.duration / P.rate + 3); }
      if (P.wet) { const w = c.createGain(); w.gain.value = P.wet; hi.connect(w); w.connect(A.verbIn); }
      if (P.fb) {   // tiếng vọng
        const d = c.createDelay(1), fb = c.createGain(), eg = c.createGain(), lp = c.createBiquadFilter();
        d.delayTime.value = P.delay; fb.gain.value = P.fb; eg.gain.value = 0.35; lp.type = 'lowpass'; lp.frequency.value = 2200;
        hi.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(eg); eg.connect(bus);
      }
      let src2 = null;
      if (P.ghost) {   // lớp thì thầm lệch nhịp phía sau
        src2 = c.createBufferSource(); src2.buffer = buffer; src2.playbackRate.value = P.rate * 0.985;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1600;
        const g2 = c.createGain(); g2.gain.value = P.ghost;
        src2.connect(hp); hp.connect(g2); g2.connect(A.verbIn); g2.connect(bus);
      }
      // hạ tiếng gió / ù nền khi đang kể
      if (A.amb) { A.amb.wg.gain.setTargetAtTime(0.015, t, 0.3); }
      A.voiceBusy = true;
      src.onended = () => { A.voiceBusy = false; A.voiceAn = null; if (A.amb) A.amb.wg.gain.setTargetAtTime(0.05, c.currentTime, 1); resolve(true); };
      src.start(t); if (src2) src2.start(t + 0.035);
    });
  };

  const _buf = new Float32Array(512);
  A.voiceLevel = () => {   // 0..1 theo âm lượng giọng đang phát
    if (!A.voiceAn) return 0;
    A.voiceAn.getFloatTimeDomainData(_buf);
    let s = 0; for (let i = 0; i < _buf.length; i++) s += _buf[i] * _buf[i];
    return Math.min(1, Math.sqrt(s / _buf.length) * 5);
  };
  A.play = function (name, v = 1, delay = 0) {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const f = FX[name]; if (!f) return;
    try { f(T() + 0.02 + delay, v); } catch (e) { /* bỏ qua */ }
  };
  A.has = name => !!FX[name];

  // ---------- âm thanh môi trường thu thật (public/models/ma/I): mỗi cảnh một bộ lớp nền + tiếng thưa ----------
  const SND = '/models/ma/I/', BUF = {}, LOADING = {};
  function buf(n) {
    if (BUF[n] || LOADING[n] || !A.ctx) return BUF[n];
    LOADING[n] = fetch(SND + n + '.ogg').then(r => r.arrayBuffer()).then(b => A.ctx.decodeAudioData(b)).then(d => { BUF[n] = d; }).catch(() => {});
    return null;
  }
  // [lớp lặp liền, âm lượng] · [tiếng thưa thỉnh thoảng, âm lượng]
  const SCENE_SND = {
    dong: { loop: [['ech-nhai-de-keu', 0.5], ['gio-lua-tre-keo-ket', 0.18]], occ: [['cho-tru-xa', 0.35]] },
    chuoi: { loop: [['ech-nhai-de-keu', 0.4], ['la-chuoi-xao-xac', 0.55]], occ: [['cu-keu', 0.4]] },
    rungtre: { loop: [['gio-lua-tre-keo-ket', 0.45], ['ech-nhai-de-keu', 0.2]], occ: [['cu-keu', 0.45]] },
    gieng: { loop: [['nuoc-gieng-nho-giot', 0.35], ['ech-nhai-de-keu', 0.35]], occ: [['cho-tru-xa', 0.3]] },
    cayda: { loop: [['la-chuoi-xao-xac', 0.5], ['ech-nhai-de-keu', 0.3]], occ: [['cu-keu', 0.45], ['qua-keu', 0.3]] },
    nghiadia: { loop: [['gio-lua-tre-keo-ket', 0.3], ['ech-nhai-de-keu', 0.2]], occ: [['qua-keu', 0.4], ['cho-tru-xa', 0.4]] },
    mieu: { loop: [['gio-lua-tre-keo-ket', 0.3], ['la-chuoi-xao-xac', 0.3]], occ: [['cu-keu', 0.4], ['mo-go', 0.25]] },
    bendo: { loop: [['nuoc-vo-man-do', 0.4], ['ech-nhai-de-keu', 0.35]], occ: [['cho-tru-xa', 0.3]] },
    choma: { loop: [['gio-lua-tre-keo-ket', 0.25], ['ech-nhai-de-keu', 0.25]], occ: [['cho-tru-xa', 0.4], ['qua-keu', 0.3]] },
    duongray: { loop: [['gio-lua-tre-keo-ket', 0.3], ['tau-hoa-xa-xa', 0.3]], occ: [['qua-keu', 0.3]] },
    nhahoang: { loop: [['gio-lua-tre-keo-ket', 0.4]], occ: [['qua-keu', 0.35], ['cho-tru-xa', 0.3]] },
    dinh: { loop: [['ech-nhai-de-keu', 0.35], ['gio-lua-tre-keo-ket', 0.15]], occ: [['chuong-dinh', 0.35], ['trong-dinh-vong-lai', 0.35]] },
    nhacu: { loop: [['gio-lua-tre-keo-ket', 0.3]], occ: [['qua-keu', 0.25]] },
  };
  const layers = new Map();   // tên → { src, g }
  let curScene = null, nextOcc = 0, fireL = null, stepL = null, walking = false;
  function loopOn(n, vol, fade = 2.5) {
    const b = buf(n); if (!b) return false;
    let L = layers.get(n);
    if (!L) { const src = A.ctx.createBufferSource(); src.buffer = b; src.loop = true; const g = A.ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(A.master); src.start(T(), Math.random() * b.duration); L = { src, g }; layers.set(n, L); }
    L.g.gain.setTargetAtTime(vol, T(), fade / 3); return true;
  }
  function once(n, vol, maxDur) {
    const b = buf(n); if (!b || !A.ctx || A.ctx.state !== 'running') return;
    const src = A.ctx.createBufferSource(), g = A.ctx.createGain(); src.buffer = b; g.gain.value = vol; src.connect(g); g.connect(A.master); if (A.verbIn) g.connect(A.verbIn);
    const off = maxDur ? Math.random() * Math.max(0, b.duration - maxDur) : 0; src.start(T(), off, maxDur || b.duration);
  }
  A.realReady = () => !!BUF['cui-no-lach-tach'];
  // gọi mỗi khung: tên cảnh hiện tại + đang đi đường (đổi cảnh 3D)
  A.scene = function (name, travel) {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const cfg = SCENE_SND[name] || SCENE_SND.dong, t = T(), hushed = t < A.hushUntil;
    const want = new Map(cfg.loop.map(([n, v]) => [n, hushed ? 0 : v * (travel ? 0.5 : 1) * (1 - A.tension * 0.4)]));
    for (const [n, L] of layers) if (!want.has(n)) L.g.gain.setTargetAtTime(0, t, 1);
    for (const [n, v] of want) loopOn(n, v, hushed ? 0.25 : 2.5);
    if (name !== curScene) { curScene = name; nextOcc = t + 8 + Math.random() * 10; for (const [n] of cfg.occ) buf(n); }
    if (t > nextOcc && cfg.occ.length && !travel) { const [n, v] = cfg.occ[Math.floor(Math.random() * cfg.occ.length)]; once(n, v * (0.7 + Math.random() * 0.3), 6); nextOcc = t + 25 + Math.random() * 35; }
    // tiếng củi cháy thật theo lượng củi
    const fb = buf('cui-no-lach-tach');
    if (fb) { if (!fireL) { loopOn('cui-no-lach-tach', 0); fireL = layers.get('cui-no-lach-tach'); } if (fireL) fireL.g.gain.setTargetAtTime(hushed ? 0.05 : A.fire > 0 ? 0.35 + A.fire * 0.9 : 0, t, hushed ? 0.08 : 0.6); }
    // bước chân khi ông Tư dẫn đoàn đi
    if (travel !== walking) { walking = travel; const sn = Math.random() < 0.5 ? 'buoc-chan-la-kho' : 'buoc-chan-soi'; if (travel) { loopOn(sn, 0.55, 1); stepL = sn; } else if (stepL && layers.get(stepL)) { layers.get(stepL).g.gain.setTargetAtTime(0, t, 0.5); } }
  };
  A.real = (n, vol = 0.6, maxDur) => once(n, vol, maxDur);
  // im bặt: mọi tiếng nền (ếch, gió, củi) tắt ngấm trong vài giây — để tiếng động sau đó làm giật mình
  A.hushUntil = 0;
  A.hush = dur => { if (!A.ctx) return; A.hushUntil = T() + dur; if (A.amb) { A.amb.wg.gain.setTargetAtTime(0, T(), 0.08); setTimeout(() => A.amb && A.amb.wg.gain.setTargetAtTime(0.05, T(), 1), dur * 1000); } };
  // tiếng thì thầm đi một vòng từ tai trái sang tai phải (nghe tai nghe rõ nhất)
  A.whisperPan = (v = 0.8) => {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const c = A.ctx, t = T() + 0.02, sp = c.createStereoPanner ? c.createStereoPanner() : null, d = c.createGain(); d.gain.value = v;
    if (sp) { sp.pan.setValueAtTime(-1, t); sp.pan.linearRampToValueAtTime(1, t + 2.6); d.connect(sp); sp.connect(A.master); } else d.connect(A.master);
    const w = c.createGain(); w.gain.value = 0.45; d.connect(w); w.connect(A.verbIn);
    for (let i = 0; i < 16; i++) { const tt = t + i * 0.16 + Math.random() * 0.06; const n = noise(tt, 0.14 + Math.random() * 0.12, 0.3, d, 'bandpass', 2200 + Math.random() * 2800, 6, 0.03); n.f.frequency.linearRampToValueAtTime(1700 + Math.random() * 3000, tt + 0.18); }
  };
  // tiếng gió vụt qua (bóng đen lướt)
  A.whoosh = (v = 0.7) => {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const c = A.ctx, t = T() + 0.02, d = c.createGain(), sp = c.createStereoPanner ? c.createStereoPanner() : null;
    if (sp) { sp.pan.setValueAtTime(-0.9, t); sp.pan.linearRampToValueAtTime(0.9, t + 0.9); d.connect(sp); sp.connect(A.master); } else d.connect(A.master);
    const n = noise(t, 1.0, 0.55 * v, d, 'bandpass', 500, 1.2, 0.25); n.f.frequency.setValueAtTime(400, t); n.f.frequency.exponentialRampToValueAtTime(1800, t + 0.45); n.f.frequency.exponentialRampToValueAtTime(350, t + 1.0);
  };   // tiếng sự kiện: mõ khi niệm Phật, chuông khi trừ tà
  A.preload = () => { for (const n of ['cui-no-lach-tach', 'ech-nhai-de-keu', 'gio-lua-tre-keo-ket', 'mo-go', 'chuong-dinh']) buf(n); };
  window.MaAudio = A;
})();
