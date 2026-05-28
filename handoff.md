# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, `npm run dev` 정상 (localhost:3000)
- **아키텍처:** Server Components First — 목록 페이지 전부 async 서버 컴포넌트 + URL 필터
- **DB:** leads, interactions 테이블 ✅ 적용 완료 (2026-05-28)

## 최근 완료 작업 (2026-05-28)

### CRM 전면 재설계 ✅ (커밋 fb645d1)
**신규 모듈:**
- `/leads` — 리드 관리 (소스/상태 필터, 칸반 뷰, 팔로업 알림)
- `/interactions` — 소통기록 (통화/카톡/메일/미팅/메모)
- `/documents` — 서류함 탭 통합 (견적/계약/계산서)

**아키텍처 전환:**
- 모든 목록 페이지 → Server Component + URL searchParams 필터
- Server Actions: `lead-actions.ts`, `interaction-actions.ts`
- 홈 대시보드: 팔로업 배너 + 파이프라인 KPI + 오늘 할일

**네비게이션:** 홈/리드/고객/소통기록/프로젝트/서류함

## 최근 완료 작업 (2026-05-03)

### 전자계약서 e-서명 기능 구현 ✅
스펙: `docs/superpowers/specs/2026-05-03-esign-design.md`

**구현된 파일:**
- `src/app/sign/contract/[token]/page.tsx` — 공개 서명 페이지 (2단계 위자드)
- `src/app/api/contracts/send-signature/route.ts` — 토큰 생성 + 이메일 발송
- `src/app/api/contracts/sign/[token]/route.ts` — GET(토큰 검증) + POST(원자적 서명 처리)
- `src/components/pdf/SignedContractPdf.tsx` — 서명 이미지 포함 PDF
- `src/lib/resend.ts` — Resend 이메일 유틸리티
- `supabase/migrations/009_esign_columns.sql` — contracts 테이블 e-서명 컬럼 추가
- `src/components/contracts/ContractFormDialog.tsx` — "서명 요청 발송" 버튼 추가

## 현재 진행 중: 이메일 발송 디버깅

### 증상
- UI에 "서명 요청 발송됨" 표시 (API 200 반환)
- Resend 대시보드에 발송 로그 없음 → 실제 발송 안 됨

### 원인 파악 및 조치
1. **Resend SDK v2 result 패턴 미처리** → 수정 완료 (34f579c)
   - `resend.emails.send()` 반환값 `{ data, error }` 에러 체크 추가
   - 이제 실패 시 UI에 실제 에러 메시지 표시됨
2. **배포 완료 후 재테스트 필요**

### 다음 세션 시작 시 할 일
1. 배포 완료 확인 (GitHub Actions 확인)
2. "서명 요청 발송" 다시 클릭
3. 에러 메시지 확인:
   - **에러 메시지 표시됨** → 메시지 내용에 따라 디버그
   - **또 조용히 성공** → Cloudflare 환경변수 `RESEND_API_KEY` 값 재확인
4. **Resend 무료 플랜 제한 가능성**: 도메인 미인증 시 가입 이메일로만 발송 가능
   - resend.com → Domains에서 도메인 추가 필요할 수 있음

## 알려진 이슈

- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **로컬 빌드:** Windows webpack EISDIR (pre-existing)
- **Supabase 마이그레이션 009**: 적용 완료 여부 확인 필요

## 환경변수 (Cloudflare Workers 대시보드에 설정됨)
```
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=https://...workers.dev
OWNER_NOTIFICATION_EMAIL=restindry@gmail.com
```
