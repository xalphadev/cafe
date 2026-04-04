"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Phone, ArrowRight, RotateCcw, ChevronLeft,
  Coffee, GlassWater, CupSoda, Milk,
  User, Lock, KeyRound, Check, Delete,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";

const G = {
  primary:    "oklch(0.68 0.20 148)",
  primaryDk:  "oklch(0.46 0.17 150)",
  primaryLt:  "oklch(0.93 0.06 148)",
  primaryXlt: "oklch(0.976 0.016 148)",
  fg:         "oklch(0.13 0.02 148)",
  fgMuted:    "oklch(0.50 0.04 148)",
  border:     "oklch(0.93 0.016 148)",
  grad:       "linear-gradient(135deg, oklch(0.68 0.20 148) 0%, oklch(0.46 0.17 150) 100%)",
  shadow:     "0 8px 28px oklch(0.55 0.22 145 / 0.32)",
};

// step flow:
// phone → (new/no-pin) → otp → (new) → setup_name → setup_pin → setup_confirm
// phone → (has-pin)    → pin
// pin   → forgot       → otp → setup_pin → setup_confirm
type Step = "phone" | "otp" | "pin" | "setup_name" | "setup_pin" | "setup_confirm";

// ── PIN dot display ──────────────────────────────────────────────────────────
function PinDots({ value, max = 6 }: { value: string; max?: number }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full transition-all duration-150"
          style={{
            background: i < value.length ? G.primary : "transparent",
            border: `2px solid ${i < value.length ? G.primary : G.border}`,
            transform: i < value.length ? "scale(1.15)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}

// ── Numeric keypad ───────────────────────────────────────────────────────────
function Keypad({ onPress, onDelete }: { onPress: (d: string) => void; onDelete: () => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {keys.map((k, i) => {
        if (k === "") return <div key={i} />;
        if (k === "⌫") return (
          <button key={i}
            onClick={onDelete}
            className="h-14 rounded-2xl flex items-center justify-center text-lg font-semibold transition-all active:scale-95"
            style={{ background: G.primaryXlt, color: G.fgMuted }}>
            <Delete className="w-5 h-5" />
          </button>
        );
        return (
          <button key={i}
            onClick={() => onPress(k)}
            className="h-14 rounded-2xl text-xl font-bold transition-all active:scale-95"
            style={{ background: G.primaryXlt, color: G.fg }}>
            {k}
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [step, setStep]         = useState<Step>("phone");
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [pin, setPin]           = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [name, setName]         = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [userName, setUserName] = useState<string | null>(null); // from check-phone
  const [isForgot, setIsForgot] = useState(false);
  const [isNew, setIsNew]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name input when step changes
  useEffect(() => {
    if (step === "setup_name") setTimeout(() => nameRef.current?.focus(), 100);
  }, [step]);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  // ── Step 1: check phone ──
  const handleCheckPhone = async () => {
    if (!phone.match(/^0[0-9]{9}$/)) { toast.error("กรุณากรอกเบอร์โทรให้ถูกต้อง (10 หลัก)"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/check-phone", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await r.json();
      if (!d.success) { toast.error(d.error); return; }
      const { exists, hasPin, name: n } = d.data;
      setUserName(n);
      if (exists && hasPin) {
        setIsNew(false);
        setStep("pin");
      } else {
        setIsNew(!exists);
        await sendOTP();
      }
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  // ── Send OTP ──
  const sendOTP = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await r.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success("ส่ง OTP แล้ว");
      setOtp(""); setStep("otp"); startCountdown();
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  // ── Verify OTP → get otpToken ──
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error("กรุณากรอก OTP 6 หลัก"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, pinSetup: true }),
      });
      const d = await r.json();
      if (!d.success) { toast.error(d.error); return; }
      setOtpToken(d.data.otpToken);
      // New user → ask for name first; existing (forgot) → skip name
      if (isNew) setStep("setup_name");
      else { setPin(""); setStep("setup_pin"); }
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  // ── PIN login ──
  const handlePinLogin = async (value: string) => {
    if (value.length !== 6) return;
    setLoading(true);
    try {
      const r = await fetch("/api/auth/pin-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: value }),
      });
      const d = await r.json();
      if (!d.success) { toast.error(d.error); setPin(""); return; }
      setUser(d.data.user);
      toast.success(`ยินดีต้อนรับ${d.data.user.name ? " " + d.data.user.name : ""}!`);
      router.replace("/home");
    } catch { toast.error("เกิดข้อผิดพลาด"); setPin(""); } finally { setLoading(false); }
  };

  // ── Set PIN (new or reset) ──
  // Note: confirmedPin is passed directly because React state (pinConfirm) may not be committed yet
  const handleSetPin = async (confirmedPin: string) => {
    if (pin !== confirmedPin) { toast.error("PIN ไม่ตรงกัน"); setPinConfirm(""); setStep("setup_pin"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/set-pin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, otpToken, ...(isNew ? { name } : {}) }),
      });
      const d = await r.json();
      if (!d.success) { toast.error(d.error); return; }
      setUser(d.data.user);
      toast.success(isNew ? "สมัครสำเร็จ! ยินดีต้อนรับ" : "เปลี่ยน PIN สำเร็จ!");
      router.replace("/home");
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  // ── Keypad handlers ──
  const handlePinKey = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 6) handlePinLogin(next);
  };
  const handleSetupPinKey = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 6) setStep("setup_confirm");
  };
  const handleConfirmKey = (d: string) => {
    if (pinConfirm.length >= 6) return;
    const next = pinConfirm + d;
    setPinConfirm(next);
    if (next.length === 6) {
      if (next !== pin) { toast.error("PIN ไม่ตรงกัน ลองใหม่"); setPinConfirm(""); return; }
      handleSetPin(next);
    }
  };

  // ── Forgot PIN ──
  const handleForgot = async () => {
    setIsForgot(true); setIsNew(false); setPin("");
    await sendOTP();
  };

  const phoneReady = phone.length === 10;
  const otpReady   = otp.length === 6;

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(170deg, oklch(0.94 0.08 145) 0%, oklch(0.98 0.03 145) 45%, white 100%)" }}>

      {/* Deco blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-40"
        style={{ background: "radial-gradient(circle, oklch(0.70 0.22 145), transparent 70%)", transform: "translate(35%,-35%)" }} />
      <div className="absolute top-32 left-0 w-52 h-52 rounded-full pointer-events-none opacity-25"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.18 145), transparent 70%)", transform: "translate(-40%,0)" }} />

      {/* Logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-6 relative z-10">
        <div className="w-20 h-20 rounded-[1.75rem] flex items-center justify-center mb-4"
          style={{ background: G.grad, boxShadow: G.shadow }}>
          <CupSoda className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: G.fg }}>ช่วงเวลาคาเฟ่</h1>
        <p className="text-xs font-medium" style={{ color: G.fgMuted }}>สั่งเครื่องดื่มสดใหม่ รับหน้าร้าน</p>
        <div className="flex gap-1.5 mt-4 flex-wrap justify-center">
          {[{icon:Coffee,label:"กาแฟ"},{icon:GlassWater,label:"ชา"},{icon:CupSoda,label:"ปั่น"},{icon:Milk,label:"นม"}]
            .map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: "white", color: G.primary, boxShadow: "0 1px 4px oklch(0.63 0.18 145 / 0.15)" }}>
                <Icon className="w-3 h-3" />{label}
              </span>
            ))}
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 rounded-t-[2.5rem] px-6 pt-6 pb-10 bg-white"
        style={{ boxShadow: "0 -6px 32px oklch(0.55 0.18 145 / 0.12)" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: G.border }} />

        {/* ── PHONE step ── */}
        {step === "phone" && (
          <>
            <h2 className="text-xl font-extrabold mb-0.5" style={{ color: G.fg }}>เข้าสู่ระบบ</h2>
            <p className="text-sm mb-6" style={{ color: G.fgMuted }}>กรอกเบอร์โทรของคุณ</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border-2"
                style={{ borderColor: G.border, background: G.primaryXlt }}>
                <Phone className="w-5 h-5 flex-shrink-0" style={{ color: G.primary }} />
                <input
                  type="tel" placeholder="0812345678" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="flex-1 bg-transparent text-base outline-none font-semibold"
                  style={{ color: G.fg }} inputMode="tel"
                  onKeyDown={e => e.key === "Enter" && handleCheckPhone()}
                  autoFocus
                />
                {phoneReady && <Check className="w-4 h-4 flex-shrink-0" style={{ color: G.primary }} />}
              </div>
              <button
                onClick={handleCheckPhone} disabled={loading || !phoneReady}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: phoneReady ? G.grad : G.primaryXlt, color: phoneReady ? "white" : G.fgMuted, boxShadow: phoneReady ? G.shadow : "none" }}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />กำลังตรวจสอบ...</>
                  : <><span>ถัดไป</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* ── OTP step ── */}
        {step === "otp" && (
          <>
            <button onClick={() => { setStep("phone"); setIsForgot(false); }}
              className="flex items-center gap-1 mb-4 text-sm font-bold" style={{ color: G.primary }}>
              <ChevronLeft className="w-4 h-4" /> แก้ไขเบอร์โทร
            </button>
            <h2 className="text-xl font-extrabold mb-0.5" style={{ color: G.fg }}>
              {isForgot ? "รีเซ็ต PIN" : isNew ? "ยืนยันตัวตน" : "ยืนยัน OTP"}
            </h2>
            <p className="text-sm mb-6" style={{ color: G.fgMuted }}>
              ส่งรหัสไปยัง <span className="font-bold" style={{ color: G.fg }}>{phone}</span>
            </p>
            <div className="space-y-3">
              <input
                type="text" placeholder="• • • • • •" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full h-16 rounded-2xl text-center text-3xl font-extrabold outline-none border-2"
                style={{ borderColor: otpReady ? G.primary : G.border, background: G.primaryXlt, color: G.fg, letterSpacing: "0.5em" }}
                inputMode="numeric" autoFocus
                onKeyDown={e => e.key === "Enter" && handleVerifyOTP()}
              />
              <button onClick={handleVerifyOTP} disabled={loading || !otpReady}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                style={{ background: otpReady ? G.grad : G.primaryXlt, color: otpReady ? "white" : G.fgMuted, boxShadow: otpReady ? G.shadow : "none" }}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />กำลังตรวจสอบ...</>
                  : "ยืนยัน OTP"}
              </button>
              <div className="text-center pt-1">
                {countdown > 0
                  ? <p className="text-sm" style={{ color: G.fgMuted }}>ส่งอีกครั้งใน <span className="font-bold" style={{ color: G.primary }}>{countdown}s</span></p>
                  : <button onClick={sendOTP} className="text-sm font-bold flex items-center gap-1.5 mx-auto" style={{ color: G.primary }}>
                      <RotateCcw className="w-3.5 h-3.5" /> ส่งรหัสอีกครั้ง
                    </button>}
              </div>
            </div>
          </>
        )}

        {/* ── PIN login step ── */}
        {step === "pin" && (
          <>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                style={{ background: G.primaryLt }}>
                <Lock className="w-7 h-7" style={{ color: G.primary }} />
              </div>
              <h2 className="text-xl font-extrabold" style={{ color: G.fg }}>
                ยินดีต้อนรับกลับ{userName ? ` ${userName}` : ""}!
              </h2>
              <p className="text-sm mt-1" style={{ color: G.fgMuted }}>กรอก PIN 6 หลัก</p>
            </div>
            <PinDots value={pin} />
            {loading
              ? <div className="flex justify-center mt-6"><span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              : <Keypad onPress={handlePinKey} onDelete={() => setPin(p => p.slice(0, -1))} />
            }
            <button onClick={handleForgot}
              className="w-full mt-4 text-sm font-semibold text-center" style={{ color: G.fgMuted }}>
              ลืม PIN? ขอ OTP แทน
            </button>
            <button onClick={() => setStep("phone")}
              className="w-full mt-1 text-xs font-medium text-center" style={{ color: G.fgMuted }}>
              เปลี่ยนเบอร์โทร
            </button>
          </>
        )}

        {/* ── Setup name step (new users only) ── */}
        {step === "setup_name" && (
          <>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: G.primaryLt }}>
                <span className="text-sm font-bold" style={{ color: G.primary }}>1</span>
              </div>
              <div className="flex-1 h-1 rounded-full" style={{ background: G.primaryLt }}>
                <div className="h-full rounded-full w-1/3" style={{ background: G.primary }} />
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                <span className="text-sm font-bold text-gray-400">2</span>
              </div>
            </div>
            <h2 className="text-xl font-extrabold mb-0.5" style={{ color: G.fg }}>สมัครสมาชิก</h2>
            <p className="text-sm mb-6" style={{ color: G.fgMuted }}>กรอกชื่อที่ต้องการแสดง</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border-2"
                style={{ borderColor: G.border, background: G.primaryXlt }}>
                <User className="w-5 h-5 flex-shrink-0" style={{ color: G.primary }} />
                <input
                  ref={nameRef}
                  type="text" placeholder="เช่น สมชาย ดีใจ" value={name}
                  onChange={e => setName(e.target.value)}
                  className="flex-1 bg-transparent text-base outline-none font-semibold"
                  style={{ color: G.fg }}
                  onKeyDown={e => e.key === "Enter" && name.trim() && setStep("setup_pin")}
                />
                {name.trim().length > 0 && <Check className="w-4 h-4 flex-shrink-0" style={{ color: G.primary }} />}
              </div>
              <button
                onClick={() => { if (!name.trim()) { toast.error("กรุณากรอกชื่อ"); return; } setPin(""); setStep("setup_pin"); }}
                disabled={!name.trim()}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                style={{ background: name.trim() ? G.grad : G.primaryXlt, color: name.trim() ? "white" : G.fgMuted, boxShadow: name.trim() ? G.shadow : "none" }}>
                ถัดไป <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ── Setup PIN step ── */}
        {step === "setup_pin" && (
          <>
            {isNew && (
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                  <Check className="w-4 h-4" style={{ color: G.primary }} />
                </div>
                <div className="flex-1 h-1 rounded-full" style={{ background: G.primaryLt }}>
                  <div className="h-full rounded-full w-2/3" style={{ background: G.primary }} />
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: G.primaryLt }}>
                  <span className="text-sm font-bold" style={{ color: G.primary }}>2</span>
                </div>
              </div>
            )}
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                style={{ background: G.primaryLt }}>
                <KeyRound className="w-7 h-7" style={{ color: G.primary }} />
              </div>
              <h2 className="text-xl font-extrabold" style={{ color: G.fg }}>
                {isForgot ? "ตั้ง PIN ใหม่" : "กำหนด PIN"}
              </h2>
              <p className="text-sm mt-1" style={{ color: G.fgMuted }}>PIN 6 หลัก สำหรับเข้าสู่ระบบครั้งต่อไป</p>
            </div>
            <PinDots value={pin} />
            <Keypad
              onPress={handleSetupPinKey}
              onDelete={() => setPin(p => p.slice(0, -1))}
            />
          </>
        )}

        {/* ── Confirm PIN step ── */}
        {step === "setup_confirm" && (
          <>
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                style={{ background: G.primaryLt }}>
                <KeyRound className="w-7 h-7" style={{ color: G.primary }} />
              </div>
              <h2 className="text-xl font-extrabold" style={{ color: G.fg }}>ยืนยัน PIN</h2>
              <p className="text-sm mt-1" style={{ color: G.fgMuted }}>กรอก PIN อีกครั้งเพื่อยืนยัน</p>
            </div>
            <PinDots value={pinConfirm} />
            {loading
              ? <div className="flex justify-center mt-6"><span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              : <Keypad
                  onPress={handleConfirmKey}
                  onDelete={() => setPinConfirm(p => p.slice(0, -1))}
                />
            }
            <button onClick={() => { setPinConfirm(""); setPin(""); setStep("setup_pin"); }}
              className="w-full mt-3 text-sm font-semibold text-center" style={{ color: G.fgMuted }}>
              กลับแก้ไข PIN
            </button>
          </>
        )}
      </div>
    </div>
  );
}
