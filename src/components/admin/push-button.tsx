"use client";

import { useState, useEffect } from "react";
import { BellOff, BellRing, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

function useIOSPushStatus() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const standalone =
      ("standalone" in navigator && (navigator as Navigator & { standalone: boolean }).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(ios);
    setIsStandalone(standalone);
  }, []);

  return { isIOS, isStandalone };
}

function IOSGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">เปิดแจ้งเตือนบน iOS</p>
                <p className="text-xs text-slate-500">ต้องทำก่อน 2 ขั้นตอน</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          <ol className="space-y-3 mt-4">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">กดปุ่ม Share ใน Safari</p>
                <p className="text-xs text-slate-500 mt-0.5">ปุ่มสี่เหลี่ยมมีลูกศรชี้ขึ้น ด้านล่างหน้าจอ</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">เลือก &ldquo;Add to Home Screen&rdquo;</p>
                <p className="text-xs text-slate-500 mt-0.5">เพิ่มไอคอนแอปลงหน้าจอหลัก</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">เปิดแอปจากไอคอนที่เพิ่มไว้</p>
                <p className="text-xs text-slate-500 mt-0.5">แล้วกดปุ่มกระดิ่งเพื่อเปิดแจ้งเตือน</p>
              </div>
            </li>
          </ol>

          <button
            onClick={onClose}
            className="mt-5 w-full h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPushButton() {
  const [supported, setSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { isIOS, isStandalone } = useIOSPushStatus();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscription(sub));
  }, []);

  if (!supported) return null;

  async function subscribe() {
    // iOS ที่ยังไม่ได้ Add to Home Screen → แสดง guide แทน
    if (isIOS && !isStandalone) {
      setShowIOSGuide(true);
      return;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });
      const serialized = JSON.parse(JSON.stringify(sub)) as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serialized),
      });
      if (res.ok) {
        setSubscription(sub);
        toast.success("เปิดแจ้งเตือนออเดอร์ใหม่แล้ว");
      }
    } catch {
      toast.error("ไม่สามารถเปิดแจ้งเตือนได้");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    setLoading(true);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      setSubscription(null);
      toast.success("ปิดแจ้งเตือนแล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const isOn = !!subscription;

  return (
    <>
      <button
        onClick={isOn ? unsubscribe : subscribe}
        disabled={loading}
        title={
          isIOS && !isStandalone
            ? "ดูวิธีเปิดแจ้งเตือนบน iOS"
            : isOn
            ? "ปิดแจ้งเตือนออเดอร์"
            : "เปิดแจ้งเตือนออเดอร์ใหม่"
        }
        className="relative p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
      >
        {isOn ? (
          <BellRing className="w-5 h-5 text-primary" />
        ) : (
          <BellOff className="w-5 h-5 text-muted-foreground" />
        )}
        {isOn && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-500" />
        )}
        {/* iOS indicator — ยังไม่ได้ Add to Home Screen */}
        {isIOS && !isStandalone && !isOn && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400" />
        )}
      </button>

      {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
    </>
  );
}
