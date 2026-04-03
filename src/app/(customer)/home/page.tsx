import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = { title: "ช่วงเวลาคาเฟ่" };

export default function HomePage() {
  return <HomeClient />;
}
