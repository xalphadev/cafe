"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

export function AdminPushButton() {
  const [supported, setSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);

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
    <button
      onClick={isOn ? unsubscribe : subscribe}
      disabled={loading}
      title={isOn ? "ปิดแจ้งเตือนออเดอร์" : "เปิดแจ้งเตือนออเดอร์ใหม่"}
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
    </button>
  );
}
