"use client";

import { useRouter } from "next/navigation";
import type { ClientWithRevenue } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { formatKRW, formatDate } from "@/lib/utils";

interface ClientRowProps {
  client: ClientWithRevenue;
}

export function ClientRow({ client }: ClientRowProps) {
  const router = useRouter();

  return (
    <tr
      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => router.push(`/clients/${client.id}`)}
    >
      <td className="px-4 py-3 text-sm font-medium text-slate-900 font-outfit">
        {client.company_name}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{client.contact_name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{client.email}</td>
      <td className="px-4 py-3">
        <StatusBadge status={client.status} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 font-outfit font-medium">
        {formatKRW(client.total_revenue)}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {client.industry ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">
        {formatDate(client.created_at)}
      </td>
    </tr>
  );
}
