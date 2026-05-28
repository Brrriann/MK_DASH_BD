"use client";

import Link from "next/link";
import { Warning } from "@phosphor-icons/react";

interface UnpaidContract {
  id: string;
  title: string;
  deposit_paid: boolean;
  final_paid: boolean;
  deposit_amount: number | null;
  final_amount: number | null;
  clients: { company_name: string } | { company_name: string }[] | null;
}

interface UnpaidInvoice {
  id: string;
  title: string;
  total_amount: number;
  issued_at: string;
  clients: { company_name: string } | { company_name: string }[] | null;
}

interface UnpaidWidgetProps {
  contracts: UnpaidContract[];
  invoices: UnpaidInvoice[];
}

function getClientName(
  c: { company_name: string } | { company_name: string }[] | null
): string {
  if (!c) return "";
  if (Array.isArray(c)) return c[0]?.company_name ?? "";
  return c.company_name;
}

export function UnpaidWidget({ contracts, invoices }: UnpaidWidgetProps) {
  const totalItems = contracts.length + invoices.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Warning size={14} weight="fill" className="text-amber-500" />
        <h3 className="font-outfit text-sm font-semibold text-slate-700">미수금 알림</h3>
        {totalItems > 0 && (
          <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {totalItems}건
          </span>
        )}
      </div>

      {totalItems === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">미수금 없음</p>
      ) : (
        <div className="space-y-1.5">
          {/* 계약 미수금 */}
          {contracts.map((c) => (
            <Link
              key={c.id}
              href="/contracts"
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{c.title}</p>
                <p className="text-xs text-slate-400">{getClientName(c.clients)}</p>
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                {!c.deposit_paid && c.deposit_amount != null && c.deposit_amount > 0 && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                    계약금
                  </span>
                )}
                {!c.final_paid && c.final_amount != null && c.final_amount > 0 && (
                  <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full border border-red-200">
                    잔금
                  </span>
                )}
              </div>
            </Link>
          ))}

          {/* 세금계산서 미수금 */}
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href="/invoices"
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{inv.title}</p>
                <p className="text-xs text-slate-400">
                  {getClientName(inv.clients)} · {inv.issued_at?.split("T")[0]}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700 shrink-0 ml-2">
                {inv.total_amount.toLocaleString()}원
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
