/* "Wat spelers zeggen" op de homepage: alleen reviews die de beheerder in admin.html online zette (en waarvoor de speler toestemming gaf).
   Komt van de Pubgolf-backend (Apps Script, ?action=reviews, 10 minuten in de cache). Geen reviews = de sectie blijft verborgen.
   Carousel: in het midden de uitgelichte review, links wazig de volgende, rechts wazig de vorige. Draait elke 5 seconden door
   (pauze bij muis erop, focus of als het tabblad niet zichtbaar is); pijltjes en bolletjes om zelf te kiezen. */
(function () {
  var box = document.getElementById('reviews'), cfg = window.PC_BOOKING || {};
  if (!box || !cfg.script) return;
  var en = document.documentElement.lang === 'en', MS = 5000;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = document.createElement('style');
  css.textContent = '.rv-stage{position:relative;width:100%;transition:height .3s ease}'
    + '.rv-card{position:absolute;top:0;left:50%;width:min(560px,78vw);box-sizing:border-box;margin:0;background:#FFFFFF;color:#111111;border-radius:18px;padding:30px;display:flex;flex-direction:column;gap:14px;'
    + 'box-shadow:0 18px 40px rgba(0,0,0,.28);transition:transform .7s cubic-bezier(.22,.8,.26,1),opacity .7s ease,filter .7s ease;will-change:transform}'
    + '.rv-card[data-p="c"]{transform:translateX(-50%) scale(1);opacity:1;filter:none;z-index:3}'
    + '.rv-card[data-p="l"]{transform:translateX(-128%) scale(.84);opacity:.45;filter:blur(3px);z-index:2;cursor:pointer}'
    + '.rv-card[data-p="r"]{transform:translateX(28%) scale(.84);opacity:.45;filter:blur(3px);z-index:2;cursor:pointer}'
    + '.rv-card[data-p="ll"]{transform:translateX(-200%) scale(.7);opacity:0;filter:blur(6px);z-index:1;pointer-events:none}'
    + '.rv-card[data-p="rr"]{transform:translateX(100%) scale(.7);opacity:0;filter:blur(6px);z-index:1;pointer-events:none}'
    + '.rv-card .st{font-size:24px;letter-spacing:3px;color:#B8901A}.rv-card blockquote{margin:0;font-size:19px;line-height:1.55}'
    + '.rv-card figcaption{font-size:14px;font-weight:800;letter-spacing:.04em}'
    + '.rv-nav{display:flex;justify-content:center;align-items:center;gap:14px}'
    + '.rv-btn{width:48px;height:48px;border-radius:50%;border:2px solid #F7F5F0;background:transparent;color:#F7F5F0;font-family:Anton,Impact,sans-serif;font-size:22px;cursor:pointer}'
    + '.rv-btn:hover{background:#F7F5F0;color:#0E3B2C}'
    + '.rv-dots{display:flex;gap:2px}.rv-dots button{width:28px;height:44px;border:0;background:none;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center}'
    + '.rv-dots button::after{content:"";width:10px;height:10px;border-radius:50%;background:rgba(247,245,240,.35);transition:background .3s,transform .3s}'
    + '.rv-dots button[aria-current="true"]::after{background:#F2D16B;transform:scale(1.3)}'
    + '@media (max-width:700px){.rv-card{padding:22px;width:82vw}.rv-card blockquote{font-size:17px}.rv-card[data-p="l"]{transform:translateX(-148%) scale(.86)}.rv-card[data-p="r"]{transform:translateX(48%) scale(.86)}}'
    + '@media (prefers-reduced-motion: reduce){.rv-card,.rv-stage{transition:none}}';
  document.head.appendChild(css);

  fetch(cfg.script + '?action=reviews').then(function (r) { return r.json(); }).then(function (d) {
    var list = (d && d.reviews || []).filter(function (r) { return r.text; }).slice(0, 12);
    if (!list.length) return;
    var n = list.length, slots = n === 2 ? list.concat(list) : list;   // with two reviews: left and right show the other one
    var grid = box.querySelector('[data-grid]');
    grid.removeAttribute('style'); grid.style.cssText = 'display:flex;flex-direction:column;gap:26px';
    grid.setAttribute('role', 'region'); grid.setAttribute('aria-roledescription', 'carousel'); grid.setAttribute('aria-label', en ? 'Reviews' : 'Reviews');
    var stage = document.createElement('div'); stage.className = 'rv-stage'; stage.setAttribute('aria-live', 'off'); grid.appendChild(stage);
    var cards = slots.map(function (r, k) {
      var c = document.createElement('figure'); c.className = 'rv-card';
      c.setAttribute('role', 'group'); c.setAttribute('aria-roledescription', 'slide'); c.setAttribute('aria-label', ((k % n) + 1) + ' / ' + n);
      var s = document.createElement('div'); s.className = 'st'; s.setAttribute('aria-label', r.stars + ' / 5');
      s.textContent = '★★★★★'.slice(0, r.stars) + '☆☆☆☆☆'.slice(0, 5 - r.stars);
      var q = document.createElement('blockquote'); q.textContent = '“' + r.text + '”';
      var w = document.createElement('figcaption'); w.textContent = (r.name ? r.name + ' · ' : '') + 'Pubgolf ' + (en ? r.cityEn : r.cityNl);
      c.appendChild(s); c.appendChild(q); c.appendChild(w); stage.appendChild(c);
      return c;
    });
    var i = 0, m = cards.length, timer = null, paused = false;
    function fit() { var h = 0; cards.forEach(function (c) { h = Math.max(h, c.offsetHeight); }); stage.style.height = h + 'px'; }
    function place() {
      cards.forEach(function (c, k) {
        var o = ((k - i) % m + m) % m, p = 'hide';
        if (o === 0) p = 'c'; else if (m > 1 && o === 1) p = 'l'; else if (m > 2 && o === m - 1) p = 'r'; else if (m > 3 && o === 2) p = 'll'; else p = 'rr';
        if (m === 1 && o !== 0) p = 'rr';
        c.setAttribute('data-p', p); c.setAttribute('aria-hidden', p === 'c' ? 'false' : 'true');
      });
      if (dots) [].forEach.call(dots.children, function (b, k) { b.setAttribute('aria-current', k === i % n ? 'true' : 'false'); });
    }
    function go(to) { i = ((to % m) + m) % m; place(); restart(); }
    function restart() { clearInterval(timer); timer = null; if (n > 1 && !paused) timer = setInterval(function () { i = (i + 1) % m; place(); }, MS); }
    var dots = null;
    if (n > 1) {
      var nav = document.createElement('div'); nav.className = 'rv-nav';
      var prev = document.createElement('button'); prev.type = 'button'; prev.className = 'rv-btn'; prev.textContent = '←'; prev.setAttribute('aria-label', en ? 'Previous review' : 'Vorige review');
      var next = document.createElement('button'); next.type = 'button'; next.className = 'rv-btn'; next.textContent = '→'; next.setAttribute('aria-label', en ? 'Next review' : 'Volgende review');
      dots = document.createElement('div'); dots.className = 'rv-dots';
      list.forEach(function (r, k) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', (en ? 'Review ' : 'Review ') + (k + 1)); b.onclick = function () { go(k); }; dots.appendChild(b); });
      prev.onclick = function () { go(i - 1); }; next.onclick = function () { go(i + 1); };
      nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next); grid.appendChild(nav);
      cards.forEach(function (c) { c.addEventListener('click', function () { var p = c.getAttribute('data-p'); if (p === 'l') go(i + 1); else if (p === 'r') go(i - 1); }); });
      var hold = function (v) { return function () { paused = v; restart(); }; };
      grid.addEventListener('mouseenter', hold(true)); grid.addEventListener('mouseleave', hold(false));
      grid.addEventListener('focusin', hold(true)); grid.addEventListener('focusout', hold(false));
      document.addEventListener('visibilitychange', function () { paused = document.hidden; restart(); });
      var x0 = null;   // swipe on phones
      stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(dx > 0 ? i + 1 : i - 1); });
    }
    box.hidden = false;
    place(); fit(); restart();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    box.style.overflow = 'hidden';
  }).catch(function () {});
})();
