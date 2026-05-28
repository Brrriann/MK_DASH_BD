import { createAdminClient } from "@/lib/supabase/admin";
import { InteractionsFilterBar } from "@/components/interactions/InteractionsFilterBar";
import { InteractionsList } from "@/components/interactions/InteractionsList";
import { InteractionFormSheet } from "@/components/interactions/InteractionFormSheet";

async function getInteractions(params: { type?: string; q?: string }) {
  const supabase = createAdminClient();
  let query = supabase
    .from("interactions")
    .select("*, leads(id,name,company), clients(id,company_name,contact_name)")
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (params.type && params.type !== "all") query = query.eq("type", params.type);
  if (params.q) query = query.ilike("summary", `%${params.q}%`);

  const { data } = await query;
  return data ?? [];
}

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const interactions = await getInteractions(params);

  return (
    <div className="font-outfit">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">소통 기록</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {interactions.length}
          </span>
        </div>
        <InteractionFormSheet />
      </div>
      <InteractionsFilterBar params={params} />
      <InteractionsList interactions={interactions} />
    </div>
  );
}
