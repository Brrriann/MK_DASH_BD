import { createAdminClient } from "@/lib/supabase/admin";
import { InteractionNewPage } from "@/components/interactions/InteractionNewPage";

export default async function NewInteractionPage() {
  const supabase = createAdminClient();

  const [{ data: clientsList }, { data: leadsList }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, company_name, contact_name")
      .order("company_name"),
    supabase
      .from("leads")
      .select("id, name, company, status")
      .not("status", "eq", "실패")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <InteractionNewPage
      clients={clientsList ?? []}
      leads={leadsList ?? []}
    />
  );
}
