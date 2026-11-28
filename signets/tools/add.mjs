// Ajoute un signet (appelé par le workflow add-signet). Les données sont chiffrées avec la clé publique RSA du dépôt.
import fs from 'fs';
import crypto from 'crypto';
import { scoreOf, decide, recipeInfo, titleOf, snippetOf, tagsOf } from '../classify.js';

const raw = String(process.env.ISSUE_TITLE || '');
const token = raw.split(/\s+/).find(x => x.includes('instagram.com/')) || raw;
const url = token.split('?')[0].replace(/\/+$/, '') + '/';
const m = url.match(/instagram\.com\/(?:([\w.]+)\/)?(p|reel|reels|tv)\/([\w-]+)/);
if (!m) { console.log('Pas un lien Instagram'); process.exit(2); }
const id = m[3];
let user = m[1] || '';
let cap = String(process.env.ISSUE_BODY || '').trim();
let imgUrl = '';
try {
  const r = await fetch(url, { headers: { 'user-agent': 'facebookexternalhit/1.1', 'accept-language': 'fr-FR,fr;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  const html = await r.text();
  const og = p => { const x = html.match(new RegExp('<meta[^>]+property="og:' + p + '"[^>]+content="([^"]*)"', 'i')) || html.match(new RegExp('<meta[^>]+content="([^"]*)"[^>]+property="og:' + p + '"', 'i')); return x ? x[1].replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))) : ''; };
  const d = og('description'), t = og('title');
  if (!cap) { const q = d.match(/:\s*["“](.*)["”]\.?\s*$/s); cap = (q ? q[1] : d).trim(); }
  if (!user) { const u = d.match(/-\s*([\w.]+)\s+on\s/) || t.match(/^(.+?)\s+on Instagram/); if (u) user = u[1].replace(/\s+/g, ''); }
  imgUrl = og('image');
} catch (e) { console.log('Lecture Instagram impossible :', e.message); }

let img = '';
if (imgUrl) {
  try {
    const b = Buffer.from(await (await fetch(imgUrl, { signal: AbortSignal.timeout(20000) })).arrayBuffer());
    try { const sharp = (await import('sharp')).default; img = 'data:image/webp;base64,' + (await sharp(b).resize(300, 300, { fit: 'cover' }).webp({ quality: 58 }).toBuffer()).toString('base64'); }
    catch { if (b.length < 120000) img = 'data:image/jpeg;base64,' + b.toString('base64'); }
  } catch (e) { console.log('Miniature impossible :', e.message); }
}

const cat = decide([scoreOf({ cap, user, name: '' })])[0];
const info = cat === 'Cuisine' ? recipeInfo(cap) : { is: false, ings: [], season: '' };
const rec = { id, u: url, a: user, t: titleOf(cap), s: snippetOf(cap), g: tagsOf(cap), ts: Math.floor(Date.now() / 1000), c: cat, r: info.is ? 1 : 0, i: info.ings, se: info.season, cap, img };

const pub = fs.readFileSync(new URL('../data/pub.pem', import.meta.url));
const ak = crypto.randomBytes(32), iv = crypto.randomBytes(12);
const c = crypto.createCipheriv('aes-256-gcm', ak, iv);
const ct = Buffer.concat([c.update(JSON.stringify(rec)), c.final(), c.getAuthTag()]);
const k = crypto.publicEncrypt({ key: pub, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, ak);
const dir = new URL('../adds/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(new URL(id + '.json', dir), JSON.stringify({ k: k.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') }));
const lf = new URL('list.json', dir);
const L = JSON.parse(fs.readFileSync(lf, 'utf8'));
if (!L.includes(id)) L.push(id);
fs.writeFileSync(lf, JSON.stringify(L));
console.log('ok', id, img ? 'avec miniature' : 'sans miniature');
