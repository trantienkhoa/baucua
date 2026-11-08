// Khung ứng dụng: điều hướng, hàng đợi, bảng lệnh.
import { api, icon, esc, $, toast, notify, statusPill, store } from './ui.js';
import * as createView from './views/create.js';
import * as discoverView from './views/discover.js';
import * as libraryView from './views/library.js';
import * as studioView from './views/studio.js';
import * as mergeView from './views/merge.js';
import * as thumbView from './views/thumb.js';
import * as settingsView from './views/settings.js';

export const state = { meta: null, settings: null, lastEvent: Date.now() / 1000, current: null };

const NAV = [
  { id: 'create', label: 'Tạo mới', icon: 'plus', view: createView },
  { id: 'discover', label: 'Khám phá', icon: 'compass', view: discoverView },
  { id: 'library', label: 'Thư viện', icon: 'grid', view: libraryView },
  { id: 'studio', label: 'Studio', icon: 'studio', view: studioView },
  { id: 'merge', label: 'Ghép video', icon: 'merge', view: mergeView },
  { id: 'thumb', label: 'Ảnh bìa', icon: 'image', view: thumbView },
  { id: 'settings', label: 'Cài đặt', icon: 'sliders', view: settingsView },
];

function renderNav(active) {
  $('#nav').innerHTML = NAV.map(n => `<a class="nav-item ${n.id === active ? 'active' : ''}" href="#/${n.id}">
    ${icon(n.icon)}<span>${n.label}</span></a>`).join('');
}

export function go(hash) { location.hash = hash; }

// Chế độ miễn phí 100%: chỉ đưa ra lựa chọn không tốn tiền
export const freeOnly = () => state.settings?.free_only !== false;
export const voices = () => state.meta.voices.filter(v => !freeOnly() || v.free);
export const providers = () => Object.entries(state.meta.providers).filter(([, v]) => !freeOnly() || v.free);

async function route() {
  const [, name = 'create', ...rest] = location.hash.split('/');
  const entry = NAV.find(n => n.id === name) || NAV[0];
  if (state.current && state.current.unmount) {
    const ok = await state.current.unmount();
    if (ok === false) return;
  }
  renderNav(entry.id);
  const view = $('#view');
  view.innerHTML = '';
  view.scrollTop = 0;
  state.current = entry.view;
  const title = { create: 'Tạo mới', discover: 'Khám phá', library: 'Thư viện', studio: 'Studio', merge: 'Ghép video', thumb: 'Ảnh bìa', settings: 'Cài đặt' }[entry.id];
  document.title = `${title} · VieDub Studio`;
  try {
    await entry.view.mount(view, rest.map(decodeURIComponent));
  } catch (e) {
    view.innerHTML = `<div class="empty">${icon('x')}<p>${esc(e.message)}</p></div>`;
  }
}

// ---------------- hàng đợi ----------------
async function pollJobs() {
  try {
    const data = await api('/api/jobs?since=' + state.lastEvent);
    const badge = $('#queue-badge');
    badge.hidden = !data.active.length;
    badge.textContent = data.active.length;
    $('#queue-list').innerHTML = data.active.length ? data.active.map(p => `
      <div class="q-item"><div class="row"><b class="grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.title)}</b>
      ${statusPill(p)}</div><div class="small muted" style="margin:4px 0 6px">${p.lane ? `<span class="pill gray">${esc(p.lane)}</span> ` : ''}${esc(p.message || '')}</div>
      <div class="progress"><i style="width:${p.progress || 0}%"></i></div>
      <div class="row" style="margin-top:6px"><a class="btn sm ghost" href="#/studio/${p.id}">Mở</a>
      <button class="btn sm ghost danger" data-cancel="${p.id}">Huỷ</button></div></div>`).join('')
      : '<div class="empty small" style="padding:30px">Không có việc nào đang chạy</div>';
    for (const ev of data.events) {
      state.lastEvent = Math.max(state.lastEvent, ev.t);
      if (ev.kind === 'done') {
        toast(ev.msg, 'ok');
        if (state.settings?.notify !== false) notify('VieDub Studio', ev.msg);
      } else if (ev.kind === 'error') toast('Lỗi: ' + ev.msg, 'error');
      else toast(ev.msg);
      state.current?.onEvent?.(ev);
    }
    state.current?.onJobs?.(data.active);
  } catch { /* máy chủ tạm thời không phản hồi */ }
  setTimeout(pollJobs, 1200);
}

$('#queue-list').addEventListener('click', async e => {
  const id = e.target.closest('[data-cancel]')?.dataset.cancel;
  if (id) { await api(`/api/projects/${id}/cancel`, { method: 'POST' }); toast('Đã gửi lệnh huỷ'); }
});
$('#btn-queue').onclick = () => { $('#queue-panel').hidden = !$('#queue-panel').hidden; };
$('#queue-panel [data-close]').onclick = () => { $('#queue-panel').hidden = true; };

// ---------------- bảng lệnh (Ctrl+K) ----------------
let palItems = [];
let palSel = 0;

function baseCommands() {
  const cmds = NAV.map(n => ({ label: `Mở ${n.label}`, icon: n.icon, run: () => go('#/' + n.id) }));
  cmds.push(
    { label: 'Dán link video mới', icon: 'plus', run: () => go('#/create') },
    { label: 'Mở thư mục video đã xuất', icon: 'folder', run: () => api('/api/open-folder', { method: 'POST', body: {} }).then(r => !r.ok && toast('Thư mục: ' + r.path)) },
    { label: 'Đổi giao diện sáng / tối', icon: 'sun', run: toggleTheme },
    { label: 'Bật thông báo trên máy', icon: 'bell', run: () => window.Notification && Notification.requestPermission() },
  );
  const extra = state.current?.commands?.() || [];
  return [...extra, ...cmds];
}

async function openPalette() {
  $('#palette').hidden = false;
  const inp = $('#palette-input');
  inp.value = '';
  inp.focus();
  let projects = [];
  try { projects = await api('/api/projects'); } catch { /* bỏ qua */ }
  const all = [...baseCommands(), ...projects.slice(0, 60).map(p => ({ label: p.title, icon: 'studio', hint: p.platform, run: () => go('#/studio/' + p.id) }))];
  const draw = () => {
    const q = inp.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    palItems = all.filter(c => c.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)).slice(0, 40);
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    $('#palette-list').innerHTML = palItems.map((c, i) => `<div class="pal-item ${i === palSel ? 'sel' : ''}" data-i="${i}">${icon(c.icon || 'sparkle')}<span>${esc(c.label)}</span>${c.key ? `<kbd>${c.key}</kbd>` : (c.hint ? `<kbd>${esc(c.hint)}</kbd>` : '')}</div>`).join('') || '<div class="pal-item muted">Không có lệnh phù hợp</div>';
  };
  inp.oninput = () => { palSel = 0; draw(); };
  inp.onkeydown = e => {
    if (e.key === 'ArrowDown') { palSel = Math.min(palItems.length - 1, palSel + 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); draw(); e.preventDefault(); }
    if (e.key === 'Enter' && palItems[palSel]) { closePalette(); palItems[palSel].run(); }
    if (e.key === 'Escape') closePalette();
  };
  draw();
}
function closePalette() { $('#palette').hidden = true; }
$('#palette').onclick = e => {
  if (e.target.id === 'palette') return closePalette();
  const it = e.target.closest('.pal-item[data-i]');
  if (it) { closePalette(); palItems[+it.dataset.i].run(); }
};
$('#btn-palette').onclick = openPalette;
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape') { $('#modal').hidden = true; closePalette(); }
});

function toggleTheme() {
  const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
}

// ---------------- khởi động ----------------
(async function boot() {
  document.documentElement.dataset.theme = store.get('theme', 'dark');
  document.querySelectorAll('[data-i]').forEach(el => { el.outerHTML = icon(el.dataset.i); });
  try {
    [state.meta, { settings: state.settings }] = await Promise.all([api('/api/meta'), api('/api/settings')]);
  } catch (e) {
    $('#view').innerHTML = `<div class="empty">Không kết nối được máy chủ: ${esc(e.message)}</div>`;
    return;
  }
  window.addEventListener('hashchange', route);
  if (!location.hash) location.hash = '#/create';
  else route();
  pollJobs();
})();
