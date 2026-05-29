import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Plus } from "@phosphor-icons/react/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { InteractionsFilterBar } from "@/components/interactions/InteractionsFilterBar";
import { InteractionsList } from "@/components/interactions/InteractionsList";

const getInteractions = unstable_cache(
  async (params: { type?: string; q?: string }) => {
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
  },
  ["interactions-list"],
  { revalidate: 60, tags: ["interactions"] }
);

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
        <Link
          href="/interactions/new"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus size={16} weight="regular" />
          <span className="hidden sm:inline">소통 추가</span>
          <span className="sm:hidden">추가</span>
        </Link>
      </div>
      <InteractionsFilterBar params={params} />
      <InteractionsList interactions={interactions} />
    </div>
  );
}
