# 전자계약서 e-서명 기능 설계

**날짜:** 2026-05-03  
**상태:** 설계 승인 완료, 구현 플랜 작성 대기

---

## 목표

계약서를 이메일로 클라이언트에게 발송하고, 클라이언트가 손글씨 서명 후 제출하면 서명 포함 PDF가 자동 생성되어 양측에 발송되는 e-서명 워크플로우 구현.

---

## 전체 흐름

1. 대시보드 "서명 요청 발송" 버튼 클릭
2. 서버: 고유 토큰(UUID) 생성 + 만료일(7일) 저장 + 이메일 발송 (Resend)
3. 클라이언트: 이메일 링크 클릭 → `/sign/contract/[token]` 접속 (로그인 불필요)
4. **1단계 위자드**: 계약서 전문 확인
5. **2단계 위자드**: 서명자 이름 입력 + 손글씨 서명 패드 + 제출
6. 서버: 서명 이미지 + 이름 저장 → 서명 포함 PDF 재생성 → 상태 "서명완료" 자동 변경 → 토큰 무효화 → 양측 이메일 발송
7. 완료 화면: 🎉 축하 메시지 + PDF 다운로드 버튼 + 창 닫기 안내

---

## UI/UX 설계

### 서명 페이지 (`/sign/contract/[token]`)

**레이아웃:** 2단계 위자드 (진행률 표시 `1 / 2`)

**오류 화면 (토큰 문제 시)**
- 토큰 없음/만료: "링크가 만료되었거나 유효하지 않습니다. 담당자에게 재발송 요청해주세요."
- 이미 서명됨: "이미 서명이 완료된 계약서입니다."

**1단계 — 계약서 확인**
- 계약서 전문 표시 (스크롤 가능)
- "다음 → 서명" 버튼

**2단계 — 서명**
- 서명자 이름 입력 필드 (필수, 법적 확인용)
- 가이드형 서명 패드
  - 설명 텍스트: "마우스 또는 터치로 서명하세요"
  - 캔버스: 반응형 (max-width: 600px, aspect-ratio 3:1)
  - "↩ 다시 그리기" 링크
- "서명 완료 →" 버튼

**완료 화면**
- 🎉 이모지 + "계약이 체결되었습니다!" 메시지
- PDF 다운로드 버튼 (Supabase Storage 서명 URL, 1시간 유효)
- "이 창을 닫으셔도 됩니다" 안내

### 서명 요청 이메일 (Resend)

- **From:** `마그네이트코리아 <noreply@magnatekorea.com>`
- **Subject:** `[서명 요청] {계약서 제목}`
- **Reply-To:** 담당자 이메일
- 본문: 수신자 이름 + 계약서 제목 + 만료일 + CTA 버튼 "계약서 서명하기"

### 서명 완료 이메일 (양측 발송)

- 클라이언트: 서명 완료 확인 + 서명된 PDF 다운로드 링크
- 대시보드 사용자: 서명 완료 알림 + 서명자 이름/일시

---

## 데이터 모델

### contracts 테이블 추가 컬럼

```sql
signature_token            UUID UNIQUE         -- 토큰 (NULL = 미발송 또는 무효화됨)
signature_token_expires_at TIMESTAMPTZ         -- 발송 후 7일
signature_token_used_at    TIMESTAMPTZ         -- 서명 완료 시 기록 (재서명 방지)
signer_name                TEXT                -- 서명자 직접 입력
signer_email               TEXT                -- 계약 레코드의 client.email에서 복사 (입력 불필요)
signer_ip                  TEXT                -- 감사 추적
signer_user_agent          TEXT                -- 감사 추적 (전자서명법)
signature_image_url        TEXT                -- Supabase Storage (서명 URL)
signed_pdf_url             TEXT                -- Supabase Storage (서명 URL)
signed_at                  TIMESTAMPTZ
```

### 토큰 무효화 메커니즘

POST 서명 처리 시 **원자적 UPDATE**로 토큰을 소비:

```sql
UPDATE contracts
SET signature_token_used_at = NOW()
WHERE signature_token = $1
  AND signature_token_expires_at > NOW()
  AND signature_token_used_at IS NULL
RETURNING id
```

`rowCount === 1`인 경우에만 이후 처리 진행. `rowCount === 0`이면 409 Conflict 반환 (이미 서명됨 또는 만료).

### 토큰 재발송 규칙

"서명 요청 발송" 버튼을 재클릭 시:
- 기존 토큰을 새 토큰으로 교체 (`signature_token`, `expires_at` 갱신)
- 기존 `signature_token_used_at`이 있으면 (이미 서명 완료) 재발송 차단 → 에러 메시지 표시

### 계약 상태 (contract_status)

기존 상태에 추가:
- `signature_requested` — 서명 요청 발송 완료
- `signed` — 서명 완료

---

## API 라우트

| 라우트 | 메서드 | 용도 |
|--------|--------|------|
| `/api/contracts/send-signature` | POST | 토큰 생성 + 이메일 발송 |
| `/api/contracts/sign/[token]` | GET | 토큰 검증 + 계약서 조회 |
| `/api/contracts/sign/[token]` | POST | 서명 저장 + PDF 재생성 + 상태 업데이트 + 토큰 무효화 + 이메일 발송 |

모든 API 라우트는 서버 전용 (서비스 롤 키를 서버에서만 사용, 클라이언트에 노출 없음).

---

## Supabase Storage

- **버킷:** `contract-signatures` (private)
- **서명 이미지 경로:** `signatures/{contract_id}/{timestamp}.png`
- **서명된 PDF 경로:** `signed-pdfs/{contract_id}/{timestamp}.pdf` (타임스탬프로 버전 관리, 덮어쓰기 방지)
- **접근 방식:** Signed URL (1시간 유효) — 공개 버킷 사용 불가
- **Storage RLS:** 서비스 롤만 쓰기 가능, 읽기는 서명 URL로만

---

## PDF 서명 합성

1. 서명 캔버스 → `canvas.toDataURL('image/png')` → base64 PNG
2. POST 요청 시 base64 문자열 + 서명자 이름을 서버로 전송 (body size limit: 1MB)
3. 서버: `@react-pdf/renderer`의 `<Image>` 컴포넌트로 서명 이미지 삽입
   - 위치: `SignedContractPdf.tsx`의 서명 섹션 — PDF 템플릿 자체가 최하단에 서명란을 포함하므로 고정 레이아웃 보장
   - 크기: width=180, height=60
   - 서명란에 서명자 이름(텍스트) + 서명 이미지 + 서명 일시 함께 표시

---

## 새 파일 목록

```
src/app/sign/contract/[token]/page.tsx       — 공개 서명 페이지 (로그인 불필요)
src/app/api/contracts/send-signature/route.ts
src/app/api/contracts/sign/[token]/route.ts
src/components/pdf/SignedContractPdf.tsx     — 서명 포함 PDF 템플릿
src/lib/resend.ts                            — 이메일 유틸리티
supabase/migrations/007_esign_columns.sql    — contracts 테이블 컬럼 추가
```

---

## 라이브러리

| 패키지 | 용도 |
|--------|------|
| `react-signature-canvas` | 손글씨 서명 패드 (캔버스) |
| `resend` | 이메일 발송 |
| `@react-pdf/renderer` | 서명 포함 PDF 재생성 (기존 재활용) |

---

## 보안

- 토큰: UUID (`UNIQUE NOT NULL`), 추측 불가
- 이중 제출 방지: 원자적 UPDATE (`rowCount === 1` 검증)
- 만료 + 미사용 검증: 단일 쿼리에서 동시 체크
- 서비스 롤 키: API 라우트 서버 코드에서만 사용, 클라이언트 노출 없음
- Storage: Private 버킷 + Signed URL (1시간)
- PDF 버전 관리: 타임스탬프 경로로 덮어쓰기 방지
- 감사 추적: IP + User-Agent + 서명 일시
- 입력 검증: Next.js route handler에서 base64 크기 체크 (500KB 초과 시 400 반환)
- 캔버스 모바일: `touch-action: none` CSS 적용 (스크롤 충돌 방지)
- 위자드 리프레시: 페이지 새로고침 시 1단계로 재시작 (서버에 중간 상태 저장 없음, 의도적 설계)

## 구현 전제조건 (배포 시)

- Resend 계정에서 `magnatekorea.com` 도메인 DNS 인증 필요
- 개발/스테이징 환경에서는 `onboarding@resend.dev` 사용 가능
- `next.config`에 `react-signature-canvas` transpilePackages 추가 필요 (CJS 패키지)

## 타임스탬프 컬럼 구분

- `signature_token_used_at`: 토큰이 소비된 시점 (원자적 UPDATE로 설정)
- `signed_at`: PDF 생성 + 이메일 발송 완료 시점 (후속 처리 완료 확인용)
- 두 값이 다를 수 있음 — `used_at`은 있는데 `signed_at`이 없으면 PDF 생성 실패를 의미
