import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { OverdueBanner } from "@/components/dashboard/OverdueBanner";
import { PipelineKpi } from "@/components/dashboard/PipelineKpi";
import { TodayFollowupWidget } from "@/components/dashboard/TodayFollowupWidget";
import { UnpaidWidget } from "@/components/dashboard/UnpaidWidget";
import { RecentInteractionsWidget } from "@/components/dashboard/RecentInteractionsWidget";

const getDashboardData = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split("T")[0];

    const [
      { data: overdueLeads },
      { data: pipelineLeads },
      { data: todayFollowups },
      { data: tomorrowFollowups },
      { data: recentProjects },
      { data: unpaidContracts },
      { data: unpaidInvoices },
      { data: recentInteractions },
    ] = await Promise.all([
      // 팔로업 기한 지난 리드 (계약·실패·보류 제외)
      supabase
        .from("leads")
        .select("id,name,company,source,status,follow_up_at")
        .lt("follow_up_at", today)
        .not("status", "in", '("계약","실패","보류")')
        .order("follow_up_at"),

      // 파이프라인 리드 상태별
      supabase
        .from("leads")
        .select("status")
        .not("status", "in", '("계약","실패","보류")'),

      // 오늘 팔로업
      supabase
        .from("leads")
        .select("id,name,company,source,follow_up_at")
        .eq("follow_up_at", today),

      // 내일 팔로업 (Promise.all 인덱스 +1 됨 → 아래 구조분해 순서 주의)
      supabase
        .from("leads")
        .select("id,name,company,source,follow_up_at")
        .eq("follow_up_at", tomorrow),

      // 마감 임박 프로젝트 (7일 이내)
      supabase
        .from("projects")
        .select("id,title,pipeline_stage,deadline")
        .not("pipeline_stage", "eq", "완납")
        .not("deadline", "is", null)
        .lte("deadline", sevenDaysLater)
        .gte("deadline", today)
        .order("deadline"),

      // 미수금 계약서
      supabase
        .from("contracts")
        .select(
          "id,title,deposit_paid,final_paid,deposit_amount,final_amount,clients(company_name)"
        )
        .or("deposit_paid.eq.false,final_paid.eq.false")
        .limit(5),

      // 미수금 세금계산서
      supabase
        .from("tax_invoices")
        .select("id,title,total_amount,issued_at,clients(company_name)")
        .eq("payment_received", false)
        .order("issued_at")
        .limit(5),

      // 최근 소통 기록
      supabase
        .from("interactions")
        .select(
          "id,type,summary,occurred_at,leads(name,company),clients(company_name,contact_name)"
        )
        .order("occurred_at", { ascending: false })
        .limit(5),
    ]);

    return {
      overdueLeads: (overdueLeads ?? []) as {
        id: string;
        name: string;
        company: string | null;
        source: string;
        status: string;
        follow_up_at: string | null;
      }[],
      pipelineLeads: (pipelineLeads ?? []) as { status: string }[],
      todayFollowups: (todayFollowups ?? []) as {
        id: string;
        name: string;
        company: string | null;
        source: string;
        follow_up_at: string | null;
      }[],
      tomorrowFollowups: (tomorrowFollowups ?? []) as {
        id: string;
        name: string;
        company: string | null;
        source: string;
        follow_up_at: string | null;
      }[],
      recentProjects: (recentProjects ?? []) as {
        id: string;
        title: string;
        pipeline_stage: string;
        deadline: string | null;
      }[],
      unpaidContracts: (unpaidContracts ?? []) as {
        id: string;
        title: string;
        deposit_paid: boolean;
        final_paid: boolean;
        deposit_amount: number | null;
        final_amount: number | null;
        clients: { company_name: string } | { company_name: string }[] | null;
      }[],
      unpaidInvoices: (unpaidInvoices ?? []) as {
        id: string;
        title: string;
        total_amount: number;
        issued_at: string;
        clients: { company_name: string } | { company_name: string }[] | null;
      }[],
      recentInteractions: (recentInteractions ?? []) as {
        id: string;
        type: "call" | "kakao" | "email" | "meeting" | "memo";
        summary: string;
        occurred_at: string;
        leads:
          | { name: string; company: string | null }
          | { name: string; company: string | null }[]
          | null;
        clients:
          | { company_name: string; contact_name: string }
          | { company_name: string; contact_name: string }[]
          | null;
      }[],
    };
  },
  ["dashboard-crm"],
  { revalidate: 60, tags: ["dashboard", "leads", "interactions"] }
);

export default async function HomePage() {
  const data = await getDashboardData();

  const pipeline = {
    신규: data.pipelineLeads.filter((l) => l.status === "신규").length,
    견적발송: data.pipelineLeads.filter((l) => l.status === "견적발송").length,
    계약: data.pipelineLeads.filter((l) => l.status === "계약").length,
  };

  return (
    <div className="font-outfit space-y-6">
      <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">홈</h1>

      {/* 팔로업 긴급 배너 */}
      {data.overdueLeads.length > 0 && (
        <OverdueBanner leads={data.overdueLeads} />
      )}

      {/* KPI 카드 행 */}
      <PipelineKpi pipeline={pipeline} todayCount={data.todayFollowups.length} />

      {/* 2열 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayFollowupWidget
          followups={data.todayFollowups}
          tomorrowFollowups={data.tomorrowFollowups}
          projects={data.recentProjects}
        />
        <UnpaidWidget
          contracts={data.unpaidContracts}
          invoices={data.unpaidInvoices}
        />
      </div>

      {/* 최근 소통 */}
      <RecentInteractionsWidget interactions={data.recentInteractions} />
    </div>
  );
}
