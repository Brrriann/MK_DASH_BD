import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const SIXTY_SECONDS = 60;

export const getCachedDashboardData = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [
      { count: activeClientCount },
      { data: projects },
      { count: recentInvoiceCount },
      { data: unpaidContracts },
      { data: unpaidInvoices },
      { data: recentMeetings },
    ] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("projects").select("id,title,pipeline_stage,deadline,deposit_paid,final_paid,source_channel,contract_amount"),
      supabase.from("tax_invoices").select("*", { count: "exact", head: true }).gte("issued_at", thirtyDaysAgo),
      supabase.from("contracts")
        .select("id,title,deposit_paid,final_paid,deposit_amount,final_amount,clients(company_name)")
        .or("deposit_paid.eq.false,final_paid.eq.false")
        .limit(5),
      supabase.from("tax_invoices")
        .select("id,title,total_amount,issued_at,clients(company_name)")
        .eq("payment_received", false)
        .order("issued_at", { ascending: true })
        .limit(5),
      supabase.from("meeting_notes").select("id,title,met_at").order("met_at", { ascending: false }).limit(4),
    ]);

    return {
      activeClientCount,
      projects: projects ?? [],
      recentInvoiceCount,
      unpaidContracts: unpaidContracts ?? [],
      unpaidInvoices: unpaidInvoices ?? [],
      recentMeetings: recentMeetings ?? [],
      today,
      sevenDaysLater,
    };
  },
  ["dashboard-data"],
  {
    revalidate: SIXTY_SECONDS,
    tags: ["dashboard", "clients", "projects", "invoices", "contracts", "meetings"],
  }
);
