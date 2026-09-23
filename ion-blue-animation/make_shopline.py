#!/usr/bin/env python3
"""
產生 Shopline「商品描述」可用的版本：shopline_description.html
限制（heiwei-sunstick-blocks/README.md 實測）：無 <script>、無 <svg>、無 CSS 變數、無外部字型。
做法：
  - 波浪屏障 → 每一層一個 div，用 clip-path: polygon() 切出波形，凹陷用 @keyframes 換多邊形
  - 細胞 / 分子 / 水滴 / 滴管 / 葉影 → 純 CSS 形狀
  - 縮放 → 固定 405px，@media 分段 transform:scale（Shopline 會砍 container-type）
同時輸出 preview_shopline.html 供本機開檔檢查。
"""
import math, re, pathlib

W, H, CX = 405, 720, 202
T = 20                      # 週期秒
BASE, AMP, LAMBDA, THICK = 236, 15, 180, 96
CELL_Y = 445

def top_y(x, dip):
    wave = -AMP * math.cos((x - CX) * 2 * math.pi / LAMBDA) + 4 * math.sin(x / 55)
    sag = dip * math.exp(-((x - CX) / 62) ** 2)
    return BASE + wave + sag

XS = list(range(-10, W + 11, 10))

def poly(off_top, off_bottom, dip):
    """以舞台 % 表示的多邊形：上緣沿波形，下緣反向回來"""
    pts = [(x, top_y(x, dip) + off_top) for x in XS]
    pts += [(x, top_y(x, dip) + off_bottom) for x in reversed(XS)]
    return "polygon(" + ",".join(f"{x/W*100:.1f}% {y/H*100:.1f}%" for x, y in pts) + ")"

def pct(sec):  # 秒 → 20s 週期的百分比
    return f"{sec / T * 100:.2f}%"

# ---- 屏障各層：名稱、上下偏移、樣式 ----
LAYERS = [
    ("shadow", THICK + 8, THICK + 34, "background:rgba(40,90,170,.30);"),
    ("band",   0, THICK, "background:linear-gradient(180deg,rgba(255,255,255,.85) 0%,rgba(207,230,251,.75) 35%,rgba(142,195,243,.7) 70%,rgba(94,166,234,.8) 100%);"),
    ("brickA", 12, 30, "background:repeating-linear-gradient(90deg,transparent 0 5px,rgba(255,255,255,.75) 5px 6.2px,transparent 6.2px 36px);"),
    ("brickB", 32, 62, "background:repeating-linear-gradient(90deg,transparent 0 23px,rgba(255,255,255,.75) 23px 24.2px,transparent 24.2px 36px);"),
    ("brickC", 64, 92, "background:repeating-linear-gradient(90deg,transparent 0 5px,rgba(255,255,255,.75) 5px 6.2px,transparent 6.2px 36px);"),
    ("row1",   29, 31.5, "background:rgba(30,110,210,.45);"),
    ("row2",   61, 63.5, "background:rgba(30,110,210,.45);"),
    ("white1", 9, 10.5, "background:rgba(255,255,255,.9);"),
    ("white2", 41, 42.5, "background:rgba(255,255,255,.9);"),
    ("white3", 73, 74.5, "background:rgba(255,255,255,.9);"),
    ("top",    -1.5, 1.5, "background:#fff;"),
    ("bottom", THICK - 1, THICK + 1, "background:rgba(20,90,190,.55);"),
]

membrane_css, membrane_html = [], []
for name, a, b, style in LAYERS:
    p0, p1 = poly(a, b, 0), poly(a, b, 92)
    membrane_css.append(f"""
.gk-m-{name}{{position:absolute;left:0;top:0;width:405px;height:720px;{style}
  clip-path:{p0};animation:gkm-{name} {T}s ease-in-out infinite;}}
@keyframes gkm-{name}{{0%,{pct(5)},{pct(9.2)},100%{{clip-path:{p0}}}{pct(7.4)},{pct(7.5)}{{clip-path:{p1}}}}}""")
    if name == "shadow":
        membrane_html.append(f'<div class="gk-m-shadow-wrap"><div class="gk-m-{name}"></div></div>')
    else:
        membrane_html.append(f'<div class="gk-m-{name}"></div>')

# ---- 細胞 ----
cells_html = []
for dx, y in [(-95, 395), (95, 395), (-285, 395), (285, 395)]:
    cells_html.append(f'<div class="gk-cell gk-back" style="left:{CX+dx-80}px;top:{y-80}px"></div>')
for dx in [-195, 195]:
    cells_html.append(f'<div class="gk-cell" style="left:{CX+dx-95}px;top:{CELL_Y-95}px"></div>')
cells_html.append(f'<div class="gk-cell gk-center" style="left:{CX-95}px;top:{CELL_Y-95}px"></div>')

# ---- 分子 / 水滴 的關鍵影格（y 為中心） ----
crest0 = top_y(CX, 0)
bead_rest, bead_dip, bead_cell = crest0 - 24, top_y(CX, 92) - 24, CELL_Y - 4
drop_rest = crest0 + THICK - 2

# ---- 氣泡 ----
import random
random.seed(7)
bubbles_html = []
for i in range(12):
    r = 4 + random.random() * 16
    bubbles_html.append(
        f'<div class="gk-bubble" style="width:{r*2:.0f}px;height:{r*2:.0f}px;left:{random.random()*W:.0f}px;'
        f'top:{380+random.random()*380:.0f}px;opacity:{.35+random.random()*.5:.2f};'
        f'animation-duration:{8+random.random()*8:.1f}s;animation-delay:{-random.random()*10:.1f}s"></div>')

leaves = [(18,470,34,14,-30),(46,520,38,14,-10),(22,575,30,12,20),(66,600,36,13,-38),
          (378,500,34,13,35),(352,560,38,14,8),(390,615,30,12,-25),(200,700,230,30,0)]
leaves_html = "".join(
    f'<div class="gk-leaf" style="left:{cx-rx}px;top:{cy-ry}px;width:{rx*2}px;height:{ry*2}px;transform:rotate({rot}deg)"></div>'
    for cx, cy, rx, ry, rot in leaves)

CSS = f"""
/* ===== ION BLUE GHK-Cu 動畫｜Shopline 商品描述版（無 JS / 無 SVG / 無 CSS 變數） ===== */
/* 外框固定 405×720，手機用 @media 分段 transform 縮放（Shopline 會砍 container-type，不能用 cqw） */
.gk-wrap{{position:relative;width:100%;max-width:405px;height:720px;margin:0 auto;padding:0;background:none;overflow:visible;}}
.gk-stage{{position:absolute;left:50%;top:0;width:405px;height:720px;transform:translateX(-50%);transform-origin:top center;overflow:hidden;border-radius:22px;
  box-shadow:0 30px 80px rgba(0,0,0,.28);background:#eef5fc;
  font-family:"Helvetica Neue",Helvetica,Arial,"PingFang TC","Noto Sans TC",sans-serif;
  line-height:1.2;color:#17469c;text-align:left;font-size:14px;margin:0;padding:0;}}
.gk-stage *{{box-sizing:border-box;margin:0;padding:0;border:0;background:none;}}
@media (max-width:440px){{.gk-wrap{{height:648px}}.gk-stage{{transform:translateX(-50%) scale(.9)}}}}
@media (max-width:400px){{.gk-wrap{{height:612px}}.gk-stage{{transform:translateX(-50%) scale(.85)}}}}
@media (max-width:375px){{.gk-wrap{{height:576px}}.gk-stage{{transform:translateX(-50%) scale(.8)}}}}
@media (max-width:345px){{.gk-wrap{{height:518px}}.gk-stage{{transform:translateX(-50%) scale(.72)}}}}
.gk-scene{{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;animation-duration:{T}s;animation-timing-function:linear;animation-iteration-count:infinite;}}
.gk-s1{{animation-name:gk-sc1;}} .gk-s2{{animation-name:gk-sc2;}} .gk-s3{{animation-name:gk-sc3;}}
@keyframes gk-sc1{{0%,49%{{opacity:1}}52%,96.5%{{opacity:0}}100%{{opacity:1}}}}
@keyframes gk-sc2{{0%,49%{{opacity:0}}52%,72%{{opacity:1}}75%,100%{{opacity:0}}}}
@keyframes gk-sc3{{0%,72%{{opacity:0}}75%,96.5%{{opacity:1}}100%{{opacity:0}}}}

/* logo */
.gk-logo{{display:inline-block;color:#17469c;font-weight:800;letter-spacing:.04em;white-space:nowrap;}}
.gk-ring{{display:inline-block;vertical-align:-3px;width:22px;height:22px;border-radius:50%;margin-right:8px;position:relative;
  background:conic-gradient(from 210deg,#b5651d,#f2c48a,#fff3e0,#f2c48a,#b5651d,#7a3e0e,#b5651d);}}
.gk-ring:after{{content:"";position:absolute;left:5px;top:5px;width:12px;height:12px;border-radius:50%;background:#fbfdff;}}
.gk-rule{{width:26px;height:1px;background:#17469c;opacity:.45;margin:0 auto;}}

/* ---------- Scene 1 ---------- */
.gk-s1{{background:radial-gradient(60% 40% at 50% 42%,rgba(140,200,255,.45),transparent 70%),linear-gradient(#fff 0%,#f3f8fe 30%,#dfeefb 60%,#eef5fc 100%);}}
.gk-s1-top{{position:absolute;top:34px;left:0;right:0;text-align:center;color:#17469c;}}
.gk-s1-top .gk-logo{{font-size:17px;}}
.gk-s1-top .gk-h1{{margin:12px 0 2px;font-size:24px;font-weight:600;letter-spacing:.01em;line-height:1;}}
.gk-s1-top .gk-sub{{font-size:8.5px;font-weight:500;letter-spacing:.22em;color:#5b6b80;margin-bottom:8px;}}
.gk-s1-bottom{{position:absolute;bottom:30px;left:0;right:0;text-align:center;color:#17469c;}}
.gk-s1-bottom .gk-tag{{font-size:11.5px;font-weight:600;letter-spacing:.16em;margin-bottom:7px;}}
.gk-s1-bottom .gk-copy{{font-size:7.5px;letter-spacing:.14em;color:#5b6b80;line-height:1.8;margin-top:7px;font-weight:500;}}

.gk-cell{{position:absolute;width:190px;height:190px;border-radius:50%;
  background:radial-gradient(circle at 38% 30%,#fff 0%,#f6faff 30%,#dbe9f7 62%,#b9d3ec 88%,#a9c7e6 100%);
  box-shadow:inset -14px -18px 30px rgba(120,160,210,.35),0 18px 30px rgba(60,110,180,.22);}}
.gk-cell.gk-back{{width:160px;height:160px;filter:blur(1.5px);opacity:.85;}}
.gk-cell.gk-center{{z-index:2;animation:gk-cellpop {T}s ease-out infinite;}}
.gk-cell.gk-center:after{{content:"";position:absolute;left:34px;top:34px;right:34px;bottom:34px;border-radius:50%;opacity:0;
  background:radial-gradient(circle at 50% 46%,#d5e7fb 0%,#eaf3fc 35%,rgba(255,255,255,0) 52%);
  box-shadow:inset 0 10px 22px rgba(90,140,200,.45),inset 0 -6px 14px rgba(255,255,255,.9),0 0 0 6px rgba(255,255,255,.55);
  animation:gk-ring {T}s ease-out infinite;}}
@keyframes gk-ring{{0%,{pct(8.3)}{{opacity:0}}{pct(9.4)},96.5%{{opacity:1}}100%{{opacity:0}}}}
@keyframes gk-cellpop{{0%,{pct(8.3)}{{transform:scale(1)}}{pct(9.4)},96.5%{{transform:scale(1.05)}}100%{{transform:scale(1)}}}}

.gk-m-shadow-wrap{{position:absolute;left:0;top:0;width:405px;height:720px;filter:blur(9px);}}
{"".join(membrane_css)}

/* 藍色分子：外層走時間軸，內層做呼吸浮動 */
.gk-bead{{position:absolute;left:{CX-32}px;top:-32px;width:64px;height:64px;z-index:3;
  transform:translateY({bead_rest:.1f}px);animation:gk-bead {T}s ease-in-out infinite;}}
.gk-bead-in{{width:64px;height:64px;border-radius:50%;position:relative;animation:gk-bob 2.8s ease-in-out infinite alternate;
  background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.95) 0 6%,rgba(255,255,255,0) 22%),
    radial-gradient(circle at 60% 72%,#9fdcff 0%,rgba(159,220,255,0) 38%),
    radial-gradient(circle at 50% 45%,#46a6ff 0%,#1c7cf0 45%,#0b4fc9 78%,#0a3fa6 100%);
  box-shadow:inset 0 -8px 14px rgba(255,255,255,.35),inset 0 6px 10px rgba(5,40,120,.35),0 12px 22px rgba(20,90,200,.35);}}
.gk-bead-in:after{{content:"";position:absolute;left:8px;top:6px;right:8px;bottom:3px;border-radius:50%;
  border-bottom:3px solid rgba(255,255,255,.55);border-left:1px solid rgba(255,255,255,.25);}}
@keyframes gk-bob{{from{{transform:translateY(-3px)}}to{{transform:translateY(3px)}}}}
@keyframes gk-bead{{
  0%,{pct(5)}{{transform:translateY({bead_rest:.1f}px);filter:none}}
  {pct(7.4)},{pct(7.5)}{{transform:translateY({bead_dip:.1f}px);animation-timing-function:cubic-bezier(.55,0,1,.45)}}
  {pct(8.6)}{{transform:translateY({bead_cell:.1f}px);filter:none}}
  {pct(9.0)},96.5%{{transform:translateY({bead_cell:.1f}px);filter:saturate(1.25) brightness(1.05)}}
  100%{{transform:translateY({bead_rest:.1f}px);filter:none}}}}

/* 屏障下方的水滴 */
.gk-drop{{position:absolute;left:{CX-15}px;top:-6px;width:30px;height:44px;z-index:3;transform-origin:50% 0;
  border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;
  background:radial-gradient(circle at 40% 30%,rgba(255,255,255,.9) 0 8%,rgba(255,255,255,0) 26%),
    radial-gradient(circle at 50% 70%,#7ec2ff 0%,#2f8cf0 55%,#1660c8 100%);
  box-shadow:inset 0 -4px 8px rgba(255,255,255,.45),0 8px 14px rgba(20,90,200,.25);
  transform:translateY({drop_rest:.1f}px);animation:gk-drop {T}s ease-in infinite;}}
@keyframes gk-drop{{
  0%,{pct(6.6)}{{transform:translateY({drop_rest:.1f}px) scale(1);opacity:1}}
  {pct(7.1)}{{opacity:1}}
  {pct(7.4)},96.5%{{transform:translateY({CELL_Y-95:.1f}px) scale(.65);opacity:0}}
  100%{{transform:translateY({drop_rest:.1f}px) scale(1);opacity:1}}}}

/* ---------- Scene 2 ---------- */
.gk-s2{{background:radial-gradient(70% 45% at 50% 0%,rgba(90,160,255,.35),transparent 70%),
  radial-gradient(60% 40% at 50% 100%,rgba(40,110,220,.3),transparent 70%),
  linear-gradient(#0f3e8f 0%,#0a2d6f 35%,#061f4f 70%,#04173c 100%);color:#fff;}}
.gk-s2-copy{{position:absolute;left:0;right:0;top:178px;text-align:center;animation:gk-s2in {T}s linear infinite;}}
@keyframes gk-s2in{{0%,50%{{transform:translateY(18px) scale(.97)}}56%,100%{{transform:none}}}}
.gk-big{{font-family:Impact,Haettenschweiler,"Arial Narrow Bold","Arial Black","Helvetica Neue",Arial,sans-serif;
  font-weight:900;font-size:84px;line-height:.92;letter-spacing:.005em;color:#fff;white-space:nowrap;transform:scaleX(.82);transform-origin:50% 50%;
  text-shadow:0 6px 30px rgba(0,30,90,.6),0 0 40px rgba(120,190,255,.25);}}
.gk-grad{{background:linear-gradient(180deg,#fff 0%,#bfe6ff 45%,#3b96ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;}}
.gk-line{{width:120px;height:1px;margin:14px auto 16px;background:linear-gradient(90deg,transparent,#8fd0ff,transparent);}}
.gk-small{{font-size:13px;font-weight:500;letter-spacing:.12em;line-height:1.55;color:#fff;}}
.gk-small b{{color:#9fd6ff;font-weight:700;}}
.gk-bubble{{position:absolute;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55),rgba(255,255,255,.05) 40%,rgba(255,255,255,0) 60%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35),inset -6px -8px 16px rgba(120,190,255,.35);
  animation-name:gk-rise;animation-timing-function:linear;animation-iteration-count:infinite;}}
@keyframes gk-rise{{from{{transform:translateY(0)}}to{{transform:translateY(-160px)}}}}
.gk-bigbubble{{position:absolute;right:-150px;bottom:-190px;width:420px;height:420px;border-radius:50%;
  background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.12),rgba(255,255,255,.02) 50%,rgba(255,255,255,0) 62%);
  box-shadow:inset 0 0 0 2px rgba(200,230,255,.55),inset -20px -30px 60px rgba(120,190,255,.35),inset 30px 40px 60px rgba(255,255,255,.08);}}
/* 滴管：純 CSS */
.gk-dropper{{position:absolute;top:-50px;right:36px;width:32px;height:230px;transform:rotate(22deg);transform-origin:50% 30%;}}
.gk-tube{{position:absolute;left:0;top:0;width:32px;height:150px;border-radius:6px;
  background:linear-gradient(90deg,rgba(255,255,255,.55),rgba(207,232,255,.18) 35%,rgba(127,192,255,.22) 70%,rgba(255,255,255,.6));
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7),inset 6px 0 0 -1px rgba(255,255,255,.55);}}
.gk-liquid{{position:absolute;left:8px;top:40px;width:16px;height:66px;border-radius:3px;background:rgba(120,190,255,.45);}}
.gk-neck{{position:absolute;left:0;top:150px;width:32px;height:30px;
  background:linear-gradient(90deg,rgba(255,255,255,.5),rgba(180,220,255,.2),rgba(255,255,255,.55));
  -webkit-clip-path:polygon(0 0,100% 0,75% 100%,25% 100%);clip-path:polygon(0 0,100% 0,75% 100%,25% 100%);}}
.gk-tip{{position:absolute;left:8px;top:179px;width:16px;height:30px;
  background:linear-gradient(90deg,rgba(255,255,255,.5),rgba(180,220,255,.2),rgba(255,255,255,.55));box-shadow:inset 0 0 0 1.2px rgba(255,255,255,.7);}}
.gk-tipdrop{{position:absolute;left:2px;top:206px;width:28px;height:28px;border-radius:0 50% 50% 50%;transform:rotate(45deg);
  background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.95),rgba(191,227,255,.7) 35%,rgba(60,147,255,.85) 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.8);}}

/* ---------- Scene 3 ---------- */
.gk-s3{{background:linear-gradient(115deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 35%,rgba(255,255,255,0) 60%,rgba(255,255,255,.35) 100%),
  linear-gradient(#eef3fa 0%,#dde6f1 45%,#c4d1e0 100%);color:#17469c;text-align:center;}}
.gk-leaf{{position:absolute;border-radius:50%;background:#4d6b8a;opacity:.2;filter:blur(5px);}}
.gk-s3-content{{position:absolute;left:0;right:0;top:0;bottom:0;padding-top:170px;text-align:center;}}
.gk-s3-content>*{{animation:gk-s3in {T}s linear infinite;}}
@keyframes gk-s3in{{0%,74%{{opacity:0;transform:translateY(8px)}}78%,100%{{opacity:1;transform:none}}}}
.gk-s3-content .gk-logo{{font-size:16px;}}
.gk-s3-content .gk-ring:after{{background:#e9eff7;}}
.gk-heart{{margin:16px auto;color:#17469c;font-size:12px;opacity:.8;white-space:nowrap;}}
.gk-heart i{{display:inline-block;width:18px;height:1px;background:#17469c;vertical-align:middle;margin:0 10px;}}
.gk-h2{{font-size:34px;font-weight:800;letter-spacing:.02em;line-height:1;color:#17469c;}}
.gk-fw{{font-size:13px;letter-spacing:.3em;font-weight:500;margin:6px 0 14px;padding-left:.3em;}}
.gk-mission{{font-size:9.5px;line-height:1.75;color:#5b6b80;font-weight:500;letter-spacing:.03em;margin:12px 0 18px;}}
.gk-card{{display:inline-block;padding:12px 20px 12px 14px;background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.9);border-radius:10px;
  box-shadow:0 10px 26px rgba(60,90,130,.14);text-align:left;white-space:nowrap;}}
.gk-book{{display:inline-block;vertical-align:middle;width:28px;height:20px;position:relative;margin-right:12px;}}
.gk-book:before,.gk-book:after{{content:"";position:absolute;top:0;width:13px;height:20px;border:1.6px solid #17469c;}}
.gk-book:before{{left:0;border-radius:4px 0 0 4px;border-right:0;transform:skewY(6deg);}}
.gk-book:after{{right:0;border-radius:0 4px 4px 0;border-left:0;transform:skewY(-6deg);}}
.gk-cardtxt{{display:inline-block;vertical-align:middle;}}
.gk-t1{{font-size:10px;font-weight:800;letter-spacing:.08em;color:#17469c;}}
.gk-t2{{font-size:8.5px;color:#5b6b80;margin-top:2px;letter-spacing:.04em;}}
.gk-real{{margin-top:30px;font-size:8.5px;letter-spacing:.2em;line-height:1.8;color:#5b6b80;font-weight:600;}}
.gk-site{{margin-top:20px;font-size:9.5px;color:#5b6b80;letter-spacing:.06em;font-weight:500;white-space:nowrap;}}
.gk-globe{{display:inline-block;vertical-align:-2px;width:12px;height:12px;border:1px solid #5b6b80;border-radius:50%;position:relative;margin-right:6px;}}
.gk-globe:before{{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#5b6b80;}}
.gk-globe:after{{content:"";position:absolute;left:3px;top:0;width:4px;height:10px;border:1px solid #5b6b80;border-radius:50%;}}
"""

# 舞台內所有 px → cqw（405px = 100cqw），讓整個動畫跟著容器寬度縮放
def px_to_cqw(css):
    def conv(m):
        v = float(m.group(1))
        return f"{v / 4.05:.3f}cqw"
    return re.sub(r"(-?\d*\.?\d+)px", conv, css)


HTML = f"""<!-- ION BLUE GHK-Cu 動畫｜Shopline 商品描述版：無 JS / 無 SVG / 無 CSS 變數，整段貼進「原始碼」模式即可 -->
<style>{CSS}</style>
<div class="gk-wrap"><div class="gk-stage">

  <div class="gk-scene gk-s1">
    <div class="gk-s1-top">
      <div class="gk-logo"><span class="gk-ring"></span>ION BLUE</div>
      <div class="gk-h1">GHK-Cu</div>
      <div class="gk-sub">COPPER TRIPEPTIDE-1</div>
      <div class="gk-rule"></div>
    </div>
    {"".join(cells_html)}
    {"".join(membrane_html)}
    <div class="gk-drop"></div>
    <div class="gk-bead"><div class="gk-bead-in"></div></div>
    <div class="gk-s1-bottom">
      <div class="gk-tag">CELLULAR-LEVEL SKINCARE</div>
      <div class="gk-rule"></div>
      <div class="gk-copy">SUPPORTS SKIN HEALTH AT THE SOURCE.<br>SCIENCE-BACKED. VISIBLE RESULTS.</div>
    </div>
  </div>

  <div class="gk-scene gk-s2">
    {"".join(bubbles_html)}
    <div class="gk-bigbubble"></div>
    <div class="gk-dropper"><div class="gk-tube"></div><div class="gk-liquid"></div><div class="gk-neck"></div><div class="gk-tip"></div><div class="gk-tipdrop"></div></div>
    <div class="gk-s2-copy">
      <div class="gk-big">TIRED OF<br><span class="gk-grad">SKINCARE</span><br>PROMISES?</div>
      <div class="gk-line"></div>
      <div class="gk-small">LET'S GET TO THE<br><b>TRUTH ABOUT</b><br>YOUR SKIN.</div>
    </div>
  </div>

  <div class="gk-scene gk-s3">
    {leaves_html}
    <div class="gk-s3-content">
      <div class="gk-logo"><span class="gk-ring"></span>ION BLUE</div>
      <div class="gk-heart" style="animation-delay:.15s"><i></i>♡<i></i></div>
      <div class="gk-h2" style="animation-delay:.3s">THANK YOU</div>
      <div class="gk-fw" style="animation-delay:.4s">FOR WATCHING</div>
      <div class="gk-rule" style="animation-delay:.5s"></div>
      <div class="gk-mission" style="animation-delay:.6s">Your skin. Your journey.<br>Our mission is to educate,<br>empower, and elevate.</div>
      <div class="gk-card" style="animation-delay:.75s"><span class="gk-book"></span><span class="gk-cardtxt"><div class="gk-t1">FREE EDUCATION.</div><div class="gk-t2">Always. For everyone.</div></span></div>
      <div class="gk-real" style="animation-delay:.9s">REAL EDUCATION.<br>BETTER SKIN DECISIONS.</div>
      <div class="gk-site" style="animation-delay:1.05s"><span class="gk-globe"></span>ion-blue.com</div>
    </div>
  </div>

</div></div>
"""

# ⚠️ Shopline 會把連續的 }} / {{ 換成 &#125;&#125;（防 Angular 模板注入），塞進 <style> 後 CSS 整份崩掉
#    → 兩個大括號之間一律留空格
while "}}" in HTML: HTML = HTML.replace("}}", "} }")
while "{{" in HTML: HTML = HTML.replace("{{", "{ {")
out = pathlib.Path(__file__).parent
(out / "shopline_description.html").write_text(HTML, encoding="utf-8")

# 本機預覽：模擬商品描述欄位寬度，並可用 ?t= 無關的方式看不同時間點（改 animation-delay）
seek = "SEEK_PLACEHOLDER"
preview = f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shopline 商品描述版預覽</title>
<style>body{{margin:0;background:#f7f7f7;font-family:sans-serif}}.desc{{max-width:1200px;margin:0 auto;padding:40px 20px}}
.card{{border:4px solid red}}.line{{color:red}}.label{{background:#333;color:#fff}}</style>
</head><body><div class="desc"><p>（上方商品資訊）</p>
{HTML}
<p style="height:600px">（下方內容，測試可捲動）</p></div></body></html>"""
(out / "preview_shopline.html").write_text(preview, encoding="utf-8")
print("ok", len(HTML), "bytes")
