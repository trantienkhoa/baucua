// Đánh dấu chữ tiếng Việt trong code để dịch sang tiếng Anh.
//   'Chào bạn'        -> T`Chào bạn`
//   `Chào ${ten}`     -> T`Chào ${ten}`
// Hàm T (public/i18n.js) tra bảng dịch public/lang/en.js; thiếu câu nào thì giữ tiếng Việt.
// Cần thư viện đọc code: npm i --no-save acorn@8.15.0 acorn-walk@8.3.4
//   node tools/ngon-ngu/danh-dau.js <file.js|file.html> ...      (sửa tại chỗ, in số chỗ đã đánh dấu)
//   node tools/ngon-ngu/danh-dau.js --keys <file> ...             (chỉ in danh sách câu cần dịch, dạng JSON)
// Bỏ qua: chuỗi đem so sánh (===), khoá của object, chuỗi trong regex / new RegExp, chuỗi đã có T`…`.
const fs = require('fs'), acorn = require('acorn'), walk = require('acorn-walk');
const VN = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;
const args = process.argv.slice(2), keysOnly = args.includes('--keys'), files = args.filter(a => !a.startsWith('--'));
const allKeys = new Set();

function keyOfTemplate(q) { return q.quasis.map((x, i) => (i ? `{${i - 1}}` : '') + x.value.cooked).join(''); }
function toTemplate(v) { return 'T`' + v.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'; }

function process1(src, offset, sourceType) {
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType, allowHashBang: true, allowReturnOutsideFunction: true }); }
  catch (e) { if (sourceType === 'script') return process1(src, offset, 'module'); throw e; }
  const edits = [];
  walk.fullAncestor(ast, (node, _st, anc) => {
    const parent = anc[anc.length - 2];
    if (!parent) return;
    if (node.type === 'Literal' && typeof node.value === 'string' && VN.test(node.value)) {
      if (parent.type === 'Property' && parent.key === node && !parent.computed) return;
      if (parent.type === 'BinaryExpression' && /^[!=]==?$/.test(parent.operator)) return;
      if (parent.type === 'SwitchCase' && parent.test === node) return;
      if (parent.type === 'MemberExpression' && parent.property === node) return;
      if ((parent.type === 'NewExpression' || parent.type === 'CallExpression') && parent.callee.name === 'RegExp') return;
      if (parent.type === 'ImportDeclaration' || parent.type === 'ExpressionStatement' && parent.directive) return;
      allKeys.add(node.value);
      edits.push([node.start, node.end, toTemplate(node.value)]);
    } else if (node.type === 'TemplateLiteral' && node.quasis.some(q => VN.test(q.value.cooked || ''))) {
      if (parent.type === 'TaggedTemplateExpression' && parent.quasi === node) return;
      allKeys.add(keyOfTemplate(node));
      edits.push([node.start, node.start, 'T']);
    }
  });
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = src;
  for (const [s, e, r] of edits) out = out.slice(0, s) + r + out.slice(e);
  return { out, n: edits.length };
}

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let out, n = 0;
  if (/\.html$/.test(f)) {   // chỉ xử lý <script> nội tuyến (không phải importmap / src=)
    out = src.replace(/(<script(?![^>]*\bsrc=)(?![^>]*importmap)[^>]*>)([\s\S]*?)(<\/script>)/g, (m, a, body, c) => { const r = process1(body, 0, /type="module"/.test(a) ? 'module' : 'script'); n += r.n; return a + r.out + c; });
  } else { const r = process1(src, 0, 'script'); out = r.out; n = r.n; }
  if (!keysOnly) { fs.writeFileSync(f, out); console.error(`${f}: đánh dấu ${n} chỗ`); }
}
if (keysOnly) console.log(JSON.stringify([...allKeys], null, 1));
