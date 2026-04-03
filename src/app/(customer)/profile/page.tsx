"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MapPin, ChevronRight, LogOut, Edit2, Plus, Trash2,
  Ticket, Tag, Copy, Check, X,
  ArrowLeft, Phone, Award, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import AddressFormDialog from "@/components/customer/address-form-dialog";
import { useAuthStore } from "@/store/auth";
import { formatPhone, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Address, PointTransaction } from "@/types";

// Design tokens
const G = {
  primary:    "oklch(0.68 0.20 148)",
  primaryDk:  "oklch(0.46 0.17 150)",
  primaryLt:  "oklch(0.93 0.06 148)",
  primaryXlt: "oklch(0.976 0.016 148)",
  fg:         "oklch(0.13 0.02 148)",
  fgMuted:    "oklch(0.50 0.04 148)",
  border:     "oklch(0.90 0.025 148)",
  grad:       "linear-gradient(160deg, oklch(0.68 0.20 148) 0%, oklch(0.46 0.17 150) 100%)",
  shadow:     "0 8px 24px oklch(0.55 0.22 145 / 0.22)",
};

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [activeSection, setActiveSection] = useState<"main" | "addresses" | "points" | "coupons">("main");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const { data: points } = useQuery<{ balance: number; transactions: PointTransaction[] }>({
    queryKey: ["user-points"],
    queryFn: () => fetch("/api/user/points").then((r) => r.json()).then((d) => d.data),
    enabled: activeSection === "points",
  });

  const { data: addresses = [], isLoading: addrLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => fetch("/api/addresses").then((r) => r.json()).then((d) => d.data),
    enabled: activeSection === "addresses",
  });

  const handleSaveName = async () => {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("บันทึกชื่อแล้ว");
      setUser({ ...user!, name: data.data.name });
      setEditName(false);
    } else toast.error(data.error);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  if (activeSection === "addresses") {
    return <AddressesSection addresses={addresses} isLoading={addrLoading} onBack={() => setActiveSection("main")} queryClient={queryClient} />;
  }
  if (activeSection === "points") {
    return <PointsSection data={points} isLoading={false} onBack={() => setActiveSection("main")} />;
  }
  if (activeSection === "coupons") {
    return <CouponsSection onBack={() => setActiveSection("main")} />;
  }

  const initials = (user?.name ?? "U").slice(0, 1).toUpperCase();
  const pts = user?.pointsBalance ?? 0;

  const menuItems = [
    {
      id: "addresses",
      icon: <MapPin className="w-5 h-5" />,
      iconBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
      label: "ที่อยู่จัดส่ง",
      sub: "จัดการที่อยู่สำหรับจัดส่ง",
    },
    {
      id: "points",
      icon: <Award className="w-5 h-5" />,
      iconBg: "linear-gradient(135deg, #f59e0b, #d97706)",
      label: "แต้มสะสม",
      sub: pts > 0 ? `มีแต้มอยู่ ${pts} แต้ม` : "สะสมแต้มจากการสั่ง",
    },
    {
      id: "coupons",
      icon: <Ticket className="w-5 h-5" />,
      iconBg: "linear-gradient(135deg, #f97316, #ea580c)",
      label: "คูปอง & โปรโมชั่น",
      sub: "โค้ดส่วนลดพิเศษ",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: G.grad }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 -left-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

        <div className="relative px-5 pt-14 pb-8 flex flex-col items-center text-center gap-2">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl border-4 border-white/30 mb-1"
            style={{ background: "rgba(255,255,255,0.2)", color: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
          >
            {initials}
          </div>

          {/* Name */}
          {editName ? (
            <div className="flex gap-2 w-full max-w-[260px]">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="px-3 h-9 rounded-xl text-sm font-bold flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.92)", color: G.primaryDk }}
              >
                บันทึก
              </button>
              <button onClick={() => setEditName(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setName(user?.name ?? ""); setEditName(true); }}
              className="flex items-center gap-1.5 group"
            >
              <span className="font-extrabold text-xl text-white">{user?.name || "ผู้ใช้ใหม่"}</span>
              <Edit2 className="w-4 h-4 text-white/50" />
            </button>
          )}

          {/* Phone */}
          <div className="flex items-center gap-1.5 text-white/75 text-sm">
            <Phone className="w-3.5 h-3.5" />
            <span>{user?.phone ? formatPhone(user.phone) : "—"}</span>
          </div>

          {/* Points */}
          {pts > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold mt-1"
              style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
              <Sparkles className="w-3.5 h-3.5" />
              {pts} แต้ม
            </div>
          )}
        </div>
      </div>

      {/* ── Menu List ── */}
      <div className="px-4 py-4 space-y-3">

        {/* Main menu card */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
          {menuItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as typeof activeSection)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-gray-50 transition-colors"
              style={{ borderBottom: i < menuItems.length - 1 ? "1px solid #f3f4f6" : "none" }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
                style={{ background: item.iconBg }}>
                {item.icon}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-sm font-semibold bg-white active:scale-[0.98] transition-all"
          style={{ color: "oklch(0.55 0.22 25)", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="ออกจากระบบ?"
        description="ยืนยันการออกจากระบบหรือไม่?"
        confirmLabel="ออกจากระบบ"
        variant="danger"
        onConfirm={handleLogout}
      />
    </div>
  );
}

/* ─── Shared Back Header ─────────────────────────────────────────── */
function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 h-14 flex items-center gap-3"
      style={{ borderBottom: "1px solid oklch(0.93 0.016 148)" }}>
      <button
        onClick={onBack}
        className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
        style={{ background: "oklch(0.95 0.02 148)" }}
      >
        <ArrowLeft className="w-4 h-4" style={{ color: G.fg }} />
      </button>
      <h1 className="font-extrabold text-base flex-1" style={{ color: G.fg }}>{title}</h1>
      {action}
    </header>
  );
}

/* ─── Addresses Section ──────────────────────────────────────────── */
function AddressesSection({ addresses, isLoading, onBack, queryClient }: {
  addresses: Address[];
  isLoading: boolean;
  onBack: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ["addresses"] });

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบที่อยู่?")) return;
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบที่อยู่แล้ว");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    } else {
      toast.error(data.error ?? "เกิดข้อผิดพลาด");
    }
  };

  const handleSetDefault = async (id: string) => {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("ตั้งเป็นที่อยู่หลักแล้ว");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BackHeader
        title="ที่อยู่จัดส่ง"
        onBack={onBack}
        action={
          <button
            onClick={() => setAddOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center ml-auto"
            style={{ background: G.primaryLt }}
          >
            <Plus className="w-4 h-4" style={{ color: G.primary }} />
          </button>
        }
      />

      <div className="flex-1 px-4 py-4 space-y-3 pb-8">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
              <MapPin className="w-7 h-7 text-blue-500" />
            </div>
            <p className="font-bold text-sm" style={{ color: G.fg }}>ยังไม่มีที่อยู่</p>
            <p className="text-xs mt-1 mb-4" style={{ color: G.fgMuted }}>เพิ่มที่อยู่สำหรับจัดส่งสินค้า</p>
            <button
              onClick={() => setAddOpen(true)}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: G.grad, boxShadow: G.shadow }}
            >
              + เพิ่มที่อยู่
            </button>
          </div>
        ) : (
          addresses.map((addr) => (
            <div key={addr.id} className="bg-white rounded-2xl p-4"
              style={{ boxShadow: "0 2px 12px oklch(0.55 0.18 145 / 0.10)", border: "1px solid oklch(0.94 0.016 148)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm" style={{ color: G.fg }}>{addr.label}</p>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: G.grad }}>
                        หลัก
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: G.fgMuted }}>{addr.fullAddress}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3 ml-12">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: G.primaryXlt, color: G.primary, border: "1px solid oklch(0.90 0.06 148)" }}
                  >
                    ตั้งเป็นหลัก
                  </button>
                )}
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1"
                  style={{ background: "oklch(0.98 0.012 20)", color: "oklch(0.55 0.22 25)", border: "1px solid oklch(0.93 0.04 20)" }}
                >
                  <Trash2 className="w-3 h-3" /> ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddressFormDialog open={addOpen} onOpenChange={setAddOpen} onSaved={handleSaved} />
    </div>
  );
}

/* ─── Points Section ─────────────────────────────────────────────── */
function PointsSection({ data, isLoading, onBack }: {
  data?: { balance: number; transactions: PointTransaction[] };
  isLoading: boolean;
  onBack: () => void;
}) {
  const typeLabel: Record<string, string> = {
    EARN: "ซื้อสินค้า",
    REDEEM: "ใช้แต้ม",
    MANUAL_ADD: "โบนัส",
    MANUAL_DEDUCT: "หักแต้ม",
    EXPIRED: "หมดอายุ",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BackHeader title="แต้มสะสม" onBack={onBack} />

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        {/* Balance hero */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.18 85) 0%, oklch(0.65 0.22 60) 100%)" }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Award className="w-7 h-7 text-white" />
            </div>
            <p className="text-white/80 text-sm mb-1">แต้มสะสมของคุณ</p>
            <p className="text-6xl font-black text-white">{isLoading ? "—" : (data?.balance ?? 0)}</p>
            <p className="text-white/80 text-sm mt-1">แต้ม</p>
            <div className="mt-4 px-4 py-2 rounded-xl bg-white/15 inline-block">
              <p className="text-white/90 text-xs">ทุก 10 บาท = 1 แต้ม &nbsp;|&nbsp; 100 แต้ม = ลด 1 บาท</p>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 2px 12px oklch(0.55 0.18 145 / 0.10)", border: "1px solid oklch(0.94 0.016 148)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "oklch(0.94 0.016 148)" }}>
            <h3 className="font-extrabold text-sm" style={{ color: G.fg }}>ประวัติแต้ม</h3>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (data?.transactions?.length ?? 0) === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.78 0.18 85)", opacity: 0.4 }} />
              <p className="text-sm" style={{ color: G.fgMuted }}>ยังไม่มีประวัติแต้ม</p>
            </div>
          ) : (
            <div className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
              {data!.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: G.fg }}>{typeLabel[tx.type] ?? tx.type}</p>
                    <p className="text-xs mt-0.5" style={{ color: G.fgMuted }}>{formatDate(tx.createdAt)}</p>
                  </div>
                  <span className={cn(
                    "font-extrabold text-sm px-2.5 py-1 rounded-full",
                    tx.amount > 0
                      ? "text-green-700 bg-green-50"
                      : "text-red-600 bg-red-50"
                  )}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Coupons Section ───────────────────────────────────────────── */
type PromoCoupon = { id: string; code: string; name: string; type: string; value: number; minOrderAmount: number; expiresAt: string | null };

function CouponCard({ c }: { c: PromoCoupon }) {
  const [copied, setCopied] = useState(false);
  const isPercent = c.type === "PERCENT";
  const bigLabel = isPercent ? `${c.value}%` : `฿${c.value}`;
  const daysLeft = c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(c.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl overflow-hidden flex shadow-sm" style={{ border: "1.5px solid oklch(0.90 0.06 148)" }}>
      {/* Left */}
      <div className="flex flex-col items-center justify-center px-4 py-4 flex-shrink-0"
        style={{ background: G.grad, minWidth: 72 }}>
        <span className="text-white font-black text-2xl leading-none">{bigLabel}</span>
        <span className="text-white/80 text-[10px] font-semibold mt-0.5">ส่วนลด</span>
      </div>
      {/* Divider */}
      <div className="relative flex-shrink-0 w-0">
        <div className="absolute -top-2 left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-background" />
        <div className="absolute -bottom-2 left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-background" />
        <div className="h-full border-l-2 border-dashed" style={{ borderColor: "oklch(0.90 0.06 148)" }} />
      </div>
      {/* Right */}
      <div className="flex-1 px-3 py-3 bg-white min-w-0 flex flex-col gap-2">
        <p className="text-sm font-bold truncate" style={{ color: G.fg }}>{c.name}</p>
        <button
          onClick={handleCopy}
          className="flex items-center justify-between px-3 py-2 rounded-xl active:scale-[0.97] transition-all"
          style={{ background: "oklch(0.976 0.016 148)" }}
        >
          <span className="font-black text-sm tracking-widest" style={{ color: G.primaryDk }}>{c.code}</span>
          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: G.primary }}>
            {copied ? <><Check className="w-3 h-3" />คัดลอก</> : <><Copy className="w-3 h-3" />คัดลอก</>}
          </span>
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          {c.minOrderAmount > 0 && <span className="text-[11px]" style={{ color: G.fgMuted }}>ขั้นต่ำ ฿{c.minOrderAmount}</span>}
          {daysLeft !== null && (
            <span className="text-[11px] font-medium" style={{ color: daysLeft <= 3 ? "oklch(0.58 0.22 25)" : G.fgMuted }}>
              {daysLeft <= 0 ? "หมดอายุแล้ว" : `เหลือ ${daysLeft} วัน`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CouponsSection({ onBack }: { onBack: () => void }) {
  const { data: coupons = [], isLoading } = useQuery<PromoCoupon[]>({
    queryKey: ["promo-coupons"],
    queryFn: () => fetch("/api/home").then((r) => r.json()).then((d) => d.data?.activePromos ?? []),
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BackHeader
        title="คูปอง & โปรโมชั่น"
        onBack={onBack}
        action={
          !isLoading && coupons.length > 0 ? (
            <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: G.grad }}>
              {coupons.length} โค้ด
            </span>
          ) : undefined
        }
      />

      <div className="flex-1 px-4 py-4 space-y-3 pb-8">
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 148) 0%, oklch(0.94 0.06 148) 100%)", border: "1px solid oklch(0.90 0.06 148)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
            style={{ background: G.grad }}>
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: G.fg }}>โค้ดส่วนลดพิเศษ</p>
            <p className="text-xs mt-0.5" style={{ color: G.fgMuted }}>คัดลอกโค้ด แล้วใส่ตอนสั่งอาหาร</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3"
              style={{ background: "oklch(0.97 0.04 60)" }}>
              <Tag className="w-7 h-7" style={{ color: "oklch(0.65 0.16 60)", opacity: 0.6 }} />
            </div>
            <p className="font-bold text-sm" style={{ color: G.fg }}>ยังไม่มีโปรโมชั่น</p>
            <p className="text-xs mt-1" style={{ color: G.fgMuted }}>ติดตามข่าวสารจากเราได้เลย!</p>
          </div>
        ) : (
          coupons.map((c) => <CouponCard key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
}
