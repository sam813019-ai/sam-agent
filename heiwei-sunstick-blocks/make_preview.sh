#!/bin/bash
# 由 sunscreen_stick.html（Shopline 用的片段）產生本機預覽檔 preview.html
# 用法：bash make_preview.sh && open preview.html
cd "$(dirname "$0")"
{
  echo '<!DOCTYPE html>'
  echo '<html lang="zh-Hant"><head><meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1">'
  echo '<title>HEIWEI 爆白潤色防曬棒 — 本機預覽</title>'
  echo '<style>body{margin:0;background:#fff;}</style>'
  echo '</head><body>'
  cat sunscreen_stick.html
  echo '</body></html>'
} > preview.html
echo "preview.html 已更新（$(wc -c < preview.html) bytes）"
