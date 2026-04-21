import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { KpiCardSkeleton } from "@/components/dashboard/KpiCardSkeleton";
import { UrgentTaskList } from "@/components/dashboard/UrgentTaskList";
import { RecentMeetings } from "@/components/dashboard/RecentMeetings";
import type { Task, MeetingNote } from "@/lib/types";
import {
  CheckSquare, Kanban, CurrencyKrw, Buildings
} from "@phosphor-icons/react/ssr";

async function DashboardData() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

  const [
    { count: todayTaskCount },
    { count: activeProjectCount },
    { data: revenueData },
    { count: activeClientCount },
    { data: urgentTasks },
    { data: recentMeetings },
  ] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("due_date", today).neq("status", "done"),
    supabase.from("projects").select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("tax_invoices").select("amount")
      .gte("issued_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from("clients").select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("tasks").select("id,title,due_date,priority")
      .neq("status", "done").lte("due_date", threeDaysLater)
      .not("due_date", "is", null).order("due_date").limit(5),
    supabase.from("meeting_notes").select("id,title,met_at")
      .order("met_at", { ascending: false }).limit(3),
  ]);

  const monthlyRevenue = revenueData?.reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="오늘 마감 태스크" value={todayTaskCount ?? 0} icon={CheckSquare} accent />
        <KpiCard label="진행중 프로젝트" value={activeProjectCount ?? 0} icon={Kanban} />
        <KpiCard label="이번달 거래액" value={`₩${(monthlyRevenue / 10000).toFixed(0)}만`} icon={CurrencyKrw} />
        <KpiCard label="활성 클라이언트" value={activeClientCount ?? 0} icon={Buildings} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {urgentTasks && urgentTasks.length > 0 ? (
          <UrgentTaskList tasks={urgentTasks as Pick<Task, "id" | "title" | "due_date" | "priority">[]} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">D-3 이내 마감 태스크 없음</p>
          </div>
        )}
        {recentMeetings && recentMeetings.length > 0 ? (
          <RecentMeetings meetings={recentMeetings as Pick<MeetingNote, "id" | "title" | "met_at">[]} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">최근 미팅노트 없음</p>
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
        홈 대시보드
      </h1>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
        }
      >
        <DashboardData />
      </Suspense>
    </div>
  );
}
