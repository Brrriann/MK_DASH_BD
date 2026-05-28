"use client";

import { useRouter, usePathname } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState, useEffect, useRef } from "react";

const SOURCES = [
  "전체",
  "숨고",
  "크몽",
  "위시캣",
  "라우드소싱",
  "Fiverr",
  "직접문의",
  "기타",
];

const STATUSES = [
  { value: "all", label: "전체" },
  { value: "신규", label: "신규" },
  { value: "연락중", label: "연락중" },
  { value: "견적발송", label: "견적발송" },
  { value: "계약", label: "계약" },
  { value: "실패", label: "실패" },
  { value: "보류", label: "보류" },
];

interface LeadsFilterBarProps {
  params: { status?: string; source?: string; q?: string };
  totalCount: number;
}

export function LeadsFilterBar({ params, totalCount }: LeadsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(params.q ?? "");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      const sp = new URLSearchParams();
      if (search) sp.set("q", search);
      if (params.status) sp.set("status", params.status);
      if (params.source) sp.set("source", params.source);
      router.push(`${pathname}?${sp.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function setFilter(key: string, value: string) {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (key !== "status" && params.status) sp.set("status", params.status);
    if (key !== "source" && params.source) sp.set("source", params.source);
    if (value && value !== "all" && value !== "전체") sp.set(key, value);
    router.push(`${pathname}?${sp.toString()}`);
  }

  const activeSource = params.source ?? "전체";
  const activeStatus = params.status ?? "all";

  return (
    <div className="space-y-3 mb-5">
      {/* 검색 */}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 회사명, 전화번호 검색"
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {/* 소스 필터 */}
      <div className="flex gap-1.5 flex-wrap">
        {SOURCES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter("source", s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeSource === s || (s === "전체" && !params.source)
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter("status", s.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeStatus === s.value
                ? "bg-slate-800 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
