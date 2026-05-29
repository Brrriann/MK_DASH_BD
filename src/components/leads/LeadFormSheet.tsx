"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createLead, type LeadInput } from "@/lib/actions/lead-actions";
import type { LeadSource } from "@/lib/types";
import { formatPhone, formatAmount, parseAmount } from "@/lib/utils/input-formatters";

const SOURCE_OPTIONS: LeadSource[] = [
  "숨고",
  "크몽",
  "위시캣",
  "라우드소싱",
  "Fiverr",
  "직접문의",
  "기타",
];

const DEFAULT_FORM: LeadInput = {
  name: "",
  company: "",
  phone: "",
  email: "",
  source: "직접문의",
  service_interest: "",
  budget_estimate: undefined,
  notes: "",
  follow_up_at: "",
};

export function LeadFormSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LeadInput>({ ...DEFAULT_FORM });

  function resetForm() {
    setForm({ ...DEFAULT_FORM });
    setError(null);
  }

  function set<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("이름은 필수입니다.");
      return;
    }
    if (!form.source) {
      setError("유입 소스를 선택해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createLead({
        name: form.name.trim(),
        company: form.company?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        source: form.source,
        service_interest: form.service_interest?.trim() || undefined,
        budget_estimate: form.budget_estimate || undefined,
        notes: form.notes?.trim() || undefined,
        follow_up_at: form.follow_up_at
          ? new Date(form.follow_up_at).toISOString()
          : undefined,
      });
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0 min-h-[44px]"
      >
        <UserPlus size={16} weight="regular" />
        <span className="hidden sm:inline">리드 추가</span>
        <span className="sm:hidden">추가</span>
      </button>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-outfit text-slate-900">
              리드 추가
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-8">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* 이름 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="홍길동"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 회사명 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                회사명
              </label>
              <input
                type="text"
                value={form.company ?? ""}
                onChange={(e) => set("company", e.target.value)}
                placeholder="(주)마그네이트코리아"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 전화번호 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                전화번호
              </label>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 이메일 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                이메일
              </label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contact@example.com"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 유입 소스 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                유입 소스 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {SOURCE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("source", s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.source === s
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 관심 서비스 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                관심 서비스
              </label>
              <input
                type="text"
                value={form.service_interest ?? ""}
                onChange={(e) => set("service_interest", e.target.value)}
                placeholder="웹사이트, 로고 디자인, 앱 등"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 예산 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                예산 (원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.budget_estimate != null ? Number(form.budget_estimate).toLocaleString("ko-KR") : ""}
                onChange={(e) => set("budget_estimate", parseAmount(e.target.value) ?? undefined)}
                placeholder="500,000"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 팔로업 날짜 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                팔로업 날짜
              </label>
              <input
                type="date"
                value={form.follow_up_at ?? ""}
                onChange={(e) => set("follow_up_at", e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 메모 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                메모
              </label>
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="상담 내용, 특이사항 등을 자유롭게 입력하세요"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {loading ? "저장 중..." : "리드 추가"}
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
