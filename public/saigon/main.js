import { THREE } from './three.js';
import { World, DISTRICTS, TEAMS, MOODS, mixMood, RIVER, LINKS } from './world.js';
import { TIERS, tierOf, buildRide, updateDragon, buildVehicle, buildNPC, buildGoon, buildBoss, buildCrate, FX, Particles, glowDisc } from './vehicles.js';
import { Audio, Voice } from './audio.js';
import { CAST, line, portrait } from './cast.js';
import { loadRoster, pickId, template, Person, goldStatue, RESERVED, SEATS } from './chars.js';
import { R, clamp, lerp, ease, esc, initials, fmt } from './util.js';

// ---------- cài đặt qua đường dẫn ----------
const Q = new URLSearchParams(location.search);
const num = (k, d) => (Q.has(k) && !isNaN(+Q.get(k)) ? +Q.get(k) : d);
const CFG = {
  obs: Q.has('obs'), fill: Q.has('fill'), low: Q.get('fx') === 'low', test: Q.has('test'),
  round: num('round', 120), cap: num('cap', 300), goal: num('boss', 2000), bossHp: num('bosshp', 1500),
  max: num('max', 30), afk: num('afk', 90), tts: Q.get('tts') !== '0', music: Q.get('music') !== '0', demo: Q.get('demo'),
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
if (DEMO && !Q.has('max')) CFG.max = 18;

// ---------- dựng cảnh ----------
const stage = $('stage'), hud = $('hud');
const renderer = new THREE.WebGLRenderer({ antialias: !CFG.low, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.low ? 1 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 9 / 16, 0.5, 9000);
let SW = 540, SH = 960;
function fit() {
  const G = window.__GUTTER || 0, W = (document.body.clientWidth || window.innerWidth) - 2 * G, H = document.body.clientHeight || window.innerHeight; let w, h;
  if (CFG.fill) { w = W; h = H; } else { h = H; w = h * 9 / 16; if (w > W) { w = W; h = w * 16 / 9; } }
  SW = Math.round(w); SH = Math.round(h);
  stage.style.width = SW + 'px'; stage.style.height = SH + 'px'; stage.style.setProperty('--u', (SH / 100) + 'px');
  renderer.setSize(SW, SH, false); camera.aspect = SW / SH;
  camera.setViewOffset(SW, SH, 0, -SH * 0.1, SW, SH);   // nhân vật đứng ở khoảng 60% chiều cao: trên là trời, dưới là chân
  camera.updateProjectionMatrix();
  Particles.scale.value = SH * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
}
window.addEventListener('resize', fit); fit();

const world = new World(scene, { low: CFG.low });
// đèn chính đi theo máy quay: chiếu sáng mặt nhân vật kể cả ở khu ban đêm
const keyLight = new THREE.DirectionalLight(0xfff2e0, 1); scene.add(keyLight); scene.add(keyLight.target);
const fx = new FX(scene);
const audio = new Audio(); audio.musicOn = CFG.music;
const voice = new Voice(); voice.enabled = CFG.tts;
if (socket) voice.relay = (text, prio) => socket.emit('say', { text, prio: !!prio, auto: true });
let boomAt = 0; fx.onBoom = () => { if (now - boomAt > 0.25) { boomAt = now; audio.play('boom'); } };

// ---------- trạng thái ván ----------
let now = 0;
let cur = 0, tug = 0, timer = CFG.round;
let phase = 'intro', phaseT = 0;
let seasonRound = 0, season = 1;
const owners = DISTRICTS.map(() => -1);
const players = new Map();
let goalNow = 0;
let boss = null, king = null, statue = null, star = null;
let busyUntil = 0; const bigQ = [];
const goons = [], crates = [], choppers = [];
const curD = () => world.districts[cur];
const ROUTE = ['neon', 'cholon', 'phoco', 'chonoi', 'bien', 'halong', 'cang', 'caurong', 'deo', 'sanbay'].map(k => DISTRICTS.findIndex(d => d.key === k)).filter(i => i >= 0);
const nextDistrict = () => ROUTE[(ROUTE.indexOf(cur) + 1) % ROUTE.length];
const teamCol = t => TEAMS[t].glow;
const starsOf = c => (c >= 2000 ? 5 : c >= 500 ? 4 : c >= 100 ? 3 : c >= 30 ? 2 : c >= 1 ? 1 : 0);
const _a = {}, _w = new V3(), _w2 = new V3(), _q = new THREE.Quaternion();
function angDamp(a, b, k, dt) { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-k * dt)); }

// ---------- người chơi = nhân vật người thật ----------
function teamCount() { const n = [0, 0]; for (const P of players.values()) n[P.team]++; return n; }
function ensurePlayer(u, spawn = true) {
  if (!u || !u.id) return null;
  let P = players.get(u.id);
  if (!P) {
    const n = teamCount();
    P = { id: u.id, name: String(u.name || 'Ẩn danh').slice(0, 24), avatar: u.avatar || '', team: n[0] <= n[1] ? 0 : 1, coins: 0, tier: 0,
      person: null, plat: null, ring: null, loading: false, tp: null, loop: null, s: 0, lane: 3, laneT: 3, spd: 1, yaw: 0,
      boost: 0, hold: 0, dance: 0, chased: 0, sit: false, onFoot: false, sitMove: 'ngoi_xom', last: now, chatAt: -99, gestAt: -99, hot: 0,
      ang: R() * 6.28, r: 120, h: 0, say: '', sayUntil: 0 };
    players.set(u.id, P);
  } else { if (u.name) P.name = String(u.name).slice(0, 24); if (u.avatar) P.avatar = u.avatar; }
  P.last = now;
  if (P.sit) standUp(P);
  if (spawn && !P.person && !P.loading) spawnPerson(P);
  return P;
}
function personCount() { let n = 0; for (const P of players.values()) if (P.person || P.loading) n++; return n; }
function removePerson(P) { if (P.person) P.person.dispose(); if (P.plat) P.plat.removeFromParent(); P.person = null; P.plat = null; }
function evictOne(except) {   // nhường chỗ: cất nhân vật lâu không tương tác, chưa tặng quà
  let worst = null;
  for (const O of players.values()) if (O.person && O !== except && O.hot <= now && O !== king && O !== star && (!worst || O.coins * 1000 + O.last < worst.coins * 1000 + worst.last)) worst = O;
  if (worst) removePerson(worst);
  return !!worst;
}
async function spawnPerson(P) {
  if (personCount() >= CFG.max && !evictOne(P)) return;
  const id = pickId(P.id); if (!id) return;
  P.loading = true;
  let tpl; try { tpl = await template(id); } catch (e) { P.loading = false; return; }
  P.loading = false;
  if (players.get(P.id) !== P || P.person) return;
  P.person = new Person(tpl); P.tp = id;
  P.ring = glowDisc(teamCol(P.team), 5.5, 0.7); P.ring.position.y = 0.15; P.person.root.add(P.ring);
  const D = curD(); P.loop = R.pick(D.loops); P.s = R() * P.loop.total; P.lane = P.laneT = R.range(1.5, 6.5); P.spd = R.range(0.88, 1.12);
  P.r = D.air.r * R.range(0.55, 1.1); P.h = R.range(-8, 18);
  mount(P); placePlayer(P, 0);
  fx.burst(P.person.root.getWorldPosition(new V3()).add(new V3(0, 3, 0)), teamCol(P.team), 24, 10, 3, 0.6); audio.play('pop');
  react(P, 'vay_tay', 1);
}
// lên xe theo cấp (hoặc đi bộ): đặt hông nhân vật đúng yên xe rồi dựng tư thế ngồi
function mount(P) {
  const pr = P.person; if (!pr) return;
  if (P.plat) { P.plat.removeFromParent(); P.plat = null; }
  pr.root.removeFromParent();
  if (P.tier > 0 && !P.onFoot) {
    const tint = new THREE.Color(TEAMS[P.team].color).offsetHSL(0, 0, R.range(-0.08, 0.04)).getHex();
    P.plat = buildRide(P.tier, tint, teamCol(P.team)); scene.add(P.plat);
    const st = P.plat.userData.seat; st.parent.add(pr.root);
    pr.root.position.copy(st.pos).sub(pr.hipOffset); pr.root.rotation.set(0, 0, 0);
    pr.setSeat(SEATS[st.type]);
    P.ring.visible = false; P.sit = false; P.dance = 0;
    if (TIERS[P.tier].air) P.r = curD().air.r * R.range(0.55, 1.1);
  } else { pr.setSeat(null); scene.add(pr.root); P.ring.visible = true; }
}
function setTeam(P, t) {
  if (P.team === t) return;
  P.team = t;
  if (P.ring) P.ring.material.color.set(teamCol(t));
  if (P.plat) mount(P);
  feed(`<b>${esc(P.name)}</b> sang phe ${TEAMS[t].emoji}`, P);
  react(P, 'vay_tay', 1);
}
function standUp(P) { P.sit = false; P.laneT = R.range(1.5, 6.5); }
function react(P, move, reps = 1) {
  const pr = P.person; if (!pr) return 0;
  if (P.sit) standUp(P);
  const d = pr.gesture(move, reps);
  if (!P.plat) P.hold = Math.max(P.hold, now + d * 0.95);
  return d;
}
function near(center, radius, max, filter) {
  return [...players.values()].filter(O => O.person && (!filter || filter(O)))
    .map(O => [O, O.person.root.getWorldPosition(_w).distanceTo(center)]).filter(x => x[1] < radius).sort((a, b) => a[1] - b[1]).slice(0, max).map(x => x[0]);
}
function crowd(move, center, radius, max, reps = 1, filter) { const l = near(center, radius, max, filter); l.forEach(O => fx.after(R() * 0.5, () => react(O, move, reps))); return l.length; }
function danceAround(center, radius, max, dur) { const l = near(center, radius, max); for (const O of l) { if (O.sit) standUp(O); O.dance = now + dur * R.range(0.85, 1); } return l.length; }
const posOf = (P, out = new V3()) => P.person.root.getWorldPosition(out);

function placePlayer(P, dt) {
  const pr = P.person; if (!pr) return;
  const T = TIERS[P.tier], D = curD(), boost = P.boost > now ? 1.8 : 1;
  P.lane = lerp(P.lane, P.laneT, 1 - Math.exp(-2 * dt));
  if (P.plat) {
    const v = P.plat;
    if (T.air) {
      P.ang += T.speed * P.spd * boost * dt;
      let x, z, y, dx, dz;
      const dragon = T.seat === 'dragon';
      if (dragon) { const a = P.ang * 0.7, r = P.r * 1.2; x = D.center.x + Math.cos(a) * r; z = D.center.z + Math.sin(2 * a) * r * 0.55; y = D.air.y + 20 + Math.sin(a * 3) * 12; dx = -Math.sin(a); dz = Math.cos(2 * a) * 1.1; }
      else { x = D.center.x + Math.cos(P.ang) * P.r; z = D.center.z + Math.sin(P.ang) * P.r; y = D.air.y - 20 + P.h + Math.sin(now * 0.8 + P.r) * 3; dx = -Math.sin(P.ang); dz = Math.cos(P.ang); }
      v.position.set(x, y, z);
      const yaw = Math.atan2(dx, dz); P.yaw = dt ? angDamp(P.yaw, yaw, 4, dt) : yaw; v.rotation.y = P.yaw;
      if (dragon) { v.updateMatrixWorld(true); updateDragon(v, dt); }
      if (v.userData.rotor) { v.userData.rotor.rotation.y += dt * 30; v.userData.body.rotation.x = 0.1; }
      if (v.userData.tailRotor) v.userData.tailRotor.rotation.x += dt * 40;
    } else {
      const sp = T.speed * P.spd * boost * (P.chased > now ? 1.35 : 1);
      P.s += sp * dt;
      const a = P.loop.at(P.s, P.lane + 2, _a);
      v.position.set(a.x, 0, a.z);
      P.yaw = dt ? angDamp(P.yaw, a.yaw, 8, dt) : a.yaw; v.rotation.y = P.yaw;
      for (const w of v.userData.wheels) w.rotation.y += sp * dt / 0.9;
      v.userData.body.position.y = P.tier <= 4 ? Math.abs(Math.sin(now * 7 + P.s)) * 0.08 : 0;
      if (boost > 1 && P.tier >= 2 && R() < 0.7) { const back = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); fx.flame(v.position.clone().addScaledVector(back, P.tier >= 5 ? 5 : 3).setY(1.2), back); }
      pr.pedal = clamp(sp / 12, 0.3, 1.4);
    }
    pr.play(P.dance > now ? 'nhay_mua' : '', 0.3);   // ngồi xe: chỉ nhảy bằng nửa thân trên
    if (dt && !pr.busy() && P.dance < now && R() < dt * 0.04) react(P, 'vay_tay', 1);
  } else {
    const root = pr.root;
    if (P.sit) pr.play(P.sitMove, 0.4);
    else if (P.dance > now) pr.play('nhay_mua', 0.3);
    else if (P.hold > now || pr.busy()) { /* đứng tại chỗ làm động tác */ }
    else {
      const run = P.boost > now || P.chased > now, sp = (run ? 12.5 : 4.4) * P.spd;
      P.s += sp * dt;
      pr.play(run ? 'chay_bo' : 'di_bo', 0.25, run ? 1 : P.spd);
      if (run && dt && R() < 0.4) fx.spark.emit(root.position.x, 1, root.position.z, R.range(-2, 2), R.range(1, 4), R.range(-2, 2), teamCol(P.team), 3, 0.5, 0);
    }
    const a = P.loop.at(P.s, P.lane, _a);
    root.position.set(a.x, 0, a.z);
    P.yaw = dt ? angDamp(P.yaw, a.yaw, 8, dt) : a.yaw;
    root.rotation.y = P.sit ? P.yaw + Math.PI / 2 : P.yaw;   // ngồi vỉa hè thì quay mặt ra đường
  }
  pr.update(dt);
}

// ---------- Chú Bảy (nhân vật tp-025) đứng ở quảng trường mỗi khu ----------
let host = null;
function placeHost() {
  if (!host) return;
  const D = curD(); host.root.position.copy(D.plaza).add(new V3(-16, 0, 10));
  host.root.rotation.y = Math.atan2(D.center.x - host.root.position.x, D.center.z - host.root.position.z);
  host.play('dung_yen');
}

// ---------- xe chạy rông (ít, cho có sức sống) ----------
const npcs = [];
for (const k of ['bike', 'bike', 'cyclo', 'cyclo', 'taxi', 'bike'].slice(0, CFG.low ? 3 : 6)) {
  const veh = buildNPC(k); scene.add(veh); npcs.push({ veh, kind: k, loop: null, s: 0, lane: 9, spd: 1, yaw: 0 });
}
function resetTraffic() {
  const D = curD();
  for (const n of npcs) {
    n.veh.visible = n.kind !== 'cyclo' || ['cholon', 'neon', 'phoco'].includes(D.def.key);
    n.loop = R.pick(D.loops); n.s = R() * n.loop.total; n.lane = R.range(8, 10); n.spd = (n.kind === 'cyclo' ? 6 : 14) * R.range(0.8, 1.15);
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
  }
}
const flat = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
const has = (t, words) => new RegExp('(^|[^a-z0-9])(' + words + ')(?=$|[^a-z0-9])').test(t);
function onChat(u, text) {
  const P = ensurePlayer(u); if (!P) return;
  const t = flat(text), raw = text.trim().toLowerCase();
  for (const T of TEAMS) if (T.key.some(k => t === flat(k) || raw === k || t === 'phe ' + flat(k) || t === 'doi ' + flat(k))) { setTeam(P, T.id); break; }
  // lệnh điều khiển nhân vật bằng bình luận
  const rideCmd = has(t, 'xuong xe|di bo') ? 'off' : has(t, 'len xe|ngoi xe|chay xe') ? 'on' : null;
  if (rideCmd && now - (P.rideAt || -9) > 2) {   // lên / xuống xe: giới hạn riêng 2 giây
    P.rideAt = now;
    if (rideCmd === 'off' && P.plat) { P.onFoot = true; mount(P); react(P, 'vay_tay', 1); }
    else if (rideCmd === 'on' && P.onFoot && P.tier > 0) { P.onFoot = false; mount(P); }
  } else if (!rideCmd && now - P.gestAt > 4) {
    if (has(t, 'chao|hello|hi|hey|alo|xin chao')) { P.gestAt = now; react(P, 'vay_tay', 2); }
    else if (/(ha ?ha|hi ?hi|he ?he|kk+|=\)\)|lol|cuoi)/.test(t)) { P.gestAt = now; react(P, 'vo_tay', 2); }
    else if (has(t, 'nhay|dance|quay|bung')) { P.gestAt = now; if (P.sit) standUp(P); P.dance = now + 6; }
    else if (has(t, 'chay|run|len ga|nitro|tang toc')) { P.gestAt = now; if (P.sit) standUp(P); P.boost = now + 4; }
    else if (has(t, 'ngoi|sit|nghi|ngoi xuong') && !P.plat) { P.gestAt = now; P.sit = true; P.sitMove = /bet|om/.test(t) ? 'ngoi_bet' : 'ngoi_xom'; P.laneT = Math.min(10, P.lane + 5); }
    else if (has(t, 'dung|dung day|stand')) { P.gestAt = now; standUp(P); }
    else if (has(t, 'cam on|thank|thanks|cui chao')) { P.gestAt = now; react(P, 'cui_chao', 1); }
    else if (has(t, 'so qua|so|hu hu|ghe')) { P.gestAt = now; react(P, 'run_so', 2); }
    else if (has(t, 'kia|nhin kia|chi|day ne')) { P.gestAt = now; react(P, 'chi_tay', 1); }
  }
  if (text.trim()) { P.say = text.trim().slice(0, 48); P.sayUntil = now + 4.5; }
  if (now - P.chatAt > 8) { P.chatAt = now; addPower(P.team, 0.6); }
  if (boss) hitBoss(P, 3);
}
function onLike(u, n) {
  const P = ensurePlayer(u); if (!P) return;
  addPower(P.team, n * 0.05);
  if (P.person && R() < 0.6) { const p = posOf(P, _w); for (let i = 0; i < Math.min(3, n); i++) fx.spark.emit(p.x, p.y + P.person.height + 1, p.z, R.range(-2, 2), R.range(4, 8), R.range(-2, 2), 0xff4f9a, 4, 1.1, 0); }
  if (boss) hitBoss(P, n);
  else { goalNow += n; if (goalNow >= CFG.goal && phase === 'play') { goalNow = 0; startBoss(); } }
}
function onFollow(u) {
  const P = ensurePlayer(u); if (!P) return;
  addPower(P.team, 5); feed(`<b>${esc(P.name)}</b> đã follow ❤️`, P);
  if (P.person) { const p = posOf(P, _w); fx.firework(p.x, p.z, teamCol(P.team), 30); }
  fx.after(0.8, () => react(P, 'cui_chao', 1));
}
function onShare(u) {
  const P = ensurePlayer(u); if (!P) return;
  addPower(P.team, 5); feed(`<b>${esc(P.name)}</b> chia sẻ LIVE ↗`, P);
  react(P, 'vay_tay', 2);
}
function onGift(u, gift, count, value, total) {
  const P = ensurePlayer(u); if (!P) return;
  const oldTier = P.tier;
  P.coins = Math.max(P.coins + value, total || 0);
  P.tier = tierOf(P.coins); P.hot = now + 25;
  addPower(P.team, value);
  if (boss) hitBoss(P, value * 3);
  const gname = gift.name || 'quà';
  P.boost = now + 3 + Math.min(5, value / 20);
  audio.play(value >= 30 ? 'cash' : 'coin');
  if (value >= 10 || R() < 0.5) voice.say(`Cảm ơn ${P.name} tặng ${count} ${gname}`);
  if (value >= 5 || P.coins === value) spotlight(P, gift, count);
  else feed(`<b>${esc(P.name)}</b> tặng ${gift.img ? `<img class="g" src="${esc(gift.img)}" alt="">` : '🎁'} x${count}`, P);
  if (P.tier !== oldTier) {
    P.onFoot = false;
    if (P.person) mount(P);
    audio.play('level');
    const T = TIERS[P.tier];
    say(line('upgrade', { name: P.name, veh: T.icon + ' ' + T.name }));
    if (P.person) fx.burst(posOf(P, new V3()).add(new V3(0, 4, 0)), 0xffd23a, 60, 18, 4, 0.9);
  }
  let kind = null;
  if (value >= 5000) kind = 'king'; else if (value >= 1000) kind = 'capture'; else if (value >= 500) kind = 'money';
  else if (value >= 299) kind = 'airdrop'; else if (value >= 99) kind = 'chase'; else if (value >= 30) kind = 'flashmob';
  if (value >= 30 && curD().mouth) breathe(P);
  if (kind) { bigQ.push({ kind, P, value }); if (bigQ.length > 8) { bigQ.sort((a, b) => b.value - a.value); bigQ.length = 8; } }
  else if (P.person) { react(P, value >= 5 ? 'cui_chao' : 'vay_tay', 1); if (value >= 5) focus({ type: 'portrait', P }, 3.6, 1); }
  leaderDirty = true;
}

// ---------- sự kiện lớn: cả phố cùng phản ứng ----------
function runBig() {
  if (!bigQ.length || now < busyUntil || phase !== 'play') return;
  const e = bigQ.shift(), P = e.P;
  if (!P.person) { if (!P.loading) spawnPerson(P); bigQ.unshift(e); busyUntil = now + 0.5; return; }
  const D = curD(), p = posOf(P, new V3());
  if (e.kind === 'flashmob') {
    busyUntil = now + 7; P.dance = now + 6.5;
    const n = danceAround(p, 90, 12, 6.5);
    banner('FLASH MOB!', `${n > 1 ? n - 1 + ' người' : 'Cả phố'} nhảy cùng ${P.name}`, '#ff2e88'); audio.play('level');
    focus({ type: 'orbit', follow: P, atY: 3, r: 15, h: 6, speed: 0.35 }, 7, 2);
  } else if (e.kind === 'chase') {
    busyUntil = now + 12; P.chased = now + 12; P.boost = now + 12;
    for (let k = 0; k < 3; k++) {
      const g = TIERS[P.tier].air && P.plat ? buildVehicle(5, 0x111111, 0xff2020) : buildGoon();
      scene.add(g); goons.push({ veh: g, P, k, until: now + 11, yaw: P.yaw, s: P.s - 18 * (k + 1), lane: [4, 9, 6.5][k] });
    }
    banner('TRUY NÃ ⭐⭐⭐', `Hắc Long treo thưởng ${P.name}!`, '#ff3030');
    say(line('chase', { name: P.name }), true); audio.play('alarm');
    crowd('chi_tay', p, 80, 4, 1, O => O !== P);
    focus({ type: 'follow', P, far: 1.5 }, 11, 2);
    fx.after(11.2, () => {
      for (const g of goons.splice(0)) { fx.explosion(g.veh.position.clone().add(new V3(0, 2, 0)), 0.6); scene.remove(g.veh); }
      audio.play('explode'); addPower(P.team, 40); react(P, 'vo_tay', 2);
      say(line('escaped', { name: P.name }));
    });
  } else if (e.kind === 'airdrop') {
    busyUntil = now + 9;
    const heli = buildVehicle(5, teamCol(P.team), teamCol(P.team)); scene.add(heli);
    const tgt = p.clone().setY(0), from = tgt.clone().add(new V3(-260, 70, -120)), to = tgt.clone().add(new V3(260, 80, 120));
    choppers.push({ veh: heli, from, to, t: 0, dur: 6, dropped: false, tgt, team: P.team, P });
    audio.play('chopper'); react(P, 'chi_tay', 1);
    banner('THẢ HÀNG!', `Trực thăng tiếp tế cho ${TEAMS[P.team].name}, quà của ${P.name}`, TEAMS[P.team].color);
    say(line('airdrop', { name: P.name, team: TEAMS[P.team].name }), true);
    focus({ type: 'track', obj: heli, back: 60, h: 25 }, 3.2, 2);
    fx.after(3.2, () => focus({ type: 'orbit', at: tgt.clone().setY(4), r: 45, h: 18, speed: 0.4 }, 5.5, 2));
  } else if (e.kind === 'money') {
    busyUntil = now + 7; P.dance = now + 6.5;
    fx.cash.drop(p.x, p.z, 80, 240, 90);
    danceAround(p, 90, 12, 6);
    banner('MƯA TIỀN!', `Đại gia ${P.name} rải tiền khắp ${D.def.name}`, '#3ae08a');
    say(line('money', { name: P.name }), true);
    for (let i = 0; i < 6; i++) fx.after(i * 0.6, () => audio.play('cash'));
    focus({ type: 'orbit', follow: P, atY: 3, r: 16, h: 7, speed: 0.3 }, 7, 2);
    addPower(P.team, 60);
  } else if (e.kind === 'capture') {
    busyUntil = now + 6;
    world.districts[0].board.set('ĐẠI GIA', P.name, '#ffd23a');
    for (let i = 0; i < 8; i++) fx.after(i * 0.35, () => fx.firework(p.x + R.range(-60, 60), p.z + R.range(-60, 60), teamCol(P.team)));
    react(P, 'cui_chao', 1); crowd('vo_tay', p, 200, 15, 2, O => O.team === P.team && O !== P);
    focus({ type: 'portrait', P }, 3, 2); fx.after(3, () => focus({ type: 'orbit', follow: P, atY: 3, r: 22, h: 10, speed: 0.3 }, 3, 2));
    addPower(P.team, CFG.cap * 2);
  } else if (e.kind === 'king') {
    busyUntil = now + 13;
    crownKing(P);
  }
}
function crownKing(P) {
  const D = curD();
  king = P;
  if (statue) statue.obj.removeFromParent();
  const obj = new THREE.Group(); obj.position.copy(D.plaza); scene.add(obj);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), new THREE.MeshLambertMaterial({ color: 0x3a3a44 })); plinth.position.y = 3.5; obj.add(plinth);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(15, 0.6, 15), new THREE.MeshPhongMaterial({ color: 0xffc23a, emissive: 0x4a2a00, shininess: 120 })); rim.position.y = 7.2; obj.add(rim);
  obj.scale.setScalar(0.01);
  statue = { obj, P, d: cur };
  template(P.tp).then(tpl => { if (statue && statue.obj === obj) { const g = goldStatue(tpl, 'vay_tay', 0.45); g.root.position.y = 7.5; g.root.scale.setScalar(1.8); obj.add(g.root); } }).catch(() => {});
  banner('TRÙM XỨ RỒNG', `${P.name} được đúc tượng vàng!`, '#ffd23a');
  say(line('king', { name: P.name }), true); audio.play('roar'); audio.duck(4);
  world.districts[0].board.set('TRÙM XỨ RỒNG', P.name, '#ffd23a');
  for (let i = 0; i < 16; i++) fx.after(0.5 + i * 0.4, () => fx.firework(D.plaza.x + R.range(-100, 100), D.plaza.z + R.range(-100, 100), R.pick([0xffd23a, 0xff2e88, 0x22e0ff, 0xffffff])));
  P.dance = now + 12;
  crowd('vo_tay', posOf(P, new V3()), 300, 20, 3, O => O !== P);
  focus({ type: 'orbit', at: D.plaza.clone().setY(14), r: 34, h: 8, speed: 0.3 }, 6, 3);
  fx.after(6, () => focus({ type: 'portrait', P }, 6, 3));
  addPower(P.team, CFG.cap * 2);
}
// ---------- Cầu Rồng phun lửa ----------
let fireAt = 25, fireCool = 0, firePending = 0;
function breathe(P) {
  const D = curD(); if (!D.mouth || phase !== 'play') return;
  if (now < fireCool) { if (P && firePending < 2) { firePending++; fx.after(fireCool - now + 0.15, () => { firePending--; breathe(P); }); } return; }
  fireCool = now + 2.6; fireAt = now + 24;
  const m = D.mouth, d = D.mouthDir;
  for (let i = 0; i < 50; i++) fx.after(i * 0.045, () => {
    for (let k = 0; k < 4; k++) { const sp = 45 + R() * 30; fx.spark.emit(m.x, m.y, m.z, d.x * sp + R.range(-6, 6), d.y * sp + R.range(-4, 8), d.z * sp + R.range(-8, 8), R.pick([0xff5a1a, 0xffa020, 0xffe060, 0xff3010]), R.range(7, 13), R.range(0.7, 1.1), 6); }
    if (i % 3 === 0) fx.smokePuff(m.clone().addScaledVector(d, 40), 0x555555, 1, 14);
  });
  fx.flash(m.clone().addScaledVector(d, 10), 0xffa030, 60);
  audio.play('roar'); audio.play('nitro');
  crowd('chi_tay', m.clone().setY(0), 260, 6);
  if (P) { banner('RỒNG PHUN LỬA!', `${P.name} đánh thức Cầu Rồng`, '#ff8a2a'); addPower(P.team, 10); }
  focus({ type: 'orbit', at: m.clone().addScaledVector(d, 18), r: 70, h: 12, speed: 0.25 }, 4.5, P ? 2 : 0);
}
function updateEvents(dt) {
  if (curD().mouth && phase === 'play' && now > fireAt) breathe();
  for (const g of goons) {
    const P = g.P; if (!P.person) continue;
    if (TIERS[P.tier].air && P.plat) {
      const v = posOf(P, _w2), back = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
      const tgt = v.clone().addScaledVector(back, 22 * (g.k + 1)).add(new V3((g.k - 1) * 12, -4, 0));
      g.veh.position.lerp(tgt, 1 - Math.exp(-3 * dt)); g.veh.rotation.y = P.yaw; if (g.veh.userData.rotor) g.veh.userData.rotor.rotation.y += dt * 30;
    } else {
      const lag = 16 * (g.k + 1) - Math.min(8, (now - (g.until - 11)) * 0.8);
      g.s = lerp(g.s, P.s - lag, 1 - Math.exp(-2 * dt));
      const a = P.loop.at(g.s, g.lane, _a); g.veh.position.set(a.x, 0, a.z); g.yaw = angDamp(g.yaw, a.yaw, 8, dt); g.veh.rotation.y = g.yaw;
      for (const w of g.veh.userData.wheels) w.rotation.y += 30 * dt;
      if (R() < 0.15) fx.smokePuff(g.veh.position.clone().add(new V3(0, 1, 0)), 0x777777, 1, 6);
    }
  }
  for (let i = choppers.length - 1; i >= 0; i--) {
    const c = choppers[i]; c.t += dt; const k = c.t / c.dur;
    c.veh.position.lerpVectors(c.from, c.to, k); c.veh.rotation.y = Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z);
    c.veh.userData.body.rotation.x = 0.2; c.veh.userData.rotor.rotation.y += dt * 30;
    if (!c.dropped && k > 0.45) {
      c.dropped = true;
      for (let j = 0; j < 3; j++) { const cr = buildCrate(teamCol(c.team)); cr.position.copy(c.veh.position).add(new V3(R.range(-6, 6), -6, R.range(-6, 6))); scene.add(cr); crates.push({ obj: cr, tx: c.tgt.x + R.range(-30, 30), tz: c.tgt.z + R.range(-30, 30), landed: 0, team: c.team }); }
    }
    if (k >= 1) { scene.remove(c.veh); choppers.splice(i, 1); }
  }
  for (let i = crates.length - 1; i >= 0; i--) {
    const c = crates[i], o = c.obj;
    if (!c.landed) {
      o.position.x = lerp(o.position.x, c.tx, dt * 0.6); o.position.z = lerp(o.position.z, c.tz, dt * 0.6);
      o.position.y = Math.max(0, o.position.y - dt * 12); o.rotation.y += dt * 0.5; o.userData.chute.rotation.z = Math.sin(now * 2 + i) * 0.1;
      if (o.position.y <= 0) {
        c.landed = now; o.userData.chute.visible = false;
        fx.coins(o.position.clone().add(new V3(0, 3, 0)), 50); fx.burst(o.position.clone().add(new V3(0, 3, 0)), teamCol(c.team), 50, 20, 4, 0.9);
        audio.play('coin'); addPower(c.team, 15); crowd('vo_tay', o.position, 60, 4);
      }
    } else if (now - c.landed > 2.5) { scene.remove(o); crates.splice(i, 1); }
  }
  if (statue) { const s = statue.obj.scale.x; if (s < 1) statue.obj.scale.setScalar(Math.min(1, s + dt * 0.8)); statue.obj.rotation.y += dt * 0.2; }
}
function clearEvents() {
  for (const g of goons.splice(0)) scene.remove(g.veh);
  for (const c of choppers.splice(0)) scene.remove(c.veh);
  for (const c of crates.splice(0)) scene.remove(c.obj);
  for (const P of players.values()) { P.chased = 0; P.dance = 0; }
  cam.focus = null; busyUntil = 0;
}

// ---------- boss Hắc Long ----------
function startBoss() {
  if (boss || phase !== 'play') return;
  const D = curD(), loop = D.loops.reduce((a, b) => (b.total > a.total ? b : a)), veh = buildBoss();
  scene.add(veh);
  const hp = Math.max(CFG.bossHp, CFG.bossHp * 0.6 + players.size * 30);
  boss = { veh, loop, s: R() * loop.total, yaw: 0, hp, max: hp, t: 75, dmg: new Map(), taunt: now + 14, hitAt: 0 };
  hud.classList.add('boss-on');
  banner('BOSS XUẤT HIỆN', `Đại ca Hắc Long đang càn quét ${D.def.name}`, '#ffc23a');
  say(line('bossIn'), true); audio.play('alarm'); audio.setSong('boss');
  crowd('giat_minh', D.center, 600, 40);
  fx.after(2, () => crowd('run_so', D.center, 600, 8, 2));
  focus({ type: 'track', obj: veh, back: 40, h: 16 }, 5, 3);
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
  danceAround(curD().center, 600, 40, 5);
  if (mvp) { addPower(mvp.team, CFG.cap * 0.6); voice.say(`${mvp.name} là người hạ gục Hắc Long`); if (mvp.person) fx.after(1.5, () => focus({ type: 'portrait', P: mvp }, 4, 3)); }
  focus({ type: 'orbit', at: p.clone().setY(8), r: 60, h: 30, speed: 0.3 }, 1.5, 3);
  const b = boss; fx.after(1.2, () => scene.remove(b.veh));
  endBoss();
}
function endBoss() { boss = null; hud.classList.remove('boss-on'); audio.setSong(curD().def.key); }
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
    crowd('nhin_quanh', curD().center, 600, 30);
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
    audio.play('win');
    crowd('vo_tay', D.center, 700, 40, 3, O => O.team === team);
    crowd('nhin_quanh', D.center, 700, 40, 1, O => O.team !== team);
  } else banner('HOÀ!', `${D.def.name} vẫn chưa có chủ`, '#ffffff');
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
  audio.play('win');
  danceAround(curD().center, 700, 40, 6);
  for (let i = 0; i < 20; i++) fx.after(i * 0.3, () => { const D = curD(); fx.firework(D.center.x + R.range(-200, 200), D.center.z + R.range(-200, 200), w >= 0 ? teamCol(w) : 0xffffff); });
}
let trav = null;
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
  for (const P of players.values()) if (P.person) { P.loop = R.pick(D.loops); P.s = R() * P.loop.total; P.r = D.air.r * R.range(0.55, 1.1); P.sit = false; P.laneT = R.range(1.5, 6.5); placePlayer(P, 0); }
  resetTraffic(); placeHost(); audio.setSong(D.def.key); fireAt = now + 7;
}
function updateRound(dt) {
  phaseT += dt;
  if (phase === 'play') {
    if (!boss && now >= busyUntil) timer -= dt;
    if (Math.abs(tug) >= CFG.cap) capture(tug > 0 ? 1 : 0);
    else if (timer <= 0) capture(Math.abs(tug) < CFG.cap * 0.04 ? -1 : tug > 0 ? 1 : 0);
  } else if (phase === 'captured' && phaseT > 5) {
    if (seasonRound >= DISTRICTS.length) endSeason(); else travel(nextDistrict());
  } else if (phase === 'season' && phaseT > 7) {
    season++; seasonRound = 0;
    for (let i = 0; i < owners.length; i++) { owners[i] = -1; world.setOwner(i, -1); }
    travel(nextDistrict());
  }
}

// ---------- máy quay: bám theo nhân vật ----------
const cam = { pos: new V3(0, 900, 900), look: new V3(), shot: null, until: 0, focus: null };
function focus(shot, dur, prio = 1) {
  if (cam.focus && now < cam.focus.until && cam.focus.prio > prio) return;
  cam.focus = Object.assign(shot, { until: now + dur, prio, t0: now, cut: shot.type === 'portrait' });
  if (shot.P) star = shot.P;
}
function pickShot() {
  const D = curD(), list = [...players.values()].filter(P => P.person);
  let s;
  if (list.length && R() < 0.85) {
    list.sort((a, b) => ((b.hot > now) - (a.hot > now)) || ((b.sayUntil > now) - (a.sayUntil > now)) || (b.coins - a.coins) || (b.last - a.last));
    const P = list[Math.floor(Math.pow(R(), 1.8) * Math.min(list.length, 10))];
    const r = R(), type = r < 0.42 ? 'follow' : r < 0.8 ? 'front' : r < 0.92 ? 'orbit' : 'portrait';
    s = type === 'orbit' ? { type, follow: P, atY: 3, r: 13, h: 5, speed: 0.3, P } : { type, P };
    star = P;
  } else if (R() < 0.7) { const sh = R.pick(D.shots); s = { type: 'preset', p: new V3(...sh.p).add(D.center), l: new V3(...sh.l).add(D.center) }; star = null; }
  else { s = { type: 'top' }; star = null; }
  cam.shot = Object.assign(s, { t0: now, cut: true }); cam.until = now + R.range(6, 9);
}
const dims = P => (!P.plat ? [12, 5.2] : P.tier <= 4 ? [13, 5.8] : P.tier <= 6 ? [17, 6.8] : P.tier === 7 ? [22, 8] : [30, 9]);
const _f = new V3(), _r = new V3(), _b = {}, _p = new V3(), _face = new V3();
function shotTarget(s, outP, outL) {
  const D = curD();
  if (s.type === 'follow' || s.type === 'front' || s.type === 'portrait') {
    const P = s.P; if (!P || !P.person) return false;
    const p = posOf(P, _p), [dist0, h] = dims(P), dist = dist0 * (s.far || 1);
    _f.set(Math.sin(P.yaw), 0, Math.cos(P.yaw)); _r.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    const walker = !P.plat && P.loop;
    if (s.type === 'follow') {
      if (walker && !P.sit) { const b = P.loop.at(P.s - dist, P.lane * 0.5, _b); outP.set(b.x, h, b.z); }   // bám theo con đường phía sau → không chui vào nhà
      else outP.copy(p).addScaledVector(_f, -dist).add(new V3(0, h, 0));
      outL.copy(p).addScaledVector(_f, 4).add(new V3(0, P.plat ? 3 : 3.4, 0));
    } else if (s.type === 'front') {
      if (walker && !P.sit) { const b = P.loop.at(P.s + dist * 0.85, P.lane * 0.5, _b); outP.set(b.x, 4.4, b.z); }
      else { P.person.root.getWorldQuaternion(_q); _face.set(0, 0, 1).applyQuaternion(_q).setY(0).normalize(); outP.copy(p).addScaledVector(_face, dist * 0.85).add(new V3(0, h * 0.6, 0)).addScaledVector(_r, 2); }
      outL.copy(p).add(new V3(0, 3.6, 0));
    } else {   // cận mặt
      P.person.root.getWorldQuaternion(_q); _face.set(0, 0, 1).applyQuaternion(_q).setY(0).normalize();
      _r.set(_face.z, 0, -_face.x);
      const car = P.plat && P.tier >= 5 && P.tier <= 6;   // ô tô: đặt máy cao, xa hơn nắp capô
      outP.copy(p).addScaledVector(_face, car ? 10 : 7.5).addScaledVector(_r, car ? 3 : 1.6).add(new V3(0, car ? 6.4 : 4.4, 0)); outL.copy(p).add(new V3(0, 3.9, 0));
    }
    if (outP.y < 1.5) outP.y = 1.5;
    return true;
  }
  if (s.type === 'track') { const v = s.obj; if (!v || !v.parent) return false; const yaw = v.rotation.y; _f.set(Math.sin(yaw), 0, Math.cos(yaw)); outP.copy(v.position).addScaledVector(_f, -s.back).add(new V3(0, s.h, 0)); outL.copy(v.position).addScaledVector(_f, 10); return true; }
  if (s.type === 'host') { if (!host || !host.root.parent) return false; const p = host.root.getWorldPosition(_p); host.root.getWorldQuaternion(_q); _face.set(0, 0, 1).applyQuaternion(_q).setY(0).normalize(); outP.copy(p).addScaledVector(_face, 9).add(new V3(2, 4.6, 0)); outL.copy(p).add(new V3(0, 3.8, 0)); return true; }
  if (s.type === 'orbit') {
    let at = s.at;
    if (s.follow) { if (!s.follow.person) return false; at = posOf(s.follow, _p).add(new V3(0, s.atY || 3, 0)); }
    const a = (s.a0 ??= Math.atan2(cam.pos.x - at.x, cam.pos.z - at.z)) + (now - s.t0) * s.speed;
    outP.set(at.x + Math.sin(a) * s.r, at.y + s.h, at.z + Math.cos(a) * s.r); outL.copy(at); return true;
  }
  if (s.type === 'preset') { const t = now - s.t0; outP.copy(s.p).add(new V3(Math.sin(t * 0.2) * 6, t * 0.4, t * 1.2)); outL.copy(s.l); return true; }
  if (s.type === 'top') { const t = now - s.t0; outP.set(D.center.x + Math.sin(t * 0.05) * 60, 260, D.center.z + 200); outL.copy(D.center); return true; }
  return false;
}
const _dp = new V3(), _dl = new V3();
function updateCamera(dt) {
  if (trav) return travelCam(dt);
  let s = cam.focus && now < cam.focus.until ? cam.focus : null;
  if (!s) { if (cam.focus) { cam.focus = null; cam.until = 0; } if (now > cam.until || !cam.shot) pickShot(); s = cam.shot; }
  if (!shotTarget(s, _dp, _dl)) { if (s === cam.focus) cam.focus = null; pickShot(); s = cam.shot; if (!shotTarget(s, _dp, _dl)) return; }
  if (s.cut) { cam.pos.copy(_dp); cam.look.copy(_dl); s.cut = false; }
  const k = s.type === 'orbit' || s.type === 'preset' || s.type === 'top' ? 2 : 4;
  cam.pos.lerp(_dp, 1 - Math.exp(-k * dt)); cam.look.lerp(_dl, 1 - Math.exp(-k * 1.5 * dt));
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
    cam.shot = { type: 'preset', p: land, l: landL, t0: now, cut: false }; cam.until = now + 4;
    const D = B;
    fx.after(3.4, () => {   // chờ thẻ tên khu tắt rồi Chú Bảy mới giới thiệu
      if (cur !== D.idx || phase !== 'play') return;
      say(line('intro', { d: D.def.name, sub: D.def.sub }), true);
      if (host) { host.gesture('chi_tay', 1); focus({ type: 'host' }, 4, 1); }
    });
  }
}

// ---------- HUD ----------
const tagsEl = $('tags'), tagMap = new Map();
const _v = new V3();
function project(p, out) { _v.copy(p).project(camera); if (_v.z > 1 || _v.z < -1) return false; out.x = (_v.x * 0.5 + 0.5) * SW; out.y = (-_v.y * 0.5 + 0.5) * SH; return out.x > -80 && out.x < SW + 80 && out.y > -40 && out.y < SH + 40; }
function avaHtml(P) { return `<div class="ava t${P.team}">${P.avatar ? `<img src="${esc(P.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : esc(initials(P.name))}</div>`; }
function updateTags() {
  const list = [];
  if (!trav) {
    for (const P of players.values()) {
      if (!P.person || (P === spotP && now < spotUntil)) continue;   // đang có thẻ tiêu điểm thì khỏi hiện thẻ tên
      const d = camera.position.distanceTo(posOf(P, _w)), pri = (P === star ? 3 : 0) + (P.sayUntil > now ? 2 : 0) + (P.hot > now ? 1 : 0) + (P === king ? 1 : 0);
      if (d > (pri ? 160 : 70)) continue;
      list.push({ P, d: d - pri * 60 });
    }
    list.sort((a, b) => a.d - b.d); list.length = Math.min(list.length, 6);
  }
  const seen = new Set(), o = {};
  for (const { P } of list) {
    const p = posOf(P, _w).add(new V3(0, P.person.height + 0.9, 0));
    if (!project(p, o)) continue;
    let el = tagMap.get(P.id);
    const talk = P.sayUntil > now ? P.say : '';
    const sig = P.name + P.team + P.tier + starsOf(P.coins) + (P === king) + !!P.avatar + talk;
    if (!el) { el = document.createElement('div'); el.className = 'tg'; tagsEl.appendChild(el); tagMap.set(P.id, el); }
    if (el._sig !== sig) {
      el._sig = sig; const st = starsOf(P.coins);
      el.className = `tg t${P.team}${P === king ? ' king' : ''}`;
      el.innerHTML = `${avaHtml(P)}<span>${P === king ? '👑 ' : ''}${esc(P.name)}</span>${st ? `<span class="st">${'⭐'.repeat(st)}</span>` : ''}${talk ? `<div class="bb">💬 ${esc(talk)}</div>` : ''}`;
    }
    const sc = clamp(26 / camera.position.distanceTo(p), 0.6, 1.15);
    el.style.transform = `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px) translate(-50%, -100%) scale(${sc.toFixed(3)})`;
    el.style.display = ''; seen.add(P.id);
  }
  for (const [id, el] of tagMap) if (!seen.has(id)) { if (!players.has(id) || !players.get(id).person) { el.remove(); tagMap.delete(id); } else el.style.display = 'none'; }
  extraTag('statue', statue && statue.d === cur && !trav ? statue.obj.position.clone().add(new V3(0, 26, 0)) : null, statue ? `👑 TRÙM: ${esc(statue.P.name)}` : '');
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
DISTRICTS.forEach(d => { const el = document.createElement('div'); el.className = 'ml'; el.innerHTML = `<b>${d.icon} ${esc(d.name)}</b><i></i>`; el.style.opacity = 0; labelsEl.appendChild(el); labelEls.push(el); });
function labelsOn(on, dest) {
  const o = {};
  world.districts.forEach((D, i) => {
    const el = labelEls[i];
    if (!on || !project(D.label, o)) { el.style.opacity = 0; return; }
    el.className = `ml${owners[i] >= 0 ? ' o' + owners[i] : ''}${i === dest ? ' dest' : ''}`;
    el.style.left = o.x + 'px'; el.style.top = o.y + 'px'; el.style.opacity = 1;
  });
}
let lastTop = '';
function renderTop() {
  const D = curD().def, m = Math.max(0, Math.ceil(timer)), n = teamCount();
  const own = [owners.filter(o => o === 0).length, owners.filter(o => o === 1).length];
  const sig = [cur, m, own, Math.round(tug), n, Math.round(goalNow / CFG.goal * 100)].join('|');
  if (sig === lastTop) return; lastTop = sig;
  $('dname').textContent = `${D.icon} ${D.name}`; $('dtime').textContent = D.time;
  const t = $('timer'); t.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; t.classList.toggle('hot', m <= 10 && phase === 'play');
  const red = (CFG.cap - tug) / (2 * CFG.cap) * 100;
  hud.querySelector('#tug .r').style.width = red + '%'; hud.querySelector('#tug .b').style.width = (100 - red) + '%'; hud.querySelector('#tug .mid').style.left = red + '%';
  $('nRed').textContent = n[0]; $('nBlue').textContent = n[1]; $('score').textContent = `${own[0]} – ${own[1]}`;
  $('gBar').style.width = clamp(goalNow / CFG.goal * 100, 0, 100) + '%';
}
let leaderDirty = true, lastTop1 = '';
function renderStrip() {
  if (!leaderDirty) return; leaderDirty = false;
  const top = [...players.values()].filter(P => P.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 3);
  $('strip').innerHTML = top.map((P, i) => `${['👑', '🥈', '🥉'][i]} <b>${esc(P.name)}</b> ${fmt(P.coins)}`).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
  const t1 = top[0];
  if (t1 && t1.id !== lastTop1) { lastTop1 = t1.id; if (!king) world.districts[0].board.set('TOP 1 XỨ RỒNG', t1.name, '#ffd23a'); }
}
function renderBoss() { if (!boss) return; $('bossHp').style.width = clamp(boss.hp / boss.max * 100, 0, 100) + '%'; $('bossT').textContent = Math.ceil(boss.t) + 's'; }
// bản đồ nhỏ: chỉ khi bay
const mapC = $('map'), mx = mapC.getContext('2d');
const MB = { x0: -1980, x1: 2320, z0: -1420, z1: 1620 }, MS = 300 / Math.max(MB.x1 - MB.x0, MB.z1 - MB.z0);
const m2c = (x, z) => [150 + (x - (MB.x0 + MB.x1) / 2) * MS, 150 + (z - (MB.z0 + MB.z1) / 2) * MS];
function renderMap() {
  const show = !!trav || phase === 'captured' || phase === 'season';
  $('mini').classList.toggle('on', show); if (!show) return;
  mx.fillStyle = '#25381f'; mx.fillRect(0, 0, 300, 300);
  const [sx] = m2c(1360, 0); mx.fillStyle = '#1d4f86'; mx.fillRect(sx, 0, 300 - sx, 300);
  mx.strokeStyle = '#2f6fb0'; mx.lineWidth = 6; mx.lineJoin = 'round'; mx.beginPath(); RIVER.forEach((p, i) => { const [x, y] = m2c(p[0], p[1]); i ? mx.lineTo(x, y) : mx.moveTo(x, y); }); mx.stroke();
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
}
// hướng dẫn: một dòng đổi liên tục
const GUIDE = [
  ['🌹', '1 xu', 'nhân vật chạy nhanh + điểm cho phe'],
  ['🍩', '30 xu', 'flash mob: cả phố nhảy theo bạn'],
  ['🎩', '99 xu', 'Hắc Long truy nã, chạy thoát đàn em'],
  ['🐶', '299 xu', 'trực thăng thả hàng cho phe'],
  ['💸', '500 xu', 'mưa tiền cả khu'],
  ['🌌', '1.000 xu', 'mua đứt khu ngay'],
  ['🦁', '5.000 xu', 'đúc tượng vàng nhân vật của bạn'],
  ['🚗', 'tổng xu', 'lên đời xe: 🚲 → 🛵 → 🏍️ → 🚗 → 🏎️ → 🚁 → 🐉'],
  ['💬', 'gõ', 'chào · nhảy · chạy · ngồi · 1 / 2'],
  ['🛵', 'gõ', 'xuống xe · lên xe'],
  ['❤️', 'thả tim', 'đủ mục tiêu → đánh Boss Hắc Long'],
];
let guideI = 0;
function renderGuide() { const [i, c, d] = GUIDE[guideI]; const el = $('grows'); el.innerHTML = `${i} <b>${c}</b> ${d}`; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; guideI = (guideI + 1) % GUIDE.length; }
// quà nhỏ
const feedEl = $('feed');
function feed(html, P) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = (P ? avaHtml(P) : '') + `<span>${html}</span>`;
  feedEl.prepend(el); while (feedEl.children.length > 2) feedEl.lastChild.remove();
  setTimeout(() => el.remove(), 4500);
}
// thẻ tiêu điểm: người vừa tặng quà
const spotEl = $('spot'); let spotUntil = 0, spotP = null;
function spotlight(P, gift, count) {
  spotEl.querySelector('.ava').outerHTML = avaHtml(P);
  spotEl.querySelector('.txt b').textContent = P.name;
  spotEl.querySelector('.txt span').textContent = `tặng ${gift.name || 'quà'} x${count}`;
  spotEl.querySelector('.gift').innerHTML = gift.img ? `<img src="${esc(gift.img)}" alt="">` : '🎁';
  spotEl.classList.add('on'); spotUntil = now + 3.6; spotP = P;
}
// hội thoại
const dlg = $('dialog'), dq = [];
let dlgUntil = 0, titleUntil = 0, bannerUntil = 0;
function say(l, speak = false) { dq.push({ ...l, speak }); if (dq.length > 4) dq.splice(0, dq.length - 4); }
function updateDialog() {
  if (spotEl.classList.contains('on') && now > spotUntil) spotEl.classList.remove('on');
  if (now < titleUntil || now < spotUntil || now < bannerUntil) { if (dlg.classList.contains('on')) { dlg.classList.remove('on'); dlgUntil = 0; } return; }   // nhường chỗ cho thẻ tên khu / thẻ tiêu điểm
  if (now < dlgUntil) return;
  if (dlg.classList.contains('on')) { dlg.classList.remove('on'); dlgUntil = now + 0.45; return; }
  const l = dq.shift(); if (!l) return;
  const c = CAST[l.who];
  dlg.querySelector('.por').innerHTML = portrait(l.who, 120);
  dlg.querySelector('.who').textContent = c.name;
  dlg.querySelector('.who').style.color = c.color === '#ffc23a' ? '#a87a00' : c.color;
  dlg.querySelector('.say').textContent = l.text;
  dlg.classList.add('on'); dlgUntil = now + clamp(l.text.length * 0.065, 3, 5.5);
  if (l.speak) voice.say(l.text, true);
}
let idleAt = 30;
function banner(k, s, color) {
  const b = $('banner'); b.querySelector('.k').textContent = k; b.querySelector('.s').textContent = s || '';
  b.style.setProperty('--c', color || '#ff2e88'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); bannerUntil = now + 3;
}
function showTitle(D) {
  const t = $('title'); t.querySelector('.nm').textContent = D.def.name; t.querySelector('.sb').textContent = D.def.sub;
  const o = owners[D.idx]; t.querySelector('.tm').textContent = `🕒 ${D.def.time} · ${o < 0 ? 'Chưa có chủ' : 'Đang thuộc ' + TEAMS[o].name}`;
  t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); titleUntil = now + 3.4;
}
function flash() { const f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

// ---------- lưu tạm (tải lại trang OBS không mất bảng xếp hạng) ----------
const SAVE_KEY = 'sgtk-save-v2';
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
    s.owners.forEach((o, i) => { if (i < owners.length) { owners[i] = o; world.setOwner(i, o); } });
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
function testJoin(n) { for (let i = 0; i < n; i++) setTimeout(() => handleEv({ type: 'chat', user: bot(botN++), text: R.pick(['chào cả nhà', 'hi', '1', '2', 'vào rồi nè', 'xin chào']) }), i * 220); }
const SCRIPT = [[2, () => testJoin(8)], [14, () => testGift(30)], [26, () => testGift(99)], [42, () => testGift(299)], [56, () => testGift(500)], [80, () => testGift(1000)], [118, () => testGift(5000, bot(3))]];
let demoT = 0, scriptI = 0;
function updateDemo(dt) {
  if (!DEMO || phase === 'intro') return;
  demoT += dt;
  while (scriptI < SCRIPT.length && demoT >= SCRIPT[scriptI][0]) SCRIPT[scriptI++][1]();
  if (botN < 16 && R() < dt * 0.5) testJoin(1);
  if (R() < dt * 2) handleEv({ type: 'like', user: randBot(), count: R.int(5, 25) });
  if (R() < dt * 0.25) testGift(R.pick([1, 1, 1, 5, 5, 20]));
  if (demoT > 130 && R() < dt * 0.025) testGift(R.pick([30, 99, 299, 500]));
  if (R() < dt * 0.35) handleEv({ type: 'chat', user: randBot(), text: R.pick(['chào', 'nhảy đi', 'haha', 'chạy', 'ngồi nghỉ', 'đứng dậy', 'đỉnh quá', '1', '2', 'cảm ơn', 'sợ quá', 'nhìn kìa']) });
  if (R() < dt * 0.02) handleEv({ type: 'follow', user: randBot() });
}
const TESTS = [
  ['+10 người', () => testJoin(10)], ['❤️ 300 tim', () => { for (let i = 0; i < 10; i++) setTimeout(() => handleEv({ type: 'like', user: randBot(), count: 30 }), i * 80); }], ['💬 Nhảy đi', () => { for (let i = 0; i < 4; i++) handleEv({ type: 'chat', user: randBot(), text: 'nhảy đi' }); }],
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
  setTimeout(() => say(line('idle')), 14000);
}
$('go').onclick = begin;
document.addEventListener('pointerdown', () => audio.start());
loadRoster().then(list => {
  $('loading').textContent = list.length ? `${list.length} nhân vật đã sẵn sàng` : 'Không tải được nhân vật (kiểm tra thư mục models/ma/nhanvat)';
  for (const x of list.filter(x => x.id !== RESERVED).sort(() => R() - 0.5).slice(0, 6)) template(x.id).catch(() => {});   // tải trước vài người cho nhanh
  if (list.some(x => x.id === RESERVED)) template(RESERVED).then(tpl => { host = new Person(tpl); scene.add(host.root); placeHost(); }).catch(() => {});
  for (const P of players.values()) if (!P.person && P.hot > now) spawnPerson(P);
  if (CFG.obs) begin();
});

// ---------- vòng lặp ----------
load();
resetTraffic(); moveEveryoneTo(cur); audio.setSong(DISTRICTS[cur].key);
for (let i = 0; i < owners.length; i++) world.setOwner(i, owners[i]);
renderGuide(); setInterval(renderGuide, 3500);
setInterval(save, 10000);
let last = performance.now(), slow = 0, afkT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000); last = t; now += dt;
  if (phase !== 'intro' || trav) updateRound(dt);
  for (const P of players.values()) if (P.person) placePlayer(P, dt);
  if (host) host.update(dt);
  updateTraffic(dt); updateBoss(dt); updateEvents(dt); runBig(); updateDemo(dt);
  if (phase === 'intro' && !trav) { const a = now * 0.05; cam.pos.set(Math.sin(a) * 1300 + 100, 900, Math.cos(a) * 1300 + 100); cam.look.set(0, 0, 0); }
  else updateCamera(dt);
  camera.position.copy(cam.pos); camera.lookAt(cam.look); camera.updateMatrixWorld();
  if (!trav && phase !== 'intro') moodNow = mixMood(MOODS[curD().def.mood], MOODS[curD().def.mood], 0);
  world.setMood(moodNow, camera.position);
  keyLight.position.copy(camera.position).add(new V3(0, 6, 0)); keyLight.target.position.copy(cam.look); keyLight.intensity = 0.5 + moodNow.night * 1.6;
  const hgt = camera.position.y, fk = moodNow.fogK ?? 1;
  scene.fog.near = lerp(140, 900, clamp(hgt / 900, 0, 1)) * fk; scene.fog.far = lerp(900, 4200, clamp(hgt / 900, 0, 1)) * (0.5 + fk * 0.5);
  world.cloudMat.opacity = clamp((hgt - 150) / 400, 0.15, 0.7); world.cloudMat.color.copy(moodNow.fog).lerp(_white, 1 - moodNow.night * 0.75);
  world.update(dt, now); fx.update(dt);
  $('speed').classList.toggle('on', !!trav && trav.t / trav.dur > 0.25 && trav.t / trav.dur < 0.7);
  updateTags(); updateDialog();
  if (now > idleAt && phase === 'play') { idleAt = now + 50; say(line(R() < 0.5 ? (tug > 0 ? 'rallyRed' : 'rallyBlue') : 'idle')); }
  afkT += dt;
  if (afkT > 2) {   // lâu không tương tác thì ngồi vỉa hè
    afkT = 0;
    for (const P of players.values()) if (P.person && !P.plat && !P.sit && now - P.last > CFG.afk && P.hot < now && P !== star && P.dance < now) { P.sit = true; P.sitMove = R() < 0.5 ? 'ngoi_xom' : 'ngoi_bet'; P.laneT = Math.min(10, P.lane + 5); }
  }
  slow += dt; if (slow > 0.2) { slow = 0; renderTop(); renderStrip(); renderBoss(); renderMap(); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.SGTK = { handleEv, testGift, testJoin, players, CFG, go: i => travel(i), view: (id, type = 'portrait', d = 8) => { const P = players.get(id); if (P) focus({ type, P, follow: P, atY: 3, r: 18, h: 6, speed: 0.3 }, d, 9); }, coins: (id, c) => { const P = ensurePlayer({ id, name: id }); P.coins = c; P.tier = tierOf(c); P.hot = now + 60; if (P.person) mount(P); }, king: id => { const P = players.get(id); if (P && P.person) crownKing(P); }, statue: () => { if (!statue) return; focus({ type: 'orbit', at: statue.obj.position.clone().setY(14), r: 30, h: 6, speed: 0.3 }, 8, 9); cam.focus.cut = true; }, boss: () => { phase = 'play'; startBoss(); }, get phase() { return phase; }, get cam() { return { f: cam.focus && { type: cam.focus.type, prio: cam.focus.prio, left: +(cam.focus.until - now).toFixed(1), at: cam.focus.at && cam.focus.at.toArray().map(Math.round) }, pos: cam.pos.toArray().map(Math.round), look: cam.look.toArray().map(Math.round), statue: statue && statue.obj.position.toArray().map(Math.round), phase }; }, get star() { return star && star.name; } };
