/* =============================================================
   WISE — auth guard (drop-in, head-loaded)

   Self-contained so it can run in <head> before the rest of the
   page paints. Redirects unauthenticated visitors to the sign-in
   screen. Auth pages (login / create-account / forgot-password)
   are exempt. Kept in sync with js/auth.js (`wise-auth` key).
============================================================= */
(function () {
  'use strict';
  try {
    var page = (location.pathname.split('/').pop() || '').toLowerCase();
    var authPages = ['login.html', 'create-account.html', 'forgot-password.html'];
    if (authPages.indexOf(page) !== -1) return;

    var ok = false;
    var raw = localStorage.getItem('wise-auth');
    if (raw) {
      try { var u = JSON.parse(raw); ok = !!(u && u.loggedIn); } catch (e) {}
    }
    if (!ok) {
      var loginUrl = location.pathname.indexOf('/pages/') !== -1 ? 'login.html' : 'pages/login.html';
      location.replace(loginUrl);
    }
  } catch (e) { /* never block rendering on guard errors */ }
})();
