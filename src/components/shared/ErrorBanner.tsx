"use client";

import { Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorBanner({
  message = "데이터를 불러오는 중 오류가 발생했습니다.",
  onRetry,
}: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
      <Warning size={16} weight="fill" className="shrink-0 text-red-500" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="text-red-600 hover:text-red-700 hover:bg-red-100 h-auto py-1 px-2"
        >
          재시도
        </Button>
      )}
    </div>
  );
}
