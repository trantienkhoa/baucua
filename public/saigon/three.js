// Nạp Three.js: ưu tiên bản có sẵn trong máy chủ game (chạy offline),
// nếu không có (mở file lẻ / xem thử trên web) thì lấy từ CDN.
let mod;
try { mod = await import('/three/build/three.module.js'); }
catch (e) { mod = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'); }
export const THREE = mod;
