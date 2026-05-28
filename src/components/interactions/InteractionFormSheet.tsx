"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createInteraction, type InteractionInput } from "@/lib/actions/interaction-actions";

type InteractionType = "call" | "kakao" | "email" | "meeting" | "memo";

const TYPE_OPTIONS: { value: InteractionType; label: string; emoji: string }[] = [
  { value: "call", label: "통화", emoji: "📞" },
  { value: "kakao", label: "카톡", emoji: "💬" },
  { value: "email", label: "이메일", emoji: "✉️" },
  { value: "meeting", label: "미팅", emoji: "👥" },
  { value: "memo", label: "메모", emoji: "📝" },
];

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function InteractionFormSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // form state
  const [type, setType] = useState<InteractionType>("call");
  const [entityMode, setEntityMode] = useState<"client" | "lead">("client");
  const [entityId, setEntityId] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [occurredAt, setOccurredAt] = useState(toLocalDatetimeValue(new Date()));
  const [followUpAt, setFollowUpAt] = useState("");

  function resetForm() {
    setType("call");
    setEntityMode("client");
    setEntityId("");
    setSummary("");
    setContent("");
    setOccurredAt(toLocalDatetimeValue(new Date()));
    setFollowUpAt("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;

    setLoading(true);
    try {
      const input: InteractionInput = {
        type,
        summary: summary.trim(),
        content: content.trim() || undefined,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      };
      if (entityId.trim()) {
        if (entityMode === "client") {
          input.client_id = entityId.trim();
        } else {
          input.lead_id = entityId.trim();
        }
      }
      await createInteraction(input);
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다.");
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
        <Plus size={16} weight="regular" />
        <span className="hidden sm:inline">소통 추가</span>
        <span className="sm:hidden">추가</span>
      </button>

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-2">
            <SheetTitle className="font-outfit text-slate-900">소통 기록 추가</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-6">
            {/* 소통 유형 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                소통 유형 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      type === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 연결 대상 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                연결 대상
              </label>
              <div className="flex gap-3 mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="entityMode"
                    value="client"
                    checked={entityMode === "client"}
                    onChange={() => { setEntityMode("client"); setEntityId(""); }}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">고객</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="entityMode"
                    value="lead"
                    checked={entityMode === "lead"}
                    onChange={() => { setEntityMode("lead"); setEntityId(""); }}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">리드</span>
                </label>
              </div>
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder={
                  entityMode === "client" ? "고객 ID 입력 (선택)" : "리드 ID 입력 (선택)"
                }
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 요약 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                요약 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="소통 내용을 한 줄로 요약하세요"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 상세 내용 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                상세 내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="상세 내용을 입력하세요 (선택)"
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
              />
            </div>

            {/* 발생 일시 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                발생 일시
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 팔로업 날짜 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                팔로업 날짜
              </label>
              <input
                type="date"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setOpen(false); resetForm(); }}
                className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || !summary.trim()}
                className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {loading ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
