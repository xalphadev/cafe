"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Upload, ToggleLeft, ToggleRight, ImageIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Banner } from "@/types";

type BannerForm = { title: string; imageUrl: string; linkUrl: string; sortOrder: string; isActive: boolean };
const emptyForm: BannerForm = { title: "", imageUrl: "", linkUrl: "", sortOrder: "0", isActive: true };

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-banners"],
    queryFn: () => fetch("/api/admin/banners").then((r) => r.json()).then((d) => d.data),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({ title: b.title ?? "", imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? "", sortOrder: String(b.sortOrder), isActive: b.isActive });
    setFormOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "banners");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) { setForm((f) => ({ ...f, imageUrl: data.data.url })); toast.success("อัปโหลดรูปสำเร็จ"); }
      else toast.error(data.error);
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.imageUrl) { toast.error("กรุณาใส่รูปภาพแบนเนอร์"); return; }
    setSaving(true);
    try {
      const payload = { ...form, sortOrder: parseInt(form.sortOrder) || 0 };
      const url = editing ? `/api/admin/banners/${editing.id}` : "/api/admin/banners";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success(editing ? "แก้ไขแบนเนอร์แล้ว" : "เพิ่มแบนเนอร์แล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      setFormOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบแบนเนอร์?")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    toast.success("ลบแบนเนอร์แล้ว");
    queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
  };

  const handleToggle = async (b: Banner) => {
    await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">จัดการแบนเนอร์</h1>
          <p className="text-muted-foreground text-sm mt-0.5">แบนเนอร์หน้าเมนูลูกค้า</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />เพิ่มแบนเนอร์</Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />)
        ) : banners.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-muted-foreground">
            <ImageIcon className="w-10 h-10 text-muted-foreground/30 mb-3 mx-auto" />
            <p>ยังไม่มีแบนเนอร์</p>
          </div>
        ) : banners.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-4 flex items-center gap-4">
            <div className="relative w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
              <Image src={b.imageUrl} alt={b.title ?? "Banner"} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{b.title || "(ไม่มีหัวข้อ)"}</p>
              {b.linkUrl && <p className="text-xs text-muted-foreground truncate">{b.linkUrl}</p>}
              <p className="text-xs text-muted-foreground">ลำดับ: {b.sortOrder}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleToggle(b)}>
                {b.isActive ? <ToggleRight className="w-7 h-7 text-primary" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
              </button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Edit2 className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขแบนเนอร์" : "เพิ่มแบนเนอร์ใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>หัวข้อ (ไม่จำเป็น)</Label><Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น โปรโมชั่นพิเศษ" /></div>
            <div>
              <Label>รูปภาพแบนเนอร์</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="URL หรืออัปโหลด" className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-shrink-0">
                  {uploading ? "..." : <Upload className="w-4 h-4" />}
                </Button>
              </div>
              {form.imageUrl && (
                <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden bg-muted">
                  <Image src={form.imageUrl} alt="preview" fill className="object-cover" />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
            </div>
            <div><Label>Link URL (ไม่จำเป็น)</Label><Input className="mt-1.5" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://..." /></div>
            <div><Label>ลำดับการแสดง</Label><Input className="mt-1.5" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />
              <span className="text-sm">แสดงแบนเนอร์นี้</span>
            </label>
            <Button onClick={handleSave} disabled={saving || uploading} className="w-full">{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
