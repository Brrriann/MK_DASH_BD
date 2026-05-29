# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, GitHub Actions → Cloudflare Workers 자동 배포 정상
- **프로덕션:** https://mk-dash-bd.official-f0c.workers.dev
- **DB:** Supabase 정상 (환경변수·연결 확인됨)
- **서버 액션:** ✅ 정상 (2026-05-29 근본 원인 수정 완료)

## 최근 완료 작업 (2026-05-29)

### 서버 액션 전면 실패 근본 원인 수정 ✅
**원인:** `src/lib/actions/project-tasks.ts` (`"use server"` 파일)에서 `TASK_TEMPLATES` 객체(`const`)를 `export` → Next.js가 모든 서버 액션 등록 거부 → 앱 전체 서버 액션 500 에러

**수정:**
- `src/lib/task-templates.ts` 신규 생성 (`TASK_TEMPLATES` 단독 파일, `"use server"` 없음)
- `project-tasks.ts`: `TASK_TEMPLATES` export 제거, 내부 import 전용으로 변경
- `projects/[id]/page.tsx`: import 경로를 `@/lib/task-templates` 로 변경
- **검증:** wrangler tail 로그에서 에러 소멸 확인, 배포 후 서버 액션 POST 정상 응답

**교훈:** `"use server"` 파일은 `async` 함수만 export 가능. `interface`/`type`은 컴파일 타임 소거라 무방하나, `const`·`let` 등 런타임 값 export는 전체 서버 액션을 죽임.

### 프로젝트 메뉴 미표시 버그 수정 ✅ (서버액션 우회, 이미 완료)
- `projects/page.tsx`: async Server Component 전환, Supabase 직접 호출
- `/api/projects` POST·PATCH·DELETE API 라우트 신규 (서버액션 대신 사용)
- **검증 완료:** 생성·수정·삭제 모두 프로덕션 정상

## 알려진 이슈 (기존)

- **`projects/[id]/page.tsx`**: 아직 `"use client"` + 서버액션 사용 — 서버액션 수정으로 이제 동작해야 하나 미검증. 고객 상세 페이지에서 프로젝트 클릭 시 동작 확인 필요.
- **Migration 011**: `contracts.signer_phone` 컬럼 수동 추가 필요
- **이메일 발송**: Resend 무료 플랜 도메인 인증 후 재테스트 필요
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **로컬 빌드**: Windows webpack EISDIR (GitHub Actions로 우회)
- **빌드 프리렌더**: `(dashboard)/layout.tsx` 의 `cookies()` — try/catch 추가 시 `/meetings/new` 등 프리렌더 깨짐 (수정 시 주의)

## 환경변수 (Cloudflare Workers 시크릿)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY ✅
RESEND_API_KEY / NVIDIA_API_KEY / BOLTA_API_KEY / BOLTA_CUSTOMER_KEY
NEXT_PUBLIC_APP_URL=https://mk-dash-bd.official-f0c.workers.dev
```
