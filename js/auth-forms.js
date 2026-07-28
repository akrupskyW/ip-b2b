/* =============================================================
   WISE — standard auth form controllers

   Wires the plain form panels (login.html, create-account.html,
   forgot-password.html) to the shared WiseAuth session API.
   No backend: submitting a valid form opens a local session and
   redirects to the landing page, faithful to the ip2 prototype.

   Exposes window.WiseAuthForms { initLogin, initForgot, initSignup }.
============================================================= */
(function () {
  'use strict';

  var Auth = window.WiseAuth;

  /* ── helpers ── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var digits = function (v) { return String(v == null ? '' : v).replace(/\D/g, ''); };
  var validEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()); };

  function landing() { return (Auth && Auth.landingUrl && Auth.landingUrl()) || 'ai-chat-3.html'; }
  function goLanding() { window.location.href = landing(); }

  /* If already signed in, don't sit on an auth page. */
  function bounceIfAuthed() {
    if (Auth && Auth.isAuthed && Auth.isAuthed()) { window.location.replace(landing()); return true; }
    return false;
  }

  function setError(el, msg) {
    if (!el) return;
    if (msg) { el.textContent = msg; el.hidden = false; }
    else { el.textContent = ''; el.hidden = true; }
  }
  function markInvalid(input, on) {
    if (input) input.classList.toggle('is-invalid', !!on);
  }

  function wirePasswordToggles(root) {
    $all('[data-toggle-pw]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.parentElement.querySelector('input');
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        var ic = btn.querySelector('.material-icons');
        if (ic) ic.textContent = show ? 'visibility_off' : 'visibility';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    });
  }

  function maskPhone(v) {
    var d = digits(v).slice(0, 10);
    if (d.length > 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    if (d.length > 3) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    if (d.length > 0) return '(' + d;
    return v;
  }
  function maskEin(v) { var d = digits(v).slice(0, 9); return d.length > 2 ? d.slice(0, 2) + '-' + d.slice(2) : d; }

  /* ── Sign in ── */
  function initLogin() {
    if (bounceIfAuthed()) return;
    var form = $('#login-form');
    if (!form) return;
    wirePasswordToggles(form);
    var email = $('#email', form);
    var pw = $('#password', form);
    var err = $('#login-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setError(err, '');
      markInvalid(email, false); markInvalid(pw, false);
      if (!validEmail(email.value)) { markInvalid(email, true); setError(err, 'Enter a valid email address.'); email.focus(); return; }
      if (!pw.value) { markInvalid(pw, true); setError(err, 'Enter your password.'); pw.focus(); return; }
      Auth.login({ email: email.value.trim() });
      goLanding();
    });

    var demo = $('#demo-btn');
    if (demo) demo.addEventListener('click', function () {
      Auth.login({ email: (Auth && Auth.DEMO_EMAIL) || 'demo@wisealliance.com', name: 'Demo User' });
      goLanding();
    });

    /* SSO buttons — prototype: open a session under the provider identity. */
    $all('[data-sso]', form.closest('.auth-card') || document).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var provider = btn.getAttribute('data-sso') || 'SSO';
        Auth.login({ email: email.value.trim() || 'user@' + provider.toLowerCase() + '.com', name: provider + ' User' });
        goLanding();
      });
    });
  }

  /* ── Forgot password ── */
  function initForgot() {
    if (bounceIfAuthed()) return;
    var form = $('#forgot-form');
    if (!form) return;
    var email = $('#email', form);
    var err = $('#forgot-error');
    var ok = $('#forgot-success');
    var submitBtn = $('#forgot-submit', form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setError(err, ''); markInvalid(email, false);
      if (!validEmail(email.value)) { markInvalid(email, true); setError(err, 'Enter a valid email address.'); email.focus(); return; }
      if (ok) {
        ok.querySelector('.auth-banner-text').innerHTML =
          'If an account exists for <strong>' + email.value.trim().replace(/[<>&]/g, '') +
          '</strong>, reset instructions are on the way. Check your inbox and spam folder.';
        ok.hidden = false;
      }
      form.hidden = true;
      if (submitBtn) submitBtn.disabled = true;
    });
  }

  /* ── Create account (multi-step) ── */
  function initSignup() {
    if (bounceIfAuthed()) return;
    var form = $('#signup-form');
    if (!form) return;
    wirePasswordToggles(form);

    var panels = $all('.auth-panel', form);
    var dots = $all('.auth-step-dot');
    var current = 0;

    /* live input masks */
    var phone = $('#phone', form);
    if (phone) phone.addEventListener('input', function () { phone.value = maskPhone(phone.value); });
    var ein = $('#ein', form);
    if (ein) ein.addEventListener('input', function () { ein.value = maskEin(ein.value); });
    var zip = $('#zip', form);
    if (zip) zip.addEventListener('input', function () { zip.value = digits(zip.value).slice(0, 5); });

    /* OTP: auto-advance across boxes */
    var otpInputs = $all('.auth-otp input', form);
    otpInputs.forEach(function (box, i) {
      box.addEventListener('input', function () {
        box.value = digits(box.value).slice(0, 1);
        if (box.value && otpInputs[i + 1]) otpInputs[i + 1].focus();
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && otpInputs[i - 1]) otpInputs[i - 1].focus();
      });
    });

    function showStep(n) {
      current = Math.max(0, Math.min(panels.length - 1, n));
      panels.forEach(function (p, i) { p.classList.toggle('is-active', i === current); });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === current);
        d.classList.toggle('is-done', i < current);
      });
      var firstField = panels[current].querySelector('input, select, textarea');
      if (firstField) setTimeout(function () { firstField.focus(); }, 40);
      form.scrollIntoView({ block: 'nearest' });
    }

    /* Validate every required field in the active panel. */
    function validateStep() {
      var panel = panels[current];
      var ok = true;
      var firstBad = null;
      $all('[data-required]', panel).forEach(function (field) {
        var val = (field.value || '').trim();
        var bad = false;
        if (!val) bad = true;
        else if (field.type === 'email' && !validEmail(val)) bad = true;
        else if (field.id === 'phone' && digits(val).length < 10) bad = true;
        else if (field.id === 'zip' && digits(val).length !== 5) bad = true;
        else if (field.id === 'ein' && !/^\d{2}-?\d{7}$/.test(val)) bad = true;
        markInvalid(field, bad);
        if (bad) { ok = false; if (!firstBad) firstBad = field; }
      });
      /* attestation checkbox on step 1 */
      var attest = panel.querySelector('#attest');
      if (attest && !attest.checked) { ok = false; if (!firstBad) firstBad = attest; }
      if (firstBad) firstBad.focus();
      return ok;
    }

    $all('[data-next]', form).forEach(function (btn) {
      btn.addEventListener('click', function () { if (validateStep()) showStep(current + 1); });
    });
    $all('[data-prev]', form).forEach(function (btn) {
      btn.addEventListener('click', function () { showStep(current - 1); });
    });

    var resend = $('#otp-resend', form);
    if (resend) resend.addEventListener('click', function (e) {
      e.preventDefault();
      resend.textContent = 'Code sent';
      setTimeout(function () { resend.textContent = 'Resend code'; }, 2500);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep()) return;
      var otp = otpInputs.map(function (b) { return b.value; }).join('');
      var otpErr = $('#otp-error');
      if (otpInputs.length && digits(otp).length !== otpInputs.length) {
        setError(otpErr, 'Enter the ' + otpInputs.length + '-digit verification code.');
        return;
      }
      setError(otpErr, '');

      var val = function (id) { var el = $('#' + id, form); return el ? el.value.trim() : ''; };
      var reg = {
        name: val('name'), title: val('title'), email: val('email'), phone: val('phone'),
        brands: val('brand').split(',').map(function (s) { return { name: s.trim() }; }).filter(function (b) { return b.name; }),
        attestSig: val('sig'), attestedAt: new Date().toISOString(),
        orgname: val('orgname'), website: val('website'), addr1: val('addr1'),
        city: val('city'), state: val('state'), zip: val('zip'),
        entitytype: val('entitytype'), ein: val('ein'), sidType: 'duns', sidValue: val('sid')
      };
      Auth.signup(reg);
      goLanding();
    });

    showStep(0);
  }

  window.WiseAuthForms = { initLogin: initLogin, initForgot: initForgot, initSignup: initSignup };
})();
