"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

type InteractionType = "all" | "call" | "kakao" | "email" | "meeting" | "memo";

const TYPE_OPTIONS: { value: InteractionType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "call", label: "통화" },
  { value: "kakao", label: "카톡" },
  { value: "email", label: "이메일" },
  { value: "meeting", label: "미팅" },
  { value: "memo", label: "메모" },
];

interface InteractionsFilterBarProps {
  params: { type?: string; q?: string };
}

export function InteractionsFilterBar({ params }: InteractionsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const activeType = (params.type as InteractionType) ?? "all";

  const navigate = useCallback(
    (newParams: Partial<{ type: string; q: string }>) => {
      const merged = { ...params, ...newParams };
      const sp = new URLSearchParams();
      if (merged.type && merged.type !== "all") sp.set("type", merged.type);
      if (merged.q) sp.set("q", merged.q);
      const qs = sp.toString();
      startTransition(() => {
        router.push(`${pathname}${qs ? `?${qs}` : ""}`);
      });
    },
    [params, pathname, router]
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      {/* 검색 */}
      <div className="relative flex-1 max-w-xs">
        <MagnifyingGlass
          size={16}
          weight="regular"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          defaultValue={params.q ?? ""}
          placeholder="요약 검색..."
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          onChange={(e) => {
            const val = e.target.value;
            navigate({ q: val });
          }}
        />
      </div>

      {/* 유형 필터 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TYPE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => navigate({ type: value })}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              activeType === value
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
