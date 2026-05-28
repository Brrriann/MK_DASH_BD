import Link from "next/link";
import { Warning } from "@phosphor-icons/react/ssr";

interface OverdueLead {
  id: string;
  name: string;
  company: string | null;
  source: string;
  status: string;
  follow_up_at: string | null;
}

interface OverdueBannerProps {
  leads: OverdueLead[];
}

export function OverdueBanner({ leads }: OverdueBannerProps) {
  if (leads.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <Warning size={18} weight="fill" className="text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {leads.length}건의 팔로업이 지연되었습니다
          </p>
          <div className="flex flex-wrap gap-2">
            {leads.slice(0, 6).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads?status=${encodeURIComponent(lead.status)}`}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <span className="font-medium">{lead.name}</span>
                {lead.company && (
                  <span className="text-amber-500">· {lead.company}</span>
                )}
                {lead.follow_up_at && (
                  <span className="text-amber-400">
                    ({lead.follow_up_at.split("T")[0]})
                  </span>
                )}
              </Link>
            ))}
            {leads.length > 6 && (
              <Link
                href="/leads"
                className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700 hover:bg-amber-200 transition-colors font-medium"
              >
                +{leads.length - 6}건 더보기
              </Link>
            )}
          </div>
        </div>
        <Link
          href="/leads"
          className="shrink-0 text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
        >
          전체 리드 보기
        </Link>
      </div>
    </div>
  );
}
