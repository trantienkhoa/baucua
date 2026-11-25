import { THREE } from './three.js';
import { World, DISTRICTS, TEAMS, MOODS, mixMood, RIVER, LINKS } from './world.js';
import { TIERS, tierOf, buildVehicle, updateDragon, buildNPC, buildGoon, buildBoss, buildCrate, buildStatue, FX, Particles } from './vehicles.js';
import { Audio, Voice } from './audio.js';
import { CAST, line, portrait } from './cast.js';
import { R, clamp, lerp, ease, esc, initials, fmt } from './util.js';

// ---------- cài đặt qua đường dẫn ----------
const Q = new URLSearchParams(location.search);
const num = (k, d) => (Q.has(k) && !isNaN(+Q.get(k)) ? +Q.get(k) : d);
const CFG = {
  obs: Q.has('obs'), fill: Q.has('fill'), low: Q.get('fx') === 'low', test: Q.has('test'),
  round: num('round', 120), cap: num('cap', 300), goal: num('boss', 2000), bossHp: num('bosshp', 1500), max: num('max', 45),
  tts: Q.get('tts') !== '0', music: Q.get('music') !== '0', demo: Q.get('demo'),
};
const $ = id => document.getElementById(id);
document.body.classList.toggle('obs', CFG.obs);
const V3 = THREE.Vector3;

// ---------- máy chủ game (TikTok) hoặc chạy thử ----------
let socket = null;
if (window.io && !window.__noServer) {
  try {
    socket = window.io();
    socket.on('connect', () => socket.emit('hello', 'city', { obs: CFG.obs }));
    socket.on('ev', ev => { try { handleEv(ev); } catch (e) { console.error(e); } });
  } catch (e) { socket = null; }
}
const DEMO = CFG.demo === '1' || (!socket && CFG.demo !== '0');
if (DEMO && !Q.has('round')) CFG.round = 75;
if (DEMO && !Q.has('boss')) CFG.goal = 700;
if (DEMO && !Q.has('bosshp')) CFG.bossHp = 900;

// ---------- dựng cảnh ----------
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: !CFG.low, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.low ? 1 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 9 / 16, 1, 9000);
let SW = 540, SH = 960;
function fit() {
  const G = window.__GUTTER || 0, W = (document.body.clientWidth || window.innerWidth) - 2 * G, H = document.body.clientHeight || window.innerHeight; let w, h;
  if (CFG.fill) { w = W; h = H; } else { h = H; w = h * 9 / 16; if (w > W) { w = W; h = w * 16 / 9; } }
  SW = Math.round(w); SH = Math.round(h);
  stage.style.width = SW + 'px'; stage.style.height = SH + 'px'; stage.style.setProperty('--u', (SH / 100) + 'px');
  renderer.setSize(SW, SH, false); camera.aspect = SW / SH; camera.setViewOffset(SW, SH, 0, -SH * 0.13, SW, SH); camera.updateProjectionMatrix();
  Particles.scale.value = SH * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
}
window.addEventListener('resize', fit); fit();

const world = new World(scene, { low: CFG.low });
const fx = new FX(scene);
const audio = new Audio(); audio.musicOn = CFG.music;
const voice = new Voice(); voice.enabled = CFG.tts;
if (socket) voice.relay = (text, prio) => socket.emit('say', { text, prio: !!prio, auto: true });
let boomAt = 0; fx.onBoom = () => { if (now - boomAt > 0.25) { boomAt = now; audio.play('boom'); } };

// ---------- trạng thái ván ----------
let now = 0;
let cur = 0;                     // khu đang ở
let tug = 0;                     // <0 nghiêng Rồng Đỏ, >0 nghiêng Hổ Xanh
let timer = CFG.round;
let phase = 'intro';             // intro | play | captured | season | travel
let phaseT = 0;
let seasonRound = 0, season = 1;
const owners = DISTRICTS.map(() => -1);
const players = new Map();
let likesTotal = 0, goalNow = 0;
let boss = null, king = null, statue = null;
let busyUntil = 0; const bigQ = [];
const goons = [], crates = [], choppers = [];
const curD = () => world.districts[cur];
const ROUTE = ['neon', 'cholon', 'phoco', 'chonoi', 'bien', 'halong', 'cang', 'caurong', 'deo', 'sanbay'].map(k => DISTRICTS.findIndex(d => d.key === k)).filter(i => i >= 0);
const nextDistrict = () => ROUTE[(ROUTE.indexOf(cur) + 1) % ROUTE.length];
const teamCol = t => TEAMS[t].glow;
const starsOf = c => (c >= 2000 ? 5 : c >= 500 ? 4 : c >= 100 ? 3 : c >= 30 ? 2 : c >= 1 ? 1 : 0);

// ---------- người chơi ----------
function teamCount() { const n = [0, 0]; for (const P of players.values()) n[P.team]++; return n; }
function ensurePlayer(u, spawn = true) {
  if (!u || !u.id) return null;
  let P = players.get(u.id);
  if (!P) {
    const n = teamCount();
    P = { id: u.id, name: String(u.name || 'Ẩn danh').slice(0, 24), avatar: u.avatar || '', team: n[0] <= n[1] ? 0 : 1, coins: 0, tier: 0, veh: null, loop: null, s: 0, lane: 4, spd: 1, yaw: 0, boost: 0, drift: 0, ang: R() * 6.28, r: 120, h: 0, last: now, chatAt: -99, nitroAt: -99, hot: 0, dmg: 0 };
    players.set(u.id, P);
    if (spawn) feed(`<b>${esc(P.name)}</b> vào phe ${TEAMS[P.team].emoji}`, P);
  } else { if (u.name) P.name = String(u.name).slice(0, 24); if (u.avatar) P.avatar = u.avatar; }
  P.last = now;
  if (spawn && !P.veh) spawnVehicle(P);
  return P;
}
function vehicleCount() { let n = 0; for (const P of players.values()) if (P.veh) n++; return n; }
function spawnVehicle(P, keep) {
  if (!keep && vehicleCount() >= CFG.max) {   // nhường chỗ: cất xe của người lâu không tương tác, chưa tặng quà
    let worst = null;
    for (const Q2 of players.values()) if (Q2.veh && Q2 !== P && Q2.hot <= now && Q2 !== king && (!worst || (Q2.coins * 1000 + Q2.last) < (worst.coins * 1000 + worst.last))) worst = Q2;
    if (!worst) return; removeVehicle(worst);
  }
  const old = P.veh;
  const tint = new THREE.Color(TEAMS[P.team].color).offsetHSL(R.range(-0.02, 0.02), 0, R.range(-0.12, 0.06)).getHex();
  P.veh = buildVehicle(P.tier, tint, teamCol(P.team));
  scene.add(P.veh);
  const D = curD();
  if (old) { scene.remove(old); }
  else { P.loop = R.pick(D.loops); P.s = R() * P.loop.total; }
  if (!P.loop || !D.loops.includes(P.loop)) { P.loop = R.pick(D.loops); P.s = R() * P.loop.total; }
  P.lane = R.pick([2.5, 5, 7.5]);
  P.spd = R.range(0.85, 1.1); P.r = D.air.r * R.range(0.55, 1.15); P.h = R.range(-10, 25);
  placeVehicle(P, 0);
  if (!old) { fx.burst(P.veh.position.clone().add(new V3(0, 3, 0)), teamCol(P.team), 30, 14, 3, 0.6); audio.play('pop'); }
}
function removeVehicle(P) { if (P.veh) { scene.remove(P.veh); P.veh = null; } }
function setTeam(P, t) {
  if (P.team === t) return;
  P.team = t; if (P.veh) spawnVehicle(P, true);
  feed(`<b>${esc(P.name)}</b> chuyển sang ${TEAMS[t].emoji} ${TEAMS[t].name}`, P);
}

const _a = {};
function angDamp(a, b, k, dt) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-k * dt)); }
function placeVehicle(P, dt) {
  const v = P.veh, T = TIERS[P.tier], D = curD(), body = v.userData.body;
  const boost = P.boost > now ? 1.9 : 1;
  if (T.air) {
    P.ang += T.speed * P.spd * boost * dt;
    let x, z, y, dx, dz;
    if (P.tier === 6) { const a = P.ang * 0.7, r = P.r * 1.2; x = D.center.x + Math.cos(a) * r; z = D.center.z + Math.sin(2 * a) * r * 0.55; y = D.air.y + 25 + Math.sin(a * 3) * 14; dx = -Math.sin(a); dz = Math.cos(2 * a) * 1.1; }
    else { x = D.center.x + Math.cos(P.ang) * P.r; z = D.center.z + Math.sin(P.ang) * P.r; y = D.air.y + P.h + Math.sin(now * 0.8 + P.r) * 3; dx = -Math.sin(P.ang); dz = Math.cos(P.ang); }
    v.position.set(x, y, z);
    const yaw = Math.atan2(dx, dz); P.yaw = dt ? angDamp(P.yaw, yaw, 6, dt) : yaw; v.rotation.y = P.yaw;
    if (P.tier === 5) { body.rotation.x = 0.12 * boost; v.userData.rotor.rotation.y += dt * 30; v.userData.tailRotor.rotation.x += dt * 40; }
    if (P.drift > now) body.rotation.z += dt * 9; else body.rotation.z *= 0.9;
    if (P.tier === 6) { v.updateMatrixWorld(true); updateDragon(v, dt); }
  } else {
    if (P.drift > now) {   // drift xoay vòng tại chỗ
      v.rotation.y += dt * 7; body.rotation.z = 0.25;
      if (R() < 0.7) fx.smokePuff(v.position.clone().add(new V3(R.range(-2, 2), 1, R.range(-2, 2))), 0xeeeeee, 1, 10);
      return;
    }
    const sp = T.speed * P.spd * boost * (P.chased > now ? 1.35 : 1);
    P.s += sp * dt;
    const a = P.loop.at(P.s, P.lane, _a);
    v.position.set(a.x, 0, a.z);
    const prev = P.yaw; P.yaw = dt ? angDamp(P.yaw, a.yaw, 9, dt) : a.yaw; v.rotation.y = P.yaw;
    if (dt) {
      let d = ((P.yaw - prev + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      if (P.tier <= 2) body.rotation.z = lerp(body.rotation.z, clamp(-d / dt * 0.18, -0.45, 0.45), 0.2);
      body.position.y = Math.abs(Math.sin(now * 9 + P.s)) * 0.12;
      for (const w of v.userData.wheels) w.rotation.y += sp * dt / 0.9;
    }
    if (P.boost > now && v.userData.exhaust && R() < 0.8) {
      const e = v.userData.exhaust.clone().applyAxisAngle(new V3(0, 1, 0), P.yaw).add(v.position);
      fx.flame(e, new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)));
    } else if (P.boost > now && R() < 0.6) {
      fx.flame(v.position.clone().add(new V3(-Math.sin(P.yaw) * 3, 1.2, -Math.cos(P.yaw) * 3)), new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)));
    }
  }
}

// ---------- xe chạy rông ----------
const npcs = [];
for (const k of ['bike', 'bike', 'bike', 'bike', 'bike', 'bike', 'bike', 'bike', 'car', 'car', 'car', 'car', 'taxi', 'taxi', 'cyclo', 'cyclo', 'cyclo', 'bike'].slice(0, CFG.low ? 10 : 18)) {
  const veh = buildNPC(k); scene.add(veh); npcs.push({ veh, kind: k, loop: null, s: 0, lane: 4, spd: 1, yaw: 0 });
}
function resetTraffic() {
  const D = curD();
  for (const n of npcs) {
    const show = n.kind !== 'cyclo' || ['cholon', 'neon', 'phoco'].includes(D.def.key);
    n.veh.visible = show;
    n.loop = R.pick(D.loops); n.s = R() * n.loop.total; n.lane = R.pick([2, 4.5, 7]); n.spd = (n.kind === 'cyclo' ? 7 : n.kind === 'bike' ? 18 : 22) * R.range(0.8, 1.15);
    n.yaw = n.loop.at(n.s, n.lane, _a).yaw;
  }
}
function updateTraffic(dt) {
  for (const n of npcs) {
    if (!n.veh.visible) continue;
    n.s += n.spd * dt; const a = n.loop.at(n.s, n.lane, _a);
    n.veh.position.set(a.x, 0, a.z); n.yaw = angDamp(n.yaw, a.yaw, 9, dt); n.veh.rotation.y = n.yaw;
    for (const w of n.veh.userData.wheels) w.rotation.y += n.spd * dt;
  }
}

// ---------- cộng điểm phe ----------
function addPower(team, amt) {
  if (phase !== 'play' && phase !== 'intro') return;
  tug = clamp(tug + (team === 1 ? amt : -amt), -CFG.cap, CFG.cap);
}

// ---------- sự kiện TikTok ----------
function handleEv(ev) {
  if (!ev || !ev.user) return;
  switch (ev.type) {
    case 'chat': onChat(ev.user, String(ev.text || '')); break;
    case 'gift': { const g = ev.gift || {}; const count = Math.max(1, +ev.count || 1); onGift(ev.user, g, count, +ev.value || (+g.diamonds || 1) * count, +ev.total || 0); break; }
    case 'like': onLike(ev.user, Math.max(1, +ev.count || 1)); break;
    case 'follow': onFollow(ev.user); break;
    case 'share': onShare(ev.user); break;
    case 'member': if (R() < 0.35) ticker(`${ev.user.name} vừa vào phòng LIVE`); break;
  }
}
const flat = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
function onChat(u, text) {
  const P = ensurePlayer(u); if (!P) return;
  const t = flat(text), raw = text.trim().toLowerCase();
  for (const T of TEAMS) if (T.key.some(k => t === flat(k) || raw === k || t === 'phe ' + flat(k) || t === 'doi ' + flat(k))) { setTeam(P, T.id); break; }
  if (/(^|\s)(coi|bip|bop coi|tin tin)(\s|$)/.test(t)) { audio.play('honk'); bubble(P, 'BÍP BÍP! 📢'); }
  if (/(^|\s)(nitro|len ga|ga|tang toc)(\s|$)/.test(t) && now - P.nitroAt > 15) { P.nitroAt = now; P.boost = now + 2.5; }
  if (now - P.chatAt > 8) { P.chatAt = now; addPower(P.team, 0.6); }
  if (boss) hitBoss(P, 3);
}
function onLike(u, n) {
  const P = ensurePlayer(u); if (!P) return;
  likesTotal += n; addPower(P.team, n * 0.05);
  if (P.veh && R() < 0.6) for (let i = 0; i < Math.min(3, n); i++) fx.spark.emit(P.veh.position.x, P.veh.position.y + 8, P.veh.position.z, R.range(-3, 3), R.range(6, 12), R.range(-3, 3), 0xff4f9a, 5, 1.2, 0);
  if (boss) hitBoss(P, n);
  else { goalNow += n; if (goalNow >= CFG.goal && (phase === 'play')) { goalNow = 0; startBoss(); } }
}
function onFollow(u) {
  const P = ensurePlayer(u); if (!P) return;
  addPower(P.team, 5); feed(`<b>${esc(P.name)}</b> đã follow ❤️`, P);
  if (P.veh) fx.firework(P.veh.position.x, P.veh.position.z, teamCol(P.team), 40);
  ticker(`${P.name} vừa follow kênh — chào mừng gia nhập ${TEAMS[P.team].name}!`);
}
function onShare(u) {
  const P = ensurePlayer(u); if (!P) return;
  addPower(P.team, 5); feed(`<b>${esc(P.name)}</b> chia sẻ LIVE ↗`, P);
  P.boost = now + 3;
}
function onGift(u, gift, count, value, total) {
  const P = ensurePlayer(u); if (!P) return;
  const oldTier = P.tier;
  P.coins = Math.max(P.coins + value, total || 0);
  P.tier = tierOf(P.coins); P.hot = now + 20;
  addPower(P.team, value);
  if (boss) hitBoss(P, value * 3);
  const gname = gift.name || 'quà';
  feed(`<b>${esc(P.name)}</b> tặng ${gift.img ? `<img class="g" src="${esc(gift.img)}" alt="">` : '🎁'} ${esc(gname)} x${count}`, P, value >= 99);
  P.boost = now + 3 + Math.min(5, value / 20);
  audio.play(value >= 30 ? 'cash' : 'coin'); if (value >= 5) audio.play('nitro');
  if (value >= 10 || R() < 0.5) voice.say(`Cảm ơn ${P.name} tặng ${count} ${gname}`);
  if (P.tier !== oldTier) {
    if (P.veh) spawnVehicle(P, true); else spawnVehicle(P);
    audio.play('level');
    const T = TIERS[P.tier];
    say(line('upgrade', { name: P.name, veh: T.icon + ' ' + T.name }));
    ticker(`${P.name} lên đời ${T.icon} ${T.name}!`);
    if (P.veh) fx.burst(P.veh.position.clone().add(new V3(0, 4, 0)), 0xffd23a, 60, 18, 4, 0.9);
  }
  // sự kiện theo giá trị một lần tặng
  let kind = null;
  if (value >= 5000) kind = 'king'; else if (value >= 1000) kind = 'capture'; else if (value >= 500) kind = 'money';
  else if (value >= 299) kind = 'airdrop'; else if (value >= 99) kind = 'chase'; else if (value >= 30) kind = 'drift';
  if (value >= 30 && curD().mouth) breathe(P);
  if (kind) { bigQ.push({ kind, P, value }); if (bigQ.length > 8) { bigQ.sort((a, b) => b.value - a.value); bigQ.length = 8; } }
  renderLeaderSoon();
}

// ---------- sự kiện lớn ----------
function runBig() {
  if (!bigQ.length || now < busyUntil || phase !== 'play') return;
  const e = bigQ.shift(), P = e.P;
  if (!P.veh) spawnVehicle(P);
  if (!P.veh) return;
  const D = curD();
  if (e.kind === 'drift') {
    P.drift = now + 3.2; busyUntil = now + 3.5; audio.play('drift');
    focus({ type: 'side', P, dist: 20 }, 3.8, 1);
    bubble(P, 'ĐÁNH LÁI GẮT! 🔥');
  } else if (e.kind === 'chase') {
    busyUntil = now + 12; P.chased = now + 12; P.boost = now + 12;
    for (let k = 0; k < 3; k++) {
      const g = P.tier >= 5 ? buildVehicle(5, 0x111111, 0xff2020) : buildGoon();
      scene.add(g); goons.push({ veh: g, P, k, until: now + 11, yaw: P.yaw, ang: P.ang - 0.12 * (k + 1), s: P.s - 16 * (k + 1), lane: [3.5, 8, 5.5][k] });
    }
    banner('TRUY NÃ ⭐⭐⭐', `Hắc Long treo thưởng ${P.name}!`, '#ff3030');
    say(line('chase', { name: P.name }), true); audio.play('alarm');
    focus({ type: 'chase', P, dist: 34, h: 13 }, 11, 2);
    fx.after(11.2, () => {
      for (const g of goons.splice(0)) { fx.explosion(g.veh.position.clone().add(new V3(0, 2, 0)), 0.6); scene.remove(g.veh); }
      audio.play('explode'); addPower(P.team, 40);
      say(line('escaped', { name: P.name })); ticker(`${P.name} cắt đuôi đàn em Hắc Long ở ${D.def.name}!`);
    });
  } else if (e.kind === 'airdrop') {
    busyUntil = now + 9;
    const heli = buildVehicle(5, teamCol(P.team), teamCol(P.team)); scene.add(heli);
    const tgt = P.veh.position.clone(); const from = tgt.clone().add(new V3(-260, 70, -120)), to = tgt.clone().add(new V3(260, 80, 120));
    choppers.push({ veh: heli, from, to, t: 0, dur: 6, dropped: false, tgt, team: P.team, P });
    audio.play('chopper');
    banner('THẢ HÀNG!', `Trực thăng tiếp tế cho ${TEAMS[P.team].name} — quà của ${P.name}`, TEAMS[P.team].color);
    say(line('airdrop', { name: P.name, team: TEAMS[P.team].name }), true);
    focus({ type: 'track', obj: heli, back: 60, h: 25 }, 3.2, 2);
    fx.after(3.2, () => focus({ type: 'orbit', at: tgt.clone(), r: 70, h: 40, speed: 0.4 }, 5.5, 2));
  } else if (e.kind === 'money') {
    busyUntil = now + 7;
    fx.cash.drop(P.veh.position.x, P.veh.position.z, 110, 240, 110);
    banner('MƯA TIỀN!', `Đại gia ${P.name} rải tiền khắp ${D.def.name}`, '#3ae08a');
    say(line('money', { name: P.name }), true);
    for (let i = 0; i < 6; i++) fx.after(i * 0.6, () => audio.play('cash'));
    focus({ type: 'orbit', at: P.veh.position.clone(), r: 60, h: 18, speed: 0.35, follow: P }, 7, 2);
    addPower(P.team, 60);
    ticker(`${P.name} vừa rải tiền ở ${D.def.name}. Má Tư cũng phải nể!`);
  } else if (e.kind === 'capture') {
    busyUntil = now + 6;
    D.board && D.board.set('ĐẠI GIA', P.name, '#ffd23a');
    world.districts[0].board.set('ĐẠI GIA', P.name, '#ffd23a');
    for (let i = 0; i < 8; i++) fx.after(i * 0.35, () => fx.firework(D.landmark.x + R.range(-90, 90), D.landmark.z + R.range(-90, 90), teamCol(P.team)));
    focus({ type: 'orbit', at: D.landmark.clone().setY(40), r: 180, h: 90, speed: 0.25 }, 6, 2);
    ticker(`${P.name} mua đứt ${D.def.name} cho ${TEAMS[P.team].name}!`);
    addPower(P.team, CFG.cap * 2);
  } else if (e.kind === 'king') {
    busyUntil = now + 13;
    crownKing(P);
  }
}
function crownKing(P) {
  const D = curD();
  king = P;
  if (statue) scene.remove(statue.obj);
  const obj = buildStatue(); obj.position.copy(D.plaza); obj.scale.setScalar(0.01); scene.add(obj);
  statue = { obj, P, d: cur, born: now };
  banner('TRÙM XỨ RỒNG', `${P.name} thống trị cả thành phố!`, '#ffd23a');
  say(line('king', { name: P.name }), true); audio.play('roar'); audio.duck(4);
  for (const Dd of world.districts) if (Dd.board) Dd.board.set('TRÙM XỨ RỒNG', P.name, '#ffd23a');
  for (let i = 0; i < 16; i++) fx.after(0.5 + i * 0.4, () => fx.firework(D.plaza.x + R.range(-120, 120), D.plaza.z + R.range(-120, 120), R.pick([0xffd23a, 0xff2e88, 0x22e0ff, 0xffffff])));
  focus({ type: 'orbit', at: D.plaza.clone().setY(16), r: 45, h: 14, speed: 0.3 }, 6, 3);
  fx.after(6, () => { if (P.veh) focus({ type: 'track', obj: P.veh, back: 50, h: 22 }, 6, 3); });
  addPower(P.team, CFG.cap * 2);
  ticker(`CHẤN ĐỘNG: ${P.name} là TRÙM XỨ RỒNG! Tượng vàng đã dựng ở ${D.def.name}.`);
}
// ---------- Cầu Rồng phun lửa ----------
let fireAt = 25, fireCool = 0, firePending = 0;
function breathe(P) {
  const D = curD(); if (!D.mouth || phase !== 'play') return;
  if (now < fireCool) {   // đang phun: quà xếp hàng phun tiếp, lượt tự phun thì bỏ
    if (P && firePending < 2) { firePending++; fx.after(fireCool - now + 0.15, () => { firePending--; breathe(P); }); }
    return;
  }
  fireCool = now + 2.6; fireAt = now + 24;
  const m = D.mouth, d = D.mouthDir;
  for (let i = 0; i < 50; i++) fx.after(i * 0.045, () => {
    for (let k = 0; k < 4; k++) { const sp = 45 + R() * 30; fx.spark.emit(m.x, m.y, m.z, d.x * sp + R.range(-6, 6), d.y * sp + R.range(-4, 8), d.z * sp + R.range(-8, 8), R.pick([0xff5a1a, 0xffa020, 0xffe060, 0xff3010]), R.range(7, 13), R.range(0.7, 1.1), 6); }
    if (i % 3 === 0) fx.smokePuff(m.clone().addScaledVector(d, 40), 0x555555, 1, 14);
  });
  fx.flash(m.clone().addScaledVector(d, 10), 0xffa030, 60);
  audio.play('roar'); audio.play('nitro');
  if (P) { banner('RỒNG PHUN LỬA!', `${P.name} đánh thức Cầu Rồng`, '#ff8a2a'); ticker(`${P.name} làm Cầu Rồng phun lửa!`); addPower(P.team, 10); }
  focus({ type: 'orbit', at: m.clone().addScaledVector(d, 18), r: 70, h: 12, speed: 0.25 }, 4.5, P ? 2 : 0);
}
function updateEvents(dt) {
  if (curD().mouth && phase === 'play' && now > fireAt) { fireAt = now + 24; breathe(); }
  for (const g of goons) {
    const P = g.P;
    if (!P.veh) continue;
    if (P.tier >= 5) {
      const v = P.veh.position; const back = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
      const tgt = v.clone().addScaledVector(back, 22 * (g.k + 1)).add(new V3((g.k - 1) * 12, -4, 0));
      g.veh.position.lerp(tgt, 1 - Math.exp(-3 * dt)); g.veh.rotation.y = P.yaw; g.veh.userData.rotor.rotation.y += dt * 30;
    } else {
      const lag = 14 * (g.k + 1) - Math.min(6, (now - (g.until - 11)) * 0.8);
      g.s = lerp(g.s, P.s - lag, 1 - Math.exp(-2 * dt));
      const a = P.loop.at(g.s, g.lane, _a); g.veh.position.set(a.x, 0, a.z); g.yaw = angDamp(g.yaw, a.yaw, 8, dt); g.veh.rotation.y = g.yaw;
      for (const w of g.veh.userData.wheels) w.rotation.y += 40 * dt;
      if (R() < 0.15) fx.smokePuff(g.veh.position.clone().add(new V3(0, 1, 0)), 0x777777, 1, 6);
    }
  }
  for (let i = choppers.length - 1; i >= 0; i--) {
    const c = choppers[i]; c.t += dt; const k = c.t / c.dur;
    c.veh.position.lerpVectors(c.from, c.to, k); c.veh.rotation.y = Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z);
    c.veh.userData.body.rotation.x = 0.2; c.veh.userData.rotor.rotation.y += dt * 30;
    if (!c.dropped && k > 0.45) {
      c.dropped = true;
      for (let j = 0; j < 3; j++) { const cr = buildCrate(teamCol(c.team)); cr.position.copy(c.veh.position).add(new V3(R.range(-6, 6), -6, R.range(-6, 6))); scene.add(cr); crates.push({ obj: cr, tx: c.tgt.x + R.range(-35, 35), tz: c.tgt.z + R.range(-35, 35), landed: 0, team: c.team }); }
    }
    if (k >= 1) { scene.remove(c.veh); choppers.splice(i, 1); }
  }
  for (let i = crates.length - 1; i >= 0; i--) {
    const c = crates[i], o = c.obj;
    if (!c.landed) {
      o.position.x = lerp(o.position.x, c.tx, dt * 0.6); o.position.z = lerp(o.position.z, c.tz, dt * 0.6);
      o.position.y = Math.max(0, o.position.y - dt * 12); o.rotation.y += dt * 0.5; o.userData.chute.rotation.z = Math.sin(now * 2 + i) * 0.1;
      if (o.position.y <= 0) { c.landed = now; o.userData.chute.visible = false; fx.coins(o.position.clone().add(new V3(0, 3, 0)), 50); fx.burst(o.position.clone().add(new V3(0, 3, 0)), teamCol(c.team), 50, 20, 4, 0.9); audio.play('coin'); addPower(c.team, 15); }
    } else if (now - c.landed > 2.5) { scene.remove(o); crates.splice(i, 1); }
  }
  if (statue) { const s = statue.obj.scale.x; if (s < 1) statue.obj.scale.setScalar(Math.min(1, s + dt * 0.8)); statue.obj.rotation.y += dt * 0.2; }
}
function clearEvents() {
  for (const g of goons.splice(0)) scene.remove(g.veh);
  for (const c of choppers.splice(0)) scene.remove(c.veh);
  for (const c of crates.splice(0)) scene.remove(c.obj);
  for (const P of players.values()) { P.drift = 0; P.chased = 0; }
  cam.focus = null; busyUntil = 0;
}

// ---------- boss Hắc Long ----------
function startBoss() {
  if (boss || phase !== 'play') return;
  const D = curD(), loop = D.loops.reduce((a, b) => (b.total > a.total ? b : a)), veh = buildBoss();
  scene.add(veh);
  const hp = Math.max(CFG.bossHp, CFG.bossHp * 0.6 + players.size * 30);
  boss = { veh, loop, s: R() * loop.total, yaw: 0, hp, max: hp, t: 75, dmg: new Map(), taunt: now + 14, hitAt: 0 };
  $('boss').classList.add('on');
  banner('BOSS XUẤT HIỆN', `Đại ca Hắc Long đang càn quét ${D.def.name}`, '#ffc23a');
  say(line('bossIn'), true); audio.play('alarm'); audio.setSong('boss');
  ticker(`Khẩn cấp! Hắc Long xuất hiện ở ${D.def.name}. Thả tim để hạ hắn!`);
  focus({ type: 'track', obj: veh, back: 46, h: 20 }, 5, 3);
}
function hitBoss(P, dmg) {
  if (!boss || boss.hp <= 0) return;
  boss.hp -= dmg; boss.dmg.set(P.id, (boss.dmg.get(P.id) || 0) + dmg);
  const p = boss.veh.position;
  fx.spark.emit(p.x + R.range(-5, 5), 8 + R.range(0, 6), p.z + R.range(-5, 5), R.range(-14, 14), R.range(4, 16), R.range(-14, 14), dmg > 50 ? 0xffd23a : 0xff5a3a, dmg > 50 ? 8 : 4, 0.6, -20);
  if (now - boss.hitAt > 0.12) { boss.hitAt = now; audio.play('hit'); }
  if (dmg >= 90) fx.explosion(p.clone().add(new V3(0, 8, 0)), 0.5);
  if (boss.hp <= 0) bossDown();
}
function bossDown() {
  const p = boss.veh.position.clone();
  let mvp = null, best = 0; for (const [id, d] of boss.dmg) if (d > best) { best = d; mvp = players.get(id); }
  fx.explosion(p.clone().add(new V3(0, 6, 0)), 2); audio.play('explode'); audio.play('win');
  fx.cash.drop(p.x, p.z, 60, 160, 40);
  for (let i = 0; i < 6; i++) fx.after(0.3 + i * 0.3, () => fx.firework(p.x + R.range(-60, 60), p.z + R.range(-60, 60), 0xffd23a));
  banner('HẠ GỤC HẮC LONG!', mvp ? `MVP: ${mvp.name} (${fmt(best)} sát thương)` : 'Cả phòng cùng ra tay!', '#ffd23a');
  say(line('bossDown'), true);
  if (mvp) { addPower(mvp.team, CFG.cap * 0.6); ticker(`${mvp.name} ra đòn quyết định hạ gục Hắc Long!`); voice.say(`${mvp.name} là người hạ gục Hắc Long`); }
  focus({ type: 'orbit', at: p.clone().setY(8), r: 60, h: 30, speed: 0.3 }, 5, 3);
  const b = boss; fx.after(1.2, () => scene.remove(b.veh));
  endBoss();
}
function endBoss() { boss = null; $('boss').classList.remove('on'); audio.setSong(curD().def.key); }
function updateBoss(dt) {
  if (!boss) return;
  boss.t -= dt;
  boss.s += 16 * dt; const a = boss.loop.at(boss.s, 6, _a);
  boss.veh.position.set(a.x, 0, a.z); boss.yaw = angDamp(boss.yaw, a.yaw, 6, dt); boss.veh.rotation.y = boss.yaw;
  for (const w of boss.veh.userData.wheels) w.rotation.y += 16 * dt / 1.8;
  if (now > boss.taunt) { boss.taunt = now + 16; say(line('bossIn')); }
  if (boss.t <= 0) {
    banner('HẮC LONG THOÁT!', 'Lần sau thả tim nhanh hơn nha!', '#ff3030'); say(line('bossEscape'), true);
    const v = boss.veh; fx.smokePuff(v.position.clone().add(new V3(0, 3, 0)), 0x333333, 20, 20); fx.after(0.5, () => scene.remove(v));
    endBoss();
  }
}

// ---------- vòng chơi: chiếm khu → bay sang khu mới ----------
function capture(team) {
  if (phase !== 'play') return;
  phase = 'captured'; phaseT = 0;
  const D = curD();
  owners[cur] = team; world.setOwner(cur, team);
  if (team >= 0) {
    banner(`${TEAMS[team].name} CHIẾM KHU!`, `${D.def.icon} ${D.def.name} đã cắm cờ ${team ? 'xanh' : 'đỏ'}`, TEAMS[team].color);
    say(line(team ? 'capBlue' : 'capRed', { d: D.def.name }), true);
    for (let i = 0; i < 10; i++) fx.after(i * 0.25, () => fx.firework(D.landmark.x + R.range(-100, 100), D.landmark.z + R.range(-100, 100), teamCol(team)));
    audio.play('win'); ticker(`${TEAMS[team].name} chiếm ${D.def.name}!`);
  } else {
    banner('HOÀ!', `${D.def.name} vẫn chưa có chủ`, '#ffffff');
  }
  flash(); clearEvents();
  focus({ type: 'orbit', at: D.landmark.clone().setY(Math.min(60, D.landmark.y)), r: 200, h: 110, speed: 0.22 }, 5, 4);
  seasonRound++;
}
function endSeason() {
  phase = 'season'; phaseT = 0;
  const n = [owners.filter(o => o === 0).length, owners.filter(o => o === 1).length];
  const w = n[0] === n[1] ? -1 : n[0] > n[1] ? 0 : 1;
  if (w >= 0) { banner(`${TEAMS[w].name} VÔ ĐỊCH!`, `Mùa ${season}: ${n[w]} / ${DISTRICTS.length} khu`, TEAMS[w].color); say(line('season', { team: TEAMS[w].name, n: n[w] }), true); }
  else banner('MÙA GIẢI HOÀ!', `Mùa ${season}: ${n[0]} – ${n[1]}`, '#ffffff');
  const top = [...players.values()].sort((a, b) => b.coins - a.coins)[0];
  if (top && top.coins > 0) ticker(`Tổng kết mùa ${season}: ${top.name} là đại gia số 1 với ${fmt(top.coins)} xu!`);
  audio.play('win');
  for (let i = 0; i < 20; i++) fx.after(i * 0.3, () => { const D = curD(); fx.firework(D.center.x + R.range(-200, 200), D.center.z + R.range(-200, 200), w >= 0 ? teamCol(w) : 0xffffff); });
}
function travel(to, intro = false) {
  phase = 'travel'; clearEvents();
  if (boss) { scene.remove(boss.veh); endBoss(); }
  const from = intro ? null : cur;
  trav = { t: 0, dur: intro ? 7.5 : 6.2, from, to, p0: cam.pos.clone(), l0: cam.look.clone(), moved: false, titled: false };
  audio.play('whoosh'); audio.duck(2);
  tug = 0; timer = CFG.round; dq.length = 0;
  routeLine.visible = !intro;
  if (!intro) { const A = world.districts[from].center, B = world.districts[to].center; routeLine.geometry.setFromPoints(arc(A, B)); }
}
function arc(A, B) { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new V3(lerp(A.x, B.x, t), 10 + Math.sin(t * Math.PI) * 160, lerp(A.z, B.z, t))); } return pts; }
const routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.9, toneMapped: false, fog: false }));
routeLine.visible = false; scene.add(routeLine);
function moveEveryoneTo(i) {
  cur = i; const D = curD();
  for (const P of players.values()) if (P.veh) { P.loop = R.pick(D.loops); P.s = R() * P.loop.total; P.r = D.air.r * R.range(0.55, 1.15); placeVehicle(P, 0); }
  resetTraffic(); audio.setSong(D.def.key); fireAt = now + 7;
}
function updateRound(dt) {
  phaseT += dt;
  if (phase === 'play') {
    if (!boss && now >= busyUntil) timer -= dt;
    if (Math.abs(tug) >= CFG.cap) capture(tug > 0 ? 1 : 0);
    else if (timer <= 0) capture(Math.abs(tug) < CFG.cap * 0.04 ? -1 : tug > 0 ? 1 : 0);
  } else if (phase === 'captured' && phaseT > 5) {
    if (seasonRound >= DISTRICTS.length) endSeason();
    else travel(nextDistrict());
  } else if (phase === 'season' && phaseT > 7) {
    season++; seasonRound = 0;
    for (let i = 0; i < owners.length; i++) { owners[i] = -1; world.setOwner(i, -1); }
    travel(nextDistrict());
  }
}

// ---------- máy quay tự động ----------
const cam = { pos: new V3(0, 900, 900), look: new V3(0, 0, 0), shot: null, until: 0, t0: 0, focus: null };
let trav = null;
function focus(shot, dur, prio = 1) {
  if (cam.focus && now < cam.focus.until && cam.focus.prio > prio) return;
  cam.focus = Object.assign(shot, { until: now + dur, prio, t0: now, cut: false });
}
function pickShot() {
  const D = curD(), list = [...players.values()].filter(P => P.veh);
  const r = R(); let s;
  if (list.length && r < 0.5) {
    const P = list.sort((a, b) => (b.hot > now) - (a.hot > now) || b.coins - a.coins)[Math.floor(Math.pow(R(), 2) * Math.min(list.length, 8))];
    s = R() < 0.7 ? { type: 'chase', P, dist: P.tier >= 3 ? 34 : 28, h: P.tier >= 5 ? 18 : 14 } : { type: 'side', P, dist: 20 };
  } else if (r < 0.75) { const sh = R.pick(D.shots); s = { type: 'preset', p: new V3(...sh.p).add(D.center), l: new V3(...sh.l).add(D.center) }; }
  else if (r < 0.9) s = { type: 'orbit', at: D.center.clone().setY(20), r: 230, h: 120, speed: 0.07 };
  else s = { type: 'top' };
  cam.shot = Object.assign(s, { t0: now, cut: true }); cam.until = now + R.range(7, 10);
}
const _f = new V3(), _r = new V3(), _b = {};
function shotTarget(s, outP, outL) {
  const D = curD();
  if (s.type === 'chase' || s.type === 'side') {
    const v = s.P && s.P.veh; if (!v) return false;
    const yaw = s.P.yaw; _f.set(Math.sin(yaw), 0, Math.cos(yaw)); _r.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const onRoad = !TIERS[s.P.tier].air && s.P.loop && !(s.P.drift > now);
    if (s.type === 'chase') {
      if (onRoad) { const b = s.P.loop.at(s.P.s - s.dist, s.P.lane * 0.5, _b); outP.set(b.x, s.h, b.z); }   // bám theo con đường phía sau xe → không chui vào nhà ở góc cua
      else outP.copy(v.position).addScaledVector(_f, -s.dist).add(new V3(0, s.h, 0));
      outL.copy(v.position).addScaledVector(_f, 6).add(new V3(0, 2, 0));
    } else {
      const t = now - s.t0;
      if (onRoad) { const b = s.P.loop.at(s.P.s + 10 - t * 3, -8, _b); outP.set(b.x, 4.5, b.z); }       // đứng bên kia đường nhìn sang
      else outP.copy(v.position).addScaledVector(_r, s.dist).addScaledVector(_f, 8 - t * 1.5).add(new V3(0, 5, 0));
      outL.copy(v.position).add(new V3(0, 2.5, 0));
    }
    if (outP.y < 2) outP.y = 2;
    return true;
  }
  if (s.type === 'track') { const v = s.obj; if (!v || !v.parent) return false; const yaw = v.rotation.y; _f.set(Math.sin(yaw), 0, Math.cos(yaw)); outP.copy(v.position).addScaledVector(_f, -s.back).add(new V3(0, s.h, 0)); outL.copy(v.position).addScaledVector(_f, 10); return true; }
  if (s.type === 'orbit') { const at = s.follow && s.follow.veh ? s.follow.veh.position.clone().setY(s.at.y) : s.at; const a = (s.a0 ??= Math.atan2(cam.pos.x - at.x, cam.pos.z - at.z)) + (now - s.t0) * s.speed; outP.set(at.x + Math.sin(a) * s.r, at.y + s.h, at.z + Math.cos(a) * s.r); outL.copy(at); return true; }
  if (s.type === 'preset') { const t = now - s.t0; outP.copy(s.p).add(new V3(Math.sin(t * 0.2) * 6, t * 0.4, t * 1.2)); outL.copy(s.l); return true; }
  if (s.type === 'top') { const t = now - s.t0; outP.set(D.center.x + Math.sin(t * 0.05) * 60, 300, D.center.z + 200); outL.copy(D.center); return true; }
  return false;
}
const _dp = new V3(), _dl = new V3();
function updateCamera(dt) {
  if (trav) return travelCam(dt);
  let s = cam.focus && now < cam.focus.until ? cam.focus : null;
  if (!s) { if (cam.focus) { cam.focus = null; cam.until = 0; } if (now > cam.until || !cam.shot) pickShot(); s = cam.shot; }
  if (!shotTarget(s, _dp, _dl)) { pickShot(); s = cam.shot; if (!shotTarget(s, _dp, _dl)) return; }
  if (s.cut) { cam.pos.copy(_dp); cam.look.copy(_dl); s.cut = false; }
  const k = s === cam.focus ? 3 : (s.type === 'chase' || s.type === 'side') ? 5 : 2;
  cam.pos.lerp(_dp, 1 - Math.exp(-k * dt)); cam.look.lerp(_dl, 1 - Math.exp(-k * 1.4 * dt));
}
let moodNow = mixMood(MOODS.night, MOODS.night, 0);
const _white = new THREE.Color(1, 1, 1);
function travelCam(dt) {
  const T = trav; T.t += dt; const k = Math.min(1, T.t / T.dur);
  const B = world.districts[T.to], A = T.from == null ? new V3(150, 0, 100) : world.districts[T.from].center;
  const H = T.from == null ? 1500 : 760, back = T.from == null ? 900 : 430;
  const hA = A.clone().add(new V3(0, H, back)), hB = B.center.clone().add(new V3(0, 760, 430));
  const sh = B.shots[1], land = new V3(...sh.p).add(B.center), landL = new V3(...sh.l).add(B.center);
  const mA = MOODS[T.from == null ? 'night' : world.districts[T.from].def.mood], mB = MOODS[B.def.mood];
  if (k < 0.28) { const e = ease.inOut(k / 0.28); cam.pos.lerpVectors(T.p0, hA, e); cam.look.lerpVectors(T.l0, A, e); moodNow = mixMood(mA, mA, 0); }
  else if (k < 0.68) { const e = ease.inOut((k - 0.28) / 0.4); cam.pos.lerpVectors(hA, hB, e); cam.pos.y += Math.sin(e * Math.PI) * 200; cam.look.lerpVectors(A, B.center, e); moodNow = mixMood(mA, mB, e); }
  else { const e = ease.inOut((k - 0.68) / 0.32); cam.pos.lerpVectors(hB, land, e); cam.look.lerpVectors(B.center, landL, e); moodNow = mixMood(mB, mB, 0); }
  if (!T.moved && k > 0.45) { T.moved = true; moveEveryoneTo(T.to); }
  if (!T.titled && k > 0.7) { T.titled = true; showTitle(B); audio.play('land'); }
  labelsOn(k > 0.12 && k < 0.82, T.to);
  if (k >= 1) {
    trav = null; routeLine.visible = false; phase = 'play'; phaseT = 0;
    cam.shot = { type: 'preset', p: land, l: landL, t0: now, cut: false }; cam.until = now + 6;
    const D = B; fx.after(3.4, () => { if (cur === D.idx && phase === 'play') say(line('intro', { d: D.def.name, sub: D.def.sub }), true); });   // chờ thẻ tên khu tắt
    ticker(`Đang ở ${D.def.name} (${D.def.time}). Phe nào đẩy thanh điểm tới cuối sẽ chiếm khu!`);
  }
}

// ---------- HUD ----------
const tagsEl = $('tags'), tagMap = new Map();
const _v = new V3();
function project(p, out) { _v.copy(p).project(camera); if (_v.z > 1 || _v.z < -1) return false; out.x = (_v.x * 0.5 + 0.5) * SW; out.y = (-_v.y * 0.5 + 0.5) * SH; return out.x > -80 && out.x < SW + 80 && out.y > -40 && out.y < SH + 40; }
function avaHtml(P) {
  return `<div class="ava t${P.team}">${P.avatar ? `<img src="${esc(P.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}${P.avatar ? '' : esc(initials(P.name))}</div>`;
}
function updateTags() {
  const list = [];
  if (!trav) {
    for (const P of players.values()) {
      if (!P.veh) continue;
      const d = camera.position.distanceTo(P.veh.position), pri = (P.hot > now ? 1 : 0) + (P === king ? 2 : 0);
      if (d > (pri ? 700 : 300)) continue;
      list.push({ P, d: d - pri * 400 });
    }
    list.sort((a, b) => a.d - b.d); list.length = Math.min(list.length, 22);
  }
  const seen = new Set(), o = {};
  for (const { P } of list) {
    const T = TIERS[P.tier], h = P.tier === 6 ? 9 : P.tier === 5 ? 9 : P.tier >= 3 ? 7 : 8;
    if (!project(_v.copy(P.veh.position).add(new V3(0, h, 0)), o)) continue;
    let el = tagMap.get(P.id);
    const sig = P.name + P.team + P.tier + starsOf(P.coins) + (P === king) + (P.hot > now) + !!P.avatar;
    if (!el) { el = document.createElement('div'); el.className = 'tg'; tagsEl.appendChild(el); tagMap.set(P.id, el); }
    if (el._sig !== sig) {
      el._sig = sig; const st = starsOf(P.coins);
      el.className = `tg t${P.team}${P === king ? ' king' : ''}${P.hot > now ? ' hot' : ''}`;
      el.innerHTML = `${avaHtml(P)}<span>${P === king ? '👑 ' : ''}${esc(P.name)}</span>${st ? `<span class="st">${'⭐'.repeat(st)}</span>` : ''}${P.tier ? `<span>${T.icon}</span>` : ''}`;
    }
    const dist = camera.position.distanceTo(P.veh.position), sc = clamp(90 / dist, 0.55, 1.15);
    el.style.transform = `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px) translate(-50%, -100%) scale(${sc.toFixed(3)})`;
    el.style.display = ''; seen.add(P.id);
  }
  for (const [id, el] of tagMap) if (!seen.has(id)) { if (!players.has(id) || !players.get(id).veh) { el.remove(); tagMap.delete(id); } else el.style.display = 'none'; }
  // nhãn tượng vàng + boss
  extraTag('statue', statue && statue.d === cur && !trav ? statue.obj.position.clone().add(new V3(0, 34, 0)) : null, statue ? `👑 TRÙM: ${esc(statue.P.name)}` : '');
  extraTag('boss', boss && !trav ? boss.veh.position.clone().add(new V3(0, 16, 0)) : null, '💀 HẮC LONG');
}
const extras = {};
function extraTag(key, pos, html) {
  let el = extras[key];
  if (!el) { el = extras[key] = document.createElement('div'); el.className = 'tg king'; tagsEl.appendChild(el); }
  const o = {};
  if (!pos || !project(pos, o)) { el.style.display = 'none'; return; }
  if (el._h !== html) { el._h = html; el.innerHTML = `<span>${html}</span>`; }
  el.style.display = ''; el.style.transform = `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px) translate(-50%, -100%)`;
}
const labelsEl = $('labels'); const labelEls = [];
DISTRICTS.forEach((d, i) => { const el = document.createElement('div'); el.className = 'ml'; el.innerHTML = `<b>${d.icon} ${esc(d.name)}</b><i></i>`; el.style.opacity = 0; labelsEl.appendChild(el); labelEls.push(el); void i; });
function labelsOn(on, dest) {
  const o = {};
  world.districts.forEach((D, i) => {
    const el = labelEls[i];
    if (!on || !project(D.label, o)) { el.style.opacity = 0; return; }
    el.className = `ml${owners[i] >= 0 ? ' o' + owners[i] : ''}${i === dest ? ' dest' : ''}`;
    el.style.left = o.x + 'px'; el.style.top = o.y + 'px'; el.style.opacity = 1;
  });
}

// thanh trên
const pipsEl = $('pips'); pipsEl.innerHTML = DISTRICTS.map(d => `<span>${d.icon}</span>`).join('');
let lastTop = '';
function renderTop() {
  const D = curD().def, m = Math.max(0, Math.ceil(timer));
  const sig = cur + '|' + m + '|' + owners.join() + '|' + Math.round(tug);
  if (sig === lastTop) return; lastTop = sig;
  $('dname').innerHTML = `<b>${D.icon} ${esc(D.name)}</b><span>${D.time} · ${esc(D.sub)}</span>`;
  const t = $('timer'); t.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; t.classList.toggle('hot', m <= 10 && phase === 'play');
  const red = (CFG.cap - tug) / (2 * CFG.cap) * 100;
  document.querySelector('#tug .r').style.width = red + '%'; document.querySelector('#tug .b').style.width = (100 - red) + '%';
  document.querySelector('#tug .mid').style.left = red + '%';
  [...pipsEl.children].forEach((el, i) => { el.className = (owners[i] >= 0 ? 'o' + owners[i] : '') + (i === cur ? ' cur' : ''); });
  $('sRed').textContent = owners.filter(o => o === 0).length; $('sBlue').textContent = owners.filter(o => o === 1).length;
}
function renderCounts() { const n = teamCount(); $('nRed').textContent = n[0] + ' người'; $('nBlue').textContent = n[1] + ' người'; }
let leaderDirty = true, lastTop1 = '';
const renderLeaderSoon = () => { leaderDirty = true; };
function renderLeader() {
  if (!leaderDirty) return; leaderDirty = false;
  const top = [...players.values()].filter(P => P.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 3);
  $('lrows').innerHTML = top.length ? top.map((P, i) => `<div class="lrow"><div class="rk">${['🥇', '🥈', '🥉'][i]}</div>${avaHtml(P)}<div class="info"><b>${P === king ? '👑 ' : ''}${esc(P.name)}</b><span class="num">${fmt(P.coins)} xu · ${TIERS[P.tier].icon} ${'⭐'.repeat(starsOf(P.coins))}</span></div></div>`).join('') : '<div class="empty">Tặng quà để lên bảng!</div>';
  const t1 = top[0];
  if (t1 && t1.id !== lastTop1) { lastTop1 = t1.id; if (!king) world.districts[0].board.set('TOP 1 XỨ RỒNG', t1.name, '#ffd23a'); if (top.length > 1) ticker(`${t1.name} vươn lên TOP 1 đại gia Xứ Rồng!`); }
}
function renderBoss() {
  if (!boss) return;
  $('bossHp').style.width = clamp(boss.hp / boss.max * 100, 0, 100) + '%'; $('bossT').textContent = Math.ceil(boss.t) + 's';
}
function renderGoal() { $('gNow').textContent = fmt(goalNow); $('gMax').textContent = fmt(CFG.goal); $('gBar').style.width = clamp(goalNow / CFG.goal * 100, 0, 100) + '%'; }

// bản đồ nhỏ
const mapC = $('map'), mx = mapC.getContext('2d');
const MB = { x0: -1980, x1: 2320, z0: -1420, z1: 1620 }, MS = 300 / Math.max(MB.x1 - MB.x0, MB.z1 - MB.z0);
const m2c = (x, z) => [150 + (x - (MB.x0 + MB.x1) / 2) * MS, 150 + (z - (MB.z0 + MB.z1) / 2) * MS];
function renderMap() {
  mx.fillStyle = '#25381f'; mx.fillRect(0, 0, 300, 300);
  const [sx] = m2c(1360, 0); mx.fillStyle = '#1d4f86'; mx.fillRect(sx, 0, 300 - sx, 300);
  mx.strokeStyle = '#2f6fb0'; mx.lineWidth = 8; mx.lineJoin = 'round'; mx.beginPath(); RIVER.forEach((p, i) => { const [x, y] = m2c(p[0], p[1]); i ? mx.lineTo(x, y) : mx.moveTo(x, y); }); mx.stroke();
  mx.strokeStyle = 'rgba(255,220,160,0.55)'; mx.lineWidth = 3;
  for (const [i, j] of LINKS) { const a = m2c(...DISTRICTS[i].c), b = m2c(...DISTRICTS[j].c); mx.beginPath(); mx.moveTo(a[0], a[1]); mx.lineTo(b[0], b[1]); mx.stroke(); }
  DISTRICTS.forEach((d, i) => {
    const [x, y] = m2c(...d.c);
    if (i === cur && !trav) { mx.strokeStyle = '#fff'; mx.lineWidth = 3; mx.beginPath(); mx.arc(x, y, 21 + Math.sin(now * 4) * 3, 0, 7); mx.stroke(); }
    mx.fillStyle = owners[i] < 0 ? 'rgba(40,30,60,0.92)' : TEAMS[owners[i]].color; mx.beginPath(); mx.arc(x, y, 16, 0, 7); mx.fill();
    mx.strokeStyle = 'rgba(255,255,255,0.8)'; mx.lineWidth = 2; mx.stroke();
    mx.font = '17px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillText(d.icon, x, y + 1);
  });
  if (trav && trav.from != null) {
    const k = clamp((trav.t / trav.dur - 0.28) / 0.4, 0, 1), a = m2c(...DISTRICTS[trav.from].c), b = m2c(...DISTRICTS[trav.to].c);
    mx.setLineDash([6, 6]); mx.strokeStyle = '#ff2e88'; mx.lineWidth = 3; mx.beginPath(); mx.moveTo(a[0], a[1]); mx.lineTo(b[0], b[1]); mx.stroke(); mx.setLineDash([]);
    const e = ease.inOut(k); mx.font = '26px "Segoe UI Emoji", sans-serif'; mx.fillText('🚁', lerp(a[0], b[0], e), lerp(a[1], b[1], e));
  }
  if (boss) { const [x, y] = m2c(...DISTRICTS[cur].c); mx.font = '22px "Segoe UI Emoji", sans-serif'; mx.fillText('💀', x + 22, y - 18); }
}

// hướng dẫn quà
const GUIDE = [
  ['🌹', '1 xu', 'Nitro phun lửa + điểm cho phe'],
  ['🍩', '30 xu', 'Drift gắt xoay vòng khói'],
  ['🎩', '99 xu', 'Hắc Long truy nã — cắt đuôi đàn em'],
  ['🐶', '299 xu', 'Trực thăng thả hàng cho phe'],
  ['💸', '500 xu', 'Mưa tiền cả khu'],
  ['🌌', '1.000 xu', 'Mua đứt khu ngay lập tức'],
  ['🦁', '5.000 xu', 'TRÙM XỨ RỒNG + tượng vàng'],
  ['🚀', 'Tổng xu', '🛵 → 🏍️ → 🚗 → 🏎️ → 🚁 → 🐉'],
  ['❤️', 'Thả tim', 'Đủ mục tiêu → đánh Boss Hắc Long'],
  ['💬', 'Gõ 1 / 2', 'Vào phe Rồng Đỏ / Hổ Xanh'],
];
let guidePage = 0;
function renderGuide() { const [i, c, d] = GUIDE[guidePage]; $('grows').innerHTML = `<div class="grow"><div class="ic">${i}</div><div class="c">${c}</div><div class="d">${d}</div></div>`; guidePage = (guidePage + 1) % GUIDE.length; }

// luồng quà
const feedEl = $('feed');
function feed(html, P, big) {
  const el = document.createElement('div'); el.className = 'toast' + (big ? ' big' : '');
  el.innerHTML = (P ? avaHtml(P) : '') + `<span>${html}</span>`;
  feedEl.prepend(el); while (feedEl.children.length > 3) feedEl.lastChild.remove();
  setTimeout(() => el.remove(), 7000);
}
// bản tin
const news = ['Chào mừng tới Sài Gòn Truy Kích — bình luận 1 vào Rồng Đỏ, 2 vào Hổ Xanh!', 'Tặng quà để độ xe: xe số → tay ga → phân khối lớn → mui trần → siêu xe → trực thăng → cưỡi Rồng Vàng!'];
const tickEl = $('tick');
function ticker(s) { news.push(s); if (news.length > 6) news.splice(0, news.length - 6); }
tickEl.addEventListener('animationiteration', () => { tickEl.textContent = news.slice(-4).join('   ★   '); });
// hội thoại
const dlg = $('dialog'), dq = [];
let dlgUntil = 0;
function say(l, speak = false) { dq.push({ ...l, speak }); if (dq.length > 4) dq.splice(0, dq.length - 4); }
let titleUntil = 0;
function updateDialog() {
  if (now < titleUntil) { if (dlg.classList.contains('on')) { dlg.classList.remove('on'); dlgUntil = 0; } return; }   // nhường chỗ cho thẻ tên khu
  if (now < dlgUntil) return;
  if (dlg.classList.contains('on')) { dlg.classList.remove('on'); dlgUntil = now + 0.45; return; }
  const l = dq.shift(); if (!l) return;
  const c = CAST[l.who];
  dlg.querySelector('.por').innerHTML = portrait(l.who, 120);
  dlg.querySelector('.who').innerHTML = `${esc(c.name)}<span>${esc(c.role)}</span>`;
  dlg.querySelector('.who').style.color = c.color === '#ffc23a' ? '#a87a00' : c.color;
  dlg.querySelector('.say').textContent = l.text;
  dlg.classList.add('on'); dlgUntil = now + clamp(l.text.length * 0.065, 3, 5.5);
  if (l.speak) voice.say(l.text, true);
}
let idleAt = 20;
// băng rôn, thẻ tên khu, chớp
function banner(k, s, color) {
  const b = $('banner'); b.querySelector('.k').textContent = k; b.querySelector('.s').textContent = s || '';
  b.style.setProperty('--c', color || '#ff2e88'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
}
function showTitle(D) {
  const t = $('title'); t.querySelector('.nm').textContent = D.def.name; t.querySelector('.sb').textContent = D.def.sub;
  const o = owners[D.idx]; t.querySelector('.tm').textContent = `🕒 ${D.def.time} · ${o < 0 ? 'Chưa có chủ' : 'Đang thuộc ' + TEAMS[o].name}`;
  t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); titleUntil = now + 3.4;
}
function flash() { const f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function bubble(P, text) { feed(`<b>${esc(P.name)}</b>: ${esc(text)}`, P); }

// ---------- lưu tạm (tải lại trang OBS không mất bảng xếp hạng) ----------
const SAVE_KEY = 'sgtk-save-v1';
function save() {
  try {
    const top = [...players.values()].filter(P => P.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 40).map(P => ({ id: P.id, name: P.name, avatar: P.avatar, coins: P.coins, team: P.team }));
    localStorage.setItem(SAVE_KEY, JSON.stringify({ t: Date.now(), owners, season, seasonRound, cur, top, king: king && king.id }));
  } catch (e) { /* trình duyệt chặn lưu: bỏ qua */ }
}
function load() {
  if (DEMO) return;
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s || Date.now() - s.t > 6 * 3600e3) return;
    s.owners.forEach((o, i) => { owners[i] = o; world.setOwner(i, o); });
    season = s.season || 1; seasonRound = s.seasonRound || 0; cur = s.cur || 0;
    for (const p of s.top || []) { const P = ensurePlayer(p, false); P.coins = p.coins; P.team = p.team; P.tier = tierOf(p.coins); }
    if (s.king && players.has(s.king)) king = players.get(s.king);
  } catch (e) { /* dữ liệu lưu hỏng: bắt đầu mới */ }
}

// ---------- chạy thử không cần LIVE ----------
const BOT_NAMES = ['Mây Hồng', 'Tuấn Béo', 'Linh Xinh', 'Bảo Ngọc', 'Hải Đăng', 'Minh Thư', 'Gấu Trúc', 'Cún Con', 'Thỏ Bông', 'Khoai Tây', 'Anh Ba Sài Gòn', 'Trà Sữa', 'Mèo Mập', 'Su Su', 'Long Vũ', 'Kiều Trang', 'Phát Đạt', 'Huy Hoàng', 'Ngọc Hân', 'Quốc Bảo', 'Thảo Vy', 'Đức Anh', 'Trung Kiên', 'Yến Nhi', 'Tiến Dũng', 'Khánh Linh', 'Bánh Bao', 'Cà Pháo', 'Bé Bự', 'Hạt Tiêu'];
const GIFTS = [['Hoa hồng', 1], ['TikTok', 1], ['Kem', 1], ['Tim tay', 5], ['Nước hoa', 20], ['Bánh donut', 30], ['Mũ quý ông', 99], ['Chó Corgi', 299], ['Súng tiền', 500], ['Thiên hà', 1000], ['Sư tử', 5000]];
let botN = 0;
const bot = i => ({ id: 'bot' + i, name: BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ' ' + Math.floor(i / BOT_NAMES.length) : ''), avatar: '' });
const randBot = () => bot(Math.floor(R() * Math.max(1, botN)));
function testGift(diamonds, u) { const g = GIFTS.find(x => x[1] === diamonds) || ['Quà', diamonds]; handleEv({ type: 'gift', user: u || randBot(), gift: { name: g[0], diamonds: g[1] }, count: 1, value: g[1] }); }
function testJoin(n) { for (let i = 0; i < n; i++) setTimeout(() => handleEv({ type: 'chat', user: bot(botN++), text: R() < 0.3 ? (R() < 0.5 ? '1' : '2') : 'hi' }), i * 150); }
const SCRIPT = [[3, () => testJoin(8)], [9, () => testGift(30)], [16, () => testGift(99)], [31, () => testGift(299)], [44, () => testGift(500)], [70, () => testGift(1000)], [110, () => testGift(5000, bot(3))]];
let demoT = 0, scriptI = 0;
function updateDemo(dt) {
  if (!DEMO || phase === 'intro') return;
  demoT += dt;
  while (scriptI < SCRIPT.length && demoT >= SCRIPT[scriptI][0]) SCRIPT[scriptI++][1]();
  if (botN < 26 && R() < dt * 0.7) testJoin(1);
  if (R() < dt * 2.2) handleEv({ type: 'like', user: randBot(), count: R.int(5, 25) });
  if (R() < dt * 0.35) testGift(R.pick([1, 1, 1, 1, 5, 5, 20]));
  if (demoT > 120 && R() < dt * 0.03) testGift(R.pick([30, 99, 299, 500]));
  if (R() < dt * 0.25) handleEv({ type: 'chat', user: randBot(), text: R.pick(['còi', 'nitro', 'đỉnh quá', '1', '2', 'lên ga', 'xịn xò']) });
  if (R() < dt * 0.02) handleEv({ type: 'follow', user: randBot() });
}
// bảng thử
const TESTS = [
  ['+10 người', () => testJoin(10)], ['❤️ 300 tim', () => { for (let i = 0; i < 10; i++) setTimeout(() => handleEv({ type: 'like', user: randBot(), count: 30 }), i * 80); }], ['➕ Follow', () => handleEv({ type: 'follow', user: randBot() })],
  ['🌹 1 xu', () => testGift(1), 1], ['🍩 30 xu', () => testGift(30), 1], ['🎩 99 xu', () => testGift(99), 1],
  ['🐶 299 xu', () => testGift(299), 1], ['💸 500 xu', () => testGift(500), 1], ['🌌 1000 xu', () => testGift(1000), 1],
  ['🦁 5000 xu', () => testGift(5000), 1], ['💀 Gọi boss', () => { goalNow = CFG.goal; onLike(randBot(), 1); }], ['⏭ Chuyển khu', () => { if (phase === 'play') capture(tug > 0 ? 1 : tug < 0 ? 0 : -1); }],
];
$('testGrid').innerHTML = TESTS.map((t, i) => `<button data-i="${i}" class="${t[2] ? 'g' : ''}">${t[0]}</button>`).join('');
$('testGrid').onclick = e => { const b = e.target.closest('button'); if (b) { if (!botN) testJoin(3); TESTS[+b.dataset.i][1](); } };
$('testBtn').onclick = () => $('test').classList.toggle('on');
if (CFG.test) $('test').classList.add('on');
window.addEventListener('keydown', e => {
  if (e.key === 't' || e.key === 'T') $('test').classList.toggle('on');
  if (e.key === 'm' || e.key === 'M') audio.setMusic(!audio.musicOn);
  if ((e.key === 'n' || e.key === 'N') && phase === 'play') capture(tug > 0 ? 1 : tug < 0 ? 0 : -1);
});

// ---------- màn mở đầu ----------
$('cast').innerHTML = Object.entries(CAST).map(([k, c]) => `<div class="cm">${portrait(k, 90)}<b>${esc(c.name)}</b><span>${esc(c.role)}</span></div>`).join('');
let started = false;
function begin() {
  if (started) return; started = true;
  $('start').style.display = 'none';
  audio.start(); audio.setMusic(CFG.music); audio.setSong(DISTRICTS[cur].key);
  travel(cur, true);
  setTimeout(() => say(line('idle')), 12000);
}
$('go').onclick = begin;
if (CFG.obs) setTimeout(begin, 300);
document.addEventListener('pointerdown', () => audio.start(), { once: false });

// ---------- vòng lặp ----------
load();
resetTraffic(); moveEveryoneTo(cur); audio.setSong(DISTRICTS[cur].key);
for (let i = 0; i < owners.length; i++) world.setOwner(i, owners[i]);
renderGuide(); setInterval(renderGuide, 3500);
setInterval(save, 10000);
let last = performance.now(), slow = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000); last = t; now += dt;
  if (phase !== 'intro' || trav) updateRound(dt);
  for (const P of players.values()) if (P.veh) placeVehicle(P, dt);
  updateTraffic(dt); updateBoss(dt); updateEvents(dt); runBig(); updateDemo(dt);
  if (phase === 'intro' && !trav) { const a = now * 0.05; cam.pos.set(Math.sin(a) * 1300 + 100, 900, Math.cos(a) * 1300 + 100); cam.look.set(0, 0, 0); }
  else updateCamera(dt);
  camera.position.copy(cam.pos); camera.lookAt(cam.look); camera.updateMatrixWorld();
  if (!trav && phase !== 'intro') moodNow = mixMood(MOODS[curD().def.mood], MOODS[curD().def.mood], 0);
  world.setMood(moodNow, camera.position);
  const hgt = camera.position.y; const fk = moodNow.fogK ?? 1; scene.fog.near = lerp(140, 900, clamp(hgt / 900, 0, 1)) * fk; scene.fog.far = lerp(900, 4200, clamp(hgt / 900, 0, 1)) * (0.5 + fk * 0.5);
  world.cloudMat.opacity = clamp((hgt - 150) / 400, 0.15, 0.7); world.cloudMat.color.copy(moodNow.fog).lerp(_white, 1 - moodNow.night * 0.75);
  world.update(dt, now); fx.update(dt);
  $('speed').classList.toggle('on', !!trav && trav.t / trav.dur > 0.25 && trav.t / trav.dur < 0.7);
  updateTags(); updateDialog();
  if (now > idleAt && phase === 'play') { idleAt = now + 35; say(line(R() < 0.5 ? (tug > 0 ? 'rallyRed' : 'rallyBlue') : 'idle')); }
  slow += dt; if (slow > 0.2) { slow = 0; renderTop(); renderCounts(); renderLeader(); renderBoss(); renderGoal(); renderMap(); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.SGTK = { handleEv, testGift, testJoin, players, CFG, go: i => travel(i), boss: () => { phase = 'play'; startBoss(); }, get phase() { return phase; } };
