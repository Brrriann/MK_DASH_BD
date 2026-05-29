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
import type { Contract, ContractStatus } from "@/lib/types";

interface ContractsListClientProps {
  initialContracts: (Contract & { client_name?: string | null })[];
  clientOptions: { id: string; company_name: string }[];
}

const STATUS_LABEL: Record<ContractStatus, string> = {
  pending: "대기중",
  signed: "서명완료",
  expired: "만료",
  signature_requested: "서명요청",
};

const STATUS_CLASS: Record<ContractStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  signed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
  signature_requested: "bg-blue-50 text-blue-700 border border-blue-200",
};

function StatusBadge({ status }: { status: ContractStatus }) {
  const label = STATUS_LABEL[status] ?? status;
  const cls = STATUS_CLASS[status] ?? "bg-slate-100 text-slate-500 border border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function ContractsListClient({ initialContracts, clientOptions }: ContractsListClientProps) {
  const [contracts, setContracts] = useState(initialContracts);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const filtered = contracts.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (clientFilter !== "all" && c.client_id !== clientFilter) return false;
    return true;
  });

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await fetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setContracts(prev =>
        prev.map(c => c.id === id ? { ...c, status: newStatus as ContractStatus } : c)
      );
    }
  }

  async function handleDelete(contract: Contract & { client_name?: string | null }) {
    if (!window.confirm(`"${contract.title}" 계약서를 삭제할까요?`)) return;
    const res = await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" });
    if (res.ok) {
      setContracts(prev => prev.filter(c => c.id !== contract.id));
    } else {
      alert("삭제에 실패했습니다.");
    }
  }

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 shrink-0">계약서</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shrink-0">
            {contracts.length}
          </span>
        </div>
        <Link href="/contracts/new"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0 min-h-[44px]">
          <Plus size={16} weight="regular" />
          <span className="hidden sm:inline">새 계약서</span>
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
            <SelectItem value="pending">대기중</SelectItem>
            <SelectItem value="signed">서명완료</SelectItem>
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
          <span className="text-xs text-slate-400 sm:ml-auto">총 {filtered.length}건</span>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="계약서가 없습니다" description="새 계약서 버튼으로 첫 번째 항목을 추가해보세요" />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(contract => (
              <div key={contract.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-outfit font-semibold text-slate-900 text-sm leading-snug">{contract.title}</h3>
                  <Select value={contract.status} onValueChange={(v: string | null) => v && handleStatusChange(contract.id, v)}>
                    <SelectTrigger className="h-6 text-xs px-2 w-auto border-0 bg-transparent p-0 focus:ring-0 shrink-0">
                      <StatusBadge status={contract.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="signed">서명완료</SelectItem>
                      <SelectItem value="expired">만료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {contract.client_name && <p className="text-xs text-slate-600 mb-0.5">{contract.client_name}</p>}
                {contract.contract_amount && (
                  <p className="text-sm font-bold text-slate-900 mb-0.5">{formatKRW(contract.contract_amount)}</p>
                )}
                <p className="text-xs text-slate-400">
                  {contract.signed_at && `서명: ${formatDate(contract.signed_at)}`}
                  {contract.signed_at && contract.expires_at && " · "}
                  {contract.expires_at && `만료: ${formatDate(contract.expires_at)}`}
                </p>
                {contract.pdf_url && (
                  <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1">
                    <FilePdf size={14} weight="regular" />PDF 보기
                  </a>
                )}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => handleDelete(contract)}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 min-h-[36px] px-2 ml-auto transition-colors">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">서명일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">만료일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">파일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(contract => (
                  <tr key={contract.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{contract.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {contract.client_name || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {contract.contract_amount ? formatKRW(contract.contract_amount) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={contract.status} onValueChange={(v: string | null) => v && handleStatusChange(contract.id, v)}>
                        <SelectTrigger className="h-6 w-auto min-w-[80px] text-xs px-0 border-0 bg-transparent focus:ring-0 shadow-none">
                          <StatusBadge status={contract.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">대기중</SelectItem>
                          <SelectItem value="signed">서명완료</SelectItem>
                          <SelectItem value="expired">만료</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {contract.signed_at ? formatDate(contract.signed_at) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {contract.expires_at ? formatDate(contract.expires_at) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {contract.pdf_url ? (
                        <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                          <FilePdf size={14} weight="regular" />PDF
                        </a>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button onClick={() => handleDelete(contract)} title="삭제"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
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
