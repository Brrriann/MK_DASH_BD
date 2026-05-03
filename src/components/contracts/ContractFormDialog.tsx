"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkle } from "@phosphor-icons/react";
import { createContract, updateContract, type Contract, type CreateContractInput } from "@/lib/actions/contracts";
import type { ClientWithRevenue, ContractStatus } from "@/lib/types";

interface ContractFormDialogProps {
  open: boolean;
  onClose: () => void;
  contract?: Contract | null;
  clients: ClientWithRevenue[];
  onSaved: (contract: Contract) => void;
}

const NONE_VALUE = "__none__";

export function ContractFormDialog({ open, onClose, contract, clients, onSaved }: ContractFormDialogProps) {
  const isEdit = !!contract;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ContractStatus>("pending");
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [signedAt, setSignedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositPaidAt, setDepositPaidAt] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [finalPaid, setFinalPaid] = useState(false);
  const [finalPaidAt, setFinalPaidAt] = useState("");
  const [terms, setTerms] = useState("");
  const [scope, setScope] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sigRequestLoading, setSigRequestLoading] = useState(false);
  const [sigRequestSent, setSigRequestSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(contract?.title ?? "");
      setStatus(contract?.status ?? "pending");
      setClientId(contract?.client_id ?? NONE_VALUE);
      setSignedAt(contract?.signed_at ? contract.signed_at.split("T")[0] : "");
      setExpiresAt(contract?.expires_at ? contract.expires_at.split("T")[0] : "");
      setContractAmount(contract?.contract_amount?.toString() ?? "");
      setDepositAmount(contract?.deposit_amount?.toString() ?? "");
      setDepositPaid(contract?.deposit_paid ?? false);
      setDepositPaidAt(contract?.deposit_paid_at ?? "");
      setFinalAmount(contract?.final_amount?.toString() ?? "");
      setFinalPaid(contract?.final_paid ?? false);
      setFinalPaidAt(contract?.final_paid_at ?? "");
      setTerms(contract?.terms ?? "");
      setScope("");
      setAiError("");
      setError("");
      setSigRequestSent(false);
      setSigRequestLoading(false);
    }
  }, [open, contract]);

  async function handleAiWrite() {
    if (!scope.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const clientName = clientId !== NONE_VALUE
        ? clients.find(c => c.id === clientId)?.company_name : undefined;
      const res = await fetch("/api/ai/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: scope.trim(),
          clientName,
          amount: contractAmount ? Number(contractAmount) : undefined,
          startDate: signedAt || undefined,
          endDate: expiresAt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
      setTerms(json.content);
    } catch { setAiError("네트워크 오류가 발생했습니다."); }
    finally { setAiLoading(false); }
  }

  async function handleSendSignature() {
    if (!contract?.id) return;
    setSigRequestLoading(true);
    try {
      const res = await fetch("/api/contracts/send-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "발송 오류"); return; }
      setSigRequestSent(true);
    } catch { setError("네트워크 오류가 발생했습니다."); }
    finally { setSigRequestLoading(false); }
  }

  async function handlePdfIssue() {
    if (!contract?.id) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id }),
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

    const data: CreateContractInput = {
      title: title.trim(),
      status,
      pdf_url: null,
      client_id: clientId === NONE_VALUE ? null : clientId,
      signed_at: signedAt || null,
      expires_at: expiresAt || null,
      contract_amount: contractAmount ? Number(contractAmount) : null,
      deposit_amount: depositAmount ? Number(depositAmount) : null,
      deposit_paid: depositPaid,
      deposit_paid_at: depositPaid && depositPaidAt ? depositPaidAt : null,
      final_amount: finalAmount ? Number(finalAmount) : null,
      final_paid: finalPaid,
      final_paid_at: finalPaid && finalPaidAt ? finalPaidAt : null,
      terms: terms.trim() || null,
    };

    try {
      let saved: Contract;
      if (isEdit && contract) {
        saved = await updateContract(contract.id, data);
      } else {
        saved = await createContract(data);
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
      <DialogContent className="font-outfit sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg font-bold text-slate-900">
            {isEdit ? "계약서 수정" : "새 계약서"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* 기본 정보 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cont-title" className="text-sm text-slate-700 font-medium">제목 <span className="text-red-500">*</span></Label>
            <Input id="cont-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="계약서 제목" className="font-outfit" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">상태</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
                <SelectTrigger className="font-outfit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="signed">서명완료</SelectItem>
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
              <Label htmlFor="cont-signed" className="text-sm text-slate-700 font-medium">서명일</Label>
              <input id="cont-signed" type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cont-expires" className="text-sm text-slate-700 font-medium">만료일</Label>
              <input id="cont-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>

          {/* 계약금액 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cont-amount" className="text-sm text-slate-700 font-medium">계약금액 (원)</Label>
            <Input id="cont-amount" type="number" value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
              placeholder="계약 금액" className="font-outfit" min={0} />
          </div>

          {/* 입금 추적 */}
          <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">입금 추적</p>
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deposit-amt" className="text-xs text-slate-600">계약금</Label>
                <Input id="deposit-amt" type="number" value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="계약금 금액 (원)" className="font-outfit h-8 text-sm" min={0} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="deposit-paid" checked={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <Label htmlFor="deposit-paid" className="text-sm text-slate-700">계약금 입금 완료</Label>
                {depositPaid && (
                  <Input type="date" value={depositPaidAt} onChange={(e) => setDepositPaidAt(e.target.value)}
                    className="font-outfit w-36 h-8 text-xs" />
                )}
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="final-amt" className="text-xs text-slate-600">잔금</Label>
                <Input id="final-amt" type="number" value={finalAmount}
                  onChange={(e) => setFinalAmount(e.target.value)}
                  placeholder="잔금 금액 (원)" className="font-outfit h-8 text-sm" min={0} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="final-paid" checked={finalPaid}
                  onChange={(e) => setFinalPaid(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <Label htmlFor="final-paid" className="text-sm text-slate-700">잔금 입금 완료</Label>
                {finalPaid && (
                  <Input type="date" value={finalPaidAt} onChange={(e) => setFinalPaidAt(e.target.value)}
                    className="font-outfit w-36 h-8 text-xs" />
                )}
              </div>
            </div>
          </div>

          {/* AI 계약서 작성 */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI 계약서 작성</p>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="작업 범위와 조건을 입력하세요.&#10;예: 쇼핑몰 웹사이트 기획/디자인/개발. 계약금 50% 착수, 잔금 50% 납품 후 지급."
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-outfit"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{scope.length}/1,000</span>
              <button type="button" onClick={handleAiWrite}
                disabled={aiLoading || !scope.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Sparkle size={12} />
                {aiLoading ? "AI 작성 중..." : "AI 계약서 작성"}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-500">{aiError}</p>}
            {aiLoading && <p className="text-xs text-blue-600 animate-pulse">AI가 계약서를 작성하고 있습니다... (최대 60초 소요)</p>}
          </div>

          {/* 계약서 본문 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">계약서 본문</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)}
              placeholder="AI로 생성하거나 직접 입력하세요." rows={10}
              className="font-outfit text-sm resize-y" />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter className="mt-2">
            {isEdit && contract?.terms && (
              <Button type="button" onClick={handlePdfIssue} disabled={pdfLoading} variant="outline" className="font-outfit mr-auto">
                {pdfLoading ? "PDF 생성 중..." : "PDF 발행"}
              </Button>
            )}
            {isEdit && !contract?.signed_at && (
              <Button
                type="button"
                onClick={handleSendSignature}
                disabled={sigRequestLoading || sigRequestSent}
                variant="outline"
                className="font-outfit"
              >
                {sigRequestSent ? "✓ 서명 요청 발송됨" : sigRequestLoading ? "발송 중..." : "서명 요청 발송"}
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
