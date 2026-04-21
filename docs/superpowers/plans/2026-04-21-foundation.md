# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 15 프로젝트 초기 세팅, Supabase 스키마, 반응형 레이아웃(사이드바/모바일 탭바), Auth(로그인/미들웨어), 홈 대시보드까지 완성한다.

**Architecture:** App Router 기반 route group으로 `(auth)`와 `(dashboard)`를 분리. 레이아웃 컴포넌트는 Server Component, 상호작용이 있는 사이드바/모바일 탭은 `'use client'` 고립 컴포넌트. Supabase 클라이언트는 browser/server/middleware 3종으로 분리해 SSR 환경에서 안전하게 사용.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v3, shadcn/ui, @phosphor-icons/react, Supabase (Auth + PostgreSQL), Outfit (Google Font)

**Spec:** `docs/superpowers/specs/2026-04-21-magnate-dashboard-design.md`

---

## File Map

```
MK_DASH_BD/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx              # 로그인 페이지
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # 사이드바 + 메인 래퍼 (Server)
│   │   ├── page.tsx                    # 홈 대시보드
│   │   ├── clients/page.tsx            # M8 플레이스홀더
│   │   ├── tasks/page.tsx              # M1 플레이스홀더
│   │   ├── meetings/page.tsx           # M9 플레이스홀더
│   │   ├── estimates/page.tsx          # M3 플레이스홀더
│   │   ├── contracts/page.tsx          # M4 플레이스홀더
│   │   ├── invoices/page.tsx           # M2 플레이스홀더
│   │   ├── ai/page.tsx                 # M6 플레이스홀더
│   │   └── settings/page.tsx           # M7 플레이스홀더
│   ├── portal/[token]/page.tsx         # M5 플레이스홀더
│   ├── api/auth/callback/route.ts      # Supabase OAuth 콜백
│   ├── layout.tsx                      # 루트 레이아웃 (폰트 로드)
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                 # 데스크톱 사이드바 ('use client')
│   │   ├── MobileTopBar.tsx            # 모바일 상단 바 ('use client')
│   │   ├── MobileBottomNav.tsx         # 모바일 하단 탭바 ('use client')
│   │   ├── MoreDrawer.tsx              # 모바일 더보기 Bottom Sheet ('use client')
│   │   └── NavItem.tsx                 # 단일 메뉴 아이템
│   ├── dashboard/
│   │   ├── KpiCard.tsx                 # KPI 스탯 카드
│   │   ├── KpiCardSkeleton.tsx         # 로딩 스켈레톤
│   │   ├── UrgentTaskList.tsx          # D-3 마감 태스크 위젯
│   │   ├── RecentMeetings.tsx          # 최근 미팅노트 위젯
│   │   └── EmptyDashboard.tsx          # 데이터 없을 때 빈 상태
│   └── shared/
│       ├── EmptyState.tsx              # 공통 빈 상태 컴포넌트
│       └── ErrorBanner.tsx             # 공통 에러 배너
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # 브라우저용 Supabase client
│   │   ├── server.ts                   # Server Component용 client
│   │   └── middleware.ts               # Middleware용 client
│   ├── types.ts                        # 공유 TypeScript 타입
│   └── utils.ts                        # cn() 등 유틸
├── middleware.ts                        # Auth 리다이렉트
├── supabase/
│   └── migrations/
│       ├── 001_base_tables.sql         # projects, tasks, estimates, contracts, tax_invoices
│       ├── 002_clients_meetings.sql    # clients, meeting_notes, task_meeting_notes
│       ├── 003_views_indexes.sql       # clients_with_revenue view, pg_trgm indexes
│       └── 004_rls_triggers.sql        # RLS 정책 + updated_at 트리거
├── tailwind.config.ts
├── .env.example
└── CLAUDE.md
```

---

## Task 1: 레포 초기화 & Next.js 프로젝트 생성

**Files:**
- Create: `package.json`, `tailwind.config.ts`, `.env.example`, `CLAUDE.md`

- [ ] **Step 1: 로컬 프로젝트 디렉토리로 이동 후 Next.js 앱 생성**

```bash
cd "D:/magnatekorea dashboard"
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=no \
  --import-alias="@/*" \
  --no-turbopack
```

선택지가 나오면: TypeScript ✓, ESLint ✓, Tailwind ✓, App Router ✓

- [ ] **Step 2: 핵심 의존성 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @phosphor-icons/react
npm install clsx tailwind-merge
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

- [ ] **Step 3: shadcn/ui 초기화**

```bash
npx shadcn@latest init
```

프롬프트:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 4: 필요한 shadcn 컴포넌트 추가**

```bash
npx shadcn@latest add button input label sheet tabs badge separator tooltip skeleton card dropdown-menu
```

- [ ] **Step 5: `tailwind.config.ts` 커스텀 컬러 토큰 추가**

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "sidebar-bg": "#0f172a",
        "sidebar-active": "#1e3a5f",
        "main-bg": "#f8fafc",
        "card-bg": "#ffffff",
        "accent": "#2563eb",
        "accent-light": "#eff6ff",
        "text-primary": "#0f172a",
        "text-secondary": "#64748b",
        "text-muted": "#94a3b8",
        "success": "#10b981",
        "warning": "#f59e0b",
        "danger": "#f43f5e",
      },
      fontFamily: {
        outfit: ["var(--font-outfit)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 6: `.env.example` 생성**

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```bash
cp .env.example .env.local
# .env.local에 실제 Supabase 값 입력
```

- [ ] **Step 7: `CLAUDE.md` 생성**

```markdown
# 마그네이트코리아 대시보드

## 개발 환경 실행
\```bash
npm run dev       # http://localhost:3000
supabase start    # 로컬 Supabase (supabase CLI 필요)
\```

## 환경변수
`.env.local` 파일에 Supabase URL, anon key, service role key 필요.

## 기술 스택
- Next.js 15 App Router + TypeScript
- Tailwind CSS v3 + shadcn/ui
- @phosphor-icons/react (size=16, weight="regular")
- Supabase (Auth + PostgreSQL + RLS)
- Outfit 폰트

## 스타일 규칙
- Inter 폰트 금지, Outfit 사용
- 퍼플 계열 금지, blue-600 단일 포인트
- 순수 #000 금지, slate-950 사용
- `h-screen` 금지, `min-h-[100dvh]` 사용
- flex 퍼센트 계산 금지, CSS Grid 사용

## 스펙 문서
`docs/superpowers/specs/2026-04-21-magnate-dashboard-design.md`
```

- [ ] **Step 8: GitHub에 초기 커밋 push**

```bash
git add .
git commit -m "feat: initialize Next.js 15 project with Tailwind, shadcn, Supabase deps"
git remote add origin https://github.com/Brrriann/MK_DASH_BD.git
git push -u origin main
```

Expected: GitHub 레포에 파일이 올라간다.

---

## Task 2: Supabase 클라이언트 & 공유 유틸 설정

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
- Create: `lib/utils.ts`, `lib/types.ts`

- [ ] **Step 1: 브라우저용 Supabase 클라이언트 생성**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server Component용 Supabase 클라이언트 생성**

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

- [ ] **Step 3: Middleware용 Supabase 클라이언트 생성**

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isPortalRoute = request.nextUrl.pathname.startsWith("/portal");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  if (!user && !isAuthRoute && !isPortalRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: `lib/utils.ts` 생성**

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}
```

- [ ] **Step 5: `lib/types.ts` 공유 타입 생성**

```typescript
// lib/types.ts

export type ClientStatus = "active" | "potential" | "dormant" | "ended";
export type TaskStatus = "todo" | "in_progress" | "done" | "on_hold";
export type TaskPriority = "high" | "medium" | "low";
export type MeetingMethod = "in_person" | "video" | "phone" | "email";
export type EstimateStatus = "pending" | "accepted" | "expired";
export type ContractStatus = "signed" | "pending" | "expired";
export type ProjectStatus = "active" | "completed" | "on_hold";

export interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  industry: string | null;
  status: ClientStatus;
  source: string | null;
  portal_token: string;
  portal_expires_at: string | null;
  notes: string | null;
  first_contract_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithRevenue extends Client {
  total_revenue: number;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: string;
  client_id: string | null;
  title: string;
  met_at: string;
  attendees: string[];
  method: MeetingMethod | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxInvoice {
  id: string;
  title: string;
  amount: number;
  issued_at: string;
  pdf_url: string | null;
  client_id: string | null;
  created_at: string;
}
```

- [ ] **Step 6: 커밋**

```bash
git add lib/ 
git commit -m "feat: add Supabase clients (browser/server/middleware) and shared types"
```

---

## Task 3: Supabase 마이그레이션 파일 작성

**Files:**
- Create: `supabase/migrations/001_base_tables.sql`
- Create: `supabase/migrations/002_clients_meetings.sql`
- Create: `supabase/migrations/003_views_indexes.sql`
- Create: `supabase/migrations/004_rls_triggers.sql`

- [ ] **Step 1: 기본 테이블 마이그레이션 작성**

```sql
-- supabase/migrations/001_base_tables.sql

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','on_hold')),
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  client_id UUID, -- FK 추가는 002에서 (clients 테이블 생성 후)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo','in_progress','done','on_hold')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  due_date DATE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID, -- FK 추가는 002에서
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired')),
  pdf_url TEXT,
  client_id UUID, -- FK 추가는 002에서
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('signed','pending','expired')),
  pdf_url TEXT,
  client_id UUID, -- FK 추가는 002에서
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  client_id UUID, -- FK 추가는 002에서
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: clients + meeting_notes 마이그레이션 작성**

```sql
-- supabase/migrations/002_clients_meetings.sql

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL CHECK (char_length(company_name) <= 100),
  contact_name TEXT NOT NULL CHECK (char_length(contact_name) <= 50),
  email TEXT NOT NULL UNIQUE
    CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone TEXT,
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','potential','dormant','ended')),
  source TEXT,
  portal_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  portal_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  notes TEXT,
  first_contract_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK 연결 (001에서 생성된 테이블들)
ALTER TABLE projects ADD CONSTRAINT fk_projects_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE estimates ADD CONSTRAINT fk_estimates_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE contracts ADD CONSTRAINT fk_contracts_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE tax_invoices ADD CONSTRAINT fk_tax_invoices_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- 미팅노트
CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  met_at DATE NOT NULL DEFAULT CURRENT_DATE,
  attendees TEXT[] NOT NULL DEFAULT '{}'
    CHECK (array_length(attendees, 1) IS NULL OR array_length(attendees, 1) <= 20),
  method TEXT CHECK (method IN ('in_person','video','phone','email')),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 태스크-미팅노트 조인
CREATE TABLE IF NOT EXISTS task_meeting_notes (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  meeting_note_id UUID NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, meeting_note_id)
);
```

- [ ] **Step 3: View + 인덱스 마이그레이션 작성**

```sql
-- supabase/migrations/003_views_indexes.sql

-- total_revenue 뷰
CREATE OR REPLACE VIEW clients_with_revenue AS
  SELECT c.*, COALESCE(SUM(ti.amount), 0) AS total_revenue
  FROM clients c
  LEFT JOIN tax_invoices ti ON ti.client_id = c.id
  GROUP BY c.id;

-- 전문 검색 인덱스
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clients_search
  ON clients USING GIN (
    (company_name || ' ' || contact_name || ' ' || email) gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_meeting_notes_content
  ON meeting_notes USING GIN (content gin_trgm_ops);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_client ON meeting_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_met_at ON meeting_notes(met_at DESC);
```

- [ ] **Step 4: RLS + 트리거 마이그레이션 작성**

```sql
-- supabase/migrations/004_rls_triggers.sql

-- updated_at 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_meeting_notes ENABLE ROW LEVEL SECURITY;

-- admin 전체 접근 정책
-- ⚠️ 스펙의 auth.jwt() ->> 'role' = 'admin' 대신 TO authenticated USING (true) 사용.
-- 이유: 단독 사용자(Brian) 도구이므로 로그인 = 관리자 접근으로 처리. 추후 다중 사용자 전환 시 역할 기반으로 변경 필요.
CREATE POLICY "authenticated_all" ON clients FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON projects FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON tasks FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON meeting_notes FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON estimates FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contracts FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON tax_invoices FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON task_meeting_notes FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- 클라이언트 포털: portal_token 기반 SELECT (anon role)
-- ⚠️ 주의: middleware.ts에서 /portal/* 경로는 인증 없이 통과 허용됨 (isPortalRoute 체크).
--   anon role이 이 정책에 도달할 수 있도록 middleware.ts의 isPortalRoute 체크가 필수.
--   portal_expires_at IS NULL 허용 (스펙 대비 개선: null이면 만료 없음으로 처리).
CREATE POLICY "portal_select" ON clients FOR SELECT
  TO anon
  USING (
    portal_token = (
      current_setting('request.jwt.claims', true)::json ->> 'portal_token'
    )::uuid
    AND (portal_expires_at IS NULL OR portal_expires_at > now())
  );
```

- [ ] **Step 5: Supabase CLI 초기화 후 마이그레이션 적용**

```bash
# 아직 supabase init을 하지 않았다면 먼저 실행
supabase init
# supabase/config.toml 생성됨

supabase start
supabase db reset
```

Expected: "Finished supabase db reset." 출력

- [ ] **Step 6: 커밋**

```bash
git add supabase/
git commit -m "feat: add Supabase migrations (schema, views, RLS, triggers)"
```

---

## Task 4: Auth 미들웨어 & 로그인 페이지

**Files:**
- Create: `middleware.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/api/auth/callback/route.ts`

- [ ] **Step 1: `middleware.ts` 생성**

```typescript
// middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Auth 콜백 라우트 생성**

```typescript
// app/api/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

- [ ] **Step 3: 로그인 페이지 생성**

```typescript
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] bg-sidebar-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <p className="font-outfit text-2xl font-bold tracking-widest text-white mb-1">
            MAGNATE KOREA
          </p>
          <p className="text-slate-400 text-sm">업무 대시보드</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300 text-sm">
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="brian@magnatekorea.com"
              required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300 text-sm">
              비밀번호
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-outfit font-medium active:scale-[0.98] transition-transform"
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 개발 서버 실행 후 로그인 페이지 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → `/login`으로 리다이렉트 확인.
Supabase 대시보드에서 Brian 계정 생성 후 로그인 테스트.

- [ ] **Step 5: 커밋**

```bash
git add middleware.ts app/
git commit -m "feat: add auth middleware, login page, and Supabase callback route"
```

---

## Task 5: 루트 레이아웃 & 폰트

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: 루트 레이아웃에 Outfit 폰트 적용**

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "마그네이트코리아 대시보드",
  description: "마그네이트코리아 업무 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={outfit.variable}>
      <body className="font-outfit antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: `globals.css` 정리 (기본 shadcn 변수 유지, 불필요 스타일 제거)**

shadcn init이 생성한 CSS 변수 블록은 유지. 추가로 아래만 덧붙임:

```css
/* app/globals.css 하단에 추가 */
* {
  -webkit-tap-highlight-color: transparent;
}

/* 스크롤바 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }
```

- [ ] **Step 3: 커밋**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: apply Outfit font and base global styles"
```

---

## Task 6: 대시보드 레이아웃 — 사이드바 & 네비게이션

**Files:**
- Create: `components/layout/NavItem.tsx`
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/MobileTopBar.tsx`
- Create: `components/layout/MobileBottomNav.tsx`
- Create: `components/layout/MoreDrawer.tsx`
- Modify: `app/(dashboard)/layout.tsx`  ← MoreDrawer는 여기서 단 1회 인스턴스화

- [ ] **Step 1: 네비게이션 설정 파일 + NavItem 컴포넌트 생성**

```typescript
// components/layout/NavItem.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react";

interface NavItemProps {
  href: string;
  label: string;
  icon: Icon;
  collapsed?: boolean;
}

export function NavItem({ href, label, icon: IconComponent, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-active text-blue-300 border-l-2 border-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800",
        collapsed && "justify-center px-2"
      )}
    >
      <IconComponent size={16} weight="regular" className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
```

- [ ] **Step 2: 데스크톱 사이드바 생성**

```typescript
// components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour, Buildings, Kanban, NotePencil,
  CurrencyKrw, FileText, Receipt, Sparkle, GearSix
} from "@phosphor-icons/react";
import { NavItem } from "./NavItem";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: SquaresFour },
  { href: "/clients", label: "클라이언트", icon: Buildings },
  { href: "/tasks", label: "업무관리", icon: Kanban },
  { href: "/meetings", label: "미팅노트", icon: NotePencil },
  { href: "/estimates", label: "견적서", icon: CurrencyKrw },
  { href: "/contracts", label: "계약서", icon: FileText },
  { href: "/invoices", label: "세금계산서", icon: Receipt },
  { href: "/ai", label: "AI 추천", icon: Sparkle },
] as const;

export function Sidebar() {
  return (
    <TooltipProvider delayDuration={300}>
      {/* aside 너비: lg=240px, md=64px. 명시적으로 선언해야 layout collapse 방지 */}
      <aside className="fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar-bg border-r border-slate-800 w-16 md:w-16 lg:w-60">
        {/* 데스크톱: 240px 풀 사이드바 */}
        <div className="hidden lg:flex flex-col w-60 h-full py-5">
          {/* 로고 */}
          <div className="px-4 mb-6">
            <span className="font-outfit text-xs font-black tracking-[0.2em] text-white">
              MAGNATE KOREA
            </span>
          </div>
          {/* 메뉴 */}
          <nav className="flex-1 px-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
          {/* 하단 설정 */}
          <div className="px-3 pt-4 border-t border-slate-800">
            <NavItem href="/settings" label="설정" icon={GearSix} />
          </div>
        </div>

        {/* 태블릿: 64px 아이콘 전용 사이드바 */}
        <div className="hidden md:flex lg:hidden flex-col w-16 h-full py-5 items-center">
          <div className="mb-6">
            <span className="font-outfit text-xs font-black text-white">MK</span>
          </div>
          <nav className="flex-1 space-y-1 w-full px-2">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <div>
                    <NavItem {...item} collapsed />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
          <div className="w-full px-2 pt-4 border-t border-slate-800">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <NavItem href="/settings" label="설정" icon={GearSix} collapsed />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">설정</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 3: 모바일 상단 바 생성**

```typescript
// components/layout/MobileTopBar.tsx
// MoreDrawer는 dashboard layout에서 관리 — 여기서는 onMenuClick만 받음
"use client";

import { List } from "@phosphor-icons/react";

interface MobileTopBarProps {
  onMenuClick: () => void;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-30 h-12 bg-sidebar-bg flex items-center justify-between px-4 border-b border-slate-800">
      <span className="font-outfit text-xs font-black tracking-[0.2em] text-white">
        MAGNATE KOREA
      </span>
      <button
        onClick={onMenuClick}
        className="text-slate-400 hover:text-white transition-colors p-1"
        aria-label="더보기 메뉴"
      >
        <List size={20} weight="regular" />
      </button>
    </header>
  );
}
```

- [ ] **Step 4: 모바일 하단 탭바 생성**

```typescript
// components/layout/MobileBottomNav.tsx
// MoreDrawer는 dashboard layout에서 관리 — 여기서는 onMoreClick만 받음
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, Buildings, Kanban, NotePencil, DotsThree } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "홈", icon: SquaresFour },
  { href: "/clients", label: "클라이언트", icon: Buildings },
  { href: "/tasks", label: "업무관리", icon: Kanban },
  { href: "/meetings", label: "미팅노트", icon: NotePencil },
] as const;

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white border-t border-slate-200 flex shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)]">
      {TABS.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
              isActive ? "text-blue-600" : "text-slate-400"
            )}
          >
            <tab.icon size={20} weight={isActive ? "fill" : "regular"} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
      {/* 더보기 */}
      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <DotsThree size={20} weight="regular" />
        <span className="text-[10px] font-medium">더보기</span>
      </button>
    </nav>
  );
}
```

- [ ] **Step 5: 더보기 Bottom Sheet 생성**

```typescript
// components/layout/MoreDrawer.tsx
"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CurrencyKrw, FileText, Receipt, Sparkle, GearSix } from "@phosphor-icons/react";

const MORE_ITEMS = [
  { href: "/estimates", label: "견적서", icon: CurrencyKrw },
  { href: "/contracts", label: "계약서", icon: FileText },
  { href: "/invoices", label: "세금계산서", icon: Receipt },
  { href: "/ai", label: "AI 추천", icon: Sparkle },
  { href: "/settings", label: "설정", icon: GearSix },
] as const;

interface MoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoreDrawer({ open, onOpenChange }: MoreDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-outfit text-left text-slate-900">메뉴</SheetTitle>
        </SheetHeader>
        <nav className="space-y-1">
          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <item.icon size={18} weight="regular" className="text-slate-500" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 6: 대시보드 레이아웃 생성 — MoreDrawer를 여기서 단 1회 인스턴스화**

```typescript
// app/(dashboard)/layout.tsx
// MoreDrawer를 단 1개만 마운트하고 open 상태를 MobileTopBar, MobileBottomNav에 내려준다.
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MoreDrawer } from "@/components/layout/MoreDrawer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-main-bg">
      {/* 사이드바 (md: 이상) */}
      <Sidebar />

      {/* 모바일 상단 바 */}
      <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />

      {/* 메인 콘텐츠 */}
      <main
        className="
          md:ml-16 lg:ml-60
          pt-12 md:pt-0
          pb-14 md:pb-0
          min-h-[100dvh]
        "
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>

      {/* 모바일 하단 탭바 */}
      <MobileBottomNav onMoreClick={() => setDrawerOpen(true)} />

      {/* 더보기 드로어 — 단 1회 인스턴스 */}
      <MoreDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
```

- [ ] **Step 7: 개발 서버에서 레이아웃 확인**

```bash
npm run dev
```

- 브라우저 크기를 1200px(데스크톱), 900px(태블릿), 400px(모바일)로 바꾸며 레이아웃 확인.
- 사이드바 active 상태, 탭바 하이라이트, 더보기 드로어 열림 확인.

- [ ] **Step 8: 플레이스홀더 페이지 일괄 생성**

아래 경로에 각각 동일한 패턴의 플레이스홀더 생성:

```typescript
// 예시: app/(dashboard)/clients/page.tsx
export default function ClientsPage() {
  return (
    <div>
      <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 mb-6">
        클라이언트
      </h1>
      <p className="text-slate-400 text-sm">준비 중입니다.</p>
    </div>
  );
}
```

같은 방식으로: `tasks`, `meetings`, `estimates`, `contracts`, `invoices`, `ai`, `settings`, `portal/[token]` 페이지 생성.

- [ ] **Step 9: 커밋**

```bash
git add components/ app/
git commit -m "feat: add responsive dashboard layout (sidebar, mobile top bar, bottom nav, more drawer)"
```

---

## Task 7: 공통 컴포넌트 — 스켈레톤, 빈 상태, 에러

**Files:**
- Create: `components/shared/EmptyState.tsx`
- Create: `components/shared/ErrorBanner.tsx`
- Create: `components/dashboard/KpiCardSkeleton.tsx`

- [ ] **Step 1: EmptyState 컴포넌트 생성**

```typescript
// components/shared/EmptyState.tsx
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: Icon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: IconComponent, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <IconComponent size={24} weight="regular" className="text-slate-400" />
      </div>
      <h3 className="font-outfit font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-slate-400 text-sm max-w-xs leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-transform">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ErrorBanner 컴포넌트 생성**

```typescript
// components/shared/ErrorBanner.tsx
"use client";

import { Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorBanner({
  message = "데이터를 불러오는 중 오류가 발생했습니다.",
  onRetry,
}: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
      <Warning size={16} weight="fill" className="shrink-0 text-red-500" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="text-red-600 hover:text-red-700 hover:bg-red-100 h-auto py-1 px-2"
        >
          재시도
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: KpiCardSkeleton 생성**

```typescript
// components/dashboard/KpiCardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <Skeleton className="h-3 w-24 bg-slate-100" />
      <Skeleton className="h-8 w-16 bg-slate-100" />
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add components/shared/ components/dashboard/KpiCardSkeleton.tsx
git commit -m "feat: add shared EmptyState, ErrorBanner, KpiCardSkeleton components"
```

---

## Task 8: 홈 대시보드

**Files:**
- Create: `components/dashboard/KpiCard.tsx`
- Create: `components/dashboard/UrgentTaskList.tsx`
- Create: `components/dashboard/RecentMeetings.tsx`
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: KpiCard 컴포넌트 생성**

```typescript
// components/dashboard/KpiCard.tsx
import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";

// KpiCard는 Server Component에서도 사용되므로 Icon 타입을 public API에서 가져옴
import type { Icon } from "@phosphor-icons/react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: Icon;
  accent?: boolean;
  subtext?: string;
}

export function KpiCard({ label, value, icon: IconComponent, accent, subtext }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 flex flex-col gap-3",
        accent
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-slate-200"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium uppercase tracking-wide",
          accent ? "text-blue-200" : "text-slate-400"
        )}>
          {label}
        </span>
        <IconComponent
          size={16}
          weight="regular"
          className={accent ? "text-blue-300" : "text-slate-300"}
        />
      </div>
      <div>
        <p className={cn(
          "font-outfit text-3xl font-bold tracking-tighter",
          accent ? "text-white" : "text-slate-900"
        )}>
          {value}
        </p>
        {subtext && (
          <p className={cn("text-xs mt-1", accent ? "text-blue-200" : "text-slate-400")}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: UrgentTaskList 위젯 생성**

```typescript
// components/dashboard/UrgentTaskList.tsx
import { Task } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};
const PRIORITY_LABEL: Record<string, string> = {
  high: "높음", medium: "보통", low: "낮음",
};

interface UrgentTaskListProps {
  tasks: Task[];
}

export function UrgentTaskList({ tasks }: UrgentTaskListProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-outfit font-semibold text-slate-900 text-sm">
          마감 임박 태스크
        </h2>
      </div>
      <div className="divide-y divide-slate-50">
        {tasks.map((task) => (
          <div key={task.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700 truncate">{task.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400">
                {task.due_date ? formatDate(task.due_date) : ""}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                PRIORITY_COLOR[task.priority]
              )}>
                {PRIORITY_LABEL[task.priority]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: RecentMeetings 위젯 생성**

```typescript
// components/dashboard/RecentMeetings.tsx
import { MeetingNote } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface RecentMeetingsProps {
  meetings: MeetingNote[];
}

export function RecentMeetings({ meetings }: RecentMeetingsProps) {
  if (meetings.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-outfit font-semibold text-slate-900 text-sm">
          최근 미팅노트
        </h2>
        <Link href="/meetings" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          전체보기
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/meetings/${meeting.id}`}
            className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors block"
          >
            <span className="text-sm text-slate-700 truncate">{meeting.title}</span>
            <span className="text-xs text-slate-400 shrink-0">
              {formatDate(meeting.met_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 홈 대시보드 페이지 생성 (Server Component)**

```typescript
// app/(dashboard)/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { KpiCardSkeleton } from "@/components/dashboard/KpiCardSkeleton";
import { UrgentTaskList } from "@/components/dashboard/UrgentTaskList";
import { RecentMeetings } from "@/components/dashboard/RecentMeetings";
import { EmptyState } from "@/components/shared/EmptyState";
import { Task, MeetingNote } from "@/lib/types";
import {
  CheckSquare, Kanban, CurrencyKrw, Buildings
} from "@phosphor-icons/react/ssr";

async function DashboardData() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

  const [
    { count: todayTaskCount },     // due_date = 오늘 정확히 일치
    { count: activeProjectCount },
    { data: revenueData },
    { count: activeClientCount },
    { data: urgentTasks },
    { data: recentMeetings },
  ] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("due_date", today).neq("status", "done"),  // 오늘 마감만 (lte 아님)
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
      {/* KPI 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="오늘 마감 태스크"
          value={todayTaskCount ?? 0}
          icon={CheckSquare}
          accent
        />
        <KpiCard
          label="진행중 프로젝트"
          value={activeProjectCount ?? 0}
          icon={Kanban}
        />
        <KpiCard
          label="이번달 거래액"
          value={`₩${(monthlyRevenue / 10000).toFixed(0)}만`}
          icon={CurrencyKrw}
        />
        <KpiCard
          label="활성 클라이언트"
          value={activeClientCount ?? 0}
          icon={Buildings}
        />
      </div>

      {/* 위젯 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {urgentTasks && urgentTasks.length > 0 ? (
          // Pick<Task,...> 부분 타입 — as any 대신 명시적 캐스팅
          <UrgentTaskList tasks={urgentTasks as Pick<Task, "id"|"title"|"due_date"|"priority">[]} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">D-3 이내 마감 태스크 없음</p>
          </div>
        )}
        {recentMeetings && recentMeetings.length > 0 ? (
          <RecentMeetings meetings={recentMeetings as Pick<MeetingNote, "id"|"title"|"met_at">[]} />
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
```

- [ ] **Step 5: 개발 서버에서 홈 대시보드 확인**

```bash
npm run dev
```

로그인 후 `http://localhost:3000` 접속:
- KPI 카드 4개 표시 확인 (데이터 없으면 0)
- 스켈레톤 로딩 확인 (네트워크 탭에서 느린 네트워크 시뮬레이션)
- 모바일/태블릿/데스크톱 레이아웃 확인

- [ ] **Step 6: 최종 커밋 & push**

```bash
git add .
git commit -m "feat: add home dashboard with KPI cards, urgent tasks, and recent meetings widgets"
git push origin main
```

---

## 완료 확인 체크리스트

- [ ] `http://localhost:3000` → `/login` 리다이렉트
- [ ] 로그인 성공 → 홈 대시보드 진입
- [ ] 로그인 실패 → 에러 메시지 인라인 표시
- [ ] 데스크톱(1200px+): 240px 사이드바 + 텍스트 메뉴 표시
- [ ] 태블릿(768-1024px): 64px 아이콘 사이드바 + hover 툴팁
- [ ] 모바일(-768px): 상단 로고바 + 하단 탭바 5개 + 더보기 드로어
- [ ] KPI 카드 4개 / 마감 임박 태스크 위젯 / 최근 미팅노트 위젯
- [ ] Supabase 마이그레이션 적용 완료
- [ ] GitHub main 브랜치에 코드 push 완료

---

## 다음 단계 (병렬 실행 가능)

Foundation 완료 후 아래 3개 플랜을 **동시에** 진행할 수 있습니다:

| 플랜 | 내용 | 의존성 |
|------|------|--------|
| `2026-04-21-m1-tasks.md` | 프로젝트·태스크 칸반보드 | Foundation ✓ |
| `2026-04-21-m8-clients.md` | 클라이언트 관리 (목록+상세) | Foundation ✓ |
| `2026-04-21-m9-meetings.md` | 미팅노트 (TipTap + 태스크 연결) | Foundation ✓ |
