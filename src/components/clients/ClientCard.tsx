"use client";

import { useRouter } from "next/navigation";
import type { ClientWithRevenue } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { formatKRW } from "@/lib/utils";

interface ClientCardProps {
  client: ClientWithRevenue;
}

export function ClientCard({ client }: ClientCardProps) {
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/clients/${client.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-outfit font-bold text-slate-900 text-base leading-tight line-clamp-2">
          {client.company_name}
        </h3>
        <StatusBadge status={client.status} />
      </div>

      <p className="text-sm text-slate-500 mb-1">{client.contact_name}</p>

      {client.industry && (
        <p className="text-xs text-slate-400 mb-3">{client.industry}</p>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 mb-0.5">총 거래액</p>
        <p className="font-outfit font-semibold text-slate-900 text-sm">
          {formatKRW(client.total_revenue)}
        </p>
      </div>
    </div>
  );
}
