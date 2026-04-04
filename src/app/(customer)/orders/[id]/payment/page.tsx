"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2, Clock, RefreshCw, Upload, ImageIcon, X,
  Smartphone, ChevronLeft, Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";

const G = {
  grad:    "linear-gradient(160deg, oklch(0.72 0.22 152) 0%, oklch(0.55 0.22 155) 100%)",
  gradLt:  "linear-gradient(135deg, oklch(0.72 0.22 152) 0%, oklch(0.55 0.22 155) 100%)",
  primary: "oklch(0.72 0.22 152)",
  shadow:  "0 8px 24px oklch(0.55 0.18 155 / 0.28)",
};

type QrData = { qrDataUrl: string | null; shopQrUrl: string | null; amount: number };

const steps = [
  { n: "1", text: "เปิดแอปธนาคารของคุณ" },
  { n: "2", text: "สแกน QR Code ด้านบน" },
  { n: "3", text: "ตรวจสอบยอดและยืนยันการโอน" },
  { n: "4", text: "อัปโหลดสลิปด้านล่าง" },
];

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [qrData, setQrData] = useState<QrData | null>(null);
  const [countdown, setCountdown] = useState(900);
  const [status, setStatus] = useState<"waiting" | "paid" | "expired">("waiting");
  const [loading, setLoading] = useState(true);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slipUploaded, setSlipUploaded] = useState(false);

  useEffect(() => {
    fetch(`/api/payment/qr?orderId=${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setQrData(d.data); setLoading(false); });
  }, [params.id]);

  useEffect(() => {
    if (countdown <= 0) { setStatus("expired"); return; }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (status !== "waiting") return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: params.id }),
      });
      const data = await res.json();
      if (data.success && data.data.verified) {
        setStatus("paid");
        clearInterval(interval);
        setTimeout(() => router.push(`/orders/${params.id}`), 2000);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [params.id, status, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    setSlipPreview(URL.createObjectURL(file));
  };

  const handleUploadSlip = async () => {
    if (!slipFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", slipFile);
      fd.append("folder", "payment-slips");
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upData.success) { toast.error(upData.error); return; }

      const verRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: params.id, slipUrl: upData.data.url }),
      });
      const verData = await verRes.json();
      if (verData.success) {
        setSlipUploaded(true);
        toast.success("ส่งสลิปสำเร็จ! รอร้านตรวจสอบ");
      } else {
        toast.error(verData.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const mins = Math.floor(countdown / 60).toString().padStart(2, "0");
  const secs = (countdown % 60).toString().padStart(2, "0");
  const qrSrc = qrData?.shopQrUrl ?? qrData?.qrDataUrl;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: G.primary }} />
          <p className="text-sm text-gray-400">กำลังโหลด QR Code...</p>
        </div>
      </div>
    );
  }

  /* ── Paid ── */
  if (status === "paid") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 text-center px-8 bg-gray-50">
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)" }}>
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-800">ชำระเงินสำเร็จ!</h2>
          <p className="text-gray-400 mt-1 text-sm">กำลังพาไปติดตามออเดอร์...</p>
        </div>
      </div>
    );
  }

  /* ── Expired ── */
  if (status === "expired") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 text-center px-8 bg-gray-50">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
          <Clock className="w-10 h-10 text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">หมดเวลาชำระเงิน</h2>
          <p className="text-gray-400 text-sm mt-1">โปรดทำรายการใหม่อีกครั้ง</p>
        </div>
        <button onClick={() => router.push("/menu")}
          className="px-8 py-3 rounded-2xl text-white font-bold text-sm"
          style={{ background: G.grad, boxShadow: G.shadow }}>
          กลับหน้าเมนู
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="sticky-header bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 h-14 pt-2">
          <button
            onClick={() => router.push(`/orders/${params.id}`)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.95 0.028 142)" }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: G.primary }} />
          </button>
          <div className="flex-1">
            <h1 className="font-extrabold text-base text-gray-800">ชำระด้วย QR PromptPay</h1>
          </div>
          {/* Countdown chip */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: countdown < 120 ? "oklch(0.97 0.04 25)" : "oklch(0.95 0.028 142)" }}>
            <Clock className="w-3 h-3" style={{ color: countdown < 120 ? "oklch(0.58 0.22 25)" : G.primary }} />
            <span className="text-xs font-black tabular-nums"
              style={{ color: countdown < 120 ? "oklch(0.58 0.22 25)" : G.primary }}>
              {mins}:{secs}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-5 space-y-4 pb-8">

        {/* ── Amount + QR card ── */}
        <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>
          {/* Amount banner */}
          <div className="px-5 pt-5 pb-4 text-center" style={{ background: G.gradLt }}>
            <p className="text-xs text-gray-500 font-medium mb-1">ยอดที่ต้องชำระ</p>
            <p className="text-5xl font-black" style={{ color: G.primary }}>
              {qrData ? formatPrice(qrData.amount) : "—"}
            </p>
            {qrData?.shopQrUrl && (
              <p className="text-[11px] text-gray-400 mt-1.5">กรุณาพิมพ์ยอดเองในแอปธนาคาร</p>
            )}
          </div>

          {/* QR Image */}
          {qrSrc && (
            <div className="flex justify-center px-6 py-5">
              <div className="relative p-4 rounded-2xl bg-white"
                style={{ border: "2px solid oklch(0.90 0.06 152)", boxShadow: "0 4px 20px oklch(0.55 0.18 155 / 0.12)" }}>
                <Image
                  src={qrSrc}
                  alt="QR PromptPay"
                  width={220}
                  height={220}
                  className="rounded-xl"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-[11px] font-bold"
                  style={{ background: G.grad, boxShadow: G.shadow }}>
                  <Smartphone className="w-3 h-3" />
                  สแกนเพื่อจ่าย
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="px-5 pt-3 pb-5">
            <div className="rounded-2xl p-4 space-y-2.5"
              style={{ background: "oklch(0.97 0.04 60)", border: "1px solid oklch(0.92 0.08 60)" }}>
              <p className="text-xs font-bold text-amber-700 mb-1">วิธีชำระเงิน</p>
              {steps.map((s) => (
                <div key={s.n} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 text-white"
                    style={{ background: "oklch(0.72 0.16 65)" }}>
                    {s.n}
                  </span>
                  <p className="text-xs text-amber-800">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Slip upload ── */}
        <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: G.gradLt }}>
              <Banknote className="w-4 h-4" style={{ color: G.primary }} />
            </div>
            <span className="font-bold text-sm text-gray-800">แนบสลิปการโอน</span>
          </div>

          <div className="px-5 pb-5 pt-1">
            {slipUploaded ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", border: "1px solid #6ee7b7" }}>
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-700">ส่งสลิปให้ร้านแล้ว</p>
                  <p className="text-xs text-green-600 mt-0.5">รอร้านตรวจสอบและยืนยัน</p>
                </div>
              </div>
            ) : slipPreview ? (
              <div className="space-y-3">
                <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-gray-100">
                  <Image src={slipPreview} alt="สลิป" fill className="object-contain" />
                  <button
                    onClick={() => { setSlipFile(null); setSlipPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <button
                  onClick={handleUploadSlip}
                  disabled={uploading}
                  className="w-full h-13 py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: G.grad, boxShadow: G.shadow }}
                >
                  {uploading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> กำลังส่งสลิป...</>
                    : <><Upload className="w-4 h-4" /> ส่งสลิปให้ร้าน</>
                  }
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-7 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98]"
                style={{ borderColor: "oklch(0.82 0.10 152)", background: G.gradLt }}
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center"
                  style={{ boxShadow: "0 2px 8px oklch(0.55 0.18 155 / 0.15)" }}>
                  <ImageIcon className="w-6 h-6" style={{ color: G.primary }} />
                </div>
                <p className="text-sm font-bold" style={{ color: G.primary }}>แตะเพื่อเลือกรูปสลิป</p>
                <p className="text-xs text-gray-400">JPG, PNG (สูงสุด 5MB)</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
        </div>

        {/* ── Pay later ── */}
        <button
          onClick={() => router.push(`/orders/${params.id}`)}
          className="w-full h-12 rounded-2xl text-sm font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          ชำระภายหลัง
        </button>

      </div>
    </div>
  );
}
