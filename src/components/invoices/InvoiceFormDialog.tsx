"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash, ArrowSquareOut, CheckCircle } from "@phosphor-icons/react";
import {
  createInvoice,
  updateInvoice,
  type TaxInvoice,
  type CreateInvoiceInput,
} from "@/lib/actions/invoices";
import { updateClient } from "@/lib/actions/clients";
import type { ClientWithRevenue, InvoiceItem } from "@/lib/types";

interface InvoiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  invoice?: TaxInvoice | null;
  clients: ClientWithRevenue[];
  onSaved: (invoice: TaxInvoice) => void;
}

const NONE_VALUE = "__none__";

const EMPTY_ITEM = (): InvoiceItem => ({
  name: "",
  quantity: 1,
  unit_price: 0,
  supply_amount: 0,
});

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export function InvoiceFormDialog({
  open,
  onClose,
  invoice,
  clients,
  onSaved,
}: InvoiceFormDialogProps) {
  const isEdit = !!invoice;

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [issuedAt, setIssuedAt] = useState("");
  const [memo, setMemo] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([EMPTY_ITEM()]);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentReceivedAt, setPaymentReceivedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [issuanceSuccess, setIssuanceSuccess] = useState(false);

  // OCR states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);

  // Supplier info from auth metadata
  const [supplierInfo, setSupplierInfo] = useState<{
    registration_number: string;
    organization_name: string;
    representative_name: string;
    manager_email: string;
  } | null>(null);

  useEffect(() => {
    getSupabase()
      .auth.getUser()
      .then(({ data: { user } }) => {
        const bp = user?.user_metadata?.business_profile;
        if (bp) setSupplierInfo(bp);
      });
  }, []);

  useEffect(() => {
    if (open) {
      setTitle(invoice?.title ?? "");
      setClientId(invoice?.client_id ?? NONE_VALUE);
      setIssuedAt(
        invoice?.issued_at
          ? invoice.issued_at.split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setMemo(invoice?.memo ?? "");
      setItems(invoice?.items?.length ? invoice.items : [EMPTY_ITEM()]);
      setPaymentReceived(invoice?.payment_received ?? false);
      setPaymentReceivedAt(invoice?.payment_received_at ?? "");
      setError("");
      setIssuanceSuccess(false);
      setOcrDone(false);
    }
  }, [open, invoice]);

  const selectedClient =
    clientId !== NONE_VALUE
      ? (clients.find((c) => c.id === clientId) ?? null)
      : null;
  const missingBrn =
    selectedClient !== null &&
    !selectedClient.business_registration_number &&
    !ocrDone;

  // Computed totals
  const supplyAmount = items.reduce((s, i) => s + i.supply_amount, 0);
  const taxAmount = Math.round(supplyAmount * 0.1);
  const totalAmount = supplyAmount + taxAmount;

  function updateItem(
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      if (field === "name") {
        item.name = value as string;
      } else {
        const num =
          typeof value === "string" ? Number(value) || 0 : value;
        if (field === "quantity") item.quantity = num;
        if (field === "unit_price") item.unit_price = num;
        item.supply_amount = item.quantity * item.unit_price;
      }
      next[index] = item;
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, EMPTY_ITEM()]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  }

  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;
    setOcrLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "OCR 오류");
        return;
      }
      const updates: Partial<ClientWithRevenue> = {};
      if (json.business_registration_number)
        updates.business_registration_number = json.business_registration_number;
      if (json.representative_name)
        updates.representative_name = json.representative_name;
      if (json.business_address)
        updates.business_address = json.business_address;
      if (json.business_type) updates.business_type = json.business_type;
      if (json.business_item) updates.business_item = json.business_item;
      if (Object.keys(updates).length > 0)
        await updateClient(selectedClient.id, updates);
      setOcrDone(true);
    } catch {
      setError("OCR 처리 중 오류가 발생했습니다.");
    } finally {
      setOcrLoading(false);
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    if (items.some((i) => !i.name.trim())) {
      setError("모든 품목명을 입력해주세요.");
      return;
    }
    if (supplyAmount <= 0) {
      setError("금액을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");

    const data: CreateInvoiceInput = {
      title: title.trim(),
      items,
      supply_amount: supplyAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      issued_at: issuedAt || undefined,
      memo: memo.trim() || undefined,
      client_id: clientId === NONE_VALUE ? null : clientId,
      payment_received: paymentReceived,
      payment_received_at: paymentReceived && paymentReceivedAt ? paymentReceivedAt : null,
    };

    try {
      let saved: TaxInvoice;
      if (isEdit && invoice) {
        saved = await updateInvoice(invoice.id, data);
      } else {
        saved = await createInvoice(data);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePdfIssue() {
    if (!invoice?.id) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "PDF 생성 오류"); return; }
      window.open(json.url, "_blank");
    } catch { setError("PDF 생성 중 오류가 발생했습니다."); }
    finally { setPdfLoading(false); }
  }

  async function handleBoltaIssue() {
    if (!selectedClient) {
      setError("클라이언트를 선택해주세요.");
      return;
    }
    if (!selectedClient.business_registration_number) {
      setError(
        "수신자 사업자등록번호가 없습니다. OCR로 등록하거나 클라이언트 정보를 수정해주세요."
      );
      return;
    }
    if (!supplierInfo?.registration_number) {
      setError("설정에서 내 사업자 정보를 먼저 입력해주세요.");
      return;
    }
    if (items.some((i) => !i.name.trim())) {
      setError("모든 품목명을 입력해주세요.");
      return;
    }
    if (supplyAmount <= 0) {
      setError("금액을 입력해주세요.");
      return;
    }

    setIssuing(true);
    setError("");

    const boltaData = {
      date: issuedAt || new Date().toISOString().split("T")[0],
      purpose: "CLAIM",
      supplier: {
        identificationNumber: supplierInfo.registration_number,
        organizationName: supplierInfo.organization_name,
        representativeName: supplierInfo.representative_name,
        manager: { email: supplierInfo.manager_email },
      },
      supplied: {
        identificationNumber: selectedClient.business_registration_number,
        organizationName: selectedClient.company_name,
        representativeName: selectedClient.representative_name ?? "",
        managers: [{ email: selectedClient.email }],
      },
      items: items.map((item) => ({
        date: issuedAt || new Date().toISOString().split("T")[0],
        name: item.name,
        supplyCost: item.supply_amount,
        tax: Math.round(item.supply_amount * 0.1),
      })),
    };

    try {
      // First save to DB
      const data: CreateInvoiceInput = {
        title:
          title.trim() || selectedClient.company_name + " 세금계산서",
        items,
        supply_amount: supplyAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        issued_at: issuedAt || undefined,
        memo: memo.trim() || undefined,
        client_id: selectedClient.id,
        payment_received: paymentReceived,
        payment_received_at: paymentReceived && paymentReceivedAt ? paymentReceivedAt : null,
      };
      let saved: TaxInvoice;
      if (isEdit && invoice) {
        saved = await updateInvoice(invoice.id, data);
      } else {
        saved = await createInvoice(data);
      }

      // Then issue via Bolta
      const res = await fetch("/api/bolta/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(boltaData),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(
          result.error ??
            "볼타 발행에 실패했습니다. 세금계산서는 저장되었습니다."
        );
        onSaved(saved);
        return;
      }

      // Save bolta issuance key if returned
      const issuanceKey =
        result.data?.issuanceKey ?? result.issuanceKey;
      if (issuanceKey) {
        saved = await updateInvoice(saved.id, {
          bolta_issuance_key: issuanceKey,
        });
      }

      setIssuanceSuccess(true);
      onSaved(saved);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "발행 중 오류가 발생했습니다."
      );
    } finally {
      setIssuing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="font-outfit sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg font-bold text-slate-900">
            {isEdit ? "세금계산서 수정" : "새 세금계산서"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-5 mt-2">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="inv-title"
                className="text-sm text-slate-700 font-medium"
              >
                제목
              </Label>
              <Input
                id="inv-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 웹사이트 개발 용역"
                className="font-outfit"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="inv-date"
                className="text-sm text-slate-700 font-medium"
              >
                발행일
              </Label>
              <input
                id="inv-date"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* 클라이언트 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">
              공급받는자 (클라이언트)
            </Label>
            <Select
              value={clientId}
              onValueChange={(v) => setClientId(v ?? NONE_VALUE)}
            >
              <SelectTrigger className="font-outfit">
                <SelectValue placeholder="클라이언트 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>없음</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 공급받는자 사업자 정보 */}
          {selectedClient && selectedClient.business_registration_number && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-0.5">
              <p>
                <span className="font-medium text-slate-700">사업자번호</span>{" "}
                {selectedClient.business_registration_number}
              </p>
              {selectedClient.representative_name && (
                <p>
                  <span className="font-medium text-slate-700">대표자</span>{" "}
                  {selectedClient.representative_name}
                </p>
              )}
              {selectedClient.business_address && (
                <p>
                  <span className="font-medium text-slate-700">소재지</span>{" "}
                  {selectedClient.business_address}
                </p>
              )}
            </div>
          )}

          {/* OCR 경고 */}
          {missingBrn && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800">
                  사업자등록번호 미입력
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  볼타 발행에 필요합니다. 사업자등록증을 스캔하면 자동
                  저장됩니다.
                </p>
              </div>
              <label className="cursor-pointer shrink-0">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleOcrUpload}
                  disabled={ocrLoading}
                />
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer whitespace-nowrap">
                  {ocrLoading ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-amber-300 border-t-amber-700 animate-spin" />
                      스캔 중...
                    </>
                  ) : (
                    "사업자등록증 스캔하기"
                  )}
                </span>
              </label>
            </div>
          )}
          {ocrDone && (
            <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              사업자 정보가 저장되었습니다.
            </p>
          )}

          {/* 품목 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-slate-700 font-medium">품목</Label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={12} weight="bold" />
                품목 추가
              </button>
            </div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_100px_100px_32px] gap-0 bg-slate-50 border-b border-slate-200 px-3 py-2">
                <span className="text-xs font-medium text-slate-500">
                  품목명
                </span>
                <span className="text-xs font-medium text-slate-500 text-center">
                  수량
                </span>
                <span className="text-xs font-medium text-slate-500 text-right">
                  단가
                </span>
                <span className="text-xs font-medium text-slate-500 text-right">
                  공급가액
                </span>
                <span />
              </div>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_60px_100px_100px_32px] gap-0 items-center border-b border-slate-100 last:border-0 px-3 py-2"
                >
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    placeholder="품목명"
                    className="h-8 text-xs border-0 shadow-none px-0 focus-visible:ring-0 font-outfit"
                  />
                  <Input
                    type="number"
                    value={item.quantity || ""}
                    onChange={(e) =>
                      updateItem(idx, "quantity", e.target.value)
                    }
                    min={1}
                    className="h-8 text-xs text-center border-0 shadow-none px-1 focus-visible:ring-0 font-outfit"
                  />
                  <Input
                    type="number"
                    value={item.unit_price || ""}
                    onChange={(e) =>
                      updateItem(idx, "unit_price", e.target.value)
                    }
                    min={0}
                    className="h-8 text-xs text-right border-0 shadow-none px-1 focus-visible:ring-0 font-outfit"
                  />
                  <span className="text-xs text-slate-700 text-right pr-1 font-medium">
                    {item.supply_amount.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 합계 */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>공급가액</span>
              <span className="font-medium">{formatKRW(supplyAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>세액 (10%)</span>
              <span className="font-medium">{formatKRW(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>합계금액</span>
              <span className="text-blue-600">{formatKRW(totalAmount)}</span>
            </div>
          </div>

          {/* 입금 확인 */}
          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">입금 확인</p>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="inv-payment-received" checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600" />
              <Label htmlFor="inv-payment-received" className="text-sm text-slate-700">입금 완료</Label>
              {paymentReceived && (
                <input type="date" value={paymentReceivedAt}
                  onChange={(e) => setPaymentReceivedAt(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              )}
            </div>
          </div>

          {/* 메모 */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="inv-memo"
              className="text-sm text-slate-700 font-medium"
            >
              메모 (선택)
            </Label>
            <Textarea
              id="inv-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="내부 메모를 입력하세요"
              rows={2}
              className="text-sm font-outfit resize-none"
            />
          </div>

          {/* 공급자 정보 (미설정 경고) */}
          {!supplierInfo?.registration_number && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              볼타 발행을 위해{" "}
              <a href="/settings" className="underline font-medium">
                설정
              </a>
              에서 내 사업자 정보를 입력해주세요.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {issuanceSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle size={16} weight="fill" />
              세금계산서가 발행되었습니다.
            </div>
          )}

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            {isEdit && (
              <Button type="button" onClick={handlePdfIssue} disabled={pdfLoading} variant="outline" className="font-outfit mr-auto">
                {pdfLoading ? "PDF 생성 중..." : "PDF 서식"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving || issuing}
              className="font-outfit"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={saving || issuing}
              variant="outline"
              className="font-outfit border-slate-300"
            >
              {saving ? "저장 중..." : "임시저장"}
            </Button>
            <Button
              type="button"
              onClick={handleBoltaIssue}
              disabled={saving || issuing || !selectedClient}
              className="bg-blue-600 hover:bg-blue-700 text-white font-outfit"
            >
              {issuing ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-300 border-t-white animate-spin mr-2" />
                  발행 중...
                </>
              ) : (
                <>
                  <ArrowSquareOut size={14} className="mr-1.5" />
                  세금계산서 발행
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
