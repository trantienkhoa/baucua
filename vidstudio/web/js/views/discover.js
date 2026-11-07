// Trang "Khám phá": video thịnh hành bên Trung Quốc, lọc, lưu, làm video một chạm.
import { api, icon, esc, $, $$, toast, fmtNum, fmtAgo, fmtDur, store, debounce } from '../ui.js';
import { state, go } from '../main.js';

let root, items = [], savedIds = new Set(), selected = new Set();
const st = { tab: 'trend', cat: 'Gợi ý cho bạn', len: 'all', frame: 'all', sort: 'score', q: '' };

export async function mount(el) {
  root = el;
  Object.assign(st, store.get('discover', {}), { q: '' });
  const recipes = Object.keys(state.settings.recipes || {});
  el.innerHTML = `
  <div class="page">
    <div class="row" style="align-items:flex-start">
      <div class="grow"><div class="eyebrow">Khám phá</div><h1>Bên Trung Quốc đang xem gì?</h1>
        <p class="lead">Chọn video đang lên hoặc đề tài hot, bấm một nút là app tải về, dịch, lồng tiếng và xoá sub.</p></div>
      <div class="row" style="width:min(560px,100%)">
        <input type="search" id="q" class="grow" placeholder="Tìm đề tài, gõ tiếng Việt hoặc tiếng Trung" style="width:auto">
        <button class="btn" id="refresh">${icon('refresh')} Làm mới</button>
      </div>
    </div>
    <div class="row" style="margin-bottom:14px">
      <div class="seg" id="tabs"><button data-t="trend">Video thịnh hành</button><button data-t="hot">Đang lên nhanh</button><button data-t="saved">Đã lưu</button></div>
      <span class="right muted small">Làm theo công thức</span>
      <select id="recipe" style="width:220px"><option value="">Cài đặt mặc định</option>${recipes.map(r => `<option>${esc(r)}</option>`).join('')}</select>
    </div>
    <div class="chips" id="cats" style="margin-bottom:14px"></div>
    <div class="row" style="margin-bottom:18px">
      <select id="len" style="width:auto"><option value="all">Mọi độ dài</option><option value="short">Dưới 3 phút</option><option value="mid">3–10 phút</option><option value="long">Trên 10 phút</option></select>
      <select id="frame" style="width:auto"><option value="all">Mọi khung</option><option value="v">Video dọc</option><option value="h">Video ngang</option></select>
      <select id="sort" style="width:auto"><option value="score">Đáng làm nhất</option><option value="speed">Lên nhanh nhất</option><option value="views">Nhiều lượt xem</option><option value="new">Mới nhất</option><option value="engage">Tương tác cao</option></select>
      <button class="btn sm primary" id="batch" hidden>${icon('sparkle')} Làm <b id="nsel">0</b> video đã chọn</button>
      <span class="right small dim" id="info"></span>
    </div>
    <div id="grid" class="vgrid"></div>
  </div>`;
  $('#len', el).value = st.len; $('#frame', el).value = st.frame; $('#sort', el).value = st.sort;
  $$('#tabs button', el).forEach(b => b.onclick = () => { st.tab = b.dataset.t; save(); load(); });
  ['len', 'frame', 'sort'].forEach(k => $('#' + k, el).onchange = e => { st[k] = e.target.value; save(); draw(); });
  $('#refresh', el).onclick = () => load(true);
  $('#q', el).oninput = debounce(e => { st.q = e.target.value.trim(); load(); }, 700);
  $('#batch', el).onclick = () => make([...selected].map(id => items.find(v => v.id === id)).filter(Boolean));
  try { savedIds = new Set((await api('/api/discover/saved')).items.map(v => v.id)); } catch { /* bỏ qua */ }
  load();
}

function save() { store.set('discover', { tab: st.tab, cat: st.cat, len: st.len, frame: st.frame, sort: st.sort }); }

function drawCats() {
  const cats = state.meta.categories;
  $('#cats', root).innerHTML = cats.map(c => `<button class="chip ${c === st.cat ? 'active' : ''}" data-c="${esc(c)}">${c === 'Gợi ý cho bạn' ? icon('sparkle', 14) + ' ' : c === 'Đang hot' ? icon('fire', 14) + ' ' : c === 'Kinh điển' ? icon('star', 14) + ' ' : ''}${esc(c)}</button>`).join('');
  $$('#cats .chip', root).forEach(b => b.onclick = () => { st.cat = b.dataset.c; save(); load(); });
  $('#cats', root).hidden = st.tab === 'saved' || !!st.q;
  $$('#tabs button', root).forEach(b => b.classList.toggle('active', b.dataset.t === st.tab));
}

async function load(refresh = false) {
  drawCats();
  const grid = $('#grid', root);
  grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="spinner"></span><p>Đang lấy danh sách video…</p></div>';
  let data;
  try {
    if (st.q) data = await api('/api/discover/search?q=' + encodeURIComponent(st.q));
    else if (st.tab === 'saved') data = await api('/api/discover/saved');
    else data = await api(`/api/discover?category=${encodeURIComponent(st.tab === 'hot' ? 'Đang hot' : st.cat)}&refresh=${refresh ? 1 : 0}`);
  } catch (e) { data = { items: [], error: e.message }; }
  if (!root.isConnected) return;
  items = data.items || [];
  if (data.error) toast(data.error, 'error');
  $('#info', root).textContent = `${items.length} video · cập nhật ${fmtAgo(data.updated || Date.now() / 1000)}`;
  draw(data.error);
}

function filtered() {
  let list = items.filter(v => {
    if (st.len === 'short' && v.duration > 180) return false;
    if (st.len === 'mid' && (v.duration <= 180 || v.duration > 600)) return false;
    if (st.len === 'long' && v.duration <= 600) return false;
    if (st.frame === 'v' && !v.vertical) return false;
    if (st.frame === 'h' && v.vertical) return false;
    return true;
  });
  const key = { score: v => v.score, speed: v => v.per_hour, views: v => v.views, new: v => v.pubdate, engage: v => v.like_rate }[st.sort];
  return list.sort((a, b) => key(b) - key(a));
}

function draw(err) {
  const list = filtered();
  const grid = $('#grid', root);
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('compass')}<p>${err ? esc(err) + '<br><span class="small">Kiểm tra mạng, hoặc dán link trực tiếp ở trang Tạo mới.</span>' : st.tab === 'saved' ? 'Chưa lưu video nào — bấm ☆ trên video để lưu.' : 'Không có video phù hợp bộ lọc.'}</p></div>`;
    return;
  }
  grid.innerHTML = list.map(v => `
    <div class="vcard" data-id="${esc(v.id)}">
      <div class="vthumb" data-open><img loading="lazy" referrerpolicy="no-referrer" src="${esc(v.cover)}@480w_300h_1c.webp" onerror="this.onerror=null;this.src='${esc(v.cover)}'" alt="">
        <input type="checkbox" class="check" ${selected.has(v.id) ? 'checked' : ''} title="Chọn để làm hàng loạt">
        <span class="score" title="Điểm đáng làm">${v.score ?? ''}</span><span class="dur">${fmtDur(v.duration)}</span></div>
      <div class="vbody">
        <div class="vtitle">${esc(v.title || v.title_src)}</div>
        <div class="vsrc" title="${esc(v.title_src)}">${esc(v.title_src)}</div>
        <div class="vstats"><span>${icon('eye', 13)} ${fmtNum(v.views)}</span><span>♡ ${fmtNum(v.likes)}</span><span title="lượt xem mỗi giờ">${icon('fire', 13)} ${fmtNum(v.per_hour)}/giờ</span></div>
        <div class="vtags">${(v.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        <div class="vmeta">${esc(v.category)} · ${esc(v.author)} · ${fmtAgo(v.pubdate)}</div>
        <div class="vactions">
          <button class="btn sm primary" data-make>${icon('play', 14)} Làm video</button>
          <button class="icon-btn right ${savedIds.has(v.id) ? 'on' : ''}" data-save title="Lưu">${icon('star')}</button>
          <a class="icon-btn" href="${esc(v.url)}" target="_blank" rel="noopener" title="Xem bản gốc">${icon('external')}</a>
        </div>
      </div>
    </div>`).join('');
  grid.onclick = async e => {
    const card = e.target.closest('.vcard');
    if (!card) return;
    const v = items.find(x => x.id === card.dataset.id);
    if (e.target.closest('.check')) {
      e.target.checked ? selected.add(v.id) : selected.delete(v.id);
      $('#batch', root).hidden = !selected.size; $('#nsel', root).textContent = selected.size;
      return;
    }
    if (e.target.closest('[data-make]')) return make([v]);
    if (e.target.closest('[data-open]')) return window.open(v.url, '_blank');
    if (e.target.closest('[data-save]')) {
      const r = await api('/api/discover/saved', { method: 'POST', body: v });
      r.saved ? savedIds.add(v.id) : savedIds.delete(v.id);
      e.target.closest('[data-save]').classList.toggle('on', r.saved);
      toast(r.saved ? 'Đã lưu video' : 'Đã bỏ lưu');
      if (st.tab === 'saved' && !r.saved) load();
    }
  };
}

async function make(list) {
  if (!list.length) return;
  const recipe = $('#recipe', root).value;
  try {
    const ids = [];
    for (const v of list) {
      const r = await api('/api/projects', { method: 'POST', body: { urls: v.url, recipe, title_vi: v.title, title_src: v.title_src } });
      ids.push(...r.ids);
    }
    selected.clear();
    toast(`Đã thêm ${ids.length} video vào hàng đợi`, 'ok');
    go(ids.length === 1 ? '#/studio/' + ids[0] : '#/library');
  } catch (e) { toast(e.message, 'error'); }
}
