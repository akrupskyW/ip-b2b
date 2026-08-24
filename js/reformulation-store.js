/* =============================================================================
   reformulation-store.js — shared save for a reformulated recipe.

   The Reformulation Studio writes the live per-serving recipe here. Product
   pages (view / add / portfolio Guiding Stars) read the same record so a save
   is the product — not a studio-only draft.

   Keyed by UPC digits first, then catalog id. Reset-to-original removes the
   record so every reader falls back to the printed label.
   ========================================================================== */
(function (global) {
  'use strict';
  if (global.WISEReformulationStore) return;

  var KEY = 'wise-reformulations';

  function digits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  function readAll() {
    try {
      var raw = global.localStorage.getItem(KEY);
      var map = raw ? JSON.parse(raw) : {};
      return map && typeof map === 'object' ? map : {};
    } catch (_) {
      return {};
    }
  }

  function writeAll(map) {
    try { global.localStorage.setItem(KEY, JSON.stringify(map)); } catch (_) {}
  }

  function asQuery(q) {
    if (q && typeof q === 'object') return q;
    return { id: q, upc: q, name: q };
  }

  function recordMatches(rec, q) {
    if (!rec || !q) return false;
    var id = q.id != null ? String(q.id) : '';
    var name = q.name != null ? String(q.name) : '';
    var short = q.short != null ? String(q.short) : '';
    var upc = digits(q.upc);
    if (id && rec.id && id === String(rec.id) && id !== 'custom') return true;
    if (upc && digits(rec.upc) === upc) return true;
    if (name && rec.name && name === rec.name) return true;
    if (short && rec.short && short === rec.short) return true;
    if (name && rec.short && name === rec.short) return true;
    return false;
  }

  function get(q) {
    if (q == null || q === '') return null;
    var map = readAll();
    if (typeof q === 'string' || typeof q === 'number') {
      var s = String(q);
      if (map[s]) return map[s];
      var d = digits(s);
      if (d && map[d]) return map[d];
      var i;
      var keys = Object.keys(map);
      for (i = 0; i < keys.length; i++) {
        if (recordMatches(map[keys[i]], { id: s, upc: s, name: s })) return map[keys[i]];
      }
      return null;
    }
    var query = asQuery(q);
    var upcKey = digits(query.upc);
    if (upcKey && map[upcKey]) return map[upcKey];
    if (query.id && map[query.id]) return map[query.id];
    var k;
    for (k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k) && recordMatches(map[k], query)) return map[k];
    }
    return null;
  }

  function save(rec) {
    if (!rec) return null;
    var map = readAll();
    var entry = {
      id: rec.id || '',
      upc: rec.upc || '',
      name: rec.name || '',
      short: rec.short || rec.name || '',
      recipe: rec.recipe || {},
      score: rec.score || null,
      algoPick: rec.algoPick || 'auto',
      scoringBasis: rec.scoringBasis || 'all',
      savedAt: new Date().toISOString(),
    };
    var keys = [];
    var d = digits(entry.upc);
    if (d) keys.push(d);
    if (entry.id && entry.id !== 'custom') keys.push(entry.id);
    if (!keys.length && entry.name) keys.push(entry.name);
    if (!keys.length) return null;
    keys.forEach(function (k) { map[k] = entry; });
    writeAll(map);
    try {
      global.dispatchEvent(new CustomEvent('wise-reformulation-saved', { detail: entry }));
    } catch (_) {}
    return entry;
  }

  function remove(q) {
    var found = get(q);
    if (!found) return false;
    var map = readAll();
    Object.keys(map).forEach(function (k) {
      if (recordMatches(map[k], found) || recordMatches(map[k], asQuery(q))) delete map[k];
    });
    writeAll(map);
    try {
      global.dispatchEvent(new CustomEvent('wise-reformulation-cleared', { detail: found }));
    } catch (_) {}
    return true;
  }

  function recipeOf(q) {
    var rec = get(q);
    return rec && rec.recipe ? rec.recipe : null;
  }

  global.WISEReformulationStore = {
    KEY: KEY,
    get: get,
    save: save,
    remove: remove,
    recipeOf: recipeOf,
    readAll: readAll,
  };
})(typeof window !== 'undefined' ? window : globalThis);
