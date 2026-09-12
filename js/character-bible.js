/* =============================================================================
   character-bible.js — a cast told as plates, inside a chat transcript.

   A campaign that puts characters in public has to say who they are, and a
   gallery cannot: artwork shows the face but not the role, the voice, or the
   line each one owns. This is that page of the bible — one plate per character,
   the art above and the facts under it, reading in the prose column rather than
   bleeding to the module edges, because it is reference and not spectacle.

   One shared definition. A host supplies the cast and drops the markup into a
   reply; the stylesheet writes itself once.

     characterBibleHtml({ id, label, caption, base, cast })
     cast: [{ name, line, accent, art, thumb, w, h, facts: [[term, detail]] }]

   `accent` names one of the pairs below rather than passing a colour, so every
   value has a dark-mode twin by construction.
   ========================================================================== */

import { esc } from './escape-html.js';

const STYLE_ID = 'wise-character-bible-styles';

/* Every accent is declared as a light / dark pair. A caller naming an accent
   that is not here simply inherits the body ink, which is legible either way. */
const ACCENTS = ['red', 'blue', 'green'];

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.appendChild(style);
  style.textContent = `
.sc-line-body .wcb { margin: 1.1em 0 0.35em; padding: 0; border: 0; }
.wcb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 20px;
  align-items: start;
}
.wcb-card { display: flex; flex-direction: column; gap: 0; margin: 0; }
/* The plate art. A rounded frame is the same treatment the transcript
   galleries give a finished piece, so a plate reads as artwork and not as an
   icon on a tile. */
.wcb-frame {
  display: block;
  overflow: hidden;
  border-radius: 12px;
  background: color-mix(in srgb, var(--text) 8%, transparent);
}
.wcb-art {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: var(--wcb-ar, 0.75);
  object-fit: cover;
}
.wcb-name {
  font-family: 'WISE Digits', var(--font-serif);
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 12px 0 0;
  color: var(--text);
}
.wcb-line {
  margin: 3px 0 0;
  font-size: 0.86em;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.3;
  color: var(--wcb-accent, var(--text));
}
.wcb-facts { margin: 10px 0 0; padding: 0; }
.wcb-fact { margin: 0 0 8px; padding: 0 0 8px; border-bottom: 1px solid var(--border); }
.wcb-fact:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
.wcb-fact dt {
  margin: 0;
  font-size: 0.7em;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.wcb-fact dd { margin: 3px 0 0; font-size: 0.86em; line-height: 1.45; color: var(--text); }
.wcb-cap {
  margin: 14px 2px 0;
  font-size: 0.78em;
  line-height: 1.45;
  color: var(--text-muted);
}
html.dark .wcb-fact { border-bottom-color: color-mix(in srgb, var(--text) 14%, transparent); }
.wcb-card[data-accent="red"] { --wcb-accent: #A63A2E; }
.wcb-card[data-accent="blue"] { --wcb-accent: var(--primary, #25507C); }
.wcb-card[data-accent="green"] { --wcb-accent: #4E7A2E; }
html.dark .wcb-card[data-accent="red"] { --wcb-accent: #E8907F; }
html.dark .wcb-card[data-accent="blue"] { --wcb-accent: #93B9DE; }
html.dark .wcb-card[data-accent="green"] { --wcb-accent: #A0CE6C; }
`;
}

function factsHtml(facts) {
  const rows = Array.isArray(facts) ? facts : [];
  if (!rows.length) return '';
  return (
    '<dl class="wcb-facts">'
    + rows.map(([term, detail]) => (
      '<div class="wcb-fact">'
      + `<dt>${esc(term)}</dt>`
      + `<dd>${esc(detail)}</dd>`
      + '</div>'
    )).join('')
    + '</dl>'
  );
}

function cardHtml(c, base) {
  const accent = ACCENTS.indexOf(c.accent) >= 0 ? c.accent : '';
  const b = String(base || '').replace(/\/$/, '');
  const full = c.art ? (b ? `${b}/${c.art}.jpg` : `${c.art}.jpg`) : '';
  const thumb = c.art && b ? `${b}/thumbs/${c.art}.jpg` : full;
  const ar = c.w && c.h ? (c.w / c.h) : 0.75;
  const alt = c.line ? `${c.name} — ${c.line}` : c.name;
  return (
    `<article class="wcb-card"${accent ? ` data-accent="${esc(accent)}"` : ''}>`
    + (full
      ? '<span class="wcb-frame">'
        + `<img class="wcb-art" src="${esc(thumb)}" alt="${esc(alt)}"`
        + ` width="${esc(c.w || 768)}" height="${esc(c.h || 1024)}"`
        + ` style="--wcb-ar: ${ar.toFixed(4)}" loading="lazy" decoding="async">`
        + '</span>'
      : '')
    + `<h4 class="wcb-name">${esc(c.name || '')}</h4>`
    + (c.line ? `<p class="wcb-line">${esc(c.line)}</p>` : '')
    + factsHtml(c.facts)
    + '</article>'
  );
}

/** Markup for one bible page: a plate per character, in the reading column. */
export function characterBibleHtml(opts) {
  const o = opts || {};
  const cast = Array.isArray(o.cast) ? o.cast : [];
  const id = o.id || `wcb-${Math.random().toString(36).slice(2, 9)}`;
  const label = o.label || 'The cast';
  injectStyles();
  return (
    `<figure class="wcb" data-wcb="${esc(id)}" role="region" aria-label="${esc(label)}">`
    + `<div class="wcb-grid">${cast.map((c) => cardHtml(c, o.base)).join('')}</div>`
    + (o.caption ? `<figcaption class="wcb-cap">${esc(o.caption)}</figcaption>` : '')
    + '</figure>'
  );
}

/* The stylesheet is written on first render, but a transcript restored from
   history can paint plates before any builder runs — so land it on load too. */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }
}

if (typeof window !== 'undefined') {
  window.WiseCharacterBible = { html: characterBibleHtml };
}
