# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** Vercel 배포 정상 (로컬 Windows webpack EISDIR 이슈는 pre-existing, Vercel 무관)
- **Supabase 로컬:** `supabase start` 후 `.env.local` 필요
- **배포:** Cloudflare Workers (GitHub Actions CI)

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

## 알려진 이슈

- **Bolta API** (`/api/bolta/issue`): InvoiceFormDialog에 연결됨, 실제 API 키 테스트 필요
- **로컬 빌드:** `npm run build` 실패 (Windows webpack EISDIR 이슈, pre-existing). dev 서버 및 Vercel 정상.

## 다음 TODO

- [ ] **Supabase 마이그레이션 적용** — Supabase 대시보드 SQL 에디터에서 `009_esign_columns.sql` 실행
- [ ] **Supabase Storage 버킷 생성** — `contract-signatures` (Private) 버킷 + RLS 정책
- [ ] **`.env.local` 키 추가:**
  ```
  RESEND_API_KEY=re_...
  RESEND_FROM=onboarding@resend.dev  (개발용)
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  OWNER_NOTIFICATION_EMAIL=restindry@gmail.com
  ```
- [ ] **전체 플로우 테스트** — 계약서 생성 → 서명 요청 발송 → 이메일 링크 → 서명 → PDF 다운로드
