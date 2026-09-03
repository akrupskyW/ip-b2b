/**
 * Shared sort-caret SVG used in table headers app-wide.
 *
 * The same downward chevron every adm- / inv- / ma- sortable header
 * draws. Import ARROW_SVG instead of pasting another copy.
 */

export const ARROW_SVG =
  '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 9.5V2.5M3 6.5L6 9.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

if (typeof window !== 'undefined') window.WISE_ARROW_SVG = ARROW_SVG;
