"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ToggleLeft, ToggleRight, Save, CheckCircle2, XCircle, QrCode, Upload, Trash2, RefreshCw, Bell, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShopSetting } from "@/types";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    isOpen: true,
    openTime: "08:00",
    closeTime: "22:00",
    closedDays: [] as number[],
    closedMessage: "ร้านปิดอยู่ในขณะนี้",
    qrCodeUrl: null as string | null,
    phone: "",
  });

  const { data: setting } = useQuery<ShopSetting>({
    queryKey: ["admin-shop-settings"],
    queryFn: () => fetch("/api/admin/shop-settings").then((r) => r.json()).then((d) => d.data),
  });

  useEffect(() => {
    if (setting) {
      setForm({
        isOpen: setting.isOpen,
        openTime: setting.openTime,
        closeTime: setting.closeTime,
        closedDays: setting.closedDays as number[],
        closedMessage: setting.closedMessage,
        qrCodeUrl: (setting as any).qrCodeUrl ?? null,
        phone: (setting as any).phone ?? "",
      });
    }
  }, [setting]);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      closedDays: f.closedDays.includes(day)
        ? f.closedDays.filter((d) => d !== day)
        : [...f.closedDays, day],
    }));
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "qrcodes");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      const url = d.data.url;
      setForm((f) => ({ ...f, qrCodeUrl: url }));
      // save immediately
      const setting = await (await fetch("/api/admin/shop-settings")).json();
      await fetch("/api/admin/shop-settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeUrl: url }),
      });
      toast.success("อัปโหลด QR Code แล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-shop-settings"] });
    } finally {
      setQrUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveQr = async () => {
    setForm((f) => ({ ...f, qrCodeUrl: null }));
    await fetch("/api/admin/shop-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCodeUrl: null }),
    });
    toast.success("ลบ QR Code แล้ว");
    queryClient.invalidateQueries({ queryKey: ["admin-shop-settings"] });
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const d = await res.json();
      if (d.success) toast.success("ส่งการแจ้งเตือนทดสอบแล้ว — ตรวจสอบอุปกรณ์ของคุณ");
      else toast.error(d.error ?? "เกิดข้อผิดพลาด");
    } finally {
      setTestingPush(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shop-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("บันทึกการตั้งค่าแล้ว");
        queryClient.invalidateQueries({ queryKey: ["admin-shop-settings"] });
      } else {
        toast.error(d.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">ตั้งค่าร้านค้า</h1>
        <p className="text-muted-foreground text-sm mt-0.5">จัดการเวลาเปิด-ปิด และข้อความสำหรับลูกค้า</p>
      </div>

      {/* Open/Close toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">สถานะร้าน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-1.5">
                {form.isOpen
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <XCircle className="w-4 h-4 text-red-500" />}
                {form.isOpen ? "ร้านเปิดอยู่" : "ร้านปิดอยู่"}
              </p>
              <p className="text-sm text-muted-foreground">ลูกค้าจะ{form.isOpen ? "สั่งอาหารได้" : "ไม่สามารถสั่งอาหารได้"}</p>
            </div>
            <button onClick={() => setForm((f) => ({ ...f, isOpen: !f.isOpen }))}>
              {form.isOpen
                ? <ToggleRight className="w-10 h-10 text-primary" />
                : <ToggleLeft className="w-10 h-10 text-muted-foreground" />}
            </button>
          </div>

          {!form.isOpen && (
            <div>
              <Label>ข้อความแจ้งลูกค้า</Label>
              <Input
                className="mt-1.5"
                value={form.closedMessage}
                onChange={(e) => setForm({ ...form, closedMessage: e.target.value })}
                placeholder="เช่น ร้านปิดปรับปรุง กลับมาพรุ่งนี้"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ติดต่อร้าน</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>เบอร์โทรศัพท์ร้าน</Label>
          <p className="text-xs text-muted-foreground mb-1.5">ลูกค้าจะเห็นปุ่มโทรหาร้านในหน้าติดตาม order</p>
          <Input
            type="tel"
            className="mt-1"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="เช่น 0812345678"
          />
        </CardContent>
      </Card>

      {/* Operating hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">เวลาทำการ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>เวลาเปิด</Label>
              <Input
                type="time"
                className="mt-1.5"
                value={form.openTime}
                onChange={(e) => setForm({ ...form, openTime: e.target.value })}
              />
            </div>
            <div>
              <Label>เวลาปิด</Label>
              <Input
                type="time"
                className="mt-1.5"
                value={form.closeTime}
                onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>วันหยุดประจำสัปดาห์</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={
                    form.closedDays.includes(i)
                      ? { background: "oklch(0.55 0.22 25)", color: "white" }
                      : { background: "oklch(0.95 0.02 0)", color: "oklch(0.40 0.02 0)" }
                  }
                >
                  {day}
                </button>
              ))}
            </div>
            {form.closedDays.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                หยุด: {form.closedDays.sort().map((d) => DAYS[d]).join(", ")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            QR Code PromptPay ของร้าน
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            อัปโหลด QR Code จากแอปธนาคาร ลูกค้าจะเห็น QR นี้แทนการสร้างอัตโนมัติ
          </p>
        </CardHeader>
        <CardContent>
          {form.qrCodeUrl ? (
            <div className="space-y-3">
              <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-primary/20 bg-white p-3">
                <Image src={form.qrCodeUrl} alt="QR Code ร้าน" fill className="object-contain p-2" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => qrFileRef.current?.click()} disabled={qrUploading}>
                  {qrUploading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                  เปลี่ยน QR
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={handleRemoveQr}>
                  <Trash2 className="w-4 h-4 mr-1" /> ลบ
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => qrFileRef.current?.click()}
              disabled={qrUploading}
              className="w-full flex flex-col items-center gap-2 py-8 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors bg-primary/5"
            >
              {qrUploading
                ? <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                : <QrCode className="w-8 h-8 text-primary/40" />}
              <p className="text-sm font-medium text-primary/70">{qrUploading ? "กำลังอัปโหลด..." : "แตะเพื่ออัปโหลด QR Code"}</p>
              <p className="text-xs text-muted-foreground">JPG, PNG (สูงสุด 5MB)</p>
            </button>
          )}
          <input ref={qrFileRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
        </CardContent>
      </Card>

      {/* Web Push notification info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            แจ้งเตือนออเดอร์ใหม่ (ฟรี 100%)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Web Push — แจ้งเตือนผ่านเบราว์เซอร์โดยตรง ไม่ต้องสมัครบริการใดๆ ไม่มีค่าใช้จ่าย
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2.5 text-sm">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              วิธีเปิดใช้งาน
            </p>
            <ol className="space-y-1.5 text-muted-foreground text-xs list-none pl-0">
              <li className="flex gap-2"><span className="font-bold text-foreground/60 shrink-0">1.</span>กดปุ่ม 🔕 ที่มุมขวาบนของหน้า Admin</li>
              <li className="flex gap-2"><span className="font-bold text-foreground/60 shrink-0">2.</span>กด "อนุญาต" เมื่อเบราว์เซอร์ถามขอสิทธิ์แจ้งเตือน</li>
              <li className="flex gap-2"><span className="font-bold text-foreground/60 shrink-0">3.</span>ไอคอนจะเปลี่ยนเป็น 🔔 สีเขียว = พร้อมรับแจ้งเตือนแล้ว</li>
              <li className="flex gap-2"><span className="font-bold text-foreground/60 shrink-0">4.</span>ติดตั้งเว็บเป็นแอปในมือถือ (Add to Home Screen) เพื่อรับแจ้งเตือนแม้ไม่ได้เปิดเบราว์เซอร์</li>
            </ol>
            <p className="text-xs text-muted-foreground/70 pt-1 border-t border-border">
              รองรับ Chrome, Edge, Firefox, Safari (iOS 16.4+) — ใช้ได้ทั้ง Android และ iPhone
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={handleTestPush}
            disabled={testingPush}
          >
            {testingPush
              ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />กำลังส่ง...</>
              : <><SendHorizonal className="w-3.5 h-3.5 mr-2" />ทดสอบการแจ้งเตือน</>}
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
      </Button>
    </div>
  );
}
