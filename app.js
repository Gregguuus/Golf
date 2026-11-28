/* Mon Golf — application web statique (GitHub Pages), sans compte ni serveur.
   Données : localStorage (parties, séances) + IndexedDB (vidéos de swing).
   Base des golfs : courses/*.json, construite depuis OpenStreetMap par GitHub Actions.
   Services gratuits : Open-Meteo (météo), imagerie satellite Esri, Photon (recherche de golfs). */
'use strict';

/* ================= Utilitaires ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad2 = (n) => String(n).padStart(2, '0');
const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDay = (d, o = { day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('fr-FR', o);
const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
const HOME = { lat: 49.1145, lon: 2.422 }; // Luzarches : centre de la base des golfs

/* ================= Géométrie ================= */
const RAD = Math.PI / 180, R_EARTH = 6371000;
function dist(a, b) { // mètres ; points {lat, lon}
  const dLa = (b.lat - a.lat) * RAD, dLo = (b.lon - a.lon) * RAD;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLo / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}
function bearing(a, b) {
  const y = Math.sin((b.lon - a.lon) * RAD) * Math.cos(b.lat * RAD);
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lon - a.lon) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
function dest(a, brg, m) {
  const d = m / R_EARTH, t = brg * RAD, la = a.lat * RAD, lo = a.lon * RAD;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t));
  const lo2 = lo + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: la2 / RAD, lon: lo2 / RAD };
}
const P = ([lat, lon]) => ({ lat, lon });
const LL = (p) => [p.lon, p.lat]; // vers [lon, lat] pour la carte
function centroid(poly) { return { lat: sum(poly, (p) => p[0]) / poly.length, lon: sum(poly, (p) => p[1]) / poly.length }; }
function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > pt.lat) !== (yj > pt.lat) && pt.lon < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inBox = (p, b, m = 0.002) => p.lat > b[0] - m && p.lat < b[2] + m && p.lon > b[1] - m && p.lon < b[3] + m;

/* ================= Données ================= */
const KEY = 'mongolf';
const DEFAULTS = () => ({ v: 3, sessions: [], rounds: [], activeRound: null, courses: {}, settings: { auto: true, wake: true, motion: false } });
let db;
function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  db = Object.assign(DEFAULTS(), d);
  db.settings = Object.assign(DEFAULTS().settings, d.settings);
  for (const k of ['clubs', 'insta', 'instaCollection', 'reminders']) delete db[k];
  if ((d.v || 1) < 2) { db.rounds = (db.rounds || []).map(migrateRound).filter(Boolean); db.activeRound = migrateRound(db.activeRound); }
  db.v = 3;
}
function migrateRound(r) {
  if (!r) return null;
  if (Array.isArray(r.holes)) return r;
  return { id: r.id, date: r.date, course: r.course, courseKey: null, source: 'user', complete: !!r.complete,
    holes: (r.scores || []).map((s) => ({ par: s.par, hcp: null, dist: null, strokes: s.strokes || 0, putts: s.putts || 0, shots: [] })) };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast('Mémoire pleine : exportez vos données'); } }
load();

/* Vidéos (IndexedDB) */
let idbP;
const idb = () => (idbP ||= new Promise((res, rej) => {
  const r = indexedDB.open('mongolf-videos', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('swings', { keyPath: 'id' });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const vStore = async (m) => (await idb()).transaction('swings', m).objectStore('swings');
const vPut = async (x) => reqP((await vStore('readwrite')).put(x));
const vAll = async () => reqP((await vStore('readonly')).getAll());
const vDel = async (id) => reqP((await vStore('readwrite')).delete(id));

/* ================= État ================= */
const S = { tab: 'today', pos: null, posErr: null, weather: null, here: null, index: null, search: '', photon: null,
  hole: 0, swings: [], cam: null, rec: null, recStart: 0, play: false };

/* ================= Toast & feuilles ================= */
let toastT;
function toast(msg, action, fn) {
  const t = $('#toast');
  t.innerHTML = esc(msg) + (action ? ` <button>${esc(action)}</button>` : '');
  if (action) $('button', t).onclick = () => { t.classList.remove('on'); fn(); };
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), action ? 6000 : 2600);
}
let sheetClose = null;
function openSheet(html, onClose) {
  const s = $('#sheet'); s.innerHTML = '<div class="grab"></div>' + html; s.scrollTop = 0;
  requestAnimationFrame(() => { s.classList.add('on'); $('#backdrop').classList.add('on'); });
  sheetClose = onClose || null;
}
function closeSheet() { $('#sheet').classList.remove('on'); $('#backdrop').classList.remove('on'); const f = sheetClose; sheetClose = null; f && f(); }
$('#backdrop').addEventListener('click', closeSheet);
const sheetHead = (title, right = '', left = 'Fermer') =>
  `<div class="sheet-head"><button data-a="close">${left}</button><h2>${title}</h2>${right ? `<button class="r" ${right}</button>` : '<span></span>'}</div>`;

/* ================= Base des golfs ================= */
async function loadIndex() {
  try { const r = await fetch('courses/index.json', { cache: 'no-cache' }); if (!r.ok) throw 0; S.index = (await r.json()).courses; }
  catch { S.index = []; }
  detectHere(); if (!S.play) render();
}
const courseCache = {};
async function loadCourse(entry) {
  if (courseCache[entry.id]) return courseCache[entry.id];
  const r = await fetch('courses/' + entry.file); if (!r.ok) throw new Error('course');
  return (courseCache[entry.id] = await r.json());
}
const ref = () => S.pos || HOME;
function sortedCourses() {
  if (!S.index) return [];
  return S.index.map((c) => ({ ...c, d: dist(ref(), c) })).sort((a, b) => a.d - b.d);
}
function detectHere() {
  if (!S.pos || !S.index) return;
  const prev = S.here;
  S.here = S.index.find((c) => c.bbox && inBox(S.pos, c.bbox, 0.0008)) || null;
  if (S.here && (!prev || prev.id !== S.here.id)) onArrive(S.here);
}
/* Groupes de trous (golfs de 27 ou 36 trous) */
function holeGroups(course) {
  const by = new Map();
  for (const h of course.holes) { const g = h.grp || ''; if (!by.has(g)) by.set(g, []); by.get(g).push(h); }
  let groups = [...by.entries()].map(([name, hs]) => ({ name, holes: hs }));
  // Sans nom de parcours mais des numéros en double : on répartit en plusieurs parcours
  if (groups.length === 1 && new Set(groups[0].holes.map((h) => h.ref)).size < groups[0].holes.length) {
    const out = [];
    for (const h of [...course.holes].sort((a, b) => a.ref - b.ref)) { const i = out.findIndex((g) => !g.some((x) => x.ref === h.ref)); (i >= 0 ? out[i] : (out[out.length] = [])).push(h); }
    groups = out.map((hs, i) => ({ name: `Parcours ${i + 1}`, holes: hs }));
  }
  groups.forEach((g) => g.holes.sort((a, b) => a.ref - b.ref));
  return groups.filter((g) => g.holes.length >= 3);
}
function holeGeo(course, h) {
  const tee = P(h.line[0]), end = P(h.line[h.line.length - 1]);
  let green = null, best = 70;
  for (const g of course.greens || []) {
    if (inPoly(end, g)) { green = g; break; }
    const d = dist(centroid(g), end); if (d < best) { best = d; green = g; }
  }
  return { tee, center: green ? centroid(green) : end, green, line: h.line.map(P) };
}

/* ================= Localisation ================= */
let watchId = null;
function startGPS() {
  if (!navigator.geolocation || watchId != null) return;
  watchId = navigator.geolocation.watchPosition((p) => {
    const first = !S.pos;
    S.pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, speed: p.coords.speed };
    S.posErr = null;
    if (first) { fetchWeather(); if (!S.play) render(); }
    detectHere();
    if (S.play) updatePlay();
  }, (e) => { S.posErr = e; }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}
let arrivedOnce = false;
async function onArrive(c) {
  if (arrivedOnce) return; arrivedOnce = true;
  if (db.activeRound) { go('round'); if (db.activeRound.mapped) openPlay(); return; }
  const played = db.rounds.some((r) => r.date === isoDay() && r.courseKey === c.id);
  if (!db.settings.auto || played) { if (!S.play) render(); return; }
  if (c.mapped >= 9) {
    const course = await loadCourse(c).catch(() => null), groups = course ? holeGroups(course) : [];
    if (groups.length === 1) { startRound(c, course, groups[0]); go('round'); openPlay(); toast(`Bienvenue à ${c.name} ⛳`); return; }
  }
  go('round'); sheetCourse(c);
}

/* ================= Météo ================= */
const WMO = { 0: ['☀️', 'Ensoleillé'], 1: ['🌤️', 'Plutôt ensoleillé'], 2: ['⛅', 'Éclaircies'], 3: ['☁️', 'Couvert'], 45: ['🌫️', 'Brouillard'], 48: ['🌫️', 'Brouillard givrant'],
  51: ['🌦️', 'Bruine légère'], 53: ['🌦️', 'Bruine'], 55: ['🌧️', 'Bruine forte'], 61: ['🌦️', 'Pluie faible'], 63: ['🌧️', 'Pluie'], 65: ['🌧️', 'Forte pluie'],
  71: ['🌨️', 'Neige faible'], 73: ['🌨️', 'Neige'], 75: ['❄️', 'Forte neige'], 80: ['🌦️', 'Averses'], 81: ['🌧️', 'Averses'], 82: ['⛈️', 'Fortes averses'],
  95: ['⛈️', 'Orage'], 96: ['⛈️', 'Orage, grêle'], 99: ['⛈️', 'Orage, grêle'] };
const wmo = (c) => WMO[c] || ['🌡️', '—'];
const dirName = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(d / 45) % 8];
async function fetchWeather() {
  const p = ref(), u = new URL('https://api.open-meteo.com/v1/forecast');
  Object.entries({ latitude: p.lat.toFixed(3), longitude: p.lon.toFixed(3), timezone: 'auto', wind_speed_unit: 'kmh', forecast_hours: 8,
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m' }).forEach(([k, v]) => u.searchParams.set(k, v));
  try { const r = await fetch(u); if (!r.ok) throw 0; S.weather = await r.json(); } catch { S.weather ||= 'err'; }
  if (S.play) updatePlay(); else if (S.tab === 'today') render();
}
function golfTip(c) {
  if ([95, 96, 99].includes(c.weather_code)) return 'Orage : quittez le parcours et mettez-vous à l\'abri.';
  const t = [];
  if (c.wind_speed_10m >= 30) t.push('Vent fort : balles basses, jusqu\'à 2 clubs de plus face au vent.');
  else if (c.wind_speed_10m >= 15) t.push('Vent sensible : 1 club de plus face au vent, 1 de moins dans le dos.');
  if (c.wind_gusts_10m - c.wind_speed_10m >= 15) t.push('Rafales : attendez une accalmie avant de frapper.');
  if (c.temperature_2m <= 8) t.push('Froid : la balle porte moins, prévoyez un club de plus.');
  if (c.temperature_2m >= 28) t.push('Chaleur : hydratez-vous tous les 3 trous.');
  if (c.precipitation > 0) t.push('Pluie : grips au sec, greens plus lents.');
  return t.join(' ') || 'Conditions idéales pour jouer. Bon parcours !';
}
function heroHTML() {
  const w = S.weather, place = S.here ? S.here.name : S.pos ? 'Ma position' : 'Luzarches';
  if (!w || w === 'err') return `<div class="hero loading"><div class="place">${I.nav}${esc(place)}</div><div class="now"><div><div class="temp">--°</div><div class="cond">${w === 'err' ? 'Météo indisponible pour le moment.' : 'Chargement…'}</div></div></div></div>`;
  const c = w.current, [emo, label] = wmo(c.weather_code), h = w.hourly, now = Date.now();
  const hrs = h.time.map((t, i) => ({ t: new Date(t), i })).filter((x) => x.t.getTime() > now - 3600e3).slice(0, 6);
  const rain = hrs.length ? h.precipitation_probability[hrs[0].i] ?? 0 : 0;
  const u = (s) => `<small style="display:inline;font-size:12px">${s}</small>`;
  return `<div class="hero"><div class="place">${I.nav}${esc(place)}</div>
    <div class="now"><div><div class="temp">${Math.round(c.temperature_2m)}°</div><div class="cond">${label} · ressenti ${Math.round(c.apparent_temperature)}°</div></div><div class="emo">${emo}</div></div>
    <div class="metrics"><div><small>Vent ${dirName(c.wind_direction_10m)}</small><b><span class="arrow" style="transform:rotate(${(c.wind_direction_10m + 180) % 360}deg)">${I.arrow}</span>${Math.round(c.wind_speed_10m)}${u('km/h')}</b></div>
      <div><small>Rafales</small><b>${Math.round(c.wind_gusts_10m)}${u('km/h')}</b></div><div><small>Pluie</small><b>${rain}${u('%')}</b></div></div>
    <div class="tip">${I.bulb}<span>${golfTip(c)}</span></div>
    <div class="hours">${hrs.map(({ t, i }, k) => `<div><i>${k === 0 ? 'Maint.' : t.getHours() + ' h'}</i><span>${wmo(h.weather_code[i])[0]}</span>${Math.round(h.temperature_2m[i])}°<i>${Math.round(h.wind_speed_10m[i])} km/h</i></div>`).join('')}</div></div>`;
}

/* ================= Partie ================= */
const scoreName = (s, p) => {
  if (!s) return ['', ''];
  const d = s - p;
  if (s === 1) return ['Trou en un !', 'eagle'];
  return d <= -2 ? [d === -2 ? 'Eagle' : 'Albatros', 'eagle'] : d === -1 ? ['Birdie', 'birdie'] : d === 0 ? ['Par', 'par'] : d === 1 ? ['Bogey', 'bogey'] : d === 2 ? ['Double bogey', 'double'] : [`+${d}`, 'double'];
};
const toPar = (n) => (n === 0 ? 'E' : n > 0 ? '+' + n : '−' + Math.abs(n));
const played = (r) => r.holes.filter((h) => h.strokes);
const rStrokes = (r) => sum(r.holes, (h) => h.strokes);
const rDiff = (r) => rStrokes(r) - sum(played(r), (h) => h.par);
let curCourse = null; // géométrie du golf de la partie en cours
const lineLen = (line) => { let t = 0; for (let i = 1; i < line.length; i++) t += dist(P(line[i - 1]), P(line[i])); return Math.round(t); };

function startRound(entry, course, group, nHoles = 18) {
  const holes = group ? group.holes.map((h) => ({ par: h.par || 4, hcp: h.hcp, dist: h.dist || lineLen(h.line), gref: h.ref }))
    : (db.courses[entry?.id || entry?.name]?.holes || Array.from({ length: nHoles }, () => ({ par: 4 })));
  db.activeRound = { id: uid(), date: isoDay(), course: entry?.name || 'Parcours', courseKey: entry?.id || null, group: group?.name ?? '', mapped: !!group,
    holes: holes.map((h) => ({ par: h.par || 4, hcp: h.hcp ?? null, dist: h.dist ?? null, gref: h.gref ?? null, strokes: 0, putts: 0, shots: [] })) };
  curCourse = group ? course : null;
  S.hole = 0; save(); keepAwake();
}
async function ensureCourse() {
  const r = db.activeRound;
  if (!r?.mapped || curCourse) return;
  if (!S.index) await loadIndex();
  const e = S.index.find((c) => c.id === r.courseKey);
  if (e) { try { curCourse = await loadCourse(e); } catch {} }
}
function roundHoleData(i) { // géométrie du trou i de la partie en cours
  const r = db.activeRound; if (!r?.mapped || !curCourse) return null;
  const gs = holeGroups(curCourse), g = gs.find((x) => x.name === r.group) || gs[0];
  const h = g?.holes.find((x) => x.ref === r.holes[i].gref) || g?.holes[i];
  return h ? holeGeo(curCourse, h) : null;
}
function finishRound() {
  const r = db.activeRound, missing = r.holes.filter((h) => !h.strokes).length;
  if (missing && !confirm(`${missing} trou(s) sans score. Terminer quand même ?`)) return;
  r.complete = !missing;
  if (!r.mapped) db.courses[r.courseKey || r.course] = { holes: r.holes.map(({ par, hcp, dist: d }) => ({ par, hcp, dist: d })) };
  db.rounds.unshift(r); db.activeRound = null; curCourse = null; save(); releaseWake(); closePlay();
  toast(`Partie enregistrée : ${rStrokes(r)} (${toPar(rDiff(r))})`);
}
const markCls = (h) => (h.strokes ? 'm-' + scoreName(h.strokes, h.par)[1] : '');
function scorecardHTML(r, cur = -1) {
  const n = r.holes.length, halves = n === 18 ? [[0, 9, 'Aller'], [9, 18, 'Retour']] : [[0, n, 'Tot']];
  let head = '<th>Trou</th>', par = '<th>Par</th>', hcp = '<th>HCP</th>', sc = '<th>Score</th>', pu = '<th>Putts</th>';
  const hasHcp = r.holes.some((h) => h.hcp);
  for (const [a, b, lab] of halves) {
    for (let i = a; i < b; i++) {
      const h = r.holes[i], c = i === cur ? ' class="cur"' : '';
      head += `<td${c} data-a="hole" data-i="${i}">${i + 1}</td>`; par += `<td${c}>${h.par}</td>`; hcp += `<td${c}>${h.hcp || ''}</td>`;
      sc += `<td${c} data-a="hole" data-i="${i}"><span class="mark ${markCls(h)}">${h.strokes || ''}</span></td>`; pu += `<td${c}>${h.putts || ''}</td>`;
    }
    const part = r.holes.slice(a, b);
    head += `<td class="tot">${lab}</td>`; par += `<td class="tot">${sum(part, (h) => h.par)}</td>`; hcp += '<td class="tot"></td>';
    sc += `<td class="tot">${sum(part, (h) => h.strokes) || ''}</td>`; pu += `<td class="tot">${sum(part, (h) => h.putts) || ''}</td>`;
  }
  if (n === 18) { head += '<td class="tot">Total</td>'; par += `<td class="tot">${sum(r.holes, (h) => h.par)}</td>`; hcp += '<td class="tot"></td>'; sc += `<td class="tot">${rStrokes(r) || ''}</td>`; pu += `<td class="tot">${sum(r.holes, (h) => h.putts) || ''}</td>`; }
  return `<div class="sc-wrap"><table class="sc"><thead><tr>${head}</tr></thead><tbody><tr>${par}</tr>${hasHcp ? `<tr>${hcp}</tr>` : ''}<tr>${sc}</tr><tr>${pu}</tr></tbody></table></div>`;
}

/* ================= Plan GPS du trou ================= */
const SAT = { version: 8, sources: { sat: { type: 'raster', tileSize: 256, maxzoom: 19, attribution: 'Imagerie © Esri, Maxar · Plans © OpenStreetMap',
  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] } }, layers: [{ id: 'sat', type: 'raster', source: 'sat' }] };
let targetManual = false, lastOrigin = null;
let map = null, mapReady = false, mk = {}, target = null, geo = null, mapBearing = 0, arcLabels = [], shotLabels = [];
const fc = (features) => ({ type: 'FeatureCollection', features });
const lineF = (pts) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.map(LL) } });
const polyF = (poly, kind) => ({ type: 'Feature', properties: { kind }, geometry: { type: 'Polygon', coordinates: [poly.map(([a, b]) => [b, a])] } });
function el(cls, html = '') { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; }

async function openPlay() {
  if (!db.activeRound?.mapped) return;
  S.play = true; document.body.classList.add('playing'); $('#play').classList.add('on');
  await ensureCourse();
  if (!roundHoleData(S.hole)) { toast('Plan de ce golf indisponible'); closePlay(); return; }
  if (!map) initMap(); else { map.resize(); showHole(true); }
}
function closePlay() { S.play = false; document.body.classList.remove('playing'); $('#play').classList.remove('on'); render(); }
function initMap() {
  map = new maplibregl.Map({ container: 'map', style: SAT, center: LL(HOME), zoom: 16, attributionControl: false, dragRotate: false, pitchWithRotate: false, maxZoom: 20, fadeDuration: 0 });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-left');
  map.on('error', (e) => { if (!/tile|Failed to fetch|404/i.test(e.error?.message || '')) console.warn('map', e.error?.message); });
  const setup = () => {
    if (mapReady) return;
    map.addSource('feat', { type: 'geojson', data: fc([]) });
    map.addLayer({ id: 'feat-fill', type: 'fill', source: 'feat', paint: { 'fill-color': ['match', ['get', 'kind'], 'green', '#8ef09a', 'bunker', '#f6e7b0', 'water', '#5aa9e6', '#a6ec83'],
      'fill-opacity': ['match', ['get', 'kind'], 'green', 0.4, 'bunker', 0.3, 'water', 0.15, 0.1] } });
    map.addLayer({ id: 'feat-line', type: 'line', source: 'feat', filter: ['==', ['get', 'kind'], 'green'], paint: { 'line-color': '#eaffea', 'line-width': 2 } });
    map.addSource('arcs', { type: 'geojson', data: fc([]) });
    map.addLayer({ id: 'arcs', type: 'line', source: 'arcs', paint: { 'line-color': ['get', 'c'], 'line-width': 3.5, 'line-opacity': 0.95 }, layout: { 'line-cap': 'round' } });
    map.addSource('aim', { type: 'geojson', data: fc([]) });
    map.addLayer({ id: 'aim', type: 'line', source: 'aim', paint: { 'line-color': '#ffffff', 'line-width': 3 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
    map.addSource('shots', { type: 'geojson', data: fc([]) });
    map.addLayer({ id: 'shots', type: 'line', source: 'shots', paint: { 'line-color': '#ffd23f', 'line-width': 3, 'line-dasharray': [2, 1.5] } });
    mk.tee = new maplibregl.Marker({ element: el('mk-tee') }).setLngLat([0, 0]).addTo(map);
    mk.pin = new maplibregl.Marker({ element: el('mk-pin', I.flag), draggable: true }).setLngLat([0, 0]).addTo(map);
    mk.pin.on('dragend', () => { const l = mk.pin.getLngLat(), h = db.activeRound.holes[S.hole]; h.pin = { lat: +l.lat.toFixed(6), lon: +l.lng.toFixed(6) }; save(); updatePlay(); toast('Drapeau du jour placé', 'Au centre', () => { delete h.pin; save(); updatePlay(); }); });
    mk.me = new maplibregl.Marker({ element: el('mk-me') }).setLngLat([0, 0]).addTo(map);
    mk.target = new maplibregl.Marker({ element: el('mk-target', '<i></i><span class="lab"></span>'), draggable: true }).setLngLat([0, 0]).addTo(map);
    mk.target.on('drag', () => { const l = mk.target.getLngLat(); target = { lat: l.lat, lon: l.lng }; targetManual = true; drawAim(); });
    map.on('click', (e) => { target = { lat: e.lngLat.lat, lon: e.lngLat.lng }; targetManual = true; drawAim(); });
    mapReady = true; showHole(true);
  };
  // le style est intégré : on n'attend pas les tuiles satellite pour dessiner le trou
  const wait = () => (map.isStyleLoaded() ? setup() : setTimeout(wait, 60));
  map.on('load', setup); wait();
}
function origin() { // ma position si je suis sur ce trou, sinon le départ
  const near = S.pos && geo && (dist(S.pos, geo.tee) < 700 || dist(S.pos, geo.center) < 700);
  return near ? { p: S.pos, me: true } : { p: geo.tee, me: false };
}
function defaultTarget() {
  const h = db.activeRound.holes[S.hole], o = origin(), toPin = dist(o.p, pinOf());
  if (h.par === 3 || toPin < 230) return null;
  // Point d'atterrissage à ~210 m le long du tracé du trou
  const pts = [o.p, ...geo.line.filter((p) => dist(p, geo.center) < toPin)];
  let acc = 0; const want = Math.min(210, toPin * 0.6);
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (acc + seg >= want) return dest(pts[i - 1], bearing(pts[i - 1], pts[i]), want - acc);
    acc += seg;
  }
  return dest(o.p, bearing(o.p, geo.center), want);
}
function showHole(fit) {
  if (!mapReady) return;
  geo = roundHoleData(S.hole); if (!geo) return;
  mapBearing = bearing(geo.tee, geo.center);
  const feats = [];
  for (const [k, list] of [['fairway', curCourse.fairways], ['water', curCourse.water], ['bunker', curCourse.bunkers], ['green', curCourse.greens]])
    for (const p of list || []) if (p.length > 2 && dist(centroid(p), geo.center) < 700) feats.push(polyF(p, k));
  map.getSource('feat').setData(fc(feats));
  mk.pin.setLngLat(LL(geo.center)); mk.tee.setLngLat(LL(geo.tee));
  target = defaultTarget(); targetManual = false; lastOrigin = origin().p;
  if (fit) {
    const o = origin(), pts = [geo.tee, geo.center, ...geo.line, ...(o.me ? [o.p] : [])];
    const lons = pts.map((p) => p.lon), lats = pts.map((p) => p.lat);
    const cam = map.cameraForBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { bearing: mapBearing, padding: { top: 60, bottom: 60, left: 96, right: 120 } });
    if (cam) map.jumpTo({ ...cam, bearing: mapBearing, pitch: 0 });
  }
  updatePlay();
}
function arcCoords(c, b, m, span = 30) { const out = []; for (let a = -span; a <= span; a += 3) out.push(LL(dest(c, b + a, m))); return out; }
function drawAim() {
  if (!geo || !mapReady) return;
  const o = origin(), b = bearing(o.p, target || pinOf()), toPin = dist(o.p, pinOf());
  arcLabels.forEach((m) => m.remove()); arcLabels = [];
  const arcs = [];
  for (const m of [50, 100, 150, 200, 250]) {
    if (m >= toPin - 20) break;
    arcs.push({ type: 'Feature', properties: { c: m >= 150 ? '#3d7bff' : '#a9c6ff' }, geometry: { type: 'LineString', coordinates: arcCoords(o.p, b, m) } });
    if (!target || Math.abs(dist(o.p, target) - m) > 22) arcLabels.push(new maplibregl.Marker({ element: el('mk-arc', m) }).setLngLat(LL(dest(o.p, b, m))).addTo(map));
  }
  map.getSource('arcs').setData(fc(arcs));
  const tEl = mk.target.getElement();
  if (target) {
    map.getSource('aim').setData(fc([lineF([o.p, target, pinOf()])]));
    mk.target.setLngLat(LL(target)); tEl.style.display = '';
    $('.lab', tEl).innerHTML = `<small>${Math.round(dist(target, pinOf()))}<span class="up">${I.arrow}</span></small><b>${Math.round(dist(o.p, target))}</b>`;
  } else { map.getSource('aim').setData(fc([lineF([o.p, pinOf()])])); tEl.style.display = 'none'; }
  mk.pin.setLngLat(LL(pinOf()));
}
const pinOf = () => { const h = db.activeRound?.holes[S.hole]; return h?.pin || geo.center; };
function greenDistances(o) {
  if (!geo.green) return { front: null, center: dist(o, pinOf()), back: null };
  const b0 = bearing(o, pinOf());
  const proj = geo.green.map((p) => { const q = P(p); return dist(o, q) * Math.cos((bearing(o, q) - b0) * RAD); });
  return { front: Math.max(0, Math.min(...proj)), center: dist(o, pinOf()), back: Math.max(...proj) };
}
function updatePlay() {
  if (!S.play || !geo || !mapReady) return;
  const r = db.activeRound; if (!r) return;
  const h = r.holes[S.hole], o = origin();
  if (!targetManual && (!lastOrigin || dist(lastOrigin, o.p) > 15)) { target = defaultTarget(); lastOrigin = o.p; }
  mk.me.getElement().style.display = S.pos && o.me ? '' : 'none';
  if (S.pos && o.me) mk.me.setLngLat(LL(S.pos));
  const g = greenDistances(o.p), f = (x) => (x == null ? '—' : Math.round(x));
  $('#gd').innerHTML = `<div class="b">${I.arrow}<span>${f(g.back)}</span></div><div class="c">${I.flag}<span>${f(g.center)}</span></div><div class="f"><i style="transform:rotate(180deg)">${I.arrow}</i><span>${f(g.front)}</span></div>`;
  const w = S.weather && S.weather !== 'err' ? S.weather.current : null;
  $('#wind').innerHTML = w ? `<span class="arrow" style="transform:rotate(${(w.wind_direction_10m + 180 - mapBearing + 360) % 360}deg)">${I.arrow}</span><b>${Math.round(w.wind_speed_10m)}</b><small>km/h</small>` : '';
  $('#wind').style.display = w ? '' : 'none';
  $('#play-hole').innerHTML = `<small>TROU</small> ${S.hole + 1}`;
  $('#play-info').innerHTML = `Par <b>${h.par}</b>${h.hcp ? ' · HCP <b>' + h.hcp + '</b>' : ''} · <b>${Math.round(dist(geo.tee, geo.center))}</b> m`;
  const status = !S.pos ? 'Recherche du GPS…' : o.me ? `GPS ± ${Math.round(S.pos.acc || 0)} m` : 'Pas sur ce trou · distances depuis le départ';
  $('#play-status').innerHTML = `${esc(r.course)}${r.group ? ' · ' + esc(r.group) : ''} · <span class="${o.me ? 'ok' : 'off'}">${status}</span>`;
  const n = r.holes.length;
  $('#pv-prev').innerHTML = S.hole > 0 ? `‹ #${S.hole}` : '‹';
  $('#pv-prev').disabled = S.hole === 0;
  $('#pv-next').innerHTML = S.hole + 1 >= n ? 'Fin ›' : `#${S.hole + 2} ›`;
  $('#pv-score').innerHTML = h.strokes ? `Trou ${S.hole + 1} : ${h.strokes} <small>(${played(r).length ? toPar(rDiff(r)) : 'E'})</small>` : `Saisir le score <small>(${played(r).length ? toPar(rDiff(r)) : 'E'})</small>`;
  // Coups joués sur ce trou
  shotLabels.forEach((m) => m.remove()); shotLabels = [];
  const shots = h.shots || [], pts = shots.map((s) => ({ lat: s.lat, lon: s.lon }));
  if (pts.length && S.pos && o.me) pts.push(S.pos);
  map.getSource('shots').setData(fc(pts.length > 1 ? [lineF(pts)] : []));
  shots.forEach((s, i) => {
    const next = pts[i + 1], d = next ? Math.round(dist(s, next)) : null;
    shotLabels.push(new maplibregl.Marker({ element: el('mk-shot', `<i>${i + 1}</i>${d ? `<span>${d} m</span>` : ''}`) }).setLngLat([s.lon, s.lat]).addTo(map));
  });
  const ls = $('#last-shot');
  ls.innerHTML = shots.length && S.pos && o.me ? `Coup ${shots.length} : <b>${Math.round(dist(shots[shots.length - 1], S.pos))} m</b> · reste <b>${Math.round(dist(S.pos, pinOf()))} m</b>` : '';
  ls.style.display = ls.innerHTML ? '' : 'none';
  $('#btn-motion').classList.toggle('on', motionOn);
  $('#btn-shot span').textContent = shots.length ? `Coup ${shots.length + 1}` : 'Coup';
  drawAim();
}
function addShot(auto = false) {
  const h = db.activeRound?.holes[S.hole];
  if (!h) return;
  if (!S.pos) return toast('Position GPS pas encore trouvée');
  (h.shots ||= []).push({ lat: +S.pos.lat.toFixed(6), lon: +S.pos.lon.toFixed(6), t: Date.now(), auto });
  save(); updatePlay();
  if (navigator.vibrate) navigator.vibrate(60);
  toast(`${auto ? 'Swing détecté · ' : ''}Coup ${h.shots.length} enregistré${S.pos.acc > 25 ? ` (GPS ± ${Math.round(S.pos.acc)} m)` : ''}`, 'Annuler', () => { h.shots.pop(); save(); updatePlay(); });
}
function goHole(i) {
  const r = db.activeRound, n = r.holes.length;
  if (i >= n) { if (played(r).length) { if (confirm('Terminer la partie ?')) finishRound(); } else toast('Saisissez au moins un score'); return; }
  S.hole = Math.max(0, i); showHole(true);
}

/* Détection des coups par les capteurs de l'iPhone (accéléromètre + gyroscope) */
let motionOn = false, lastSwing = 0, peak = [];
async function toggleMotion() {
  if (motionOn) { window.removeEventListener('devicemotion', onMotion); motionOn = false; db.settings.motion = false; save(); updatePlay(); toast('Détection automatique désactivée'); return; }
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      if ((await DeviceMotionEvent.requestPermission()) !== 'granted') return toast('Autorisez « Mouvement et orientation »');
    }
  } catch { return toast('Capteurs non disponibles'); }
  window.addEventListener('devicemotion', onMotion); motionOn = true; db.settings.motion = true; save(); updatePlay();
  toast('Détection des swings activée : iPhone en poche, app ouverte');
}
function onMotion(e) {
  const r = e.rotationRate || {}, a = e.acceleration || {};
  const rot = Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0); // °/s
  const acc = Math.hypot(a.x || 0, a.y || 0, a.z || 0); // m/s² hors gravité
  const now = Date.now();
  // Un swing = forte rotation du bassin ET pic d'accélération dans la même demi-seconde, à l'arrêt
  peak = peak.filter((p) => now - p.t < 500); peak.push({ t: now, rot, acc });
  if (now - lastSwing < 20000 || !S.play || (S.pos?.speed || 0) > 1.5) return;
  if (Math.max(...peak.map((p) => p.rot)) > 300 && Math.max(...peak.map((p) => p.acc)) > 14) { lastSwing = now; peak = []; addShot(true); }
}


/* ================= Viseur caméra : réalité augmentée + télémètre ================= */
// Réalité augmentée : GPS + boussole + inclinaison placent le drapeau sur l'image de la caméra.
// Télémètre : un mât de drapeau mesure 2,13 m ; sa hauteur à l'écran donne la distance.
const FLAG_H = 2.13;
const V = { stream: null, heading: null, pitch: 90, raf: 0, top: 0.38, bottom: 0.62, zoom: 1 };
async function openViseur() {
  if (!geo) return;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function')
      await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
  } catch {}
  try { V.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
  catch { return toast('Caméra non autorisée'); }
  const vs = $('#viseur'); vs.classList.add('on');
  const v = $('#vs-video'); v.srcObject = V.stream; v.play().catch(() => {});
  window.addEventListener('deviceorientation', onOrient, true);
  V.top = 0.38; V.bottom = 0.62; setZoom(1); loopViseur();
}
function closeViseur() {
  cancelAnimationFrame(V.raf); window.removeEventListener('deviceorientation', onOrient, true);
  V.stream?.getTracks().forEach((t) => t.stop()); V.stream = null; $('#viseur').classList.remove('on');
}
function onOrient(e) {
  let hd = null;
  if (typeof e.webkitCompassHeading === 'number') hd = e.webkitCompassHeading; // iPhone
  else if (e.absolute && e.alpha != null) hd = (360 - e.alpha) % 360;
  if (hd != null) V.heading = V.heading == null ? hd : V.heading + (((hd - V.heading + 540) % 360) - 180) * 0.25; // lissage
  if (e.beta != null) V.pitch = e.beta;
}
function focalPx() { // focale en pixels à l'écran (caméra principale 1x, ~67° sur le grand côté du capteur)
  const v = $('#vs-video'), ew = v.clientWidth, eh = v.clientHeight, vw = v.videoWidth || 1080, vh = v.videoHeight || 1920;
  const sc = Math.max(ew / vw, eh / vh);
  return ((Math.max(vw, vh) * sc) / 2 / Math.tan((67 * RAD) / 2)) * V.zoom;
}
function placeLines() {
  const h = $('#viseur').clientHeight;
  $('#vs-top').style.top = V.top * h + 'px'; $('#vs-bot').style.top = V.bottom * h + 'px';
  const gap = Math.abs(V.bottom - V.top) * h, d = (FLAG_H * focalPx()) / Math.max(gap, 1);
  $('#vs-range').innerHTML = gap > 6 ? `<small>Télémètre</small><b>${Math.round(d)} m</b>` : '';
}
function loopViseur() {
  V.raf = requestAnimationFrame(loopViseur);
  const o = S.pos || origin().p, pin = pinOf(), d = dist(o, pin);
  $('#vs-gps').innerHTML = `<small>Drapeau (GPS)</small><b>${Math.round(d)} m</b>`;
  const mkEl = $('#vs-flag'), arrow = $('#vs-dir'), W = $('#viseur').clientWidth, H = $('#viseur').clientHeight, f = focalPx();
  if (V.heading == null) { mkEl.style.display = 'none'; arrow.textContent = 'Tournez l\'iPhone vers le green (boussole en calibrage…)'; arrow.style.display = ''; return; }
  const rel = ((bearing(o, pin) - V.heading + 540) % 360) - 180; // angle drapeau / axe de la caméra
  const elev = (V.pitch - 90) * RAD; // caméra relevée = beta > 90
  const x = W / 2 + Math.tan(rel * RAD) * f, y = H / 2 + Math.tan(elev) * f;
  if (Math.abs(rel) < 60 && x > -40 && x < W + 40) {
    mkEl.style.display = ''; mkEl.style.transform = `translate(${x}px, ${y}px)`; $('b', mkEl).textContent = Math.round(d) + ' m';
    arrow.style.display = 'none';
  } else { mkEl.style.display = 'none'; arrow.style.display = ''; arrow.textContent = rel > 0 ? 'Le drapeau est à droite →' : '← Le drapeau est à gauche'; }
}
function setZoom(z) {
  V.zoom = z; $('#vs-video').style.transform = `scale(${z})`;
  $$('#vs-zoom button').forEach((b) => b.classList.toggle('on', +b.dataset.z === z)); placeLines();
}
document.addEventListener('click', (e) => { const b = e.target.closest('#vs-zoom button'); if (b) setZoom(+b.dataset.z); });
let dragLine = null;
document.addEventListener('pointerdown', (e) => { const l = e.target.closest('.vs-line'); if (l) { dragLine = l.id; l.setPointerCapture?.(e.pointerId); e.preventDefault(); } });
document.addEventListener('pointermove', (e) => {
  if (!dragLine) return;
  const r = $('#viseur').getBoundingClientRect(), y = Math.min(0.97, Math.max(0.03, (e.clientY - r.top) / r.height));
  if (dragLine === 'vs-top') V.top = y; else V.bottom = y; placeLines();
});
document.addEventListener('pointerup', () => { dragLine = null; });

/* ================= Vues ================= */
const TABS = [['today', 'Aujourd\'hui', 'today'], ['round', 'Partie', 'flag'], ['swing', 'Swing', 'video'], ['journal', 'Journal', 'train'], ['signets', 'Signets', 'bookmark']];
function renderTabbar() { $('#tabbar').innerHTML = TABS.map(([k, l, ic]) => `<button data-a="tab" data-t="${k}" class="${S.tab === k ? 'on' : ''}">${I[ic]}<span>${l}</span></button>`).join(''); }
function go(tab) {
  if (tab === 'signets') { location.href = 'signets/'; return; }
  if (S.tab === 'swing' && tab !== 'swing') stopCam();
  S.tab = tab; if (!S.play) { render(); window.scrollTo(0, 0); }
}
const header = (title, eyebrow = '', right = '') => `<header class="lt"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1></div>${right}</header>`;
const tiles = (arr) => `<div class="tiles">${arr.map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
const kmTxt = (m) => (m < 800 ? 'Vous y êtes' : (m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',') + ' km');
function courseRow(c) {
  return `<button class="row" data-a="pick" data-id="${c.id}"><div class="ic">${I.flag}</div><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${[c.city, kmTxt(c.d)].filter(Boolean).map(esc).join(' · ')}</div></div>${c.mapped >= 9 ? '<span class="pill acc">Plan GPS</span>' : ''}${I.chev}</button>`;
}
function vToday() {
  const r = db.activeRound, full = db.rounds.filter((x) => x.complete && x.holes.length === 18);
  const best = full.length ? Math.min(...full.map(rStrokes)) : '—';
  let callout = '';
  if (r) callout = `<button class="card callout row" data-a="resume" style="margin-top:12px"><div class="badge">${I.flag}</div><div class="main"><div class="t">Partie en cours</div><div class="s">${esc(r.course)} · ${played(r).length}/${r.holes.length} trous · ${played(r).length ? toPar(rDiff(r)) : 'E'}</div></div>${I.chev}</button>`;
  else if (S.here) callout = `<button class="card callout row" data-a="pick" data-id="${S.here.id}" style="margin-top:12px"><div class="badge">${I.pin}</div><div class="main"><div class="t">Vous êtes à ${esc(S.here.name)}</div><div class="s">Touchez pour jouer avec le plan GPS</div></div>${I.chev}</button>`;
  const near = sortedCourses().slice(0, 4), month = isoDay().slice(0, 7);
  return header('Aujourd\'hui', fmtDay(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }), `<button class="icon-btn" data-a="settings" aria-label="Réglages">${I.gear}</button>`)
    + heroHTML() + callout
    + `<h2 class="sec">Golfs près de ${S.pos ? 'vous' : 'Luzarches'} <button data-a="tab" data-t="round">Tous</button></h2><div class="group">${near.map(courseRow).join('') || `<div class="empty">${S.index ? 'Base des golfs en cours de création…' : '<span class="spin"></span>'}</div>`}</div>`
    + `<h2 class="sec">Ma saison</h2>` + tiles([[best, 'Meilleur score 18 trous'], [db.rounds.length, 'Parties jouées'],
      [(sum(db.sessions.filter((s) => s.date.startsWith(month)), (s) => s.duration) / 60).toFixed(1).replace('.', ',') + ' h', 'Entraînement ce mois-ci']]);
}
function roundRow(x) {
  const d = rDiff(x);
  return `<button class="row" data-a="view-round" data-id="${x.id}"><div class="ic">${I.flag}</div><div class="main"><div class="t">${esc(x.course)}</div><div class="s">${fmtDay(x.date, { day: 'numeric', month: 'long', year: 'numeric' })} · ${played(x).length} trous</div></div>
    <span class="v"><b style="color:var(--text)">${rStrokes(x)}</b> <span class="round-badge ${d < 0 ? 'u' : d > 0 ? 'o' : ''}">${toPar(d)}</span></span>${I.chev}</button>`;
}
function holeEditor(r, h) {
  const [nm, cls] = scoreName(h.strokes, h.par);
  return `<div class="hole-top"><div class="hole-no"><small>Trou</small><b>${S.hole + 1}</b></div>
      <div class="hole-info"><span class="pill acc">Par ${h.par}</span>${h.hcp ? `<span class="pill">HCP ${h.hcp}</span>` : ''}${h.dist ? `<span class="pill">${h.dist} m</span>` : ''}${h.shots?.length ? `<span class="pill">${h.shots.length} coup${h.shots.length > 1 ? 's' : ''} GPS</span>` : ''}</div></div>
    <div class="stepper"><button class="pm" data-a="st" data-d="-1" aria-label="Moins">−</button>
      <button class="val" data-a="st-par"><b class="${h.strokes ? 'n-' + cls : 'ghost'}">${h.strokes || h.par}</b><span>${h.strokes ? nm : 'Touchez = par'}</span></button>
      <button class="pm" data-a="st" data-d="1" aria-label="Plus">+</button></div>
    <div class="lbl-sm">Putts</div>
    <div class="stepper sm"><button class="pm" data-a="pu" data-d="-1">−</button><div class="val"><b>${h.putts}</b></div><button class="pm" data-a="pu" data-d="1">+</button></div>
    ${r.mapped ? '' : `<div class="lbl-sm">Par du trou</div><div class="seg">${[3, 4, 5].map((p) => `<button data-a="par" data-v="${p}" class="${h.par === p ? 'on' : ''}">Par ${p}</button>`).join('')}</div>`}`;
}
function vRound() {
  const r = db.activeRound;
  if (!r) {
    const ph = db.rounds.flatMap(played);
    return header('Partie')
      + `<div class="search">${I.search}<input type="search" id="q" placeholder="Rechercher un golf" value="${esc(S.search)}" autocomplete="off"></div>`
      + `<div id="courses">${courseListHTML()}</div>`
      + `<div class="btns"><button class="btn gray" data-a="free-round">${I.plus}Partie sur un autre golf</button></div>`
      + (db.rounds.length ? `<h2 class="sec">Statistiques</h2>` + tiles([[db.rounds.length, 'Parties'], [ph.length ? (sum(ph, (h) => h.putts) / ph.length).toFixed(1).replace('.', ',') : '—', 'Putts par trou'],
        [ph.length ? '+' + (sum(ph, (h) => h.strokes - h.par) / ph.length).toFixed(1).replace('.', ',') : '—', 'Moyenne / par par trou']]) : '')
      + `<h2 class="sec">Historique</h2><div class="group">${db.rounds.map(roundRow).join('') || '<div class="empty">Aucune partie pour l\'instant.</div>'}</div>`;
  }
  const thru = played(r).length;
  return header(esc(r.course), 'Partie en cours', `<button class="icon-btn" data-a="round-menu" aria-label="Options">${I.gear}</button>`)
    + (r.mapped ? `<button class="btn" data-a="open-play" style="margin-bottom:12px">${I.target}Ouvrir le plan GPS</button>` : '')
    + `<div class="card score-head"><div><b>${rStrokes(r) || '—'}</b><span>Score</span></div><div><b class="${thru ? (rDiff(r) < 0 ? 'n-birdie' : rDiff(r) > 0 ? 'n-bogey' : 'n-par') : ''}">${thru ? toPar(rDiff(r)) : '—'}</b><span>Par</span></div><div><b>${thru}/${r.holes.length}</b><span>Trous</span></div></div>`
    + `<div class="card hole mt" id="holecard">${holeEditor(r, r.holes[S.hole])}</div>
      <div class="hole-nav"><button class="btn gray" data-a="prev">‹ Trou ${((S.hole - 1 + r.holes.length) % r.holes.length) + 1}</button><button class="btn" data-a="next">Trou ${((S.hole + 1) % r.holes.length) + 1} ›</button></div>
      <h2 class="sec">Carte de score</h2>${scorecardHTML(r, S.hole)}
      ${r.mapped ? '<p class="foot">Plan, pars et handicaps : © contributeurs OpenStreetMap.</p>' : '<p class="foot">Indiquez le par de chaque trou : il sera mémorisé pour vos prochaines parties.</p>'}
      <div class="btns"><button class="btn" data-a="finish">Terminer la partie</button></div>`;
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function courseListHTML() {
  if (!S.index) return '<h2 class="sec">Golfs</h2><div class="group"><div class="empty"><span class="spin"></span></div></div>';
  const q = norm(S.search.trim());
  let list = sortedCourses();
  if (q) list = list.filter((c) => norm(c.name + ' ' + c.city).includes(q));
  let body = list.slice(0, q ? 40 : 80).map(courseRow).join('');
  if (!body) body = S.index.length ? '<div class="empty">Aucun golf de la base ne correspond.</div>' : '<div class="empty">La base des golfs est en cours de création. Revenez dans quelques minutes.</div>';
  let extra = '';
  if (q.length >= 3 && Array.isArray(S.photon) && S.photon.length) extra = `<h2 class="sec">Ailleurs en France</h2><div class="group">${S.photon.map((c) => `<button class="row" data-a="free-named" data-name="${esc(c.name)}"><div class="ic" style="background:var(--text3)">${I.flag}</div><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.city)} · carte de score seule</div></div>${I.chev}</button>`).join('')}</div>`;
  return `<h2 class="sec">${q ? 'Résultats' : 'Golfs autour de Luzarches (50 km)'}</h2><div class="group">${body}</div>${extra}`;
}
let photonT;
function searchPhoton(q) {
  clearTimeout(photonT); S.photon = null;
  if (q.trim().length < 3) return;
  photonT = setTimeout(async () => {
    try {
      const u = new URL('https://photon.komoot.io/api/'), p = ref();
      Object.entries({ q, osm_tag: 'leisure:golf_course', limit: 8, lang: 'fr', lat: p.lat, lon: p.lon }).forEach(([k, v]) => u.searchParams.set(k, v));
      const j = await (await fetch(u)).json(), known = new Set((S.index || []).map((c) => c.id));
      S.photon = j.features.map((f) => ({ id: (f.properties.osm_type || '').toLowerCase() + f.properties.osm_id, name: f.properties.name, city: f.properties.city || f.properties.state || '' }))
        .filter((c) => c.name && !known.has(c.id));
      if ($('#courses') && S.search === q) $('#courses').innerHTML = courseListHTML();
    } catch {}
  }, 450);
}
function vSwing() {
  return header('Swing', '', `<label class="icon-btn" aria-label="Importer une vidéo">${I.upload}<input type="file" id="swing-file" accept="video/*" hidden></label>`)
    + `<div class="cam" id="cam">${S.cam ? '<video id="preview" playsinline muted autoplay></video>' : `<div class="ph">${I.cam}<div>Posez le téléphone à hauteur de hanches,<br>face à vous ou dans l'axe de la cible.</div><button class="btn small" data-a="cam-on">Activer la caméra</button></div>`}
       ${S.cam ? `<button class="icon-btn close" data-a="cam-off" aria-label="Fermer">${I.x}</button><button class="shutter ${S.rec ? 'rec' : ''}" data-a="rec" aria-label="Enregistrer"></button>${S.rec ? '<div class="timer" id="timer">0:00</div>' : ''}` : ''}</div>`
    + `<h2 class="sec">Mes swings</h2><div class="group" id="swings">${swingsHTML()}</div>`;
}
function swingsHTML() {
  return S.swings.map((s) => `<div class="row"><button class="ic" style="border:0;background:#111" data-a="play-swing" data-id="${s.id}">${I.play}</button><button class="main" style="border:0;background:none;text-align:left;padding:0;color:inherit" data-a="play-swing" data-id="${s.id}"><div class="t">Swing du ${new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div><div class="s">${new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div></button><button class="del" data-a="del-swing" data-id="${s.id}" aria-label="Supprimer">${I.trash}</button></div>`).join('')
    || '<div class="empty">Filmez votre swing pour le revoir au ralenti.</div>';
}
const FEEL = ['', '😣', '😕', '😐', '🙂', '🤩'];
const SESSION_TYPES = ['Practice', 'Putting', 'Petit jeu', 'Bunker', 'Parcours', 'Physique'];
const SESSION_COLORS = { Practice: '#0b7a4b', Putting: '#1f6fe0', 'Petit jeu': '#b8912f', Bunker: '#c47a2c', Parcours: '#2d8a5b', Physique: '#e0312b' };
function sessionRow(s) {
  return `<div class="row"><div class="ic" style="background:${SESSION_COLORS[s.type] || 'var(--accent)'}">${I.train}</div><div class="main"><div class="t">${esc(s.type)} · ${s.duration} min ${FEEL[s.feeling] || ''}</div><div class="s">${fmtDay(s.date, { day: 'numeric', month: 'long' })}${s.notes ? ' — ' + esc(s.notes) : ''}</div></div><button class="del" data-a="del-session" data-id="${s.id}" aria-label="Supprimer">${I.trash}</button></div>`;
}
function vJournal() {
  const month = isoDay().slice(0, 7), ms = db.sessions.filter((s) => s.date.startsWith(month));
  return header('Journal', '', `<button class="icon-btn" data-a="new-session" aria-label="Nouvelle séance">${I.plus}</button>`)
    + `<h2 class="sec" style="margin-top:4px">Ce mois-ci</h2>` + tiles([[ms.length, 'Séances'], [(sum(ms, (s) => s.duration) / 60).toFixed(1).replace('.', ',') + ' h', 'Temps total'], [ms.length ? FEEL[Math.round(sum(ms, (s) => s.feeling) / ms.length)] : '—', 'Ressenti moyen']])
    + `<div class="btns"><button class="btn" data-a="new-session">${I.plus}Nouvelle séance</button></div>`
    + `<h2 class="sec">Historique</h2><div class="group">${db.sessions.map(sessionRow).join('') || '<div class="empty">Aucune séance enregistrée.</div>'}</div>`;
}
function render() {
  renderTabbar();
  const v = { today: vToday, round: vRound, swing: vSwing, journal: vJournal }[S.tab] || vToday;
  $('#view').innerHTML = v();
  if (S.tab === 'swing' && S.cam) $('#preview').srcObject = S.cam;
}

/* ================= Feuilles ================= */
function sheetSettings() {
  openSheet(sheetHead('Réglages', '', 'OK')
    + `<div class="gh">Au golf</div><div class="group plain">
        <div class="field"><label for="o-auto">Ouvrir le plan GPS en arrivant au golf</label><span class="switch"><input type="checkbox" id="o-auto" ${db.settings.auto ? 'checked' : ''}><span></span></span></div>
        <div class="field"><label for="o-wake">Garder l'écran allumé en partie</label><span class="switch"><input type="checkbox" id="o-wake" ${db.settings.wake ? 'checked' : ''}><span></span></span></div></div>
      <div class="gh">Mes données</div><div class="group plain">
        <button class="row" data-a="export"><div class="main"><div class="t" style="color:var(--accent)">Exporter une sauvegarde</div></div></button>
        <label class="row"><div class="main"><div class="t" style="color:var(--accent)">Restaurer une sauvegarde</div></div><input type="file" id="import" accept="application/json,.json" hidden></label></div>
      <p class="foot">Tout reste sur votre téléphone. Base de ${S.index?.length || 0} golfs, mise à jour chaque mois depuis OpenStreetMap.</p>
      <p class="foot">Météo : Open-Meteo · Satellite : Esri · Plans des golfs : © contributeurs OpenStreetMap.</p>`);
  $('#o-auto').onchange = (e) => { db.settings.auto = e.target.checked; save(); };
  $('#o-wake').onchange = (e) => { db.settings.wake = e.target.checked; save(); e.target.checked ? keepAwake() : releaseWake(); };
  $('#import').onchange = importData;
}
async function sheetCourse(entry) {
  openSheet(sheetHead(esc(entry.name)) + `<div class="card pad" id="ci" style="text-align:center"><span class="spin"></span></div>`);
  let course = null;
  try { course = await loadCourse(entry); } catch {}
  if (!$('#ci')) return;
  const groups = course ? holeGroups(course).filter((g) => g.holes.filter((h) => h.par).length >= Math.min(9, g.holes.length)) : [];
  let gi = 0, n = 18;
  const draw = () => {
    const g = groups[gi];
    $('#ci').outerHTML = `<div id="ci">${groups.length > 1 ? `<div class="seg" style="margin-bottom:12px">${groups.map((x, i) => `<button data-g="${i}" class="${i === gi ? 'on' : ''}">${esc(x.name || 'Parcours ' + (i + 1))}</button>`).join('')}</div>` : ''}
      ${g ? `<div class="card pad"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:20px">${g.holes.length} trous · Par ${sum(g.holes, (h) => h.par || 4)}</b><span class="pill acc">Plan GPS</span></div></div>
         <div class="mt">${scorecardHTML({ holes: g.holes.map((h) => ({ par: h.par || 4, hcp: h.hcp, strokes: 0, putts: 0 })) })}</div>`
      : `<div class="card pad"><b>Plan des trous pas encore disponible</b><div class="muted mt" style="font-size:15px">Ce golf n'a pas encore ses trous dans OpenStreetMap : vous aurez la carte de score (pars à saisir une fois, puis mémorisés).</div>
         <div class="seg mt" id="nh"><button data-n="9">9 trous</button><button class="on" data-n="18">18 trous</button></div></div>`}
      <div class="btns"><button class="btn" id="go">${g ? I.target + 'Jouer avec le plan GPS' : 'Commencer la partie'}</button>
        <a class="btn gray" href="https://maps.apple.com/?daddr=${entry.lat},${entry.lon}&q=${encodeURIComponent(entry.name)}" target="_blank" rel="noopener">${I.nav}Itinéraire</a></div></div>`;
    $$('#ci [data-g]').forEach((b) => (b.onclick = () => { gi = +b.dataset.g; draw(); }));
    $$('#nh button').forEach((b) => (b.onclick = () => { n = +b.dataset.n; $$('#nh button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#go').onclick = () => { startRound(entry, course, g || null, n); closeSheet(); go('round'); if (g) openPlay(); };
  };
  draw();
}
function sheetFreeRound(name = '') {
  openSheet(sheetHead('Partie', 'data-a="free-go">Commencer', 'Annuler')
    + `<div class="group plain"><div class="field"><label>Golf</label><input id="fr-name" placeholder="Nom du golf" value="${esc(name)}"></div>
       <div class="field"><label>Trous</label><div class="seg" id="fr-n" style="width:170px"><button data-n="9">9</button><button class="on" data-n="18">18</button></div></div></div>
       <p class="foot">Sans plan GPS : carte de score uniquement.</p>`);
  $$('#fr-n button').forEach((b) => (b.onclick = () => $$('#fr-n button').forEach((x) => x.classList.toggle('on', x === b))));
}
function sheetScore() {
  const r = db.activeRound, h = r.holes[S.hole];
  if (!h.strokes && h.shots?.length) h.strokes = h.shots.length + h.putts;
  openSheet(sheetHead(`Trou ${S.hole + 1}`, `data-a="score-next">${S.hole + 1 < r.holes.length ? 'Trou suivant' : 'Terminer'}`, 'OK') + `<div class="card hole" id="holecard">${holeEditor(r, h)}</div>
    <h2 class="sec">Carte de score</h2>${scorecardHTML(r, S.hole)}
    <div class="btns"><button class="btn gray" data-a="round-menu">Options de la partie</button></div>`, () => updatePlay());
}
function refreshScore() {
  if ($('#sheet.on #holecard')) { const r = db.activeRound; $('#holecard').innerHTML = holeEditor(r, r.holes[S.hole]); $('#sheet .sc-wrap').outerHTML = scorecardHTML(r, S.hole); }
  else render();
}
function sheetSession() {
  openSheet(sheetHead('Nouvelle séance', 'data-a="session-save">Ajouter', 'Annuler')
    + `<div class="group plain"><div class="field col" style="padding-top:12px;padding-bottom:12px"><div class="seg" id="ss-type" style="grid-auto-flow:row;grid-template-columns:repeat(3,1fr)">${SESSION_TYPES.map((t, i) => `<button type="button" data-v="${t}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div></div></div>
     <div class="group plain mt"><div class="field"><label>Date</label><input type="date" id="ss-date" value="${isoDay()}"></div>
       <div class="field"><label>Durée</label><select id="ss-dur">${[15, 30, 45, 60, 90, 120, 180, 240].map((v) => `<option value="${v}" ${v === 60 ? 'selected' : ''}>${v < 60 ? v + ' min' : Math.floor(v / 60) + ' h' + (v % 60 ? ' ' + (v % 60) : '')}</option>`).join('')}</select></div></div>
     <div class="gh">Ressenti</div><div class="group plain"><div class="days" id="ss-feel">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-v="${v}" class="${v === 3 ? 'on' : ''}" style="font-size:22px;width:52px;height:52px">${FEEL[v]}</button>`).join('')}</div></div>
     <div class="group plain mt"><div class="field col"><textarea id="ss-notes" placeholder="Ce que j'ai travaillé, ce qui marche…"></textarea></div></div>`);
  const single = (sel) => $$(sel + ' button').forEach((b) => (b.onclick = () => $$(sel + ' button').forEach((x) => x.classList.toggle('on', x === b))));
  single('#ss-type'); single('#ss-feel');
}
function sheetPlayer(id) {
  const s = S.swings.find((x) => x.id === id); if (!s) return;
  const url = URL.createObjectURL(s.blob);
  openSheet(sheetHead('Swing') + `<div class="player"><video id="pv" src="${url}" playsinline controls autoplay muted loop></video></div>
       <div class="seg mt" id="rate">${[[0.25, '×¼'], [0.5, '×½'], [1, '×1']].map(([v, l]) => `<button data-v="${v}" class="${v === 0.5 ? 'on' : ''}">${l}</button>`).join('')}</div>
       <div class="btns two"><button class="btn gray" id="fb">‹ Image</button><button class="btn gray" id="ff">Image ›</button></div>`, () => URL.revokeObjectURL(url));
  const v = $('#pv'); v.playbackRate = 0.5; v.onloadedmetadata = () => (v.playbackRate = 0.5);
  $$('#rate button').forEach((b) => (b.onclick = () => { v.playbackRate = +b.dataset.v; v.play(); $$('#rate button').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#fb').onclick = () => { v.pause(); v.currentTime = Math.max(0, v.currentTime - 1 / 30); };
  $('#ff').onclick = () => { v.pause(); v.currentTime += 1 / 30; };
}
function sheetRoundView(r) {
  openSheet(sheetHead(esc(r.course)) + `<div class="card score-head"><div><b>${rStrokes(r)}</b><span>Score</span></div><div><b>${toPar(rDiff(r))}</b><span>Par</span></div><div><b>${sum(r.holes, (h) => h.putts)}</b><span>Putts</span></div></div>
       <p class="foot" style="text-align:center;margin-bottom:12px">${fmtDay(r.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>${scorecardHTML(r)}
       <div class="btns"><button class="btn danger" data-a="del-round" data-id="${r.id}">Supprimer la partie</button></div>`);
}
function sheetRoundMenu() {
  openSheet(sheetHead('Partie en cours') + `<div class="group plain"><button class="row" data-a="finish"><div class="main"><div class="t" style="color:var(--accent)">Terminer et enregistrer</div></div></button>
       <button class="row" data-a="abandon"><div class="main"><div class="t" style="color:var(--red)">Abandonner la partie</div></div></button></div>`);
}

/* ================= Caméra ================= */
async function camOn() {
  try { S.cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', frameRate: { ideal: 60 }, height: { ideal: 1080 } }, audio: false }); render(); }
  catch { toast('Caméra non autorisée. Utilisez ⬆ pour importer une vidéo.'); }
}
function stopCam() { if (S.rec) S.rec.stop(); S.cam?.getTracks().forEach((t) => t.stop()); S.cam = null; }
let timerI;
function toggleRec() {
  if (S.rec) { S.rec.stop(); return; }
  if (!window.MediaRecorder) return toast('Enregistrement impossible ici : importez une vidéo.');
  const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
  const chunks = [], rec = new MediaRecorder(S.cam, mime ? { mimeType: mime } : undefined);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => { clearInterval(timerI); S.rec = null; saveSwing(new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' })); if (S.tab === 'swing') render(); };
  rec.start(); S.rec = rec; S.recStart = Date.now(); render();
  timerI = setInterval(() => { const t = $('#timer'), s = Math.floor((Date.now() - S.recStart) / 1000); if (t) t.textContent = `${Math.floor(s / 60)}:${pad2(s % 60)}`; }, 250);
}
async function saveSwing(blob) {
  try { const s = { id: uid(), date: new Date().toISOString(), blob }; await vPut(s); await loadSwings(); toast('Swing enregistré'); sheetPlayer(s.id); }
  catch { toast('Espace insuffisant pour la vidéo'); }
}
async function loadSwings() { try { S.swings = (await vAll()).sort((a, b) => b.date.localeCompare(a.date)); } catch { S.swings = []; } if ($('#swings')) $('#swings').innerHTML = swingsHTML(); }

/* ================= Écran allumé & sauvegarde ================= */
let wakeLock = null;
async function keepAwake() { if (!db.settings.wake || !db.activeRound || !('wakeLock' in navigator)) return; try { wakeLock = await navigator.wakeLock.request('screen'); } catch {} }
function releaseWake() { wakeLock?.release?.(); wakeLock = null; }
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `mon-golf-${isoDay()}.json`; a.click();
}
async function importData(e) {
  const f = e.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
    localStorage.setItem(KEY, JSON.stringify(d)); load(); save(); closeSheet(); render(); toast('Sauvegarde restaurée'); }
  catch { toast('Fichier invalide'); }
}

/* ================= Actions ================= */
const cur = () => db.activeRound.holes[S.hole];
const A = {
  tab: (b) => go(b.dataset.t),
  close: closeSheet,
  settings: sheetSettings,
  export: exportData,
  pick: (b) => { const c = S.index?.find((x) => x.id === b.dataset.id); if (!c) return; if (db.activeRound) { go('round'); return toast('Une partie est déjà en cours'); } sheetCourse(c); },
  resume: () => { go('round'); if (db.activeRound.mapped) openPlay(); },
  'free-round': () => sheetFreeRound(),
  'free-named': (b) => sheetFreeRound(b.dataset.name),
  'free-go': () => { const n = +($('#fr-n button.on')?.dataset.n || 18), name = $('#fr-name').value.trim() || 'Parcours'; startRound({ name }, null, null, n); closeSheet(); go('round'); },
  'open-play': openPlay,
  'close-play': closePlay,
  'round-menu': sheetRoundMenu,
  st: (b) => { const h = cur(), d = +b.dataset.d; h.manual = true; h.strokes = h.strokes ? Math.max(1, Math.min(15, h.strokes + d)) : Math.max(1, h.par + d); if (h.putts >= h.strokes) h.putts = Math.max(0, h.strokes - 1); save(); refreshScore(); },
  'st-par': () => { const h = cur(); h.manual = true; if (!h.strokes) { h.strokes = h.par; save(); refreshScore(); } },
  pu: (b) => { const h = cur(); h.putts = Math.max(0, Math.min(8, h.putts + +b.dataset.d)); if (h.shots?.length && !h.manual) h.strokes = h.shots.length + h.putts; else if (h.putts >= h.strokes && h.putts) h.strokes = h.putts + 1; save(); refreshScore(); },
  par: (b) => { cur().par = +b.dataset.v; save(); refreshScore(); },
  prev: () => { const n = db.activeRound.holes.length; S.hole = (S.hole - 1 + n) % n; render(); },
  next: () => { const r = db.activeRound, n = r.holes.length; if (!cur().strokes) cur().strokes = cur().par; save();
    if (S.hole === n - 1 && played(r).length === n) return finishRound(); S.hole = (S.hole + 1) % n; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  hole: (b) => { S.hole = +b.dataset.i; if ($('#sheet.on #holecard')) refreshScore(); else render(); if (S.play) showHole(true); },
  'score-next': () => { if (!cur().strokes) cur().strokes = cur().par; save(); closeSheet(); goHole(S.hole + 1); },
  'pv-prev': () => { if (S.hole > 0) goHole(S.hole - 1); },
  'pv-next': () => goHole(S.hole + 1),
  'pv-score': sheetScore,
  shot: () => addShot(false),
  motion: toggleMotion,
  recenter: () => showHole(true),
  viseur: openViseur,
  'close-viseur': closeViseur,
  finish: () => { closeSheet(); finishRound(); },
  abandon: () => { if (confirm('Abandonner la partie ? Elle ne sera pas enregistrée.')) { db.activeRound = null; curCourse = null; save(); releaseWake(); closeSheet(); closePlay(); } },
  'view-round': (b) => { const r = db.rounds.find((x) => x.id === b.dataset.id); r && sheetRoundView(r); },
  'del-round': (b) => { if (!confirm('Supprimer cette partie ?')) return; db.rounds = db.rounds.filter((x) => x.id !== b.dataset.id); save(); closeSheet(); render(); },
  'cam-on': camOn,
  'cam-off': () => { stopCam(); render(); },
  rec: toggleRec,
  'play-swing': (b) => sheetPlayer(b.dataset.id),
  'del-swing': async (b) => { if (!confirm('Supprimer cette vidéo ?')) return; await vDel(b.dataset.id); loadSwings(); },
  'new-session': sheetSession,
  'session-save': () => {
    db.sessions.unshift({ id: uid(), type: $('#ss-type button.on').dataset.v, date: $('#ss-date').value || isoDay(), duration: +$('#ss-dur').value, feeling: +$('#ss-feel button.on').dataset.v, notes: $('#ss-notes').value.trim() });
    db.sessions.sort((a, b) => b.date.localeCompare(a.date)); save(); closeSheet(); render(); toast('Séance ajoutée');
  },
  'del-session': (b) => { if (!confirm('Supprimer cette séance ?')) return; db.sessions = db.sessions.filter((s) => s.id !== b.dataset.id); save(); render(); },
};
document.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; const f = A[b.dataset.a]; if (f) { e.preventDefault(); f(b); } });
document.addEventListener('input', (e) => { if (e.target.id === 'q') { S.search = e.target.value; $('#courses').innerHTML = courseListHTML(); searchPhoton(S.search); } });
document.addEventListener('change', (e) => { if (e.target.id === 'swing-file') { const f = e.target.files[0]; if (f) saveSwing(f); e.target.value = ''; } });
let tx = null; // balayage pour changer de trou (carte de score)
document.addEventListener('touchstart', (e) => { tx = e.target.closest('#view #holecard') ? e.touches[0].clientX : null; }, { passive: true });
document.addEventListener('touchend', (e) => { if (tx == null || !db.activeRound) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 70) A[dx < 0 ? 'next' : 'prev'](); }, { passive: true });

/* ================= Démarrage ================= */
render();
loadIndex();
loadSwings();
fetchWeather();
startGPS();
if (db.activeRound) keepAwake();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); fetchWeather(); } });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
