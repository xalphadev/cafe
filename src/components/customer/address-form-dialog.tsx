"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { MapPin, Navigation, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Dynamically import map to avoid SSR issues
const MapPicker = dynamic(() => import("./map-picker"), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
    <div className="text-sm text-muted-foreground animate-pulse">กำลังโหลดแผนที่...</div>
  </div>
) });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (addressId: string) => void;
}

interface FormState {
  label: string;
  fullAddress: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
}

const LABEL_PRESETS = ["บ้าน", "ที่ทำงาน", "ของฝาก", "อื่นๆ"];

const G = {
  primary: "oklch(0.64 0.200 145)",
  primaryDk: "oklch(0.51 0.185 148)",
  primaryLt: "oklch(0.83 0.130 140)",
  border: "oklch(0.87 0.075 140)",
  fg: "oklch(0.18 0.022 145)",
  fgMuted: "oklch(0.52 0.060 148)",
};

export default function AddressFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [step, setStep] = useState<"form" | "map">("form");
  const [form, setForm] = useState<FormState>({
    label: "บ้าน",
    fullAddress: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: "",
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]); // Bangkok default
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);

  const resetForm = () => {
    setForm({ label: "บ้าน", fullAddress: "", subdistrict: "", district: "", province: "", postalCode: "", isDefault: false });
    setSelectedPos(null);
    setStep("form");
  };

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  // Reverse geocode via Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`,
        { headers: { "Accept-Language": "th" } }
      );
      const data = await res.json();
      if (data.address) {
        const a = data.address;
        const parts = [
          a.house_number,
          a.road || a.pedestrian,
        ].filter(Boolean);
        setForm(prev => ({
          ...prev,
          fullAddress: parts.length > 0 ? parts.join(" ") : (data.display_name?.split(",")[0] ?? ""),
          subdistrict: a.suburb || a.village || a.neighbourhood || "",
          district: a.city_district || a.town || a.county || "",
          province: a.city || a.state || "",
          postalCode: a.postcode || "",
          lat,
          lng,
        }));
      }
    } catch {
      toast.error("ไม่สามารถดึงข้อมูลที่อยู่จากแผนที่ได้");
    }
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.error("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง"); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMapCenter([lat, lng]);
        setSelectedPos([lat, lng]);
        reverseGeocode(lat, lng);
        setGeoLoading(false);
        setStep("map");
      },
      () => { toast.error("ไม่สามารถระบุตำแหน่งได้"); setGeoLoading(false); },
      { timeout: 10000 }
    );
  };

  const handleMapSelect = async (lat: number, lng: number) => {
    setSelectedPos([lat, lng]);
    await reverseGeocode(lat, lng);
  };

  const handleConfirmMap = () => {
    setStep("form");
  };

  const handleSave = async () => {
    if (!form.fullAddress.trim()) { toast.error("กรุณากรอกที่อยู่"); return; }
    if (form.fullAddress.trim().length < 5) { toast.error("กรุณากรอกที่อยู่ให้ครบถ้วน"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label || "บ้าน",
          fullAddress: [
            form.fullAddress,
            form.subdistrict,
            form.district,
            form.province,
            form.postalCode,
          ].filter(Boolean).join(" ").trim(),
          subdistrict: form.subdistrict,
          district: form.district,
          province: form.province,
          postalCode: form.postalCode,
          isDefault: form.isDefault,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เพิ่มที่อยู่สำเร็จ");
        onSaved(data.data.id);
        handleClose(false);
      } else {
        toast.error(data.error ?? "เกิดข้อผิดพลาด");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    border: `1.5px solid ${G.border}`,
    borderRadius: "12px",
    fontSize: "14px",
    background: "white",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 overflow-hidden gap-0"
        style={{ borderRadius: "24px", maxWidth: "420px", width: "calc(100vw - 32px)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: G.border }}>
          <DialogTitle className="text-base font-bold" style={{ color: G.fg }}>
            {step === "map" ? "เลือกตำแหน่งบนแผนที่" : "เพิ่มที่อยู่จัดส่ง"}
          </DialogTitle>
          {step === "map" && (
            <p className="text-xs mt-0.5" style={{ color: G.fgMuted }}>
              แตะบนแผนที่เพื่อปักหมุดตำแหน่ง
            </p>
          )}
        </div>

        {/* Map Step */}
        {step === "map" && (
          <div className="flex flex-col" style={{ height: "420px" }}>
            <div className="flex-1 relative">
              <MapPicker
                center={mapCenter}
                selected={selectedPos}
                onSelect={handleMapSelect}
              />
            </div>
            {selectedPos && (
              <div className="px-4 py-3 bg-white border-t" style={{ borderColor: G.border }}>
                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: G.primary }} />
                  <p className="text-xs leading-relaxed" style={{ color: G.fg }}>
                    {[form.fullAddress, form.subdistrict, form.district, form.province].filter(Boolean).join(", ") || "กำลังโหลดที่อยู่..."}
                  </p>
                </div>
                <Button
                  className="w-full font-bold"
                  style={{ background: `linear-gradient(135deg, oklch(0.67 0.19 148), ${G.primaryDk})`, color: "white", borderRadius: "12px", height: "44px" }}
                  onClick={handleConfirmMap}
                >
                  ยืนยันตำแหน่งนี้
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Form Step */}
        {step === "form" && (
          <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: "70vh" }}>

            {/* Map picker button */}
            <button
              onClick={() => setStep("map")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: G.primaryLt,
                border: `1.5px solid oklch(0.88 0.06 152)`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, oklch(0.67 0.19 148), ${G.primaryDk})` }}
              >
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: G.fg }}>เลือกจากแผนที่</p>
                <p className="text-xs" style={{ color: G.fgMuted }}>ปักหมุดตำแหน่งบนแผนที่</p>
              </div>
              {selectedPos && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: G.primary }}>
                  <Check className="w-2.5 h-2.5" /> เลือกแล้ว
                </span>
              )}
            </button>

            {/* Use my location button */}
            <button
              onClick={handleUseMyLocation}
              disabled={geoLoading}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: "white",
                border: `1.5px solid ${G.border}`,
                opacity: geoLoading ? 0.6 : 1,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.96 0.05 240)", border: "1px solid oklch(0.88 0.08 240)" }}
              >
                <Navigation className="w-4 h-4" style={{ color: "oklch(0.50 0.20 240)" }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: G.fg }}>
                  {geoLoading ? "กำลังระบุตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน"}
                </p>
                <p className="text-xs" style={{ color: G.fgMuted }}>GPS อัตโนมัติ</p>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ background: G.border }} />
              <span className="text-xs px-2" style={{ color: G.fgMuted }}>หรือกรอกเอง</span>
              <div className="flex-1 h-px" style={{ background: G.border }} />
            </div>

            {/* Label presets */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: G.fgMuted }}>ชื่อที่อยู่</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {LABEL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setForm({ ...form, label: preset })}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={
                      form.label === preset
                        ? { background: G.primary, color: "white" }
                        : { background: G.primaryLt, color: G.fg, border: `1px solid oklch(0.88 0.06 152)` }
                    }
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {form.label === "อื่นๆ" && (
                <Input
                  placeholder="ระบุชื่อที่อยู่"
                  value={form.label === "อื่นๆ" ? "" : form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="h-10"
                  style={inputStyle}
                />
              )}
            </div>

            {/* Full address textarea */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: G.fgMuted }}>
                บ้านเลขที่ / ถนน / อาคาร <span style={{ color: "oklch(0.55 0.22 25)" }}>*</span>
              </p>
              <textarea
                placeholder="เช่น 123/4 ถนนสุขุมวิท อาคาร XYZ ชั้น 3"
                value={form.fullAddress}
                onChange={(e) => setForm({ ...form, fullAddress: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 text-sm resize-none focus:outline-none"
                style={{ ...inputStyle, display: "block" }}
              />
            </div>

            {/* Subdistrict + District */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: G.fgMuted }}>แขวง/ตำบล</p>
                <Input
                  placeholder="แขวง / ตำบล"
                  value={form.subdistrict}
                  onChange={(e) => setForm({ ...form, subdistrict: e.target.value })}
                  className="h-10 text-sm"
                  style={inputStyle}
                />
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: G.fgMuted }}>เขต/อำเภอ</p>
                <Input
                  placeholder="เขต / อำเภอ"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="h-10 text-sm"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Province + Postal */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: G.fgMuted }}>จังหวัด</p>
                <Input
                  placeholder="จังหวัด"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  className="h-10 text-sm"
                  style={inputStyle}
                />
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: G.fgMuted }}>รหัสไปรษณีย์</p>
                <Input
                  placeholder="10110"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className="h-10 text-sm"
                  inputMode="numeric"
                  maxLength={5}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Default checkbox */}
            <label
              className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer"
              style={{ background: G.primaryLt, border: `1px solid oklch(0.90 0.06 152)` }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: form.isDefault ? G.primary : "white",
                  border: `2px solid ${form.isDefault ? G.primary : G.border}`,
                }}
                onClick={() => setForm({ ...form, isDefault: !form.isDefault })}
              >
                {form.isDefault && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: G.fg }}>ตั้งเป็นที่อยู่หลัก</p>
                <p className="text-xs" style={{ color: G.fgMuted }}>ระบบจะเลือกที่อยู่นี้โดยอัตโนมัติ</p>
              </div>
            </label>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={saving || !form.fullAddress.trim()}
              className="w-full font-bold text-base"
              style={{
                background: `linear-gradient(135deg, oklch(0.67 0.19 148), ${G.primaryDk})`,
                color: "white",
                borderRadius: "14px",
                height: "52px",
                boxShadow: "0 4px 16px oklch(0.51 0.18 148 / 0.35)",
              }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                  </svg>
                  กำลังบันทึก...
                </span>
              ) : "บันทึกที่อยู่"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
