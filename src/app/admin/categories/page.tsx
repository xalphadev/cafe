"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit2, ToggleLeft, ToggleRight, GripVertical, ImageIcon, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CategoryWithCount = { id: string; name: string; image: string | null; sortOrder: number; isActive: boolean; _count: { products: number } };

const emptyForm = { name: "", image: "", sortOrder: 0 };

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery<CategoryWithCount[]>({
    queryKey: ["admin-categories"],
    queryFn: () => fetch("/api/admin/categories").then((r) => r.json()).then((d) => d.data),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (c: CategoryWithCount) => {
    setEditing(c);
    setForm({ name: c.name, image: c.image ?? "", sortOrder: c.sortOrder });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("กรุณากรอกชื่อหมวดหมู่"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success(editing ? "แก้ไขหมวดหมู่แล้ว" : "เพิ่มหมวดหมู่แล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: CategoryWithCount) => {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    toast.success(cat.isActive ? "ซ่อนหมวดหมู่แล้ว" : "แสดงหมวดหมู่แล้ว");
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">จัดการหมวดหมู่</h1>
        <Button onClick={openAdd} size="sm" className="h-9 gap-1.5">
          <Plus className="w-4 h-4" />เพิ่มหมวดหมู่
        </Button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-lg flex-shrink-0">
                  {cat.image
                    ? <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    : <FolderOpen className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat._count.products} สินค้า</p>
                </div>
                <div className="flex items-center gap-2">
                  {!cat.isActive && <Badge variant="secondary" className="text-xs">ซ่อน</Badge>}
                  <button onClick={() => handleToggle(cat)}>
                    {cat.isActive
                      ? <ToggleRight className="w-6 h-6 text-primary" />
                      : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}><Edit2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>ชื่อหมวดหมู่</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>URL รูปภาพ (ไม่จำเป็น)</Label><Input className="mt-1.5" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
            <div><Label>ลำดับ</Label><Input className="mt-1.5" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) })} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
