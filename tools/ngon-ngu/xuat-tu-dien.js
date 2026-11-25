// Gộp các bảng dịch tools/ngon-ngu/<ngôn ngữ>-*.json thành public/lang/<ngôn ngữ>.js cho game.
//   node tools/ngon-ngu/xuat-tu-dien.js en
const fs = require('fs'), path = require('path');
const lang = process.argv[2] || 'en', dir = __dirname, out = {};
for (const f of fs.readdirSync(dir).filter(f => f.startsWith(lang + '-') && f.endsWith('.json')).sort()) Object.assign(out, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const file = path.join(dir, '..', '..', 'public', 'lang', lang + '.js');
fs.writeFileSync(file, `// Tự tạo bởi tools/ngon-ngu/xuat-tu-dien.js từ tools/ngon-ngu/${lang}-*.json — sửa bản dịch ở các file .json đó.\nwindow.MA_DICTS = window.MA_DICTS || {};\nwindow.MA_DICTS[${JSON.stringify(lang)}] = ${JSON.stringify(out)};\nif (window.MA_LANG === ${JSON.stringify(lang)}) window.MA_DICT = window.MA_DICTS[${JSON.stringify(lang)}];\n`);
console.log(`${file}: ${Object.keys(out).length} câu`);
