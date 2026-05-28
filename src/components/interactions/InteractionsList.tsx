"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Phone,
  ChatCircle,
  Envelope,
  Users,
  Note,
  Trash,
  Bell,
} from "@phosphor-icons/react";
import { deleteInteraction } from "@/lib/actions/interaction-actions";

type InteractionType = "call" | "kakao" | "email" | "meeting" | "memo";

interface InteractionRow {
  id: string;
  lead_id: string | null;
  client_id: string | null;
  type: InteractionType;
  summary: string;
  content: string | null;
  occurred_at: string;
  follow_up_at: string | null;
  created_at: string;
  leads?: { id: string; name: string; company: string } | null;
  clients?: { id: string; company_name: string; contact_name: string } | null;
}

const TYPE_CONFIG: Record<
  InteractionType,
  { icon: React.ElementType; bg: string; text: string; label: string }
> = {
  call: {
    icon: Phone,
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    label: "통화",
  },
  kakao: {
    icon: ChatCircle,
    bg: "bg-yellow-100",
    text: "text-yellow-600",
    label: "카톡",
  },
  email: {
    icon: Envelope,
    bg: "bg-blue-100",
    text: "text-blue-600",
    label: "이메일",
  },
  meeting: {
    icon: Users,
    bg: "bg-purple-100",
    text: "text-purple-600",
    label: "미팅",
  },
  memo: {
    icon: Note,
    bg: "bg-slate-100",
    text: "text-slate-500",
    label: "메모",
  },
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

interface InteractionsListProps {
  interactions: InteractionRow[];
}

export function InteractionsList({ interactions }: InteractionsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string) {
    if (!window.confirm("이 소통 기록을 삭제할까요?")) return;
    try {
      await deleteInteraction(id);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Note size={24} weight="regular" className="text-slate-400" />
        </div>
        <h3 className="font-outfit font-semibold text-slate-800 mb-1">
          소통 기록이 없습니다
        </h3>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          소통 추가 버튼으로 첫 번째 기록을 남겨보세요
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {interactions.map((item) => {
        const config = TYPE_CONFIG[item.type];
        const Icon = config.icon;
        const entityName =
          item.clients?.company_name ??
          item.leads?.name ??
          null;

        return (
          <div
            key={item.id}
            className="flex gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-colors"
          >
            {/* 아이콘 */}
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.bg}`}
            >
              <Icon size={16} weight="regular" className={config.text} />
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>
                    {entityName && (
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {entityName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-900 font-medium leading-snug">
                    {item.summary}
                  </p>
                  {item.content && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {item.content}
                    </p>
                  )}
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="삭제"
                >
                  <Trash size={14} weight="regular" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-slate-400">
                  {formatDateTime(item.occurred_at)}
                </span>
                {item.follow_up_at && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    <Bell size={10} weight="regular" />
                    팔로업 {formatDate(item.follow_up_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
