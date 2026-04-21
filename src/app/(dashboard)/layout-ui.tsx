"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MoreDrawer } from "@/components/layout/MoreDrawer";

export default function DashboardLayoutUI({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-main-bg">
      <Sidebar />
      <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />
      <main className="md:ml-16 lg:ml-60 pt-12 md:pt-0 pb-14 md:pb-0 min-h-[100dvh]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
      <MobileBottomNav onMoreClick={() => setDrawerOpen(true)} />
      <MoreDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
