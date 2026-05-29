# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, 푸시 완료 (ee09123)
- **아키텍처:** Server Components First — 목록 페이지 전부 async 서버 컴포넌트
- **DB:** leads, interactions 테이블 ✅ 적용 완료

## 최근 완료 작업 (2026-05-29)

### 견적서·계약서 전면 재설계 ✅ (커밋 ee09123)

**변경 내용:**
- 견적서: AI 폼 빌더 → 파일 업로드(PDF/이미지) + URL 입력 방식으로 교체
- 계약서: 동일한 업로드+저장 방식으로 재설계
- 이메일 발송 기능 임시 비활성화 (도메인 미인증으로 인해 추후 구현)

**신규 파일:**
- `src/app/(dashboard)/estimates/new/page.tsx` — 새 견적서 페이지
- `src/app/(dashboard)/contracts/new/page.tsx` — 새 계약서 페이지
- `src/components/estimates/EstimateNewPage.tsx` — 견적서 작성 폼
- `src/components/estimates/EstimatesListClient.tsx` — 견적서 목록 (서버 → 클라이언트)
- `src/components/contracts/ContractNewPage.tsx` — 계약서 작성 폼
- `src/components/contracts/ContractsListClient.tsx` — 계약서 목록
- `src/app/api/estimates/route.ts`, `[id]/route.ts`, `upload/route.ts`
- `src/app/api/contracts/route.ts`, `[id]/route.ts`, `upload/route.ts`

**수정된 파일:**
- `src/lib/types.ts` — EstimateStatus에서 `accepted` 제거, ContractStatus에서 `signature_requested` 제거
- `src/app/(dashboard)/estimates/page.tsx` — Server Component로 전환
- `src/app/(dashboard)/contracts/page.tsx` — Server Component로 전환
- `src/app/(dashboard)/clients/[id]/page.tsx` — EstimateFormDialog/ContractFormDialog → Link 교체
- `src/components/documents/DocumentsTabs.tsx` — 상태 타입 업데이트

## 알려진 이슈

- **Supabase Storage 버킷:** `estimates`, `contracts` 버킷이 Supabase 대시보드에 없으면 파일 업로드 실패. 직접 생성 필요 (Public 버킷).
- **이메일 발송:** `magnatekorea.com` 도메인이 Resend에 미인증 상태. 아임웹 DNS가 언더스코어 레코드(`resend._domainkey`) 지원 안 함. Cloudflare DNS 이전 또는 추후 별도 구현 필요.
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **로컬 빌드:** Windows webpack EISDIR (pre-existing)

## 다음 TODO

1. Supabase Storage에서 `estimates`, `contracts` 버킷 생성 (Public)
2. 이메일 발송 기능 재개 시 Cloudflare DNS 이전 or Resend 대안 검토
3. 이메일 발송 버튼 재활성화 (EstimatesListClient.tsx에 추가)

## 환경변수 (Cloudflare Workers 대시보드에 설정됨)
```
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=https://...workers.dev
OWNER_NOTIFICATION_EMAIL=restindry@gmail.com
```
