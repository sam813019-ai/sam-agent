"""HEIWEI 爆白潤色防曬棒 — 15 秒直式廣告「光的一天」

用法：  python3 render.py            # 完整輸出 out/HEIWEI_光的一天_15s.mp4
        python3 render.py --preview  # 只出 out/preview.png 縮圖表，不壓影片

素材：src/ 內 101 張 1080×1920 RGBA（S3v3 加光源原檔，解壓自 HEIWEI品牌/官網動畫素材/）
改字卡、時間軸：只動下面 CONFIG 區。
"""
import glob, os, subprocess, sys, wave
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.signal import fftconvolve

# ───────────────────────── CONFIG ─────────────────────────
W, H, FPS, DUR = 1080, 1920, 30, 15.0
OUT = 'out/HEIWEI_光的一天_15s.mp4'

INK    = (52, 42, 40)      # 主字色 深炭
MUTED  = (120, 106, 100)   # 副字
ACCENT = (196, 101, 127)   # #C4657F 品牌粉
BG     = (244, 239, 234)   # 暖米白

# 場景：start, end, 影格起, 影格止, (時段, 標題, 副標)
SCENES = [
    (0.0,  2.2,  0,   0,  None),
    (2.2,  4.6,  0,  22, ('06:00 — 晨光', '一天，從一抹開始', '不沾手、不沾妝，三秒完成')),
    (4.6,  7.6,  22, 80, ('09:00 — 通勤', '旋開，就是全部', '防曬・潤色・保養，一支收掉三個步驟')),
    (7.6, 10.0,  80, 80, ('12:00 — 正午', 'SPF50+ ★★★★', '流汗不融・不斑駁・不泛白')),
    (10.0, 12.4, 80, 100, ('16:00 — 補擦', '底部收著一塊海綿', '補完直接推勻，妝面不糊、不留痕')),
    (12.4, 15.0, 80, 80, None),   # 結尾卡
]
END_TITLE = '爆白潤色防曬棒'
END_SPEC  = 'SPF50+ ★★★★ ・ NET 15g'
END_BRAND = 'HEIWEI  何謂美'
END_TAG   = '新品上市'

F = '/System/Library/Fonts/'
def font(path, size, idx=0): return ImageFont.truetype(F + path, size, index=idx)
F_SERIF_B = lambda s: font('Supplemental/Songti.ttc', s, 2)   # Songti TC Bold
F_SERIF_L = lambda s: font('Supplemental/Songti.ttc', s, 5)   # Songti TC Light
F_SANS    = lambda s: font('STHeiti Light.ttc', s, 0)         # Heiti TC Light
F_SANS_M  = lambda s: font('STHeiti Medium.ttc', s, 0)
F_DIDOT   = lambda s: font('Supplemental/Didot.ttc', s, 0)
F_DIDOT_I = lambda s: font('Supplemental/Didot.ttc', s, 1)

CROP = (320, 91, 760, 1615)   # 101 張 alpha 聯集外框（見 s3v3 README）
# ──────────────────────────────────────────────────────────

SRC = sorted(glob.glob('src/*.png'))
assert len(SRC) == 101, f'src/ 需要 101 張，目前 {len(SRC)}'
_cache = {}

def src(i):
    if i not in _cache:
        a = np.asarray(Image.open(SRC[i]).convert('RGBA').crop(CROP), np.float32) / 255
        a[..., :3] *= a[..., 3:]          # premultiply，混幀才不會出白邊
        _cache[i] = a
    return _cache[i]

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease_io(x): x = clamp(x); return 4*x**3 if x < .5 else 1 - (-2*x + 2)**3 / 2
def ease_out(x): x = clamp(x); return 1 - (1 - x)**3

def scene_at(t):
    for k, s in enumerate(SCENES):
        if t < s[1] or k == len(SCENES) - 1: return k, s

def frame_pos(t):
    k, (a, b, f0, f1, _) = scene_at(t)
    return f0 + (f1 - f0) * ease_io((t - a) / (b - a))

def product(fp):
    i = int(fp); j = min(i + 1, 100); w = fp - i
    p = src(i) if w < 1e-3 else src(i) * (1 - w) + src(j) * w
    return p   # premultiplied float, 440×1524

# ── 背景：一道暖光隨「一天」從左下（晨）移到頂（午）再到右（午後）
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def background(t):
    u = clamp(t / 12.4)
    ang = np.radians(210 - 230 * u)
    cx, cy = W/2 + 620*np.cos(ang), 820 - 700*np.sin(ang)
    if t >= 12.4: cx, cy = W/2, 640
    warm = np.array([(251, 222, 204), (255, 243, 222), (250, 216, 176)], np.float32)
    seg = u * 2; k = min(int(seg), 1); c = warm[k] * (1 - (seg - k)) + warm[k+1] * (seg - k)
    d = np.sqrt((XX - cx)**2 + (YY - cy)**2) / 1100
    g = np.exp(-d**2 * 1.6)[..., None]
    img = np.array(BG, np.float32) * (1 - g * .85) + c * g * .85
    vig = 1 - .10 * (((XX - W/2) / W)**2 + ((YY - H/2) / H)**2)[..., None] * 2.2
    return img * vig / 255

def composite(bg, prem, scale, cx, top, light_x=None):
    ph, pw = prem.shape[:2]
    nw, nh = int(pw * scale), int(ph * scale)
    a0 = prem[..., 3:]
    straight = np.concatenate([np.where(a0 > 1e-4, prem[..., :3] / np.maximum(a0, 1e-4), 0), a0], 2)
    im = Image.fromarray((np.clip(straight, 0, 1) * 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)
    p = np.asarray(im, np.float32) / 255
    p[..., :3] *= p[..., 3:]
    x0, y0 = int(cx - nw/2), int(top)
    # 陰影：抓 alpha 最下緣壓扁模糊
    alpha = p[..., 3]
    rows = np.where(alpha.max(1) > .5)[0]
    if len(rows):
        by = y0 + rows[-1]
        sh = Image.fromarray((alpha.max(0) * 255).astype(np.uint8)[None].repeat(18, 0)).resize((int(nw*1.25), 30))
        sh = sh.filter(ImageFilter.GaussianBlur(18))
        s = np.asarray(sh, np.float32) / 255 * .22
        sx = int(cx - sh.width/2); sy = by - 10
        bg[sy:sy+s.shape[0], sx:sx+s.shape[1]] *= (1 - s[..., None])
    rgb, a = p[..., :3], p[..., 3:]
    if light_x is not None:   # 正午光帶掃過膏體
        xx = np.arange(nw)[None, :] + np.arange(nh)[:, None] * .35
        band = np.exp(-((xx - light_x * (nw + nh*.35)) / 38)**2)[..., None]
        rgb = rgb + band * a * np.array([1, .93, .8]) * .55
    reg = bg[y0:y0+nh, x0:x0+nw]
    reg[:] = reg * (1 - a) + rgb
    return bg

# ── 文字
def spaced(draw, xy, text, f, fill, track=0, anchor='mm'):
    """字距排版（中心對齊）；・ 系統字型都沒有，換成 ·；拉丁字型遇中文改用宋體"""
    text = text.replace('・', '·')
    latin = 'Didot' in f.getname()[0]
    fonts = [F_SERIF_L(int(f.size * .92)) if latin and ord(ch) >= 0x2E80 else f for ch in text]
    widths = [draw.textlength(ch, font=g) for ch, g in zip(text, fonts)]
    total = sum(widths) + track * (len(text) - 1)
    x = xy[0] - total/2 if anchor == 'mm' else xy[0]
    for ch, w, g in zip(text, widths, fonts):
        draw.text((x, xy[1]), ch, font=g, fill=fill, anchor='lm')
        x += w + track

def text_layer(t):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    k, (a, b, f0, f1, cap) = scene_at(t)
    def fade(t0, dly=0, dur=.5, out=.3):
        tin = ease_out((t - t0 - dly) / dur)
        tout = 1 - clamp((t - (b - out)) / out) if k < len(SCENES) - 1 else 1
        return tin * tout, (1 - tin) * 28
    rgba = lambda c, o: c + (int(255 * o),)

    if k < len(SCENES) - 1:   # 頂部品牌小字
        o = ease_out(t / .8) * (1 - clamp((t - 12.1) / .3))
        spaced(d, (W/2, 120), 'HEIWEI', F_DIDOT(34), rgba(INK, o*.75), track=14)

    if k == 0:
        o, dy = fade(a, .3, .8)
        spaced(d, (W/2, 1520 + dy), 'A Day of Light', F_DIDOT_I(92), rgba(INK, o), track=2)
        o2, dy2 = fade(a, .8, .8)
        spaced(d, (W/2, 1640 + dy2), '光的一天', F_SERIF_L(50), rgba(ACCENT, o2), track=30)
        o3, _ = fade(a, 1.2, .6)
        spaced(d, (W/2, 1735), '何謂美 ・ 新品上市', F_SANS(30), rgba(MUTED, o3), track=8)
    elif cap:
        tag, title, sub = cap
        o, dy = fade(a, .05)
        spaced(d, (W/2, 1500 + dy), tag, F_SANS_M(32), rgba(ACCENT, o), track=6)
        o, dy = fade(a, .18, .6)
        tf = F_SANS_M(76) if title.startswith('SPF') else F_SERIF_B(76)
        spaced(d, (W/2, 1600 + dy), title, tf, rgba(INK, o), track=6)
        o, dy = fade(a, .35, .6)
        spaced(d, (W/2, 1700 + dy), sub, F_SANS(36), rgba(MUTED, o), track=3)
    else:   # 結尾卡
        o, dy = fade(a, .45, .7)
        spaced(d, (W/2, 1330 + dy), END_TITLE, F_SERIF_B(84), rgba(INK, o), track=12)
        o, dy = fade(a, .7, .6)
        spaced(d, (W/2, 1435 + dy), END_SPEC, F_SANS(36), rgba(MUTED, o), track=4)
        o, _ = fade(a, .95, .6)
        d.line((W/2 - 60, 1515, W/2 + 60, 1515), fill=rgba(ACCENT, o), width=2)
        spaced(d, (W/2, 1590), END_BRAND, F_DIDOT(46), rgba(INK, o), track=10)
        o, _ = fade(a, 1.2, .6)
        tw, th = 230, 64
        d.rounded_rectangle((W/2 - tw/2, 1680, W/2 + tw/2, 1680 + th), radius=32, fill=rgba(ACCENT, o))
        spaced(d, (W/2, 1680 + th/2 + 1), END_TAG, F_SANS_M(32), (255, 255, 255, int(255*o)), track=10)
    return lay

def render(n):
    t = n / FPS
    k, (a, b, *_ ) = scene_at(t)
    bg = background(t)
    u = (t - a) / (b - a)
    float_y = np.sin(t * 1.6) * 6
    if k == len(SCENES) - 1:
        scale, top = .66 + .02 * ease_out(u), 150 + float_y
    else:
        push = .80 + .025 * (t / 12.4)                 # 全片慢推
        if k == 0: push += .06 * (1 - ease_out(u))     # 開場由近拉遠
        scale, top = push, 150 + float_y + (1 - push/.8) * 300
    light = ease_io((t - 7.9) / 1.6) * 1.3 - .15 if k == 3 else None
    img = composite(bg, product(frame_pos(t)), scale, W/2, top, light)
    # 12.4s 暖光閃白轉場
    fl = np.exp(-((t - 12.4) / .16)**2)
    if fl > .01: img = img * (1 - fl) + np.array([1, .97, .92]) * fl
    # 片頭淡入
    if t < .4: img = img * (t / .4) + np.array(BG) / 255 * (1 - t / .4)
    out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    tl = text_layer(t); out.paste(tl, (0, 0), tl)
    return out.tobytes()

# ── 音樂：D 大調 pad + 鈴聲 + 開蓋/旋轉/落下音效，全部程式合成
SR = 44100
def audio():
    N = int(SR * DUR); tt = np.arange(N) / SR
    L = np.zeros(N); R = np.zeros(N)
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    chords = [(0, 2.2, [50, 57, 61, 66]), (2.2, 4.6, [47, 54, 61, 62, 66]),
              (4.6, 7.6, [43, 50, 54, 59, 62]), (7.6, 10.0, [40, 47, 54, 55, 59]),
              (10.0, 12.4, [45, 52, 57, 61, 64]), (12.4, 15.0, [38, 50, 57, 61, 64, 69])]
    for a, b, notes in chords:
        a2, b2 = max(0, a - .15), min(DUR, b + .9)
        i0, i1 = int(a2*SR), int(b2*SR); x = tt[i0:i1] - a2
        env = np.minimum(1, x / .6) * np.minimum(1, (b2 - a2 - x) / .9)
        for q, m in enumerate(notes):
            for det, pan in ((-.0025, .3), (.0025, .7)):
                f = hz(m) * (1 + det)
                v = sum(np.sin(2*np.pi*f*h*x) / h**1.8 for h in (1, 2, 3)) * env * .045
                L[i0:i1] += v * (1 - pan); R[i0:i1] += v * pan
    def add(at, sig, pan=.5, g=1.0):
        i = int(at * SR); n = min(len(sig), N - i)
        L[i:i+n] += sig[:n] * g * (1 - pan); R[i:i+n] += sig[:n] * g * pan
    def bell(m, d=2.2):
        x = np.arange(int(d*SR)) / SR; f = hz(m)
        return (np.sin(2*np.pi*f*x) + .4*np.sin(2*np.pi*f*2.76*x)*np.exp(-x*6)) * np.exp(-x*2.4) * .16
    rng = np.random.default_rng(7)
    def noise_sweep(d, f0, f1, g):
        n = int(d*SR); x = np.arange(n) / SR
        w = rng.standard_normal(n); f = np.linspace(f0, f1, n)
        ph = np.cumsum(2*np.pi*f/SR)
        s = fftconvolve(w, np.exp(-np.arange(200)/40), 'same') * np.sin(ph) * .5 + w * .02
        return s * np.sin(np.pi * x / d) ** 2 * g
    def tick():
        x = np.arange(int(.05*SR)) / SR
        return rng.standard_normal(len(x)) * np.exp(-x*140) * .12 + np.sin(2*np.pi*1900*x)*np.exp(-x*90)*.08
    for at, m, p in [(.35, 81, .4), (2.2, 78, .6), (4.6, 81, .4), (7.6, 83, .6), (10.0, 78, .4), (12.45, 86, .5)]:
        add(at, bell(m), p)
    for at, m in [(12.75, 81), (13.05, 78), (13.35, 74)]: add(at, bell(m, 2), .5, .7)
    add(2.35, noise_sweep(.7, 300, 2400, .06), .45)        # 開蓋
    for q in range(8): add(4.9 + q * .31, tick(), .35 + .3*(q % 2))  # 旋轉喀喀
    add(10.6, noise_sweep(.5, 1800, 200, .05), .55)        # 海綿倉落下
    x = np.arange(int(.18*SR)) / SR
    add(11.05, np.sin(2*np.pi*(140 - 60*x/.18)*x) * np.exp(-x*22) * .25)
    add(12.2, noise_sweep(.5, 400, 5000, .07))             # 閃白
    ir = rng.standard_normal(int(1.8*SR)) * np.exp(-np.arange(int(1.8*SR)) / SR * 3.2) * .012
    L = L + fftconvolve(L, ir)[:N] * .9; R = R + fftconvolve(R, ir[::-1])[:N] * .9
    fade = np.minimum(1, tt / .3) * np.minimum(1, (DUR - tt) / 1.2)
    st = np.stack([L, R], 1) * fade[:, None]
    st = np.tanh(st / np.abs(st).max() * 1.2) / np.tanh(1.2) * .89
    with wave.open('out/audio.wav', 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs('out', exist_ok=True)
    total = int(DUR * FPS)
    if '--preview' in sys.argv:
        picks = [15, 60, 110, 180, 250, 320, 355, 440]
        sheet = Image.new('RGB', (len(picks) * 270, 480))
        for q, n in enumerate(picks):
            sheet.paste(Image.frombytes('RGB', (W, H), render(n)).resize((270, 480)), (q * 270, 0))
        sheet.save('out/preview.png'); print('out/preview.png'); sys.exit()
    audio()
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', 'out/audio.wav',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT], stdin=subprocess.PIPE)
    with Pool() as pool:
        for q, buf in enumerate(pool.imap(render, range(total), chunksize=4)):
            ff.stdin.write(buf)
            if q % 45 == 0: print(f'{q}/{total}', flush=True)
    ff.stdin.close(); ff.wait()
    print('完成：', OUT)
