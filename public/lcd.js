// Màn hình LCD sau lưng DJ: sóng nhạc / YouTube / video trên máy / ảnh.
// YouTube không vẽ được vào WebGL (khác nguồn), nên khung YouTube được đặt bằng CSS3D NẰM SAU canvas 3D,
// rồi canvas "đục lỗ" (alpha = 0) đúng chỗ màn hình — người, bàn DJ đứng trước vẫn che màn bình thường.
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';

const PX = 1280;   // bề rộng khung YouTube (điểm ảnh CSS) ứng với bề rộng màn 3D

export function createLCD({ scene, camera, led, glCanvas, socket, Music, isPrimary }) {
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
  window.addEventListener('pointerdown', () => { if (ytMutedAuto && player && ytReady && !wantMuted()) { player.unMute(); ytMutedAuto = false; } if (video.muted && !wantMuted()) { video.muted = false; video.play().catch(() => {}); } });

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
    } else if (S.mode === 'video') Object.assign(st, { state: video.paused ? 'paused' : 'playing', time: video.currentTime, duration: video.duration || 0 });
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
    const k = talking ? 0.15 : 1;
    if (k !== duckK) { duckK = k; if (Music.setDuck) Music.setDuck(k); }
  }

  let lastSync = 0;
  return {
    holePass,
    get state() { return S; },
    get hole() { return holeOn; },
    /** người tặng quà lớn có được chen lên màn không */
    giftAllowed() { return S.mode === 'eq' || S.giftOverlay !== false; },
    signVisible() { return S.mode === 'eq' || !!S.showSign; },
    /** vật liệu của màn khi không chiếu người tặng quà */
    idleMaterial(eqMat) {
      if (S.mode === 'youtube') return blackMat;
      if (S.mode === 'video' && S.file) { if (mediaMat.uniforms.map.value !== vtex) { mediaMat.uniforms.map.value = vtex; if (video.videoWidth) fitScale(video.videoWidth / video.videoHeight); } mediaMat.uniforms.bright.value = S.brightness || 1; return mediaMat; }
      if (S.mode === 'image' && imgTex) { if (mediaMat.uniforms.map.value !== imgTex) { mediaMat.uniforms.map.value = imgTex; fitScale(imgTex.image.width / imgTex.image.height); } mediaMat.uniforms.bright.value = S.brightness || 1; return mediaMat; }
      return eqMat;
    },
    update(t, giftActive) {
      giftHold = !!giftActive;
      holeOn = S.mode === 'youtube' && !giftHold && led.visible;
      if (t - lastSync > 0.25) { lastSync = t; sync(giftHold); duck(); }
      box.style.visibility = holeOn ? 'visible' : 'hidden';
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
