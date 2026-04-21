"use client";

import { useRouter } from "next/navigation";
import { Users, ChatText } from "@phosphor-icons/react";
import type { MeetingNoteWithClient } from "@/lib/actions/meetings";
import type { MeetingMethod } from "@/lib/types";

const METHOD_LABEL: Record<MeetingMethod, string> = {
  in_person: "대면",
  video: "화상",
  phone: "전화",
  email: "이메일",
};

const METHOD_CHIP_CLASS: Record<MeetingMethod, string> = {
  in_person: "bg-slate-100 text-slate-700",
  video: "bg-blue-100 text-blue-700",
  phone: "bg-emerald-100 text-emerald-700",
  email: "bg-amber-100 text-amber-700",
};

interface MeetingNoteCardProps {
  note: MeetingNoteWithClient;
}

export function MeetingNoteCard({ note }: MeetingNoteCardProps) {
  const router = useRouter();

  const formattedDate = new Date(note.met_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const contentPreview = note.content
    ? note.content.replace(/<[^>]+>/g, "").slice(0, 120)
    : null;

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/meetings/${note.id}`)}
    >
      {/* Date */}
      <p className="text-xs text-slate-400 font-medium mb-2">{formattedDate}</p>

      {/* Title */}
      <h3 className="font-outfit text-sm font-semibold text-slate-900 leading-snug mb-3 line-clamp-2">
        {note.title}
      </h3>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {note.client?.company_name && (
          <span className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-full px-2 py-0.5">
            {note.client.company_name}
          </span>
        )}
        {note.method && (
          <span
            className={`text-xs rounded-full px-2 py-0.5 font-medium ${METHOD_CHIP_CLASS[note.method]}`}
          >
            {METHOD_LABEL[note.method]}
          </span>
        )}
        {note.attendees.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Users size={12} weight="regular" />
            {note.attendees.length}명
          </span>
        )}
      </div>

      {/* Content preview */}
      {contentPreview && (
        <p className="text-xs text-slate-400 line-clamp-2 flex items-start gap-1">
          <ChatText size={12} weight="regular" className="shrink-0 mt-0.5" />
          <span>{contentPreview}</span>
        </p>
      )}
    </div>
  );
}
