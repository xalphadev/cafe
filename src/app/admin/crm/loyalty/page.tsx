"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AdminLoyaltyPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({ earnRate: 10, redeemRate: 100, minRedeemPoints: 100, maxRedeemPercent: 20 });
  const [manualUserId, setManualUserId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [grantSaving, setGrantSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["loyalty-settings"],
    queryFn: () => fetch("/api/admin/loyalty").then((r) => r.json()).then((d) => d.data),
  });

  useEffect(() => { if (data) setSettings({ earnRate: data.earnRate, redeemRate: data.redeemRate, minRedeemPoints: data.minRedeemPoints, maxRedeemPercent: data.maxRedeemPercent }); }, [data]);

  const handleSaveSettings = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/loyalty", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    const d = await res.json();
    if (d.success) { toast.success("บันทึกการตั้งค่าแล้ว"); queryClient.invalidateQueries({ queryKey: ["loyalty-settings"] }); }
    else toast.error(d.error);
    setSaving(false);
  };

  const handleGrantPoints = async () => {
    if (!manualUserId || !manualAmount) { toast.error("กรุณากรอกข้อมูลให้ครบ"); return; }
    setGrantSaving(true);
    const res = await fetch("/api/admin/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: manualUserId, amount: parseInt(manualAmount), note: manualNote }),
    });
    const d = await res.json();
    if (d.success) { toast.success("ให้แต้มสำเร็จ"); setManualUserId(""); setManualAmount(""); setManualNote(""); }
    else toast.error(d.error);
    setGrantSaving(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">ตั้งค่า Loyalty Points</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">อัตราสะสม/แลกแต้ม</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ทุกกี่บาท = 1 แต้ม</Label>
              <Input className="mt-1.5" type="number" value={settings.earnRate} onChange={(e) => setSettings({ ...settings, earnRate: parseFloat(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">เช่น 10 = ทุก 10 บาท ได้ 1 แต้ม</p>
            </div>
            <div>
              <Label>กี่แต้ม = ลด 1 บาท</Label>
              <Input className="mt-1.5" type="number" value={settings.redeemRate} onChange={(e) => setSettings({ ...settings, redeemRate: parseFloat(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">เช่น 100 = 100 แต้ม ลด 1 บาท</p>
            </div>
            <div>
              <Label>แต้มขั้นต่ำที่แลกได้</Label>
              <Input className="mt-1.5" type="number" value={settings.minRedeemPoints} onChange={(e) => setSettings({ ...settings, minRedeemPoints: parseInt(e.target.value) })} />
            </div>
            <div>
              <Label>ใช้แต้มได้สูงสุด (%)</Label>
              <Input className="mt-1.5" type="number" value={settings.maxRedeemPercent} onChange={(e) => setSettings({ ...settings, maxRedeemPercent: parseFloat(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">ของยอดสั่งซื้อ</p>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-3 text-sm">
            <p className="font-medium mb-1">ตัวอย่าง:</p>
            <p className="text-muted-foreground">สั่ง 100 บาท → ได้ {Math.floor(100 / settings.earnRate)} แต้ม</p>
            <p className="text-muted-foreground">แลก 1 บาท → ใช้ {settings.redeemRate} แต้ม</p>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" /> {saving ? "บันทึก..." : "บันทึกการตั้งค่า"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4" /> ให้แต้มด้วยตนเอง</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>User ID</Label>
            <Input className="mt-1.5" value={manualUserId} onChange={(e) => setManualUserId(e.target.value)} placeholder="cuid ของผู้ใช้" />
          </div>
          <div>
            <Label>จำนวนแต้ม (ติดลบได้)</Label>
            <Input className="mt-1.5" type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="100 หรือ -50" />
          </div>
          <div>
            <Label>หมายเหตุ</Label>
            <Input className="mt-1.5" value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="โบนัสพิเศษ..." />
          </div>
          <Button onClick={handleGrantPoints} disabled={grantSaving} variant="outline" className="w-full">
            {grantSaving ? "กำลังให้แต้ม..." : "ให้แต้ม"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
