#!/usr/bin/env python3
"""Add open-licence pictures to tools/catalog.json: category Art (Met Museum public domain + Cleveland Museum of Art CC0 paintings) and
Landscapes (Wikimedia Commons featured pictures). Rerun: `python3 tools/harvest_open.py` (all) or `... met cleveland commons` (some), then
`python3 tools/build_catalog.py`. A rerun replaces the entries of the sources it ran and keeps the rest (Reddit ones too).
Museum candidates are checked: the URL answers and the first bytes give a width/height. Commons gives sizes in its reply."""
import re, json, html, hashlib, subprocess, concurrent.futures as cf, urllib.parse, sys, os, time, collections
UA = 'LumenWallpaperHarvest/1.0 (personal TV launcher wallpaper list; python-urllib/curl)'   # Commons asks for a descriptive UA
ART_MIN_W, ART_RATIO = 1800, (1.3, 2.4)
PHOTO_MIN_W, PHOTO_RATIO = 1920, (1.5, 2.4)
MAX_BYTES = 30_000_000      # the resizer and the TV fallback both choke on huge originals
WANT = {'met': 110, 'cleveland': 110, 'commons': 300}
TERMS = ['landscape', 'sea', 'seascape', 'harbor', 'river', 'view of', 'city', 'venice', 'mountain', 'storm', 'sunset', 'lake', 'coast', 'bridge', 'winter', 'village', 'moon', 'garden', 'field', 'forest', 'ship', 'beach', 'rome', 'paris', 'panorama']
CATALOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'catalog.json')
ONLY = [a.lower() for a in sys.argv[1:]] or list(WANT)

def sh(cmd, **kw): return subprocess.run(cmd, capture_output=True, **kw)
def api(url):
    for attempt in range(4):
        r = sh(['curl','-s','-A',UA,'--max-time','30',url], text=True)
        try: return json.loads(r.stdout)
        except ValueError: time.sleep(3 * (attempt + 1))      # the Met answers a 403 page when it is hit too fast; wait and go slower
    return {}
def plain(s): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', s or ''))).strip()
BOILER = re.compile(r'^(this (is|image|file|media)|an? (photo|image|picture) of)\b', re.I)      # a stock sentence, not a title
def tidy(t):
    """A Commons file name as a title: no leading year or number, dates, camera codes or trailing counters."""
    t = re.sub(r'\b(19|20)\d\d[-_.]\d\d[-_.]\d\d\b', ' ', t)                          # 2014-08-16
    t = re.sub(r'\b\d{8}\b( \d{3,5}\b)?', ' ', t)                                                # 20160807
    t = re.sub(r'\b(DSC|IMG|DD|P|DSCF|_MG)[ _-]?\d+\b', ' ', t, flags=re.I)                # DD 123, IMG_1234
    t = re.sub(r'^\s*(\d{1,4}[\s._-]+)+', '', t)                                           # 2015 , 01-
    t = re.sub(r'([\s,._-]+\d{1,3})+\s*$', '', t)                                          # trailing 1, (2)
    t = re.sub(r'\b(moy|res|hdr|edit|crop|pano)\b', ' ', t, flags=re.I)
    t = re.sub(r'\s*,\s*,+', ',', re.sub(r'\s+', ' ', t)).strip(' ,;.-_')
    return t[0].upper() + t[1:] if t else ''
def short(s, n): return s if len(s) <= n else s[:n].rsplit(' ', 1)[0].rstrip(' ,;.-') + '…'

def dims(buf):
    import struct
    if buf[:8] == b'\x89PNG\r\n\x1a\n': return struct.unpack('>II', buf[16:24])
    if buf[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(buf):
            if buf[i] != 0xFF: i += 1; continue
            m = buf[i+1]
            if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7: i += 2; continue
            n = struct.unpack('>H', buf[i+2:i+4])[0]
            if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack('>HH', buf[i+5:i+9]); return w, h
            i += 2 + n
    return None

def check(c):
    minw, (lo, hi) = (ART_MIN_W, ART_RATIO) if c['category'] == 'Art' else (PHOTO_MIN_W, PHOTO_RATIO)
    for attempt in range(3):
        r = sh(['curl','-s','-A',UA,'--max-time','25','-r','0-131071','-D','-',c['url']])
        head, _, body = r.stdout.partition(b'\r\n\r\n')
        if b' 429' in head[:40]: time.sleep(5 * (attempt + 1)); continue
        break
    if b' 200' not in head[:40] and b' 206' not in head[:40]: return None
    d = dims(body)
    if not d: return None
    w, h = d; tot = re.search(rb'(?i)content-range:[^\n]*/(\d+)', head); size = int(tot.group(1)) if tot else 0
    if w < minw or not lo <= w / h <= hi or size > MAX_BYTES: return None
    return dict(c, w=w, h=h, bytes=size)

def met():
    ids = []
    def search(q, hl):
        out = []
        for off in range(0, 400, 100):
            d = api(f'https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&medium=Paintings&{"isHighlight=true&" if hl else ""}q={urllib.parse.quote(q)}&limit=100&offset={off}')
            out += d.get('objectIDs') or []
            if len(out) >= d.get('total', 0): break
        return out
    for hl in (True, False):
        for q in TERMS:
            for i in search(q, hl):
                if i not in ids: ids.append(i)
    ids = ids[:900]; print('met ids', len(ids), file=sys.stderr)
    def get(i):
        time.sleep(0.15)
        o = api(f'https://collectionapi.metmuseum.org/public/collection/v1/objects/{i}')
        if not o.get('isPublicDomain') or not o.get('primaryImage') or 'Painting' not in (o.get('classification') or o.get('objectName') or 'Painting'): return None
        if not o['primaryImage'].lower().endswith(('.jpg', '.jpeg')): return None
        who = plain(o.get('artistDisplayName')) or 'Unknown artist'
        credit = f"{who}, {plain(o.get('objectDate'))}" if o.get('objectDate') else who
        return {'url': o['primaryImage'], 'title': plain(o['title']), 'credit': credit, 'source': 'Met', 'category': 'Art', 'hl': bool(o.get('isHighlight'))}
    with cf.ThreadPoolExecutor(3) as ex: return [c for c in ex.map(get, ids) if c]

def cleveland():
    out = {}
    for q in TERMS:
        for skip in range(0, 600, 200):
            d = api(f'https://openaccess-api.clevelandart.org/api/artworks/?type=Painting&cc0=1&has_image=1&q={urllib.parse.quote(q)}&limit=200&skip={skip}')
            for a in d.get('data') or []:
                im = (a.get('images') or {}).get('print') or {}
                try: w, h = int(im['width']), int(im['height'])
                except (KeyError, TypeError, ValueError): continue
                if w < ART_MIN_W or not ART_RATIO[0] <= w / h <= ART_RATIO[1] or not im['url'].endswith('.jpg'): continue
                who = plain(re.sub(r'\([^)]*\)', '', (a.get('creators') or [{}])[0].get('description', ''))) or 'Unknown artist'
                out[a['id']] = {'url': im['url'], 'title': plain(a['title']), 'credit': f"{who}, {plain(a.get('creation_date'))}" if a.get('creation_date') else who, 'source': 'Cleveland', 'category': 'Art', 'hl': False}
            if len(d.get('data') or []) < 200: break
    return list(out.values())

COMMONS = ['Featured pictures of landscapes', 'Featured pictures of mountains', 'Featured pictures of lakes', 'Featured pictures of coasts']
GOOD = re.compile(r'^(CC BY(-SA)?|CC0|Public domain|PD)', re.I)
def commons():
    """The reply carries each file's size, so no file is downloaded to check it; the URL is Commons' own 1920-wide copy, not the original."""
    out, seen = [], set()
    for cat in COMMONS:
        cont = {}
        while True:
            d = api('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=categorymembers&gcmtype=file&gcmlimit=50&prop=imageinfo'
                    '&iiprop=url|size|mime|extmetadata&iiurlwidth=1920&iiextmetadatafilter=ObjectName|ImageDescription|Artist|LicenseShortName&gcmtitle='
                    + urllib.parse.quote('Category:' + cat.replace(' ', '_')) + ''.join(f'&{k}={urllib.parse.quote(str(v))}' for k, v in cont.items()))
            for p in (d.get('query') or {}).get('pages', {}).values():
                ii = (p.get('imageinfo') or [{}])[0]; m = ii.get('extmetadata') or {}
                if ii.get('mime') != 'image/jpeg' or p['title'] in seen or not ii.get('thumburl'): continue
                if ii.get('width', 0) < PHOTO_MIN_W or not PHOTO_RATIO[0] <= ii['width'] / ii['height'] <= PHOTO_RATIO[1]: continue
                lic = plain(m.get('LicenseShortName', {}).get('value'))
                if not GOOD.match(lic): continue
                seen.add(p['title'])
                name = plain(m.get('ObjectName', {}).get('value')) or re.sub(r'\.jpe?g$', '', p['title'][5:], flags=re.I).replace('_', ' ')
                desc = plain(m.get('ImageDescription', {}).get('value'))
                who = short(plain(m.get('Artist', {}).get('value')), 48) or 'unknown'
                out.append({'url': ii['thumburl'].split('?')[0], 'title': short(desc if 8 <= len(desc) <= 90 and not BOILER.match(desc) else tidy(name) or name, 80), 'source': 'Wikimedia Commons', 'category': 'Landscapes',
                            'credit': 'Photo: ' + who + ('' if lic.lower().startswith(('cc0', 'public', 'pd')) else f' ({lic})'), 'w': 1920, 'h': round(1920 * ii['height'] / ii['width'])})
            cont = d.get('continue')
            if not cont: break
        print(cat, len(out), file=sys.stderr)
    return out

SRC = {'met': ('Met', met), 'cleveland': ('Cleveland', cleveland), 'commons': ('Wikimedia Commons', commons)}
have = json.load(open(CATALOG)) if os.path.exists(CATALOG) else []
ran = {SRC[k][0] for k in ONLY}
keep = [c for c in have if c.get('source') not in ran]
have_urls = {c['url'] for c in keep}
new = []
for k in ONLY:
    cands = [c for c in SRC[k][1]() if c['url'] not in have_urls]
    seen = set(); cands = [c for c in cands if not (c['url'] in seen or seen.add(c['url']))]
    cands.sort(key=lambda c: not c.get('hl'))      # Met highlights first (the sort is stable)
    print(k, len(cands), 'candidates', file=sys.stderr)
    ok = []
    if k == 'commons': new += cands[:WANT[k]]; continue      # sized from the API reply already
    with cf.ThreadPoolExecutor(8) as ex:
        for r in ex.map(check, cands[:WANT[k] * 3]):
            if r: ok.append(r)
    new += ok[:WANT[k]]
for c in new:
    c.pop('hl', None); c['id'] = hashlib.sha1(c['url'].encode()).hexdigest()[:8]
json.dump(keep + new, open(CATALOG, 'w'), indent=1, ensure_ascii=False)
print(len(keep + new), 'in catalog;', 'new:', dict(collections.Counter(c['source'] for c in new)))
