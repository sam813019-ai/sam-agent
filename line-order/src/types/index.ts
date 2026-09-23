export type Product = {
  id: string;
  code?: string;
  name: string;
  spec?: string;
  price: number;
  costPrice: number;
  stock: number;
  images: string[];
  description?: string;
  active: boolean;
  category?: string;
};

export type ProductGroup = {
  name: string;
  code?: string;
  images: string[];
  description?: string;
  category?: string;
  variants: Product[];
};

export type OrderItem = {
  productId: string;
  productName: string;
  spec?: string;
  code?: string;
  quantity: number;
  unitPrice: number;
};

export type OrderPayload = {
  userId: string;
  displayName: string;
  items: OrderItem[];
  note?: string;
};

export type PaymentStatus = "待匯款" | "已回報" | "已確認" | "";

export type OrderRecord = {
  time: string;
  orderId: string;
  userId: string;
  displayName: string;
  items: string;
  total: number;
  note: string;
  status: string;
  campaign: string;
  /** J 欄。空字串代表這筆不走匯款核對流程（例如 HERA bot 直播現場加的單） */
  paymentStatus: PaymentStatus;
  /** K 欄 */
  paymentLast5: string;
  /** L 欄，Google Drive 圖片網址 */
  paymentProof: string;
  /** M 欄 */
  paymentReportedAt: string;
  /** N~R 欄：7-11 取貨資訊 */
  shipName: string;
  shipPhone: string;
  shipStoreName: string;
  shipStoreCode: string;
  shipFilledAt: string;
};

/** 待出貨清單：已確認收款且已填取貨資訊 */
export type ReadyToShip = {
  orderId: string;
  displayName: string;
  total: number;
  campaign: string;
  items: string;
  shipName: string;
  shipPhone: string;
  shipStoreName: string;
  shipStoreCode: string;
  shipFilledAt: string;
};

/** 待核對清單用；比 OrderRecord 多帶後台需要的欄位 */
export type PendingPayment = {
  orderId: string;
  time: string;
  displayName: string;
  userId: string;
  total: number;
  campaign: string;
  paymentLast5: string;
  paymentProof: string;
  paymentReportedAt: string;
};

export type Settings = {
  title: string;
  /** 匯款流程總開關；設定分頁 payment_enabled 不是 FALSE 就視為開啟 */
  paymentEnabled: boolean;
  paymentBank: string;
  paymentAccount: string;
  paymentNote: string;
  /** 每筆訂單的運費，設定分頁 shipping_fee，預設 60 */
  shippingFee: number;
  /** 隨貨贈品說明，設定分頁 gift_note。留空就不顯示 */
  giftNote: string;
};
