// Đóng gói bản phát hành "Ngọn Lửa Cuối Cùng" cho khách (Windows):
//   node tools/dong-goi.js [đường-dẫn/license-pubkey.js]
// Kết quả: dist/NgonLuaCuoiCung-<phiên bản>.zip — khách giải nén, bấm đúp ChayNgonLua.bat, nhập key là chơi.
// Gói kèm sẵn Node.js (node\node.exe) nên khách KHÔNG cần cài Node. Không cần thư viện ngoài.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const NAME = 'NgonLuaCuoiCung';
const CACHE = path.join(__dirname, '.cache');
const OUT = path.join(ROOT, 'dist', `${NAME}-${PKG.version}.zip`);

// ---------- CRC32 + ghi zip (deflate) ----------
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const NOW = new Date(), DOS = (((NOW.getFullYear() - 1980) << 25) | ((NOW.getMonth() + 1) << 21) | (NOW.getDate() << 16) | (NOW.getHours() << 11) | (NOW.getMinutes() << 5) | (NOW.getSeconds() >> 1)) >>> 0;
function zipWriter(file) {
  const fd = fs.openSync(file, 'w'); let off = 0; const cen = [];
  const write = b => { fs.writeSync(fd, b); off += b.length; };
  return {
    add(name, data) {
      const nm = Buffer.from(name, 'utf8'), crc = crc32(data), comp = zlib.deflateRawSync(data, { level: 9 });
      const useStore = comp.length >= data.length, body = useStore ? data : comp, method = useStore ? 0 : 8;
      const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(method, 8);
      h.writeUInt32LE(DOS, 10); h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
      cen.push({ nm, crc, csize: body.length, size: data.length, method, off }); write(h); write(nm); write(body);
    },
    close() {
      const start = off;
      for (const e of cen) {
        const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(e.method, 10);
        c.writeUInt32LE(DOS, 12); c.writeUInt32LE(e.crc, 16); c.writeUInt32LE(e.csize, 20); c.writeUInt32LE(e.size, 24); c.writeUInt16LE(e.nm.length, 28); c.writeUInt32LE(e.off, 42);
        write(c); write(e.nm);
      }
      const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(cen.length, 8); end.writeUInt16LE(cen.length, 10); end.writeUInt32LE(off - start, 12); end.writeUInt32LE(start, 16);
      write(end); fs.closeSync(fd); return cen.length;
    },
  };
}
// đọc một file trong zip (lấy node.exe từ bản Node chính thức)
function unzipOne(buf, test) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('File zip hỏng');
  let p = buf.readUInt32LE(e + 16); const n = buf.readUInt16LE(e + 10);
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    if (test(name)) { const ds = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28), raw = buf.subarray(ds, ds + csize); return method === 8 ? zlib.inflateRawSync(raw) : raw; }
    p += 46 + nl + xl + cl;
  }
  throw new Error('Không thấy file cần lấy trong zip');
}

async function nodeExe() {
  fs.mkdirSync(CACHE, { recursive: true });
  const idx = await (await fetch('https://nodejs.org/dist/index.json')).json();
  const v = idx.find(r => r.lts && r.files.includes('win-x64-zip')).version;
  const exe = path.join(CACHE, `node-${v}-win-x64.exe`);
  if (!fs.existsSync(exe)) {
    console.log(`Tải Node.js ${v} cho Windows…`);
    const zip = Buffer.from(await (await fetch(`https://nodejs.org/dist/${v}/node-${v}-win-x64.zip`)).arrayBuffer());
    fs.writeFileSync(exe, unzipOne(zip, n => n.endsWith('/node.exe')));
  }
  return { exe, v };
}

// file / thư mục đưa vào gói (thư mục data/, web/, git, file thử nghiệm không đưa vào)
const INCLUDE = ['server.js', 'license.js', 'package.json', 'ChayNgonLua.bat', 'ChayGiongMa.bat', 'public', 'node_modules', 'tools/vieneu'];
const SKIP = rel => /(^|\/)(\.git|\.cache|__pycache__)(\/|$)/.test(rel) || /^public\/_/.test(rel) || /\.(log|map)$/.test(rel) || /^public\/models\/ma\/(B|C|D|G)\/MANIFEST/.test(rel);
function* walk(rel) {
  const abs = path.join(ROOT, rel), st = fs.statSync(abs);
  if (st.isDirectory()) { for (const f of fs.readdirSync(abs)) yield* walk(rel + '/' + f); }
  else if (!SKIP(rel)) yield rel;
}

(async () => {
  const pub = process.argv[2] || path.join(ROOT, 'web', 'license-pubkey.js');
  if (!fs.existsSync(pub)) { console.error(`Thiếu ${pub}.\nTrên máy chủ bán hàng chạy "npm run xuat-khoa" rồi đưa file license-pubkey.js vào đây.`); process.exit(1); }
  const pk = require(path.resolve(pub));
  if (!/^https:\/\//.test(pk.server || '')) console.warn(`⚠ license-pubkey.js đang trỏ tới ${pk.server} — bản bán cho khách nên dùng tên miền HTTPS.`);
  const { exe, v } = await nodeExe();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const z = zipWriter(OUT); let bytes = 0;
  for (const top of INCLUDE) for (const rel of walk(top)) { const d = fs.readFileSync(path.join(ROOT, rel)); bytes += d.length; z.add(`${NAME}/${rel}`, d); }
  z.add(`${NAME}/license-pubkey.js`, fs.readFileSync(pub));
  z.add(`${NAME}/node/node.exe`, fs.readFileSync(exe));
  z.add(`${NAME}/DOC-TRUOC.txt`, Buffer.from(`NGỌN LỬA CUỐI CÙNG — bản ${PKG.version}\r\n\r\n1. Giải nén cả thư mục ra ổ đĩa (đừng chạy trong file nén).\r\n2. Bấm đúp ChayNgonLua.bat\r\n3. Trình duyệt tự mở trang nhập key → dán key → Kích hoạt.\r\n4. OBS / TikTok LIVE Studio: thêm nguồn Browser, URL http://localhost:3300/ma.html?obs=1 , rộng 1080, cao 1920.\r\n   Ở trang điều khiển nhập tên kênh TikTok → Kết nối.\r\n\r\nĐã kèm sẵn Node.js ${v}, không cần cài thêm.\r\nGiọng đọc VieNeu (tuỳ chọn): cài Python 3.10+ rồi bấm ChayGiongMa.bat một lần; không cài thì game dùng giọng có sẵn của Windows.\r\nGhi công âm thanh: public/models/ma/I/GHI-CONG.txt\r\n`, 'utf8'));
  const n = z.close();
  console.log(`✓ ${OUT}\n  ${n} file · ${(fs.statSync(OUT).size / 2 ** 20).toFixed(0)} MB (gốc ${(bytes / 2 ** 20).toFixed(0)} MB + node.exe)`);
})().catch(e => { console.error('Lỗi:', e.message); process.exit(1); });
