# CHANGELOG

## 2026-05-02

### 플로우 전면 개편
- 네비게이션 3개로 단순화 (홈/클라이언트/일정관리) — `1a012fb`
- 클라이언트 폼 인입경로 드롭다운 전환 — `45fd0c7`
- 홈 대시보드 KPI 개편 (tasks 제거, 미팅/발행 건수) — `e873da3`
- `/schedule` 페이지 신규 생성 — `295e976`

### 클라이언트 상세 2-column 개편
- 2-column 레이아웃 스켈레톤 + 미팅노트 탭 — `5aa25aa`
- 나머지 탭(프로젝트/견적·계약/세금계산서) 완성 — `47944bf`
- `/meetings/new?client_id=` 프리필 — `4b47652`

### 세금계산서 개편
- Bolta API `/api/bolta/issue` 라우트 추가 — `75d0754`
- `tax_invoices` 스키마 items/supply/tax/total 컬럼 추가 — `ac8fa09`
- InvoiceFormDialog 품목 동적 추가/삭제, 세액 자동 계산 — `d343357`

### 기타 수정
- ESLint 오류 수정 (Vercel 빌드 차단 해제) — `c66a276`
- CI에 env 시크릿 전체 추가 — `3cd743e`
- Supabase join 타입 수정 (array → `[0]`) — `b413d07`
- 로그인 에러 실제 메시지 노출 (debug) — `a50c208`

## 2026-04-29 ~ 2026-05-01

### 사업자등록증 OCR
- NVIDIA NIM 기반 OCR 라우트 `/api/ocr` — `f577291`
- ClientFormSheet에 사업자등록증 업로드 섹션 추가 — `a159d1e`
- 세금계산서 발행 시 미등록 경고 + OCR 유도 — `fb213ff`

### 설정 페이지
- 설정 페이지 (프로필, 비밀번호, 연결 상태) — `259236a`
- 사업자 정보 섹션 추가 (세금계산서 공급자 정보) — `f01c8fb`

## 2026-04-21 ~ 2026-04-28

### 핵심 페이지 구축
- 인보이스/견적/계약 페이지 — `70b7072`
- 프로젝트 관리 페이지 — `eb2f3ad`
- 미들웨어 인증 (Cloudflare Workers 호환) — `8a2faf0`
- GitHub Actions CI/CD (Cloudflare Workers 배포) — `bf8beb1`
