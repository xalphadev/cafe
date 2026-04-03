"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ToggleLeft, ToggleRight, Save, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShopSetting } from "@/types";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    isOpen: true,
    openTime: "08:00",
    closeTime: "22:00",
    closedDays: [] as number[],
    closedMessage: "ร้านปิดอยู่ในขณะนี้",
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

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
      </Button>
    </div>
  );
}
