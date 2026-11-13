/* Pubgolf: meten met toestemming (naar het voorbeeld van de Forkit-site, met eigen ID's).
   - Cookiebanner (vanilla-cookieconsent, MIT, in /assets/vendor/cookieconsent): "Accepteren" en "Weigeren" even groot.
   - GA4 en Microsoft Clarity laden pas NA "Accepteren"; daarvoor geen cookies en geen verzoeken naar Google/Microsoft.
   - Alleen op pubgolf.eu, nooit lokaal of in een test; ?notrack=1 zet het meten op dit apparaat uit (?notrack=0 weer aan).
   - Nooit persoonsgegevens (namen, e-mail, codes) naar GA4 of Clarity: alleen stad, plek van de knop en soort boeking.
   - UTM-parameters (utm_source/medium/campaign) worden zonder cookies voor deze sessie bewaard en met een boeking meegestuurd.
   Zonder ID's (hieronder leeg) doet dit bestand alleen het UTM-deel: geen banner, geen meting. */
(function () {
  'use strict';
  var CFG = {
    ga4: '',        // GA4 Measurement ID, bijv. 'G-XXXXXXX' (eigen property "Pubgolf", niet die van Forkit)
    clarity: '',    // Microsoft Clarity Project ID (eigen project "Pubgolf")
    hosts: ['pubgolf.eu', 'www.pubgolf.eu']
  };
  var en = document.documentElement.lang === 'en';

  /* ---------- UTM: bewaren voor deze sessie (functioneel, geen cookie) ---------- */
  try {
    var q = new URLSearchParams(location.search), u = {};
    ['source', 'medium', 'campaign'].forEach(function (k) { var v = q.get('utm_' + k); if (v) u[k] = v.slice(0, 80); });
    if (u.source) sessionStorage.setItem('pg_utm', JSON.stringify(u));
    else if (!sessionStorage.getItem('pg_utm') && document.referrer && document.referrer.indexOf(location.host) < 0) {
      sessionStorage.setItem('pg_utm', JSON.stringify({ source: new URL(document.referrer).hostname.replace(/^www\./, ''), medium: 'referral' }));
    }
  } catch (e) {}

  /* ---------- eigenaar uitzetten: ?notrack=1 ---------- */
  function optedOut() { try { return localStorage.getItem('pg_notrack') === '1'; } catch (e) { return false; } }
  try { var nt = new URLSearchParams(location.search).get('notrack'); if (nt === '1') localStorage.setItem('pg_notrack', '1'); if (nt === '0') localStorage.removeItem('pg_notrack'); } catch (e) {}

  var live = CFG.hosts.indexOf(location.hostname) >= 0 || /[?&]forcecc=1\b/.test(location.search);
  var on = live && !optedOut() && !!(CFG.ga4 || CFG.clarity);

  /* ---------- één plek voor alle events: window.pgTrack(naam, {params}) ---------- */
  window.pgTrack = function (name, params) {
    try {
      if (!on || typeof window.gtag !== 'function' || !window.CookieConsent || !window.CookieConsent.acceptedCategory('analytics')) return;
      window.gtag('event', name, params || {});
    } catch (e) {}
  };
  if (live && optedOut()) document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div'); b.textContent = 'Tracking uit';
    b.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:9999;background:#111;color:#fff;font:700 11px Arial;padding:6px 10px;border-radius:99px;opacity:.8;pointer-events:none';
    document.body.appendChild(b);
  });
  if (!on) return;

  /* ---------- Consent Mode v2: standaard alles geweigerd ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });

  var gaOn = false, clOn = false;
  function loadGA() {
    if (gaOn || !CFG.ga4) return; gaOn = true;
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.ga4; document.head.appendChild(s);
    window.gtag('js', new Date()); window.gtag('config', CFG.ga4, { anonymize_ip: true });
  }
  function loadClarity() {
    if (clOn || !CFG.clarity) return; clOn = true;
    (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, 'clarity', 'script', CFG.clarity);
  }
  function eraseCookies() {
    document.cookie.split(/;\s*/).forEach(function (c) {
      var n = c.split('=')[0];
      if (/^_ga|^_gid$|^_clck$|^_clsk$/.test(n)) ['', '; domain=' + location.hostname, '; domain=.' + location.hostname.replace(/^www\./, '')].forEach(function (d) { document.cookie = n + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT' + d; });
    });
  }
  function apply() {
    var ok = false; try { ok = window.CookieConsent.acceptedCategory('analytics'); } catch (e) {}
    if (ok) {
      window.gtag('consent', 'update', { analytics_storage: 'granted' }); loadGA(); loadClarity();
      if (window.clarity) window.clarity('consent', true);
      firstEvents();
    } else {
      window.gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
      if (window.clarity) window.clarity('consent', false);
      eraseCookies();
    }
  }

  /* ---------- events die vanzelf gaan ---------- */
  var cityPage = (location.pathname.match(/^\/(?:steden|en\/cities)\/([a-z-]+)\/?$/) || [])[1] || '';
  var fired = false;
  function firstEvents() { if (fired) return; fired = true; if (cityPage) window.pgTrack('city_view', { city: cityPage }); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button'); if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/#boek$/.test(href)) window.pgTrack('book_click', { city: cityPage || 'home', location: a.closest('header') ? 'header' : 'page' });
    else if (/^https:\/\/wa\.me\//.test(href) || a.id === 'wa') window.pgTrack('share_whatsapp', { page: location.pathname });
    else if (a.hasAttribute('data-book')) window.pgTrack('book_submit', { city: cityPage });
    else if (/\/steden\/[a-z-]+\/$|\/en\/cities\/[a-z-]+\/$/.test(href)) window.pgTrack('city_click', { to: href.split('/').filter(String).pop(), from: location.pathname });
  }, true);
  var started = false;
  document.addEventListener('focusin', function (e) {
    if (started || !e.target.closest || !e.target.closest('#boek form')) return;
    started = true; window.pgTrack('form_start', { city: cityPage });
  });
  document.addEventListener('play', function (e) { if (e.target.tagName === 'VIDEO') window.pgTrack('video_play', { city: cityPage || 'home' }); }, true);

  /* ---------- de banner ---------- */
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/assets/vendor/cookieconsent/cookieconsent.css'; document.head.appendChild(css);
  var js = document.createElement('script'); js.src = '/assets/vendor/cookieconsent/cookieconsent.umd.js';
  js.onload = function () {
    var priv = '/privacy.html' + (en ? '#en' : '');
    window.CookieConsent.run({
      guiOptions: { consentModal: { layout: 'box', position: 'bottom left', equalWeightButtons: true }, preferencesModal: { layout: 'box', equalWeightButtons: true } },
      categories: { necessary: { readOnly: true }, analytics: { autoClear: { cookies: [{ name: /^_ga/ }, { name: '_gid' }, { name: /^_clck/ }, { name: /^_clsk/ }] } } },
      language: { default: en ? 'en' : 'nl', translations: {
        nl: { consentModal: { title: 'Mogen we meten?', description: 'Met jouw toestemming zien we hoe bezoekers de site gebruiken (Google Analytics en Microsoft Clarity), zodat we hem beter maken. Zonder toestemming meten we niets.',
              acceptAllBtn: 'Accepteren', acceptNecessaryBtn: 'Weigeren', showPreferencesBtn: 'Instellingen', footer: '<a href="' + priv + '">Privacy en cookies</a>' },
          preferencesModal: { title: 'Cookie-instellingen', acceptAllBtn: 'Alles accepteren', acceptNecessaryBtn: 'Alles weigeren', savePreferencesBtn: 'Opslaan', closeIconLabel: 'Sluiten',
            sections: [{ title: 'Noodzakelijk', description: 'Nodig om de site en het spel te laten werken. Altijd aan.', linkedCategory: 'necessary' },
              { title: 'Statistieken', description: 'Hoe bezoekers de site gebruiken (Google Analytics, Microsoft Clarity). Standaard uit. Namen, e-mailadressen en spelcodes gaan nooit naar deze diensten.', linkedCategory: 'analytics' }] } },
        en: { consentModal: { title: 'Can we measure?', description: 'With your consent we see how visitors use the site (Google Analytics and Microsoft Clarity), so we can improve it. Without consent we measure nothing.',
              acceptAllBtn: 'Accept', acceptNecessaryBtn: 'Reject', showPreferencesBtn: 'Preferences', footer: '<a href="' + priv + '">Privacy and cookies</a>' },
          preferencesModal: { title: 'Cookie preferences', acceptAllBtn: 'Accept all', acceptNecessaryBtn: 'Reject all', savePreferencesBtn: 'Save', closeIconLabel: 'Close',
            sections: [{ title: 'Necessary', description: 'Needed for the site and the game to work. Always on.', linkedCategory: 'necessary' },
              { title: 'Statistics', description: 'How visitors use the site (Google Analytics, Microsoft Clarity). Off by default. Names, email addresses and game codes are never sent to these services.', linkedCategory: 'analytics' }] } } } },
      onFirstConsent: apply, onConsent: apply, onChange: apply
    });
  };
  document.head.appendChild(js);
})();
