import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { KpiCardSkeleton } from "@/components/dashboard/KpiCardSkeleton";
import { Buildings, Kanban, Receipt, Warning, CalendarBlank, ArrowRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { PipelineStage, SourceChannel } from "@/lib/types";

const STAGE_ORDER: PipelineStage[] = ["상담", "견적", "계약", "계산서발행", "계약입금", "착수", "납품", "완납"];
const STAGE_COLOR: Record<PipelineStage, string> = {
  상담: "bg-slate-100 text-slate-600",
  견적: "bg-amber-100 text-amber-700",
  계약: "bg-blue-100 text-blue-700",
  계산서발행: "bg-violet-100 text-violet-700",
  계약입금: "bg-cyan-100 text-cyan-700",
  착수: "bg-orange-100 text-orange-700",
  납품: "bg-emerald-100 text-emerald-700",
  완납: "bg-green-100 text-green-700",
};

const CHANNEL_LABEL: Record<SourceChannel, string> = {
  숨고: "숨고",
  크몽: "크몽",
  위시캣: "위시캣",
  라우드소싱: "라우드소싱",
  Fiverr: "Fiverr",
  직접문의: "직접문의",
  재구매: "재구매",
  기타: "기타",
};

async function DashboardData() {
  const supabase = await createClient();
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

  const allProjects = (projects ?? []) as {
    id: string; title: string; pipeline_stage: PipelineStage;
    deadline: string | null; deposit_paid: boolean; final_paid: boolean;
    source_channel: SourceChannel | null; contract_amount: number | null;
  }[];

  const activeProjects = allProjects.filter(p => p.pipeline_stage !== "완납");
  const stageCounts = STAGE_ORDER.reduce((acc, s) => {
    acc[s] = allProjects.filter(p => p.pipeline_stage === s).length;
    return acc;
  }, {} as Record<PipelineStage, number>);

  const deadlineAlerts = allProjects.filter(p =>
    p.pipeline_stage !== "완납" && p.deadline && p.deadline >= today && p.deadline <= sevenDaysLater
  );

  const channelCounts = allProjects.reduce((acc, p) => {
    if (p.source_channel) acc[p.source_channel] = (acc[p.source_channel] ?? 0) + 1;
    return acc;
  }, {} as Record<SourceChannel, number>);
  const topChannels = Object.entries(channelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4) as [SourceChannel, number][];

  const unpaidContractsList = (unpaidContracts ?? []) as {
    id: string; title: string; deposit_paid: boolean; final_paid: boolean;
    deposit_amount: number | null; final_amount: number | null;
    clients: { company_name: string } | { company_name: string }[] | null;
  }[];
  const unpaidInvoicesList = (unpaidInvoices ?? []) as {
    id: string; title: string; total_amount: number; issued_at: string;
    clients: { company_name: string } | { company_name: string }[] | null;
  }[];

  function getClientName(c: { company_name: string } | { company_name: string }[] | null): string {
    if (!c) return "";
    if (Array.isArray(c)) return c[0]?.company_name ?? "";
    return c.company_name;
  }

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="활성 클라이언트" value={activeClientCount ?? 0} icon={Buildings} />
        <KpiCard label="진행중 프로젝트" value={activeProjects.length} icon={Kanban} accent />
        <KpiCard label="최근 30일 발행" value={`${recentInvoiceCount ?? 0}건`} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Pipeline 현황 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-outfit text-sm font-semibold text-slate-700">파이프라인 현황</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              전체보기 <ArrowRight size={10} />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STAGE_ORDER.map(stage => (
              <div key={stage} className="text-center">
                <div className={`text-lg font-bold ${stageCounts[stage] > 0 ? "text-slate-900" : "text-slate-300"}`}>
                  {stageCounts[stage]}
                </div>
                <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 ${STAGE_COLOR[stage]}`}>
                  {stage}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 미수금 알림 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Warning size={14} className="text-amber-500" />
            <h3 className="font-outfit text-sm font-semibold text-slate-700">미수금 알림</h3>
          </div>
          {unpaidContractsList.length === 0 && unpaidInvoicesList.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">미수금 없음</p>
          ) : (
            <div className="space-y-2">
              {unpaidContractsList.slice(0, 3).map(c => (
                <Link key={c.id} href="/contracts"
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{c.title}</p>
                    <p className="text-xs text-slate-400">{getClientName(c.clients)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    {!c.deposit_paid && c.deposit_amount && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">계약금</span>
                    )}
                    {!c.final_paid && c.final_amount && (
                      <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">잔금</span>
                    )}
                  </div>
                </Link>
              ))}
              {unpaidInvoicesList.slice(0, 2).map(inv => (
                <Link key={inv.id} href="/invoices"
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{inv.title}</p>
                    <p className="text-xs text-slate-400">{getClientName(inv.clients)} · {inv.issued_at?.split("T")[0]}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-700 shrink-0 ml-2">
                    {inv.total_amount.toLocaleString()}원
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 마감 임박 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarBlank size={14} className="text-red-500" />
            <h3 className="font-outfit text-sm font-semibold text-slate-700">7일 내 마감</h3>
          </div>
          {deadlineAlerts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">마감 임박 프로젝트 없음</p>
          ) : (
            <ul className="space-y-2">
              {deadlineAlerts.map(p => {
                const daysLeft = Math.ceil((new Date(p.deadline!).getTime() - Date.now()) / 86400000);
                return (
                  <li key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                      <p className="text-xs text-slate-400">{p.deadline}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      daysLeft <= 2 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                    }`}>
                      D-{daysLeft}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 최근 미팅 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-outfit text-sm font-semibold text-slate-700">최근 미팅</h3>
            <Link href="/meetings" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              전체보기 <ArrowRight size={10} />
            </Link>
          </div>
          {!recentMeetings || recentMeetings.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">미팅 기록 없음</p>
          ) : (
            <ul className="space-y-2">
              {(recentMeetings as { id: string; title: string; met_at: string }[]).map(m => (
                <li key={m.id}>
                  <Link href={`/meetings/${m.id}`}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                    <span className="text-sm text-slate-800 font-medium truncate">{m.title}</span>
                    <span className="text-xs text-slate-400 ml-2 shrink-0">{m.met_at?.split("T")[0]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 채널 분석 */}
        {topChannels.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="font-outfit text-sm font-semibold text-slate-700 mb-4">유입 채널 분석</h3>
            <div className="flex gap-3 flex-wrap">
              {topChannels.map(([channel, count]) => (
                <div key={channel} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700">{CHANNEL_LABEL[channel]}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <div>
      <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 mb-6">
        홈
      </h1>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
        }
      >
        <DashboardData />
      </Suspense>
    </div>
  );
}
