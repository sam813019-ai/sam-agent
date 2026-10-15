# heiwei-line-cards

LINE 推播（Flex Message）用的圖床。

- 圖在 `cards/`，1040×1040 PNG
- 原始版型是同層的 `_*.html` + `_card_base.css`，改完用 headless Chrome 截圖重出
- LINE 要求圖片網址必須是 HTTPS、公開可讀，所以放 Vercel

## 重新產圖

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --window-size=1040,1040 --screenshot=cards/v2return.png "file://$PWD/_v2return.html"
vercel --prod
```

⚠️ 版型高度固定 1040px，`.card` 用 `justify-content:space-between`。
字級調大容易讓頁尾被切掉 —— 改完一定要看圖再部署。
