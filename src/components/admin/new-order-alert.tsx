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

// ── Chime sound using Web Audio API ──────────────────────────────────────
// 3-note ascending chime (pleasant, not harsh)
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

  // How many new (unacknowledged) orders
  const [pendingCount, setPendingCount] = useState(0);
  // Whether admin muted the sound
  const [muted, setMuted] = useState(false);
  // Whether admin clicked "รับรู้แล้ว" (dismisses banner until next new order)
  const [dismissed, setDismissed] = useState(false);

  // Interval handle for repeating chime
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track IDs already seen to count new ones
  const seenIdsRef  = useRef<Set<string>>(new Set());
  // Animate banner in
  const [visible, setVisible] = useState(false);

  // ── Stop repeating sound ─────────────────────────────────────────────
  const stopChime = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Start repeating sound (every 4 s) ────────────────────────────────
  const startChime = useCallback(() => {
    stopChime();
    if (muted) return;
    playChime(); // play immediately
    intervalRef.current = setInterval(() => {
      playChime();
    }, 4000);
  }, [muted, stopChime]);

  // ── Acknowledge: stop sound + dismiss banner ─────────────────────────
  const acknowledge = useCallback(() => {
    stopChime();
    setDismissed(true);
    setVisible(false);
    // Keep pendingCount so badge stays on bell icon, but banner hides
  }, [stopChime]);

  // ── Mute toggle ──────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setMuted(v => {
      const next = !v;
      if (next) stopChime(); // muting → stop
      else if (pendingCount > 0 && !dismissed) startChime(); // unmuting → resume
      return next;
    });
  }, [stopChime, startChime, pendingCount, dismissed]);

  // ── Go to orders ─────────────────────────────────────────────────────
  const goToOrders = useCallback(() => {
    acknowledge();
    router.push("/admin/orders");
  }, [acknowledge, router]);

  // ── SSE listener ─────────────────────────────────────────────────────
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
          // fallback: orderId not provided, just trigger alert
          setPendingCount(c => c + 1);
          setDismissed(false);
          setVisible(true);
        }
      } catch {}
    };

    return () => {
      es.close();
      stopChime();
    };
  }, [stopChime]);

  // ── Start chime whenever new pending arrives and not dismissed/muted ──
  useEffect(() => {
    if (pendingCount > 0 && !dismissed && !muted) {
      startChime();
      setVisible(true);
    } else {
      stopChime();
    }
  }, [pendingCount, dismissed, muted, startChime, stopChime]);

  // ── Cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => () => stopChime(), [stopChime]);

  // Nothing to show if no pending
  if (pendingCount === 0) return null;

  return (
    <>
      {/* ── Floating bottom banner (above bottom nav on mobile) ── */}
      <div
        className={cn(
          "fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm",
          "transition-all duration-500",
          (visible && !dismissed) ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
        )}
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-amber-200/60 border border-amber-200 overflow-hidden">
          {/* Animated top bar */}
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse" />

          <div className="px-4 py-3.5 flex items-center gap-3">
            {/* Icon with pulse ring */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
              {/* Ping animation */}
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 animate-ping opacity-50" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-800">
                {pendingCount > 1 ? `${pendingCount} ออเดอร์ใหม่` : "มีออเดอร์ใหม่!"}
              </p>
              <p className="text-xs text-amber-600 font-medium">รอการตอบรับ</p>
            </div>

            {/* Mute button */}
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0"
              title={muted ? "เปิดเสียง" : "ปิดเสียง"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Dismiss */}
            <button
              onClick={acknowledge}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={acknowledge}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              รับรู้แล้ว
            </button>
            <button
              onClick={goToOrders}
              className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              จัดการออเดอร์
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bell badge in header (always visible when pending) ── */}
      {dismissed && pendingCount > 0 && (
        <button
          onClick={() => { setDismissed(false); setVisible(true); if (!muted) startChime(); }}
          className="fixed top-3.5 right-16 z-40 w-7 h-7 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shadow-lg animate-bounce"
          style={{ animationDuration: "1.5s" }}
        >
          {pendingCount}
        </button>
      )}
    </>
  );
}
