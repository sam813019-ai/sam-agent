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
  /** 所屬連線（商品表 L 欄）。留空 = 跟著當期連線走 */
  campaign?: string;
};

export type ProductGroup = {
  name: string;
  code?: string;
  images: string[];
  description?: string;
  category?: string;
  /** 所屬連線，用來在下單頁分專區 */
  campaign?: string;
  variants: Product[];
};

export type OrderItem = {
  productId: string;
  productName: string;
  spec?: string;
  code?: string;
  /** 這項商品歸哪一檔連線，寫進訂單明細供叫貨統計分帳 */
  campaign?: string;
  quantity: number;
  unitPrice: number;
};

/** 取貨方式：超商取貨要收運費，門市自取免運 */
export type DeliveryMethod = "store" | "pickup";

export type OrderPayload = {
  userId: string;
  displayName: string;
  items: OrderItem[];
  note?: string;
  deliveryMethod?: DeliveryMethod;
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
  /** S 欄：取貨方式。舊訂單沒這欄，視為 store */
  deliveryMethod: DeliveryMethod;
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
  /** 客人回報匯款的時間，待出貨清單照這個排序 */
  paymentReportedAt: string;
  userId: string;
};

/** 同一客人、同一收件資訊的待出貨訂單併成一組，一次出貨一箱 */
export type ReadyToShipGroup = {
  key: string;
  displayName: string;
  shipName: string;
  shipPhone: string;
  shipStoreName: string;
  shipStoreCode: string;
  campaign: string;
  /** 整組合計金額 */
  total: number;
  /** 組內最早的付款回報時間，用來排序 */
  paymentReportedAt: string;
  orders: ReadyToShip[];
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
  /** T 欄付款方式：LINE Pay / 銀行轉帳；舊訂單為空 */
  paymentMethod: string;
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
  /** 免運門檻（商品小計達到就免運）；0 = 不啟用 */
  freeShippingThreshold: number;
  /** 是否提供門市自取（設定分頁 pickup_address 有填才啟用） */
  pickupEnabled: boolean;
  /** 自取選項顯示名稱，預設「門市自取」 */
  pickupLabel: string;
  /** 自取地點地址 */
  pickupAddress: string;
  /** LINE Pay 固定收款連結；留空 = 不顯示 LINE Pay 付款選項 */
  linepayUrl: string;
  /** 隨貨贈品說明，設定分頁 gift_note。留空就不顯示 */
  giftNote: string;
};
