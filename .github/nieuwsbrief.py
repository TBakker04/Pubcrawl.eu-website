#!/usr/bin/env python3
"""Run by .github/workflows/nieuwsbrief.yml. Sends nieuwsbrief/<slug>.html as a Brevo email campaign.
Automatic: only for a city whose page steden/<slug>/index.html is NEW in this push, and never twice
(a campaign named "Nieuwe stad: <slug>" already in Brevo means: already sent). Between 21:00 and 09:00
(Amsterdam) the mail is scheduled for 10:00 instead of being sent at night."""
import datetime, json, os, re, subprocess, sys, urllib.request, urllib.error
from zoneinfo import ZoneInfo

API = 'https://api.brevo.com/v3'
KEY = os.environ.get('BREVO_API_KEY', '').strip()


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'api-key': KEY, 'accept': 'application/json', 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode()
            return json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        sys.exit(f'Brevo {method} {path}: {e.code} {e.read().decode()[:400]}')


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
        call('DELETE', f'/emailCampaigns/{cid}')
        print('test sent to', test, 'for', slug)
    elif 'scheduledAt' in body:
        print('scheduled', name, 'for', body['scheduledAt'], 'to lists', lists)
    else:
        call('POST', f'/emailCampaigns/{cid}/sendNow')
        print('sent', name, 'to lists', lists)


if __name__ == '__main__':
    slug, test = os.environ.get('SLUG', '').strip().lower(), os.environ.get('TEST_EMAIL', '').strip()
    todo = [slug] if slug else new_cities()
    todo = [s for s in todo if os.path.exists(f'nieuwsbrief/{s}.html')]
    if not todo:
        print('no new city with a newsletter in this push'); sys.exit(0)
    if not KEY:
        print('BREVO_API_KEY is not set: nothing sent for', todo); sys.exit(0)
    for s in todo:
        campaign(s, test)
