'use strict';
// Đăng bài lên Trang Facebook qua Graph API chính thức (miễn phí).
// Chỉ đăng được lên Trang (Page) bạn làm quản trị viên — Facebook không cho app đăng lên trang cá nhân hay nhóm.
const fs = require('fs');
const API = require('./api');
const { ApiError, readBody, netError } = require('./util');

const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];

const HINTS = {
  190: 'Token Facebook đã hết hạn hoặc bị thu hồi — vào mục Tài khoản, kết nối lại Facebook.',
  10: 'App Meta chưa có quyền này — kiểm tra quyền pages_manage_posts.',
  200: 'Thiếu quyền đăng lên Trang (cần pages_manage_posts và bạn phải là quản trị viên Trang).',
  368: 'Facebook tạm chặn hành động này (nghi spam). Đợi một lúc rồi thử lại.',
  4: 'App gọi Facebook quá nhiều, đợi vài phút rồi bấm Thử lại.',
  17: 'Tài khoản gọi Facebook quá nhiều, đợi vài phút rồi bấm Thử lại.',
  32: 'Trang gọi Facebook quá nhiều, đợi vài phút rồi bấm Thử lại.',
  613: 'Đăng quá nhanh, đợi vài phút rồi bấm Thử lại.',
  6000: 'Facebook không xử lý được video (sai định dạng hoặc lỗi khi tải lên).',
};

const ver = (s) => (s.fbApiVersion && /^v\d+\.\d+$/.test(s.fbApiVersion) ? s.fbApiVersion : 'v25.0');
const graph = (s, p) => `${API.fbGraph}/${ver(s)}/${p}`;

async function call(url, opts = {}) {
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    throw netError('Facebook', e);
  }
  const body = await readBody(res);
  if (!res.ok || (body && body.error)) {
    const e = (body && body.error) || {};
    const hint = HINTS[e.code] ? `${HINTS[e.code]} ` : '';
    const detail = e.error_user_msg || e.message || (body && body._raw ? String(body._raw).slice(0, 200) : `HTTP ${res.status}`);
    throw new ApiError(`${hint}(Facebook: ${detail})`, { status: res.status, code: e.code, tokenInvalid: e.code === 190 });
  }
  return body;
}

function clean(params) {
  const out = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  return out;
}

const postForm = (url, params) => call(url, { method: 'POST', body: new URLSearchParams(clean(params)) });

async function postFile(url, params, field, filePath, fileName, mime) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(clean(params))) fd.append(k, v);
  fd.append(field, await fs.openAsBlob(filePath, { type: mime }), fileName);
  return call(url, { method: 'POST', body: fd });
}

// ---------- kết nối tài khoản ----------
function authUrl(s, redirectUri, state) {
  const q = new URLSearchParams({ client_id: s.fbAppId, redirect_uri: redirectUri, state, scope: SCOPES.join(','), response_type: 'code' });
  return `${API.fbDialog}/${ver(s)}/dialog/oauth?${q}`;
}

function requireApp(s) {
  if (!s.fbAppId || !s.fbAppSecret) throw new ApiError('Chưa nhập App ID và App Secret của app Meta (mục Cài đặt).');
}

async function exchangeCode(s, redirectUri, code) {
  requireApp(s);
  const q = new URLSearchParams({ client_id: s.fbAppId, client_secret: s.fbAppSecret, redirect_uri: redirectUri, code });
  return (await call(graph(s, `oauth/access_token?${q}`))).access_token;
}

async function longLivedUserToken(s, token) {
  const q = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: s.fbAppId, client_secret: s.fbAppSecret, fb_exchange_token: token });
  return (await call(graph(s, `oauth/access_token?${q}`))).access_token;
}

// Đổi token người dùng → token dài hạn → token của từng Trang (token Trang lấy từ token dài hạn không hết hạn)
async function pagesFromUserToken(s, userToken) {
  requireApp(s);
  const token = String(userToken || '').trim();
  if (!token) throw new ApiError('Chưa dán token.');
  const longToken = await longLivedUserToken(s, token);
  const pages = [];
  let url = graph(s, `me/accounts?${new URLSearchParams({ fields: 'id,name,access_token,picture{url},tasks', limit: '100', access_token: longToken })}`);
  while (url && pages.length < 500) {
    const r = await call(url);
    pages.push(...(r.data || []));
    url = r.paging && r.paging.next;
  }
  if (!pages.length) {
    throw new ApiError('Không thấy Trang nào. Bạn cần là quản trị viên của Trang và tick chọn Trang + cấp đủ quyền (pages_show_list, pages_manage_posts) khi đăng nhập.');
  }
  return pages.map((p) => ({
    remoteId: p.id,
    name: p.name,
    avatar: (p.picture && p.picture.data && p.picture.data.url) || '',
    token: p.access_token,
    canPost: !Array.isArray(p.tasks) || p.tasks.includes('CREATE_CONTENT'),
  }));
}

async function check(s, account) {
  const r = await call(graph(s, `me?${new URLSearchParams({ fields: 'id,name,picture{url}', access_token: account.token })}`));
  return { name: r.name, avatar: (r.picture && r.picture.data && r.picture.data.url) || account.avatar };
}

// ---------- đăng bài ----------
function resolveType(options, media) {
  const t = (options && options.fbType) || 'auto';
  if (t !== 'auto') return t;
  if (!media.length) return 'text';
  return media[0].kind === 'video' ? 'reel' : 'photo';
}

const postUrl = (id) => `https://www.facebook.com/${id}`;

// scheduleUnix: nếu có, Facebook tự đăng lúc đó (không cần để máy bật)
async function publish(s, account, post, { mediaPath, scheduleUnix } = {}) {
  const page = account.remoteId;
  const token = account.token;
  const message = String(post.captionFb || post.caption || '').trim();
  const type = resolveType(post.options, post.media);
  const sched = scheduleUnix ? { published: 'false', scheduled_publish_time: scheduleUnix } : {};
  const finished = (url, remoteId) => (scheduleUnix
    ? { status: 'scheduled_remote', url, remoteId, message: 'Đã gửi lịch lên Facebook — Facebook sẽ tự đăng đúng giờ.' }
    : { status: 'done', url, remoteId, message: 'Đã đăng.' });

  if (type === 'text') {
    if (!message) throw new ApiError('Bài chỉ có chữ thì phải có nội dung.');
    const r = await postForm(graph(s, `${page}/feed`), { message, access_token: token, ...sched });
    return finished(postUrl(r.id), r.id);
  }

  if (type === 'photo') {
    const imgs = post.media.filter((m) => m.kind === 'image');
    if (!imgs.length) throw new ApiError('Kiểu "Bài ảnh" cần ít nhất một ảnh.');
    if (imgs.length === 1) {
      const m = imgs[0];
      const r = await postFile(graph(s, `${page}/photos`), { message, access_token: token, ...sched }, 'source', mediaPath(m), m.name, m.mime);
      const id = r.post_id || r.id;
      return finished(postUrl(id), id);
    }
    // nhiều ảnh: tải từng ảnh ở dạng chưa đăng, rồi gộp thành một bài
    const ids = [];
    for (const m of imgs) {
      const r = await postFile(graph(s, `${page}/photos`), { published: 'false', temporary: scheduleUnix ? 'true' : '', access_token: token }, 'source', mediaPath(m), m.name, m.mime);
      ids.push(r.id);
    }
    const params = { message, access_token: token, ...sched };
    ids.forEach((id, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
    const r = await postForm(graph(s, `${page}/feed`), params);
    return finished(postUrl(r.id), r.id);
  }

  const vid = post.media.find((m) => m.kind === 'video');
  if (!vid) throw new ApiError('Kiểu đăng này cần một video.');
  const file = mediaPath(vid);

  if (type === 'video') {
    const r = await postFile(`${API.fbVideo}/${ver(s)}/${page}/videos`, { description: message, access_token: token, ...sched }, 'source', file, vid.name, vid.mime);
    return finished(`https://www.facebook.com/${page}/videos/${r.id}`, r.id);
  }

  // Reels: start → tải file lên rupload → finish
  const start = await postForm(graph(s, `${page}/video_reels`), { upload_phase: 'start', access_token: token });
  if (!start.video_id) throw new ApiError('Facebook không trả về mã video Reels.');
  const size = fs.statSync(file).size;
  await call(start.upload_url || `${API.fbRupload}/video-upload/${ver(s)}/${start.video_id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(size) },
    body: await fs.openAsBlob(file, { type: vid.mime }),
  });
  const fin = await postForm(graph(s, `${page}/video_reels`), {
    upload_phase: 'finish',
    video_id: start.video_id,
    video_state: scheduleUnix ? 'SCHEDULED' : 'PUBLISHED',
    scheduled_publish_time: scheduleUnix,
    description: message,
    access_token: token,
  });
  if (fin && fin.success === false) throw new ApiError('Facebook từ chối đăng Reels.');
  const url = `https://www.facebook.com/reel/${start.video_id}`;
  if (scheduleUnix) return finished(url, start.video_id);
  return { status: 'processing', url, remoteId: start.video_id, message: 'Facebook đang xử lý Reels…' };
}

// Kiểm tra Reels đã xử lý xong chưa
async function checkReel(s, account, videoId) {
  const r = await call(graph(s, `${videoId}?${new URLSearchParams({ fields: 'status', access_token: account.token })}`));
  const st = r.status || {};
  for (const phase of ['uploading_phase', 'processing_phase', 'publishing_phase']) {
    if (st[phase] && st[phase].status === 'error') {
      const msg = (st[phase].errors || []).map((e) => e.message).filter(Boolean).join('; ');
      return { state: 'error', message: `Facebook báo lỗi khi xử lý Reels: ${msg || phase}. Reels cần video dọc 9:16, dài 3–90 giây.` };
    }
  }
  if (st.video_status === 'error') return { state: 'error', message: 'Facebook không xử lý được video. Reels cần video dọc 9:16, dài 3–90 giây, tối thiểu 540×960.' };
  if (st.publishing_phase && st.publishing_phase.status === 'complete') return { state: 'done', message: 'Đã đăng Reels.' };
  return { state: 'processing' };
}

module.exports = { SCOPES, authUrl, exchangeCode, pagesFromUserToken, check, resolveType, publish, checkReel };
