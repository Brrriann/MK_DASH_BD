"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash, Sparkle } from "@phosphor-icons/react";
import { createEstimate, updateEstimate, type Estimate, type CreateEstimateInput } from "@/lib/actions/estimates";
import type { ClientWithRevenue, EstimateItem, EstimateStatus } from "@/lib/types";

interface EstimateFormDialogProps {
  open: boolean;
  onClose: () => void;
  estimate?: Estimate | null;
  clients: ClientWithRevenue[];
  onSaved: (estimate: Estimate) => void;
}

const NONE_VALUE = "__none__";
const EMPTY_ITEM = (): EstimateItem => ({ name: "", quantity: 1, unit_price: 0, supply_amount: 0 });

export function EstimateFormDialog({ open, onClose, estimate, clients, onSaved }: EstimateFormDialogProps) {
  const isEdit = !!estimate;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<EstimateStatus>("pending");
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [lineItems, setLineItems] = useState<EstimateItem[]>([EMPTY_ITEM()]);
  const [includeVat, setIncludeVat] = useState(true);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(estimate?.title ?? "");
      setStatus(estimate?.status ?? "pending");
      setClientId(estimate?.client_id ?? NONE_VALUE);
      setIssuedAt(estimate?.issued_at ? estimate.issued_at.split("T")[0] : new Date().toISOString().split("T")[0]);
      setExpiresAt(estimate?.expires_at ? estimate.expires_at.split("T")[0] : "");
      setLineItems(estimate?.line_items?.length ? estimate.line_items : [EMPTY_ITEM()]);
      setIncludeVat(estimate?.include_vat ?? true);
      setDiscountAmount(estimate?.discount_amount?.toString() ?? "0");
      setDescription(estimate?.description ?? "");
      setAiError("");
      setError("");
    }
  }, [open, estimate]);

  const supplySubtotal = lineItems.reduce((s, i) => s + i.supply_amount, 0);
  const discount = Math.max(0, Number(discountAmount) || 0);
  const supplyAmount = Math.max(0, supplySubtotal - discount);
  const vatAmount = includeVat ? Math.round(supplyAmount * 0.1) : 0;
  const totalAmount = supplyAmount + vatAmount;

  function updateItem(idx: number, field: keyof EstimateItem, value: string | number) {
    setLineItems(prev => {
      const next = [...prev];
      const item = { ...next[idx] };
      if (field === "name") {
        item.name = value as string;
      } else {
        const n = typeof value === "string" ? Math.max(0, Number(value) || 0) : value;
        if (field === "quantity") item.quantity = Math.max(1, Math.floor(n));
        if (field === "unit_price") item.unit_price = Math.max(0, Math.floor(n));
        item.supply_amount = item.quantity * item.unit_price;
      }
      next[idx] = item;
      return next;
    });
  }

  async function handleAiDraft() {
    if (!description.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const clientName = clientId !== NONE_VALUE
        ? clients.find(c => c.id === clientId)?.company_name : undefined;
      const res = await fetch("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), clientName }),
      });
      const json = await res.json();
      if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
      setLineItems(json.items);
    } catch { setAiError("네트워크 오류가 발생했습니다."); }
    finally { setAiLoading(false); }
  }

  async function handlePdfIssue() {
    if (!estimate?.id) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: estimate.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "PDF 생성 오류"); return; }
      window.open(json.url, "_blank");
    } catch { setError("PDF 생성 중 오류가 발생했습니다."); }
    finally { setPdfLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }

    setSaving(true); setError("");

    const data: CreateEstimateInput = {
      title: title.trim(),
      amount: totalAmount || supplySubtotal,
      status,
      pdf_url: null,
      client_id: clientId === NONE_VALUE ? null : clientId,
      issued_at: issuedAt || undefined,
      expires_at: expiresAt || null,
      line_items: lineItems,
      include_vat: includeVat,
      discount_amount: discount,
      description: description.trim() || null,
    };

    try {
      let saved: Estimate;
      if (isEdit && estimate) {
        saved = await updateEstimate(estimate.id, data);
      } else {
        saved = await createEstimate(data);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="font-outfit sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg font-bold text-slate-900">
            {isEdit ? "견적서 수정" : "새 견적서"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* AI 초안 섹션 */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI 견적 초안</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="작업 내용을 설명하세요. AI가 품목을 자동으로 생성합니다.&#10;예: 쇼핑몰 웹사이트 구축 - 메인, 상품목록, 상세, 장바구니, 결제 페이지"
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-outfit"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{description.length}/1,000</span>
              <button type="button" onClick={handleAiDraft}
                disabled={aiLoading || !description.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Sparkle size={12} />
                {aiLoading ? "AI 작성 중..." : "AI 품목 생성"}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-500">{aiError}</p>}
            {aiLoading && <p className="text-xs text-blue-600 animate-pulse">AI가 견적을 작성하고 있습니다... (최대 60초 소요)</p>}
          </div>

          {/* 기본 정보 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="est-title" className="text-sm text-slate-700 font-medium">제목 <span className="text-red-500">*</span></Label>
            <Input id="est-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="견적서 제목" className="font-outfit" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">상태</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EstimateStatus)}>
                <SelectTrigger className="font-outfit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">검토중</SelectItem>
                  <SelectItem value="accepted">수락</SelectItem>
                  <SelectItem value="expired">만료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">클라이언트</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? NONE_VALUE)}>
                <SelectTrigger className="font-outfit"><SelectValue placeholder="선택 (선택사항)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>없음</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="est-issued" className="text-sm text-slate-700 font-medium">발행일</Label>
              <input id="est-issued" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="est-expires" className="text-sm text-slate-700 font-medium">만료일</Label>
              <input id="est-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>

          {/* 품목 테이블 */}
          <div className="space-y-2">
            <Label className="text-sm text-slate-700 font-medium">품목 목록</Label>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_56px_100px_100px_32px] bg-slate-50 border-b border-slate-200 px-2 py-1.5">
                <span className="text-xs font-medium text-slate-500">품목명</span>
                <span className="text-xs font-medium text-slate-500 text-center">수량</span>
                <span className="text-xs font-medium text-slate-500 text-right">단가</span>
                <span className="text-xs font-medium text-slate-500 text-right">공급가액</span>
                <span />
              </div>
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_56px_100px_100px_32px] gap-1 px-2 py-1.5 border-b border-slate-100 last:border-0 items-center">
                  <input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)}
                    placeholder="품목명" maxLength={100}
                    className="text-sm border border-slate-200 rounded px-2 py-1 font-outfit focus:outline-none focus:ring-1 focus:ring-blue-500 w-full" />
                  <input type="number" value={item.quantity} min={1}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    className="text-sm border border-slate-200 rounded px-1 py-1 font-outfit focus:outline-none focus:ring-1 focus:ring-blue-500 text-center w-full" />
                  <input type="number" value={item.unit_price} min={0}
                    onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                    className="text-sm border border-slate-200 rounded px-1 py-1 font-outfit focus:outline-none focus:ring-1 focus:ring-blue-500 text-right w-full" />
                  <span className="text-xs text-slate-600 text-right pr-1">
                    {item.supply_amount.toLocaleString('ko-KR')}
                  </span>
                  <button type="button"
                    onClick={() => setLineItems(p => p.length > 1 ? p.filter((_, idx) => idx !== i) : p)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors flex justify-center">
                    <Trash size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setLineItems(p => [...p, EMPTY_ITEM()])}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Plus size={12} />품목 추가
            </button>
          </div>

          {/* VAT + 할인 + 합계 */}
          <div className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="include-vat" checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <Label htmlFor="include-vat" className="text-sm text-slate-700">부가세 10% 포함</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-500">할인</Label>
                <input type="number" value={discountAmount} min={0}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-28 h-7 text-xs border border-slate-200 rounded px-2 font-outfit text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <span className="text-xs text-slate-500">원</span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-2 space-y-1 text-right">
              {discount > 0 && <p className="text-xs text-slate-500">할인: -{discount.toLocaleString('ko-KR')}원</p>}
              <p className="text-xs text-slate-500">공급가액: {supplyAmount.toLocaleString('ko-KR')}원</p>
              {includeVat && <p className="text-xs text-slate-500">부가세(10%): {vatAmount.toLocaleString('ko-KR')}원</p>}
              <p className="text-sm font-bold text-slate-900">합계: {totalAmount.toLocaleString('ko-KR')}원</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter className="mt-2">
            {isEdit && (
              <Button type="button" onClick={handlePdfIssue} disabled={pdfLoading} variant="outline" className="font-outfit mr-auto">
                {pdfLoading ? "PDF 생성 중..." : "PDF 발행"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="font-outfit">취소</Button>
            <Button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium font-outfit">
              {saving ? "저장 중..." : isEdit ? "수정 완료" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
