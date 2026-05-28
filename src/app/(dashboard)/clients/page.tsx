import { createAdminClient } from "@/lib/supabase/admin";
import { ClientsHeader } from "@/components/clients/ClientsHeader";
import { ClientsFilterBar } from "@/components/clients/ClientsFilterBar";
import { ClientsGrid } from "@/components/clients/ClientsGrid";
import type { ClientWithRevenue } from "@/lib/types";

async function getClients(params: {
  q?: string;
  status?: string;
  sort?: string;
}): Promise<ClientWithRevenue[]> {
  const supabase = createAdminClient();
  let query = supabase.from("clients_with_revenue").select("*");

  if (params.q) {
    query = query.or(
      `company_name.ilike.%${params.q}%,contact_name.ilike.%${params.q}%,email.ilike.%${params.q}%`
    );
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.sort === "revenue") {
    query = query.order("total_revenue", { ascending: false });
  } else if (params.sort === "recent") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("company_name", { ascending: true });
  }

  const { data } = await query;
  return (data ?? []) as ClientWithRevenue[];
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const clients = await getClients(params);

  return (
    <div className="font-outfit">
      <ClientsHeader clientCount={clients.length} />
      <ClientsFilterBar params={params} />
      <ClientsGrid clients={clients} />
    </div>
  );
}
