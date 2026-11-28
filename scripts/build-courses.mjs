// Construit la base de données des golfs (courses/*.json) depuis OpenStreetMap.
// Exécuté par GitHub Actions (.github/workflows/build-courses.yml), aucun serveur nécessaire.
// Usage : node scripts/build-courses.mjs [lat] [lon] [rayon_km]
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';

const LAT = +(process.argv[2] || 49.1145), LON = +(process.argv[3] || 2.422), KM = +(process.argv[4] || 50);
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r5 = (x) => Math.round(x * 1e5) / 1e5;

async function overpass(q) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'mon-golf-builder/1.0 (github pages)' } });
      if (res.ok) return await res.json();
      console.warn(url, res.status);
    } catch (e) { console.warn(url, e.message); }
    await sleep(5000 * (attempt + 1));
  }
  throw new Error('Overpass indisponible');
}

const geom = (e) => (e.geometry || []).map((p) => [r5(p.lat), r5(p.lon)]);
function polys(e) {
  if (e.type === 'way') return [geom(e)];
  return (e.members || []).filter((m) => m.role !== 'inner' && m.geometry).map((m) => m.geometry.map((p) => [r5(p.lat), r5(p.lon)]));
}
function bbox(pts) {
  let a = [90, 180, -90, -180];
  for (const [la, lo] of pts) a = [Math.min(a[0], la), Math.min(a[1], lo), Math.max(a[2], la), Math.max(a[3], lo)];
  return a.map(r5);
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  console.log(`Golfs à ${KM} km de ${LAT},${LON}`);
  const list = await overpass(`[out:json][timeout:90];(way["leisure"="golf_course"](around:${KM * 1000},${LAT},${LON});relation["leisure"="golf_course"](around:${KM * 1000},${LAT},${LON}););out tags center bb;`);
  const courses = list.elements.filter((e) => e.tags?.name);
  console.log(courses.length, 'golfs trouvés');
  await mkdir('courses', { recursive: true });
  for (const f of await readdir('courses')) if (f.endsWith('.json')) await unlink('courses/' + f);
  const index = [];
  for (const c of courses) {
    const id = `${c.type[0]}${c.id}`;
    let data;
    try {
      data = await overpass(`[out:json][timeout:90];${c.type}(${c.id});map_to_area->.a;(way["golf"](area.a);relation["golf"](area.a);way["natural"="water"](area.a););out tags geom;`);
    } catch (e) { console.warn('échec', c.tags.name); continue; }
    const out = { id, name: c.tags.name, city: c.tags['addr:city'] || '', holes: [], greens: [], tees: [], bunkers: [], water: [], fairways: [] };
    for (const e of data.elements) {
      const g = e.tags?.golf, t = e.tags || {};
      if (g === 'hole') {
        const line = geom(e); if (line.length < 2) continue;
        const dk = ['dist:white', 'dist:yellow', 'dist:blue', 'dist:red'].find((k) => t[k]) || Object.keys(t).find((k) => /^dist/.test(k));
        out.holes.push({ ref: parseInt(t.ref, 10) || 0, par: parseInt(t.par, 10) || null, hcp: parseInt(t.handicap, 10) || null,
          dist: dk ? parseInt(t[dk], 10) || null : null, grp: t['golf:course:name'] || t['golf:course'] || '', name: t.name || '', line });
      } else if (g === 'green') out.greens.push(...polys(e));
      else if (g === 'tee') out.tees.push(...polys(e));
      else if (g === 'bunker') out.bunkers.push(...polys(e));
      else if (g === 'fairway') out.fairways.push(...polys(e));
      else if (g === 'water_hazard' || g === 'lateral_water_hazard' || t.natural === 'water') out.water.push(...polys(e));
    }
    out.holes.sort((a, b) => a.ref - b.ref);
    const b = c.bounds ? [c.bounds.minlat, c.bounds.minlon, c.bounds.maxlat, c.bounds.maxlon].map(r5) : bbox(out.holes.flatMap((h) => h.line));
    const file = `${slug(c.tags.name)}-${id}.json`;
    await writeFile('courses/' + file, JSON.stringify(out));
    index.push({ id, file, name: c.tags.name, city: out.city, lat: r5(c.center?.lat ?? (b[0] + b[2]) / 2), lon: r5(c.center?.lon ?? (b[1] + b[3]) / 2), bbox: b,
      holes: out.holes.length, mapped: out.holes.filter((h) => h.par).length });
    console.log(`${c.tags.name}: ${out.holes.length} trous, ${out.greens.length} greens`);
    await sleep(1500);
  }
  index.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  await writeFile('courses/index.json', JSON.stringify({ built: new Date().toISOString(), center: [LAT, LON], km: KM, courses: index }));
  console.log('Terminé :', index.length, 'golfs,', index.filter((c) => c.mapped >= 9).length, 'avec plan des trous');
}
main().catch((e) => { console.error(e); process.exit(1); });
