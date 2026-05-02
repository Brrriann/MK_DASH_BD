"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GearSix } from "@phosphor-icons/react";

const MORE_ITEMS = [
  { href: "/settings", label: "설정", icon: GearSix },
] as const;

interface MoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoreDrawer({ open, onOpenChange }: MoreDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-outfit text-left text-slate-900">메뉴</SheetTitle>
        </SheetHeader>
        <nav className="space-y-1">
          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors block"
            >
              <item.icon size={16} weight="regular" className="text-slate-500" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
