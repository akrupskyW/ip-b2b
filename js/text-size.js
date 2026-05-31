/**
 * Shared text-size accessibility — one localStorage key, one CSS variable,
 * applied everywhere readable module content is rendered.
 */

export const FZ_SCALE = { sm: 0.82, md: 1, lg: 1.18, xl: 1.36 };
export const FZ_LINE = { sm: 1.45, md: 1.6, lg: 1.65, xl: 1.7 };
export const TEXT_SIZE_KEY = 'chat-font-size';

export function getStoredFontSize() {
  let fz = 'md';
  try { fz = localStorage.getItem(TEXT_SIZE_KEY) || 'md'; } catch (_) {}
  return fz in FZ_SCALE ? fz : 'md';
}

/** Apply scale via CSS variables so every `.wise-text-scale` region updates. */
export function setTextSize(size) {
  if (!FZ_SCALE[size]) return;
  const root = document.documentElement;
  root.style.setProperty('--wise-text-scale', String(FZ_SCALE[size]));
  root.style.setProperty('--chat-line-height', String(FZ_LINE[size]));
  root.dataset.textSize = size;
  document.querySelectorAll('.fz-btn[data-fz]').forEach((b) => {
    b.classList.toggle('fz-active', b.dataset.fz === size);
  });
  try { localStorage.setItem(TEXT_SIZE_KEY, size); } catch (_) {}
}

export function applyStoredTextSize() {
  setTextSize(getStoredFontSize());
}
