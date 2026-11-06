"""線上驗證：首頁、所有新頁 200、schema 可解析、舊網址 301、sitemap"""
import urllib.request, re, json, sys, os, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
import courses as cs
U = 'https://heiwei-group.com'
class NoRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
op = urllib.request.build_opener(NoRedir)
def get(u, follow=True):
    r = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        x = (urllib.request.urlopen if follow else op.open)(r, timeout=30); return x.status, x.headers.get('Location'), x.read().decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers.get('Location'), ''
def schema(h):
    t = []
    for l in re.findall(r'application/ld\+json[^>]*>(.*?)</script>', h, re.S):
        try:
            d = json.loads(l); t += [str(x.get('@type')) for x in d.get('@graph', [d])]
        except Exception: t.append('PARSE-ERR')
    return t
s, _, h = get(U + '/?nc=1')
print('home', s, re.findall(r'<title>(.*?)</title>', h))
print(' h1:', re.sub(r'<[^>]+>|\s+', ' ', re.findall(r'<h1[^>]*>(.*?)</h1>', h, re.S)[0]).strip())
print(' desc:', re.findall(r'<meta name="description" content="([^"]+)"', h)[:1])
print(' schema:', schema(h))
print(' nav:', re.findall(r'wp-block-navigation-item__label">([^<]+)<', h)[:12])
print(' footer 北屯/LINE:', '南興路170號' in h, '@000yhvvp' in h)
urls = ['/facial/', '/body/', '/hair-removal/', '/about/', '/locations/', '/faq/', '/heiwei-spa-gallery/'] + \
       [f"/{c['cat']}/{c['slug']}/" for c in cs.COURSES if not c['hold']]
bad = []
for p in urls:
    s, _, h = get(U + p)
    t = schema(h)
    if s != 200 or 'PARSE-ERR' in t or not t: bad.append((p, s, t))
print('new pages:', len(urls), 'bad:', bad)
for p in cs.COURSES:
    if p['hold']:
        print(' hold', p['slug'], get(U + f"/facial/{p['slug']}/")[0])
old = ['/69-2/', '/%e5%be%ae%e9%9b%bb%e6%b5%81%e5%b0%8fv%e8%87%89%e8%aa%b2%e7%a8%8b/', '/%e6%b4%97%e5%ae%89%e8%9c%9c%e6%87%b6%e4%ba%ba%e4%bf%9d%e9%a4%8a%e7%b5%84/',
       '/%e9%97%9c%e6%96%bc/', '/heiwei-spa/', '/%e6%a5%b5%e8%87%b4%e5%ab%a9%e7%99%bd%e8%82%8c%e8%aa%b2%e7%a8%8b/', '/%e5%81%89%e5%a4%a7%e7%9a%84%e5%ad%95%e5%a9%a6spa/']
for p in old:
    s, loc, _ = get(U + p, follow=False); print(' old', s, p[:40], '->', loc)
s, _, h = get(U + '/sitemap-1.xml'); locs = re.findall(r'<loc>([^<]+)', h); print('sitemap', s, len(locs), [l for l in locs if '%' in l][:5])
