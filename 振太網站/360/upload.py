#!/usr/bin/env python3
# 把 frames_out/<slug>/ 的 webp 透過 Novamira execute-php 上傳到伺服器
import os, sys, base64, glob, nova

OUT_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frames_out')
REMOTE_BASE = 'wp_upload_dir()["basedir"]."/zhentai/frames_webp/"'
BATCH = 30

def upload_slug(slug):
    local = os.path.join(OUT_ROOT, slug)
    files = sorted(glob.glob(os.path.join(local, 'frame_*.webp')))
    if not files:
        print(f"[SKIP] {slug}: 本機無 webp"); return False
    # 建目錄
    nova.php(f'$d={REMOTE_BASE}."{slug}"; if(!is_dir($d)) mkdir($d,0755,true); echo is_dir($d)?"DIR_OK":"DIR_FAIL";')
    # 分批寫入
    for i in range(0, len(files), BATCH):
        chunk = files[i:i+BATCH]
        entries = []
        for f in chunk:
            b64 = base64.b64encode(open(f,'rb').read()).decode()
            entries.append(f"'{os.path.basename(f)}'=>'{b64}'")
        arr = "array(" + ",".join(entries) + ")"
        code = (f'$d={REMOTE_BASE}."{slug}/"; $a={arr}; $n=0;'
                f'foreach($a as $fn=>$b){{ if(file_put_contents($d.$fn,base64_decode($b))!==false) $n++; }}'
                f'echo "WROTE ".$n;')
        r = nova.php(code)
        txt = r['result']['structuredContent']['data']['output']
        print(f"  {slug} [{i+len(chunk)}/{len(files)}] {txt}", flush=True)
    # 驗證張數 + 抽驗 filesize
    r = nova.php(f'$d={REMOTE_BASE}."{slug}/"; echo count(glob($d."*.webp"))." files; f000=".(@filesize($d."frame_000.webp"))." f240=".(@filesize($d."frame_240.webp"));')
    remote = r['result']['structuredContent']['data']['output']
    lf000 = os.path.getsize(os.path.join(local,'frame_000.webp'))
    lf240 = os.path.getsize(os.path.join(local,'frame_240.webp'))
    print(f"[DONE] {slug}: 本機 {len(files)} 張 (f000={lf000} f240={lf240}) | 伺服器 {remote}")
    return f"{len(files)} files" in remote

if __name__ == "__main__":
    nova.init()
    slugs = sys.argv[1:] if len(sys.argv) > 1 else sorted(os.listdir(OUT_ROOT))
    fails = []
    for s in slugs:
        if not os.path.isdir(os.path.join(OUT_ROOT, s)): continue
        if not upload_slug(s): fails.append(s)
    print(f"\n上傳完成。失敗: {fails or '無'}")
