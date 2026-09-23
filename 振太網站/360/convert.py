#!/usr/bin/env python3
# 解壓單一產品 zip → 依 _Main_NNNN 排序 → ffmpeg 轉 frame_NNN.webp → 刪 PNG
import os, re, sys, zipfile, subprocess, shutil, glob

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_ROOT = os.path.join(os.path.dirname(BASE), 'frames_out')  # 振太網站/frames_out
TMP_ROOT = '/tmp/jt360_work'
QUALITY = '82'

def find_zip(keyword):
    for f in os.listdir(BASE):
        if f.endswith('.zip') and f.startswith(keyword):
            return os.path.join(BASE, f)
    return None

def convert(keyword, slug):
    zp = find_zip(keyword)
    if not zp:
        print(f"[SKIP] 找不到 zip: {keyword}"); return False
    work = os.path.join(TMP_ROOT, slug)
    if os.path.exists(work): shutil.rmtree(work)
    os.makedirs(work, exist_ok=True)

    # 解壓
    with zipfile.ZipFile(zp) as z:
        z.extractall(work)

    # 找所有 png，依 _Main_ 數字排序
    pngs = []
    for root, _, files in os.walk(work):
        for fn in files:
            if fn.lower().endswith('.png') and '_Main_' in fn:
                m = re.search(r'_Main_(\d+)\.png$', fn)
                if m: pngs.append((int(m.group(1)), os.path.join(root, fn)))
    pngs.sort()
    if not pngs:
        print(f"[FAIL] {slug}: 無 PNG"); shutil.rmtree(work); return False

    outdir = os.path.join(OUT_ROOT, slug)
    if os.path.exists(outdir): shutil.rmtree(outdir)
    os.makedirs(outdir, exist_ok=True)

    # 逐張 cwebp 轉 frame_NNN.webp
    for i, (_, path) in enumerate(pngs):
        out = os.path.join(outdir, f'frame_{i:03d}.webp')
        r = subprocess.run(['cwebp', '-quiet', '-q', QUALITY, path, '-o', out],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f"[FAIL] {slug} cwebp #{i}: {r.stderr[:200]}"); return False

    n = len(glob.glob(os.path.join(outdir, '*.webp')))
    sizes = [os.path.getsize(f) for f in glob.glob(os.path.join(outdir, '*.webp'))]
    avg = sum(sizes)//len(sizes) if sizes else 0
    shutil.rmtree(work)  # 清 PNG
    print(f"[OK] {slug}: {n} 張 webp，平均 {avg//1024}KB，來源 {len(pngs)} PNG")
    return n == len(pngs)

if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2])
