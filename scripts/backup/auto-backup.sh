#!/bin/zsh
# sam-agent 每日自動備份：commit 未存的改動並推到 GitHub
# 由 launchd 每天 05:00 執行（Mac 睡眠時會在喚醒後補跑）
# 手動執行：zsh ~/Downloads/sam-agent/scripts/backup/auto-backup.sh

set -u
REPO="/Users/mac/Downloads/sam-agent"
LOG="$REPO/scripts/backup/backup.log"
MAX_MB=90          # 單檔上限，GitHub 硬限制 100MB
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

log() { print -r -- "$(date '+%F %T')  $*" >> "$LOG"; }
notify() { /usr/bin/osascript -e "display notification \"$1\" with title \"sam-agent 備份\"" 2>/dev/null; }

cd "$REPO" || { log "✗ 找不到 repo"; exit 1; }

# ── 保護條件 ────────────────────────────────────────────
BR=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BR" != "main" ]]; then
  log "⏭  目前在 $BR 分支，不是 main，跳過（避免誤推未完成的工作）"
  exit 0
fi
if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
  log "⏭  rebase/merge 進行中，跳過"
  exit 0
fi

# ── 大檔守門（GitHub 單檔 100MB 會整批推送失敗）────────
BIG=$(git status --porcelain --untracked-files=all | sed 's/^...//;s/^"//;s/"$//' | while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  sz=$(stat -f%z "$f" 2>/dev/null) || continue
  (( sz > MAX_MB * 1048576 )) && print -r -- "$f ($((sz/1048576))MB)"
done)
if [[ -n "$BIG" ]]; then
  log "✗ 有超過 ${MAX_MB}MB 的檔案，未備份。請加進 .gitignore 或改放雲端硬碟："
  print -r -- "$BIG" | while IFS= read -r l; do log "     $l"; done
  notify "有大檔擋住備份，看 backup.log"
  exit 1
fi

# ── 子模組（kingsway）先推 ─────────────────────────────
if [[ -d kingsway-website/.git || -f kingsway-website/.git ]]; then
  ( cd kingsway-website
    if [[ -n "$(git status --porcelain)" ]]; then
      git add -A && git commit -q -m "chore: 自動備份 $(date '+%F')" && log "   kingsway：已 commit 本機改動"
    fi
    if [[ -n "$(git log --oneline @{u}..HEAD 2>/dev/null)" ]]; then
      git push -q origin HEAD 2>>"$LOG" && log "   kingsway：已推送"
    fi )
fi

# ── 主 repo ────────────────────────────────────────────
CHANGED=$(git status --porcelain --untracked-files=all | wc -l | tr -d ' ')
if (( CHANGED > 0 )); then
  git add -A
  N=$(git diff --cached --numstat | wc -l | tr -d ' ')
  git commit -q -m "chore: 自動備份 $(date '+%F')

$N 個檔案。由 scripts/backup/auto-backup.sh 於每日 05:00 自動產生。" \
    && log "✓ 已 commit $N 個檔案"
else
  log "－ 無改動"
fi

# ── 推送 ───────────────────────────────────────────────
AHEAD=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ')
if (( AHEAD > 0 )); then
  if git push -q origin main 2>>"$LOG"; then
    log "✓ 已推送 $AHEAD 個 commit 到 GitHub"
  else
    log "✗ 推送失敗（見上方 git 訊息）"
    notify "推送失敗，看 backup.log"
    exit 1
  fi
else
  log "－ 與 GitHub 同步中，無需推送"
fi

# log 只留最近 500 行
tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
