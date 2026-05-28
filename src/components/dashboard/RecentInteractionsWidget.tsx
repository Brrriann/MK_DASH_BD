"use client";

import Link from "next/link";
import { Phone, ChatDots, EnvelopeSimple, Users, Note } from "@phosphor-icons/react";
import type { InteractionType } from "@/lib/types";

interface InteractionLead {
  name: string;
  company: string | null;
}

interface InteractionClient {
  company_name: string;
  contact_name: string;
}

interface RecentInteraction {
  id: string;
  type: InteractionType;
  summary: string;
  occurred_at: string;
  leads: InteractionLead | InteractionLead[] | null;
  clients: InteractionClient | InteractionClient[] | null;
}

interface RecentInteractionsWidgetProps {
  interactions: RecentInteraction[];
}

const TYPE_META: Record<
  InteractionType,
  { icon: React.ComponentType<{ size: number; weight: string; className?: string }>; label: string; bg: string; color: string }
> = {
  call: { icon: Phone, label: "전화", bg: "bg-blue-50", color: "text-blue-600" },
  kakao: { icon: ChatDots, label: "카카오", bg: "bg-yellow-50", color: "text-yellow-600" },
  email: { icon: EnvelopeSimple, label: "이메일", bg: "bg-violet-50", color: "text-violet-600" },
  meeting: { icon: Users, label: "미팅", bg: "bg-emerald-50", color: "text-emerald-600" },
  memo: { icon: Note, label: "메모", bg: "bg-slate-50", color: "text-slate-500" },
};

function getTarget(interaction: RecentInteraction): string {
  if (interaction.leads) {
    const lead = Array.isArray(interaction.leads)
      ? interaction.leads[0]
      : interaction.leads;
    if (lead) {
      return lead.company ? `${lead.name} (${lead.company})` : lead.name;
    }
  }
  if (interaction.clients) {
    const client = Array.isArray(interaction.clients)
      ? interaction.clients[0]
      : interaction.clients;
    if (client) {
      return `${client.contact_name} · ${client.company_name}`;
    }
  }
  return "";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

export function RecentInteractionsWidget({
  interactions,
}: RecentInteractionsWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-outfit text-sm font-semibold text-slate-700">최근 소통 기록</h3>
        <Link
          href="/interactions"
          className="text-xs text-blue-600 hover:underline"
        >
          전체보기
        </Link>
      </div>

      {interactions.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">소통 기록이 없습니다</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {interactions.map((interaction) => {
            const meta = TYPE_META[interaction.type] ?? TYPE_META.memo;
            const Icon = meta.icon;
            const target = getTarget(interaction);

            return (
              <li key={interaction.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
                  >
                    <Icon size={14} weight="regular" className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-800 font-medium line-clamp-1">
                        {interaction.summary}
                      </p>
                      <time className="shrink-0 text-xs text-slate-400">
                        {formatDate(interaction.occurred_at)}
                      </time>
                    </div>
                    {target && (
                      <p className="mt-0.5 text-xs text-slate-400 truncate">{target}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
