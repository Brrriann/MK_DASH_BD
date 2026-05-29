"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UploadSimple, Link as LinkIcon, FilePdf } from "@phosphor-icons/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import type { ClientWithRevenue } from "@/lib/types";

interface ContractNewPageProps {
  clients: ClientWithRevenue[];
}

const NONE = "__none__";

export function ContractNewPage({ clients }: ContractNewPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(searchParams.get("client_id") ?? NONE);
  const [contractAmount, setContractAmount] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pdfMode, setPdfMode] = useState<"upload" | "url">("upload");
  const [pdfUrl, setPdfUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }

    setSaving(true);
    setError("");

    let finalPdfUrl: string | null = null;

    if (pdfMode === "upload" && file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/contracts/upload", { method: "POST", body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok) { setError(json.error ?? "파일 업로드에 실패했습니다."); setSaving(false); return; }
      finalPdfUrl = json.url ?? null;
    } else if (pdfMode === "url" && pdfUrl.trim()) {
      finalPdfUrl = pdfUrl.trim();
    }

    const amountNum = contractAmount ? Number(contractAmount.replace(/,/g, "")) : null;

    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        client_id: clientId === NONE ? null : clientId,
        pdf_url: finalPdfUrl,
        contract_amount: amountNum,
        signed_at: signedAt || null,
        expires_at: expiresAt || null,
        status: "pending",
      }),
    });
    const json = await res.json() as { id?: string; error?: string };
    if (!res.ok) { setError(json.error ?? "저장에 실패했습니다."); setSaving(false); return; }

    router.push("/contracts");
    router.refresh();
  }

  return (
    <div className="font-outfit max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => router.back()}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={18} weight="regular" />
        </button>
        <h1 className="font-outfit text-xl font-bold tracking-tight text-slate-900">새 계약서</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 제목 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">제목 <span className="text-red-500">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="예: 홈페이지 제작 계약서 v1" maxLength={200} required
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        {/* 클라이언트 + 계약금액 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">클라이언트</label>
            <Select value={clientId} onValueChange={v => setClientId(v ?? NONE)}>
              <SelectTrigger className="h-10 font-outfit text-sm">
                <span className={clientId === NONE ? "text-slate-400" : "text-slate-900"}>
                  {clientId === NONE ? "선택 (선택사항)" : (clients.find(c => c.id === clientId)?.company_name ?? "선택됨")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>없음</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">계약 금액</label>
            <div className="relative">
              <input value={contractAmount}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setContractAmount(v ? Number(v).toLocaleString("ko-KR") : "");
                }}
                placeholder="0"
                className="w-full h-10 rounded-lg border border-slate-200 px-3 pr-6 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-right" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
          </div>
        </div>

        {/* 서명일 + 만료일 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">서명일</label>
            <input type="date" value={signedAt} onChange={e => setSignedAt(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">만료일</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </div>

        {/* 파일 첨부 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">계약서 파일 (선택)</label>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button type="button" onClick={() => setPdfMode("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${pdfMode === "upload" ? "bg-blue-50 text-blue-700" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              <UploadSimple size={15} />파일 업로드
            </button>
            <button type="button" onClick={() => setPdfMode("url")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-l border-slate-200 ${pdfMode === "url" ? "bg-blue-50 text-blue-700" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              <LinkIcon size={15} />URL 입력
            </button>
          </div>

          {pdfMode === "upload" ? (
            <div>
              <input ref={fileRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {file ? (
                  <div className="flex items-center gap-2 text-slate-700">
                    <FilePdf size={20} className="text-blue-600" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)}KB)</span>
                  </div>
                ) : (
                  <><UploadSimple size={20} /><span className="text-sm">PDF 또는 이미지 선택 (최대 10MB)</span></>
                )}
              </button>
            </div>
          ) : (
            <input value={pdfUrl} onChange={e => setPdfUrl(e.target.value)}
              placeholder="https://drive.google.com/... 또는 공개 PDF URL"
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={() => router.back()} disabled={saving}
            className="flex-1 h-11 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            취소
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
