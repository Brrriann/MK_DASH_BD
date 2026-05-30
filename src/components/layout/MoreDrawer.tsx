"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Kanban, CalendarBlank, FolderOpen, GearSix } from "@phosphor-icons/react";

const MAIN_ITEMS = [
  { href: "/projects", label: "프로젝트", icon: Kanban },
  { href: "/schedule", label: "캘린더", icon: CalendarBlank },
  { href: "/documents", label: "서류함", icon: FolderOpen },
] as const;

const SETTINGS_ITEM = { href: "/settings", label: "설정", icon: GearSix };

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
          {MAIN_ITEMS.map((item) => (
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
          <div className="border-t border-slate-100 my-2" />
          <Link
            href={SETTINGS_ITEM.href}
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors block"
          >
            <SETTINGS_ITEM.icon size={16} weight="regular" className="text-slate-500" />
            <span className="font-medium text-sm">{SETTINGS_ITEM.label}</span>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
