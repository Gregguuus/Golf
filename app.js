/* Mon Golf — application web statique (GitHub Pages), sans compte ni serveur.
   Données : localStorage (parties, séances, rappels, signets) + IndexedDB (vidéos de swing).
   Services gratuits sans clé : Open-Meteo (météo) et OpenStreetMap / Overpass (golfs et cartes de score). */
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
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const I = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V3.5"/><path d="M6 4h11.5l-2.6 4.2 2.6 4.3H6"/><ellipse cx="9" cy="21" rx="5" ry="1" opacity=".5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="6" width="13.5" height="12" rx="3"/><path d="m16 10.5 5.5-3v9l-5.5-3z"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3.5l2.5-7 6 14 2.5-7H21"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>',
  nav: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3 3 10.5l7.5 2.9L13.5 21z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4M6 10l6-6 6 6"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  insta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.6-2h5.8l1.6 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="4"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5M7 8l5-5 5 5M4 14v4.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
};

/* ================= Données ================= */
const KEY = 'mongolf';
const DEFAULTS = () => ({ v: 2, sessions: [], rounds: [], activeRound: null, insta: [], instaCollection: '', reminders: [], courses: {},
  settings: { auto: true, wake: true } });
let db;
function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  db = Object.assign(DEFAULTS(), d);
  db.settings = Object.assign(DEFAULTS().settings, d.settings);
  delete db.clubs; // ancienne version : distances par club supprimées
  if (db.v !== 2) { // migration v1 -> v2 (ancien format de partie)
    db.rounds = (db.rounds || []).map(migrateRound).filter(Boolean);
    db.activeRound = migrateRound(db.activeRound);
    db.v = 2;
  }
}
function migrateRound(r) {
  if (!r) return null;
  if (r.holes && Array.isArray(r.holes)) return r;
  return { id: r.id, date: r.date, course: r.course, courseKey: null, source: 'user', complete: !!r.complete,
    holes: (r.scores || []).map((s) => ({ par: s.par, hcp: null, dist: null, strokes: s.strokes || 0, putts: s.putts || 0, fw: s.fw === 'yes' ? 'c' : s.fw === 'no' ? 'l' : null })) };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Mémoire pleine : exportez vos données'); } }
load();

/* Vidéos (IndexedDB) */
let idbP;
function idb() {
  return (idbP ||= new Promise((res, rej) => {
    const r = indexedDB.open('mongolf-videos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('swings', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
}
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const vStore = async (m) => (await idb()).transaction('swings', m).objectStore('swings');
const vPut = async (x) => reqP((await vStore('readwrite')).put(x));
const vAll = async () => reqP((await vStore('readonly')).getAll());
const vDel = async (id) => reqP((await vStore('readwrite')).delete(id));

/* ================= État de l'interface ================= */
const S = { tab: 'today', pos: null, posErr: null, weather: null, golf: null, nearby: null, nearbyErr: false, search: '', searchRes: null,
  hole: 0, trainSeg: 'journal', instaCat: 'Tous', swings: [], cam: null, rec: null, recStart: 0 };

/* ================= Toast & feuilles ================= */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
let sheetClose = null;
function openSheet(html, onClose) {
  const s = $('#sheet'); s.innerHTML = '<div class="grab"></div>' + html; s.scrollTop = 0;
  requestAnimationFrame(() => { s.classList.add('on'); $('#backdrop').classList.add('on'); });
  sheetClose = onClose || null;
}
function closeSheet() {
  $('#sheet').classList.remove('on'); $('#backdrop').classList.remove('on');
  const f = sheetClose; sheetClose = null; f && f();
}
$('#backdrop').addEventListener('click', closeSheet);
const sheetHead = (title, right = '', left = 'Annuler') =>
  `<div class="sheet-head"><button data-a="close">${left}</button><h2>${title}</h2>${right ? `<button class="r" ${right}</button>` : '<span></span>'}</div>`;

/* ================= Météo ================= */
const WMO = { 0: ['☀️', 'Ensoleillé'], 1: ['🌤️', 'Plutôt ensoleillé'], 2: ['⛅', 'Éclaircies'], 3: ['☁️', 'Couvert'], 45: ['🌫️', 'Brouillard'], 48: ['🌫️', 'Brouillard givrant'],
  51: ['🌦️', 'Bruine légère'], 53: ['🌦️', 'Bruine'], 55: ['🌧️', 'Bruine forte'], 56: ['🌧️', 'Bruine verglaçante'], 57: ['🌧️', 'Bruine verglaçante'],
  61: ['🌦️', 'Pluie faible'], 63: ['🌧️', 'Pluie'], 65: ['🌧️', 'Forte pluie'], 66: ['🌧️', 'Pluie verglaçante'], 67: ['🌧️', 'Pluie verglaçante'],
  71: ['🌨️', 'Neige faible'], 73: ['🌨️', 'Neige'], 75: ['❄️', 'Forte neige'], 77: ['🌨️', 'Grésil'], 80: ['🌦️', 'Averses'], 81: ['🌧️', 'Averses'],
  82: ['⛈️', 'Fortes averses'], 85: ['🌨️', 'Averses de neige'], 86: ['🌨️', 'Averses de neige'], 95: ['⛈️', 'Orage'], 96: ['⛈️', 'Orage, grêle'], 99: ['⛈️', 'Orage, grêle'] };
const wmo = (c) => WMO[c] || ['🌡️', '—'];
const dirName = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(d / 45) % 8];
async function fetchWeather() {
  if (!S.pos) return;
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  Object.entries({ latitude: S.pos.lat.toFixed(4), longitude: S.pos.lon.toFixed(4), timezone: 'auto', wind_speed_unit: 'kmh', forecast_hours: 8,
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m' }).forEach(([k, v]) => u.searchParams.set(k, v));
  try { const r = await fetch(u); if (!r.ok) throw 0; S.weather = await r.json(); } catch { S.weather = S.weather || 'err'; }
  softRender();
}
function golfTip(c) {
  if ([95, 96, 99].includes(c.weather_code)) return 'Orage : quittez le parcours et mettez-vous à l\'abri.';
  const t = [];
  if (c.wind_speed_10m >= 30) t.push('Vent fort : jouez des balles basses, jusqu\'à 2 clubs de plus face au vent.');
  else if (c.wind_speed_10m >= 15) t.push('Vent sensible : 1 club de plus face au vent, 1 de moins dans le dos.');
  if (c.wind_gusts_10m - c.wind_speed_10m >= 15) t.push('Rafales : attendez une accalmie avant de frapper.');
  if (c.temperature_2m <= 8) t.push('Froid : la balle porte moins, prévoyez un club de plus.');
  if (c.temperature_2m >= 28) t.push('Chaleur : hydratez-vous tous les 3 trous.');
  if (c.precipitation > 0) t.push('Pluie : grips au sec, greens plus lents.');
  return t.join(' ') || 'Conditions idéales pour jouer. Bon parcours !';
}
function heroHTML() {
  const w = S.weather;
  const place = S.golf ? S.golf.name : S.pos ? 'Ma position' : 'Météo';
  if (!w || w === 'err') {
    const msg = S.posErr ? 'Autorisez la localisation pour la météo en direct.' : w === 'err' ? 'Météo indisponible pour le moment.' : 'Chargement…';
    return `<div class="hero loading"><div class="place">${I.nav}${esc(place)}</div><div class="now"><div><div class="temp">--°</div><div class="cond">${msg}</div></div></div></div>`;
  }
  const c = w.current, [emo, label] = wmo(c.weather_code), h = w.hourly;
  const now = Date.now();
  const hrs = h.time.map((t, i) => ({ t: new Date(t), i })).filter((x) => x.t.getTime() > now - 3600e3).slice(0, 6);
  const rain = hrs.length ? h.precipitation_probability[hrs[0].i] ?? 0 : 0;
  const rot = (c.wind_direction_10m + 180) % 360;
  return `<div class="hero">
    <div class="place">${I.nav}${esc(place)}</div>
    <div class="now"><div><div class="temp">${Math.round(c.temperature_2m)}°</div><div class="cond">${label} · ressenti ${Math.round(c.apparent_temperature)}°</div></div><div class="emo">${emo}</div></div>
    <div class="metrics">
      <div><small>Vent ${dirName(c.wind_direction_10m)}</small><b><span class="arrow" style="transform:rotate(${rot}deg)">${I.arrow}</span>${Math.round(c.wind_speed_10m)}<small style="display:inline;font-size:12px">km/h</small></b></div>
      <div><small>Rafales</small><b>${Math.round(c.wind_gusts_10m)}<small style="display:inline;font-size:12px">km/h</small></b></div>
      <div><small>Pluie</small><b>${rain}<small style="display:inline;font-size:12px">%</small></b></div>
    </div>
    <div class="tip">${I.bulb}<span>${golfTip(c)}</span></div>
    <div class="hours">${hrs.map(({ t, i }, k) => `<div><i>${k === 0 ? 'Maint.' : t.getHours() + ' h'}</i><span>${wmo(h.weather_code[i])[0]}</span>${Math.round(h.temperature_2m[i])}°<i>${Math.round(h.wind_speed_10m[i])} km/h</i></div>`).join('')}</div>
  </div>`;
}

/* ================= OpenStreetMap : golfs et trous ================= */
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
async function overpass(q) {
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (r.ok) return await r.json();
    } catch {}
  }
  throw new Error('overpass');
}
function km(a, b) {
  const R = 6371, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const toCourse = (e) => ({ key: `${e.type}/${e.id}`, type: e.type, id: e.id, name: e.tags?.name, city: e.tags?.['addr:city'] || '',
  lat: e.center?.lat ?? e.lat, lon: e.center?.lon ?? e.lon });
async function fetchNearby() {
  if (!S.pos) return;
  const { lat, lon } = S.pos;
  try {
    const j = await overpass(`[out:json][timeout:25];(way["leisure"="golf_course"](around:40000,${lat},${lon});relation["leisure"="golf_course"](around:40000,${lat},${lon}););out tags center;`);
    S.nearby = j.elements.map(toCourse).filter((c) => c.name && c.lat).map((c) => ({ ...c, d: km(S.pos, c) })).sort((a, b) => a.d - b.d).slice(0, 25);
  } catch { S.nearbyErr = true; }
  renderCourseList();
}
let searchT, searchSeq = 0;
function searchCourses(q) {
  clearTimeout(searchT);
  S.search = q;
  if (q.trim().length < 3) { S.searchRes = null; renderCourseList(); return; }
  S.searchRes = 'loading'; renderCourseList();
  searchT = setTimeout(async () => {
    const seq = ++searchSeq;
    const re = q.trim().replace(/[\\"^$.|?*+()[\]{}]/g, '');
    const scope = S.pos ? `(around:250000,${S.pos.lat},${S.pos.lon})` : '(area.fr)';
    const pre = S.pos ? '' : 'area["ISO3166-1"="FR"][admin_level=2]->.fr;';
    try {
      const j = await overpass(`[out:json][timeout:25];${pre}(way["leisure"="golf_course"]["name"~"${re}",i]${scope};relation["leisure"="golf_course"]["name"~"${re}",i]${scope};);out tags center 30;`);
      if (seq !== searchSeq) return;
      S.searchRes = j.elements.map(toCourse).filter((c) => c.name).map((c) => ({ ...c, d: S.pos && c.lat ? km(S.pos, c) : null }));
    } catch { if (seq === searchSeq) S.searchRes = 'err'; }
    renderCourseList();
  }, 500);
}
function parseHoles(els) {
  const by = new Map();
  for (const e of els) {
    const t = e.tags || {}, n = parseInt(t.ref, 10);
    if (!n || n > 27 || by.has(n)) continue;
    const dk = ['dist:yellow', 'dist:white', 'dist:blue', 'dist:red'].find((k) => t[k]) || Object.keys(t).find((k) => /^dist(:|$)|^distance$/.test(k));
    by.set(n, { par: parseInt(t.par, 10) || null, hcp: parseInt(t.handicap, 10) || null, dist: dk ? parseInt(t[dk], 10) || null : null });
  }
  const max = Math.max(0, ...by.keys());
  if (max < 9) return null;
  const n = max >= 18 ? 18 : 9;
  const holes = Array.from({ length: n }, (_, i) => by.get(i + 1) || { par: null, hcp: null, dist: null });
  if (holes.filter((h) => h.par).length < n * 0.6) return null;
  return holes.map((h) => ({ ...h, par: h.par || 4 }));
}
async function loadCourseHoles(c) {
  const saved = db.courses[c.key];
  if (saved?.source === 'osm') return saved;
  try {
    const j = await overpass(`[out:json][timeout:25];${c.type}(${c.id});map_to_area->.a;way["golf"="hole"](area.a);out tags;`);
    const holes = parseHoles(j.elements);
    if (holes) { db.courses[c.key] = { name: c.name, holes, source: 'osm' }; save(); return db.courses[c.key]; }
  } catch {}
  return saved || null; // pars saisis lors d'une partie précédente, sinon rien
}

/* ================= Localisation & détection du golf ================= */
function getPos() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('geo'));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }), rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}
async function locate() {
  try { S.pos = await getPos(); S.posErr = null; } catch (e) { S.posErr = e; softRender(); return; }
  fetchWeather();
  if (!S.nearby) fetchNearby();
  try {
    const { lat, lon } = S.pos;
    const j = await overpass(`[out:json][timeout:20];(way["leisure"="golf_course"](around:120,${lat},${lon});relation["leisure"="golf_course"](around:120,${lat},${lon}););out tags center 1;`);
    const e = j.elements[0];
    S.golf = e ? toCourse({ ...e, tags: { ...e.tags, name: e.tags?.name || 'Golf' } }) : null;
  } catch { /* garde la détection précédente */ }
  if (S.golf) onGolf(S.golf);
  softRender();
}
let golfHandled = false;
async function onGolf(c) {
  if (golfHandled) return;
  golfHandled = true;
  if (db.activeRound) { go('round'); return; }
  const played = db.rounds.some((r) => r.date === isoDay() && r.courseKey === c.key);
  if (db.settings.auto && !played) {
    await startRound(c, null);
    go('round');
    toast(`Bienvenue à ${c.name} ⛳`);
  }
}

/* ================= Partie ================= */
const scoreName = (s, p) => {
  if (!s) return ['', ''];
  const d = s - p;
  if (s === 1) return ['Trou en un !', 'eagle'];
  return d <= -3 ? ['Albatros', 'eagle'] : d === -2 ? ['Eagle', 'eagle'] : d === -1 ? ['Birdie', 'birdie'] : d === 0 ? ['Par', 'par'] : d === 1 ? ['Bogey', 'bogey'] : d === 2 ? ['Double bogey', 'double'] : [`+${d}`, 'double'];
};
const toPar = (n) => (n === 0 ? 'E' : n > 0 ? '+' + n : '−' + Math.abs(n));
const played = (r) => r.holes.filter((h) => h.strokes);
const rStrokes = (r) => sum(r.holes, (h) => h.strokes);
const rDiff = (r) => rStrokes(r) - sum(played(r), (h) => h.par);

async function startRound(course, nHoles) {
  let data = course.key ? await loadCourseHoles(course) : null;
  let holes = data?.holes;
  if (!holes) holes = Array.from({ length: nHoles || 18 }, () => ({ par: 4, hcp: null, dist: null }));
  db.activeRound = { id: uid(), date: isoDay(), course: course.name || 'Parcours', courseKey: course.key || null, source: data?.source || 'none', complete: false,
    holes: holes.map((h) => ({ par: h.par, hcp: h.hcp ?? null, dist: h.dist ?? null, strokes: 0, putts: 0, fw: null })) };
  S.hole = 0; save(); keepAwake();
}
function finishRound() {
  const r = db.activeRound, missing = r.holes.filter((h) => !h.strokes).length;
  if (missing && !confirm(`${missing} trou(s) sans score. Terminer quand même ?`)) return;
  r.complete = !missing;
  if (r.courseKey && r.source !== 'osm') db.courses[r.courseKey] = { name: r.course, holes: r.holes.map(({ par, hcp, dist }) => ({ par, hcp, dist })), source: 'user' };
  db.rounds.unshift(r); db.activeRound = null; save(); releaseWake();
  render(); toast(`Partie enregistrée : ${rStrokes(r)} (${toPar(rDiff(r))})`);
}
function markCls(h) { return h.strokes ? 'm-' + scoreName(h.strokes, h.par)[1] : ''; }
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

/* ================= Rappels & calendrier ================= */
const DAYS = [['MO', 'L'], ['TU', 'M'], ['WE', 'M'], ['TH', 'J'], ['FR', 'V'], ['SA', 'S'], ['SU', 'D']];
const DAY_FR = { MO: 'lun', TU: 'mar', WE: 'mer', TH: 'jeu', FR: 'ven', SA: 'sam', SU: 'dim' };
const ALERTS = [[0, 'À l\'heure'], [15, '15 min avant'], [30, '30 min avant'], [60, '1 h avant'], [120, '2 h avant'], [1440, 'La veille']];
const icsDate = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
function firstOccurrence(rem) {
  const [hh, mm] = rem.time.split(':').map(Number);
  if (rem.date) { const d = new Date(rem.date + 'T00:00'); d.setHours(hh, mm, 0, 0); return d; }
  const idx = DAYS.map((x) => x[0]);
  const d = new Date(); d.setHours(hh, mm, 0, 0);
  for (let k = 0; k < 8; k++) {
    const c = new Date(d); c.setDate(d.getDate() + k);
    const code = idx[(c.getDay() + 6) % 7];
    if (rem.days.includes(code) && c > new Date()) return c;
  }
  return d;
}
function buildICS(rem) {
  const start = firstOccurrence(rem), end = new Date(start.getTime() + rem.duration * 60000);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mon Golf//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${rem.id}@mon-golf`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:⛳ ${rem.title}`.replace(/[,;]/g, (c) => '\\' + c), `DESCRIPTION:${(rem.note || 'Rappel créé avec Mon Golf').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c)}`];
  if (rem.where) L.push(`LOCATION:${rem.where.replace(/[,;]/g, (c) => '\\' + c)}`);
  if (!rem.date) L.push(`RRULE:FREQ=WEEKLY;BYDAY=${rem.days.join(',')}`);
  L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:⛳ ${rem.title}`, `TRIGGER:${rem.alert ? `-PT${rem.alert}M` : 'PT0M'}`, 'END:VALARM');
  if (rem.date) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:⛳ ${rem.title}`, 'TRIGGER:-PT60M', 'END:VALARM');
  L.push('END:VEVENT', 'END:VCALENDAR');
  return L.join('\r\n');
}
function addToApple(rem) {
  const ics = buildICS(rem);
  if (isIOS) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${rem.title.replace(/[^\w\- ]+/g, '').trim() || 'golf'}.ics`; a.click();
}
function googleURL(rem) {
  const s = firstOccurrence(rem), e = new Date(s.getTime() + rem.duration * 60000);
  const u = new URL('https://calendar.google.com/calendar/render');
  u.searchParams.set('action', 'TEMPLATE'); u.searchParams.set('text', '⛳ ' + rem.title);
  u.searchParams.set('dates', `${icsDate(s)}/${icsDate(e)}`); u.searchParams.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone);
  u.searchParams.set('details', rem.note || 'Rappel créé avec Mon Golf');
  if (rem.where) u.searchParams.set('location', rem.where);
  if (!rem.date) u.searchParams.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${rem.days.join(',')}`);
  return u.toString();
}
const remWhen = (r) => r.date ? `${fmtDay(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${r.time}` : `${r.days.map((d) => DAY_FR[d]).join(', ')} · ${r.time}`;

/* ================= Vues ================= */
const TABS = [['today', 'Aujourd\'hui', 'today'], ['round', 'Partie', 'flag'], ['swing', 'Swing', 'video'], ['train', 'Entraînement', 'train'], ['rem', 'Rappels', 'bell']];
function renderTabbar() {
  $('#tabbar').innerHTML = TABS.map(([k, l, ic]) => `<button data-a="tab" data-t="${k}" class="${S.tab === k ? 'on' : ''}">${I[ic]}<span>${l}</span></button>`).join('');
}
function go(tab) { if (S.tab === 'swing' && tab !== 'swing') stopCam(); S.tab = tab; render(); window.scrollTo(0, 0); }
const header = (title, eyebrow = '', right = '') => `<header class="lt"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1></div>${right}</header>`;
const tiles = (arr) => `<div class="tiles">${arr.map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;

function vToday() {
  const r = db.activeRound;
  const month = isoDay().slice(0, 7);
  const hMonth = sum(db.sessions.filter((s) => s.date.startsWith(month)), (s) => s.duration) / 60;
  const full = db.rounds.filter((x) => x.complete && x.holes.length === 18);
  const best = full.length ? Math.min(...full.map(rStrokes)) : '—';
  const nextRem = db.reminders.map((x) => ({ x, d: firstOccurrence(x) })).filter((o) => o.d > new Date()).sort((a, b) => a.d - b.d).slice(0, 3);
  let callout = '';
  if (r) callout = `<button class="card callout row" data-a="tab" data-t="round" style="margin-top:12px"><div class="badge">${I.flag}</div><div class="main"><div class="t">Partie en cours</div><div class="s">${esc(r.course)} · ${played(r).length}/${r.holes.length} trous · ${played(r).length ? toPar(rDiff(r)) : '—'}</div></div>${I.chev}</button>`;
  else if (S.golf && !db.rounds.some((x) => x.date === isoDay() && x.courseKey === S.golf.key)) callout = `<button class="card callout row" data-a="start-detected" style="margin-top:12px"><div class="badge">${I.pin}</div><div class="main"><div class="t">Vous êtes à ${esc(S.golf.name)}</div><div class="s">Touchez pour lancer la carte de score</div></div>${I.chev}</button>`;
  const recent = [...db.rounds.slice(0, 2).map((x) => ({ d: x.date, h: roundRow(x) })), ...db.sessions.slice(0, 3).map((s) => ({ d: s.date, h: sessionRow(s, false) }))]
    .sort((a, b) => b.d.localeCompare(a.d)).slice(0, 4);
  return header('Aujourd\'hui', fmtDay(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }), `<button class="icon-btn" data-a="settings" aria-label="Réglages">${I.gear}</button>`)
    + heroHTML() + callout
    + `<h2 class="sec">Ma saison</h2>` + tiles([[best, 'Meilleur score 18 trous'], [db.rounds.length, 'Parties jouées'], [hMonth.toFixed(hMonth < 10 ? 1 : 0).replace('.', ',') + ' h', 'Entraînement ce mois-ci']])
    + `<h2 class="sec">Prochains rappels <button data-a="tab" data-t="rem">Tout voir</button></h2>`
    + `<div class="group">${nextRem.map(({ x, d }) => `<div class="row"><div class="ic" style="background:var(--orange)">${I.bell}</div><div class="main"><div class="t">${esc(x.title)}</div><div class="s">${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} à ${x.time}</div></div></div>`).join('')
      || `<button class="row" data-a="new-rem"><div class="ic" style="background:var(--orange)">${I.plus}</div><div class="main"><div class="t">Créer un rappel</div><div class="s">Practice, putting, partie… dans votre calendrier</div></div>${I.chev}</button>`}</div>`
    + `<h2 class="sec">Activité récente</h2><div class="group">${recent.map((x) => x.h).join('') || '<div class="empty">Vos parties et séances apparaîtront ici.</div>'}</div>`;
}
function roundRow(x) {
  const d = rDiff(x);
  return `<button class="row" data-a="view-round" data-id="${x.id}"><div class="ic">${I.flag}</div><div class="main"><div class="t">${esc(x.course)}</div><div class="s">${fmtDay(x.date, { day: 'numeric', month: 'long', year: 'numeric' })} · ${played(x).length} trous</div></div>
    <span class="v"><b style="color:var(--text)">${rStrokes(x)}</b> <span class="round-badge ${d < 0 ? 'u' : d > 0 ? 'o' : ''}">${toPar(d)}</span></span>${I.chev}</button>`;
}

function vRound() {
  const r = db.activeRound;
  if (!r) {
    const full = db.rounds.filter((x) => x.complete && x.holes.length === 18).slice(0, 5);
    const ph = db.rounds.flatMap((x) => played(x));
    const fw = db.rounds.flatMap((x) => x.holes.filter((h) => h.fw));
    return header('Partie')
      + `<div class="search">${I.search}<input type="search" id="q" placeholder="Rechercher un golf" value="${esc(S.search)}" autocomplete="off"></div>`
      + `<div id="courses"></div>`
      + `<div class="btns two mt"><button class="btn tinted" data-a="plan-round">${I.cal}Planifier</button><button class="btn gray" data-a="free-round">${I.plus}Partie libre</button></div>`
      + (db.rounds.length ? `<h2 class="sec">Statistiques</h2>` + tiles([
          [full.length ? Math.round(sum(full, rStrokes) / full.length) : '—', 'Moyenne 18 trous (5 dern.)'],
          [ph.length ? (sum(ph, (h) => h.putts) / ph.length).toFixed(1).replace('.', ',') : '—', 'Putts par trou'],
          [fw.length ? Math.round(fw.filter((h) => h.fw === 'c').length / fw.length * 100) + ' %' : '—', 'Fairways touchés']]) : '')
      + `<h2 class="sec">Historique</h2><div class="group">${db.rounds.map(roundRow).join('') || '<div class="empty">Aucune partie pour l\'instant.</div>'}</div>`;
  }
  const h = r.holes[S.hole], [nm, cls] = scoreName(h.strokes, h.par);
  const noData = r.source !== 'osm';
  const thru = played(r).length;
  return header(esc(r.course), 'Partie en cours', `<button class="icon-btn" data-a="round-menu" aria-label="Options">${I.gear}</button>`)
    + `<div class="card score-head"><div><b>${rStrokes(r) || '—'}</b><span>Score</span></div><div><b class="${thru ? (rDiff(r) < 0 ? 'n-birdie' : rDiff(r) > 0 ? 'n-bogey' : 'n-par') : ''}">${thru ? toPar(rDiff(r)) : '—'}</b><span>Par</span></div><div><b>${thru}/${r.holes.length}</b><span>Trous</span></div></div>`
    + `<div class="card hole mt" id="holecard">
        <div class="hole-top"><div class="hole-no"><small>Trou</small><b>${S.hole + 1}</b></div>
          <div class="hole-info"><span class="pill acc">Par ${h.par}</span>${h.hcp ? `<span class="pill">HCP ${h.hcp}</span>` : ''}${h.dist ? `<span class="pill">${h.dist} m</span>` : ''}</div></div>
        <div class="stepper"><button class="pm" data-a="st" data-d="-1" aria-label="Moins">−</button>
          <button class="val" data-a="st-par"><b class="${h.strokes ? 'n-' + cls : 'ghost'}">${h.strokes || h.par}</b><span>${h.strokes ? nm : 'Touchez = par'}</span></button>
          <button class="pm" data-a="st" data-d="1" aria-label="Plus">+</button></div>
        <div class="lbl-sm">Putts</div>
        <div class="stepper sm"><button class="pm" data-a="pu" data-d="-1">−</button><div class="val"><b>${h.putts}</b></div><button class="pm" data-a="pu" data-d="1">+</button></div>
        ${h.par > 3 ? `<div class="lbl-sm">Mise en jeu</div><div class="seg">${[['l', '← Gauche'], ['c', 'Fairway'], ['r', 'Droite →']].map(([k, l]) => `<button data-a="fw" data-v="${k}" class="${h.fw === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
        ${noData ? `<div class="lbl-sm">Par du trou</div><div class="seg">${[3, 4, 5].map((p) => `<button data-a="par" data-v="${p}" class="${h.par === p ? 'on' : ''}">Par ${p}</button>`).join('')}</div>` : ''}
      </div>
      <div class="hole-nav"><button class="btn gray" data-a="prev">‹ Trou ${((S.hole - 1 + r.holes.length) % r.holes.length) + 1}</button><button class="btn" data-a="next">Trou ${((S.hole + 1) % r.holes.length) + 1} ›</button></div>
      <h2 class="sec">Carte de score</h2>${scorecardHTML(r, S.hole)}
      ${noData ? '<p class="foot">Carte officielle non disponible pour ce golf : indiquez le par de chaque trou, il sera mémorisé pour vos prochaines parties.</p>' : '<p class="foot">Pars, handicaps et distances : données OpenStreetMap.</p>'}
      <div class="btns"><button class="btn" data-a="finish">Terminer la partie</button></div>`;
}
function renderCourseList() {
  const el = $('#courses'); if (!el) return;
  let list, title;
  if (S.searchRes) { title = 'Résultats'; list = S.searchRes; }
  else { title = 'Golfs à proximité'; list = S.nearby; }
  let body;
  if (list === 'loading' || (list == null && S.pos && !S.nearbyErr)) body = '<div class="empty"><span class="spin"></span></div>';
  else if (list === 'err' || (list == null && S.nearbyErr)) body = '<div class="empty">Recherche indisponible pour le moment. Réessayez.</div>';
  else if (list == null) body = '<div class="empty">Autorisez la localisation ou recherchez un golf par son nom.</div>';
  else if (!list.length) body = '<div class="empty">Aucun golf trouvé.</div>';
  else body = list.slice(0, 25).map((c, i) => `<button class="row" data-a="pick-course" data-i="${i}"><div class="ic">${I.flag}</div><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${[c.city, c.d != null ? (c.d < 1 ? 'Vous y êtes' : c.d.toFixed(c.d < 10 ? 1 : 0).replace('.', ',') + ' km') : ''].filter(Boolean).map(esc).join(' · ')}</div></div>${db.courses[c.key] ? '<span class="pill acc">Carte</span>' : ''}${I.chev}</button>`).join('');
  el.innerHTML = `<h2 class="sec">${title}</h2><div class="group">${body}</div>`;
  el._list = Array.isArray(list) ? list : [];
}

function vSwing() {
  return header('Swing', '', `<label class="icon-btn" aria-label="Importer une vidéo">${I.upload}<input type="file" id="swing-file" accept="video/*" hidden></label>`)
    + `<div class="cam" id="cam">${S.cam ? '<video id="preview" playsinline muted autoplay></video>' : `<div class="ph">${I.cam}<div>Placez le téléphone à hauteur de hanches,<br>face à vous ou dans l'axe de la cible.</div><button class="btn small" data-a="cam-on">Activer la caméra</button></div>`}
       ${S.cam ? `<button class="icon-btn close" data-a="cam-off" aria-label="Fermer">${I.x}</button><button class="shutter ${S.rec ? 'rec' : ''}" data-a="rec" aria-label="Enregistrer"></button>${S.rec ? '<div class="timer" id="timer">0:00</div>' : ''}` : ''}</div>`
    + `<h2 class="sec">Mes swings</h2><div class="group" id="swings">${swingsHTML()}</div>`;
}
function swingsHTML() {
  return S.swings.map((s) => `<div class="row"><button class="ic" style="border:0;background:#111" data-a="play" data-id="${s.id}">${I.play}</button><button class="main" style="border:0;background:none;text-align:left;padding:0" data-a="play" data-id="${s.id}"><div class="t">${esc(s.label || 'Swing')}</div><div class="s">${new Date(s.date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></button><button class="del" data-a="del-swing" data-id="${s.id}" aria-label="Supprimer">${I.trash}</button></div>`).join('')
    || '<div class="empty">Filmez votre premier swing pour le revoir au ralenti.</div>';
}

const FEEL = ['', '😣', '😕', '😐', '🙂', '🤩'];
const SESSION_TYPES = ['Practice', 'Putting', 'Petit jeu', 'Bunker', 'Parcours', 'Physique'];
const SESSION_COLORS = { Practice: '#0b7a4b', Putting: '#1f6fe0', 'Petit jeu': '#b8912f', Bunker: '#c47a2c', Parcours: '#2d8a5b', Physique: '#e0312b' };
function sessionRow(s, del = true) {
  return `<div class="row"><div class="ic" style="background:${SESSION_COLORS[s.type] || 'var(--accent)'}">${I.train}</div><div class="main"><div class="t">${esc(s.type)} · ${s.duration} min ${FEEL[s.feeling] || ''}</div><div class="s">${fmtDay(s.date, { day: 'numeric', month: 'long' })}${s.notes ? ' — ' + esc(s.notes) : ''}</div></div>${del ? `<button class="del" data-a="del-session" data-id="${s.id}" aria-label="Supprimer">${I.trash}</button>` : ''}</div>`;
}
const INSTA_CATS = ['Swing', 'Drive', 'Fers', 'Petit jeu', 'Putting', 'Bunker', 'Mental', 'Physique'];
function vTrain() {
  const seg = `<div class="seg" style="margin-bottom:6px">${[['journal', 'Journal'], ['insta', 'Inspiration Instagram']].map(([k, l]) => `<button data-a="seg" data-v="${k}" class="${S.trainSeg === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  if (S.trainSeg === 'journal') {
    const month = isoDay().slice(0, 7), ms = db.sessions.filter((s) => s.date.startsWith(month));
    const feel = ms.length ? FEEL[Math.round(sum(ms, (s) => s.feeling) / ms.length)] : '—';
    return header('Entraînement', '', `<button class="icon-btn" data-a="new-session" aria-label="Nouvelle séance">${I.plus}</button>`) + seg
      + `<h2 class="sec">Ce mois-ci</h2>` + tiles([[ms.length, 'Séances'], [(sum(ms, (s) => s.duration) / 60).toFixed(1).replace('.', ',') + ' h', 'Temps total'], [feel, 'Ressenti moyen']])
      + `<div class="btns"><button class="btn" data-a="new-session">${I.plus}Nouvelle séance</button></div>`
      + `<h2 class="sec">Historique</h2><div class="group">${db.sessions.map((s) => sessionRow(s)).join('') || '<div class="empty">Aucune séance enregistrée.</div>'}</div>`;
  }
  const cats = ['Tous', ...INSTA_CATS.filter((c) => db.insta.some((x) => x.cat === c))];
  const list = db.insta.filter((x) => S.instaCat === 'Tous' || x.cat === S.instaCat);
  return header('Entraînement', '', `<button class="icon-btn" data-a="new-insta" aria-label="Ajouter un post">${I.plus}</button>`) + seg
    + `<div class="card pad mt" style="text-align:center"><div style="font-weight:700;font-size:20px">Ma collection Golf</div>
        <div class="muted" style="font-size:15px;margin:4px 0 14px">${db.instaCollection ? 'Ouvre directement vos posts golf enregistrés.' : 'Reliez votre collection « Golf » enregistrée sur Instagram.'}</div>
        ${db.instaCollection ? `<a class="btn insta" href="${esc(db.instaCollection)}" target="_blank" rel="noopener">${I.insta}Ouvrir sur Instagram</a><button class="btn danger" data-a="link-insta" style="margin-top:4px">Modifier le lien</button>`
          : `<button class="btn insta" data-a="link-insta">${I.insta}Relier ma collection</button>`}</div>`
    + `<h2 class="sec">Posts favoris <button data-a="new-insta">Ajouter</button></h2>`
    + (db.insta.length ? `<div class="chips">${cats.map((c) => `<button data-a="icat" data-v="${esc(c)}" class="${S.instaCat === c ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>` : '')
    + `<div class="group">${list.map((x) => `<div class="row"><a class="main" href="${esc(x.url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><div class="t">${esc(x.title || 'Post Instagram')}</div><div class="s">${esc(x.cat)}</div></a><button class="del" data-a="del-insta" data-id="${x.id}" aria-label="Supprimer">${I.trash}</button></div>`).join('')
        || '<div class="empty">Gardez ici les vidéos qui vous servent vraiment : drills, conseils de pros…<br>Dans Instagram : Partager → Copier le lien.</div>'}</div>`;
}

function vRem() {
  const rec = db.reminders.filter((r) => !r.date), one = db.reminders.filter((r) => r.date && firstOccurrence(r) > new Date(Date.now() - 864e5));
  const row = (r) => `<button class="row" data-a="rem-open" data-id="${r.id}"><div class="ic" style="background:${r.date ? 'var(--accent)' : 'var(--orange)'}">${r.date ? I.flag : I.bell}</div><div class="main"><div class="t">${esc(r.title)}</div><div class="s">${remWhen(r)}${r.where ? ' · ' + esc(r.where) : ''}</div></div>${I.chev}</button>`;
  return header('Rappels', '', `<button class="icon-btn" data-a="new-rem" aria-label="Nouveau rappel">${I.plus}</button>`)
    + `<p class="foot" style="margin:0 4px 16px">Vos rappels s'ajoutent à votre calendrier (Apple, Google ou Outlook) : vous recevez la notification même quand l'app est fermée.</p>`
    + `<div class="btns two"><button class="btn" data-a="new-rem">${I.bell}Entraînement</button><button class="btn tinted" data-a="plan-round">${I.flag}Partie</button></div>`
    + `<h2 class="sec">Entraînements réguliers</h2><div class="group">${rec.map(row).join('') || '<div class="empty">Ex. : practice le mardi et le jeudi à 18 h.</div>'}</div>`
    + `<h2 class="sec">Parties prévues</h2><div class="group">${one.map(row).join('') || '<div class="empty">Aucune partie planifiée.</div>'}</div>`;
}

function render() {
  renderTabbar();
  const v = { today: vToday, round: vRound, swing: vSwing, train: vTrain, rem: vRem }[S.tab];
  $('#view').innerHTML = v();
  if (S.tab === 'round' && !db.activeRound) renderCourseList();
  if (S.tab === 'swing' && S.cam) { const p = $('#preview'); p.srcObject = S.cam; }
}
function softRender() { // met à jour sans perturber une saisie en cours
  const a = document.activeElement;
  if (a && a.closest && a.closest('#view') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  if (S.tab === 'today') render();
}

/* ================= Feuilles (formulaires) ================= */
function sheetSettings() {
  openSheet(sheetHead('Réglages', '', 'OK')
    + `<div class="gh">Au golf</div><div class="group plain">
        <div class="field"><label for="o-auto">Lancer la carte de score en arrivant au golf</label><span class="switch"><input type="checkbox" id="o-auto" ${db.settings.auto ? 'checked' : ''}><span></span></span></div>
        <div class="field"><label for="o-wake">Garder l'écran allumé en partie</label><span class="switch"><input type="checkbox" id="o-wake" ${db.settings.wake ? 'checked' : ''}><span></span></span></div></div>
      <p class="foot">La détection se fait à l'ouverture de l'app (et toutes les 5 min tant qu'elle est ouverte). ${S.golf ? 'Position actuelle : ' + esc(S.golf.name) + '.' : ''}</p>
      <div class="gh">Mes données</div><div class="group plain">
        <button class="row" data-a="export"><div class="main"><div class="t" style="color:var(--accent)">Exporter une sauvegarde</div></div></button>
        <label class="row"><div class="main"><div class="t" style="color:var(--accent)">Restaurer une sauvegarde</div></div><input type="file" id="import" accept="application/json,.json" hidden></label></div>
      <p class="foot">Tout reste sur votre téléphone, rien n'est envoyé ailleurs. Les vidéos ne sont pas incluses dans la sauvegarde.</p>
      <p class="foot">Météo : Open-Meteo · Golfs et cartes de score : © contributeurs OpenStreetMap.</p>`);
  $('#o-auto').onchange = (e) => { db.settings.auto = e.target.checked; save(); };
  $('#o-wake').onchange = (e) => { db.settings.wake = e.target.checked; save(); e.target.checked ? keepAwake() : releaseWake(); };
  $('#import').onchange = importData;
}
function sheetCourse(c) {
  openSheet(sheetHead(esc(c.name), '', 'Fermer') + `<div class="card pad" id="course-info" style="text-align:center"><span class="spin"></span><div class="muted mt">Recherche de la carte de score…</div></div>`);
  loadCourseHoles(c).then((data) => {
    const el = $('#course-info'); if (!el) return;
    const holes = data?.holes;
    let n = 18;
    el.outerHTML = (holes
      ? `<div class="card pad"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:20px">${holes.length} trous · Par ${sum(holes, (h) => h.par)}</b><span class="pill acc">${data.source === 'osm' ? 'Carte officielle' : 'Mes pars'}</span></div></div><div class="mt">${scorecardHTML({ holes: holes.map((h) => ({ ...h, strokes: 0, putts: 0 })) })}</div>`
      : `<div class="card pad"><b>Carte de score non disponible</b><div class="muted mt" style="font-size:15px">Ce golf n'a pas encore ses trous dans OpenStreetMap. Vous indiquerez le par de chaque trou pendant la partie : il sera mémorisé.</div><div class="seg mt" id="nh"><button data-n="9">9 trous</button><button class="on" data-n="18">18 trous</button></div></div>`)
      + `<div class="btns"><button class="btn" id="go">Commencer la partie</button><button class="btn tinted" id="plan">${I.cal}Planifier une partie ici</button>
         ${c.lat ? `<a class="btn gray" href="https://maps.apple.com/?daddr=${c.lat},${c.lon}&q=${encodeURIComponent(c.name)}" target="_blank" rel="noopener">${I.nav}Itinéraire</a>` : ''}</div>`;
    $$('#nh button').forEach((b) => (b.onclick = () => { n = +b.dataset.n; $$('#nh button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#go').onclick = async () => { await startRound(c, n); closeSheet(); go('round'); };
    $('#plan').onclick = () => sheetPlan(c.name);
  });
}
function sheetFreeRound() {
  openSheet(sheetHead('Partie libre', 'data-a="free-go">Commencer')
    + `<div class="group plain"><div class="field"><label>Parcours</label><input id="fr-name" placeholder="Nom du golf" value="${esc(S.golf?.name || '')}"></div>
       <div class="field"><label>Trous</label><div class="seg" id="fr-n" style="width:170px"><button data-n="9">9</button><button class="on" data-n="18">18</button></div></div></div>`);
  $$('#fr-n button').forEach((b) => (b.onclick = () => $$('#fr-n button').forEach((x) => x.classList.toggle('on', x === b))));
}
function remForm(rem, isRound) {
  const r = rem || { title: isRound ? 'Partie de golf' : 'Practice', days: ['TU', 'TH'], time: isRound ? '09:00' : '18:00', duration: isRound ? 270 : 60, alert: isRound ? 1440 : 30, note: '', where: '', date: isRound ? isoDay(new Date(Date.now() + 864e5)) : null };
  return `<div class="group plain">
      ${isRound ? '' : `<div class="field col" style="padding-top:12px;padding-bottom:12px"><div class="seg" id="rf-type">${['Practice', 'Putting', 'Petit jeu', 'Physique'].map((t) => `<button type="button" data-v="${t}" class="${r.title === t ? 'on' : ''}">${t}</button>`).join('')}</div></div>`}
      <div class="field"><label>Titre</label><input id="rf-title" value="${esc(r.title)}"></div>
      ${isRound ? `<div class="field"><label>Golf</label><input id="rf-where" value="${esc(r.where)}" placeholder="Nom du golf"></div>` : ''}
    </div>
    ${isRound ? `<div class="group plain mt"><div class="field"><label>Date</label><input type="date" id="rf-date" value="${r.date}"></div>` : `<div class="gh">Jours</div><div class="group plain"><div class="days" id="rf-days">${DAYS.map(([k, l]) => `<button type="button" data-v="${k}" class="${r.days.includes(k) ? 'on' : ''}">${l}</button>`).join('')}</div>`}
      <div class="field"><label>Heure${isRound ? ' de départ' : ''}</label><input type="time" id="rf-time" value="${r.time}"></div>
      <div class="field"><label>Durée</label><select id="rf-dur">${[[30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [150, '2 h 30 (9 trous)'], [270, '4 h 30 (18 trous)']].map(([v, l]) => `<option value="${v}" ${+r.duration === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Alerte</label><select id="rf-alert">${ALERTS.map(([v, l]) => `<option value="${v}" ${+r.alert === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="group plain mt"><div class="field col"><textarea id="rf-note" placeholder="Objectif de la séance (facultatif)">${esc(r.note)}</textarea></div></div>`;
}
function readRemForm(isRound) {
  const title = $('#rf-title').value.trim() || (isRound ? 'Partie de golf' : 'Entraînement');
  const days = isRound ? [] : $$('#rf-days button.on').map((b) => b.dataset.v);
  if (!isRound && !days.length) { toast('Choisissez au moins un jour'); return null; }
  return { id: uid(), title, days, time: $('#rf-time').value || '18:00', duration: +$('#rf-dur').value, alert: +$('#rf-alert').value, note: $('#rf-note').value.trim(),
    where: isRound ? $('#rf-where').value.trim() : '', date: isRound ? $('#rf-date').value || isoDay() : null };
}
function sheetRem(isRound = false, where = '') {
  openSheet(sheetHead(isRound ? 'Planifier une partie' : 'Rappel d\'entraînement', `data-a="rem-save" data-round="${isRound ? 1 : ''}">Créer`) + remForm(null, isRound));
  if (where) $('#rf-where').value = where;
  $$('#rf-type button').forEach((b) => (b.onclick = () => { $$('#rf-type button').forEach((x) => x.classList.toggle('on', x === b)); $('#rf-title').value = b.dataset.v; }));
  $$('#rf-days button').forEach((b) => (b.onclick = () => b.classList.toggle('on')));
}
const sheetPlan = (where = '') => sheetRem(true, where);
function sheetRemDetail(rem) {
  openSheet(sheetHead(esc(rem.title), '', 'Fermer')
    + `<div class="card pad" style="text-align:center"><div style="font-size:15px" class="muted">${remWhen(rem)}${rem.where ? ' · ' + esc(rem.where) : ''}</div>
       <div class="muted" style="font-size:14px;margin-top:4px">${ALERTS.find((a) => a[0] === rem.alert)?.[1] || ''}</div></div>
     <div class="gh">Ajouter à mon calendrier</div>
     <div class="btns"><button class="btn" data-a="ics" data-id="${rem.id}">${I.cal}Calendrier Apple / Outlook</button>
       <a class="btn tinted" href="${esc(googleURL(rem))}" target="_blank" rel="noopener">${I.cal}Google Agenda</a>
       <button class="btn danger" data-a="del-rem" data-id="${rem.id}">Supprimer le rappel</button></div>
     <p class="foot">Sur iPhone, touchez « Calendrier Apple » puis « Ajouter » : l'alerte arrivera comme une notification.</p>`);
}
function sheetSession() {
  openSheet(sheetHead('Nouvelle séance', 'data-a="session-save">Ajouter')
    + `<div class="group plain"><div class="field col" style="padding-top:12px;padding-bottom:12px"><div class="seg" id="ss-type" style="grid-auto-flow:row;grid-template-columns:repeat(3,1fr)">${SESSION_TYPES.map((t, i) => `<button type="button" data-v="${t}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div></div></div>
     <div class="group plain mt"><div class="field"><label>Date</label><input type="date" id="ss-date" value="${isoDay()}"></div>
       <div class="field"><label>Durée</label><select id="ss-dur">${[15, 30, 45, 60, 90, 120, 180, 240].map((v) => `<option value="${v}" ${v === 60 ? 'selected' : ''}>${v < 60 ? v + ' min' : Math.floor(v / 60) + ' h' + (v % 60 ? ' ' + (v % 60) : '')}</option>`).join('')}</select></div></div>
     <div class="gh">Ressenti</div><div class="group plain"><div class="days" id="ss-feel">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-v="${v}" class="${v === 3 ? 'on' : ''}" style="font-size:22px;width:52px;height:52px">${FEEL[v]}</button>`).join('')}</div></div>
     <div class="group plain mt"><div class="field col"><textarea id="ss-notes" placeholder="Ce que j'ai travaillé, ce qui marche…"></textarea></div></div>`);
  const single = (sel) => $$(sel + ' button').forEach((b) => (b.onclick = () => $$(sel + ' button').forEach((x) => x.classList.toggle('on', x === b))));
  single('#ss-type'); single('#ss-feel');
}
function sheetInsta(prefill = '') {
  openSheet(sheetHead('Post favori', 'data-a="insta-save">Ajouter')
    + `<div class="group plain"><div class="field"><label>Lien</label><input id="in-url" type="url" inputmode="url" placeholder="instagram.com/reel/…" value="${esc(prefill)}"></div>
       <div class="field"><label>Titre</label><input id="in-title" placeholder="Ex. : drill de putting"></div></div>
     <div class="gh">Catégorie</div><div class="group plain"><div class="field col" style="padding-top:12px;padding-bottom:12px"><div class="seg" id="in-cat" style="grid-auto-flow:row;grid-template-columns:repeat(4,1fr)">${INSTA_CATS.map((c, i) => `<button type="button" data-v="${c}" class="${i ? '' : 'on'}">${c}</button>`).join('')}</div></div></div>
     <p class="foot">Dans Instagram, sous la vidéo : ➤ Partager → Copier le lien, puis collez-le ici.</p>`);
  $$('#in-cat button').forEach((b) => (b.onclick = () => $$('#in-cat button').forEach((x) => x.classList.toggle('on', x === b))));
  if (!prefill) setTimeout(() => $('#in-url')?.focus(), 350); else setTimeout(() => $('#in-title')?.focus(), 350);
}
function sheetLinkInsta() {
  openSheet(sheetHead('Collection Instagram', 'data-a="insta-link-save">OK')
    + `<div class="group plain"><div class="field"><label>Lien</label><input id="il-url" type="url" inputmode="url" placeholder="instagram.com/…/saved/golf/…" value="${esc(db.instaCollection)}"></div></div>
     <div class="gh">Comment trouver ce lien</div>
     <div class="card pad" style="font-size:15px;line-height:1.5">1. Dans Instagram, rangez vos posts golf dans une collection <b>« Golf »</b> (appui long sur ⧉ Enregistrer).<br>
       2. Dans Safari, allez sur <b>instagram.com</b> et connectez-vous.<br>3. Profil → ☰ → <b>Enregistrements</b> → ouvrez la collection « Golf ».<br>4. Copiez l'adresse de la page et collez-la ici.</div>
     <p class="foot">Instagram ne permet à aucune autre application de lire vos enregistrements : ce lien ouvre directement votre collection dans Instagram.</p>`);
}
async function sheetPlayer(id) {
  const s = S.swings.find((x) => x.id === id); if (!s) return;
  const url = URL.createObjectURL(s.blob);
  openSheet(sheetHead(esc(s.label || 'Swing'), '', 'Fermer')
    + `<div class="player"><video id="pv" src="${url}" playsinline controls autoplay muted loop></video></div>
       <div class="seg mt" id="rate">${[[0.25, '×¼'], [0.5, '×½'], [1, '×1']].map(([v, l]) => `<button data-v="${v}" class="${v === 0.5 ? 'on' : ''}">${l}</button>`).join('')}</div>
       <div class="btns two"><button class="btn gray" id="fb">‹ Image</button><button class="btn gray" id="ff">Image ›</button></div>`, () => URL.revokeObjectURL(url));
  const v = $('#pv'); v.playbackRate = 0.5; v.onloadedmetadata = () => (v.playbackRate = 0.5);
  $$('#rate button').forEach((b) => (b.onclick = () => { v.playbackRate = +b.dataset.v; v.play(); $$('#rate button').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#fb').onclick = () => { v.pause(); v.currentTime = Math.max(0, v.currentTime - 1 / 30); };
  $('#ff').onclick = () => { v.pause(); v.currentTime += 1 / 30; };
}
function sheetRoundView(r) {
  openSheet(sheetHead(esc(r.course), '', 'Fermer')
    + `<div class="card score-head"><div><b>${rStrokes(r)}</b><span>Score</span></div><div><b>${toPar(rDiff(r))}</b><span>Par</span></div><div><b>${sum(r.holes, (h) => h.putts)}</b><span>Putts</span></div></div>
       <p class="foot" style="text-align:center;margin-bottom:12px">${fmtDay(r.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>${scorecardHTML(r)}
       <div class="btns"><button class="btn danger" data-a="del-round" data-id="${r.id}">Supprimer la partie</button></div>`);
}
function sheetRoundMenu() {
  openSheet(sheetHead('Partie en cours', '', 'Fermer')
    + `<div class="group plain"><button class="row" data-a="finish"><div class="main"><div class="t" style="color:var(--accent)">Terminer et enregistrer</div></div></button>
       <button class="row" data-a="abandon"><div class="main"><div class="t" style="color:var(--red)">Abandonner la partie</div></div></button></div>`);
}

/* ================= Caméra ================= */
const CLUB_LABELS = ['Driver', 'Bois', 'Hybride', 'Fer long', 'Fer moyen', 'Fer court', 'Wedge', 'Chip', 'Putt'];
async function camOn() {
  try {
    S.cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', frameRate: { ideal: 60 }, height: { ideal: 1080 } }, audio: false });
    render();
  } catch { toast('Caméra non autorisée. Utilisez ⬆ pour importer une vidéo.'); }
}
function stopCam() { if (S.rec) S.rec.stop(); S.cam?.getTracks().forEach((t) => t.stop()); S.cam = null; }
let timerI;
function toggleRec() {
  if (S.rec) { S.rec.stop(); return; }
  if (!window.MediaRecorder) return toast('Enregistrement impossible ici : importez une vidéo.');
  const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
  const chunks = [], rec = new MediaRecorder(S.cam, mime ? { mimeType: mime } : undefined);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => { clearInterval(timerI); S.rec = null; askLabel(new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' })); if (S.tab === 'swing') render(); };
  rec.start(); S.rec = rec; S.recStart = Date.now(); render();
  timerI = setInterval(() => { const t = $('#timer'), s = Math.floor((Date.now() - S.recStart) / 1000); if (t) t.textContent = `${Math.floor(s / 60)}:${pad2(s % 60)}`; }, 250);
}
function askLabel(blob) {
  openSheet(sheetHead('Nouveau swing', 'data-a="swing-save">Enregistrer', 'Jeter')
    + `<div class="gh">Club</div><div class="group plain"><div class="field col" style="padding-top:12px;padding-bottom:12px"><div class="seg" id="sw-club" style="grid-auto-flow:row;grid-template-columns:repeat(3,1fr)">${CLUB_LABELS.map((c, i) => `<button data-v="${c}" class="${i ? '' : 'on'}">${c}</button>`).join('')}</div></div></div>
     <div class="group plain mt"><div class="field"><label>Note</label><input id="sw-note" placeholder="Ex. : backswing plus court"></div></div>`);
  $$('#sw-club button').forEach((b) => (b.onclick = () => $$('#sw-club button').forEach((x) => x.classList.toggle('on', x === b))));
  S.pendingSwing = blob;
}
async function loadSwings() { try { S.swings = (await vAll()).sort((a, b) => b.date.localeCompare(a.date)); } catch { S.swings = []; } if (S.tab === 'swing' && $('#swings')) $('#swings').innerHTML = swingsHTML(); }

/* ================= Écran allumé ================= */
let wakeLock = null;
async function keepAwake() { if (!db.settings.wake || !db.activeRound || !('wakeLock' in navigator)) return; try { wakeLock = await navigator.wakeLock.request('screen'); } catch {} }
function releaseWake() { wakeLock?.release?.(); wakeLock = null; }

/* ================= Sauvegarde ================= */
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
const A = {
  tab: (b) => go(b.dataset.t),
  close: closeSheet,
  settings: sheetSettings,
  export: exportData,
  'start-detected': async () => { await startRound(S.golf, null); go('round'); },
  'pick-course': (b) => sheetCourse($('#courses')._list[+b.dataset.i]),
  'plan-round': () => sheetPlan(S.golf?.name || ''),
  'free-round': sheetFreeRound,
  'free-go': async () => { const n = +($('#fr-n button.on')?.dataset.n || 18); const name = $('#fr-name').value.trim() || 'Parcours';
    await startRound(S.golf && S.golf.name === name ? S.golf : { name }, n); closeSheet(); go('round'); },
  'round-menu': sheetRoundMenu,
  st: (b) => { const h = db.activeRound.holes[S.hole], d = +b.dataset.d; h.strokes = h.strokes ? Math.max(1, Math.min(15, h.strokes + d)) : Math.max(1, h.par + d); if (h.putts >= h.strokes) h.putts = Math.max(0, h.strokes - 1); save(); render(); },
  'st-par': () => { const h = db.activeRound.holes[S.hole]; if (!h.strokes) { h.strokes = h.par; save(); render(); } },
  pu: (b) => { const h = db.activeRound.holes[S.hole]; h.putts = Math.max(0, Math.min(8, h.putts + +b.dataset.d)); if (h.putts >= h.strokes && h.putts) h.strokes = h.putts + 1; save(); render(); },
  fw: (b) => { const h = db.activeRound.holes[S.hole]; h.fw = h.fw === b.dataset.v ? null : b.dataset.v; save(); render(); },
  par: (b) => { db.activeRound.holes[S.hole].par = +b.dataset.v; save(); render(); },
  prev: () => { const n = db.activeRound.holes.length; S.hole = (S.hole - 1 + n) % n; render(); },
  next: () => { const r = db.activeRound, n = r.holes.length; if (!r.holes[S.hole].strokes) r.holes[S.hole].strokes = r.holes[S.hole].par; save();
    if (S.hole === n - 1 && played(r).length === n) { finishRound(); return; } S.hole = (S.hole + 1) % n; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  hole: (b) => { S.hole = +b.dataset.i; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  finish: () => { closeSheet(); finishRound(); },
  abandon: () => { if (confirm('Abandonner la partie ? Elle ne sera pas enregistrée.')) { db.activeRound = null; save(); releaseWake(); closeSheet(); render(); } },
  'view-round': (b) => { const r = db.rounds.find((x) => x.id === b.dataset.id); r && sheetRoundView(r); },
  'del-round': (b) => { if (!confirm('Supprimer cette partie ?')) return; db.rounds = db.rounds.filter((x) => x.id !== b.dataset.id); save(); closeSheet(); render(); },
  'cam-on': camOn,
  'cam-off': () => { stopCam(); render(); },
  rec: toggleRec,
  play: (b) => sheetPlayer(b.dataset.id),
  'swing-save': async () => {
    const blob = S.pendingSwing; S.pendingSwing = null; if (!blob) return closeSheet();
    const label = [$('#sw-club button.on')?.dataset.v, $('#sw-note').value.trim()].filter(Boolean).join(' — ');
    try { await vPut({ id: uid(), date: new Date().toISOString(), label, blob }); toast('Swing enregistré'); } catch { toast('Espace insuffisant pour la vidéo'); }
    closeSheet(); await loadSwings();
  },
  'del-swing': async (b) => { if (!confirm('Supprimer cette vidéo ?')) return; await vDel(b.dataset.id); loadSwings(); },
  seg: (b) => { S.trainSeg = b.dataset.v; render(); },
  'new-session': sheetSession,
  'session-save': () => {
    db.sessions.unshift({ id: uid(), type: $('#ss-type button.on').dataset.v, date: $('#ss-date').value || isoDay(), duration: +$('#ss-dur').value,
      feeling: +$('#ss-feel button.on').dataset.v, notes: $('#ss-notes').value.trim() });
    db.sessions.sort((a, b) => b.date.localeCompare(a.date)); save(); closeSheet(); render(); toast('Séance ajoutée');
  },
  'del-session': (b) => { if (!confirm('Supprimer cette séance ?')) return; db.sessions = db.sessions.filter((s) => s.id !== b.dataset.id); save(); render(); },
  'new-insta': () => sheetInsta(),
  'insta-save': () => {
    const url = ($('#in-url').value.match(/https?:\/\/\S+/) || [($('#in-url').value.trim() ? 'https://' + $('#in-url').value.trim().replace(/^\/+/, '') : '')])[0];
    let ok = false; try { ok = /(^|\.)instagram\.com$/.test(new URL(url).hostname); } catch {}
    if (!ok) return toast('Collez un lien Instagram');
    if (db.insta.some((x) => x.url === url)) return toast('Déjà dans vos favoris');
    db.insta.unshift({ id: uid(), url, title: $('#in-title').value.trim(), cat: $('#in-cat button.on').dataset.v, date: new Date().toISOString() });
    save(); closeSheet(); S.trainSeg = 'insta'; S.tab = 'train'; render(); toast('Post ajouté');
  },
  'del-insta': (b) => { if (!confirm('Retirer ce post ?')) return; db.insta = db.insta.filter((x) => x.id !== b.dataset.id); save(); render(); },
  icat: (b) => { S.instaCat = b.dataset.v; render(); },
  'link-insta': sheetLinkInsta,
  'insta-link-save': () => {
    const v = $('#il-url').value.trim();
    if (v) { const url = /^https?:/.test(v) ? v : 'https://' + v; let ok = false; try { ok = /(^|\.)instagram\.com$/.test(new URL(url).hostname); } catch {}
      if (!ok) return toast('Collez un lien instagram.com'); db.instaCollection = url; } else db.instaCollection = '';
    save(); closeSheet(); render();
  },
  'new-rem': () => sheetRem(false),
  'rem-save': (b) => { const isRound = !!b.dataset.round; const r = readRemForm(isRound); if (!r) return; db.reminders.push(r); save(); S.tab = 'rem'; render(); sheetRemDetail(r); },
  'rem-open': (b) => { const r = db.reminders.find((x) => x.id === b.dataset.id); r && sheetRemDetail(r); },
  ics: (b) => { const r = db.reminders.find((x) => x.id === b.dataset.id); r && addToApple(r); },
  'del-rem': (b) => { if (!confirm('Supprimer ce rappel de l\'app ? (Pensez aussi à le retirer de votre calendrier.)')) return; db.reminders = db.reminders.filter((x) => x.id !== b.dataset.id); save(); closeSheet(); render(); },
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const f = A[b.dataset.a]; if (f) { e.preventDefault(); f(b); }
});
document.addEventListener('input', (e) => { if (e.target.id === 'q') searchCourses(e.target.value); });
document.addEventListener('change', (e) => { if (e.target.id === 'swing-file') { const f = e.target.files[0]; if (f) askLabel(f); e.target.value = ''; } });
/* Balayage gauche/droite pour changer de trou */
let tx = null;
document.addEventListener('touchstart', (e) => { tx = e.target.closest('#holecard') ? e.touches[0].clientX : null; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (tx == null || !db.activeRound) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
  if (Math.abs(dx) > 70) A[dx < 0 ? 'next' : 'prev']();
}, { passive: true });

/* Partage Android (Web Share Target) : ?url=…&text=… */
function handleShare() {
  const p = new URLSearchParams(location.search);
  const m = [p.get('url'), p.get('text'), p.get('title')].filter(Boolean).join(' ').match(/https?:\/\/\S+/);
  if (!p.toString()) return;
  history.replaceState(null, '', location.pathname);
  if (m) { S.tab = 'train'; S.trainSeg = 'insta'; render(); sheetInsta(m[0]); }
}

/* ================= Démarrage ================= */
render();
handleShare();
loadSwings();
if (db.activeRound) keepAwake();
locate();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { locate(); keepAwake(); } });
setInterval(() => document.visibilityState === 'visible' && locate(), 5 * 60 * 1000);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
