import { createAdminClient } from "@/lib/supabase/admin";
import { LeadsFilterBar } from "@/components/leads/LeadsFilterBar";
import { LeadsKanban } from "@/components/leads/LeadsKanban";
import { LeadFormSheet } from "@/components/leads/LeadFormSheet";
import type { Lead } from "@/lib/types";

async function getLeads(params: {
  status?: string;
  source?: string;
  q?: string;
}): Promise<Lead[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.source && params.source !== "all") {
    query = query.eq("source", params.source);
  }
  if (params.q) {
    query = query.or(
      `name.ilike.%${params.q}%,company.ilike.%${params.q}%,phone.ilike.%${params.q}%`
    );
  }

  const { data } = await query;
  return (data ?? []) as Lead[];
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    source?: string;
    q?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const leads = await getLeads(params);

  // 팔로업 지난 리드 수
  const today = new Date().toISOString().split("T")[0];
  const overdueCount = leads.filter(
    (l) =>
      l.follow_up_at &&
      l.follow_up_at < today &&
      l.status !== "계약" &&
      l.status !== "실패"
  ).length;

  return (
    <div className="font-outfit">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">
              리드 관리
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {leads.length}
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                팔로업 {overdueCount}건
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            인바운드 상담 및 잠재 고객 관리
          </p>
        </div>
        <LeadFormSheet />
      </div>
      <LeadsFilterBar params={params} totalCount={leads.length} />
      <LeadsKanban leads={leads} today={today} />
    </div>
  );
}
