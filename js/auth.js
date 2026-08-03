/* =============================================================
   WISE — shared auth module (prototype)

   Ported from the WISE_ip2 sign-in / create-account / sign-out UX
   (content + steps only — this project supplies its own UI).

   There is no backend: "auth" is a session record kept in
   localStorage under `wise-auth`. Sign-in accepts the demo
   credentials or any created account (faithful to the ip2
   prototype, which never validated against a server), while still
   requiring the fields to be filled so the flow feels real.

   Registration data mirrors ip2's `wc_registration` shape so the
   two prototypes stay content-compatible.
============================================================= */
(function () {
  'use strict';

  var AUTH_KEY = 'wise-auth';
  var REG_KEY  = 'wc_registration';
  /* After sign-in / sign-up the user lands here (per project request). */
  var LANDING  = 'product-comparison.html';
  /* "Dive right into the product" during signup lands on the workspace overview. */
  var OVERVIEW = 'overview.html';
  /* Public marketing home for logged-out visitors (lives at the repo root). */
  var HOME     = 'index.html';
  var AUTH_PAGES = ['login.html', 'create-account.html', 'forgot-password.html'];
  var DEMO_EMAIL = 'demo@wisealliance.com';

  function safeGet(k)    { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function safeRemove(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function initialsFrom(name, email) {
    var src = (name || '').trim();
    if (src) {
      var parts = src.split(/\s+/).filter(Boolean);
      var a = parts[0] ? parts[0][0] : '';
      var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
      return (a + b).toUpperCase() || src.slice(0, 2).toUpperCase();
    }
    var e = (email || '').trim();
    return e ? e.slice(0, 2).toUpperCase() : 'WU';
  }

  function getUser() {
    var raw = safeGet(AUTH_KEY);
    if (!raw) return null;
    try {
      var u = JSON.parse(raw);
      return (u && u.loggedIn) ? u : null;
    } catch (e) { return null; }
  }

  function isAuthed() { return !!getUser(); }

  function setSession(user) {
    user = user || {};
    var name  = user.name || '';
    var email = user.email || '';
    var rec = {
      loggedIn: true,
      name:     name || email || 'WISE User',
      email:    email,
      title:    user.title || 'Product Intelligence Lead',
      org:      user.org || 'WISE Foods',
      initials: initialsFrom(name, email),
      at:       new Date().toISOString()
    };
    safeSet(AUTH_KEY, JSON.stringify(rec));
    return rec;
  }

  /* Sign in. Prototype behaviour: no server check. If the email matches a
     previously created account we reuse its name; the demo email gets a
     friendly name; otherwise we derive identity from the email entered. */
  function login(opts) {
    opts = opts || {};
    var email = opts.email || '';
    var name  = opts.name || '';
    if (!name) {
      try {
        var reg = JSON.parse(safeGet(REG_KEY) || 'null');
        if (reg && reg.email && email && reg.email.toLowerCase() === email.toLowerCase()) {
          name = reg.name || '';
        }
      } catch (e) {}
    }
    if (!name && email && email.toLowerCase() === DEMO_EMAIL) name = 'Demo User';
    return setSession({ email: email, name: name });
  }

  /* Complete account creation — persist the registration payload
     (ip2-compatible `wc_registration`) and open a session. */
  function signup(reg) {
    if (reg) safeSet(REG_KEY, JSON.stringify(reg));
    return setSession({
      name:  reg && reg.name,
      email: reg && reg.email,
      title: reg && reg.title,
      org:   reg && reg.orgname
    });
  }

  function logout() { safeRemove(AUTH_KEY); }

  function inPages() { return location.pathname.indexOf('/pages/') !== -1; }

  function currentPage() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }

  function isAuthPage() { return AUTH_PAGES.indexOf(currentPage()) !== -1; }

  function loginUrl()    { return inPages() ? 'login.html'  : 'pages/login.html'; }
  function landingUrl()  { return inPages() ? LANDING       : 'pages/' + LANDING; }
  function overviewUrl() { return inPages() ? OVERVIEW      : 'pages/' + OVERVIEW; }
  /* Marketing home lives at the repo root, so pages under /pages/ step up. */
  function homeUrl()     { return inPages() ? '../' + HOME  : HOME; }

  /* Where the WISE logo/wordmark should point from anywhere: signed-in users go
     to their workspace overview, signed-out visitors to the marketing home. */
  function brandHomeUrl() { return isAuthed() ? overviewUrl() : homeUrl(); }

  /* Guard: send unauthenticated users to the sign-in screen. Auth pages
     themselves are always allowed. Returns true when the page may render. */
  function requireAuth() {
    if (isAuthPage()) return true;
    if (!isAuthed()) { location.replace(loginUrl()); return false; }
    return true;
  }

  window.WiseAuth = {
    AUTH_KEY: AUTH_KEY,
    REG_KEY: REG_KEY,
    LANDING: LANDING,
    OVERVIEW: OVERVIEW,
    HOME: HOME,
    DEMO_EMAIL: DEMO_EMAIL,
    getUser: getUser,
    isAuthed: isAuthed,
    login: login,
    signup: signup,
    logout: logout,
    requireAuth: requireAuth,
    isAuthPage: isAuthPage,
    loginUrl: loginUrl,
    landingUrl: landingUrl,
    overviewUrl: overviewUrl,
    homeUrl: homeUrl,
    brandHomeUrl: brandHomeUrl,
    initialsFrom: initialsFrom
  };
})();
