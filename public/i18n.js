// Đa ngôn ngữ: câu tiếng Việt trong code viết dạng T`…` (đánh dấu bằng tools/ngon-ngu/danh-dau.js).
// Ngôn ngữ đang dùng (window.MA_LANG) do máy chủ trả ở /lang.js; bảng dịch ở /lang/<ngôn ngữ>.js.
// Câu chưa có bản dịch thì giữ nguyên tiếng Việt.
(function () {
  window.MA_LANG = window.MA_LANG || 'vi';
  window.MA_DICT = window.MA_DICT || {};
  window.T = function (strings, ...vals) {
    let key = strings[0];
    for (let i = 0; i < vals.length; i++) key += '{' + i + '}' + strings[i + 1];
    const tr = window.MA_LANG !== 'vi' && window.MA_DICT[key];
    if (tr) return tr.replace(/\{(\d+)\}/g, (m, i) => (vals[i] == null ? '' : String(vals[i])));
    let s = strings[0];
    for (let i = 0; i < vals.length; i++) s += (vals[i] == null ? '' : String(vals[i])) + strings[i + 1];
    return s;
  };
  window.isEN = () => window.MA_LANG === 'en';
})();
