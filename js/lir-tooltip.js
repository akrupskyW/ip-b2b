/* Top-bar / rail icon tooltip.
 *
 * The rail buttons (Menu, the section/agent icons, Alerts, More, layout
 * toggles, …) no longer carry a text caption under the glyph. Instead, hovering
 * / focusing / tapping an icon shows a single floating tooltip. Most top-bar
 * icons get it centered just below; the left-nav collapse toggle
 * (`.topbar-menu-toggle` in the vertical menu) pins it to the right — same
 * placement as `#menu-rail-tip` on collapsed nav rows. We position it `fixed`
 * via JS so it can escape overflow clipping that would clip a CSS-only tip.
 *
 * The label text is read from `data-tip`, falling back to the (now hidden)
 * `.lir-label` caption, then `aria-label` / `title`. Listeners are delegated on
 * the document so dynamically-rendered rail buttons are covered automatically.
 */

/* Every icon-only control that lost its caption gets the same instant floating
   tooltip: the top-bar rail buttons, the menu collapse toggle, the per-module
   header toggles (move-side / double-width / close), the Appearance trigger in
   the primary nav, and every labelled control inside the Appearance popover.
   They expose their name via `data-tip`, `aria-label`, or `title`. */
const TOOLTIP_SELECTOR =
  '.lir-btn, .topbar-menu-toggle, .panel-flip-btn, .panel-width-toggle-btn, ' +
  '.panel-more-btn, .panel-close-btn, .panel-ctrl-btn, .wiseai-dock-flip, .dash-term, ' +
  '.topbar-appearance-btn, #menu-footer-layout-btn, ' +
  '.wise-popover--appearance [data-tip]';

/* The History / Turns modules (`.wch-sidebar`) run their own dark tooltip in
   chat-history.js, so we stand down for their controls to avoid a double tip.
   Collapsed / pivoted nav rows already get `#menu-rail-tip` — don't stack a
   second card on the Appearance footer button in those states. */
function ownedElsewhere(btn) {
  if (btn.closest && btn.closest('.wch-sidebar')) return true;
  if (btn.id === 'menu-footer-layout-btn' &&
      btn.closest('#menu-panel.mp-rail, #menu-panel.mp-pivot')) {
    return true;
  }
  return false;
}

function isAppearanceTrigger(btn) {
  return btn.id === 'menu-footer-layout-btn' ||
    btn.id === 'topbar-appearance-btn' ||
    btn.classList.contains('topbar-appearance-btn') ||
    btn.classList.contains('lir-layout-btn');
}

function labelFor(btn) {
  const tip = btn.getAttribute('data-tip');
  if (tip) return tip.trim();
  const cap = btn.querySelector('.lir-label');
  if (cap && cap.textContent.trim()) return cap.textContent.trim();
  return (btn.getAttribute('aria-label') || btn.getAttribute('title') ||
          btn.getAttribute('data-lir-title') || '').trim();
}

export function initLirTooltip() {
  if (window.__lirTooltipReady) return;
  window.__lirTooltipReady = true;

  let tip = document.getElementById('lir-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'lir-tooltip';
    tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
  }

  let current = null;

  function show(btn) {
    const label = labelFor(btn);
    if (!label) return;
    current = btn;
    /* Suppress the browser's native `title` bubble while our card is up, so the
       two don't stack. We stash it on `data-lir-title` and put it back on hide,
       which keeps dynamic titles (e.g. the width toggle's single/double/triple
       caption) intact. */
    const nativeTitle = btn.getAttribute('title');
    if (nativeTitle != null) {
      btn.setAttribute('data-lir-title', nativeTitle);
      btn.removeAttribute('title');
    }
    tip.textContent = label;
    const r = btn.getBoundingClientRect();
    /* Vertical left-nav collapse chevron — float the label to the right of the
       icon, matching the other collapsed-rail row tooltips. Appearance controls
       and the crossword trigger sit above / to the right of their target
       (never below), matching the appearance popover itself. Everything else
       keeps the default below placement. */
    const tipRight = btn.classList.contains('topbar-menu-toggle') &&
      !btn.closest('.mp-pivot');
    const preferAbove = !!(btn.closest('.wise-popover--appearance') || isAppearanceTrigger(btn));
    tip.classList.remove('lir-tip-right', 'lir-tip-above');
    if (tipRight) {
      tip.classList.add('lir-tip-right');
      tip.style.top = `${Math.round(r.top + r.height / 2)}px`;
      tip.style.left = `${Math.round(r.right + 10)}px`;
    } else if (preferAbove) {
      if (r.top > 40) {
        tip.classList.add('lir-tip-above');
        tip.style.top = `${Math.round(r.top - 8)}px`;
        const half = tip.offsetWidth / 2;
        const cx = Math.round(r.left + r.width / 2);
        tip.style.left = `${Math.round(Math.max(half + 8, Math.min(cx, window.innerWidth - half - 8)))}px`;
      } else {
        tip.classList.add('lir-tip-right');
        tip.style.top = `${Math.round(r.top + r.height / 2)}px`;
        tip.style.left = `${Math.round(r.right + 10)}px`;
      }
    } else {
      tip.style.top = `${Math.round(r.bottom + 8)}px`;
      tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
    }
    /* reflow so the enter transition always plays */
    tip.offsetWidth;
    tip.classList.add('lir-tip-visible');
  }

  function hide() {
    if (current && current.hasAttribute('data-lir-title')) {
      current.setAttribute('title', current.getAttribute('data-lir-title'));
      current.removeAttribute('data-lir-title');
    }
    current = null;
    tip.classList.remove('lir-tip-visible', 'lir-tip-right', 'lir-tip-above');
  }

  document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest(TOOLTIP_SELECTOR);
    if (btn && btn !== current && !ownedElsewhere(btn)) show(btn);
  });
  document.addEventListener('mouseout', (e) => {
    const btn = e.target.closest(TOOLTIP_SELECTOR);
    if (btn && !btn.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', (e) => {
    const btn = e.target.closest(TOOLTIP_SELECTOR);
    if (btn && !ownedElsewhere(btn)) show(btn);
  });
  document.addEventListener('focusout', hide);
  /* Clicking an icon (which often opens a panel) should dismiss the tooltip.
     Capture phase so our title-restore runs BEFORE the button's own handler
     re-writes its `title` (the width toggle cycles its caption on click). */
  document.addEventListener('click', (e) => {
    if (e.target.closest(TOOLTIP_SELECTOR)) hide();
  }, true);
  /* Keep it glued to its button if the page scrolls/resizes while shown. */
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
