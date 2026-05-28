"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientsFilterBarProps {
  params: {
    q?: string;
    status?: string;
    sort?: string;
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "potential", label: "잠재" },
  { value: "dormant", label: "휴면" },
  { value: "ended", label: "종료" },
];

const STATUS_BUTTON_STYLES: Record<string, string> = {
  all: "bg-slate-900 text-white",
  active: "bg-blue-600 text-white",
  potential: "bg-amber-500 text-white",
  dormant: "bg-slate-400 text-white",
  ended: "bg-slate-200 text-slate-600",
};

export function ClientsFilterBar({ params }: ClientsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentStatus = params.status ?? "all";
  const currentSort = params.sort ?? "name";
  const currentQ = params.q ?? "";

  const [searchValue, setSearchValue] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged = { q: currentQ, status: currentStatus, sort: currentSort, ...overrides };
    if (merged.q) next.set("q", merged.q);
    if (merged.status && merged.status !== "all") next.set("status", merged.status);
    if (merged.sort && merged.sort !== "name") next.set("sort", merged.sort);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ q: value || undefined }));
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleStatusChange(status: string) {
    router.push(buildUrl({ status: status === "all" ? undefined : status }));
  }

  function handleSortChange(sort: string | null) {
    if (!sort) return;
    router.push(buildUrl({ sort: sort === "name" ? undefined : sort }));
  }

  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 검색 */}
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            weight="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="회사명, 담당자, 이메일 검색"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        {/* 정렬 */}
        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">이름순</SelectItem>
            <SelectItem value="revenue">거래액순</SelectItem>
            <SelectItem value="recent">최신순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 상태 필터 버튼 */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = currentStatus === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? STATUS_BUTTON_STYLES[opt.value]
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
