"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Phone, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPhone } from "@/lib/format";
import type { Rider } from "@/types";

type RiderForm = { name: string; phone: string; vehiclePlate: string };
const emptyForm: RiderForm = { name: "", phone: "", vehiclePlate: "" };

export default function AdminRidersPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rider | null>(null);
  const [form, setForm] = useState<RiderForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: riders = [], isLoading } = useQuery<Rider[]>({
    queryKey: ["admin-riders"],
    queryFn: () => fetch("/api/admin/riders").then((r) => r.json()).then((d) => d.data),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (r: Rider) => { setEditing(r); setForm({ name: r.name, phone: r.phone, vehiclePlate: r.vehiclePlate ?? "" }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error("กรุณากรอกชื่อและเบอร์โทร"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/riders/${editing.id}` : "/api/admin/riders";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success(editing ? "แก้ไขข้อมูลไรเดอร์แล้ว" : "เพิ่มไรเดอร์แล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      setFormOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบไรเดอร์?")) return;
    await fetch(`/api/admin/riders/${id}`, { method: "DELETE" });
    toast.success("ลบไรเดอร์แล้ว");
    queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
  };

  const handleToggle = async (r: Rider) => {
    await fetch(`/api/admin/riders/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">จัดการไรเดอร์</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{riders.length} คน</p>
        </div>
        <Button onClick={openAdd} size="sm" className="h-9 gap-1.5">
          <Plus className="w-4 h-4" />เพิ่มไรเดอร์
        </Button>
      </div>

      {/* Card list — mobile-first */}
      <div className="space-y-2.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))
        ) : riders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-muted-foreground text-sm">
            ยังไม่มีไรเดอร์
          </div>
        ) : (
          riders.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bike className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{r.name}</p>
                  <button onClick={() => handleToggle(r)}>
                    <Badge
                      variant={r.isActive ? "default" : "secondary"}
                      className="text-[10px] cursor-pointer px-2"
                    >
                      {r.isActive ? "ใช้งาน" : "ปิด"}
                    </Badge>
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />{formatPhone(r.phone)}
                  </span>
                  {r.vehiclePlate && <span>{r.vehiclePlate}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => openEdit(r)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขข้อมูลไรเดอร์" : "เพิ่มไรเดอร์ใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>ชื่อ-นามสกุล</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น นายสมชาย ใจดี" /></div>
            <div><Label>เบอร์โทรศัพท์</Label><Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812345678" inputMode="numeric" /></div>
            <div><Label>ทะเบียนรถ</Label><Input className="mt-1.5" value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} placeholder="กข 1234 (ไม่จำเป็น)" /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
