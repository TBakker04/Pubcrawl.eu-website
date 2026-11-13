#!/usr/bin/env python3
"""Run by .github/workflows/nieuwsbrief.yml. Sends nieuwsbrief/<slug>.html as a Brevo email campaign.
Automatic: only for a city whose page steden/<slug>/index.html is NEW in this push, and never twice
(a campaign named "Nieuwe stad: <slug>" already in Brevo means: already sent). Between 21:00 and 09:00
(Amsterdam) the mail is scheduled for 10:00 instead of being sent at night."""
import datetime, json, os, re, subprocess, sys, urllib.parse, urllib.request, urllib.error
from zoneinfo import ZoneInfo

API = 'https://api.brevo.com/v3'
KEY = os.environ.get('BREVO_API_KEY', '').strip()
# only the key itself (starts with xkeysib-): also works when a whole example from Brevo was pasted into the secret
_m = re.search(r'xkeysib-[A-Za-z0-9-]+', KEY)
if _m: KEY = _m.group(0)
elif KEY and not re.fullmatch(r'[A-Za-z0-9._-]{20,200}', KEY):
    sys.exit('BREVO_API_KEY is not a Brevo API key: paste only the key itself (it starts with xkeysib-), nothing else.')


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'api-key': KEY, 'accept': 'application/json', 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode()
            return json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:400]
        hint = {401: 'the API key is wrong or blocked (Brevo: Security -> Authorised IPs must not block unknown IPs)',
                403: 'the API key lacks a permission: in Brevo (SMTP & API -> API keys) give it "Email campaigns" and "Contacts" (read), or set the variable BREVO_LIST_IDS'}.get(e.code, '')
        sys.exit(f'Brevo {method} {path}: {e.code} {msg}' + (f'\n=> {hint}' if hint else ''))


def new_cities():
    before, after = os.environ.get('BEFORE', ''), os.environ.get('AFTER', '')
    if not before or set(before) == {'0'}:
        return []
    out = subprocess.run(['git', 'diff', '--name-only', '--diff-filter=A', before, after, '--', 'steden'], capture_output=True, text=True, check=True).stdout
    return sorted({m.group(1) for m in re.finditer(r'^steden/([a-z0-9-]+)/index\.html$', out, re.M)})


def campaign(slug, test):
    meta = json.load(open(f'nieuwsbrief/{slug}.json', encoding='utf-8'))
    html = open(f'nieuwsbrief/{slug}.html', encoding='utf-8').read()
    name = f'Nieuwe stad: {slug}'
    if not test:
        done, o = [], 0
        while True:
            page = call('GET', f'/emailCampaigns?limit=100&offset={o}').get('campaigns') or []
            done += page; o += 100
            if len(page) < 100: break
        if any(c.get('name') == name for c in done):
            print('already sent:', name); return
    lists = [int(x) for x in re.findall(r'\d+', os.environ.get('BREVO_LIST_IDS', ''))] or [l['id'] for l in call('GET', '/contacts/lists?limit=50').get('lists', [])]
    if not lists:
        sys.exit('no Brevo list found')
    body = {'name': (f'TEST {slug} {datetime.datetime.now():%Y-%m-%d %H:%M}' if test else name), 'subject': meta['subject'], 'previewText': meta['preheader'],
            'sender': {'name': 'Pubgolf', 'email': os.environ.get('SENDER_EMAIL') or 'pubgolf@forkit.nl'},
            'replyTo': 'bookings@forkit.nl', 'htmlContent': html, 'recipients': {'listIds': lists}}
    now = datetime.datetime.now(ZoneInfo('Europe/Amsterdam'))
    if not test and not (9 <= now.hour < 21):   # no mail at night: tomorrow (or this morning) at 10:00
        at = now.replace(hour=10, minute=0, second=0, microsecond=0)
        if now.hour >= 21: at += datetime.timedelta(days=1)
        body['scheduledAt'] = at.isoformat()
    cid = call('POST', '/emailCampaigns', body)['id']
    if test:
        call('POST', f'/emailCampaigns/{cid}/sendTest', {'emailTo': [test]})
        # the test campaign stays as a draft ("TEST ..."): Brevo sends the test a little later, deleting it now would cancel it
        print('test sent to', test, 'for', slug, '(draft campaign', cid, 'kept in Brevo; delete it there whenever you like)')
    elif 'scheduledAt' in body:
        print('scheduled', name, 'for', body['scheduledAt'], 'to lists', lists)
    else:
        call('POST', f'/emailCampaigns/{cid}/sendNow')
        print('sent', name, 'to lists', lists)


def mask(a):
    u, _, d = a.partition('@')
    return (u[:1] + '***@' + d) if d else '***'


def status(check):
    """Stad = status: counts only, never addresses (the logs of this public repo can be read by anyone)."""
    for l in call('GET', '/contacts/lists?limit=50').get('lists', []):
        print(f"list {l['id']} '{l.get('name')}': {l.get('uniqueSubscribers', l.get('totalSubscribers'))} contacts, {l.get('totalBlacklisted', 0)} unsubscribed")
    for c in call('GET', '/emailCampaigns?limit=50&statistics=globalStats&sort=desc').get('campaigns') or []:
        g = (c.get('statistics') or {}).get('globalStats') or {}
        print(f"campaign {c['id']} '{c.get('name')}' [{c.get('status')}] lists {c.get('recipients', {}).get('lists')}: sent {g.get('sent')}, delivered {g.get('delivered')}, "
              f"bounces {g.get('hardBounces', 0)}+{g.get('softBounces', 0)}, opened {g.get('uniqueViews')}, unsubscribed {g.get('unsubscriptions')}")
    if check:
        req = urllib.request.Request(API + '/contacts/' + urllib.parse.quote(check), headers={'api-key': KEY, 'accept': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r: c = json.loads(r.read().decode())
            print(f"{mask(check)}: on lists {c.get('listIds')}, unsubscribed/blocked: {c.get('emailBlacklisted')}")
        except urllib.error.HTTPError as e:
            print(f"{mask(check)}: not a contact in Brevo ({e.code})")


if __name__ == '__main__':
    slug, test = os.environ.get('SLUG', '').strip().lower(), os.environ.get('TEST_EMAIL', '').strip()
    if slug == 'status':
        if not KEY: sys.exit('BREVO_API_KEY is not set')
        status(test); sys.exit(0)
    todo = [slug] if slug else new_cities()
    todo = [s for s in todo if os.path.exists(f'nieuwsbrief/{s}.html')]
    if not todo:
        print('no new city with a newsletter in this push'); sys.exit(0)
    if not KEY:
        print('BREVO_API_KEY is not set: nothing sent for', todo); sys.exit(0)
    for s in todo:
        campaign(s, test)
