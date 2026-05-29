# AI 문서 작성 + PDF 발행 + 볼타 세금계산서 연동 설계

**날짜:** 2026-05-02  
**상태:** 설계 승인 완료, 구현 플랜 작성 대기

---

## 목표

1. 세금계산서 볼타 API 실연동 (기존 라우트 → UI 연결)
2. 미팅노트 AI 회의록 작성 (키워드 → 정식 회의록)
3. 견적서 AI 초안 작성 + PDF 서버 생성
4. 계약서 AI 본문 작성 + PDF 서버 생성

---

## 아키텍처: 서버 API 레이어 분리 (Approach B)

모든 AI 키, Bolta 키는 서버 환경변수에만 존재. 클라이언트는 내부 API 라우트만 호출.

### API 라우트 맵

| 라우트 | 방법 | 용도 |
|--------|------|------|
| `/api/ai/meeting-note` | POST | 키워드 → 회의록 초안 |
| `/api/ai/estimate` | POST | 프로젝트 정보 → 견적 품목/금액 초안 |
| `/api/ai/contract` | POST | 계약 조건 → 계약서 본문 초안 |
| `/api/pdf/estimate` | POST | 견적서 PDF 생성 → Supabase Storage |
| `/api/pdf/contract` | POST | 계약서 PDF 생성 → Supabase Storage |
| `/api/bolta/issue` | POST | 세금계산서 발행 (기존, UI 연결만) |
| `/api/ocr` | POST | 사업자등록증 OCR (기존, 유지) |

---

## AI 모델 선택

| 용도 | 모델 | 이유 |
|------|------|------|
| 문서 생성 전체 | `moonshotai/kimi-k2-instruct` | 한국어 최상위 멀티링구얼, 비즈니스 문서 최적 |
| OCR (기존) | `meta/llama-3.2-90b-vision-instruct` | 비전 모델, 변경 없음 |

엔드포인트: `https://integrate.api.nvidia.com/v1/chat/completions`  
인증: `Authorization: Bearer ${NVIDIA_API_KEY}` (서버 환경변수)

---

## 기능별 상세 설계

### 1. 세금계산서 볼타 API 실연동

**현재 상태:** `/api/bolta/issue` 라우트 완성, UI 연결 안 됨

**변경 내용:**
- `InvoiceFormDialog`의 "홈택스에서 발행하기" 버튼 → 실제 `/api/bolta/issue` 호출로 교체
- 발행 전 사전 조건 검증:
  - `supplier` (발행자): Settings 사업자 정보 (`business_registration_number`, `representative_name`, 이메일)
  - `supplied` (수신자): 선택된 클라이언트 사업자 정보 (없으면 경고)
- Bolta payload 변환:
  ```ts
  items: formItems.map(item => ({
    date: issuedAt,
    name: item.name,
    supplyCost: item.supply_amount,
    tax: Math.round(item.supply_amount * 0.1),
  }))
  ```
- 발행 성공 시: `bolta_issuance_key`를 `tax_invoices` 테이블에 저장, 발행완료 배지 표시
- 발행 실패 시: Bolta 에러 메시지 toast로 표시

### 2. 미팅노트 AI 회의록 작성

**UI 변경:**
- 미팅노트 작성 폼(`/meetings/new`)에 "AI 회의록 작성" 섹션 추가
- 텍스트에어리어: 키워드/메모 자유 입력 (최대 2,000자)
- "AI 작성" 버튼 → 로딩 → content 필드에 결과 삽입
- 결과 삽입 후 직접 편집 가능

**서버 라우트 `/api/ai/meeting-note`:**
```
입력: { keywords: string, clientName?: string, metAt: string }
출력: { content: string }
```
- auth guard (401)
- 입력 길이 제한: keywords 2,000자 이하
- 시스템 프롬프트: 한국어 비즈니스 회의록 형식 강제
  - 회의 개요 / 주요 논의 내용 / 결정 사항 / 액션아이템 / 다음 미팅 안건

### 3. 견적서 AI 작성 + PDF 발행

**UI 변경:**
- 견적서 폼에 "AI 초안 작성" 버튼 추가
- 입력: 클라이언트(자동), 작업 설명, 예상 범위 (최대 1,000자)
- AI → 품목 목록(이름, 수량, 단가) 초안 제안 → 폼에 자동 입력
- 직접 수정 후 "PDF 발행" 버튼

**서버 라우트 `/api/ai/estimate`:**
```
입력: { clientName: string, description: string, scope?: string }
출력: { items: Array<{ name, quantity, unitPrice }> }
```
- JSON 형식으로 응답 강제 (시스템 프롬프트에 명시)
- 응답 파싱 실패 시 422 반환

**서버 라우트 `/api/pdf/estimate`:**
```
입력: { estimateId: string }
출력: { url: string } (Supabase Storage signed URL, 1시간 유효)
```
- DB에서 견적서 데이터 조회
- `@react-pdf/renderer`로 서버 PDF 생성
- Supabase Storage `estimates/` 버킷에 저장
- `estimates` 테이블 `pdf_url` 업데이트
- signed URL 반환

**PDF 레이아웃:**
- 헤더: 로고 영역, 견적서 제목, 발행일
- 발행자 정보 (Settings 사업자 정보)
- 수신자 정보 (클라이언트 사업자 정보)
- 품목 테이블 (품목명, 수량, 단가, 공급가액)
- 합계 (공급가액, 세액 10%, 총액)
- 푸터: 유효기간, 특이사항

### 4. 계약서 AI 작성 + PDF 발행

**UI 변경:**
- 계약서 폼에 "AI 계약서 작성" 버튼 추가
- 입력: 클라이언트(자동), 계약 금액, 기간(시작~종료), 작업 범위, 특이사항 (최대 1,000자)
- AI → 계약서 본문 생성 → 텍스트에어리어에 삽입
- 직접 편집 후 "PDF 발행"

**서버 라우트 `/api/ai/contract`:**
```
입력: { clientName: string, amount: number, startDate: string, endDate: string, scope: string, notes?: string }
출력: { content: string }
```

**서버 라우트 `/api/pdf/contract`:**
- `/api/pdf/estimate`와 동일 패턴
- 계약서 전용 레이아웃 (계약 당사자, 계약 내용, 서명란)

---

## 보안 원칙

- **모든 라우트 auth guard**: 세션 없으면 즉시 401
- **API 키 서버 전용**: `NVIDIA_API_KEY`, `BOLTA_API_KEY`, `BOLTA_CUSTOMER_KEY` 서버 환경변수만 사용, 클라이언트 노출 절대 없음
- **입력 sanitize**: AI 라우트 입력 길이 제한 + 특수문자 이스케이프 (프롬프트 인젝션 방지)
- **PDF signed URL**: 1시간 만료, Supabase Storage RLS 적용
- **에러 메시지**: 내부 오류는 generic 메시지로, 상세 내용은 서버 로그에만

---

## 환경변수 (추가 필요 없음, 기존 사용)

```
NVIDIA_API_KEY=...          # AI 문서 생성
BOLTA_API_KEY=...           # 세금계산서 발행
BOLTA_CUSTOMER_KEY=...      # 세금계산서 발행
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... # PDF Storage 저장 시
```

---

## 의존성 추가

```bash
npm install @react-pdf/renderer
```

---

## 구현 순서 (권장)

1. 볼타 API UI 연결 (가장 빠름, 라우트 기존 완성)
2. 미팅노트 AI
3. 견적서 AI + PDF
4. 계약서 AI + PDF
