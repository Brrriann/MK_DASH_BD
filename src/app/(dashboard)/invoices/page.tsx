"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, PencilSimple, Trash, Receipt, FilePdf } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import { fetchInvoices, deleteInvoice, type TaxInvoice } from "@/lib/actions/invoices";
import { fetchClients } from "@/lib/actions/clients";
import { formatKRW, formatDate } from "@/lib/utils";
import type { ClientWithRevenue } from "@/lib/types";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<TaxInvoice | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invoicesData, clientsData] = await Promise.all([
        fetchInvoices(clientFilter !== "all" ? { clientId: clientFilter } : undefined),
        fetchClients(),
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [clientFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getClientName(clientId: string | null): string {
    if (!clientId) return "";
    return clients.find((c) => c.id === clientId)?.company_name ?? "";
  }

  async function handleDelete(invoice: TaxInvoice) {
    const clientName = getClientName(invoice.client_id);
    const label = clientName ? `${invoice.title} (${clientName})` : invoice.title;
    if (!window.confirm(`"${label}" 세금계산서를 삭제할까요?`)) return;
    try {
      await deleteInvoice(invoice.id);
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  function handleEdit(invoice: TaxInvoice) {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditingInvoice(null);
    setDialogOpen(true);
  }

  function handleSaved(saved: TaxInvoice) {
    setInvoices((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 shrink-0">
            세금계산서
          </h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shrink-0">
              {invoices.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus size={16} weight="regular" />
          <span className="hidden sm:inline">새 세금계산서</span>
          <span className="sm:hidden">추가</span>
        </button>
      </div>

      {/* Filters + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
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

        {!loading && invoices.length > 0 && (
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
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="세금계산서가 없습니다"
          description="새 세금계산서 버튼으로 첫 번째 항목을 추가해보세요"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {invoices.map((invoice) => {
              const clientName = getClientName(invoice.client_id);
              return (
                <div
                  key={invoice.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-outfit font-semibold text-slate-900 text-sm leading-snug">
                      {invoice.title}
                    </h3>
                  </div>
                  <p className="font-outfit text-lg font-bold text-slate-900 mb-1">
                    {formatKRW(invoice.amount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {clientName ? `${clientName} · ` : ""}
                    {formatDate(invoice.issued_at)}
                  </p>
                  {invoice.pdf_url && (
                    <a
                      href={invoice.pdf_url}
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
                      onClick={() => handleEdit(invoice)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 min-h-[44px] px-2 -ml-2 transition-colors"
                    >
                      <PencilSimple size={16} weight="regular" />
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(invoice)}
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
                    발행일
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
                {invoices.map((invoice) => {
                  const clientName = getClientName(invoice.client_id);
                  return (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {invoice.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {clientName || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {formatKRW(invoice.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(invoice.issued_at)}
                      </td>
                      <td className="px-4 py-3">
                        {invoice.pdf_url ? (
                          <a
                            href={invoice.pdf_url}
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
                            onClick={() => handleEdit(invoice)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            title="수정"
                          >
                            <PencilSimple size={16} weight="regular" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice)}
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

      <InvoiceFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingInvoice(null);
        }}
        invoice={editingInvoice}
        clients={clients}
        onSaved={handleSaved}
      />
    </div>
  );
}
