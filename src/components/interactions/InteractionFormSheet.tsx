"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, CaretDown, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createInteraction, type InteractionInput } from "@/lib/actions/interaction-actions";

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

export interface InteractionFormSheetProps {
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

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---- 검색 가능한 드롭다운 ----
interface SearchDropdownProps {
  options: { id: string; label: string; sub?: string }[];
  value: string;
  displayValue: string;
  placeholder: string;
  onChange: (id: string, label: string) => void;
  onClear: () => void;
}

function SearchDropdown({
  options,
  value,
  displayValue,
  placeholder,
  onChange,
  onClear,
}: SearchDropdownProps) {
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
        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 flex items-center justify-between cursor-pointer hover:border-slate-300 transition select-none"
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
              <X size={13} />
            </button>
          )}
          <CaretDown size={13} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
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
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-xs text-slate-400 text-center">
                  검색 결과 없음
                </li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.id}
                    onClick={() => { onChange(opt.id, opt.label); setOpen(false); }}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${
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

// ---- 메인 컴포넌트 ----
export function InteractionFormSheet({ clients, leads }: InteractionFormSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<InteractionType>("call");
  const [entityMode, setEntityMode] = useState<"client" | "lead" | "manual">("client");
  const [selectedId, setSelectedId] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [occurredAt, setOccurredAt] = useState(toLocalDatetimeValue(new Date()));
  const [followUpAt, setFollowUpAt] = useState("");

  function resetForm() {
    setType("call");
    setEntityMode("client");
    setSelectedId("");
    setSelectedLabel("");
    setSummary("");
    setContent("");
    setOccurredAt(toLocalDatetimeValue(new Date()));
    setFollowUpAt("");
  }

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

  const ENTITY_TABS: { value: "client" | "lead" | "manual"; label: string }[] = [
    { value: "client", label: "고객" },
    { value: "lead",   label: "리드" },
    { value: "manual", label: "직접입력" },
  ];

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
      if (entityMode === "client" && selectedId) input.client_id = selectedId;
      if (entityMode === "lead"   && selectedId) input.lead_id   = selectedId;

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

              {/* 모드 탭 */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-3 text-xs">
                {ENTITY_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setEntityMode(tab.value);
                      setSelectedId("");
                      setSelectedLabel("");
                    }}
                    className={`flex-1 py-1.5 font-medium transition-colors ${
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
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500">
                    연결 없이 저장됩니다.
                    아래 <strong>요약</strong>에 상대방 정보를 포함해 입력해 주세요.
                  </p>
                </div>
              )}
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
                placeholder={
                  entityMode === "manual"
                    ? "홍길동(미등록) — 웹사이트 견적 문의"
                    : "소통 내용을 한 줄로 요약하세요"
                }
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
