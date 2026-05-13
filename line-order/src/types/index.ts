export type Product = {
  id: string;
  code?: string;
  name: string;
  spec?: string;
  price: number;
  stock: number;
  images: string[];
  description?: string;
  active: boolean;
};

export type ProductGroup = {
  name: string;
  code?: string;
  images: string[];
  description?: string;
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
};

export type Settings = {
  title: string;
};
