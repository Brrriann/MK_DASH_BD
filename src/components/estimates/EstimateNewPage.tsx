"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UploadSimple, Link as LinkIcon, FilePdf } from "@phosphor-icons/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ClientWithRevenue } from "@/lib/types";

interface EstimateNewPageProps {
  clients: ClientWithRevenue[];
}

const NONE = "__none__";

export function EstimateNewPage({ clients }: EstimateNewPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(searchParams.get("client_id") ?? NONE);
  const [amount, setAmount] = useState("");
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().split("T")[0]);
  const [expiresAt, setExpiresAt] = useState("");
  const [pdfMode, setPdfMode] = useState<"upload" | "url">("upload");
  const [pdfUrl, setPdfUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find(c => c.id === clientId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    const amountNum = Number(amount.replace(/,/g, ""));
    if (!amount || isNaN(amountNum) || amountNum < 0) { setError("견적 금액을 입력해주세요."); return; }

    setSaving(true);
    setError("");

    let finalPdfUrl: string | null = null;

    // 1. Upload file if needed
    if (pdfMode === "upload" && file) {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/estimates/upload", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json() as { url?: string; error?: string };
      if (!uploadRes.ok) {
        setError(uploadJson.error ?? "파일 업로드에 실패했습니다.");
        setSaving(false);
        return;
      }
      finalPdfUrl = uploadJson.url ?? null;
    } else if (pdfMode === "url" && pdfUrl.trim()) {
      finalPdfUrl = pdfUrl.trim();
    }

    // 2. Create estimate
    const createRes = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        amount: amountNum,
        client_id: clientId === NONE ? null : clientId,
        pdf_url: finalPdfUrl,
        issued_at: issuedAt || undefined,
        expires_at: expiresAt || null,
        status: "pending",
      }),
    });
    const createJson = await createRes.json() as { id?: string; error?: string };
    if (!createRes.ok) {
      setError(createJson.error ?? "저장에 실패했습니다.");
      setSaving(false);
      return;
    }

    // 3. Send email if requested
    if (sendEmail && createJson.id) {
      const sendRes = await fetch(`/api/estimates/${createJson.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: emailSubject.trim() || undefined,
          body: emailBody.trim() || undefined,
        }),
      });
      if (!sendRes.ok) {
        const sendJson = await sendRes.json() as { error?: string };
        setError(`저장은 완료됐지만 이메일 발송에 실패했습니다: ${sendJson.error ?? "오류"}`);
        setSaving(false);
        return;
      }
    }

    router.push("/estimates");
    router.refresh();
  }

  return (
    <div className="font-outfit max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={18} weight="regular" />
        </button>
        <h1 className="font-outfit text-xl font-bold tracking-tight text-slate-900">새 견적서</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 제목 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              // 이메일 제목 기본값 자동 동기화 (사용자가 직접 수정하지 않은 경우)
              if (!emailSubject || emailSubject === `[견적서] ${title}`) {
                setEmailSubject(`[견적서] ${e.target.value}`);
              }
            }}
            placeholder="예: 홈페이지 제작 견적서 v1"
            maxLength={200}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        {/* 클라이언트 + 금액 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">클라이언트</label>
            <Select value={clientId} onValueChange={v => setClientId(v ?? NONE)}>
              <SelectTrigger className="h-10 font-outfit text-sm">
                <span className={clientId === NONE ? "text-slate-400" : "text-slate-900"}>
                  {clientId === NONE
                    ? "선택 (선택사항)"
                    : (clients.find(c => c.id === clientId)?.company_name ?? "선택됨")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>없음</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              견적 금액 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                value={amount}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(v ? Number(v).toLocaleString("ko-KR") : "");
                }}
                placeholder="0"
                className="w-full h-10 rounded-lg border border-slate-200 px-3 pr-6 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
          </div>
        </div>

        {/* 발행일 + 만료일 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">발행일</label>
            <input
              type="date"
              value={issuedAt}
              onChange={e => setIssuedAt(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">유효 기한</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* PDF 첨부 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">견적서 파일 (선택)</label>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setPdfMode("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                pdfMode === "upload"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <UploadSimple size={15} />
              파일 업로드
            </button>
            <button
              type="button"
              onClick={() => setPdfMode("url")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-l border-slate-200 ${
                pdfMode === "url"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LinkIcon size={15} />
              URL 입력
            </button>
          </div>

          {pdfMode === "upload" ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-slate-700">
                    <FilePdf size={20} className="text-blue-600" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)}KB)</span>
                  </div>
                ) : (
                  <>
                    <UploadSimple size={20} />
                    <span className="text-sm">PDF 또는 이미지 선택 (최대 10MB)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <input
              value={pdfUrl}
              onChange={e => setPdfUrl(e.target.value)}
              placeholder="https://drive.google.com/... 또는 공개 PDF URL"
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          )}
        </div>

        {/* 이메일 발송 옵션 */}
        {clientId !== NONE && (
          <div className={`rounded-xl border p-4 space-y-4 transition-colors ${
            sendEmail ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-slate-50/50"
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">저장 후 바로 이메일 발송</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedClient?.email
                    ? `수신: ${selectedClient.email}`
                    : "고객에게 이메일로 견적서를 발송합니다"}
                </p>
              </div>
            </label>

            {sendEmail && (
              <div className="space-y-3 pt-1 border-t border-blue-100">
                {/* 이메일 제목 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">이메일 제목</label>
                  <input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    placeholder={`[견적서] ${title || "제목"}`}
                    maxLength={200}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* 이메일 본문 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">이메일 본문</label>
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    placeholder={`${selectedClient?.contact_name ?? "고객"} 님,\n\n안녕하세요. 요청하신 견적서를 보내드립니다.\n첨부된 견적서를 확인해 주세요.\n\n감사합니다.`}
                    maxLength={2000}
                    rows={6}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-outfit text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none leading-relaxed"
                  />
                  <p className="text-xs text-slate-400 text-right">{emailBody.length}/2,000</p>
                </div>
                <p className="text-xs text-slate-400">
                  📋 이메일 하단에 견적서 제목·금액·유효기한이 자동으로 포함됩니다
                  {(pdfMode === "upload" && file) || (pdfMode === "url" && pdfUrl.trim()) ? " · PDF 링크도 포함됩니다" : ""}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className="flex-1 h-11 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving
              ? sendEmail ? "저장 및 발송 중..." : "저장 중..."
              : sendEmail ? "저장 및 이메일 발송" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
