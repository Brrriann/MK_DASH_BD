"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CaretDown, MagnifyingGlass, X,
} from "@phosphor-icons/react";

type InteractionType = "call" | "kakao" | "email" | "meeting" | "memo";

interface ClientOption {
  id: string;
  company_name: string;
  contact_name: string;
}
interface LeadOption {
  id: string;
  name: string;
  company: string | null;
  status: string;
}

interface Props {
  clients: ClientOption[];
  leads: LeadOption[];
}

const TYPE_OPTIONS: { value: InteractionType; label: string; emoji: string }[] = [
  { value: "call",    label: "통화",   emoji: "📞" },
  { value: "kakao",   label: "카톡",   emoji: "💬" },
  { value: "email",   label: "이메일", emoji: "✉️" },
  { value: "meeting", label: "미팅",   emoji: "👥" },
  { value: "memo",    label: "메모",   emoji: "📝" },
];

const ENTITY_TABS = [
  { value: "client" as const, label: "고객" },
  { value: "lead"   as const, label: "리드" },
  { value: "manual" as const, label: "직접입력" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function toLocalDatetime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* ── 검색 드롭다운 ── */
function SearchDropdown({
  options, value, displayValue, placeholder, onChange, onClear,
}: {
  options: { id: string; label: string; sub?: string }[];
  value: string;
  displayValue: string;
  placeholder: string;
  onChange: (id: string, label: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    (o.label + " " + (o.sub ?? "")).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <div className="relative">
      <div
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 flex items-center justify-between cursor-pointer hover:border-slate-300 transition select-none"
      >
        {value ? (
          <span className="truncate flex-1">{displayValue}</span>
        ) : (
          <span className="text-slate-400 flex-1 truncate">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <CaretDown
            size={14}
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
              <MagnifyingGlass size={14} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="검색..."
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-xs text-slate-400 text-center">검색 결과 없음</li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.id}
                    onClick={() => { onChange(opt.id, opt.label); setOpen(false); }}
                    className={`px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      value === opt.id ? "bg-blue-50 text-blue-700" : "text-slate-900"
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    {opt.sub && (
                      <span className="text-xs text-slate-400 ml-2 shrink-0">{opt.sub}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/* ── 메인 페이지 컴포넌트 ── */
export function InteractionNewPage({ clients, leads }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState<InteractionType>("call");
  const [entityMode, setEntityMode] = useState<"client" | "lead" | "manual">("client");
  const [selectedId, setSelectedId] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [occurredAt, setOccurredAt] = useState(toLocalDatetime(new Date()));
  const [followUpAt, setFollowUpAt] = useState("");

  const clientOptions = clients.map((c) => ({
    id: c.id,
    label: c.company_name,
    sub: c.contact_name,
  }));
  const leadOptions = leads.map((l) => ({
    id: l.id,
    label: l.name,
    sub: l.company ?? undefined,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) { setError("요약을 입력해주세요."); return; }

    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        type,
        summary: summary.trim(),
        content: content.trim() || undefined,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      };
      if (entityMode === "client" && selectedId) body.client_id = selectedId;
      if (entityMode === "lead"   && selectedId) body.lead_id   = selectedId;

      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `저장 실패 (${res.status})`);
      }

      router.push("/interactions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="font-outfit max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-950 leading-tight">소통 기록 추가</h1>
          <p className="text-sm text-slate-400 mt-0.5">새 소통 내용을 기록합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 소통 유형 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            소통 유형 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === opt.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-base leading-none">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 연결 대상 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            연결 대상
          </label>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-4 text-sm">
            {ENTITY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setEntityMode(tab.value);
                  setSelectedId("");
                  setSelectedLabel("");
                }}
                className={`flex-1 py-2 font-medium transition-colors ${
                  entityMode === tab.value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {entityMode === "client" && (
            <SearchDropdown
              options={clientOptions}
              value={selectedId}
              displayValue={selectedLabel}
              placeholder={`고객 선택 (총 ${clients.length}명)`}
              onChange={(id, label) => { setSelectedId(id); setSelectedLabel(label); }}
              onClear={() => { setSelectedId(""); setSelectedLabel(""); }}
            />
          )}
          {entityMode === "lead" && (
            <SearchDropdown
              options={leadOptions}
              value={selectedId}
              displayValue={selectedLabel}
              placeholder={`리드 선택 (총 ${leads.length}명)`}
              onChange={(id, label) => { setSelectedId(id); setSelectedLabel(label); }}
              onClear={() => { setSelectedId(""); setSelectedLabel(""); }}
            />
          )}
          {entityMode === "manual" && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-500">
                연결 없이 저장됩니다.
                아래 <strong className="text-slate-700">요약</strong>에 상대방 정보를 포함해 입력해 주세요.
              </p>
            </div>
          )}
        </div>

        {/* 요약 + 상세 내용 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              요약 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                entityMode === "manual"
                  ? "홍길동(미등록) — 웹사이트 견적 문의"
                  : "소통 내용을 한 줄로 요약하세요"
              }
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              상세 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상세 내용을 입력하세요 (선택)"
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
            />
          </div>
        </div>

        {/* 일시 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              발생 일시
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              팔로업 날짜
            </label>
            <input
              type="date"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || !summary.trim()}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
