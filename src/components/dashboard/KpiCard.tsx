import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react/ssr";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: Icon;
  accent?: boolean;
  subtext?: string;
}

export function KpiCard({ label, value, icon: IconComponent, accent, subtext }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 flex flex-col gap-3",
        accent
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-slate-200"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium uppercase tracking-wide",
          accent ? "text-blue-200" : "text-slate-400"
        )}>
          {label}
        </span>
        <IconComponent
          size={16}
          weight="regular"
          className={accent ? "text-blue-300" : "text-slate-300"}
        />
      </div>
      <div>
        <p className={cn(
          "font-outfit text-3xl font-bold tracking-tighter",
          accent ? "text-white" : "text-slate-900"
        )}>
          {value}
        </p>
        {subtext && (
          <p className={cn("text-xs mt-1", accent ? "text-blue-200" : "text-slate-400")}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
