"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react";

interface NavItemProps {
  href: string;
  label: string;
  icon: Icon;
  collapsed?: boolean;
}

export function NavItem({ href, label, icon: IconComponent, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-active text-blue-300 border-l-2 border-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800",
        collapsed && "justify-center px-2"
      )}
    >
      <IconComponent size={16} weight="regular" className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
