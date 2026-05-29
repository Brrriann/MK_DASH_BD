import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { EstimatesListClient } from "@/components/estimates/EstimatesListClient";
import type { Estimate } from "@/lib/types";

const getEstimatesData = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [{ data: estimates }, { data: clients }] = await Promise.all([
      supabase
        .from("estimates")
        .select("*, clients(company_name)")
        .order("issued_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, company_name")
        .eq("status", "active")
        .order("company_name"),
    ]);

    const estimatesWithClient = (estimates ?? []).map(e => ({
      ...(e as Estimate),
      client_name: (e.clients as { company_name: string } | null)?.company_name ?? null,
    }));

    return {
      estimates: estimatesWithClient,
      clients: (clients ?? []) as { id: string; company_name: string }[],
    };
  },
  ["estimates-list"],
  { revalidate: 60, tags: ["estimates"] }
);

export default async function EstimatesPage() {
  const { estimates, clients } = await getEstimatesData();
  return <EstimatesListClient initialEstimates={estimates} clientOptions={clients} />;
}
