// Trang "Tạo mới": dán link hoặc tải file lên, chọn công thức.
import { api, icon, esc, $, $$, toast, statusPill, fmtAgo, fmtDur, store } from '../ui.js';
import { state, go } from '../main.js';

let root;

export async function mount(el) {
  root = el;
  const s = state.settings;
  const recipes = Object.keys(s.recipes || {});
  const opts = store.get('create-opts', { dub: s.dub, hardsub: s.hardsub, output_ratio: s.output_ratio, source_mode: 'asr', auto_render: true, recipe: '' });
  el.innerHTML = `
  <div class="page page-narrow">
    <div class="eyebrow">Tạo mới</div>
    <h1>Biến video nước ngoài thành video tiếng Việt</h1>
    <p class="lead">Dán link Bilibili, Douyin, YouTube, TikTok… (mỗi dòng một link để làm hàng loạt) hoặc kéo file video vào. App sẽ tải về, chép lời, dịch, lồng tiếng và xoá sub gốc.</p>
    <div class="card">
      <textarea id="urls" class="big-input" placeholder="https://www.bilibili.com/video/BV…&#10;https://v.douyin.com/…"></textarea>
      <div class="row" style="margin-top:12px">
        <div class="dropzone grow" id="drop">${icon('upload')} Kéo thả video vào đây hoặc <u>chọn file</u> <span class="dim small">(có thể kèm 1 file .srt)</span>
          <input type="file" id="file" accept="video/*,.srt,.mkv,.mov,.webm" multiple hidden></div>
      </div>
      <div id="picked" class="small muted" style="margin-top:8px"></div>
      <div class="sep"></div>
      <div class="grid2">
        <div>
          <label class="field"><span>Làm theo công thức</span>
            <select id="recipe"><option value="">Cài đặt mặc định</option>${recipes.map(r => `<option ${opts.recipe === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
          <label class="field"><span>Lấy lời gốc từ</span>
            <select id="source_mode">
              <option value="asr" ${opts.source_mode === 'asr' ? 'selected' : ''}>Nghe giọng nói (Whisper)</option>
              <option value="ocr" ${opts.source_mode === 'ocr' ? 'selected' : ''}>Đọc phụ đề cứng trên hình (OCR)</option>
            </select></label>
          <label class="field"><span>Khung hình thành phẩm</span>
            <select id="output_ratio">${[['source', 'Giữ như gốc'], ['9:16', 'Dọc 9:16 (TikTok, Reels)'], ['1:1', 'Vuông 1:1'], ['16:9', 'Ngang 16:9 (YouTube)'], ['4:5', '4:5 (Facebook)']].map(([v, l]) => `<option value="${v}" ${opts.output_ratio === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div>
          <div class="toggle-row"><div class="grow"><b>Lồng tiếng Việt</b><span>Tắt: chỉ làm phụ đề, giữ tiếng gốc</span></div>
            <label class="switch"><input type="checkbox" id="dub" ${opts.dub ? 'checked' : ''}><i></i></label></div>
          <div class="toggle-row"><div class="grow"><b>Xoá sub gốc</b><span>Làm mờ vùng phụ đề tiếng Trung</span></div>
            <label class="switch"><input type="checkbox" id="hardsub" ${opts.hardsub !== 'none' ? 'checked' : ''}><i></i></label></div>
          <div class="toggle-row"><div class="grow"><b>Tự xuất video khi xong</b><span>Tắt nếu muốn sửa phụ đề trước khi dựng</span></div>
            <label class="switch"><input type="checkbox" id="auto_render" ${opts.auto_render ? 'checked' : ''}><i></i></label></div>
        </div>
      </div>
      <div class="row" style="margin-top:8px">
        <span class="small dim">Dịch bằng: <b>${esc(state.meta.providers[s.translator]?.label || s.translator)}</b> · <a href="#/settings">đổi</a></span>
        <button class="btn primary lg right" id="go">${icon('sparkle')} Bắt đầu làm video</button>
      </div>
    </div>
    <div class="card">
      <div class="card-head">${icon('clock')}<h2>Gần đây</h2><a class="btn sm ghost right" href="#/library">Xem tất cả</a></div>
      <div id="recent" class="recent-grid"></div>
    </div>
  </div>`;

  const fileInput = $('#file', el);
  const drop = $('#drop', el);
  let files = [];
  const showPicked = () => {
    $('#picked', el).innerHTML = files.length ? files.map(f => `${icon(f.name.endsWith('.srt') ? 'sub' : 'studio', 14)} ${esc(f.name)} <span class="dim">(${(f.size / 1048576).toFixed(1)} MB)</span>`).join(' &nbsp; ') + ' <button class="btn sm ghost" id="clear">Bỏ chọn</button>' : '';
    const c = $('#clear', el); if (c) c.onclick = () => { files = []; showPicked(); };
  };
  drop.onclick = () => fileInput.click();
  fileInput.onchange = () => { files = [...files, ...fileInput.files]; showPicked(); };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag'); };
  drop.ondragleave = () => drop.classList.remove('drag');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('drag'); files = [...files, ...e.dataTransfer.files]; showPicked(); };

  $('#go', el).onclick = async () => {
    const o = {
      recipe: $('#recipe', el).value, source_mode: $('#source_mode', el).value,
      auto_render: $('#auto_render', el).checked,
      overrides: { dub: $('#dub', el).checked, hardsub: $('#hardsub', el).checked ? (s.hardsub !== 'none' ? s.hardsub : 'blur') : 'none', output_ratio: $('#output_ratio', el).value },
    };
    store.set('create-opts', { ...o.overrides, source_mode: o.source_mode, auto_render: o.auto_render, recipe: o.recipe });
    const btn = $('#go', el);
    btn.disabled = true;
    try {
      let ids = [];
      const vids = files.filter(f => !f.name.toLowerCase().endsWith('.srt'));
      const srt = files.find(f => f.name.toLowerCase().endsWith('.srt'));
      if (vids.length) {
        const fd = new FormData();
        vids.forEach(f => fd.append('files', f));
        if (srt) fd.append('srt', srt);
        fd.append('options', JSON.stringify(o));
        toast('Đang tải file lên…');
        ids = ids.concat((await api('/api/projects/upload', { method: 'POST', body: fd })).ids);
      }
      const urls = $('#urls', el).value.trim();
      if (urls) ids = ids.concat((await api('/api/projects', { method: 'POST', body: { urls, ...o } })).ids);
      if (!ids.length) { toast('Hãy dán link hoặc chọn file video', 'error'); return; }
      toast(`Đã thêm ${ids.length} video vào hàng đợi`, 'ok');
      if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
      go(ids.length === 1 ? '#/studio/' + ids[0] : '#/library');
    } catch (e) { toast(e.message, 'error'); } finally { btn.disabled = false; }
  };
  $('#urls', el).focus();
  loadRecent();
}

async function loadRecent() {
  const list = (await api('/api/projects')).slice(0, 8);
  const box = $('#recent', root);
  if (!box) return;
  box.innerHTML = list.length ? list.map(p => `
    <a class="vcard" href="#/studio/${p.id}" style="text-decoration:none;color:inherit">
      <div class="vthumb" style="aspect-ratio:16/9"><img src="/media/${p.id}/thumb.jpg" onerror="this.style.display='none'" alt="">
        <span class="dur">${fmtDur(p.duration)}</span><span class="status">${statusPill(p)}</span></div>
      <div class="vbody"><div class="vtitle" style="font-size:14px">${esc(p.title)}</div><div class="vmeta">${esc(p.platform)} · ${fmtAgo(p.created)}</div></div>
    </a>`).join('') : '<div class="muted small">Chưa có video nào. Dán link ở trên để bắt đầu, hoặc vào <a href="#/discover">Khám phá</a> tìm video đang hot.</div>';
}

let lastSig = '';
export function onJobs(active) {
  const sig = active.map(p => p.id + p.status + Math.floor((p.progress || 0) / 10)).join('|');
  if (sig !== lastSig && root?.isConnected) { lastSig = sig; loadRecent(); }
}
