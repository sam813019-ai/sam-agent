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

## 領取型優惠券的連結機制（BIND100）

Shopline 的領券連結是 `https://www.heiweibeauty.com/get_coupon/<promotion_id>`。
未登入點擊會 302 到 `/users/sign_in?result=not_login&promotion_id=<id>`，
**promotion_id 會被帶著走，登入完成即自動領券**。

所以「要登入才領得到」本身就是閘門：
- 不必在信裡放折扣碼（放了就能被轉傳、不綁定也能用）
- 不必寫程式輪詢偵測綁定再發碼
- 顧客點連結 →「使用 LINE 登入」→ 綁定與領券同時完成，零等待

券建好後執行 `python3 set_claim_link.py --code BIND100` 把 id 填進
`cards/bind100.flex.json`，同一條連結也可貼到 LINE 加入好友歡迎訊息與關鍵字自動回應。
