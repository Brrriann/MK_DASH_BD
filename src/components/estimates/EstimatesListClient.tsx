"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FilePdf, Trash } from "@phosphor-icons/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { FileText } from "@phosphor-icons/react";
import { formatKRW, formatDate } from "@/lib/utils";
import type { Estimate, EstimateStatus } from "@/lib/types";

interface EstimatesListClientProps {
  initialEstimates: (Estimate & { client_name?: string | null })[];
  clientOptions: { id: string; company_name: string }[];
}

const STATUS_LABEL: Record<EstimateStatus, string> = {
  pending: "발송됨",
  expired: "만료",
};

const STATUS_CLASS: Record<EstimateStatus, string> = {
  pending: "bg-blue-50 text-blue-700 border border-blue-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

function StatusBadge({ status }: { status: EstimateStatus }) {
  const label = STATUS_LABEL[status] ?? status;
  const cls = STATUS_CLASS[status] ?? "bg-slate-100 text-slate-500 border border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function EstimatesListClient({ initialEstimates, clientOptions }: EstimatesListClientProps) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const filtered = estimates.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (clientFilter !== "all" && e.client_id !== clientFilter) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await fetch(`/api/estimates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setEstimates(prev =>
        prev.map(e => e.id === id ? { ...e, status: newStatus as EstimateStatus } : e)
      );
    }
  }

  async function handleDelete(estimate: Estimate & { client_name?: string | null }) {
    if (!window.confirm(`"${estimate.title}" 견적서를 삭제할까요?`)) return;
    const res = await fetch(`/api/estimates/${estimate.id}`, { method: "DELETE" });
    if (res.ok) {
      setEstimates(prev => prev.filter(e => e.id !== estimate.id));
    } else {
      alert("삭제에 실패했습니다.");
    }
  }

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 shrink-0">견적서</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shrink-0">
            {estimates.length}
          </span>
        </div>
        <Link
          href="/estimates/new"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus size={16} weight="regular" />
          <span className="hidden sm:inline">새 견적서</span>
          <span className="sm:hidden">추가</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[140px] font-outfit">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">발송됨</SelectItem>
            <SelectItem value="expired">만료</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={v => setClientFilter(v ?? "all")}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[200px] font-outfit">
            <SelectValue placeholder="클라이언트" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 클라이언트</SelectItem>
            {clientOptions.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtered.length > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-slate-400">합계</span>
            <span className="text-sm font-semibold text-slate-900">{formatKRW(totalAmount)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="견적서가 없습니다"
          description="새 견적서 버튼으로 첫 번째 항목을 추가해보세요"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(estimate => (
              <div key={estimate.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-outfit font-semibold text-slate-900 text-sm leading-snug">{estimate.title}</h3>
                  <Select
                    value={estimate.status}
                    onValueChange={(v: string | null) => v && handleStatusChange(estimate.id, v)}
                  >
                    <SelectTrigger className="h-6 text-xs px-2 w-auto border-0 bg-transparent p-0 focus:ring-0 shrink-0">
                      <StatusBadge status={estimate.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">발송됨</SelectItem>
                      <SelectItem value="expired">만료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="font-outfit text-lg font-bold text-slate-900 mb-1">
                  {formatKRW(estimate.amount)}
                </p>
                <p className="text-xs text-slate-400">
                  {estimate.client_name ? `${estimate.client_name} · ` : ""}
                  발행: {formatDate(estimate.issued_at)}
                  {estimate.expires_at && ` · 만료: ${formatDate(estimate.expires_at)}`}
                </p>
                {estimate.pdf_url && (
                  <a href={estimate.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1">
                    <FilePdf size={14} weight="regular" />PDF 보기
                  </a>
                )}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleDelete(estimate)}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 min-h-[36px] px-2 ml-auto transition-colors"
                  >
                    <Trash size={14} weight="regular" />삭제
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">클라이언트</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">발행일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">유효기한</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">파일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(estimate => (
                  <tr key={estimate.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{estimate.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {estimate.client_name || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatKRW(estimate.amount)}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={estimate.status}
                        onValueChange={(v: string | null) => v && handleStatusChange(estimate.id, v)}
                      >
                        <SelectTrigger className="h-6 w-auto min-w-[80px] text-xs px-0 border-0 bg-transparent focus:ring-0 shadow-none">
                          <StatusBadge status={estimate.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">발송됨</SelectItem>
                          <SelectItem value="expired">만료</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(estimate.issued_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {estimate.expires_at ? formatDate(estimate.expires_at) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {estimate.pdf_url ? (
                        <a href={estimate.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                          <FilePdf size={14} weight="regular" />PDF
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(estimate)}
                          title="삭제"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash size={16} weight="regular" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
