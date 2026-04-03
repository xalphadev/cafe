"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Users, TrendingUp, Clock, TrendingDown,
  Minus, AlertCircle, ChevronRight, Star, Package,
  CalendarDays, Banknote, ReceiptText,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatPrice, formatDateTime, formatPhone } from "@/lib/format";
import { ORDER_STATUS_MAP } from "@/types";
import { cn } from "@/lib/utils";

// ── helpers ────────────────────────────────────────────────────────────────
function trendPct(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "สวัสดีตอนเช้า";
  if (h < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}
function todayTH() {
  return new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// ── Trend badge ────────────────────────────────────────────────────────────
function Trend({ current, prev }: { current: number; prev: number }) {
  const pct = trendPct(current, prev);
  if (pct === 0 && prev === 0) return null;
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
      flat   ? "bg-slate-100 text-slate-400"
             : up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
    )}>
      {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {flat ? "เท่าเดิม" : `${up ? "+" : ""}${pct}%`}
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor, trend, onClick,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  trend?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-4 flex flex-col gap-2 shadow-sm",
        onClick && "cursor-pointer active:scale-[0.98] transition-transform"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {trend}
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border/50 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold text-primary">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

// ── STATUS colors re-used ──────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-400", PENDING_PAYMENT: "bg-yellow-400",
  CONFIRMED: "bg-blue-400", PREPARING: "bg-violet-500",
  READY: "bg-teal-500", DELIVERING: "bg-indigo-500",
  COMPLETED: "bg-green-500", CANCELLED: "bg-slate-300",
};

// ═══════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetch("/api/admin/dashboard").then(r => r.json()).then(d => d.data),
    refetchInterval: 30000,
  });

  const m = data?.metrics;

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-slate-100">

      {/* ── Greeting header ─────────────────────────────── */}
      <div className="bg-white px-4 pt-5 pb-4 shadow-sm">
        <p className="text-xs text-muted-foreground">{todayTH()}</p>
        <h1 className="font-bold text-lg mt-0.5">{greeting()}</h1>
        <p className="text-sm text-muted-foreground">ช่วงเวลาคาเฟ่</p>
      </div>

      <div className="p-3 space-y-3 pb-28">

        {/* ── Pending alert ───────────────────────────────── */}
        {!isLoading && m?.pendingOrders > 0 && (
          <button
            onClick={() => router.push("/admin/orders")}
            className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 text-left active:opacity-80 transition-opacity"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                {m.pendingOrders}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-amber-900">มีออเดอร์รอดำเนินการ</p>
              <p className="text-xs text-amber-700">กดเพื่อจัดการ</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
          </button>
        )}

        {/* ── Stat cards 2×2 ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="ออเดอร์วันนี้"
            value={isLoading ? "—" : (m?.todayOrders ?? 0)}
            sub={isLoading ? "" : `เมื่อวาน ${m?.yesterdayOrders ?? 0} รายการ`}
            icon={ShoppingBag}
            iconBg="bg-sky-100" iconColor="text-sky-600"
            trend={!isLoading && <Trend current={m?.todayOrders ?? 0} prev={m?.yesterdayOrders ?? 0} />}
            onClick={() => router.push("/admin/orders")}
          />
          <StatCard
            label="รายได้วันนี้"
            value={isLoading ? "—" : formatPrice(m?.todayRevenue ?? 0)}
            sub={isLoading ? "" : `เมื่อวาน ${formatPrice(m?.yesterdayRevenue ?? 0)}`}
            icon={TrendingUp}
            iconBg="bg-emerald-100" iconColor="text-emerald-600"
            trend={!isLoading && <Trend current={m?.todayRevenue ?? 0} prev={m?.yesterdayRevenue ?? 0} />}
          />
          <StatCard
            label="รายได้เดือนนี้"
            value={isLoading ? "—" : formatPrice(m?.monthRevenue ?? 0)}
            sub={isLoading ? "" : `${m?.monthOrders ?? 0} ออเดอร์`}
            icon={CalendarDays}
            iconBg="bg-violet-100" iconColor="text-violet-600"
          />
          <StatCard
            label="เฉลี่ย/ออเดอร์"
            value={isLoading ? "—" : formatPrice(m?.avgOrderValue ?? 0)}
            sub="วันนี้"
            icon={ReceiptText}
            iconBg="bg-orange-100" iconColor="text-orange-600"
          />
        </div>

        {/* ── Secondary stats row ────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="font-bold text-lg leading-none">{isLoading ? "—" : (m?.pendingOrders ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">รอดำเนินการ</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-lg leading-none">{isLoading ? "—" : (m?.totalCustomers ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">ลูกค้าทั้งหมด</p>
            </div>
          </div>
        </div>

        {/* ── Revenue chart ───────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">รายได้ 7 วันล่าสุด</p>
              {!isLoading && data?.dailyRevenue && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  รวม {formatPrice(data.dailyRevenue.reduce((s: number, d: any) => s + d.revenue, 0))}
                </p>
              )}
            </div>
            <Banknote className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="px-1 pb-3">
            {isLoading ? (
              <div className="h-44 mx-3 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <AreaChart data={data?.dailyRevenue ?? []} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="oklch(0.68 0.20 148)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="oklch(0.68 0.20 148)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    tickFormatter={v => v === 0 ? "" : `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="revenue"
                    stroke="oklch(0.68 0.20 148)" strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={{ r: 3, fill: "oklch(0.68 0.20 148)", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "oklch(0.68 0.20 148)", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Top products + Recent orders side by side on desktop ── */}
        <div className="grid md:grid-cols-2 gap-3">

          {/* Top products */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <p className="font-bold text-sm">สินค้าขายดี</p>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                    <div className="flex-1 h-3 bg-slate-200 rounded" />
                    <div className="w-10 h-3 bg-slate-200 rounded" />
                  </div>
                ))
              ) : (data?.topProducts ?? []).slice(0, 5).map((p: any, i: number) => (
                <div key={p.productId} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    i === 0 ? "bg-amber-100 text-amber-700"
                    : i === 1 ? "bg-slate-100 text-slate-600"
                    : i === 2 ? "bg-orange-100 text-orange-600"
                    : "bg-slate-50 text-slate-400"
                  )}>{i + 1}</span>
                  <p className="flex-1 text-sm truncate">{p.product?.name ?? "—"}</p>
                  <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
                    {p._sum.quantity ?? 0} ชิ้น
                  </span>
                </div>
              ))}
              {!isLoading && (data?.topProducts ?? []).length === 0 && (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Package className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">ยังไม่มีข้อมูล</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent orders */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-500" />
                <p className="font-bold text-sm">ออเดอร์วันนี้</p>
              </div>
              <button onClick={() => router.push("/admin/orders")} className="text-xs text-primary font-medium">
                ดูทั้งหมด
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 h-3 bg-slate-200 rounded" />
                    <div className="w-12 h-3 bg-slate-200 rounded" />
                  </div>
                ))
              ) : (data?.recentOrders ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">ยังไม่มีออเดอร์วันนี้</p>
                </div>
              ) : (data?.recentOrders ?? []).map((order: any) => {
                const statusInfo = ORDER_STATUS_MAP[order.status];
                const dot = STATUS_DOT[order.status] ?? "bg-slate-300";
                return (
                  <button
                    key={order.id}
                    onClick={() => router.push("/admin/orders")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-0.5", dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {order.user.name || formatPhone(order.user.phone)}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {order.items.slice(0, 2).map((i: any) => i.product.name).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                      <p className={cn("text-[10px] font-medium", statusInfo?.color)}>{statusInfo?.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
