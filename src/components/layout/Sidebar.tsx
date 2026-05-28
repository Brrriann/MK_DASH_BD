"use client";

import {
  SquaresFour, FunnelSimple, Buildings, ChatCircleDots, Kanban, FolderOpen, GearSix
} from "@phosphor-icons/react";
import { NavItem } from "./NavItem";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: SquaresFour },
  { href: "/leads", label: "리드", icon: FunnelSimple },
  { href: "/clients", label: "고객", icon: Buildings },
  { href: "/interactions", label: "소통기록", icon: ChatCircleDots },
  { href: "/projects", label: "프로젝트", icon: Kanban },
  { href: "/documents", label: "서류함", icon: FolderOpen },
] as const;

export function Sidebar() {
  return (
    <TooltipProvider>
      <aside className="fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar-bg border-r border-slate-800 w-16 lg:w-60">
        {/* 데스크톱: 240px */}
        <div className="hidden lg:flex flex-col h-full py-5">
          <div className="px-4 mb-6">
            <span className="font-outfit text-xs font-black tracking-[0.2em] text-white">
              MAGNATE KOREA
            </span>
          </div>
          <nav className="flex-1 px-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
          <div className="px-3 pt-4 border-t border-slate-800">
            <NavItem href="/settings" label="설정" icon={GearSix} />
          </div>
        </div>

        {/* 태블릿: 64px 아이콘 */}
        <div className="flex lg:hidden flex-col h-full py-5 items-center">
          <div className="mb-6">
            <span className="font-outfit text-xs font-black text-white">MK</span>
          </div>
          <nav className="flex-1 space-y-1 w-full px-2">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger>
                  <div><NavItem {...item} collapsed /></div>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
          <div className="w-full px-2 pt-4 border-t border-slate-800">
            <Tooltip>
              <TooltipTrigger>
                <div><NavItem href="/settings" label="설정" icon={GearSix} collapsed /></div>
              </TooltipTrigger>
              <TooltipContent side="right">설정</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
