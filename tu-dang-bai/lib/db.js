'use strict';
// Lưu toàn bộ dữ liệu vào data/db.json (ghi file tạm rồi đổi tên để không hỏng file khi mất điện)
const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  fbAppId: '',
  fbAppSecret: '',
  fbApiVersion: 'v25.0',
  ttClientKey: '',
  ttClientSecret: '',
  ttDirectPost: false,   // app TikTok đã được duyệt quyền video.publish (đăng thẳng)
  ttPkce: 'hex',         // cách mã hoá PKCE TikTok yêu cầu với app Desktop
  publicUrl: '',         // để trống = http://localhost:CỔNG
  passwordHash: '',
  passwordSalt: '',
  cleanupDays: 7,        // tự xoá file video/ảnh đã đăng xong sau N ngày (0 = giữ mãi)
};

function createDb(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'db.json');
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      // file hỏng: giữ lại bản cũ để không mất hẳn
      try { fs.copyFileSync(file, `${file}.hong-${Date.now()}`); } catch {}
    }
  }
  data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  data.accounts = data.accounts || [];
  data.posts = data.posts || [];
  data.logs = data.logs || [];

  let timer = null;
  function saveNow() {
    clearTimeout(timer);
    timer = null;
    const json = JSON.stringify(data, null, 2);
    const tmp = `${file}.tmp`;
    try {
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, file);
    } catch {
      fs.writeFileSync(file, json); // Windows: phần mềm diệt virus đôi khi khoá file khi đổi tên
    }
  }
  function save() {
    if (!timer) timer = setTimeout(saveNow, 300);
  }
  return { data, save, saveNow, file };
}

module.exports = { createDb, DEFAULT_SETTINGS };
