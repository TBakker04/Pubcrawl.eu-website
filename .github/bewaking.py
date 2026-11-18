#!/usr/bin/env python3
"""Dagelijkse bewaking van pubgolf.eu (workflow .github/workflows/bewaking.yml).
Kijkt of de site, elke stad (spel + stadspagina NL/EN + poster + teaser), de beheer- en klassementpagina en de
Pubgolf-backend (Apps Script: reviews, klassement, boekformulier) werken, en of er geen stadsinhoud openbaar staat.
Gaat er iets mis: de run faalt (GitHub mailt) en, als BREVO_API_KEY er is, een mail naar ALERT_EMAIL (standaard bookings@forkit.nl).
Alleen lezen: het boekformulier krijgt een verzoek met een stad die niet bestaat, dat de backend weigert zonder iets op te slaan.
Met FORCE_FAIL=true faalt één controle expres (om de alarmmail te testen)."""
import json, os, re, sys, urllib.request, urllib.error

SITE = 'https://pubgolf.eu'
UA = {'User-Agent': 'pubgolf-bewaking/1.0'}
fails, oks = [], 0


def get(url, method='GET', data=None, headers=None):
    req = urllib.request.Request(url, method=method, data=data, headers={**UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return 0, str(e).encode()


def check(name, ok, detail=''):
    global oks
    if ok: oks += 1
    else: fails.append(f'{name}: {detail}'); print('FOUT', name, detail)


def page(path, must=None, method='GET'):
    st, body = get(SITE + path, method)
    good = st == 200 and (must is None or must.encode() in body)
    check(path, good, f'HTTP {st}' + ('' if st != 200 else f', "{must}" ontbreekt'))
    return body if st == 200 else b''


# 1. vaste pagina's
for p, m in [('/', 'Wat spelers zeggen'), ('/en/', 'What players say'), ('/steden/', 'Alle pubgolfs'), ('/en/cities/', None),
             ('/bedrijfsfeest/', 'id="grote-groepen"'), ('/vrijgezellenfeest/', 'id="grote-groepen"'), ('/zo-werkt-het/', None),
             ('/en/company-events/', None), ('/en/bachelor-party/', None), ('/en/how-it-works/', None),
             ('/review.html', 'type: \'review\''), ('/klassement.html', 'action=event'), ('/admin.html', 'cities.js'),
             ('/privacy.html', None), ('/voorwaarden.html', None), ('/bedankt.html', None), ('/sitemap.xml', '<urlset'), ('/robots.txt', None)]:
    page(p, m)

# 2. elke stad uit cities.js
js = page('/cities.js', 'PC_CITIES').decode('utf-8', 'ignore')
m = re.search(r'PC_CITIES\s*=\s*(\{.*\})\s*;?', js, re.S)
cities = json.loads(m.group(1)) if m else {}
check('cities.js leesbaar', len(cities) >= 5, f'{len(cities)} steden gevonden')
for slug in cities:
    page(f'/{slug}/', 'firebase-config.js')
    page(f'/steden/{slug}/', 'id="boek"')
    page(f'/en/cities/{slug}/', 'id="boek"')
    page(f'/assets/poster_{slug}.jpg')
    st, _ = get(f'{SITE}/{slug}/teaser.mp4', 'HEAD')
    check(f'/{slug}/teaser.mp4', st == 200, f'HTTP {st}')
    # stadsinhoud mag nooit openbaar staan
    st, _ = get(f'{SITE}/packs/{slug}.json')
    check(f'geen pack openbaar ({slug})', st == 404, f'HTTP {st}: /packs/{slug}.json is bereikbaar!')

# 3. backend (Apps Script)
cfg = page('/booking-config.js', 'script').decode('utf-8', 'ignore')
u = re.search(r"script:\s*'(https://script\.google\.com[^']+)'", cfg)
check('backend-adres in booking-config.js', bool(u), 'niet gevonden')
if u:
    api = u.group(1)
    def js_get(q):
        st, body = get(api + q)
        try: return st, json.loads(body)
        except Exception: return st, None
    st, d = js_get('?action=reviews')
    check('backend: reviews', isinstance(d, dict) and isinstance(d.get('reviews'), list), f'HTTP {st}, antwoord {str(d)[:120]}')
    st, d = js_get('?action=event&e=bewakingtest')
    check('backend: klassement', isinstance(d, dict) and d.get('error') == 'event', f'HTTP {st}, antwoord {str(d)[:120]}')
    st, body = get(api, 'POST', json.dumps({'city': '__bewaking__'}).encode(), {'Content-Type': 'text/plain;charset=utf-8'})
    try: d = json.loads(body)
    except Exception: d = None
    check('backend: boekformulier', isinstance(d, dict) and d.get('error') == 'city', f'HTTP {st}, antwoord {str(d)[:120]}')

if os.environ.get('FORCE_FAIL', '').lower() == 'true':
    check('testalarm (FORCE_FAIL)', False, 'expres gefaald om de alarmmail te testen')

# 4. uitslag
summary = f'Bewaking pubgolf.eu: {oks} goed, {len(fails)} fout.'
print(summary)
out = os.environ.get('GITHUB_STEP_SUMMARY')
if out:
    with open(out, 'a', encoding='utf-8') as f:
        f.write(f'## {summary}\n\n' + ('\n'.join(f'- ❌ {x}' for x in fails) if fails else '✅ Alles werkt.') + '\n')
if fails:
    key = os.environ.get('BREVO_API_KEY', '').strip()
    km = re.search(r'xkeysib-[A-Za-z0-9-]+', key)
    to = os.environ.get('ALERT_EMAIL', '').strip() or 'bookings@forkit.nl'
    if km:
        run = f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{os.environ.get('GITHUB_REPOSITORY', '')}/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
        text = summary + '\n\n' + '\n'.join('- ' + x for x in fails) + f'\n\nDetails: {run}\n'
        body = {'sender': {'name': 'Pubgolf bewaking', 'email': os.environ.get('SENDER_EMAIL') or 'pubgolf@forkit.nl'}, 'to': [{'email': to}],
                'subject': f'[Pubgolf] Bewaking: {len(fails)} fout(en) op pubgolf.eu', 'textContent': text,
                'htmlContent': '<pre style="font:14px/1.5 monospace">' + text.replace('&', '&amp;').replace('<', '&lt;') + '</pre>', 'tags': ['bewaking']}
        st, resp = get('https://api.brevo.com/v3/smtp/email', 'POST', json.dumps(body).encode(),
                       {'api-key': km.group(0), 'accept': 'application/json', 'content-type': 'application/json'})
        print('alarmmail:', 'verstuurd' if st < 300 else f'mislukt ({st} {resp[:200]!r})')
    sys.exit(1)
