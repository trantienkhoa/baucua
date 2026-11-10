// Ba game "quán" cho TikTok LIVE: Quán Nhậu Chung, Tiệm Massage, Tiệm Cà Phê Chill.
// Chung một bộ máy: bình luận → vào quán ngồi; quà → gọi món; câu lệnh chung → combo cả quán;
// thanh cảm xúc (say / thư giãn / chill); giờ vàng; mục tiêu tim; danh hiệu khách quen lưu qua các phiên.

const VENUES = {
  nhau: {
    name: 'Quán Nhậu Chung', seats: 16, meter: 'Độ say', full: 'say mềm',
    cmd: { re: /(^|[^\p{L}])(d?z[oô]|d[oô]|z[oôố]|dzo+|cụng|cung ly|1\s*2\s*3|mot hai ba|một hai ba)(?=$|[^\p{L}])/iu, name: 'dzô', combo: 'Cả quán dzô', icon: '🍻' },
    titles: ['Khách lạ', 'Khách quen', 'Bạn nhậu', 'Bợm nhậu', 'Trùm quán', 'Thánh nhậu'],
    menu: [
      { min: 1, name: 'Cụng ly', icon: '🍺', kind: 'self', meter: 6 },
      { min: 5, name: 'Đĩa khô mực', icon: '🦑', kind: 'self', meter: 8 },
      { min: 10, name: 'Két bia cho bàn', icon: '🍻', kind: 'table', meter: 12 },
      { min: 30, name: 'Nồi lẩu thái', icon: '🍲', kind: 'table', meter: 15 },
      { min: 100, name: 'Bao cả quán', icon: '🎉', kind: 'all', meter: 18 },
      { min: 500, name: 'Ban nhạc sống', icon: '🎸', kind: 'all', meter: 20 },
    ],
    happy: 'Giờ vàng: món nào cũng nhân đôi',
  },
  massage: {
    name: 'Tiệm Massage Thư Giãn', seats: 8, meter: 'Thư giãn', full: 'ngủ ngon lành',
    cmd: { re: /(^|[^\p{L}])(đã quá|da qua|đã|thư giãn|thu gian|phê|phe|sướng|suong|a+h+|ư+m+|dễ chịu|de chiu|relax)(?=$|[^\p{L}])/iu, name: 'đã quá', combo: 'Cả tiệm thư giãn', icon: '😌' },
    titles: ['Khách mới', 'Khách quen', 'Hội viên bạc', 'Hội viên vàng', 'Hội viên kim cương', 'Khách VIP trọn đời'],
    menu: [
      { min: 1, name: 'Trà gừng ấm', icon: '🍵', kind: 'self', meter: 6 },
      { min: 5, name: 'Đắp mặt nạ', icon: '🧖', kind: 'self', meter: 10 },
      { min: 10, name: 'Massage chân', icon: '🦶', kind: 'self', meter: 15 },
      { min: 30, name: 'Liệu trình đá nóng', icon: '🪨', kind: 'self', meter: 22 },
      { min: 100, name: 'Xông hơi cả tiệm', icon: '♨️', kind: 'all', meter: 18 },
      { min: 500, name: 'Bao trọn gói VIP', icon: '💎', kind: 'all', meter: 25 },
    ],
    happy: 'Giờ thư giãn: liệu trình nào cũng nhân đôi',
  },
  cafe: {
    name: 'Tiệm Cà Phê Chill', seats: 12, meter: 'Độ chill', full: 'chill tột độ',
    cmd: { re: /(^|[^\p{L}])(chill|chiu|thư thái|thu thai|yên bình|yen binh|lofi|êm|em qua|mưa|mua)(?=$|[^\p{L}])/iu, name: 'chill', combo: 'Cả quán chill', icon: '🎧' },
    titles: ['Khách ghé', 'Khách quen', 'Cạ cứng', 'Hội viên chill', 'Linh hồn của quán', 'Chủ quán danh dự'],
    menu: [
      { min: 1, name: 'Trà đá', icon: '🧊', kind: 'self', meter: 6 },
      { min: 5, name: 'Cà phê sữa đá', icon: '☕', kind: 'self', meter: 10 },
      { min: 10, name: 'Bạc xỉu + bánh ngọt', icon: '🍰', kind: 'self', meter: 14 },
      { min: 30, name: 'Bình trà hoa', icon: '🌸', kind: 'table', meter: 16 },
      { min: 100, name: 'Mời cả quán', icon: '🎁', kind: 'all', meter: 18 },
      { min: 500, name: 'Gọi cơn mưa', icon: '🌧️', kind: 'all', meter: 22 },
    ],
    happy: 'Giờ chill: đồ uống nào cũng nhân đôi',
    notes: true,   // bảng lời nhắn
  },
};

const DEFAULT_CFG = {
  idleMin: 6,            // không bình luận 6 phút → rời quán, nhường chỗ
  happyEvery: 8, happySec: 60,
  comboWin: 12, comboLevels: [5, 12, 25],
  likeGoal: 3000,        // mỗi 3000 tim cả phòng → quán mời một vòng
  mcOn: true, mcVoice: '', mcVol: 1, mcRate: 1, mcChatty: 2, mcWelcome: true,
  musicOn: true, musicVol: 0.35, sfxOn: true, sfxVol: 0.9,
  noteCoins: 1,          // cà phê: tặng quà ≥ 1 xu kèm bình luận "mh: …" → dán lời nhắn lên bảng
  lite: false,
};

module.exports = function setupVenues({ io, readJSON, writeJSON }) {
  const out = {};
  for (const v of Object.keys(VENUES)) out[v] = makeVenue(v, VENUES[v]);
  function makeVenue(vid, D) {
    const room = 'vn:' + vid, ctl = 'vnctl:' + vid;
    let cfg = Object.assign({}, DEFAULT_CFG, { menu: D.menu.map(m => ({ ...m })) }, readJSON(`venue-${vid}-settings.json`, {}));
    const saveCfg = () => writeJSON(`venue-${vid}-settings.json`, cfg);
    const fans = readJSON(`venue-${vid}-fans.json`, {});   // uid -> { name, xp, visits, lastDay }
    let fansDirty = false;
    const fresh = () => ({ start: Date.now(), seats: Array(D.seats).fill(null), users: {}, wait: [], likes: 0, likeNext: cfg.likeGoal, coins: 0, comments: 0, toasts: 0,
      happy: null, nextHappy: Date.now() + cfg.happyEvery * 60000, lastGift: null, notes: [], rain: 0, combos: 0 });
    let S = readJSON(`venue-${vid}-state.json`, null);
    if (!S || !S.seats || Date.now() - (S.saved || 0) > 3 * 3600000) S = fresh();
    if (S.seats.length !== D.seats) S.seats = Array(D.seats).fill(null).map((x, i) => S.seats[i] || null);
    S.happy = null; S.nextHappy = Date.now() + cfg.happyEvery * 60000;
    let dirty = true;
    const cmdLog = [];
    const fx = (type, data) => io.to(room).emit('vn:fx', Object.assign({ v: vid, type, at: Date.now() }, data || {}));
    const card = u => u ? { id: u.id, name: u.name, avatar: u.avatar || '' } : null;
    const levelOf = xp => Math.min(D.titles.length, Math.floor(Math.sqrt(Math.max(0, xp) / 10)) + 1);
    const lvOf = uid => levelOf((fans[uid] && fans[uid].xp) || 0);
    const today = () => new Date().toISOString().slice(0, 10);

    function gainXp(user, n) {
      const f = fans[user.id] || (fans[user.id] = { name: user.name, xp: 0, visits: 0, lastDay: '' });
      const before = levelOf(f.xp); f.xp += n; f.name = user.name; fansDirty = true;
      const after = levelOf(f.xp);
      if (after > before) fx('levelUp', { user: card(user), level: after, title: D.titles[after - 1] });
    }
    // vào quán: tìm ghế trống; hết ghế thì xếp hàng chờ
    function seat(user, vip) {
      let u = S.users[user.id];
      if (!u) {
        const f = fans[user.id] || (fans[user.id] = { name: user.name, xp: 0, visits: 0, lastDay: '' });
        const returning = f.visits > 0;
        if (f.lastDay !== today()) { f.visits++; f.lastDay = today(); fansDirty = true; }
        u = S.users[user.id] = { id: user.id, name: user.name, avatar: user.avatar || '', seat: -1, last: Date.now(), coins: 0, meter: 0, sleep: 0, cmds: 0, color: Math.floor(Math.random() * 8), returning };
      }
      u.name = user.name; if (user.avatar) u.avatar = user.avatar; u.last = Date.now();
      if (u.seat >= 0) return u;
      let i = S.seats.indexOf(null);
      if (i < 0 && vip) {   // khách tặng quà được ưu tiên: mời khách ngồi lâu không nói gì ra
        let best = -1, t = Infinity;
        S.seats.forEach((id, k) => { const o = S.users[id]; if (o && o.coins === 0 && o.last < t) { t = o.last; best = k; } });
        if (best >= 0) { leave(S.seats[best], 'bump'); i = best; }
      }
      if (i >= 0) {
        S.seats[i] = u.id; u.seat = i; S.wait = S.wait.filter(x => x !== u.id);
        fx('enter', { user: card(u), seat: i, returning: u.returning, lv: lvOf(u.id), title: D.titles[lvOf(u.id) - 1], visits: (fans[u.id] || {}).visits || 1 });
      } else if (!S.wait.includes(u.id)) { S.wait.push(u.id); if (S.wait.length > 200) S.wait.shift(); fx('wait', { user: card(u), n: S.wait.length }); }
      dirty = true; return u;
    }
    function leave(uid, why) {
      const u = S.users[uid]; if (!u || u.seat < 0) return;
      S.seats[u.seat] = null; fx('leave', { user: card(u), seat: u.seat, why }); u.seat = -1; dirty = true;
      // người chờ lâu nhất vào thay
      while (S.wait.length) { const w = S.users[S.wait.shift()]; if (w && w.seat < 0 && Date.now() - w.last < cfg.idleMin * 60000) { seat(w); break; } }
    }
    const happyOn = () => S.happy && S.happy.endsAt > Date.now();
    function bump(u, n) {
      if (!u || u.seat < 0) return;
      u.meter = Math.min(100, u.meter + n * (happyOn() ? 2 : 1));
      if (u.meter >= 100 && !u.sleep) { u.sleep = Date.now() + 60000; fx('full', { user: card(u), seat: u.seat }); }
      dirty = true;
    }
    function tableOf(i) { return Math.floor(i / 4); }

    function onChat(user, text) {
      S.comments++;
      const u = seat(user, false);
      gainXp(user, 1);
      // lời nhắn (cà phê): "mh: ..." chờ quà để dán lên bảng
      if (D.notes && /^\s*(mh|lời nhắn|loi nhan|ln|note)\s*[:：\-]/i.test(text)) { u.note = text.replace(/^\s*(mh|lời nhắn|loi nhan|ln|note)\s*[:：\-]\s*/i, '').slice(0, 60); u.noteAt = Date.now(); }
      if (D.cmd.re.test(text)) {
        S.toasts++; u.cmds++;
        bump(u, 3);
        const now = Date.now(); cmdLog.push({ t: now, id: u.id });
        while (cmdLog.length && now - cmdLog[0].t > cfg.comboWin * 1000) cmdLog.shift();
        const people = new Set(cmdLog.map(x => x.id)).size;
        fx('cmd', { user: card(u), seat: u.seat, people });
        const lv = cfg.comboLevels.filter(n => people >= n).length;
        if (lv > (S.comboLv || 0)) { S.comboLv = lv; S.combos++; fx('combo', { level: lv, people, name: D.cmd.combo }); for (const id of S.seats) if (id) bump(S.users[id], 4 * lv); }
        if (people <= 1) S.comboLv = 0;
      }
      dirty = true;
    }
    function onGift(user, gift, count, value) {
      const u = seat(user, true);
      const each = Number(gift && gift.diamonds) || Math.round((value || 0) / Math.max(1, count || 1));
      let item = null; for (const m of cfg.menu) if (each >= m.min) item = m;
      if (!item) item = cfg.menu[0];
      const times = (count || 1) * (happyOn() ? 2 : 1);
      u.coins += value || 0; S.coins += value || 0;
      gainXp(user, Math.max(2, Math.round((value || 0) * 2)));
      // ai được hưởng món: mình / cả bàn / cả quán
      let who = [u.id];
      if (item.kind === 'table' && u.seat >= 0) who = S.seats.filter((id, k) => id && tableOf(k) === tableOf(u.seat));
      if (item.kind === 'all') who = S.seats.filter(Boolean);
      for (const id of who) bump(S.users[id], item.meter * Math.min(3, times) / (id === u.id ? 1 : 2));
      if (D.notes && u.note && Date.now() - u.noteAt < 180000 && each >= cfg.noteCoins) {
        S.notes.unshift({ id: Date.now(), user: card(u), text: u.note, at: Date.now() }); S.notes = S.notes.slice(0, 12); u.note = '';
        fx('note', { user: card(u), text: S.notes[0].text });
      }
      if (vid === 'cafe' && item.min >= 500) S.rain = Date.now() + 5 * 60000;
      S.lastGift = { user: card(u), item: { name: item.name, icon: item.icon, kind: item.kind }, gift: { name: gift.name, img: gift.img || '' }, count, value };
      fx('gift', { user: card(u), seat: u.seat, item: { name: item.name, icon: item.icon, kind: item.kind, min: item.min }, gift: { name: gift.name, img: gift.img || '' }, count, value, who, happy: happyOn(), lv: lvOf(u.id), title: D.titles[lvOf(u.id) - 1] });
      dirty = true;
    }
    function onLike(user, n) {
      S.likes += n;
      const u = S.users[user.id]; if (u && u.seat >= 0) bump(u, Math.min(2, n * 0.05));
      if (cfg.likeGoal > 0 && S.likes >= S.likeNext) {
        S.likeNext = S.likes + cfg.likeGoal;
        for (const id of S.seats) if (id) bump(S.users[id], 10);
        fx('likeGoal', { likes: S.likes, item: cfg.menu[Math.min(2, cfg.menu.length - 1)] });
      }
      dirty = true;
    }
    function onMember(user) {
      const f = fans[user.id];
      if (f && f.visits > 0) seat(user, false);   // khách quen vào phòng là tự vào quán
      else fx('door', { user: card(user) });
    }
    function hook(ev) {
      if (!ev) return;
      if (ev.type === 'viewers') { S.viewers = Number(ev.count) || 0; dirty = true; return; }
      if (!ev.user) return;
      try {
        if (ev.type === 'chat') onChat(ev.user, ev.text || '');
        else if (ev.type === 'gift') onGift(ev.user, ev.gift || {}, ev.count || 1, ev.value || 0);
        else if (ev.type === 'like') onLike(ev.user, Math.max(1, ev.count || 1));
        else if (ev.type === 'member') onMember(ev.user);
        else if (ev.type === 'follow' || ev.type === 'share') { const u = seat(ev.user, false); bump(u, 5); fx(ev.type, { user: card(u), seat: u.seat }); }
      } catch (e) { console.error('[' + D.name + '] lỗi', e && e.message); }
    }

    // nhịp quán: khách ngồi lâu không nói gì thì về, thanh cảm xúc giảm dần, giờ vàng
    setInterval(() => {
      const now = Date.now();
      for (const id of S.seats) {
        const u = S.users[id]; if (!u) continue;
        if (now - u.last > cfg.idleMin * 60000 && !(u.sleep > now)) { leave(id, 'idle'); continue; }
        if (u.sleep && u.sleep < now) { u.sleep = 0; u.meter = 40; fx('wake', { user: card(u), seat: u.seat }); dirty = true; }
        if (!u.sleep && u.meter > 0) { u.meter = Math.max(0, u.meter - 0.6); dirty = true; }
      }
      if (S.happy && S.happy.endsAt < now) { S.happy = null; S.nextHappy = now + cfg.happyEvery * 60000; fx('happyEnd'); dirty = true; }
      else if (!S.happy && cfg.happyEvery > 0 && now >= S.nextHappy) { S.happy = { endsAt: now + cfg.happySec * 1000, sec: cfg.happySec }; fx('happy', { sec: cfg.happySec, text: D.happy }); dirty = true; }
      if (cmdLog.length && now - cmdLog[cmdLog.length - 1].t > cfg.comboWin * 1000) { cmdLog.length = 0; S.comboLv = 0; }
    }, 2000);

    function snapshot() {
      const seats = S.seats.map(id => { const u = S.users[id]; return u ? { id: u.id, name: u.name, avatar: u.avatar, meter: Math.round(u.meter), sleep: u.sleep > Date.now(), color: u.color, lv: lvOf(u.id) } : null; });
      const users = Object.values(S.users);
      const big = users.filter(u => u.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 5).map(u => ({ name: u.name, avatar: u.avatar, coins: u.coins }));
      const cmdTop = users.filter(u => u.cmds > 0).sort((a, b) => b.cmds - a.cmds).slice(0, 3).map(u => ({ name: u.name, avatar: u.avatar, n: u.cmds }));
      return { v: vid, now: Date.now(), def: { name: D.name, meter: D.meter, full: D.full, cmd: { name: D.cmd.name, combo: D.cmd.combo, icon: D.cmd.icon }, titles: D.titles, notes: !!D.notes },
        cfg: publicCfg(), seats, wait: S.wait.length, people: users.length, big, cmdTop, lastGift: S.lastGift, likes: S.likes, likeNext: S.likeNext,
        happy: S.happy, nextHappy: S.nextHappy, notes: S.notes, rain: S.rain > Date.now(), comments: S.comments, coins: S.coins, viewers: S.viewers || 0 };
    }
    const publicCfg = () => Object.assign({}, cfg);
    setInterval(() => { if (!dirty) return; dirty = false; io.to(room).emit('vn:state', snapshot()); io.to(ctl).emit('vn:stats', stats()); }, 350);
    setInterval(() => { io.to(room).emit('vn:state', snapshot()); io.to(ctl).emit('vn:stats', stats()); }, 5000);
    setInterval(() => { S.saved = Date.now(); writeJSON(`venue-${vid}-state.json`, S); if (fansDirty) { fansDirty = false; writeJSON(`venue-${vid}-fans.json`, fans); } }, 6000);
    const stats = () => ({ v: vid, seated: S.seats.filter(Boolean).length, seats: D.seats, wait: S.wait.length, people: Object.keys(S.users).length, comments: S.comments, coins: S.coins, likes: S.likes, toasts: S.toasts, combos: S.combos, fans: Object.keys(fans).length, happy: S.happy, screens: (io.sockets.adapter.rooms.get(room) || new Set()).size });

    // thử không cần LIVE
    const NAMES = ['Minh Anh', 'Tuấn Kiệt', 'Ngọc Hân', 'Bảo Long', 'Thu Trang', 'Gia Huy', 'Lan Chi', 'Đức Thắng', 'Mai Phương', 'Quốc Bảo', 'Hà My', 'Khánh Linh', 'Văn Toàn', 'Phương Thảo', 'Hoàng Nam', 'Thanh Tâm', 'Bích Ngọc', 'Trọng Nhân', 'Yến Nhi', 'Công Vinh'];
    const fake = i => { i = i == null ? Math.floor(Math.random() * 40) : i; return { id: 'vt' + i, name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + Math.floor(i / NAMES.length) : ''), avatar: '' }; };
    function test(t) {
      const rnd = a => a[Math.floor(Math.random() * a.length)];
      if (t.kind === 'join') for (let i = 0; i < (t.n || 6); i++) setTimeout(() => hook({ type: 'chat', user: fake(), text: 'hello quán' }), i * 300);
      else if (t.kind === 'cmd') for (let i = 0; i < (t.n || 8); i++) setTimeout(() => hook({ type: 'chat', user: fake(), text: { nhau: rnd(['dzô', '1 2 3 dzô', 'zô zô', 'cụng ly']), massage: rnd(['đã quá', 'thư giãn ghê', 'phê']), cafe: rnd(['chill', 'chill quá', 'lofi'] ) }[vid] }), i * 250);
      else if (t.kind === 'gift') { const u = fake(); const v = Number(t.value) || rnd([1, 5, 10, 30, 100]); hook({ type: 'chat', user: u, text: vid === 'cafe' ? 'mh: Chúc cả quán buổi tối thật chill!' : 'hi' }); setTimeout(() => hook({ type: 'gift', user: u, gift: { name: v >= 100 ? 'Quà lớn' : 'Hoa hồng', diamonds: v, img: '' }, count: 1, value: v }), 400); }
      else if (t.kind === 'like') for (let i = 0; i < 10; i++) setTimeout(() => hook({ type: 'like', user: fake(), count: Math.ceil((t.n || 500) / 10) }), i * 80);
      else if (t.kind === 'member') { const u = fake(100 + Math.floor(Math.random() * 50)); fans[u.id] = { name: u.name, xp: 120, visits: 4, lastDay: '' }; hook({ type: 'member', user: u }); }
    }

    function onConnection(socket) {
      socket.on('vn:hello', m => {
        if (!m || m.v !== vid) return;
        socket.join(m.role === 'ctl' ? ctl : room);
        socket.emit('vn:state', snapshot()); socket.emit('vn:cfg', { v: vid, cfg });
        if (m.role === 'ctl') socket.emit('vn:stats', stats());
      });
      socket.on('vn:cfg', m => {
        if (!m || m.v !== vid || !m.patch || typeof m.patch !== 'object') return;
        for (const k of Object.keys(DEFAULT_CFG)) if (k in m.patch) {
          const d = DEFAULT_CFG[k], val = m.patch[k];
          if (typeof d === 'number') { const n = Number(val); if (Number.isFinite(n) && n >= 0) cfg[k] = n; }
          else if (typeof d === 'boolean') cfg[k] = !!val;
          else if (typeof d === 'string') cfg[k] = String(val).slice(0, 80);
          else if (k === 'comboLevels' && Array.isArray(val)) cfg.comboLevels = val.map(Number).filter(n => n > 0).sort((a, b) => a - b).slice(0, 3);
        }
        if (Array.isArray(m.patch.menu)) cfg.menu = m.patch.menu.slice(0, 8).map((x, i) => ({ min: Math.max(1, +x.min || 1), name: String(x.name || 'Món').slice(0, 30), icon: String(x.icon || '🎁').slice(0, 4), kind: ['self', 'table', 'all'].includes(x.kind) ? x.kind : 'self', meter: Math.max(1, +x.meter || 8) })).sort((a, b) => a.min - b.min);
        saveCfg(); io.to(room).emit('vn:cfg', { v: vid, cfg }); io.to(ctl).emit('vn:cfg', { v: vid, cfg }); dirty = true;
      });
      socket.on('vn:cmd', c => {
        if (!c || c.v !== vid) return;
        if (c.type === 'happy') { S.happy = { endsAt: Date.now() + cfg.happySec * 1000, sec: cfg.happySec }; fx('happy', { sec: cfg.happySec, text: D.happy }); }
        else if (c.type === 'round') { for (const id of S.seats) if (id) bump(S.users[id], 12); fx('likeGoal', { likes: S.likes, item: cfg.menu[Math.min(2, cfg.menu.length - 1)], host: true }); }
        else if (c.type === 'clearNotes') S.notes = [];
        else if (c.type === 'rain') { S.rain = S.rain > Date.now() ? 0 : Date.now() + 10 * 60000; }
        else if (c.type === 'reset') { S = fresh(); fx('reset'); }
        else if (c.type === 'say' && typeof c.text === 'string') fx('say', { text: c.text.slice(0, 200) });
        else if (c.type === 'sfxTest') fx('sfxTest');
        dirty = true;
      });
      socket.on('vn:test', t => { if (t && t.v === vid) test(t); });
      socket.on('vn:say', m => { if (m && m.v === vid && typeof m.text === 'string') io.to(ctl).emit('vn:say', { text: m.text.slice(0, 200), prio: !!m.prio }); });
    }
    return { hook, onConnection };
  }
  return {
    hook: ev => { for (const k in out) out[k].hook(ev); },
    onConnection: socket => { for (const k in out) out[k].onConnection(socket); },
    list: Object.keys(VENUES).map(k => ({ id: k, name: VENUES[k].name })),
  };
};
