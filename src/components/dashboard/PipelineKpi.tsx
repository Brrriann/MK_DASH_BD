import Link from "next/link";
import { UserPlus, FileText, Handshake, CalendarCheck } from "@phosphor-icons/react/ssr";

interface PipelineKpiProps {
  pipeline: {
    신규: number;
    견적발송: number;
    계약: number;
  };
  todayCount: number;
}

export function PipelineKpi({ pipeline, todayCount }: PipelineKpiProps) {
  const cards = [
    {
      label: "신규 리드",
      value: pipeline.신규,
      icon: UserPlus,
      href: "/leads?status=%EC%8B%A0%EA%B7%9C",
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "견적발송",
      value: pipeline.견적발송,
      icon: FileText,
      href: "/leads?status=%EA%B2%AC%EC%A0%81%EB%B0%9C%EC%86%A1",
      accent: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "계약",
      value: pipeline.계약,
      icon: Handshake,
      href: "/leads?status=%EA%B3%84%EC%95%BD",
      accent: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "오늘 팔로업",
      value: todayCount,
      icon: CalendarCheck,
      href: "/leads",
      accent: todayCount > 0 ? "text-red-600" : "text-slate-500",
      bg: todayCount > 0 ? "bg-red-50" : "bg-slate-50",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, href, accent, bg }) => (
        <Link
          key={label}
          href={href}
          className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon size={16} weight="regular" className={accent} />
            </div>
          </div>
          <p className={`font-outfit text-2xl font-bold ${accent}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">{label}</p>
        </Link>
      ))}
    </div>
  );
}
