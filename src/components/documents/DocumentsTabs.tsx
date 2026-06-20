"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FilePdf,
  CheckCircle,
  Circle,
  Eye,
  Trash,
} from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deleteEstimate } from "@/lib/actions/estimates";
import { deleteContract } from "@/lib/actions/contracts";
import { deleteInvoice } from "@/lib/actions/invoices";

// ---- Types ----
type EstimateStatus = "pending" | "expired";
type ContractStatus = "signed" | "pending" | "expired" | "signature_requested";

interface EstimateItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
}
interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface EstimateRow {
  id: string;
  title: string;
  amount: number;
  status: EstimateStatus;
  issued_at: string;
  expires_at: string | null;
  pdf_url: string | null;
  client_id: string | null;
  description: string | null;
  line_items: EstimateItem[];
  include_vat: boolean;
  discount_amount: number;
  clients?: { company_name: string } | null;
}

interface ContractRow {
  id: string;
  title: string;
  status: ContractStatus;
  contract_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  final_amount: number | null;
  final_paid: boolean;
  final_paid_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  terms: string | null;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  signer_name: string | null;
  signer_email: string | null;
  client_id: string | null;
  clients?: { company_name: string } | null;
}

interface InvoiceRow {
  id: string;
  title: string;
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  amount: number;
  issued_at: string;
  payment_received: boolean;
  payment_received_at: string | null;
  pdf_url: string | null;
  memo: string | null;
  items: InvoiceItem[];
  client_id: string | null;
  clients?: { company_name: string } | null;
}

type ViewingState =
  | { type: "estimate"; doc: EstimateRow }
  | { type: "contract"; doc: ContractRow }
  | { type: "invoice"; doc: InvoiceRow }
  | null;

interface DocumentsTabsProps {
  defaultTab: string;
  estimates: EstimateRow[];
  contracts: ContractRow[];
  invoices: InvoiceRow[];
}

// ---- Formatters ----
function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);
}
function formatDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(s));
}

// ---- Status configs ----
const estimateStatusLabel: Record<EstimateStatus, string> = {
  pending: "발송됨",
  expired: "만료",
};
const estimateStatusClass: Record<EstimateStatus, string> = {
  pending: "bg-blue-50 text-blue-700 border border-blue-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};
const contractStatusLabel: Record<ContractStatus, string> = {
  signed: "서명완료",
  signature_requested: "서명요청됨",
  pending: "대기중",
  expired: "만료",
};
const contractStatusClass: Record<ContractStatus, string> = {
  signed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  signature_requested: "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

// ---- Shared small components ----
function StatusBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function PdfLink({ url, label = "PDF" }: { url: string | null; label?: string }) {
  if (!url) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
    >
      <FilePdf size={14} weight="regular" />
      {label}
    </a>
  );
}

function PaymentCell({ paid }: { paid: boolean }) {
  return paid ? (
    <CheckCircle size={16} weight="regular" className="text-emerald-500" />
  ) : (
    <Circle size={16} weight="regular" className="text-slate-300" />
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="w-24 shrink-0 text-xs font-medium text-slate-500 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-900 flex-1">{children}</span>
    </div>
  );
}

// ---- Table wrapper ----
function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">{children}</table>
      </div>
    </div>
  );
}
function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}
function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-sm text-slate-400">
        {label}
      </td>
    </tr>
  );
}

// ---- Row action buttons ----
function RowActions({
  onView,
  onDelete,
  isPending,
}: {
  onView: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onView}
        disabled={isPending}
        title="보기"
        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
      >
        <Eye size={15} weight="regular" />
      </button>
      <button
        onClick={onDelete}
        disabled={isPending}
        title="삭제"
        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        <Trash size={15} weight="regular" />
      </button>
    </div>
  );
}

// ============================================================
// ---- DETAIL SHEET CONTENT ----
// ============================================================

function EstimateDetailContent({ doc }: { doc: EstimateRow }) {
  const vatAmount = doc.include_vat ? Math.round(doc.amount / 11) : 0;
  const supplyOnly = doc.include_vat ? doc.amount - vatAmount : doc.amount;

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
      {/* 기본 정보 */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 divide-y divide-slate-100">
        <DetailRow label="고객사">
          {doc.clients?.company_name ?? <span className="text-slate-400">—</span>}
        </DetailRow>
        <DetailRow label="상태">
          <StatusBadge
            label={estimateStatusLabel[doc.status]}
            cls={estimateStatusClass[doc.status]}
          />
        </DetailRow>
        <DetailRow label="발행일">{formatDate(doc.issued_at)}</DetailRow>
        <DetailRow label="만료일">{formatDate(doc.expires_at)}</DetailRow>
        {doc.description && (
          <DetailRow label="설명">
            <span className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
              {doc.description}
            </span>
          </DetailRow>
        )}
      </div>

      {/* 품목 테이블 */}
      {doc.line_items?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            품목
          </p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">품목명</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">수량</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">단가</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">공급가액</th>
                </tr>
              </thead>
              <tbody>
                {doc.line_items.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2 text-slate-800">{item.name}</td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {formatKRW(item.unit_price)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-900">
                      {formatKRW(item.supply_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 금액 합계 */}
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {doc.include_vat && (
          <>
            <DetailRow label="공급가액">{formatKRW(supplyOnly)}</DetailRow>
            <DetailRow label="부가세">{formatKRW(vatAmount)}</DetailRow>
          </>
        )}
        {doc.discount_amount > 0 && (
          <DetailRow label="할인">
            <span className="text-red-500">-{formatKRW(doc.discount_amount)}</span>
          </DetailRow>
        )}
        <DetailRow label="최종 금액">
          <span className="font-bold text-blue-700 text-base">
            {formatKRW(doc.amount - (doc.discount_amount ?? 0))}
          </span>
        </DetailRow>
      </div>

      {/* PDF */}
      {doc.pdf_url && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            첨부
          </p>
          <PdfLink url={doc.pdf_url} label="견적서 PDF 보기" />
        </div>
      )}
    </div>
  );
}

function ContractDetailContent({ doc }: { doc: ContractRow }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
      {/* 기본 정보 */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 divide-y divide-slate-100">
        <DetailRow label="고객사">
          {doc.clients?.company_name ?? <span className="text-slate-400">—</span>}
        </DetailRow>
        <DetailRow label="상태">
          <StatusBadge
            label={contractStatusLabel[doc.status]}
            cls={contractStatusClass[doc.status]}
          />
        </DetailRow>
        <DetailRow label="계약금액">
          {doc.contract_amount != null ? (
            <span className="font-bold text-blue-700 text-base">
              {formatKRW(doc.contract_amount)}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </DetailRow>
        {doc.expires_at && (
          <DetailRow label="만료일">{formatDate(doc.expires_at)}</DetailRow>
        )}
      </div>

      {/* 납금 현황 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          납금 현황
        </p>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-xs text-slate-600">
              계약금{doc.deposit_amount != null ? ` (${formatKRW(doc.deposit_amount)})` : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <PaymentCell paid={doc.deposit_paid} />
              <span className="text-xs text-slate-500">
                {doc.deposit_paid
                  ? doc.deposit_paid_at
                    ? formatDate(doc.deposit_paid_at)
                    : "납부완료"
                  : "미납"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-xs text-slate-600">
              잔금{doc.final_amount != null ? ` (${formatKRW(doc.final_amount)})` : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <PaymentCell paid={doc.final_paid} />
              <span className="text-xs text-slate-500">
                {doc.final_paid
                  ? doc.final_paid_at
                    ? formatDate(doc.final_paid_at)
                    : "납부완료"
                  : "미납"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 서명 정보 */}
      {(doc.signer_name || doc.signed_at) && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            서명 정보
          </p>
          <div className="rounded-lg border border-slate-100 bg-slate-50 divide-y divide-slate-100">
            {doc.signer_name && (
              <DetailRow label="서명자">{doc.signer_name}</DetailRow>
            )}
            {doc.signer_email && (
              <DetailRow label="이메일">
                <span className="text-xs">{doc.signer_email}</span>
              </DetailRow>
            )}
            {doc.signed_at && (
              <DetailRow label="서명일">{formatDate(doc.signed_at)}</DetailRow>
            )}
          </div>
        </div>
      )}

      {/* 계약 조건 */}
      {doc.terms && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            계약 조건
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-56 overflow-y-auto">
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {doc.terms}
            </p>
          </div>
        </div>
      )}

      {/* PDF */}
      <div className="flex flex-col gap-1.5">
        {(doc.pdf_url || doc.signed_pdf_url) && (
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            첨부
          </p>
        )}
        {doc.pdf_url && <PdfLink url={doc.pdf_url} label="계약서 PDF 보기" />}
        {doc.signed_pdf_url && (
          <PdfLink url={doc.signed_pdf_url} label="서명된 계약서 PDF 보기" />
        )}
      </div>
    </div>
  );
}

function InvoiceDetailContent({ doc }: { doc: InvoiceRow }) {
  const displayItems = (doc.items ?? []) as InvoiceItem[];

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
      {/* 기본 정보 */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 divide-y divide-slate-100">
        <DetailRow label="고객사">
          {doc.clients?.company_name ?? <span className="text-slate-400">—</span>}
        </DetailRow>
        <DetailRow label="발행일">{formatDate(doc.issued_at)}</DetailRow>
        <DetailRow label="수금">
          <div className="flex items-center gap-1.5">
            <PaymentCell paid={doc.payment_received} />
            <span className="text-xs text-slate-500">
              {doc.payment_received
                ? doc.payment_received_at
                  ? formatDate(doc.payment_received_at)
                  : "수금완료"
                : "미수금"}
            </span>
          </div>
        </DetailRow>
        {doc.memo && (
          <DetailRow label="메모">
            <span className="text-xs text-slate-600 whitespace-pre-wrap">{doc.memo}</span>
          </DetailRow>
        )}
      </div>

      {/* 품목 */}
      {displayItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            품목
          </p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">품목명</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">수량</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">단가</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">금액</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-800">{item.name}</td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {formatKRW(item.unit_price)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-900">
                      {formatKRW(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 금액 합계 */}
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        <DetailRow label="공급가액">{formatKRW(doc.supply_amount)}</DetailRow>
        <DetailRow label="세액">{formatKRW(doc.tax_amount)}</DetailRow>
        <DetailRow label="합계">
          <span className="font-bold text-blue-700 text-base">
            {formatKRW(doc.total_amount || doc.amount)}
          </span>
        </DetailRow>
      </div>

      {/* PDF */}
      {doc.pdf_url && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            첨부
          </p>
          <PdfLink url={doc.pdf_url} label="세금계산서 PDF 보기" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// ---- TABLES ----
// ============================================================

function EstimatesTable({
  estimates,
  onView,
  onDelete,
  pendingId,
}: {
  estimates: EstimateRow[];
  onView: (doc: EstimateRow) => void;
  onDelete: (id: string) => void;
  pendingId: string | null;
}) {
  return (
    <TableWrapper>
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50">
          <Th>제목</Th>
          <Th>고객사</Th>
          <Th>금액</Th>
          <Th>상태</Th>
          <Th>발행일</Th>
          <Th>만료일</Th>
          <Th>PDF</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {estimates.length === 0 ? (
          <EmptyRow cols={8} label="견적서가 없습니다" />
        ) : (
          estimates.map((e) => (
            <tr
              key={e.id}
              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0 ${
                pendingId === e.id ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">
                {e.title}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {e.clients?.company_name ?? <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">
                {formatKRW(e.amount)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={estimateStatusLabel[e.status]}
                  cls={estimateStatusClass[e.status]}
                />
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                {formatDate(e.issued_at)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                {formatDate(e.expires_at)}
              </td>
              <td className="px-4 py-3">
                <PdfLink url={e.pdf_url} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  onView={() => onView(e)}
                  onDelete={() => onDelete(e.id)}
                  isPending={pendingId === e.id}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

function ContractsTable({
  contracts,
  onView,
  onDelete,
  pendingId,
}: {
  contracts: ContractRow[];
  onView: (doc: ContractRow) => void;
  onDelete: (id: string) => void;
  pendingId: string | null;
}) {
  return (
    <TableWrapper>
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50">
          <Th>제목</Th>
          <Th>고객사</Th>
          <Th>계약금액</Th>
          <Th>상태</Th>
          <Th>계약금</Th>
          <Th>잔금</Th>
          <Th>서명일</Th>
          <Th>PDF</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {contracts.length === 0 ? (
          <EmptyRow cols={9} label="계약서가 없습니다" />
        ) : (
          contracts.map((c) => (
            <tr
              key={c.id}
              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0 ${
                pendingId === c.id ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">
                {c.title}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {c.clients?.company_name ?? <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">
                {c.contract_amount != null ? (
                  formatKRW(c.contract_amount)
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={contractStatusLabel[c.status]}
                  cls={contractStatusClass[c.status]}
                />
              </td>
              <td className="px-4 py-3 flex items-center justify-start">
                <PaymentCell paid={c.deposit_paid} />
              </td>
              <td className="px-4 py-3">
                <PaymentCell paid={c.final_paid} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                {formatDate(c.signed_at)}
              </td>
              <td className="px-4 py-3">
                <PdfLink url={c.signed_pdf_url ?? c.pdf_url} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  onView={() => onView(c)}
                  onDelete={() => onDelete(c.id)}
                  isPending={pendingId === c.id}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

function InvoicesTable({
  invoices,
  onView,
  onDelete,
  pendingId,
}: {
  invoices: InvoiceRow[];
  onView: (doc: InvoiceRow) => void;
  onDelete: (id: string) => void;
  pendingId: string | null;
}) {
  return (
    <TableWrapper>
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50">
          <Th>제목</Th>
          <Th>고객사</Th>
          <Th>공급가액</Th>
          <Th>세액</Th>
          <Th>합계</Th>
          <Th>발행일</Th>
          <Th>수금</Th>
          <Th>PDF</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {invoices.length === 0 ? (
          <EmptyRow cols={9} label="세금계산서가 없습니다" />
        ) : (
          invoices.map((inv) => (
            <tr
              key={inv.id}
              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0 ${
                pendingId === inv.id ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">
                {inv.title}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {inv.clients?.company_name ?? <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                {formatKRW(inv.supply_amount)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                {formatKRW(inv.tax_amount)}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">
                {formatKRW(inv.total_amount || inv.amount)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                {formatDate(inv.issued_at)}
              </td>
              <td className="px-4 py-3">
                <PaymentCell paid={inv.payment_received} />
              </td>
              <td className="px-4 py-3">
                <PdfLink url={inv.pdf_url} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  onView={() => onView(inv)}
                  onDelete={() => onDelete(inv.id)}
                  isPending={pendingId === inv.id}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

// ============================================================
// ---- MAIN COMPONENT ----
// ============================================================

export function DocumentsTabs({
  defaultTab,
  estimates,
  contracts,
  invoices,
}: DocumentsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [isPending, setIsPending] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ViewingState>(null);

  const validTab = ["estimates", "contracts", "invoices"].includes(defaultTab)
    ? defaultTab
    : "estimates";

  function handleTabChange(value: string | number | null) {
    if (!value) return;
    startTransition(() => {
      router.push(`${pathname}?tab=${value}`);
    });
  }

  async function handleDelete(
    type: "estimate" | "contract" | "invoice",
    id: string
  ) {
    if (!confirm("삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setPendingId(id);
    setIsPending(true);
    try {
      if (type === "estimate") await deleteEstimate(id);
      else if (type === "contract") await deleteContract(id);
      else await deleteInvoice(id);
      // 뷰어가 열려있는 문서를 삭제하면 닫기
      if (viewing?.doc.id === id) setViewing(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setPendingId(null);
      setIsPending(false);
    }
  }

  const tabCounts = {
    estimates: estimates.length,
    contracts: contracts.length,
    invoices: invoices.length,
  };

  // 시트 타이틀
  const sheetTitle = viewing
    ? viewing.doc.title
    : "";
  const sheetSubtitle = viewing
    ? { estimate: "견적서", contract: "계약서", invoice: "세금계산서" }[viewing.type]
    : "";

  return (
    <>
      {/* ---- 문서 상세 시트 ---- */}
      <Sheet open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg flex flex-col p-0 gap-0"
        >
          <SheetHeader className="px-5 py-4 border-b border-slate-100 shrink-0">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
              {sheetSubtitle}
            </p>
            <SheetTitle className="text-base font-bold text-slate-900 leading-snug pr-8">
              {sheetTitle}
            </SheetTitle>
          </SheetHeader>

          {viewing?.type === "estimate" && (
            <EstimateDetailContent doc={viewing.doc} />
          )}
          {viewing?.type === "contract" && (
            <ContractDetailContent doc={viewing.doc} />
          )}
          {viewing?.type === "invoice" && (
            <InvoiceDetailContent doc={viewing.doc} />
          )}

          {/* 시트 내부 삭제 버튼 */}
          {viewing && (
            <div className="shrink-0 px-5 py-3 border-t border-slate-100">
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => handleDelete(viewing.type, viewing.doc.id)}
                className="w-full"
              >
                <Trash size={14} className="mr-1.5" />
                이 문서 삭제
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ---- 탭 ---- */}
      <Tabs value={validTab} onValueChange={handleTabChange}>
        <TabsList className="mb-5 h-9 bg-slate-100 p-0.5">
          {(["estimates", "contracts", "invoices"] as const).map((tab) => {
            const labels: Record<string, string> = {
              estimates: "견적서",
              contracts: "계약서",
              invoices: "세금계산서",
            };
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-8 px-3 text-sm font-medium data-active:bg-white data-active:shadow-sm"
              >
                {labels[tab]}
                <span className="ml-1.5 inline-flex items-center rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {tabCounts[tab as keyof typeof tabCounts]}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="estimates">
          <EstimatesTable
            estimates={estimates}
            onView={(doc) => setViewing({ type: "estimate", doc })}
            onDelete={(id) => handleDelete("estimate", id)}
            pendingId={pendingId}
          />
        </TabsContent>

        <TabsContent value="contracts">
          <ContractsTable
            contracts={contracts}
            onView={(doc) => setViewing({ type: "contract", doc })}
            onDelete={(id) => handleDelete("contract", id)}
            pendingId={pendingId}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTable
            invoices={invoices}
            onView={(doc) => setViewing({ type: "invoice", doc })}
            onDelete={(id) => handleDelete("invoice", id)}
            pendingId={pendingId}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
