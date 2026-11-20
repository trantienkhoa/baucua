'use strict';
// Bộ hẹn giờ: cứ vài giây xem bài nào đến giờ thì đăng, bài nào đang xử lý thì hỏi lại kết quả.
const fs = require('fs');
const path = require('path');
const fb = require('./facebook');
const tt = require('./tiktok');

const MAX_PROCESSING_MS = 2 * 60 * 60 * 1000;
const NATIVE_MIN_MS = 20 * 60 * 1000;        // Facebook cần hẹn trước ít nhất 10 phút; chừa dư
const NATIVE_MAX_MS = 29 * 24 * 3600 * 1000;  // và không quá ~30 ngày
const FINAL = new Set(['done', 'draft', 'error', 'canceled', 'scheduled_remote']);

function createScheduler({ db, log, uploadsDir, tickMs = 5000, pollMs = 20000 }) {
  const S = () => db.data.settings;
  const now = () => new Date().toISOString();

  // App bị tắt giữa lúc đang tải lên: không tự đăng lại (tránh đăng trùng), báo để người dùng kiểm tra
  for (const p of db.data.posts) {
    for (const t of p.targets) {
      if (t.status === 'posting') {
        Object.assign(t, { status: 'error', updatedAt: now(), message: 'App bị tắt giữa lúc đang đăng. Kiểm tra trên kênh xem bài đã lên chưa rồi hãy bấm "Thử lại".' });
      }
    }
  }
  db.save();

  const mediaPath = (m) => {
    const p = path.join(uploadsDir, m.file);
    if (!fs.existsSync(p)) throw new Error(`Không còn file "${m.name}" trên máy (đã bị xoá).`);
    return p;
  };
  const accountOf = (id) => db.data.accounts.find((a) => a.id === id);
  const label = (acc) => `${acc.platform === 'facebook' ? 'Facebook' : 'TikTok'} "${acc.name}"`;
  const update = (t, patch) => { Object.assign(t, patch, { updatedAt: now() }); db.save(); };

  async function runTarget(post, t, acc, scheduleUnix) {
    update(t, { status: 'posting', message: 'Đang tải lên…', attempts: (t.attempts || 0) + 1, pollErrors: 0 });
    db.saveNow();
    try {
      const ctx = { mediaPath, save: () => db.save() };
      const r = acc.platform === 'facebook'
        ? await fb.publish(S(), acc, post, { ...ctx, scheduleUnix })
        : await tt.publish(S(), acc, post, ctx);
      update(t, {
        status: r.status, message: r.message || '', url: r.url || '', remoteId: r.remoteId || '', publishId: r.publishId || '', lastPoll: Date.now(),
        remoteAt: scheduleUnix ? new Date(scheduleUnix * 1000).toISOString() : '', // giờ Facebook sẽ tự đăng
      });
      log('info', `${label(acc)}: ${r.message || r.status}`);
    } catch (e) {
      if (e.tokenInvalid) acc.needsReconnect = true;
      update(t, { status: 'error', message: e.message });
      log('error', `${label(acc)}: ${e.message}`);
    }
    db.saveNow();
  }

  async function pollTarget(post, t, acc) {
    t.lastPoll = Date.now();
    try {
      const r = acc.platform === 'facebook'
        ? await fb.checkReel(S(), acc, t.remoteId)
        : await tt.checkStatus(S(), acc, t.publishId, () => db.save());
      if (r.state === 'processing') {
        if (Date.now() - Date.parse(t.updatedAt) > MAX_PROCESSING_MS) {
          update(t, { status: 'error', message: 'Chờ hơn 2 tiếng vẫn chưa xong. Kiểm tra trực tiếp trên kênh.' });
        }
        return;
      }
      update(t, { status: r.state, message: r.message || '', url: r.url || t.url || '' });
      log(r.state === 'error' ? 'error' : 'info', `${label(acc)}: ${r.message || r.state}`);
    } catch (e) {
      t.pollErrors = (t.pollErrors || 0) + 1;
      if (e.tokenInvalid) acc.needsReconnect = true;
      if (e.tokenInvalid || t.pollErrors >= 10) update(t, { status: 'error', message: e.message });
      log('warn', `${label(acc)}: chưa hỏi được kết quả (${e.message})`);
    }
  }

  let lastCleanup = 0;
  function cleanup() {
    if (Date.now() - lastCleanup < 60 * 60 * 1000) return;
    lastCleanup = Date.now();
    const days = Number(S().cleanupDays);
    if (!days) return;
    const cutoff = Date.now() - days * 864e5;
    let removed = 0;
    for (const post of db.data.posts) {
      if (post.mediaRemoved || !post.media.length) continue;
      if (!post.targets.every((t) => FINAL.has(t.status))) continue;
      const last = Math.max(...post.targets.map((t) => Date.parse(t.updatedAt) || 0));
      if (last > cutoff) continue;
      for (const m of post.media) fs.rm(path.join(uploadsDir, m.file), { force: true }, () => {});
      post.mediaRemoved = true;
      removed++;
    }
    // giữ tối đa 1000 bài cũ nhất đã xong
    if (db.data.posts.length > 1000) {
      const keep = db.data.posts.filter((p) => !p.targets.every((t) => FINAL.has(t.status)));
      const old = db.data.posts.filter((p) => p.targets.every((t) => FINAL.has(t.status)));
      old.sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
      db.data.posts = [...keep, ...old.slice(0, Math.max(0, 1000 - keep.length))];
    }
    if (removed) log('info', `Đã dọn ${removed} file của bài đăng xong hơn ${days} ngày.`);
    db.save();
  }

  let busy = false;
  let again = false;
  let stopped = false;
  async function tick() {
    if (stopped) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      do {
        again = false;
        const nowMs = Date.now();
        for (const post of [...db.data.posts]) {
          const at = Date.parse(post.scheduledAt);
          const due = at <= nowMs;
          for (const t of post.targets) {
            if (!db.data.posts.includes(post)) break; // bài vừa bị xoá
            const acc = accountOf(t.accountId);
            if (t.status === 'pending') {
              if (!acc) { update(t, { status: 'error', message: 'Tài khoản này đã bị xoá khỏi app.' }); continue; }
              if (due) {
                await runTarget(post, t, acc);
              } else if (acc.platform === 'facebook' && post.options && post.options.fbNativeSchedule) {
                const ahead = at - nowMs;
                if (ahead >= NATIVE_MIN_MS && ahead <= NATIVE_MAX_MS) await runTarget(post, t, acc, Math.floor(at / 1000));
              }
            } else if (t.status === 'processing') {
              if (!acc) { update(t, { status: 'error', message: 'Tài khoản này đã bị xoá khỏi app.' }); continue; }
              if (Date.now() - (t.lastPoll || 0) >= pollMs) await pollTarget(post, t, acc);
            } else if (t.status === 'scheduled_remote' && Date.parse(t.remoteAt || post.scheduledAt) <= nowMs) {
              update(t, { status: 'done', message: 'Facebook đã tự đăng theo lịch.' });
            }
          }
        }
        cleanup();
      } while (again);
    } catch (e) {
      log('error', `Lỗi bộ hẹn giờ: ${e.message}`);
    } finally {
      busy = false;
    }
  }

  const timer = setInterval(tick, tickMs);
  setImmediate(tick);
  return {
    tick,
    kick: () => setImmediate(tick),
    stop: () => { stopped = true; clearInterval(timer); },
    isBusy: () => busy,
  };
}

module.exports = { createScheduler, FINAL };
