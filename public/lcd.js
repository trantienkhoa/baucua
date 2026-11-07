// Màn hình LCD sau lưng DJ: sóng nhạc / YouTube / video trên máy / ảnh.
// YouTube không vẽ được vào WebGL (khác nguồn), nên khung YouTube được đặt bằng CSS3D NẰM SAU canvas 3D,
// rồi canvas "đục lỗ" (alpha = 0) đúng chỗ màn hình — người, bàn DJ đứng trước vẫn che màn bình thường.
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';

const PX = 1280;   // bề rộng khung YouTube (điểm ảnh CSS) ứng với bề rộng màn 3D

export function createLCD({ scene, camera, led, glCanvas, socket, Music, isPrimary, settings = () => ({}) }) {
  const SW = led.geometry.parameters.width, SH = led.geometry.parameters.height, ASPECT = SW / SH;
  const PH = Math.round(PX / ASPECT);
  let S = { mode: 'eq', items: [], idx: 0, playing: true, volume: 70, muted: false, fit: 'fill', duck: true, giftOverlay: true, giftPause: true, showSign: false, brightness: 1 };

  // ---------- lớp CSS3D phía sau canvas ----------
  const host = document.createElement('div');
  host.id = 'lcd3d';
  Object.assign(host.style, { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 0, pointerEvents: 'none', overflow: 'hidden' });
  glCanvas.parentNode.insertBefore(host, glCanvas);
  const css = new CSS3DRenderer();
  host.appendChild(css.domElement);
  const cssScene = new THREE.Scene();
  const box = document.createElement('div');
  Object.assign(box.style, { width: PX + 'px', height: PH + 'px', background: '#000', overflow: 'hidden', position: 'relative' });
  const ytHost = document.createElement('div');
  Object.assign(ytHost.style, { position: 'absolute', left: 0, width: PX + 'px' });
  const ytDiv = document.createElement('div'); ytHost.appendChild(ytDiv); box.appendChild(ytHost);
  const cssObj = new CSS3DObject(box);
  cssObj.scale.setScalar(SW / PX);
  cssScene.add(cssObj);
  let cssW = 1, cssH = 1;

  // ---------- đục lỗ ----------
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, transparent: false, toneMapped: false, fog: false });
  const holeMesh = new THREE.Mesh(led.geometry, holeMat); holeMesh.matrixAutoUpdate = false;
  const holeScene = new THREE.Scene(); holeScene.add(holeMesh);
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  function drawHole(renderer, target) {
    holeMesh.matrix.copy(led.matrixWorld); holeMesh.matrixWorld.copy(led.matrixWorld);
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(target); renderer.render(holeScene, camera);
    renderer.autoClear = ac;
  }
  class HolePass extends Pass {
    constructor() { super(); this.needsSwap = false; }
    render(renderer, writeBuffer, readBuffer) { if (holeOn) drawHole(renderer, readBuffer); }
  }
  const holePass = new HolePass();
  let holeOn = false;

  // ---------- vật liệu cho video / ảnh (lấp đầy hoặc vừa khung) ----------
  const mediaMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, sc: { value: new THREE.Vector2(1, 1) }, bright: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec2 sc; uniform float bright; varying vec2 vUv;
      void main(){ vec2 uv = (vUv - 0.5) * sc + 0.5;
        vec4 c = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0,0.0,0.0,1.0) : texture2D(map, uv);
        gl_FragColor = vec4(c.rgb * bright, 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
  function fitScale(aspect) {
    // aspect: rộng/cao của nguồn
    const r = aspect / ASPECT;
    if (S.fit === 'contain') mediaMat.uniforms.sc.value.set(r < 1 ? 1 / r : 1, r < 1 ? 1 : r);
    else mediaMat.uniforms.sc.value.set(r > 1 ? 1 / r : 1, r > 1 ? 1 : r);
  }

  // ---------- video trên máy ----------
  const video = document.createElement('video');
  video.playsInline = true; video.loop = true; video.crossOrigin = 'anonymous'; video.preload = 'auto';
  const vtex = new THREE.VideoTexture(video); vtex.colorSpace = THREE.SRGBColorSpace;
  let vSrc = '';
  video.addEventListener('loadedmetadata', () => { if (video.videoWidth) fitScale(video.videoWidth / video.videoHeight); });

  // ---------- ảnh ----------
  const loader = new THREE.TextureLoader();
  let imgSrc = '', imgTex = null;

  // ---------- YouTube ----------
  let player = null, ytReady = false, ytLoading = false, ytKey = '', ytState = -1, ytError = false, ytMutedAuto = false, lastTitle = '';
  function loadYT() {
    if (ytLoading) return; ytLoading = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) {} makePlayer(); };
    const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.async = true;
    sc.onerror = () => { ytLoading = false; console.warn('Không tải được YouTube (mạng?)'); };
    document.head.appendChild(sc);
  }
  function makePlayer() {
    player = new YT.Player(ytDiv, {
      width: PX, height: S.fit === 'contain' ? PH : Math.round(PX * 9 / 16),
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1, origin: location.origin },
      events: {
        onReady: () => { ytReady = true; ytKey = ''; const f = player.getIframe(); f.setAttribute('allow', 'autoplay; encrypted-media'); },
        onStateChange: e => { ytState = e.data; if (e.data === 1) ytError = false; if (e.data === 0) onEnded(); },
        onError: e => { ytError = true; console.warn('YouTube lỗi', e.data); if (isPrimary()) setTimeout(() => socket.emit('screen:cmd', { type: 'ended' }), 1500); },
      },
    });
  }
  function onEnded() {
    const it = S.items[S.idx];
    if (it && it.type === 'list') {
      try { const pl = player.getPlaylist() || [], i = player.getPlaylistIndex(); if (i < pl.length - 1) return; } catch (e) {}
    }
    if (S.items.length === 1 && S.loop && it && it.type === 'video') { player.seekTo(0, true); player.playVideo(); return; }
    if (isPrimary()) socket.emit('screen:cmd', { type: 'ended' });
  }
  function ytLayout() {
    const h = S.fit === 'contain' ? PH : Math.round(PX * 9 / 16);
    ytHost.style.top = Math.round((PH - h) / 2) + 'px'; ytHost.style.height = h + 'px';
    if (player && ytReady) { const f = player.getIframe(); if (f && +f.height !== h) { f.height = h; f.width = PX; } }
  }

  // ---------- âm thanh ----------
  function wantMuted() { return S.muted || !isPrimary(); }
  // trình duyệt chặn tự phát có tiếng khi chưa bấm vào trang → phát không tiếng, bấm vào trang thì bật tiếng
  window.addEventListener('pointerdown', () => { if (ytMutedAuto && player && ytReady && !wantMuted()) { player.unMute(); ytMutedAuto = false; } if (video.muted && !wantMuted()) { video.muted = false; video._autoMuted = false; video.play().catch(() => {}); } });

  let giftHold = false, pausedByGift = false;
  function sync(gift) {
    const mode = S.mode;
    // YouTube
    if (mode === 'youtube') {
      if (!player) loadYT();
      ytLayout();
      if (ytReady) {
        const it = S.items[S.idx];
        const key = it ? `${S.idx}:${it.type}:${it.id}:${S._seq || 0}` : '';
        if (key !== ytKey) {
          ytKey = key; ytError = false;
          if (!it) player.stopVideo();
          else if (it.type === 'list') player.loadPlaylist({ list: it.id, listType: 'playlist', index: 0 });
          else if (it.list) player.loadVideoById({ videoId: it.id }); else player.loadVideoById(it.id);
          ytStartAt = performance.now();
        }
        const vol = Math.round(S.volume);
        if (player.getVolume && player.getVolume() !== vol) player.setVolume(vol);
        if (wantMuted()) { if (!player.isMuted()) player.mute(); }
        else if (!ytMutedAuto && player.isMuted()) player.unMute();
        const shouldPlay = S.playing && !(gift && S.giftPause);
        if (it) {
          if (shouldPlay && (ytState === 2 || ytState === 5 || (ytState === -1 && performance.now() - ytStartAt > 2500))) {
            player.playVideo();
            // vẫn không chạy (bị chặn tự phát có tiếng) → phát không tiếng
            if (ytState === -1 && performance.now() - ytStartAt > 4000 && !player.isMuted()) { player.mute(); ytMutedAuto = true; }
          }
          if (!shouldPlay && (ytState === 1 || ytState === 3)) player.pauseVideo();
        }
      }
    } else if (player && ytReady && (ytState === 1 || ytState === 3)) { player.pauseVideo(); }
    if (mode !== 'youtube') ytKey = '';
    // video trên máy
    if (mode === 'video' && S.file) {
      if (vSrc !== S.file) { vSrc = S.file; video.src = S.file; video.load(); }
      video.volume = Math.max(0, Math.min(1, S.volume / 100));
      if (!video.muted && wantMuted()) video.muted = true;
      if (video.muted && !wantMuted() && !video._autoMuted) video.muted = false;
      const shouldPlay = S.playing && !(gift && S.giftPause);
      if (shouldPlay && video.paused) video.play().catch(() => { video.muted = true; video._autoMuted = true; video.play().catch(() => {}); });
      if (!shouldPlay && !video.paused) video.pause();
    } else if (!video.paused) video.pause();
    // ảnh
    if (mode === 'image' && S.image && imgSrc !== S.image) {
      imgSrc = S.image;
      loader.load(S.image, tx => { tx.colorSpace = THREE.SRGBColorSpace; if (imgTex) imgTex.dispose(); imgTex = tx; if (S.mode === 'image') { mediaMat.uniforms.map.value = tx; fitScale(tx.image.width / tx.image.height); } });
    }
  }
  let ytStartAt = 0;

  // ---------- trạng thái gửi về trang điều khiển ----------
  setInterval(() => {
    if (!isPrimary()) return;
    const st = { mode: S.mode };
    if (S.mode === 'youtube' && player && ytReady) {
      try {
        const d = player.getVideoData ? player.getVideoData() : {};
        Object.assign(st, { state: giftHold && S.giftPause ? 'gift' : ytError ? 'error' : ({ 1: 'playing', 2: 'paused', 3: 'buffering', 0: 'ended' }[ytState] || 'loading'), time: player.getCurrentTime(), duration: player.getDuration(), title: d.title || '', videoId: d.video_id || '', autoMuted: ytMutedAuto });
      } catch (e) {}
    } else if (S.mode === 'video') Object.assign(st, { state: video.paused ? 'paused' : 'playing', time: video.currentTime, duration: video.duration || 0, autoMuted: !!video._autoMuted && video.muted });
    socket.emit('screen:status', st);
  }, 1000);

  socket.on('screen', s => {
    const old = S; S = Object.assign({}, S, s);
    if (old.fit !== S.fit) { ytLayout(); if (S.mode === 'video' && video.videoWidth) fitScale(video.videoWidth / video.videoHeight); if (S.mode === 'image' && imgTex) fitScale(imgTex.image.width / imgTex.image.height); }
  });
  socket.on('screen:cmd', c => {
    if (c.type === 'seek') {
      const t = Math.max(0, Number(c.t) || 0);
      if (S.mode === 'youtube' && player && ytReady) { player.seekTo(t, true); player.playVideo(); }
      if (S.mode === 'video') { video.currentTime = t; video.play().catch(() => {}); }
    }
  });

  // ---------- giảm nhạc game ----------
  let duckK = 1;
  function duck() {
    let talking = false;
    if (isPrimary() && S.duck && !giftHold) {
      if (S.mode === 'youtube' && player && ytReady && ytState === 1 && !S.muted && !ytMutedAuto && S.volume > 0) talking = true;
      if (S.mode === 'video' && !video.paused && !video.muted && S.volume > 0) talking = true;
    }
    // đèn theo nhạc: video trên máy → đưa tiếng vào bộ phân tích; YouTube → dùng nhịp BPM chủ phòng đặt
    if (S.mode === 'video' && Music.ctx && Music.ctx.state === 'running' && Music.attachMedia) Music.attachMedia(video);
    const ytSound = S.mode === 'youtube' && player && ytReady && ytState === 1 && !S.muted && S.volume > 0 && !giftHold;
    if (Music.setExternalBpm) Music.setExternalBpm(ytSound && Number(S.bpm) > 0 ? S.bpm : 0);
    const k = talking ? 0.15 : 1;
    if (k !== duckK) { duckK = k; if (Music.setDuck) Music.setDuck(k); }
  }

  // ---------- ảnh bìa cho clip khoảnh khắc (không ghi được hình trong khung YouTube) ----------
  let curVid = '', curTitle = '', thumb = null, thumbId = '';
  const _c = new THREE.Vector3();
  function currentVideo() {
    try { const d = player && ytReady && player.getVideoData ? player.getVideoData() : null; if (d && d.video_id) { curVid = d.video_id; curTitle = d.title || curTitle; return; } } catch (e) {}
    const it = S.items[S.idx]; if (it && it.type === 'video') { curVid = it.id; curTitle = it.title || ''; }
  }
  function drawBehind(cx, w, h) {
    if (!holeOn) return;
    currentVideo();
    if (curVid && thumbId !== curVid) { thumbId = curVid; thumb = new Image(); thumb.src = '/api/yt-thumb/' + curVid; }
    led.updateMatrixWorld();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      _c.set(sx * SW / 2, sy * SH / 2, 0); led.localToWorld(_c); _c.project(camera);
      const X = (_c.x + 1) / 2 * w, Y = (1 - _c.y) / 2 * h;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
    const bw = x1 - x0, bh = y1 - y0; if (bw < 2 || bh < 2) return;
    cx.save(); cx.beginPath(); cx.rect(x0, y0, bw, bh); cx.clip();
    cx.fillStyle = '#000'; cx.fillRect(x0, y0, bw, bh);
    if (thumb && thumb.complete && thumb.naturalWidth) {
      const ia = thumb.naturalWidth / thumb.naturalHeight, ba = bw / bh;
      let dw = bw, dh = bh;
      if ((S.fit === 'contain') === (ia > ba)) dh = bw / ia; else dw = bh * ia;
      cx.filter = S.brightness && S.brightness !== 1 ? `brightness(${S.brightness})` : 'none';
      cx.drawImage(thumb, x0 + (bw - dw) / 2, y0 + (bh - dh) / 2, dw, dh);
      cx.filter = 'none';
    }
    // dải "đang phát" + thanh thời gian (nhúc nhích theo nhạc cho clip đỡ tĩnh)
    const fs = Math.max(12, bh * 0.075);
    const g = cx.createLinearGradient(0, y1 - fs * 3, 0, y1); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    cx.fillStyle = g; cx.fillRect(x0, y1 - fs * 3, bw, fs * 3);
    cx.font = `700 ${fs}px "Segoe UI",system-ui,sans-serif`; cx.fillStyle = '#fff'; cx.textBaseline = 'middle';
    let tt = '▶ ' + (curTitle || 'YouTube'); while (cx.measureText(tt).width > bw * 0.9 && tt.length > 4) tt = tt.slice(0, -2) + '…';
    cx.fillText(tt, x0 + bw * 0.04, y1 - fs * 1.6);
    try { const d = player.getDuration(), t = player.getCurrentTime(); if (d > 0) { cx.fillStyle = 'rgba(255,255,255,0.3)'; cx.fillRect(x0 + bw * 0.04, y1 - fs * 0.6, bw * 0.92, fs * 0.18); cx.fillStyle = '#ff2d55'; cx.fillRect(x0 + bw * 0.04, y1 - fs * 0.6, bw * 0.92 * Math.min(1, t / d), fs * 0.18); } } catch (e) {}
    if (tCur || evCur) cx.drawImage(tCan, x0, y0, bw, bh);   // lời nhắn, sự kiện cũng vào clip
    cx.restore();
  }

  // ---------- lời nhắn của người tặng quà ----------
  const TW = PX, TH = PH;
  const tCan = document.createElement('canvas'); tCan.width = TW; tCan.height = TH;
  const tg = tCan.getContext('2d');
  const tTex = new THREE.CanvasTexture(tCan); tTex.colorSpace = THREE.SRGBColorSpace;
  const tMesh = new THREE.Mesh(led.geometry, new THREE.MeshBasicMaterial({ map: tTex, transparent: true, depthWrite: false, toneMapped: false }));
  tMesh.position.copy(led.position); tMesh.position.z += 0.05; tMesh.quaternion.copy(led.quaternion); tMesh.visible = false; tMesh.renderOrder = 5;
  scene.add(tMesh);
  const tDom = document.createElement('canvas'); tDom.width = TW; tDom.height = TH;
  Object.assign(tDom.style, { position: 'absolute', left: 0, top: 0, width: PX + 'px', height: PH + 'px', display: 'none', transform: 'none' });   // game.html căn giữa mọi canvas bằng transform → bỏ
  box.appendChild(tDom);
  const tdg = tDom.getContext('2d');
  const FONT = '"Segoe UI","Be Vietnam Pro",system-ui,Arial,sans-serif';
  const textQ = []; let tCur = null, tDrawAt = 0;
  const avCache = new Map();
  function avatarImg(url) {
    if (!url) return null; let im = avCache.get(url);
    if (!im) { im = new Image(); im.src = /^https?:/i.test(url) ? '/api/img?u=' + encodeURIComponent(url) : url; avCache.set(url, im); if (avCache.size > 100) avCache.delete(avCache.keys().next().value); }
    return im.complete && im.naturalWidth ? im : null;
  }
  function wrap(text, maxW) {
    const words = text.split(/\s+/); const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (tg.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
      while (tg.measureText(cur).width > maxW && cur.length > 1) {   // từ quá dài: cắt
        let k = cur.length; while (k > 1 && tg.measureText(cur.slice(0, k)).width > maxW) k--;
        lines.push(cur.slice(0, k)); cur = cur.slice(k);
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  // phần màn LCD đang lọt vào khung hình (khung dọc 9:16 cắt bớt hai bên màn)
  let vis0 = 0.15, vis1 = 0.85;
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function visibleRange() {
    led.updateMatrixWorld();
    _a.set(-SW / 2, 0, 0); led.localToWorld(_a); _a.project(camera);
    _b.set(SW / 2, 0, 0); led.localToWorld(_b); _b.project(camera);
    const d = _b.x - _a.x; if (Math.abs(d) < 1e-4) return;
    const u0 = Math.max(0, Math.min(1, (-0.97 - _a.x) / d)), u1 = Math.max(0, Math.min(1, (0.97 - _a.x) / d));
    if (u1 - u0 < 0.15) return;
    vis0 += (u0 - vis0) * 0.25; vis1 += (u1 - vis1) * 0.25;
  }
  function drawText(t) {
    const X0 = vis0 * TW, X1 = vis1 * TW, VW = X1 - X0, CX = (X0 + X1) / 2;
    const it = tCur.item, age = t - tCur.start, left = tCur.until - t;
    const a = Math.min(1, age / 0.35, Math.max(0, left) / 0.5);
    const g = tg; g.globalAlpha = a;
    g.fillStyle = 'rgba(6,0,18,0.78)'; g.fillRect(0, 0, TW, TH);
    const hue = (t * 60) % 360;
    const bg = g.createLinearGradient(0, 0, TW, 0);
    bg.addColorStop(0, `hsl(${hue},100%,60%)`); bg.addColorStop(0.5, `hsl(${(hue + 120) % 360},100%,62%)`); bg.addColorStop(1, `hsl(${(hue + 240) % 360},100%,60%)`);
    g.lineWidth = 12; g.strokeStyle = bg; g.strokeRect(10, 10, TW - 20, TH - 20);
    // người gửi
    const r = 40, ay = 78;
    g.font = `800 38px ${FONT}`;
    let nm = it.user.name || ''; while (g.measureText(nm).width > VW - 160 && nm.length > 2) nm = nm.slice(0, -2) + '…';
    const headW = Math.max(g.measureText(nm).width, 200) + r * 2 + 24, ax = Math.max(X0 + r + 16, CX - headW / 2 + r);
    g.save(); g.beginPath(); g.arc(ax, ay, r + 5, 0, Math.PI * 2); g.fillStyle = '#ffcf33'; g.fill();
    g.beginPath(); g.arc(ax, ay, r, 0, Math.PI * 2); g.clip();
    const im = it.host ? null : avatarImg(it.user.avatar);
    if (im) g.drawImage(im, ax - r, ay - r, r * 2, r * 2); else { g.fillStyle = '#5b3bb0'; g.fillRect(ax - r, ay - r, r * 2, r * 2); g.fillStyle = '#fff'; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.host ? '🎧' : ((it.user.name || '?').trim()[0] || '?').toUpperCase(), ax, ay + 3); }
    g.restore();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `800 38px ${FONT}`; g.fillStyle = '#fff';
    g.fillText(nm, ax + r + 20, ay - 15);
    g.font = `700 26px ${FONT}`; g.fillStyle = '#ffe08a';
    g.fillText(it.host ? '📢 Thông báo' : `💌 lời nhắn${it.gift ? ' · ' + it.gift : ''}${it.value ? ' · ' + it.value + '💎' : ''}`, ax + r + 20, ay + 22);
    // lời nhắn: tự chọn cỡ chữ vừa tối đa 3 dòng
    let size = 132, lines;
    for (; size >= 44; size -= 4) { g.font = `900 ${size}px ${FONT}`; lines = wrap(it.text, VW - 60); if (lines.length <= 3 && lines.length * size * 1.12 <= TH - 210) break; }
    lines = lines.slice(0, 3);
    const lh = size * 1.12, cy = 150 + (TH - 150 - 50) / 2, y0 = cy - (lines.length - 1) * lh / 2;
    const kick = Music && Music.kick ? Music.kick : 0;
    const sc = 1 + 0.035 * kick + 0.04 * Math.max(0, 1 - age / 0.35);
    g.save(); g.translate(CX, cy); g.scale(sc, sc); g.translate(-CX, -cy);
    const tgd = g.createLinearGradient(0, y0 - size / 2, 0, y0 + (lines.length - 1) * lh + size / 2);
    tgd.addColorStop(0, `hsl(${(hue + 300) % 360},100%,82%)`); tgd.addColorStop(1, `hsl(${(hue + 30) % 360},100%,68%)`);
    g.textAlign = 'center'; g.font = `900 ${size}px ${FONT}`;
    g.shadowColor = `hsl(${(hue + 300) % 360},100%,55%)`; g.shadowBlur = 28 + 30 * kick;
    lines.forEach((ln, i) => { g.fillStyle = tgd; g.fillText(ln, CX, y0 + i * lh); });
    g.shadowBlur = 0; g.restore();
    // hướng dẫn
    const st = settings();
    g.font = `600 22px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.6)'; g.textAlign = 'center';
    let hint = `Bình luận “mh: lời nhắn” + tặng quà từ ${st.textCoins || 30}💎 để lên màn hình`; while (g.measureText(hint).width > VW - 30 && hint.length > 10) hint = hint.slice(0, -2);
    if (!evCur) g.fillText(hint, CX, TH - 34);
    g.globalAlpha = 1;
  }

  // ---------- sự kiện LIVE trên màn: thẻ nhỏ ở chân màn, sự kiện lớn phủ cả màn ----------
  const evQ = []; let evCur = null;
  const stripEmoji = s => s.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '');
  const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  function drawEvent(t) {
    const X0 = vis0 * TW, X1 = vis1 * TW, VW = X1 - X0, CX = (X0 + X1) / 2;
    const e = evCur, age = t - e.start, left = e.until - t, g = tg;
    const big = e.big && !tCur && !giftHoldNow;
    if (big) {
      const a = Math.min(1, age / 0.25, left / 0.4);
      g.globalAlpha = a;
      g.fillStyle = 'rgba(4,0,14,0.72)'; g.fillRect(0, 0, TW, TH);
      g.globalAlpha = a * ((Math.floor(t * 6) % 2) ? 1 : 0.45);
      g.lineWidth = 14; g.strokeStyle = e.color; g.strokeRect(X0 + 12, 14, VW - 24, TH - 28); g.globalAlpha = a;
      let size = 120, lines;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (; size >= 40; size -= 4) { g.font = `900 ${size}px ${FONT}`; lines = wrap(e.text, VW - 80); if (lines.length <= 3 && lines.length * size * 1.1 <= TH - 80) break; }
      lines = lines.slice(0, 3);
      const pop = 1 + 0.25 * (1 - ease(age / 0.35)) + 0.03 * (Music && Music.kick || 0);
      const lh = size * 1.1, y0 = TH / 2 - (lines.length - 1) * lh / 2;
      g.save(); g.translate(CX, TH / 2); g.scale(pop, pop); g.translate(-CX, -TH / 2);
      g.lineJoin = 'round'; g.lineWidth = Math.max(6, size * 0.09); g.strokeStyle = 'rgba(10,0,25,0.85)';
      lines.forEach((ln, i) => g.strokeText(ln, CX, y0 + i * lh));
      g.shadowColor = e.color; g.shadowBlur = 22; g.fillStyle = e.color;   // chữ màu sự kiện (chữ trắng bị hiệu ứng toả sáng làm chói)
      lines.forEach((ln, i) => g.fillText(ln, CX, y0 + i * lh));
      g.shadowBlur = 0; g.restore(); g.globalAlpha = 1;
      return;
    }
    // thẻ ở chân màn
    // nửa trên màn (biển neon tạm ẩn): nửa dưới bị DJ, bàn DJ, đám đông che
    const h = 104, y = Math.round(TH * 0.3), slide = (1 - ease(age / 0.3)) * (h + 30), a = Math.min(1, left / 0.3);
    g.globalAlpha = a;
    g.save(); g.translate(0, slide);
    g.font = `800 38px ${FONT}`;
    const r = 36, pad = 18, hasAv = !!e.user;
    let txt = e.text; const maxW = VW - 60 - (hasAv ? r * 2 + pad : 0) - pad * 2;
    while (g.measureText(txt).width > maxW && txt.length > 4) txt = txt.slice(0, -2) + '…';
    const w = Math.min(VW - 40, g.measureText(txt).width + pad * 3 + (hasAv ? r * 2 + pad : 0) + 10), x = CX - w / 2;
    rrect(g, x, y, w, h, 24); g.fillStyle = 'rgba(12,2,32,0.9)'; g.fill();
    g.save(); g.clip(); g.fillStyle = e.color; g.fillRect(x, y, 14, h); g.restore();
    rrect(g, x, y, w, h, 24); g.lineWidth = 5; g.strokeStyle = e.color; g.stroke();
    let tx = x + pad + 14;
    if (hasAv) {
      const ax = tx + r, ay = y + h / 2;
      g.save(); g.beginPath(); g.arc(ax, ay, r + 3, 0, Math.PI * 2); g.fillStyle = e.color; g.fill();
      g.beginPath(); g.arc(ax, ay, r, 0, Math.PI * 2); g.clip();
      const im = avatarImg(e.user.avatar);
      if (im) g.drawImage(im, ax - r, ay - r, r * 2, r * 2); else { g.fillStyle = '#5b3bb0'; g.fillRect(ax - r, ay - r, r * 2, r * 2); g.fillStyle = '#fff'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(((e.user.name || '?').trim()[0] || '?').toUpperCase(), ax, ay + 2); }
      g.restore(); tx += r * 2 + pad;
    }
    g.font = `800 38px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(txt, tx, y + h / 2 + 2);
    g.restore(); g.globalAlpha = 1;
  }
  // bo góc (không dùng ctx.roundRect: OBS bản cũ chưa có)
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  let giftHoldNow = false;
  function pushEvent(e) {
    if (!e || !e.text || settings().lcdEvents === false) return;
    const it = Object.assign({ color: '#ffd84d' }, e);
    if (it.big) { const k = evQ.findIndex(x => !x.big); evQ.splice(k < 0 ? evQ.length : k, 0, it); }   // sự kiện lớn chen lên trước
    else evQ.push(it);
    while (evQ.length > 10) { const k = evQ.findIndex(x => !x.big); evQ.splice(k < 0 ? 0 : k, 1); }   // dồn quá nhiều: bỏ bớt sự kiện nhỏ cũ nhất
  }
  function drawOverlay(t) {
    tg.clearRect(0, 0, TW, TH);
    visibleRange();
    if (tCur) drawText(t);
    if (evCur) drawEvent(t);
    tTex.needsUpdate = true;
  }
  socket.on('screenText', it => { if (it && it.text) { textQ.push(it); if (textQ.length > 30) textQ.shift(); } });
  socket.on('screenText:clear', () => { textQ.length = 0; if (tCur) tCur.until = Math.min(tCur.until, performance.now() / 1000 + 0.4); });
  function updateText(t, giftActive) {
    if (tCur && t > tCur.until) tCur = null;
    if (!tCur && textQ.length && !giftActive) { const dur = Math.max(4, Number(settings().textSeconds) || 10); tCur = { item: textQ.shift(), start: t, until: t + dur }; }
    giftHoldNow = giftActive;
    if (evCur && t > evCur.until) evCur = null;
    if (!evCur && evQ.length) {
      const e = evQ.shift(); const busy = evQ.length;
      const dur = e.big && !tCur ? 4 : Math.max(1.8, 3.6 - busy * 0.35);
      evCur = Object.assign(e, { start: t, until: t + dur });
    }
    const on = !!tCur || !!evCur;
    if (on && t - tDrawAt > 1 / 20) { tDrawAt = t; drawOverlay(t); if (holeOn) { tdg.clearRect(0, 0, TW, TH); tdg.drawImage(tCan, 0, 0); } }
    tMesh.visible = on && !holeOn;
    tDom.style.display = on && holeOn ? 'block' : 'none';
  }

  let lastSync = 0;
  return {
    get textActive() { return !!tCur; },
    event: pushEvent,
    get lastEvent() { return evCur || evQ[evQ.length - 1] || null; },
    drawBehind,
    holePass,
    get state() { return S; },
    get hole() { return holeOn; },
    /** người tặng quà lớn có được chen lên màn không */
    giftAllowed() { return S.mode === 'eq' || S.giftOverlay !== false; },
    signVisible() { return !tCur && !evCur && (S.mode === 'eq' || !!S.showSign); },
    /** vật liệu của màn khi không chiếu người tặng quà */
    idleMaterial(eqMat) {
      if (S.mode === 'youtube') return blackMat;
      if (S.mode === 'video' && S.file) { if (mediaMat.uniforms.map.value !== vtex) { mediaMat.uniforms.map.value = vtex; if (video.videoWidth) fitScale(video.videoWidth / video.videoHeight); } mediaMat.uniforms.bright.value = S.brightness || 1; return mediaMat; }
      if (S.mode === 'image' && imgTex) { if (mediaMat.uniforms.map.value !== imgTex) { mediaMat.uniforms.map.value = imgTex; fitScale(imgTex.image.width / imgTex.image.height); } mediaMat.uniforms.bright.value = S.brightness || 1; return mediaMat; }
      return eqMat;
    },
    update(t, giftActive, textBusy) {
      giftHold = !!giftActive;
      holeOn = S.mode === 'youtube' && !giftHold && led.visible;
      if (t - lastSync > 0.25) { lastSync = t; sync(giftHold); duck(); }
      box.style.visibility = holeOn ? 'visible' : 'hidden';
      updateText(performance.now() / 1000, giftHold || !!textBusy);
      const b = S.brightness || 1; const f = b === 1 ? '' : `brightness(${b})`; if (box.style.filter !== f) box.style.filter = f;
    },
    /** gọi sau khi vẽ cảnh 3D thẳng ra canvas (không dùng hậu kỳ) */
    afterRender(renderer) { if (holeOn) drawHole(renderer, null); },
    renderCSS() {
      if (!holeOn) return;
      cssObj.position.copy(led.position); cssObj.quaternion.copy(led.quaternion);
      css.render(cssScene, camera);
    },
    resize(w, h) { cssW = w; cssH = h; host.style.width = w + 'px'; host.style.height = h + 'px'; css.setSize(w, h); },
  };
}
