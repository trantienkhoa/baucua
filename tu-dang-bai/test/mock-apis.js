'use strict';
// Máy chủ giả lập Facebook Graph API + TikTok API để kiểm thử mà không cần tài khoản thật.
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

function startMock() {
  const app = express();
  const calls = [];
  const challenges = new Map(); // code → code_challenge
  const uploads = {};           // publish_id / video_id → { bytes, ranges }
  let base = '';
  const opts = { ttPrivacy: ['SELF_ONLY'], ttFailNext: null };

  app.use((req, res, next) => { calls.push({ method: req.method, path: req.path, query: { ...req.query } }); next(); });
  const form = express.urlencoded({ extended: false });
  const mp = multer({ storage: multer.memoryStorage() });
  const last = () => calls[calls.length - 1];

  // ---------- Facebook ----------
  app.get('/:ver/dialog/oauth', (req, res) => {
    res.redirect(`${req.query.redirect_uri}?code=FBCODE&state=${encodeURIComponent(req.query.state)}`);
  });
  app.get('/:ver/oauth/access_token', (req, res) => {
    if (req.query.grant_type === 'fb_exchange_token') return res.json({ access_token: 'LONG_USER', token_type: 'bearer' });
    if (req.query.code !== 'FBCODE') return res.status(400).json({ error: { message: 'Invalid code', code: 100 } });
    res.json({ access_token: 'SHORT_USER', token_type: 'bearer' });
  });
  app.get('/:ver/me/accounts', (req, res) => {
    if (req.query.access_token !== 'LONG_USER') return res.status(400).json({ error: { message: 'bad token', code: 190 } });
    res.json({ data: [
      { id: '111', name: 'Trang Một', access_token: 'PAGE_111', picture: { data: { url: 'http://img/1.png' } }, tasks: ['CREATE_CONTENT', 'MANAGE'] },
      { id: '222', name: 'Trang Hai', access_token: 'PAGE_222', picture: { data: { url: '' } }, tasks: ['CREATE_CONTENT'] },
    ] });
  });
  app.post('/:ver/:page/feed', form, (req, res) => {
    last().body = { ...req.body };
    if (req.body.access_token === 'PAGE_BAD') return res.status(400).json({ error: { message: 'Error validating access token', code: 190 } });
    res.json({ id: `${req.params.page}_feed1` });
  });
  let photoN = 0;
  app.post('/:ver/:page/photos', mp.any(), (req, res) => {
    last().body = { ...req.body };
    last().files = (req.files || []).map((f) => ({ field: f.fieldname, name: f.originalname, size: f.size, type: f.mimetype }));
    photoN++;
    res.json({ id: `photo${photoN}`, post_id: `${req.params.page}_photo${photoN}` });
  });
  app.post('/:ver/:page/videos', mp.any(), (req, res) => {
    last().body = { ...req.body };
    last().files = (req.files || []).map((f) => ({ field: f.fieldname, name: f.originalname, size: f.size }));
    res.json({ id: 'vid1' });
  });
  app.post('/:ver/:page/video_reels', form, (req, res) => {
    last().body = { ...req.body };
    if (req.body.upload_phase === 'start') return res.json({ video_id: 'reel1', upload_url: `${base}/video-upload/v25.0/reel1` });
    if (req.body.upload_phase === 'finish') return res.json({ success: true });
    res.status(400).json({ error: { message: 'bad phase', code: 100 } });
  });
  app.post('/video-upload/:ver/:id', express.raw({ type: '*/*', limit: '200mb' }), (req, res) => {
    last().headers = { authorization: req.headers.authorization, offset: req.headers.offset, file_size: req.headers.file_size };
    uploads[req.params.id] = { bytes: req.body.length };
    res.json({ success: true });
  });
  app.get('/:ver/:id', (req, res) => {
    if (req.query.fields === 'status') return res.json({ status: { video_status: 'ready', publishing_phase: { status: 'complete' } }, id: req.params.id });
    if (req.query.access_token && req.query.access_token.startsWith('PAGE_')) return res.json({ id: '111', name: 'Trang Một (mới)', picture: { data: { url: 'http://img/1b.png' } } });
    res.status(404).json({ error: { message: 'not found', code: 803 } });
  });

  // ---------- TikTok ----------
  let codeN = 0;
  app.get('/v2/auth/authorize/', (req, res) => {
    codeN++;
    const code = `TTCODE${codeN}`;
    challenges.set(code, { challenge: req.query.code_challenge, scope: req.query.scope, n: codeN });
    res.redirect(`${req.query.redirect_uri}?code=${code}&scopes=${encodeURIComponent(req.query.scope)}&state=${encodeURIComponent(req.query.state)}`);
  });
  app.post('/v2/oauth/token/', form, (req, res) => {
    last().body = { ...req.body };
    if (req.body.grant_type === 'refresh_token') {
      return res.json({ access_token: `ACCESS_R_${req.body.refresh_token}`, refresh_token: req.body.refresh_token, expires_in: 86400, refresh_expires_in: 31536000, open_id: 'x', scope: 'user.info.basic,video.upload,video.publish', token_type: 'Bearer' });
    }
    const c = challenges.get(req.body.code);
    if (!c) return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code is expired.' });
    const expect = crypto.createHash('sha256').update(req.body.code_verifier || '').digest('hex');
    if (expect !== c.challenge) return res.status(400).json({ error: 'invalid_request', error_description: 'Code verifier or code challenge is invalid.' });
    res.json({ access_token: `ACCESS_${c.n}`, refresh_token: `REFRESH_${c.n}`, expires_in: 86400, refresh_expires_in: 31536000, open_id: `open_${c.n}`, scope: c.scope, token_type: 'Bearer' });
  });
  const ttAuth = (req) => /^Bearer ACCESS_/.test(req.headers.authorization || '');
  const ok = (data) => ({ data, error: { code: 'ok', message: '', log_id: 'log1' } });
  app.get('/v2/user/info/', (req, res) => {
    if (!ttAuth(req)) return res.status(401).json({ data: {}, error: { code: 'access_token_invalid', message: 'The access token is invalid or not found in the request.' } });
    const n = (req.headers.authorization.match(/ACCESS_(?:R_REFRESH_)?(\d+)/) || [])[1] || '1';
    res.json(ok({ user: { open_id: `open_${n}`, display_name: `Kênh ${n}`, avatar_url: `http://img/tt${n}.png` } }));
  });
  app.post('/v2/post/publish/creator_info/query/', express.json(), (req, res) => {
    res.json(ok({ creator_username: 'kenh_mot', creator_nickname: 'Kênh 1', privacy_level_options: opts.ttPrivacy, comment_disabled: false, duet_disabled: false, stitch_disabled: true, max_video_post_duration_sec: 600 }));
  });
  let pubN = 0;
  function initHandler(kind) {
    return (req, res) => {
      last().body = req.body;
      if (opts.ttFailNext) { const code = opts.ttFailNext; opts.ttFailNext = null; return res.status(403).json({ data: {}, error: { code, message: code } }); }
      const si = req.body.source_info || {};
      if (si.source !== 'FILE_UPLOAD' || !si.video_size || !si.chunk_size || !si.total_chunk_count) return res.status(400).json({ data: {}, error: { code: 'invalid_params', message: 'bad source_info' } });
      pubN++;
      const id = `v_${kind}.${pubN}`;
      uploads[id] = { size: si.video_size, chunk: si.chunk_size, count: si.total_chunk_count, ranges: [], bytes: 0, kind };
      res.json(ok({ publish_id: id, upload_url: `${base}/tt-upload/${id}` }));
    };
  }
  app.post('/v2/post/publish/inbox/video/init/', express.json(), initHandler('inbox'));
  app.post('/v2/post/publish/video/init/', express.json(), initHandler('direct'));
  app.put('/tt-upload/:id', express.raw({ type: '*/*', limit: '200mb' }), (req, res) => {
    const u = uploads[req.params.id];
    if (!u) return res.status(404).end();
    const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(req.headers['content-range'] || '');
    if (!m || Number(m[3]) !== u.size || Number(m[2]) - Number(m[1]) + 1 !== req.body.length) return res.status(416).end();
    if (Number(m[1]) !== u.bytes) return res.status(416).end(); // phải gửi lần lượt
    u.ranges.push([Number(m[1]), Number(m[2])]);
    u.bytes += req.body.length;
    u.type = req.headers['content-type'];
    res.status(u.bytes === u.size ? 201 : 206).end();
  });
  app.post('/v2/post/publish/status/fetch/', express.json(), (req, res) => {
    const u = uploads[req.body.publish_id];
    if (!u) return res.status(400).json({ data: {}, error: { code: 'invalid_publish_id', message: 'x' } });
    if (u.bytes !== u.size) return res.json(ok({ status: 'PROCESSING_UPLOAD' }));
    if (u.kind === 'inbox') return res.json(ok({ status: 'SEND_TO_USER_INBOX' }));
    // ID 19 chữ số dạng số trần — kiểm tra không bị làm tròn
    res.type('application/json').send('{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[7312345678901234567],"uploaded_bytes":1},"error":{"code":"ok","message":""}}');
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve({ base, calls, uploads, opts, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

module.exports = { startMock };
