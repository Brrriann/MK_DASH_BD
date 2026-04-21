import { Skeleton } from "@/components/ui/skeleton";

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <Skeleton className="h-3 w-24 bg-slate-100" />
      <Skeleton className="h-8 w-16 bg-slate-100" />
    </div>
  );
}
