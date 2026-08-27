/* Top-bar / rail icon tooltip.
 *
 * The rail buttons (Menu, the section/agent icons, Alerts, More, layout
 * toggles, …) no longer carry a text caption under the glyph. Instead, hovering
 * / focusing an icon shows a single floating tooltip instantly — no click.
 * Most top-bar icons get it centered just below; the left-nav collapse toggle
 * (`.topbar-menu-toggle` in the vertical menu) pins it to the right — same
 * placement as `#menu-rail-tip` on collapsed nav rows. We position it `fixed`
 * via JS so it can escape overflow clipping that would clip a CSS-only tip.
 *
 * Every icon-only control in the app is covered (reports, checks, module
 * header ⋯ / width, composer icons, …). Row ⋮ buttons that open a menu are
 * excluded — the menu is the hover result, not a tooltip. The label is read
 * from `data-tip`, then `.lir-label`, then `aria-label` / `title`. Listeners
 * are delegated on the document so dynamically-rendered buttons are included.
 */

/* Named controls that always get the card (including a few that carry visible
   text — intent chips, Appearance terms). Icon-only buttons elsewhere are
   picked up by isIconOnly() so every glyph in the app labels itself on hover
   without a click. */
const TOOLTIP_SELECTOR =
  '.lir-btn, .topbar-menu-toggle, .panel-flip-btn, .panel-width-toggle-btn, ' +
  '.panel-more-btn, .panel-close-btn, .panel-ctrl-btn, .wiseai-dock-flip, .dash-term, ' +
  '.topbar-appearance-btn, #menu-footer-layout-btn, ' +
  '.wise-popover--appearance [data-tip], ' +
  '.rf-tool-ico, .rf-rpt-plus, .wa-titledrop-plus, ' +
  '.ws-intent-chip, .sc-reply-chips .chip, .sc-inline-chips .chip, ' +
  '.pf-reports-btn, .pf-datemenu-btn, .pf-module-menu-btn, ' +
  '.vf-check, .pf-ico, .fl-icon-btn, .sc-send, .adm-icon-btn';

const CANDIDATE_SELECTOR =
  'button, a[href], [role="button"], [data-tip], .lir-btn, .ws-intent-chip, ' +
  '.sc-reply-chips .chip, .sc-inline-chips .chip, .dash-term';

/* Status chips have their own explainer card (chip-tooltip.js). Menu rows carry
   a text label already. Text CTAs (Review & Claim, Complete details) are not
   icon-only. Row ⋮ and other kebab triggers that open a popover are skipped
   so hover/click opens the menu instead of an "Actions" tooltip. Named
   click-to-open menus still get a tip via TOOLTIP_SELECTOR (checked first). */
const SKIP_SELECTOR =
  '.pf-chip, .vf-chip, .gv-chip, .ib-gras, .ib-pl, .pf-claim-btn, .pf-row-act, ' +
  '.pf-head-btn, .pf-loadmore, ' +
  '.pf-rowmenu-btn, .adm-rowmenu-btn, .inv-rowmenu-btn, .ma-rowmenu-btn, .nud-rowmenu-btn, ' +
  '[aria-haspopup="true"], [aria-haspopup="menu"]';
const SKIP_ANCESTOR =
  '[role="menu"], .pf-module-menu-pop, .pf-rowmenu-pop, .pf-datemenu-pop, ' +
  '.topbar-popover, .wise-popover, #lir-tooltip, .ct-card, .nudge-dismiss-pop';

/* The History / Turns modules (`.wch-sidebar`) run their own dark tooltip in
   chat-history.js, so we stand down for their controls to avoid a double tip.
   Collapsed / pivoted nav rows already get `#menu-rail-tip` — don't stack a
   second card on the Appearance footer button in those states. */
function ownedElsewhere(btn) {
  if (btn.closest && btn.closest('.wch-sidebar')) return true;
  if (btn.id === 'menu-footer-layout-btn' &&
      btn.closest('#menu-panel.mp-rail, #menu-panel.mp-pivot, .menu-footer--search-float')) {
    return true;
  }
  return false;
}

function visibleTextWithoutIcons(el) {
  try {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.material-symbols-outlined, svg, img, .lir-label').forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  } catch (_) {
    return '';
  }
}

function isIconOnly(el) {
  if (!el || !el.matches) return false;
  if (el.closest && el.closest(SKIP_ANCESTOR)) return false;
  if (el.matches(SKIP_SELECTOR)) return false;
  const hasIcon = !!(el.querySelector && el.querySelector('.material-symbols-outlined, svg, img'));
  if (!hasIcon && !el.hasAttribute('data-tip')) return false;
  const leftover = visibleTextWithoutIcons(el);
  if (leftover.length > 2) return false;
  return hasIcon || el.hasAttribute('data-tip');
}

function tipTarget(start) {
  if (!start || !start.closest) return null;
  const btn = start.closest(CANDIDATE_SELECTOR);
  if (!btn || ownedElsewhere(btn)) return null;
  if (btn.closest && btn.closest('#lir-tooltip, .ct-card')) return null;
  if (btn.matches(TOOLTIP_SELECTOR) || isIconOnly(btn)) return btn;
  return null;
}

function isAppearanceTrigger(btn) {
  return btn.id === 'menu-footer-layout-btn' ||
    btn.id === 'topbar-appearance-btn' ||
    btn.classList.contains('topbar-appearance-btn') ||
    btn.classList.contains('lir-layout-btn');
}

const GLYPH_LABELS = {
  more_vert: 'Actions',
  more_horiz: 'More',
  description: 'Reports',
  receipt_long: 'Report',
  check_box_outline_blank: 'Select',
  check_box: 'Selected',
  width_normal: 'Width',
  width_wide: 'Width',
  width_full: 'Width',
  close: 'Close',
  search: 'Search',
  settings: 'Settings',
  filter_list: 'Filter',
  download: 'Download',
  upload: 'Upload',
  edit: 'Edit',
  visibility: 'View',
  add: 'Add',
  info: 'Info',
  help: 'Help',
  notifications: 'Alerts',
  expand_more: 'Show more',
  chevron_right: 'Open',
  unfold_more: 'Resize',
  swap_horiz: 'Move',
  open_in_full: 'Expand',
  close_fullscreen: 'Collapse',
};

function glyphLabel(btn) {
  const icon = btn.querySelector && btn.querySelector('.material-symbols-outlined');
  if (!icon) return '';
  const raw = (icon.textContent || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (GLYPH_LABELS[raw]) return GLYPH_LABELS[raw];
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelFor(btn) {
  const tip = btn.getAttribute('data-tip');
  if (tip) return tip.trim();
  const cap = btn.querySelector('.lir-label');
  if (cap && cap.textContent.trim()) return cap.textContent.trim();
  const named = (btn.getAttribute('aria-label') || btn.getAttribute('title') ||
          btn.getAttribute('data-lir-title') || '').trim();
  if (named) return named;
  return glyphLabel(btn);
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
    if (btn.matches && btn.matches('.is-used, [aria-disabled="true"]')) return;
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
    const isIntentChip = !!(btn.matches && btn.matches('.ws-intent-chip, .sc-reply-chips .chip, .sc-inline-chips .chip'));
    const isStudioTool = !!(btn.matches && btn.matches('.rf-tool-ico'));
    const isReportPlus = !!(btn.matches && btn.matches('.rf-rpt-plus, .wa-titledrop-plus'));
    const preferAbove = !!(btn.closest('.wise-popover--appearance') || isAppearanceTrigger(btn) || isIntentChip || isStudioTool || isReportPlus);
    tip.classList.toggle('lir-tip-wrap', isIntentChip);
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
    tip.classList.remove('lir-tip-visible', 'lir-tip-right', 'lir-tip-above', 'lir-tip-wrap');
  }

  document.addEventListener('mouseover', (e) => {
    const btn = tipTarget(e.target);
    if (btn && btn !== current) show(btn);
  });
  document.addEventListener('mouseout', (e) => {
    const btn = tipTarget(e.target);
    if (btn && !btn.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', (e) => {
    const btn = tipTarget(e.target);
    if (btn) show(btn);
  });
  document.addEventListener('focusout', hide);
  /* Clicking an icon (which often opens a panel) should dismiss the tooltip.
     Capture phase so our title-restore runs BEFORE the button's own handler
     re-writes its `title` (the width toggle cycles its caption on click). */
  document.addEventListener('click', (e) => {
    if (tipTarget(e.target)) hide();
  }, true);
  /* Keep it glued to its button if the page scrolls/resizes while shown. */
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
