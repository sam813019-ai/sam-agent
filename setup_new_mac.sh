#!/bin/bash
# ============================================
# 陳育慶 Claude Code 新機快速設定腳本
# 執行方式：bash setup_new_mac.sh
# ============================================

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}[1/8] 安裝 Homebrew（若已有則跳過）${NC}"
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "  ✓ Homebrew 已存在"
fi

echo -e "${GREEN}[2/8] 安裝 trash 與 Node.js${NC}"
brew install trash node 2>/dev/null || true
echo "  ✓ trash / node 安裝完成"

echo -e "${GREEN}[3/8] 安裝 Claude Code CLI${NC}"
npm install -g @anthropic-ai/claude-code
echo "  ✓ Claude Code 安裝完成"

echo -e "${GREEN}[4/8] 設定 ~/.zshrc（rm 安全別名）${NC}"
ZSHRC="$HOME/.zshrc"
if ! grep -q "alias rm='trash'" "$ZSHRC" 2>/dev/null; then
  cat >> "$ZSHRC" <<'EOF'

# Claude Code 安全設定：rm -> trash（可還原），永久刪除用 rm!
alias rm='trash'
alias rm!='/bin/rm'
EOF
  echo "  ✓ 已寫入 ~/.zshrc"
else
  echo "  ✓ 別名已存在，跳過"
fi

echo -e "${GREEN}[5/8] 建立 ~/.claude/settings.json（黑名單 + acceptEdits）${NC}"
mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" <<'EOF'
{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Bash(rm -fr *)",
      "Bash(rm -r *)",
      "Bash(rm -R *)",
      "Bash(rm -f *)",
      "Bash(sudo *)",
      "Bash(dd *)",
      "Bash(mkfs*)",
      "Bash(diskutil erase*)",
      "Bash(chmod 777 *)",
      "Bash(chmod -R 777 *)",
      "Bash(git reset --hard*)",
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(git clean -f*)",
      "Bash(git branch -D*)",
      "Bash(shutdown*)",
      "Bash(reboot*)",
      "Bash(: >*)",
      "Bash(truncate *)"
    ],
    "defaultMode": "acceptEdits"
  }
}
EOF
echo "  ✓ settings.json 建立完成"

echo -e "${GREEN}[6/8] 安裝 uv（Python 套件管理）${NC}"
if ! command -v uv &>/dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # 讓當前 shell 能找到 uv
  export PATH="$HOME/.local/bin:$PATH"
  echo "  ✓ uv 安裝完成"
else
  echo "  ✓ uv 已存在"
fi

echo -e "${GREEN}[7/8] 安裝 workspace-mcp（Google Workspace 本機版）${NC}"
if ! command -v workspace-mcp &>/dev/null; then
  uv tool install workspace-mcp
  echo "  ✓ workspace-mcp 安裝完成"
else
  echo "  ✓ workspace-mcp 已存在"
fi

echo -e "${GREEN}[8/8] 註冊 MCP 工具到 Claude Code${NC}"

# 偵測 workspace-mcp 路徑
WS_MCP_PATH=$(which workspace-mcp 2>/dev/null || echo "$HOME/.local/bin/workspace-mcp")

add_mcp_if_missing() {
  local NAME="$1"
  shift
  if claude mcp list 2>/dev/null | grep -q "^$NAME:"; then
    echo "  ✓ $NAME 已存在，跳過"
  else
    claude mcp add "$NAME" "$@" 2>/dev/null && echo "  ✓ $NAME 加入成功" || echo "  ⚠ $NAME 加入失敗（可登入 claude 後手動加）"
  fi
}

add_mcp_if_missing "google-workspace" "$WS_MCP_PATH" -- --tools gmail calendar drive
add_mcp_if_missing "playwright" -- npx -y @playwright/mcp@latest
add_mcp_if_missing "firecrawl" -- npx -y firecrawl-mcp
add_mcp_if_missing "filesystem" -- npx -y @modelcontextprotocol/server-filesystem "$HOME/Desktop" "$HOME/Documents" "$HOME/Downloads"
add_mcp_if_missing "novamira-waynebear20996-mlebi-wpcomstaging-com" -- npx -y @automattic/mcp-wordpress-remote@latest

echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  設定完成！接下來請執行：${NC}"
echo -e "${YELLOW}  1. source ~/.zshrc${NC}"
echo -e "${YELLOW}  2. claude（用同個帳號登入）${NC}"
echo -e "${YELLOW}  3. workspace-mcp --single-user${NC}"
echo -e "${YELLOW}     （跳出瀏覽器 → 用 sam813019@gmail.com 授權）${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""
echo -e "${RED}以下 MCP 需要在 claude.ai 網頁重新授權：${NC}"
echo "  - Gmail / Google Calendar / Google Drive（遠端版）"
echo "  - Vercel、Meta Ads、Canva"
echo "  → 開啟 claude 後，各工具首次使用時會自動提示授權"
