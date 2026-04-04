"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight, LogOut, Edit2,
  Ticket, Tag, Copy, Check, X,
  ArrowLeft, Phone, Award, Sparkles, KeyRound, Delete,
  Lock, Key, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/store/auth";
import { formatPhone, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PointTransaction } from "@/types";

// Design tokens
const G = {
  primary:    "oklch(0.69 0.21 152)",
  primaryDk:  "oklch(0.50 0.22 155)",
  primaryLt:  "oklch(0.93 0.07 152)",
  primaryXlt: "oklch(0.976 0.014 152)",
  fg:         "oklch(0.13 0.02 152)",
  fgMuted:    "oklch(0.50 0.04 152)",
  border:     "oklch(0.90 0.010 152)",
  grad:       "linear-gradient(160deg, oklch(0.69 0.21 152) 0%, oklch(0.50 0.22 155) 100%)",
  shadow:     "0 8px 24px oklch(0.55 0.20 152 / 0.22)",
};

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [activeSection, setActiveSection] = useState<"main" | "points" | "coupons" | "change-pin">("main");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const { data: points } = useQuery<{ balance: number; transactions: PointTransaction[] }>({
    queryKey: ["user-points"],
    queryFn: () => fetch("/api/user/points").then((r) => r.json()).then((d) => d.data),
    enabled: activeSection === "points",
  });

  const handleSaveName = async () => {
    if (!name.trim()) { toast.error("กรุณากรอกชื่อ"); return; }
    if (name.trim().length > 50) { toast.error("ชื่อยาวเกินไป (ไม่เกิน 50 ตัวอักษร)"); return; }
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("บันทึกชื่อแล้ว");
      setUser({ ...user!, name: data.data.name });
      setEditName(false);
    } else toast.error(data.error ?? "เกิดข้อผิดพลาด");
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  if (activeSection !== "main") {
    return (
      <SubPanel>
        {activeSection === "points"    && <PointsSection data={points} isLoading={false} onBack={() => setActiveSection("main")} />}
        {activeSection === "coupons"   && <CouponsSection onBack={() => setActiveSection("main")} />}
        {activeSection === "change-pin"&& <ChangePinSection onBack={() => setActiveSection("main")} />}
      </SubPanel>
    );
  }

  const initials = (user?.name ?? "U").slice(0, 1).toUpperCase();
  const pts = user?.pointsBalance ?? 0;

  const menuItems = [
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
    {
      id: "change-pin",
      icon: <KeyRound className="w-5 h-5" />,
      iconBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
      label: "เปลี่ยน PIN",
      sub: "แก้ไขรหัส PIN สำหรับเข้าสู่ระบบ",
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

/* ─── Sub Panel (full-screen overlay, hides bottom nav) ────────── */
function SubPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto min-h-full">
        {children}
      </div>
    </div>
  );
}

/* ─── Shared Back Header ─────────────────────────────────────────── */
function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <header className="sticky-header bg-white/95 backdrop-blur-md px-4 h-14 pt-2 flex items-center gap-3"
      style={{ borderBottom: "1px solid oklch(0.93 0.012 152)" }}>
      <button
        onClick={onBack}
        className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
        style={{ background: "oklch(0.95 0.028 142)" }}
      >
        <ArrowLeft className="w-4 h-4" style={{ color: G.fg }} />
      </button>
      <h1 className="font-extrabold text-base flex-1" style={{ color: G.fg }}>{title}</h1>
      {action}
    </header>
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
          style={{ boxShadow: "0 2px 12px oklch(0.55 0.20 152 / 0.10)", border: "1px solid oklch(0.94 0.022 142)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "oklch(0.94 0.022 142)" }}>
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
    <div className="rounded-2xl overflow-hidden flex shadow-sm" style={{ border: "1.5px solid oklch(0.90 0.06 152)" }}>
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
        <div className="h-full border-l-2 border-dashed" style={{ borderColor: "oklch(0.90 0.06 152)" }} />
      </div>
      {/* Right */}
      <div className="flex-1 px-3 py-3 bg-white min-w-0 flex flex-col gap-2">
        <p className="text-sm font-bold truncate" style={{ color: G.fg }}>{c.name}</p>
        <button
          onClick={handleCopy}
          className="flex items-center justify-between px-3 py-2 rounded-xl active:scale-[0.97] transition-all"
          style={{ background: "oklch(0.976 0.014 152)" }}
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

/* ─── Change PIN Section ─────────────────────────────────────────── */
function PinDots({ value, total = 6 }: { value: string; total?: number }) {
  return (
    <div className="flex gap-3 justify-center my-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full transition-all duration-150"
          style={{
            background: i < value.length
              ? "oklch(0.69 0.21 152)"
              : "oklch(0.90 0.010 152)",
            transform: i < value.length ? "scale(1.2)" : "scale(1)",
            boxShadow: i < value.length ? "0 2px 8px oklch(0.62 0.27 142 / 0.4)" : "none",
          }}
        />
      ))}
    </div>
  );
}

function PinKeypad({ onPress, onDelete }: { onPress: (d: string) => void; onDelete: () => void }) {
  const rows = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]];
  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      {rows.flat().map((k, i) => {
        if (k === "") return <div key={i} />;
        if (k === "⌫") return (
          <button key={i} onClick={onDelete}
            className="h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
            style={{ background: "oklch(0.95 0.028 142)" }}>
            <Delete className="w-5 h-5" style={{ color: "oklch(0.50 0.04 152)" }} />
          </button>
        );
        return (
          <button key={i} onClick={() => onPress(k)}
            className="h-14 rounded-2xl text-xl font-bold active:scale-95 transition-all"
            style={{ background: "oklch(0.97 0.024 142)", color: "oklch(0.13 0.02 152)" }}>
            {k}
          </button>
        );
      })}
    </div>
  );
}

type PinStep = "current" | "new" | "confirm";

const STEP_ORDER: PinStep[] = ["current", "new", "confirm"];
const STEP_META: Record<PinStep, { title: string; sub: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  current: { title: "PIN ปัจจุบัน",  sub: "กรอก PIN 6 หลักที่ใช้อยู่",   Icon: Lock },
  new:     { title: "PIN ใหม่",       sub: "กรอก PIN 6 หลักที่ต้องการ",   Icon: Key },
  confirm: { title: "ยืนยัน PIN ใหม่", sub: "กรอก PIN อีกครั้งเพื่อยืนยัน", Icon: CheckCircle2 },
};

function ChangePinSection({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<PinStep>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const currentValue = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;

  const handleKey = (d: string) => {
    if (currentValue.length >= 6) return;
    const next = currentValue + d;

    if (step === "current") {
      setCurrentPin(next);
      if (next.length === 6) setStep("new");
    } else if (step === "new") {
      setNewPin(next);
      if (next.length === 6) setStep("confirm");
    } else {
      setConfirmPin(next);
      if (next.length === 6) {
        if (next !== newPin) {
          triggerShake();
          toast.error("PIN ไม่ตรงกัน กรุณาลองใหม่");
          setTimeout(() => setConfirmPin(""), 400);
          return;
        }
        doChangePin(next);
      }
    }
  };

  const handleDelete = () => {
    if (step === "current") setCurrentPin(p => p.slice(0, -1));
    else if (step === "new") setNewPin(p => p.slice(0, -1));
    else setConfirmPin(p => p.slice(0, -1));
  };

  const doChangePin = async (confirmedPin: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin: confirmedPin }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เปลี่ยน PIN สำเร็จแล้ว");
        onBack();
      } else {
        triggerShake();
        toast.error(data.error ?? "เกิดข้อผิดพลาด");
        if (data.error?.includes("ปัจจุบัน")) {
          setTimeout(() => { setCurrentPin(""); setNewPin(""); setConfirmPin(""); setStep("current"); }, 400);
        } else {
          setTimeout(() => { setNewPin(""); setConfirmPin(""); setStep("new"); }, 400);
        }
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  const stepIdx = STEP_ORDER.indexOf(step);
  const { title, sub, Icon } = STEP_META[step];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: G.grad }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <button onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.18)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-extrabold text-lg text-white flex-1">เปลี่ยน PIN</h1>
      </div>

      {/* ── White card body ── */}
      <div className="flex-1 rounded-t-[2.5rem] bg-white flex flex-col px-6 pt-8 pb-6">
        {/* Step progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEP_ORDER.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: done || active ? G.primary : "oklch(0.93 0.025 148)",
                      boxShadow: active ? `0 4px 12px ${G.primary}55` : "none",
                    }}>
                    {done
                      ? <Check className="w-4 h-4 text-white" />
                      : <span className="text-xs font-black" style={{ color: active ? "white" : "oklch(0.70 0.04 148)" }}>{i + 1}</span>}
                  </div>
                  <span className="text-[10px] font-semibold"
                    style={{ color: active ? G.primary : done ? G.primaryDk : "oklch(0.75 0.03 148)" }}>
                    {STEP_META[s].title.replace(" ใหม่","").replace("ยืนยัน ","ยืนยัน")}
                  </span>
                </div>
                {i < 2 && (
                  <div className="w-10 h-0.5 rounded-full mb-4 transition-all duration-300"
                    style={{ background: done ? G.primary : "oklch(0.90 0.010 152)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Icon + title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-3"
            style={{ background: G.primaryLt }}>
            <Icon className="w-8 h-8" style={{ color: G.primary }} />
          </div>
          <h2 className="text-xl font-extrabold" style={{ color: G.fg }}>{title}</h2>
          <p className="text-sm mt-1" style={{ color: G.fgMuted }}>{sub}</p>
        </div>

        {/* PIN dots */}
        <div className={`flex gap-4 justify-center mb-8 transition-all ${shake ? "animate-shake" : ""}`}
          style={{ animation: shake ? "shake 0.4s ease" : undefined }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-full transition-all duration-150"
              style={{
                background: i < currentValue.length ? G.primary : "oklch(0.90 0.010 152)",
                transform: i < currentValue.length ? "scale(1.25)" : "scale(1)",
                boxShadow: i < currentValue.length ? `0 2px 8px ${G.primary}55` : "none",
              }} />
          ))}
        </div>

        {/* Keypad */}
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${G.primary} transparent transparent transparent` }} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => {
              if (k === "") return <div key={i} />;
              if (k === "⌫") return (
                <button key={i} onClick={handleDelete}
                  className="h-16 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                  style={{ background: "oklch(0.95 0.028 142)" }}>
                  <Delete className="w-5 h-5" style={{ color: G.fgMuted }} />
                </button>
              );
              return (
                <button key={i} onClick={() => handleKey(k)}
                  className="h-16 rounded-2xl text-2xl font-bold active:scale-95 transition-all"
                  style={{ background: "oklch(0.97 0.024 142)", color: G.fg, boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                  {k}
                </button>
              );
            })}
          </div>
        )}

        {/* Back step link */}
        {step !== "current" && !loading && (
          <button
            onClick={() => {
              if (step === "confirm") { setConfirmPin(""); setStep("new"); }
              else { setNewPin(""); setStep("current"); }
            }}
            className="mt-5 text-sm font-semibold text-center py-2 flex items-center justify-center gap-1"
            style={{ color: G.fgMuted }}>
            <ChevronRight className="w-4 h-4 rotate-180" />
            ย้อนกลับ
          </button>
        )}
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>
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
          style={{ background: "linear-gradient(135deg, oklch(0.69 0.21 152) 0%, oklch(0.50 0.22 155) 100%)", border: "1px solid oklch(0.90 0.06 152)" }}>
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
