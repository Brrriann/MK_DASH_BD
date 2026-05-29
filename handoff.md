# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, GitHub Actions → Cloudflare Workers 자동 배포 정상
- **프로덕션:** https://mk-dash-bd.official-f0c.workers.dev
- **DB:** Supabase 정상 (환경변수·연결 확인됨)

## ⚠️ 핵심 알려진 이슈 — 서버 액션 전면 실패 (opennextjs-cloudflare)

**증상:** Cloudflare Workers 프로덕션에서 **모든 Server Action POST 가 500** 반환
→ 클라이언트에는 `"An error occurred in the Server Components render..."` 로 표시 (실제 메시지는 프로덕션에서 숨겨짐).

**확인된 사실 (2026-05-29 디버깅):**
- API 라우트(`/api/*`) + Supabase: ✅ 정상
- Server Component(async page) + Supabase 직접 호출: ✅ 정상
- Client Component + Server Action: ❌ 실패 (조회·생성·수정·삭제 모두)
- 쿠키 유무·입력 무관하게 동일 digest(`1663897623@E352`) → 액션 함수 실행 **이전/전송 계층**에서 실패
- 시도했으나 **해결 안 된** 것: opennextjs 1.19.3→1.19.11 업그레이드, `global_fetch_strictly_public` 플래그 추가, `compatibility_date` 갱신
- 근본 원인 미확정 (opennextjs-cloudflare 서버액션 핸들링 버그로 추정). wrangler OAuth 토큰 만료로 `wrangler tail` 로그 미확인.

**영향 범위 (아직 서버액션 사용 → 프로덕션에서 깨짐):**
- 고객 상세 페이지 `clients/[id]/page.tsx` (조회 자체가 서버액션 → 로드 실패, /clients 로 리다이렉트)
- 모든 폼: 고객/견적/계약/세금계산서/리드/소통기록 생성·수정
- 리드→고객 전환(`ConvertLeadDialog` → lead-actions)

**권장 해결책:** 검증된 패턴(Server Component 조회 + API 라우트 mutation)으로 나머지 페이지도 순차 전환.
또는 근본 원인 규명: `wrangler login` 재인증 후 `wrangler tail mk-dash-bd` 로 실제 런타임 에러 확인.

## 최근 완료 작업 (2026-05-29)

### 프로젝트 메뉴 미표시 버그 수정 ✅ (서버액션 우회)
리드→고객 전환으로 만든 프로젝트가 `/projects` 메뉴에 안 보이던 문제 — 원인은 위 서버액션 전면 실패였음.
- `projects/page.tsx`: `"use client"` 제거 → **async Server Component** 로 전환, Supabase 직접 호출
- `components/projects/ProjectsClient.tsx`: 인터랙티브 UI(칸반/리스트/다이얼로그) Client Component 분리
- `/api/projects` POST(생성+태스크템플릿), `/api/projects/[id]` PATCH(수정)·DELETE(삭제) 신규
- `ProjectFormDialog`: 서버액션 → `fetch` API 라우트 호출로 전환, mutation 후 `router.refresh()`
- **검증 완료:** 프로덕션에서 조회·수정(제목 변경 영속 확인)·삭제·생성 모두 정상 작동
- opennextjs-cloudflare 1.19.3→1.19.11, wrangler `global_fetch_strictly_public` + `compatibility_date 2025-05-05` (권장 설정, 서버액션 이슈는 미해결이나 hygiene 차원 유지)

## 알려진 이슈 (기존)

- **Migration 011**: `contracts.signer_phone` 컬럼 수동 추가 필요
- **이메일 발송**: Resend 무료 플랜 도메인 인증 후 재테스트 필요
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **로컬 빌드**: Windows webpack EISDIR (GitHub Actions로 우회)
- **빌드 프리렌더**: `(dashboard)/layout.tsx` 의 `cookies()` 가 동적 시그널을 던짐 — 레이아웃 auth 로직을 try/catch 로 감싸면 이 시그널이 삼켜져 `/meetings/new` 등 프리렌더가 깨짐 (수정 시 주의)

## 환경변수 (Cloudflare Workers 시크릿)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY ✅
RESEND_API_KEY / NVIDIA_API_KEY / BOLTA_API_KEY / BOLTA_CUSTOMER_KEY
NEXT_PUBLIC_APP_URL=https://mk-dash-bd.official-f0c.workers.dev
```
