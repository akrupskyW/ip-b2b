/**
 * nudge-toast-dismiss.js — Closing a floating nudge hides it until the next
 * page load. A hard refresh brings every nudge back.
 *
 * The × on every `.dash-score-toast` opens a tiny menu (above or to the right
 * of the icon, never below) with “Dismiss for now” and “Dismiss for session”.
 * Both hide the toast for this viewing only — nothing is written to
 * localStorage, sessionStorage, or cookies. Shared by the overview dashboard
 * and the Product Portfolio nudges.
 */
const hiddenThisView = new Set();

function forgetPersistentDismiss() {
  try { localStorage.removeItem('wise-nudge-dismiss'); } catch { /* private mode */ }
  try { sessionStorage.removeItem('wise-nudge-dismiss-session'); } catch { /* private mode */ }
  try {
    document.cookie.split(';').forEach((part) => {
      const name = part.trim().split('=')[0];
      if (name.indexOf('wise_nudge_forever_') === 0) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
      }
    });
  } catch { /* cookies may be disabled */ }
}

export function isNudgeDismissed(id) {
  if (!id) return false;
  return hiddenThisView.has(id);
}

function hideToast(toast) {
  if (!toast) return;
  toast.hidden = true;
  toast.classList.remove('is-paused');
  toast.setAttribute('hidden', '');
}

function applyDismissedToasts(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const nodes = scope.querySelectorAll
    ? scope.querySelectorAll('.dash-score-toast[data-nudge-id]')
    : [];
  nodes.forEach((toast) => {
    if (isNudgeDismissed(toast.getAttribute('data-nudge-id'))) hideToast(toast);
  });
}

let pop = null;

function closeDismissPop() {
  if (!pop) return;
  const { el, btn, toast, onDoc, onKey, onReposition } = pop;
  btn.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', onDoc, true);
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', onReposition);
  window.removeEventListener('scroll', onReposition, true);
  toast?.classList.remove('is-paused');
  el.remove();
  pop = null;
}

function placeDismissPop(el, btn) {
  const r = btn.getBoundingClientRect();
  const pw = el.offsetWidth || 180;
  const ph = el.offsetHeight || 76;
  const gap = 6;
  const canAbove = r.top >= ph + gap + 8;
  const canRight = window.innerWidth - r.right >= pw + gap + 8;
  let top;
  let left;
  if (canAbove) {
    top = r.top - ph - gap;
    left = r.right - pw;
  } else if (canRight) {
    top = r.top + r.height / 2 - ph / 2;
    left = r.right + gap;
  } else {
    top = Math.max(8, r.top - ph - gap);
    left = r.right - pw;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));
  el.style.left = Math.round(left) + 'px';
  el.style.top = Math.round(top) + 'px';
}

function dismissToast(toast) {
  const id = toast?.getAttribute('data-nudge-id');
  if (id) hiddenThisView.add(id);
  closeDismissPop();
  hideToast(toast);
}

function openDismissPop(btn) {
  const toast = btn.closest('.dash-score-toast');
  if (!toast) return;
  if (pop && pop.btn === btn) { closeDismissPop(); return; }
  closeDismissPop();

  toast.classList.add('is-paused');
  btn.setAttribute('aria-expanded', 'true');

  const el = document.createElement('div');
  el.className = 'nudge-dismiss-pop';
  el.setAttribute('role', 'menu');
  el.setAttribute('aria-label', 'Dismiss this tip');
  el.innerHTML =
    '<button type="button" class="nudge-dismiss-pop-item" role="menuitem" data-nudge-dismiss="now">' +
      '<span class="material-symbols-outlined" aria-hidden="true">snooze</span>' +
      'Dismiss for now' +
    '</button>' +
    '<button type="button" class="nudge-dismiss-pop-item" role="menuitem" data-nudge-dismiss="session">' +
      '<span class="material-symbols-outlined" aria-hidden="true">notifications_off</span>' +
      'Dismiss for session' +
    '</button>';
  document.body.appendChild(el);

  el.addEventListener('click', (e) => {
    const item = e.target.closest('[data-nudge-dismiss]');
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    dismissToast(toast);
  });

  const onReposition = () => placeDismissPop(el, btn);
  onReposition();
  requestAnimationFrame(onReposition);

  const onDoc = (ev) => {
    if (el.contains(ev.target) || btn.contains(ev.target)) return;
    closeDismissPop();
  };
  const onKey = (ev) => { if (ev.key === 'Escape') closeDismissPop(); };
  setTimeout(() => document.addEventListener('pointerdown', onDoc, true), 0);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition, true);

  pop = { el, btn, toast, onDoc, onKey, onReposition };
}

export function initNudgeToastDismiss() {
  if (window.__wiseNudgeToastDismiss) return;
  window.__wiseNudgeToastDismiss = true;
  forgetPersistentDismiss();

  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.dash-score-toast-close');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openDismissPop(btn);
  }, true);

  applyDismissedToasts(document);
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('.dash-score-toast[data-nudge-id]') ||
              node.querySelector?.('.dash-score-toast[data-nudge-id]')) {
            applyDismissedToasts(node);
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
}

window.WiseNudgeToast = { isDismissed: isNudgeDismissed, init: initNudgeToastDismiss };

initNudgeToastDismiss();
