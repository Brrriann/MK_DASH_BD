import type { ClientStatus } from "@/lib/types";

const statusConfig: Record<ClientStatus, { label: string; className: string }> = {
  active: { label: "활성", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  potential: { label: "잠재", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  dormant: { label: "휴면", className: "bg-slate-100 text-slate-500 border border-slate-200" },
  ended: { label: "종료", className: "bg-red-50 text-red-600 border border-red-200" },
};

interface StatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className} ${className ?? ""}`}
    >
      {config.label}
    </span>
  );
}
