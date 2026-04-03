"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, Settings2, Trash2, ChevronDown, ChevronUp, Upload, Star, UtensilsCrossed, Sparkles, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import type { ProductWithCategory, Category, ProductOptionGroup, ProductOption } from "@/types";

type ProductForm = {
  categoryId: string; name: string; description: string;
  price: string; image: string; isAvailable: boolean;
  isFeatured: boolean; salePrice: string; saleEndsAt: string;
};
const emptyForm: ProductForm = {
  categoryId: "", name: "", description: "",
  price: "", image: "", isAvailable: true,
  isFeatured: false, salePrice: "", saleEndsAt: "",
};

type DraftOption = Omit<ProductOption, "id"> & { _id: string };
type DraftGroup  = Omit<ProductOptionGroup, "id" | "options"> & { _id: string; options: DraftOption[] };

function newGroup(): DraftGroup {
  return { _id: crypto.randomUUID(), name: "", isRequired: false, maxChoices: 1, sortOrder: 0, options: [newOption()] };
}
function newOption(): DraftOption {
  return { _id: crypto.randomUUID(), name: "", priceAdded: 0, isDefault: false, sortOrder: 0 };
}

function makeDraftGroups(raw: Array<{ name: string; isRequired: boolean; maxChoices: number; options: Array<{ name: string; priceAdded: number; isDefault: boolean }> }>): DraftGroup[] {
  return raw.map((g, gi) => ({
    _id: crypto.randomUUID(), name: g.name, isRequired: g.isRequired,
    maxChoices: g.maxChoices, sortOrder: gi,
    options: g.options.map((o, oi) => ({ _id: crypto.randomUUID(), name: o.name, priceAdded: o.priceAdded, isDefault: o.isDefault, sortOrder: oi })),
  }));
}

// ── Built-in presets ──────────────────────────────────────────────────────────
const PRESETS: Array<{ id: string; label: string; desc: string; groups: Parameters<typeof makeDraftGroups>[0] }> = [
  {
    id: "coffee",
    label: "กาแฟ / ลาเต้",
    desc: "ขนาด · อุณหภูมิ · ความหวาน · นม",
    groups: [
      { name: "ขนาด", isRequired: true, maxChoices: 1, options: [
        { name: "S", priceAdded: 0, isDefault: true },
        { name: "M", priceAdded: 10, isDefault: false },
        { name: "L", priceAdded: 20, isDefault: false },
      ]},
      { name: "อุณหภูมิ", isRequired: true, maxChoices: 1, options: [
        { name: "ร้อน", priceAdded: 0, isDefault: true },
        { name: "เย็น", priceAdded: 0, isDefault: false },
        { name: "ปั่น", priceAdded: 5, isDefault: false },
      ]},
      { name: "ความหวาน", isRequired: true, maxChoices: 1, options: [
        { name: "หวานน้อย (25%)", priceAdded: 0, isDefault: false },
        { name: "หวานปกติ (50%)", priceAdded: 0, isDefault: true },
        { name: "หวานมาก (100%)", priceAdded: 0, isDefault: false },
        { name: "ไม่หวาน", priceAdded: 0, isDefault: false },
      ]},
      { name: "นม", isRequired: false, maxChoices: 1, options: [
        { name: "นมสด", priceAdded: 0, isDefault: true },
        { name: "นมข้นหวาน", priceAdded: 0, isDefault: false },
        { name: "นมโอ๊ต (+15฿)", priceAdded: 15, isDefault: false },
        { name: "นมอัลมอนด์ (+15฿)", priceAdded: 15, isDefault: false },
      ]},
    ],
  },
  {
    id: "tea",
    label: "ชา / ชาไทย",
    desc: "ขนาด · อุณหภูมิ · ความหวาน",
    groups: [
      { name: "ขนาด", isRequired: true, maxChoices: 1, options: [
        { name: "S", priceAdded: 0, isDefault: true },
        { name: "M", priceAdded: 10, isDefault: false },
        { name: "L", priceAdded: 20, isDefault: false },
      ]},
      { name: "อุณหภูมิ", isRequired: true, maxChoices: 1, options: [
        { name: "ร้อน", priceAdded: 0, isDefault: false },
        { name: "เย็น", priceAdded: 0, isDefault: true },
      ]},
      { name: "ความหวาน", isRequired: true, maxChoices: 1, options: [
        { name: "ไม่หวาน", priceAdded: 0, isDefault: false },
        { name: "หวานน้อย (25%)", priceAdded: 0, isDefault: false },
        { name: "หวานปกติ (50%)", priceAdded: 0, isDefault: true },
        { name: "หวานมาก (100%)", priceAdded: 0, isDefault: false },
      ]},
    ],
  },
  {
    id: "smoothie",
    label: "สมูทตี้ / ปั่น",
    desc: "ขนาด · ความหวาน · ท็อปปิ้ง",
    groups: [
      { name: "ขนาด", isRequired: true, maxChoices: 1, options: [
        { name: "M", priceAdded: 0, isDefault: true },
        { name: "L", priceAdded: 15, isDefault: false },
      ]},
      { name: "ความหวาน", isRequired: true, maxChoices: 1, options: [
        { name: "ไม่หวาน", priceAdded: 0, isDefault: false },
        { name: "หวานน้อย", priceAdded: 0, isDefault: true },
        { name: "หวานปกติ", priceAdded: 0, isDefault: false },
      ]},
      { name: "ท็อปปิ้ง", isRequired: false, maxChoices: 3, options: [
        { name: "ไข่มุก", priceAdded: 15, isDefault: false },
        { name: "เฉาก๊วย", priceAdded: 10, isDefault: false },
        { name: "วุ้นมะพร้าว", priceAdded: 10, isDefault: false },
        { name: "ซาโก้", priceAdded: 10, isDefault: false },
      ]},
    ],
  },
  {
    id: "food",
    label: "อาหาร / ของกิน",
    desc: "ระดับความเผ็ด · เพิ่มเติม",
    groups: [
      { name: "ระดับความเผ็ด", isRequired: true, maxChoices: 1, options: [
        { name: "ไม่เผ็ด", priceAdded: 0, isDefault: false },
        { name: "เผ็ดน้อย", priceAdded: 0, isDefault: true },
        { name: "เผ็ดปกติ", priceAdded: 0, isDefault: false },
        { name: "เผ็ดมาก", priceAdded: 0, isDefault: false },
      ]},
      { name: "เพิ่มเติม", isRequired: false, maxChoices: 3, options: [
        { name: "ไข่ดาว", priceAdded: 10, isDefault: false },
        { name: "ข้าวเพิ่ม", priceAdded: 10, isDefault: false },
        { name: "ผักเพิ่ม", priceAdded: 5, isDefault: false },
      ]},
    ],
  },
  {
    id: "size_only",
    label: "ขนาดอย่างเดียว",
    desc: "S / M / L เท่านั้น",
    groups: [
      { name: "ขนาด", isRequired: true, maxChoices: 1, options: [
        { name: "S", priceAdded: 0, isDefault: true },
        { name: "M", priceAdded: 10, isDefault: false },
        { name: "L", priceAdded: 20, isDefault: false },
      ]},
    ],
  },
];

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithCategory | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Options editor
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optProduct, setOptProduct] = useState<ProductWithCategory | null>(null);
  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [savingOpts, setSavingOpts] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [copyFromId, setCopyFromId] = useState("");

  const { data: products = [], isLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["admin-products", search],
    queryFn: () => fetch(`/api/admin/products?search=${search}`).then(r => r.json()).then(d => d.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()).then(d => d.data),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (p: ProductWithCategory) => {
    setEditing(p);
    setForm({
      categoryId: p.categoryId, name: p.name, description: p.description ?? "",
      price: String(p.price), image: p.image ?? "", isAvailable: p.isAvailable,
      isFeatured: (p as { isFeatured?: boolean }).isFeatured ?? false,
      salePrice: String((p as { salePrice?: number | null }).salePrice ?? ""),
      saleEndsAt: (p as { saleEndsAt?: Date | null }).saleEndsAt ? new Date((p as { saleEndsAt: Date }).saleEndsAt).toISOString().slice(0, 16) : "",
    });
    setFormOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "products");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setForm((f) => ({ ...f, image: data.data.url }));
        toast.success("อัปโหลดรูปสำเร็จ");
      } else {
        toast.error(data.error);
      }
    } finally {
      setImageUploading(false);
    }
  };

  const openOptions = (p: ProductWithCategory) => {
    setOptProduct(p);
    const existing: DraftGroup[] = (p.optionGroups ?? []).map((g: any) => ({
      _id: g.id, name: g.name, isRequired: g.isRequired, maxChoices: g.maxChoices, sortOrder: g.sortOrder,
      options: g.options.map((o: any) => ({ _id: o.id, name: o.name, priceAdded: o.priceAdded, isDefault: o.isDefault, sortOrder: o.sortOrder })),
    }));
    setGroups(existing.length > 0 ? existing : []);
    setExpandedGroup(existing[0]?._id ?? null);
    setShowTemplatePanel(false);
    setCopyFromId("");
    setOptionsOpen(true);
  };

  const applyPreset = (presetId: string, mode: "replace" | "append") => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const drafted = makeDraftGroups(preset.groups);
    const next = mode === "replace" ? drafted : [...groups, ...drafted];
    setGroups(next);
    setExpandedGroup(drafted[0]._id);
    setShowTemplatePanel(false);
    toast.success("ใช้ preset " + preset.label + " แล้ว");
  };

  const applyCopyFrom = (mode: "replace" | "append") => {
    const src = products.find(p => p.id === copyFromId);
    if (!src || !src.optionGroups?.length) { toast.error("สินค้านี้ยังไม่มีตัวเลือก"); return; }
    const drafted = makeDraftGroups((src.optionGroups as any[]).map(g => ({
      name: g.name, isRequired: g.isRequired, maxChoices: g.maxChoices,
      options: g.options.map((o: any) => ({ name: o.name, priceAdded: o.priceAdded, isDefault: o.isDefault })),
    })));
    const next = mode === "replace" ? drafted : [...groups, ...drafted];
    setGroups(next);
    setExpandedGroup(drafted[0]._id);
    setShowTemplatePanel(false);
    setCopyFromId("");
    toast.success("คัดลอกตัวเลือกจาก " + src.name + " แล้ว");
  };

  const handleSave = async () => {
    if (!form.name || !form.categoryId || !form.price) { toast.error("กรุณากรอกข้อมูลให้ครบ"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
        saleEndsAt: form.saleEndsAt ? new Date(form.saleEndsAt).toISOString() : null,
      };
      const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products";
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success(editing ? "แก้ไขสินค้าแล้ว" : "เพิ่มสินค้าแล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setFormOpen(false);
    } finally { setSaving(false); }
  };

  const handleSaveOptions = async () => {
    if (!optProduct) return;
    for (const g of groups) {
      if (!g.name.trim()) { toast.error("กรุณาใส่ชื่อกลุ่ม option"); return; }
      for (const o of g.options) {
        if (!o.name.trim()) { toast.error(`กรุณาใส่ชื่อตัวเลือกในกลุ่ม "${g.name}"`); return; }
      }
    }
    setSavingOpts(true);
    try {
      const payload = groups.map((g, gi) => ({
        name: g.name, isRequired: g.isRequired, maxChoices: g.maxChoices, sortOrder: gi,
        options: g.options.map((o, oi) => ({ name: o.name, priceAdded: o.priceAdded, isDefault: o.isDefault, sortOrder: oi })),
      }));
      const res = await fetch(`/api/admin/products/${optProduct.id}/options`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success("บันทึกตัวเลือกแล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setOptionsOpen(false);
    } finally { setSavingOpts(false); }
  };

  const handleToggle = async (p: ProductWithCategory) => {
    await fetch(`/api/admin/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAvailable: !p.isAvailable }) });
    toast.success(p.isAvailable ? "ปิดการขายแล้ว" : "เปิดการขายแล้ว");
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const updateGroup = (id: string, patch: Partial<DraftGroup>) =>
    setGroups(gs => gs.map(g => g._id === id ? { ...g, ...patch } : g));
  const updateOption = (gid: string, oid: string, patch: Partial<DraftOption>) =>
    setGroups(gs => gs.map(g => g._id === gid ? { ...g, options: g.options.map(o => o._id === oid ? { ...o, ...patch } : o) } : g));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">จัดการสินค้า</h1>
        <Button onClick={openAdd} size="sm" className="h-9 gap-1.5">
          <Plus className="w-4 h-4" />
          <span>เพิ่มสินค้า</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ค้นหาสินค้า..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* ════════════════════════════════════════════
          MOBILE — card list (hidden on md+)
      ════════════════════════════════════════════ */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <UtensilsCrossed className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">ไม่พบสินค้า</p>
          </div>
        ) : products.map(p => {
          const optCount = p.optionGroups?.length ?? 0;
          return (
            <div key={p.id} className={"bg-white rounded-2xl p-4 transition-all " + (!p.isAvailable ? "opacity-60" : "")}>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative">
                  {p.image
                    ? <Image src={p.image as string} alt={p.name} fill className="object-cover" sizes="64px" />
                    : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-6 h-6 text-muted-foreground/30" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs py-0 h-5">{p.category.name}</Badge>
                    <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
                    {(p as { isFeatured?: boolean }).isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />}
                  </div>
                </div>
                <button onClick={() => handleToggle(p)} className="flex-shrink-0 mt-0.5">
                  {p.isAvailable ? <ToggleRight className="w-9 h-9 text-primary" /> : <ToggleLeft className="w-9 h-9 text-muted-foreground" />}
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openOptions(p)}
                  className={"flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors " +
                    (optCount > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}
                >
                  <Settings2 className="w-4 h-4" />
                  {optCount > 0 ? optCount + " กลุ่มตัวเลือก" : "ตั้งค่าตัวเลือก"}
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  แก้ไข
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════
          DESKTOP — table (hidden on mobile)
      ════════════════════════════════════════════ */}
      <div className="hidden md:block bg-white rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left px-5 py-3">สินค้า</th>
              <th className="text-left px-5 py-3">หมวดหมู่</th>
              <th className="text-right px-5 py-3">ราคา</th>
              <th className="text-center px-5 py-3">ตัวเลือก</th>
              <th className="text-center px-5 py-3">สถานะ</th>
              <th className="px-5 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center">
                <UtensilsCrossed className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">ไม่พบสินค้า</p>
              </td></tr>
            ) : products.map(p => {
              const optCount = p.optionGroups?.length ?? 0;
              return (
                <tr key={p.id} className={"hover:bg-muted/20 transition-colors " + (!p.isAvailable ? "opacity-60" : "")}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative">
                        {p.image
                          ? <Image src={p.image as string} alt={p.name} fill className="object-cover" sizes="44px" />
                          : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-5 h-5 text-muted-foreground/30" /></div>
                        }
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground truncate max-w-[240px]">{p.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary" className="text-xs">{p.category.name}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-semibold text-sm">{formatPrice(p.price)}</span>
                    {(p as { isFeatured?: boolean }).isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 inline ml-1.5" />}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => openOptions(p)}
                      className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                        (optCount > 0 ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/70")}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      {optCount > 0 ? optCount + " กลุ่ม" : "ตั้งค่า"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => handleToggle(p)}>
                      {p.isAvailable
                        ? <ToggleRight className="w-8 h-8 text-primary mx-auto" />
                        : <ToggleLeft className="w-8 h-8 text-muted-foreground mx-auto" />
                      }
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="gap-1.5">
                      <Edit2 className="w-4 h-4" />
                      แก้ไข
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Product Form Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>หมวดหมู่</Label>
              <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v ?? "" })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>ชื่อสินค้า</Label><Input className="mt-1.5" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>คำอธิบาย</Label><Input className="mt-1.5" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="(ไม่จำเป็น)" /></div>
            <div><Label>ราคาเริ่มต้น (บาท)</Label><Input className="mt-1.5" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} min="0" /></div>

            {/* Image upload */}
            <div>
              <Label>รูปภาพสินค้า</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={form.image}
                  onChange={e => setForm({ ...form, image: e.target.value })}
                  placeholder="URL หรืออัปโหลด"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageFileRef.current?.click()}
                  disabled={imageUploading}
                  className="flex-shrink-0"
                >
                  {imageUploading ? "..." : <Upload className="w-4 h-4" />}
                </Button>
              </div>
              {form.image && (
                <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden bg-muted">
                  <Image src={form.image} alt="preview" fill className="object-cover" />
                </div>
              )}
              <input
                ref={imageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
            </div>

            <Separator />

            {/* Sale price */}
            <div className="grid grid-cols-2 gap-2">
              <div><Label>ราคาลด (บาท)</Label><Input className="mt-1.5" type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} min="0" placeholder="(ไม่จำเป็น)" /></div>
              <div><Label>ลดราคาถึง</Label><Input className="mt-1.5" type="datetime-local" value={form.saleEndsAt} onChange={e => setForm({ ...form, saleEndsAt: e.target.value })} /></div>
            </div>

            {/* Featured toggle */}
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-muted/50">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} className="accent-primary" />
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">สินค้าแนะนำ (Featured)</span>
            </label>

            <Button onClick={handleSave} disabled={saving || imageUploading} className="w-full">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Options Editor Dialog ── */}
      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>ตัวเลือกสินค้า — {optProduct?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">เช่น ขนาด, อุณหภูมิ, ระดับหวาน, ท็อปปิ้ง</p>
          </DialogHeader>

          {/* ── Template / Copy panel ── */}
          <div className="px-6 pt-4 pb-0">
            <button
              onClick={() => setShowTemplatePanel(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                ใช้ Preset / คัดลอกจากสินค้าอื่น
              </span>
              <ChevronRight className={"w-4 h-4 transition-transform " + (showTemplatePanel ? "rotate-90" : "")} />
            </button>

            {showTemplatePanel && (
              <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
                {/* Presets */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preset สำเร็จรูป</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESETS.map(preset => (
                      <div key={preset.id} className="flex items-center justify-between bg-white rounded-xl border border-border px-3 py-2 gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{preset.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{preset.desc}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => applyPreset(preset.id, "replace")}
                            className="text-xs px-2 py-1 rounded-lg bg-primary text-white font-medium hover:opacity-80 transition-opacity"
                          >
                            แทนที่
                          </button>
                          <button
                            onClick={() => applyPreset(preset.id, "append")}
                            className="text-xs px-2 py-1 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors"
                          >
                            เพิ่ม
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Copy from product */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">คัดลอกจากสินค้าอื่น</p>
                  <div className="flex gap-2">
                    <Select value={copyFromId} onValueChange={setCopyFromId}>
                      <SelectTrigger className="flex-1 bg-white">
                        <SelectValue placeholder="เลือกสินค้า..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(p => p.id !== optProduct?.id && (p.optionGroups?.length ?? 0) > 0)
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground ml-1.5 text-xs">({p.optionGroups?.length} กลุ่ม)</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <button
                      disabled={!copyFromId}
                      onClick={() => applyCopyFrom("replace")}
                      className="text-xs px-3 py-2 rounded-xl bg-primary text-white font-medium disabled:opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
                    >
                      แทนที่
                    </button>
                    <button
                      disabled={!copyFromId}
                      onClick={() => applyCopyFrom("append")}
                      className="text-xs px-3 py-2 rounded-xl border border-primary text-primary font-medium disabled:opacity-40 hover:bg-primary/5 transition-colors flex-shrink-0"
                    >
                      เพิ่ม
                    </button>
                  </div>
                  {products.filter(p => p.id !== optProduct?.id && (p.optionGroups?.length ?? 0) > 0).length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">ยังไม่มีสินค้าอื่นที่มีตัวเลือก</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {groups.map((group, gi) => (
              <div key={group._id} className="border border-border rounded-2xl overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer"
                  onClick={() => setExpandedGroup(expandedGroup === group._id ? null : group._id)}
                >
                  <div className="flex-1 min-w-0">
                    <input
                      className="font-semibold text-sm bg-transparent outline-none w-full"
                      placeholder="ชื่อกลุ่ม เช่น ขนาด"
                      value={group.name}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateGroup(group._id, { name: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={group.isRequired} onChange={e => updateGroup(group._id, { isRequired: e.target.checked })} />
                      <span className="text-muted-foreground">จำเป็น</span>
                    </label>
                    <select
                      className="border border-border rounded-lg px-2 py-1 text-xs bg-white"
                      value={group.maxChoices}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateGroup(group._id, { maxChoices: Number(e.target.value) })}
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>เลือกได้ {n}</option>)}
                    </select>
                    <button onClick={e => { e.stopPropagation(); setGroups(gs => gs.filter(g => g._id !== group._id)); }} className="text-destructive hover:opacity-70">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedGroup === group._id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Options */}
                {expandedGroup === group._id && (
                  <div className="px-4 py-3 space-y-2">
                    {group.options.map(opt => (
                      <div key={opt._id} className="flex items-center gap-2">
                        <input
                          className="flex-1 min-w-0 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder="ชื่อตัวเลือก เช่น S, M, L"
                          value={opt.name}
                          onChange={e => updateOption(group._id, opt._id, { name: e.target.value })}
                        />
                        <div className="flex items-center gap-1 border border-border rounded-xl px-2 py-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">+฿</span>
                          <input
                            type="number" min="0" step="5"
                            className="w-16 text-sm outline-none bg-transparent"
                            value={opt.priceAdded}
                            onChange={e => updateOption(group._id, opt._id, { priceAdded: Number(e.target.value) })}
                          />
                        </div>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <input type="checkbox" checked={opt.isDefault} onChange={e => updateOption(group._id, opt._id, { isDefault: e.target.checked })} />
                          default
                        </label>
                        <button onClick={() => updateGroup(group._id, { options: group.options.filter(o => o._id !== opt._id) })} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateGroup(group._id, { options: [...group.options, newOption()] })}
                      className="flex items-center gap-1.5 text-sm text-primary font-medium mt-1"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มตัวเลือก
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => { const g = newGroup(); setGroups(gs => [...gs, g]); setExpandedGroup(g._id); }}
              className="flex items-center gap-2 text-sm font-semibold text-primary border-2 border-dashed border-primary/30 rounded-2xl px-4 py-3 w-full hover:border-primary/60 transition-colors"
            >
              <Plus className="w-4 h-4" /> เพิ่มกลุ่มตัวเลือก
            </button>
          </div>

          <div className="px-6 pb-6 pt-3 border-t">
            <Button onClick={handleSaveOptions} disabled={savingOpts} className="w-full">
              {savingOpts ? "กำลังบันทึก..." : "บันทึกตัวเลือกทั้งหมด"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
