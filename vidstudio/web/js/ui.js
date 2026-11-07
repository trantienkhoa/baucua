// Tiện ích giao diện dùng chung: API, icon, thông báo, hộp thoại, định dạng.

export async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {} };
  if (opts.body instanceof FormData) init.body = opts.body;
  else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
  const res = await fetch(path, init);
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && data.detail) || (typeof data === 'string' ? data : 'Lỗi máy chủ');
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

const P = {
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  studio: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9h17M10 12.5l4 2-4 2z"/>',
  merge: '<rect x="3.5" y="5" width="7" height="14" rx="1.5"/><rect x="13.5" y="5" width="7" height="14" rx="1.5"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-9 8.5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  queue: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>',
  play: '<path d="M7 5v14l11-7z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/>',
  sub: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7 11h4M13 11h4M7 15h7M16 15h1"/>',
  cut: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5 20 17M8 15.5 20 7"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  wave: '<path d="M4 12h1M7 8v8M10 5v14M13 9v6M16 7v10M19 11v2"/>',
  send: '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>',
  check: '<path d="M12 3.5 5 6v6c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5V6z"/><path d="m9 12 2 2 4-4"/>',
  volume: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
  split: '<path d="M12 3v18M5 8l-3 4 3 4M19 8l3 4-3 4"/>',
  join: '<path d="M7 7v6a4 4 0 0 0 4 4h8M15 13l4 4-4 4"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14.5 8.5l2 2"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3"/>',
  folder: '<path d="M3.5 7a2 2 0 0 1 2-2H10l2 2h6.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  fire: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4-3.5-6-4-10-2 1.5-3.5 4-3.5 6-1-.5-2-2-2-3.5C7.5 9 5.5 11.5 5.5 14.5A6.5 6.5 0 0 0 12 21z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  text: '<path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6"/>',
};

export function icon(name, size) {
  const s = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<span class="ico"><svg viewBox="0 0 24 24"${s}>${P[name] || ''}</svg></span>`;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-i]').forEach(el => { if (!el.firstChild) el.outerHTML = icon(el.dataset.i); });
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function toast(msg, kind = '') {
  const el = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 7000 : 3500);
}

export function modal(html, { onMount, wide } = {}) {
  const ov = $('#modal');
  const box = $('#modal-box');
  box.style.width = wide ? 'min(900px, 94vw)' : '';
  box.innerHTML = html;
  ov.hidden = false;
  const close = () => { ov.hidden = true; box.innerHTML = ''; };
  ov.onclick = e => { if (e.target === ov) close(); };
  box.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
  onMount && onMount(box, close);
  return close;
}

export function confirmBox(title, text, okLabel = 'Đồng ý', danger = false) {
  return new Promise(resolve => {
    modal(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="modal-actions"><button class="btn" data-close>Huỷ</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" id="ok">${esc(okLabel)}</button></div>`, {
      onMount(box, close) {
        box.querySelector('[data-close]').onclick = () => { close(); resolve(false); };
        box.querySelector('#ok').onclick = () => { close(); resolve(true); };
      },
    });
  });
}

export function promptBox(title, value = '', placeholder = '') {
  return new Promise(resolve => {
    modal(`<h2>${esc(title)}</h2><input type="text" id="pv" value="${esc(value)}" placeholder="${esc(placeholder)}">
      <div class="modal-actions"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="ok">Lưu</button></div>`, {
      onMount(box, close) {
        const inp = box.querySelector('#pv');
        inp.focus(); inp.select();
        const ok = () => { const v = inp.value.trim(); close(); resolve(v || null); };
        box.querySelector('#ok').onclick = ok;
        inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
        box.querySelector('[data-close]').onclick = () => { close(); resolve(null); };
      },
    });
  });
}

export function fmtTime(t, ms = true) {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${ms ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0')}`;
}

export function parseTime(str) {
  const parts = String(str).trim().replace(',', '.').split(':').map(Number);
  if (parts.some(isNaN)) return null;
  return parts.reduce((a, p) => a * 60 + p, 0);
}

export function fmtNum(n) {
  n = Number(n || 0);
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace('.', ',') + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' Tr';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',') + ' N';
  return String(n);
}

export function fmtAgo(ts) {
  if (!ts) return '';
  const d = Date.now() / 1000 - ts;
  if (d < 60) return 'vừa xong';
  if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
  if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
  if (d < 172800) return 'hôm qua';
  if (d < 86400 * 30) return `${Math.floor(d / 86400)} ngày trước`;
  return new Date(ts * 1000).toLocaleDateString('vi-VN');
}

export function fmtDur(sec) {
  sec = Math.round(sec || 0);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const STATUS = {
  queued: ['Đang chờ', 'gray'], processing: ['Đang xử lý', ''], ready: ['Chờ xuất', 'blue'],
  done: ['Hoàn tất', 'green'], error: ['Lỗi', 'red'], cancelled: ['Đã huỷ', 'gray'],
};

export function statusPill(p) {
  const [label, cls] = STATUS[p.status] || [p.status, 'gray'];
  const pct = p.status === 'processing' ? ` ${Math.round(p.progress || 0)}%` : '';
  return `<span class="pill ${cls}">${label}${pct}</span>`;
}

export function copyText(text) {
  navigator.clipboard?.writeText(text).then(() => toast('Đã chép', 'ok'), () => toast('Không chép được', 'error'));
}

export function notify(title, body) {
  try {
    if (window.Notification && Notification.permission === 'granted') new Notification(title, { body });
  } catch { /* bỏ qua */ }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.06;
    o.start(); o.frequency.setValueAtTime(1320, ctx.currentTime + 0.12); o.stop(ctx.currentTime + 0.25);
  } catch { /* bỏ qua */ }
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem('vds:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('vds:' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
};
