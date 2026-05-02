import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { KpiCardSkeleton } from "@/components/dashboard/KpiCardSkeleton";
import type { MeetingNote } from "@/lib/types";
import { Buildings, CalendarBlank, Receipt } from "@phosphor-icons/react/ssr";
import Link from "next/link";

async function DashboardData() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [
    { count: activeClientCount },
    { count: upcomingMeetingCount },
    { count: recentInvoiceCount },
    { data: upcomingMeetings },
    { data: recentClients },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("meeting_notes").select("*", { count: "exact", head: true })
      .gte("met_at", today).lte("met_at", nextWeek),
    supabase.from("tax_invoices").select("*", { count: "exact", head: true })
      .gte("issued_at", thirtyDaysAgo),
    supabase.from("meeting_notes").select("id,title,met_at")
      .gte("met_at", today).order("met_at", { ascending: true }).limit(5),
    supabase.from("clients").select("id,company_name,contact_name,status,created_at")
      .order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="활성 클라이언트" value={activeClientCount ?? 0} icon={Buildings} />
        <KpiCard label="이번주 미팅예정" value={upcomingMeetingCount ?? 0} icon={CalendarBlank} accent />
        <KpiCard label="최근 30일 발행" value={`${recentInvoiceCount ?? 0}건`} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 이번주 미팅예정 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-outfit text-sm font-semibold text-slate-700">이번주 미팅예정</h3>
            <Link href="/schedule" className="text-xs text-blue-600 hover:underline">전체보기</Link>
          </div>
          {!upcomingMeetings || upcomingMeetings.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">예정된 미팅 없음</p>
          ) : (
            <ul className="space-y-2">
              {(upcomingMeetings as Pick<MeetingNote, "id" | "title" | "met_at">[]).map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-800 font-medium truncate">{m.title}</span>
                  <span className="text-xs text-slate-400 ml-2 shrink-0">{m.met_at}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 최근 클라이언트 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-outfit text-sm font-semibold text-slate-700">최근 클라이언트</h3>
            <Link href="/clients" className="text-xs text-blue-600 hover:underline">전체보기</Link>
          </div>
          {!recentClients || recentClients.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">클라이언트 없음</p>
          ) : (
            <ul className="space-y-1">
              {(recentClients as { id: string; company_name: string; contact_name: string; status: string }[]).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.company_name}</p>
                    <p className="text-xs text-slate-400">{c.contact_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                    c.status === "active" ? "bg-blue-50 text-blue-600" :
                    c.status === "potential" ? "bg-amber-50 text-amber-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {c.status === "active" ? "활성" : c.status === "potential" ? "잠재" : c.status === "dormant" ? "휴면" : "종료"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
