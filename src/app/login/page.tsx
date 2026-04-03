"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, ArrowRight, RotateCcw, ChevronLeft, Coffee, GlassWater, CupSoda, Milk, Check } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const G = {
  primary:    "oklch(0.68 0.20 148)",
  primaryDk:  "oklch(0.46 0.17 150)",
  primaryLt:  "oklch(0.93 0.06 148)",
  primaryXlt: "oklch(0.976 0.016 148)",
  fg:         "oklch(0.13 0.02 148)",
  fgMuted:    "oklch(0.50 0.04 148)",
  border:     "oklch(0.93 0.016 148)",
  grad:       "linear-gradient(135deg, oklch(0.67 0.19 148), oklch(0.46 0.17 150))",
  shadow:     "0 8px 28px oklch(0.55 0.22 145 / 0.32)",
};

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  const handleSendOTP = async () => {
    if (!phone.match(/^0[0-9]{9}$/)) { toast.error("กรุณากรอกเบอร์โทรให้ถูกต้อง (10 หลัก)"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const d = await r.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success("ส่ง OTP แล้ว");
      setStep("otp"); startCountdown();
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error("กรุณากรอก OTP 6 หลัก"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, otp }) });
      const d = await r.json();
      if (!d.success) { toast.error(d.error); return; }
      setUser(d.data.user);
      toast.success("ยินดีต้อนรับ!");
      router.replace("/menu");
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  const phoneReady = phone.length === 10;
  const otpReady   = otp.length === 6;

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(170deg, oklch(0.94 0.08 145) 0%, oklch(0.98 0.03 145) 45%, white 100%)" }}>

      {/* Deco blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-40"
        style={{ background: "radial-gradient(circle, oklch(0.70 0.22 145), transparent 70%)", transform: "translate(35%,-35%)" }} />
      <div className="absolute top-32 left-0 w-52 h-52 rounded-full pointer-events-none opacity-25"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.18 145), transparent 70%)", transform: "translate(-40%,0)" }} />

      {/* Logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-20 pb-6 relative z-10">
        <div
          className="w-24 h-24 rounded-[2.25rem] flex items-center justify-center mb-5"
          style={{ background: G.grad, boxShadow: G.shadow }}
        >
          <CupSoda className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1.5" style={{ color: G.fg }}>ช่วงเวลาคาเฟ่</h1>
        <p className="text-sm font-medium" style={{ color: G.fgMuted }}>สั่งเครื่องดื่มและอาหาร ส่งถึงบ้าน</p>

        <div className="flex gap-2 mt-5 flex-wrap justify-center">
          {[
            { icon: Coffee,      label: "กาแฟ" },
            { icon: GlassWater,  label: "ชา" },
            { icon: CupSoda,     label: "ปั่น" },
            { icon: Milk,        label: "นม" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "white", color: G.primary, boxShadow: "0 1px 4px oklch(0.63 0.18 145 / 0.15)" }}>
              <Icon className="w-3 h-3" />{label}
            </span>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 rounded-t-[2.5rem] px-6 pt-8 pb-12 bg-white" style={{ boxShadow: "0 -6px 32px oklch(0.55 0.18 145 / 0.12)" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: G.border }} />

        {step === "phone" ? (
          <>
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: G.fg }}>เข้าสู่ระบบ</h2>
            <p className="text-sm mb-7" style={{ color: G.fgMuted }}>กรอกเบอร์โทรเพื่อรับรหัส OTP</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border-2 transition-all"
                style={{ borderColor: G.border, background: G.primaryXlt }}>
                <Phone className="w-5 h-5 flex-shrink-0" style={{ color: G.primary }} />
                <input
                  type="tel" placeholder="0812345678" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="flex-1 bg-transparent text-base outline-none font-semibold"
                  style={{ color: G.fg }}
                  inputMode="tel"
                  onKeyDown={e => e.key === "Enter" && handleSendOTP()}
                />
                {phoneReady && <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: G.primaryLt }}><Check className="w-3 h-3" style={{ color: G.primary }} /></span>}
              </div>

              <button
                onClick={handleSendOTP} disabled={loading || !phoneReady}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: phoneReady ? G.grad : G.primaryXlt, color: phoneReady ? "white" : G.fgMuted, boxShadow: phoneReady ? G.shadow : "none" }}
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />กำลังส่ง...</>
                  : <><span>รับรหัส OTP</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep("phone")} className="flex items-center gap-1 mb-5 text-sm font-bold" style={{ color: G.primary }}>
              <ChevronLeft className="w-4 h-4" /> แก้ไขเบอร์โทร
            </button>
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: G.fg }}>กรอกรหัส OTP</h2>
            <p className="text-sm mb-7" style={{ color: G.fgMuted }}>
              ส่งรหัสไปยัง <span className="font-bold" style={{ color: G.fg }}>{phone}</span>
            </p>

            <div className="space-y-4">
              <input
                type="text" placeholder="• • • • • •" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full h-16 rounded-2xl text-center text-3xl font-extrabold outline-none border-2 transition-all"
                style={{
                  borderColor: otpReady ? G.primary : G.border,
                  background: G.primaryXlt, color: G.fg, letterSpacing: "0.5em",
                }}
                inputMode="numeric"
                onKeyDown={e => e.key === "Enter" && handleVerifyOTP()}
              />

              <button
                onClick={handleVerifyOTP} disabled={loading || !otpReady}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: otpReady ? G.grad : G.primaryXlt, color: otpReady ? "white" : G.fgMuted, boxShadow: otpReady ? G.shadow : "none" }}
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />กำลังตรวจสอบ...</>
                  : "ยืนยันเข้าสู่ระบบ"}
              </button>

              <div className="text-center">
                {countdown > 0
                  ? <p className="text-sm" style={{ color: G.fgMuted }}>ส่งอีกครั้งใน <span className="font-bold" style={{ color: G.primary }}>{countdown}s</span></p>
                  : <button onClick={handleSendOTP} className="text-sm font-bold flex items-center gap-1.5 mx-auto" style={{ color: G.primary }}>
                      <RotateCcw className="w-3.5 h-3.5" /> ส่งรหัสอีกครั้ง
                    </button>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
