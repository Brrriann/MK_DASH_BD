"use client";

import { useState, useEffect } from "react";
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
import {
  createInvoice,
  updateInvoice,
  type TaxInvoice,
  type CreateInvoiceInput,
} from "@/lib/actions/invoices";
import { updateClient } from "@/lib/actions/clients";
import type { ClientWithRevenue } from "@/lib/types";

interface InvoiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  invoice?: TaxInvoice | null;
  clients: ClientWithRevenue[];
  onSaved: (invoice: TaxInvoice) => void;
}

const NONE_VALUE = "__none__";

export function InvoiceFormDialog({
  open,
  onClose,
  invoice,
  clients,
  onSaved,
}: InvoiceFormDialogProps) {
  const isEdit = !!invoice;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [issuedAt, setIssuedAt] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(invoice?.title ?? "");
      setAmount(invoice?.amount != null ? String(invoice.amount) : "");
      setClientId(invoice?.client_id ?? NONE_VALUE);
      setIssuedAt(
        invoice?.issued_at
          ? invoice.issued_at.split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setPdfUrl(invoice?.pdf_url ?? "");
      setError("");
      setOcrDone(false);
    }
  }, [open, invoice]);

  const selectedClient = clientId !== NONE_VALUE
    ? clients.find((c) => c.id === clientId) ?? null
    : null;
  const missingBrn = selectedClient !== null && !selectedClient.business_registration_number && !ocrDone;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    const amountNum = Number(amount);
    if (!amount || isNaN(amountNum) || amountNum < 1) {
      setError("금액을 1원 이상 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");

    const data: CreateInvoiceInput = {
      title: title.trim(),
      items: [
        {
          name: title.trim(),
          quantity: 1,
          unit_price: Math.round(amountNum / 1.1),
          supply_amount: Math.round(amountNum / 1.1),
        },
      ],
      supply_amount: Math.round(amountNum / 1.1),
      tax_amount: amountNum - Math.round(amountNum / 1.1),
      total_amount: amountNum,
      issued_at: issuedAt || undefined,
      client_id: clientId === NONE_VALUE ? null : clientId,
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

  async function handleInvoiceOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
        setError(json.error ?? "OCR 처리 중 오류가 발생했습니다.");
        return;
      }

      const updates: Record<string, string> = {};
      if (json.business_registration_number) updates.business_registration_number = json.business_registration_number;
      if (json.representative_name) updates.representative_name = json.representative_name;
      if (json.business_address) updates.business_address = json.business_address;
      if (json.business_type) updates.business_type = json.business_type;
      if (json.business_item) updates.business_item = json.business_item;
      if (Object.keys(updates).length > 0) {
        await updateClient(selectedClient.id, updates);
      }
      setOcrDone(true);
    } catch {
      setError("OCR 처리 중 오류가 발생했습니다.");
    } finally {
      setOcrLoading(false);
      e.target.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="font-outfit sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg font-bold text-slate-900">
            {isEdit ? "세금계산서 수정" : "새 세금계산서"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-title" className="text-sm text-slate-700 font-medium">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="invoice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="세금계산서 제목을 입력하세요"
              className="font-outfit"
              required
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-amount" className="text-sm text-slate-700 font-medium">
              금액 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="invoice-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액 (원)"
              min={1}
              className="font-outfit"
              required
            />
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">클라이언트</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? NONE_VALUE)}>
              <SelectTrigger className="font-outfit">
                <SelectValue placeholder="클라이언트 선택 (선택사항)" />
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

          {/* 사업자등록증 누락 경고 */}
          {missingBrn && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800">사업자등록번호 미입력</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  세금계산서 발행에 필요한 사업자 정보가 없습니다. 사업자등록증을 스캔하면 자동으로 저장됩니다.
                </p>
              </div>
              <label className="cursor-pointer shrink-0">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleInvoiceOcrUpload}
                  disabled={ocrLoading}
                />
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer whitespace-nowrap">
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

          {/* Issued At */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-issued" className="text-sm text-slate-700 font-medium">
              발행일
            </Label>
            <input
              id="invoice-issued"
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* PDF URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-pdf" className="text-sm text-slate-700 font-medium">
              PDF URL
            </Label>
            <Input
              id="invoice-pdf"
              type="url"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="https://..."
              className="font-outfit"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving || ocrLoading}
              className="font-outfit"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={saving || ocrLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium font-outfit"
            >
              {saving ? "저장 중..." : isEdit ? "수정 완료" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
