"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

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
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
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
