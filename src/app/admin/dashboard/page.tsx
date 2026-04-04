"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Users, TrendingUp, Clock, TrendingDown,
  Minus, AlertCircle, ChevronRight, Star, Package,
  CalendarDays, Banknote, ReceiptText, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { formatPrice, formatDateTime, formatPhone } from "@/lib/format";
import { ORDER_STATUS_MAP } from "@/types";
import { cn } from "@/lib/utils";

// ── Color palette ──────────────────────────────────────────────────────────
const G = {
  primary:   "oklch(0.50 0.22 155)",
  grad:      "linear-gradient(135deg, oklch(0.55 0.20 152), oklch(0.50 0.22 155))",
  gradLight: "linear-gradient(135deg, oklch(0.94 0.05 152), oklch(0.97 0.014 152))",
};

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
  return new Date().toLocaleDateString("th-TH-u-ca-gregory", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// ── Trend badge ────────────────────────────────────────────────────────────
function Trend({ current, prev }: { current: number; prev: number }) {
  const pct = trendPct(current, prev);
  if (pct === 0 && prev === 0) return null;
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full",
      flat   ? "bg-slate-100 text-slate-500"
             : up ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
    )}>
      {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {flat ? "เท่าเดิม" : `${up ? "+" : ""}${pct}%`}
    </span>
  );
}

// ── Custom bar tooltip ─────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-center">
      <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: G.primary }}>{formatPrice(payload[0].value)}</p>
    </div>
  );
}

// ── STATUS colors ──────────────────────────────────────────────────────────
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

  // Find today's bar index for chart highlighting
  const todayIdx = (data?.dailyRevenue ?? []).length - 1;

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-slate-50">

      {/* ── Clean white header ───────────────────────────── */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-slate-100">
        <p className="text-xs text-slate-400">{todayTH()}</p>
        <h1 className="font-bold text-lg text-slate-800 mt-0.5">{greeting()}</h1>
        <p className="text-sm text-slate-400">ช่วงเวลาคาเฟ่</p>
      </div>

      <div className="p-3 space-y-3 pb-28">

        {/* ── Today summary card ───────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-3.5 pb-1 flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full" style={{ background: G.primary }} />
            <p className="text-sm font-bold text-slate-700">สรุปวันนี้</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {[
              {
                label: "ออเดอร์",
                value: isLoading ? "—" : (m?.todayOrders ?? 0),
                sub: isLoading ? "" : `เมื่อวาน ${m?.yesterdayOrders ?? 0} รายการ`,
                trend: !isLoading ? trendPct(m?.todayOrders ?? 0, m?.yesterdayOrders ?? 0) : null,
                icon: ShoppingBag, iconBg: "bg-sky-100", iconColor: "text-sky-500",
                onClick: () => router.push("/admin/orders"),
              },
              {
                label: "รายได้",
                value: isLoading ? "—" : formatPrice(m?.todayRevenue ?? 0),
                sub: isLoading ? "" : `เมื่อวาน ${formatPrice(m?.yesterdayRevenue ?? 0)}`,
                trend: !isLoading ? trendPct(m?.todayRevenue ?? 0, m?.yesterdayRevenue ?? 0) : null,
                icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-500",
                onClick: undefined,
              },
            ].map(s => (
              <button
                key={s.label}
                onClick={s.onClick}
                disabled={!s.onClick}
                className="flex flex-col gap-1 px-4 py-3.5 text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", s.iconBg)}>
                    <s.icon className={cn("w-4 h-4", s.iconColor)} />
                  </div>
                  {s.trend !== null && s.trend !== 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      s.trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                    )}>
                      {s.trend > 0 ? "+" : ""}{s.trend}%
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-slate-800 mt-1">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-[10px] text-slate-400">{s.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Pending alert ───────────────────────────────── */}
        {!isLoading && m?.pendingOrders > 0 && (
          <button
            onClick={() => router.push("/admin/orders")}
            className="w-full flex items-center gap-4 rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              boxShadow: "0 6px 20px rgba(245,158,11,0.45)",
            }}
          >
            {/* Pulsing icon */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-amber-600 text-[12px] font-black flex items-center justify-center"
                style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}>
                {m.pendingOrders}
              </span>
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-2xl animate-ping bg-white/30 pointer-events-none" />
            </div>
            <div className="flex-1">
              <p className="font-black text-base text-white leading-tight">มีออเดอร์รอดำเนินการ</p>
              <p className="text-sm text-white/80 mt-0.5">กดเพื่อจัดการทันที</p>
            </div>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </button>
        )}

        {/* ── KPI cards: month revenue full-width + 2 below ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold leading-tight">{isLoading ? "—" : formatPrice(m?.monthRevenue ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">รายได้เดือนนี้</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-700">{isLoading ? "—" : (m?.monthOrders ?? 0)}</p>
            <p className="text-[11px] text-slate-400">ออเดอร์</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Avg order */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
              <ReceiptText className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold leading-tight">{isLoading ? "—" : formatPrice(m?.avgOrderValue ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">เฉลี่ย/ออเดอร์</p>
            <p className="text-[11px] text-slate-400 mt-0.5">วันนี้</p>
          </div>

          {/* Total customers */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold leading-tight">{isLoading ? "—" : (m?.totalCustomers ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">ลูกค้าทั้งหมด</p>
            <p className="text-[11px] text-slate-400 mt-0.5">สมาชิกในระบบ</p>
          </div>
        </div>

        {/* ── Bar chart: Revenue 7 days ─────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
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
          <div className="px-2 pb-4">
            {isLoading ? (
              <div className="h-44 mx-3 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={data?.dailyRevenue ?? []}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => v === 0 ? "" : `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "oklch(0.97 0.024 142)" }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {(data?.dailyRevenue ?? []).map((_: any, i: number) => (
                      <Cell
                        key={i}
                        fill={i === todayIdx ? "oklch(0.55 0.20 152)" : "oklch(0.82 0.12 152)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {/* Legend hint */}
            <div className="flex items-center gap-3 px-3 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.55 0.20 152)" }} />
                <span className="text-[10px] text-muted-foreground">วันนี้</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.82 0.12 152)" }} />
                <span className="text-[10px] text-muted-foreground">วันก่อน</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top products + Recent orders ──────────────── */}
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
              ) : (data?.topProducts ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Package className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">ยังไม่มีข้อมูล</p>
                </div>
              ) : (data?.topProducts ?? []).slice(0, 5).map((p: any, i: number) => {
                const medal = [
                  { bg: "bg-amber-100", text: "text-amber-700" },
                  { bg: "bg-slate-100", text: "text-slate-500" },
                  { bg: "bg-orange-100", text: "text-orange-600" },
                ];
                const c = medal[i] ?? { bg: "bg-slate-50", text: "text-slate-400" };
                return (
                  <div key={p.productId} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", c.bg, c.text)}>
                      {i + 1}
                    </span>
                    <p className="flex-1 text-sm truncate">{p.product?.name ?? "—"}</p>
                    <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
                      {p._sum.quantity ?? 0} ชิ้น
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent orders */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-500" />
                <p className="font-bold text-sm">ออเดอร์วันนี้</p>
              </div>
              <button
                onClick={() => router.push("/admin/orders")}
                className="flex items-center gap-0.5 text-xs font-semibold"
                style={{ color: G.primary }}
              >
                ดูทั้งหมด
                <ArrowUpRight className="w-3 h-3" />
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
