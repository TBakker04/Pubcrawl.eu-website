/* "Wat spelers zeggen" op de homepage: alleen reviews die de beheerder in admin.html online zette (en waarvoor de speler toestemming gaf).
   Komt van de Pubgolf-backend (Apps Script, ?action=reviews, 10 minuten in de cache). Geen reviews = de sectie blijft verborgen. */
(function () {
  var box = document.getElementById('reviews'), cfg = window.PC_BOOKING || {};
  if (!box || !cfg.script) return;
  var en = document.documentElement.lang === 'en';
  fetch(cfg.script + '?action=reviews').then(function (r) { return r.json(); }).then(function (d) {
    var list = (d && d.reviews || []).filter(function (r) { return r.text; }).slice(0, 6);
    if (!list.length) return;
    var grid = box.querySelector('[data-grid]');
    list.forEach(function (r) {
      var c = document.createElement('figure');
      c.style.cssText = 'margin:0;background:#FFFFFF;color:#111111;border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:12px';
      var s = document.createElement('div'); s.setAttribute('aria-label', r.stars + ' / 5');
      s.style.cssText = 'font-size:22px;letter-spacing:2px;color:#C9A227'; s.textContent = '★★★★★'.slice(0, r.stars) + '☆☆☆☆☆'.slice(0, 5 - r.stars);
      var q = document.createElement('blockquote'); q.style.cssText = 'margin:0;font-size:17px;line-height:1.5'; q.textContent = '“' + r.text + '”';
      var w = document.createElement('figcaption'); w.style.cssText = 'font-size:14px;font-weight:800;letter-spacing:.04em';
      w.textContent = (r.name ? r.name + ' · ' : '') + 'Pubgolf ' + (en ? r.cityEn : r.cityNl);
      c.appendChild(s); c.appendChild(q); c.appendChild(w); grid.appendChild(c);
    });
    box.hidden = false;
  }).catch(function () {});
})();
