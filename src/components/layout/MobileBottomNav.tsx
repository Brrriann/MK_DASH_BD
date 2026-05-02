"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, Buildings, Kanban, FileText, DotsThree } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "홈", icon: SquaresFour },
  { href: "/clients", label: "클라이언트", icon: Buildings },
  { href: "/projects", label: "프로젝트", icon: Kanban },
  { href: "/estimates", label: "견적서", icon: FileText },
] as const;

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white border-t border-slate-200 flex shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)]">
      {TABS.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
              isActive ? "text-blue-600" : "text-slate-400"
            )}
          >
            <tab.icon size={20} weight={isActive ? "fill" : "regular"} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <DotsThree size={20} weight="regular" />
        <span className="text-[10px] font-medium">더보기</span>
      </button>
    </nav>
  );
}
