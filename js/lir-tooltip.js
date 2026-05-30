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

const TOOLTIP_SELECTOR = '.lir-btn, .topbar-menu-toggle';

function labelFor(btn) {
  const tip = btn.getAttribute('data-tip');
  if (tip) return tip.trim();
  const cap = btn.querySelector('.lir-label');
  if (cap && cap.textContent.trim()) return cap.textContent.trim();
  return (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim();
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
    tip.textContent = label;
    const r = btn.getBoundingClientRect();
    tip.style.top = `${Math.round(r.bottom + 8)}px`;
    tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
    /* reflow so the enter transition always plays */
    tip.offsetWidth;
    tip.classList.add('lir-tip-visible');
  }

  function hide() {
    current = null;
    tip.classList.remove('lir-tip-visible');
  }

  document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest(TOOLTIP_SELECTOR);
    if (btn && btn !== current) show(btn);
  });
  document.addEventListener('mouseout', (e) => {
    const btn = e.target.closest(TOOLTIP_SELECTOR);
    if (btn && !btn.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', (e) => {
    const btn = e.target.closest(TOOLTIP_SELECTOR);
    if (btn) show(btn);
  });
  document.addEventListener('focusout', hide);
  /* Clicking an icon (which often opens a panel) should dismiss the tooltip. */
  document.addEventListener('click', (e) => {
    if (e.target.closest(TOOLTIP_SELECTOR)) hide();
  });
  /* Keep it glued to its button if the page scrolls/resizes while shown. */
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
