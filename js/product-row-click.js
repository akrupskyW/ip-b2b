/* ─────────────────────────────────────────────────────────────────────────
   product-row-click.js — clicking a product row opens that product.

   Default for every product table in the app: click the row and you land
   on View Product, already focused on that SKU. Icons, checkboxes, menus,
   size links, claim/verify buttons, and any other control that already
   does a job keep doing that job — the row click stands down.

   Companion to sortable-tables.js / table-pagination.js. Self-initialising:
     • One capture-phase listener on document, so it wins over per-table
       handlers that currently treat the whole row as “pick this”.
     • Identifies a product row by the name / UPC / photo markup those
       tables already paint — no per-page wiring.
     • Prefers an existing view-product.html link in the row (so discovered
       “from=” and pack sizes travel with it); otherwise builds the same
       query string the portfolio ⋮ View action uses.
     • Opt out with  data-no-row-click  on the row or the table.

   Non-product lists (invoices, orgs, users, ingredients, audit, alerts)
   never match, so they are left alone.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var ROW_SEL = '.pf-trow, .rf-trow, .gs-trow, .adm-trow, .wa-trow';

  /* Anything that already has a job — the row click must not steal it.
     Includes the icon-only columns (checkbox, ⋮, reports) so padding
     around those glyphs does not navigate either. */
  var CONTROL_SEL = [
    'a', 'button', 'input', 'select', 'textarea', 'label',
    'summary', '[role="button"]', '[role="checkbox"]', '[role="menuitem"]',
    '[role="menuitemradio"]', '[role="switch"]', '[role="option"]',
    '.vf-check', '.pf-rowmenu', '.pf-reports-wrap', '.pf-sizes',
    '.pf-claim-btn', '.pf-row-act',
    '.pf-chip--verify', '.pf-chip--attest', '.pf-chip--prequal', '.pf-chip--add',
    '.pf-col-check', '.pf-col-menu', '.pf-col-reports', '.pf-col-action',
    '.adm-icon-btn', '.adm-actions',
    '[data-adm-action]', '[data-adm-menu-action]', '[data-adm-sort]',
    '.rf-reformulate', '.rf-apply', '.rf-col-action',
    '.gs-cta',
    '.material-symbols-outlined', '.material-symbols-rounded',
    '.material-symbols-sharp', '.material-icons',
    '.srt-sortable', '.wtp-more'
  ].join(',');

  function injectStyles() {
    if (document.getElementById('prc-styles')) return;
    var css = [
      '.pf-trow:has(.pf-pname),',
      '.rf-table:not(.rf-table--moves) .rf-trow:has(.rf-pname),',
      '.gs-trow:has(.gs-prod-name),',
      '.adm-trow[data-adm-prow],',
      '.wa-trow:has(.wa-prod-name){cursor:pointer;}',
      '[data-no-row-click], [data-no-row-click] .pf-trow,',
      '[data-no-row-click] .rf-trow, [data-no-row-click] .gs-trow,',
      '[data-no-row-click] .adm-trow, [data-no-row-click] .wa-trow{cursor:auto;}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'prc-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function txt(el) {
    return ((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function isProductRow(row) {
    if (!row || !row.classList) return false;
    if (row.hasAttribute('data-no-row-click')) return false;
    if (row.closest && row.closest('[data-no-row-click]')) return false;
    if (row.classList.contains('pf-trow--detail')) return false;
    if (row.querySelector && row.querySelector('.pf-empty')) return false;
    if (row.closest && row.closest('.pf-thead, .rf-thead, .gs-thead, .adm-thead, .wa-tbl-head, .wa-tbl-th')) {
      return false;
    }
    if (row.classList.contains('pf-trow')) {
      return !!(row.querySelector('.pf-pname') ||
        row.querySelector('a[href*="view-product.html"]'));
    }
    if (row.classList.contains('rf-trow')) {
      if (row.closest && row.closest('.rf-table--moves')) return false;
      return !!row.querySelector('.rf-pname');
    }
    if (row.classList.contains('gs-trow')) return !!row.querySelector('.gs-prod-name');
    if (row.classList.contains('adm-trow')) return row.hasAttribute('data-adm-prow');
    if (row.classList.contains('wa-trow')) return !!row.querySelector('.wa-prod-name');
    return false;
  }

  function productRowFrom(el) {
    if (!el || !el.closest) return null;
    var row = el.closest(ROW_SEL);
    return isProductRow(row) ? row : null;
  }

  function isControl(target, row) {
    if (!target || !target.closest) return false;
    var hit = target.closest(CONTROL_SEL);
    return !!(hit && row.contains(hit));
  }

  function viewHref(row) {
    var links = row.querySelectorAll('a[href*="view-product.html"]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].classList.contains('pf-size-link')) continue;
      var href = links[i].getAttribute('href');
      if (href) return href;
    }
    var name = txt(row.querySelector('.pf-pname, .rf-pname, .gs-prod-name, .wa-prod-name'));
    if (!name) {
      var nameLink = row.querySelector('.adm-idcell-name a, .adm-idcell-name');
      name = txt(nameLink);
    }
    var upcRaw = txt(row.querySelector('.pf-upc, .rf-upc, .adm-idcell-sub'));
    var upc = upcRaw.replace(/^\s*UPC\s*[·•]?\s*/i, '').trim();
    var imgEl = row.querySelector('.pf-thumb-img, .pf-thumb img, .rf-thumb img, .adm-idcell img, .wa-prod img');
    var img = imgEl ? (imgEl.getAttribute('src') || '') : '';
    if (!name && !upc) return '';
    var params = new URLSearchParams();
    if (name) params.set('name', name);
    if (upc) params.set('upc', upc);
    if (img) params.set('img', img);
    if (row.closest && row.closest('#pf-view-discovered, .pf-table--discovered-cta, .pf-table--discovered')) {
      params.set('from', 'discovered');
    } else if (row.closest && row.closest('#pf-view-needsinfo, .pf-table--needsinfo')) {
      if (row.querySelector('.pf-row-act--verify, .pf-chip--verify')) params.set('from', 'verify');
      else params.set('from', 'complete');
    }
    var qs = params.toString();
    return 'view-product.html' + (qs ? '?' + qs : '');
  }

  function openProduct(row, newTab) {
    var href = viewHref(row);
    if (!href) return false;
    if (newTab) window.open(href, '_blank', 'noopener');
    else window.location.href = href;
    return true;
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    if (e.button != null && e.button !== 0) return;
    var row = productRowFrom(e.target);
    if (!row) return;
    if (isControl(e.target, row)) return;
    if (!openProduct(row, !!(e.metaKey || e.ctrlKey))) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function start() {
    injectStyles();
    document.addEventListener('click', onClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
