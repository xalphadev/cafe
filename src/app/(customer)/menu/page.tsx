import type { Metadata } from "next";
import { MenuClient } from "./menu-client";

export const metadata: Metadata = { title: "เมนูอาหาร" };

export default function MenuPage() {
  return <MenuClient />;
}
