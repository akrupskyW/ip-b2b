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
 * header ⋯ / width, composer icons, …) except the X / close glyph — that
 * mark is self-explanatory, so it never gets a hover card or a native
 * `title` bubble. Intent chips are excluded too — their label is already on
 * the chip, so a hover card or native title is banned. Row ⋮ buttons that
 * open a menu are excluded — the menu is the hover result (js/kebab-hover.js),
 * not a tooltip. The label is read from `data-tip`, then `.lir-label`, then
 * `aria-label` / `title`. Listeners are delegated on the document so
 * dynamically-rendered buttons are included.
 */

/* Named controls that always get the card (including a few that carry visible
   text — Appearance terms). Icon-only buttons elsewhere are picked up by
   isIconOnly() so every glyph in the app labels itself on hover without a
   click. Intent chips never get a tooltip — their label is already on the chip. */
const TOOLTIP_SELECTOR =
  '.lir-btn, .topbar-menu-toggle, .menu-modules-btn, .panel-flip-btn, .panel-width-toggle-btn, ' +
  '.panel-more-btn, .panel-ctrl-btn, .wiseai-dock-flip, .dash-term, ' +
  '.topbar-appearance-btn, #menu-footer-layout-btn, ' +
  '.wise-popover--appearance [data-tip], ' +
  '.rf-tool-ico, .rf-rpt-plus, .wa-titledrop-plus, ' +
  '.pf-datemenu-btn, .pf-module-menu-btn, ' +
  '.vf-check, .pf-ico, .fl-icon-btn, .sc-send, .adm-icon-btn, ' +
  '.sc-fb-btn, .sc-fb-id, .sc-helix-undo, .sc-helix-save';

const CANDIDATE_SELECTOR =
  'button, a[href], [role="button"], [data-tip], .lir-btn, .dash-term';

/* Status chips have their own explainer card (chip-tooltip.js). Intent chips
   already show their label — no hover card, no native title. Menu rows carry
   a text label already. Text CTAs (Review & Claim, Complete details) are not
   icon-only. Three-dot triggers that open a menu are skipped — the menu is
   the hover result (js/kebab-hover.js), not an "Actions" / "More options" card. */
const SKIP_SELECTOR =
  '.ws-intent-chip, .sc-reply-chips .chip, .sc-inline-chips .chip, .ws-chips .chip, .chip-dive, ' +
  '.pf-chip, .vf-chip, .gv-chip, .ib-gras, .ib-pl, .pf-claim-btn, .pf-row-act, ' +
  '.pf-head-btn, .pf-loadmore, ' +
  '.pf-rowmenu-btn, .pf-reports-btn, .adm-rowmenu-btn, .inv-rowmenu-btn, .ma-rowmenu-btn, .nud-rowmenu-btn';
const SKIP_ANCESTOR =
  '[role="menu"], .pf-module-menu-pop, .pf-reports-pop, .pf-rowmenu-pop, .inv-rowmenu-pop, .pf-datemenu-pop, ' +
  '.topbar-popover, .wise-popover, #lir-tooltip, .ct-card, .nudge-dismiss-pop';

/* Surfaces that already paint their own hover card — stand down so two
   cards never stack. History / Turns use `.wch-tip` (chat-history.js).
   Library uses `.lib-tip`. Chat answer-action hover is this card; `.sc-tip`
   is flash-only ("Copied!"). Collapsed / pivoted nav rows already get
   `#menu-rail-tip` — don't stack a second card on the Appearance footer
   button in those states. */
function ownedElsewhere(btn) {
  if (btn.closest && btn.closest('.wch-sidebar')) return true;
  if (btn.matches && btn.matches(
    '.lib-filter-btn, .pl-filter-btn, .lib-fstat-add, .lib-place-tag, .lib-folder-swatch, [data-lib-tip]'
  )) return true;
  if (btn.id === 'menu-footer-layout-btn' &&
      btn.closest('#menu-panel.mp-rail, #menu-panel.mp-pivot, .menu-footer--search-float')) {
    return true;
  }
  return false;
}

/* Icon-only X (Material `close`, a literal ×, or a named close class).
   Captioned menu items ("Close pane") keep their label and are not skipped. */
const CLOSE_SELECTOR =
  '.panel-close-btn, .wch-close, .wnote-x, .adm-modal-x, .vf-modal-x, ' +
  '.dash-modal-close, .ag-sheet-close, .wai-img-close, .amm-close-btn, ' +
  '.mkt-scanner-close, .pg-close, .ma-modal-close, .mi-cap-close, ' +
  '.nfp-allergen-x, .fl-attach-x, .gv-file-x, .al-x, .dash-score-toast-close, ' +
  '.pmx-fix-toast-close, .wa-sh-chip-x, .hp-header-close-btn, ' +
  '#topbar-overlay-close, [class*="search-clear"], [data-chat-close], ' +
  '[data-scanner-close], [data-mf="close"]';

function isCloseControl(btn) {
  if (!btn || !btn.matches) return false;
  if (btn.matches(CLOSE_SELECTOR)) return true;
  const leftover = visibleTextWithoutIcons(btn);
  if (leftover === '×' || leftover === '✕' || leftover === 'x' || leftover === 'X') return true;
  /* Captioned menu items ("Close pane") are not the X control. A visible
     "Close" label next to the glyph still is. */
  if (leftover.length > 2) return false;
  const icon = btn.querySelector && btn.querySelector('.material-symbols-outlined');
  if (!icon) return false;
  const raw = (icon.textContent || '').replace(/\s+/g, ' ').trim();
  return raw === 'close';
}

function suppressNativeTitle(btn) {
  if (btn.hasAttribute('title')) btn.removeAttribute('title');
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

function isIntentChip(btn) {
  if (!btn || !btn.matches) return false;
  return btn.matches(
    '.ws-intent-chip, .sc-reply-chips .chip, .sc-inline-chips .chip, ' +
    '.ws-chips .chip, .chip-dive'
  );
}

function isKebabTrigger(btn) {
  if (!btn || !btn.matches) return false;
  if (btn.matches(
    '.panel-more-btn, .pf-rowmenu-btn, .pf-reports-btn, .adm-rowmenu-btn, .inv-rowmenu-btn, ' +
    '.ma-rowmenu-btn, .nud-rowmenu-btn, .pf-datemenu-btn, .w-datemenu-btn, ' +
    '.pf-module-menu-btn, .dash-kebab, .sc-fb-more, ' +
    '.lib-card-menu, .lib-fp-menu, .lib-fstat-menu, .wch-proj-menu'
  )) return true;
  const popup = btn.getAttribute('aria-haspopup');
  if (popup !== 'true' && popup !== 'menu') return false;
  const icon = btn.querySelector && btn.querySelector('.material-symbols-outlined, [data-icon-svg]');
  if (!icon) return false;
  const raw = ((icon.getAttribute && icon.getAttribute('data-icon-svg')) ||
    icon.textContent || '').replace(/\s+/g, ' ').trim();
  return raw === 'more_vert' || raw === 'more_horiz';
}

function tipTarget(start) {
  if (!start || !start.closest) return null;
  const btn = start.closest(CANDIDATE_SELECTOR);
  if (!btn) return null;
  if (btn.closest && btn.closest('#lir-tooltip, .ct-card')) return null;
  if (isCloseControl(btn)) {
    suppressNativeTitle(btn);
    return null;
  }
  if (isIntentChip(btn)) {
    suppressNativeTitle(btn);
    return null;
  }
  if (ownedElsewhere(btn)) return null;
  if (isKebabTrigger(btn)) {
    suppressNativeTitle(btn);
    return null;
  }
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
  fit_width: 'Width',
  picture_in_picture_center: 'Width',
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
  drag_indicator: 'Drag to move',
  history: 'Open History',
  history_off: 'Close History',
  menu: 'Menu',
  chat_add_on: 'New conversation',
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
       which keeps dynamic titles (e.g. the width toggle's single/double/fill
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
    const tipRight = (btn.classList.contains('topbar-menu-toggle') ||
      btn.classList.contains('menu-modules-btn')) &&
      !btn.closest('.mp-pivot');
    const isStudioTool = !!(btn.matches && btn.matches('.rf-tool-ico, .sc-helix-undo, .sc-helix-save'));
    const isReportPlus = !!(btn.matches && btn.matches('.rf-rpt-plus, .wa-titledrop-plus'));
    const preferAbove = !!(btn.closest('.wise-popover--appearance') || isAppearanceTrigger(btn) || isStudioTool || isReportPlus);
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

  /* Capture-phase so the native `title` is gone before History's tooltip
     (or the browser bubble) can read it. */
  document.addEventListener('pointerover', (e) => {
    const el = e.target && e.target.closest && e.target.closest(CANDIDATE_SELECTOR);
    if (el && (isCloseControl(el) || isIntentChip(el))) suppressNativeTitle(el);
  }, true);

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
