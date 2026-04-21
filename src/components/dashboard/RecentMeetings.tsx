import type { MeetingNote } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface RecentMeetingsProps {
  meetings: Pick<MeetingNote, "id" | "title" | "met_at">[];
}

export function RecentMeetings({ meetings }: RecentMeetingsProps) {
  if (meetings.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-outfit font-semibold text-slate-900 text-sm">최근 미팅노트</h2>
        <Link href="/meetings" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          전체보기
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/meetings/${meeting.id}`}
            className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm text-slate-700 truncate">{meeting.title}</span>
            <span className="text-xs text-slate-400 shrink-0">{formatDate(meeting.met_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
