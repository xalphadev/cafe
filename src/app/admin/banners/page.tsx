"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, ToggleLeft, ToggleRight,
  ImagePlay, Link, GripVertical, Upload, X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Banner {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

const G = {
  primary:   "oklch(0.68 0.20 148)",
  primaryDk: "oklch(0.46 0.17 150)",
  primaryLt: "oklch(0.93 0.06 148)",
  fg:        "oklch(0.13 0.02 148)",
  fgMuted:   "oklch(0.50 0.04 148)",
  border:    "oklch(0.90 0.025 148)",
  grad:      "linear-gradient(160deg, oklch(0.68 0.20 148) 0%, oklch(0.46 0.17 150) 100%)",
};

const emptyForm = { title: "", imageUrl: "", linkUrl: "" };

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-banners"],
    queryFn: () => fetch("/api/admin/banners").then(r => r.json()).then(d => d.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.success) setForm(f => ({ ...f, imageUrl: d.data.url }));
      else toast.error("อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.imageUrl) { toast.error("กรุณาอัปโหลดรูป"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:    form.title || null,
          imageUrl: form.imageUrl,
          linkUrl:  form.linkUrl || null,
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("เพิ่มแบนเนอร์แล้ว");
        setForm(emptyForm);
        setShowForm(false);
        refresh();
      } else toast.error(d.error);
    } finally { setSaving(false); }
  };

  const handleToggle = async (banner: Banner) => {
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    refresh();
  };

  const handleDelete = async (banner: Banner) => {
    const res = await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) { toast.success("ลบแบนเนอร์แล้ว"); refresh(); }
    else toast.error(d.error);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: `1px solid ${G.border}`, boxShadow: "0 1px 6px oklch(0.55 0.18 145 / 0.07)" }}>
        <div className="flex items-center gap-2">
          <ImagePlay className="w-5 h-5" style={{ color: G.primary }} />
          <h1 className="font-extrabold text-[16px]" style={{ color: G.fg }}>แบนเนอร์หน้าแรก</h1>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setForm(emptyForm); }}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[13px] font-bold text-white active:scale-95 transition-transform"
          style={{ background: G.grad }}>
          <Plus className="w-4 h-4" />
          เพิ่มแบนเนอร์
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-xl mx-auto pb-28">

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-4 space-y-3"
            style={{ border: `1.5px solid ${G.border}`, boxShadow: "0 2px 12px oklch(0.55 0.18 145 / 0.08)" }}>
            <p className="font-bold text-[14px]" style={{ color: G.fg }}>เพิ่มแบนเนอร์ใหม่</p>

            {/* Image upload */}
            <div>
              <p className="text-[12px] font-semibold mb-1.5" style={{ color: G.fgMuted }}>รูปแบนเนอร์ *</p>
              {form.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/6" }}>
                  <Image src={form.imageUrl} alt="preview" fill className="object-cover" />
                  <button
                    onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 transition-colors"
                  style={{ borderColor: G.border }}>
                  {uploading
                    ? <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    : <Upload className="w-6 h-6" style={{ color: G.fgMuted }} />}
                  <span className="text-[12px] font-medium" style={{ color: G.fgMuted }}>
                    {uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดรูป (แนะนำ 16:6)"}
                  </span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>

            {/* Title */}
            <div>
              <p className="text-[12px] font-semibold mb-1" style={{ color: G.fgMuted }}>ชื่อแบนเนอร์ (ไม่บังคับ)</p>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="เช่น โปรโมชัน เดือนเมษา"
                className="w-full h-10 rounded-xl border px-3 text-sm outline-none"
                style={{ borderColor: G.border }} />
            </div>

            {/* Link */}
            <div>
              <p className="text-[12px] font-semibold mb-1" style={{ color: G.fgMuted }}>ลิงก์เมื่อกด (ไม่บังคับ)</p>
              <div className="flex items-center gap-2 h-10 rounded-xl border px-3" style={{ borderColor: G.border }}>
                <Link className="w-4 h-4 flex-shrink-0" style={{ color: G.fgMuted }} />
                <input
                  value={form.linkUrl}
                  onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="/menu หรือ https://..."
                  className="flex-1 text-sm outline-none bg-transparent" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setForm(emptyForm); }}
                className="flex-1 h-10 rounded-xl border text-sm font-semibold"
                style={{ borderColor: G.border, color: G.fgMuted }}>
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.imageUrl}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: G.grad }}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}

        {/* Banner list */}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse"
              style={{ border: `1.5px solid ${G.border}` }}>
              <div className="h-28 bg-slate-200" />
              <div className="p-3 flex gap-2">
                <div className="flex-1 h-8 bg-slate-200 rounded-xl" />
                <div className="w-8 h-8 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))
        ) : banners.length === 0 && !showForm ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: G.primaryLt }}>
              <ImagePlay className="w-8 h-8" style={{ color: G.primary }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: G.fg }}>ยังไม่มีแบนเนอร์</p>
              <p className="text-sm mt-1" style={{ color: G.fgMuted }}>กดปุ่ม "เพิ่มแบนเนอร์" ด้านบน</p>
            </div>
            <p className="text-[12px] px-6 leading-relaxed" style={{ color: G.fgMuted }}>
              ถ้าไม่มีแบนเนอร์ ระบบจะแสดงสินค้าแนะนำเป็น slide อัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner, idx) => (
              <div key={banner.id} className="bg-white rounded-2xl overflow-hidden transition-all"
                style={{
                  border: `1.5px solid ${banner.isActive ? G.border : "oklch(0.90 0 0)"}`,
                  opacity: banner.isActive ? 1 : 0.6,
                  boxShadow: "0 2px 8px oklch(0.55 0.18 145 / 0.06)",
                }}>
                {/* Image */}
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/6" }}>
                  <Image src={banner.imageUrl} alt={banner.title ?? `banner-${idx + 1}`}
                    fill className="object-cover" />
                  {!banner.isActive && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="text-[12px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full">ปิดใช้งาน</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="text-[11px] font-bold bg-black/50 text-white px-2 py-0.5 rounded-full">
                      #{idx + 1}
                    </span>
                    {banner.title && (
                      <span className="text-[11px] font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full max-w-[140px] truncate">
                        {banner.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-3 py-2.5 flex items-center gap-2">
                  {banner.linkUrl && (
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <Link className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G.fgMuted }} />
                      <span className="text-[11px] truncate" style={{ color: G.fgMuted }}>{banner.linkUrl}</span>
                    </div>
                  )}
                  {!banner.linkUrl && <div className="flex-1" />}

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(banner)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: banner.isActive ? G.primaryLt : "oklch(0.95 0 0)" }}>
                    {banner.isActive
                      ? <ToggleRight className="w-5 h-5" style={{ color: G.primary }} />
                      : <ToggleLeft className="w-5 h-5 text-slate-400" />
                    }
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(banner)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "oklch(0.97 0.03 25)", color: "oklch(0.55 0.22 25)" }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        {banners.length > 0 && (
          <p className="text-[11px] text-center px-4 leading-relaxed" style={{ color: G.fgMuted }}>
            แบนเนอร์จะแสดงตามลำดับ #{1}–#{banners.length} • ปิด toggle เพื่อซ่อนชั่วคราว
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={o => { if (!o) setConfirmDelete(null); }}
        title="ลบแบนเนอร์?"
        description={confirmDelete?.title ? `"${confirmDelete.title}"` : "แบนเนอร์นี้จะถูกลบออก"}
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
      />
    </div>
  );
}
