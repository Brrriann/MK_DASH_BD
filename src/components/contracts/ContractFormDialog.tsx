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
  createContract,
  updateContract,
  type Contract,
  type CreateContractInput,
} from "@/lib/actions/contracts";
import type { ClientWithRevenue } from "@/lib/types";

interface ContractFormDialogProps {
  open: boolean;
  onClose: () => void;
  contract?: Contract | null;
  clients: ClientWithRevenue[];
  onSaved: (contract: Contract) => void;
}

const NONE_VALUE = "__none__";

export function ContractFormDialog({
  open,
  onClose,
  contract,
  clients,
  onSaved,
}: ContractFormDialogProps) {
  const isEdit = !!contract;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"signed" | "pending" | "expired">("pending");
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [signedAt, setSignedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(contract?.title ?? "");
      setStatus(contract?.status ?? "pending");
      setClientId(contract?.client_id ?? NONE_VALUE);
      setSignedAt(contract?.signed_at ? contract.signed_at.split("T")[0] : "");
      setExpiresAt(contract?.expires_at ? contract.expires_at.split("T")[0] : "");
      setPdfUrl(contract?.pdf_url ?? "");
      setError("");
    }
  }, [open, contract]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");

    const data: CreateContractInput = {
      title: title.trim(),
      status,
      pdf_url: pdfUrl.trim() || null,
      client_id: clientId === NONE_VALUE ? null : clientId,
      signed_at: signedAt || null,
      expires_at: expiresAt || null,
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
      <DialogContent className="font-outfit sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg font-bold text-slate-900">
            {isEdit ? "계약서 수정" : "새 계약서"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-title" className="text-sm text-slate-700 font-medium">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contract-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="계약서 제목을 입력하세요"
              className="font-outfit"
              required
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">상태</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "signed" | "pending" | "expired")}
            >
              <SelectTrigger className="font-outfit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="signed">서명완료</SelectItem>
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

          {/* Signed At + Expires At row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-signed" className="text-sm text-slate-700 font-medium">
                서명일
              </Label>
              <input
                id="contract-signed"
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-expires" className="text-sm text-slate-700 font-medium">
                만료일
              </Label>
              <input
                id="contract-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* PDF URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-pdf" className="text-sm text-slate-700 font-medium">
              PDF URL
            </Label>
            <Input
              id="contract-pdf"
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
