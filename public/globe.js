// Phần 3D của Nation Rush (three.js). Hai chế độ:
//   - địa cầu (mặc định của hàm init)
//   - opts.flat: bản đồ thế giới phẳng nổi trên mặt biển 3D toàn màn hình
// Trang chính gọi init() rồi dùng các hàm trả về.
import * as THREE from '/vendor/three/three.module.js';

const W = 1080, H = 1920, D2R = Math.PI / 180, HS = 1.0; // HS: hệ số độ cao khối nước ở chế độ phẳng

export async function init(canvas, geo, opts) {
  const FLAT = !!(opts && opts.flat);
  const merc = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-84, Math.min(84, lat)) * D2R / 2)) * 2 / Math.PI;
  // vị trí của một điểm kinh / vĩ độ; r = 1 là mặt đất, r > 1 là nhô lên
  const P = FLAT
    ? (lon, lat, r = 1) => new THREE.Vector3(lon / 90, (r - 1) * HS, -merc(lat))
    : (lon, lat, r = 1) => { const p = lat * D2R, l = lon * D2R, c = Math.cos(p) * r; return new THREE.Vector3(c * Math.cos(l), Math.sin(p) * r, -c * Math.sin(l)); };
  const UP = new THREE.Vector3(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x02040d, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 120);
  camera.setViewOffset(W, H, 0, -115, W, H); // tâm nhìn nằm giữa vùng chơi, dưới bảng xếp hạng và băng-rôn

  // ---------- sao trời (chỉ ở chế độ địa cầu)
  if (!FLAT) for (const [n, size, op] of [[1400, 2, .75], [260, 3.4, .95]]) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(40); pos.set([v.x, v.y, v.z], i * 3);
      const c = new THREE.Color().setHSL(.55 + Math.random() * .15, .6, .7 + Math.random() * .3); col.set([c.r, c.g, c.b], i * 3);
    }
    const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gm.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(gm, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: op, depthWrite: false })));
  }

  // ---------- ảnh nền đất liền (viền nước vẽ bằng đường 3D cho nét)
  const TW = 4096, TH = FLAT ? 4096 : 2048, tc = document.createElement('canvas'); tc.width = TW; tc.height = TH;
  const x = tc.getContext('2d');
  const px = lon => (lon + 180) / 360 * TW, py = FLAT ? lat => (2 - merc(lat)) / 4 * TH : lat => (90 - lat) / 180 * TH;
  const land = new Path2D(), borders = [];
  for (const f of geo) for (const poly of f.p) for (const ring of poly) {
    // vùng đất vắt qua kinh tuyến 180 (Chukotka, Fiji…): ngắt nét ở chỗ nhảy kinh độ để không tô thành một dải ngang bản đồ
    ring.forEach(([lo, la], i) => { i && Math.abs(lo - ring[i - 1][0]) < 180 ? land.lineTo(px(lo), py(la)) : land.moveTo(px(lo), py(la)); });
    for (let i = 0; i < ring.length; i++) {
      const q = ring[(i + 1) % ring.length]; if (FLAT && Math.abs(ring[i][0] - q[0]) > 90) continue; // bản đồ phẳng: bỏ đoạn nối vắt qua kinh tuyến 180
      const a = P(ring[i][0], ring[i][1], 1.0015), b = P(q[0], q[1], 1.0015); borders.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  let water = null;
  if (FLAT) {
    // mặt biển 3D: sóng lăn tăn, ánh nắng lấp lánh, mờ dần về phía chân trời
    water = new THREE.Mesh(new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, deep: { value: new THREE.Color(0x0a3c78) }, shal: { value: new THREE.Color(0x1e8fe0) }, sky: { value: new THREE.Color(0x8fd0ff) }, cam: { value: new THREE.Vector3() } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float t; uniform vec3 deep, shal, sky, cam; varying vec3 vW;
        float hgt(vec2 p){ return sin(p.x*5.0+t*1.1)*0.5 + sin(p.y*6.3-t*1.3)*0.5 + sin((p.x+p.y)*10.0+t*1.7)*0.25 + sin((p.x-p.y)*16.0-t*2.1)*0.12 + sin(p.x*31.0+p.y*27.0+t*3.0)*0.05; }
        void main(){
          vec2 p = vW.xz; float e = 0.015;
          vec3 n = normalize(vec3(-(hgt(p+vec2(e,0.0))-hgt(p-vec2(e,0.0)))*0.45, 1.0, -(hgt(p+vec2(0.0,e))-hgt(p-vec2(0.0,e)))*0.45));
          vec3 v = normalize(cam - vW);
          float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          vec3 l = normalize(vec3(0.35, 0.8, -0.5));
          float sp = pow(max(dot(reflect(-l, n), v), 0.0), 70.0);
          vec3 c = mix(deep, shal, clamp(0.62 + 0.3*hgt(p*0.4) + fr*0.6, 0.0, 1.0));
          c += sky * fr * 0.5 + vec3(1.0) * sp * 1.1 + shal * 0.12 * max(0.0, hgt(p*2.0));
          c = mix(c, sky, smoothstep(9.0, 60.0, length(cam - vW)));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    water.position.y = -0.004; scene.add(water);
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    lm.position.y = 0.0006; scene.add(lm);
  } else scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshBasicMaterial({ map: tex })));
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(borders, 3));
  const borderMat = new THREE.LineBasicMaterial({ color: 0x4666c4, transparent: true, opacity: .85 });
  scene.add(new THREE.LineSegments(bg, borderMat));
  const cool = new THREE.Color(0x3d8bff), skyC = new THREE.Color(), tmpC = new THREE.Color();
  function setTheme(th) { // đổi giao diện: vẽ lại ảnh nền + màu viền, khí quyển / biển, nền trời
    x.clearRect(0, 0, TW, TH);
    if (!FLAT) {
      const og = x.createLinearGradient(0, 0, 0, TH); og.addColorStop(0, th.sea[0]); og.addColorStop(.5, th.sea[1]); og.addColorStop(1, th.sea[0]);
      x.fillStyle = og; x.fillRect(0, 0, TW, TH);
      x.strokeStyle = th.grid; x.lineWidth = 2; x.beginPath();
      for (let lon = -180; lon < 180; lon += 15) { x.moveTo(px(lon), 0); x.lineTo(px(lon), TH); }
      for (let lat = -75; lat <= 75; lat += 15) { x.moveTo(0, py(lat)); x.lineTo(TW, py(lat)); }
      x.stroke();
    }
    x.fillStyle = th.land; x.fill(land);
    tex.needsUpdate = true; borderMat.color.setHex(th.border); cool.setHex(th.atmo);
    if (FLAT) {
      const u = water.material.uniforms;
      u.deep.value.set(th.sea[0]).lerp(tmpC.set(th.sea[1]), .35); u.shal.value.set(th.sea[1]).lerp(tmpC.setHex(th.atmo), .35);
      skyC.setHex(th.atmo).lerp(tmpC.set(th.sea[1]), .45).lerp(tmpC.setHex(0xffffff), .25); u.sky.value.copy(skyC);
      renderer.setClearColor(skyC, 1);
    } else renderer.setClearColor(th.bg, 1);
  }
  setTheme({ sea: ['#0a3c78', '#1672c4'], land: FLAT ? '#0d2f5e' : '#18264f', grid: 'rgba(110,160,255,.16)', border: FLAT ? 0x9fd8ff : 0x4666c4, atmo: FLAT ? 0x7fd0ff : 0x3d8bff, bg: 0x02040d });

  // ---------- khí quyển phát sáng (địa cầu)
  const atmoUni = { c: { value: new THREE.Color(0x3d8bff) } };
  if (!FLAT) {
    const vsh = 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 48), new THREE.ShaderMaterial({
      uniforms: atmoUni, vertexShader: vsh, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      fragmentShader: 'uniform vec3 c; varying vec3 vN; void main(){ float i = pow(max(0.0, 0.72 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.5); gl_FragColor = vec4(c, 1.0) * i * 1.6; }',
    })));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.003, 64, 48), new THREE.ShaderMaterial({
      uniforms: atmoUni, vertexShader: vsh, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      fragmentShader: 'uniform vec3 c; varying vec3 vN; void main(){ float i = pow(1.0 - max(0.0, dot(vN, vec3(0.0, 0.0, 1.0))), 3.0); gl_FragColor = vec4(c, 1.0) * i * 0.75; }',
    })));
  }

  // ---------- khối 3D cho từng nước đang chơi (dựng khi cần)
  const byCc = {}; for (const f of geo) if (f.cc) byCc[f.cc] = f;
  const built = {};
  function tess(a, b, c, out, depth) { // chia nhỏ tam giác theo độ dài cạnh (khớp giữa các tam giác kề) để mặt ôm theo mặt cầu
    const T = 3, L = (p, q) => Math.abs(p[0] - q[0]) > T || Math.abs(p[1] - q[1]) > T, m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const ab = L(a, b), bc = L(b, c), ca = L(c, a), n = ab + bc + ca;
    if (!n || depth > 7 || FLAT) { out.push(a, b, c); return; }
    const d = depth + 1;
    if (n === 3) { const p = m(a, b), q = m(b, c), r = m(c, a); tess(a, p, r, out, d); tess(p, b, q, out, d); tess(r, q, c, out, d); tess(p, q, r, out, d); }
    else if (n === 1) { if (ab) { const p = m(a, b); tess(a, p, c, out, d); tess(p, b, c, out, d); } else if (bc) { const p = m(b, c); tess(a, b, p, out, d); tess(a, p, c, out, d); } else { const p = m(c, a); tess(a, b, p, out, d); tess(p, b, c, out, d); } }
    else if (!ca) { const p = m(a, b), q = m(b, c); tess(p, b, q, out, d); tess(a, p, q, out, d); tess(a, q, c, out, d); }
    else if (!ab) { const p = m(b, c), q = m(c, a); tess(q, p, c, out, d); tess(a, b, p, out, d); tess(a, p, q, out, d); }
    else { const p = m(c, a), q = m(a, b); tess(a, q, p, out, d); tess(q, b, c, out, d); tess(q, c, p, out, d); }
  }
  function build(cc) {
    const f = byCc[cc]; if (!f) return null;
    const cap = [], wallDir = [], line = [];
    for (const poly of f.p) {
      const rings = poly.map(r => { // bỏ điểm cuối trùng điểm đầu trước khi chia tam giác
        const e = r.length - 1, same = r[0][0] === r[e][0] && r[0][1] === r[e][1];
        return (same ? r.slice(0, e) : r).map(([lo, la]) => new THREE.Vector2(lo, la));
      }).filter(r => r.length >= 3);
      if (!rings.length) continue;
      let tris = []; try { tris = THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1)); } catch {}
      const all = rings.flat(), tri = [];
      for (const [i, j, k] of tris) tess([all[i].x, all[i].y], [all[j].x, all[j].y], [all[k].x, all[k].y], tri, 0);
      for (const [lo, la] of tri) { const p = P(lo, la); cap.push(p.x, p.y, p.z); }
      for (const ring of poly) for (let i = 0; i < ring.length; i++) {
        const q = ring[(i + 1) % ring.length]; if (FLAT && Math.abs(ring[i][0] - q[0]) > 90) continue;
        const a = P(ring[i][0], ring[i][1]), b = P(q[0], q[1]);
        line.push(a.x, a.y, a.z, b.x, b.y, b.z);
        wallDir.push(a.x, a.y, a.z, 0, b.x, b.y, b.z, 0, a.x, a.y, a.z, 1, b.x, b.y, b.z, 0, b.x, b.y, b.z, 1, a.x, a.y, a.z, 1); // w=1: đỉnh trên
      }
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(line, 3));
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(wallDir.length / 4 * 3), 3));
    const o = {
      dir: new Float32Array(wallDir), h: 0, hT: .008, wh: -1,
      cap: new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })),
      wall: new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })),
      line: new THREE.LineSegments(lg, new THREE.LineBasicMaterial()),
    };
    o.wall.frustumCulled = false;
    scene.add(o.cap, o.wall, o.line);
    return o;
  }
  function setWall(o) {
    if (Math.abs(o.wh - o.h) < .0002) return; o.wh = o.h;
    const d = o.dir, p = o.wall.geometry.attributes.position.array, top = 1 + o.h;
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
      if (FLAT) { p[j] = d[i]; p[j + 1] = d[i + 3] ? o.h * HS : -.003; p[j + 2] = d[i + 2]; }
      else { const s = d[i + 3] ? top : .999; p[j] = d[i] * s; p[j + 1] = d[i + 1] * s; p[j + 2] = d[i + 2] * s; }
    }
    o.wall.geometry.attributes.position.needsUpdate = true;
  }
  // list: [{cc, hue, level, heat, rank}]
  function sync(list, dt) {
    const on = new Set();
    for (const a of list) {
      let o = built[a.cc]; if (o === undefined) o = built[a.cc] = build(a.cc);
      if (!o) continue; on.add(a.cc);
      o.hT = .005 + a.level * .004 + (a.rank === 0 ? .008 : 0) + a.heat * .007;
      const L = Math.min(.66, .3 + a.level * .04 + a.heat * .16 + (a.rank === 0 ? .05 : 0));
      o.cap.material.color.setHSL(a.hue / 360, .82, L);
      o.wall.material.color.setHSL(a.hue / 360, .8, L * .5);
      a.rank === 0 ? o.line.material.color.setHex(0xffe9a0) : o.line.material.color.setHSL(a.hue / 360, 1, .82);
    }
    for (const cc in built) {
      const o = built[cc]; if (!o) continue;
      if (!on.has(cc)) o.hT = 0;
      o.h += (o.hT - o.h) * (1 - Math.pow(.02, dt));
      const vis = o.h > .0015; o.cap.visible = o.wall.visible = o.line.visible = vis; if (!vis) continue;
      if (FLAT) { o.cap.position.y = o.h * HS; o.line.position.y = o.h * HS + .0012; }
      else { o.cap.scale.setScalar(1 + o.h); o.line.scale.setScalar(1 + o.h + .0008); }
      setWall(o);
    }
  }

  // ---------- hiệu ứng
  const fx = [];
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true); beamGeo.translate(0, .5, 0);
  const beamMat = hue => new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color().setHSL(hue / 360, 1, .62) }, a: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c; uniform float a; varying vec2 vU; void main(){ float f = pow(1.0 - vU.y, 1.6); gl_FragColor = vec4(c * (0.7 + f), 1.0) * f * a; }',
  });
  function beam(lon, lat, hue, mega) { // cột sáng bắn lên từ một nước
    const p = P(lon, lat), m = new THREE.Mesh(beamGeo, beamMat(hue));
    m.position.copy(p); if (!FLAT) m.quaternion.setFromUnitVectors(UP, p.clone().normalize());
    scene.add(m); fx.push({ m, t: 0, dur: mega ? 3.4 : 1.8, kind: 'beam', r: mega ? .03 : .012, hgt: mega ? .95 : .38 });
  }
  function bandGeo() { const g = new THREE.BufferGeometry(), N = 72; g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((N + 1) * 6), 3)); const idx = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx); return g; }
  function setBand(g, n, th, wdt, r) { // dải tròn quanh điểm n: trên mặt cầu (cách một góc th) hoặc trên mặt biển (bán kính th)
    const p = g.attributes.position.array, N = 72;
    if (FLAT) {
      for (let i = 0; i <= N; i++) { const ph = i / N * Math.PI * 2, cx = Math.cos(ph), sx = Math.sin(ph); for (let k = 0; k < 2; k++) { const rad = (th + k * wdt) * .64, j = (i * 2 + k) * 3; p[j] = n.x + cx * rad; p[j + 1] = (r - 1) * HS + .004; p[j + 2] = n.z + sx * rad; } }
    } else {
      const u = new THREE.Vector3(0, 1, 0).cross(n); if (u.lengthSq() < 1e-4) u.set(1, 0, 0); u.normalize(); const w = n.clone().cross(u);
      for (let i = 0; i <= N; i++) {
        const ph = i / N * Math.PI * 2, cx = Math.cos(ph), sx = Math.sin(ph);
        for (let k = 0; k < 2; k++) { const t = th + k * wdt, ct = Math.cos(t) * r, st = Math.sin(t) * r, j = (i * 2 + k) * 3; p[j] = n.x * ct + (u.x * cx + w.x * sx) * st; p[j + 1] = n.y * ct + (u.y * cx + w.y * sx) * st; p[j + 2] = n.z * ct + (u.z * cx + w.z * sx) * st; }
      }
    }
    g.attributes.position.needsUpdate = true; g.computeBoundingSphere();
  }
  const bandMat = hex => new THREE.MeshBasicMaterial({ color: hex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  function wave(lon, lat, hex) { // sóng lan từ một nước
    for (const delay of [0, .28, .56]) { const m = new THREE.Mesh(bandGeo(), bandMat(hex || 0xffd76a)); m.visible = false; m.frustumCulled = false; scene.add(m); fx.push({ m, t: -delay, dur: 2.2, kind: 'wave', n: P(lon, lat) }); }
  }
  function arc(lon1, lat1, lon2, lat2) { // cung đối đầu giữa hai nước
    const a = P(lon1, lat1), b = P(lon2, lat2), ang = FLAT ? a.distanceTo(b) * .8 : a.angleTo(b), pts = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, lift = Math.sin(Math.PI * t) * (.06 + ang * .22), p = a.clone().lerp(b, t);
      FLAT ? (p.y = .02 + lift) : p.normalize().multiplyScalar(1.02 + lift);
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .0026, 6), bandMat(0xffb52e));
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(.008, 12, 8), bandMat(0xffffff)), s2 = s1.clone();
    scene.add(m, s1, s2); fx.push({ m, s1, s2, curve, t: 0, dur: 6, kind: 'arc' });
  }
  const halo = new THREE.Mesh(bandGeo(), bandMat(0xffd76a)); halo.visible = false; halo.frustumCulled = false; scene.add(halo);
  let haloN = null, haloSize = .05;
  function setHalo(lon, lat, sizeDeg) { if (lon == null) { haloN = null; return; } haloN = P(lon, lat); haloSize = Math.max(.02, Math.min(.5, sizeDeg * D2R)); }

  function stepFx(t, dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i]; e.t += dt; const k = e.t / e.dur;
      if (k >= 1) { for (const m of [e.m, e.s1, e.s2]) if (m) { scene.remove(m); if (m.geometry !== beamGeo) m.geometry.dispose(); m.material.dispose(); } fx.splice(i, 1); continue; }
      if (e.t < 0) continue;
      if (e.kind === 'beam') { const grow = Math.min(1, e.t / .25); e.m.scale.set(e.r * (1 + .25 * Math.sin(t * 30)), e.hgt * grow, e.r * (1 + .25 * Math.sin(t * 30))); e.m.material.uniforms.a.value = Math.min(1, (1 - k) * 2.2); }
      else if (e.kind === 'wave') { e.m.visible = true; setBand(e.m.geometry, e.n, .02 + k * 1.1, .004 + k * .012, 1.012); e.m.material.opacity = (1 - k) * .55; }
      else { e.m.material.opacity = Math.min(1, e.t * 3, (e.dur - e.t) * 2) * (.6 + .4 * Math.sin(t * 9)); const u = (e.t * .45) % 1; e.s1.position.copy(e.curve.getPoint(u)); e.s2.position.copy(e.curve.getPoint(1 - u)); e.s1.material.opacity = e.s2.material.opacity = e.m.material.opacity; }
    }
    halo.visible = !!haloN;
    if (haloN) { setBand(halo.geometry, haloN, haloSize * (1.08 + .06 * Math.sin(t * 4)), .003 + haloSize * .025, 1.04); halo.material.opacity = .4 + .2 * Math.sin(t * 4); }
  }

  // ---------- ngày / đêm theo vị trí mặt trời thật: phủ màu đêm lên nửa trái đất đang tối, viền hoàng hôn màu cam
  const sunUni = { sun: { value: new THREE.Vector3(1, 0, 0) }, k: { value: 0 } };
  const nightFrag = body => `uniform vec3 sun; uniform float k; varying vec3 vP;
    void main(){ ${body}
      float c = dot(n, sun);
      float night = smoothstep(0.10, -0.16, c);              // 0 = ngày, 1 = đêm
      float dusk = smoothstep(0.22, 0.0, abs(c + 0.03));     // dải bình minh / hoàng hôn
      vec3 col = mix(vec3(0.0, 0.015, 0.10), vec3(1.0, 0.42, 0.10), dusk * 0.55);
      gl_FragColor = vec4(col, (night * 0.5 + dusk * 0.16) * k);
    }`;
  const nightMesh = FLAT
    ? new THREE.Mesh(new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
        uniforms: sunUni, transparent: true, depthWrite: false,
        vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        // bản đồ phẳng: đổi toạ độ x, z về kinh / vĩ độ (ngược phép chiếu Mercator) rồi tính như trên mặt cầu
        fragmentShader: nightFrag('float lon = vP.x * 1.5707963, lat = 2.0 * atan(exp(-vP.z * 1.5707963)) - 1.5707963; vec3 n = vec3(cos(lat) * cos(lon), sin(lat), -cos(lat) * sin(lon));'),
      }))
    : new THREE.Mesh(new THREE.SphereGeometry(1.0032, 96, 64), new THREE.ShaderMaterial({
        uniforms: sunUni, transparent: true, depthWrite: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: nightFrag('vec3 n = normalize(vP);'),
      }));
  // lớp đêm nằm sát mặt biển / mặt đất, THẤP hơn khối các nước đang chơi → biển và đất chưa sáng thì tối đi,
  // còn các nước đang chơi vẫn giữ nguyên màu rực rỡ (đúng tinh thần "thắp sáng" trong đêm)
  if (FLAT) nightMesh.position.y = .0024;
  nightMesh.renderOrder = 3; nightMesh.frustumCulled = false; scene.add(nightMesh);
  function setSun(lon, lat, on) { // điểm mặt trời đang chiếu thẳng đứng (kinh độ, vĩ độ); on = bật / tắt lớp ngày đêm
    const p = lat * D2R, l = lon * D2R; sunUni.sun.value.set(Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l));
    sunUni.k.value += ((on ? 1 : 0) - sunUni.k.value) * .05; nightMesh.visible = sunUni.k.value > .01;
  }

  // ---------- thuyền buồm 3D của người tặng quà
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b3a66, 1.25));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.7); sun.position.set(2, 5, 3); scene.add(sun);
  // Tàu dựng hoàn toàn bằng mã (không cần file mô hình): vỏ tàu cong theo từng khung sườn, ván gỗ, mớn nước, sơn đáy,
  // boong lát ván, cột – xà – dây chằng, buồm căng gió có in quốc kỳ, cờ đuôi tàu, vệt bọt sóng.
  // Hai hạng: thuyền một cột buồm (quà nhỏ) và tàu ba cột buồm vuông (quà từ 100 xu / người tặng nhiều nhất).
  // Mũi tàu hướng +X, cột buồm hướng +Y, thân dài 1 đơn vị, mặt nước ở y = 0.
  const mkTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 4; return tx; };
  const hullTex = mkTex(256, 256, (c, w, h) => { // từ trên (mép boong) xuống dưới (sống tàu)
    for (let i = 0; i < 9; i++) { c.fillStyle = ['#6e4020', '#7a4a26', '#643a1c'][i % 3]; c.fillRect(0, i * h * .07, w, h * .07 + 1); }
    c.strokeStyle = 'rgba(25,12,4,.6)'; c.lineWidth = 1.5;
    for (let i = 1; i < 9; i++) {
      c.beginPath(); c.moveTo(0, i * h * .07); c.lineTo(w, i * h * .07); c.stroke();
      for (let k = 0; k < 4; k++) { const bx = (i * 53 + k * 71) % w; c.beginPath(); c.moveTo(bx, (i - 1) * h * .07); c.lineTo(bx, i * h * .07); c.stroke(); } // mối nối ván
    }
    c.fillStyle = '#f1e2b4'; c.fillRect(0, h * .085, w, h * .03); // sọc trang trí sát mép boong
    c.fillStyle = '#ece6d6'; c.fillRect(0, h * .6, w, h * .03);   // vạch mớn nước
    c.fillStyle = '#7c2018'; c.fillRect(0, h * .63, w, h * .37);  // sơn đáy
  });
  const deckTex = mkTex(128, 128, (c, w, h) => { c.fillStyle = '#c9a36b'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,40,15,.55)'; c.lineWidth = 1.5; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(0, i * h / 8); c.lineTo(w, i * h / 8); c.stroke(); } });
  const clothDraw = (c, w, h) => { // vải buồm: ngà, có đường may dọc và hai hàng dây rút
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#e9dfc2'); gr.addColorStop(.5, '#fbf6e6'); gr.addColorStop(1, '#e2d7b8'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,100,60,.38)'; c.lineWidth = 2; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * w / 6, 0); c.lineTo(i * w / 6, h); c.stroke(); }
    c.strokeStyle = 'rgba(120,100,60,.24)'; for (const f of [.33, .66]) { c.beginPath(); c.moveTo(0, h * f); c.lineTo(w, h * f); c.stroke(); }
  };
  const clothTex = mkTex(128, 128, clothDraw);
  const wakeTex = mkTex(256, 64, (c, w, h) => { // vệt bọt: dày ở sát đuôi tàu (bên phải), loe và tan dần về phía sau
    for (let i = 0; i < 260; i++) { const u = Math.pow(Math.random(), .7), spread = (1 - u) * h * .46 + 2; c.fillStyle = `rgba(255,255,255,${(.1 + .5 * Math.random()) * u})`; c.beginPath(); c.arc(u * w, h / 2 + (Math.random() * 2 - 1) * spread, 1 + Math.random() * 3.5, 0, 7); c.fill(); }
  });
  const flagImg = new Map(); // quốc kỳ (SVG) → ảnh, tải một lần cho mỗi nước
  function withFlag(cc, cb) {
    let e = flagImg.get(cc); if (!e) { e = { img: new Image(), ok: false, wait: [] }; e.img.onload = () => { e.ok = true; e.wait.splice(0).forEach(f => f(e.img)); }; e.img.src = `/flags/4x3/${cc}.svg`; flagImg.set(cc, e); }
    e.ok ? cb(e.img) : e.wait.push(cb);
  }
  const HULL = (() => { // vỏ tàu: 19 khung sườn từ đuôi tới mũi, mỗi khung là một đường cong từ sống tàu lên mép boong
    const NS = 18, M = 7, D = .1, B = .155, pos = [], uv = [], idx = [], dpos = [], duv = [], didx = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS;
      const bw = t < .42 ? B * (.74 + .26 * Math.sin(t / .42 * Math.PI / 2)) : B * Math.pow(Math.max(0, 1 - Math.pow((t - .42) / .58, 2.1)), .9); // nửa bề ngang
      const sheer = .15 + .11 * Math.pow(Math.abs(t - .42) / .58, 2);                                                                   // mép boong: vểnh ở mũi và đuôi
      const keel = -D * (t > .8 ? 1 - Math.pow((t - .8) / .2, 2) * .9 : 1) * (t < .1 ? .75 + .25 * t / .1 : 1);                          // sống tàu: vát lên ở mũi
      const rake = Math.max(0, (t - .8) / .2) * .32;                                                                                    // mũi tàu chồm về trước
      for (let j = -M; j <= M; j++) {
        const u = Math.abs(j) / M, y = keel + (sheer - keel) * Math.pow(u, 1.7);
        pos.push(-.5 + t + rake * (y + D), y, Math.sign(j) * bw * Math.pow(Math.sin(u * Math.PI / 2), .75)); uv.push(t * 3, (y + D) / .37);
      }
      const dy = sheer - .035; for (const s of [-1, 1]) { dpos.push(-.5 + t + rake * (dy + D), dy, s * bw * .93); duv.push(t * 5, s > 0 ? 1 : 0); }
    }
    const Wd = 2 * M + 1;
    for (let i = 0; i < NS; i++) {
      for (let j = 0; j < Wd - 1; j++) { const a = i * Wd + j; idx.push(a, a + Wd, a + 1, a + 1, a + Wd, a + Wd + 1); }
      didx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const c0 = pos.length / 3; pos.push(-.5, .05, 0); uv.push(0, .4); for (let j = 0; j < Wd - 1; j++) idx.push(c0, j + 1, j); // tấm đuôi tàu
    const mk = (p, u2, ix) => { const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); gm.setAttribute('uv', new THREE.Float32BufferAttribute(u2, 2)); gm.setIndex(ix); gm.computeVertexNormals(); gm.userData.shared = true; return gm; };
    const wake = new THREE.PlaneGeometry(1.7, .7).rotateX(-Math.PI / 2); wake.translate(-1.3, .012, 0); wake.userData.shared = true;
    return { hull: mk(pos, uv, idx), deck: mk(dpos, duv, didx), wake };
  })();
  function quadSail(w, h, bulge) { // buồm vuông: bề ngang nằm ngang thân tàu, phồng về phía mũi
    const gm = new THREE.PlaneGeometry(w, h, 6, 5), p = gm.attributes.position;
    for (let i = 0; i < p.count; i++) { const sx = p.getX(i), sy = p.getY(i); p.setXYZ(i, bulge * Math.cos(sx / w * Math.PI) * (.6 + .4 * Math.cos(sy / h * Math.PI * .8)), sy, sx); }
    gm.computeVertexNormals(); return gm;
  }
  function triSail(A, B, C, bulge) { // buồm tam giác dọc thân tàu: A, B là hai góc dưới, C là đỉnh; phồng sang mạn
    const n = 6, pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const u = i / n, v = j / n, bx = A[0] + (B[0] - A[0]) * u, by = A[1] + (B[1] - A[1]) * u;
      pos.push(bx + (C[0] - bx) * v, by + (C[1] - by) * v, bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * (v * .85 + .08)) * (1 - v * .5)); uv.push(u * (1 - v) + .5 * v, v);
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j; idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2); }
    const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gm.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gm.setIndex(idx); gm.computeVertexNormals(); return gm;
  }
  const shipPool = new Map(), mB = new THREE.Matrix4(), vF = new THREE.Vector3(), vR = new THREE.Vector3();
  function makeShip(tall, cc) {
    const o = { grp: new THREE.Group(), body: new THREE.Group(), seed: Math.random() * 9, sc: 0, mats: [], texs: [] };
    const M = (c, map) => { const m = new THREE.MeshLambertMaterial({ color: c, map: map || null, side: THREE.DoubleSide }); o.mats.push(m); return m; };
    const add = (geo, mat, px = 0, py = 0, pz = 0, par = o.body) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); par.add(m); return m; };
    const rod = (a, b, r, mat, par = o.body) => { // một thanh gỗ nối hai điểm (cột, xà, cần)
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), m = new THREE.Mesh(new THREE.CylinderGeometry(r * .7, r, va.distanceTo(vb), 7), mat);
      m.position.copy(va).add(vb).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, vb.clone().sub(va).normalize()); par.add(m); return m;
    };
    const wood = M(0x5a3a1c), cream = M(0xf1e2b4), sail = M(0xffffff, clothTex), base = .125, ropes = [];
    // buồm chính in quốc kỳ, cờ đuôi tàu là quốc kỳ
    const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sx = sc.getContext('2d'); clothDraw(sx, 256, 256);
    const sailTex = new THREE.CanvasTexture(sc); sailTex.colorSpace = THREE.SRGBColorSpace; o.texs.push(sailTex);
    const fc = document.createElement('canvas'); fc.width = 128; fc.height = 96; const flagTex = new THREE.CanvasTexture(fc); flagTex.colorSpace = THREE.SRGBColorSpace; o.texs.push(flagTex);
    withFlag(cc, img => { sx.globalAlpha = .9; sx.drawImage(img, 40, 62, 176, 132); sx.globalAlpha = 1; sailTex.needsUpdate = true; fc.getContext('2d').drawImage(img, 0, 0, 128, 96); flagTex.needsUpdate = true; });
    const flagSail = M(0xffffff, sailTex), flagMat = new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide }); o.mats.push(flagMat);
    o.hullMat = M(0xffffff, hullTex); add(HULL.hull, o.hullMat); add(HULL.deck, M(0xffffff, deckTex));
    o.pennant = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }); o.mats.push(o.pennant);
    let top; // đỉnh cột chính (gắn cờ đuôi nheo)
    if (tall) { // ---- tàu ba cột buồm vuông
      [[.2, .78], [-.03, .92], [-.27, .66]].forEach(([mx, h], k) => {
        rod([mx, base, 0], [mx, base + h, 0], .015, wood);
        (k < 2 ? [[.34, .36, .21], [.6, .29, .17], [.82, .2, .12]] : [[.74, .2, .13]]).forEach(([f, w, sh], li) => {
          const lv = new THREE.Group(); lv.position.set(mx + .014, base + h * f, 0); lv.rotation.y = .17; o.body.add(lv); // xà + buồm xoay nhẹ đón gió
          add(quadSail(w, sh, w * .17), k === 1 && li === 0 ? flagSail : sail, 0, 0, 0, lv);
          rod([0, sh / 2, -w / 2 - .018], [0, sh / 2, w / 2 + .018], .0075, wood, lv);
        });
        for (const s of [-1, 1]) for (const dx of [-.055, .05]) ropes.push(mx, base + h * .8, 0, mx + dx, .165, s * .135); // dây chằng cột xuống hai mạn
      });
      add(new THREE.CylinderGeometry(.03, .021, .026, 10), wood, -.03, base + .92 * .66, 0);                 // chòi quan sát
      rod([.44, .2, 0], [.8, .31, 0], .011, wood);                                                           // cần mũi
      add(triSail([.78, .305], [.24, .26], [.2, base + .78 * .8], .03), sail); add(triSail([.63, .26], [.27, .245], [.2, base + .78 * .56], .024), sail); // hai buồm mũi
      add(triSail([-.27, base + .07], [-.52, base + .13], [-.27, base + .6], -.03), sail); rod([-.27, base + .075, 0], [-.54, base + .13, 0], .007, wood);   // buồm lái
      add(new THREE.BoxGeometry(.2, .06, .23), M(0x6e4020), -.39, .235, 0); add(new THREE.BoxGeometry(.22, .012, .25), cream, -.39, .271, 0);               // lầu đuôi tàu
      add(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd76a }), -.5, .31, 0);                                              // đèn lồng
      ropes.push(-.03, base + .92, 0, .2, base + .78, 0, .2, base + .78, 0, .8, .31, 0, -.03, base + .92, 0, -.27, base + .66, 0, -.27, base + .66, 0, -.5, .28, 0);
      top = [-.03, base + .92];
    } else { // ---- thuyền một cột buồm
      rod([.08, base, 0], [.08, base + .95, 0], .014, wood); rod([.08, base + .1, 0], [-.43, base + .125, 0], .008, wood);
      add(triSail([.075, base + .1], [-.41, base + .125], [.075, base + .93], .05), flagSail);
      add(triSail([.52, .2], [.12, base + .09], [.08, base + .8], .035), sail);
      add(new THREE.BoxGeometry(.2, .07, .16), cream, -.14, .15, 0); add(new THREE.BoxGeometry(.23, .014, .19), wood, -.14, .192, 0); // cabin
      ropes.push(.08, base + .95, 0, .53, .2, 0, .08, base + .95, 0, -.5, .2, 0);
      for (const s of [-1, 1]) ropes.push(.08, base + .7, 0, .08, .15, s * .14);
      top = [.08, base + .95];
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(ropes, 3));
    const rm = new THREE.LineBasicMaterial({ color: 0x24160a }); o.mats.push(rm); o.body.add(new THREE.LineSegments(rg, rm));
    rod([-.5, .2, 0], [-.5, .4, 0], .0045, wood); o.ensign = add(new THREE.PlaneGeometry(.15, .1), flagMat, -.578, .345, 0);                 // quốc kỳ ở đuôi tàu
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, .035, 0, -.2, .017, 0], 3)); pg.setIndex([0, 1, 2]);
    o.pen = add(pg, o.pennant, top[0], top[1] + .005, 0);                                                                                    // cờ đuôi nheo trên đỉnh cột
    const wm = new THREE.MeshBasicMaterial({ map: wakeTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }); o.mats.push(wm);
    o.wake = new THREE.Mesh(HULL.wake, wm); o.grp.add(o.wake);
    o.grp.add(o.body); scene.add(o.grp);
    return o;
  }
  // list: [{ key, lon, lat, lon2, lat2 (điểm phía trước để lấy hướng mũi), px (chiều dài trên màn hình), gold, hue }]
  function setShips(list, t) {
    const seen = new Set();
    for (const s of list) {
      let o = shipPool.get(s.key); if (!o) { o = makeShip(s.tall, s.cc); shipPool.set(s.key, o); }
      seen.add(s.key);
      const p = P(s.lon, s.lat, 1), up = FLAT ? UP : p.clone().normalize();
      vF.copy(P(s.lon2, s.lat2, 1)).sub(p); vF.addScaledVector(up, -vF.dot(up)); if (vF.lengthSq() < 1e-12) vF.set(1, 0, 0); vF.normalize();
      vR.crossVectors(vF, up).normalize();
      o.grp.quaternion.setFromRotationMatrix(mB.makeBasis(vF, up, vR)); o.grp.position.copy(p);
      o.sc += (s.px * camera.position.distanceTo(p) / 3583 - o.sc) * .18; o.grp.scale.setScalar(Math.max(1e-5, o.sc)); // cỡ gần như cố định trên màn hình
      const ph = t * 1.7 + o.seed; // dập dềnh theo sóng
      o.body.position.y = Math.sin(ph) * .022; o.body.rotation.x = Math.sin(ph * .8) * .08; o.body.rotation.z = Math.sin(ph * 1.15 + 1) * .045;
      o.body.rotation.x += .06;                                              // nghiêng nhẹ theo gió
      o.ensign.rotation.y = Math.sin(t * 6 + o.seed) * .4; o.pen.rotation.y = Math.sin(t * 7 + o.seed) * .5;
      o.wake.material.opacity = .5 + .15 * Math.sin(t * 5 + o.seed);
      o.hullMat.color.setHex(s.gold ? 0xffd27a : 0xffffff);                  // tàu của người tặng nhiều nhất: vỏ ánh vàng
      o.pennant.color.setHSL(s.gold ? .13 : s.hue / 360, 1, .55);
    }
    wakeTex.offset.x = -(t * .35) % 1; // bọt sóng trôi về phía sau
    for (const [k, o] of shipPool) if (!seen.has(k)) {
      scene.remove(o.grp); o.grp.traverse(m => { if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); });
      o.mats.forEach(m => m.dispose()); o.texs.forEach(x2 => x2.dispose()); shipPool.delete(k);
    }
  }

  // ---------- kiến trúc theo thời đại: mỗi nước có một "thành phố" đặt trên lãnh thổ, đổi kiểu khi lên thời đại
  // 0 đồ đá · 1 đồ đồng · 2 đồ sắt · 3 cổ đại · 4 trung cổ · 5 phục hưng · 6 công nghiệp · 7 hiện đại
  // Dựng bằng khối cơ bản rồi gộp thành 2 lưới (khối + đèn) cho nhẹ. Mặt đất là đĩa tròn đường kính ~1, trục đứng +Y.
  const townMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const townLight = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const smokeGeo = new THREE.SphereGeometry(1, 8, 6); smokeGeo.userData.shared = true;
  function mergeParts(parts) {
    const list = parts.map(([g, hex]) => { const ng = g.index ? g.toNonIndexed() : g; if (ng !== g) g.dispose(); ng.deleteAttribute('uv'); ng.computeVertexNormals(); return [ng, hex]; });
    const n = list.reduce((s, [g]) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    let o = 0;
    for (const [g, hex] of list) {
      const cnt = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      c.set(hex); for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
      o += cnt; g.dispose();
    }
    const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gm.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); gm.setAttribute('color', new THREE.BufferAttribute(col, 3));
    gm.computeBoundingSphere(); return gm;
  }
  // khối cơ bản; y là chân khối
  const Bx = (w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
  const Cy = (rt, rb, h, x, y, z, seg = 10) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y + h / 2, z); return g; };
  const Co = (r, h, x, y, z, seg = 10, ry = 0) => { const g = new THREE.ConeGeometry(r, h, seg); if (ry) g.rotateY(ry); g.translate(x, y + h / 2, z); return g; };
  const Dm = (r, x, y, z) => { const g = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(x, y, z); return g; };
  const Gb = (w, h, d, x, y, z, ry = 0) => { // mái hai dốc: rộng w, cao h, nóc chạy dọc trục z dài d (ry = π/2 để nóc chạy dọc trục x)
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); if (ry) g.rotateY(ry); g.translate(x, y, z); return g;
  };
  const Dc = (r, x, y, z) => { const g = new THREE.CylinderGeometry(r, r, .003, 16); g.rotateX(Math.PI / 2); g.translate(x, y, z); return g; }; // đĩa đứng quay ra phía trước (+z)
  const Sp = (r, x, y, z, sy = 1) => { const g = new THREE.SphereGeometry(r, 10, 7); g.scale(1, sy, 1); g.translate(x, y, z); return g; };
  function buildTown(era, hue) {
    const P2 = [], L2 = [], smoke = [], flagC = new THREE.Color().setHSL(hue / 360, .85, .5).getHex();
    const p = (g, c) => P2.push([g, c]), lt = (g, c = 0xffe08a) => L2.push([g, c]);
    const tree = (x, z, s = 1) => { p(Cy(.007 * s, .01 * s, .05 * s, x, .02, z, 6), 0x6a4a2a); p(Co(.04 * s, .1 * s, x, .06 * s, z, 7), 0x2f6a2c); };
    const GROUND = [0x6c8f3a, 0xcdb27c, 0x5e8a36, 0xd9d0b8, 0x77894f, 0xb9a98a, 0x6b625a, 0x4f5866];
    p(Cy(.48, .5, .02, 0, 0, 0, 28), GROUND[era]);
    let top = .2;
    if (era === 0) { // đồ đá: lều tròn mái tranh, vòng đá, lửa trại, cây
      [[-.22, .08], [.2, .12], [-.05, -.2], [.26, -.14], [-.3, -.12]].forEach(([x, z], i) => { const s = i === 2 ? 1.25 : 1; p(Cy(.07 * s, .078 * s, .06 * s, x, .02, z), 0x8a6a42); p(Co(.1 * s, .11 * s, x, .02 + .06 * s, z), 0xc9a35a); });
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; p(Bx(.03, .07 + (i % 3) * .015, .025, Math.cos(a) * .1, .02, .24 + Math.sin(a) * .06, a), 0x8b8b84); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p(Sp(.014, .03 + Math.cos(a) * .035, .03, .02 + Math.sin(a) * .035), 0x55524c); }
      lt(Co(.026, .07, .03, .025, .02, 7), 0xff9a2a); lt(Co(.013, .045, .03, .03, .02, 6), 0xffe27a);
      tree(.38, 0); tree(-.38, .2, 1.2); tree(.1, -.36, 1.1); top = .2;
    } else if (era === 1) { // đồ đồng: tháp bậc (ziggurat), nhà đất nện mái bằng, cột đá, cây cọ
      [[.34, .3, 0xb88a52], [.26, .22, 0xc49660], [.18, .15, 0xb88a52], [.1, .09, 0xe0c38a]].forEach(([w, d, c], i) => p(Bx(w, .065, d, 0, .02 + i * .065, -.17), c));
      p(Bx(.05, .2, .06, 0, .02, .0, 0), 0xc9a06a);
      [[-.28, .12], [.27, .14], [-.12, .25], [.12, .27], [-.33, -.1], [.33, -.08]].forEach(([x, z]) => { p(Bx(.1, .065, .085, x, .02, z), 0xc79a5e); p(Bx(.11, .012, .095, x, .085, z), 0xa87a44); lt(Bx(.02, .025, .002, x, .04, z + .044), 0xffc46a); });
      p(Bx(.026, .17, .026, .2, .02, -.32), 0xe2d3a8); p(Co(.022, .035, .2, .19, -.32, 4, Math.PI / 4), 0xe8c060);
      for (const [x, z] of [[-.4, .02], [.41, .25], [-.2, -.38]]) { p(Cy(.007, .011, .14, x, .02, z, 6), 0x8a6a3a); p(Sp(.05, x, .17, z, .35), 0x3f8a3a); }
      lt(Bx(.03, .03, .002, 0, .27, -.124), 0xffd060); top = .3;
    } else if (era === 2) { // đồ sắt: hàng rào cọc, nhà dài mái tranh, tháp canh, lò rèn
      for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < .18) continue; const x = Math.cos(a) * .44, z = Math.sin(a) * .44; p(Cy(.011, .011, .08, x, .02, z, 5), 0x7a5230); p(Co(.011, .025, x, .1, z, 5), 0x6a4426); }
      p(Cy(.014, .014, .13, -.07, .02, .44, 6), 0x5e3d22); p(Cy(.014, .014, .13, .07, .02, .44, 6), 0x5e3d22); p(Bx(.18, .02, .025, 0, .14, .44), 0x5e3d22);
      [[-.15, -.08, 0], [.16, -.02, 0], [-.05, .17, 0], [.02, -.27, 0]].forEach(([x, z]) => { p(Bx(.22, .065, .1, x, .02, z), 0x8a5a32); p(Gb(.12, .085, .24, x, .085, z, Math.PI / 2), 0x6b4a2a); lt(Bx(.02, .025, .002, x, .035, z + .051), 0xffb24a); });
      [[.27, -.27], [.35, -.27], [.27, -.19], [.35, -.19]].forEach(([x, z]) => p(Cy(.008, .008, .22, x, .02, z, 5), 0x6a4426));
      p(Bx(.12, .015, .12, .31, .24, -.23), 0x7a5230); p(Co(.09, .08, .31, .255, -.23, 4, Math.PI / 4), 0x6b4a2a);
      lt(Sp(.022, -.27, .04, .2), 0xff7a1a); p(Bx(.06, .03, .05, -.27, .02, .25), 0x444040);
      tree(-.3, -.3); tree(.33, .22); top = .34;
    } else if (era === 3) { // cổ đại: đền cột đá mái tam giác, biệt thự mái ngói đỏ, tượng, cây bách
      p(Bx(.44, .025, .3, 0, .02, -.13), 0xe8e1cc); p(Bx(.4, .025, .26, 0, .045, -.13), 0xefe9d8);
      for (let i = 0; i < 7; i++) { const x = -.17 + i * .0567; p(Cy(.013, .015, .17, x, .07, -.02), 0xf6f2e6); p(Cy(.013, .015, .17, x, .07, -.24), 0xf6f2e6); }
      for (const x of [-.17, .17]) for (const z of [-.09, -.165]) p(Cy(.013, .015, .17, x, .07, z), 0xf6f2e6);
      p(Bx(.4, .035, .26, 0, .24, -.13), 0xe8e1cc); p(Gb(.27, .07, .41, 0, .275, -.13, Math.PI / 2), 0xb5583a);
      lt(Bx(.08, .1, .002, 0, .09, -.21), 0xffd27a);
      [[-.28, .16], [.27, .18], [-.08, .28], [.12, .3]].forEach(([x, z]) => { p(Bx(.11, .06, .085, x, .02, z), 0xf2ede0); p(Gb(.1, .045, .12, x, .08, z, Math.PI / 2), 0xb5583a); });
      p(Cy(.03, .034, .06, .0, .02, .14, 10), 0xd8d0bc); p(Cy(.012, .016, .07, 0, .08, .14, 8), 0xd8b04a); p(Sp(.012, 0, .16, .14), 0xd8b04a);
      for (const [x, z] of [[-.4, -.1], [.4, -.05], [-.38, .26], [.38, .3]]) { p(Cy(.006, .008, .03, x, .02, z, 5), 0x6a4a2a); p(Co(.022, .16, x, .045, z, 7), 0x2c5a2a); }
      top = .36;
    } else if (era === 4) { // trung cổ: lâu đài tường đá, tháp góc mái nhọn, tháp chính cắm cờ nước mình, nhà khung gỗ
      const cz = -.1, S = .2, H = .11, stone = 0x8d8a82;
      p(Bx(2 * S, H, .03, 0, .02, cz + S), stone); p(Bx(2 * S, H, .03, 0, .02, cz - S), stone); p(Bx(.03, H, 2 * S, -S, .02, cz), stone); p(Bx(.03, H, 2 * S, S, .02, cz), stone);
      for (let i = 0; i < 9; i++) { const u = -S + i * S / 4; p(Bx(.022, .022, .034, u, .02 + H, cz + S), stone); p(Bx(.022, .022, .034, u, .02 + H, cz - S), stone); p(Bx(.034, .022, .022, -S, .02 + H, cz + u), stone); p(Bx(.034, .022, .022, S, .02 + H, cz + u), stone); }
      for (const x of [-S, S]) for (const z of [cz - S, cz + S]) { p(Cy(.05, .055, .2, x, .02, z, 12), 0x9a968c); p(Co(.068, .11, x, .22, z, 12), 0x3f4f7a); lt(Bx(.012, .02, .002, x, .13, z + .052), 0xffc46a); }
      p(Bx(.075, .07, .01, 0, .02, cz + S + .016), 0x3a2a1a);
      p(Bx(.15, .26, .15, 0, .02, cz - .02), 0x9a978e); for (let i = 0; i < 4; i++) { const u = -.06 + i * .04; p(Bx(.022, .025, .022, u, .28, cz + .055), 0x9a978e); p(Bx(.022, .025, .022, u, .28, cz - .095), 0x9a978e); }
      lt(Bx(.02, .035, .002, -.035, .17, cz + .056), 0xffc46a); lt(Bx(.02, .035, .002, .035, .17, cz + .056), 0xffc46a);
      p(Cy(.004, .004, .14, 0, .3, cz - .02, 5), 0x3a2a1a); p(Bx(.07, .045, .004, .035, .39, cz - .02), flagC);
      [[-.3, .24], [-.15, .3], [.15, .3], [.3, .24]].forEach(([x, z]) => { p(Bx(.09, .06, .075, x, .02, z), 0xe8dcc0); p(Bx(.092, .008, .077, x, .05, z), 0x5a3a2a); p(Gb(.09, .055, .1, x, .08, z), 0x5a3a2a); lt(Bx(.018, .02, .002, x, .035, z + .039), 0xffc46a); });
      tree(-.4, 0); tree(.41, .05); top = .44;
    } else if (era === 5) { // phục hưng: nhà thờ mái vòm, tháp chuông, dinh thự, đài phun nước
      p(Bx(.34, .13, .14, 0, .02, -.14), 0xe6d3b0); p(Gb(.15, .06, .35, 0, .15, -.14, Math.PI / 2), 0xb0573a);
      p(Bx(.12, .16, .2, .0, .02, -.14), 0xead9b8);
      p(Cy(.075, .075, .07, 0, .18, -.14, 16), 0xe9d8b5); p(Dm(.08, 0, .25, -.14), 0xc0643a);
      p(Cy(.012, .015, .04, 0, .325, -.14, 8), 0xf1e6cc); p(Co(.014, .03, 0, .365, -.14, 8), 0xd8b04a);
      lt(Dc(.035, 0, .12, -.038), 0xffd27a); // cửa sổ hoa hồng
      p(Bx(.065, .34, .065, .3, .02, -.26), 0xe9d8b5); p(Co(.052, .07, .3, .36, -.26, 4, Math.PI / 4), 0xb0573a); lt(Bx(.03, .04, .002, .3, .28, -.226), 0xffd27a);
      [[-.28, .14, 0xd9a35e], [-.1, .22, 0xe7c38a], [.12, .2, 0xd98a5e], [.3, .12, 0xe3b67a]].forEach(([x, z, c]) => { p(Bx(.13, .09, .08, x, .02, z), c); p(Bx(.135, .01, .085, x, .11, z), 0xa8503a); for (let k = 0; k < 3; k++) lt(Bx(.018, .022, .002, x - .04 + k * .04, .06, z + .041), 0xffd27a); });
      p(Cy(.05, .055, .02, 0, .02, .35, 14), 0xd8d0bc); lt(Cy(.04, .04, .004, 0, .04, .35, 14), 0x9fd8ff); p(Cy(.006, .008, .05, 0, .04, .35, 6), 0xd8d0bc);
      tree(-.4, -.15); tree(.41, .3); top = .4;
    } else if (era === 6) { // công nghiệp: nhà máy gạch mái răng cưa, ống khói nhả khói, tháp đồng hồ, cửa sổ sáng
      [[-.15, -.15], [.15, -.15]].forEach(([x, z]) => {
        p(Bx(.24, .1, .14, x, .02, z), 0x9a4a32);
        for (let k = 0; k < 3; k++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.08, 0); s.lineTo(0, .05); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: false }); g.translate(x - .12 + k * .08, .12, z - .07); p(g, 0x5a4a44); lt(Bx(.002, .04, .12, x - .12 + k * .08 + .001, .12, z), 0xcfe0ff); }
        for (let k = 0; k < 5; k++) lt(Bx(.026, .03, .002, x - .095 + k * .047, .05, z + .071), 0xffd27a);
      });
      [[-.3, -.27], [-.03, -.27], [.27, -.28]].forEach(([x, z], i) => { const h = .3 + i * .04; p(Cy(.018, .026, h, x, .02, z, 10), 0x6a3a2a); p(Cy(.022, .022, .015, x, .02 + h - .015, z, 10), 0x3a2a22); smoke.push([x, .02 + h, z]); });
      p(Bx(.07, .3, .07, .32, .02, .05), 0xc9b07a); p(Bx(.08, .06, .08, .32, .32, .05), 0xd8c08a); p(Co(.06, .1, .32, .38, .05, 4, Math.PI / 4), 0x3f4a3a);
      lt(Dc(.024, .32, .35, .092), 0xfff2c4); // mặt đồng hồ
      [[-.25, .2], [-.04, .25], [.14, .27]].forEach(([x, z]) => { p(Bx(.15, .07, .1, x, .02, z), 0x7a6a5a); p(Gb(.1, .04, .155, x, .09, z, Math.PI / 2), 0x4a4a4a); for (let k = 0; k < 3; k++) lt(Bx(.022, .022, .002, x - .045 + k * .045, .05, z + .051), 0xffd27a); });
      for (const [x, z] of [[-.04, .02], [.04, .02], [-.04, .1], [.04, .1]]) p(Cy(.004, .004, .1, x + .02, .02, z, 4), 0x555555);
      p(Cy(.05, .05, .05, .02, .12, .06, 12), 0x8a5a3a); p(Co(.055, .03, .02, .17, .06, 12), 0x5a3a2a);
      top = .48;
    } else { // hiện đại: nhà chọc trời kính, tầng sáng đèn, tháp biểu tượng có chóp, công viên
      p(Cy(.16, .16, .006, -.28, .02, .28, 18), 0x4f8a3c);
      for (const [x, z] of [[-.34, .22], [-.22, .34], [-.3, .36], [-.2, .24]]) { p(Cy(.005, .007, .025, x, .026, z, 5), 0x6a4a2a); p(Sp(.03, x, .07, z, 1.2), 0x2f7a34); }
      const T = [[0, -.18, .1, .1, .72, 0x6f8fb0], [-.2, -.1, .1, .1, .52, 0x3e5a78], [.2, -.12, .11, .09, .6, 0x8fa7bf], [-.06, .1, .09, .08, .34, 0x5d7a99], [.15, .12, .1, .1, .42, 0x4c6a8a], [.33, .05, .08, .1, .28, 0x6a7f95], [-.36, -.02, .08, .08, .3, 0x9fb4c8]];
      T.forEach(([x, z, w, d, h, c], ti) => {
        p(Bx(w, h, d, x, .02, z), c); p(Bx(w * .92, .02, d * .92, x, .02 + h, z), 0x3a4a5a);
        for (let y = .06; y < h - .02; y += .045) if (((y * 1000 | 0) + ti * 7) % 5 !== 0) lt(Bx(w + .004, .007, d + .004, x, .02 + y, z), (ti + (y * 100 | 0)) % 4 ? 0xffe6a0 : 0xbfe4ff);
      });
      p(Bx(.07, .12, .07, 0, .74, -.18), 0x7f9fc0); p(Bx(.045, .06, .045, 0, .86, -.18), 0x8fafd0); p(Cy(.003, .008, .18, 0, .92, -.18, 6), 0xdfe6ee);
      lt(Sp(.01, 0, 1.1, -.18), 0xff3a3a);
      for (const z of [.0, .2]) p(Bx(.9, .004, .05, 0, .02, z), 0x2f343c);
      top = 1.11;
    }
    return { geo: mergeParts(P2), light: L2.length ? mergeParts(L2) : null, smoke, top };
  }
  // làng / thị trấn nhỏ rải khắp lãnh thổ: 3 kiểu cho mỗi thời đại, dựng một lần rồi dùng chung cho mọi nước
  const VG = {};
  function village(era, v) {
    const key = era * 3 + v; if (VG[key]) return VG[key];
    const P2 = [], L2 = [], smoke = [], p = (g, c) => P2.push([g, c]), lt = (g, c = 0xffe08a) => L2.push([g, c]);
    let seed = key * 7919 + 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const GROUND = [0x6c8f3a, 0xcdb27c, 0x5e8a36, 0xd9d0b8, 0x77894f, 0xb9a98a, 0x6b625a, 0x4f5866];
    const tree = (x, z, s = 1) => { p(Cy(.009 * s, .013 * s, .06 * s, x, .015, z, 6), 0x6a4a2a); p(Co(.05 * s, .12 * s, x, .07 * s, z, 7), 0x2f6a2c); };
    const rot = v * 2.1, S = [[-.2, .1], [.18, .14], [.02, -.18], [.24, -.1], [-.22, -.14], [0, .24]].map(([x, z]) => [x * Math.cos(rot) - z * Math.sin(rot), x * Math.sin(rot) + z * Math.cos(rot)]);
    p(Cy(.42, .44, .015, 0, 0, 0, 22), GROUND[era]);
    let top = .2;
    if (era === 0) {
      for (let i = 0; i < 3; i++) { const [x, z] = S[i], s = .9 + rnd() * .4; p(Cy(.08 * s, .09 * s, .07 * s, x, .015, z), 0x8a6a42); p(Co(.12 * s, .13 * s, x, .015 + .07 * s, z), 0xc9a35a); }
      lt(Co(.03, .08, S[3][0] * .5, .015, S[3][1] * .5, 7), 0xff9a2a); tree(S[4][0], S[4][1]); if (v) tree(S[5][0], S[5][1], .9); top = .22;
    } else if (era === 1) {
      for (let i = 0; i < 3; i++) { const [x, z] = S[i]; p(Bx(.12, .08, .1, x, .015, z, rnd()), 0xc79a5e); p(Bx(.13, .014, .11, x, .095, z), 0xa87a44); lt(Bx(.024, .03, .002, x, .03, z + .051), 0xffc46a); }
      if (v === 0) { p(Bx(.2, .07, .18, S[3][0], .015, S[3][1]), 0xb88a52); p(Bx(.12, .07, .1, S[3][0], .085, S[3][1]), 0xc49660); top = .17; }
      else { p(Bx(.03, .2, .03, S[3][0], .015, S[3][1]), 0xe2d3a8); p(Co(.026, .04, S[3][0], .215, S[3][1], 4, Math.PI / 4), 0xe8c060); top = .26; }
      p(Cy(.008, .012, .15, S[4][0], .015, S[4][1], 6), 0x8a6a3a); p(Sp(.055, S[4][0], .18, S[4][1], .35), 0x3f8a3a);
    } else if (era === 2) {
      for (let i = 0; i < 2; i++) { const [x, z] = S[i]; p(Bx(.24, .075, .11, x, .015, z), 0x8a5a32); p(Gb(.13, .09, .26, x, .09, z, Math.PI / 2), 0x6b4a2a); lt(Bx(.022, .028, .002, x, .035, z + .056), 0xffb24a); }
      if (v !== 2) { const [x, z] = S[2]; for (const [dx, dz] of [[-.04, -.04], [.04, -.04], [-.04, .04], [.04, .04]]) p(Cy(.008, .008, .24, x + dx, .015, z + dz, 5), 0x6a4426); p(Bx(.12, .015, .12, x, .255, z), 0x7a5230); p(Co(.09, .08, x, .27, z, 4, Math.PI / 4), 0x6b4a2a); top = .35; }
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI + rot; p(Cy(.01, .01, .08, Math.cos(a) * .38, .015, Math.sin(a) * .38, 5), 0x7a5230); }
      tree(S[3][0], S[3][1]);
    } else if (era === 3) {
      const [tx, tz] = S[2]; p(Bx(.24, .025, .17, tx, .015, tz), 0xe8e1cc);
      for (let i = 0; i < 4; i++) { p(Cy(.012, .014, .13, tx - .09 + i * .06, .04, tz + .06), 0xf6f2e6); p(Cy(.012, .014, .13, tx - .09 + i * .06, .04, tz - .06), 0xf6f2e6); }
      p(Bx(.23, .025, .16, tx, .17, tz), 0xe8e1cc); p(Gb(.17, .05, .24, tx, .195, tz, Math.PI / 2), 0xb5583a);
      for (let i = 0; i < 2; i++) { const [x, z] = S[i]; p(Bx(.12, .065, .09, x, .015, z), 0xf2ede0); p(Gb(.11, .05, .13, x, .08, z, Math.PI / 2), 0xb5583a); }
      for (const [x, z] of [S[3], S[4]]) { p(Cy(.006, .008, .03, x, .015, z, 5), 0x6a4a2a); p(Co(.024, .17, x, .04, z, 7), 0x2c5a2a); }
      top = .25;
    } else if (era === 4) {
      const [cx, cz] = S[2];
      if (v === 0) { p(Cy(.06, .065, .24, cx, .015, cz, 12), 0x9a968c); p(Co(.08, .13, cx, .255, cz, 12), 0x3f4f7a); lt(Bx(.016, .025, .002, cx, .16, cz + .062), 0xffc46a); top = .39; }
      else if (v === 1) { // cối xay gió
        p(Cy(.045, .065, .2, cx, .015, cz, 10), 0xe8dcc0); p(Co(.06, .07, cx, .215, cz, 10), 0x5a3a2a);
        for (let k = 0; k < 4; k++) { const g = new THREE.BoxGeometry(.018, .17, .004); g.translate(0, .085, 0); g.rotateZ(k * Math.PI / 2 + .4); g.translate(cx, .2, cz + .07); p(g, 0xd9c9a8); }
        top = .38;
      } else { p(Bx(.12, .1, .17, cx, .015, cz), 0xd9d2c4); p(Gb(.13, .07, .18, cx, .115, cz), 0x5a3a2a); p(Bx(.05, .2, .05, cx, .015, cz + .1), 0xd9d2c4); p(Co(.04, .1, cx, .215, cz + .1, 4, Math.PI / 4), 0x3f4f7a); top = .32; }
      for (let i = 0; i < 3; i++) { const [x, z] = i < 2 ? S[i] : S[4]; p(Bx(.1, .065, .085, x, .015, z), 0xe8dcc0); p(Bx(.102, .009, .087, x, .05, z), 0x5a3a2a); p(Gb(.1, .06, .11, x, .08, z), 0x5a3a2a); lt(Bx(.02, .022, .002, x, .03, z + .044), 0xffc46a); }
      tree(S[3][0], S[3][1]);
    } else if (era === 5) {
      const [cx, cz] = S[2];
      p(Bx(.18, .12, .12, cx, .015, cz), 0xe6d3b0); p(Cy(.055, .055, .05, cx, .135, cz, 14), 0xe9d8b5); p(Dm(.06, cx, .185, cz), 0xc0643a); p(Co(.012, .04, cx, .245, cz, 8), 0xd8b04a);
      if (v !== 1) { p(Bx(.05, .25, .05, cx + .14, .015, cz - .04), 0xe9d8b5); p(Co(.04, .06, cx + .14, .265, cz - .04, 4, Math.PI / 4), 0xb0573a); top = .33; } else top = .29;
      [[S[0], 0xd9a35e], [S[1], 0xe7c38a], [S[4], 0xd98a5e]].forEach(([[x, z], c]) => { p(Bx(.13, .09, .085, x, .015, z), c); p(Bx(.135, .01, .09, x, .105, z), 0xa8503a); for (let k = 0; k < 2; k++) lt(Bx(.02, .024, .002, x - .025 + k * .05, .055, z + .044), 0xffd27a); });
    } else if (era === 6) {
      const [fx, fz] = S[2];
      p(Bx(.24, .1, .14, fx, .015, fz), 0x9a4a32);
      for (let k = 0; k < 3; k++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.08, 0); s.lineTo(0, .05); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: false }); g.translate(fx - .12 + k * .08, .115, fz - .07); p(g, 0x5a4a44); }
      for (let k = 0; k < 4; k++) lt(Bx(.03, .03, .002, fx - .09 + k * .06, .045, fz + .071), 0xffd27a);
      p(Cy(.02, .028, .32, fx + .16, .015, fz - .04, 10), 0x6a3a2a); smoke.push([fx + .16, .335, fz - .04]);
      for (let i = 0; i < 2; i++) { const [x, z] = S[i]; p(Bx(.16, .08, .1, x, .015, z), 0x7a5a4a); p(Gb(.1, .045, .165, x, .095, z, Math.PI / 2), 0x4a4a4a); for (let k = 0; k < 3; k++) lt(Bx(.024, .024, .002, x - .05 + k * .05, .045, z + .051), 0xffd27a); }
      top = .34;
    } else {
      p(Cy(.11, .11, .006, S[5][0] * .9, .015, S[5][1] * .9, 14), 0x4f8a3c); p(Sp(.035, S[5][0] * .9, .06, S[5][1] * .9, 1.2), 0x2f7a34);
      const cols = [0x3e5a78, 0x8fa7bf, 0x5d7a99, 0x6f8fb0], n = 3 + (v === 2 ? 1 : 0); let hmax = 0;
      for (let i = 0; i < n; i++) {
        const [x, z] = S[i], w = .1 + rnd() * .04, h = .22 + rnd() * (i === 2 ? .45 : .28); hmax = Math.max(hmax, h);
        p(Bx(w, h, w, x, .015, z), cols[(i + v) % 4]); p(Bx(w * .9, .015, w * .9, x, .015 + h, z), 0x3a4a5a);
        for (let y = .05; y < h - .02; y += .045) if (rnd() > .25) lt(Bx(w + .004, .007, w + .004, x, .015 + y, z), rnd() > .3 ? 0xffe6a0 : 0xbfe4ff);
      }
      top = hmax + .03;
    }
    const geo = mergeParts(P2), light = L2.length ? mergeParts(L2) : null; geo.userData.shared = true; if (light) light.userData.shared = true;
    return (VG[key] = { geo, light, smoke, top });
  }
  const smokeMat = () => new THREE.MeshLambertMaterial({ color: 0x8a8a8a, transparent: true, depthWrite: false });
  function addSmoke(grp, pts, out) { for (const s of pts) for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(smokeGeo, smokeMat()); grp.add(m); out.push([m, s, k / 3]); } }
  function animSmoke(list, t) { for (const [m, [x, y, z], ph] of list) { const u = (t * .32 + ph) % 1; m.position.set(x + u * .06, y + u * .26, z - u * .02); m.scale.setScalar(.018 + u * .05); m.material.opacity = (1 - u) * .55; } }
  const towns = new Map(); // cc -> { grp (thủ đô), era, born, smoke, top, vil: [{ grp, smoke }] }
  function makeTown(era, hue, nSites) {
    const b = buildTown(era, hue), grp = new THREE.Group(), o = { grp, era, born: -1, smoke: [], top: b.top, vil: [] };
    grp.add(new THREE.Mesh(b.geo, townMat)); if (b.light) grp.add(new THREE.Mesh(b.light, townLight));
    addSmoke(grp, b.smoke, o.smoke); scene.add(grp);
    for (let i = 0; i < nSites; i++) {
      const vg = village(era, i % 3), g2 = new THREE.Group(), v = { grp: g2, smoke: [] };
      g2.add(new THREE.Mesh(vg.geo, townMat)); if (vg.light) g2.add(new THREE.Mesh(vg.light, townLight));
      if (i < 3) addSmoke(g2, vg.smoke, v.smoke); // khói chỉ ở vài làng cho nhẹ
      scene.add(g2); o.vil.push(v);
    }
    return o;
  }
  function killGrp(grp) { scene.remove(grp); grp.traverse(m => { if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); if (m.material && m.material !== townMat && m.material !== townLight) m.material.dispose(); }); }
  function killTown(o) { killGrp(o.grp); for (const v of o.vil) killGrp(v.grp); }
  const dying = [], qY = new THREE.Quaternion(), qUp = new THREE.Quaternion();
  const sy3 = new THREE.Vector3(), screenY = v => { sy3.copy(v).project(camera); return sy3.z > 1 ? -1 : (1 - sy3.y) / 2 * H; };
  const easeBack = k => k < 1 ? 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2) : 1;
  function place(grp, lon, lat, h, rotY) { // đặt một khối nhà trên mặt lãnh thổ (đã nổi lên h)
    const p = P(lon, lat, 1 + h);
    if (FLAT) { grp.position.set(p.x, h * HS, p.z); grp.rotation.set(0, rotY, 0); }
    else { grp.position.copy(p); qUp.setFromUnitVectors(UP, p.clone().normalize()); qY.setFromAxisAngle(UP, rotY); grp.quaternion.copy(qUp).multiply(qY); }
  }
  // list: [{ cc, lon, lat (thủ đô), era, px (đường kính thủ đô trên màn hình), hue, sites: [[lon, lat]...] (các làng), siteSize (đường kính làng, đơn vị bản đồ) }]
  // → trả về { cc: chiều cao thủ đô theo px } để vẽ cờ phía trên
  function setTowns(list, t) {
    const seen = new Set(), tops = {};
    for (const s of list) {
      seen.add(s.cc); let o = towns.get(s.cc); const sites = s.sites || [];
      if (o && (o.era !== s.era || o.vil.length !== sites.length)) { o.die = t; dying.push(o); o = null; } // lên thời đại: kiến trúc cũ thu lại, kiến trúc mới mọc lên
      if (!o) { o = makeTown(s.era, s.hue, sites.length); o.born = t; towns.set(s.cc, o); }
      const ext = built[s.cc], h = ext ? ext.h : 0;
      place(o.grp, s.lon, s.lat, h, -.45);
      o.grp.visible = screenY(o.grp.position) > 600; // nằm sát chân trời (sau bảng xếp hạng) thì ẩn
      const sc = s.px * camera.position.distanceTo(o.grp.position) / 3583;
      o.grp.scale.setScalar(Math.max(1e-5, sc * easeBack(Math.min(1, (t - o.born) / .9))));
      animSmoke(o.smoke, t);
      tops[s.cc] = s.px * (o.top * .72 + .3); // phần thủ đô nhô lên trên điểm đặt (gồm cả mép sau của nền, do camera nhìn chếch)
      // làng: kích thước theo lãnh thổ (không theo màn hình); quá nhỏ trên màn hình thì ẩn, quá to thì giới hạn
      sites.forEach(([lo, la], i) => {
        const v = o.vil[i]; place(v.grp, lo, la, h, i * 2.1 - .45);
        let k3 = s.siteSize * (FLAT ? .004 : .00628 * Math.cos(la * D2R));
        const px = k3 * 3583 / camera.position.distanceTo(v.grp.position);
        const vmax = s.vMax || 110; v.grp.visible = px > 15 && screenY(v.grp.position) > 600; if (px > vmax) k3 *= vmax / px;
        const k = Math.max(0, Math.min(1, (t - o.born - .25 - i * .07) / .8)); // mọc lan dần ra từ thủ đô
        v.grp.scale.setScalar(Math.max(1e-5, k3 * easeBack(k)));
        if (v.grp.visible) animSmoke(v.smoke, t);
      });
    }
    for (const [cc, o] of towns) if (!seen.has(cc)) { killTown(o); towns.delete(cc); }
    for (let i = dying.length - 1; i >= 0; i--) {
      const o = dying[i], k = (t - o.die) / .4; if (k >= 1) { killTown(o); dying.splice(i, 1); continue; }
      const f = Math.max(.01, 1 - k); o.grp.scale.multiplyScalar(f); for (const v of o.vil) v.grp.scale.multiplyScalar(f);
    }
    return tops;
  }

  // ---------- camera + khung hình
  const cpos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3(), hot = new THREE.Color(0xff3b3b);
  function frame(t, dt, lon, lat, z, final, zm = 1) { // zm: hệ số "Độ zoom" ở trang điều khiển (1 = như cũ)
    if (FLAT) {
      // nhìn chếch từ phía nam xuống bản đồ; càng vào gần càng nghiêng để thấy khối nổi và mặt biển
      const zg = Math.max(.95, Math.min(7.5 * zm, z * .95)), d = 12.5 / zg, k = Math.max(0, Math.min(1, (zg - 1) / 3)), pitch = (22 + 26 * k) * D2R;
      look.copy(P(lon, Math.max(-60, Math.min(78, lat))));
      cpos.set(look.x, Math.cos(pitch) * d, look.z + Math.sin(pitch) * d);
      camera.position.copy(cpos); camera.up.set(0, 1, 0); camera.lookAt(look);
      const u = water.material.uniforms; u.t.value = t; u.cam.value.copy(cpos);
      if (final) { u.sky.value.copy(skyC).lerp(hot, .25 + .2 * Math.sin(t * 7)); } else u.sky.value.copy(skyC);
    } else {
      z = Math.max(.9, Math.min(3.3 * zm, z * .6)); // độ phóng của bản đồ phẳng → khoảng cách camera
      const d = Math.sqrt(1 + Math.pow(7.46 / z, 2)), k = Math.max(0, Math.min(1, (z - 1) / 1.8)); // k: càng gần càng nghiêng để thấy khối nổi
      cpos.copy(P(lon, Math.max(-80, lat - 15 * k), d));
      look.copy(P(lon, lat)).multiplyScalar(k * .92);
      camera.position.copy(cpos); camera.up.set(0, 1, 0); camera.lookAt(look);
      atmoUni.c.value.copy(cool).lerp(hot, final ? .5 + .3 * Math.sin(t * 7) : 0);
    }
    stepFx(t, dt);
    renderer.render(scene, camera);
  }
  function project(lon, lat, r) { // → [x, y] trên khung 1080x1920, hoặc null nếu khuất / ở sau camera
    tmp.copy(P(lon, lat, r || 1.02));
    if (FLAT) { tmp.project(camera); if (tmp.z > 1 || tmp.z < -1) return null; }
    else { if (tmp.dot(camera.position) < 1.0) return null; tmp.project(camera); }
    return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H];
  }
  return { flat: FLAT, sync, frame, project, beam, wave, arc, setHalo, setTheme, setShips, setSun, setTowns };
}
