# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, `npm run dev` 정상 (localhost:3000)
- **아키텍처:** Server Components First — 목록 페이지 전부 async 서버 컴포넌트 + URL 필터
- **DB:** leads, interactions 테이블 ✅ 적용 완료 (2026-05-28)
- **서명 위저드:** 3단계 리디자인 완료 (2026-05-29)

## 최근 완료 작업 (2026-05-29)

### 리드→고객 전환 프로젝트 미표시 버그 수정 ✅

**원인 분석:**
1. `projects/page.tsx` `loadData`에서 `fetchClientsAction()`이 실패(예: `clients_with_revenue` 뷰 오류)하면 `Promise.all` 전체가 실패해 `setProjects([])` 처리 → 프로젝트 목록 전부 사라짐
2. `lead-actions.ts`의 직접 INSERT가 `createProject` 헬퍼와 다른 필드 구성으로 잠재적 불일치

**수정 내용:**
- `projects/page.tsx`:
  - `fetchClientsAction().catch(() => [])` 분리 처리 — 클라이언트 로드 실패 시에도 프로젝트는 정상 표시
  - `loadError` 상태 추가로 오류 가시화
  - 기본 뷰를 `"kanban"` → `"list"`로 변경 (리스트는 필터링 없이 모든 프로젝트 표시)
  - KanbanView에 `uncategorized` 미분류 컬럼 추가 — `pipeline_stage`가 알 수 없는 값이어도 숨겨지지 않음
- `projects.ts`: `fetchProject`의 `throw error` → `throw new Error(error.message)` 직렬화 수정
- `clients.ts`: `fetchClient`의 `throw error` → `throw new Error(error.message)` 직렬화 수정
- `lead-actions.ts`: 직접 INSERT 제거, `createProject()` 공통 함수 사용으로 일관성 확보
- `ConvertLeadDialog.tsx`: `withProject` 기본값을 `!!lead.service_interest`로 변경 — 관심 서비스 입력된 리드는 자동 프로젝트 생성 활성화

### 서명 위저드 3단계 재설계 ✅

**변경 내용:**
- `계약서 확인 → 본인 확인 → 서명` 3단계 흐름으로 개편
- Step 2 (본인 확인): 성함 + 휴대폰 번호 수집
- 포트원 본인인증 구조 삽입 (`NEXT_PUBLIC_PHONE_VERIFY_ENABLED` 플래그)
  - 현재: `false` → 정보만 수집, "추후 본인인증 추가 예정" 안내 배너
  - 향후: `true` → `window.IMP.certification()` 팝업 실행 (TODO 주석 완비)

**수정/생성 파일:**
- `src/app/sign/contract/[token]/page.tsx` — 3단계 위저드 (PageState에 step3 추가)
- `src/app/api/contracts/sign/[token]/route.ts` — signerPhone 수신 + DB 저장
- `src/lib/verify/phone.ts` — 포트원 통합 스텁 모듈 (신규)
- `supabase/migrations/011_signer_phone.sql` — contracts.signer_phone 컬럼 추가 (신규)

**Supabase 적용 필요:**
```sql
-- supabase SQL Editor에서 실행
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_phone TEXT;
```

## 최근 완료 작업 (2026-05-28)

### CRM 전면 재설계 + 성능 최적화 ✅
- `/leads`, `/interactions`, `/documents` 신규 모듈
- `unstable_cache` 60s TTL + revalidateTag 적용
- 어드민 클라이언트 싱글턴 패턴
- GitHub Actions → Cloudflare Workers 자동 배포

## 알려진 이슈

- **Migration 011**: `contracts` 테이블에 `signer_phone` 컬럼 수동 추가 필요 (위 SQL)
- **이메일 발송**: Resend 무료 플랜 도메인 인증 후 재테스트 필요
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **로컬 빌드:** Windows webpack EISDIR (pre-existing, GitHub Actions로 우회)

## 포트원 본인인증 도입 TO-DO

1. 포트원(portone.io) 계정 가입 → 가맹점 식별코드 발급
2. `.env.local` + Cloudflare Workers 시크릿에 추가:
   ```
   NEXT_PUBLIC_PHONE_VERIFY_ENABLED=true
   NEXT_PUBLIC_PORTONE_IMP_CODE=imp00000000
   ```
3. `src/lib/verify/phone.ts` TODO 섹션 구현 (IMP.init + IMP.certification)
4. 포트원 아임포트 스크립트 로더를 `app/sign/layout.tsx`에 추가

## 환경변수 (Cloudflare Workers 대시보드에 설정됨)
```
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=https://...workers.dev
OWNER_NOTIFICATION_EMAIL=restindry@gmail.com
```
