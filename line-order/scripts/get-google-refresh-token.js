/**
 * 一次性腳本：取得 Google OAuth Refresh Token
 * 執行方式：node scripts/get-google-refresh-token.js
 *
 * 需要先在下方填入 Google Cloud Console 拿到的 Client ID 和 Client Secret
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// ↓ 填入你的 OAuth 2.0 憑證（從 Google Cloud Console 取得，勿提交真實值）
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
// ↑

const REDIRECT_URI = 'http://localhost:3000';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent',
});

console.log('\n====================================');
console.log('請用瀏覽器打開以下網址：');
console.log('====================================\n');
console.log(authUrl);
console.log('\n====================================');
console.log('等待 Google 授權，請勿關閉此視窗...\n');

const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;
  if (!query.code) {
    res.end('沒有收到授權碼，請重試。');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(query.code);
    res.end('<h2>授權成功！請回到終端機查看 Refresh Token。</h2>');

    console.log('\n====================================');
    console.log('授權成功！請複製以下 Refresh Token 存到 Vercel：');
    console.log('====================================\n');
    console.log('GOOGLE_OAUTH_CLIENT_ID =', CLIENT_ID);
    console.log('GOOGLE_OAUTH_CLIENT_SECRET =', CLIENT_SECRET);
    console.log('GOOGLE_OAUTH_REFRESH_TOKEN =', tokens.refresh_token);
    console.log('\n====================================\n');
  } catch (e) {
    res.end('授權失敗：' + e.message);
    console.error('授權失敗:', e.message);
  }

  server.close();
});

server.listen(3000, () => {});
