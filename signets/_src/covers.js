import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

// Le serveur n'a aucune police : on lui donne Open Sans (dossier fonts/) avant que sharp dessine du texte.
const here = path.dirname(fileURLToPath(import.meta.url));
const conf = path.join(os.tmpdir(), 'sg-fonts.conf');
fs.writeFileSync(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${path.join(here, 'fonts')}</dir><cachedir>${path.join(os.tmpdir(), 'sg-fc-cache')}</cachedir></fontconfig>`);
process.env.FONTCONFIG_FILE = conf;
const sharp = (await import('sharp')).default;

const COL = {
  'Jardin & plantes': '#3f8f5a', 'Cuisine': '#d9822b', 'Restos & bonnes adresses': '#c04a36', 'Voyage & sorties': '#2c86b8',
  'Livres, histoire & culture': '#7b5db5', 'Développement personnel': '#c99a1d', 'Couple & relations': '#d0507a', 'Tech & IA': '#3a68c9',
  'Sport & rugby': '#26907f', 'Golf': '#5f9e43', 'Montres & mode': '#6f6f7c', 'Langues': '#a8601a', 'Famille & enfants': '#d99a2f',
  'Design & photo': '#b247a3', 'Maison & bricolage': '#85673f', 'Humour': '#d9a812', 'Actualité & société': '#52606d', 'Autre': '#85909a'
};
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// On garde le latin, les chiffres et la ponctuation : la police ne sait pas dessiner le reste (emojis, coréen...).
const clean = s => String(s || '')
  .replace(/https?:\/\/\S+/g, ' ').replace(/[#@]\S+/g, ' ')
  .replace(/[^\p{Script=Latin}\p{N}\p{P}\s]/gu, ' ')
  .replace(/\s+/g, ' ').trim();

function wrap(text, max, maxLines) {
  const lines = []; let cur = '';
  for (let w of text.split(' ')) {
    while (w.length > max) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, max)); w = w.slice(max); }
    if (!w) continue;
    if ((cur + ' ' + w).trim().length <= max) cur = (cur + ' ' + w).trim();
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const k = lines.slice(0, maxLines); k[maxLines - 1] = k[maxLines - 1].replace(/.{0,3}$/, '').trimEnd() + '...'; return k; }
  return lines;
}

export async function coverBuf({ author, title, snippet, category }) {
  const color = COL[category] || '#85909a';
  const text = clean(title) || clean(snippet) || category || '';
  const lines = wrap(text, 14, 5);
  const lh = 36, y0 = 205 - ((lines.length - 1) * lh) / 2 + 8;
  const who = ('@' + (author || '')).slice(0, 22);
  const F = 'font-family="Open Sans, sans-serif" font-weight="bold"';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.96"/><stop offset="1" stop-color="#2c3544"/></linearGradient></defs>
<rect width="400" height="400" fill="url(#g)"/>
<circle cx="330" cy="70" r="130" fill="#ffffff" fill-opacity="0.07"/>
<circle cx="60" cy="360" r="110" fill="#000000" fill-opacity="0.10"/>
<text x="200" y="78" text-anchor="middle" font-size="20" fill="#ffffff" fill-opacity="0.82" ${F}>${esc(who)}</text>
${lines.map((l, i) => `<text x="200" y="${(y0 + i * lh).toFixed(0)}" text-anchor="middle" font-size="28" fill="#ffffff" ${F}>${esc(l)}</text>`).join('\n')}
<text x="200" y="350" text-anchor="middle" font-size="18" fill="#ffffff" fill-opacity="0.72" ${F}>${esc(clean(category).slice(0, 26))}</text>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toBuffer();
}

// Les signets dont Instagram refuse l'image reçoivent une couverture dessinée (état "gen").
export async function runCovers(limit = 500) {
  const { rows } = await pool.query("select id,author,title,snippet,category from bookmarks where thumb_state='fail' limit $1", [limit]);
  let n = 0;
  for (const r of rows) {
    try {
      const buf = await coverBuf(r);
      await pool.query("update bookmarks set thumb=$2, thumb_state='gen' where id=$1", [r.id, buf]);
      n++;
    } catch (e) { /* on laisse l'état tel quel */ }
  }
  return { covers: n, left: rows.length - n };
}
