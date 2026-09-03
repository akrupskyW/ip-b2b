/**
 * Shared search-pill toolbar — one row for every list.
 *
 * The pill, the trailing funnel, and the filter popover shell are the
 * same language on admin boards, verification, GRAS, and canonical
 * modules. Former adm- / vf- / gv- / wmod- families alias the same CSS.
 *
 *   searchToolbarHTML({ placeholder, value, variant, filter, extra })
 */

import { esc } from './escape-html.js';

function searchInputClass(variant, hasFilter) {
  if (variant === 'wmod') return 'wise-search wmod-search-input';
  if (variant === 'gv') return 'wise-search gv-search' + (hasFilter ? ' gv-search--hasfilter' : '');
  if (variant === 'vf') return 'wise-search vf-search';
  return 'wise-search adm-search';
}

function filterBtnClass(variant) {
  if (variant === 'wmod') return 'wise-search-filter wmod-filter-btn';
  if (variant === 'gv') return 'wise-search-filter gv-filter-btn';
  return 'wise-search-filter adm-search-filter';
}

function inlineClass(variant, hasFilter) {
  const fam = variant ? ` ${variant}-search-inline` : '';
  return `wise-search-inline${fam}${hasFilter ? ' has-filter' : ''}`;
}

/**
 * Search row markup.
 *
 * `variant` keeps family spacing / leftover selectors (`adm`, `vf`, `gv`,
 * `wmod`). `filter` is omitted for a bare pill. `inputAttrs` is raw
 * attribute text (`data-adm-search`, `data-vf="search"`).
 */
export function searchToolbarHTML({
  placeholder = 'Search…',
  value = '',
  ariaLabel,
  inputAttrs = '',
  inputType = 'search',
  inputId = '',
  autocomplete = 'off',
  filter = null,
  extra = '',
  variant = 'adm',
  toolbarClass = '',
} = {}) {
  const hasFilter = !!filter;
  const idAttr = inputId ? ` id="${esc(inputId)}"` : '';
  const filterIcon = (filter && filter.icon) || 'tune';
  const filterLabel = (filter && (filter.ariaLabel || filter.label)) || 'Filters';
  const filterAttrs = (filter && filter.attrs) || '';
  const active = !!(filter && filter.active);
  const open = !!(filter && filter.open);
  const count = filter && filter.count;
  const popHtml = (filter && filter.popHtml) || '';
  const fam = variant ? ` ${variant}-toolbar` : '';
  const extraCls = toolbarClass ? ` ${toolbarClass}` : '';
  const inputExtra = inputAttrs ? ` ${inputAttrs}` : '';

  return `
    <div class="wise-toolbar${fam}${extraCls}">
      <div class="${inlineClass(variant, hasFilter)}">
        <span class="material-symbols-outlined">search</span>
        <input type="${esc(inputType)}" class="${searchInputClass(variant, hasFilter)}"${idAttr} placeholder="${esc(placeholder)}" aria-label="${esc(ariaLabel || placeholder)}" value="${esc(value)}" autocomplete="${esc(autocomplete)}"${inputExtra} />
        ${hasFilter ? `
          <button type="button" class="${filterBtnClass(variant)}${active ? ' is-active has-dot has-filters' : ''}${open ? ' is-open' : ''}" ${filterAttrs} aria-haspopup="true" aria-expanded="${open}" title="${esc(filterLabel)}" aria-label="${esc(filterLabel)}">
            <span class="material-symbols-outlined">${esc(filterIcon)}</span>
            ${count ? `<span class="wise-filter-count gv-filter-count">${count}</span>` : ''}
          </button>
          ${popHtml}
        ` : ''}
      </div>
      ${extra}
    </div>`;
}

if (typeof window !== 'undefined') {
  window.WiseSearchToolbarHTML = searchToolbarHTML;
}
