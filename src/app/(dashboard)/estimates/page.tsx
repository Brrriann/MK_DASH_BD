"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, PencilSimple, Trash, FilePdf, FileText } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { EstimateFormDialog } from "@/components/estimates/EstimateFormDialog";
import { fetchEstimates, deleteEstimate, type Estimate } from "@/lib/actions/estimates";
import { fetchClients } from "@/lib/actions/clients";
import { formatKRW, formatDate } from "@/lib/utils";
import type { ClientWithRevenue } from "@/lib/types";

const estimateStatusLabel: Record<Estimate["status"], string> = {
  pending: "검토중",
  accepted: "수락",
  expired: "만료",
};

const estimateStatusClass: Record<Estimate["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

function StatusBadge({ status }: { status: Estimate["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estimateStatusClass[status]}`}
    >
      {estimateStatusLabel[status]}
    </span>
  );
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [estimatesData, clientsData] = await Promise.all([
        fetchEstimates({
          status: statusFilter !== "all" ? statusFilter : undefined,
          clientId: clientFilter !== "all" ? clientFilter : undefined,
        }),
        fetchClients(),
      ]);
      setEstimates(estimatesData);
      setClients(clientsData);
    } catch {
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getClientName(clientId: string | null): string {
    if (!clientId) return "";
    return clients.find((c) => c.id === clientId)?.company_name ?? "";
  }

  async function handleDelete(estimate: Estimate) {
    if (!window.confirm(`"${estimate.title}" 견적서를 삭제할까요?`)) return;
    try {
      await deleteEstimate(estimate.id);
      setEstimates((prev) => prev.filter((e) => e.id !== estimate.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  function handleEdit(estimate: Estimate) {
    setEditingEstimate(estimate);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditingEstimate(null);
    setDialogOpen(true);
  }

  function handleSaved(saved: Estimate) {
    setEstimates((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  const totalAmount = estimates.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 shrink-0">
            견적서
          </h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shrink-0">
              {estimates.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus size={16} weight="regular" />
          <span className="hidden sm:inline">새 견적서</span>
          <span className="sm:hidden">추가</span>
        </button>
      </div>

      {/* Filters + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">검토중</SelectItem>
            <SelectItem value="accepted">수락</SelectItem>
            <SelectItem value="expired">만료</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? "all")}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[200px]">
            <SelectValue placeholder="클라이언트 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 클라이언트</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!loading && estimates.length > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-slate-400">합계</span>
            <span className="text-sm font-semibold text-slate-900">
              {formatKRW(totalAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <>
          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-100">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
              </div>
            ))}
          </div>
        </>
      ) : estimates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="견적서가 없습니다"
          description="새 견적서 버튼으로 첫 번째 항목을 추가해보세요"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {estimates.map((estimate) => {
              const clientName = getClientName(estimate.client_id);
              return (
                <div
                  key={estimate.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-outfit font-semibold text-slate-900 text-sm leading-snug">
                      {estimate.title}
                    </h3>
                    <StatusBadge status={estimate.status} />
                  </div>
                  <p className="font-outfit text-lg font-bold text-slate-900 mb-1">
                    {formatKRW(estimate.amount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {clientName ? `${clientName} · ` : ""}
                    발행: {formatDate(estimate.issued_at)}
                    {estimate.expires_at && ` · 만료: ${formatDate(estimate.expires_at)}`}
                  </p>
                  {estimate.pdf_url && (
                    <a
                      href={estimate.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      <FilePdf size={14} weight="regular" />
                      PDF 보기
                    </a>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleEdit(estimate)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 min-h-[44px] px-2 -ml-2 transition-colors"
                    >
                      <PencilSimple size={16} weight="regular" />
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(estimate)}
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 min-h-[44px] px-2 transition-colors"
                    >
                      <Trash size={16} weight="regular" />
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    클라이언트
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    금액
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    발행일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    만료일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    PDF
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((estimate) => {
                  const clientName = getClientName(estimate.client_id);
                  return (
                    <tr
                      key={estimate.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {estimate.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {clientName || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {formatKRW(estimate.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={estimate.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(estimate.issued_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {estimate.expires_at ? (
                          formatDate(estimate.expires_at)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {estimate.pdf_url ? (
                          <a
                            href={estimate.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <FilePdf size={14} weight="regular" />
                            PDF 보기
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(estimate)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            title="수정"
                          >
                            <PencilSimple size={16} weight="regular" />
                          </button>
                          <button
                            onClick={() => handleDelete(estimate)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                            title="삭제"
                          >
                            <Trash size={16} weight="regular" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EstimateFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEstimate(null);
        }}
        estimate={editingEstimate}
        clients={clients}
        onSaved={handleSaved}
      />
    </div>
  );
}
