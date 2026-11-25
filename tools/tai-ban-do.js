// tải thêm: ga Trại Mát (khung rộng hơn về phía đông) + đường phố / loại đất chia thành nhiều ô nhỏ
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const HOSTS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
async function q(body, file) {
  if (fs.existsSync(file)) { console.log(path.basename(file), 'đã có'); return true; }
  for (let round = 0; round < 3; round++) for (const host of HOSTS) {
    try {
      const r = await fetch(host, { method: 'POST', body: 'data=' + encodeURIComponent(`[out:json][timeout:50];(${body});out geom tags;`), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'tau-dalat-game/1.0' }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) { console.log(path.basename(file), host.split('/')[2], r.status); continue; }
      const j = await r.json(); fs.writeFileSync(file, JSON.stringify(j)); console.log(path.basename(file), 'OK', j.elements.length); return true;
    } catch (e) { console.log(path.basename(file), host.split('/')[2], e.message); }
    await new Promise(r => setTimeout(r, 4000));
  }
  return false;
}
(async () => {
  await q('way["railway"="rail"](11.935,108.495,11.955,108.530);node["railway"~"station|halt"](11.930,108.440,11.960,108.530);node["public_transport"="station"](11.930,108.440,11.960,108.530);node["name"~"Trại Mát|Linh Phước"](11.930,108.480,11.960,108.530);way["name"~"Trại Mát|Linh Phước"](11.930,108.480,11.960,108.530);', path.join(dir, 'osm_rail2.json'));
  // các ô nhỏ dọc tuyến
  const tiles = [[11.930, 108.445, 11.955, 108.470], [11.930, 108.470, 11.955, 108.490], [11.932, 108.490, 11.957, 108.512]];
  for (const [i, t] of tiles.entries()) {
    const bb = t.join(',');
    await q(`way["highway"~"primary|secondary|tertiary|residential|unclassified|trunk|service|track"](${bb});`, path.join(dir, `osm_road${i}.json`));
    await q(`way["landuse"](${bb});way["natural"~"water|wood|scrub|grassland"](${bb});way["leisure"](${bb});way["amenity"](${bb});way["building"="greenhouse"](${bb});`, path.join(dir, `osm_land${i}.json`));
  }
  await q('way["building"](11.932,108.495,11.957,108.512);node["amenity"](11.932,108.495,11.957,108.512);node["shop"](11.932,108.495,11.957,108.512);', path.join(dir, 'osm_east.json'));
})();
