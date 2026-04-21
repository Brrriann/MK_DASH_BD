import type { Icon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: Icon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: IconComponent, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <IconComponent size={24} weight="regular" className="text-slate-400" />
      </div>
      <h3 className="font-outfit font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-slate-400 text-sm max-w-xs leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-transform">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
