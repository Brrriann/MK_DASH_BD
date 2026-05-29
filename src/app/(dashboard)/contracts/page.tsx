import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContractsListClient } from "@/components/contracts/ContractsListClient";
import type { Contract } from "@/lib/types";

const getContractsData = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [{ data: contracts }, { data: clients }] = await Promise.all([
      supabase
        .from("contracts")
        .select("*, clients(company_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, company_name")
        .eq("status", "active")
        .order("company_name"),
    ]);

    const contractsWithClient = (contracts ?? []).map(c => ({
      ...(c as Contract),
      client_name: (c.clients as { company_name: string } | null)?.company_name ?? null,
    }));

    return {
      contracts: contractsWithClient,
      clients: (clients ?? []) as { id: string; company_name: string }[],
    };
  },
  ["contracts-list"],
  { revalidate: 60, tags: ["contracts"] }
);

export default async function ContractsPage() {
  const { contracts, clients } = await getContractsData();
  return <ContractsListClient initialContracts={contracts} clientOptions={clients} />;
}
