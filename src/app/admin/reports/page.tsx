"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  Download, TrendingUp, TrendingDown,
  ShoppingBag, Users, CupSoda, Receipt,
  Clock, BarChart3, Star, CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { DayPicker, type DateRange } from "react-day-picker";
import { format, subDays, startOfDay } from "date-fns";
import { th } from "date-fns/locale";
import "react-day-picker/style.css";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";

// ── Design tokens ────────────────────────────────────────────────
const G = {
  primary:   "oklch(0.64 0.24 162)",
  primaryDk: "oklch(0.50 0.20 196)",
  primaryLt: "oklch(0.93 0.09 162)",
  grad: "linear-gradient(160deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%)",
  fg:      "oklch(0.13 0.02 162)",
  fgMuted: "oklch(0.50 0.04 162)",
  border:  "oklch(0.90 0.025 162)",
};
const PERIOD_LABELS: Record<string, string> = {
  "1d": "วันนี้", "7d": "7 วัน", "30d": "30 วัน", "90d": "90 วัน", "custom": "เลือกวัน",
};
const PAYMENT_LABELS: Record<string, string> = {
  QR_PROMPTPAY: "QR PromptPay", CASH: "เงินสด",
};
const PIE_COLORS = [
  "oklch(0.64 0.24 162)", "oklch(0.60 0.18 200)", "oklch(0.70 0.17 260)",
  "oklch(0.72 0.16 35)", "oklch(0.75 0.15 320)", "oklch(0.65 0.14 90)",
];

// ── Helpers ──────────────────────────────────────────────────────
function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: up ? "oklch(0.93 0.08 162)" : "oklch(0.96 0.05 25)", color: up ? G.primaryDk : "oklch(0.50 0.22 25)" }}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, pct, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; pct?: number | null; accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-2"
      style={{ border: `1.5px solid ${G.border}`, boxShadow: "0 2px 8px oklch(0.55 0.18 145 / 0.07)" }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accent ? G.grad : G.primaryLt }}>
          <Icon className="w-4.5 h-4.5" style={{ color: accent ? "white" : G.primary }} />
        </div>
        {pct !== undefined && <PctBadge pct={pct ?? null} />}
      </div>
      <div>
        <p className="text-[11px] font-medium" style={{ color: G.fgMuted }}>{label}</p>
        <p className="text-[22px] font-extrabold leading-tight" style={{ color: accent ? G.primary : G.fg }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: G.fgMuted }}>{sub}</p>}
      </div>
    </div>
  );
}

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function CalendarHeader({ month, onPrev, onNext }: { month: Date; onPrev: () => void; onNext: () => void }) {
  const isNextDisabled = month.getFullYear() > new Date().getFullYear() ||
    (month.getFullYear() === new Date().getFullYear() && month.getMonth() >= new Date().getMonth());
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-2">
      <button onClick={onPrev}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95">
        <ChevronLeft className="w-5 h-5" style={{ color: G.primaryDk }} />
      </button>
      <p className="font-extrabold text-[14px]" style={{ color: G.fg }}>
        {THAI_MONTHS[month.getMonth()]} {month.getFullYear()}
      </p>
      <button onClick={onNext} disabled={isNextDisabled}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95 disabled:opacity-30">
        <ChevronRightIcon className="w-5 h-5" style={{ color: G.primaryDk }} />
      </button>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden"
      style={{ border: `1.5px solid ${G.border}`, boxShadow: "0 2px 8px oklch(0.55 0.18 145 / 0.07)" }}>
      <div className="px-4 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${G.border}` }}>
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: G.primary }} />}
        <h3 className="font-bold text-[14px]" style={{ color: G.fg }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-lg text-xs" style={{ border: `1px solid ${G.border}` }}>
      <p className="font-bold mb-1" style={{ color: G.fg }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.name?.includes("รายได้") || p.name === "revenue" ? formatPrice(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const [period, setPeriod] = useState("7d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isCustom = period === "custom";
  const customFrom = customRange?.from ? format(customRange.from, "yyyy-MM-dd") : null;
  const customTo   = customRange?.to   ? format(customRange.to,   "yyyy-MM-dd") : customFrom;

  const queryKey = isCustom && customFrom
    ? ["admin-reports", "custom", customFrom, customTo]
    : ["admin-reports", period];

  const queryUrl = isCustom && customFrom
    ? `/api/admin/reports?from=${customFrom}&to=${customTo}`
    : `/api/admin/reports?period=${period}`;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetch(queryUrl).then(r => r.json()).then(d => d.data),
    enabled: !isCustom || !!customFrom,
  });

  const totals = data?.totals;
  const maxHourlyOrders = Math.max(...(data?.hourlyData ?? []).map((h: any) => h.orders), 1);

  const customLabel = customRange?.from
    ? customRange.to
      ? `${format(customRange.from, "d MMM", { locale: th })} – ${format(customRange.to, "d MMM", { locale: th })}`
      : format(customRange.from, "d MMM", { locale: th })
    : "เลือกวัน";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${G.border}`, boxShadow: "0 1px 8px oklch(0.55 0.18 145 / 0.06)" }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="font-extrabold text-lg" style={{ color: G.fg }}>รายงานยอดขาย</h1>
          <button
            onClick={() => window.open(`${queryUrl}&export=csv`, "_blank")}
            className="w-9 h-9 rounded-xl flex items-center justify-center border active:scale-95 transition-transform"
            style={{ borderColor: G.border, color: G.fgMuted }}>
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Period selector */}
        <div className="flex gap-1.5">
          {(Object.entries(PERIOD_LABELS) as [string, string][]).filter(([v]) => v !== "custom").map(([v, label]) => (
            <button key={v} onClick={() => { setPeriod(v); setCalendarOpen(false); }}
              className="flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
              style={period === v
                ? { background: G.grad, color: "white" }
                : { background: G.primaryLt, color: G.primaryDk }}>
              {label}
            </button>
          ))}
          {/* Custom date button */}
          <button
            onClick={() => { setPeriod("custom"); setCalendarOpen(v => !v); }}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1"
            style={isCustom
              ? { background: G.grad, color: "white" }
              : { background: G.primaryLt, color: G.primaryDk }}>
            <CalendarDays className="w-3.5 h-3.5" />
            {isCustom ? customLabel : "เลือกวัน"}
          </button>
        </div>

        {/* Calendar dropdown */}
        {calendarOpen && (
          <div ref={calendarRef}
            className="absolute left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: `1.5px solid ${G.border}`, minWidth: 320, maxWidth: "calc(100vw - 2rem)" }}>

            {/* Custom header — Month nav */}
            <CalendarHeader
              month={calendarMonth}
              onPrev={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              onNext={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            />

            <DayPicker
              mode="range"
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              selected={customRange}
              onSelect={(range) => {
                setCustomRange(range);
                if (range?.from && range?.to) setCalendarOpen(false);
              }}
              disabled={{ after: new Date() }}
              hideNavigation
              showOutsideDays
              classNames={{
                root: "px-3 pb-1",
                month_caption: "hidden",
                weekdays: "grid grid-cols-7 mb-1",
                weekday: "text-[11px] font-semibold text-center py-1",
                weeks: "space-y-0.5",
                week: "grid grid-cols-7",
                day: "flex items-center justify-center",
                day_button: "w-9 h-9 text-[13px] rounded-xl transition-colors w-full",
                selected: "!bg-primary !text-white font-bold rounded-xl",
                range_start: "!bg-primary !text-white !rounded-l-xl !rounded-r-none",
                range_end: "!bg-primary !text-white !rounded-r-xl !rounded-l-none",
                range_middle: "!bg-green-100 !text-green-800 !rounded-none",
                today: "font-black underline decoration-2",
                outside: "opacity-30",
                disabled: "opacity-20 cursor-not-allowed",
              }}
              formatters={{
                formatWeekdayName: (d) => ["อา","จ","อ","พ","พฤ","ศ","ส"][d.getDay()],
              }}
            />

            {/* Range hint */}
            <div className="px-3 pb-2 text-center">
              {!customRange?.from ? (
                <p className="text-[11px]" style={{ color: G.fgMuted }}>กดวันเริ่มต้น</p>
              ) : !customRange?.to ? (
                <p className="text-[11px] font-semibold" style={{ color: G.primaryDk }}>
                  {format(customRange.from, "d MMM yyyy", { locale: th })} → กดวันสิ้นสุด
                </p>
              ) : (
                <p className="text-[11px] font-semibold" style={{ color: G.primaryDk }}>
                  {format(customRange.from, "d MMM yyyy", { locale: th })} – {format(customRange.to, "d MMM yyyy", { locale: th })}
                </p>
              )}
            </div>

            <div className="px-3 pb-3 flex gap-2">
              <button
                onClick={() => { setCustomRange(undefined); }}
                className="flex-1 h-9 rounded-xl text-[12px] font-semibold border"
                style={{ borderColor: G.border, color: G.fgMuted }}>
                ล้าง
              </button>
              <button
                onClick={() => setCalendarOpen(false)}
                className="flex-1 h-9 rounded-xl text-[12px] font-semibold text-white"
                style={{ background: G.grad }}>
                ตกลง
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto pb-28">

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          )) : <>
            <KpiCard icon={Receipt} label="รายได้รวม" value={formatPrice(totals?.revenue ?? 0)}
              sub={`ช่วงก่อน ${formatPrice(totals?.prevRevenue ?? 0)}`} pct={totals?.revenuePct} accent />
            <KpiCard icon={ShoppingBag} label="จำนวนออเดอร์" value={`${totals?.orders ?? 0} รายการ`}
              sub={`ช่วงก่อน ${totals?.prevOrders ?? 0} รายการ`} pct={totals?.ordersPct} />
            <KpiCard icon={CupSoda} label="ยอดเฉลี่ย/ออเดอร์" value={formatPrice(totals?.avgOrderValue ?? 0)}
              sub={`ช่วงก่อน ${formatPrice(totals?.prevAvgOrderValue ?? 0)}`} pct={totals?.avgPct} />
            <KpiCard icon={Star} label="เครื่องดื่มที่ขาย" value={`${totals?.itemsSold ?? 0} ชิ้น`} />
            <KpiCard icon={Users} label="ลูกค้า (unique)" value={`${data?.customerStats?.uniqueCustomers ?? 0} คน`}
              sub={`ใหม่ ${data?.customerStats?.newCustomers ?? 0} คน`} />
            <KpiCard icon={BarChart3} label="ยกเลิก" value={`${totals?.cancelledCount ?? 0} รายการ`}
              sub={`${(totals?.cancellationRate ?? 0).toFixed(1)}% ของทั้งหมด`} />
          </>}
        </div>

        {/* ── Revenue chart ── */}
        <SectionCard title="รายได้รายวัน" icon={Receipt}>
          {isLoading ? <Skeleton className="h-56 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.dailyData ?? []} margin={{ left: -8, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.016 162)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: G.fgMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: G.fgMuted }} axisLine={false} tickLine={false}
                  tickFormatter={v => v === 0 ? "฿0" : `฿${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="รายได้" fill={G.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* ── Orders chart ── */}
        <SectionCard title="จำนวนออเดอร์รายวัน" icon={ShoppingBag}>
          {isLoading ? <Skeleton className="h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={data?.dailyData ?? []} margin={{ left: -8, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.016 162)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: G.fgMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: G.fgMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="orders" name="ออเดอร์" stroke={G.primary} strokeWidth={2.5}
                  dot={{ r: 4, fill: G.primary, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: G.primaryDk }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* ── Peak hours ── */}
        <SectionCard title="ชั่วโมงที่ลูกค้ามากที่สุด" icon={Clock}>
          {isLoading ? <Skeleton className="h-48 rounded-xl" /> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data?.hourlyData ?? []} margin={{ left: -8, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.016 162)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: G.fgMuted }} axisLine={false} tickLine={false}
                    interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: G.fgMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="orders" name="ออเดอร์" radius={[4, 4, 0, 0]}
                    fill={G.primaryLt}
                    label={false}>
                    {(data?.hourlyData ?? []).map((entry: any, i: number) => (
                      <Cell key={i}
                        fill={entry.orders === maxHourlyOrders && entry.orders > 0 ? G.primary : G.primaryLt} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Peak hour callout */}
              {(() => {
                const peak = (data?.hourlyData ?? []).reduce((a: any, b: any) => b.orders > a.orders ? b : a, { orders: 0, hour: "-" });
                if (!peak.orders) return null;
                return (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: G.primaryLt }}>
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: G.primary }} />
                    <p className="text-[12px] font-semibold" style={{ color: G.primaryDk }}>
                      ช่วงเวลายอดนิยม: <span className="font-extrabold">{peak.hour}</span> — {peak.orders} ออเดอร์
                    </p>
                  </div>
                );
              })()}
            </>
          )}
        </SectionCard>

        {/* ── Top products ── */}
        <SectionCard title="เครื่องดื่มขายดี Top 10" icon={Star}>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (data?.topProducts ?? []).length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: G.fgMuted }}>ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2.5">
              {(data?.topProducts ?? []).map((p: any, i: number) => {
                const maxRev = data.topProducts[0]?.revenue ?? 1;
                const pct = Math.round((p.revenue / maxRev) * 100);
                const medalColors = [
                  { bg: "#fef3c7", color: "#d97706", border: "#fcd34d" }, // gold
                  { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" }, // silver
                  { bg: "#fdf2e9", color: "#c2410c", border: "#fca985" }, // bronze
                ];
                return (
                  <div key={p.productId} className="flex items-center gap-3">
                    <div className="w-6 flex justify-center flex-shrink-0">
                      {i < 3
                        ? <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border"
                            style={{ background: medalColors[i].bg, color: medalColors[i].color, borderColor: medalColors[i].border }}>
                            {i + 1}
                          </span>
                        : <span className="text-[12px] font-bold" style={{ color: G.fgMuted }}>{i + 1}</span>}
                    </div>
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: G.primaryLt }}>
                      {p.product?.image
                        ? <Image src={p.product.image} alt={p.product?.name ?? ""} width={40} height={40} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><CupSoda className="w-5 h-5" style={{ color: G.primary }} /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[13px] font-semibold truncate" style={{ color: G.fg }}>{p.product?.name ?? "—"}</p>
                        <p className="text-[12px] font-bold flex-shrink-0" style={{ color: G.primary }}>{formatPrice(p.revenue)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: G.primaryLt }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: G.primary }} />
                        </div>
                        <span className="text-[11px] flex-shrink-0" style={{ color: G.fgMuted }}>{p.qty} ชิ้น</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Category breakdown ── */}
        <SectionCard title="ยอดขายตามหมวดหมู่" icon={BarChart3}>
          {isLoading ? <Skeleton className="h-48 rounded-xl" /> :
            (data?.categoryBreakdown ?? []).length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: G.fgMuted }}>ยังไม่มีข้อมูล</p>
            ) : (
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {data.categoryBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatPrice(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.categoryBreakdown.map((c: any, i: number) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate" style={{ color: G.fg }}>{c.name}</p>
                        <p className="text-[11px]" style={{ color: G.fgMuted }}>{formatPrice(c.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </SectionCard>

        {/* ── Payment methods ── */}
        <SectionCard title="วิธีชำระเงิน" icon={Receipt}>
          {isLoading ? <Skeleton className="h-32 rounded-xl" /> :
            (data?.paymentBreakdown ?? []).length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: G.fgMuted }}>ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3">
                {(data?.paymentBreakdown ?? []).map((p: any, i: number) => {
                  const totalOrders = data.paymentBreakdown.reduce((s: number, x: any) => s + x.count, 0);
                  const pct = totalOrders > 0 ? Math.round((p.count / totalOrders) * 100) : 0;
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span className="font-semibold" style={{ color: G.fg }}>{PAYMENT_LABELS[p.method] ?? p.method}</span>
                        <span className="font-bold" style={{ color: G.primary }}>{formatPrice(p.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: G.primaryLt }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                        <span className="text-[11px] w-14 text-right flex-shrink-0" style={{ color: G.fgMuted }}>{p.count} รายการ ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </SectionCard>

      </div>
    </div>
  );
}
