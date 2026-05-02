"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CalendarBlank, List, Plus, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

type EventType = "meeting" | "project";

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  clientName?: string;
  clientId?: string;
}

interface MeetingRow {
  id: string;
  title: string;
  met_at: string;
  client_id: string | null;
  clients: { company_name: string }[] | null;
}

interface ProjectRow {
  id: string;
  title: string;
  client_id: string | null;
  clients: { company_name: string }[] | null;
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function SchedulePage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const today = new Date().toISOString().split("T")[0];

      const [{ data: meetings }, { data: projects }] = await Promise.all([
        supabase
          .from("meeting_notes")
          .select("id, title, met_at, client_id, clients(company_name)")
          .gte("met_at", today)
          .order("met_at", { ascending: true }),
        supabase
          .from("projects")
          .select("id, title, client_id, clients(company_name)")
          .eq("status", "active"),
      ]);

      const meetingEvents: ScheduleEvent[] = (meetings ?? []).map((m: MeetingRow) => ({
        id: m.id,
        title: m.title,
        date: m.met_at,
        type: "meeting" as const,
        clientName: m.clients?.[0]?.company_name,
        clientId: m.client_id ?? undefined,
      }));

      const todayStr = new Date().toISOString().split("T")[0];
      const projectEvents: ScheduleEvent[] = (projects ?? []).map((p: ProjectRow) => ({
        id: p.id,
        title: p.title,
        date: todayStr,
        type: "project" as const,
        clientName: p.clients?.[0]?.company_name,
        clientId: p.client_id ?? undefined,
      }));

      setEvents([...meetingEvents, ...projectEvents]);
      setLoading(false);
    }
    load();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];
  const today = new Date().toISOString().split("T")[0];

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">일정관리</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/meetings/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} weight="bold" />
            미팅예정 추가
          </Link>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                view === "calendar"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CalendarBlank size={14} />
              캘린더
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                view === "list"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List size={14} />
              리스트
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">불러오는 중...</div>
      ) : view === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-outfit font-semibold text-slate-900">
                {year}년 {month + 1}월
              </h2>
              <button
                onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsByDate[dateStr] ?? [];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-lg transition-colors min-h-[44px] ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isToday
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-sm leading-none">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {dayEvents.slice(0, 3).map((e, idx) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected
                                ? "bg-white"
                                : e.type === "meeting"
                                ? "bg-blue-500"
                                : "bg-emerald-500"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-500">미팅예정</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500">진행중 프로젝트</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-outfit font-semibold text-slate-700 mb-3 text-sm">
              {selectedDate ? `${selectedDate.slice(5).replace("-", "/")} 일정` : "날짜를 선택하세요"}
            </h3>
            {selectedDate && selectedEvents.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">일정 없음</p>
            )}
            {!selectedDate && (
              <p className="text-slate-300 text-sm text-center py-8">캘린더에서 날짜를 클릭하세요</p>
            )}
            <ul className="space-y-2">
              {selectedEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    e.type === "meeting" ? "bg-blue-500" : "bg-emerald-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                    {e.clientName && (
                      <p className="text-xs text-slate-400 mt-0.5">{e.clientName}</p>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${
                      e.type === "meeting"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}>
                      {e.type === "meeting" ? "미팅" : "프로젝트"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {sortedEvents.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">예정된 일정 없음</div>
          ) : (
            sortedEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-center w-10 shrink-0">
                  <p className="text-[10px] text-slate-400 leading-none">{e.date.slice(5, 7)}월</p>
                  <p className="text-xl font-bold text-slate-900 leading-tight">{e.date.slice(8, 10)}</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  e.type === "meeting" ? "bg-blue-500" : "bg-emerald-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                  {e.clientName && (
                    <p className="text-xs text-slate-400 mt-0.5">{e.clientName}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  e.type === "meeting"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}>
                  {e.type === "meeting" ? "미팅" : "프로젝트"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
