"use client";

import Link from "next/link";
import { CalendarCheck, CalendarBlank } from "@phosphor-icons/react";

interface FollowupLead {
  id: string;
  name: string;
  company: string | null;
  source: string;
  follow_up_at: string | null;
}

interface RecentProject {
  id: string;
  title: string;
  pipeline_stage: string;
  deadline: string | null;
}

interface TodayFollowupWidgetProps {
  followups: FollowupLead[];
  projects: RecentProject[];
}

export function TodayFollowupWidget({ followups, projects }: TodayFollowupWidgetProps) {
  const today = new Date();

  function getDaysLeft(deadline: string): number {
    const d = new Date(deadline);
    return Math.ceil((d.getTime() - today.getTime()) / 86400000);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      {/* 오늘 팔로업 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarCheck size={14} className="text-blue-600" />
          <h3 className="font-outfit text-sm font-semibold text-slate-700">오늘 팔로업</h3>
          {followups.length > 0 && (
            <span className="ml-auto inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {followups.length}건
            </span>
          )}
        </div>
        {followups.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-3">오늘 팔로업 예약 없음</p>
        ) : (
          <ul className="space-y-1.5">
            {followups.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{lead.name}</p>
                    {lead.company && (
                      <p className="text-xs text-slate-400 truncate">{lead.company}</p>
                    )}
                  </div>
                  <span className="shrink-0 ml-2 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                    {lead.source}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 마감 임박 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarBlank size={14} className="text-red-500" />
          <h3 className="font-outfit text-sm font-semibold text-slate-700">마감 임박 (7일)</h3>
          {projects.length > 0 && (
            <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
              {projects.length}건
            </span>
          )}
        </div>
        {projects.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-3">마감 임박 프로젝트 없음</p>
        ) : (
          <ul className="space-y-1.5">
            {projects.map((project) => {
              const daysLeft = project.deadline ? getDaysLeft(project.deadline) : null;
              return (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{project.title}</p>
                      <p className="text-xs text-slate-400">{project.deadline}</p>
                    </div>
                    {daysLeft !== null && (
                      <span
                        className={`shrink-0 ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          daysLeft <= 2
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        D-{daysLeft}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
