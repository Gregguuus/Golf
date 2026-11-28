/* Signets : lecture des données chiffrées (AES-GCM) directement dans le navigateur. */
(function () {
  const KEYNAME = 'sg-k';
  const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  let CK = null, RSA = null;

  function getKey() {
    try {
      const m = location.hash.match(/k=([\w-]+)/);
      if (m) { localStorage.setItem(KEYNAME, m[1]); history.replaceState(null, '', location.pathname + location.search); }
      return localStorage.getItem(KEYNAME);
    } catch (e) { return null; }
  }
  const hasKey = () => !!getKey();
  async function ckey() {
    if (CK) return CK;
    const k = getKey();
    if (!k) throw new Error('nokey');
    CK = await crypto.subtle.importKey('raw', b64u(k), 'AES-GCM', false, ['decrypt']);
    return CK;
  }
  async function gunzip(buf) {
    const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function raw(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error('http ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer());
    const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, await ckey(), b.subarray(12));
    return gunzip(p);
  }
  const dec = async path => new TextDecoder().decode(await raw(path));
  const json = async path => JSON.parse(await dec(path));

  // Ajouts faits depuis GitHub : chiffrés avec une clé publique RSA, lisibles ici seulement.
  async function rsaKey() {
    if (RSA) return RSA;
    const der = await raw('data/rsa.bin');
    RSA = await crypto.subtle.importKey('pkcs8', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
    return RSA;
  }
  async function addRecord(path) {
    const e = await (await fetch(path)).json();
    const ak = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, await rsaKey(), b64(e.k));
    const key = await crypto.subtle.importKey('raw', ak, 'AES-GCM', false, ['decrypt']);
    const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(e.iv) }, key, b64(e.ct));
    return JSON.parse(new TextDecoder().decode(p));
  }

  // Couvertures dessinées (SVG) pour les posts sans miniature.
  const COL = { 'Jardin & plantes': '#3f8f5a', 'Cuisine': '#d9822b', 'Restos & bonnes adresses': '#c04a36', 'Voyage & sorties': '#2c86b8', 'Livres, histoire & culture': '#7b5db5', 'Développement personnel': '#c99a1d', 'Couple & relations': '#d0507a', 'Tech & IA': '#3a68c9', 'Sport & rugby': '#26907f', 'Golf': '#5f9e43', 'Montres & mode': '#6f6f7c', 'Langues': '#a8601a', 'Famille & enfants': '#d99a2f', 'Design & photo': '#b247a3', 'Maison & bricolage': '#85673f', 'Humour': '#d9a812', 'Actualité & société': '#52606d', 'Autre': '#85909a' };
  const xe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clean = s => String(s || '').replace(/https?:\/\/\S+/g, ' ').replace(/[#@]\S+/g, ' ').replace(/[^\p{Script=Latin}\p{N}\p{P}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  function wrap(text, max, maxLines) {
    const lines = []; let cur = '';
    for (let w of text.split(' ')) {
      while (w.length > max) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, max)); w = w.slice(max); }
      if (!w) continue;
      if ((cur + ' ' + w).trim().length <= max) cur = (cur + ' ' + w).trim(); else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { const k = lines.slice(0, maxLines); k[maxLines - 1] = k[maxLines - 1].replace(/.{0,3}$/, '').trimEnd() + '...'; return k; }
    return lines;
  }
  const covers = new Map();
  function cover(b) {
    const k = b.id; if (covers.has(k)) return covers.get(k);
    const color = COL[b.category] || '#85909a';
    const lines = wrap(clean(b.title) || clean(b.snippet) || b.category || '', 14, 5);
    const lh = 36, y0 = 205 - ((lines.length - 1) * lh) / 2 + 8;
    const F = 'font-family="-apple-system,Helvetica,Arial,sans-serif" font-weight="bold"';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.96"/><stop offset="1" stop-color="#2c3544"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="330" cy="70" r="130" fill="#fff" fill-opacity="0.07"/><circle cx="60" cy="360" r="110" fill="#000" fill-opacity="0.10"/><text x="200" y="78" text-anchor="middle" font-size="20" fill="#fff" fill-opacity="0.82" ${F}>${xe(('@' + (b.author || '')).slice(0, 22))}</text>${lines.map((l, i) => `<text x="200" y="${(y0 + i * lh).toFixed(0)}" text-anchor="middle" font-size="28" fill="#fff" ${F}>${xe(l)}</text>`).join('')}<text x="200" y="350" text-anchor="middle" font-size="18" fill="#fff" fill-opacity="0.72" ${F}>${xe(clean(b.category).slice(0, 26))}</text></svg>`;
    const u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    covers.set(k, u); return u;
  }

  // Paquets de miniatures et de légendes, chargés à la demande.
  const T = {}, C = {}, loading = {};
  function pack(name, into) {
    if (!loading[name]) loading[name] = json('data/' + name + '.bin').then(o => { Object.assign(into, o); }).catch(() => { loading[name] = null; });
    return loading[name];
  }
  const thumbPack = (b, recent) => (recent && recent.has(b.id)) ? pack('t-r', T) : (b.tp != null ? pack('t-' + b.tp, T) : null);
  const thumb = id => T[id] ? 'data:image/webp;base64,' + T[id] : null;
  const caption = async b => { if (b.cp == null) return b.caption || ''; await pack('c-' + b.cp, C); return C[b.id] || ''; };

  window.SG = { hasKey, dec, json, addRecord, cover, thumbPack, thumb, caption, COL };
})();
