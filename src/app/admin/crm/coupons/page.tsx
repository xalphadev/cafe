"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit2, ToggleLeft, ToggleRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPrice, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Coupon = { id: string; code: string; name: string; type: "PERCENT" | "FIXED"; value: number; minOrderAmount: number; maxUses: number | null; usedCount: number; maxUsesPerUser: number; expiresAt: string | null; isActive: boolean; _count: { usages: number } };

type CouponForm = { code: string; name: string; type: "FIXED" | "PERCENT"; value: string; minOrderAmount: string; maxUses: string; maxUsesPerUser: string; expiresAt: string };
const emptyForm: CouponForm = { code: "", name: "", type: "FIXED", value: "", minOrderAmount: "0", maxUses: "", maxUsesPerUser: "1", expiresAt: "" };

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => fetch("/api/admin/coupons").then((r) => r.json()).then((d) => d.data),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code, name: c.name, type: c.type, value: String(c.value),
      minOrderAmount: String(c.minOrderAmount), maxUses: c.maxUses ? String(c.maxUses) : "",
      maxUsesPerUser: String(c.maxUsesPerUser),
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.value) { toast.error("กรุณากรอกข้อมูลให้ครบ"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value),
        minOrderAmount: parseFloat(form.minOrderAmount),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        maxUsesPerUser: parseInt(form.maxUsesPerUser),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };
      const url = editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success(editing ? "แก้ไขคูปองแล้ว" : "สร้างคูปองแล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    toast.success(coupon.isActive ? "ปิดคูปองแล้ว" : "เปิดคูปองแล้ว");
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">จัดการคูปอง</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />สร้างคูปอง</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-36 animate-pulse" />)
        ) : coupons.map((c) => (
          <div key={c.id} className={cn("bg-white rounded-2xl p-4 border-2", c.isActive ? "border-primary/20" : "border-border opacity-60")}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-bold text-primary">{c.code}</p>
                  <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("คัดลอกแล้ว"); }}>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{c.name}</p>
              </div>
              <button onClick={() => handleToggle(c)}>
                {c.isActive ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Badge className={c.type === "PERCENT" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
                {c.type === "PERCENT" ? `ลด ${c.value}%` : `ลด ${formatPrice(c.value)}`}
              </Badge>
              {c.minOrderAmount > 0 && (
                <span className="text-xs text-muted-foreground">ขั้นต่ำ {formatPrice(c.minOrderAmount)}</span>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>ใช้แล้ว: {c.usedCount}/{c.maxUses ?? "∞"} ครั้ง</p>
              {c.expiresAt && <p>หมดอายุ: {formatDate(c.expiresAt)}</p>}
            </div>

            <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => openEdit(c)}>
              <Edit2 className="w-3.5 h-3.5 mr-1" /> แก้ไข
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขคูปอง" : "สร้างคูปองใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>โค้ด</Label><Input className="mt-1.5 uppercase font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" disabled={!!editing} /></div>
            <div><Label>ชื่อคูปอง</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ประเภท</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "FIXED" | "PERCENT" })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">บาท (ลดตรง)</SelectItem>
                    <SelectItem value="PERCENT">เปอร์เซ็นต์</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ค่าส่วนลด</Label>
                <Input className="mt-1.5" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ยอดขั้นต่ำ (บาท)</Label><Input className="mt-1.5" type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} /></div>
              <div><Label>จำกัดครั้ง/คน</Label><Input className="mt-1.5" type="number" value={form.maxUsesPerUser} onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ใช้ได้ทั้งหมด</Label><Input className="mt-1.5" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="ไม่จำกัด" /></div>
              <div><Label>วันหมดอายุ</Label><Input className="mt-1.5" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
