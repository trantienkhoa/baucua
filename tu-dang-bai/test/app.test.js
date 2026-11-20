'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { startMock } = require('./mock-apis');

let mock;
let srv;
let ctx;
let base;
let dataDir;

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
const H = { 'x-tdb': '1' };

async function api(method, url, body) {
  const r = await fetch(base + url, { method, headers: { ...H, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

async function createPost(data, files = []) {
  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  for (const f of files) fd.append('media', new Blob([f.buf], { type: f.type || 'application/octet-stream' }), f.name);
  const r = await fetch(`${base}/api/posts`, { method: 'POST', headers: H, body: fd });
  return { status: r.status, json: await r.json() };
}

// đi theo chuỗi chuyển hướng OAuth (app → máy chủ giả → app)
async function followOAuth(startPath) {
  let url = base + startPath;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { redirect: 'manual' });
    const loc = r.headers.get('location');
    if (!loc) throw new Error(`no redirect from ${url}`);
    if (loc.startsWith('/')) return decodeURIComponent(loc);
    url = loc;
  }
  throw new Error('too many redirects');
}

async function until(fn, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 50));
  }
}
const getPost = (id) => ctx.db.data.posts.find((p) => p.id === id);
const settled = (id) => until(() => { const p = getPost(id); return p && p.targets.every((t) => !['pending', 'posting', 'processing'].includes(t.status)) && p; });
const acc = (platform, i = 0) => ctx.db.data.accounts.filter((a) => a.platform === platform)[i];
const VIDEO = { name: 'clip tối nay.mp4', type: 'video/mp4', buf: Buffer.alloc(300 * 1024, 7) };

before(async () => {
  mock = await startMock();
  process.env.FB_GRAPH_BASE = mock.base;
  process.env.FB_VIDEO_BASE = mock.base;
  process.env.FB_DIALOG_BASE = mock.base;
  process.env.TIKTOK_API_BASE = mock.base;
  process.env.TIKTOK_AUTH_BASE = mock.base;
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdb-test-'));
  const port = await freePort();
  const { createApp } = require('../server');
  ctx = createApp({ port, dataDir, tickMs: 100, pollMs: 50, quiet: true });
  await new Promise((r) => { srv = ctx.app.listen(port, '127.0.0.1', r); });
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  ctx.scheduler.stop();
  await new Promise((r) => srv.close(r));
  await mock.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('trang chính và bảo vệ cơ bản', async () => {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Tự Đăng Bài/);
  // thiếu header chống CSRF
  const noHdr = await fetch(`${base}/api/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(noHdr.status, 403);
  // tên miền lạ (DNS rebinding)
  const evil = await new Promise((resolve) => {
    require('http').get({ host: '127.0.0.1', port: new URL(base).port, path: '/api/state', headers: { Host: 'evil.example.com' } }, (r) => resolve(r.statusCode));
  });
  assert.equal(evil, 403);
});

test('kết nối khi chưa cài đặt app báo lỗi dễ hiểu', async () => {
  const loc = await followOAuth('/auth/facebook/start');
  assert.match(loc, /err=.*App ID/);
  const loc2 = await followOAuth('/auth/tiktok/start');
  assert.match(loc2, /err=.*Client key/);
});

test('lưu cài đặt, ẩn khoá bí mật', async () => {
  const r = await api('POST', '/api/settings', { fbAppId: '123', fbAppSecret: 'SECRET', ttClientKey: 'ck', ttClientSecret: 'cs', cleanupDays: 3 });
  assert.equal(r.status, 200);
  assert.equal(r.json.settings.hasFbSecret, true);
  assert.equal(JSON.stringify(r.json).includes('SECRET'), false);
  assert.equal(r.json.urls.ttRedirect, `http://localhost:${ctx.port}/auth/tiktok/callback/`);
  const bad = await api('POST', '/api/settings', { publicUrl: 'abc' });
  assert.equal(bad.status, 400);
});

test('kết nối Facebook qua OAuth lấy được các Trang', async () => {
  const loc = await followOAuth('/auth/facebook/start');
  assert.match(loc, /ok=Đã kết nối 2 Trang/);
  const pages = ctx.db.data.accounts.filter((a) => a.platform === 'facebook');
  assert.deepEqual(pages.map((p) => p.token), ['PAGE_111', 'PAGE_222']);
  const st = await api('GET', '/api/state');
  assert.equal(JSON.stringify(st.json).includes('PAGE_111'), false, 'token không lộ ra giao diện');
  // dán token cũng chạy, không tạo trùng
  const r = await api('POST', '/api/facebook/token', { token: 'pasted' });
  assert.equal(r.status, 200);
  assert.equal(ctx.db.data.accounts.filter((a) => a.platform === 'facebook').length, 2);
});

test('kết nối 2 kênh TikTok (PKCE hex)', async () => {
  const l1 = await followOAuth('/auth/tiktok/start');
  assert.match(l1, /ok=Đã kết nối kênh TikTok "Kênh 1"/);
  const l2 = await followOAuth('/auth/tiktok/start');
  assert.match(l2, /Kênh 2/);
  const tts = ctx.db.data.accounts.filter((a) => a.platform === 'tiktok');
  assert.equal(tts.length, 2);
  assert.deepEqual(tts[0].scopes, ['user.info.basic', 'video.upload']);
  const tokenCall = mock.calls.find((c) => c.path === '/v2/oauth/token/' && c.body && c.body.grant_type === 'authorization_code');
  assert.equal(tokenCall.body.redirect_uri, `http://localhost:${ctx.port}/auth/tiktok/callback/`);
  // state sai bị từ chối
  const bad = await fetch(`${base}/auth/tiktok/callback/?code=x&state=sai`, { redirect: 'manual' });
  assert.match(decodeURIComponent(bad.headers.get('location')), /hết hạn/);
});

test('đăng Reels Facebook + gửi nháp TikTok cùng lúc', async () => {
  const r = await createPost({ caption: 'Tối nay quẩy 🔥 #fyp', accountIds: [acc('facebook').id, acc('tiktok').id], options: {} }, [VIDEO]);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.post.media[0].name, 'clip tối nay.mp4', 'giữ đúng tên file tiếng Việt');
  const p = await settled(r.json.post.id);
  const [f, t] = p.targets;
  assert.equal(f.status, 'done', f.message);
  assert.equal(f.url, 'https://www.facebook.com/reel/reel1');
  assert.equal(t.status, 'draft', t.message);
  const fin = mock.calls.find((c) => c.path === '/v25.0/111/video_reels' && c.body.upload_phase === 'finish');
  assert.equal(fin.body.description, 'Tối nay quẩy 🔥 #fyp');
  assert.equal(fin.body.video_state, 'PUBLISHED');
  assert.equal(mock.uploads.reel1.bytes, VIDEO.buf.length);
  const up = mock.calls.find((c) => c.path === '/video-upload/v25.0/reel1');
  assert.equal(up.headers.authorization, 'OAuth PAGE_111');
  assert.equal(up.headers.file_size, String(VIDEO.buf.length));
  const inbox = mock.calls.find((c) => c.path === '/v2/post/publish/inbox/video/init/');
  assert.deepEqual(inbox.body, { source_info: { source: 'FILE_UPLOAD', video_size: VIDEO.buf.length, chunk_size: VIDEO.buf.length, total_chunk_count: 1 } });
});

test('Facebook: bài nhiều ảnh, bài chữ, video thường', async () => {
  const img = (n) => ({ name: `anh${n}.jpg`, type: 'image/jpeg', buf: Buffer.alloc(2000, n) });
  const a = await createPost({ caption: 'Album', accountIds: [acc('facebook').id] }, [img(1), img(2)]);
  const pa = await settled(a.json.post.id);
  assert.equal(pa.targets[0].status, 'done', pa.targets[0].message);
  const feed = mock.calls.filter((c) => c.path === '/v25.0/111/feed').pop();
  assert.equal(feed.body.message, 'Album');
  assert.ok(feed.body['attached_media[0]'] && feed.body['attached_media[1]']);

  const b = await createPost({ caption: 'Chỉ chữ thôi', accountIds: [acc('facebook', 1).id] });
  const pb = await settled(b.json.post.id);
  assert.equal(pb.targets[0].status, 'done');
  assert.equal(pb.targets[0].url, 'https://www.facebook.com/222_feed1');

  const c = await createPost({ caption: 'Video ngang', captionFb: 'Riêng FB', accountIds: [acc('facebook').id], options: { fbType: 'video' } }, [VIDEO]);
  const pc = await settled(c.json.post.id);
  assert.equal(pc.targets[0].status, 'done');
  const vcall = mock.calls.find((x) => x.path === '/v25.0/111/videos');
  assert.equal(vcall.body.description, 'Riêng FB');
  assert.equal(vcall.files[0].size, VIDEO.buf.length);
});

test('hẹn giờ: Facebook gửi lịch lên Facebook ngay, TikTok chờ đến giờ', async () => {
  const at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const r = await createPost({ caption: 'Hẹn 1 tiếng', accountIds: [acc('facebook').id, acc('tiktok').id], scheduledAt: at, options: { fbNativeSchedule: true } }, [VIDEO]);
  const id = r.json.post.id;
  await until(() => getPost(id).targets[0].status === 'scheduled_remote');
  const fin = mock.calls.filter((c) => c.path === '/v25.0/111/video_reels' && c.body.upload_phase === 'finish').pop();
  assert.equal(fin.body.video_state, 'SCHEDULED');
  assert.equal(Number(fin.body.scheduled_publish_time), Math.floor(Date.parse(at) / 1000));
  await new Promise((res) => setTimeout(res, 400));
  assert.equal(getPost(id).targets[1].status, 'pending', 'TikTok chưa đăng khi chưa đến giờ');
  // sửa giờ + caption, rồi đăng ngay
  const e = await api('PATCH', `/api/posts/${id}`, { caption: 'Đổi caption', scheduledAt: new Date(Date.now() + 7200e3).toISOString() });
  assert.equal(e.status, 200);
  const n = await api('POST', `/api/posts/${id}/now`, {});
  assert.equal(n.status, 200);
  await until(() => getPost(id).targets[1].status === 'draft');
  const p = getPost(id);
  assert.equal(p.targets[0].status, 'scheduled_remote', 'Facebook vẫn chờ giờ đã hẹn, không bị coi là đã đăng');
  assert.equal(p.targets[0].remoteAt, new Date(Math.floor(Date.parse(at) / 1000) * 1000).toISOString());
  // đến giờ Facebook đã hẹn → chuyển thành đã đăng
  p.targets[0].remoteAt = new Date(Date.now() - 1000).toISOString();
  await until(() => getPost(id).targets[0].status === 'done');
});

test('TikTok đăng thẳng: kiểm tra quyền riêng tư, lấy đúng ID video 19 số', async () => {
  // chưa bật đăng thẳng → từ chối
  const r0 = await createPost({ caption: 'x', accountIds: [acc('tiktok').id], options: { ttMode: 'direct', ttPrivacy: 'SELF_ONLY' } }, [VIDEO]);
  assert.equal(r0.status, 400);
  assert.match(r0.json.error, /đăng thẳng/);
  await api('POST', '/api/settings', { ttDirectPost: true });
  // kênh kết nối trước khi bật chưa có quyền video.publish
  const r1 = await createPost({ caption: 'x', accountIds: [acc('tiktok').id], options: { ttMode: 'direct', ttPrivacy: 'SELF_ONLY' } }, [VIDEO]);
  assert.equal(r1.status, 400);
  assert.match(r1.json.error, /kết nối lại/);
  // kết nối lại → có video.publish
  await followOAuth('/auth/tiktok/start');
  const t3 = ctx.db.data.accounts.filter((a) => a.platform === 'tiktok').pop();
  assert.ok(t3.scopes.includes('video.publish'));
  // chọn "Mọi người" trong khi app chưa audit chỉ cho SELF_ONLY → lỗi rõ ràng
  const r2 = await createPost({ caption: 'Công khai', accountIds: [t3.id], options: { ttMode: 'direct', ttPrivacy: 'PUBLIC_TO_EVERYONE' } }, [VIDEO]);
  const p2 = await settled(r2.json.post.id);
  assert.equal(p2.targets[0].status, 'error');
  assert.match(p2.targets[0].message, /Chỉ mình tôi/);
  // SELF_ONLY → đăng được
  const r3 = await createPost({ caption: 'Caption chung', captionTt: 'Caption TikTok #fyp', accountIds: [t3.id], options: { ttMode: 'direct', ttPrivacy: 'SELF_ONLY', ttAllowComment: true, ttAigc: true } }, [VIDEO]);
  const p3 = await settled(r3.json.post.id);
  assert.equal(p3.targets[0].status, 'done', p3.targets[0].message);
  assert.equal(p3.targets[0].url, 'https://www.tiktok.com/@kenh_mot/video/7312345678901234567');
  const init = mock.calls.filter((c) => c.path === '/v2/post/publish/video/init/').pop();
  assert.equal(init.body.post_info.title, 'Caption TikTok #fyp');
  assert.equal(init.body.post_info.privacy_level, 'SELF_ONLY');
  assert.equal(init.body.post_info.disable_comment, false);
  assert.equal(init.body.post_info.disable_stitch, true);
  assert.equal(init.body.post_info.is_aigc, true);
});

test('TikTok báo lỗi → thông báo tiếng Việt, bấm Thử lại thì đăng được', async () => {
  mock.opts.ttFailNext = 'spam_risk_too_many_pending_share';
  const r = await createPost({ caption: 'nháp', accountIds: [acc('tiktok', 1).id] }, [VIDEO]);
  const p = await settled(r.json.post.id);
  assert.equal(p.targets[0].status, 'error');
  assert.match(p.targets[0].message, /tối đa 5/);
  const rt = await api('POST', `/api/posts/${p.id}/retry`, { index: 0 });
  assert.equal(rt.status, 200);
  const p2 = await settled(p.id);
  assert.equal(p2.targets[0].status, 'draft');
  assert.equal(p2.targets[0].attempts, 2);
});

test('token Facebook hết hạn → đánh dấu cần kết nối lại', async () => {
  const a = acc('facebook', 1);
  const good = a.token;
  a.token = 'PAGE_BAD';
  const r = await createPost({ caption: 'thử', accountIds: [a.id] });
  const p = await settled(r.json.post.id);
  assert.equal(p.targets[0].status, 'error');
  assert.match(p.targets[0].message, /kết nối lại Facebook/);
  assert.equal(a.needsReconnect, true);
  a.token = good;
  a.needsReconnect = false;
});

test('kiểm tra hợp lệ khi tạo bài', async () => {
  const img = { name: 'a.png', type: 'image/png', buf: Buffer.alloc(100) };
  const cases = [
    [{ caption: 'x', accountIds: [] }, [], /Chọn ít nhất/],
    [{ caption: 'x', accountIds: [acc('tiktok').id] }, [img], /TikTok cần một video/],
    [{ caption: 'x', accountIds: [acc('facebook').id] }, [VIDEO, VIDEO], /Mỗi bài chỉ một video/],
    [{ caption: 'x', accountIds: [acc('facebook').id] }, [VIDEO, img], /Không trộn/],
    [{ caption: 'x', accountIds: [acc('facebook').id] }, [{ name: 'a.exe', buf: Buffer.alloc(5) }], /Chỉ nhận video/],
    [{ caption: '', accountIds: [acc('facebook').id] }, [], /phải viết nội dung/],
    [{ caption: 'x'.repeat(2201), accountIds: [acc('tiktok').id] }, [VIDEO], /2200/],
    [{ caption: 'x', accountIds: [acc('facebook').id], options: { fbType: 'photo' } }, [VIDEO], /Bài ảnh cần/],
  ];
  const before = fs.readdirSync(path.join(dataDir, 'uploads')).length;
  for (const [data, files, re] of cases) {
    const r = await createPost(data, files);
    assert.equal(r.status, 400, JSON.stringify(data));
    assert.match(r.json.error, re);
  }
  await until(() => fs.readdirSync(path.join(dataDir, 'uploads')).length === before); // file của bài bị từ chối đã được xoá
});

test('chia file lớn thành nhiều phần đúng luật TikTok', async () => {
  const tt = require('../lib/tiktok');
  const MB = 1024 * 1024;
  assert.deepEqual(tt.chunkPlan(3 * MB), { chunkSize: 3 * MB, count: 1 });
  assert.deepEqual(tt.chunkPlan(64 * MB), { chunkSize: 64 * MB, count: 1 });
  assert.deepEqual(tt.chunkPlan(150 * MB + 123), { chunkSize: 10 * MB, count: 15 });
  // tải thật một file 95 MB (file thưa) lên máy chủ giả
  const big = path.join(dataDir, 'big.mp4');
  fs.closeSync(fs.openSync(big, 'w'));
  fs.truncateSync(big, 95 * MB + 777);
  mock.uploads.bigtest = { size: 95 * MB + 777, ranges: [], bytes: 0, kind: 'inbox' };
  await tt.uploadChunks(`${mock.base}/tt-upload/bigtest`, big, 95 * MB + 777, 'video/mp4');
  const u = mock.uploads.bigtest;
  assert.equal(u.bytes, u.size);
  assert.equal(u.ranges.length, 9);
  assert.deepEqual(u.ranges[8], [80 * MB, 95 * MB + 776]);
  fs.rmSync(big);
});

test('huỷ, xoá bài và xoá tài khoản', async () => {
  const at = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 phút: chưa đủ để gửi lịch Facebook
  const r = await createPost({ caption: 'sẽ huỷ', accountIds: [acc('facebook').id, acc('tiktok').id], scheduledAt: at, options: { fbNativeSchedule: true } }, [VIDEO]);
  const id = r.json.post.id;
  await new Promise((res) => setTimeout(res, 300));
  assert.deepEqual(getPost(id).targets.map((t) => t.status), ['pending', 'pending']);
  const file = path.join(dataDir, 'uploads', getPost(id).media[0].file);
  assert.ok(fs.existsSync(file));
  await api('POST', `/api/posts/${id}/cancel`, {});
  assert.deepEqual(getPost(id).targets.map((t) => t.status), ['canceled', 'canceled']);
  const d = await api('DELETE', `/api/posts/${id}`);
  assert.equal(d.status, 200);
  assert.equal(getPost(id), undefined);
  await until(() => !fs.existsSync(file));

  const r2 = await createPost({ caption: 'chờ', accountIds: [acc('tiktok', 1).id], scheduledAt: at }, [VIDEO]);
  const victim = acc('tiktok', 1).id;
  await api('DELETE', `/api/accounts/${victim}`);
  assert.equal(getPost(r2.json.post.id).targets[0].status, 'canceled');
});

test('kiểm tra tài khoản và nhật ký', async () => {
  const r = await api('POST', `/api/accounts/${acc('facebook').id}/check`, {});
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(acc('facebook').name, 'Trang Một (mới)');
  const t = acc('tiktok');
  t.expiresAt = Date.now() - 1000; // token hết hạn → tự làm mới
  const r2 = await api('POST', `/api/accounts/${t.id}/check`, {});
  assert.equal(r2.status, 200, JSON.stringify(r2.json));
  assert.match(t.token, /^ACCESS_R_/);
  assert.ok(t.expiresAt > Date.now());
  const logs = await api('GET', '/api/logs');
  assert.ok(logs.json.length > 5);
});

test('khởi động lại khi đang đăng dở → báo lỗi, không tự đăng trùng', async () => {
  const { createDb } = require('../lib/db');
  const { createScheduler } = require('../lib/scheduler');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdb-restart-'));
  const db1 = createDb(dir);
  db1.data.posts.push({ id: 'p1', scheduledAt: new Date().toISOString(), media: [], options: {}, targets: [{ accountId: 'a', status: 'posting', updatedAt: new Date().toISOString() }] });
  db1.saveNow();
  const db2 = createDb(dir);
  const sch = createScheduler({ db: db2, log: () => {}, uploadsDir: dir, tickMs: 100000 });
  sch.stop();
  db2.saveNow();
  assert.equal(db2.data.posts[0].targets[0].status, 'error');
  assert.match(db2.data.posts[0].targets[0].message, /tắt giữa lúc/);
  fs.rmSync(dir, { recursive: true, force: true });
});
