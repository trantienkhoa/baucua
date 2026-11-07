// Khói sàn (máy khói + phun CO2) và pháo sáng (vòi tia lửa lạnh) trên sân khấu.
import * as THREE from 'three';

function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  // vài đốm mờ chồng nhau cho ra cụm khói mềm
  for (let i = 0; i < 14; i++) {
    const x = 64 + (Math.random() - 0.5) * 50, y = 64 + (Math.random() - 0.5) * 50, r = 22 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sparkTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,230,160,0.9)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function createFX(scene, { floor, stageY, stageFrontZ }) {
  const smokeTex = smokeTexture();
  // ---------- khói nền: lớp khói thấp phủ sàn ----------
  const N_BASE = 70, N_JET = 160;
  const baseGeo = new THREE.PlaneGeometry(1, 1);
  const baseMat = new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.5, color: 0xb9a8ff, toneMapped: false, fog: false });
  const base = new THREE.InstancedMesh(baseGeo, baseMat, N_BASE); base.frustumCulled = false; base.renderOrder = 3;
  scene.add(base);
  const puffs = [];
  for (let i = 0; i < N_BASE; i++) puffs.push({ x: floor.x0 + Math.random() * (floor.x1 - floor.x0), z: floor.z0 + Math.random() * (floor.z1 - floor.z0), y: 0.15 + Math.random() * 0.7, s: 2.2 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 0.25, vz: (Math.random() - 0.5) * 0.15, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, ph: Math.random() * 6 });
  // ---------- phun khói CO2: cột khói trắng bắn lên ----------
  const jetMat = new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.7, color: 0xffffff, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  const jet = new THREE.InstancedMesh(baseGeo, jetMat, N_JET); jet.frustumCulled = false; jet.renderOrder = 4; jet.count = 0;
  jet.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N_JET * 3), 3);
  scene.add(jet);
  const jetP = [];
  const JETS = [[-7.5, stageFrontZ - 0.3], [-3.6, stageFrontZ - 0.3], [3.6, stageFrontZ - 0.3], [7.5, stageFrontZ - 0.3]];

  // ---------- pháo sáng: vòi tia lửa ----------
  const N_SP = 2400;
  const spPos = new Float32Array(N_SP * 3), spCol = new Float32Array(N_SP * 3);
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  const spMat = new THREE.PointsMaterial({ size: 0.2, map: sparkTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  const sparks = new THREE.Points(spGeo, spMat); sparks.frustumCulled = false; sparks.renderOrder = 6;
  scene.add(sparks);
  const sp = []; for (let i = 0; i < N_SP; i++) sp.push({ life: 0 });
  const FOUNTAINS = [-8.6, -5.2, -1.8, 1.8, 5.2, 8.6].map(x => ({ x, y: stageY + 0.02, z: stageFrontZ + 0.05, until: 0, rate: 0 }));
  const glow = FOUNTAINS.map(() => { const l = new THREE.PointLight(0xffb347, 0, 6, 2); scene.add(l); return l; });
  let spawnAcc = 0, spCursor = 0;

  const _e = new THREE.Euler(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
  const api = {
    enabled: { smoke: true, spark: true }, density: 0.55,
    /** phun khói: mạnh 0..1 */
    smokeBurst(power = 1) {
      if (!api.enabled.smoke) return;
      for (const [x, z] of JETS) for (let i = 0; i < Math.round(18 * power); i++) {
        if (jetP.length >= N_JET) jetP.shift();
        jetP.push({ x: x + (Math.random() - 0.5) * 0.2, y: stageY + 0.1, z: z + (Math.random() - 0.5) * 0.2, vx: (Math.random() - 0.5) * 0.6, vy: 5 + Math.random() * 3.5, vz: 0.6 + Math.random() * 0.8, s: 0.5, age: -i * 0.035, life: 2.6 + Math.random() * 1.2, rot: Math.random() * 6 });
      }
      api.boost = Math.min(1, (api.boost || 0) + 0.5 * power);   // khói nền dày lên một lúc
    },
    /** pháo sáng: bắn trong `sec` giây; which: 'all' | 'side' | 'center' */
    sparkle(sec = 4, which = 'all') {
      if (!api.enabled.spark) return;
      const now = performance.now() / 1000;
      FOUNTAINS.forEach((f, i) => { if (which === 'all' || (which === 'side' ? (i === 0 || i === 5) : (i === 2 || i === 3))) f.until = Math.max(f.until, now + sec); });
    },
    update(t, dt, mood) {
      // mood: { hue (0..1), kick (0..1), level (0..1) }
      // khói nền
      const dens = api.enabled.smoke ? api.density : 0;
      api.boost = Math.max(0, (api.boost || 0) - dt * 0.06);
      const showN = Math.round(N_BASE * Math.min(1, dens + (api.boost || 0) * 0.6));
      base.count = showN;
      _c.setHSL(mood.hue, 0.7, 0.62 + 0.15 * mood.kick); baseMat.color.copy(_c);
      baseMat.opacity = 0.18 + 0.32 * Math.min(1, dens + (api.boost || 0)) + 0.08 * mood.kick;
      for (let i = 0; i < showN; i++) {
        const p = puffs[i];
        p.x += p.vx * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
        if (p.x < floor.x0 - 1) p.x = floor.x1 + 0.5; if (p.x > floor.x1 + 1) p.x = floor.x0 - 0.5;
        if (p.z < floor.z0 - 1) p.z = floor.z1; if (p.z > floor.z1 + 0.5) p.z = floor.z0 - 0.5;
        const y = p.y + Math.sin(t * 0.4 + p.ph) * 0.12;
        _p.set(p.x, y, p.z); _q.setFromEuler(_e.set(-Math.PI / 2 + 0.35, 0, p.rot)); _s.setScalar(p.s * (1 + 0.06 * Math.sin(t * 0.7 + p.ph)));
        base.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      base.instanceMatrix.needsUpdate = true;
      // phun CO2
      let n = 0;
      for (let i = jetP.length - 1; i >= 0; i--) {
        const p = jetP[i]; p.age += dt;
        if (p.age > p.life) { jetP.splice(i, 1); continue; }
        if (p.age < 0) continue;
        p.vy *= Math.exp(-dt * 1.6); p.vx *= Math.exp(-dt * 0.8); p.vy -= dt * 0.2;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.s += dt * 1.3; p.rot += dt * 0.3;
        const k = p.age / p.life, a = Math.min(1, p.age / 0.15) * (1 - k);
        _p.set(p.x, p.y, p.z); _q.setFromAxisAngle(_s.set(0, 0, 1), p.rot); _s.setScalar(p.s);
        jet.setMatrixAt(n, _m.compose(_p, _q, _s));
        _c.setRGB(a, a, a * 1.02); jet.setColorAt(n, _c);   // độ mờ dần qua màu (vật liệu cộng sáng nhẹ)
        n++;
      }
      jet.count = n; jet.instanceMatrix.needsUpdate = true; if (jet.instanceColor) jet.instanceColor.needsUpdate = true;
      // pháo sáng
      const now = performance.now() / 1000;
      FOUNTAINS.forEach((f, j) => {
        const on = now < f.until;
        glow[j].intensity += ((on ? 6 + 4 * Math.random() : 0) - glow[j].intensity) * Math.min(1, dt * 12);
        glow[j].position.set(f.x, f.y + 1.2, f.z + 0.3);
        if (!on) return;
        let k = 420 * dt * (0.8 + 0.6 * mood.kick); spawnAcc += k;
        while (spawnAcc >= 1) {
          spawnAcc--;
          const q = sp[spCursor]; spCursor = (spCursor + 1) % N_SP;
          const ang = Math.random() * Math.PI * 2, spread = 0.35 + Math.random() * 0.5;
          q.x = f.x; q.y = f.y; q.z = f.z; q.vx = Math.cos(ang) * spread; q.vz = Math.sin(ang) * spread * 0.6;
          q.vy = 6.5 + Math.random() * 3; q.life = 0.9 + Math.random() * 0.9; q.age = 0;
        }
      });
      let alive = 0;
      for (let i = 0; i < N_SP; i++) {
        const q = sp[i];
        if (q.life > 0) {
          q.age += dt; if (q.age > q.life) q.life = 0;
          else {
            q.vy -= 9.8 * dt * 0.75; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
            const k = 1 - q.age / q.life, fl = 0.75 + 0.25 * Math.random();
            spPos[i * 3] = q.x; spPos[i * 3 + 1] = q.y; spPos[i * 3 + 2] = q.z;
            spCol[i * 3] = 1 * k * fl; spCol[i * 3 + 1] = (0.78 * k + 0.1) * k * fl; spCol[i * 3 + 2] = 0.35 * k * k * fl;
            alive++; continue;
          }
        }
        spPos[i * 3 + 1] = -100; spCol[i * 3] = spCol[i * 3 + 1] = spCol[i * 3 + 2] = 0;
      }
      sparks.visible = alive > 0;
      if (alive) { spGeo.attributes.position.needsUpdate = true; spGeo.attributes.color.needsUpdate = true; }
    },
    setQuality(q) { const off = q === 'low'; base.visible = !off; jet.visible = !off; },
  };
  return api;
}
