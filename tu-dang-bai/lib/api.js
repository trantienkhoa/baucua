'use strict';
// Địa chỉ máy chủ Facebook / TikTok. Đọc biến môi trường mỗi lần để bài kiểm thử trỏ sang máy chủ giả.
module.exports = {
  get fbGraph() { return process.env.FB_GRAPH_BASE || 'https://graph.facebook.com'; },
  get fbVideo() { return process.env.FB_VIDEO_BASE || 'https://graph-video.facebook.com'; },
  get fbRupload() { return process.env.FB_RUPLOAD_BASE || 'https://rupload.facebook.com'; },
  get fbDialog() { return process.env.FB_DIALOG_BASE || 'https://www.facebook.com'; },
  get ttApi() { return process.env.TIKTOK_API_BASE || 'https://open.tiktokapis.com'; },
  get ttAuth() { return process.env.TIKTOK_AUTH_BASE || 'https://www.tiktok.com'; },
};
