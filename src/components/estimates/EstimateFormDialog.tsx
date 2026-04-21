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
  createEstimate,
  updateEstimate,
  type Estimate,
  type CreateEstimateInput,
} from "@/lib/actions/estimates";
import type { ClientWithRevenue } from "@/lib/types";

interface EstimateFormDialogProps {
  open: boolean;
  onClose: () => void;
  estimate?: Estimate | null;
  clients: ClientWithRevenue[];
  onSaved: (estimate: Estimate) => void;
}

const NONE_VALUE = "__none__";

export function EstimateFormDialog({
  open,
  onClose,
  estimate,
  clients,
  onSaved,
}: EstimateFormDialogProps) {
  const isEdit = !!estimate;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"pending" | "accepted" | "expired">("pending");
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(estimate?.title ?? "");
      setAmount(estimate?.amount != null ? String(estimate.amount) : "");
      setStatus(estimate?.status ?? "pending");
      setClientId(estimate?.client_id ?? NONE_VALUE);
      setIssuedAt(
        estimate?.issued_at
          ? estimate.issued_at.split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setExpiresAt(estimate?.expires_at ? estimate.expires_at.split("T")[0] : "");
      setPdfUrl(estimate?.pdf_url ?? "");
      setError("");
    }
  }, [open, estimate]);

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

    const data: CreateEstimateInput = {
      title: title.trim(),
      amount: amountNum,
      status,
      pdf_url: pdfUrl.trim() || null,
      client_id: clientId === NONE_VALUE ? null : clientId,
      issued_at: issuedAt || undefined,
      expires_at: expiresAt || null,
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
      <DialogContent className="font-outfit sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg font-bold text-slate-900">
            {isEdit ? "견적서 수정" : "새 견적서"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="estimate-title" className="text-sm text-slate-700 font-medium">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="estimate-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="견적서 제목을 입력하세요"
              className="font-outfit"
              required
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="estimate-amount" className="text-sm text-slate-700 font-medium">
              금액 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="estimate-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액 (원)"
              min={1}
              className="font-outfit"
              required
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">상태</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "pending" | "accepted" | "expired")}
            >
              <SelectTrigger className="font-outfit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">검토중</SelectItem>
                <SelectItem value="accepted">수락</SelectItem>
                <SelectItem value="expired">만료</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Issued At + Expires At row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estimate-issued" className="text-sm text-slate-700 font-medium">
                발행일
              </Label>
              <input
                id="estimate-issued"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estimate-expires" className="text-sm text-slate-700 font-medium">
                만료일
              </Label>
              <input
                id="estimate-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* PDF URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="estimate-pdf" className="text-sm text-slate-700 font-medium">
              PDF URL
            </Label>
            <Input
              id="estimate-pdf"
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
              disabled={saving}
              className="font-outfit"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={saving}
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
