"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { FilePdf, CheckCircle, Circle } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---- Type helpers ----
type EstimateStatus = "pending" | "expired";
type ContractStatus = "signed" | "pending" | "expired";

interface EstimateRow {
  id: string;
  title: string;
  amount: number;
  status: EstimateStatus;
  issued_at: string;
  expires_at: string | null;
  pdf_url: string | null;
  client_id: string | null;
  clients?: { company_name: string } | null;
}

interface ContractRow {
  id: string;
  title: string;
  status: ContractStatus;
  contract_amount: number | null;
  signed_at: string | null;
  deposit_paid: boolean;
  final_paid: boolean;
  pdf_url: string | null;
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
  pdf_url: string | null;
  client_id: string | null;
  clients?: { company_name: string } | null;
}

interface DocumentsTabsProps {
  defaultTab: string;
  estimates: EstimateRow[];
  contracts: ContractRow[];
  invoices: InvoiceRow[];
}

// ---- Formatters ----
function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
}
function formatDate(s: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(s));
}

// ---- Estimate badges ----
const estimateStatusLabel: Record<EstimateStatus, string> = {
  pending: "발송됨",
  expired: "만료",
};
const estimateStatusClass: Record<EstimateStatus, string> = {
  pending: "bg-blue-50 text-blue-700 border border-blue-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

// ---- Contract badges ----
const contractStatusLabel: Record<ContractStatus, string> = {
  signed: "서명완료",
  pending: "대기중",
  expired: "만료",
};
const contractStatusClass: Record<ContractStatus, string> = {
  signed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

function StatusBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function PdfLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
    >
      <FilePdf size={14} weight="regular" />
      PDF
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

function Th({ children }: { children: React.ReactNode }) {
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

// ---- Estimates table ----
function EstimatesTable({ estimates }: { estimates: EstimateRow[] }) {
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
        </tr>
      </thead>
      <tbody>
        {estimates.length === 0 ? (
          <EmptyRow cols={7} label="견적서가 없습니다" />
        ) : (
          estimates.map((e) => (
            <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
              <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">{e.title}</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {e.clients?.company_name ?? <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatKRW(e.amount)}</td>
              <td className="px-4 py-3">
                <StatusBadge label={estimateStatusLabel[e.status]} cls={estimateStatusClass[e.status]} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(e.issued_at)}</td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                {e.expires_at ? formatDate(e.expires_at) : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3"><PdfLink url={e.pdf_url} /></td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

// ---- Contracts table ----
function ContractsTable({ contracts }: { contracts: ContractRow[] }) {
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
        </tr>
      </thead>
      <tbody>
        {contracts.length === 0 ? (
          <EmptyRow cols={8} label="계약서가 없습니다" />
        ) : (
          contracts.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
              <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">{c.title}</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {c.clients?.company_name ?? <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">
                {c.contract_amount != null ? formatKRW(c.contract_amount) : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3">
                <StatusBadge label={contractStatusLabel[c.status]} cls={contractStatusClass[c.status]} />
              </td>
              <td className="px-4 py-3 flex items-center justify-start">
                <PaymentCell paid={c.deposit_paid} />
              </td>
              <td className="px-4 py-3">
                <PaymentCell paid={c.final_paid} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                {c.signed_at ? formatDate(c.signed_at) : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3"><PdfLink url={c.pdf_url} /></td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

// ---- Invoices table ----
function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
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
        </tr>
      </thead>
      <tbody>
        {invoices.length === 0 ? (
          <EmptyRow cols={8} label="세금계산서가 없습니다" />
        ) : (
          invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
              <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">{inv.title}</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {inv.clients?.company_name ?? <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatKRW(inv.supply_amount)}</td>
              <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatKRW(inv.tax_amount)}</td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatKRW(inv.total_amount || inv.amount)}</td>
              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(inv.issued_at)}</td>
              <td className="px-4 py-3">
                <PaymentCell paid={inv.payment_received} />
              </td>
              <td className="px-4 py-3"><PdfLink url={inv.pdf_url} /></td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

// ---- Main component ----
export function DocumentsTabs({
  defaultTab,
  estimates,
  contracts,
  invoices,
}: DocumentsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const validTab = ["estimates", "contracts", "invoices"].includes(defaultTab)
    ? defaultTab
    : "estimates";

  function handleTabChange(value: string | number | null) {
    if (!value) return;
    startTransition(() => {
      router.push(`${pathname}?tab=${value}`);
    });
  }

  const tabCounts = {
    estimates: estimates.length,
    contracts: contracts.length,
    invoices: invoices.length,
  };

  return (
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
        <EstimatesTable estimates={estimates} />
      </TabsContent>

      <TabsContent value="contracts">
        <ContractsTable contracts={contracts} />
      </TabsContent>

      <TabsContent value="invoices">
        <InvoicesTable invoices={invoices} />
      </TabsContent>
    </Tabs>
  );
}
