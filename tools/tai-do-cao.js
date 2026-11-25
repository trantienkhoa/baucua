// tải ô độ cao Terrarium (AWS Open Data "Terrain Tiles") quanh tuyến, giải mã PNG → lưu lưới độ cao
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = process.argv[2], Z = 15;
const lon2x = lon => (lon + 180) / 360 * 2 ** Z;
const lat2y = lat => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** Z; };
const x0 = Math.floor(lon2x(108.438)), x1 = Math.floor(lon2x(108.515)), y0 = Math.floor(lat2y(11.962)), y1 = Math.floor(lat2y(11.925));
function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.slice(p + 8, p + 8 + len); if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; } else if (type === 'IDAT') idat.push(data); else if (type === 'IEND') break; p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = ct === 6 ? 4 : 3, stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev ? prev[i] : 0, c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[i] = v & 255;
    }
  }
  const el = new Float32Array(w * h); for (let i = 0; i < w * h; i++) el[i] = out[i * bpp] * 256 + out[i * bpp + 1] + out[i * bpp + 2] / 256 - 32768;
  return { w, h, el };
}
(async () => {
  const tiles = {};
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`;
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) }); if (!r.ok) { console.log('lỗi', url, r.status); continue; }
    const t = decodePNG(Buffer.from(await r.arrayBuffer())); tiles[x + '/' + y] = Array.from(t.el, v => Math.round(v * 10) / 10);
  }
  fs.writeFileSync(path.join(dir, 'dem.json'), JSON.stringify({ z: Z, x0, x1, y0, y1, size: 256, tiles }));
  const all = Object.values(tiles).flat(); console.log('ô', Object.keys(tiles).length, 'độ cao', Math.min(...all), '→', Math.max(...all), 'm');
})();
