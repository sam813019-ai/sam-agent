"use client";

import { useEffect, useState } from "react";

type Profile = { userId: string; displayName: string };

export default function RegisterPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [realName, setRealName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [bound, setBound] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("LIFF ID 未設定");

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        setProfile({ userId: p.userId, displayName: p.displayName });
        setRealName(p.displayName);

        // 靜默登記一次（即使使用者沒按送出，也先把 userId/暱稱存起來）
        fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: p.userId,
            displayName: p.displayName,
          }),
        }).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "初始化失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    if (!profile) return;
    if (!realName.trim()) {
      setError("請輸入您的姓名");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          realName: realName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登記失敗");
      setBound(Number(data.bound) || 0);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登記失敗");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500">
        載入中…
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow p-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold mb-2">登記完成</h1>
          <p className="text-gray-600 text-sm mb-5">
            {bound > 0 ? (
              <>
                已為您綁定 <span className="font-semibold text-brand">{bound}</span> 筆歷史訂單，
                <br />
                現在可以在「我的訂單」查看。
              </>
            ) : (
              <>之後直播下單、連線開團都可以在這裡看到您的訂單紀錄。</>
            )}
          </p>
          <a
            href="/"
            className="block w-full py-3 bg-brand text-white rounded-xl font-medium"
          >
            前往下單
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow p-6">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">👋</div>
          <h1 className="text-xl font-bold">歡迎加入會員</h1>
          <p className="text-sm text-gray-500 mt-1">
            填寫一次，之後就能查詢所有訂單
          </p>
        </div>

        {profile && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
            <div className="text-xs text-gray-500">LINE 暱稱</div>
            <div className="font-medium">{profile.displayName}</div>
          </div>
        )}

        <label className="block text-sm font-medium mb-0.5">
          您的姓名
        </label>
        <p className="text-xs text-gray-400 mb-1">
          直播下單用，預設跟LINE一樣不用更改也可以
        </p>
        <input
          type="text"
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
          placeholder="例如：陳小美"
          className="w-full p-3 border rounded-xl text-base mb-4"
        />

        {error && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-3 bg-brand text-white rounded-xl font-medium disabled:opacity-40"
        >
          {submitting ? "送出中…" : "送出登記"}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
          您的姓名會用來對應直播期間店員幫您記的訂單，
          <br />
          這樣您在 LIFF「我的訂單」就能看到所有下單紀錄。
        </p>
      </div>
    </main>
  );
}
