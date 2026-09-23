#!/bin/bash
# 把 sunscreen_stick_shopline.html 裡的本機圖片路徑換成 Shopline 圖庫網址，
# 產出可以直接貼上 Shopline 的 sunscreen_stick_shopline_READY.html
# 用法：先填好 image_urls.txt，再跑 bash make_shopline.sh
set -e
cd "$(dirname "$0")"
python3 - <<'PY'
import io, sys, re

SRC = 'sunscreen_stick_shopline.html'
OUT = 'sunscreen_stick_shopline_READY.html'

urls = {}
for line in io.open('image_urls.txt', encoding='utf-8'):
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    k, v = line.split('=', 1)
    urls[k.strip()] = v.strip()

html = io.open(SRC, encoding='utf-8').read()
found = re.findall(r'\./assets/([A-Za-z0-9_.\-]+\.(?:jpg|jpeg|png|webp|JPG|PNG))', html)
missing, done = [], []

for name in sorted(set(found)):
    u = urls.get(name, '')
    if u:
        html = html.replace('./assets/' + name, u)
        done.append(name)
    else:
        missing.append(name)

io.open(OUT, 'w', encoding='utf-8').write(html)

print('已換成 Shopline 網址：%d 張' % len(done))
for n in done:
    print('   ✓ ' + n)
if missing:
    print('')
    print('⚠️  還沒填網址（貼上去會破圖）：%d 張' % len(missing))
    for n in missing:
        print('   ✗ ' + n + '   ← 去 image_urls.txt 補上')
    print('')
    print('補完再跑一次 bash make_shopline.sh')
    sys.exit(1)

print('')
print('✅ %s 產生完成，整份複製貼到 Shopline 商品描述的原始碼模式即可。' % OUT)
PY
