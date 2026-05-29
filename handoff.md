# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** TypeScript 오류 없음, GitHub Actions → Cloudflare Workers 자동 배포 정상
- **프로덕션:** https://mk-dash-bd.official-f0c.workers.dev
- **DB:** Supabase 정상 (환경변수·연결 확인됨)
- **서버 액션:** ✅ 정상 (2026-05-29 근본 원인 수정 완료)

## 최근 완료 작업 (2026-05-29)

### 견적서 메뉴 완전 재설계 ✅
기존 복잡한 폼(품목 입력, AI 생성, PDF 렌더링)을 **파일 업로드 + 이메일 발송** 방식으로 전환.

**새 플로우:**
- `/estimates` → Server Component 리스트 (inline 상태 변경 셀렉터)
- `/estimates/new` → 새 견적서 전용 페이지 (파일 업로드 or URL 입력)
- 이메일 발송: `PaperPlaneTilt` 버튼 → `/api/estimates/[id]/send` → Resend
- 파일 업로드: `/api/estimates/upload` → Supabase Storage `estimates` 버킷

**주의:** Supabase Storage에 `estimates` 버킷(public)을 생성해야 파일 업로드 가능.

**상태 레이블 변경:** `pending` → "발송됨" (DB 값은 그대로, UI 표시만 변경)

### 홈화면 내일 팔로업 추가 ✅
### 소통 추가 → 전용 페이지 전환 ✅
### 서버 액션 전면 실패 근본 원인 수정 ✅

## 알려진 이슈

- **Supabase Storage `estimates` 버킷 미생성**: 견적서 파일 업로드 기능 사용 전 Supabase 대시보드에서 `estimates` 퍼블릭 버킷 생성 필요
- **이메일 발송**: Resend 무료 플랜 도메인 인증 후 재테스트 필요 (`RESEND_FROM` 환경변수도 설정 필요)
- **`projects/[id]/page.tsx`**: `"use client"` + 서버액션 사용 — 동작은 하나 미검증
- **Migration 011**: `contracts.signer_phone` 컬럼 수동 추가 필요
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **로컬 빌드**: Windows webpack EISDIR (GitHub Actions로 우회)

## 환경변수 (Cloudflare Workers 시크릿)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY ✅
RESEND_API_KEY / RESEND_FROM (이메일 발신 주소, 설정 안 되면 onboarding@resend.dev 사용)
NVIDIA_API_KEY / BOLTA_API_KEY / BOLTA_CUSTOMER_KEY
NEXT_PUBLIC_APP_URL=https://mk-dash-bd.official-f0c.workers.dev
```
