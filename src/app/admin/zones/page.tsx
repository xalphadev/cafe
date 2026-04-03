"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit2, ToggleLeft, ToggleRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";
import type { DeliveryZone } from "@/types";

const emptyForm = { name: "", description: "", deliveryFee: "", minOrder: "0" };

export default function AdminZonesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: zones = [], isLoading } = useQuery<DeliveryZone[]>({
    queryKey: ["admin-zones"],
    queryFn: () => fetch("/api/admin/zones").then((r) => r.json()).then((d) => d.data),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (z: DeliveryZone) => {
    setEditing(z);
    setForm({ name: z.name, description: z.description ?? "", deliveryFee: String(z.deliveryFee), minOrder: String(z.minOrder) });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.deliveryFee) { toast.error("กรุณากรอกข้อมูลให้ครบ"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/zones/${editing.id}` : "/api/admin/zones";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, deliveryFee: parseFloat(form.deliveryFee), minOrder: parseFloat(form.minOrder) }),
      });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success(editing ? "แก้ไขโซนแล้ว" : "เพิ่มโซนแล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-zones"] });
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (zone: DeliveryZone) => {
    await fetch(`/api/admin/zones/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !zone.isActive }),
    });
    toast.success(zone.isActive ? "ปิดโซนแล้ว" : "เปิดโซนแล้ว");
    queryClient.invalidateQueries({ queryKey: ["admin-zones"] });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">จัดการโซนจัดส่ง</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />เพิ่มโซน</Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)
        ) : zones.map((zone) => (
          <div key={zone.id} className="bg-white rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{zone.name}</p>
              {zone.description && <p className="text-sm text-muted-foreground">{zone.description}</p>}
              <p className="text-sm mt-1">
                ค่าส่ง <span className="font-bold text-primary">{formatPrice(zone.deliveryFee)}</span>
                {zone.minOrder > 0 && <span className="text-muted-foreground"> | สั่งขั้นต่ำ {formatPrice(zone.minOrder)}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleToggle(zone)}>
                {zone.isActive ? <ToggleRight className="w-7 h-7 text-primary" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
              </button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(zone)}><Edit2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "แก้ไขโซน" : "เพิ่มโซนจัดส่ง"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>ชื่อโซน</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ในเขตเมือง" /></div>
            <div><Label>คำอธิบาย (ไม่จำเป็น)</Label><Input className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ค่าส่ง (บาท)</Label><Input className="mt-1.5" type="number" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} /></div>
              <div><Label>สั่งขั้นต่ำ (บาท)</Label><Input className="mt-1.5" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} /></div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
