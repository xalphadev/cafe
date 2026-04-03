"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatDate, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-yellow-100 text-yellow-700",
  ประจำ: "bg-blue-100 text-blue-700",
  ใหม่: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
};

export default function AdminCRMPage() {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", search, tag],
    queryFn: () => fetch(`/api/admin/customers?search=${search}&tag=${tag}`).then((r) => r.json()).then((d) => d.data),
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">ข้อมูลลูกค้า</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} คน</p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อหรือเบอร์..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {["ALL", "VIP", "ประจำ", "ใหม่", "inactive"].map((t) => (
            <button key={t} onClick={() => setTag(t)} className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              tag === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>{t === "ALL" ? "ทั้งหมด" : t}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">ลูกค้า</th>
              <th className="text-center px-4 py-3 hidden sm:table-cell">ออเดอร์</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">ยอดรวม</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">แต้ม</th>
              <th className="text-center px-4 py-3">แท็ก</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
              ))
            ) : (data?.customers ?? []).map((c: { id: string; phone: string; name?: string | null; pointsBalance: number; _count: { orders: number }; totalSpent: number; customerTag: string; lastOrderDate: string | null }) => (
              <tr key={c.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{c.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{formatPhone(c.phone)}</p>
                  {c.lastOrderDate && <p className="text-xs text-muted-foreground">สั่งล่าสุด: {formatDate(c.lastOrderDate)}</p>}
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <span className="font-medium">{c._count.orders}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="font-medium">{formatPrice(c.totalSpent)}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="font-medium text-yellow-600 flex items-center gap-1 justify-end"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{c.pointsBalance}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cn("text-xs", TAG_COLORS[c.customerTag] ?? "bg-muted text-muted-foreground")}>
                    {c.customerTag}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
