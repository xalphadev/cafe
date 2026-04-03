"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Clock, RefreshCw, Upload, ImageIcon, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";

const G = {
  primary: "oklch(0.68 0.20 148)",
  primaryDk: "oklch(0.46 0.17 150)",
  primaryLt: "oklch(0.93 0.06 148)",
  grad: "linear-gradient(135deg, oklch(0.67 0.19 148), oklch(0.46 0.17 150))",
};

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [qrData, setQrData] = useState<{ qrDataUrl: string; amount: number } | null>(null);
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
        toast.success("อัปโหลดสลิปสำเร็จ! รอร้านตรวจสอบ");
      } else {
        toast.error(verData.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const mins = Math.floor(countdown / 60).toString().padStart(2, "0");
  const secs = (countdown % 60).toString().padStart(2, "0");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: G.primary }} />
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-8 bg-background">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-700">ชำระเงินสำเร็จ!</h2>
        <p className="text-muted-foreground">กำลังไปยังหน้าติดตามออเดอร์...</p>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-8 bg-background">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center"><Clock className="w-8 h-8 text-orange-500" /></div>
        <h2 className="text-xl font-bold">หมดเวลาชำระเงิน</h2>
        <p className="text-muted-foreground text-sm">โปรดทำรายการใหม่อีกครั้ง</p>
        <Button onClick={() => router.push("/menu")}>กลับหน้าเมนู</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b px-4 h-14 flex items-center">
        <h1 className="font-bold text-lg">ชำระด้วย QR PromptPay</h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-5 gap-5 py-6 pb-8">
        {/* Amount */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">ยอดชำระ</p>
          <p className="text-4xl font-bold" style={{ color: G.primary }}>
            {qrData ? formatPrice(qrData.amount) : "—"}
          </p>
        </div>

        {/* QR Code */}
        {qrData && (
          <div className="rounded-3xl p-4 shadow-xl" style={{ border: `3px solid oklch(0.90 0.08 145)` }}>
            <Image src={qrData.qrDataUrl} alt="QR PromptPay" width={240} height={240} className="rounded-xl" />
          </div>
        )}

        {/* Countdown */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>หมดเวลาใน <span className="font-bold tabular-nums" style={{ color: G.primary }}>{mins}:{secs}</span></span>
        </div>

        {/* Instructions */}
        <div className="w-full rounded-2xl p-4 text-sm space-y-1" style={{ background: "oklch(0.97 0.04 60)", border: "1px solid oklch(0.92 0.08 60)" }}>
          <p className="font-semibold text-amber-800">วิธีชำระเงิน:</p>
          {["เปิดแอปธนาคารของคุณ", "สแกน QR Code ด้านบน", "ตรวจสอบยอดและยืนยันการโอน", "อัปโหลดสลิปด้านล่าง"].map((s, i) => (
            <p key={i} className="text-amber-700">{i + 1}. {s}</p>
          ))}
        </div>

        {/* Slip Upload */}
        <div className="w-full rounded-2xl p-4 space-y-3" style={{ background: G.primaryLt, border: `1px solid oklch(0.88 0.07 145)` }}>
          <p className="font-semibold text-sm" style={{ color: G.primaryDk }}>
            <Paperclip className="w-4 h-4 inline-block mr-1" />แนบสลิปการโอน
          </p>

          {slipUploaded ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700">อัปโหลดสลิปแล้ว</p>
                <p className="text-xs text-green-600">รอร้านตรวจสอบและยืนยัน</p>
              </div>
            </div>
          ) : slipPreview ? (
            <div className="relative">
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
                <Image src={slipPreview} alt="สลิป" fill className="object-contain bg-white" />
              </div>
              <button
                onClick={() => { setSlipFile(null); setSlipPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <Button
                onClick={handleUploadSlip}
                disabled={uploading}
                className="w-full mt-2 font-bold"
                style={{ background: G.grad, color: "white", borderRadius: "12px" }}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> กำลังอัปโหลด...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" /> ส่งสลิปให้ร้าน
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed transition-all active:scale-[0.98]"
              style={{ borderColor: "oklch(0.78 0.12 145)", color: G.primaryDk }}
            >
              <ImageIcon className="w-8 h-8 opacity-60" />
              <p className="text-sm font-medium">แตะเพื่อเลือกรูปสลิป</p>
              <p className="text-xs text-muted-foreground">JPG, PNG (สูงสุด 5MB)</p>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/orders/${params.id}`)}
        >
          ชำระภายหลัง
        </Button>
      </div>
    </div>
  );
}
