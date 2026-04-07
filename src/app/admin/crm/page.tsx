"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  Search, Star, Users, TrendingUp, ShoppingBag, UserCheck,
  Phone, Calendar, ChevronRight, Crown, Award, UserPlus, Clock,
  X, CreditCard, BarChart2, UtensilsCrossed, Coins, Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatDate, formatPhone, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────
const TAGS = [
  { key: "ALL",      label: "ทั้งหมด",    icon: Users,    color: "" },
  { key: "VIP",      label: "VIP",        icon: Crown,    color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { key: "ประจำ",    label: "ประจำ",      icon: Award,    color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "ใหม่",     label: "ใหม่",       icon: UserPlus, color: "text-green-600 bg-green-50 border-green-200" },
  { key: "inactive", label: "ไม่ active",  icon: Clock,   color: "text-gray-500 bg-gray-50 border-gray-200" },
];

const TAG_STYLES: Record<string, { pill: string; dot: string }> = {
  VIP:      { pill: "bg-yellow-50 text-yellow-700 border border-yellow-200", dot: "bg-yellow-400" },
  ประจำ:    { pill: "bg-blue-50 text-blue-700 border border-blue-200",        dot: "bg-blue-400" },
  ใหม่:     { pill: "bg-green-50 text-green-700 border border-green-200",     dot: "bg-green-400" },
  inactive: { pill: "bg-gray-100 text-gray-500 border border-gray-200",      dot: "bg-gray-300" },
};

const G = {
  grad: "linear-gradient(135deg, oklch(0.72 0.22 152) 0%, oklch(0.55 0.22 155) 100%)",
  primary: "oklch(0.72 0.22 152)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Customer = {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  pointsBalance: number;
  _count: { orders: number };
  totalSpent: number;
  customerTag: string;
  lastOrderDate: string | null;
  createdAt: string;
};

type CustomerDetail = Customer & {
  avgOrder: number;
  orders: Array<{
    id: string;
    total: number;
    status: string;
    createdAt: string;
    items: Array<{ product: { name: string }; quantity: number; unitPrice: number }>;
  }>;
  favoriteProducts: Array<{ id: string; name: string; image: string | null; totalOrdered: number }>;
  pointsTransactions: Array<{ id: string; amount: number; type: string; note: string | null; balanceAfter: number; createdAt: string }>;
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระ", PENDING: "รอรับ", CONFIRMED: "รับแล้ว",
  PREPARING: "กำลังทำ", READY: "พร้อมรับ", COMPLETED: "เสร็จสิ้น", CANCELLED: "ยกเลิก",
};
const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "text-amber-600 bg-amber-50", PENDING: "text-orange-600 bg-orange-50",
  CONFIRMED: "text-blue-600 bg-blue-50", PREPARING: "text-purple-600 bg-purple-50",
  READY: "text-teal-600 bg-teal-50", COMPLETED: "text-green-600 bg-green-50",
  CANCELLED: "text-red-500 bg-red-50",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function Avatar({ src, name, size = 10 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0 overflow-hidden`;
  if (src) return (
    <div className={cls}>
      <Image src={src} alt={name ?? ""} width={size * 4} height={size * 4} className="w-full h-full object-cover" />
    </div>
  );
  return (
    <div className={`${cls} flex items-center justify-center font-bold text-sm text-white`}
      style={{ background: G.grad }}>{initials}</div>
  );
}

function CustomerRow({ c, onClick }: { c: Customer; onClick: () => void }) {
  const tag = TAG_STYLES[c.customerTag];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
    >
      <Avatar src={c.avatar} name={c.name} size={10} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-800">{c.name ?? "ไม่ระบุชื่อ"}</p>
          {tag && (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", tag.pill)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", tag.dot)} />{c.customerTag}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Phone className="w-3 h-3" />{formatPhone(c.phone)}
          </span>
          {c.lastOrderDate && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Calendar className="w-3 h-3" />สั่งล่าสุด {formatDate(c.lastOrderDate)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-center hidden sm:block">
          <p className="text-xs text-gray-400">ออเดอร์</p>
          <p className="text-sm font-bold text-gray-700">{c._count.orders}</p>
        </div>
        <div className="text-center hidden md:block">
          <p className="text-xs text-gray-400">ยอดรวม</p>
          <p className="text-sm font-bold text-gray-700">{formatPrice(c.totalSpent)}</p>
        </div>
        <div className="text-center hidden md:block">
          <p className="text-xs text-gray-400">แต้ม</p>
          <p className="text-sm font-bold text-yellow-600 flex items-center gap-0.5 justify-center">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{c.pointsBalance}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  );
}

function DetailPanel({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<CustomerDetail>({
    queryKey: ["admin-customer-detail", customerId],
    queryFn: () =>
      fetch(`/api/admin/customers/${customerId}`).then((r) => r.json()).then((d) => d.data),
  });

  const tag = data ? TAG_STYLES[data.customerTag] : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-gray-50 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="font-bold text-base text-gray-800">รายละเอียดลูกค้า</h2>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : !data ? null : (
          <div className="flex-1 p-4 space-y-4">

            {/* Profile card */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-4">
                <Avatar src={data.avatar} name={data.name} size={14} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg text-gray-800">{data.name ?? "ไม่ระบุชื่อ"}</h3>
                    {tag && (
                      <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full", tag.pill)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", tag.dot)} />{data.customerTag}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <p className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" />{formatPhone(data.phone)}
                    </p>
                    {data.email && (
                      <p className="text-sm text-gray-400">{data.email}</p>
                    )}
                    <p className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />สมัครเมื่อ {formatDate(data.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: ShoppingBag,  label: "ออเดอร์ทั้งหมด",  value: `${data._count.orders} ครั้ง`,         color: "bg-blue-50 text-blue-600" },
                { icon: CreditCard,   label: "ยอดใช้จ่ายรวม",   value: formatPrice(data.totalSpent),           color: "bg-green-50 text-green-600" },
                { icon: BarChart2,    label: "เฉลี่ย/ออเดอร์",  value: formatPrice(Math.round(data.avgOrder)), color: "bg-purple-50 text-purple-600" },
                { icon: Coins,        label: "แต้มสะสม",         value: `${data.pointsBalance} แต้ม`,           color: "bg-yellow-50 text-yellow-600" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-white rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-bold text-sm text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Favorite products */}
            {data.favoriteProducts.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-sm text-gray-700">เมนูโปรด</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.favoriteProducts.map((p, i) => (
                    <div key={p.id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.image ? (
                          <Image src={p.image} alt={p.name ?? ""} width={32} height={32} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <span className="flex-1 text-sm text-gray-700 font-medium truncate">{p.name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {p.totalOrdered} ครั้ง
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent orders */}
            {data.orders.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-sm text-gray-700">ออเดอร์ล่าสุด</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.orders.map((o) => (
                    <div key={o.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-gray-400">#{o.id.slice(-6).toUpperCase()}</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ORDER_STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500")}>
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </div>
                        <span className="font-bold text-sm" style={{ color: G.primary }}>{formatPrice(o.total)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {o.items.map(i => `${i.product.name} x${i.quantity}`).join(", ")}
                      </p>
                      <p className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(o.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Point transactions */}
            {data.pointsTransactions.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-sm text-gray-700">ประวัติแต้ม</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.pointsTransactions.map((t) => {
                    const isEarn = t.type === "EARN";
                    return (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm text-gray-600">{t.note ?? (isEarn ? "รับแต้ม" : "ใช้แต้ม")}</p>
                          <p className="text-[11px] text-gray-400">{formatDateTime(t.createdAt)} · คงเหลือ {t.balanceAfter} แต้ม</p>
                        </div>
                        <span className={cn("font-bold text-sm", isEarn ? "text-green-600" : "text-red-500")}>
                          {isEarn ? "+" : "-"}{t.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminCRMPage() {
  const [search, setSearch] = useState("");
  const [tag, setTag]       = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", search, tag],
    queryFn: () =>
      fetch(`/api/admin/customers?search=${search}&tag=${tag}`)
        .then((r) => r.json())
        .then((d) => d.data),
  });

  const customers: Customer[] = data?.customers ?? [];
  const total: number         = data?.total ?? 0;
  const vipCount   = customers.filter(c => c.customerTag === "VIP").length;
  const newCount   = customers.filter(c => c.customerTag === "ใหม่").length;
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">ข้อมูลลูกค้า</h1>
          <p className="text-sm text-gray-400 mt-0.5">จัดการและวิเคราะห์ฐานลูกค้า</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}      label="ลูกค้าทั้งหมด" value={total}                    color="bg-blue-50 text-blue-600" />
          <StatCard icon={Crown}      label="VIP"            value={vipCount}                 color="bg-yellow-50 text-yellow-600" />
          <StatCard icon={UserPlus}   label="ลูกค้าใหม่"    value={newCount}                  color="bg-green-50 text-green-600" />
          <StatCard icon={TrendingUp} label="ยอดรวม"        value={formatPrice(totalSpent)}   color="bg-purple-50 text-purple-600" />
        </div>

        {/* Search + filter */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ค้นหาชื่อหรือเบอร์โทร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white rounded-xl border-gray-200"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {TAGS.map((t) => {
              const Icon = t.icon;
              const isSelected = tag === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTag(t.key)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : t.color
                        ? cn("border", t.color)
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1">ลูกค้า</div>
            <div className="w-16 text-center hidden sm:block">ออเดอร์</div>
            <div className="w-20 text-center hidden md:block">ยอดรวม</div>
            <div className="w-16 text-center hidden md:block">แต้ม</div>
            <div className="w-4" />
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 hidden md:block" />
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCheck className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">ไม่พบลูกค้า</p>
            </div>
          ) : (
            customers.map((c) => (
              <CustomerRow key={c.id} c={c} onClick={() => setSelectedId(c.id)} />
            ))
          )}

          {!isLoading && customers.length > 0 && (
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
              แสดง {customers.length} จาก {total} คน
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <DetailPanel customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
