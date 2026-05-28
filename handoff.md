# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** Cloudflare Workers 배포 중 (GitHub Actions CI)
- **로컬 개발:** `npm run dev` — `D:\project\magnatekorea dashboard\` (원본 디렉토리)에서 실행 권장
- **주의:** worktree 경로(`.claude/worktrees/`)에서 dev 실행 시 Windows UNKNOWN 파일 잠금 에러 간헐 발생

## 최근 완료 작업 (2026-05-28)

### 리드 관리 모듈 신규 구현 ✅
- `src/lib/types.ts` — `LeadStatus`, `LeadSource`, `Lead` 타입 추가
- `src/lib/actions/lead-actions.ts` — Server Actions: `createLead`, `updateLead`, `deleteLead`, `updateLeadStatus`, `convertLeadToClient`
- `src/app/(dashboard)/leads/page.tsx` — Server Component, URL searchParams 기반 필터링, 팔로업 초과 카운트 표시
- `src/components/leads/LeadsFilterBar.tsx` — 검색 debounce + 소스/상태 필터 버튼
- `src/components/leads/LeadsKanban.tsx` — 상태별 6컬럼 칸반 UI, 낙관적 상태 업데이트, 고객 전환 버튼, 삭제 확인
- `src/components/leads/LeadFormSheet.tsx` — Sheet 폼 (이름/회사/전화/이메일/소스/서비스/예산/팔로업/메모)
- `src/components/layout/Sidebar.tsx`, `MoreDrawer.tsx` — `/leads` 네비게이션 추가

### 클라이언트 목록 + 홈 대시보드 Server Component 재작성 ✅
- `src/app/(dashboard)/clients/page.tsx` — "use client" 제거, async Server Component로 교체. URL searchParams (`q`, `status`, `sort`) 기반 Supabase 직접 쿼리
- `src/components/clients/ClientsHeader.tsx` — 신규. Client Component: "신규 추가" 버튼 + ClientFormSheet 트리거, onSuccess=router.refresh()
- `src/components/clients/ClientsFilterBar.tsx` — 신규. Client Component: 검색 debounce 300ms + 상태 필터 버튼 5개 + 정렬 Select, URL params 기반
- `src/components/clients/ClientsGrid.tsx` — 신규. Client Component: 3열 그리드, 빈 상태 Buildings 아이콘
- `src/app/(dashboard)/page.tsx` — 홈 완전 재설계. unstable_cache + Promise.all 7쿼리, CRM 중심 위젯 구성
- `src/components/dashboard/OverdueBanner.tsx` — 신규. 팔로업 지연 리드 주황 배너
- `src/components/dashboard/PipelineKpi.tsx` — 신규. 4개 KPI 카드 (신규/연락중/견적발송/오늘팔로업), 클릭 링크
- `src/components/dashboard/TodayFollowupWidget.tsx` — 신규. 오늘 팔로업 + 마감 임박 D-day 배지
- `src/components/dashboard/UnpaidWidget.tsx` — 신규. 미수금 계약서 + 세금계산서 목록
- `src/components/dashboard/RecentInteractionsWidget.tsx` — 신규. 최근 소통 5건 타임라인, 유형 아이콘

### 소통기록 모듈 신규 구현 ✅
- `src/lib/actions/interaction-actions.ts` — Server Actions: `createInteraction`, `updateInteraction`, `deleteInteraction`
- `src/app/(dashboard)/interactions/page.tsx` — Server Component, URL params (`type`, `q`) 기반 필터
- `src/components/interactions/InteractionsFilterBar.tsx` — 검색 + 유형 필터 버튼 (전체/통화/카톡/이메일/미팅/메모)
- `src/components/interactions/InteractionsList.tsx` — 타임라인 카드 목록, 삭제 기능
- `src/components/interactions/InteractionFormSheet.tsx` — Sheet 폼 (유형/연결대상/요약/내용/일시/팔로업)
- `src/lib/types.ts` — `InteractionType`, `Interaction` 타입 추가

### 서류함 모듈 신규 구현 ✅
- `src/app/(dashboard)/documents/page.tsx` — Server Component, 3개 테이블 병렬 fetch
- `src/components/documents/DocumentsTabs.tsx` — shadcn Tabs: 견적서/계약서/세금계산서 탭, URL `?tab=` 동기화

### 네비게이션 업데이트 ✅
- `src/components/layout/Sidebar.tsx` — 소통기록(`/interactions`), 서류함(`/documents`) 추가; 견적서/계약서/세금계산서 개별 링크 제거
- `src/components/layout/MoreDrawer.tsx` — 모바일 더보기 메뉴에 신규 항목 추가

## 알려진 이슈

- **interactions 테이블:** Supabase DB에 `interactions` 테이블이 없으면 마이그레이션 필요 (lead_id, client_id, type, summary, content, occurred_at, follow_up_at 컬럼)
- **leads 테이블:** DB 마이그레이션 필요 (아래 스키마 참고)
- **interactions 테이블:** Supabase DB에 `interactions` 테이블이 없으면 마이그레이션 필요
- **Resend 이메일 발송:** 아직 미테스트
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **TS 오류 2개** (`src/app/api/auth/callback/route.ts`, `src/app/auth/callback/route.ts`): `Request.cookies` 타입 오류 — 기존 이슈, 신규 코드와 무관

## 다음 TODO

1. Supabase `leads` 테이블 마이그레이션 적용 (스키마 아래 참고)
2. Supabase `interactions` 테이블 마이그레이션 적용
3. `/leads` 페이지 실제 데이터 연동 테스트 — 칸반 상태 변경, 고객 전환 확인
4. `/interactions` 페이지 실제 데이터 연동 테스트
5. `/documents` 탭 UI 확인
6. 비밀번호 재설정 플로우 최종 테스트

### leads 테이블 스키마 (Supabase SQL 에디터)
```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text,
  email text,
  source text not null,
  status text not null default '신규',
  service_interest text,
  budget_estimate bigint,
  notes text,
  follow_up_at timestamptz,
  converted_client_id uuid references clients(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```
