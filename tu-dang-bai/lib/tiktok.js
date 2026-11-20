'use strict';
// Đăng video lên TikTok qua Content Posting API chính thức.
// - "Nháp" (video.upload): video vào hộp thư TikTok của kênh, chủ kênh mở app bấm Đăng. Dùng được khi app chưa audit.
// - "Đăng thẳng" (video.publish): tự đăng hoàn toàn. App chưa audit thì TikTok chỉ cho đăng khi tài khoản để riêng tư.
const crypto = require('crypto');
const fs = require('fs');
const API = require('./api');
const { ApiError, readBody, netError, sleep } = require('./util');

const MB = 1024 * 1024;

const ERRORS = {
  access_token_invalid: ['Phiên đăng nhập TikTok đã hết hạn — vào Tài khoản, kết nối lại kênh này.', true],
  scope_not_authorized: ['Kênh chưa cấp quyền cần thiết cho app — vào Tài khoản, kết nối lại kênh này.', true],
  scope_permission_missed: ['App TikTok chưa được duyệt quyền này (video.upload / video.publish).', false],
  rate_limit_exceeded: ['Gọi TikTok quá nhanh, đợi 1 phút rồi bấm Thử lại.', false],
  spam_risk_too_many_posts: ['Kênh đã đăng quá nhiều trong 24 giờ, TikTok tạm không cho đăng thêm.', false],
  spam_risk_user_banned_from_posting: ['Kênh đang bị TikTok cấm đăng bài.', false],
  spam_risk_too_many_pending_share: ['Kênh có quá nhiều video nháp chưa đăng (TikTok cho tối đa 5 trong 24 giờ). Mở TikTok đăng hoặc xoá bớt nháp rồi thử lại.', false],
  reached_active_user_cap: ['App TikTok chưa audit chỉ cho tối đa 5 tài khoản đăng trong 24 giờ.', false],
  unaudited_client_can_only_post_to_private_accounts: ['App TikTok chưa qua kiểm duyệt (audit) nên chỉ đăng thẳng được khi tài khoản TikTok để riêng tư. Chọn cách "Gửi vào nháp", hoặc gửi app cho TikTok audit.', false],
  privacy_level_option_mismatch: ['Chế độ "Ai được xem" không hợp lệ với kênh này.', false],
  url_ownership_unverified: ['Tên miền chưa được xác minh với TikTok.', false],
  invalid_params: ['Thông tin gửi lên TikTok không hợp lệ.', false],
  invalid_file_upload: ['File video không hợp lệ với TikTok (dùng MP4/MOV/WebM).', false],
};

const FAIL_REASONS = {
  file_format_check_failed: 'Định dạng video không hợp lệ (nên dùng MP4, mã H.264).',
  duration_check_failed: 'Thời lượng video không hợp lệ (quá ngắn hoặc dài hơn mức kênh được phép).',
  frame_rate_check_failed: 'Tốc độ khung hình không hợp lệ (cần 23–60 fps).',
  picture_size_check_failed: 'Kích thước khung hình không hợp lệ (cạnh nhỏ nhất ≥ 360px).',
  internal: 'TikTok bị lỗi nội bộ, thử lại sau ít phút.',
  video_pull_failed: 'TikTok không tải được video.',
  publish_cancelled: 'Bài đăng đã bị huỷ.',
  auth_removed: 'Kênh đã gỡ quyền của app — vào Tài khoản kết nối lại.',
  spam_risk_too_many_posts: 'Kênh đã đăng quá nhiều trong 24 giờ.',
  spam_risk_user_banned_from_posting: 'Kênh đang bị TikTok cấm đăng bài.',
  spam_risk_text: 'Caption bị TikTok đánh dấu là spam.',
  spam_risk: 'TikTok nghi spam nên chặn bài này.',
};

const PRIVACY_LABELS = {
  PUBLIC_TO_EVERYONE: 'Mọi người',
  MUTUAL_FOLLOW_FRIENDS: 'Bạn bè',
  FOLLOWER_OF_CREATOR: 'Người theo dõi',
  SELF_ONLY: 'Chỉ mình tôi',
};

function scopes(s) {
  return ['user.info.basic', 'video.upload', ...(s.ttDirectPost ? ['video.publish'] : [])];
}

// PKCE (bắt buộc với app Desktop). TikTok mã hoá code_challenge bằng hex, khác chuẩn base64url.
function pkce(encoding = 'hex') {
  const verifier = crypto.randomBytes(48).toString('base64url').slice(0, 64);
  const hash = crypto.createHash('sha256').update(verifier);
  return { verifier, challenge: encoding === 'base64url' ? hash.digest('base64url') : hash.digest('hex') };
}

function requireApp(s) {
  if (!s.ttClientKey || !s.ttClientSecret) throw new ApiError('Chưa nhập Client key và Client secret của app TikTok (mục Cài đặt).');
}

function authUrl(s, redirectUri, state, challenge) {
  const q = new URLSearchParams({
    client_key: s.ttClientKey,
    response_type: 'code',
    scope: scopes(s).join(','),
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${API.ttAuth}/v2/auth/authorize/?${q}`;
}

async function tokenRequest(params) {
  let res;
  try {
    res = await fetch(`${API.ttApi}/v2/oauth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams(params),
    });
  } catch (e) {
    throw netError('TikTok', e);
  }
  const body = await readBody(res);
  if (!res.ok || body.error || !body.access_token) {
    const why = body.error_description || body.error || `HTTP ${res.status}`;
    const pkceHint = /code_verifier|code_challenge/i.test(why) ? ' Thử đổi "Kiểu mã hoá PKCE" trong Cài đặt → Nâng cao rồi kết nối lại.' : '';
    throw new ApiError(`TikTok từ chối đăng nhập: ${why}.${pkceHint}`, { tokenInvalid: params.grant_type === 'refresh_token' });
  }
  return body;
}

function tokenFields(t) {
  const now = Date.now();
  return {
    token: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: now + (Number(t.expires_in) || 86400) * 1000,
    refreshExpiresAt: now + (Number(t.refresh_expires_in) || 365 * 86400) * 1000,
    scopes: String(t.scope || '').split(/[,\s]+/).filter(Boolean),
    remoteId: t.open_id,
  };
}

async function exchangeCode(s, redirectUri, code, verifier) {
  requireApp(s);
  return tokenFields(await tokenRequest({
    client_key: s.ttClientKey,
    client_secret: s.ttClientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: verifier,
  }));
}

// Token TikTok sống 24 giờ; tự làm mới bằng refresh token (sống 1 năm)
async function ensureToken(s, account, save) {
  if (account.expiresAt && account.expiresAt - Date.now() > 10 * 60 * 1000) return;
  requireApp(s);
  if (account.refreshExpiresAt && account.refreshExpiresAt < Date.now()) {
    throw new ApiError('Phiên TikTok của kênh đã hết hạn — vào Tài khoản, kết nối lại kênh này.', { tokenInvalid: true });
  }
  const t = tokenFields(await tokenRequest({
    client_key: s.ttClientKey,
    client_secret: s.ttClientSecret,
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
  }));
  account.token = t.token;
  account.refreshToken = t.refreshToken || account.refreshToken;
  account.expiresAt = t.expiresAt;
  account.refreshExpiresAt = t.refreshExpiresAt;
  if (t.scopes.length) account.scopes = t.scopes;
  if (save) save();
}

async function api(account, apiPath, { method = 'POST', body } = {}) {
  let res;
  try {
    res = await fetch(`${API.ttApi}${apiPath}`, {
      method,
      headers: {
        Authorization: `Bearer ${account.token}`,
        ...(body ? { 'Content-Type': 'application/json; charset=UTF-8' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw netError('TikTok', e);
  }
  const r = await readBody(res);
  const code = r && r.error && r.error.code;
  if (!res.ok || (code && code !== 'ok')) {
    const [hint, tokenInvalid] = ERRORS[code] || ['', false];
    const detail = (r.error && r.error.message) || code || (r._raw ? String(r._raw).slice(0, 200) : `HTTP ${res.status}`);
    throw new ApiError(`${hint ? `${hint} ` : ''}(TikTok: ${detail})`, { code, tokenInvalid: tokenInvalid || res.status === 401 });
  }
  const data = r.data || {};
  Object.defineProperty(data, '_raw', { value: r._raw || '' });
  return data;
}

async function profile(account) {
  const d = await api(account, '/v2/user/info/?fields=open_id,avatar_url,display_name', { method: 'GET' });
  const u = d.user || {};
  return { name: u.display_name || 'Kênh TikTok', avatar: u.avatar_url || '' };
}

async function creatorInfo(account) {
  return api(account, '/v2/post/publish/creator_info/query/', { body: {} });
}

async function check(s, account, save) {
  await ensureToken(s, account, save);
  const p = await profile(account);
  if (account.scopes && account.scopes.includes('video.publish')) {
    try {
      const info = await creatorInfo(account);
      if (info.creator_username) p.username = info.creator_username;
      p.privacyOptions = info.privacy_level_options || [];
    } catch { /* chỉ để hiển thị thêm */ }
  }
  return p;
}

// Chia file: ≤ 64 MB gửi một lần; lớn hơn thì mỗi phần 10 MB, phần cuối gộp phần dư.
// Số phần = làm tròn xuống (dung lượng / cỡ phần), tối đa 1000 phần.
function chunkPlan(size) {
  if (size <= 64 * MB) return { chunkSize: size, count: 1 };
  const chunkSize = 10 * MB;
  return { chunkSize, count: Math.floor(size / chunkSize) };
}

async function uploadChunks(uploadUrl, file, size, mime) {
  const plan = chunkPlan(size);
  const fh = await fs.promises.open(file, 'r');
  try {
    for (let i = 0; i < plan.count; i++) {
      const start = i * plan.chunkSize;
      const end = i === plan.count - 1 ? size - 1 : start + plan.chunkSize - 1;
      const buf = Buffer.alloc(end - start + 1);
      await fh.read(buf, 0, buf.length, start);
      let res = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': mime || 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${size}` },
            body: buf,
          });
          if (res.status < 500) break;
        } catch (e) {
          lastErr = e;
        }
        await sleep(2000 * (attempt + 1));
      }
      if (!res) throw netError('TikTok', lastErr);
      if (![200, 201, 206].includes(res.status)) {
        const t = await res.text().catch(() => '');
        throw new ApiError(`Tải video lên TikTok thất bại ở phần ${i + 1}/${plan.count} (HTTP ${res.status}). ${t.slice(0, 200)}`);
      }
    }
  } finally {
    await fh.close();
  }
}

async function publish(s, account, post, { mediaPath, save } = {}) {
  await ensureToken(s, account, save);
  const vid = post.media.find((m) => m.kind === 'video');
  if (!vid) throw new ApiError('TikTok chỉ nhận video qua app này.');
  const file = mediaPath(vid);
  const size = fs.statSync(file).size;
  const plan = chunkPlan(size);
  const source_info = { source: 'FILE_UPLOAD', video_size: size, chunk_size: plan.chunkSize, total_chunk_count: plan.count };
  const o = post.options || {};
  let init;

  if (o.ttMode === 'direct') {
    if (!(account.scopes || []).includes('video.publish')) {
      throw new ApiError('Kênh này chưa cấp quyền đăng thẳng (video.publish). Bật "App đã được duyệt đăng thẳng" ở Cài đặt rồi kết nối lại kênh.');
    }
    const info = await creatorInfo(account);
    if (info.creator_username) account.username = info.creator_username;
    const allowed = info.privacy_level_options || [];
    if (!allowed.includes(o.ttPrivacy)) {
      const list = allowed.map((p) => PRIVACY_LABELS[p] || p).join(', ') || 'không có';
      throw new ApiError(`Kênh này không cho chọn "${PRIVACY_LABELS[o.ttPrivacy] || o.ttPrivacy || 'chưa chọn'}". Được phép: ${list}. (App chưa audit chỉ đăng được "Chỉ mình tôi".)`);
    }
    if (info.max_video_post_duration_sec && vid.duration && vid.duration > info.max_video_post_duration_sec + 0.5) {
      throw new ApiError(`Video dài ${Math.round(vid.duration)} giây, kênh này chỉ được đăng tối đa ${info.max_video_post_duration_sec} giây.`);
    }
    const title = String(post.captionTt || post.caption || '').trim();
    init = await api(account, '/v2/post/publish/video/init/', {
      body: {
        post_info: {
          title,
          privacy_level: o.ttPrivacy,
          disable_comment: !o.ttAllowComment || !!info.comment_disabled,
          disable_duet: !o.ttAllowDuet || !!info.duet_disabled,
          disable_stitch: !o.ttAllowStitch || !!info.stitch_disabled,
          video_cover_timestamp_ms: 1000,
          brand_content_toggle: !!o.ttBrandContent,
          brand_organic_toggle: !!o.ttBrandOrganic,
          is_aigc: !!o.ttAigc,
        },
        source_info,
      },
    });
  } else {
    init = await api(account, '/v2/post/publish/inbox/video/init/', { body: { source_info } });
  }

  if (!init.upload_url || !init.publish_id) throw new ApiError('TikTok không trả về địa chỉ tải video lên.');
  await uploadChunks(init.upload_url, file, size, vid.mime);
  return { status: 'processing', publishId: init.publish_id, message: 'TikTok đang xử lý video…' };
}

async function checkStatus(s, account, publishId, save) {
  await ensureToken(s, account, save);
  const d = await api(account, '/v2/post/publish/status/fetch/', { body: { publish_id: publishId } });
  switch (d.status) {
    case 'PUBLISH_COMPLETE': {
      // ID video dài 19 chữ số — lấy từ chuỗi gốc để không bị làm tròn
      const m = /"publicaly_available_post_id"\s*:\s*\[\s*"?(\d+)/.exec(d._raw || '');
      const id = m ? m[1] : '';
      return id
        ? { state: 'done', url: `https://www.tiktok.com/@${account.username || '_'}/video/${id}`, message: 'Đã đăng.' }
        : { state: 'done', message: 'Đã đăng (video để chế độ riêng tư nên không có link công khai).' };
    }
    case 'SEND_TO_USER_INBOX':
      return { state: 'draft', message: 'Đã vào hộp thư TikTok — mở app TikTok, bấm thông báo, dán caption rồi Đăng.' };
    case 'FAILED':
      return { state: 'error', message: FAIL_REASONS[d.fail_reason] || `TikTok báo lỗi: ${d.fail_reason || 'không rõ'}.` };
    default:
      return { state: 'processing' };
  }
}

module.exports = { scopes, pkce, authUrl, exchangeCode, ensureToken, profile, check, chunkPlan, uploadChunks, publish, checkStatus, PRIVACY_LABELS };
