"use client";

import { useEffect, useState, useCallback } from "react";
import { MagnifyingGlass, Cards, List, Plus } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ClientCard } from "@/components/clients/ClientCard";
import { ClientRow } from "@/components/clients/ClientRow";
import { ClientFormSheet } from "@/components/clients/ClientFormSheet";
import { fetchClients } from "@/lib/actions/clients";
import type { ClientWithRevenue } from "@/lib/types";

type ViewMode = "card" | "table";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClients({
        search: debouncedSearch || undefined,
        status: statusFilter,
        sortBy,
      });
      setClients(data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortBy]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">
            클라이언트 관리
          </h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {clients.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} weight="regular" />
          신규 추가
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            weight="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="회사명, 담당자, 이메일 검색"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 text-sm w-[120px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="potential">잠재</SelectItem>
            <SelectItem value="dormant">휴면</SelectItem>
            <SelectItem value="ended">종료</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "name")}>
          <SelectTrigger className="h-9 text-sm w-[140px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">이름순</SelectItem>
            <SelectItem value="total_revenue">거래액순</SelectItem>
            <SelectItem value="created_at">최신 등록순</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
              viewMode === "card"
                ? "bg-slate-100 text-slate-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="카드 보기"
          >
            <Cards size={16} weight="regular" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
              viewMode === "table"
                ? "bg-slate-100 text-slate-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="테이블 보기"
          >
            <List size={16} weight="regular" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-100">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/5" />
                  <Skeleton className="h-4 w-1/5" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
              ))}
            </div>
          </div>
        )
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Cards}
          title="클라이언트가 없습니다"
          description={
            debouncedSearch || statusFilter !== "all"
              ? "검색 조건에 맞는 클라이언트가 없습니다."
              : "신규 추가 버튼을 눌러 첫 번째 클라이언트를 등록해 보세요."
          }
        />
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  회사명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  총거래액
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  업종
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  등록일
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Sheet */}
      <ClientFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={loadClients}
      />
    </div>
  );
}
