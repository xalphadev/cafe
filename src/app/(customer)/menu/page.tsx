import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuClient } from "./menu-client";

export const metadata: Metadata = { title: "เมนูอาหาร" };

export default function MenuPage() {
  return (
    <Suspense>
      <MenuClient />
    </Suspense>
  );
}
