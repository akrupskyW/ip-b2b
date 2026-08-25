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

/* Musical "pump up the jam" strip for the Minimal-UI top bar. Named import so
   the footer mount can place the strip once #menu-panel .menu-inner exists. */
import { mountJamStrip } from './jam-strip.js';

/* Mobile primary navigation (≤768px): collapses the nav to an owl + expand
   rail and opens the full nav / History as full-screen pop-overs. Side-effect
   import so it runs on every page that mounts the shared shell. */
import './mobile-nav.js';

/* Shared user-avatar store — lets the nav chips render the member's uploaded
   profile picture (set on the Organization Profile page) instead of initials. */
import { userAvatarImg } from './user-avatar.js';

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
      <button type="button" class="lir-btn lir-layout-btn" id="lir-layout-btn" data-tip="Appearance settings" title="Appearance settings" aria-label="Appearance settings" aria-haspopup="true" aria-expanded="false">
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
  /* A set avatar picture replaces the initials; `data-initials` keeps the text
     fallback so clearing the picture restores it in place. */
  const avatarImg = userAvatarImg(profileName || 'You');
  const profileClass = avatarImg ? 'topbar-profile has-dot has-avatar-img' : 'topbar-profile has-dot';

  row.innerHTML = `
    ${MENU_TOGGLE_HTML}
    <div class="topbar-logo" aria-hidden="true">${logo}</div>
    ${center}
    <div class="${profileClass}" title="${title}" data-initials="${avatar}">${avatarImg || avatar}</div>`;

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
 * rail (.mp-rail). When collapsed only the owl bug mark shows, except
 * while Appearance ▸ Search is on — then the full wordmark paints in the
 * search band as if the nav were still expanded.
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
  restoreMinimalUi();
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
  /* Prefer the member's uploaded avatar picture; fall back to initials. The
     initials ride along in `data-initials` so removing the picture restores
     them without a re-render. */
  const avatarImg = userAvatarImg(name);
  const avatarInner = avatarImg || esc(initials);
  const avatarClass = avatarImg ? 'menu-nav-icon menu-footer-avatar has-avatar-img' : 'menu-nav-icon menu-footer-avatar';

  let footer = findMenuFooter();
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
        <span class="${avatarClass}" data-initials="${escQ(esc(initials))}">${avatarInner}</span>
        <span class="menu-footer-identity">
          <span class="menu-footer-name">${esc(name)}</span>
          <span class="menu-footer-email">${esc(profileEmail)}</span>
        </span>
      </button>`
    : `
      <button type="button" class="menu-nav-item menu-footer-profile has-dot" id="menu-footer-profile" title="${safeTitle}" aria-label="User menu">
        <span class="${avatarClass}" data-initials="${escQ(esc(initials))}">${avatarInner}</span>
        <span class="menu-nav-label">${esc(name)}</span>
      </button>`;

  /* Appearance is a permanent fixture of the nav module — it's how users
     modify, guide, and individuate the main modules and panes app-wide, so it
     is always rendered regardless of caller options. */
  const appearanceHtml = `
      <button type="button" class="menu-nav-item menu-footer-layout" id="menu-footer-layout-btn" data-tip="Appearance settings" title="Appearance settings" aria-label="Appearance settings">
        <span class="menu-nav-icon"><span class="material-symbols-outlined">crossword</span></span>
        <span class="menu-nav-label">Appearance</span>
      </button>`;

  footer.innerHTML = `
    <div class="menu-footer-actions">
      ${appearanceHtml}
      ${profileHtml}
    </div>`;

  wireMenuFooter();
  mountJamStrip();
  syncSearchFloatedFooter();
  return footer;
}

/* Search on: park Appearance + avatar on the search band, at the far
   right of the row. Search off (or phones): put them back in the nav
   footer. The search row is removed on toggle-off, so this must run
   BEFORE unmount or the controls would be deleted with the row. */
const SEARCH_FOOTER_MQ = '(min-width: 769px)';

function findMenuFooter() {
  return document.querySelector('#menu-panel .menu-footer')
    || document.querySelector('#wise-app-search .menu-footer');
}

/** Move or restore the nav footer at the far right of the search row. */
export function syncSearchFloatedFooter() {
  const footer = findMenuFooter();
  const search = document.getElementById('wise-app-search');
  const inner = document.querySelector('#menu-panel .menu-inner');
  if (!footer) return;

  const float = !!(
    search &&
    document.documentElement.classList.contains('app-search-on') &&
    window.matchMedia(SEARCH_FOOTER_MQ).matches
  );

  if (float) {
    const slot = search;
    if (footer.parentElement !== slot) slot.appendChild(footer);
    footer.classList.add('menu-footer--search-float');
  } else {
    footer.classList.remove('menu-footer--search-float');
    if (inner && footer.parentElement !== inner) inner.appendChild(footer);
  }
}

/** True when the popover anchor lives in the menu module footer. */
export function isMenuFooterAnchor(anchor) {
  return !!anchor?.closest?.('.menu-footer');
}

/* The Appearance popover only becomes its wide two-column (and therefore
   short) layout once wireAppearancePopover() tags it with
   `.wise-popover--appearance`. But shells call the positioning helpers BEFORE
   wiring, so without this the popover is still measured as a narrow ~320px
   SINGLE column — tall enough to overflow the viewport, which made the
   above-the-icon placement clamp all the way to the top-left corner. Detect the
   appearance body by its group cards and add the class up front so its height is
   measured at the real (two-column) size. The avatar/user menu has no
   `.wise-appearance-group`, so it is never affected. */
function ensureAppearanceClass(pop) {
  if (pop && !pop.classList.contains('wise-popover--appearance') &&
      pop.querySelector?.('.wise-appearance-group')) {
    pop.classList.add('wise-popover--appearance');
  }
}

/** Position a .wise-popover beside / above a menu-footer row (inside the nav module). */
export function positionPopoverInMenuPanel(pop, anchor) {
  ensureAppearanceClass(pop);
  /* Pivoted into the horizontal top bar, the "panel" spans the full screen
     width — sizing the popover to it would make it huge. Fall back to the
     compact top-bar placement (fit-to-content, dropped below the anchor). */
  if (anchor.closest('#menu-panel.mp-pivot') ||
      anchor.closest('.menu-footer--search-float')) {
    positionPopoverForTopbar(pop, anchor);
    return;
  }
  const panelInner = anchor.closest('#menu-panel .menu-inner') || anchor.closest('#menu-panel');
  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panelInner?.getBoundingClientRect() || anchorRect;
  /* Do NOT size the popover to the nav panel's width. The panel width varies
     per page and per state (expanded nav vs 66px icon rail), which used to make
     the Appearance panel a different width on every navigation module. Leave the
     width to the shared .wise-popover CSS (min 240 / max 320) so the panel is
     identical everywhere — and identical to the top-bar-anchored popover too. */
  pop.classList.add('menu-footer-popover');

  let ph = pop.offsetHeight;
  if (ph < 1) {
    pop.style.visibility = 'hidden';
    ph = pop.offsetHeight;
    pop.style.visibility = '';
  }
  const pw = pop.offsetWidth || 240;

  let left = panelRect.left + 8;
  let top = anchorRect.top - ph - 8;
  if (top < 8) top = anchorRect.bottom + 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  placeFixedInViewport(pop, Math.max(8, left), Math.max(8, Math.min(top, window.innerHeight - ph - 8)));
  /* Remember how to re-place this popover so a later re-render (e.g. turning on
     the Jam strip or Full bleed reveals extra rows and makes it taller) can snap
     it back inside the viewport instead of overflowing off its old anchor. */
  pop.__reposition = () => positionPopoverInMenuPanel(pop, anchor);
}

/** Pin a position:fixed popover to viewport (left, top), compensating for any
    ancestor that establishes a containing block (filter / transform / etc.).
    Same origin-probe as js/popover-layer.js, so Appearance stays on its
    trigger whether Accessible colors is on or off. */
function placeFixedInViewport(el, left, top) {
  if (!el) return;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.left = '0px';
  el.style.top = '0px';
  const origin = el.getBoundingClientRect();
  el.style.left = `${Math.round(left - origin.left)}px`;
  el.style.top = `${Math.round(top - origin.top)}px`;
}

/** Position a .wise-popover for a top-bar anchor (below the trigger). */
export function positionPopoverForTopbar(pop, anchor) {
  ensureAppearanceClass(pop);
  pop.classList.remove('menu-footer-popover');
  const rect = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth || 240;
  const left = Math.max(8, Math.min(rect.right - pw, window.innerWidth - pw - 8));
  placeFixedInViewport(pop, left, rect.bottom + 8);
  /* Same as above — keep a way to re-place after the body grows/shrinks. */
  pop.__reposition = () => positionPopoverForTopbar(pop, anchor);
}

/** Keep both theme keys in lockstep. Pages used to write only `wise-theme` or
    only `chat-theme`, so toggling Light/Dark in the Appearance popover on one
    page could restore the opposite theme on the next. */
export function syncThemeKeys() {
  if (typeof document === 'undefined') return;
  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  try {
    localStorage.setItem('wise-theme', theme);
    localStorage.setItem('chat-theme', theme);
  } catch {}
  /* Default full-bleed surfaces swap with the theme (navy+gold nav in light;
     linen nav in dark). Chat stays on the contained blue tint. Named presets
     keep their hex. */
  refreshFullBleedDefaultTheme();
}

/* Minimal UI — collapse the navigation to just the logo, the crossword
   (Appearance), and the avatar. Everything else (the nav list and the
   collapse toggle) is hidden via the `minimal-ui` class on #menu-panel. The
   toggle itself lives inside the Appearance (crossword) popover; the choice is
   persisted so it survives reloads and page changes.

   Defaults to ON (no stored value) so the Appearance toggle and first-run
   nav match. v2 key — restore used to write the v1 key to "0" on every load,
   so a fresh key is required for the on-by-default to stick. Keep the FOUC
   guard in js/text-size-fouc.js in sync with this key and default. */
const MINIMAL_UI_KEY = 'wise-minimal-ui-v2';

/** True when minimal UI is on. Defaults to ON (no stored value) so the
    Appearance toggle reflects the real nav state out of the box. */
export function isMinimalUiOn() {
  try {
    const v = localStorage.getItem(MINIMAL_UI_KEY);
    return v === null ? true : v === '1';
  } catch { return true; }
}

/** Reflect minimal-UI state onto the navigation panel. The Appearance
    popover reads isMinimalUiOn() to render its own toggle state.
    @param {boolean} on
    @param {boolean} [persist=true]  Only an explicit user toggle persists;
      the initial restore must NOT write, or it would lock in a default. */
export function applyMinimalUi(on, persist = true) {
  const panel = document.getElementById('menu-panel');
  if (panel) panel.classList.toggle('minimal-ui', !!on);
  if (persist) {
    try { localStorage.setItem(MINIMAL_UI_KEY, on ? '1' : '0'); } catch {}
  }
  try {
    document.dispatchEvent(new CustomEvent('wise:minimal-ui', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted (or default-on) minimal-UI state onto the panel
    without writing, so a first visit stays on until the user toggles. */
export function restoreMinimalUi() {
  applyMinimalUi(isMinimalUiOn(), false);
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

/* Header float — module/panel header strips are permanently removed app-wide.
   The `header-float` class on <html> drops every header strip entirely (no space
   kept) and pins its right-floated icons/actions (.panel-controls) absolutely
   over the top-right of the module content. There is no longer a user toggle for
   this: the class is always applied. The functions below are kept (as no-ops that
   force the class on) so existing callers/imports keep working. */

/** Header-float is permanently on — module headers are always hidden. */
export function isHeaderFloatOn() {
  return true;
}

/** Force the header-float class on <html>. The `on` argument is ignored:
    headers are permanently removed app-wide. */
export function applyHeaderFloat(_on) {
  document.documentElement.classList.add('header-float');
  try {
    document.dispatchEvent(new CustomEvent('wise:header-float', { detail: { on: true } }));
  } catch {}
}

/** Apply the (always-on) header-float state onto the document. */
export function restoreHeaderFloat() {
  applyHeaderFloat();
}

/* Full bleed — open EVERY module top-to-bottom (drop its top/bottom borders,
   corner rounding, shadow and bounce-in, and collapse the vertical gaps around
   it) so every module — the nav rail, WISEcodeAI, and every content module alike —
   fills the full height of the screen while staying switchable from the rail.
   Driven by a `full-bleed` class on <html> so it reaches every module on every
   page; persisted so it survives navigation.

   The two Appearance rows are mutually exclusive modes stored in one key
   (`wise-fb-mode`): `'chat'` (default — stretch only the chat), `'all'`
   (stretch every module), or `'off'`. Chat-only still sets `full-bleed` +
   `fb-chat-only` so existing CSS applies. Keep the resolver in sync with
   the FOUC guard in js/text-size-fouc.js. */
const FULL_BLEED_KEY = 'wise-full-bleed';
const FB_CHAT_ONLY_KEY = 'wise-fb-chat-only';
const FB_MODE_KEY = 'wise-fb-mode';

/** Resolve the active full-bleed mode. Unset → `'chat'` so every page
    opens with Chat-only full bleed. The two legacy flags are only used to
    preserve an explicit "everything bleed" choice from before this key. */
function resolveFullBleedMode() {
  try {
    const mode = localStorage.getItem(FB_MODE_KEY);
    if (mode === 'chat' || mode === 'all' || mode === 'off') return mode;
    const everything = localStorage.getItem(FULL_BLEED_KEY) === '1';
    const chatOnly = localStorage.getItem(FB_CHAT_ONLY_KEY);
    if (everything && chatOnly === '0') return 'all';
    return 'chat';
  } catch {
    return 'chat';
  }
}

/** Search (Appearance ▸ Admin) suspends both full-bleed modes. Same key as
    js/app-search.js (`wise-app-search`) — read here so this module never
    imports the search row (avoids a cycle through appearance-menu.js). */
function isSearchSuppressingFullBleed() {
  try { return localStorage.getItem('wise-app-search') === '1'; } catch { return false; }
}

/** Drop the live full-bleed classes without rewriting the stored mode. */
function paintFullBleedOff() {
  document.documentElement.classList.remove('full-bleed', 'fb-chat-only');
}

/** True when either full-bleed mode is active (everything or chat-only).
    Search forces this off so the layout and the Appearance rows agree. */
export function isFullBleedOn() {
  if (isSearchSuppressingFullBleed()) return false;
  return resolveFullBleedMode() !== 'off';
}

/** Toggle the full-bleed class on <html> and persist the legacy flag.
    Mode changes go through applyFullBleedMode so the Appearance rows stay
    in sync; this only paints the CSS class the layout rules key off. */
export function applyFullBleed(on) {
  document.documentElement.classList.toggle('full-bleed', !!on);
  try { localStorage.setItem(FULL_BLEED_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:full-bleed', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted (or default chat-only) full-bleed mode onto the
    document — no popover needed. */
export function restoreFullBleed() {
  applyFullBleedMode(resolveFullBleedMode());
}

/** True when Full bleed is stretching every module (not the Chat-only mode). */
export function isFullBleedEverythingOn() {
  if (isSearchSuppressingFullBleed()) return false;
  return resolveFullBleedMode() === 'all';
}

/** True when the Chat-only full bleed mode is on. */
export function isChatOnlyFullBleedOn() {
  if (isSearchSuppressingFullBleed()) return false;
  return resolveFullBleedMode() === 'chat';
}

/** Switch between the two mutually exclusive full-bleed modes:
    `'all'` (every module), `'chat'` (chat only), or `''` / `'off'` (off).
    Chat-only still sets `full-bleed` + `fb-chat-only` so existing CSS applies.
    While Search is on the stored mode is kept, but the classes stay off. */
export function applyFullBleedMode(mode) {
  const resolved = mode === 'all' || mode === 'chat' ? mode : 'off';
  try { localStorage.setItem(FB_MODE_KEY, resolved); } catch {}
  if (isSearchSuppressingFullBleed()) {
    paintFullBleedOff();
    try {
      document.dispatchEvent(new CustomEvent('wise:full-bleed', { detail: { on: false } }));
    } catch {}
    return;
  }
  if (resolved === 'all') {
    applyFullBleed(true);
    applyFullBleedChatOnly(false);
  } else if (resolved === 'chat') {
    applyFullBleed(true);
    applyFullBleedChatOnly(true);
  } else {
    applyFullBleed(false);
    applyFullBleedChatOnly(false);
  }
}

/* ── Full bleed ▸ surface customisation ──────────────────────────────────
   Sub-controls that live UNDER the Full bleed row in the Appearance popover
   (rendered only while full bleed is on, see js/appearance-menu.js). They let
   an admin recolour the surfaces that frame the workspace once modules run
   edge-to-edge — the primary navigation, the chat window, any module docked
   to the RIGHT of the chat, the output aside, and History — plus switch how
   those right modules behave and drop in one of three preset themes that set
   the colours at once. Each colour is pushed onto <html> as a CSS custom
   property plus a marker class; wise.css turns those into `!important`
   background overrides GATED on `html.full-bleed`, so the customisation is
   genuinely part of full bleed (it only shows while full bleed is on, and
   lifts the moment it's switched off). Everything is persisted so it survives
   navigation and applies on every page — the surfaces it targets (.menu-inner,
   the chat cards, .sticky-mod, .wa-pane, and History) exist app-wide. */
const FB_NAV_BG_KEY = 'wise-fb-nav-bg';
const FB_CHAT_BG_KEY = 'wise-fb-chat-bg';
const FB_RMOD_BG_KEY = 'wise-fb-rmod-bg';
const FB_ASIDE_BG_KEY = 'wise-fb-aside-bg';
const FB_HIST_BG_KEY = 'wise-fb-hist-bg';
const FB_RMOD_MODE_KEY = 'wise-fb-rmod-mode';
const FB_THEME_KEY = 'wise-fb-theme';
const FB_THEME_DEFAULT = 'default';

/** Three one-tap preset themes for the full-bleed surfaces. Each is a cohesive
    named look that sets the nav, chat and right-module backgrounds together
    WITH an accent per surface (used for icons / highlights); the readable body
    text is derived automatically, and the light/dark scheme of each surface's
    labels + chips follows its background's luminance:
      • Cyberpunk — near-black indigo panels lit by neon cyan / magenta accents.
      • Sunset Green — deep botanical-green nav with warm cream + sage panels.
      • Blue Sky — an airy sky-blue nav over pale, cloud-light chat + module.
    The bg fields also drive the popover's preview swatch. */
export const FB_PRESETS = [
  {
    id: 'cyber', label: 'Cyberpunk',
    nav: '#0A0E27', navAccent: '#22E6E6',
    chat: '#0D0B1F', chatAccent: '#7DF9FF',
    rmod: '#170B2C', rmodAccent: '#FF6EC7',
  },
  {
    id: 'botanic', label: 'Sunset Green',
    nav: '#1E3A2B', navAccent: '#F3D8A6',
    chat: '#FBF3E4', chatAccent: '#B4741F',
    rmod: '#DCE8CE', rmodAccent: '#2E3A22',
  },
  {
    id: 'sky', label: 'Blue Sky',
    nav: '#3E86C7', navAccent: '#FFFFFF',
    chat: '#EAF4FE', chatAccent: '#2E6FB0',
    rmod: '#D3E8FA', rmodAccent: '#2E6FB0',
  },
];

function fbRead(key) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}
function fbStore(key, val) {
  try { if (val) localStorage.setItem(key, val); else localStorage.removeItem(key); } catch {}
}
/** Relative luminance (WCAG) of a #rrggbb colour, 0 (black) → 1 (white). */
function fbLuminance(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || '').trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const chan = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}
/** Readable body/label ink for a background: near-white on dark surfaces, dark
    navy on light ones. */
function fbAutoFg(hex) { return fbLuminance(hex) > 0.45 ? '#16233B' : '#EAF1F9'; }

/** Push (or clear) a surface colour. When a colour is given we set THREE custom
    properties on <html> — the background, a readable body/label foreground
    (auto-contrast), and an accent for icons/highlights (a preset supplies its
    own accent; hand-picked colours reuse the foreground) — plus the marker
    class AND a `fb-<prefix>-dark|light` scheme class so wise.css can flip the
    WHOLE token palette (labels, muted text, chip inks, borders) to match the
    surface's lightness. Clearing removes all of it. `prefix` is
    nav|chat|rmod|aside|hist. */
function fbSetSurface(prefix, color, accent) {
  const root = document.documentElement;
  const val = typeof color === 'string' ? color.trim() : '';
  const tint = 'fb-' + prefix + '-tint';
  const darkCls = 'fb-' + prefix + '-dark';
  const lightCls = 'fb-' + prefix + '-light';
  if (val) {
    const fg = fbAutoFg(val);
    const isDark = fbLuminance(val) <= 0.45;
    root.style.setProperty('--fb-' + prefix + '-bg', val);
    root.style.setProperty('--fb-' + prefix + '-fg', fg);
    root.style.setProperty('--fb-' + prefix + '-accent', accent || fg);
    root.classList.add(tint);
    root.classList.toggle(darkCls, isDark);
    root.classList.toggle(lightCls, !isDark);
  } else {
    root.style.removeProperty('--fb-' + prefix + '-bg');
    root.style.removeProperty('--fb-' + prefix + '-fg');
    root.style.removeProperty('--fb-' + prefix + '-accent');
    root.classList.remove(tint, darkCls, lightCls);
  }
  try {
    document.dispatchEvent(new CustomEvent('wise:fb-surfaces', { detail: { prefix, on: !!val } }));
  } catch {}
}

/** Primary-navigation background colour ('' when unset). */
export function getNavBg() { return fbRead(FB_NAV_BG_KEY); }
export function applyNavBg(color, accent) {
  fbSetSurface('nav', color, accent);
  fbStore(FB_NAV_BG_KEY, typeof color === 'string' ? color.trim() : '');
}

/** Chat-window background colour ('' when unset). */
export function getChatBg() { return fbRead(FB_CHAT_BG_KEY); }
export function applyChatBg(color, accent) {
  fbSetSurface('chat', color, accent);
  fbStore(FB_CHAT_BG_KEY, typeof color === 'string' ? color.trim() : '');
}

/** Right-of-chat module background colour ('' when unset). */
export function getRightModuleBg() { return fbRead(FB_RMOD_BG_KEY); }
export function applyRightModuleBg(color, accent) {
  fbSetSurface('rmod', color, accent);
  fbStore(FB_RMOD_BG_KEY, typeof color === 'string' ? color.trim() : '');
}

/** Output-aside / .wa-pane background colour ('' when unset). */
export function getAsideBg() { return fbRead(FB_ASIDE_BG_KEY); }
export function applyAsideBg(color, accent) {
  fbSetSurface('aside', color, accent);
  fbStore(FB_ASIDE_BG_KEY, typeof color === 'string' ? color.trim() : '');
}

/** History (left-of-chat .wch-sidebar) background colour ('' when unset). */
export function getHistoryBg() { return fbRead(FB_HIST_BG_KEY); }
export function applyHistoryBg(color, accent) {
  fbSetSurface('hist', color, accent);
  fbStore(FB_HIST_BG_KEY, typeof color === 'string' ? color.trim() : '');
}

/** Apply one full-bleed surface colour by picker kind. */
export function applyFbColor(kind, color, accent) {
  if (kind === 'nav') applyNavBg(color, accent);
  else if (kind === 'chat') applyChatBg(color, accent);
  else if (kind === 'rmod') applyRightModuleBg(color, accent);
  else if (kind === 'aside') applyAsideBg(color, accent);
  else if (kind === 'hist') applyHistoryBg(color, accent);
}

/** How right-of-chat modules behave in full bleed: 'drawer' (default tuck),
    'flat' (full-height column) or 'hidden'. Driven by an `rmod-<mode>` class. */
export const RMOD_MODES = [
  { id: '', label: 'Drawer' },
  { id: 'flat', label: 'Flat' },
  { id: 'hidden', label: 'Hidden' },
];
const RMOD_MODE_CLASSES = ['rmod-flat', 'rmod-hidden'];
export function getRightModuleMode() {
  const v = fbRead(FB_RMOD_MODE_KEY);
  return v === 'flat' || v === 'hidden' ? v : '';
}
export function applyRightModuleMode(mode) {
  const valid = mode === 'flat' || mode === 'hidden';
  const root = document.documentElement;
  RMOD_MODE_CLASSES.forEach((c) => root.classList.toggle(c, valid && c === 'rmod-' + mode));
  fbStore(FB_RMOD_MODE_KEY, valid ? mode : '');
}

/** Contrasting Default surfaces — navy + gold nav and white (or deep) output.
    Chat is left on the contained Blue chat surface (chat-tint) so full bleed
    does not flatten it to linen/navy. These swap with the live light/dark
    theme so Default never paints a light nav onto a dark page (or the reverse). */
function fbDefaultSurfaces() {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return dark
    ? {
        nav: '#F4F2EA', navAccent: '#8B5E12',
        rmod: '#1A2339', rmodAccent: '#E3C878',
      }
    : {
        nav: '#1C3E60', navAccent: '#E3C878',
        rmod: '#FFFFFF', rmodAccent: '#C45C26',
      };
}
/** Hex the contained chat actually paints — the Blue chat surface mix when
    that toggle is on, otherwise the card surface. Used as the Appearance
    picker fallback while Default has no custom chat colour. */
export function getContainedChatBg() {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  if (isChatTintOn()) return dark ? '#232D42' : '#F4F6F8';
  return dark ? '#1A2339' : '#FFFFFF';
}
function applyDefaultFullBleedSurfaces() {
  const d = fbDefaultSurfaces();
  applyNavBg(d.nav, d.navAccent);
  applyChatBg('');
  applyRightModuleBg(d.rmod, d.rmodAccent);
  applyAsideBg(d.rmod, d.rmodAccent);
  applyHistoryBg(d.rmod, d.rmodAccent);
  fbStore(FB_THEME_KEY, FB_THEME_DEFAULT);
}
function getFullBleedThemeRaw() { return fbRead(FB_THEME_KEY); }

/** The active named preset id, or '' when Default / a hand-tweaked set is on. */
export function getFullBleedTheme() {
  const v = getFullBleedThemeRaw();
  if (v === FB_THEME_DEFAULT || v === '') return '';
  return FB_PRESETS.some((p) => p.id === v) ? v : '';
}

/** True only when the contrasting Default set is active — not a named preset
    and not a hand-tweaked mix. The Appearance "Default" chip and "Reset colors"
    use this so a custom swatch doesn't look like Default is still selected. */
export function isFullBleedDefaultTheme() {
  return getFullBleedThemeRaw() === FB_THEME_DEFAULT;
}
/** Apply a preset theme (sets all three surface colours at once), or pass ''
    to restore the contrasting Default set (navy+gold / contained chat / white). */
export function applyFullBleedTheme(id) {
  const preset = FB_PRESETS.find((p) => p.id === id);
  if (preset) {
    applyNavBg(preset.nav, preset.navAccent);
    applyChatBg(preset.chat, preset.chatAccent);
    applyRightModuleBg(preset.rmod, preset.rmodAccent);
    applyAsideBg(preset.aside || preset.rmod, preset.asideAccent || preset.rmodAccent);
    applyHistoryBg(preset.hist || preset.rmod, preset.histAccent || preset.rmodAccent);
    fbStore(FB_THEME_KEY, preset.id);
  } else {
    applyDefaultFullBleedSurfaces();
  }
}
/** Forget the active-preset mark WITHOUT touching the colours — used when a
    single surface is hand-tweaked, so the preset chip stops reading as active
    even though the other two surfaces still match it. */
export function clearFullBleedThemeMark() { fbStore(FB_THEME_KEY, ''); }

/** Re-paint Default surfaces after a light/dark flip. Named presets and
    hand-tweaked colours stay put. */
export function refreshFullBleedDefaultTheme() {
  if (getFullBleedThemeRaw() === FB_THEME_DEFAULT) applyDefaultFullBleedSurfaces();
}

/** Chat-only full bleed — stretch the chat module edge-to-edge and keep the
    nav + every other module as contained cards. A sibling of Full bleed in
    the Appearance popover (mutually exclusive). Driven by `fb-chat-only` on
    <html>, gated in CSS on `html.full-bleed` so the chat-only layout rules
    still apply. Defaults ON — the contained-nav / stretched-chat look is
    the standard; the Appearance toggle opts OUT. */
export function isFullBleedChatOnly() {
  return resolveFullBleedMode() === 'chat';
}
export function applyFullBleedChatOnly(on) {
  document.documentElement.classList.toggle('fb-chat-only', !!on);
  try { localStorage.setItem(FB_CHAT_ONLY_KEY, on ? '1' : '0'); } catch {}
}

/** Restore the persisted full-bleed surface colours + right-module behaviour
    + chat-only scope onto the document (no popover needed). If a named preset
    is active we replay it so each surface gets its exact preset ink back;
    Default (or a first visit with no colours) applies the contrasting default
    set; otherwise the individual hand-picked backgrounds are restored. */
export function restoreFullBleedSurfaces() {
  const raw = getFullBleedThemeRaw();
  const noColors = !getNavBg() && !getChatBg() && !getRightModuleBg() && !getAsideBg() && !getHistoryBg();
  if (raw === FB_THEME_DEFAULT || (raw === '' && noColors)) {
    applyDefaultFullBleedSurfaces();
  } else if (FB_PRESETS.some((p) => p.id === raw)) {
    applyFullBleedTheme(raw);
  } else {
    applyNavBg(getNavBg());
    applyChatBg(getChatBg());
    applyRightModuleBg(getRightModuleBg());
    applyAsideBg(getAsideBg() || getRightModuleBg());
    applyHistoryBg(getHistoryBg() || getRightModuleBg());
  }
  applyRightModuleMode(getRightModuleMode());
}

/* Composer v2 — the redesigned chat-module input: one pill row with "+" far
   left, the growing text field beside it, and the database selector docked
   bottom-right just left of send. The text field grows upward as you type
   while the controls hold the bottom line. This is now the ONE chat input
   everywhere — it's always on (driven by a permanent `composer-v2` class on
   <html>) and the old input has been retired, so the Appearance popover no
   longer carries a toggle for it. */

/** The new chat input is the default everywhere now — always on. */
export function isComposerV2On() {
  return true;
}

/** Apply the composer-v2 class to <html>. Kept exported for any legacy caller,
    but it now always turns the redesigned input ON. Composers listen for the
    `wise:composer-v2` event to re-sync their grown text field height. */
export function applyComposerV2() {
  document.documentElement.classList.add('composer-v2');
  try {
    document.dispatchEvent(new CustomEvent('wise:composer-v2', { detail: { on: true } }));
  } catch {}
}

/** Force the new chat input on. Runs on every page (see the restore batch). */
export function restoreComposerV2() {
  document.documentElement.classList.add('composer-v2');
}

/* Chat tint — washes every chat module's surface (the card, messages area and
   input rail) with an even lighter step of the brand blue than the composer's
   input fill, so the chat container stands out from the plain page background.
   Admin-only toggle in the Appearance popover; driven by a `chat-tint` class
   on <html>; persisted across navigation. */
const CHAT_TINT_KEY = 'wise-chat-tint';

/** True when the blue chat-surface tint is on. Defaults ON — the tinted chat
    container is the standard look; the Appearance toggle opts OUT. */
export function isChatTintOn() {
  try { return localStorage.getItem(CHAT_TINT_KEY) !== '0'; } catch { return true; }
}

/** Toggle the chat-tint class on <html> and persist it. */
export function applyChatTint(on) {
  document.documentElement.classList.toggle('chat-tint', !!on);
  try { localStorage.setItem(CHAT_TINT_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:chat-tint', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted chat-tint state onto the document. */
export function restoreChatTint() {
  applyChatTint(isChatTintOn());
}

/* Crawl · Walk · Run — the floating rollout-mode switch pinned to the right
   edge of every page (js/cwr-toggle.js). Shown by default (mode: Run); this
   Appearance toggle hides it. Driven by a `cwr-ui-on` class on <html> —
   cwr-toggle.js gates BOTH the widget and the crawl/walk mode CSS on that
   class, so turning this off also suspends any chat-hiding the mode was
   doing (the stored mode is kept for when the switch comes back on). */
const CWR_UI_KEY = 'wise-cwr-ui';

/** True when the floating Crawl · Walk · Run switch is shown. Defaults ON. */
export function isCwrUiOn() {
  try { return localStorage.getItem(CWR_UI_KEY) !== '0'; } catch { return true; }
}

/** Toggle the cwr-ui-on class on <html> and persist it. */
export function applyCwrUi(on) {
  document.documentElement.classList.toggle('cwr-ui-on', !!on);
  try { localStorage.setItem(CWR_UI_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:cwr-ui', { detail: { on: !!on } }));
  } catch {}
}

/* Module spacing — admin-only control for the horizontal gap BETWEEN the modules
   in #modules-row. Four steps (mirroring Text size): Small (12px) / Medium (24px)
   / Large (36px) / XL (48px). Driven by a `mod-gap-<size>` class on <html>;
   wise.css turns that class into an `!important` gap override so it beats each
   page's inline #modules-row { gap } declaration. Persisted across navigation;
   when unset the row keeps its default spacing. Admin-only toggle in the
   Appearance popover (pink-outlined). */
const MODULE_GAP_KEY = 'wise-module-gap';

/** The valid steps and the gap each maps to (px), used by the popover control. */
export const MODULE_GAP_SIZES = ['sm', 'md', 'lg', 'xl'];

/** Current module-spacing step ('sm' | 'md' | 'lg'), or '' when unset (default). */
export function getModuleGap() {
  try {
    const v = localStorage.getItem(MODULE_GAP_KEY);
    return MODULE_GAP_SIZES.indexOf(v) !== -1 ? v : '';
  } catch { return ''; }
}

/** Apply a module-spacing step onto <html> and persist it. Pass '' (or an
    unknown value) to clear back to the default row gap. */
export function applyModuleGap(size) {
  const valid = MODULE_GAP_SIZES.indexOf(size) !== -1;
  const root = document.documentElement;
  MODULE_GAP_SIZES.forEach((s) => root.classList.toggle('mod-gap-' + s, valid && s === size));
  try {
    if (valid) localStorage.setItem(MODULE_GAP_KEY, size);
    else localStorage.removeItem(MODULE_GAP_KEY);
  } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:module-gap', { detail: { size: valid ? size : '' } }));
  } catch {}
}

/** Restore the persisted module-spacing step onto the document (no popover needed). */
export function restoreModuleGap() {
  applyModuleGap(getModuleGap());
}

/* Colorblind-friendly palettes — remap the semantic status colors (success
   green, danger red, warning amber) to a colorblind-safe set so the red↔green
   coding stays distinguishable. There are three cone systems, so there are
   three confusion axes — and those three are the complete set of hue-based
   color-vision deficiencies:
     - Deuteranopia / deuteranomaly (green-blind / green-weak, most common)
         Okabe–Ito bluish-green / vermillion / orange, on the blue–orange axis.
     - Protanopia / protanomaly (red-blind / red-weak)
         Success shifts to BLUE (protans lose red luminance, so a blue "good"
         reads far more clearly) and warning shifts to YELLOW so it does not
         sit on the same orange as vermillion.
     - Tritanopia / tritanomaly (blue-blind / blue-weak, rare)
         Red/green is intact. Warning must NOT be blue-purple (tritans cannot
         see that channel) — Okabe–Ito reddish-purple instead of amber.
   Anomalous trichromacy (the "weak" forms) shares the same confusion axis as
   the matching dichromacy, so one palette per axis covers both. Achromatopsia
   (no hue at all) is not a fourth palette — luminance/contrast (Sharper edges,
   text size) is the right tool there.
   Rather than re-declaring tokens in every page's :root block, we inject ONE
   stylesheet (scoped to `html.colorblind.cb-*` and their `.dark` variants) that
   overrides the shared design tokens — so every page that loads this module
   picks up the same palette. Driven by a `colorblind` class + a `cb-<type>`
   class on <html>; both the on/off state and the chosen type are persisted so
   they survive navigation. */
const COLORBLIND_KEY = 'wise-colorblind';
const COLORBLIND_MODE_KEY = 'wise-colorblind-mode';
const COLORBLIND_STYLE_ID = 'wise-colorblind-style';

/** Supported CVD types — one per cone system. Each palette also serves the
    matching anomaly (deuteranomaly with deuteranopia, etc.) because they share
    a confusion axis. `class` is the modifier added to <html>; `label` is the
    Appearance tooltip; `short` labels the compact segmented button. */
export const COLORBLIND_MODES = [
  { id: 'deuter', class: 'cb-deuter', label: 'Green-weak or green-blind (deuteranomaly / deuteranopia)', short: 'Deut' },
  { id: 'protan', class: 'cb-protan', label: 'Red-weak or red-blind (protanomaly / protanopia)', short: 'Prot' },
  { id: 'tritan', class: 'cb-tritan', label: 'Blue-green / blue-yellow weak or blind (tritanomaly / tritanopia)', short: 'Trit' },
];
const COLORBLIND_CLASSES = COLORBLIND_MODES.map((m) => m.class);
const DEFAULT_COLORBLIND_MODE = 'deuter';

/* The *-text shades are darkened (light mode) / lightened (dark mode) so labels
   keep strong contrast on their translucent tints. Tints and the five-stop
   chart scale follow the remapped semantics so chips and charts cannot leak
   the original green/orange hexes. */
const COLORBLIND_CSS = `
html.colorblind {
  --sec-green-10: color-mix(in srgb, var(--sec-green) 12%, transparent);
  --sec-red-10: color-mix(in srgb, var(--sec-red) 12%, transparent);
  --ter-amber-10: color-mix(in srgb, var(--ter-amber) 14%, transparent);
  --chart-status-excellent: var(--sec-green);
  --chart-status-okay: var(--ter-amber);
  --chart-status-poor: var(--sec-red);
  --chart-status-fair: color-mix(in srgb, var(--ter-amber) 50%, var(--sec-red));
}
html.colorblind.cb-deuter {
  --sec-green: #009E73;
  --sec-red: #D55E00;
  --ter-amber: #E69F00;
  --sec-green-text: #006B4F;
  --sec-red-text: #8A3D00;
  --ter-amber-text: #6B4A00;
  --chart-status-good: #56B4E9;
}
html.colorblind.cb-deuter.dark {
  --sec-green-text: #6FD4B5;
  --sec-red-text: #FFB07A;
  --ter-amber-text: #FFD98A;
}
html.colorblind.cb-protan {
  --sec-green: #0072B2;
  --sec-red: #D55E00;
  --ter-amber: #F0E442;
  --sec-green-text: #004E7A;
  --sec-red-text: #8A3D00;
  --ter-amber-text: #5C4E00;
  --chart-status-good: #56B4E9;
}
html.colorblind.cb-protan.dark {
  --sec-green-text: #7FC4EC;
  --sec-red-text: #FFB07A;
  --ter-amber-text: #FFE9A0;
}
html.colorblind.cb-tritan {
  --sec-green: #1B7F3B;
  --sec-red: #D01C2E;
  --ter-amber: #CC79A7;
  --sec-green-text: #0F5626;
  --sec-red-text: #8E1220;
  --ter-amber-text: #7A3A62;
  --chart-status-good: #6BBF70;
}
html.colorblind.cb-tritan.dark {
  --sec-green-text: #7FD69A;
  --sec-red-text: #FF8A97;
  --ter-amber-text: #F0C4DE;
}
/* The palette overrides above keep semantic status colors distinct, but on a
   given screen those chips may be sparse — so the effect can look invisible.
   To make colorblind mode unmistakable AND genuinely useful, we ALSO run the
   app chrome through a per-type daltonization (color-correction) filter.
   Matrices are grayscale-preserving (each row sums to 1), so text and neutral
   backgrounds are untouched while saturated reds/greens/blues shift apart.

   Applied to the shell wraps — NEVER to <body>. A filter on body creates a
   containing block for position:fixed, which threw the Appearance / user
   popovers (appended to body) off their anchors and could leave the chat
   elevation + opposite-color rim flattened after switching back to the
   proper palette (the filter stuck on body). Shell-scoped filters keep
   viewport-fixed popovers honest, and html:not(.colorblind) force-clears
   any leftover so toggling Accessible colors off always restores. */
html.colorblind.cb-deuter :is(#chat-shell-wrap, #agent-shell-wrap) { filter: url(#wise-cb-deuter); }
html.colorblind.cb-protan :is(#chat-shell-wrap, #agent-shell-wrap) { filter: url(#wise-cb-protan); }
html.colorblind.cb-tritan :is(#chat-shell-wrap, #agent-shell-wrap) { filter: url(#wise-cb-tritan); }
html:not(.colorblind) body,
html:not(.colorblind) :is(#chat-shell-wrap, #agent-shell-wrap) { filter: none; }`;

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

/** Inject (or refresh) the colorblind palette stylesheet. Refreshing the
    textContent means a later toggle always uses the current rules — so
    switching back to the proper palette cannot keep a stale body-filter. */
function ensureColorblindStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(COLORBLIND_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = COLORBLIND_STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  if (style.textContent !== COLORBLIND_CSS) style.textContent = COLORBLIND_CSS;
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

/** Drop every colorblind class and any inline filter a prior pass left on the
    body / shell so the proper palette, shadows and chat rim come back in full. */
function clearColorblindSurfaceFilters() {
  if (typeof document === 'undefined') return;
  const nodes = [
    document.body,
    document.getElementById('chat-shell-wrap'),
    document.getElementById('agent-shell-wrap'),
  ];
  nodes.forEach((el) => {
    if (!el) return;
    el.style.filter = 'none';
    void el.offsetWidth;
    el.style.removeProperty('filter');
  });
}

/** Toggle the colorblind class on <html> and persist it, applying the chosen
    CVD-type palette. Each Appearance popover reads isColorblindOn() /
    getColorblindMode() to render its own state. Turning OFF removes the
    cb-* type classes too — leaving them on after a toggle-off used to keep
    leftover filter/token state from fully reverting to the proper colors. */
export function applyColorblind(on) {
  ensureColorblindStyle();
  ensureColorblindFilters();
  const root = document.documentElement;
  if (on) {
    applyColorblindModeClass(getColorblindMode());
    root.classList.add('colorblind');
  } else {
    root.classList.remove('colorblind');
    COLORBLIND_CLASSES.forEach((cls) => root.classList.remove(cls));
    clearColorblindSurfaceFilters();
  }
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

/* Sharper edges — an accessibility mode that turns every element's boundary
   into a crisp, high-contrast stroke. The base theme draws borders as faint
   translucent brand-blue hairlines (color-mix of --primary/--primary-bright at
   16–30%), which read below the WCAG 1.4.11 non-text-contrast threshold (3:1)
   against their surfaces — so cards, inputs, dividers and controls can blur
   together for low-vision users. This overrides the shared --border /
   --border-strong tokens with OPAQUE slate strokes tuned to clear 3:1 against
   every surface they sit on, in both modes (light: dark-slate edges on the pale
   surfaces; dark: light-slate edges on the navy surfaces). Because it mostly
   sharpens the boundary tokens, fills and text are largely untouched. The one
   fill retouch is the primary navigation container (#menu-panel .menu-inner),
   which additionally gets tighter corners, a thinner hairline border and a
   ~30% lighter surface so the rail reads crisp and light in this mode. Driven
   by a `sharp-edges` class on <html> (paired with `dark` for the dark variant);
   persisted across navigation. Defaults OFF — v2 of the storage key so a
   previously-saved ON does not keep the treatment on. */
const EDGES_KEY = 'wise-sharp-edges-v2';
const EDGES_STYLE_ID = 'wise-sharp-edges-style';

const EDGES_CSS = `
html.sharp-edges {
  --border: #5C6E86;
  --border-strong: #3A4A5E;
}
html.sharp-edges.dark {
  --border: #9DB0C0;
  --border-strong: #C4D2DE;
}

/* Primary navigation crisping. In Sharper edges the nav rail's main container
   (#menu-panel .menu-inner) should read crisper than the soft default: tighter
   corners (near-square instead of the 16px pill), a thinner hairline stroke
   instead of the full 1px edge, and a ~30% lighter surface so the container
   sits lighter against the page. Only the primary-nav container is retouched —
   its inner rows, headers and the rest of the app are untouched. */
html.sharp-edges #menu-panel .menu-inner {
  border-radius: 4px;
  border-width: 0.5px;
  background: linear-gradient(165deg,
    color-mix(in srgb, var(--surface) 70%, #fff) 0%,
    color-mix(in srgb, var(--surface-2) 70%, #fff) 100%);
}
html.sharp-edges.dark #menu-panel .menu-inner {
  border-width: 0.5px;
  background: linear-gradient(155deg,
    color-mix(in srgb, #1A2339 70%, #fff) 0%,
    color-mix(in srgb, #1A2339 70%, #fff) 100%);
}`;

/** Inject the sharp-edges stylesheet once (idempotent). */
function ensureSharpEdgesStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(EDGES_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = EDGES_STYLE_ID;
  style.textContent = EDGES_CSS;
  (document.head || document.documentElement).appendChild(style);
}

/** True when the sharp-edges mode was last left on. Defaults OFF. */
export function isSharpEdgesOn() {
  try { return localStorage.getItem(EDGES_KEY) === '1'; } catch { return false; }
}

/** Toggle the sharp-edges class on <html> and persist it. */
export function applySharpEdges(on) {
  ensureSharpEdgesStyle();
  document.documentElement.classList.toggle('sharp-edges', !!on);
  try { localStorage.setItem(EDGES_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:sharp-edges', { detail: { on: !!on } }));
  } catch {}
}

/** Restore the persisted sharp-edges state onto the document. */
export function restoreSharpEdges() {
  applySharpEdges(isSharpEdgesOn());
}

/* ------------------------------------------------------------------ */
/* Branding style — "Style 1" (inset) and "Style 2" (flush asides).

   A per-app branding treatment chosen from the Appearance popover's "Branding"
   section. Neither style touches the owl bug or WISE wordmark — the brand mark
   stays exactly as drawn (its SVGs paint from currentColor, not the surface
   tokens this treatment retunes).

   Style 1 re-skins WORKING SURFACES: the module panels and chat panes in
   #modules-row, plus the cards, inputs and popovers around them. It retunes
   the shared design tokens (--border / --border-strong and the --shadow-*
   scale) so every surface that already consumes them picks up a crisper
   on-brand hairline and a deeper, softer, layered elevation. Driven by a
   `brand-inset` class on <html>.

   Style 2 leaves those tokens alone and instead drops the outer card stroke
   on every module EXCEPT the chat — History, output panes, Turns, and other
   asides. The chat card keeps its Default rim and elevation, untouched.
   Driven by a `brand-flush` class on <html>.

   Persisted across navigation. Default (no class) keeps the standard surfaces. */
const BRAND_KEY = 'wise-brand-style';
const BRAND_STYLE_ID = 'wise-brand-style-el';

const BRAND_CSS = `
/* ----------------------------------------------------------------------------
   "Style 1" — the inset "stamp" surface treatment.

   The DEFAULT look floats every card ABOVE the page on an outer drop shadow.
   Style 1 flips that completely: surfaces are pressed INTO the page (debossed /
   letterpress "stamp"). The two are meant to read as opposites — no outer
   elevation shadow at all in Style 1, just an inner shadow + a crisp on-brand
   border, so a rounded card looks stamped rather than lifted.

   Two layers, both scoped under html.brand-inset:

   1. TOKEN FLIP. We redefine the shared --shadow-* scale from OUTER drop
      shadows to INNER (inset) shadows, and firm up --border/--border-strong.
      Because virtually every rounded surface in the app already paints with
      box-shadow: var(--shadow-card) (or --shadow-2/1), flipping the token turns
      ALL of them inset at once — including the rounded cards that weren't
      changing before, since they were never named individually.

   2. NAMED OVERRIDE (!important). A few working surfaces hard-code their own
      OUTER box-shadow at a higher specificity than :root (e.g. the dark
      .sc-card, whose 0 4px 56px drop shadow ignored the token entirely), so
      the token flip alone can't reach them. We force those concrete surfaces
      back onto the now-inset token so nothing keeps a leftover default shadow.

   The owl bug + WISE wordmark are never selected here — the brand mark is left
   exactly as drawn.
   ---------------------------------------------------------------------------- */

/* 1 — token flip (light): outer elevation → inner deboss. */
html.brand-inset {
  --border: color-mix(in srgb, var(--primary) 34%, transparent);
  --border-strong: color-mix(in srgb, var(--primary) 52%, transparent);
  --shadow-1:
    inset 0 1px 2px rgba(16, 24, 40, 0.10),
    inset 0 -1px 0 rgba(255, 255, 255, 0.70);
  --shadow-2:
    inset 0 2px 6px -1px rgba(16, 24, 40, 0.16),
    inset 0 1px 1px rgba(16, 24, 40, 0.06),
    inset 0 -1px 0 rgba(255, 255, 255, 0.80);
  --shadow-card: var(--shadow-2);
}
/* 1 — token flip (dark): same deboss, tuned for navy. */
html.brand-inset.dark {
  --border: color-mix(in srgb, var(--primary-bright) 36%, transparent);
  --border-strong: color-mix(in srgb, var(--primary-bright) 54%, transparent);
  --shadow-1:
    inset 0 1px 2px rgba(0, 0, 0, 0.50),
    inset 0 -1px 0 rgba(255, 255, 255, 0.05);
  --shadow-2:
    inset 0 2px 8px -1px rgba(0, 0, 0, 0.55),
    inset 0 1px 2px rgba(0, 0, 0, 0.40),
    inset 0 -1px 0 rgba(255, 255, 255, 0.07);
  --shadow-card: var(--shadow-2);
}

/* 2 — named override: force the surfaces that hard-code an OUTER shadow (so
   they never picked up the token) onto the now-inset token, with a crisp brand
   border. Resolves to the light/dark inset stack automatically via the token.
   !important beats the base per-surface box-shadow/border rules on a tie. */
html.brand-inset #modules-row > *:not(#panels-row):not(#panels-row-right),
html.brand-inset .sc-card,
html.brand-inset .wa-pane,
html.brand-inset .cmp-inner,
html.brand-inset .wise-popover,
html.brand-inset .wise-card {
  border: 1px solid var(--border-strong) !important;
  box-shadow: var(--shadow-card) !important;
}

/* Layout-only rows (#panels-row / #panels-row-right on portfolio +
   comparison) collapse to a 2px sliver when empty. The blanket child
   rule above used to stroke that sliver and draw a stray vertical line
   in the nav↔chat gutter. Keep them chrome-free. */
html.brand-inset #modules-row > :is(#panels-row, #panels-row-right) {
  border: 0 !important;
  box-shadow: none !important;
}

/* Facing stroke across the nav↔content gutter. The nav's right
   hairline sits ~12px from the first module; drop only that nav
   edge. The chat (and every other module) keeps a full Style 1
   border on all four sides — including the left. Rail mode already
   zeros the whole nav border, so the nav rule is a no-op there. */
html.brand-inset #menu-panel .menu-inner {
  border-right-color: transparent !important;
}

/* ----------------------------------------------------------------------------
   "Style 2" — Default surfaces, but every module OTHER THAN the chat sheds
   its outer card stroke (and the drop shadow that reads as an edge).
   The chat hosts listed in :is(...) — including the #wiseai-dock-panel
   aside that IS the chat on overview/account pages — are never selected.
   Overlay History (.wch-sidebar inside the chat) still flushes; it is not
   the chat card. Internal header dividers stay. Wrapper-based output asides
   paint the stroke on an inner .panel-inner / .*-inner — strip that too,
   still never on a chat host.
   ---------------------------------------------------------------------------- */
html.brand-flush #modules-row > :not(:is(
  #panels-row, #panels-row-right,
  .wa-chat, .ap-chat, .rf-chat, .sa-chat, .gs-chat, .aid-chat, .pl-chat, .ar-chat,
  .sc-card, .sticky-chat,
  #wa-chat, #rf-chat, #sa-chat, #aid-chat, #pl-chat, #ar-chat, #gs-chat,
  #chat-shell, #wiseai-dock-panel, #wiseai-panel, #pf-chat-panel
)) {
  border: 0 !important;
  box-shadow: none !important;
}
html.brand-flush #modules-row .wch-sidebar,
html.brand-flush #modules-row .wa-pane,
html.brand-flush #modules-row aside:not(:is(#wiseai-dock-panel, #mkt-chat-rail)),
html.brand-flush .wch-sidebar {
  border: 0 !important;
  box-shadow: none !important;
}
html.brand-flush #modules-row aside:not(:is(#wiseai-dock-panel, #mkt-chat-rail)) > .panel-inner,
html.brand-flush #modules-row aside:not(:is(#wiseai-dock-panel, #mkt-chat-rail)) > [class*="-inner"] {
  border: 0 !important;
  box-shadow: none !important;
}`;

/** Inject the branding-style stylesheet once (idempotent). */
function ensureBrandStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BRAND_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BRAND_STYLE_ID;
  style.textContent = BRAND_CSS;
  (document.head || document.documentElement).appendChild(style);
}

/** The active branding style: '' (default), 'inset' ("Style 1"), or 'flush' ("Style 2"). */
export function getBrandStyle() {
  try {
    const v = localStorage.getItem(BRAND_KEY);
    if (v === 'inset' || v === 'flush') return v;
    return '';
  } catch { return ''; }
}

/** True when the inset ("Style 1") branding treatment is on. */
export function isBrandInsetOn() {
  return getBrandStyle() === 'inset';
}

/** True when the flush ("Style 2") branding treatment is on. */
export function isBrandFlushOn() {
  return getBrandStyle() === 'flush';
}

/** Apply a branding style ('' | 'inset' | 'flush'), toggle classes on <html>, persist. */
export function applyBrandStyle(style) {
  ensureBrandStyle();
  const id = style === 'inset' || style === 'flush' ? style : '';
  document.documentElement.classList.toggle('brand-inset', id === 'inset');
  document.documentElement.classList.toggle('brand-flush', id === 'flush');
  try { localStorage.setItem(BRAND_KEY, id); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:brand-style', { detail: { style: id } }));
  } catch {}
}

/** Restore the persisted branding style onto the document. */
export function restoreBrandStyle() {
  applyBrandStyle(getBrandStyle());
}

/* Admin controls — a master gate shared by the Appearance popover AND the
   chat ⋯ menu's nested Admin popover. When off, every row that carries an
   Admin badge is omitted (Appearance) or hidden (chat ⋯), plus nested chrome
   that belongs to a badged parent (Jam player, Full-bleed colour pickers,
   background-animation sub-controls, Elevation). Everything else stays:
   unbadged rows, the left-nav Admin section, and the live feature state of
   anything that was already on. Defaults ON. */
const ADMIN_UI_KEY = 'wise-admin-ui';

/** True when admin-only Appearance rows should be shown. */
export function isAdminControlsOn() {
  try { return localStorage.getItem(ADMIN_UI_KEY) !== '0'; } catch { return true; }
}

/** Persist whether admin-only Appearance rows are shown. */
export function applyAdminControls(on) {
  try { localStorage.setItem(ADMIN_UI_KEY, on ? '1' : '0'); } catch {}
  try {
    document.dispatchEvent(new CustomEvent('wise:admin-ui', { detail: { on: !!on } }));
  } catch {}
}

/** Restore is a no-op on the document — this flag only affects the popover. */
export function restoreAdminControls() {
  applyAdminControls(isAdminControlsOn());
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
      const btn = e.target?.closest?.('[data-cbtype]');
      if (!btn || btn.closest?.('[data-popover-static]')) return;
      e.stopPropagation();
      e.preventDefault();
      setColorblindMode(btn.dataset.cbtype);
      const group = btn.closest('.fz-btns, .fz-seg, [role="group"]');
      group?.querySelectorAll('[data-cbtype]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('fz-active', on);
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    },
    true
  );
}

if (typeof document !== 'undefined') {
  wireColorblindTypePicker();
  document.addEventListener('wise:app-search', syncSearchFloatedFooter);
  document.addEventListener('wise:menu-pivot', syncSearchFloatedFooter);
  window.addEventListener('resize', syncSearchFloatedFooter);
  document.addEventListener('DOMContentLoaded', () => {
    restoreMinimalUi();
    restoreHeaderFloat();
    restoreFullBleed();
    restoreFullBleedSurfaces();
    restoreComposerV2();
    restoreChatTint();
    restoreModuleGap();
    restoreColorblind();
    restoreSharpEdges();
    restoreBrandStyle();
    restoreAdminControls();
    const inner = document.querySelector('#menu-panel .menu-inner');
    if (!inner) return;
    const footer = findMenuFooter();
    if (!footer || !footer.querySelector('.menu-nav-item')) mountMenuFooter();
    else {
      wireMenuFooter();
      syncSearchFloatedFooter();
    }
  });
}
