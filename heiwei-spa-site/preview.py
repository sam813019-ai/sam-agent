"""本機預覽：把頁面內容塞進線上頁殼＋hwx.css，輸出 HTML 給 Playwright 截圖（草稿頁前台需登入看不到）"""
import re,sys,os,urllib.request
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..'))
from scripts.wp_spa import req
pid,out=sys.argv[1],sys.argv[2]
h=urllib.request.urlopen(urllib.request.Request('https://heiwei-group.com/%e9%97%9c%e6%96%bc/',headers={'User-Agent':'Mozilla/5.0'})).read().decode()
raw=req('GET',f'/pages/{pid}?context=edit')['content']['raw'].replace('<!-- wp:html -->','').replace('<!-- /wp:html -->','')
m=re.search(r'<div class="entry-content[^>]*>',h); s=m.end(); e=h.find('</main>',s)
css=open(os.path.join(os.path.dirname(__file__),'hwx.css')).read()
open(out,'w').write((h[:s]+raw+'</div>'+h[e:]).replace('</head>','<style>'+css+'</style></head>'))
