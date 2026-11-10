// 10 giao diện màn hình LIVE. Mỗi giao diện có nền động (bg) và hiệu ứng khi thắp đèn (hit) riêng.
window.VN_THEMES = {
  'dem-sao': {
    name: '✨ Đêm Sao', bg: ['#0b1030', '#141a4a', '#06081c'], bgFx: 'stars', hit: 'comet', win: 'fireworks',
    dark: '#1d2550', darkEdge: '#3a4a8a', lit: ['#ffd36b', '#ffb020'], litTop: '#ffe9a8', edge: '#fff1c4', glow: '#ffbf3a', side: '#a86a00',
    accent: '#ffcc4d', accent2: '#7ad7ff', text: '#ffffff', sub: '#c9d2ff', panel: 'rgba(16,22,64,.82)', border: 'rgba(255,204,77,.55)',
    title: ['#fff6d5', '#ffcf4d', '#ff9a1f'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif",
  },
  'son-mai': {
    name: '🏮 Sơn Mài', bg: ['#2a0c06', '#4a1608', '#150402'], bgFx: 'lacquer', hit: 'drum', win: 'goldburst',
    dark: '#4a1a0e', darkEdge: '#8a3a18', lit: ['#f6c45a', '#d98a16'], litTop: '#ffe2a0', edge: '#ffe6a8', glow: '#ffae2b', side: '#7a3d00',
    accent: '#f2b53c', accent2: '#ff7043', text: '#fff7e6', sub: '#f3cfa4', panel: 'rgba(48,14,6,.84)', border: 'rgba(242,181,60,.6)',
    title: ['#fff1c8', '#f2b53c', '#c46a10'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif",
  },
  'cuc-quang': {
    name: '🌌 Cực Quang', bg: ['#020b1a', '#06243a', '#01060f'], bgFx: 'aurora', hit: 'pillar', win: 'aurora',
    dark: '#0f2a40', darkEdge: '#1f5a7a', lit: ['#9ef7ff', '#7c8cff'], litTop: '#e6fbff', edge: '#e0fcff', glow: '#6ff0ff', side: '#2a3a8a',
    accent: '#7ff5e0', accent2: '#b48bff', text: '#ffffff', sub: '#bfe9ff', panel: 'rgba(4,24,40,.8)', border: 'rgba(127,245,224,.5)',
    title: ['#e8fffb', '#7ff5e0', '#9a7bff'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif",
  },
  'neon': {
    name: '💜 Neon', bg: ['#0d0221', '#24063f', '#05010f'], bgFx: 'grid', hit: 'laser', win: 'neonburst',
    dark: '#26093f', darkEdge: '#6a1fa0', lit: ['#ff4fd8', '#a23bff'], litTop: '#ffc2f3', edge: '#ffd0f7', glow: '#ff3fd0', side: '#4a0a7a',
    accent: '#ff4fd8', accent2: '#22e6ff', text: '#ffffff', sub: '#f0c8ff', panel: 'rgba(30,6,52,.82)', border: 'rgba(255,79,216,.6)',
    title: ['#ffe0fb', '#ff4fd8', '#22e6ff'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif", italic: true,
  },
  'trung-thu': {
    name: '🌕 Đêm Trăng Hội An', bg: ['#1a0d3a', '#3a1a5a', '#0d0620'], bgFx: 'lanterns', hit: 'lantern', win: 'lanternsky',
    dark: '#3a2060', darkEdge: '#6a40a0', lit: ['#ffb347', '#ff6a3d'], litTop: '#ffd9a0', edge: '#ffe0b0', glow: '#ff9a3c', side: '#8a3010',
    accent: '#ffb347', accent2: '#ffe08a', text: '#ffffff', sub: '#f0d8ff', panel: 'rgba(36,16,66,.82)', border: 'rgba(255,179,71,.55)',
    title: ['#fff2d6', '#ffb347', '#ff6a3d'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif", moon: true,
  },
  'radar': {
    name: '📡 Radar Chỉ Huy', bg: ['#021a0c', '#06301a', '#010d06'], bgFx: 'radar', hit: 'lock', win: 'radarwin',
    dark: '#0a3018', darkEdge: '#1c6a36', lit: ['#6dff8e', '#22d65a'], litTop: '#d4ffde', edge: '#c8ffd4', glow: '#3dff6e', side: '#0a6a2a',
    accent: '#5dff86', accent2: '#d4ff4d', text: '#eaffef', sub: '#a8ffbf', panel: 'rgba(2,28,12,.85)', border: 'rgba(93,255,134,.55)',
    title: ['#eaffef', '#5dff86', '#1fbf50'], font: "'Be Vietnam Pro','Consolas',monospace",
  },
  'tet': {
    name: '🧧 Tết Rộn Ràng', bg: ['#5a0606', '#8a0f0f', '#2e0202'], bgFx: 'blossom', hit: 'firework', win: 'fireworks',
    dark: '#7a1414', darkEdge: '#b23a2a', lit: ['#ffd84d', '#ffab1f'], litTop: '#fff2b0', edge: '#fff0b8', glow: '#ffd23d', side: '#a85a00',
    accent: '#ffd84d', accent2: '#ff9a9a', text: '#fff8e6', sub: '#ffd6c8', panel: 'rgba(90,6,6,.82)', border: 'rgba(255,216,77,.65)',
    title: ['#fff6cc', '#ffd84d', '#ff9a1f'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif", petals: true,
  },
  'giay-co': {
    name: '📜 Giấy Cổ', bg: ['#efe0bf', '#e6d2a6', '#d8c08e'], bgFx: 'paper', hit: 'stamp', win: 'inkburst',
    dark: '#e3cf9f', darkEdge: '#9a7a48', lit: ['#e0794a', '#c0442a'], litTop: '#f2a578', edge: '#7a2a14', glow: '#c0442a', side: '#7a2a14', light: true,
    accent: '#b23a1e', accent2: '#3a5a7a', text: '#3a2410', sub: '#6a4a28', panel: 'rgba(248,238,212,.88)', border: 'rgba(122,74,30,.55)',
    title: ['#5a2a10', '#9a3a18', '#5a2a10'], font: "'Be Vietnam Pro',Georgia,serif",
  },
  'bien-xanh': {
    name: '🌊 Biển Xanh', bg: ['#012a4a', '#014f86', '#011a30'], bgFx: 'waves', hit: 'ripple', win: 'splash',
    dark: '#0a4a7a', darkEdge: '#2a7ab0', lit: ['#ffe28a', '#40e0d0'], litTop: '#fff6c8', edge: '#ffffff', glow: '#7fffd4', side: '#0a6a6a',
    accent: '#7fffd4', accent2: '#ffe28a', text: '#ffffff', sub: '#c8ecff', panel: 'rgba(1,42,74,.8)', border: 'rgba(127,255,212,.5)',
    title: ['#ffffff', '#7fffd4', '#38b6ff'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif",
  },
  'hoa-sen': {
    name: '🪷 Hoa Sen', bg: ['#0f2a1f', '#1d4a36', '#071a12'], bgFx: 'lotus', hit: 'petal', win: 'lotusbloom',
    dark: '#1f4a38', darkEdge: '#3a7a5a', lit: ['#ff9ec4', '#ff5a9a'], litTop: '#ffd6e6', edge: '#ffe6f0', glow: '#ff7ab0', side: '#8a2050',
    accent: '#ff8fbf', accent2: '#ffe08a', text: '#ffffff', sub: '#d8ffe8', panel: 'rgba(12,40,28,.82)', border: 'rgba(255,143,191,.55)',
    title: ['#fff0f6', '#ff8fbf', '#ffd36b'], font: "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif", petals: true,
  },
};
