"use client";

import { useEffect } from "react";
import { initLiff } from "@/lib/liff";

export function LiffInit() {
  useEffect(() => {
    initLiff().catch(() => {});
  }, []);

  return null;
}
