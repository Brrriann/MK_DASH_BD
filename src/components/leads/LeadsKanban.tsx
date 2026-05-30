"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Envelope,
  Warning,
  CaretDown,
  ArrowsClockwise,
  DotsThree,
  Trash,
  PencilSimple,
  ChatText,
} from "@phosphor-icons/react";
import type { Lead, LeadStatus } from "@/lib/types";
import {
  updateLeadStatus,
  deleteLead,
} from "@/lib/actions/lead-actions";
import { ConvertLeadDialog } from "./ConvertLeadDialog";
import { LeadEditSheet } from "./LeadFormSheet";

const STATUS_COLUMNS: {
  status: LeadStatus;
  label: string;
  color: string;
  bg: string;
  dot: string;
}[] = [
  {
    status: "신규",
    label: "신규",
    color: "text-blue-700",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
  },
  {
    status: "견적발송",
    label: "견적발송",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  {
    status: "미팅완료",
    label: "미팅완료",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    dot: "bg-cyan-500",
  },
  {
    status: "계약",
    label: "계약",
    color: "text-green-700",
    bg: "bg-green-50",
    dot: "bg-green-500",
  },
  {
    status: "보류",
    label: "보류",
    color: "text-slate-500",
    bg: "bg-slate-50",
    dot: "bg-slate-300",
  },
  {
    status: "실패",
    label: "실패",
    color: "text-red-600",
    bg: "bg-red-50",
    dot: "bg-red-400",
  },
];

const SOURCE_COLORS: Record<string, string> = {
  숨고: "bg-blue-100 text-blue-700",
  크몽: "bg-violet-100 text-violet-700",
  위시캣: "bg-cyan-100 text-cyan-700",
  라우드소싱: "bg-orange-100 text-orange-700",
  Fiverr: "bg-green-100 text-green-700",
  직접문의: "bg-slate-100 text-slate-700",
  기타: "bg-slate-100 text-slate-500",
};

const ALL_STATUSES: LeadStatus[] = [
  "신규",
  "견적발송",
  "미팅완료",
  "계약",
  "보류",
  "실패",
];

function formatBudget(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(0)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

interface LeadCardProps {
  lead: Lead;
  today: string;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onConvert: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  isPending: boolean;
}

function LeadCard({
  lead,
  today,
  onStatusChange,
  onDelete,
  onConvert,
  onEdit,
  isPending,
}: LeadCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const isOverdue =
    lead.follow_up_at &&
    lead.follow_up_at < today &&
    lead.status !== "계약" &&
    lead.status !== "실패";

  const canConvert =
    lead.status === "계약" && !lead.converted_client_id;

  const statusConfig = STATUS_COLUMNS.find((s) => s.status === lead.status);

  return (
    <div
      className={`relative rounded-xl border bg-white shadow-sm transition-all ${
        isOverdue
          ? "border-orange-200 bg-orange-50/40"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      } ${isPending ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="p-3.5">
        {/* 상단: 소스 배지 + 상태 칩 */}
        <div className="flex items-center justify-between mb-2.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              SOURCE_COLORS[lead.source] ?? "bg-slate-100 text-slate-500"
            }`}
          >
            {lead.source}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              statusConfig?.bg ?? "bg-slate-100"
            } ${statusConfig?.color ?? "text-slate-700"}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusConfig?.dot ?? "bg-slate-400"}`}
            />
            {lead.status}
          </span>
        </div>

        {/* 이름 + 회사 */}
        <div className="mb-1.5">
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            {lead.name}
            {lead.company && (
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                ({lead.company})
              </span>
            )}
          </p>
        </div>

        {/* 연락처 */}
        {(lead.phone || lead.email) && (
          <div className="flex flex-col gap-0.5 mb-2">
            {lead.phone && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Phone size={12} />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Envelope size={12} />
                <span className="truncate max-w-[160px]">{lead.email}</span>
              </div>
            )}
          </div>
        )}

        {/* 관심 서비스 + 예산 */}
        {(lead.service_interest || lead.budget_estimate) && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {lead.service_interest && (
              <span className="text-[11px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                {lead.service_interest}
              </span>
            )}
            {lead.budget_estimate && (
              <span className="text-[11px] font-medium text-blue-600">
                {formatBudget(lead.budget_estimate)}원
              </span>
            )}
          </div>
        )}

        {/* 팔로업 */}
        {lead.follow_up_at && (
          <div
            className={`flex items-center gap-1 mb-2 text-xs ${
              isOverdue ? "text-orange-600 font-medium" : "text-slate-400"
            }`}
          >
            {isOverdue && <Warning size={12} weight="fill" />}
            <span>팔로업: {formatDate(lead.follow_up_at)}</span>
            {isOverdue && <span className="text-orange-500">(기한 초과)</span>}
          </div>
        )}

        {/* 메모 */}
        {lead.notes && (
          <p className="text-[11px] text-slate-400 line-clamp-1 mb-2.5 italic">
            {lead.notes}
          </p>
        )}

        {/* 하단 액션 버튼 */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
          {/* 상태 변경 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusMenu((v) => !v);
                setShowActionMenu(false);
              }}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              상태 변경
              <CaretDown size={11} />
            </button>
            {showStatusMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowStatusMenu(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-20 w-28 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                  {ALL_STATUSES.filter((s) => s !== lead.status).map((s) => {
                    const cfg = STATUS_COLUMNS.find((c) => c.status === s);
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          onStatusChange(lead.id, s);
                          setShowStatusMenu(false);
                        }}
                        className={`flex items-center gap-1.5 w-full px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors ${
                          cfg?.color ?? "text-slate-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${cfg?.dot ?? "bg-slate-400"}`}
                        />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 고객 전환 버튼 (계약 + 미전환일 때만) */}
          {canConvert && (
            <button
              onClick={() => onConvert(lead)}
              className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              <ArrowsClockwise size={12} />
              고객 전환
            </button>
          )}

          {/* 전환 완료 표시 */}
          {lead.status === "계약" && lead.converted_client_id && (
            <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <ArrowsClockwise size={12} weight="fill" />
              전환 완료
            </span>
          )}

          <div className="flex-1" />

          {/* 더보기 메뉴 */}
          <div className="relative">
            <button
              onClick={() => {
                setShowActionMenu((v) => !v);
                setShowStatusMenu(false);
              }}
              className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <DotsThree size={16} weight="bold" />
            </button>
            {showActionMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      onEdit(lead);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <PencilSimple size={13} />
                    편집
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      if (confirm(`"${lead.name}" 리드를 삭제하시겠습니까?`)) {
                        onDelete(lead.id);
                      }
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash size={13} />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LeadsKanbanProps {
  leads: Lead[];
  today: string;
}

export function LeadsKanban({ leads, today }: LeadsKanbanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, LeadStatus>
  >({});
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  function handleStatusChange(id: string, status: LeadStatus) {
    setOptimisticStatuses((prev) => ({ ...prev, [id]: status }));
    startTransition(async () => {
      try {
        await updateLeadStatus(id, status);
        setOptimisticStatuses((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        router.refresh();
      } catch (err) {
        setOptimisticStatuses((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        alert(err instanceof Error ? err.message : "상태 변경에 실패했습니다.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteLead(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
      }
    });
  }

  // 각 리드에 낙관적 상태 적용
  const displayLeads = leads.map((l) => ({
    ...l,
    status: optimisticStatuses[l.id] ?? l.status,
  }));

  // 상태별 그룹핑
  const grouped = STATUS_COLUMNS.reduce<Record<LeadStatus, Lead[]>>(
    (acc, col) => {
      acc[col.status] = displayLeads.filter((l) => l.status === col.status);
      return acc;
    },
    {} as Record<LeadStatus, Lead[]>
  );

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <ChatText size={28} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">리드가 없습니다</p>
        <p className="text-xs text-slate-400 mt-1">
          우측 상단의 &ldquo;리드 추가&rdquo; 버튼으로 첫 리드를 등록하세요
        </p>
      </div>
    );
  }

  return (
    <>
    <ConvertLeadDialog
      lead={convertingLead}
      onClose={() => setConvertingLead(null)}
    />
    {editingLead && (
      <LeadEditSheet
        lead={editingLead}
        open={!!editingLead}
        onOpenChange={(o) => { if (!o) setEditingLead(null); }}
      />
    )}
    <div className="flex flex-col rounded-xl border border-slate-200 divide-y divide-slate-200">
      {STATUS_COLUMNS.map((col) => {
        const colLeads = grouped[col.status] ?? [];
        return (
          <div key={col.status} className="flex min-h-[110px]">
            {/* 좌측 분류 헤더 (세로) */}
            <div className={`w-28 flex-shrink-0 ${col.bg} border-r border-slate-100 px-4 py-4 flex flex-col gap-1`}>
              <div className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${col.dot}`} />
                <span className={`text-xs font-bold ${col.color}`}>{col.label}</span>
              </div>
              <span className="text-[11px] text-slate-500 pl-4">{colLeads.length}명</span>
            </div>

            {/* 카드 영역 (가로 흐름) */}
            <div className="flex-1 px-4 py-4 min-w-0">
              {colLeads.length === 0 ? (
                <div className="flex items-center h-full">
                  <p className="text-[11px] text-slate-300">없음</p>
                </div>
              ) : (
                <div className="flex gap-3 flex-wrap">
                  {colLeads.map((lead) => (
                    <div key={lead.id} className="w-72 flex-shrink-0">
                      <LeadCard
                        lead={lead}
                        today={today}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onConvert={setConvertingLead}
                        onEdit={setEditingLead}
                        isPending={
                          isPending && optimisticStatuses[lead.id] !== undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
