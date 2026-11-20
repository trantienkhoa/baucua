'use strict';
/* Tự Đăng Bài — giao diện */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(`tdb.${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`tdb.${k}`, JSON.stringify(v)); } catch {} },
};

let S = null;                 // trạng thái từ máy chủ
let picked = [];              // file đã chọn: { file, url, kind, duration, width, height }
let bulkCaps = [];            // caption riêng từng video khi đăng hàng loạt
let qFilter = 'upcoming';
const selected = new Set(store.get('selected', []));
const sigs = {};              // chữ ký để chỉ vẽ lại khi dữ liệu đổi
let settingsFilled = false;
let online = true;

const STATUS = {
  pending: '⏳ Chờ đến giờ',
  posting: '⬆️ Đang tải lên',
  processing: '⚙️ Đang xử lý',
  done: '✅ Đã đăng',
  draft: '📥 Đã vào nháp',
  scheduled_remote: '🗓 Đã hẹn trên FB',
  error: '❌ Lỗi',
  canceled: '🚫 Đã huỷ',
};
const FINAL = new Set(['done', 'draft', 'error', 'canceled', 'scheduled_remote']);
const PRIVACY = { PUBLIC_TO_EVERYONE: 'Mọi người', FOLLOWER_OF_CREATOR: 'Người theo dõi', MUTUAL_FOLLOW_FRIENDS: 'Bạn bè', SELF_ONLY: 'Chỉ mình tôi' };

// ---------------- tiện ích ----------------
async function api(method, url, body) {
  const opts = { method, headers: { 'x-tdb': '1' } };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let r;
  try { r = await fetch(url, opts); } catch { throw new Error('Không kết nối được app — cửa sổ app trên máy tính còn mở không?'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { if (j.state) applyState(j.state); throw new Error(j.error || `Lỗi ${r.status}`); }
  return j;
}

let toastTimer;
function toast(msg, isErr = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `show${isErr ? ' err' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, isErr ? 7000 : 3500);
}

function copyText(text) {
  const done = () => toast('Đã chép vào bộ nhớ tạm.');
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done, () => fallback());
  return fallback();
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch { toast('Không chép được, hãy chép tay.', true); }
    ta.remove();
  }
}

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
function dayLabel(d) {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  const diff = Math.round((b - a) / 864e5);
  const dm = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (diff === 0) return `Hôm nay · ${dm}`;
  if (diff === 1) return `Ngày mai · ${dm}`;
  if (diff === -1) return `Hôm qua · ${dm}`;
  return `${WD[d.getDay()]} · ${dm}${d.getFullYear() !== a.getFullYear() ? `/${d.getFullYear()}` : ''}`;
}
const fmtWhen = (d) => `${hhmm(d)} · ${dayLabel(d)}`;
const fmtSize = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.ceil(n / 1e3)} KB`);
const fmtDur = (s) => (s ? `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}` : '');

function avatar(a, cls = '') {
  const letter = esc((a.name || '?').trim().charAt(0).toUpperCase());
  const plat = a.platform === 'facebook' ? 'fb' : 'tt';
  if (a.avatar) return `<img class="av ${cls}" src="${esc(a.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;av ${plat}&quot;>${letter}</span>'">`;
  return `<span class="av ${plat} ${cls}">${letter}</span>`;
}
const accById = (id) => (S ? S.accounts.find((a) => a.id === id) : null);

// ---------------- tab ----------------
function showTab(name) {
  if (!$(`#tab-${name}`)) name = 'compose';
  $$('.tab').forEach((t) => { t.hidden = t.id !== `tab-${name}`; });
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
  if (name === 'settings') loadLogs();
  window.scrollTo(0, 0);
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

// ---------------- trạng thái ----------------
async function refresh() {
  try {
    const st = await api('GET', '/api/state');
    online = true;
    applyState(st);
  } catch {
    online = false;
    renderPulse();
  }
}
function applyState(st) {
  S = st;
  for (const id of [...selected]) if (!S.accounts.some((a) => a.id === id)) selected.delete(id);
  renderPulse();
  renderPick();
  renderQueue();
  renderAccounts();
  renderSettings();
  renderBadges();
  updateCompose();
}

function renderPulse() {
  const el = $('#pulse');
  if (!online) { el.className = 'pulse off'; el.textContent = 'Mất kết nối với app'; return; }
  el.className = 'pulse';
  const next = S.posts
    .filter((p) => p.targets.some((t) => t.status === 'pending'))
    .map((p) => new Date(p.scheduledAt)).sort((a, b) => a - b)[0];
  const busy = S.posts.some((p) => p.targets.some((t) => t.status === 'posting' || t.status === 'processing'));
  el.textContent = busy ? 'Đang đăng bài…' : next ? `Bài kế: ${hhmm(next)} ${dayLabel(next).split(' · ')[0].toLowerCase()}` : 'Đang chạy';
}

function renderBadges() {
  const up = S.posts.filter((p) => p.targets.some((t) => t.status === 'pending')).length;
  const errs = S.posts.filter((p) => p.targets.some((t) => t.status === 'error')).length;
  const qb = $('#queueBadge');
  qb.hidden = !(up || errs);
  qb.textContent = errs ? `${errs}!` : up;
  qb.classList.toggle('warn', !!errs);
  const bad = S.accounts.filter((a) => a.needsReconnect).length;
  const ab = $('#accBadge');
  ab.hidden = !bad;
  ab.textContent = bad;
  ab.classList.add('warn');
}

// ---------------- soạn bài: chọn tài khoản ----------------
function renderPick() {
  const sig = JSON.stringify(S.accounts.map((a) => [a.id, a.name, a.avatar, a.needsReconnect]));
  if (sigs.pick === sig) return;
  sigs.pick = sig;
  const box = $('#accountPick');
  const hint = $('#setupHint');
  if (!S.accounts.length) {
    box.innerHTML = '<p class="muted">Chưa có tài khoản nào. <a href="#accounts">Kết nối Trang Facebook / kênh TikTok →</a></p>';
    const needSetup = !S.settings.fbAppId && !S.settings.ttClientKey;
    hint.hidden = false;
    hint.innerHTML = needSetup
      ? '👋 <b>Chào bạn!</b> Lần đầu dùng: vào <a href="#settings">Cài đặt</a> làm theo hướng dẫn tạo app Facebook / TikTok (làm 1 lần), rồi sang <a href="#accounts">Tài khoản</a> kết nối kênh.'
      : '👉 Đã có cài đặt. Sang <a href="#accounts">Tài khoản</a> để kết nối Trang Facebook / kênh TikTok.';
    return;
  }
  hint.hidden = true;
  const groups = [['facebook', '<span class="pf fb">f</span> Trang Facebook'], ['tiktok', '<span class="pf tt">♪</span> Kênh TikTok']];
  box.innerHTML = groups.map(([plat, title]) => {
    const list = S.accounts.filter((a) => a.platform === plat);
    if (!list.length) return '';
    return `<div class="pick-group">
      <div class="pick-head"><span style="display:flex;gap:6px;align-items:center">${title}</span>
        <button type="button" class="link" data-all="${plat}">Chọn hết</button></div>
      <div class="pick-list">${list.map((a) => `
        <label class="acc-chip" title="${esc(a.name)}"><input type="checkbox" value="${esc(a.id)}" ${selected.has(a.id) ? 'checked' : ''}>
          <span>${avatar(a)}<b>${esc(a.name)}</b>${a.needsReconnect ? '<em class="badge">cần kết nối lại</em>' : ''}</span></label>`).join('')}
      </div></div>`;
  }).join('');
}
$('#accountPick').addEventListener('change', (e) => {
  if (e.target.type !== 'checkbox') return;
  if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
  store.set('selected', [...selected]);
  updateCompose();
});
$('#accountPick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-all]');
  if (!b) return;
  const list = S.accounts.filter((a) => a.platform === b.dataset.all);
  const allOn = list.every((a) => selected.has(a.id));
  list.forEach((a) => (allOn ? selected.delete(a.id) : selected.add(a.id)));
  store.set('selected', [...selected]);
  sigs.pick = '';
  renderPick();
  updateCompose();
});

// ---------------- soạn bài: file ----------------
const VIDEO_RE = /\.(mp4|m4v|mov|webm)$/i;
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
function addFiles(list) {
  for (const file of list) {
    const kind = VIDEO_RE.test(file.name) ? 'video' : IMAGE_RE.test(file.name) ? 'image' : null;
    if (!kind) { toast(`Bỏ qua "${file.name}": chỉ nhận mp4, mov, webm, jpg, png, webp.`, true); continue; }
    const item = { file, kind, url: URL.createObjectURL(file), duration: 0, width: 0, height: 0 };
    picked.push(item);
    if (kind === 'video') {
      const v = document.createElement('video');
      v.preload = 'metadata'; v.muted = true; v.src = item.url;
      v.onloadedmetadata = () => { item.duration = v.duration; item.width = v.videoWidth; item.height = v.videoHeight; renderPreviews(); updateCompose(); };
    }
  }
  renderPreviews();
  updateCompose();
}
$('#files').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

function renderPreviews() {
  $('#previews').innerHTML = picked.map((p, i) => `
    <div class="pv">
      ${p.kind === 'video' ? `<video src="${p.url}#t=0.5" muted playsinline preload="metadata"></video>` : `<img src="${p.url}" alt="">`}
      <div class="meta">${p.kind === 'video' ? `🎬 ${fmtDur(p.duration)} · ` : '🖼 '}${fmtSize(p.file.size)}</div>
      <button type="button" class="x" data-rm="${i}" aria-label="Bỏ file">✕</button>
    </div>`).join('');
}
$('#previews').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  const [p] = picked.splice(Number(b.dataset.rm), 1);
  URL.revokeObjectURL(p.url);
  bulkCaps.splice(Number(b.dataset.rm), 1);
  renderPreviews();
  updateCompose();
});

// ---------------- soạn bài: cập nhật theo lựa chọn ----------------
function selAccounts() { return S ? S.accounts.filter((a) => selected.has(a.id)) : []; }
const whenMode = () => $('input[name="when"]:checked').value;
const ttMode = () => $('input[name="ttMode"]:checked').value;

function mediaProblem() {
  const v = picked.filter((p) => p.kind === 'video').length;
  const im = picked.filter((p) => p.kind === 'image').length;
  if (v && im) return 'Không trộn video với ảnh — chọn toàn video hoặc toàn ảnh.';
  if (im > 10) return 'Tối đa 10 ảnh mỗi bài.';
  const accs = selAccounts();
  if (im && accs.some((a) => a.platform === 'tiktok')) return 'TikTok chỉ nhận video. Bỏ chọn kênh TikTok hoặc chọn video.';
  return '';
}

function updateCompose() {
  if (!S) return;
  const accs = selAccounts();
  const hasFb = accs.some((a) => a.platform === 'facebook');
  const hasTt = accs.some((a) => a.platform === 'tiktok');
  $('#fbOpts').hidden = !hasFb;
  $('#ttOpts').hidden = !hasTt;

  // TikTok đăng thẳng chỉ khi đã bật trong cài đặt
  const directOk = S.settings.ttDirectPost;
  const directRadio = $('input[name="ttMode"][value="direct"]');
  directRadio.disabled = !directOk;
  $('#ttDirectLabel').classList.toggle('disabled', !directOk);
  if (!directOk && directRadio.checked) $('input[name="ttMode"][value="draft"]').checked = true;
  $('#ttDirectNote').textContent = directOk ? 'App chưa audit thì chỉ chọn được "Chỉ mình tôi".' : 'Cần app TikTok được duyệt quyền video.publish (bật trong Cài đặt).';
  $('#ttDirect').hidden = ttMode() !== 'direct';
  $('#ttDraftNote').hidden = ttMode() === 'direct';

  const prob = mediaProblem();
  $('#mediaErr').hidden = !prob;
  $('#mediaErr').textContent = prob;

  const videos = picked.filter((p) => p.kind === 'video');
  const bulk = videos.length > 1;
  $('#whenLater').hidden = whenMode() !== 'later';
  $('#bulkBox').hidden = !bulk;
  if (bulk) renderBulk(videos);

  // đếm ký tự
  const cap = $('#caption').value;
  const n = [...cap].length;
  $('#capCount').textContent = n ? `${n} ký tự${hasTt && n > 2200 ? ' — TikTok tối đa 2200!' : ''}` : '';
  $('#capCount').style.color = hasTt && n > 2200 ? 'var(--err)' : '';

  const btn = $('#submit');
  const count = bulk ? videos.length : 1;
  btn.textContent = whenMode() === 'now'
    ? (bulk ? `📮 Đăng ${count} video (lần lượt)` : '📮 Đăng ngay')
    : (bulk ? `🗓 Lên lịch ${count} video` : '🗓 Lên lịch');
}

function baseTime() {
  if (whenMode() === 'now') return new Date();
  const v = $('#at').value;
  return v ? new Date(v) : null;
}

function renderBulk(videos) {
  const start = baseTime() || new Date();
  const gap = Number($('#gap').value) * 60000;
  const box = $('#bulkList');
  // giữ caption riêng đang gõ
  $$('input[data-bcap]', box).forEach((inp) => { bulkCaps[Number(inp.dataset.bcap)] = inp.value; });
  const active = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.bcap : null;
  box.innerHTML = videos.map((p, i) => {
    const t = new Date(start.getTime() + i * gap);
    return `<div class="bulk-row">
      <video src="${p.url}#t=0.5" muted playsinline preload="metadata"></video>
      <div><div class="when">${i === 0 && whenMode() === 'now' ? 'Ngay bây giờ' : fmtWhen(t)}</div>
        <div class="name">${esc(p.file.name)}</div>
        <input data-bcap="${i}" placeholder="Caption riêng (trống = caption chung)" value="${esc(bulkCaps[i] || '')}"></div>
    </div>`;
  }).join('');
  if (active != null) { const el = $(`input[data-bcap="${active}"]`, box); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
}
$('#bulkList').addEventListener('input', (e) => { if (e.target.dataset.bcap != null) bulkCaps[Number(e.target.dataset.bcap)] = e.target.value; });

['#caption', '#fbType', '#gap', '#at', '#ttPrivacy'].forEach((s) => $(s).addEventListener('input', updateCompose));
$$('input[name="when"], input[name="ttMode"]').forEach((r) => r.addEventListener('change', () => {
  if (whenMode() === 'later' && !$('#at').value) $('#at').value = toLocalInput(new Date(Date.now() + 60 * 60000));
  updateCompose();
}));
$('#toggleCustom').addEventListener('click', () => {
  const box = $('#customCaps');
  box.hidden = !box.hidden;
  $('#toggleCustom').textContent = box.hidden ? 'Caption riêng cho từng nơi ▾' : 'Ẩn caption riêng ▴';
});

// giờ nhanh
function nextAt(h, m) {
  const d = new Date(); d.setHours(h, m, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}
const QUICK = [
  ['+30 phút', () => new Date(Date.now() + 30 * 60000)],
  ['+1 giờ', () => new Date(Date.now() + 60 * 60000)],
  ['11:30', () => nextAt(11, 30)],
  ['18:00', () => nextAt(18, 0)],
  ['20:00', () => nextAt(20, 0)],
  ['21:30', () => nextAt(21, 30)],
  ['Mai 7:00', () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(7, 0, 0, 0); return d; }],
];
$('#quickTimes').innerHTML = QUICK.map(([l], i) => `<button type="button" data-q="${i}">${l}</button>`).join('');
$('#quickTimes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-q]');
  if (!b) return;
  $('#at').value = toLocalInput(QUICK[Number(b.dataset.q)][1]());
  updateCompose();
});

// ---------------- soạn bài: gửi ----------------
function collectOptions() {
  return {
    fbType: $('#fbType').value,
    fbNativeSchedule: $('#fbNative').checked,
    ttMode: ttMode(),
    ttPrivacy: $('#ttPrivacy').value,
    ttAllowComment: $('#ttComment').checked,
    ttAllowDuet: $('#ttDuet').checked,
    ttAllowStitch: $('#ttStitch').checked,
    ttAigc: $('#ttAigc').checked,
    ttBrandOrganic: $('#ttBrandOrganic').checked,
    ttBrandContent: $('#ttBrandContent').checked,
  };
}

function sendPost(payload, files, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('data', JSON.stringify(payload));
    files.forEach((p) => fd.append('media', p.file, p.file.name));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/posts');
    xhr.setRequestHeader('x-tdb', '1');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let j = {};
      try { j = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(j); else reject(new Error(j.error || `Lỗi ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Mất kết nối tới app khi đang gửi file.'));
    xhr.send(fd);
  });
}

function setProgress(frac, text) {
  const box = $('#progress');
  box.hidden = frac == null;
  if (frac == null) return;
  $('i', box).style.width = `${Math.round(frac * 100)}%`;
  $('span', box).textContent = text;
}

let sending = false;
$('#submit').addEventListener('click', async () => {
  if (sending || !S) return;
  const accs = selAccounts();
  if (!accs.length) return toast(S.accounts.length ? 'Chọn ít nhất một tài khoản ở bước 3.' : 'Chưa có tài khoản — vào tab Tài khoản để kết nối.', true);
  const prob = mediaProblem();
  if (prob) return toast(prob, true);
  const caption = $('#caption').value.trim();
  const hasTt = accs.some((a) => a.platform === 'tiktok');
  const videos = picked.filter((p) => p.kind === 'video');
  if (hasTt && !videos.length) return toast('TikTok cần một video.', true);
  if (!picked.length && !caption) return toast('Chọn video/ảnh hoặc viết nội dung.', true);
  const opts = collectOptions();
  if (hasTt && opts.ttMode === 'direct' && !opts.ttPrivacy) return toast('TikTok đăng thẳng: chọn "Ai được xem".', true);
  const start = baseTime();
  if (!start || Number.isNaN(start.getTime())) return toast('Chọn thời gian hẹn.', true);
  if (whenMode() === 'later' && start < new Date(Date.now() - 60000)) return toast('Thời gian hẹn đã qua.', true);

  const base = {
    accountIds: accs.map((a) => a.id),
    captionFb: $('#captionFb').value.trim(),
    captionTt: $('#captionTt').value.trim(),
    options: opts,
  };
  let jobs;
  if (videos.length > 1) {
    const gap = Number($('#gap').value) * 60000;
    $$('input[data-bcap]').forEach((inp) => { bulkCaps[Number(inp.dataset.bcap)] = inp.value; });
    jobs = videos.map((p, i) => {
      const own = (bulkCaps[i] || '').trim();
      return {
        files: [p],
        payload: { ...base, caption: own || caption, captionFb: own ? '' : base.captionFb, captionTt: own ? '' : base.captionTt, scheduledAt: new Date(start.getTime() + i * gap).toISOString(), mediaMeta: [{ duration: p.duration, width: p.width, height: p.height }] },
      };
    });
  } else {
    jobs = [{ files: picked, payload: { ...base, caption, scheduledAt: start.toISOString(), mediaMeta: picked.map((p) => ({ duration: p.duration, width: p.width, height: p.height })) } }];
  }

  sending = true;
  $('#submit').disabled = true;
  let ok = 0;
  try {
    for (let i = 0; i < jobs.length; i++) {
      const label = jobs.length > 1 ? `Bài ${i + 1}/${jobs.length}: ` : '';
      setProgress(0, `${label}đang gửi file vào app…`);
      await sendPost(jobs[i].payload, jobs[i].files, (f) => setProgress(f, `${label}đang gửi file vào app… ${Math.round(f * 100)}%`));
      ok++;
    }
    toast(whenMode() === 'now' ? `Đã đưa ${ok} bài vào hàng đợi, đang đăng…` : `Đã lên lịch ${ok} bài.`);
    resetCompose();
    await refresh();
    qFilter = whenMode() === 'now' ? 'active' : 'upcoming';
    syncFilter();
    showTab('queue');
  } catch (e) {
    toast(`${ok ? `Đã thêm ${ok} bài. ` : ''}${e.message}`, true);
    if (ok) refresh();
  } finally {
    sending = false;
    $('#submit').disabled = false;
    setProgress(null);
  }
});

function resetCompose() {
  picked.forEach((p) => URL.revokeObjectURL(p.url));
  picked = [];
  bulkCaps = [];
  $('#caption').value = '';
  $('#captionFb').value = '';
  $('#captionTt').value = '';
  renderPreviews();
  updateCompose();
}

// ---------------- lịch đăng ----------------
function postGroup(p) {
  const st = p.targets.map((t) => t.status);
  if (st.includes('error')) return 'error';
  if (st.includes('posting') || st.includes('processing')) return 'active';
  if (st.includes('pending')) return 'upcoming';
  return 'done';
}
function syncFilter() { $$('#qFilter button').forEach((b) => b.classList.toggle('on', b.dataset.f === qFilter)); }
$('#qFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  qFilter = b.dataset.f;
  syncFilter();
  sigs.queue = '';
  renderQueue();
});

function thumb(p) {
  const m = p.media[0];
  if (!m) return '📝';
  if (p.mediaRemoved) return m.kind === 'video' ? '🎬' : '🖼';
  const src = `/media/${encodeURIComponent(m.file)}`;
  return m.kind === 'video' ? `<video src="${src}#t=0.5" muted playsinline preload="metadata"></video>` : `<img src="${src}" alt="" loading="lazy">`;
}

function renderQueue() {
  const sig = JSON.stringify([qFilter, S.posts, S.accounts.map((a) => [a.id, a.name, a.avatar])]);
  if (sigs.queue === sig) return;
  sigs.queue = sig;
  let posts = S.posts.filter((p) => {
    const g = postGroup(p);
    if (qFilter === 'all') return true;
    if (qFilter === 'upcoming') return p.targets.some((t) => t.status === 'pending') && g !== 'error';
    return g === qFilter;
  });
  const asc = qFilter === 'upcoming' || qFilter === 'active';
  posts.sort((a, b) => (asc ? 1 : -1) * (Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)));
  const box = $('#queueList');
  if (!posts.length) {
    const msg = { upcoming: ['🗓', 'Chưa có bài nào sắp đăng.', '<a href="#compose">Soạn bài mới →</a>'], active: ['⚙️', 'Không có bài nào đang xử lý.', ''], done: ['✅', 'Chưa có bài nào xong.', ''], error: ['🎉', 'Không có lỗi nào.', ''], all: ['📭', 'Chưa có bài nào.', '<a href="#compose">Soạn bài mới →</a>'] }[qFilter];
    box.innerHTML = `<div class="empty-state"><b>${msg[0]}</b>${msg[1]}<br>${msg[2]}</div>`;
    return;
  }
  let lastDay = '';
  box.innerHTML = posts.map((p) => {
    const d = new Date(p.scheduledAt);
    const day = dayLabel(d);
    const head = day !== lastDay ? `<div class="day">${esc(day)}</div>` : '';
    lastDay = day;
    const pending = p.targets.some((t) => t.status === 'pending');
    const anyErr = p.targets.some((t) => t.status === 'error' || t.status === 'canceled');
    const posting = p.targets.some((t) => t.status === 'posting');
    const fbType = { auto: '', reel: 'Reels', video: 'Video', photo: 'Ảnh', text: 'Chữ' }[p.options.fbType] || '';
    // mỗi tài khoản một dòng; chỉ hiện lời nhắn khi có ích (lỗi, đang xử lý)
    const targets = p.targets.map((t, i) => {
      const a = accById(t.accountId) || { name: '(đã xoá)', platform: t.platform };
      const label = STATUS[t.status] || esc(t.status);
      const pill = t.url
        ? `<a class="t-st" href="${esc(t.url)}" target="_blank" rel="noopener" title="Mở bài đăng">${label} ↗</a>`
        : `<span class="t-st">${label}</span>`;
      const showMsg = t.message && ['error', 'posting', 'processing', 'canceled'].includes(t.status);
      const retry = t.status === 'error' || t.status === 'canceled'
        ? `<div class="t-act"><button class="btn small" data-retry="${esc(p.id)}" data-i="${i}">↻ Thử lại</button></div>` : '';
      return `<li class="st-${esc(t.status)}">
        <div class="t-head">${avatar(a)}<span class="t-name">${esc(a.name)}</span>${pill}</div>
        ${showMsg ? `<div class="t-msg">${esc(t.message)}</div>` : ''}${retry}</li>`;
    }).join('');
    // ghi chú chung cho TikTok
    const tts = p.targets.filter((t) => t.platform === 'tiktok');
    const ttCap = p.captionTt || p.caption;
    const notes = [];
    if (tts.length) {
      if (p.options.ttMode === 'direct') {
        if (tts.some((t) => !FINAL.has(t.status))) notes.push(`♪ TikTok: đăng thẳng, ai được xem: ${esc(PRIVACY[p.options.ttPrivacy] || '')}.`);
      } else if (tts.some((t) => t.status === 'draft')) {
        notes.push('📥 Video đã vào hộp thư TikTok của kênh. Mở app TikTok → bấm thông báo → dán caption → Đăng.');
      } else if (tts.some((t) => !FINAL.has(t.status))) {
        notes.push('♪ TikTok: đến giờ video sẽ vào hộp thư nháp của kênh, bạn mở app TikTok bấm Đăng.');
      }
    }
    const copyBtn = tts.length && p.options.ttMode !== 'direct' && ttCap && tts.some((t) => t.status !== 'canceled' && t.status !== 'error')
      ? `<button class="btn small" data-copy-cap="${esc(p.id)}">📋 Chép caption TikTok</button>` : '';
    const capText = p.caption || p.captionFb || p.captionTt;
    return `${head}<article class="card post">
      <div class="thumb">${thumb(p)}</div>
      <div>
        <div class="when">${hhmm(d)} <small>${p.media.length ? `${p.media[0].kind === 'video' ? '🎬 video' : `🖼 ${p.media.length} ảnh`}` : '📝 chữ'}${fbType ? ` · FB ${fbType}` : ''}</small></div>
        <p class="cap ${capText ? '' : 'empty'}">${capText ? esc(capText) : 'Không có caption'}</p>
        <ul class="targets">${targets}</ul>
        ${notes.map((n) => `<p class="note">${n}</p>`).join('')}
        <div class="post-act">
          ${copyBtn}
          ${pending ? `<button class="btn small" data-now="${esc(p.id)}">▶ Đăng ngay</button><button class="btn small" data-edit="${esc(p.id)}">✎ Sửa</button><button class="btn small" data-cancel="${esc(p.id)}">Huỷ</button>` : ''}
          ${anyErr && p.targets.filter((t) => t.status === 'error' || t.status === 'canceled').length > 1 ? `<button class="btn small" data-retry="${esc(p.id)}">↻ Thử lại tất cả lỗi</button>` : ''}
          ${!posting ? `<button class="btn small danger" data-del="${esc(p.id)}">Xoá</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
}

$('#queueList').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const post = (id) => S.posts.find((p) => p.id === id);
  try {
    if (b.dataset.copyCap) {
      const p = post(b.dataset.copyCap);
      copyText(p.captionTt || p.caption);
    } else if (b.dataset.retry) {
      const body = b.dataset.i != null ? { index: Number(b.dataset.i) } : {};
      applyState(await api('POST', `/api/posts/${b.dataset.retry}/retry`, body));
      const rp = post(b.dataset.retry);
      toast(rp && Date.parse(rp.scheduledAt) > Date.now() + 60000 ? `Sẽ thử lại lúc ${hhmm(new Date(rp.scheduledAt))}.` : 'Đang thử lại…');
    } else if (b.dataset.now) {
      applyState(await api('POST', `/api/posts/${b.dataset.now}/now`, {}));
      toast('Đang đăng…');
    } else if (b.dataset.cancel) {
      if (!confirm('Huỷ đăng bài này cho các tài khoản chưa đăng?')) return;
      applyState(await api('POST', `/api/posts/${b.dataset.cancel}/cancel`, {}));
    } else if (b.dataset.del) {
      const p = post(b.dataset.del);
      const remote = p.targets.some((t) => ['done', 'draft', 'scheduled_remote'].includes(t.status));
      if (!confirm(remote ? 'Xoá bài khỏi app? (Bài đã đăng / đã hẹn trên Facebook, TikTok vẫn còn ở đó — muốn gỡ thì xoá trên nền tảng.)' : 'Xoá bài này?')) return;
      applyState(await api('DELETE', `/api/posts/${b.dataset.del}`));
    } else if (b.dataset.edit) {
      openEdit(post(b.dataset.edit));
    }
  } catch (err) { toast(err.message, true); }
});

let editing = null;
function openEdit(p) {
  editing = p.id;
  $('#eAt').value = toLocalInput(new Date(p.scheduledAt));
  $('#eCaption').value = p.caption || '';
  $('#eCaptionFb').value = p.captionFb || '';
  $('#eCaptionTt').value = p.captionTt || '';
  $('#eNote').hidden = !p.targets.some((t) => t.status === 'scheduled_remote');
  $('#editDlg').showModal();
}
$('#editForm').addEventListener('submit', async (e) => {
  if (e.submitter && e.submitter.value !== 'save') return;
  e.preventDefault();
  try {
    applyState(await api('PATCH', `/api/posts/${editing}`, {
      scheduledAt: new Date($('#eAt').value).toISOString(),
      caption: $('#eCaption').value, captionFb: $('#eCaptionFb').value, captionTt: $('#eCaptionTt').value,
    }));
    $('#editDlg').close();
    toast('Đã lưu.');
  } catch (err) { toast(err.message, true); }
});

// ---------------- tài khoản ----------------
function renderAccounts() {
  const sig = JSON.stringify([S.accounts, S.settings.fbAppId, S.settings.hasFbSecret, S.settings.ttClientKey, S.settings.hasTtSecret, S.settings.ttDirectPost]);
  if (sigs.acc === sig) return;
  sigs.acc = sig;
  const row = (a) => {
    let info;
    if (a.platform === 'facebook') {
      info = a.canPost ? 'Trang Facebook' : 'Trang Facebook · <span class="badge">không có quyền tạo bài</span>';
    } else {
      const draft = a.scopes.includes('video.upload');
      const direct = a.scopes.includes('video.publish');
      const daysLeft = a.refreshExpiresAt ? Math.floor((a.refreshExpiresAt - Date.now()) / 864e5) : 999;
      const parts = [];
      if (a.username) parts.push(`@${esc(a.username)}`);
      parts.push(draft ? '<span class="badge ok">Gửi nháp ✓</span>' : '<span class="badge dim">Chưa có quyền gửi nháp</span>');
      if (direct) parts.push('<span class="badge ok">Đăng thẳng ✓</span>');
      if (daysLeft < 30) parts.push(`<span class="badge">Kết nối lại trước ${new Date(a.refreshExpiresAt).toLocaleDateString('vi-VN')}</span>`);
      info = parts.join(' ');
      if (S.settings.ttDirectPost && !direct) info += '<br><span class="badge">Bấm Kết nối lại để cấp quyền đăng thẳng</span>';
    }
    return `<div class="acc">${avatar(a)}
      <div class="info"><b>${esc(a.name)}</b><small>${info}${a.needsReconnect ? ' <span class="badge">cần kết nối lại</span>' : ''}</small></div>
      <div class="tools">
        ${a.needsReconnect || (a.platform === 'tiktok' && S.settings.ttDirectPost && !a.scopes.includes('video.publish')) ? `<a class="btn small primary" href="/auth/${a.platform}/start">Kết nối lại</a>` : ''}
        <button class="btn small" data-check="${esc(a.id)}">Kiểm tra</button>
        <button class="btn small danger" data-rm-acc="${esc(a.id)}">Xoá</button>
      </div></div>`;
  };
  $('#fbList').innerHTML = S.accounts.filter((a) => a.platform === 'facebook').map(row).join('');
  $('#ttList').innerHTML = S.accounts.filter((a) => a.platform === 'tiktok').map(row).join('');
  const fbReady = S.settings.fbAppId && S.settings.hasFbSecret;
  const ttReady = S.settings.ttClientKey && S.settings.hasTtSecret;
  $('#fbSetupNote').hidden = !!fbReady;
  $('#ttSetupNote').hidden = !!ttReady;
  $('#fbConnect').textContent = S.accounts.some((a) => a.platform === 'facebook') ? 'Kết nối thêm / làm mới Trang' : 'Kết nối Facebook';
}
['#fbList', '#ttList'].forEach((s) => $(s).addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.check) {
      b.disabled = true;
      const r = await api('POST', `/api/accounts/${b.dataset.check}/check`, {});
      applyState(r.state);
      toast(r.message);
    } else if (b.dataset.rmAcc) {
      const a = accById(b.dataset.rmAcc);
      if (!confirm(`Xoá "${a.name}" khỏi app? Các bài đang chờ đăng lên tài khoản này sẽ bị huỷ.`)) return;
      selected.delete(a.id);
      store.set('selected', [...selected]);
      applyState(await api('DELETE', `/api/accounts/${a.id}`));
    }
  } catch (err) { toast(err.message, true); } finally { b.disabled = false; }
}));
$('#fbPasteToggle').addEventListener('click', () => { $('#fbPaste').hidden = !$('#fbPaste').hidden; });
$('#fbTokenSave').addEventListener('click', async () => {
  const btn = $('#fbTokenSave');
  btn.disabled = true;
  try {
    const r = await api('POST', '/api/facebook/token', { token: $('#fbToken').value });
    $('#fbToken').value = '';
    $('#fbPaste').hidden = true;
    applyState(r.state);
    toast(`Đã kết nối ${r.count} Trang Facebook.`);
  } catch (err) { toast(err.message, true); } finally { btn.disabled = false; }
});
for (const id of ['#fbConnect', '#ttConnect']) {
  $(id).addEventListener('click', (e) => {
    const isFb = id === '#fbConnect';
    const ready = isFb ? S.settings.fbAppId && S.settings.hasFbSecret : S.settings.ttClientKey && S.settings.hasTtSecret;
    if (!ready) { e.preventDefault(); toast(`Nhập ${isFb ? 'App ID / App Secret của app Meta' : 'Client key / Client secret của app TikTok'} ở Cài đặt trước.`, true); showTab('settings'); }
  });
}

// ---------------- cài đặt ----------------
function renderSettings() {
  $$('code.copy').forEach((c) => { c.textContent = S.urls[c.dataset.copy] || ''; });
  $('#versionInfo').textContent = `Tự Đăng Bài bản ${S.version}`;
  const lan = S.urls.lan;
  $('#lanInfo').innerHTML = S.settings.hasPassword
    ? `Điện thoại cùng Wi-Fi mở: ${lan.map((u) => `<code>${esc(u)}</code>`).join(' hoặc ') || '(không thấy mạng LAN)'} — tên đăng nhập gõ gì cũng được, mật khẩu là mật khẩu bên dưới.`
    : 'Đặt mật khẩu để mở app trên điện thoại cùng Wi-Fi (soạn bài, xem lịch). Không có mật khẩu thì chỉ mở được trên máy tính này.';
  $('#clearPassword').hidden = !S.settings.hasPassword || S.settings.passwordFromEnv;
  if (settingsFilled) return;
  settingsFilled = true;
  const s = S.settings;
  $('#sFbAppId').value = s.fbAppId;
  $('#sFbAppSecret').placeholder = s.hasFbSecret ? '•••••• đã lưu (để trống = giữ nguyên)' : 'Dán App Secret';
  $('#sFbApiVersion').value = s.fbApiVersion;
  $('#sTtClientKey').value = s.ttClientKey;
  $('#sTtClientSecret').placeholder = s.hasTtSecret ? '•••••• đã lưu (để trống = giữ nguyên)' : 'Dán Client secret';
  $('#sTtDirect').checked = s.ttDirectPost;
  $('#sPassword').placeholder = s.hasPassword ? '•••••• đã đặt (gõ mới để đổi)' : 'Ít nhất 6 ký tự';
  $('#sCleanup').value = s.cleanupDays;
  $('#sPublicUrl').value = s.publicUrl;
  $('#sTtPkce').value = s.ttPkce;
}
$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    fbAppId: $('#sFbAppId').value, fbApiVersion: $('#sFbApiVersion').value,
    ttClientKey: $('#sTtClientKey').value, ttDirectPost: $('#sTtDirect').checked,
    cleanupDays: $('#sCleanup').value, publicUrl: $('#sPublicUrl').value, ttPkce: $('#sTtPkce').value,
  };
  if ($('#sFbAppSecret').value) body.fbAppSecret = $('#sFbAppSecret').value;
  if ($('#sTtClientSecret').value) body.ttClientSecret = $('#sTtClientSecret').value;
  if ($('#sPassword').value) body.password = $('#sPassword').value;
  try {
    const st = await api('POST', '/api/settings', body);
    $('#sFbAppSecret').value = '';
    $('#sTtClientSecret').value = '';
    $('#sPassword').value = '';
    settingsFilled = false;
    applyState(st);
    toast('Đã lưu cài đặt.');
  } catch (err) { toast(err.message, true); }
});
$('#clearPassword').addEventListener('click', async () => {
  if (!confirm('Bỏ mật khẩu? Điện thoại sẽ không mở được app nữa.')) return;
  try { settingsFilled = false; applyState(await api('POST', '/api/settings', { clearPassword: true })); toast('Đã bỏ mật khẩu.'); } catch (err) { toast(err.message, true); }
});
document.addEventListener('click', (e) => {
  const c = e.target.closest('code.copy');
  if (c && c.textContent) copyText(c.textContent);
});

async function loadLogs() {
  try {
    const logs = await api('GET', '/api/logs');
    $('#logs').innerHTML = logs.length
      ? logs.map((l) => `<div class="${esc(l.level)}"><time>${esc(new Date(l.t).toLocaleString('vi-VN'))}</time>${esc(l.msg)}</div>`).join('')
      : '<p class="muted">Chưa có gì.</p>';
  } catch (err) { $('#logs').textContent = err.message; }
}
$('#loadLogs').addEventListener('click', loadLogs);

// ---------------- khởi động ----------------
(function init() {
  const q = new URLSearchParams(location.search);
  if (q.get('ok')) toast(q.get('ok'));
  if (q.get('err')) toast(q.get('err'), true);
  if (q.get('ok') || q.get('err')) history.replaceState(null, '', location.pathname + location.hash);
  showTab(location.hash.slice(1) || 'compose');
  refresh();
  setInterval(() => { if (document.visibilityState === 'visible' && !sending) refresh(); }, 4000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
})();
