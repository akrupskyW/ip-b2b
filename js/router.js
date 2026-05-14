import { defaultRouteId } from './routes.js';

/** @returns {string | null} route id from hash `#/products` or null */
export function getRouteFromHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return null;
  const seg = raw.split(/[/?]/)[0];
  try {
    return decodeURIComponent(seg) || null;
  } catch {
    return seg || null;
  }
}

export function pushRoute(id) {
  const next = '#/' + encodeURIComponent(id);
  if (location.hash !== next) location.hash = next;
}

/**
 * @param {(id: string) => void} onRoute — receives resolved module id
 * @param {(id: string | null) => boolean} isValid — whether id maps to a screen
 * @returns {() => void} invoke to sync current `location.hash` to the app
 */
export function subscribeRoute(onRoute, isValid) {
  const notify = () => {
    const raw = getRouteFromHash();
    const id = isValid(raw) ? raw : defaultRouteId;
    onRoute(id);
  };
  window.addEventListener('hashchange', notify);
  return notify;
}
