/**
 * Shared modal — one scrim / sheet / open-close path for every board.
 *
 * Full-bleed by default. Pass `panel: true` for a centered card (photo
 * picker, verify confirm). Former dash- / vf- / adm- / wmod- families
 * alias the same CSS, so leftover markup still paints.
 *
 *   openModal({ id, html, panel, onClose })
 *   modalHTML({ title, eyebrow, sub, body, foot })
 *   closeModal(idOrEl)
 */

import { esc } from './escape-html.js';

const HANDLERS = new WeakMap();

function scrimOf(idOrEl) {
  if (!idOrEl) return null;
  if (typeof idOrEl !== 'string') return idOrEl;
  return document.getElementById(idOrEl);
}

/**
 * Dialog sheet markup. Title / eyebrow / sub / body / foot may contain
 * trusted HTML — escape caller-owned strings before passing them in.
 */
export function modalHTML({
  title = '',
  titleId = 'wise-modal-title',
  eyebrow = '',
  sub = '',
  body = '',
  bodyClass = '',
  foot = '',
  closeAttrs = 'data-wise-modal-close',
  closeLabel = 'Close',
  modalClass = '',
} = {}) {
  const extra = modalClass ? ` ${modalClass}` : '';
  const bodyExtra = bodyClass ? ` ${bodyClass}` : '';
  return `
    <div class="wise-modal${extra}" role="dialog" aria-modal="true" aria-labelledby="${esc(titleId)}">
      <header class="wise-modal-head">
        <div class="wise-modal-titles">
          ${eyebrow ? `<span class="wise-modal-eyebrow">${eyebrow}</span>` : ''}
          <h2 class="wise-modal-title" id="${esc(titleId)}">${title}</h2>
          ${sub ? `<p class="wise-modal-sub">${sub}</p>` : ''}
        </div>
        <button type="button" class="wise-modal-close" ${closeAttrs} aria-label="${esc(closeLabel)}">
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      ${body ? `<div class="wise-modal-body${bodyExtra}">${body}</div>` : ''}
      ${foot ? `<footer class="wise-modal-foot">${foot}</footer>` : ''}
    </div>`;
}

/** Right-aligned action cluster for `foot`. Optional `left` sits opposite. */
export function modalFoot({ left = '', actions = '' } = {}) {
  return `${left || '<span></span>'}<div class="wise-modal-foot-right">${actions}</div>`;
}

/**
 * Mount (or reuse) a scrim, paint `html`, fade in, bind Escape + scrim click.
 * @returns {{ scrim: HTMLElement, modal: Element | null, close: () => void }}
 */
export function openModal(opts = {}) {
  const {
    id,
    html,
    panel = false,
    extraScrimClass = '',
    persistent = false,
    closeOnScrim = true,
    closeOnEscape = true,
    onClose,
    onOpen,
  } = opts;

  if (id && !persistent) {
    const existing = document.getElementById(id);
    if (existing) closeModal(existing, { remove: true });
  }

  let scrim = (persistent && id) ? document.getElementById(id) : null;
  let created = false;
  if (!scrim) {
    created = true;
    scrim = document.createElement('div');
    if (id) scrim.id = id;
    document.body.appendChild(scrim);
  }

  const panelCls = panel ? ' wise-modal-scrim--panel' : '';
  const extra = extraScrimClass ? ` ${extraScrimClass}` : '';
  scrim.className = `wise-modal-scrim${panelCls}${extra}`.trim();
  if (persistent) scrim.dataset.wiseModalPersistent = '1';
  else delete scrim.dataset.wiseModalPersistent;

  if (html != null) scrim.innerHTML = html;

  const close = () => closeModal(scrim, { remove: !persistent, onClose });

  if (created || !HANDLERS.has(scrim)) {
    const onKey = (e) => {
      const rec = HANDLERS.get(scrim);
      if (e.key !== 'Escape' || !rec || rec.closeOnEscape === false) return;
      e.stopPropagation();
      rec.close();
    };
    const onClick = (e) => {
      const rec = HANDLERS.get(scrim);
      if (!rec) return;
      if (rec.closeOnScrim && e.target === scrim) rec.close();
      else if (e.target.closest && e.target.closest('[data-wise-modal-close]')) rec.close();
    };
    scrim.addEventListener('click', onClick);
    HANDLERS.set(scrim, { onKey, close, closeOnEscape, closeOnScrim });
  } else {
    Object.assign(HANDLERS.get(scrim), { close, closeOnEscape, closeOnScrim });
  }
  const { onKey } = HANDLERS.get(scrim);
  document.removeEventListener('keydown', onKey, true);
  document.addEventListener('keydown', onKey, true);

  requestAnimationFrame(() => {
    scrim.classList.add('is-open');
    if (typeof onOpen === 'function') onOpen(scrim, scrim.querySelector('.wise-modal'));
  });

  return { scrim, modal: scrim.querySelector('.wise-modal'), close };
}

/**
 * Fade out a scrim. Persistent pickers stay in the DOM; one-shot dialogs
 * are removed after the transition.
 */
export function closeModal(idOrEl, opts = {}) {
  const { remove = true, onClose } = opts;
  const scrim = scrimOf(idOrEl);
  if (!scrim) return;
  const rec = HANDLERS.get(scrim);
  if (rec) document.removeEventListener('keydown', rec.onKey, true);
  scrim.classList.remove('is-open', 'is-in');
  const finish = () => {
    if (remove && scrim.parentNode) {
      HANDLERS.delete(scrim);
      scrim.remove();
    }
    if (typeof onClose === 'function') onClose();
  };
  setTimeout(finish, 200);
}

if (typeof window !== 'undefined') {
  window.WiseModalHTML = modalHTML;
  window.WiseModalFoot = modalFoot;
  window.WiseOpenModal = openModal;
  window.WiseCloseModal = closeModal;
}
