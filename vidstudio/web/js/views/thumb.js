// Tạo ảnh bìa: chọn khung hình từ video, thêm chữ tiêu đề, tải PNG.
import { api, icon, esc, $, toast, fmtTime, store } from '../ui.js';

export async function mount(el, [pidArg]) {
  const projects = (await api('/api/projects')).filter(p => p.duration > 0 && p.kind !== 'merge');
  if (!projects.length) { el.innerHTML = `<div class="empty">${icon('image')}<p>Chưa có video nào. <a href="#/create">Tạo video</a> trước nhé.</p></div>`; return; }
  const st = Object.assign({ pid: pidArg || projects[0].id, t: 1, title: '', sub: '', size: 9, color: '#FFFFFF', hl: '#FFD400', pos: 0.18, ratio: '9:16', stroke: 8, dark: 0.25 }, store.get('thumb', {}));
  if (!projects.some(p => p.id === st.pid)) st.pid = projects[0].id;
  el.innerHTML = `
  <div class="page">
    <div class="eyebrow">Ảnh bìa</div><h1>Tạo ảnh bìa thu hút</h1>
    <p class="lead">Chọn khung hình đẹp nhất, gõ tiêu đề — bọc <b>*từ khoá*</b> để tô màu nổi bật.</p>
    <div class="thumb-editor">
      <div class="card"><canvas id="cv"></canvas></div>
      <div class="card">
        <label class="field"><span>Video</span><select id="pid">${projects.map(p => `<option value="${p.id}" ${p.id === st.pid ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>
        <div class="kv"><span>Khung hình tại</span><b class="mono" id="t-v"></b></div><input type="range" id="t" min="0" step="0.1" value="${st.t}">
        <label class="field" style="margin-top:12px"><span>Tiêu đề lớn</span><textarea id="title" rows="3" placeholder="Ví dụ: Mua *200 nghìn* rupee đồ ăn">${esc(st.title)}</textarea></label>
        <label class="field"><span>Dòng phụ</span><input type="text" id="sub" value="${esc(st.sub)}" placeholder="Tập 1 · phần cuối bất ngờ"></label>
        <div class="kv"><span>Cỡ chữ</span></div><input type="range" id="size" min="4" max="16" step="0.5" value="${st.size}">
        <div class="kv" style="margin-top:8px"><span>Vị trí dọc</span></div><input type="range" id="pos" min="0.05" max="0.9" step="0.01" value="${st.pos}">
        <div class="kv" style="margin-top:8px"><span>Làm tối nền</span></div><input type="range" id="dark" min="0" max="0.7" step="0.05" value="${st.dark}">
        <div class="row" style="margin:12px 0"><label class="row small">Chữ <input type="color" id="color" value="${st.color}"></label>
          <label class="row small">Tô màu <input type="color" id="hl" value="${st.hl}"></label>
          <select id="ratio" style="width:auto"><option value="9:16">9:16</option><option value="16:9">16:9</option><option value="1:1">1:1</option><option value="3:4">3:4</option></select></div>
        <button class="btn primary" id="dl">${icon('download')} Tải ảnh PNG</button>
      </div>
    </div>
  </div>`;
  $('#ratio', el).value = st.ratio;
  const cv = $('#cv', el); const g = cv.getContext('2d');
  const img = new Image();
  let proj = projects.find(p => p.id === st.pid);
  const loadFrame = () => {
    proj = projects.find(p => p.id === st.pid);
    $('#t', el).max = Math.max(0.1, proj.duration - 0.1);
    st.t = Math.min(st.t, proj.duration - 0.1);
    $('#t-v', el).textContent = fmtTime(st.t);
    img.src = `/api/projects/${st.pid}/frame?t=${st.t.toFixed(1)}&w=1080`;
  };
  const draw = () => {
    const [rw, rh] = st.ratio.split(':').map(Number);
    const W = 1080; const H = Math.round(W * rh / rw);
    cv.width = W; cv.height = H;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (img.complete && img.naturalWidth) {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s; const h = img.naturalHeight * s;
      g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    }
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgba(0,0,0,${st.dark})`); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, `rgba(0,0,0,${st.dark})`);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const size = W * st.size / 100;
    g.font = `900 ${size}px "Be Vietnam Pro", Montserrat, Arial, sans-serif`;
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const lines = wrapMarked(g, st.title.toUpperCase(), W * 0.88);
    let y = H * st.pos;
    for (const parts of lines) {
      const total = parts.reduce((a, p) => a + g.measureText(p.t).width, 0);
      let x = (W - total) / 2;
      for (const p of parts) {
        g.lineWidth = st.stroke * W / 1080 * 1.6; g.strokeStyle = '#000'; g.strokeText(p.t, x, y);
        g.fillStyle = p.hl ? st.hl : st.color; g.fillText(p.t, x, y);
        x += g.measureText(p.t).width;
      }
      y += size * 1.12;
    }
    if (st.sub) {
      const s2 = size * 0.42; g.font = `700 ${s2}px Arial, sans-serif`; g.textAlign = 'center';
      const tw = g.measureText(st.sub).width + s2;
      g.fillStyle = st.hl; roundRect(g, (W - tw) / 2, y + s2 * 0.1, tw, s2 * 1.5, s2 * 0.3); g.fill();
      g.fillStyle = '#111'; g.fillText(st.sub, W / 2, y + s2 * 0.85);
    }
    store.set('thumb', { ...st, pid: st.pid });
  };
  img.onload = draw;
  el.oninput = e => {
    const id = e.target.id;
    if (['size', 'pos', 'dark'].includes(id)) st[id] = +e.target.value;
    else if (['title', 'sub', 'color', 'hl'].includes(id)) st[id] = e.target.value;
    else if (id === 't') { st.t = +e.target.value; $('#t-v', el).textContent = fmtTime(st.t); clearTimeout(el._tt); el._tt = setTimeout(loadFrame, 200); return; }
    draw();
  };
  el.onchange = e => {
    if (e.target.id === 'pid') { st.pid = e.target.value; st.t = 1; if (!st.title) st.title = projects.find(p => p.id === st.pid).title; $('#title', el).value = st.title; loadFrame(); }
    if (e.target.id === 'ratio') { st.ratio = e.target.value; draw(); }
  };
  $('#dl', el).onclick = () => {
    cv.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (proj.title || 'anh-bia').slice(0, 50) + '.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Đã tải ảnh bìa', 'ok');
    }, 'image/png');
  };
  if (!st.title) { st.title = proj.title; $('#title', el).value = st.title; }
  loadFrame();
}

function wrapMarked(g, text, maxW) {
  // tách thành các dòng, mỗi dòng gồm các đoạn {t, hl}
  const tokens = [];
  text.split(/(\*[^*]+\*)/).forEach(chunk => {
    if (!chunk) return;
    const hl = chunk.startsWith('*') && chunk.endsWith('*');
    (hl ? chunk.slice(1, -1) : chunk).split(/(\s+)/).forEach(w => w && tokens.push({ t: w, hl }));
  });
  const lines = []; let cur = []; let w = 0;
  for (const tk of tokens) {
    if (tk.t === '\n') { lines.push(cur); cur = []; w = 0; continue; }
    const tw = g.measureText(tk.t).width;
    if (w + tw > maxW && cur.length && tk.t.trim()) { lines.push(cur); cur = []; w = 0; }
    if (!cur.length && !tk.t.trim()) continue;
    cur.push(tk); w += tw;
  }
  if (cur.length) lines.push(cur);
  return lines.slice(0, 5);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
