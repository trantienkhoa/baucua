'use strict';
const crypto = require('crypto');
const path = require('path');

const uid = (bytes = 8) => crypto.randomBytes(bytes).toString('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIDEO_EXT = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm' };
const IMAGE_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function mimeOf(name) {
  const ext = path.extname(String(name || '')).toLowerCase();
  return VIDEO_EXT[ext] || IMAGE_EXT[ext] || '';
}

function kindOf(name) {
  const ext = path.extname(String(name || '')).toLowerCase();
  if (VIDEO_EXT[ext]) return 'video';
  if (IMAGE_EXT[ext]) return 'image';
  return null;
}

// Lỗi trả về từ Facebook / TikTok, kèm câu giải thích tiếng Việt
class ApiError extends Error {
  constructor(message, extra = {}) {
    super(message);
    Object.assign(this, extra);
  }
}

// Đọc body JSON; giữ cả chuỗi gốc (ID video TikTok dài hơn số JS chứa được)
async function readBody(res) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object') Object.defineProperty(json, '_raw', { value: text });
    return json;
  } catch {
    return { _raw: text };
  }
}

function netError(platform, e) {
  const code = (e && e.cause && e.cause.code) || (e && e.message) || 'lỗi mạng';
  return new ApiError(`Không kết nối được ${platform} (${code}). Kiểm tra mạng Internet rồi thử lại.`, { network: true });
}

module.exports = { uid, sleep, mimeOf, kindOf, ApiError, readBody, netError };
