"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, X, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shared AudioContext — iOS ต้อง resume หลัง user gesture ──────────────
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedCtx) sharedCtx = new AudioContext();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** เรียกตอน user แตะหน้าจอครั้งแรก เพื่อปลดล็อก iOS audio */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

// ── Shared mute state via localStorage + custom event ────────────────────
const MUTE_KEY = "admin-chime-muted";
const MUTE_EVENT = "admin-chime-muted-change";

function getMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "true";
}

function setMutedStorage(value: boolean) {
  localStorage.setItem(MUTE_KEY, String(value));
  window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: value }));
}

export function useMuteChime(): [boolean, () => void] {
  const [muted, setMuted] = useState<boolean>(() => getMuted());

  useEffect(() => {
    const handler = (e: Event) => setMuted((e as CustomEvent<boolean>).detail);
    window.addEventListener(MUTE_EVENT, handler);
    return () => window.removeEventListener(MUTE_EVENT, handler);
  }, []);

  const toggle = useCallback(() => setMutedStorage(!getMuted()), []);
  return [muted, toggle];
}

// ── Chime sound using Web Audio API ──────────────────────────────────────
function playChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") { ctx.resume(); return; }

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {}
}

// ── Component ──────────────────────────────────────────────────────────────
export function NewOrderAlert() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [muted, toggleMuteRaw] = useMuteChime();
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIdsRef  = useRef<Set<string>>(new Set());
  const [visible, setVisible] = useState(false);

  const stopChime = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startChime = useCallback(() => {
    stopChime();
    if (getMuted()) return;
    playChime();
    intervalRef.current = setInterval(playChime, 4000);
  }, [stopChime]);

  const acknowledge = useCallback(() => {
    stopChime();
    setDismissed(true);
    setVisible(false);
  }, [stopChime]);

  const toggleMute = useCallback(() => {
    const next = !getMuted();
    toggleMuteRaw();
    if (next) stopChime();
    else if (pendingCount > 0 && !dismissed) startChime();
  }, [toggleMuteRaw, stopChime, startChime, pendingCount, dismissed]);

  const goToOrders = useCallback(() => {
    acknowledge();
    router.push("/admin/orders");
  }, [acknowledge, router]);

  useEffect(() => {
    const es = new EventSource("/api/sse/orders");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "new_order" && ev.orderId && !seenIdsRef.current.has(ev.orderId)) {
          seenIdsRef.current.add(ev.orderId);
          setPendingCount(c => c + 1);
          setDismissed(false);
          setVisible(true);
        } else if (ev.type === "new_order" && !ev.orderId) {
          setPendingCount(c => c + 1);
          setDismissed(false);
          setVisible(true);
        }
      } catch {}
    };
    return () => { es.close(); stopChime(); };
  }, [stopChime]);

  useEffect(() => {
    if (pendingCount > 0 && !dismissed && !muted) { startChime(); setVisible(true); }
    else stopChime();
  }, [pendingCount, dismissed, muted, startChime, stopChime]);

  useEffect(() => () => stopChime(), [stopChime]);

  if (pendingCount === 0) return null;

  return (
    <>
      {/* ── Floating bottom banner ── */}
      <div className={cn(
        "fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm",
        "transition-all duration-500",
        (visible && !dismissed) ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
      )}>
        <div className="bg-white rounded-2xl shadow-2xl shadow-amber-200/60 border border-amber-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse" />
          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 animate-ping opacity-50" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-800">
                {pendingCount > 1 ? `${pendingCount} ออเดอร์ใหม่` : "มีออเดอร์ใหม่!"}
              </p>
              <p className="text-xs text-amber-600 font-medium">รอการตอบรับ</p>
            </div>
            <button onClick={toggleMute}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0"
              title={muted ? "เปิดเสียง" : "ปิดเสียง"}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={acknowledge}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={acknowledge}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors">
              รับรู้แล้ว
            </button>
            <button onClick={goToOrders}
              className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors">
              จัดการออเดอร์
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Badge เมื่อ dismiss แล้ว ── */}
      {dismissed && pendingCount > 0 && (
        <button
          onClick={() => { setDismissed(false); setVisible(true); if (!muted) startChime(); }}
          className="fixed top-3.5 right-16 z-40 w-7 h-7 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shadow-lg animate-bounce"
          style={{ animationDuration: "1.5s" }}>
          {pendingCount}
        </button>
      )}
    </>
  );
}
