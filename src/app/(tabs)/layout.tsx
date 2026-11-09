import { BottomNav } from "@/components/layout/bottom-nav";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto max-w-lg px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
