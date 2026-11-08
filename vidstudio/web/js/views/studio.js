// Studio: sửa phụ đề, xem trước, timeline, giọng đọc, xoá sub gốc, xuất & đăng.
import { api, icon, esc, $, $$, toast, modal, confirmBox, fmtTime, parseTime, fmtDur, debounce, copyText, statusPill, store } from '../ui.js';
import { state, go } from '../main.js';
import { Timeline } from './timeline.js';

const S = {};               // trạng thái studio hiện tại
let root;

const TABS = [
  ['sub', 'Phụ đề', 'sub'], ['edit', 'Dựng', 'cut'], ['voice', 'Giọng', 'mic'], ['region', 'Hình', 'image'],
  ['translate', 'Dịch', 'globe'], ['publish', 'Đăng', 'send'], ['qa', 'Kiểm tra', 'check'],
];
const FONTS = ['Arial', 'Roboto', 'Montserrat', 'Be Vietnam Pro', 'Inter', 'Open Sans', 'Segoe UI', 'Tahoma', 'Verdana', 'Times New Roman', 'Impact'];
const MARK = /\*([^*]+)\*/g;
const plain = t => (t || '').replace(MARK, '$1').trim();

// ======================================================================= mount

export async function mount(el, [pid]) {
  root = el;
  if (!pid) {
    const list = await api('/api/projects');
    const last = store.get('last-project');
    const target = list.find(p => p.id === last) || list[0];
    if (target) return go('#/studio/' + target.id);
    el.innerHTML = `<div class="empty">${icon('studio')}<p>Chưa có video nào để chỉnh.<br><a href="#/create">Tạo video mới</a></p></div>`;
    return;
  }
  store.set('last-project', pid);
  Object.assign(S, {
    alive: true,
    pid, proj: null, undo: [], redo: [], dirty: false, saving: false, active: null, mode: 'preview',
    tab: store.get('studio-tab', 'sub'), filterIssues: false, query: '', peaks: null, ver: Date.now(),
    qaIds: new Map(), selRange: null, pollTimer: null, video: null, video2: null, audio: null, tl: null, muted: false, stopAt: null,
  });
  el.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  await loadProject();
}

export async function unmount() {
  S.alive = false;
  clearTimeout(S.pollTimer);
  S.video?.pause(); S.video2?.pause(); // video đã gỡ khỏi trang vẫn có thể phát tiếp
  if (S.dirty) await save();
  S.audio?.pause();
  S.tl?.destroy();
  document.removeEventListener('keydown', onKey);
}

async function loadProject() {
  const p = await api('/api/projects/' + S.pid);
  if (!S.alive) return;
  S.proj = p;
  if (['queued', 'processing'].includes(p.status) && !S.proj.segments.length) return renderProcessing();
  renderStudio();
  if (p.busy || ['queued', 'processing'].includes(p.status)) { setBusy(true); watchJob(); }
}

// ======================================================================= đang xử lý

function renderProcessing() {
  const p = S.proj;
  const stages = state.meta.stages;
  const idx = stages.findIndex(s => s[0] === p.stage);
  root.innerHTML = `
  <div class="page page-narrow">
    <a class="btn ghost sm" href="#/library">${icon('back', 14)} Thư viện</a>
    <div class="card" style="margin-top:16px">
      <div class="row" style="align-items:flex-start;gap:18px">
        <img src="/media/${p.id}/thumb.jpg?v=${Date.now()}" onerror="this.style.display='none'" style="width:180px;border-radius:10px;background:#000" alt="">
        <div class="grow">
          <div class="row"><h2 class="grow">${esc(p.title)}</h2>${statusPill(p)}</div>
          <div class="small dim" style="margin:4px 0">${esc(p.source_url || p.platform)}</div>
          <div class="stage-steps">${stages.map(([k, l], i) => `<span class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${i < idx ? '✓ ' : ''}${l}</span>`).join('')}</div>
          <div class="progress" style="margin:12px 0 8px"><i style="width:${p.progress || 0}%"></i></div>
          <div class="row"><span class="spinner"></span><span class="muted">${esc(p.message || 'Đang xử lý…')}</span>
            <button class="btn sm danger right" id="cancel">Huỷ</button></div>
        </div>
      </div>
      <p class="small dim" style="margin-top:16px">Bạn có thể rời trang này — app vẫn chạy nền và báo khi xong. Có thể dán thêm link khác ở trang Tạo mới.</p>
    </div>
  </div>`;
  $('#cancel', root).onclick = async () => { await api(`/api/projects/${S.pid}/cancel`, { method: 'POST' }); toast('Đã gửi lệnh huỷ'); };
  S.pollTimer = setTimeout(async () => {
    if (!S.alive) return;
    try { await loadProject(); } catch { /* thử lại */ }
  }, 1500);
}

// ======================================================================= studio

function renderStudio() {
  const p = S.proj;
  root.innerHTML = `
  <div class="studio">
    <div class="studio-top">
      <a class="icon-btn" href="#/library" title="Thư viện">${icon('back')}</a>
      <div class="title-wrap">
        <input class="title" id="title" value="${esc(p.title)}" title="Bấm để đổi tên">
        <div class="row small muted" style="gap:8px"><span class="pill blue">${esc(p.platform || 'Video')}</span>
          <span class="mono">${fmtDur(p.duration)} · ${p.width}×${p.height}</span>
          ${p.folder ? `<span>${icon('folder', 12)} ${esc(p.folder)}</span>` : ''}
          <span id="status-line">${statusLine()}</span></div>
      </div>
      <button class="score-badge" id="score" title="Điểm chất lượng — bấm để xem">${icon('check', 16)}<span>${p.qa?.score ?? '–'}</span></button>
      <button class="icon-btn" id="undo" title="Hoàn tác (Ctrl+Z)">${icon('undo')}</button>
      <button class="icon-btn" id="redo" title="Làm lại (Ctrl+Y)">${icon('redo')}</button>
      <button class="btn" id="save">${icon('save')} <span>Lưu</span></button>
      <button class="btn" id="draft" title="Xuất nhanh bản 540p để xem thử (vài giây)">${icon('eye')} Xem nháp</button>
      <button class="btn" id="update" title="Tạo lại giọng đọc cho câu đã sửa và xuất lại video">${icon('refresh')} Cập nhật video</button>
      <button class="btn primary" id="export">${icon('upload')} Xuất & đăng</button>
    </div>
    <div class="studio-main">
      <div class="col">
        <div class="lines-head">
          <div class="row"><span id="lines-info" class="muted"></span>
            <button class="btn sm ghost right" id="filter-issues">${icon('eye', 14)} Cần xem</button>
            <button class="btn sm ghost" id="add-line" title="Thêm câu tại vị trí đang phát">${icon('plus', 14)}</button></div>
          <div class="row"><input type="search" id="find" class="grow" placeholder="Tìm trong phụ đề…" style="width:auto">
            <button class="icon-btn" id="replace" title="Tìm và thay thế">${icon('text')}</button></div>
        </div>
        <div class="lines" id="lines"></div>
      </div>
      <div class="col player-col">
        <div class="stage" id="stage"></div>
        <div class="player-bar">
          <button class="play-btn" id="play">${icon('play')}</button>
          <span class="mono" id="clock">00:00.0 / ${fmtTime(p.duration)}</span>
          <button class="icon-btn" id="mute" title="Tắt/bật tiếng">${icon('volume')}</button>
          <div class="seg right" id="modes"><button data-m="preview">Xem trước</button><button data-m="output">Thành phẩm</button><button data-m="compare">So sánh</button></div>
          <button class="icon-btn" id="fullscreen" title="Toàn màn hình">${icon('expand')}</button>
        </div>
      </div>
      <div class="col side">
        <div class="tabs" id="tabs">${TABS.map(([k, l, i]) => `<button class="tab" data-tab="${k}">${icon(i)}<span>${l}</span></button>`).join('')}</div>
        <div class="tab-body" id="tab-body"></div>
      </div>
    </div>
    <div class="timeline-wrap" id="timeline"></div>
  </div>`;

  $('#title', root).onchange = e => { pushUndo(); p.title = e.target.value; markDirty(); };
  $('#undo', root).onclick = undo;
  $('#redo', root).onclick = redo;
  $('#save', root).onclick = () => save(true);
  $('#update', root).onclick = () => runJob('update');
  $('#draft', root).onclick = () => { S.openOutput = true; runJob('update', { draft: true }); };
  $('#export', root).onclick = () => { setTab('publish'); runJob(S.proj.status === 'done' && !S.dirty ? null : 'update'); };
  $('#score', root).onclick = () => setTab('qa');
  $('#filter-issues', root).onclick = e => { S.filterIssues = !S.filterIssues; e.currentTarget.classList.toggle('primary', S.filterIssues); renderLines(); };
  $('#find', root).oninput = debounce(e => { S.query = e.target.value.toLowerCase(); renderLines(); }, 200);
  $('#replace', root).onclick = openReplace;
  $('#add-line', root).onclick = addLine;
  $$('#modes button', root).forEach(b => b.onclick = () => setMode(b.dataset.m));
  $$('#tabs .tab', root).forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('#play', root).onclick = togglePlay;
  $('#mute', root).onclick = e => { S.muted = !S.muted; e.currentTarget.classList.toggle('on', S.muted); applyVolumes(); };
  $('#fullscreen', root).onclick = () => $('#stage', root).requestFullscreen?.();
  document.addEventListener('keydown', onKey);

  computeQa();
  setMode('preview');
  renderLines();
  setTab(S.tab);
  S.tl = new Timeline($('#timeline', root), {
    get proj() { return S.proj; },
    get peaks() { return S.peaks; },
    get active() { return S.active; },
    seek: t => seek(t),
    selectLine: id => activate(id, true),
    beforeChange: () => pushUndo(),
    changed: () => { markDirty(); renderLines(); },
    selection: r => { S.selRange = r; },
    trim: (kind) => timelineAction(kind),
  });
  loadPeaks();
}

function statusLine() {
  const p = S.proj;
  if (S.saving) return '<span class="dim">Đang lưu…</span>';
  if (S.dirty) return '<span style="color:var(--yellow)">● Chưa lưu</span>';
  if (p.status === 'error') return `<span style="color:var(--red)" title="${esc(p.error)}">Lỗi: ${esc((p.message || '').slice(0, 80))}</span>`;
  if (p.status === 'ready') return '<span class="pill blue">Có thay đổi chưa xuất</span>';
  if (p.status === 'done') return '<span class="pill green">Đã xuất</span>';
  return '';
}
function refreshStatus() { const el = $('#status-line', root); if (el) el.innerHTML = statusLine(); }

async function loadPeaks() {
  try { S.peaks = await api(`/api/projects/${S.pid}/peaks`); S.tl?.draw(); } catch { /* không sao */ }
}

// ======================================================================= lưu / hoàn tác

function snapshot() {
  const p = S.proj;
  return JSON.stringify({ segments: p.segments, style: p.style, settings: p.settings, trim: p.trim, cuts: p.cuts, title: p.title });
}
let lastPush = 0;
function pushUndo(force) {
  const now = Date.now();
  if (!force && now - lastPush < 800) return; // gộp các thay đổi liên tiếp khi gõ
  lastPush = now;
  S.undo.push(snapshot());
  if (S.undo.length > 100) S.undo.shift();
  S.redo = [];
}
function restore(snap) {
  Object.assign(S.proj, JSON.parse(snap));
  markDirty();
  renderLines(); renderTab(); S.tl?.draw(); renderOverlay();
  $('#title', root).value = S.proj.title;
}
function undo() { if (!S.undo.length) return toast('Không còn gì để hoàn tác'); S.redo.push(snapshot()); restore(S.undo.pop()); }
function redo() { if (!S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); }

const autosave = debounce(() => save(), 1500);
function markDirty() {
  S.dirty = true;
  refreshStatus();
  computeQa();
  autosave();
}

async function save(manual) {
  if (S.saving) return;
  if (!S.dirty && !manual) return;
  S.saving = true; refreshStatus();
  const p = S.proj;
  try {
    const res = await api('/api/projects/' + S.pid, { method: 'PUT', body: { segments: p.segments, style: p.style, settings: p.settings, trim: p.trim, cuts: p.cuts, title: p.title, next_id: p.next_id } });
    S.proj.status = res.status; S.proj.message = res.message; S.proj.qa = res.qa;
    S.dirty = false;
    if (res.segments_locked) toast('Đang xử lý nền — thay đổi phụ đề chưa được lưu, hãy sửa lại sau khi xong', 'error');
    if (manual) toast('Đã lưu', 'ok');
  } catch (e) { toast('Lưu lỗi: ' + e.message, 'error'); } finally { S.saving = false; refreshStatus(); }
}

async function runJob(kind, extra = {}) {
  if (!kind) return;
  await save();
  try {
    await api(`/api/projects/${S.pid}/run`, { method: 'POST', body: { kind, ...extra } });
    toast(kind === 'clip' ? 'Đang xuất đoạn đã chọn…' : extra.no_render ? 'Đang xử lý…' : 'Đang cập nhật giọng đọc và xuất video…');
    S.proj.status = 'processing';
    setBusy(true);
    watchJob();
  } catch (e) { toast(e.message, 'error'); }
}

// Khi đang xử lý nền: khoá sửa câu để không ghi đè lẫn nhau
function setBusy(b) {
  S.busy = b;
  const lines = $('#lines', root); if (!lines) return;
  lines.classList.toggle('locked', b);
  $$('[contenteditable]', lines).forEach(el => { el.contentEditable = b ? 'false' : 'true'; });
  $$('#lines input, #lines select, #lines [data-a]:not([data-a="play"]), #add-line, #replace, #update, #export', root).forEach(el => { el.disabled = b; });
}

function watchJob() {
  clearTimeout(S.pollTimer);
  const pid = S.pid;
  S.pollTimer = setTimeout(async () => {
    if (!S.alive || S.pid !== pid) return;
    const p = await api('/api/projects/' + S.pid);
    if (!S.alive || S.pid !== pid) return; // đã rời Studio trong lúc chờ
    const bar = $('#status-line', root);
    if (['queued', 'processing'].includes(p.status)) {
      if (bar) bar.innerHTML = `<span class="spinner" style="width:12px;height:12px;vertical-align:-2px"></span> ${esc(p.message)} <button class="btn sm ghost" id="cj">Huỷ</button>`;
      const cj = $('#cj', root); if (cj) cj.onclick = () => api(`/api/projects/${S.pid}/cancel`, { method: 'POST' });
      return watchJob();
    }
    // xong: lấy lại câu (có thể đã được dịch lại / tự rút gọn), tốc độ đọc, file mới
    S.proj.status = p.status; S.proj.message = p.message; S.proj.error = p.error; S.proj.outputs = p.outputs; S.proj.qa = p.qa;
    S.proj.segments = p.segments; S.proj.next_id = p.next_id; S.proj.title = p.title;
    setBusy(false);
    renderLines(); S.tl?.draw();
    S.ver = Date.now();
    refreshStatus(); computeQa(); loadPeaks();
    if (S.audio) S.audio.src = `/media/${S.pid}/dub.wav?v=${S.ver}`;
    if (S.openOutput && p.outputs?.length) { S.openOutput = false; setMode('output'); play(); }
    if (p.status === 'done') { toast('Video đã xuất xong', 'ok'); if (S.tab === 'publish') renderTab(); }
    else if (p.status === 'error') toast('Lỗi: ' + p.message, 'error');
  }, 1500);
}


// ======================================================================= kiểm tra chất lượng (client)

function computeQa() {
  const segs = S.proj.segments;
  const maxSpeed = +S.proj.settings.max_speed || 1.4;
  const issues = new Map();
  let score = 100;
  const n = Math.max(1, segs.length);
  const add = (id, lvl, msg, pen) => { if (!issues.has(id)) issues.set(id, []); issues.get(id).push({ lvl, msg }); score -= pen / n; };
  segs.forEach((s, i) => {
    const t = plain(s.text); const dur = Math.max(0.01, s.end - s.start);
    if (!t) return add(s.id, 'error', 'Chưa có bản dịch', 300);
    if (/[㐀-鿿]/.test(t)) add(s.id, 'error', 'Còn chữ Trung chưa dịch', 200);
    const cps = t.length / dur;
    if (cps > 22) add(s.id, 'warn', `Chữ chạy quá nhanh (${cps.toFixed(0)} ký tự/giây)`, 60);
    if (dur < 0.5) add(s.id, 'warn', 'Câu hiện quá ngắn', 30);
    if (t.length > 90) add(s.id, 'warn', 'Câu quá dài, nên tách đôi', 40);
    if (s.rate && s.rate >= maxSpeed - 0.01) add(s.id, 'warn', `Giọng phải đọc nhanh ${s.rate}x — nên rút gọn`, 50);
    if (segs[i + 1] && segs[i + 1].start < s.end - 0.05) add(s.id, 'warn', 'Chồng thời gian với câu sau', 30);
  });
  S.qaIds = issues;
  S.score = Math.max(0, Math.min(100, Math.round(score)));
  const b = $('#score', root);
  if (b) { b.querySelector('span:last-child').textContent = S.score; b.className = 'score-badge ' + (S.score >= 90 ? 'good' : S.score >= 70 ? 'mid' : 'bad'); }
  if (S.tab === 'qa') renderTab();
}

// ======================================================================= danh sách câu

function renderLines() {
  const segs = S.proj.segments;
  const box = $('#lines', root);
  if (!box) return;
  const rates = segs.map(s => s.rate || 1).filter(Boolean);
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 1;
  $('#lines-info', root).innerHTML = `<b style="color:var(--text)">${segs.length}</b> câu · đọc TB <b class="mono" style="color:var(--text)">${avg.toFixed(2).replace('.', ',')}x</b>`;
  const list = segs.filter(s => {
    if (S.filterIssues && !S.qaIds.has(s.id)) return false;
    if (S.query && !((s.text || '') + ' ' + (s.src || '')).toLowerCase().includes(S.query)) return false;
    return true;
  });
  if (!segs.length) {
    box.innerHTML = `<div class="empty">${icon('sub')}<p>Chưa có câu nào.<br><span class="small">Nhập file SRT ở tab Dịch, hoặc bấm + để thêm câu.</span></p></div>`;
    return;
  }
  box.innerHTML = list.map(s => lineHtml(s, segs.indexOf(s))).join('') || '<div class="empty small">Không có câu phù hợp</div>';
  bindLines(box);
  if (S.busy) setBusy(true);
  if (S.active) $(`.line[data-id="${S.active}"]`, box)?.classList.add('active');
}

function lineHtml(s, i) {
  const voices = state.meta.voices;
  const t = plain(s.text); const dur = Math.max(0.01, s.end - s.start);
  const maxChars = Math.round(dur * 17);
  const over = t.length > maxChars;
  const issues = S.qaIds.get(s.id);
  const speaker = s.speaker === 'male' ? 'Nam' : 'Nữ';
  return `<div class="line ${issues ? 'flag' : ''} ${s.mute ? 'muted-line' : ''}" data-id="${s.id}">
    <div class="line-meta"><span class="num">${i + 1}</span>
      <input class="t" data-f="start" value="${fmtTime(s.start)}"> → <input class="t" data-f="end" value="${fmtTime(s.end)}">
      <button class="btn sm ghost" data-a="speaker" title="Đổi giọng Nam/Nữ" style="padding:1px 6px">${speaker}</button>
      <span title="Tốc độ đọc thực tế">${(s.rate || s.speed || 1).toFixed(2).replace('.', ',')}x</span>
      ${s.speaker_id ? `<span class="pill blue" title="Người nói">${esc(s.speaker_id)}</span>` : ''}
      ${s.mute ? '<span class="pill gray">Không đọc</span>' : ''}
      <button class="icon-btn right" data-a="play" title="Phát câu này">${icon('play', 14)}</button></div>
    <div class="src" contenteditable="true" spellcheck="false" data-f="src">${esc(s.src || '')}</div>
    <div class="txt" contenteditable="true" spellcheck="false" data-f="text">${esc(s.text || '')}</div>
    ${issues ? `<div class="issue">⚠ ${issues.map(x => esc(x.msg)).join(' · ')}</div>` : ''}
    <div class="line-tools">
      <span class="cps ${over ? 'over' : ''}" title="Số ký tự / số ký tự đọc kịp"><span class="bar"><i style="width:${Math.min(100, t.length / Math.max(1, maxChars) * 100)}%"></i></span>${t.length}/${maxChars}</span>
      <span class="tools-active right row" style="gap:2px">
        <select data-f="voice" title="Giọng đọc"><option value="">Giọng chung</option>${voices.map(v => `<option value="${v.id}" ${s.voice === v.id ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>
        <select data-f="speed" title="Tốc độ đọc">${[0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.5].map(v => `<option value="${v}" ${(+s.speed || 1) === v ? 'selected' : ''}>${v.toFixed(1)}x</option>`).join('')}</select>
        <button class="icon-btn" data-a="listen" title="Nghe thử giọng đọc câu này">${icon('volume', 16)}</button>
        <button class="icon-btn" data-a="retranslate" title="Dịch lại câu này">${icon('globe', 16)}</button>
        <button class="icon-btn" data-a="mute" title="Bật/tắt đọc câu này">${icon('mic', 16)}</button>
        <button class="icon-btn" data-a="split" title="Tách câu tại vị trí con trỏ / đầu phát">${icon('cut', 16)}</button>
        <button class="icon-btn" data-a="merge" title="Gộp với câu sau">${icon('join', 16)}</button>
        <button class="icon-btn" data-a="delete" title="Xoá câu">${icon('trash', 16)}</button>
      </span>
    </div>
  </div>`;
}

function seg(id) { return S.proj.segments.find(s => s.id === +id); }

function bindLines(box) {
  box.onclick = e => {
    const line = e.target.closest('.line'); if (!line) return;
    const id = +line.dataset.id;
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) { activate(id, !e.target.closest('[contenteditable],input,select')); return; }
    lineAction(a, id);
  };
  box.addEventListener('input', e => {
    const f = e.target.dataset.f; const line = e.target.closest('.line');
    if (!line || !['src', 'text'].includes(f)) return;
    pushUndo();
    const s = seg(line.dataset.id);
    s[f] = e.target.innerText.replace(/\n+/g, ' ').trim();
    if (f === 'text') { s.tts_key = ''; s.locked = true; } // câu sửa tay → không tự rút gọn
    markDirty();
    if (s.id === S.active) renderOverlay(true);
    const t = plain(s.text); const maxC = Math.round(Math.max(0.01, s.end - s.start) * 17);
    const cps = $('.cps', line); cps.classList.toggle('over', t.length > maxC);
    cps.innerHTML = `<span class="bar"><i style="width:${Math.min(100, t.length / Math.max(1, maxC) * 100)}%"></i></span>${t.length}/${maxC}`;
  });
  box.addEventListener('keydown', e => {
    if (e.target.isContentEditable && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });
  box.addEventListener('change', e => {
    const f = e.target.dataset.f; const line = e.target.closest('.line'); if (!line || !f) return;
    const s = seg(line.dataset.id);
    pushUndo(true);
    if (f === 'start' || f === 'end') {
      const v = parseTime(e.target.value);
      if (v == null || v < 0) { e.target.value = fmtTime(s[f]); return; }
      s[f] = Math.round(v * 100) / 100;
      if (s.end <= s.start) s.end = s.start + 0.5;
      S.proj.segments.sort((a, b) => a.start - b.start);
      renderLines();
    } else if (f === 'voice') { s.voice = e.target.value; s.tts_key = ''; } else if (f === 'speed') { s.speed = +e.target.value; }
    markDirty(); S.tl?.draw();
  });
}

function activate(id, doSeek) {
  S.active = id;
  $$('#lines .line', root).forEach(l => l.classList.toggle('active', +l.dataset.id === id));
  const s = seg(id);
  if (s && doSeek) seek(s.start + 0.01); else renderOverlay(true);
  const el = $(`#lines .line[data-id="${id}"]`, root);
  if (el && !isVisible(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  S.tl?.draw();
}
function isVisible(el) {
  const r = el.getBoundingClientRect(); const pr = el.parentElement.getBoundingClientRect();
  return r.top >= pr.top && r.bottom <= pr.bottom;
}

async function lineAction(a, id) {
  const s = seg(id); if (!s) return;
  if (S.busy && a !== 'play' && a !== 'listen') return toast('Đang xử lý nền — chờ xong rồi sửa');
  const segs = S.proj.segments; const i = segs.indexOf(s);
  if (a === 'play') { activate(id, true); S.stopAt = s.end; play(); return; }
  if (a === 'speaker') { pushUndo(true); s.speaker = s.speaker === 'male' ? 'female' : 'male'; s.tts_key = ''; markDirty(); return renderLines(); }
  if (a === 'mute') { pushUndo(true); s.mute = !s.mute; markDirty(); return renderLines(); }
  if (a === 'delete') { pushUndo(true); segs.splice(i, 1); markDirty(); S.tl?.draw(); return renderLines(); }
  if (a === 'merge') {
    const n = segs[i + 1]; if (!n) return toast('Đây là câu cuối');
    pushUndo(true);
    s.end = n.end; s.src = [s.src, n.src].filter(Boolean).join(' '); s.text = [s.text, n.text].filter(Boolean).join(' '); s.tts_key = '';
    segs.splice(i + 1, 1); markDirty(); S.tl?.draw(); return renderLines();
  }
  if (a === 'split') return splitLine(s);
  if (a === 'listen') {
    toast('Đang tạo giọng đọc…');
    try {
      const r = await api(`/api/projects/${S.pid}/tts-line`, { method: 'POST', body: { text: s.text, voice: s.voice, speaker: s.speaker, speed: s.speed } });
      const au = new Audio(r.url); au.play();
      const win = s.end - s.start;
      if (r.duration > win * (+S.proj.settings.max_speed || 1.4)) toast(`Câu đọc mất ${r.duration.toFixed(1)}s nhưng chỉ có ${win.toFixed(1)}s — nên rút gọn`, 'error');
    } catch (e) { toast(e.message, 'error'); }
    return;
  }
  if (a === 'retranslate') {
    toast('Đang dịch lại…');
    try {
      const r = await api(`/api/projects/${S.pid}/translate-line`, { method: 'POST', body: { id } });
      pushUndo(true); s.text = r.text; s.tts_key = ''; markDirty(); renderLines(); activate(id);
    } catch (e) { toast(e.message, 'error'); }
  }
}

function splitLine(s) {
  const segs = S.proj.segments;
  const el = $(`#lines .line[data-id="${s.id}"] .txt`, root);
  let pos = null;
  const sel = window.getSelection();
  if (sel && el && el.contains(sel.anchorNode)) pos = sel.anchorOffset;
  const words = (s.text || '').split(' ');
  let left, right;
  if (pos && pos > 0 && pos < (s.text || '').length) { left = s.text.slice(0, pos).trim(); right = s.text.slice(pos).trim(); } else {
    const h = Math.ceil(words.length / 2); left = words.slice(0, h).join(' '); right = words.slice(h).join(' ');
  }
  const t = S.video && S.video.currentTime > s.start + 0.2 && S.video.currentTime < s.end - 0.2 ? S.video.currentTime
    : s.start + (s.end - s.start) * (left.length / Math.max(1, (s.text || '').length || 2) || 0.5);
  const srcMid = Math.ceil((s.src || '').length * (t - s.start) / (s.end - s.start));
  pushUndo(true);
  const n = { ...s, id: S.proj.next_id++, start: Math.round(t * 100) / 100, text: right, src: (s.src || '').slice(srcMid), tts_key: '', rate: null };
  s.end = n.start; s.text = left; s.src = (s.src || '').slice(0, srcMid); s.tts_key = '';
  segs.splice(segs.indexOf(s) + 1, 0, n);
  markDirty(); renderLines(); S.tl?.draw();
}

function addLine() {
  const t = S.video?.currentTime || 0;
  const segs = S.proj.segments;
  pushUndo(true);
  const nxt = segs.find(s => s.start > t);
  const s = { id: S.proj.next_id++, start: Math.round(t * 100) / 100, end: Math.round(Math.min(t + 2, nxt ? nxt.start : S.proj.duration) * 100) / 100, src: '', text: '', speaker: 'female', voice: '', speed: 1 };
  segs.push(s); segs.sort((a, b) => a.start - b.start);
  markDirty(); renderLines(); activate(s.id); S.tl?.draw();
  setTimeout(() => $(`#lines .line[data-id="${s.id}"] .txt`, root)?.focus(), 50);
}

function openReplace() {
  modal(`<h2>Tìm và thay thế</h2>
    <label class="field"><span>Tìm</span><input type="text" id="r-find" value="${esc(S.query)}"></label>
    <label class="field"><span>Thay bằng</span><input type="text" id="r-rep"></label>
    <label class="row small"><input type="checkbox" id="r-src"> Áp dụng cả câu gốc</label>
    <div class="modal-actions"><button class="btn" data-close>Đóng</button><button class="btn primary" id="r-go">Thay tất cả</button></div>`, {
    onMount(box, close) {
      $('#r-go', box).onclick = () => {
        const f = $('#r-find', box).value; const r = $('#r-rep', box).value; if (!f) return;
        pushUndo(true);
        let n = 0;
        const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        for (const s of S.proj.segments) {
          for (const k of $('#r-src', box).checked ? ['text', 'src'] : ['text']) {
            const before = s[k] || ''; const after = before.replace(re, () => { n++; return r; });
            if (after !== before) { s[k] = after; if (k === 'text') s.tts_key = ''; }
          }
        }
        markDirty(); renderLines(); close(); toast(`Đã thay ${n} chỗ`, 'ok');
      };
    },
  });
}

// ======================================================================= trình phát

function setMode(m) {
  S.mode = m;
  $$('#modes button', root).forEach(b => b.classList.toggle('active', b.dataset.m === m));
  const p = S.proj;
  const hasOut = p.outputs?.length;
  if (m !== 'preview' && !hasOut) { toast('Chưa có thành phẩm — bấm "Cập nhật video" để xuất'); return setMode('preview'); }
  const out = hasOut ? `/media/${S.pid}/${p.outputs[0].file}?v=${S.ver}` : '';
  const src = `/media/${S.pid}/source.mp4`;
  const t = S.video?.currentTime || 0;
  S.audio?.pause();
  const stage = $('#stage', root);
  if (m === 'compare') {
    stage.innerHTML = `<div class="stage-inner"><div class="vwrap"><span class="lbl">Gốc</span><video id="v1" src="${src}" playsinline preload="auto"></video></div>
      <div class="vwrap"><span class="lbl">Thành phẩm</span><video id="v2" src="${out}" playsinline preload="auto"></video></div></div>`;
    S.video = $('#v1', stage); S.video2 = $('#v2', stage);
  } else {
    stage.innerHTML = `<div class="stage-inner"><div class="vwrap" id="vwrap"><video id="v1" src="${m === 'output' ? out : src}" playsinline preload="auto"></video>
      ${m === 'preview' ? '<div class="region-box" id="region"><b></b><i></i></div><div class="sub-overlay" id="overlay"></div>' : ''}</div></div>`;
    S.video = $('#v1', stage); S.video2 = null;
  }
  const v = S.video;
  v.addEventListener('loadedmetadata', () => { if (t) v.currentTime = Math.min(t, v.duration || t); fitVideo(); renderOverlay(); renderRegion(); }, { once: true });
  v.ontimeupdate = onTime;
  v.onplay = () => { $('#play', root).innerHTML = icon('pause'); syncAudio(true); S.video2?.play(); tick(); };
  v.onpause = () => { if (!S.alive) return; $('#play', root).innerHTML = icon('play'); S.audio?.pause(); S.video2?.pause(); };
  v.onclick = togglePlay;
  if (m === 'preview') {
    if (p.settings.dub) { S.audio = S.audio || new Audio(); const want = `/media/${S.pid}/dub.wav?v=${S.ver}`; if (!S.audio.src.endsWith(want)) S.audio.src = want; } else S.audio = null;
    bindOverlayDrag(); bindRegionDrag();
  } else S.audio = null;
  applyVolumes();
  window.onresize = fitVideo;
}

function fitVideo() {
  const stage = $('#stage', root); if (!stage) return;
  const max = stage.clientHeight - 28;
  $$('video', stage).forEach(v => { v.style.maxHeight = max + 'px'; if (S.mode === 'compare') v.style.maxWidth = (stage.clientWidth / 2 - 24) + 'px'; });
  renderOverlay();
  renderRegion();
}

function applyVolumes() {
  if (!S.video) return;
  const st = S.proj.settings;
  if (S.mode === 'preview') {
    let v = 1;
    if (st.dub) {
      v = +st.orig_volume || 0;
      if (st.ducking !== false) { // giống thành phẩm: tiếng gốc to lại lúc không có lời
        const t = S.video.currentTime;
        const talking = S.proj.segments.some(s => !s.mute && s.text && t >= s.start - 0.1 && t < s.end + 0.1);
        if (!talking) v = st.gap_volume ?? 0.8;
      }
    }
    S.video.volume = S.muted ? 0 : Math.min(1, v);
    if (S.audio) S.audio.volume = S.muted ? 0 : Math.min(1, +st.voice_volume || 1);
  } else {
    S.video.volume = S.muted ? 0 : 1;
    if (S.video2) { S.video.volume = 0; S.video2.volume = S.muted ? 0 : 1; }
  }
}

function syncAudio(force) {
  if (!S.audio || S.mode !== 'preview' || !S.audio.src) return;
  if (S.video.paused) { S.audio.pause(); return; }
  if (force || Math.abs(S.audio.currentTime - S.video.currentTime) > 0.18) S.audio.currentTime = S.video.currentTime;
  if (S.audio.paused) S.audio.play().catch(() => {});
}

function togglePlay() { S.video?.paused ? play() : S.video?.pause(); }
function play() { S.video?.play().catch(() => {}); }
function seek(t) {
  if (!S.video) return;
  t = Math.max(0, Math.min(S.proj.duration, t));
  S.video.currentTime = t;
  if (S.video2) S.video2.currentTime = outTime(t);
  syncAudio(true);
  onTime();
}
function outTime(t) {
  // vị trí tương ứng trên thành phẩm (trừ phần đã cắt, chia theo tốc độ)
  const speed = +S.proj.settings.speed || 1; let acc = 0;
  for (const [a, b] of keepRanges()) { if (t < a) break; if (t <= b) return (acc + t - a) / speed; acc += b - a; }
  return acc / speed;
}
export function keepRanges() {
  const p = S.proj; const start = +(p.trim?.start || 0); const end = +(p.trim?.end || 0) || p.duration;
  let r = [[start, end]];
  for (const c of [...(p.cuts || [])].sort((a, b) => a.start - b.start)) {
    const n = [];
    for (const [s, e] of r) { if (c.end <= s || c.start >= e) { n.push([s, e]); continue; } if (c.start > s) n.push([s, c.start]); if (c.end < e) n.push([c.end, e]); }
    r = n;
  }
  return r.filter(([s, e]) => e - s > 0.05);
}

function tick() {
  if (!S.video || S.video.paused || !S.alive) return;
  onTime();
  requestAnimationFrame(tick);
}

let lastLineId = null;
function onTime() {
  if (!S.video || !S.alive) return;
  const t = S.video.currentTime;
  $('#clock', root).textContent = `${fmtTime(t)} / ${fmtTime(S.proj.duration)}`;
  if (S.stopAt && t >= S.stopAt) { S.stopAt = null; S.video.pause(); }
  // nhảy qua đoạn đã cắt khi xem trước
  if (S.mode === 'preview' && !S.video.paused) {
    for (const c of S.proj.cuts || []) if (t >= c.start && t < c.end - 0.05) { seek(c.end); return; }
    syncAudio();
  }
  if (S.video2 && Math.abs(S.video2.currentTime - outTime(t)) > 0.3) S.video2.currentTime = outTime(t);
  const cur = S.proj.segments.find(s => t >= s.start && t < s.end);
  if (cur && cur.id !== lastLineId && !S.video.paused) activate(cur.id, false);
  lastLineId = cur?.id ?? null;
  renderOverlay();
  if (S.mode === 'preview') { applyVolumes(); renderRegion(); }
  S.tl?.setTime(t);
}

// ---------- phụ đề xem trước ----------
function shadow(px, color) {
  if (px <= 0) return 'none';
  const out = [];
  for (let a = 0; a < 16; a++) { const r = a * Math.PI / 8; out.push(`${(Math.cos(r) * px).toFixed(1)}px ${(Math.sin(r) * px).toFixed(1)}px 0 ${color}`); }
  return out.join(',');
}

function renderOverlay(force) {
  const ov = $('#overlay', root); if (!ov || !S.video) return;
  const st = S.proj.style;
  const t = S.video.currentTime;
  const cur = S.proj.segments.find(s => t >= s.start && t < s.end) || (force || S.video.paused ? seg(S.active) : null);
  if (!cur || !S.proj.settings.burn_subs) { ov.innerHTML = ''; return; }
  const H = S.video.clientHeight || 1; const W = S.video.clientWidth || 1;
  const scale = H / 1080;
  let size = Math.min(W, H) * (+st.size || 5) / 100;
  const preset = st.preset;
  if (preset === 'pop') size *= 1.15;
  let text = cur.text || '';
  if (st.uppercase || preset === 'pop') text = text.toUpperCase();
  let html;
  if (preset === 'karaoke') {
    const words = text.replace(/\*/g, '').split(' ');
    if (cur.kara && cur.tts_key) { // mốc từng chữ lấy từ giọng đọc
      let k = 0;
      html = words.map(w => { const on = /[\p{L}\p{N}]/u.test(w) ? t >= cur.kara[k++] : true; return `<span style="color:${on ? st.highlight : st.color}">${esc(w)}</span>`; }).join(' ');
    } else {
      const frac = (t - cur.start) / Math.max(0.01, cur.end - cur.start);
      const total = words.reduce((a, w) => a + w.length + 1, 0); let acc = 0;
      html = words.map(w => { acc += w.length + 1; return `<span style="color:${acc / total <= frac ? st.highlight : st.color}">${esc(w)}</span>`; }).join(' ');
    }
  } else if (['tiktok', 'pop'].includes(preset)) {
    html = esc(text).replace(MARK, (_, w) => `<span style="color:${st.highlight}">${w}</span>`);
  } else html = esc(plain(text));
  const outline = (+st.outline || 3) * scale * (preset === 'pop' ? 1.6 : 1);
  const color = preset === 'movie' && st.color.toUpperCase() === '#FFFFFF' ? '#FFF4C2' : st.color;
  const boxed = preset === 'box';
  const op = +st.box_opacity || 0.6;
  const bg = boxed ? `background:${st.box_color}${Math.round(op * 255).toString(16).padStart(2, '0')};padding:.08em .35em;box-decoration-break:clone;-webkit-box-decoration-break:clone;border-radius:4px;` : '';
  const sh = boxed ? 'none' : shadow(outline, st.outline_color) + (preset === 'movie' ? `,${2 * scale}px ${2 * scale}px ${3 * scale}px #000` : '');
  ov.style.top = (+st.pos_y * 100) + '%';
  const maxW = Math.min((+st.max_chars || 32) * size * 0.55, W * 0.88);
  ov.innerHTML = `${st.show_source && cur.src ? `<div style="font:${size * 0.62}px ${st.font};color:#fff;text-shadow:${shadow(outline * 0.6, '#000')};margin-bottom:.2em">${esc(cur.src)}</div>` : ''}
    <div style="max-width:${maxW}px;margin:0 auto"><span style="font-family:'${st.font}',Arial,sans-serif;font-size:${size}px;font-weight:${st.bold ? 800 : 500};color:${color};text-shadow:${sh};${bg}">${html}</span></div>`;
}

function bindOverlayDrag() {
  const ov = $('#overlay', root); if (!ov) return;
  ov.onpointerdown = e => {
    e.preventDefault(); e.stopPropagation();
    const wrap = $('#vwrap', root).getBoundingClientRect();
    ov.classList.add('dragging');
    pushUndo(true);
    const move = ev => {
      const y = Math.max(0.05, Math.min(0.95, (ev.clientY - wrap.top) / wrap.height));
      S.proj.style.pos_y = Math.round(y * 1000) / 1000;
      renderOverlay(true);
    };
    const up = () => { ov.classList.remove('dragging'); window.removeEventListener('pointermove', move); markDirty(); if (S.tab === 'sub') renderTab(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };
}

// ---------- vùng sub gốc ----------
function renderRegion() {
  const box = $('#region', root); if (!box || !S.video) return;
  const st = S.proj.settings; const r = st.hardsub_region;
  const mode = st.hardsub;
  const editing = S.tab === 'region';
  if (mode === 'none' && !editing) { box.hidden = true; return; }
  // giống thành phẩm: chỉ làm mờ trong lúc OCR thấy có sub gốc
  const ht = S.proj.hardsub_times;
  if (!editing && st.hardsub_timing !== 'always' && ht && JSON.stringify(ht.region) === JSON.stringify(r) && mode !== 'crop') {
    const t = S.video.currentTime;
    if (!ht.ranges.some(([a, b]) => t >= a && t <= b)) { box.hidden = true; return; }
  }
  box.hidden = false;
  const W = S.video.clientWidth; const H = S.video.clientHeight;
  Object.assign(box.style, { left: r.x * W + 'px', top: r.y * H + 'px', width: r.w * W + 'px', height: r.h * H + 'px',
    borderStyle: editing ? 'dashed' : 'none', background: mode === 'box' ? 'rgba(0,0,0,.85)' : editing ? 'rgba(255,107,94,.1)' : 'transparent',
    backdropFilter: mode === 'blur' ? 'blur(10px)' : 'none', WebkitBackdropFilter: mode === 'blur' ? 'blur(10px)' : 'none', pointerEvents: editing ? 'auto' : 'none' });
  box.querySelector('b').textContent = editing ? 'Vùng sub gốc — kéo để chỉnh' : '';
  box.querySelector('i').hidden = !editing;
}

function bindRegionDrag() {
  const box = $('#region', root); if (!box) return;
  box.onpointerdown = e => {
    e.preventDefault(); e.stopPropagation();
    const resize = e.target.tagName === 'I';
    const W = S.video.clientWidth; const H = S.video.clientHeight;
    const r = S.proj.settings.hardsub_region; const o = { ...r }; const sx = e.clientX; const sy = e.clientY;
    pushUndo(true);
    const move = ev => {
      const dx = (ev.clientX - sx) / W; const dy = (ev.clientY - sy) / H;
      if (resize) { r.w = Math.max(0.05, Math.min(1 - r.x, o.w + dx)); r.h = Math.max(0.02, Math.min(1 - r.y, o.h + dy)); } else { r.x = Math.max(0, Math.min(1 - r.w, o.x + dx)); r.y = Math.max(0, Math.min(1 - r.h, o.y + dy)); }
      renderRegion();
    };
    const up = () => { window.removeEventListener('pointermove', move); for (const k in r) r[k] = Math.round(r[k] * 1000) / 1000; markDirty(); if (S.tab === 'region') renderTab(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };
}

// ======================================================================= tab bên phải

function setTab(k) {
  S.tab = k; store.set('studio-tab', k);
  $$('#tabs .tab', root).forEach(b => b.classList.toggle('active', b.dataset.tab === k));
  renderTab();
  renderRegion();
}

function sw(id, on) { return `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></label>`; }
function toggle(id, on, title, desc) { return `<div class="toggle-row"><div class="grow"><b>${title}</b>${desc ? `<span>${desc}</span>` : ''}</div>${sw(id, on)}</div>`; }
function slider(id, label, val, min, max, step, fmt = v => v) { return `<div class="kv"><span>${label}</span><b class="mono" id="${id}-v">${fmt(val)}</b></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" style="margin-bottom:14px">`; }

function renderTab() {
  const body = $('#tab-body', root); if (!body) return;
  const p = S.proj; const st = p.style; const cfg = p.settings;
  const T = {
    sub: () => `
      <div class="hint-box">${icon('eye')}<div>Phụ đề thay đổi ngay trên khung <b>Xem trước</b>. Kéo phụ đề trên video để đổi vị trí. Bọc <b>*từ khoá*</b> bằng dấu sao để tô màu (kiểu TikTok, Pop).</div></div>
      ${toggle('burn_subs', cfg.burn_subs, 'Chèn phụ đề vào video', 'Tắt nếu chỉ cần lồng tiếng')}
      <h3 style="margin-top:8px">Kiểu phụ đề</h3>
      <div class="preset-grid">${Object.entries(state.meta.presets).map(([k, l]) => `<button class="preset ${st.preset === k ? 'active' : ''}" data-preset="${k}"><div class="pv">${presetPreview(k)}</div><div class="nm">${l}</div></button>`).join('')}</div>
      <label class="field"><span>Font chữ</span><select id="font">${FONTS.map(f => `<option ${f === st.font ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      ${slider('size', 'Cỡ chữ', st.size, 2, 10, 0.1, v => (+v).toFixed(1) + '%')}
      ${slider('pos_y', 'Vị trí dọc', st.pos_y, 0.05, 0.95, 0.005, v => Math.round(v * 100) + '%')}
      ${slider('outline', 'Viền chữ', st.outline, 0, 10, 0.5)}
      ${slider('max_chars', 'Ký tự mỗi dòng', st.max_chars, 12, 60, 1)}
      <div class="row" style="margin-bottom:14px">
        <label class="row small">Chữ <input type="color" id="color" value="${st.color}"></label>
        <label class="row small">Tô màu <input type="color" id="highlight" value="${st.highlight}"></label>
        <label class="row small">Viền <input type="color" id="outline_color" value="${st.outline_color}"></label>
        ${st.preset === 'box' ? `<label class="row small">Nền <input type="color" id="box_color" value="${st.box_color}"></label>` : ''}
      </div>
      ${toggle('bold', st.bold, 'Chữ đậm')}
      ${toggle('uppercase', st.uppercase, 'VIẾT HOA toàn bộ')}
      ${toggle('show_source', st.show_source, 'Hiện cả câu gốc', 'Song ngữ: câu gốc nhỏ phía trên')}
      <div class="sep"></div>
      <button class="btn sm" id="style-default">${icon('save', 14)} Đặt làm kiểu mặc định cho video mới</button>`,
    edit: () => {
      const tr = p.trim || {}; const kept = keepRanges().reduce((a, [s, e]) => a + e - s, 0);
      return `
      <h3>Khung hình thành phẩm</h3>
      <div class="chips" style="margin-bottom:16px">${[['source', 'Như gốc'], ['9:16', '9:16'], ['1:1', '1:1'], ['16:9', '16:9'], ['4:5', '4:5']].map(([v, l]) => `<button class="chip ${cfg.output_ratio === v ? 'active' : ''}" data-ratio="${v}">${l}</button>`).join('')}</div>
      <p class="small dim" style="margin-top:-8px">Khung khác gốc sẽ tự lấp nền mờ phía sau.</p>
      <h3>Cắt video</h3>
      <div class="kv"><span>Điểm đầu</span><b class="mono">${fmtTime(tr.start || 0)}</b></div>
      <div class="kv"><span>Điểm cuối</span><b class="mono">${fmtTime(tr.end || p.duration)}</b></div>
      <div class="kv"><span>Độ dài thành phẩm</span><b class="mono">${fmtTime(kept / (+cfg.speed || 1))}</b></div>
      ${(p.cuts || []).length ? `<div class="small muted" style="margin:8px 0 4px">Đoạn đã cắt bỏ:</div>${p.cuts.map((c, i) => `<div class="row small mono" style="margin-bottom:4px">${fmtTime(c.start)} → ${fmtTime(c.end)} <button class="btn sm ghost right" data-uncut="${i}">Khôi phục</button></div>`).join('')}` : ''}
      <div class="row" style="margin:8px 0 16px"><button class="btn sm" id="reset-trim">Bỏ cắt, giữ toàn bộ</button></div>
      <p class="small dim">Kéo trên sóng âm ở timeline để chọn đoạn, rồi dùng nút <b>Cắt đoạn</b> / <b>Chỉ giữ đoạn này</b> / <b>Xuất clip</b>.</p>
      <div class="sep"></div>
      ${slider('speed', 'Tốc độ video', cfg.speed || 1, 0.75, 1.5, 0.05, v => (+v).toFixed(2) + 'x')}
      ${toggle('flip', cfg.flip, 'Lật ngang video', 'Hạn chế bị quét trùng nội dung')}
      <div class="sep"></div>
      <h3>Chất lượng xuất</h3>
      <label class="field"><span>Bộ mã hoá</span><select id="encoder"><option value="auto" ${cfg.encoder === 'auto' ? 'selected' : ''}>Tự chọn (GPU nếu có)</option><option value="h264_nvenc" ${cfg.encoder === 'h264_nvenc' ? 'selected' : ''}>GPU NVIDIA (NVENC)</option><option value="libx264" ${cfg.encoder === 'libx264' ? 'selected' : ''}>CPU (x264)</option></select></label>
      ${slider('crf', 'Chất lượng (số nhỏ = nét hơn, file to hơn)', cfg.crf || 21, 16, 30, 1)}`;
    },
    voice: () => `
      ${toggle('dub', cfg.dub, 'Lồng tiếng Việt', 'Tắt: chỉ làm phụ đề, giữ tiếng gốc')}
      <label class="field"><span>Giọng chung</span><select id="voice_default">
        <option value="auto" ${cfg.voice_default === 'auto' ? 'selected' : ''}>Tự theo người nói (Nam/Nữ)</option>
        ${state.meta.voices.map(v => `<option value="${v.id}" ${cfg.voice_default === v.id ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
      ${slider('tts_rate', 'Tốc độ đọc gốc', cfg.tts_rate || 0, -30, 40, 5, v => (v > 0 ? '+' : '') + v + '%')}
      ${slider('max_speed', 'Tự tăng tốc tối đa khi câu dài', cfg.max_speed || 1.4, 1, 2, 0.05, v => (+v).toFixed(2) + 'x')}
      ${slider('orig_volume', 'Tiếng gốc lúc có giọng Việt', cfg.orig_volume ?? 0.12, 0, 1, 0.01, v => Math.round(v * 100) + '%')}
      ${toggle('ducking', cfg.ducking !== false, 'Tiếng gốc to lại lúc không có lời', 'Giữ nhạc và tiếng động tự nhiên giữa các câu')}
      ${cfg.ducking !== false ? slider('gap_volume', 'Tiếng gốc lúc không có lời', cfg.gap_volume ?? 0.8, 0, 1, 0.01, v => Math.round(v * 100) + '%') : ''}
      ${slider('voice_volume', 'Âm lượng giọng đọc', cfg.voice_volume ?? 1, 0.3, 2, 0.05, v => Math.round(v * 100) + '%')}
      ${toggle('separate_music', cfg.separate_music, 'Tách nhạc nền', 'Giữ nhạc, bỏ giọng gốc (cần audio-separator)')}
      ${toggle('loudnorm', cfg.loudnorm !== false, 'Chuẩn âm lượng mạng xã hội', 'Đưa về khoảng -14 LUFS như TikTok, YouTube')}
      ${toggle('auto_shorten', cfg.auto_shorten !== false, 'AI tự rút gọn câu đọc không kịp', 'Chỉ áp dụng cho câu chưa sửa tay, khi dịch bằng AI (không phải Google dịch)')}
      ${speakerVoices(cfg)}
      <div class="sep"></div>
      <div class="row"><button class="btn sm" id="all-voice-reset">Bỏ giọng riêng của từng câu</button>
      <button class="btn sm" id="detect-gender">Đặt Nam/Nữ cho tất cả…</button></div>
      <div class="sep"></div>
      <button class="btn primary" id="revoice">${icon('mic', 16)} Tạo lại giọng đọc (không xuất video)</button>
      <p class="small dim">Chỉ những câu đã sửa mới phải tạo lại — các câu khác dùng lại file cũ nên rất nhanh.</p>`,
    region: () => {
      const r = cfg.hardsub_region;
      return `
      <div class="hint-box">${icon('image')}<div>Khung đỏ trên video là vùng sub gốc sẽ bị xoá. Kéo để di chuyển, kéo góc dưới để đổi cỡ.</div></div>
      <h3>Cách xoá sub gốc</h3>
      <div class="option-grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px">${[['none', 'Giữ nguyên', 'Không xoá'], ['blur', 'Làm mờ', 'Nhanh, tự nhiên'], ['inpaint', 'Vẽ lại nền', 'Sạch nhất, chậm hơn'], ['box', 'Che hộp đen', 'Che kín hoàn toàn'], ['crop', 'Cắt bỏ', 'Cắt phần dưới, lấp nền mờ']].map(([k, l, d]) => `<button class="option ${cfg.hardsub === k ? 'active' : ''}" data-hardsub="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>
      <div class="grid2" style="gap:10px">${['x', 'y', 'w', 'h'].map(k => `<label class="field"><span>${{ x: 'Trái', y: 'Trên', w: 'Rộng', h: 'Cao' }[k]} (%)</span><input type="number" data-region="${k}" value="${Math.round(r[k] * 1000) / 10}" step="0.5" min="0" max="100"></label>`).join('')}</div>
      ${toggle('hardsub_timing', cfg.hardsub_timing !== 'always', 'Chỉ làm mờ lúc có sub gốc', 'Dùng OCR dò thời điểm có chữ — phần còn lại của hình giữ nét')}
      <div class="row"><button class="btn sm" id="detect">${icon('sparkle', 14)} Tự dò bằng OCR</button>
        <button class="btn sm" id="region-default">Đặt làm mặc định</button></div>`;
    },
    translate: () => `
      <label class="field"><span>Dịch bằng</span><select id="translator">${Object.entries(state.meta.providers).map(([k, v]) => `<option value="${k}" ${cfg.translator === k ? 'selected' : ''}>${esc(v.label)} — ${esc(v.desc)}</option>`).join('')}</select></label>
      <div class="row" style="margin-bottom:16px">
        <button class="btn sm" id="tr-empty">Dịch các câu còn trống</button>
        <button class="btn sm" id="tr-flag">Dịch lại câu bị cảnh báo</button>
        <button class="btn sm" id="tr-all">Dịch lại tất cả</button></div>
      <p class="small dim">Văn phong và bảng thuật ngữ chỉnh trong <a href="#/settings">Cài đặt</a>.</p>
      <div class="sep"></div>
      <h3>Phụ đề SRT</h3>
      <div class="row" style="margin-bottom:10px">
        <a class="btn sm" href="/api/projects/${S.pid}/srt?which=text">${icon('download', 14)} Tải SRT tiếng Việt</a>
        <a class="btn sm" href="/api/projects/${S.pid}/srt?which=src">${icon('download', 14)} Tải SRT gốc</a></div>
      <div class="row"><label class="btn sm">${icon('upload', 14)} Nhập SRT (thay toàn bộ)<input type="file" id="srt-in" accept=".srt" hidden></label>
        <select id="srt-target" style="width:auto"><option value="text">làm bản dịch</option><option value="src">làm câu gốc</option></select></div>
      <div class="sep"></div>
      <h3>Nhận dạng lại từ đầu</h3>
      <p class="small dim">Xoá toàn bộ câu hiện có, chép lời và dịch lại (dùng khi nhận dạng sai nhiều).</p>
      <div class="row"><select id="source_mode" style="width:auto"><option value="asr" ${p.source_mode !== 'ocr' ? 'selected' : ''}>Nghe giọng nói</option><option value="ocr" ${p.source_mode === 'ocr' ? 'selected' : ''}>Đọc sub gốc (OCR)</option></select>
        <select id="asr_model" style="width:auto">${['tiny', 'base', 'small', 'medium', 'large-v3', 'large-v3-turbo'].map(m => `<option ${cfg.asr_model === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <button class="btn sm danger" id="redo-all">Làm lại</button></div>`,
    publish: () => {
      const outs = p.outputs || []; const cap = p.caption;
      return `
      ${outs.length ? `<h3>Thành phẩm</h3>${outs.map((o, i) => `<div class="row" style="margin-bottom:8px"><span class="grow small">${o.draft ? 'Bản nháp 540p' : o.clip ? 'Clip' : 'Video đầy đủ'} · ${new Date(o.time * 1000).toLocaleString('vi-VN')}</span>
        <a class="btn sm ${i === 0 ? 'primary' : ''}" href="/media/${S.pid}/${o.file}?download=1">${icon('download', 14)} Tải</a></div>`).join('')}
        <div class="row" style="margin:6px 0 4px"><a class="btn sm" href="/media/${S.pid}/output.srt" download>${icon('sub', 14)} SRT thành phẩm</a><button class="btn sm" id="open-folder">${icon('folder', 14)} Mở thư mục</button></div>`
        : `<div class="hint-box">${icon('upload')}<div>Chưa xuất video. Bấm <b>Cập nhật video</b> để dựng thành phẩm.</div></div>`}
      <div class="sep"></div>
      <div class="row"><h3 class="grow" style="margin:0">Tiêu đề, mô tả & hashtag</h3>
        <select id="cap-platform" style="width:auto"><option>TikTok</option><option>YouTube Shorts</option><option>Facebook Reels</option><option>Instagram Reels</option></select>
        <button class="btn sm primary" id="gen-cap">${icon('sparkle', 14)} AI viết</button></div>
      ${cap ? `<div style="margin-top:12px">${(cap.titles || []).map(t => `<div class="row" style="margin-bottom:6px"><span class="grow">${esc(t)}</span><button class="icon-btn" data-copy="${esc(t)}">${icon('copy', 15)}</button></div>`).join('')}
        ${cap.hook ? `<div class="small muted" style="margin:8px 0">Câu mở đầu gợi ý: <b>${esc(cap.hook)}</b></div>` : ''}
        <label class="field" style="margin-top:10px"><span>Mô tả + hashtag</span><textarea id="cap-text" rows="5">${esc(cap.description + '\n\n' + (cap.hashtags || []).join(' '))}</textarea></label>
        <button class="btn sm" id="copy-cap">${icon('copy', 14)} Chép mô tả</button>${cap.note ? `<p class="small dim">${esc(cap.note)}</p>` : ''}</div>` : '<p class="small dim">AI đọc lời thoại và viết tiêu đề, mô tả, hashtag cho bạn.</p>'}
      <div class="sep"></div>
      <h3>Đăng lên</h3>
      <div class="grid2" style="gap:8px">
        <a class="btn" target="_blank" rel="noopener" href="https://www.tiktok.com/tiktokstudio/upload">TikTok Studio ${icon('external', 14)}</a>
        <a class="btn" target="_blank" rel="noopener" href="https://studio.youtube.com">YouTube Studio ${icon('external', 14)}</a>
        <a class="btn" target="_blank" rel="noopener" href="https://business.facebook.com/latest/reels_composer">Facebook Reels ${icon('external', 14)}</a>
        <a class="btn" target="_blank" rel="noopener" href="https://www.instagram.com/">Instagram ${icon('external', 14)}</a></div>
      <p class="small dim">Tải video về rồi kéo vào trang đăng. Hãy đảm bảo bạn có quyền sử dụng nội dung gốc và ghi nguồn khi cần.</p>`;
    },
    qa: () => {
      const items = [...S.qaIds.entries()];
      return `<div class="row" style="margin-bottom:12px"><div class="score-badge ${S.score >= 90 ? 'good' : S.score >= 70 ? 'mid' : 'bad'}" style="font-size:22px">${S.score}</div>
        <div class="grow small muted">${items.length ? `${items.length} câu cần xem lại. Bấm để nhảy tới câu.` : 'Không phát hiện vấn đề nào. Sẵn sàng xuất!'}</div></div>
        ${items.map(([id, list]) => { const s = seg(id); const i = S.proj.segments.indexOf(s); return `<div class="qa-item" data-jump="${id}"><span class="lvl ${list.some(x => x.lvl === 'error') ? 'error' : ''}"></span><div><b class="mono small">#${i + 1} · ${fmtTime(s.start)}</b><div class="small">${list.map(x => esc(x.msg)).join('<br>')}</div><div class="small dim">${esc(plain(s.text).slice(0, 80))}</div></div></div>`; }).join('')}
        ${items.some(([, l]) => l.some(x => x.msg.includes('đọc nhanh') || x.msg.includes('quá nhanh'))) ? `<button class="btn sm" id="ai-shorten" style="margin-top:12px">${icon('sparkle', 14)} Dịch lại ngắn hơn các câu đọc nhanh</button>` : ''}`;
    },
  };
  body.innerHTML = T[S.tab]();
  bindTab(body);
}

function speakerVoices(cfg) {
  const ids = [...new Set(S.proj.segments.map(s => s.speaker_id).filter(Boolean))].sort();
  if (!ids.length) return '';
  const sv = cfg.speaker_voices || {};
  return `<div class="sep"></div><h3>Giọng theo người nói</h3>
    ${ids.map(id => { const n = S.proj.segments.filter(s => s.speaker_id === id).length; return `<div class="row" style="margin-bottom:8px"><span class="pill blue">${esc(id)}</span><span class="small dim">${n} câu</span>
      <select class="grow" data-spk="${esc(id)}" style="width:auto"><option value="">Theo giọng chung</option>${state.meta.voices.map(v => `<option value="${v.id}" ${sv[id] === v.id ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div>`; }).join('')}`;
}

function presetPreview(k) {
  const hl = S.proj.style.highlight;
  return {
    classic: '<span style="text-shadow:0 0 3px #000,0 0 3px #000">Xin chào các bạn</span>',
    movie: '<span style="color:#FFF4C2;text-shadow:2px 2px 3px #000">Xin chào các bạn</span>',
    box: '<span style="background:#000c;padding:2px 6px">Xin chào các bạn</span>',
    tiktok: `<span style="text-shadow:0 0 3px #000,0 0 3px #000">Xin <span style="color:${hl}">chào</span> các bạn</span>`,
    karaoke: `<span style="text-shadow:0 0 3px #000"><span style="color:${hl}">Xin chào</span> các bạn</span>`,
    pop: `<span style="font-size:18px;font-weight:900;text-shadow:0 0 4px #000,0 0 4px #000">XIN <span style="color:${hl}">CHÀO</span></span>`,
  }[k];
}

function bindTab(body) {
  const p = S.proj; const st = p.style; const cfg = p.settings;
  const styleKeys = ['size', 'pos_y', 'outline', 'max_chars', 'color', 'highlight', 'outline_color', 'box_color', 'font'];
  const cfgSliders = ['speed', 'crf', 'tts_rate', 'max_speed', 'orig_volume', 'voice_volume', 'gap_volume'];
  body.oninput = e => {
    const id = e.target.id;
    if (styleKeys.includes(id)) {
      pushUndo(); st[id] = e.target.type === 'range' ? +e.target.value : e.target.value;
      const v = $(`#${id}-v`, body); if (v) v.textContent = id === 'size' ? (+st[id]).toFixed(1) + '%' : id === 'pos_y' ? Math.round(st[id] * 100) + '%' : st[id];
      renderOverlay(true); markDirty();
    } else if (cfgSliders.includes(id)) {
      pushUndo(); cfg[id] = +e.target.value;
      const fmt = { speed: v => v.toFixed(2) + 'x', crf: v => v, tts_rate: v => (v > 0 ? '+' : '') + v + '%', max_speed: v => v.toFixed(2) + 'x', orig_volume: v => Math.round(v * 100) + '%', gap_volume: v => Math.round(v * 100) + '%', voice_volume: v => Math.round(v * 100) + '%' }[id];
      $(`#${id}-v`, body).textContent = fmt(cfg[id]);
      if (id === 'tts_rate') p.segments.forEach(s => s.tts_key = '');
      applyVolumes(); markDirty();
    } else if (e.target.dataset.region) {
      pushUndo(); cfg.hardsub_region[e.target.dataset.region] = Math.max(0, Math.min(1, +e.target.value / 100)); renderRegion(); markDirty();
    }
  };
  body.onchange = e => {
    const id = e.target.id; const chk = e.target.type === 'checkbox' ? e.target.checked : null;
    if (['bold', 'uppercase', 'show_source'].includes(id)) { pushUndo(true); st[id] = chk; renderOverlay(true); markDirty(); }
    else if (['burn_subs', 'flip', 'dub', 'separate_music', 'ducking', 'loudnorm', 'auto_shorten'].includes(id)) { pushUndo(true); cfg[id] = chk; markDirty(); if (id === 'dub') setMode('preview'); if (id === 'ducking') renderTab(); applyVolumes(); renderOverlay(true); }
    else if (id === 'hardsub_timing') { pushUndo(true); cfg.hardsub_timing = chk ? 'auto' : 'always'; markDirty(); }
    else if (['encoder', 'voice_default', 'translator', 'asr_model'].includes(id)) { pushUndo(true); cfg[id] = e.target.value; if (id === 'voice_default') p.segments.forEach(s => s.tts_key = ''); markDirty(); }
    else if (id === 'source_mode') { p.source_mode = e.target.value; markDirty(); }
    else if (e.target.dataset.spk) {
      pushUndo(true); cfg.speaker_voices = { ...(cfg.speaker_voices || {}), [e.target.dataset.spk]: e.target.value };
      if (!e.target.value) delete cfg.speaker_voices[e.target.dataset.spk];
      p.segments.forEach(s => { if (s.speaker_id === e.target.dataset.spk) s.tts_key = ''; }); markDirty();
    }
    else if (id === 'srt-in') importSrt(e.target.files[0]);
  };
  body.onclick = async e => {
    const t = e.target.closest('button, [data-jump]'); if (!t) return;
    if (t.dataset.preset) {
      pushUndo(true); st.preset = t.dataset.preset; markDirty(); renderTab(); renderOverlay(true);
      if (['tiktok', 'pop'].includes(st.preset) && !p.segments.some(s => /\*[^*]+\*/.test(s.text || ''))) toast('Mẹo: bọc *từ khoá* bằng dấu sao để tô màu. Dịch bằng AI sẽ tự đánh dấu.');
    }
    if (t.dataset.ratio) { pushUndo(true); cfg.output_ratio = t.dataset.ratio; markDirty(); renderTab(); }
    if (t.dataset.hardsub) { pushUndo(true); cfg.hardsub = t.dataset.hardsub; markDirty(); renderTab(); renderRegion(); }
    if (t.dataset.uncut) { pushUndo(true); p.cuts.splice(+t.dataset.uncut, 1); markDirty(); renderTab(); S.tl?.draw(); }
    if (t.dataset.jump) { activate(+t.dataset.jump, true); }
    if (t.dataset.copy) copyText(t.dataset.copy);
    switch (t.id) {
      case 'style-default': {
        const s = state.settings; s.style = { ...st }; await api('/api/settings', { method: 'PUT', body: s }); toast('Đã đặt làm kiểu mặc định', 'ok'); break;
      }
      case 'region-default': {
        const s = state.settings; s.hardsub_region = { ...cfg.hardsub_region }; s.hardsub = cfg.hardsub; await api('/api/settings', { method: 'PUT', body: s }); toast('Đã lưu vùng mặc định', 'ok'); break;
      }
      case 'reset-trim': pushUndo(true); p.trim = { start: 0, end: p.duration }; p.cuts = []; markDirty(); renderTab(); S.tl?.draw(); break;
      case 'all-voice-reset': pushUndo(true); p.segments.forEach(s => { s.voice = ''; s.tts_key = ''; }); markDirty(); renderLines(); toast('Tất cả câu dùng giọng chung'); break;
      case 'detect-gender': {
        const male = await confirmBox('Đặt người nói cho tất cả câu', 'Chọn "Nam" để đặt tất cả là giọng nam, Huỷ để đặt tất cả là nữ.', 'Nam');
        pushUndo(true); p.segments.forEach(s => { s.speaker = male ? 'male' : 'female'; s.tts_key = ''; }); markDirty(); renderLines(); break;
      }
      case 'revoice': runJob('update', { no_render: true }); break;
      case 'detect': {
        toast('Đang dò vùng sub bằng OCR…');
        try { const r = await api(`/api/projects/${S.pid}/detect-region`, { method: 'POST' }); pushUndo(true); cfg.hardsub_region = r; if (cfg.hardsub === 'none') cfg.hardsub = 'blur'; markDirty(); renderTab(); renderRegion(); toast('Đã tìm thấy vùng sub', 'ok'); } catch (err) { toast(err.message, 'error'); }
        break;
      }
      case 'tr-empty': retranslate(p.segments.filter(s => !plain(s.text)).map(s => s.id)); break;
      case 'tr-flag': retranslate([...S.qaIds.keys()]); break;
      case 'ai-shorten': retranslate([...S.qaIds.entries()].filter(([, l]) => l.some(x => x.msg.includes('nhanh'))).map(([id]) => id)); break;
      case 'tr-all': if (await confirmBox('Dịch lại tất cả?', 'Các câu bạn đã sửa tay sẽ bị ghi đè.', 'Dịch lại')) retranslate(p.segments.map(s => s.id)); break;
      case 'redo-all':
        if (await confirmBox('Làm lại từ đầu?', 'Xoá toàn bộ câu hiện có, nhận dạng và dịch lại.', 'Làm lại', true)) {
          await save(); await api(`/api/projects/${S.pid}/retry`, { method: 'POST', body: { from_scratch: true } }); loadProject();
        }
        break;
      case 'open-folder': { const r = await api('/api/open-folder', { method: 'POST', body: { pid: S.pid } }); if (!r.ok) toast('Thư mục: ' + r.path); break; }
      case 'gen-cap': {
        t.disabled = true; t.innerHTML = '<span class="spinner"></span> Đang viết…';
        try { p.caption = await api(`/api/projects/${S.pid}/caption`, { method: 'POST', body: { platform: $('#cap-platform', body).value } }); renderTab(); } catch (err) { toast(err.message, 'error'); t.disabled = false; t.textContent = 'AI viết'; }
        break;
      }
      case 'copy-cap': copyText($('#cap-text', body).value); break;
    }
  };
}

async function retranslate(ids) {
  if (!ids.length) return toast('Không có câu nào cần dịch');
  await runJob('update', { retranslate_ids: ids, no_render: true });
}

async function importSrt(file) {
  if (!file) return;
  if (S.proj.segments.length && !await confirmBox('Nhập SRT?', 'Toàn bộ câu hiện có sẽ bị thay thế.', 'Nhập')) return;
  const fd = new FormData(); fd.append('file', file); fd.append('target', $('#srt-target', root).value);
  try {
    pushUndo(true);
    const p = await api(`/api/projects/${S.pid}/srt`, { method: 'POST', body: fd });
    S.proj.segments = p.segments; S.proj.next_id = p.next_id; renderLines(); S.tl?.draw(); computeQa(); toast(`Đã nhập ${p.segments.length} câu`, 'ok');
  } catch (e) { toast(e.message, 'error'); }
}

// ======================================================================= timeline actions

function timelineAction(kind) {
  const p = S.proj; const t = S.video?.currentTime || 0; const r = S.selRange;
  if (kind === 'in') { pushUndo(true); p.trim = { ...p.trim, start: Math.round(t * 100) / 100 }; if (p.trim.end && p.trim.end <= p.trim.start) p.trim.end = p.duration; }
  else if (kind === 'out') { pushUndo(true); p.trim = { ...p.trim, end: Math.round(t * 100) / 100 }; if (p.trim.end <= (p.trim.start || 0)) p.trim.start = 0; }
  else if (!r || r[1] - r[0] < 0.2) return toast('Kéo trên sóng âm để chọn một đoạn trước');
  else if (kind === 'cut') { pushUndo(true); p.cuts = [...(p.cuts || []), { start: r[0], end: r[1] }]; S.tl.clearSelection(); }
  else if (kind === 'keep') { pushUndo(true); p.trim = { start: r[0], end: r[1] }; p.cuts = (p.cuts || []).filter(c => c.end > r[0] && c.start < r[1]); S.tl.clearSelection(); }
  else if (kind === 'clip') { runJob('clip', { clip: r }); return; }
  markDirty(); S.tl.draw(); if (S.tab === 'edit') renderTab();
}

// ======================================================================= phím tắt

function onKey(e) {
  if (!root?.isConnected || !S.proj?.segments) return;
  const typing = e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(true); return; }
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
  if (typing) return;
  if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'ArrowLeft') { seek((S.video?.currentTime || 0) - (e.shiftKey ? 5 : 1)); }
  else if (e.key === 'ArrowRight') { seek((S.video?.currentTime || 0) + (e.shiftKey ? 5 : 1)); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const segs = S.proj.segments; const i = segs.findIndex(s => s.id === S.active);
    const n = segs[Math.max(0, Math.min(segs.length - 1, i + (e.key === 'ArrowUp' ? -1 : 1)))];
    if (n) activate(n.id, true);
  } else if (e.key.toLowerCase() === 'i') timelineAction('in');
  else if (e.key.toLowerCase() === 'o') timelineAction('out');
}

export function commands() {
  if (!S.proj?.segments || !root?.isConnected) return [];
  return [
    { label: 'Studio: Lưu', icon: 'save', key: 'Ctrl+S', run: () => save(true) },
    { label: 'Studio: Cập nhật video', icon: 'refresh', run: () => runJob('update') },
    { label: 'Studio: Chỉ xuất lại video (giữ giọng cũ)', icon: 'upload', run: () => runJob('render') },
    { label: 'Studio: Tạo lại giọng đọc', icon: 'mic', run: () => runJob('update', { no_render: true }) },
    { label: 'Studio: Thêm câu tại vị trí phát', icon: 'plus', run: addLine },
    { label: 'Studio: Tìm và thay thế', icon: 'text', run: openReplace },
    { label: 'Studio: Viết tiêu đề & hashtag bằng AI', icon: 'sparkle', run: () => setTab('publish') },
    ...TABS.map(([k, l, i]) => ({ label: `Studio: Tab ${l}`, icon: i, run: () => setTab(k) })),
  ];
}
