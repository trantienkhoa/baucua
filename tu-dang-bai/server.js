// Tự Đăng Bài — tự đăng video/ảnh lên Trang Facebook và kênh TikTok theo lịch.
// Chạy trên máy bạn: npm start → mở http://localhost:3400
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { createDb } = require('./lib/db');
const fb = require('./lib/facebook');
const tt = require('./lib/tiktok');
const { createScheduler, FINAL } = require('./lib/scheduler');
const { uid, kindOf, mimeOf } = require('./lib/util');
const pkg = require('./package.json');

const TT_CAPTION_MAX = 2200;
const FB_CAPTION_MAX = 63206;

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

const isLoopback = (addr) => addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
const hashPassword = (pw, salt) => crypto.createHash('sha256').update(`${salt}:${pw}`).digest('hex');
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function createApp(opts = {}) {
  const port = opts.port || Number(process.env.PORT) || 3400;
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(__dirname, 'data');
  const uploadsDir = path.join(dataDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const db = createDb(dataDir);
  const S = () => db.data.settings;
  const envPassword = process.env.APP_PASSWORD || '';
  const localNoPassword = process.env.LOCALHOST_NO_PASSWORD !== '0';
  const extraHosts = String(process.env.ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

  function log(level, msg) {
    db.data.logs.push({ t: new Date().toISOString(), level, msg });
    if (db.data.logs.length > 500) db.data.logs.splice(0, db.data.logs.length - 500);
    db.save();
    if (!opts.quiet) console.log(`[${level}] ${msg}`);
  }

  const baseUrl = () => (S().publicUrl || `http://localhost:${port}`).replace(/\/+$/, '');
  const redirects = () => ({ fb: `${baseUrl()}/auth/facebook/callback`, tt: `${baseUrl()}/auth/tiktok/callback/` });

  const scheduler = createScheduler({ db, log, uploadsDir, tickMs: opts.tickMs, pollMs: opts.pollMs });

  const app = express();
  app.disable('x-powered-by');

  // Chặn trang web lạ trỏ tên miền về máy bạn (DNS rebinding)
  app.use((req, res, next) => {
    const host = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
    let publicHost = '';
    try { publicHost = S().publicUrl ? new URL(S().publicUrl).hostname.toLowerCase() : ''; } catch {}
    const ok = host === 'localhost' || net.isIP(host) || !host.includes('.') || host.endsWith('.local')
      || (publicHost && host === publicHost) || extraHosts.includes(host);
    if (!ok) return res.status(403).type('text/plain; charset=utf-8').send('Tên miền không được phép. Thêm vào "Địa chỉ công khai" trong Cài đặt nếu đúng là của bạn.');
    next();
  });

  // Máy đang chạy app vào thẳng; máy khác (điện thoại) phải có mật khẩu
  app.use((req, res, next) => {
    if (localNoPassword && isLoopback(req.socket.remoteAddress)) return next();
    const s = S();
    const hasPw = envPassword || s.passwordHash;
    if (!hasPw) {
      return res.status(403).type('text/plain; charset=utf-8')
        .send('Chỉ mở được trên máy đang chạy app. Muốn mở từ điện thoại: trên máy tính vào Cài đặt → đặt mật khẩu.');
    }
    const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
    if (m) {
      const decoded = Buffer.from(m[1], 'base64').toString('utf8');
      const pass = decoded.slice(decoded.indexOf(':') + 1);
      if (envPassword ? safeEqual(pass, envPassword) : safeEqual(hashPassword(pass, s.passwordSalt), s.passwordHash)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Tu Dang Bai", charset="UTF-8"').status(401)
      .type('text/plain; charset=utf-8').send('Cần mật khẩu (tên đăng nhập gõ gì cũng được).');
  });

  // Chống trang web khác gửi lệnh ngầm tới app (CSRF)
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && req.get('x-tdb') !== '1') return res.status(403).json({ error: 'Yêu cầu không hợp lệ.' });
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  // ---------- trạng thái ----------
  function publicAccount(a) {
    return {
      id: a.id, platform: a.platform, name: a.name, avatar: a.avatar, remoteId: a.remoteId, username: a.username || '',
      scopes: a.scopes || [], needsReconnect: !!a.needsReconnect, canPost: a.canPost !== false, addedAt: a.addedAt,
      refreshExpiresAt: a.refreshExpiresAt || null,
    };
  }

  function state() {
    const s = S();
    const posts = db.data.posts.filter((p) => !p.targets.every((t) => FINAL.has(t.status)));
    const finished = db.data.posts.filter((p) => p.targets.every((t) => FINAL.has(t.status)))
      .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt)).slice(0, 200);
    const lan = lanAddresses().map((ip) => `http://${ip}:${port}`);
    return {
      version: pkg.version,
      now: new Date().toISOString(),
      settings: {
        fbAppId: s.fbAppId, hasFbSecret: !!s.fbAppSecret, fbApiVersion: s.fbApiVersion,
        ttClientKey: s.ttClientKey, hasTtSecret: !!s.ttClientSecret, ttDirectPost: !!s.ttDirectPost, ttPkce: s.ttPkce,
        publicUrl: s.publicUrl, hasPassword: !!(envPassword || s.passwordHash), passwordFromEnv: !!envPassword,
        cleanupDays: s.cleanupDays,
      },
      urls: { base: baseUrl(), fbRedirect: redirects().fb, ttRedirect: redirects().tt, lan },
      accounts: db.data.accounts.map(publicAccount),
      posts: [...posts, ...finished],
    };
  }

  app.get('/api/state', (req, res) => res.json(state()));
  app.get('/api/logs', (req, res) => res.json(db.data.logs.slice(-300).reverse()));

  app.post('/api/settings', (req, res) => {
    const b = req.body || {};
    const s = S();
    for (const k of ['fbAppId', 'ttClientKey']) if (k in b) s[k] = String(b[k] || '').trim();
    for (const k of ['fbAppSecret', 'ttClientSecret']) {
      if (b[k]) s[k] = String(b[k]).trim();
      if (b[`clear_${k}`]) s[k] = '';
    }
    if ('fbApiVersion' in b) s.fbApiVersion = /^v\d+\.\d+$/.test(String(b.fbApiVersion).trim()) ? String(b.fbApiVersion).trim() : 'v25.0';
    if ('ttDirectPost' in b) s.ttDirectPost = !!b.ttDirectPost;
    if ('ttPkce' in b) s.ttPkce = b.ttPkce === 'base64url' ? 'base64url' : 'hex';
    if ('cleanupDays' in b) s.cleanupDays = Math.max(0, Math.min(365, parseInt(b.cleanupDays, 10) || 0));
    if ('publicUrl' in b) {
      const u = String(b.publicUrl || '').trim().replace(/\/+$/, '');
      if (u && !/^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(u)) return res.status(400).json({ error: 'Địa chỉ công khai phải bắt đầu bằng http:// hoặc https://' });
      s.publicUrl = u;
    }
    if (b.password) {
      if (String(b.password).length < 6) return res.status(400).json({ error: 'Mật khẩu cần ít nhất 6 ký tự.' });
      s.passwordSalt = uid(8);
      s.passwordHash = hashPassword(String(b.password), s.passwordSalt);
    }
    if (b.clearPassword) { s.passwordHash = ''; s.passwordSalt = ''; }
    db.saveNow();
    log('info', 'Đã lưu cài đặt.');
    res.json(state());
  });

  // ---------- kết nối tài khoản ----------
  const oauthStates = new Map(); // state → { platform, verifier, exp }
  function newState(platform, extra = {}) {
    const st = uid(16);
    const t = Date.now();
    for (const [k, v] of oauthStates) if (v.exp < t) oauthStates.delete(k);
    oauthStates.set(st, { platform, exp: t + 15 * 60 * 1000, ...extra });
    return st;
  }
  function takeState(st, platform) {
    const v = oauthStates.get(st);
    oauthStates.delete(st);
    return v && v.platform === platform && v.exp > Date.now() ? v : null;
  }
  const backTo = (res, kind, msg) => res.redirect(`/?${kind}=${encodeURIComponent(msg)}#accounts`);

  function upsertFbPages(pages) {
    for (const p of pages) {
      const old = db.data.accounts.find((a) => a.platform === 'facebook' && a.remoteId === p.remoteId);
      if (old) Object.assign(old, p, { needsReconnect: false });
      else db.data.accounts.push({ id: uid(6), platform: 'facebook', addedAt: new Date().toISOString(), ...p });
    }
    db.saveNow();
    log('info', `Đã kết nối ${pages.length} Trang Facebook: ${pages.map((p) => p.name).join(', ')}`);
  }

  app.get('/auth/facebook/start', (req, res) => {
    const s = S();
    if (!s.fbAppId || !s.fbAppSecret) return backTo(res, 'err', 'Nhập App ID và App Secret của app Meta ở mục Cài đặt trước.');
    res.redirect(fb.authUrl(s, redirects().fb, newState('facebook')));
  });

  app.get('/auth/facebook/callback', async (req, res) => {
    const q = req.query;
    if (!takeState(String(q.state || ''), 'facebook')) return backTo(res, 'err', 'Phiên kết nối Facebook đã hết hạn, bấm Kết nối lại.');
    if (q.error) return backTo(res, 'err', `Facebook: ${q.error_description || q.error_reason || q.error}`);
    try {
      const userToken = await fb.exchangeCode(S(), redirects().fb, String(q.code || ''));
      const pages = await fb.pagesFromUserToken(S(), userToken);
      upsertFbPages(pages);
      backTo(res, 'ok', `Đã kết nối ${pages.length} Trang Facebook.`);
    } catch (e) {
      log('error', `Kết nối Facebook: ${e.message}`);
      backTo(res, 'err', e.message);
    }
  });

  app.post('/api/facebook/token', async (req, res) => {
    try {
      const pages = await fb.pagesFromUserToken(S(), req.body && req.body.token);
      upsertFbPages(pages);
      res.json({ ok: true, count: pages.length, state: state() });
    } catch (e) {
      log('error', `Kết nối Facebook bằng token: ${e.message}`);
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/auth/tiktok/start', (req, res) => {
    const s = S();
    if (!s.ttClientKey || !s.ttClientSecret) return backTo(res, 'err', 'Nhập Client key và Client secret của app TikTok ở mục Cài đặt trước.');
    const { verifier, challenge } = tt.pkce(s.ttPkce);
    res.redirect(tt.authUrl(s, redirects().tt, newState('tiktok', { verifier }), challenge));
  });

  app.get('/auth/tiktok/callback', async (req, res) => {
    const q = req.query;
    const st = takeState(String(q.state || ''), 'tiktok');
    if (!st) return backTo(res, 'err', 'Phiên kết nối TikTok đã hết hạn, bấm Thêm kênh lại.');
    if (q.error) return backTo(res, 'err', `TikTok: ${q.error_description || q.error}`);
    try {
      const tok = await tt.exchangeCode(S(), redirects().tt, String(q.code || ''), st.verifier);
      const acc = { platform: 'tiktok', ...tok };
      const p = await tt.check(S(), acc);
      acc.name = p.name;
      acc.avatar = p.avatar;
      if (p.username) acc.username = p.username;
      const old = db.data.accounts.find((a) => a.platform === 'tiktok' && a.remoteId === acc.remoteId);
      if (old) Object.assign(old, acc, { needsReconnect: false });
      else db.data.accounts.push({ id: uid(6), addedAt: new Date().toISOString(), ...acc });
      db.saveNow();
      log('info', `Đã kết nối kênh TikTok "${acc.name}" (quyền: ${acc.scopes.join(', ')})`);
      backTo(res, 'ok', `Đã kết nối kênh TikTok "${acc.name}".`);
    } catch (e) {
      log('error', `Kết nối TikTok: ${e.message}`);
      backTo(res, 'err', e.message);
    }
  });

  app.post('/api/accounts/:id/check', async (req, res) => {
    const acc = db.data.accounts.find((a) => a.id === req.params.id);
    if (!acc) return res.status(404).json({ error: 'Không thấy tài khoản.' });
    try {
      const p = acc.platform === 'facebook' ? await fb.check(S(), acc) : await tt.check(S(), acc, () => db.save());
      Object.assign(acc, { name: p.name || acc.name, avatar: p.avatar || acc.avatar, needsReconnect: false });
      if (p.username) acc.username = p.username;
      db.saveNow();
      const extra = p.privacyOptions ? ` · Đăng thẳng được chọn: ${p.privacyOptions.map((x) => tt.PRIVACY_LABELS[x] || x).join(', ')}` : '';
      res.json({ ok: true, message: `"${acc.name}" hoạt động tốt${extra}.`, state: state() });
    } catch (e) {
      if (e.tokenInvalid) { acc.needsReconnect = true; db.saveNow(); }
      res.status(400).json({ error: e.message, state: state() });
    }
  });

  app.delete('/api/accounts/:id', (req, res) => {
    const i = db.data.accounts.findIndex((a) => a.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Không thấy tài khoản.' });
    const [acc] = db.data.accounts.splice(i, 1);
    for (const p of db.data.posts) {
      for (const t of p.targets) {
        if (t.accountId === acc.id && t.status === 'pending') Object.assign(t, { status: 'canceled', message: 'Tài khoản đã bị xoá khỏi app.', updatedAt: new Date().toISOString() });
      }
    }
    db.saveNow();
    log('info', `Đã xoá tài khoản ${acc.platform} "${acc.name}".`);
    res.json(state());
  });

  // ---------- bài đăng ----------
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, cb) => cb(null, `${Date.now()}-${uid(4)}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6)}`),
    }),
    limits: { fileSize: 4 * 1024 ** 3, files: 30 },
    defParamCharset: 'utf8',
  });

  function buildPost(d, files) {
    const ids = [...new Set(Array.isArray(d.accountIds) ? d.accountIds : [])];
    const accounts = ids.map((id) => db.data.accounts.find((a) => a.id === id)).filter(Boolean);
    if (!accounts.length) throw new Error('Chọn ít nhất một tài khoản để đăng.');
    const meta = Array.isArray(d.mediaMeta) ? d.mediaMeta : [];
    const media = files.map((f, i) => ({
      file: f.filename,
      name: f.originalname,
      size: f.size,
      mime: mimeOf(f.originalname) || f.mimetype,
      kind: kindOf(f.originalname),
      duration: Number(meta[i] && meta[i].duration) || 0,
      width: Number(meta[i] && meta[i].width) || 0,
      height: Number(meta[i] && meta[i].height) || 0,
    }));
    if (media.some((m) => !m.kind)) throw new Error('Chỉ nhận video (mp4, mov, webm) hoặc ảnh (jpg, png, webp).');
    const videos = media.filter((m) => m.kind === 'video');
    const images = media.filter((m) => m.kind === 'image');
    if (videos.length > 1) throw new Error('Mỗi bài chỉ một video. Chọn nhiều video thì app tự tách thành nhiều bài.');
    if (videos.length && images.length) throw new Error('Không trộn video với ảnh trong cùng một bài.');

    const o = d.options || {};
    const options = {
      fbType: ['auto', 'reel', 'video', 'photo', 'text'].includes(o.fbType) ? o.fbType : 'auto',
      fbNativeSchedule: !!o.fbNativeSchedule,
      ttMode: o.ttMode === 'direct' ? 'direct' : 'draft',
      ttPrivacy: String(o.ttPrivacy || ''),
      ttAllowComment: o.ttAllowComment !== false,
      ttAllowDuet: !!o.ttAllowDuet,
      ttAllowStitch: !!o.ttAllowStitch,
      ttAigc: !!o.ttAigc,
      ttBrandOrganic: !!o.ttBrandOrganic,
      ttBrandContent: !!o.ttBrandContent,
    };
    const caption = String(d.caption || '').trim();
    const captionFb = String(d.captionFb || '').trim();
    const captionTt = String(d.captionTt || '').trim();

    if (accounts.some((a) => a.platform === 'facebook')) {
      const type = fb.resolveType(options, media);
      const fbText = captionFb || caption;
      if ((type === 'reel' || type === 'video') && !videos.length) throw new Error('Facebook: kiểu Reels / Video cần chọn một video.');
      if (type === 'photo' && !images.length) throw new Error('Facebook: kiểu Bài ảnh cần chọn ảnh.');
      if (type === 'text' && media.length) throw new Error('Facebook: kiểu "Chỉ chữ" không kèm video/ảnh — đổi kiểu đăng hoặc bỏ file.');
      if (type === 'text' && !fbText) throw new Error('Facebook: bài chỉ có chữ thì phải viết nội dung.');
      if (fbText.length > FB_CAPTION_MAX) throw new Error('Caption Facebook quá dài.');
    }
    const ttAccounts = accounts.filter((a) => a.platform === 'tiktok');
    if (ttAccounts.length) {
      if (!videos.length) throw new Error('TikTok cần một video (app chỉ đăng video lên TikTok).');
      if ((captionTt || caption).length > TT_CAPTION_MAX) throw new Error(`Caption TikTok tối đa ${TT_CAPTION_MAX} ký tự.`);
      if (options.ttMode === 'direct') {
        if (!S().ttDirectPost) throw new Error('Chưa bật "App đã được duyệt đăng thẳng" trong Cài đặt — dùng cách "Gửi vào nháp".');
        if (!tt.PRIVACY_LABELS[options.ttPrivacy]) throw new Error('TikTok đăng thẳng: chọn "Ai được xem".');
        if (options.ttBrandContent && options.ttPrivacy === 'SELF_ONLY') throw new Error('TikTok: nội dung có tài trợ không thể để "Chỉ mình tôi".');
        const noScope = ttAccounts.filter((a) => !(a.scopes || []).includes('video.publish'));
        if (noScope.length) throw new Error(`Kênh ${noScope.map((a) => `"${a.name}"`).join(', ')} chưa cấp quyền đăng thẳng — vào Tài khoản kết nối lại.`);
      }
    }

    let at = d.scheduledAt ? new Date(d.scheduledAt) : new Date();
    if (Number.isNaN(at.getTime())) throw new Error('Thời gian hẹn không hợp lệ.');
    if (at.getTime() < Date.now()) at = new Date();
    const nowIso = new Date().toISOString();
    return {
      id: uid(6),
      createdAt: nowIso,
      scheduledAt: at.toISOString(),
      caption, captionFb, captionTt,
      media,
      options,
      targets: accounts.map((a) => ({ accountId: a.id, platform: a.platform, status: 'pending', message: '', url: '', attempts: 0, updatedAt: nowIso })),
    };
  }

  app.post('/api/posts', upload.array('media', 30), (req, res) => {
    const files = req.files || [];
    try {
      let d;
      try { d = JSON.parse(req.body.data || '{}'); } catch { throw new Error('Dữ liệu gửi lên bị lỗi.'); }
      const post = buildPost(d, files);
      db.data.posts.push(post);
      db.saveNow();
      log('info', `Đã thêm bài lúc ${new Date(post.scheduledAt).toLocaleString('vi-VN')} → ${post.targets.length} tài khoản.`);
      scheduler.kick();
      res.json({ ok: true, post });
    } catch (e) {
      for (const f of files) fs.rm(f.path, { force: true }, () => {});
      res.status(400).json({ error: e.message });
    }
  });

  const findPost = (req, res) => {
    const p = db.data.posts.find((x) => x.id === req.params.id);
    if (!p) res.status(404).json({ error: 'Không thấy bài này.' });
    return p;
  };

  app.patch('/api/posts/:id', (req, res) => {
    const post = findPost(req, res);
    if (!post) return;
    if (!post.targets.some((t) => t.status === 'pending')) return res.status(400).json({ error: 'Bài đã đăng hoặc đang đăng, không sửa được nữa.' });
    const b = req.body || {};
    if (b.scheduledAt) {
      const at = new Date(b.scheduledAt);
      if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Thời gian hẹn không hợp lệ.' });
      post.scheduledAt = (at.getTime() < Date.now() ? new Date() : at).toISOString();
    }
    for (const k of ['caption', 'captionFb', 'captionTt']) if (k in b) post[k] = String(b[k] || '').trim();
    if ((post.captionTt || post.caption).length > TT_CAPTION_MAX && post.targets.some((t) => t.platform === 'tiktok')) {
      return res.status(400).json({ error: `Caption TikTok tối đa ${TT_CAPTION_MAX} ký tự.` });
    }
    db.saveNow();
    scheduler.kick();
    res.json(state());
  });

  app.post('/api/posts/:id/now', (req, res) => {
    const post = findPost(req, res);
    if (!post) return;
    if (!post.targets.some((t) => t.status === 'pending')) return res.status(400).json({ error: 'Không còn tài khoản nào đang chờ đăng.' });
    post.scheduledAt = new Date().toISOString();
    db.saveNow();
    scheduler.kick();
    res.json(state());
  });

  app.post('/api/posts/:id/retry', (req, res) => {
    const post = findPost(req, res);
    if (!post) return;
    if (post.mediaRemoved) return res.status(400).json({ error: 'File của bài này đã được dọn, hãy tạo bài mới.' });
    const idx = req.body && Number.isInteger(req.body.index) ? [req.body.index] : post.targets.map((_, i) => i);
    let n = 0;
    for (const i of idx) {
      const t = post.targets[i];
      if (t && (t.status === 'error' || t.status === 'canceled')) {
        Object.assign(t, { status: 'pending', message: '', updatedAt: new Date().toISOString() });
        n++;
      }
    }
    if (!n) return res.status(400).json({ error: 'Không có gì để thử lại.' });
    // chưa đến giờ thì giữ giờ hẹn (muốn đăng luôn thì bấm "Đăng ngay")
    db.saveNow();
    scheduler.kick();
    res.json(state());
  });

  app.post('/api/posts/:id/cancel', (req, res) => {
    const post = findPost(req, res);
    if (!post) return;
    for (const t of post.targets) if (t.status === 'pending') Object.assign(t, { status: 'canceled', message: 'Đã huỷ.', updatedAt: new Date().toISOString() });
    db.saveNow();
    res.json(state());
  });

  app.delete('/api/posts/:id', (req, res) => {
    const post = findPost(req, res);
    if (!post) return;
    if (post.targets.some((t) => t.status === 'posting')) return res.status(409).json({ error: 'Bài đang được tải lên, đợi xong rồi xoá.' });
    db.data.posts = db.data.posts.filter((p) => p !== post);
    const used = new Set(db.data.posts.flatMap((p) => p.media.map((m) => m.file)));
    for (const m of post.media) if (!used.has(m.file)) fs.rm(path.join(uploadsDir, m.file), { force: true }, () => {});
    db.saveNow();
    res.json(state());
  });

  app.get('/media/:file', (req, res) => {
    const name = path.basename(req.params.file);
    res.sendFile(name, { root: uploadsDir, dotfiles: 'deny', maxAge: '1d' }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });

  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

  // lỗi chung (ví dụ file quá lớn)
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const msg = err instanceof multer.MulterError
      ? (err.code === 'LIMIT_FILE_SIZE' ? 'File quá lớn (tối đa 4 GB).' : `Lỗi tải file: ${err.message}`)
      : err.message || 'Lỗi không xác định';
    if (!(err instanceof multer.MulterError)) log('error', `Lỗi máy chủ: ${msg}`);
    res.status(err instanceof multer.MulterError ? 400 : err.status || 500).json({ error: msg });
  });

  return { app, db, scheduler, port, log };
}

if (require.main === module) {
  const { app, port, log } = createApp();
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log('');
    console.log('  📮 Tự Đăng Bài đang chạy');
    console.log(`  Mở trên máy này:  http://localhost:${port}`);
    for (const ip of lanAddresses()) console.log(`  Điện thoại cùng Wi-Fi (cần đặt mật khẩu): http://${ip}:${port}`);
    console.log('  Để cửa sổ này mở thì bài hẹn giờ mới tự đăng. Đóng cửa sổ = dừng app.');
    console.log('');
    log('info', `Khởi động bản ${pkg.version}`);
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') console.error(`Cổng ${port} đang bị dùng — có thể app đã mở ở cửa sổ khác. Mở http://localhost:${port}`);
    else console.error(e);
    process.exit(1);
  });
}

module.exports = { createApp };
