#!/usr/bin/env bash
# 由 vip_shopline.html（唯一真相來源）產生預覽／Artifact 版 vip_artifact.html
# 只加一層外框：頁面標題、Noto Sans TC 網頁字型、頁面底色。內容完全相同。
set -euo pipefail
cd "$(dirname "$0")"
{
  cat <<'HEAD'
<title>何謂美會員制度</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap">
<style>
  /* 預覽外框：模擬 Shopline 頁面（varm 主題為白底）的實際呈現環境 */
  body{background:#F4F5F3; margin:0; padding:40px 0 64px;}
  @media (max-width:640px){ body{padding:24px 0 40px;} }
</style>
HEAD
  cat vip_shopline.html
} > vip_artifact.html
echo "→ vip_artifact.html ($(wc -c < vip_artifact.html) bytes)"
