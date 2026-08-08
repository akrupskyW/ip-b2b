/* ------------------------------------------------------------------ */
/* Shared top bar                                                      */
/* ------------------------------------------------------------------ */
/*
 * One source of truth for the #topbar-row that sits above every shell
 * (agent overview pages + the Portfolio workspace). The bar is identical
 * everywhere except for its CENTER content, which is page-specific:
 *
 *   variant: 'agent'      → just the trailing actions (Alerts).
 *   variant: 'portfolio'  → the section-module rail + layout switcher +
 *                           the same trailing actions.
 *
 * Each page calls mountTopbar() once, then wires up the controls it cares
 * about (the IDs/classes below are stable so existing wiring keeps working):
 *   #topbar-menu-toggle, .topbar-logo, #topbar-notif-btn,
 *   .topbar-profile, #pf-module-rail, .lir-layout-btn …
 */

/* Musical "pump up the jam" strip for the Minimal-UI top bar. Side-effect
   import so it auto-mounts on every page that loads the shared top bar. */
import './jam-strip.js';

/* WISE wordmark (full) + bug (mobile). Shared by every page so the SVG
   lives in exactly one place. */
export const TOPBAR_LOGO_HTML = `
  <a href="LOGO_HREF" aria-label="WISE home" style="display:flex;flex-direction:column;align-items:flex-start;pointer-events:auto;color:inherit;text-decoration:none;cursor:pointer;">
  <svg class="tl-full" width="177" height="28" viewBox="0 0 656 104" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="WISE">
    <path d="M362.659 21.7629C366.348 21.7629 369.907 22.3486 373.334 23.5183C376.793 24.6553 379.828 26.3275 382.438 28.5362C385.082 30.713 386.977 33.3619 388.119 36.4808L378.474 39.942C377.92 38.35 376.857 36.9699 375.291 35.8003C373.724 34.5984 371.832 33.6552 369.613 32.9729C367.426 32.2906 365.107 31.9477 362.659 31.9477C360.048 31.9153 357.6 32.3381 355.315 33.2154C353.063 34.0601 351.22 35.2316 349.784 36.7262C348.348 38.2207 347.628 39.958 347.628 41.9398C347.628 44.3767 348.299 46.2281 349.638 47.4952C350.976 48.7622 352.77 49.7053 355.022 50.3226C357.307 50.9074 359.852 51.4446 362.659 51.9319C367.164 52.6467 371.325 53.8324 375.144 55.4895C378.996 57.1465 382.081 59.355 384.398 62.1168C386.748 64.8459 387.922 68.2091 387.922 72.2053C387.922 76.2342 386.748 79.777 384.398 82.8312C382.081 85.8528 378.996 88.2071 375.144 89.8966C371.325 91.5537 367.164 92.3823 362.659 92.3823C358.906 92.3822 355.298 91.7994 351.838 90.6298C348.379 89.4601 345.359 87.7857 342.781 85.6089C340.202 83.3996 338.359 80.7821 337.25 77.7607L346.797 74.2031C347.352 75.7623 348.412 77.16 349.978 78.3945C351.577 79.5967 353.472 80.5395 355.659 81.2218C357.878 81.9041 360.211 82.247 362.659 82.247C365.27 82.247 367.719 81.8241 370.004 80.9794C372.321 80.1346 374.181 78.9632 375.584 77.4686C377.02 75.974 377.738 74.2197 377.738 72.2053C377.738 70.1261 376.989 68.42 375.487 67.088C374.019 65.7559 372.124 64.7016 369.807 63.9219C367.522 63.1421 365.14 62.5563 362.659 62.1665C357.862 61.3867 353.553 60.2495 349.734 58.7549C345.948 57.2603 342.946 55.1632 340.727 52.4664C338.54 49.7697 337.446 46.2612 337.446 41.9398C337.446 37.8785 338.603 34.3356 340.92 31.3139C343.27 28.2925 346.356 25.9551 350.175 24.2981C354.026 22.6086 358.188 21.7629 362.659 21.7629Z" fill="currentColor"/>
    <path d="M471.956 40.9614C475.938 40.9615 479.627 41.8872 483.021 43.7391C486.447 45.5908 489.269 48.0773 491.489 51.1959L482.384 56.1204C481.013 54.496 479.414 53.2586 477.587 52.4139C475.759 51.5368 473.881 51.0997 471.956 51.0995C469.28 51.0995 466.846 51.8309 464.659 53.293C462.505 54.7226 460.791 56.623 459.518 58.9945C458.278 61.3334 457.658 63.9001 457.658 66.6937C457.658 69.4555 458.295 72.024 459.568 74.3959C460.841 76.7349 462.555 78.6182 464.709 80.0477C466.896 81.4773 469.312 82.1945 471.956 82.1945C473.979 82.1943 475.906 81.7371 477.733 80.8275C479.561 79.9179 481.111 78.7173 482.384 77.2232L491.489 82.1448C489.269 85.2309 486.447 87.7002 483.021 89.552C479.627 91.4038 475.938 92.3295 471.956 92.3297C467.452 92.3297 463.339 91.1779 459.618 88.8714C455.93 86.5645 452.974 83.476 450.754 79.6095C448.568 75.7109 447.477 71.4045 447.477 66.6937C447.477 63.1205 448.111 59.7906 449.384 56.7045C450.657 53.5855 452.405 50.8568 454.624 48.5175C456.876 46.1458 459.485 44.2913 462.455 42.9592C465.426 41.627 468.594 40.9614 471.956 40.9614Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M520.232 40.9614C524.735 40.9615 528.832 42.1158 532.52 44.4225C536.24 46.7294 539.194 49.8323 541.381 53.7312C543.6 57.6297 544.711 61.9505 544.711 66.6937C544.711 70.2348 544.074 73.5498 542.801 76.6362C541.528 79.7228 539.766 82.4542 537.514 84.8261C535.294 87.1652 532.699 88.9998 529.729 90.3319C526.792 91.6639 523.626 92.3295 520.232 92.3297C515.728 92.3297 511.614 91.1779 507.893 88.8714C504.205 86.5645 501.252 83.476 499.032 79.6095C496.845 75.7106 495.752 71.405 495.752 66.6937C495.752 63.1205 496.387 59.7906 497.659 56.7045C498.932 53.5855 500.68 50.8568 502.9 48.5175C505.152 46.1456 507.763 44.2913 510.734 42.9592C513.703 41.6275 516.87 40.9614 520.232 40.9614ZM520.232 51.0995C517.555 51.0995 515.121 51.8137 512.934 53.2434C510.781 54.6729 509.066 56.5734 507.794 58.9448C506.554 61.3163 505.934 63.8999 505.933 66.6937C505.933 69.5855 506.588 72.2025 507.893 74.5419C509.199 76.8808 510.927 78.75 513.081 80.147C515.268 81.5116 517.653 82.1945 520.232 82.1945C522.94 82.1943 525.372 81.4771 527.526 80.0477C529.679 78.6182 531.376 76.7347 532.617 74.3959C533.889 72.024 534.527 69.4555 534.527 66.6937C534.526 63.868 533.874 61.2692 532.57 58.8981C531.297 56.5262 529.58 54.6405 527.426 53.2434C525.272 51.8144 522.874 51.0997 520.232 51.0995Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M600.847 91.065H590.666V83.9002C589.066 86.4343 586.976 88.4803 584.398 90.0398C581.82 91.5668 578.8 92.3296 575.341 92.3297C571.783 92.3297 568.453 91.6639 565.353 90.3319C562.252 88.9997 559.508 87.1655 557.125 84.8261C554.775 82.4543 552.933 79.7227 551.595 76.6362C550.257 73.5498 549.588 70.2349 549.588 66.6937C549.588 63.1526 550.256 59.8376 551.595 56.7513C552.933 53.6328 554.776 50.9032 557.125 48.5642C559.508 46.1924 562.252 44.341 565.353 43.0088C568.453 41.6768 571.783 41.011 575.341 41.011C578.8 41.0111 581.82 41.7911 584.398 43.3506C586.976 44.8776 589.066 46.8922 590.666 49.3937C590.666 49.3937 590.666 32.9313 590.666 25.6154C590.666 21.8856 592.645 18.3248 596.563 17.957H600.847V91.065ZM575.437 50.8074C572.598 50.8075 570.003 51.5217 567.653 52.9513C565.336 54.3809 563.476 56.2981 562.072 58.7024C560.702 61.1064 560.016 63.77 560.016 66.6937C560.016 69.6504 560.716 72.3333 562.119 74.7376C563.555 77.1092 565.433 79.0095 567.75 80.4391C570.1 81.8361 572.663 82.5332 575.437 82.5333C578.31 82.5333 580.824 81.8362 582.978 80.4391C585.132 79.0095 586.797 77.0922 587.972 74.688C589.18 72.2837 589.782 69.6179 589.782 66.6937C589.782 63.7375 589.18 61.0567 587.972 58.6527C586.764 56.2485 585.082 54.3484 582.928 52.9513C580.807 51.5218 578.31 50.8074 575.437 50.8074Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M631.491 40.9614C635.245 40.9614 638.689 41.7413 641.822 43.3009C644.955 44.8279 647.631 46.9569 649.85 49.6858C652.07 52.3826 653.703 55.5025 654.747 59.0441C655.792 62.553 656.102 66.2905 655.677 70.2542H617.93C618.354 72.4952 619.17 74.5252 620.377 76.3441C621.617 78.131 623.184 79.5454 625.077 80.5851C627.003 81.6248 629.141 82.162 631.491 82.1945C633.972 82.1945 636.225 81.5773 638.249 80.3427C640.304 79.1083 641.984 77.4016 643.289 75.2254L653.62 77.6117C651.662 81.9331 648.709 85.4758 644.759 88.2376C640.81 90.9668 636.387 92.3297 631.491 92.3297C626.987 92.3297 622.874 91.1782 619.153 88.8714C615.465 86.5645 612.512 83.476 610.292 79.6095C608.105 75.7107 607.012 71.4048 607.012 66.6937C607.012 63.1202 607.649 59.7908 608.922 56.7045C610.195 53.5857 611.94 50.8567 614.159 48.5175C616.411 46.1456 619.023 44.2913 621.993 42.9592C624.963 41.6272 628.13 40.9614 631.491 40.9614ZM631.491 49.9282C629.174 49.9283 627.018 50.4826 625.027 51.5873C623.069 52.6919 621.438 54.2038 620.133 56.1204C618.861 58.0044 618.011 60.1312 617.586 62.5023H645.396C645.07 60.1634 644.237 58.0513 642.899 56.1671C641.594 54.2504 639.946 52.7386 637.955 51.634C635.997 50.4968 633.841 49.9282 631.491 49.9282Z" fill="currentColor"/>
    <path d="M246.344 72.9384L259.122 22.8845H268.377L281.205 72.9384L294.03 22.8845H304.508L287.079 91.1146H275.377L263.773 45.9355L252.171 91.1146H240.567L223.038 22.8845H233.516L246.344 72.9384Z" fill="currentColor"/>
    <path d="M325.02 91.1146H314.836V22.8845H325.02V91.1146Z" fill="currentColor"/>
    <path d="M441.784 33.0226H409.421V49.493H435.467V59.6312H409.421V80.9794H441.784V91.1146H399.236V22.8845H441.784V33.0226Z" fill="currentColor"/>
    <path d="M7.94367 36.7217C7.94367 36.7217 0 49.1818 0 59.7896C0 83.6278 17.6083 102.63 41.4236 102.991C49.9038 103.053 59.0932 102.991 66.4556 95.4701C39.5246 95.4701 23.056 75.9903 23.056 59.7896C23.056 59.7896 22.6685 47.0601 28.481 37.0312L7.94367 36.7217Z" fill="currentColor"/>
    <path d="M83.312 15.1789C90.6744 15.1789 94.6695 23.4157 96.2931 30.0874H96.4868C98.1104 23.4157 102.106 15.1789 109.468 15.1789H173.017C177.826 15.1789 177.826 13.2503 177.826 7.54237C177.826 2.89302 180.868 0 185.03 0H192.534V15.1789C192.534 28.5445 185.03 29.39 177.439 29.39L162.49 29.4405H118.768C114.118 29.4405 113.847 30.0874 111.987 34.7162C110.449 38.5432 96.4868 75.2185 96.4868 75.2185H96.2931C96.2931 75.2185 82.331 38.5432 80.7932 34.7162C78.9333 30.0874 78.662 29.4405 74.0121 29.4405H30.29L15.3414 29.39C7.75024 29.39 0.245492 28.5445 0.245492 15.1789V0H7.75024C11.6252 0 14.9539 3.47162 14.9539 7.54237C14.9539 13.2503 14.9539 15.1789 19.7626 15.1789H83.312Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M70.8707 37.0309C73.5902 37.0309 73.7844 38.4011 74.3672 39.8562L87.5742 73.739C82.3928 83.0194 73.5907 88.3337 62.7542 88.3337C46.3619 88.3336 30.9997 74.9839 30.9998 56.3096C30.9998 49.6757 32.2854 41.3513 37.1997 37.0309H70.8707ZM62.2681 45.8705C56.9958 45.8705 52.7218 50.0585 52.7218 55.7004C52.7218 61.3424 56.9958 65.5303 62.2681 65.5303C67.5403 65.5302 71.8144 61.3423 71.8144 55.7004C71.8144 50.0585 67.5403 45.8706 62.2681 45.8705Z" fill="currentColor"/>
    <path d="M184.642 36.7217C184.642 36.7217 192.586 49.1818 192.586 59.7896C192.586 83.6278 174.978 102.63 151.162 102.991C142.682 103.053 133.493 102.991 126.13 95.4701C153.061 95.4701 169.53 75.9903 169.53 59.7896C169.53 59.7896 169.917 47.0601 164.105 37.0312L184.642 36.7217Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M121.715 37.0309C118.996 37.0309 118.802 38.4011 118.219 39.8562L105.012 73.739C110.193 83.0194 118.995 88.3337 129.832 88.3337C146.224 88.3336 161.586 74.9839 161.586 56.3096C161.586 49.6757 160.301 41.3513 155.386 37.0309H121.715ZM130.318 45.8705C135.59 45.8705 139.864 50.0585 139.864 55.7004C139.864 61.3424 135.59 65.5303 130.318 65.5303C125.046 65.5302 120.772 61.3423 120.772 55.7004C120.772 50.0585 125.046 45.8706 130.318 45.8705Z" fill="currentColor"/>
  </svg>
  <svg class="tl-bug" width="54" height="28" viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="currentColor"/>
    <path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="currentColor"/>
    <path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="currentColor"/>
  </svg>
  <span class="topbar-tagline">Intelligence<sup class="tagline-tm">TM</sup></span>
  </a>`;

/* Menu toggle (far left) — opens/closes the navigation rail. Identical
   on every page. */
const MENU_TOGGLE_HTML = `
  <button type="button" id="topbar-menu-toggle" class="topbar-menu-toggle" title="Collapse menu to icons" aria-label="Collapse menu to icons" aria-pressed="false">
    <span class="material-symbols-outlined">chevron_left</span>
    <span class="lir-label">Menu</span>
  </button>`;

/* Trailing actions — shared by both variants. Notifications (and the
   three-dot "More" menu) were folded into the avatar (MC) menu, so the bar
   no longer carries a standalone bell; the unread dot rides on the avatar. */
const TRAILING_ACTIONS_HTML = '';

/* Portfolio center rail: the section-module shortcuts (filled in by
   portfolio-module.js), the column/grid/split/stack layout switcher, and
   the shared trailing actions docked at the far right of the same bar. */
const PORTFOLIO_RAIL_HTML = `
  <div id="left-icon-rail" aria-label="Portfolio modules">
    <nav id="pf-module-rail" class="pf-module-rail" aria-label="Portfolio module shortcuts"></nav>
    <div class="lir-spacer" aria-hidden="true"></div>
    <div class="lir-layout-group" role="group" aria-label="Appearance">
      <button type="button" class="lir-btn lir-layout-btn" id="lir-layout-btn" data-tip="Appearance" title="Appearance" aria-label="Appearance settings" aria-haspopup="true" aria-expanded="false">
        <span class="material-symbols-outlined">crossword</span>
        <span class="lir-label">Appearance</span>
      </button>
    </div>
  </div>`;

/* Agent-page center: just the trailing actions, right-aligned. */
const AGENT_TRAILING_HTML = `
  <div class="topbar-trailing">
    ${TRAILING_ACTIONS_HTML}
  </div>`;

/*
 * Render the shared top bar into #topbar-row.
 *
 * @param {Object}  opts
 * @param {string}  opts.variant   'agent' (default) or 'portfolio'.
 * @param {string}  opts.logoHref  Where the WISE logo links to.
 * @param {string}  opts.profileTitle  Tooltip on the avatar.
 * @returns {HTMLElement|null} the #topbar-row element (or null if missing).
 */
export function mountTopbar({
  variant = 'agent',
  logoHref = 'overview.html',
  profileTitle = 'Arthur Krupsky · Product Intelligence Lead',
  profileName,
  profileEmail,
  avatarText,
} = {}) {
  const row = document.getElementById('topbar-row');
  if (!row) return null;

  const center = variant === 'portfolio' ? PORTFOLIO_RAIL_HTML : AGENT_TRAILING_HTML;
  const logo = TOPBAR_LOGO_HTML.replace('LOGO_HREF', logoHref);
  const avatar = (avatarText || (profileName ? deriveInitials(profileName) : 'MC'))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const title = String(profileEmail && profileName ? `${profileName} · ${profileEmail}` : profileTitle)
    .replace(/"/g, '&quot;');

  row.innerHTML = `
    ${MENU_TOGGLE_HTML}
    <div class="topbar-logo" aria-hidden="true">${logo}</div>
    ${center}
    <div class="topbar-profile has-dot" title="${title}">${avatar}</div>`;

  mountMenuBrand({ logoHref, profileTitle, profileName, profileEmail, avatarText });

  row.hidden = true;
  row.setAttribute('aria-hidden', 'true');

  return row;
}

/** Pin the menu toggle to the right of the logo in the nav brand strip. */
export function syncMenuTogglePlacement() {
  const brand = document.querySelector('.menu-brand-bar');
  const toggle = document.getElementById('topbar-menu-toggle');
  if (!toggle || !brand) return;
  brand.appendChild(toggle);
}

/*
 * Lift the WISE wordmark into the navigation panel's brand strip so the menu
 * module spans the full left column (including the old logo row). The menu
 * toggle sits to the right of the logo and collapses the panel to an icon
 * rail (.mp-rail). When collapsed only the owl bug mark shows.
 */
export function mountMenuBrand({
  logoHref = 'overview.html',
  profileTitle = 'Arthur Krupsky · Product Intelligence Lead',
  profileName,
  profileEmail,
  avatarText,
} = {}) {
  const shell = document.getElementById('agent-shell-wrap') || document.getElementById('chat-shell-wrap');
  const inner = document.querySelector('#menu-panel .menu-inner');
  if (!inner) return null;

  let brand = inner.querySelector('.menu-brand-bar');
  if (!brand) {
    brand = document.createElement('div');
    brand.className = 'menu-brand-bar';
    const logoWrap = document.createElement('div');
    logoWrap.className = 'menu-brand-logo';
    logoWrap.innerHTML = TOPBAR_LOGO_HTML.replace('LOGO_HREF', logoHref);
    brand.appendChild(logoWrap);
    inner.insertBefore(brand, inner.firstChild);
  }

  shell?.classList.add('menu-brand-integrated');
  syncMenuTogglePlacement();
  mountMenuFooter({ profileTitle, profileName, profileEmail, avatarText });
  return brand;
}

/** Derive up-to-two-letter initials from a display name (e.g. "Arthur Krupsky" → "AK"). */
function deriveInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/*
 * Duplicate the top-bar layout + profile controls at the bottom of the menu
 * module. Clicks delegate to the originals in #topbar-row so behaviour stays
 * in one place; class changes on the source are mirrored onto the clones.
 */
export function mountMenuFooter({
  profileTitle = 'Arthur Krupsky · Product Intelligence Lead',
  profileName,
  profileEmail,
  avatarText,
} = {}) {
  const inner = document.querySelector('#menu-panel .menu-inner');
  if (!inner) return null;

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escQ = (s) => String(s ?? '').replace(/"/g, '&quot;');

  const name = profileName || String(profileTitle).split(' · ')[0].trim() || 'Account';
  const initials = avatarText || deriveInitials(name);
  const safeTitle = escQ(profileEmail ? `${name} · ${profileEmail}` : profileTitle);

  let footer = inner.querySelector('.menu-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'menu-footer';
    inner.appendChild(footer);
  }

  /* Rich profile (name + email over two lines) matches the sectioned app nav;
     the legacy single-line label is used when no email is supplied. */
  const profileHtml = profileEmail
    ? `
      <button type="button" class="menu-nav-item menu-footer-profile menu-footer-profile--rich" id="menu-footer-profile" title="${safeTitle}" aria-label="User menu">
        <span class="menu-nav-icon menu-footer-avatar">${esc(initials)}</span>
        <span class="menu-footer-identity">
          <span class="menu-footer-name">${esc(name)}</span>
          <span class="menu-footer-email">${esc(profileEmail)}</span>
        </span>
      </button>`
    : `
      <button type="button" class="menu-nav-item menu-footer-profile has-dot" id="menu-footer-profile" title="${safeTitle}" aria-label="User menu">
        <span class="menu-nav-icon menu-footer-avatar">${esc(initials)}</span>
        <span class="menu-nav-label">${esc(name)}</span>
      </button>`;

  /* Appearance is a permanent fixture of the nav module — it's how users
     modify, guide, and individuate the main modules and panes app-wide, so it
     is always rendered regardless of caller options. */
  const appearanceHtml = `
      <button type="button" class="menu-nav-item menu-footer-layout" id="menu-footer-layout-btn" title="Appearance" aria-label="Appearance settings">
        <span class="menu-nav-icon"><span class="material-symbols-outlined">crossword</span></span>
        <span class="menu-nav-label">Appearance</span>
      </button>`;

  footer.innerHTML = `
    <div class="menu-footer-actions">
      ${appearanceHtml}
      ${profileHtml}
    </div>`;

  wireMenuFooter();
  return footer;
}

/** True when the popover anchor lives in the menu module footer. */
export function isMenuFooterAnchor(anchor) {
  return !!anchor?.closest?.('.menu-footer');
}

/** Position a .wise-popover beside / above a menu-footer row (inside the nav module). */
export function positionPopoverInMenuPanel(pop, anchor) {
  /* Pivoted into the horizontal top bar, the "panel" spans the full screen
     width — sizing the popover to it would make it huge. Fall back to the
     compact top-bar placement (fit-to-content, dropped below the anchor). */
  if (anchor.closest('#menu-panel.mp-pivot')) {
    positionPopoverForTopbar(pop, anchor);
    return;
  }
  const panelInner = anchor.closest('#menu-panel .menu-inner') || anchor.closest('#menu-panel');
  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panelInner?.getBoundingClientRect() || anchorRect;
  const maxW = Math.max(200, Math.round((panelRect.width || 240) - 16));
  pop.style.width = maxW + 'px';
  pop.style.maxWidth = maxW + 'px';
  pop.classList.add('menu-footer-popover');

  let ph = pop.offsetHeight;
  if (ph < 1) {
    pop.style.visibility = 'hidden';
    ph = pop.offsetHeight;
    pop.style.visibility = '';
  }
  const pw = pop.offsetWidth || maxW;

  let left = panelRect.left + 8;
  let top = anchorRect.top - ph - 8;
  if (top < 8) top = anchorRect.bottom + 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  pop.style.left = Math.max(8, left) + 'px';
  pop.style.top = Math.max(8, Math.min(top, window.innerHeight - ph - 8)) + 'px';
}

/** Position a .wise-popover for a top-bar anchor (below the trigger). */
export function positionPopoverForTopbar(pop, anchor) {
  pop.classList.remove('menu-footer-popover');
  const rect = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth || 240;
  const left = Math.max(8, Math.min(rect.right - pw, window.innerWidth - pw - 8));
  pop.style.left = left + 'px';
  pop.style.top = (rect.bottom + 8) + 'px';
}

/* Minimal UI — collapse the navigation to just the logo, the crossword
   (Appearance), and the avatar. Everything else (the nav list and the
   collapse toggle) is hidden via the `minimal-ui` class on #menu-panel. The
   toggle itself lives inside the Appearance (crossword) popover; the choice is
   persisted so it survives reloads and page changes. */
const MINIMAL_UI_KEY = 'wise-minimal-ui';

/** True when minimal UI was last left on. */
export function isMinimalUiOn() {
  try { return localStorage.getItem(MINIMAL_UI_KEY) === '1'; } catch { return false; }
}

/** Reflect minimal-UI state onto the navigation panel and persist it. The
    Appearance popover reads isMinimalUiOn() to render its own toggle state. */
export function applyMinimalUi(on) {
  const panel = document.getElementById('menu-panel');
  if (panel) panel.classList.toggle('minimal-ui', !!on);
  try { localStorage.setItem(MINIMAL_UI_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:minimal-ui', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted minimal-UI state onto the panel (no popover needed). */
export function restoreMinimalUi() {
  applyMinimalUi(isMinimalUiOn());
}

/* Icons only — collapse the navigation to an icons-only rail (all icons, no
   labels) via the `mp-rail` class on #menu-panel. This is the SAME icon rail
   the nav's collapse chevron produces; the Appearance toggle just exposes it as
   a persisted preference. It shares the chevron's `wise-menu-rail` key so the
   two controls stay in sync. Mirrors Minimal UI's shape (is/apply/restore). */
const ICON_RAIL_KEY = 'wise-menu-rail';

/** True when the icons-only nav rail is on. Defaults to ON (no stored value)
    to match the nav module, which opens collapsed to its icon rail by default —
    so the Appearance toggle reflects the real nav state out of the box. */
export function isIconRailOn() {
  try {
    const v = localStorage.getItem(ICON_RAIL_KEY);
    return v === null ? true : v === '1';
  } catch { return true; }
}

/** Reflect icons-only-rail state onto the navigation panel and persist it. The
    Appearance popover reads isIconRailOn() to render its own toggle state; the
    dispatched event lets the nav's collapse chevron re-skin itself to match. */
export function applyIconRail(on) {
  const panel = document.getElementById('menu-panel');
  if (panel) panel.classList.toggle('mp-rail', !!on);
  try { localStorage.setItem(ICON_RAIL_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:menu-rail', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted icons-only-rail state onto the panel. */
export function restoreIconRail() {
  applyIconRail(isIconRailOn());
}

/** Read a page-level appearance default from `<body data-default-…>`.
    Returns `null` when the attribute is absent so callers can skip the override. */
export function pageAppearanceDefault(dataKey) {
  try {
    const v = document.body?.dataset?.[dataKey];
    if (v === undefined) return null;
    return v === '1' || v === 'true';
  } catch { return null; }
}

/* Header float — drop every module/panel header strip entirely (no space kept)
   and pin its right-floated icons/actions (.panel-controls) absolutely over the
   top-right of the module content. Driven by a `header-float` class on <html> so
   it reaches every module on every page; persisted so it survives navigation. */
const HEADER_FLOAT_KEY = 'wise-header-float';

/** True when header-float (headerless modules) is on. Defaults to ON app-wide
    so module/panel headers are hidden out of the box; an explicit user choice
    (stored '0') is still respected. */
export function isHeaderFloatOn() {
  try {
    const v = localStorage.getItem(HEADER_FLOAT_KEY);
    return v === null ? true : v === '1';
  } catch { return true; }
}

/** Toggle the header-float class on <html> and persist it. Each Appearance
    popover reads isHeaderFloatOn() to render its own toggle state. */
export function applyHeaderFloat(on) {
  document.documentElement.classList.toggle('header-float', !!on);
  try { localStorage.setItem(HEADER_FLOAT_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:header-float', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted header-float state onto the document (no popover needed). */
export function restoreHeaderFloat() {
  applyHeaderFloat(isHeaderFloatOn());
}

/* Full bleed — open EVERY module top-to-bottom (drop its top/bottom borders,
   corner rounding, shadow and bounce-in, and collapse the vertical gaps around
   it) so every module — the nav rail, WISEai, and every content module alike —
   fills the full height of the screen while staying switchable from the rail.
   Driven by a `full-bleed` class on <html> so it reaches every module on every
   page; persisted so it survives navigation. */
const FULL_BLEED_KEY = 'wise-full-bleed';

/** True when full-bleed (containerless modules) was last left on. */
export function isFullBleedOn() {
  try { return localStorage.getItem(FULL_BLEED_KEY) === '1'; } catch { return false; }
}

/** Toggle the full-bleed class on <html> and persist it. Each Appearance
    popover reads isFullBleedOn() to render its own toggle state. */
export function applyFullBleed(on) {
  document.documentElement.classList.toggle('full-bleed', !!on);
  try { localStorage.setItem(FULL_BLEED_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:full-bleed', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted full-bleed state onto the document (no popover needed). */
export function restoreFullBleed() {
  applyFullBleed(isFullBleedOn());
}

/* Colorblind-friendly palettes — remap the semantic status colors (success
   green, danger red, warning amber) to a colorblind-safe set so the red↔green
   coding stays distinguishable. Color-vision deficiency comes in different
   forms, and the ideal "safe" palette differs by type, so we ship THREE tuned
   variants and let the user pick the one that matches their vision:
     - Deuteranopia (green-weak, the most common)  → Okabe–Ito bluish-green /
       vermillion / orange, separated on the blue–orange axis.
     - Protanopia   (red-weak)                     → success shifts to BLUE
       (protans lose red luminance, so a blue "good" reads far more clearly).
     - Tritanopia   (blue-yellow-weak, rare)       → the red/green channel is
       intact, but amber/yellow collides with pink, so warning shifts to PURPLE.
   Rather than re-declaring tokens in every page's :root block, we inject ONE
   stylesheet (scoped to `html.colorblind.cb-*` and their `.dark` variants) that
   overrides the shared design tokens — so every page that loads this module
   picks up the same palette. Driven by a `colorblind` class + a `cb-<type>`
   class on <html>; both the on/off state and the chosen type are persisted so
   they survive navigation. */
const COLORBLIND_KEY = 'wise-colorblind';
const COLORBLIND_MODE_KEY = 'wise-colorblind-mode';
const COLORBLIND_STYLE_ID = 'wise-colorblind-style';

/** Supported CVD types. `class` is the modifier added to <html>; the label is
    shown in the Appearance picker; `short` labels the compact segmented button. */
export const COLORBLIND_MODES = [
  { id: 'deuter', class: 'cb-deuter', label: 'Deuteranopia (green-weak)', short: 'Deut' },
  { id: 'protan', class: 'cb-protan', label: 'Protanopia (red-weak)', short: 'Prot' },
  { id: 'tritan', class: 'cb-tritan', label: 'Tritanopia (blue-weak)', short: 'Trit' },
];
const COLORBLIND_CLASSES = COLORBLIND_MODES.map((m) => m.class);
const DEFAULT_COLORBLIND_MODE = 'deuter';

/* The *-text shades are darkened (light mode) / lightened (dark mode) so labels
   keep strong contrast on their translucent tints. */
const COLORBLIND_CSS = `
html.colorblind.cb-deuter {
  --sec-green: #009E73;
  --sec-red: #D55E00;
  --ter-amber: #E69F00;
  --sec-green-text: #006B4F;
  --sec-red-text: #8A3D00;
  --ter-amber-text: #6B4A00;
}
html.colorblind.cb-deuter.dark {
  --sec-green-text: #6FD4B5;
  --sec-red-text: #FFB07A;
  --ter-amber-text: #FFD98A;
}
html.colorblind.cb-protan {
  --sec-green: #0072B2;
  --sec-red: #D55E00;
  --ter-amber: #E69F00;
  --sec-green-text: #004E7A;
  --sec-red-text: #8A3D00;
  --ter-amber-text: #6B4A00;
}
html.colorblind.cb-protan.dark {
  --sec-green-text: #7FC4EC;
  --sec-red-text: #FFB07A;
  --ter-amber-text: #FFD98A;
}
html.colorblind.cb-tritan {
  --sec-green: #1B7F3B;
  --sec-red: #D01C2E;
  --ter-amber: #8130A6;
  --sec-green-text: #0F5626;
  --sec-red-text: #8E1220;
  --ter-amber-text: #5C1E77;
}
html.colorblind.cb-tritan.dark {
  --sec-green-text: #7FD69A;
  --sec-red-text: #FF8A97;
  --ter-amber-text: #D9A6F0;
}
/* The palette overrides above keep semantic status colors distinct, but on a
   given screen those chips may be sparse — so the effect can look invisible.
   To make colorblind mode unmistakable AND genuinely useful, we ALSO run the
   whole app through a per-type daltonization (color-correction) filter. These
   matrices are grayscale-preserving (each row sums to 1), so text and neutral
   backgrounds are untouched while saturated reds/greens/blues visibly shift
   apart along each type's confusion axis. Applied to <body>; the page root
   doesn't scroll, so fixed-position popovers/docks keep their coordinates. */
html.colorblind.cb-deuter body { filter: url(#wise-cb-deuter); }
html.colorblind.cb-protan body { filter: url(#wise-cb-protan); }
html.colorblind.cb-tritan body { filter: url(#wise-cb-tritan); }`;

/* Daltonization (2·Identity − simulation) matrices, per CVD type. Rows are
   R'/G'/B' as functions of R,G,B; each sums to 1 so grays map to themselves. */
const COLORBLIND_FILTERS_ID = 'wise-colorblind-filters';
const COLORBLIND_FILTER_MATRICES = {
  'wise-cb-deuter':
    '1.70969 -0.70969 0 0 0  -0.29031 1.29031 0 0 0  0.02197 -0.02197 1 0 0  0 0 0 1 0',
  'wise-cb-protan':
    '1.89111 -0.89111 0 0 0  -0.10889 1.10889 0 0 0  -0.00447 0.00447 1 0 0  0 0 0 1 0',
  'wise-cb-tritan':
    '1.05 -0.05 0 0 0  0 1.567 -0.567 0 0  0 -0.475 1.475 0 0  0 0 0 1 0',
};

/** Inject the colorblind palette stylesheet once (idempotent). */
function ensureColorblindStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(COLORBLIND_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = COLORBLIND_STYLE_ID;
  style.textContent = COLORBLIND_CSS;
  (document.head || document.documentElement).appendChild(style);
}

/** Inject the SVG <filter> definitions the palette CSS references, once. */
function ensureColorblindFilters() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(COLORBLIND_FILTERS_ID)) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.id = COLORBLIND_FILTERS_ID;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
  for (const [id, values] of Object.entries(COLORBLIND_FILTER_MATRICES)) {
    const filter = document.createElementNS(svgNS, 'filter');
    filter.id = id;
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    const fe = document.createElementNS(svgNS, 'feColorMatrix');
    fe.setAttribute('type', 'matrix');
    fe.setAttribute('values', values.replace(/\s+/g, ' ').trim());
    filter.appendChild(fe);
    svg.appendChild(filter);
  }
  (document.body || document.documentElement).appendChild(svg);
}

/** True when the colorblind-friendly palette was last left on. */
export function isColorblindOn() {
  try { return localStorage.getItem(COLORBLIND_KEY) === '1'; } catch { return false; }
}

/** The persisted CVD type id ('deuter' | 'protan' | 'tritan'), default deuter. */
export function getColorblindMode() {
  try {
    const v = localStorage.getItem(COLORBLIND_MODE_KEY);
    return COLORBLIND_MODES.some((m) => m.id === v) ? v : DEFAULT_COLORBLIND_MODE;
  } catch { return DEFAULT_COLORBLIND_MODE; }
}

/** Reflect the active CVD type onto <html> (only one cb-* class at a time). */
function applyColorblindModeClass(modeId) {
  const root = document.documentElement;
  const active = COLORBLIND_MODES.find((m) => m.id === modeId) || COLORBLIND_MODES[0];
  COLORBLIND_CLASSES.forEach((cls) => root.classList.toggle(cls, cls === active.class));
}

/** Toggle the colorblind class on <html> and persist it, applying the chosen
    CVD-type palette. Each Appearance popover reads isColorblindOn() /
    getColorblindMode() to render its own state. */
export function applyColorblind(on) {
  ensureColorblindStyle();
  ensureColorblindFilters();
  applyColorblindModeClass(getColorblindMode());
  document.documentElement.classList.toggle('colorblind', !!on);
  try { localStorage.setItem(COLORBLIND_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:colorblind', {
      detail: { on: !!on, mode: getColorblindMode() },
    }));
  } catch {}
}

/** Switch the CVD-type palette (persisting it). Turning the palette itself on
    is left to applyColorblind, but selecting a type implies the user wants it on,
    so we enable it here too for a one-tap experience. */
export function setColorblindMode(modeId) {
  const mode = COLORBLIND_MODES.find((m) => m.id === modeId) || COLORBLIND_MODES[0];
  try { localStorage.setItem(COLORBLIND_MODE_KEY, mode.id); } catch {}
  ensureColorblindStyle();
  applyColorblindModeClass(mode.id);
  applyColorblind(true);
}

/** Restore the persisted colorblind state + type onto the document. */
export function restoreColorblind() {
  applyColorblind(isColorblindOn());
}

/** Wire menu-footer controls — dispatch events so each page opens its own in-panel popover. */
export function wireMenuFooter() {
  const footerLayout = document.getElementById('menu-footer-layout-btn');
  if (footerLayout && !footerLayout.dataset.wireBound) {
    footerLayout.dataset.wireBound = '1';
    footerLayout.setAttribute('aria-haspopup', 'menu');
    footerLayout.addEventListener('click', (e) => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('wise:menu-footer-layout', {
        detail: { anchor: footerLayout },
        bubbles: true,
      }));
    });
  }

  const sourceProfile =
    document.querySelector('#topbar-row .topbar-profile') ||
    document.getElementById('topbar-profile');
  const footerProfile = document.getElementById('menu-footer-profile');
  if (footerProfile && !footerProfile.dataset.wireBound) {
    footerProfile.dataset.wireBound = '1';
    if (sourceProfile) {
      const syncProfile = () => {
        footerProfile.classList.toggle('has-dot', sourceProfile.classList.contains('has-dot'));
        footerProfile.classList.toggle('is-read', sourceProfile.classList.contains('is-read'));
      };
      syncProfile();
      new MutationObserver(syncProfile).observe(sourceProfile, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
    footerProfile.setAttribute('aria-haspopup', 'menu');
    footerProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('wise:menu-footer-profile', {
        detail: { anchor: footerProfile },
        bubbles: true,
      }));
    });
  }
}

/* Colorblind-type picker — the segmented control lives inside every shell's
   Appearance popover (built by buildAppearanceBody), but the popovers stop
   click propagation before it reaches the document, so instead of duplicating a
   handler in each shell we intercept the `data-cbtype` buttons in the CAPTURE
   phase (which runs before the shells' own bubble-phase handlers). This makes
   the type picker work identically on every page for free. */
function wireColorblindTypePicker() {
  if (typeof document === 'undefined' || document.__wiseCbPickerBound) return;
  document.__wiseCbPickerBound = true;
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target?.closest?.('.fz-btn[data-cbtype]');
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      setColorblindMode(btn.dataset.cbtype);
      const group = btn.closest('.fz-btns');
      group?.querySelectorAll('.fz-btn[data-cbtype]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('fz-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    },
    true
  );
}

if (typeof document !== 'undefined') {
  wireColorblindTypePicker();
  document.addEventListener('DOMContentLoaded', () => {
    restoreMinimalUi();
    restoreHeaderFloat();
    restoreFullBleed();
    restoreColorblind();
    const inner = document.querySelector('#menu-panel .menu-inner');
    if (!inner) return;
    const footer = inner.querySelector('.menu-footer');
    if (!footer || !footer.querySelector('.menu-nav-item')) mountMenuFooter();
    else wireMenuFooter();
  });
}
