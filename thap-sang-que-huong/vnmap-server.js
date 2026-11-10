// Thắp Sáng Quê Hương — chế độ bản đồ Việt Nam cho TikTok LIVE.
// Máy chủ giữ toàn bộ trạng thái (tải lại màn hình / khởi động lại không mất điểm).
const VN = require('./public/vnmap/provinces.js');

const DEFAULT_CFG = {
  title: 'THẮP SÁNG QUÊ HƯƠNG',
  subtitle: 'Bình luận tên tỉnh, thành quê bạn để thắp đèn',
  theme: 'dem-sao',
  mode3d: false,
  lite: false,
  zoomOn: true,            // zoom vào tỉnh vừa được cộng điểm
  zoomScale: 2.2,
  roundMin: 5,             // mỗi vòng đua (phút)
  commentPts: 1,
  chatCooldown: 4,         // giây — chống spam: cùng người cùng tỉnh chỉ cộng điểm mỗi 4s
  tiers: [[1, 3], [5, 30], [30, 100], [100, 500], [1000, 2000]],   // [xu tối thiểu mỗi quà, điểm]
  likeEvery: 50,           // mỗi 50 tim của 1 người → +1 điểm cho quê người đó
  followPts: 5, sharePts: 3,
  shareCooldown: 10,       // chống spam chia sẻ: mỗi người chỉ được cộng điểm chia sẻ 1 lần / 10 phút
  shareMax: 3,             // và tối đa 3 lần mỗi phiên (theo dõi chỉ tính 1 lần / người / phiên)
  countryCoins: 10000,     // tổng xu cả buổi → cả nước rực sáng
  waveLikes: 1000,         // mỗi 1000 tim cả phòng → Sóng tim thắp 1 tỉnh còn tối
  battleEvery: 7, battleSec: 90, battleBonus: 100,
  luckyEvery: 4, luckySec: 60,
  quizEvery: 5, quizSec: 40, quizPts: 50,
  hotUsers: 3, hotWindow: 20, hotSec: 30,
  decayMin: 8,             // đèn tắt dần: số phút từ sáng nhất tới tắt nếu không ai giữ lửa (0 = không tắt)
  autoSeason: true,        // sáng đủ 34 tỉnh → ăn mừng rồi tự sang mùa mới
  seasonDelay: 20,         // giây ăn mừng trước khi mùa mới bắt đầu
  dropEvery: 6, dropSec: 20, dropWinners: 3, dropMin: 20, dropMax: 100, dropWord: 'lộc',
  themeRotate: 10,         // tự đổi giao diện ngẫu nhiên mỗi 10 phút (0 = tắt)
  themeOnSeason: true,     // đổi giao diện khi sang mùa mới
  autoHome: true,          // người quen quay lại (đã từng bình luận quê) tự thắp đèn quê họ
  streakBonus: 5,          // điểm thưởng mỗi ngày chuỗi điểm danh
  mcOn: true, mcVoice: '', mcVol: 1, mcRate: 1,
  mcWelcome: true, mcGift: true, mcIntro: true,
  mcChatty: 2,             // MC tự nói khi phòng im: 1 = ít (60s), 2 = vừa (30s), 3 = nhiều (15s)
  musicOn: true, musicVol: 0.35,
  sfxOn: true, sfxVol: 0.9,  // âm thanh hiệu ứng (cộng điểm, pháo hoa…)
};

module.exports = function setupVnMap({ io, readJSON, writeJSON }) {
  let cfg = Object.assign({}, DEFAULT_CFG, readJSON('vnmap-settings.json', {}));
  const saveCfg = () => writeJSON('vnmap-settings.json', cfg);
  const fans = readJSON('vnmap-fans.json', {});        // uid -> { name, avatar, prov, streak, lastDay, days, total }
  const alltime = readJSON('vnmap-alltime.json', {});  // prov -> { pts, coins, wins }
  let fansDirty = false, allDirty = false;

  const freshProv = () => ({ pts: 0, roundPts: 0, coins: 0, lit: 0, energy: 0, users: [], owner: null, giver: {} });
  function freshState() {
    const provs = {}; for (const p of VN.LIST) provs[p.id] = freshProv();
    const now = Date.now();
    return {
      start: now, provs, users: {}, pending: {}, likes: 0, waveNext: cfg.waveLikes, comments: 0, gifts: 0, coins: 0,
      round: { n: 1, endsAt: now + cfg.roundMin * 60000, winners: [] },
      country: { pool: 0, times: 0 }, lastGift: null, battle: null, lucky: null, quiz: null, hot: {},
      nextBattle: now + cfg.battleEvery * 60000, nextLucky: now + 90000, nextQuiz: now + cfg.quizEvery * 60000,
      milestones: [], newPeople: 0, returning: 0,
      season: 1, seasonDone: 0, seasonWins: [], drop: null, nextDrop: now + cfg.dropEvery * 60000, quizLock: 0,
    };
  }
  let S = readJSON('vnmap-state.json', null);
  // phiên cũ quá 6 tiếng: bắt đầu phiên mới
  if (!S || !S.provs || Date.now() - (S.saved || 0) > 6 * 3600000) S = freshState();
  for (const p of VN.LIST) if (!S.provs[p.id]) S.provs[p.id] = freshProv();
  // hẹn giờ đã quá hạn khi máy tắt → hẹn lại
  { const now = Date.now(); if (S.round.endsAt < now) S.round.endsAt = now + cfg.roundMin * 60000; S.battle = null; S.quiz = null; S.lucky = null; S.nextBattle = now + cfg.battleEvery * 60000; S.nextQuiz = now + cfg.quizEvery * 60000; S.nextLucky = now + 60000; S.drop = null; S.nextDrop = now + cfg.dropEvery * 60000; S.seasonDone = 0; if (!S.season) S.season = 1; if (!S.seasonWins) S.seasonWins = []; for (const p of VN.LIST) { const r = S.provs[p.id]; if (r.energy == null) r.energy = r.lit ? 60 : 0; } }
  let dirty = true;
  const seenSession = new Set(Object.keys(S.users));
  const chatAt = new Map(), likeAcc = new Map(), hotLog = {};
  const today = () => new Date().toISOString().slice(0, 10);

  const fx = (type, data) => io.to('map').emit('vm:fx', Object.assign({ type, at: Date.now() }, data || {}));
  const userCard = u => u ? { id: u.id, name: u.name, avatar: u.avatar || '' } : null;
  const P = id => S.provs[id];
  const pname = id => (VN.BY_ID[id] || {}).name || id;
  const litCount = () => VN.LIST.reduce((n, p) => n + (S.provs[p.id].lit ? 1 : 0), 0);

  function tierPts(diamonds) {
    let pts = 0; for (const [min, p] of cfg.tiers) if (diamonds >= min) pts = p;
    return pts;
  }
  function mult(id) {
    let m = 1; const now = Date.now();
    if (S.lucky && S.lucky.id === id && S.lucky.endsAt > now) m *= 2;
    if (S.hot[id] && S.hot[id] > now) m *= 2;
    return m;
  }

  // cộng điểm cho tỉnh; trả số điểm thực cộng
  function addPts(id, base, user, why) {
    const pr = P(id); if (!pr || base <= 0) return 0;
    const m = mult(id), pts = Math.round(base * m);
    const wasLit = !!pr.lit;
    pr.pts += pts; pr.roundPts += pts;
    if (!wasLit) pr.lit = Date.now();
    pr.energy = Math.min(100, Math.max(wasLit ? pr.energy : 45, pr.energy + pts * 9));
    pr.warned = false;
    if (user && !pr.users.includes(user.id)) { pr.users.push(user.id); if (pr.users.length > 5000) pr.users.shift(); }
    if (S.battle && S.battle.endsAt > Date.now()) { if (S.battle.a === id) S.battle.sa += pts; else if (S.battle.b === id) S.battle.sb += pts; }
    const at = alltime[id] || (alltime[id] = { pts: 0, coins: 0, wins: 0 }); at.pts += pts; allDirty = true;
    if (user) { const u = S.users[user.id]; if (u) u.pts += pts; gainXp(user, pts, id); }
    if (!wasLit) {
      fx('light', { prov: id, user: userCard(user), first: true, pts, why, mult: m, nth: 1, lv: user ? lvOf(user.id) : 0 });
      const n = litCount();
      for (const ms of [5, 10, 17, 25, 30]) if (n >= ms && !S.milestones.includes(ms)) { S.milestones.push(ms); setTimeout(() => fx('milestone', { n: ms, total: VN.COUNT }), 1200); }
      checkSeason();
    }
    dirty = true;
    return pts;
  }

  // cấp người thắp đèn (lưu qua các phiên → có lý do quay lại)
  const levelOf = VN.levelOf;
  function gainXp(user, pts, prov) {
    const f = fans[user.id]; if (!f) return;
    const before = levelOf(f.xp || 0); f.xp = (f.xp || 0) + pts; const after = levelOf(f.xp);
    if (after > before && after >= 2) fx('levelUp', { user: userCard(user), level: after, title: VN.rankName(after, (S.users[user.id] && S.users[user.id].prov) || prov), prov: (S.users[user.id] && S.users[user.id].prov) || prov });
    fansDirty = true;
  }
  const lvOf = uid => levelOf((fans[uid] && fans[uid].xp) || 0);

  // sáng đủ 34 tỉnh cùng lúc → hoàn thành mùa, ăn mừng rồi tự bắt đầu mùa mới
  function checkSeason() {
    if (!cfg.autoSeason || S.seasonDone || litCount() < VN.COUNT) return;
    S.seasonDone = Date.now() + cfg.seasonDelay * 1000;
    const top = sortedBy('pts').slice(0, 3);
    if (top[0]) { S.seasonWins.unshift({ season: S.season, prov: top[0].id }); S.seasonWins = S.seasonWins.slice(0, 20); const at = alltime[top[0].id] || (alltime[top[0].id] = { pts: 0, coins: 0, wins: 0 }); at.seasons = (at.seasons || 0) + 1; allDirty = true; }
    setTimeout(() => fx('seasonEnd', { season: S.season, top, delay: cfg.seasonDelay }), 1500);
    dirty = true;
  }
  function newSeason() {
    S.season++; S.seasonDone = 0; S.milestones = [];
    for (const p of VN.LIST) { const r = S.provs[p.id]; r.pts = 0; r.roundPts = 0; r.lit = 0; r.energy = 0; r.warned = false; }
    S.hot = {}; S.lucky = null; S.battle = null; S.quiz = null; S.drop = null;
    const now = Date.now();
    S.round.endsAt = now + cfg.roundMin * 60000; S.nextBattle = now + cfg.battleEvery * 60000; S.nextLucky = now + 60000; S.nextQuiz = now + cfg.quizEvery * 60000; S.nextDrop = now + Math.max(2, cfg.dropEvery) * 60000;
    fx('seasonStart', { season: S.season }); dirty = true;
    if (cfg.themeOnSeason) rotateTheme();
  }
  const THEME_KEYS = ['dem-sao', 'son-mai', 'cuc-quang', 'neon', 'trung-thu', 'radar', 'tet', 'giay-co', 'bien-xanh', 'hoa-sen'];
  let nextTheme = Date.now() + cfg.themeRotate * 60000;
  function rotateTheme() {
    const pool = THEME_KEYS.filter(k => k !== cfg.theme);
    cfg.theme = pool[Math.floor(Math.random() * pool.length)];
    nextTheme = Date.now() + cfg.themeRotate * 60000;
    saveCfg(); io.emit('vm:cfg', cfg); fx('theme', { theme: cfg.theme }); dirty = true;
  }
  setInterval(() => { if (cfg.themeRotate > 0 && Date.now() >= nextTheme && !S.battle && !S.quiz && !S.drop) rotateTheme(); else if (!(cfg.themeRotate > 0)) nextTheme = Date.now() + 60000; }, 5000);

  function touchUser(user, prov) {
    let u = S.users[user.id];
    if (!u) { u = S.users[user.id] = { id: user.id, name: user.name, avatar: user.avatar || '', prov: null, pts: 0, coins: 0 }; }
    u.name = user.name; if (user.avatar) u.avatar = user.avatar;
    if (prov) u.prov = prov;
    const f = fans[user.id] || (fans[user.id] = { name: user.name, prov: null, streak: 0, lastDay: '', days: 0, total: 0 });
    f.name = user.name; if (user.avatar) f.avatar = user.avatar;
    if (prov) f.prov = prov;
    if (!u.prov && f.prov) u.prov = f.prov;
    fansDirty = true;
    return u;
  }

  // điểm danh mỗi ngày: chuỗi ngày liên tiếp có bình luận → thưởng
  function checkIn(user, u) {
    const f = fans[user.id]; const d = today();
    if (!f || f.lastDay === d) return;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    f.streak = f.lastDay === y ? f.streak + 1 : 1; f.lastDay = d; f.days = (f.days || 0) + 1;
    if (f.streak >= 2 && u.prov) {
      const pts = addPts(u.prov, Math.min(10, f.streak) * cfg.streakBonus, user, 'streak');
      fx('streak', { user: userCard(user), prov: u.prov, streak: f.streak, pts });
    }
  }

  function firstSeen(user, u, viaJoin) {
    if (seenSession.has(user.id)) return false;
    seenSession.add(user.id);
    const f = fans[user.id];
    if (f && f.prov && f.total > 0) {
      S.returning++;
      if (cfg.autoHome) {
        const pts = addPts(f.prov, cfg.commentPts, user, 'return');
        fx('returning', { user: userCard(user), prov: f.prov, pts, days: f.days || 1, viaJoin });
      }
      return true;
    }
    S.newPeople++;
    return false;
  }

  function hotCheck(id, uid) {
    const now = Date.now(), w = cfg.hotWindow * 1000;
    const log = (hotLog[id] = (hotLog[id] || []).filter(x => now - x.t < w));
    if (!log.find(x => x.u === uid)) log.push({ u: uid, t: now });
    if (log.length >= cfg.hotUsers && !(S.hot[id] > now)) {
      S.hot[id] = now + cfg.hotSec * 1000; hotLog[id] = [];
      fx('hot', { prov: id, sec: cfg.hotSec, people: log.length }); dirty = true;
    }
  }

  function setOwner(id) {
    const pr = P(id); let best = null;
    for (const uid in pr.giver) if (!best || pr.giver[uid] > pr.giver[best]) best = uid;
    if (!best) return;
    const u = S.users[best]; if (!u) return;
    if (!pr.owner || pr.owner.id !== best) { pr.owner = { id: best, name: u.name, avatar: u.avatar, coins: pr.giver[best] }; fx('owner', { prov: id, user: userCard(u), coins: pr.giver[best] }); }
    else pr.owner.coins = pr.giver[best];
  }

  // ---------- sự kiện TikTok ----------
  function onChat(user, text) {
    S.comments++;
    let prov = VN.findProvince(text);
    const now = Date.now();
    // đang đố vui (và 15 giây sau): gõ tên tỉnh là TRẢ LỜI, không đổi quê, không thắp tỉnh trong đáp án
    const quizOn = S.quiz && S.quiz.endsAt > now;
    const exact = quizOn && VN.isExactAnswer(text, S.quiz.a);
    const guessing = (prov || exact) && (quizOn || now < (S.quizLock || 0));
    const u = touchUser(user, guessing ? null : prov);
    firstSeen(user, u, false);
    if (guessing) {
      if (exact) {
        const q = S.quiz; S.quiz = null; S.nextQuiz = now + cfg.quizEvery * 60000; S.quizLock = now + 15000;
        const home = u.prov;   // quê THẬT của người trả lời
        if (home) { const pts = addPts(home, cfg.quizPts, user, 'quiz'); fx('quizWin', { user: userCard(user), prov: home, answer: q.a, q: q.q, pts }); }
        else { S.pending[user.id] = (S.pending[user.id] || 0) + cfg.quizPts; fx('quizWin', { user: userCard(user), prov: null, answer: q.a, q: q.q, pts: cfg.quizPts, pending: S.pending[user.id] }); }
        dirty = true;
      }
      prov = null;   // câu trả lời không tính là bình luận quê
    }
    // lộc rơi: gõ đúng chữ để vào danh sách nhận lộc
    if (S.drop && S.drop.endsAt > now && !S.drop.users.includes(user.id) && VN.deacc(text).includes(VN.deacc(cfg.dropWord || 'lộc'))) { S.drop.users.push(user.id); dirty = true; }
    if (prov) {
      const pending = S.pending[user.id]; if (pending) { delete S.pending[user.id]; const pts = addPts(prov, pending, user, 'pending'); fx('claim', { user: userCard(user), prov, pts }); }
      const key = user.id + ':' + prov;
      const newcomer = !P(prov).users.includes(user.id);
      if (now - (chatAt.get(key) || 0) >= cfg.chatCooldown * 1000) {
        chatAt.set(key, now);
        const wasLit = !!P(prov).lit;
        const pts = addPts(prov, cfg.commentPts, user, 'chat');
        if (wasLit) fx(newcomer ? 'light' : 'ping', { prov, user: userCard(user), pts, mult: mult(prov), nth: newcomer ? P(prov).users.length : 0, lv: lvOf(user.id) });
        hotCheck(prov, user.id);
      }
      fans[user.id].total = (fans[user.id].total || 0) + 1;
    }
    checkIn(user, u);
    if (chatAt.size > 20000) chatAt.clear();
  }

  function onGift(user, gift, count, value) {
    const u = touchUser(user, null);
    firstSeen(user, u, false);
    const diamonds = Number(gift && gift.diamonds) || 0;
    const base = tierPts(diamonds) * Math.max(1, count || 1);
    S.gifts += count || 1; S.coins += value || 0; u.coins += value || 0;
    if (fans[user.id]) fans[user.id].total = (fans[user.id].total || 0) + 1;
    let pts = 0;
    if (u.prov) {
      const pr = P(u.prov);
      pr.coins += value || 0; pr.giver[user.id] = (pr.giver[user.id] || 0) + (value || 0);
      const at = alltime[u.prov] || (alltime[u.prov] = { pts: 0, coins: 0, wins: 0 }); at.coins += value || 0;
      pts = addPts(u.prov, base, user, 'gift');
      setOwner(u.prov);
    } else {
      S.pending[user.id] = (S.pending[user.id] || 0) + base;
    }
    S.lastGift = { user: userCard(user), prov: u.prov, pts: u.prov ? pts : S.pending[user.id], gift: { name: gift.name, img: gift.img || '' }, count, value };
    fx('gift', { user: userCard(user), prov: u.prov, pts: u.prov ? pts : 0, pending: u.prov ? 0 : S.pending[user.id], gift: { name: gift.name, img: gift.img || '' }, count, value });
    // cả nước rực sáng
    S.country.pool += value || 0;
    while (cfg.countryCoins > 0 && S.country.pool >= cfg.countryCoins) {
      S.country.pool -= cfg.countryCoins; S.country.times++;
      for (const p of VN.LIST) { const r = S.provs[p.id]; if (!r.lit) r.lit = Date.now(); r.energy = 100; r.warned = false; }
      fx('country', { user: userCard(user), times: S.country.times });
      setTimeout(checkSeason, 6000);
    }
    dirty = true;
  }

  function onLike(user, n) {
    S.likes += n;
    const u = S.users[user.id] || touchUser(user, null);
    if (u.prov) {
      const acc = (likeAcc.get(user.id) || 0) + n;
      const give = Math.floor(acc / cfg.likeEvery);
      likeAcc.set(user.id, acc - give * cfg.likeEvery);
      if (give > 0) addPts(u.prov, give, user, 'like');
    }
    if (cfg.waveLikes > 0 && S.likes >= S.waveNext) {
      S.waveNext = S.likes + cfg.waveLikes;
      const dark = VN.LIST.filter(p => !S.provs[p.id].lit);
      if (dark.length) { const p = dark[Math.floor(Math.random() * dark.length)]; addPts(p.id, 1, null, 'wave'); fx('wave', { prov: p.id, likes: S.likes }); }
      else { for (const p of VN.LIST) addPts(p.id, 2, null, 'wave'); fx('wave', { prov: null, likes: S.likes }); }
    }
    dirty = true;
  }

  const joinAt = new Map();
  function onMember(user) {
    const f = fans[user.id];
    const now = Date.now();
    if (now - (joinAt.get(user.id) || 0) < 10 * 60000) return;   // vào ra liên tục: 10 phút mới chào lại
    joinAt.set(user.id, now); if (joinAt.size > 20000) joinAt.clear();
    if (f && f.prov) { const u = touchUser(user, null); if (!firstSeen(user, u, true)) fx('join', { user: userCard(user), prov: f.prov, lv: lvOf(user.id) }); }
    else fx('join', { user: userCard(user), lv: lvOf(user.id) });
  }

  const bonusLog = new Map();   // uid -> { share: [thời điểm…], follow: true }
  function onBonus(user, pts, why) {
    const now = Date.now(), log = bonusLog.get(user.id) || { share: [], follow: false };
    bonusLog.set(user.id, log);
    if (why === 'follow') { if (log.follow) return; log.follow = true; }
    if (why === 'share') {
      const last = log.share[log.share.length - 1] || 0;
      if (log.share.length >= cfg.shareMax || now - last < cfg.shareCooldown * 60000) return;   // spam chia sẻ: bỏ qua
      log.share.push(now);
    }
    const u = touchUser(user, null); firstSeen(user, u, false);
    if (u.prov) { const got = addPts(u.prov, pts, user, why); fx(why, { user: userCard(user), prov: u.prov, pts: got }); }
  }

  function hook(ev) {
    if (ev && ev.type === 'viewers') { S.viewers = Math.max(0, Number(ev.count) || 0); dirty = true; return; }
    if (!ev || !ev.user) return;
    try {
      if (ev.type === 'chat') onChat(ev.user, ev.text || '');
      else if (ev.type === 'gift') onGift(ev.user, ev.gift || {}, ev.count || 1, ev.value || 0);
      else if (ev.type === 'like') onLike(ev.user, Math.max(1, ev.count || 1));
      else if (ev.type === 'member') onMember(ev.user);
      else if (ev.type === 'follow') onBonus(ev.user, cfg.followPts, 'follow');
      else if (ev.type === 'share') onBonus(ev.user, cfg.sharePts, 'share');
    } catch (e) { console.error('[Bản đồ] lỗi', e && e.message); }
  }

  // ---------- vòng đua, đại chiến, tỉnh may mắn, đố vui ----------
  const sortedBy = key => VN.LIST.map(p => ({ id: p.id, v: S.provs[p.id][key] })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  function endRound() {
    const top = sortedBy('roundPts').slice(0, 3);
    if (top.length) {
      const w = top[0].id; (alltime[w] || (alltime[w] = { pts: 0, coins: 0, wins: 0 })).wins++; allDirty = true;
      S.round.winners.unshift({ n: S.round.n, prov: w, pts: top[0].v }); S.round.winners = S.round.winners.slice(0, 20);
      fx('roundEnd', { n: S.round.n, top });
    }
    for (const p of VN.LIST) S.provs[p.id].roundPts = 0;
    S.round.n++; S.round.endsAt = Date.now() + cfg.roundMin * 60000; dirty = true;
  }
  function startBattle() {
    const top = sortedBy('pts').slice(0, 4);
    if (top.length < 2) { S.nextBattle = Date.now() + 60000; return false; }
    // đôi đấu: 2 tỉnh đầu bảng, đôi khi lấy tỉnh hạng 3–4 cho bất ngờ
    const a = top[0].id, b = top[top.length > 2 && Math.random() < 0.35 ? 1 + Math.floor(Math.random() * (top.length - 1)) : 1].id;
    S.battle = { a, b, sa: 0, sb: 0, endsAt: Date.now() + cfg.battleSec * 1000, sec: cfg.battleSec };
    fx('battleStart', { a, b, sec: cfg.battleSec }); dirty = true; return true;
  }
  function endBattle() {
    const b = S.battle; S.battle = null; S.nextBattle = Date.now() + cfg.battleEvery * 60000;
    const win = b.sa === b.sb ? null : (b.sa > b.sb ? b.a : b.b);
    if (win) addPts(win, cfg.battleBonus, null, 'battle');
    fx('battleEnd', { a: b.a, b: b.b, sa: b.sa, sb: b.sb, win, bonus: cfg.battleBonus }); dirty = true;
  }
  function startLucky() {
    // ưu tiên tỉnh còn tối để rủ người quê đó vào thắp
    const dark = VN.LIST.filter(p => !S.provs[p.id].lit), pool = dark.length && Math.random() < 0.6 ? dark : VN.LIST;
    const p = pool[Math.floor(Math.random() * pool.length)];
    S.lucky = { id: p.id, endsAt: Date.now() + cfg.luckySec * 1000, sec: cfg.luckySec };
    fx('lucky', { prov: p.id, sec: cfg.luckySec }); dirty = true;
  }
  // đố vui xoay vòng đủ 34 tỉnh (thứ tự ngẫu nhiên) rồi mới lặp; mỗi tỉnh lần lượt hỏi câu khác nhau
  let quizOrder = [], quizTurn = {};
  function nextQuestion() {
    if (!quizOrder.length) { quizOrder = VN.LIST.map(p => p.id).sort(() => Math.random() - 0.5); if (S.quiz && quizOrder[0] === S.quiz.a) quizOrder.push(quizOrder.shift()); }
    const a = quizOrder.shift(), list = VN.QUIZ_BY[a];
    const k = quizTurn[a] == null ? Math.floor(Math.random() * list.length) : quizTurn[a] + 1; quizTurn[a] = k;
    return { q: list[k % list.length], a };
  }
  function startQuiz() {
    const q = nextQuestion();
    S.quiz = { q: q.q, a: q.a, endsAt: Date.now() + cfg.quizSec * 1000, sec: cfg.quizSec };
    fx('quizStart', { q: q.q, sec: cfg.quizSec, pts: cfg.quizPts }); dirty = true;
  }
  function startDrop() {
    S.drop = { endsAt: Date.now() + cfg.dropSec * 1000, sec: cfg.dropSec, users: [] };
    fx('dropStart', { word: cfg.dropWord || 'lộc', sec: cfg.dropSec, winners: cfg.dropWinners }); dirty = true;
  }
  function endDrop() {
    const d = S.drop; S.drop = null; S.nextDrop = Date.now() + cfg.dropEvery * 60000;
    const pool = d.users.slice(), winners = [];
    while (pool.length && winners.length < cfg.dropWinners) {
      const uid = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], u = S.users[uid]; if (!u) continue;
      const pts = Math.round(cfg.dropMin + Math.random() * Math.max(0, cfg.dropMax - cfg.dropMin));
      if (u.prov) addPts(u.prov, pts, u, 'drop'); else S.pending[uid] = (S.pending[uid] || 0) + pts;
      winners.push({ user: userCard(u), prov: u.prov, pts });
    }
    fx('dropEnd', { winners, total: d.users.length, word: cfg.dropWord || 'lộc' }); dirty = true;
  }
  // đèn tắt dần: tỉnh không ai giữ lửa sẽ mờ rồi tắt → người quê đó phải vào bình luận
  let lastDecay = Date.now();
  setInterval(() => {
    const now = Date.now(), dt = (now - lastDecay) / 1000; lastDecay = now;
    if (!cfg.decayMin || S.seasonDone) return;
    const rate = 100 / (cfg.decayMin * 60);
    for (const p of VN.LIST) {
      const r = S.provs[p.id]; if (!r.lit) continue;
      const shield = S.lucky && S.lucky.id === p.id && S.lucky.endsAt > now;   // tỉnh may mắn không bị tắt
      if (!shield) r.energy = Math.max(0, r.energy - rate * dt);
      if (r.energy <= 25 && !r.warned) { r.warned = true; fx('dim', { prov: p.id }); }
      if (r.energy <= 0) { r.lit = 0; r.warned = false; fx('off', { prov: p.id }); }
    }
    dirty = true;
  }, 2000);

  setInterval(() => {
    const now = Date.now();
    if (S.seasonDone) { if (now >= S.seasonDone) newSeason(); return; }
    if (now >= S.round.endsAt) endRound();
    if (S.drop && now >= S.drop.endsAt) endDrop();
    else if (!S.drop && cfg.dropEvery > 0 && now >= S.nextDrop && !S.quiz && !S.battle) startDrop();
    if (S.battle && now >= S.battle.endsAt) endBattle();
    else if (!S.battle && cfg.battleEvery > 0 && now >= S.nextBattle && !S.quiz) startBattle();
    if (S.lucky && now >= S.lucky.endsAt) { S.lucky = null; S.nextLucky = now + cfg.luckyEvery * 60000; dirty = true; }
    else if (!S.lucky && cfg.luckyEvery > 0 && now >= S.nextLucky) startLucky();
    if (S.quiz && now >= S.quiz.endsAt) { fx('quizEnd', { q: S.quiz.q, answer: S.quiz.a }); S.quiz = null; S.quizLock = now + 15000; S.nextQuiz = now + cfg.quizEvery * 60000; dirty = true; }
    else if (!S.quiz && cfg.quizEvery > 0 && now >= S.nextQuiz && !S.battle && !S.drop) startQuiz();
    for (const id in S.hot) if (S.hot[id] < now) { delete S.hot[id]; dirty = true; }
  }, 1000);

  // ---------- ảnh chụp trạng thái gửi màn hình ----------
  function snapshot() {
    const provs = {};
    for (const p of VN.LIST) { const r = S.provs[p.id]; provs[p.id] = { pts: r.pts, rp: r.roundPts, coins: r.coins, lit: r.lit, e: Math.round(r.energy || 0), n: r.users.length, owner: r.owner ? { name: r.owner.name, avatar: r.owner.avatar } : null }; }
    const users = Object.values(S.users);
    const podium = users.filter(u => u.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 3).map(u => ({ name: u.name, avatar: u.avatar, coins: u.coins, prov: u.prov }));
    const recent = users.slice(-60).filter(u => u.prov).slice(-24).map(u => ({ id: u.id, name: u.name, avatar: u.avatar, prov: u.prov }));
    const at = Object.entries(alltime).sort((a, b) => b[1].pts - a[1].pts).slice(0, 5).map(([id, v]) => ({ id, pts: v.pts, wins: v.wins }));
    return {
      now: Date.now(), cfg: publicCfg(), provs, lit: litCount(), total: VN.COUNT, people: Object.keys(S.users).length,
      round: { n: S.round.n, endsAt: S.round.endsAt, top: sortedBy('roundPts').slice(0, 5), winners: S.round.winners.slice(0, 3) },
      giftTop: sortedBy('coins').slice(0, 5), podium, recent, lastGift: S.lastGift, alltime: at,
      country: { pool: S.country.pool, target: cfg.countryCoins, times: S.country.times },
      battle: S.battle, lucky: S.lucky, quiz: S.quiz ? { q: S.quiz.q, endsAt: S.quiz.endsAt, sec: S.quiz.sec, pts: cfg.quizPts } : null, hot: S.hot,
      likes: S.likes, waveNext: S.waveNext, comments: S.comments, viewers: S.viewers || 0,
      season: S.season, seasonDone: S.seasonDone, seasonWins: S.seasonWins.slice(0, 3),
      drop: S.drop ? { endsAt: S.drop.endsAt, sec: S.drop.sec, n: S.drop.users.length, word: cfg.dropWord || 'lộc' } : null,
      next: nextEvent(),
      officials: Object.values(S.users).filter(u => u.prov).map(u => ({ name: u.name, avatar: u.avatar, prov: u.prov, lv: lvOf(u.id) })).filter(x => x.lv >= 2).sort((a, b) => b.lv - a.lv).slice(0, 3),
    };
  }
  // sự kiện sắp tới (hiện đếm ngược để người xem chờ)
  function nextEvent() {
    if (S.battle || S.quiz || S.drop || S.seasonDone) return null;
    const c = [];
    if (cfg.battleEvery > 0) c.push({ type: 'battle', at: S.nextBattle });
    if (cfg.quizEvery > 0) c.push({ type: 'quiz', at: S.nextQuiz });
    if (cfg.dropEvery > 0) c.push({ type: 'drop', at: S.nextDrop });
    c.sort((a, b) => a.at - b.at); return c[0] || null;
  }
  function publicCfg() {
    const c = Object.assign({}, cfg); return c;
  }
  setInterval(() => {
    if (!dirty) return; dirty = false;
    io.to('map').emit('vm:state', snapshot());
    io.to('mapctl').emit('vm:stats', adminStats());
  }, 300);
  // định kỳ gửi lại để đồng bộ đồng hồ & lưu xuống đĩa
  setInterval(() => { io.to('map').emit('vm:state', snapshot()); io.to('mapctl').emit('vm:stats', adminStats()); }, 5000);
  setInterval(() => {
    S.saved = Date.now(); writeJSON('vnmap-state.json', S);
    if (fansDirty) { fansDirty = false; writeJSON('vnmap-fans.json', fans); }
    if (allDirty) { allDirty = false; writeJSON('vnmap-alltime.json', alltime); }
  }, 5000);

  function adminStats() {
    return { lit: litCount(), total: VN.COUNT, people: Object.keys(S.users).length, comments: S.comments, gifts: S.gifts, coins: S.coins, likes: S.likes,
      newPeople: S.newPeople, returning: S.returning, fans: Object.keys(fans).length, round: S.round.n, roundEndsAt: S.round.endsAt,
      battle: S.battle, lucky: S.lucky, quiz: S.quiz, country: { pool: S.country.pool, target: cfg.countryCoins, times: S.country.times },
      season: S.season, drop: S.drop ? { n: S.drop.users.length } : null,
      start: S.start, screens: (io.sockets.adapter.rooms.get('map') || new Set()).size };
  }

  function summary() {
    const users = Object.values(S.users);
    return {
      mins: Math.round((Date.now() - S.start) / 60000), lit: litCount(), seasons: S.season - 1, total: VN.COUNT, people: users.length,
      comments: S.comments, likes: S.likes, coins: S.coins, newPeople: S.newPeople, returning: S.returning,
      topProv: sortedBy('pts').slice(0, 3),
      topGivers: users.filter(u => u.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 3).map(u => ({ name: u.name, avatar: u.avatar, coins: u.coins, prov: u.prov })),
      topFans: users.slice().sort((a, b) => b.pts - a.pts).slice(0, 3).map(u => ({ name: u.name, avatar: u.avatar, pts: u.pts, prov: u.prov, lv: lvOf(u.id) })),
    };
  }

  // ---------- thử nghiệm không cần LIVE ----------
  const FAKE = ['Minh Anh', 'Tuấn Kiệt', 'Ngọc Hân', 'Bảo Long', 'Thu Trang', 'Gia Huy', 'Lan Chi', 'Đức Thắng', 'Mai Phương', 'Quốc Bảo', 'Hà My', 'Khánh Linh', 'Văn Toàn', 'Phương Thảo', 'Hoàng Nam', 'Thanh Tâm', 'Bích Ngọc', 'Trọng Nhân', 'Yến Nhi', 'Công Vinh'];
  const fakeUser = i => { i = i == null ? Math.floor(Math.random() * 60) : i; return { id: 'test' + i, name: FAKE[i % FAKE.length] + (i >= FAKE.length ? ' ' + Math.floor(i / FAKE.length) : ''), avatar: '' }; };
  function test(t) {
    if (!t || typeof t !== 'object') return;
    const rnd = a => a[Math.floor(Math.random() * a.length)];
    if (t.kind === 'comment') {
      const n = Math.min(60, Number(t.n) || 1);
      for (let i = 0; i < n; i++) setTimeout(() => {
        const p = t.prov ? VN.BY_ID[t.prov] : rnd(VN.LIST);
        const say = rnd([p.name, 'quê ' + p.name, rnd(p.aliases) + ' đây', 'em ở ' + p.name + ' nè', p.name + ' ơi']);
        hook({ type: 'chat', user: fakeUser(), text: say });
      }, i * 250);
    } else if (t.kind === 'gift') {
      const u = fakeUser(); const v = Number(t.value) || rnd([1, 1, 5, 10, 30, 99, 199, 500]);
      if (!S.users[u.id] || !S.users[u.id].prov) hook({ type: 'chat', user: u, text: rnd(VN.LIST).name });
      setTimeout(() => hook({ type: 'gift', user: u, gift: { name: v >= 500 ? 'Quà lớn' : v >= 30 ? 'Mũ' : 'Hoa hồng', diamonds: v, img: '' }, count: 1, value: v }), 400);
    } else if (t.kind === 'like') {
      for (let i = 0; i < 10; i++) setTimeout(() => hook({ type: 'like', user: fakeUser(), count: Math.ceil((Number(t.n) || 200) / 10) }), i * 80);
    } else if (t.kind === 'returning') {
      const i = 100 + Math.floor(Math.random() * 900), u = fakeUser(i); u.id = 'testret' + i;
      fans[u.id] = { name: u.name, prov: rnd(VN.LIST).id, streak: 2, lastDay: new Date(Date.now() - 86400000).toISOString().slice(0, 10), days: 3, total: 5 };
      hook({ type: 'member', user: u });
      setTimeout(() => hook({ type: 'chat', user: u, text: 'hello mọi người' }), 1500);
    } else if (t.kind === 'join') {
      for (let i = 0; i < 6; i++) setTimeout(() => { const u = fakeUser(200 + Math.floor(Math.random() * 800)); u.id = 'join' + Date.now() + i; hook({ type: 'member', user: u }); }, i * 500);
      hook({ type: 'viewers', count: 50 + Math.floor(Math.random() * 300) });
    } else if (t.kind === 'drop') {
      if (!S.drop) startDrop();
      for (let i = 0; i < 8; i++) setTimeout(() => hook({ type: 'chat', user: fakeUser(), text: cfg.dropWord || 'lộc' }), 300 + i * 200);
    } else if (t.kind === 'quizAnswer' && S.quiz) {
      hook({ type: 'chat', user: fakeUser(), text: VN.BY_ID[S.quiz.a].name });
    } else if (t.kind === 'follow') {
      const u = fakeUser(); hook({ type: 'chat', user: u, text: rnd(VN.LIST).name }); setTimeout(() => hook({ type: 'follow', user: u }), 300);
    }
  }

  function onConnection(socket) {
    socket.on('vm:hello', role => {
      socket.join(role === 'ctl' ? 'mapctl' : 'map');
      socket.emit('vm:state', snapshot());
      socket.emit('vm:cfg', cfg);
      if (role === 'ctl') socket.emit('vm:stats', adminStats());
    });
    socket.on('vm:cfg', patch => {
      if (!patch || typeof patch !== 'object') return;
      for (const k of Object.keys(DEFAULT_CFG)) if (k in patch) {
        const d = DEFAULT_CFG[k], v = patch[k];
        if (typeof d === 'number') { const n = Number(v); if (Number.isFinite(n) && n >= 0) cfg[k] = n; }
        else if (typeof d === 'boolean') cfg[k] = !!v;
        else if (typeof d === 'string') cfg[k] = String(v).slice(0, 120);
        else if (k === 'tiers' && Array.isArray(v)) cfg.tiers = v.map(x => [Math.max(1, +x[0] || 1), Math.max(0, +x[1] || 0)]).sort((a, b) => a[0] - b[0]).slice(0, 8);
      }
      saveCfg(); io.emit('vm:cfg', cfg); dirty = true;
    });
    socket.on('vm:cmd', c => {
      if (!c || typeof c.type !== 'string') return;
      const now = Date.now();
      if (c.type === 'newRound') endRound();
      else if (c.type === 'battle') { if (S.battle) endBattle(); else startBattle(); }
      else if (c.type === 'lucky') startLucky();
      else if (c.type === 'drop') { if (S.drop) endDrop(); else startDrop(); }
      else if (c.type === 'season') newSeason();
      else if (c.type === 'theme') rotateTheme();
      else if (c.type === 'sfxTest') fx('sfxTest');
      else if (c.type === 'quiz') { if (!S.quiz) startQuiz(); }
      else if (c.type === 'country') { for (const p of VN.LIST) { const r = S.provs[p.id]; if (!r.lit) r.lit = now; r.energy = 100; r.warned = false; } S.country.times++; fx('country', { user: null, times: S.country.times }); setTimeout(checkSeason, 6000); dirty = true; }
      else if (c.type === 'summary') fx('summary', summary());
      else if (c.type === 'reset') { S = freshState(); seenSession.clear(); bonusLog.clear(); chatAt.clear(); likeAcc.clear(); fx('reset'); dirty = true; }
      else if (c.type === 'say' && typeof c.text === 'string') fx('say', { text: c.text.slice(0, 200) });
    });
    socket.on('vm:test', test);
    // màn hình không có giọng Việt → nhờ trang điều khiển đọc
    socket.on('vm:say', m => { if (m && typeof m.text === 'string') io.to('mapctl').emit('vm:say', { text: m.text.slice(0, 200), prio: !!m.prio }); });
  }

  return { hook, onConnection };
};
