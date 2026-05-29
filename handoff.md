# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, `npm run dev` 정상 (localhost:3000)
- **아키텍처:** Server Components First — 목록 페이지 전부 async 서버 컴포넌트 + URL 필터
- **DB:** leads, interactions 테이블 ✅ 적용 완료 (2026-05-28)
- **서명 위저드:** 3단계 리디자인 완료 (2026-05-29)

## 최근 완료 작업 (2026-05-29)

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
