/* Top-bar icon tooltip.
 *
 * The rail buttons (Menu, the section/agent icons, Alerts, More, layout
 * toggles, …) no longer carry a text caption under the glyph. Instead, hovering
 * / focusing / tapping an icon shows a single floating tooltip centered just
 * below it. We position it `fixed` via JS so it can escape the rail's
 * horizontal-scroll overflow, which would clip a CSS-only tooltip.
 *
 * The label text is read from `data-tip`, falling back to the (now hidden)
 * `.lir-label` caption, then `aria-label` / `title`. Listeners are delegated on
 * the document so dynamically-rendered rail buttons are covered automatically.
 */

/* Every icon-only control that lost its caption gets the same instant floating
   tooltip: the top-bar rail buttons, the menu collapse toggle, and the
   per-module header toggles (move-side / double-width / close). They expose
   their name via `data-tip`, `aria-label`, or `title`. */
const TOOLTIP_SELECTOR =
  '.lir-btn, .topbar-menu-toggle, .panel-flip-btn, .panel-width-toggle-btn, ' +
  '.panel-more-btn, .panel-close-btn, .panel-ctrl-btn, .wiseai-dock-flip, .dash-term';

/* The History / Turns modules (`.wch-sidebar`) run their own dark tooltip in
   chat-history.js, so we stand down for their controls to avoid a double tip. */
function ownedElsewhere(btn) {
  return !!(btn.closest && btn.closest('.wch-sidebar'));
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
    tip.style.top = `${Math.round(r.bottom + 8)}px`;
    tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
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
    tip.classList.remove('lir-tip-visible');
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
