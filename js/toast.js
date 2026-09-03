/**
 * Shared toast — one wrap/append/is-in/timeout path for every board.
 *
 * Variant picks the wrap id and CSS class so existing page styles keep
 * applying (adm / inv / pf / ma pills, wmod, the agent-shell card).
 * Call toast(msg, icon, variant) or createToast(variant) for a bound helper.
 */

import { esc } from './escape-html.js';

const VARIANTS = {
  adm:  { wrapId: 'adm-toast-wrap', toastClass: 'adm-toast' },
  inv:  { wrapId: 'inv-toast-wrap', toastClass: 'inv-toast' },
  pf:   { wrapId: 'pf-toast-wrap',  toastClass: 'pf-toast' },
  ma:   { wrapId: 'ma-toast-wrap',  toastClass: 'ma-toast' },
  wmod: { wrapId: 'wmod-toast-wrap', toastClass: 'wmod-toast', wrapClass: 'wmod-toast-wrap' },
  ag:   { wrapId: 'ag-toast-wrap',  toastClass: 'ag-toast', enter: 'css-anim' },
};

function specFor(variant) {
  return VARIANTS[variant] || VARIANTS.adm;
}

function leaveIsIn(t) {
  t.classList.remove('is-in');
  setTimeout(() => t.remove(), 260);
}

function leaveFade(t) {
  t.style.transition = 'opacity .3s ease, transform .3s ease';
  t.style.opacity = '0';
  t.style.transform = 'translateY(8px)';
  setTimeout(() => t.remove(), 320);
}

/**
 * Show a toast.
 * @param {string} msg
 * @param {string} [icon='check']
 * @param {string} [variant='adm'] adm | inv | pf | ma | wmod | ag
 */
export function toast(msg, icon = 'check', variant = 'adm') {
  const spec = specFor(variant);
  let wrap = document.getElementById(spec.wrapId);
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = spec.wrapId;
    if (spec.wrapClass) wrap.className = spec.wrapClass;
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = spec.toastClass;
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  if (spec.enter !== 'css-anim') {
    requestAnimationFrame(() => t.classList.add('is-in'));
  }
  setTimeout(() => {
    if (spec.enter === 'css-anim') leaveFade(t);
    else leaveIsIn(t);
  }, 2600);
}

/** Bound toast(msg, icon) that always uses `variant`. */
export function createToast(variant) {
  return (msg, icon = 'check') => toast(msg, icon, variant);
}

if (typeof window !== 'undefined') {
  window.WiseToast = toast;
  window.WiseCreateToast = createToast;
}
