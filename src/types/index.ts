import type {
  User,
  Address,
  Category,
  Product,
  Order,
  OrderItem,
  Payment,
  Coupon,
  DeliveryZone,
  PointTransaction,
  Rider,
  Banner,
  Review,
  ShopSetting,
} from "@/generated/prisma/client";

export type {
  User,
  Address,
  Category,
  Product,
  Order,
  OrderItem,
  Payment,
  Coupon,
  DeliveryZone,
  PointTransaction,
  Rider,
  Banner,
  Review,
  ShopSetting,
};

export type SelectedOption = {
  groupId:    string;
  groupName:  string;
  optionId:   string;
  optionName: string;
  priceAdded: number;
};

export type CartItem = {
  productId: string;
  name:      string;
  price:     number;
  image:     string | null;
  quantity:  number;
  options:   SelectedOption[];
  note?:     string;
};

export type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[];
  address: Address | null;
  payment: Payment | null;
  coupon: Coupon | null;
  deliveryZone: DeliveryZone | null;
  rider: Rider | null;
  user: Pick<User, "id" | "name" | "phone">;
};

export type ProductWithReviews = Product & {
  reviews: (Review & { user: Pick<User, "id" | "name"> })[];
  _avg?: { rating: number | null };
};

export type ProductOption = {
  id: string; name: string; priceAdded: number; isDefault: boolean; sortOrder: number;
};

export type ProductOptionGroup = {
  id: string; name: string; isRequired: boolean; maxChoices: number; sortOrder: number;
  options: ProductOption[];
};

export type ProductWithCategory = Product & {
  category: Category;
  optionGroups?: ProductOptionGroup[];
};

export type CategoryWithProducts = Category & {
  products: Product[];
};

export type UserWithStats = User & {
  _count: { orders: number };
  totalSpent?: number;
};

export type OrderStatusLabel = {
  label: string;
  color: string;
  bgColor: string;
};

export const ORDER_STATUS_MAP: Record<string, OrderStatusLabel> = {
  PENDING_PAYMENT: { label: "รอชำระเงิน", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  PENDING: { label: "รอรับออเดอร์", color: "text-orange-700", bgColor: "bg-orange-100" },
  CONFIRMED: { label: "รับออเดอร์แล้ว", color: "text-blue-700", bgColor: "bg-blue-100" },
  PREPARING: { label: "กำลังเตรียม", color: "text-purple-700", bgColor: "bg-purple-100" },
  READY: { label: "อาหารพร้อมแล้ว", color: "text-teal-700", bgColor: "bg-teal-100" },
  PICKED_UP: { label: "ไรเดอร์รับแล้ว", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  DELIVERING: { label: "กำลังส่ง", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  COMPLETED: { label: "ส่งแล้ว", color: "text-green-700", bgColor: "bg-green-100" },
  CANCELLED: { label: "ยกเลิก", color: "text-red-700", bgColor: "bg-red-100" },
};

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  QR_PROMPTPAY: "QR PromptPay",
  COD: "เงินสดปลายทาง",
};
