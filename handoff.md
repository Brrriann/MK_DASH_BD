# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, GitHub Actions → Cloudflare Workers 자동 배포 정상
- **프로덕션:** https://mk-dash-bd.official-f0c.workers.dev
- **아키텍처:** Server Components First — 목록 페이지 전부 async 서버 컴포넌트
- **DB:** Supabase 정상 (환경변수·연결 확인됨)

## 최근 완료 작업 (2026-05-29)

### 리드 미팅 일정 ✅
- DB: `018_meeting_lead_link.sql` — `meeting_notes.lead_id` 추가 (**Supabase 실행 필요**)
- 미팅이 클라이언트 또는 리드에 속함 (둘 다 nullable)
- 리드 칸반 카드 "더보기" → **미팅 추가** (QuickMeetingDialog leadId 모드)
- `QuickMeetingDialog` 일반화: `clientId?`/`leadId?` + controlled open 모드
- 전환 시 리드 미팅 자동 이전 (`lead_id`→`client_id`)
- 캘린더·미팅 카드·상세에 리드명 표시

### 리드 단계 변경 ✅
신규 → 견적발송 → 미팅완료 → 계약 → 보류 → 실패 (`연락중` 제거, `미팅완료` 추가). 마이그레이션 016·017.

### 미팅 일정 + 캘린더 연동 ✅
- DB: `015_meeting_time.sql` — `meeting_notes.met_time TIME` nullable 추가 (**Supabase에서 실행 필요**)
- 미팅에 시간 입력/표시 (작성·편집·카드·상세 전부)
- 고객 상세에 **미팅 탭** 신설 + 경량 **빠른 등록 다이얼로그**(`QuickMeetingDialog`: 제목·날짜·시간·방식)
- 네비게이션에 **캘린더**(`/schedule`) 추가 (Sidebar + MoreDrawer)
- 캘린더 개선: 미팅 시간 표시·정렬, 일정 클릭 시 상세 이동, **프로젝트 deadline 버그 수정**(기존엔 전부 오늘로 찍힘 → 마감일에 표시)
- 유틸: `formatTimeLabel()` (utils.ts)

### 리드 편집 기능 ✅
`LeadEditSheet` 추가, 칸반 카드 편집 버튼 연결

### 파비콘 ✅
`src/app/icon.svg` — 사이드바와 동일한 `#0f172a` 배경에 흰색 MK 텍스트 (font-size 18, font-weight 900)

### 소통 유형 버튼 그리드 ✅
`InteractionFormSheet.tsx` + `InteractionNewPage.tsx` — `flex flex-wrap` → `grid grid-cols-3`
5개 버튼이 모바일에서 3+2 두 줄로 고정 배치

### 입력 자동 포맷 ✅
`src/lib/utils/input-formatters.ts` 신규 유틸 생성:
- **전화번호**: 숫자 입력 시 하이픈 자동 삽입 (010-1234-5678, 02-XXXX-XXXX 지원)
- **사업자등록번호**: XXX-XX-XXXXX 자동 포맷
- **금액**: 천단위 콤마 자동 삽입 (1,234,567)

적용 파일: `ClientFormSheet`, `LeadFormSheet`, `ProjectFormDialog`
(EstimateNewPage·ContractNewPage는 이미 자체 구현됨)

### 모바일 사이드바 숨김 ✅
`Sidebar.tsx` — `hidden md:flex` 추가, 모바일(< 768px)은 MobileTopBar + MobileBottomNav만 사용

### 프로젝트 상세 입금 현황 인라인 토글 ✅
`projects/[id]/page.tsx` — 계약금·잔금 행을 클릭 버튼으로 전환
- 낙관적 업데이트 + `PATCH /api/projects/[id]` + 실패 시 롤백
- 입금 시 현재 시각 `*_paid_at` 자동 기록

### 견적서·계약서 전면 재설계 ✅
- 파일 업로드(PDF/이미지) + URL 입력 저장 방식
- 이메일 발송 임시 비활성화 (도메인 미인증)
- `clients/[id]`: 새 견적서/계약서 버튼 → Link 교체

## 최근 완료 작업 (2026-06-20)

### 전체 코드 검수 + 3-Phase 수정 ✅ (상세는 CHANGELOG)
병렬 에이전트로 서버액션·API라우트·죽은코드·DB스키마 검수 후 정리.
- **Phase 1 (버그)**: 계약생성 `deposit_ratio` 제거, API 인증 가드 전면(`src/lib/auth/guard.ts`) + 미들웨어 deny-by-default, `ContractStatus.signature_requested`, 리드전환 오류체크
- **Phase 2 (죽은코드)**: 파일 13개·죽은 export 다수·`shadcn` 의존성 삭제
- **Phase 3 (구조)**: 세금계산서 금액 `total_amount` 단일화 + 미러링, clients.ts 캐시 무효화, 중복 타입/유틸 제거, `ALL_IN_ONE` SQL 삭제
- ⚠️ **Supabase 수동 실행 필요**: `021_backfill_invoice_total_amount.sql` (레거시 매출 백필)

### 비밀번호 재설정 + 리드→고객 전환 버그 수정 ✅
- 비번 재설정 콜백: `token_hash + type=recovery` 처리, `/reset-password`로 리다이렉트
- 비번 재설정 이메일: `redirectTo` 제거 → Supabase Site URL 기본값 사용 (allowlist 불필요)
- 미들웨어: recovery 토큰 감지 시 `/auth/callback`으로 포워딩
- 리드→고객 전환: 서버 액션 throw → `{ success, error }` 반환 방식으로 변경 (Server Components render 오류 방지)
- 프로젝트 생성 실패해도 고객 전환 계속 진행
- 이메일 필수 입력 제거 (비워두면 `lead-{id}@noemail.local` 자동 생성)
- DB: `service_type`, `pipeline_stage`, `source_channel` ENUM → TEXT 변환 (019 마이그레이션, Supabase 실행 완료)

## 최근 완료 작업 (2026-06-19)

### 비밀번호 재설정 콜백 수정 ✅
- `/auth/callback`, `/api/auth/callback` — `type=recovery` 시 `/reset-password`로 강제 리다이렉트
- `token_hash` + `verifyOtp` 방식 처리 추가 (Supabase 이메일 링크 방식 모두 커버)

## 알려진 이슈

- **Supabase Storage 버킷 미생성**: `estimates`, `contracts` 버킷을 Supabase 대시보드에서 Public으로 직접 생성 필요 — 없으면 파일 업로드 실패
- **이메일 발송**: `magnatekorea.com` Resend 미인증 (아임웹 DNS 언더스코어 레코드 미지원). Cloudflare DNS 이전 또는 대안 검토 필요
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 미완
- **로컬 빌드**: Windows webpack EISDIR — GitHub Actions로 우회 중

## 다음 TODO

1. **`021_backfill_invoice_total_amount.sql` Supabase 실행** (레거시 매출 백필)
2. Supabase Storage `estimates`, `contracts` 버킷 생성 (Public)
3. 이메일 발송 재개 시 DNS 이전 or Resend 대안 검토
4. (선택) `clients.ts` ↔ `client-actions.ts` 모듈 완전 통합 — 지금은 revalidate만 일치시킴, 함수 중복은 남아있음
5. 파비콘 크기 추가 조정 필요 시 `src/app/icon.svg` font-size 수정

## 환경변수 (Cloudflare Workers 시크릿)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM
NVIDIA_API_KEY
BOLTA_API_KEY          # (구) 볼타 — 팝빌로 교체 중, 추후 제거
BOLTA_CUSTOMER_KEY     # (구) 볼타
POPBILL_LINK_ID        # 팝빌 LinkID (LinkHub 발급)
POPBILL_SECRET_KEY     # 팝빌 SecretKey
POPBILL_CORP_NUM       # 발행 주체(공급자) 사업자번호 — 팝빌 등록 연동회원, 하이픈X
POPBILL_IS_TEST=true   # 테스트베드. 운영 전환 시 false
POPBILL_USER_ID        # (선택) 팝빌 회원 아이디
NEXT_PUBLIC_APP_URL=https://mk-dash-bd.official-f0c.workers.dev
```

## 팝빌(Popbill) 세금계산서 연동 (진행 중)

- 골격: `src/lib/popbill.ts`(SDK 래퍼) + `/api/popbill/issue`(정발행) + InvoiceFormDialog `handlePopbillIssue`
- 발행 버튼이 볼타 → **팝빌**로 전환됨. 공급자 정보는 서버가 인증 사용자의 `business_profile`에서 채움
- ⚠️ **검증 필요**: 팝빌 SDK는 node `https`/`crypto` 사용 → Cloudflare Workers(nodejs_compat)에서 동작하는지 **테스트베드 키로 1차 배포 검증** 필요. 실패 시 `src/lib/popbill.ts`만 fetch+WebCrypto REST로 교체
- 발행 식별자(문서관리번호)는 임시로 `bolta_issuance_key` 컬럼 재사용 (추후 `popbill_mgt_key` 컬럼 분리 권장)
