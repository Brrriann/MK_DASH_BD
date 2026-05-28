"use client";

import { Buildings } from "@phosphor-icons/react";
import { ClientCard } from "@/components/clients/ClientCard";
import type { ClientWithRevenue } from "@/lib/types";

interface ClientsGridProps {
  clients: ClientWithRevenue[];
}

export function ClientsGrid({ clients }: ClientsGridProps) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Buildings size={24} weight="regular" className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">등록된 고객이 없습니다</p>
        <p className="mt-1 text-xs text-slate-400">
          신규 추가 버튼을 눌러 첫 번째 고객을 등록해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
