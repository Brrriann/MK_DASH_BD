"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { ClientFormSheet } from "@/components/clients/ClientFormSheet";

interface ClientsHeaderProps {
  clientCount: number;
}

export function ClientsHeader({ clientCount }: ClientsHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    router.refresh();
    setSheetOpen(false);
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">
          고객 관리
        </h1>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {clientCount}
        </span>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        <Plus size={16} weight="regular" />
        신규 추가
      </button>

      <ClientFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
