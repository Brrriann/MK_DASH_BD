import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { EstimateNewPage } from "@/components/estimates/EstimateNewPage";
import type { ClientWithRevenue } from "@/lib/types";

async function getClients(): Promise<ClientWithRevenue[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("status", "active")
    .order("company_name");
  return (data ?? []) as ClientWithRevenue[];
}

export default async function NewEstimatePage() {
  const clients = await getClients();
  return (
    <Suspense>
      <EstimateNewPage clients={clients} />
    </Suspense>
  );
}
