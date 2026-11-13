// Nieuwsbrief "Nieuwe stad erbij?": een kleine melding onderin het scherm + window.PCNews.subscribe() voor het boekformulier.
// ACTION: het adres van het aanmeldformulier van Brevo (gratis, EU, met dubbele bevestiging en afmeldlink), bijv.
//   'https://xxxx.sibforms.com/serve/MUIF...'. Leeg = aanmelding gaat als e-mail naar bookings@forkit.nl (werkt meteen, minder soepel).
(function () {
  var ACTION = 'https://4b4d329e.sibforms.com/serve/MUIFAPePlXGLkgRtyg9Ex3j7nHwQfN8Cx-nsFENf1eoRzaLZDXoiptjTLzNii0L6m-mqSIZKElxP77_shHTXldv-RBoJrmK8UhTc_ch2hfy6zLApzlRfGbAHGt9NSAXgOvkYCRScSfYZlqAg9Wk8MT7DvtJLUN6kdB3u52ugETZVHjM9bTrSqAYTudgjJZ0_UXSoJt7FCa52jk9yMA==';
  // CUSTOMER_ACTION: a second Brevo form for customers (no confirmation mail needed: they booked and were told). Empty = ACTION.
  var CUSTOMER_ACTION = '';
  var FALLBACK = 'bookings@forkit.nl';
  var KEY = 'pubgolf-news', DAY = 864e5;
  var en = document.documentElement.lang === 'en';
  var T = en ? {
    kick: 'NEW CITIES', title: 'Be the first to know', text: 'Get an email when a new Pubgolf city goes live. Now and then, never spam, unsubscribe any time.',
    ph: 'name@example.com', adult: 'I am 18 or older', btn: 'Keep me posted', close: 'Close',
    bad: 'Enter a valid email address.', noadult: 'Our newsletter is for 18+ only.', ok: 'Done! You are on the list. We will email you when a new city goes live.',
    okMail: 'Your mail app opens with the sign-up. Send it and you are on the list.', priv: 'Privacy', err: 'That did not work. Try again later.'
  } : {
    kick: 'NIEUWE STEDEN', title: 'Als eerste weten?', text: 'Krijg een mail als er een nieuwe Pubgolf-stad online staat. Af en toe, nooit spam, altijd af te melden.',
    ph: 'naam@voorbeeld.nl', adult: 'Ik ben 18 jaar of ouder', btn: 'Houd me op de hoogte', close: 'Sluiten',
    bad: 'Vul een geldig e-mailadres in.', noadult: 'Onze nieuwsbrief is alleen voor 18+.', ok: 'Gelukt! Je staat op de lijst. We mailen je als er een nieuwe stad online staat.',
    okMail: 'Je mailprogramma opent met de aanmelding. Verstuur hem, dan sta je op de lijst.', priv: 'Privacy', err: 'Dat lukte niet. Probeer het later opnieuw.'
  };
  function get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function put(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function valid(e) { return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i.test(e); }

  // sign up one address; resolves to 'ok' (Brevo) or 'mail' (mail app opened)
  async function subscribe(email, source, customer) {
    email = String(email || '').trim();
    if (!valid(email)) throw new Error('email');
    var action = customer && CUSTOMER_ACTION ? CUSTOMER_ACTION : ACTION;
    if (action) {
      var f = new FormData();
      f.append('EMAIL', email); f.append('OPT_IN', '1'); f.append('email_address_check', ''); f.append('locale', en ? 'en' : 'nl');
      await fetch(action, { method: 'POST', mode: 'no-cors', body: f });   // Brevo sends the confirmation mail itself
      if (window.pgTrack) window.pgTrack(customer ? 'newsletter_customer' : 'newsletter_signup', { page: location.pathname });
      if (!customer) put({ done: Date.now() }); return 'ok';
    }
    var body = (en ? 'Please keep me posted about new Pubgolf cities.' : 'Houd me op de hoogte van nieuwe Pubgolf-steden.') + '\r\n\r\n' +
      (en ? 'Email: ' : 'E-mail: ') + email + '\r\n' + (en ? 'Language: English' : 'Taal: Nederlands') + '\r\n' + (en ? 'I am 18 or older.' : 'Ik ben 18 jaar of ouder.') + (source ? '\r\nVia: ' + source : '');
    location.href = 'mailto:' + FALLBACK + '?subject=' + encodeURIComponent(en ? 'Newsletter sign-up' : 'Aanmelden nieuwsbrief') + '&body=' + encodeURIComponent(body);
    put({ done: Date.now() }); return 'mail';
  }
  window.PCNews = { subscribe: subscribe, live: !!ACTION };

  // the prompt: not on the thank-you page (it has its own block), not after signing up, not within 30 days of closing it
  // the prompt: after a few seconds; not again after signing up, and after closing only again a week later.
  // The footer link "Nieuwsbrief" always opens it; ?nieuwsbrief in the address forces it (for testing).
  var st = get(), force = /[?&]nieuwsbrief\b/.test(location.search);
  var auto = force || !(document.body.hasAttribute('data-nonews') || st.done || (st.closed && Date.now() - st.closed < 7 * DAY));

  var css = document.createElement('style');
  css.textContent = '.pgn{position:fixed;z-index:9999;right:16px;bottom:16px;width:min(380px,calc(100vw - 32px));box-sizing:border-box;background:#FFFFFF;color:#111111;border-radius:16px;' +
    'box-shadow:0 12px 40px rgba(0,0,0,.35);padding:20px 20px 16px;font-family:Archivo,Arial,sans-serif;transform:translateY(140%);transition:transform .45s ease;text-align:left}' +
    '.pgn.on{transform:none}.pgn *{box-sizing:border-box}.pgn .k{font-size:12px;font-weight:800;letter-spacing:.2em;color:#B5121B}' +
    '.pgn h3{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:28px;line-height:1.05;margin:6px 0 6px;text-transform:uppercase;color:#111111}' +
    '.pgn p{font-size:15px;line-height:1.45;margin:0 0 12px;color:#111111}.pgn input[type=email]{width:100%;min-height:48px;border:2px solid #111111;border-radius:10px;padding:0 14px;font-size:16px;color:#111111;background:#FFFFFF}' +
    '.pgn label{display:flex;gap:10px;align-items:center;font-size:15px;margin:10px 0;min-height:32px;cursor:pointer;color:#111111}.pgn label input{width:20px;height:20px;margin:0}' +
    '.pgn button.go{width:100%;min-height:50px;border:0;border-radius:999px;background:#B5121B;color:#FFFFFF;font-family:Anton,Impact,sans-serif;font-size:19px;cursor:pointer}' +
    '.pgn .x{position:absolute;top:6px;right:6px;width:44px;height:44px;border:0;background:none;font-size:26px;line-height:1;color:#111111;cursor:pointer}' +
    '.pgn .m{min-height:0;margin:8px 0 0;font-size:14px}.pgn .s{font-size:12px;color:#444444;margin:8px 0 0}.pgn .s a{color:#444444}' +
    '@media (max-width:480px){.pgn{right:16px;left:16px;width:auto;bottom:12px}}';
  document.head.appendChild(css);
  var box = document.createElement('aside');
  box.className = 'pgn'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', T.title);
  box.innerHTML = '<button class="x" type="button" aria-label="' + T.close + '">×</button><div class="k">' + T.kick + '</div><h3>' + T.title + '</h3><p>' + T.text + '</p>' +
    '<form novalidate><input type="email" autocomplete="email" inputmode="email" maxlength="200" required placeholder="' + T.ph + '" aria-label="E-mail">' +
    '<label><input type="checkbox" required>' + T.adult + '</label><button class="go" type="submit">' + T.btn + '</button><p class="m" role="status"></p></form>' +
    '<p class="s"><a href="/privacy.html' + (en ? '#en' : '') + '">' + T.priv + '</a> · Pubgolf · ForkitLeiden</p>';
  var shown = false;
  function show() {
    if (shown) return;
    if (document.documentElement.classList.contains('show--consent')) { setTimeout(show, 3000); return; }   // first the cookie banner
    shown = true; box.classList.remove('on'); document.body.appendChild(box); requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('on'); }); }); }
  box.querySelector('.x').onclick = function () { box.classList.remove('on'); var v = get(); v.closed = Date.now(); put(v); setTimeout(function () { box.remove(); shown = false; }, 500); };
  box.querySelector('form').onsubmit = async function (ev) {
    ev.preventDefault();
    var m = box.querySelector('.m'), em = box.querySelector('input[type=email]').value, ad = box.querySelector('input[type=checkbox]').checked;
    if (!valid(em.trim())) { m.textContent = T.bad; return; }
    if (!ad) { m.textContent = T.noadult; return; }
    try { var r = await subscribe(em, location.pathname); m.textContent = r === 'ok' ? T.ok : T.okMail; box.querySelector('.go').disabled = true; setTimeout(function () { box.classList.remove('on'); }, 5000); }
    catch (e) { m.textContent = T.err; }
  };
  window.PCNews.open = show;
  // a fixed sign-up block at the bottom of every page (above the footer line), plus a "Nieuwsbrief" link in that line
  var mails = document.querySelectorAll('a[href^="mailto:bookings@forkit.nl"]'), last = mails[mails.length - 1];
  var row = last && last.closest('footer > div, div[style*="border-top"]');
  if (last) {
    var a = document.createElement('a'); a.href = '#nieuwsbrief'; a.textContent = en ? 'Newsletter' : 'Nieuwsbrief';
    a.style.cssText = 'color:inherit;display:inline-block;padding:14px 2px';
    a.onclick = function (e) { e.preventDefault(); var f = document.getElementById('pgnews'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); else show(); };
    last.parentNode.insertBefore(a, last); last.parentNode.insertBefore(document.createTextNode(' · '), last);
  }
  if (row && !document.body.hasAttribute('data-nonews')) {
    var blk = document.createElement('section');
    blk.id = 'pgnews'; blk.className = 'pgn-inline';
    blk.style.cssText = 'background:#FFFFFF;color:#111111;border:2px solid #111111;border-radius:16px;padding:24px;margin:40px 0 0;max-width:640px;box-sizing:border-box;font-family:Archivo,Arial,sans-serif;text-align:left';
    blk.innerHTML = '<div style="font-size:12px;font-weight:800;letter-spacing:.2em;color:#B5121B">' + T.kick + '</div>' +
      '<h3 style="font-family:Anton,Impact,sans-serif;font-weight:400;font-size:30px;line-height:1.05;margin:6px 0 6px;text-transform:uppercase;color:#111111">' + T.title + '</h3>' +
      '<p style="font-size:15px;line-height:1.45;margin:0 0 12px;color:#111111">' + T.text + '</p>' +
      '<form novalidate style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><input type="email" autocomplete="email" inputmode="email" maxlength="200" placeholder="' + T.ph + '" aria-label="E-mail" ' +
      'style="flex:1 1 240px;min-width:0;min-height:48px;border:2px solid #111111;border-radius:10px;padding:0 14px;font-size:16px;color:#111111;background:#FFFFFF;box-sizing:border-box">' +
      '<button type="submit" style="flex:0 0 auto;min-height:48px;border:0;border-radius:999px;background:#B5121B;color:#FFFFFF;font-family:Anton,Impact,sans-serif;font-size:18px;padding:0 24px;cursor:pointer">' + T.btn + '</button>' +
      '<label style="flex:1 1 100%;display:flex;gap:10px;align-items:center;font-size:15px;color:#111111;cursor:pointer"><input type="checkbox" style="width:20px;height:20px;margin:0">' + T.adult + '</label>' +
      '<p role="status" style="flex:1 1 100%;margin:0;font-size:14px;color:#111111"></p></form>';
    row.parentNode.insertBefore(blk, row);
    blk.querySelector('form').onsubmit = async function (ev) {
      ev.preventDefault();
      var m = blk.querySelector('[role=status]'), em = blk.querySelector('input[type=email]').value, ad = blk.querySelector('input[type=checkbox]').checked;
      if (!valid(em.trim())) { m.textContent = T.bad; return; }
      if (!ad) { m.textContent = T.noadult; return; }
      try { var r = await subscribe(em, location.pathname + ' (onderaan)'); m.textContent = r === 'ok' ? T.ok : T.okMail; blk.querySelector('button').disabled = true; }
      catch (e) { m.textContent = T.err; }
    };
  }
  if (location.hash === '#nieuwsbrief') show();
  // show after 5 seconds
  if (auto) setTimeout(show, force ? 300 : 5000);
})();
