# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, GitHub Actions → Cloudflare Workers 자동 배포 정상
- **아키텍처:** Server Components First — 목록 페이지 전부 async 서버 컴포넌트
- **DB:** Supabase 정상 (환경변수·연결 확인됨)

## 최근 완료 작업 (2026-05-29)

### 모바일 사이드바 숨김 ✅
`Sidebar.tsx` aside에 `hidden md:flex` 추가 — 모바일(< 768px)에서 좌측 네비 완전히 숨김.
기존 `MobileTopBar` + `MobileBottomNav`가 모바일 네비 담당.

### 프로젝트 상세 — 입금 현황 인라인 토글 ✅
`projects/[id]/page.tsx` 입금 현황 카드의 계약금·잔금 행을 클릭 가능한 버튼으로 변경.
- 클릭 시 `deposit_paid` / `final_paid` 토글 + `*_at` 타임스탬프 자동 기록
- 낙관적 업데이트 → `PATCH /api/projects/[id]` 호출 → 실패 시 롤백

### 견적서·계약서 전면 재설계 ✅
- 견적서: AI 폼 빌더 → 파일 업로드(PDF/이미지) + URL 입력 방식
- 계약서: 동일한 업로드+저장 방식으로 재설계
- 이메일 발송 기능 임시 비활성화 (도메인 미인증으로 추후 구현)
- `clients/[id]` 페이지: 새 견적서/계약서 버튼 → `/estimates/new`, `/contracts/new` Link로 교체

## 알려진 이슈

- **Supabase Storage 버킷:** `estimates`, `contracts` 버킷이 Supabase 대시보드에 없으면 파일 업로드 실패. 직접 생성 필요 (Public 버킷).
- **이메일 발송:** `magnatekorea.com` 도메인 Resend 미인증. 아임웹 DNS가 언더스코어 레코드 미지원. Cloudflare DNS 이전 또는 추후 별도 구현 필요.
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **로컬 빌드:** Windows webpack EISDIR (GitHub Actions로 우회)

## 다음 TODO

1. Supabase Storage에서 `estimates`, `contracts` 버킷 생성 (Public)
2. 이메일 발송 기능 재개 시 Cloudflare DNS 이전 or Resend 대안 검토

## 환경변수 (Cloudflare Workers 시크릿)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY ✅
RESEND_API_KEY / RESEND_FROM (이메일 발신 주소)
NVIDIA_API_KEY / BOLTA_API_KEY / BOLTA_CUSTOMER_KEY
NEXT_PUBLIC_APP_URL=https://mk-dash-bd.official-f0c.workers.dev
```
