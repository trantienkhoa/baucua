// Ghép nhiều video (thành phẩm hoặc bản gốc) thành một.
import { api, icon, esc, $, toast, fmtDur, store } from '../ui.js';
import { go } from '../main.js';

export async function mount(el) {
  const projects = (await api('/api/projects')).filter(p => p.duration > 0);
  let order = store.get('merge-ids', []).filter(id => projects.some(p => p.id === id));
  store.set('merge-ids', []);
  el.innerHTML = `
  <div class="page page-narrow">
    <div class="eyebrow">Ghép video</div>
    <h1>Nối nhiều video thành một</h1>
    <p class="lead">Chọn video theo thứ tự muốn ghép. Video đã xuất sẽ dùng bản thành phẩm (có phụ đề và lồng tiếng).</p>
    <div class="grid2">
      <div class="card"><div class="card-head">${icon('grid')}<h2>Thư viện</h2></div><div id="pool" class="merge-list" style="max-height:60vh;overflow:auto"></div></div>
      <div class="card"><div class="card-head">${icon('merge')}<h2>Thứ tự ghép</h2><span class="right small muted" id="total"></span></div>
        <div id="chosen" class="merge-list"></div>
        <label class="field" style="margin-top:14px"><span>Tên video</span><input type="text" id="title" placeholder="Tổng hợp…"></label>
        <label class="field"><span>Khung hình</span><select id="ratio"><option value="9:16">Dọc 9:16</option><option value="16:9">Ngang 16:9</option><option value="1:1">Vuông 1:1</option><option value="source">Theo video đầu tiên</option></select></label>
        <button class="btn primary" id="go">${icon('merge')} Ghép video</button></div>
    </div>
  </div>`;
  const item = (p, chosen, i) => `<div class="mitem" data-id="${p.id}"><img src="/media/${p.id}/thumb.jpg" onerror="this.style.visibility='hidden'" alt="">
    <div class="grow"><b class="small">${chosen ? (i + 1) + '. ' : ''}${esc(p.title)}</b><div class="small dim">${fmtDur(p.duration)} · ${p.outputs?.length ? 'thành phẩm' : 'bản gốc'}</div></div>
    ${chosen ? `<button class="icon-btn" data-up>↑</button><button class="icon-btn" data-down>↓</button><button class="icon-btn" data-rm>${icon('x', 14)}</button>` : `<button class="btn sm" data-add>Thêm</button>`}</div>`;
  const draw = () => {
    $('#pool', el).innerHTML = projects.filter(p => !order.includes(p.id)).map(p => item(p, false)).join('') || '<div class="small dim">Đã chọn hết</div>';
    $('#chosen', el).innerHTML = order.map((id, i) => item(projects.find(p => p.id === id), true, i)).join('') || '<div class="small dim">Bấm "Thêm" để chọn video</div>';
    $('#total', el).textContent = order.length ? `Tổng ${fmtDur(order.reduce((a, id) => a + projects.find(p => p.id === id).duration, 0))}` : '';
  };
  el.onclick = async e => {
    const it = e.target.closest('.mitem'); const id = it?.dataset.id;
    if (e.target.closest('[data-add]')) order.push(id);
    else if (e.target.closest('[data-rm]')) order = order.filter(x => x !== id);
    else if (e.target.closest('[data-up]') || e.target.closest('[data-down]')) {
      const i = order.indexOf(id); const j = i + (e.target.closest('[data-up]') ? -1 : 1);
      if (j >= 0 && j < order.length) [order[i], order[j]] = [order[j], order[i]];
    } else if (e.target.closest('#go')) {
      if (order.length < 2) return toast('Chọn ít nhất 2 video', 'error');
      try {
        const r = await api('/api/merge', { method: 'POST', body: { ids: order, ratio: $('#ratio', el).value, title: $('#title', el).value } });
        toast('Đang ghép video…', 'ok'); go('#/library');
        return r;
      } catch (err) { toast(err.message, 'error'); }
      return;
    } else return;
    draw();
  };
  draw();
}
