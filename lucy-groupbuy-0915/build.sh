#!/bin/bash
# 把各個區塊檔照編號順序組成 index.html
# 用法：bash build.sh
set -e
cd "$(dirname "$0")"
{
  cat _shell_head.html
  for f in [0-9][0-9]_*.html; do echo ""; cat "$f"; done
  cat _shell_foot.html
} > index.html
echo "index.html 已重建（$(wc -c < index.html | tr -d ' ') bytes）："
for f in [0-9][0-9]_*.html; do echo "  + $f"; done
