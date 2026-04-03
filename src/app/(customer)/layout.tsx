import { BottomNav } from "@/components/customer/bottom-nav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted">
      <main className="max-w-lg mx-auto bg-background min-h-screen pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
