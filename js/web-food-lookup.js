/**
 * Local-only web lookup for WISEcodeAI — Open Food Facts for brands, products,
 * and package photos; Wikipedia for the fact behind a question. Used so an
 * off-script answer can name real foods instead of inventing them.
 */

const PROXY = '/__wise/web?u=';
const OFF_SEARCH = 'https://search.openfoodfacts.org/search';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

function pageIsLocal() {
  try {
    const h = String(location.hostname || '');
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
  } catch (_) {
    return false;
  }
}

function fetchWithTimeout(url, ms) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (_) {} }, ms);
  return fetch(url, ctrl ? { signal: ctrl.signal } : {})
    .finally(() => clearTimeout(timer));
}

async function getJson(url, ms) {
  const urls = [];
  if (pageIsLocal()) urls.push(PROXY + encodeURIComponent(url));
  urls.push(url);
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const res = await fetchWithTimeout(urls[i], ms || 4000);
      if (res && res.ok) return await res.json();
    } catch (_) { /* try next */ }
  }
  return null;
}

function cleanQuery(question) {
  return String(question || '')
    .replace(/[?!.,]+/g, ' ')
    .replace(/^(hi|hello|hey|yo|please|can you|could you|would you|tell me( about)?|what(?:'s| is| are)|who(?:'s| is)|why(?: is| are| do| does)?|how(?: much| many| do| does| can)?|is it true that|should i)\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

const GREET_RE = /^(hi|hello|hey|yo|thanks|thank you|thx)\b/i;
const PRODUCT_RE = /\b(brand|upc|barcode|bar|cereal|cookie|cookies|yogurt|soda|chips|snack|granola|sauce|milk|bread|juice|coffee|tea|candy|chocolate|oreo|cheerios|kind|heinz|campbell|nestle|product|ingredient list|nutrition facts|calories|protein bar)\b/i;
const FACT_RE = /\b(can (dogs|cats|kids|you|i)|is .+ (healthy|safe|vegan|keto|paleo|toxic)|why |what is |what are |meaning of |should i |theobromine|caffeine|sugar|fiber|protein|vitamin|moon|cheese)\b/i;
const QUERY_STOP = /^(the|and|for|with|from|about|that|this|can|eat|have|drink|safe|made)$/;

function queryWords(query) {
  return String(query || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !QUERY_STOP.test(w));
}

function looksEnglish(s) {
  const t = String(s || '');
  if (!t) return false;
  if (/[\u0400-\u04FF\u0600-\u06FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(t)) return false;
  return /[A-Za-z]/.test(t);
}

function foodQuery(question, cleaned) {
  const stripped = String(cleaned || question || '')
    .replace(/\b(dogs|cats|kids|children|humans|people|you|i|can|eat|have|drink|safe|toxic|poisonous)\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || cleaned;
}

function wikiQuery(question, cleaned) {
  const q = String(question || '');
  const eat = q.match(/\bcan (dogs|cats|kids|children|humans|people|you|i) (?:eat|have|drink) (.+?)(?:\?|$)/i);
  if (eat) {
    const food = eat[2].replace(/\b(a|an|the|some)\b/ig, ' ').replace(/\s+/g, ' ').trim();
    if (food) return food + ' ' + eat[1] + ' toxicity';
  }
  const safe = q.match(/\bis (.+?) (safe|toxic|poisonous) (?:for|to) (dogs|cats|kids|children)/i);
  if (safe) return safe[1].trim() + ' ' + safe[3] + ' toxicity';
  return cleaned;
}

export function inferLookup(question) {
  const q = String(question || '').trim();
  if (!q) return { kind: 'none', query: '' };
  if (GREET_RE.test(q) && q.length < 28) return { kind: 'none', query: q };
  const query = cleanQuery(q) || q;
  const product = PRODUCT_RE.test(q);
  const fact = FACT_RE.test(q);
  if (product && fact) return { kind: 'both', query };
  if (product) return { kind: 'product', query };
  if (fact) return { kind: 'fact', query };
  if (query.split(/\s+/).length >= 2) return { kind: 'both', query };
  return { kind: 'fact', query };
}

function firstBrand(raw) {
  if (!raw) return '';
  if (Array.isArray(raw)) return String(raw[0] || '').split(',')[0].trim();
  return String(raw).split(',')[0].trim();
}

function pickNutrients(n) {
  if (!n || typeof n !== 'object') return null;
  const pick = (k) => (n[k] != null && n[k] !== '' ? n[k] : null);
  const out = {
    kcal: pick('energy-kcal_100g') ?? pick('energy-kcal'),
    protein: pick('proteins_100g'),
    sugar: pick('sugars_100g'),
    fat: pick('fat_100g'),
    salt: pick('salt_100g'),
  };
  return Object.values(out).some((v) => v != null) ? out : null;
}

function decentName(s) {
  const t = String(s || '').trim();
  if (t.length < 3 || t.length > 70) return false;
  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  const counts = {};
  words.forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
  if (Object.values(counts).some((n) => n >= 3)) return false;
  return true;
}

function skipPackagedFood(question) {
  return /\bcan (dogs|cats|kids|children|you|i) (?:eat|have|drink)\b/i.test(question)
    || /\b(toxic|poisonous|safe) (?:for|to) (dogs|cats|kids|children)\b/i.test(question);
}

function mapHit(p) {
  const code = String(p.code || '').trim();
  const name = String(p.product_name || p.product_name_en || '').trim();
  const brand = firstBrand(p.brands);
  const image = p.image_front_small_url || p.image_front_url || '';
  if (!name && !brand) return null;
  if (!looksEnglish(name || brand)) return null;
  if (brand && !looksEnglish(brand)) return null;
  if (name && !decentName(name)) return null;
  if (brand && !decentName(brand)) return null;
  return {
    name: name || brand,
    brand,
    code,
    image,
    quantity: String(p.quantity || '').trim(),
    ingredients: String(p.ingredients_text_en || p.ingredients_text || '').trim().slice(0, 240),
    nutrients: pickNutrients(p.nutriments),
    url: code ? ('https://world.openfoodfacts.org/product/' + encodeURIComponent(code)) : 'https://world.openfoodfacts.org',
  };
}

function scoreProduct(p, query) {
  const words = queryWords(query);
  const hay = ((p.brand || '') + ' ' + (p.name || '')).toLowerCase();
  if (words.length && !words.some((w) => hay.includes(w))) return -1;
  let n = 0;
  words.forEach((w) => { if (hay.includes(w)) n += 3; });
  if (p.image) n += 4;
  if (p.brand) n += 2;
  return n;
}

async function searchFoodsOnce(query, scoreQuery) {
  if (!query) return [];
  const url = OFF_SEARCH
    + '?q=' + encodeURIComponent(query)
    + '&page_size=8&fields=code,product_name,brands,image_front_url,image_front_small_url,ingredients_text_en,quantity,nutriments';
  const data = await getJson(url, 4500);
  const products = (data && (data.hits || data.products)) || [];
  const seen = new Set();
  return products.map(mapHit).filter(Boolean)
    .map((p) => ({ p, s: scoreProduct(p, scoreQuery || query) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p)
    .filter((p) => {
      const key = (p.brand + ' ' + p.name).toLowerCase()
        .replace(/s\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((p) => p.image)
    .slice(0, 2);
}

async function searchFoods(query) {
  const us = await searchFoodsOnce(query + ' countries_tags:"en:united-states" lang:en', query);
  if (us.length) return us;
  return searchFoodsOnce(query, query);
}

async function searchWiki(query) {
  if (!query) return null;
  const searchUrl = WIKI_API
    + '?action=query&list=search&srsearch=' + encodeURIComponent(query)
    + '&srlimit=1&format=json&origin=*';
  const found = await getJson(searchUrl, 3500);
  const title = found && found.query && found.query.search && found.query.search[0] && found.query.search[0].title;
  if (!title) return null;
  const sum = await getJson(WIKI_SUMMARY + encodeURIComponent(title), 3500);
  if (!sum || sum.type === 'disambiguation') return null;
  const extract = String(sum.extract || sum.description || '').trim();
  if (!extract) return null;
  return {
    title: String(sum.title || title).trim(),
    extract: extract.slice(0, 520),
    url: (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page)
      || ('https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_'))),
    image: (sum.thumbnail && sum.thumbnail.source) || '',
  };
}

async function searchWikiBest(question, cleaned) {
  const tuned = wikiQuery(question, cleaned);
  const first = await searchWiki(tuned);
  if (first) return first;
  if (tuned !== cleaned) return searchWiki(cleaned);
  return null;
}

/**
 * @returns {{ products: Array, wiki: object|null, refs: Array, source: string, text: string }}
 */
export async function gatherEvidence(question) {
  const look = inferLookup(question);
  const empty = { products: [], wiki: null, refs: [], source: '', text: '', look };
  if (look.kind === 'none') return empty;
  const wantFood = look.kind === 'product' || look.kind === 'both';
  const wantWiki = look.kind === 'fact' || look.kind === 'both';
  const foodQ = foodQuery(question, look.query);
  const [rawProducts, wiki] = await Promise.all([
    wantFood ? searchFoods(foodQ) : Promise.resolve([]),
    wantWiki ? searchWikiBest(question, look.query) : Promise.resolve(null),
  ]);
  let products = rawProducts || [];
  if (look.kind === 'fact' || skipPackagedFood(question)) products = [];
  if (look.kind === 'both' && wiki) products = products.slice(0, 1);
  const refs = [];
  if (wiki && look.kind !== 'product') {
    refs.push({ title: wiki.title, source: 'Wikipedia', url: wiki.url });
  }
  products.forEach((p) => {
    refs.push({
      title: (p.brand ? (p.brand + ' — ') : '') + p.name,
      source: 'Open Food Facts',
      url: p.url,
    });
  });
  if (wiki && look.kind === 'product') {
    refs.push({ title: wiki.title, source: 'Wikipedia', url: wiki.url });
  }
  let source = '';
  if (wiki && look.kind !== 'product') source = 'Wikipedia';
  else if (products.length) source = 'Open Food Facts';
  else if (wiki) source = 'Wikipedia';
  const bits = refs.map((r, i) => {
    const n = i + 1;
    if (r.source === 'Wikipedia' && wiki) {
      return '[' + n + '] Wikipedia — ' + wiki.title + ': ' + wiki.extract;
    }
    const p = products.find((x) => x.url === r.url) || {};
    return '[' + n + '] Open Food Facts — ' + (p.name || r.title)
      + (p.brand ? ' (brand ' + p.brand + ')' : '')
      + (p.quantity ? '; size ' + p.quantity : '')
      + (p.ingredients ? '; ingredients ' + p.ingredients : '')
      + (p.nutrients && p.nutrients.kcal != null ? '; kcal/100g ' + p.nutrients.kcal : '');
  });
  return { products: products || [], wiki, refs, source, text: bits.join('\n'), look };
}

if (typeof window !== 'undefined') window.WiseWebLookup = { inferLookup, gatherEvidence };
