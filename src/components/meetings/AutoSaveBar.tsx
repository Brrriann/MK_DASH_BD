"use client";

import { CheckCircle, Warning, CloudArrowUp } from "@phosphor-icons/react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveBarProps {
  status: AutoSaveStatus;
  savedAt?: Date | null;
}

export function AutoSaveBar({ status, savedAt }: AutoSaveBarProps) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <CloudArrowUp size={14} weight="regular" className="animate-pulse" />
        <span>저장 중...</span>
      </div>
    );
  }

  if (status === "saved" && savedAt) {
    const timeStr = savedAt.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <CheckCircle size={14} weight="regular" className="text-emerald-500" />
        <span>{timeStr} 자동저장됨</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
        <Warning size={14} weight="regular" />
        <span>임시저장 실패 — 수동으로 저장해주세요</span>
      </div>
    );
  }

  return null;
}
