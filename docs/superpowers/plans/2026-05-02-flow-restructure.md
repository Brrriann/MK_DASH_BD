# 전체 플로우 구조 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 네비게이션 3개로 단순화, 클라이언트 허브 구조, 일정관리 신규, 세금계산서 개편 + 홈택스 연동

**Architecture:** 클라이언트 중심 허브 구조. 견적·계약·세금계산서·미팅은 모두 클라이언트 상세에서 접근. 일정관리는 미팅예정+프로젝트 통합 캘린더/리스트 페이지.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v3, shadcn/ui, @phosphor-icons/react, Supabase

---

### Task 1: 네비게이션 구조 개편

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/MobileBottomNav.tsx`
- Modify: `src/components/layout/MoreDrawer.tsx`

**변경 내용:**
- NAV_ITEMS: 홈(`/`), 클라이언트(`/clients`), 일정관리(`/schedule`) 3개만
- MoreDrawer: 설정만 남기기
- MobileBottomNav: 홈, 클라이언트, 일정관리, 더보기(→설정)
- 아이콘: CalendarBlank (일정관리) — `@phosphor-icons/react`

- [ ] **Step 1: Sidebar.tsx 수정**

```tsx
import {
  SquaresFour, Buildings, CalendarBlank, GearSix
} from "@phosphor-icons/react";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: SquaresFour },
  { href: "/clients", label: "클라이언트", icon: Buildings },
  { href: "/schedule", label: "일정관리", icon: CalendarBlank },
] as const;
```

- [ ] **Step 2: MobileBottomNav.tsx 수정**

```tsx
import { SquaresFour, Buildings, CalendarBlank, DotsThree } from "@phosphor-icons/react";

const TABS = [
  { href: "/", label: "홈", icon: SquaresFour },
  { href: "/clients", label: "클라이언트", icon: Buildings },
  { href: "/schedule", label: "일정관리", icon: CalendarBlank },
] as const;
```

- [ ] **Step 3: MoreDrawer.tsx 수정**

```tsx
import { GearSix } from "@phosphor-icons/react";

const MORE_ITEMS = [
  { href: "/settings", label: "설정", icon: GearSix },
] as const;
```

- [ ] **Step 4: TypeScript 확인**
```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**
```bash
git add src/components/layout/Sidebar.tsx src/components/layout/MobileBottomNav.tsx src/components/layout/MoreDrawer.tsx
git commit -m "feat: simplify navigation to 홈/클라이언트/일정관리"
```

---

### Task 2: 클라이언트 인입경로 드롭다운 + 폼 섹션 정리

**Files:**
- Modify: `src/components/clients/ClientFormSheet.tsx`
- Modify: `src/lib/actions/clients.ts` (CreateClientInput source type)

**변경 내용:**
- source 필드: Input → Select (숨고, 크몽, 위시캣, 라우드, Fiverr, 기타)
- 폼을 3개 섹션으로 시각적 구분: 담당자 정보 / 기본 정보 / 사업자 정보

- [ ] **Step 1: source 옵션 상수 추가**

```tsx
const SOURCE_OPTIONS = [
  { value: "숨고", label: "숨고" },
  { value: "크몽", label: "크몽" },
  { value: "위시캣", label: "위시캣" },
  { value: "라우드", label: "라우드소싱" },
  { value: "Fiverr", label: "Fiverr" },
  { value: "기타", label: "기타" },
] as const;
```

- [ ] **Step 2: source Input → Select 교체**

기존 source Input 필드를:
```tsx
<Select
  value={formData.source ?? ""}
  onValueChange={(val) => handleChange("source", val)}
>
  <SelectTrigger className="h-9 text-sm w-full">
    <SelectValue placeholder="인입경로 선택" />
  </SelectTrigger>
  <SelectContent>
    {SOURCE_OPTIONS.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: 폼 섹션 구분선 추가**

담당자 정보(company_name, contact_name, email, phone) 다음에 구분선:
```tsx
<div className="border-t border-slate-100 pt-2">
  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">기본 정보</p>
</div>
```

사업자 정보 섹션도 동일한 스타일로 통일.

- [ ] **Step 4: 커밋**
```bash
git add src/components/clients/ClientFormSheet.tsx
git commit -m "feat: replace source text input with platform dropdown in client form"
```

---

### Task 3: 홈 대시보드 업데이트 (금액제외, tasks/projects 참조 제거)

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**변경 내용:**
- tasks 관련 쿼리/KPI 제거 (오늘 마감 태스크, UrgentTaskList)
- 금액 KPI 제거 (이번달 거래액)
- 새 KPI: 활성 클라이언트, 이번주 미팅예정, 최근 30일 세금계산서 발행 건수
- UrgentTaskList → 이번주 미팅예정 목록 (UpcomingMeetings)
- RecentMeetings 컴포넌트 → 최근 클라이언트 5명 (RecentClients)
- `@phosphor-icons/react/ssr`에서 필요한 아이콘만 import

현재 DashboardData 함수를 아래로 교체:

```tsx
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
    supabase.from("meeting_notes").select("id,title,met_at,client_id")
      .gte("met_at", today).order("met_at", { ascending: true }).limit(5),
    supabase.from("clients").select("id,company_name,contact_name,status,created_at")
      .order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <>
      {/* KPI 3개 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="활성 클라이언트" value={activeClientCount ?? 0} icon={Buildings} />
        <KpiCard label="이번주 미팅예정" value={upcomingMeetingCount ?? 0} icon={CalendarBlank} accent />
        <KpiCard label="최근 30일 발행" value={`${recentInvoiceCount ?? 0}건`} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingMeetingList meetings={upcomingMeetings ?? []} />
        <RecentClientList clients={recentClients ?? []} />
      </div>
    </>
  );
}
```

`UpcomingMeetingList`와 `RecentClientList`는 같은 파일 내 간단한 인라인 컴포넌트로 작성:

```tsx
function UpcomingMeetingList({ meetings }: { meetings: { id: string; title: string; met_at: string }[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-outfit text-sm font-semibold text-slate-700 mb-3">이번주 미팅예정</h3>
      {meetings.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">예정된 미팅 없음</p>
      ) : (
        <ul className="space-y-2">
          {meetings.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-800 font-medium truncate">{m.title}</span>
              <span className="text-xs text-slate-400 ml-2 shrink-0">{m.met_at}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentClientList({ clients }: { clients: { id: string; company_name: string; contact_name: string; status: string }[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-outfit text-sm font-semibold text-slate-700 mb-3">최근 클라이언트</h3>
      {clients.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">클라이언트 없음</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{c.company_name}</p>
                <p className="text-xs text-slate-400">{c.contact_name}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
  );
}
```

필요 아이콘 import (ssr):
```tsx
import { Buildings, CalendarBlank, Receipt } from "@phosphor-icons/react/ssr";
```

- [ ] **Step 1: 현재 파일 읽기**
- [ ] **Step 2: 위 내용으로 교체**
- [ ] **Step 3: TypeScript 확인**
- [ ] **Step 4: 커밋**
```bash
git add src/app/(dashboard)/page.tsx
git commit -m "feat: update home dashboard - remove tasks/amounts, add upcoming meetings"
```

---

### Task 4: 일정관리 페이지 신규 생성 (/schedule)

**Files:**
- Create: `src/app/(dashboard)/schedule/page.tsx`

**기능:**
- 캘린더 뷰 / 리스트 뷰 토글 버튼
- 미팅예정 (meeting_notes, met_at >= today) + 프로젝트 (projects, status='active') 통합
- 이벤트 타입 구분: 미팅(파란 뱃지) / 프로젝트(초록 뱃지)
- 클라이언트명 표시
- 캘린더: 월 단위, 날짜별 이벤트 점(dot) 표시, 날짜 클릭시 해당일 이벤트 목록
- 리스트: 날짜 오름차순 정렬

**Note:** 외부 캘린더 라이브러리 설치 없이 순수 React로 구현 (shadcn/ui + Tailwind).

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CalendarBlank, List, Plus, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

type EventType = "meeting" | "project";

interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  clientName?: string;
  clientId?: string;
}

function getClient() {
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
      const supabase = getClient();
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

      const meetingEvents: ScheduleEvent[] = (meetings ?? []).map((m: any) => ({
        id: m.id,
        title: m.title,
        date: m.met_at,
        type: "meeting",
        clientName: m.clients?.company_name,
        clientId: m.client_id,
      }));

      const projectEvents: ScheduleEvent[] = (projects ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        date: new Date().toISOString().split("T")[0],
        type: "project",
        clientName: p.clients?.company_name,
        clientId: p.client_id,
      }));

      setEvents([...meetingEvents, ...projectEvents]);
      setLoading(false);
    }
    load();
  }, []);

  // 월 캘린더 계산
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

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  const today = new Date().toISOString().split("T")[0];

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
                view === "calendar" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CalendarBlank size={14} />
              캘린더
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                view === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List size={14} />
              리스트
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">불러오는 중...</div>
      ) : view === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* 캘린더 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-outfit font-semibold text-slate-900">
                {year}년 {month + 1}월
              </h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
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
                    className={`relative flex flex-col items-center py-1.5 rounded-lg transition-colors min-h-[44px] ${
                      isSelected ? "bg-blue-600 text-white" :
                      isToday ? "bg-blue-50 text-blue-600 font-semibold" :
                      "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-sm">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((e, idx) => (
                          <span
                            key={idx}
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? "bg-white" :
                              e.type === "meeting" ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 선택된 날짜 이벤트 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-outfit font-semibold text-slate-700 mb-3 text-sm">
              {selectedDate ? `${selectedDate} 일정` : "날짜를 선택하세요"}
            </h3>
            {selectedDate && selectedEvents.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">일정 없음</p>
            )}
            <ul className="space-y-2">
              {selectedEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    e.type === "meeting" ? "bg-blue-500" : "bg-emerald-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                    {e.clientName && (
                      <p className="text-xs text-slate-400 mt-0.5">{e.clientName}</p>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${
                      e.type === "meeting" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
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
        /* 리스트 뷰 */
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {events.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">예정된 일정 없음</div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-center w-12 shrink-0">
                  <p className="text-xs text-slate-400">{e.date.slice(5, 7)}월</p>
                  <p className="text-lg font-bold text-slate-900 leading-none">{e.date.slice(8, 10)}</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  e.type === "meeting" ? "bg-blue-500" : "bg-emerald-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                  {e.clientName && <p className="text-xs text-slate-400 mt-0.5">{e.clientName}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  e.type === "meeting" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
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
```

- [ ] **Step 1: `src/app/(dashboard)/schedule/` 디렉토리 생성 후 page.tsx 작성**
- [ ] **Step 2: TypeScript 확인**
- [ ] **Step 3: 커밋**
```bash
git add src/app/(dashboard)/schedule/page.tsx
git commit -m "feat: add 일정관리 page with calendar and list view"
```

---

### Task 5: 세금계산서 DB 마이그레이션 + 폼 개편

**Files:**
- Create: `supabase/migrations/006_tax_invoice_items.sql`
- Modify: `supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/actions/invoices.ts`
- Modify: `src/components/invoices/InvoiceFormDialog.tsx`

**DB 변경:**
```sql
-- 006_tax_invoice_items.sql
ALTER TABLE tax_invoices
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS supply_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS memo TEXT;
-- pdf_url은 컬럼 유지(DROP은 위험), 사용만 중단
```

**TaxInvoice 타입 업데이트:**
```typescript
export interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
}

export interface TaxInvoice {
  id: string;
  title: string;
  items: InvoiceItem[];
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  amount: number; // 하위호환
  issued_at: string;
  pdf_url: string | null; // 유지
  memo: string | null;
  client_id: string | null;
  created_at: string;
}
```

**InvoiceFormDialog 개편:**
- title 유지 (내부 메모 역할)
- items 목록 (name, quantity, unit_price) 동적 추가/삭제
- supply_amount / tax_amount(10%) / total_amount 자동 계산 표시
- 클라이언트 선택 시 사업자 정보 표시 (business_registration_number 등)
- "홈택스에서 발행하기" 버튼 → `https://www.hometax.go.kr` 새탭 열기
- 기존 pdf_url 필드 제거

**폼 레이아웃:**
```
[제목/메모]
[클라이언트 선택] → 사업자 정보 표시
[발행일]
---품목---
[품목명] [수량] [단가] → 공급가액 자동
[+ 품목 추가]
---합계---
공급가액: XXX원
세액(10%): XXX원
합계: XXX원
---버튼---
[홈택스에서 발행하기] [저장]
```

- [ ] **Step 1: 마이그레이션 파일 작성 및 ALL_IN_ONE 업데이트**
- [ ] **Step 2: types.ts 업데이트 (InvoiceItem 추가, TaxInvoice 수정)**
- [ ] **Step 3: actions/invoices.ts 업데이트 (CreateInvoiceInput, createInvoice, updateInvoice)**
- [ ] **Step 4: InvoiceFormDialog 전면 개편**
- [ ] **Step 5: TypeScript 확인**
- [ ] **Step 6: 커밋**
```bash
git add supabase/ src/lib/types.ts src/lib/actions/invoices.ts src/components/invoices/InvoiceFormDialog.tsx
git commit -m "feat: redesign tax invoice with line items, auto tax calculation, and 홈택스 link"
```

---

## 완료 후 확인 사항
- [ ] 네비게이션 3개만 표시되는지
- [ ] 클라이언트 폼 source 드롭다운 동작
- [ ] 일정관리 캘린더 뷰 / 리스트 뷰 토글
- [ ] 홈 대시보드 금액 없음 확인
- [ ] 세금계산서 품목 추가/삭제 동작
- [ ] 세액 자동 계산 동작
- [ ] "홈택스에서 발행하기" 버튼 새탭 열기
- [ ] Supabase SQL editor에서 006 마이그레이션 실행
