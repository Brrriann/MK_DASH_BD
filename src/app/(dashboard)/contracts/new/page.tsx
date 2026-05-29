import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContractNewPage } from "@/components/contracts/ContractNewPage";
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

export default async function NewContractPage() {
  const clients = await getClients();
  return (
    <Suspense>
      <ContractNewPage clients={clients} />
    </Suspense>
  );
}
