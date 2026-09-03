import { esc } from './escape-html.js';
import { createToast } from './toast.js';
const toast = createToast('wmod');
/**
 * Preferences module.
 *
 * A settings surface rendered into #agent-main-scroll on preferences.html. It
 * groups the app's real appearance controls (theme + text size, persisted to the
 * same localStorage keys the shell reads) with notification, workspace and
 * accessibility toggles. The persistent WISEcodeAI dock drives every switch: its
 * intent chips flip the theme, bump text size, mute notifications, etc., and
 * each on-page control narrates back into the conversation.
 *
 * Token-driven throughout so it tracks light/dark like the rest of the app.
 */

let hostEl = null;

/* Persisted, app-wide preference state. Theme + text size use the shell's own
   keys so they take effect immediately and survive reloads; the remaining
   demo toggles live under one namespaced key. */
const STORE = 'wise-preferences';
const DEFAULTS = {
  notif_alerts: true,
  notif_email: true,
  notif_weekly: false,
  notif_product: true,
  dock: 'left',
  density: 'comfortable',
  language: 'en-US',
  region: 'United States',
  reduce_motion: false,
  high_contrast: false,
};

function readPrefs() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORE)) || {}) }; }
  catch (_) { return { ...DEFAULTS }; }
}
function writePrefs(p) {
  try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (_) {}
}

function isDark() {
  try {
    const t = localStorage.getItem('wise-theme');
    if (t === 'light' || t === 'dark') return t === 'dark';
  } catch (_) {}
  return document.documentElement.classList.contains('dark');
}
function setTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('wise-theme', dark ? 'dark' : 'light');
    localStorage.setItem('chat-theme', dark ? 'dark' : 'light');
  } catch (_) {}
}

function textSize() {
  try { return parseInt(localStorage.getItem('wise-text-size'), 10) || 100; } catch (_) { return 100; }
}
function setTextSize(pct) {
  const v = Math.max(85, Math.min(130, pct));
  try { localStorage.setItem('wise-text-size', String(v)); } catch (_) {}
  document.documentElement.style.setProperty('--text-scale', (v / 100).toFixed(3));
  try { document.documentElement.style.fontSize = (v / 100 * 16).toFixed(1) + 'px'; } catch (_) {}
  return v;
}

function toggleRow({ key, label, sub, on }) {
  return `
    <div class="wmod-row">
      <div class="wmod-row-body">
        <div class="wmod-row-label">${esc(label)}</div>
        <div class="wmod-row-sub">${esc(sub)}</div>
      </div>
      <button type="button" class="wmod-switch${on ? ' is-on' : ''}" role="switch" aria-checked="${on}" data-prefs-toggle="${key}"><span class="wmod-knob"></span></button>
    </div>`;
}

function segRow({ key, label, sub, options, value }) {
  return `
    <div class="wmod-row">
      <div class="wmod-row-body">
        <div class="wmod-row-label">${esc(label)}</div>
        <div class="wmod-row-sub">${esc(sub)}</div>
      </div>
      <div class="wmod-seg" role="group">
        ${options.map((o) => `<button type="button" class="wmod-seg-btn${o.v === value ? ' is-active' : ''}" data-prefs-seg="${key}" data-v="${esc(o.v)}">${esc(o.label)}</button>`).join('')}
      </div>
    </div>`;
}

function paint() {
  if (!hostEl) return;
  const p = readPrefs();
  const dark = isDark();
  const ts = textSize();
  hostEl.innerHTML = `
    <div class="wmod-wrap">
      <div class="wmod-masthead">
        <div class="wmod-masthead-main">
          <h1 class="wmod-title">Preferences</h1>
          <p class="wmod-sub">Tune how WISE looks, notifies you, and behaves across your workspace.</p>
        </div>
      </div>

      <section class="wmod-group">
        <h2 class="wmod-group-title"><span class="material-symbols-outlined">palette</span>Appearance</h2>
        <div class="wmod-card">
          ${segRow({ key: 'theme', label: 'Theme', sub: 'Light or dark across the whole app', options: [{ v: 'light', label: 'Light' }, { v: 'dark', label: 'Dark' }], value: dark ? 'dark' : 'light' })}
          <div class="wmod-row">
            <div class="wmod-row-body">
              <div class="wmod-row-label">Text size</div>
              <div class="wmod-row-sub">Scale all interface text · <strong data-prefs-ts>${ts}%</strong></div>
            </div>
            <div class="wmod-stepper">
              <button type="button" class="wmod-step" data-prefs-ts-step="-5" aria-label="Smaller"><span class="material-symbols-outlined">remove</span></button>
              <button type="button" class="wmod-step" data-prefs-ts-step="5" aria-label="Larger"><span class="material-symbols-outlined">add</span></button>
            </div>
          </div>
          ${segRow({ key: 'density', label: 'Density', sub: 'Spacing of lists and tables', options: [{ v: 'comfortable', label: 'Comfortable' }, { v: 'compact', label: 'Compact' }], value: p.density })}
        </div>
      </section>

      <section class="wmod-group">
        <h2 class="wmod-group-title"><span class="material-symbols-outlined">notifications</span>Notifications</h2>
        <div class="wmod-card" data-prefs-anchor="notifications">
          ${toggleRow({ key: 'notif_alerts', label: 'In-app alerts', sub: 'Agent activity, verifications, and flags', on: p.notif_alerts })}
          ${toggleRow({ key: 'notif_email', label: 'Email notifications', sub: 'A summary when something needs you', on: p.notif_email })}
          ${toggleRow({ key: 'notif_product', label: 'Product updates', sub: 'New features and improvements', on: p.notif_product })}
          ${toggleRow({ key: 'notif_weekly', label: 'Weekly digest', sub: 'Monday morning portfolio recap', on: p.notif_weekly })}
        </div>
      </section>

      <section class="wmod-group">
        <h2 class="wmod-group-title"><span class="material-symbols-outlined">tune</span>Workspace</h2>
        <div class="wmod-card">
          ${segRow({ key: 'dock', label: 'WISEcodeAI chat position', sub: 'Where the assistant docks', options: [{ v: 'left', label: 'Left' }, { v: 'center', label: 'Center' }, { v: 'right', label: 'Right' }], value: p.dock })}
          <div class="wmod-row">
            <div class="wmod-row-body">
              <div class="wmod-row-label">Language</div>
              <div class="wmod-row-sub">Interface language</div>
            </div>
            <select class="wmod-select" data-prefs-select="language">
              ${['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'].map((l) => `<option value="${l}"${l === p.language ? ' selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="wmod-row">
            <div class="wmod-row-body">
              <div class="wmod-row-label">Region</div>
              <div class="wmod-row-sub">Regulatory defaults and units</div>
            </div>
            <select class="wmod-select" data-prefs-select="region">
              ${['United States', 'European Union', 'United Kingdom', 'Canada', 'Australia'].map((r) => `<option value="${esc(r)}"${r === p.region ? ' selected' : ''}>${esc(r)}</option>`).join('')}
            </select>
          </div>
          <div class="wmod-row">
            <div class="wmod-row-body">
              <div class="wmod-row-label">WISEowl walkthrough</div>
              <div class="wmod-row-sub">Replay the grouped tour of the workspace</div>
            </div>
            <button type="button" class="wise-btn wise-btn--ghost" data-prefs-tour>Replay tour</button>
          </div>
        </div>
      </section>

      <section class="wmod-group">
        <h2 class="wmod-group-title"><span class="material-symbols-outlined">accessibility_new</span>Accessibility</h2>
        <div class="wmod-card">
          ${toggleRow({ key: 'reduce_motion', label: 'Reduce motion', sub: 'Minimize animations and transitions', on: p.reduce_motion })}
          ${toggleRow({ key: 'high_contrast', label: 'Increase contrast', sub: 'Stronger borders and text contrast', on: p.high_contrast })}
        </div>
      </section>
    </div>`;
}

export function renderPreferences(mainEl) {
  hostEl = mainEl;
  paint();

  mainEl.addEventListener('click', (e) => {
    const tog = e.target.closest('[data-prefs-toggle]');
    if (tog) { flipToggle(tog.dataset.prefsToggle); return; }

    const seg = e.target.closest('[data-prefs-seg]');
    if (seg) { setSeg(seg.dataset.prefsSeg, seg.dataset.v); return; }

    const step = e.target.closest('[data-prefs-ts-step]');
    if (step) { bumpTextSize(parseInt(step.dataset.prefsTsStep, 10)); return; }

    const tour = e.target.closest('[data-prefs-tour]');
    if (tour) {
      const open = () => window.WiseWalkthrough?.open({ force: true });
      if (window.WiseWalkthrough && typeof window.WiseWalkthrough.open === 'function') open();
      else document.addEventListener('wise:walkthrough-ready', open, { once: true });
      return;
    }
  });

  mainEl.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-prefs-select]');
    if (!sel) return;
    const p = readPrefs();
    p[sel.dataset.prefsSelect] = sel.value;
    writePrefs(p);
    toast(`${sel.dataset.prefsSelect === 'language' ? 'Language' : 'Region'} set to ${sel.value}`, 'public');
  });
}

const TOGGLE_LABELS = {
  notif_alerts: 'In-app alerts', notif_email: 'Email notifications',
  notif_product: 'Product updates', notif_weekly: 'Weekly digest',
  reduce_motion: 'Reduce motion', high_contrast: 'Increase contrast',
};

function flipToggle(key, forceOn) {
  const p = readPrefs();
  p[key] = typeof forceOn === 'boolean' ? forceOn : !p[key];
  writePrefs(p);
  paint();
  toast(`${TOGGLE_LABELS[key] || key} ${p[key] ? 'on' : 'off'}`, p[key] ? 'check' : 'block');
}

function setSeg(key, v) {
  if (key === 'theme') { setTheme(v === 'dark'); paint(); toast(`${v === 'dark' ? 'Dark' : 'Light'} theme`, v === 'dark' ? 'dark_mode' : 'light_mode'); return; }
  const p = readPrefs();
  p[key] = v;
  writePrefs(p);
  paint();
  const labels = { density: 'Density', dock: 'Chat position' };
  toast(`${labels[key] || key}: ${v}`, 'tune');
}

function bumpTextSize(delta) {
  const v = setTextSize(textSize() + delta);
  paint();
  toast(`Text size ${v}%`, 'format_size');
}

/* ---- WISEcodeAI bridge -------------------------------------------------- */

export const PREFERENCES_WISEAI = {
  sub: 'Tune appearance, notifications and workspace — just ask.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Tune your workspace',
    cards: [
      { intent: 'toggle_theme', icon: 'dark_mode', iconTone: 'brand', pill: { tone: 'up', icon: 'contrast', text: 'Do next' }, title: 'Switch light / dark', desc: 'Flip the theme everywhere — saved to your preferences.', action: 'Switch theme', ask: 'Switch light / dark' },
      { intent: 'bigger_text', icon: 'format_size', iconTone: 'brand', pill: { tone: 'up', icon: 'text_increase', text: 'Adjust' }, title: 'Make text bigger', desc: 'Bump interface text up a notch for easier reading.', action: 'Make text bigger', ask: 'Make text bigger' },
      { intent: 'dock_right', icon: 'view_sidebar', iconTone: 'brand', pill: { tone: 'up', icon: 'view_sidebar', text: 'Layout' }, title: 'Move chat to the right', desc: 'Dock WISEcodeAI on the right across the whole app.', action: 'Move chat right', ask: 'Move chat to the right' },
      { intent: 'mute_email', icon: 'notifications_off', iconTone: 'brand', pill: { tone: 'up', icon: 'notifications_off', text: 'Notify' }, title: 'Mute email notifications', desc: 'Silence emails — you\u2019ll still see in-app alerts.', action: 'Mute email', ask: 'Mute email notifications' },
      { intent: 'reduce_motion', icon: 'motion_photos_off', iconTone: 'brand', pill: { tone: 'up', icon: 'motion_photos_off', text: 'Adjust' }, title: 'Reduce motion', desc: 'Minimize animations and transitions across the app.', action: 'Reduce motion', ask: 'Reduce motion' },
    ],
  },
  intents: [
    { intent: 'toggle_theme', label: 'Switch light / dark', icon: 'dark_mode' },
    { intent: 'bigger_text', label: 'Make text bigger', icon: 'format_size' },
    { intent: 'mute_email', label: 'Mute email notifications', icon: 'notifications_off' },
    { intent: 'dock_right', label: 'Move chat to the right', icon: 'view_sidebar' },
    { intent: 'reduce_motion', label: 'Reduce motion', icon: 'motion_photos_off' },
  ],
  intentReplies: {
    toggle_theme: () => `Switched to <strong>${isDark() ? 'dark' : 'light'}</strong> theme — applied everywhere and saved to your preferences.`,
    bigger_text: () => `Bumped interface text to <strong>${textSize()}%</strong>. I can keep going or dial it back if that's too large.`,
    mute_email: 'Muted <strong>email notifications</strong> — you\u2019ll still see in-app alerts. Flip it back anytime under Notifications.',
    dock_right: 'Set your WISEcodeAI chat to dock on the <strong>right</strong>. It\u2019ll open there across the app from now on.',
    reduce_motion: () => `Reduced motion is now <strong>${readPrefs().reduce_motion ? 'on' : 'off'}</strong> — animations and transitions are minimized.`,
  },
  onIntent: (intent) => {
    switch (intent) {
      case 'toggle_theme': setTheme(!isDark()); paint(); return false;
      case 'bigger_text': setTextSize(textSize() + 10); paint(); return false;
      case 'mute_email': flipToggle('notif_email', false); return false;
      case 'dock_right': setSeg('dock', 'right'); return false;
      case 'reduce_motion': flipToggle('reduce_motion', true); return false;
      default: return false;
    }
  },
};
