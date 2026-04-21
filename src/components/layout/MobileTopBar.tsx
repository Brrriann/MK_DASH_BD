"use client";

import { List } from "@phosphor-icons/react";

interface MobileTopBarProps {
  onMenuClick: () => void;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-30 h-12 bg-sidebar-bg flex items-center justify-between px-4 border-b border-slate-800">
      <span className="font-outfit text-xs font-black tracking-[0.2em] text-white">
        MAGNATE KOREA
      </span>
      <button
        onClick={onMenuClick}
        className="text-slate-400 hover:text-white transition-colors p-1"
        aria-label="더보기 메뉴"
      >
        <List size={20} weight="regular" />
      </button>
    </header>
  );
}
