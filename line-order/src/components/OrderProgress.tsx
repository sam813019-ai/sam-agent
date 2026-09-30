"use client";

/**
 * 訂單進度條。客人最常問的就是「我匯款了然後呢」，
 * 所以每個狀態都要明講「接下來會發生什麼、要不要她動作」。
 */

type Props = {
  paymentStatus: string;
  hasShipInfo: boolean;
  shipped: boolean;
  pickup?: boolean;
};

const STEPS = ["匯款回報", "核對確認", "填取貨資訊", "出貨"];

export default function OrderProgress({
  paymentStatus,
  hasShipInfo,
  shipped,
  pickup = false,
}: Props) {
  // 目前完成到第幾步（0 = 還沒回報匯款）
  let done = 0;
  if (paymentStatus === "已回報") done = 1;
  if (paymentStatus === "已確認") done = 2;
  if (paymentStatus === "已確認" && hasShipInfo) done = 3;
  if (shipped) done = 4;

  const labels = pickup
    ? ["匯款回報", "核對確認", "填取貨資訊", "備貨完成"]
    : STEPS;

  const next = (() => {
    if (shipped) {
      return pickup
        ? { who: "done", text: "已備貨完成，可以前來取貨了 🫶" }
        : { who: "done", text: "已出貨，包裹到門市後 7-11 會發簡訊通知您 🫶" };
    }
    if (paymentStatus === "已確認" && hasShipInfo) {
      return { who: "us", text: "我們正在為您備貨，出貨後會再通知您" };
    }
    if (paymentStatus === "已確認") {
      return { who: "you", text: "請填寫取貨資訊，我們才能為您安排出貨" };
    }
    if (paymentStatus === "已回報") {
      return {
        who: "us",
        text: "我們正在核對您的匯款，核對完成後會傳取貨資訊表單給您填寫，請耐心等候 🙏",
      };
    }
    return {
      who: "you",
      text: "請完成匯款並回報後五碼或截圖，我們核對後才算完成訂單",
    };
  })();

  const tone =
    next.who === "you"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : next.who === "us"
        ? "bg-blue-50 border-blue-200 text-blue-800"
        : "bg-green-50 border-green-200 text-green-800";

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {labels.map((label, i) => {
          const isDone = i < done;
          const isCurrent = i === done;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isDone
                      ? "bg-brand-accent text-white"
                      : isCurrent
                        ? "bg-white text-brand-accent border-2 border-brand-accent"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span
                  className={`text-[10px] mt-0.5 whitespace-nowrap ${
                    isDone || isCurrent
                      ? "text-gray-700 font-medium"
                      : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <span
                  className={`h-0.5 flex-1 mx-1 mb-4 ${
                    isDone ? "bg-brand-accent" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className={`text-xs rounded-lg border px-2.5 py-1.5 ${tone}`}>
        {next.who === "you" ? "👉 需要您：" : next.who === "us" ? "⏳ 我們處理中：" : "✅ "}
        {next.text}
      </p>
    </div>
  );
}
