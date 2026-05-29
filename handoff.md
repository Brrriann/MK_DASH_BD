# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, GitHub Actions → Cloudflare Workers 자동 배포 정상
- **프로덕션:** https://mk-dash-bd.official-f0c.workers.dev
- **아키텍처:** Server Components First — 목록 페이지 전부 async 서버 컴포넌트
- **DB:** Supabase 정상 (환경변수·연결 확인됨)

## 최근 완료 작업 (2026-05-29)

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

## 알려진 이슈

- **Supabase Storage 버킷 미생성**: `estimates`, `contracts` 버킷을 Supabase 대시보드에서 Public으로 직접 생성 필요 — 없으면 파일 업로드 실패
- **이메일 발송**: `magnatekorea.com` Resend 미인증 (아임웹 DNS 언더스코어 레코드 미지원). Cloudflare DNS 이전 또는 대안 검토 필요
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 미완
- **로컬 빌드**: Windows webpack EISDIR — GitHub Actions로 우회 중

## 다음 TODO

1. Supabase Storage `estimates`, `contracts` 버킷 생성 (Public)
2. 이메일 발송 재개 시 DNS 이전 or Resend 대안 검토
3. 파비콘 크기 추가 조정 필요 시 `src/app/icon.svg` font-size 수정

## 환경변수 (Cloudflare Workers 시크릿)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM
NVIDIA_API_KEY
BOLTA_API_KEY
BOLTA_CUSTOMER_KEY
NEXT_PUBLIC_APP_URL=https://mk-dash-bd.official-f0c.workers.dev
```
