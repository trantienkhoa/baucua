// Trang "Thư viện": tất cả video đã làm, lọc theo trạng thái / thư mục, thao tác hàng loạt.
import { api, icon, esc, $, $$, toast, statusPill, fmtAgo, fmtDur, confirmBox, promptBox, store } from '../ui.js';
import { go } from '../main.js';

let root, projects = [];
const st = { status: 'all', folder: '', q: '' };
const sel = new Set();

export async function mount(el) {
  root = el;
  Object.assign(st, store.get('library', {}));
  el.innerHTML = `
  <div class="page">
    <div class="eyebrow">Thư viện</div>
    <div class="row"><h1 class="grow">Video của bạn</h1>
      <button class="btn" id="open-folder">${icon('folder')} Thư mục video đã xuất</button>
      <a class="btn primary" href="#/create">${icon('plus')} Tạo mới</a></div>
    <div class="row" style="margin:14px 0 18px">
      <div class="seg" id="status">${[['all', 'Tất cả'], ['processing', 'Đang làm'], ['ready', 'Chờ xuất'], ['done', 'Hoàn tất'], ['error', 'Lỗi']].map(([k, l]) => `<button data-s="${k}">${l}</button>`).join('')}</div>
      <select id="folder" style="width:auto"></select>
      <input type="search" id="q" placeholder="Tìm theo tên…" style="width:240px">
      <div class="row right" id="bulk" hidden>
        <span class="small muted"><b id="n">0</b> đã chọn</span>
        <button class="btn sm" data-bulk="render">${icon('refresh', 14)} Xuất lại</button>
        <button class="btn sm" data-bulk="folder">${icon('folder', 14)} Chuyển thư mục</button>
        <button class="btn sm" data-bulk="merge">${icon('merge', 14)} Ghép</button>
        <button class="btn sm danger" data-bulk="delete">${icon('trash', 14)} Xoá</button>
      </div>
    </div>
    <div id="grid" class="vgrid"></div>
  </div>`;
  $$('#status button', el).forEach(b => b.onclick = () => { st.status = b.dataset.s; persist(); draw(); });
  $('#folder', el).onchange = e => { st.folder = e.target.value; persist(); draw(); };
  $('#q', el).oninput = e => { st.q = e.target.value.toLowerCase(); draw(); };
  $('#open-folder', el).onclick = async () => { const r = await api('/api/open-folder', { method: 'POST', body: {} }); if (!r.ok) toast('Video đã xuất nằm ở: ' + r.path); };
  $('#bulk', el).onclick = e => { const b = e.target.closest('[data-bulk]'); if (b) bulk(b.dataset.bulk); };
  await reload();
}

function persist() { store.set('library', { status: st.status, folder: st.folder }); }

async function reload() {
  projects = await api('/api/projects');
  if (root.isConnected) draw();
}

function draw() {
  $$('#status button', root).forEach(b => b.classList.toggle('active', b.dataset.s === st.status));
  const folders = [...new Set(projects.map(p => p.folder).filter(Boolean))].sort();
  $('#folder', root).innerHTML = `<option value="">Mọi thư mục</option>${folders.map(f => `<option ${f === st.folder ? 'selected' : ''}>${esc(f)}</option>`).join('')}`;
  const list = projects.filter(p => {
    if (st.status === 'processing' && !['processing', 'queued'].includes(p.status)) return false;
    if (!['all', 'processing'].includes(st.status) && p.status !== st.status) return false;
    if (st.folder && p.folder !== st.folder) return false;
    if (st.q && !(p.title + ' ' + p.title_src).toLowerCase().includes(st.q)) return false;
    return true;
  });
  $('#bulk', root).hidden = !sel.size; $('#n', root).textContent = sel.size;
  const grid = $('#grid', root);
  if (!list.length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('grid')}<p>Chưa có video nào ở đây.</p></div>`; return; }
  grid.innerHTML = list.map(p => `
    <div class="vcard" data-id="${p.id}">
      <div class="vthumb" data-open><img src="/media/${p.id}/thumb.jpg?v=${Math.floor(p.updated || 0)}" onerror="this.style.display='none'" alt="">
        <input type="checkbox" class="check" ${sel.has(p.id) ? 'checked' : ''}>
        ${p.qa ? `<span class="score">${p.qa.score}</span>` : ''}<span class="dur">${fmtDur(p.duration)}</span><span class="status">${statusPill(p)}</span></div>
      ${['processing', 'queued'].includes(p.status) ? `<div class="progress" style="border-radius:0"><i style="width:${p.progress || 0}%"></i></div>` : ''}
      <div class="vbody">
        <div class="vtitle">${esc(p.title)}</div>
        ${p.title_src && p.title_src !== p.title ? `<div class="vsrc">${esc(p.title_src)}</div>` : ''}
        <div class="vmeta">${esc(p.platform || '')}${p.folder ? ' · ' + icon('folder', 12) + ' ' + esc(p.folder) : ''} · ${p.lines || 0} câu · ${fmtAgo(p.created)}</div>
        ${p.status === 'error' ? `<div class="small" style="color:var(--red)">${esc((p.message || '').slice(0, 140))}</div>` : `<div class="small muted">${esc(p.message || '')}</div>`}
        <div class="vactions">
          <a class="btn sm primary" href="#/studio/${p.id}">${icon('studio', 14)} Mở Studio</a>
          ${p.outputs?.length ? `<a class="icon-btn" href="/media/${p.id}/${p.outputs[0].file}?download=1" title="Tải video">${icon('download')}</a>` : ''}
          ${['error', 'cancelled'].includes(p.status) ? `<button class="icon-btn" data-retry title="Chạy lại">${icon('refresh')}</button>` : ''}
          <button class="icon-btn" data-dup title="Nhân bản">${icon('copy')}</button>
          <button class="icon-btn right" data-del title="Xoá">${icon('trash')}</button>
        </div>
      </div>
    </div>`).join('');
  grid.onclick = async e => {
    const card = e.target.closest('.vcard'); if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest('.check')) { e.target.checked ? sel.add(id) : sel.delete(id); $('#bulk', root).hidden = !sel.size; $('#n', root).textContent = sel.size; return; }
    if (e.target.closest('[data-open]')) return go('#/studio/' + id);
    if (e.target.closest('[data-retry]')) { await api(`/api/projects/${id}/retry`, { method: 'POST', body: {} }); toast('Đã đưa vào hàng đợi'); return reload(); }
    if (e.target.closest('[data-dup]')) { await api(`/api/projects/${id}/duplicate`, { method: 'POST' }); toast('Đã nhân bản', 'ok'); return reload(); }
    if (e.target.closest('[data-del]')) {
      if (await confirmBox('Xoá video?', 'Xoá vĩnh viễn dự án và các file đã tải. Bản đã xuất trong thư mục exports vẫn giữ.', 'Xoá', true)) {
        await api('/api/projects/' + id, { method: 'DELETE' }); sel.delete(id); reload();
      }
    }
  };
}

async function bulk(action) {
  const ids = [...sel];
  if (action === 'delete') {
    if (!await confirmBox(`Xoá ${ids.length} video?`, 'Không thể hoàn tác.', 'Xoá', true)) return;
    for (const id of ids) await api('/api/projects/' + id, { method: 'DELETE' });
  } else if (action === 'render') {
    for (const id of ids) { try { await api(`/api/projects/${id}/run`, { method: 'POST', body: { kind: 'render' } }); } catch (e) { toast(e.message, 'error'); } }
    toast('Đã đưa vào hàng đợi xuất', 'ok');
  } else if (action === 'folder') {
    const f = await promptBox('Chuyển vào thư mục', st.folder, 'Ví dụ: Kênh ẩm thực');
    if (f === null) return;
    for (const id of ids) await api('/api/projects/' + id, { method: 'PUT', body: { folder: f } });
  } else if (action === 'merge') {
    store.set('merge-ids', ids); go('#/merge'); return;
  }
  sel.clear();
  reload();
}

let lastSig = '';
export function onJobs(active) {
  const sig = active.map(p => p.id + p.status + Math.floor(p.progress || 0)).join('|');
  if (sig !== lastSig && root?.isConnected) { lastSig = sig; reload(); }
}
