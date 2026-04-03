import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin/dashboard");
  if (session?.role === "CUSTOMER") redirect("/home");
  redirect("/login");
}
