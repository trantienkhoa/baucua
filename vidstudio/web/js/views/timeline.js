// Timeline: thước thời gian, sóng âm gốc & giọng lồng, khối phụ đề kéo thả được.
import { icon, fmtTime } from '../ui.js';

const ROW = { ruler: 22, orig: 46, dub: 46, sub: 46 };
const GAP = 4;

export class Timeline {
  constructor(el, ctx) {
    this.el = el; this.ctx = ctx; this.t = 0; this.sel = null; this.pps = null; this.drag = null;
    el.innerHTML = `
      <div class="tl-bar">
        <b class="row" style="gap:6px">${icon('wave', 16)} Timeline</b>
        <button class="btn sm" data-k="in" title="Đặt điểm bắt đầu tại vị trí phát (phím I)">Điểm đầu</button>
        <button class="btn sm" data-k="out" title="Đặt điểm kết thúc tại vị trí phát (phím O)">Điểm cuối</button>
        <button class="btn sm" data-k="cut" title="Bỏ đoạn đang chọn">${icon('cut', 14)} Cắt đoạn</button>
        <button class="btn sm" data-k="keep">Chỉ giữ đoạn này</button>
        <button class="btn sm" data-k="clip">${icon('upload', 14)} Xuất clip</button>
        <span class="hint">Kéo trên sóng âm để chọn đoạn · kéo khối phụ đề để dời, kéo mép để đổi độ dài · Ctrl + lăn chuột để phóng to</span>
        <button class="icon-btn" data-z="-" title="Thu nhỏ">−</button>
        <button class="btn sm ghost" data-z="fit">Vừa khung</button>
        <button class="icon-btn" data-z="+" title="Phóng to">+</button>
      </div>
      <div class="tl"><div class="tl-labels"><div></div><div>Tiếng gốc</div><div>Giọng lồng</div><div>Phụ đề</div></div>
        <div class="tl-scroll"><canvas id="tl-canvas"></canvas></div></div>`;
    this.scroll = el.querySelector('.tl-scroll');
    this.canvas = el.querySelector('canvas');
    el.querySelector('.tl-bar').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.k) ctx.trim(b.dataset.k);
      if (b.dataset.z) this.zoom(b.dataset.z);
    };
    this.canvas.addEventListener('pointerdown', e => this.down(e));
    this.canvas.addEventListener('pointermove', e => this.hover(e));
    this.scroll.addEventListener('wheel', e => {
      if (e.ctrlKey) { e.preventDefault(); this.zoom(e.deltaY < 0 ? '+' : '-', e.offsetX); }
    }, { passive: false });
    this.scroll.addEventListener('scroll', () => this.draw());
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this.scroll);
    this.draw();
  }

  destroy() { this.ro.disconnect(); }

  get dur() { return this.ctx.proj.duration || 1; }
  get fitPps() { return Math.max(2, (this.scroll.clientWidth - 4) / this.dur); }

  zoom(dir, anchorX) {
    const pps = this.pps || this.fitPps;
    if (dir === 'fit') { this.pps = null; this.draw(); return; }
    const anchorT = ((anchorX ?? this.scroll.clientWidth / 2) + this.scroll.scrollLeft) / pps;
    const maxPps = Math.min(400, 30000 / (window.devicePixelRatio || 1) / this.dur); // giới hạn cỡ canvas
    this.pps = Math.max(this.fitPps, Math.min(maxPps, pps * (dir === '+' ? 1.5 : 1 / 1.5)));
    this.draw();
    this.scroll.scrollLeft = anchorT * this.pps - (anchorX ?? this.scroll.clientWidth / 2);
  }

  setTime(t) {
    this.t = t;
    const pps = this.pps || this.fitPps;
    const x = t * pps;
    if (this.pps && (x < this.scroll.scrollLeft || x > this.scroll.scrollLeft + this.scroll.clientWidth - 30)) this.scroll.scrollLeft = x - 60;
    this.draw();
  }

  clearSelection() { this.sel = null; this.ctx.selection(null); this.draw(); }

  rowY(name) {
    let y = 0;
    for (const k of ['ruler', 'orig', 'dub', 'sub']) { if (k === name) return y; y += ROW[k] + (k === 'ruler' ? 2 : GAP); }
    return y;
  }

  draw() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._draw(); });
  }

  _draw() {
    const p = this.ctx.proj; if (!p) return;
    const pps = this.pps || this.fitPps;
    const W = Math.max(this.scroll.clientWidth, Math.ceil(this.dur * pps) + 4);
    const H = this.rowY('sub') + ROW.sub + 6;
    const dpr = window.devicePixelRatio || 1;
    const c = this.canvas;
    // chỉ vẽ phần đang nhìn thấy để nhẹ máy
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px';
    }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.documentElement);
    const col = k => css.getPropertyValue(k).trim();
    const x0 = this.scroll.scrollLeft; const x1 = x0 + this.scroll.clientWidth;
    const tx = t => t * pps;

    // thước
    g.fillStyle = col('--dim'); g.font = '11px ui-monospace, monospace';
    const step = [1, 2, 5, 10, 15, 30, 60, 120].find(s => s * pps >= 70) || 300;
    for (let t = Math.floor(x0 / pps / step) * step; t <= x1 / pps; t += step) {
      g.fillRect(tx(t), 14, 1, 8); g.fillText(fmtTime(t, false), tx(t) + 4, 11);
    }
    // sóng âm
    const peaks = this.ctx.peaks;
    const wave = (arr, y, h, color) => {
      g.fillStyle = col('--panel'); g.fillRect(x0, y, x1 - x0, h);
      if (!arr || !arr.length) { g.fillStyle = col('--dim'); g.fillText('—', x0 + 8, y + h / 2 + 4); return; }
      const per = peaks.per_second || 40; g.fillStyle = color;
      const mid = y + h / 2;
      const pxStep = Math.max(1, pps / per);
      for (let x = Math.max(0, Math.floor(x0)); x < x1; x += Math.max(1, pxStep >= 2 ? pxStep : 1)) {
        const a = Math.floor(x / pps * per); const b = Math.max(a + 1, Math.floor((x + Math.max(1, pxStep)) / pps * per));
        let m = 0; for (let i = a; i < b && i < arr.length; i++) m = Math.max(m, arr[i]);
        const hh = Math.max(1, m / 100 * (h / 2 - 3));
        g.fillRect(x, mid - hh, Math.max(1, pxStep - (pxStep >= 3 ? 1 : 0)), hh * 2);
      }
    };
    wave(peaks?.orig, this.rowY('orig'), ROW.orig, col('--blue'));
    wave(p.settings.dub ? peaks?.dub : null, this.rowY('dub'), ROW.dub, col('--accent'));

    // phụ đề
    const ys = this.rowY('sub');
    g.fillStyle = col('--panel'); g.fillRect(x0, ys, x1 - x0, ROW.sub);
    g.font = '13px system-ui, sans-serif';
    for (const s of p.segments) {
      const a = tx(s.start), b = tx(s.end);
      if (b < x0 || a > x1) continue;
      const active = s.id === this.ctx.active;
      g.fillStyle = active ? col('--accent') : (s.text ? col('--panel2') : 'rgba(255,107,94,.25)');
      g.strokeStyle = active ? col('--accent2') : col('--line2');
      roundRect(g, a + 1, ys + 3, Math.max(2, b - a - 2), ROW.sub - 6, 5); g.fill(); g.stroke();
      if (b - a > 18) {
        g.save(); g.beginPath(); g.rect(a + 4, ys, b - a - 8, ROW.sub); g.clip();
        g.fillStyle = active ? col('--accent-ink') : col('--text');
        g.fillText((s.text || s.src || '').replace(/\*/g, ''), a + 6, ys + ROW.sub / 2 + 5);
        g.restore();
      }
    }
    // vùng bị cắt
    const top = this.rowY('orig'); const bottom = H;
    const trim = p.trim || {}; const tEnd = +trim.end || this.dur;
    g.fillStyle = 'rgba(0,0,0,.55)';
    if (trim.start > 0) g.fillRect(0, top, tx(trim.start), bottom - top);
    if (tEnd < this.dur) g.fillRect(tx(tEnd), top, W - tx(tEnd), bottom - top);
    for (const cut of p.cuts || []) {
      g.fillStyle = 'rgba(255,107,94,.18)'; g.fillRect(tx(cut.start), top, tx(cut.end) - tx(cut.start), bottom - top);
      g.strokeStyle = 'rgba(255,107,94,.6)'; g.beginPath();
      for (let x = tx(cut.start); x < tx(cut.end); x += 10) { g.moveTo(x, top); g.lineTo(x + 10, bottom); }
      g.stroke();
    }
    // vùng chọn
    if (this.sel) {
      g.fillStyle = 'rgba(106,165,255,.18)'; g.fillRect(tx(this.sel[0]), top, tx(this.sel[1]) - tx(this.sel[0]), bottom - top);
      g.fillStyle = col('--blue'); g.fillRect(tx(this.sel[0]), top, 1, bottom - top); g.fillRect(tx(this.sel[1]), top, 1, bottom - top);
      g.font = '11px ui-monospace, monospace';
      g.fillText(`${fmtTime(this.sel[0])} → ${fmtTime(this.sel[1])} (${(this.sel[1] - this.sel[0]).toFixed(1)}s)`, tx(this.sel[0]) + 4, top + 12);
    }
    // đầu phát
    g.fillStyle = col('--red'); const px = tx(this.t);
    g.fillRect(px - 1, 0, 2, H);
    g.beginPath(); g.moveTo(px - 6, 0); g.lineTo(px + 6, 0); g.lineTo(px, 8); g.fill();
  }

  pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const pps = this.pps || this.fitPps;
    const x = e.clientX - r.left; const y = e.clientY - r.top;
    return { x, y, t: Math.max(0, Math.min(this.dur, x / pps)), pps };
  }

  hitSeg(p) {
    if (p.y < this.rowY('sub')) return null;
    for (const s of this.ctx.proj.segments) {
      const a = s.start * p.pps, b = s.end * p.pps;
      if (p.x >= a - 4 && p.x <= b + 4) {
        const edge = p.x - a < 6 ? 'start' : b - p.x < 6 ? 'end' : 'move';
        return { s, edge };
      }
    }
    return null;
  }

  hover(e) {
    if (this.drag) return;
    const hit = this.hitSeg(this.pos(e));
    this.canvas.style.cursor = hit ? (hit.edge === 'move' ? 'grab' : 'ew-resize') : 'pointer';
  }

  down(e) {
    const p0 = this.pos(e);
    const hit = this.hitSeg(p0);
    this.canvas.setPointerCapture(e.pointerId);
    let moved = false;
    if (hit) {
      this.ctx.selectLine(hit.s.id);
      const o = { start: hit.s.start, end: hit.s.end };
      let pushed = false;
      const segs = this.ctx.proj.segments; const i = segs.indexOf(hit.s);
      const prevEnd = i > 0 ? segs[i - 1].end : 0; const nextStart = segs[i + 1] ? segs[i + 1].start : this.dur;
      const move = ev => {
        const p = this.pos(ev); const dt = p.t - p0.t;
        if (!moved && Math.abs(p.x - p0.x) < 3) return;
        moved = true;
        if (!pushed) { this.ctx.beforeChange(); pushed = true; }
        const r2 = v => Math.round(v * 100) / 100;
        if (hit.edge === 'start') hit.s.start = r2(Math.max(prevEnd, Math.min(o.end - 0.2, o.start + dt)));
        else if (hit.edge === 'end') hit.s.end = r2(Math.min(nextStart, Math.max(o.start + 0.2, o.end + dt)));
        else {
          const len = o.end - o.start;
          const ns = Math.max(prevEnd, Math.min(nextStart - len, o.start + dt));
          hit.s.start = r2(ns); hit.s.end = r2(ns + len);
        }
        this.draw();
      };
      const up = () => { this.canvas.removeEventListener('pointermove', move); if (moved) this.ctx.changed(); };
      this.canvas.addEventListener('pointermove', move);
      this.canvas.addEventListener('pointerup', up, { once: true });
      return;
    }
    // kéo để chọn đoạn, bấm để tua
    const move = ev => {
      const p = this.pos(ev);
      if (!moved && Math.abs(p.x - p0.x) < 4) return;
      moved = true;
      this.sel = [Math.min(p0.t, p.t), Math.max(p0.t, p.t)].map(v => Math.round(v * 100) / 100);
      this.draw();
    };
    const up = () => {
      this.canvas.removeEventListener('pointermove', move);
      if (moved) this.ctx.selection(this.sel);
      else { this.ctx.seek(p0.t); if (this.sel && (p0.t < this.sel[0] || p0.t > this.sel[1])) this.clearSelection(); }
    };
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', up, { once: true });
  }
}

function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
