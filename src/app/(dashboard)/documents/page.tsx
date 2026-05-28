import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentsTabs } from "@/components/documents/DocumentsTabs";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "estimates" } = await searchParams;
  const supabase = createAdminClient();

  const [
    { data: estimates },
    { data: contracts },
    { data: invoices },
  ] = await Promise.all([
    supabase
      .from("estimates")
      .select("*, clients(company_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("*, clients(company_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("tax_invoices")
      .select("*, clients(company_name)")
      .order("issued_at", { ascending: false }),
  ]);

  return (
    <div className="font-outfit">
      <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 mb-6">
        서류함
      </h1>
      <DocumentsTabs
        defaultTab={tab}
        estimates={estimates ?? []}
        contracts={contracts ?? []}
        invoices={invoices ?? []}
      />
    </div>
  );
}
