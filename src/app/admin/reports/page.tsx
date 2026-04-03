"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";

export default function AdminReportsPage() {
  const [period, setPeriod] = useState("7d");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", period],
    queryFn: () => fetch(`/api/admin/reports?period=${period}`).then((r) => r.json()).then((d) => d.data),
  });

  const handleExport = () => {
    window.open(`/api/admin/reports?period=${period}&export=csv`, "_blank");
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">รายงานยอดขาย</h1>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5 flex-shrink-0">
          <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
        </Button>
      </div>
      <div className="flex gap-2">
        {[
          { value: "7d", label: "7 วัน" },
          { value: "30d", label: "30 วัน" },
          { value: "90d", label: "90 วัน" },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${period === p.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">รายได้รวม</p>
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : (
              <p className="text-3xl font-bold text-primary mt-1">{formatPrice(data?.totals.revenue ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">ออเดอร์ทั้งหมด</p>
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-3xl font-bold mt-1">{data?.totals.orders ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">รายได้รายวัน</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.dailyData ?? []} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Bar dataKey="revenue" fill="oklch(0.65 0.22 35)" radius={[4, 4, 0, 0]} name="รายได้" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Orders chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">จำนวนออเดอร์รายวัน</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-56" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.dailyData ?? []} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="oklch(0.65 0.22 35)" strokeWidth={2} dot={{ r: 4 }} name="ออเดอร์" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top products */}
      <Card>
        <CardHeader><CardTitle className="text-base">สินค้าขายดี</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 mb-2" />)
          ) : (
            <div className="space-y-3">
              {(data?.topProducts ?? []).map((p: { productId: string; product?: { name: string }; _sum: { quantity?: number }; revenue: number }, i: number) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.product?.name ?? "—"}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>ขาย {p._sum.quantity ?? 0} ชิ้น</span>
                      <span>รายได้ {formatPrice(p.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
