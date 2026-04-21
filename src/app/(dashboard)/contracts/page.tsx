"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, PencilSimple, Trash, FileText, FilePdf } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { fetchContracts, deleteContract, type Contract } from "@/lib/actions/contracts";
import { fetchClients } from "@/lib/actions/clients";
import { formatDate } from "@/lib/utils";
import type { ClientWithRevenue } from "@/lib/types";

const contractStatusLabel: Record<Contract["status"], string> = {
  signed: "서명완료",
  pending: "대기중",
  expired: "만료",
};

const contractStatusClass: Record<Contract["status"], string> = {
  signed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

function StatusBadge({ status }: { status: Contract["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${contractStatusClass[status]}`}
    >
      {contractStatusLabel[status]}
    </span>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsData, clientsData] = await Promise.all([
        fetchContracts({
          status: statusFilter !== "all" ? statusFilter : undefined,
          clientId: clientFilter !== "all" ? clientFilter : undefined,
        }),
        fetchClients(),
      ]);
      setContracts(contractsData);
      setClients(clientsData);
    } catch {
      setContracts([]);
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

  async function handleDelete(contract: Contract) {
    if (!window.confirm(`"${contract.title}" 계약서를 삭제할까요?`)) return;
    try {
      await deleteContract(contract.id);
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  function handleEdit(contract: Contract) {
    setEditingContract(contract);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditingContract(null);
    setDialogOpen(true);
  }

  function handleSaved(saved: Contract) {
    setContracts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 shrink-0">
            계약서
          </h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shrink-0">
              {contracts.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus size={16} weight="regular" />
          <span className="hidden sm:inline">새 계약서</span>
          <span className="sm:hidden">추가</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="signed">서명완료</SelectItem>
            <SelectItem value="pending">대기중</SelectItem>
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

        {!loading && contracts.length > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-slate-500">총 {contracts.length}건</span>
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
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-100">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </>
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="계약서가 없습니다"
          description="새 계약서 버튼으로 첫 번째 항목을 추가해보세요"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {contracts.map((contract) => {
              const clientName = getClientName(contract.client_id);
              return (
                <div
                  key={contract.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-outfit font-semibold text-slate-900 text-sm leading-snug">
                      {contract.title}
                    </h3>
                    <StatusBadge status={contract.status} />
                  </div>
                  <div className="space-y-0.5 mb-1">
                    {clientName && (
                      <p className="text-xs text-slate-600">{clientName}</p>
                    )}
                    {contract.signed_at && (
                      <p className="text-xs text-slate-400">
                        서명일: {formatDate(contract.signed_at)}
                      </p>
                    )}
                    {contract.expires_at && (
                      <p className="text-xs text-slate-400">
                        만료일: {formatDate(contract.expires_at)}
                      </p>
                    )}
                  </div>
                  {contract.pdf_url && (
                    <a
                      href={contract.pdf_url}
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
                      onClick={() => handleEdit(contract)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 min-h-[44px] px-2 -ml-2 transition-colors"
                    >
                      <PencilSimple size={16} weight="regular" />
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(contract)}
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
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    서명일
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
                {contracts.map((contract) => {
                  const clientName = getClientName(contract.client_id);
                  return (
                    <tr
                      key={contract.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {contract.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {clientName || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={contract.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {contract.signed_at ? (
                          formatDate(contract.signed_at)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {contract.expires_at ? (
                          formatDate(contract.expires_at)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {contract.pdf_url ? (
                          <a
                            href={contract.pdf_url}
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
                            onClick={() => handleEdit(contract)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            title="수정"
                          >
                            <PencilSimple size={16} weight="regular" />
                          </button>
                          <button
                            onClick={() => handleDelete(contract)}
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

      <ContractFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingContract(null);
        }}
        contract={editingContract}
        clients={clients}
        onSaved={handleSaved}
      />
    </div>
  );
}
