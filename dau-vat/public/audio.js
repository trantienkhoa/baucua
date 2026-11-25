// Âm thanh tổng hợp bằng WebAudio (không cần file nhạc): tiếng khán giả, chuông, va đập, nhạc ra sân theo từng đô vật.
let ctx = null, master = null, crowdGain = null, musicGain = null, sfxGain = null, crowdFilter = null;
let started = false, vol = 0.5;
const S = {};

S.start = () => {
  if (started) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  started = true;
  master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(comp);
  musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(comp);
  // tiếng đám đông: nhiễu hồng lọc dải + điều biên
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
  }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  crowdFilter = ctx.createBiquadFilter(); crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 700; crowdFilter.Q.value = 0.6;
  crowdGain = ctx.createGain(); crowdGain.gain.value = 0.15;
  src.connect(crowdFilter); crowdFilter.connect(crowdGain); crowdGain.connect(comp); src.start();
  // tiếng hò reo "ô ô" (formant) cho cao trào
  S._ohs = [];
};
S.started = () => started && ctx && ctx.state === 'running';
S.setVolume = v => { vol = v; if (master) master.gain.value = v; };
// mức phấn khích khán giả 0..1
S.crowd = h => { if (!crowdGain) return; const t = ctx.currentTime; crowdGain.gain.setTargetAtTime(0.1 + h * 0.5, t, 0.3); crowdFilter.frequency.setTargetAtTime(550 + h * 650, t, 0.3); };
// khán giả bùng nổ
S.pop = (k = 1) => {
  if (!ctx) return;
  const t = ctx.currentTime;
  crowdGain.gain.cancelScheduledValues(t); crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
  crowdGain.gain.linearRampToValueAtTime(0.35 + 0.55 * k, t + 0.12); crowdGain.gain.setTargetAtTime(0.25, t + 0.8, 0.8);
  // tiếng "Ồ" formant
  for (const f of [320, 700, 2400]) {
    const o = ctx.createOscillator(), g = ctx.createGain(), n = noise(1.6);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 3;
    n.connect(bp); bp.connect(g); g.connect(sfxGain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25 * k, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    n.start(t); n.stop(t + 1.6); o.disconnect();
  }
};
function noise(dur) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur)), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
// chuông võ đài
S.bell = (n = 3) => {
  if (!ctx) return;
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * 0.32;
    for (const [f, a] of [[1240, 0.35], [2480 * 1.01, 0.18], [3720 * 0.98, 0.1], [620, 0.12]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = 'sine';
      o.connect(g); g.connect(sfxGain); env(g, t, 0.003, a, 1.4); o.start(t); o.stop(t + 1.5);
    }
  }
};
// va đập: slam (thân người đập sàn), punch, chop, thud, smack, chair (kim loại)
S.hit = (kind = 'slam', k = 1) => {
  if (!ctx) return;
  const t = ctx.currentTime;
  const thump = (f0, f1, dur, a) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(g); g.connect(sfxGain); env(g, t, 0.002, a, dur); o.start(t); o.stop(t + dur + 0.05); };
  const burst = (f, q, dur, a, type = 'bandpass') => { const n = noise(dur + 0.05), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = type; bp.frequency.value = f; bp.Q.value = q; n.connect(bp); bp.connect(g); g.connect(sfxGain); env(g, t, 0.001, a, dur); n.start(t); n.stop(t + dur + 0.05); };
  if (kind === 'slam') { thump(120, 38, 0.45, 1.0 * k); burst(400, 0.8, 0.25, 0.7 * k); burst(2600, 1, 0.08, 0.25 * k); }
  else if (kind === 'punch') { thump(180, 60, 0.12, 0.6 * k); burst(1500, 1.2, 0.06, 0.5 * k); }
  else if (kind === 'chop') { burst(3000, 0.7, 0.09, 0.8 * k, 'highpass'); thump(220, 90, 0.08, 0.3 * k); }
  else if (kind === 'smack') { thump(160, 50, 0.2, 0.8 * k); burst(2200, 0.9, 0.1, 0.55 * k); }
  else if (kind === 'thud') { thump(90, 40, 0.3, 0.7 * k); burst(300, 1, 0.15, 0.3 * k); }
  else if (kind === 'chair') { for (const f of [520, 1310, 2170, 3400]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f * (0.98 + Math.random() * 0.04); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 8; o.connect(bp); bp.connect(g); g.connect(sfxGain); env(g, t, 0.001, 0.25 * k, 0.6); o.start(t); o.stop(t + 0.7); } burst(3000, 0.5, 0.15, 0.6 * k); }
  else if (kind === 'wood') { burst(900, 0.6, 0.35, 0.9 * k); thump(140, 50, 0.3, 0.7 * k); for (let i = 0; i < 5; i++) setTimeout(() => S.hit('punch', 0.25), 40 + i * 50); }
  else if (kind === 'boom') { thump(80, 25, 1.2, 1.2 * k); burst(200, 0.5, 0.9, 0.9 * k, 'lowpass'); }
  else if (kind === 'mat') { burst(1800, 0.8, 0.07, 0.6 * k); thump(130, 60, 0.12, 0.4 * k); }
};

// ---------- nhạc ra sân (bộ trống + bass + hợp âm theo phong cách) ----------
let seq = null;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
S.theme = (th, dur = 14) => {
  if (!ctx) return;
  S.stopTheme();
  const style = th.style || 'rock', bpm = th.bpm || 120, root = th.key || 40;
  const step = 60 / bpm / 4;   // nốt móc kép
  const t0 = ctx.currentTime + 0.05;
  musicGain.gain.cancelScheduledValues(t0); musicGain.gain.setValueAtTime(0.0001, t0); musicGain.gain.linearRampToValueAtTime(0.55, t0 + 0.4);
  const steps = Math.floor(dur / step);
  const prog = { rock: [0, 0, 5, 3], metal: [0, 1, 0, -2], dark: [0, 0, 1, -1], hiphop: [0, 0, -2, -4], electro: [0, 5, 3, -2], latin: [0, 5, 7, 5] }[style] || [0, 5, 3, 0];
  const drums = {
    rock: { k: [0, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] }, metal: { k: [0, 2, 4, 6, 8, 10, 12, 14], s: [4, 12], h: [0, 4, 8, 12] },
    dark: { k: [0, 10], s: [8], h: [0, 4, 8, 12] }, hiphop: { k: [0, 7, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14, 15] },
    electro: { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14] }, latin: { k: [0, 6, 8, 14], s: [4, 11, 12], h: [0, 3, 6, 8, 10, 12, 14] },
  }[style] || { k: [0, 8], s: [4, 12], h: [0, 4, 8, 12] };
  const out = musicGain;
  const nodes = [];
  for (let i = 0; i < steps; i++) {
    const t = t0 + i * step, s16 = i % 16, bar = Math.floor(i / 16), ch = root + prog[bar % prog.length];
    if (drums.k.includes(s16)) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g); g.connect(out); env(g, t, 0.002, 0.9, 0.18); o.start(t); o.stop(t + 0.22); nodes.push(o); }
    if (drums.s.includes(s16)) { const n = noise(0.2), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7; n.connect(f); f.connect(g); g.connect(out); env(g, t, 0.001, 0.5, 0.16); n.start(t); n.stop(t + 0.2); nodes.push(n); }
    if (drums.h.includes(s16)) { const n = noise(0.05), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7000; n.connect(f); f.connect(g); g.connect(out); env(g, t, 0.001, 0.12, 0.04); n.start(t); n.stop(t + 0.06); nodes.push(n); }
    // bass
    if (s16 % (style === 'metal' ? 1 : 2) === 0 && !(style === 'dark' && s16 % 8)) { const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = midi(ch - 12 + (style === 'hiphop' && s16 === 10 ? 3 : 0)); f.type = 'lowpass'; f.frequency.value = 500; o.connect(f); f.connect(g); g.connect(out); env(g, t, 0.005, 0.32, step * 1.6); o.start(t); o.stop(t + step * 2); nodes.push(o); }
    // hợp âm / guitar điện / synth
    if (s16 === 0 || (style !== 'dark' && s16 === 8) || (style === 'electro' && s16 % 2 === 0) || (style === 'latin' && [0, 3, 6, 10].includes(s16))) {
      const notes = style === 'electro' ? [ch + 12 + [0, 7, 12, 15][s16 / 2 % 4 | 0]] : [ch, ch + 7, ch + 12];
      for (const nn of notes) {
        const o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
        o.type = style === 'electro' ? 'square' : 'sawtooth'; o.frequency.value = midi(nn + (style === 'latin' ? 12 : 0)); o.detune.value = (Math.random() - 0.5) * 12;
        if (style === 'rock' || style === 'metal') { const c = new Float32Array(256); for (let k = 0; k < 256; k++) { const x = k / 128 - 1; c[k] = Math.tanh(x * 6); } sh.curve = c; o.connect(sh); sh.connect(g); } else o.connect(g);
        g.connect(out); env(g, t, 0.01, style === 'electro' ? 0.08 : 0.1, style === 'dark' ? step * 14 : step * (style === 'electro' ? 1.5 : 6)); o.start(t); o.stop(t + step * 15); nodes.push(o);
      }
    }
  }
  seq = { nodes, end: t0 + dur };
  musicGain.gain.setValueAtTime(0.55, t0 + dur - 1.2); musicGain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
};
S.stopTheme = (fade = 0.6) => {
  if (!seq || !ctx) return;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t); musicGain.gain.setValueAtTime(musicGain.gain.value, t); musicGain.gain.linearRampToValueAtTime(0.0001, t + fade);
  const old = seq; seq = null;
  setTimeout(() => { for (const n of old.nodes) { try { n.stop(); } catch (e) {} } }, fade * 1000 + 100);
};
window.SFX = S;
export default S;
