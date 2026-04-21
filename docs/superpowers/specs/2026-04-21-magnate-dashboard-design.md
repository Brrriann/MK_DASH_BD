# 마그네이트코리아 업무 대시보드 — 디자인 스펙

**버전:** v1.1  
**작성일:** 2026-04-21  
**작성자:** Brian (대표)  
**기반 계획서:** magnate_dashboard_plan_v1.1.docx

---

## 1. 프로젝트 개요

마그네이트코리아 내부 업무 대시보드. Brian 단독 사용 내부 도구. 로컬 실행 + GitHub 연동. Supabase 기반 데이터 저장.

**목표:** 클라이언트 관리, 프로젝트/태스크 추적, 미팅노트, 견적/계약/세금계산서 통합 관리.

---

## 2. 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v3 |
| UI 컴포넌트 | shadcn/ui (커스터마이즈) |
| 폰트 | Outfit (Google Fonts) |
| 아이콘 | @phosphor-icons/react |
| 리치텍스트 | TipTap |
| DB / Auth | Supabase (PostgreSQL + RLS + Supabase Auth) |
| 상태관리 | useState / useReducer (로컬), Zustand (전역 필요시) |
| 배포 | 로컬 개발 + GitHub 연동 |
| 패키지매니저 | npm |

---

## 3. 인증 (Auth)

### Brian(admin) 세션
- **방식:** Supabase Auth 이메일+패스워드 로그인
- **로컬 개발:** Supabase CLI (`supabase start`) + `.env.local` 환경변수
- **세션 만료:** 만료 시 `/login` 리다이렉트, `supabase.auth.onAuthStateChange` 감지
- **미들웨어:** `middleware.ts`에서 비로그인 사용자 → `/login` 리다이렉트
- **로그인 화면:** `/login` — 이메일+비밀번호 폼, 에러 인라인 표시

### 클라이언트 포털 세션 (M5)
- **방식:** `portal_token` (UUID v4) URL 파라미터 기반 무인증 접근
- **라우트:** `/portal/[token]`
- **토큰 생성:** `clients` 레코드 INSERT 시 `gen_random_uuid()` 자동 생성
- **만료 처리:** `portal_expires_at < now()` 이면 "링크가 만료되었습니다" 에러 페이지
- **RLS:** 클라이언트 롤은 `portal_token`과 일치하는 레코드만 SELECT 가능

### .env.local 필수 키
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 4. 디자인 시스템

### 레이아웃 패턴
- **데스크톱 (1024px+):** 240px 고정 왼쪽 사이드바 (텍스트+아이콘) + 오른쪽 메인 콘텐츠
- **태블릿 (768px~1023px):** 64px 아이콘 전용 사이드바 (hover 시 툴팁) + 메인 콘텐츠
- **모바일 (767px-):** 사이드바 숨김 → 상단 로고바 + 하단 탭바(5개 항목)

### 컬러 팔레트 (Slate Midnight + Electric Blue)

| 토큰 | 값 | 용도 |
|------|----|------|
| `sidebar-bg` | `#0f172a` | 사이드바 배경 |
| `sidebar-active` | `#1e3a5f` | 활성 메뉴 배경 |
| `main-bg` | `#f8fafc` | 메인 콘텐츠 배경 |
| `card-bg` | `#ffffff` | 카드 배경 |
| `border` | `#e2e8f0` | 카드/구분선 |
| `accent` | `#2563eb` | 포인트, CTA 버튼 |
| `accent-light` | `#eff6ff` | 포인트 연한 배경 |
| `text-primary` | `#0f172a` | 본문 제목 |
| `text-secondary` | `#64748b` | 보조 텍스트 |
| `text-muted` | `#94a3b8` | 플레이스홀더, 라벨 |
| `success` | `#10b981` | 완료, 활성 |
| `warning` | `#f59e0b` | 대기, 검토 |
| `danger` | `#f43f5e` | 오류, 삭제 |

`tailwind.config.ts`의 `extend.colors`에 위 토큰 정의 필수.

### 타이포그래피

| 역할 | 클래스 |
|------|--------|
| 페이지 제목 | `font-outfit text-2xl font-bold tracking-tight text-slate-900` |
| 섹션 헤딩 | `font-outfit text-lg font-semibold tracking-tight text-slate-800` |
| 본문 | `font-outfit text-sm text-slate-600 leading-relaxed` |
| 스탯 숫자 | `font-outfit text-3xl font-bold tracking-tighter` |
| 레이블 | `text-xs font-medium text-slate-400 uppercase tracking-wide` |

### 컴포넌트 원칙
- 카드: `rounded-xl border border-slate-200 bg-white shadow-sm`
- 버튼(primary): `bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium`
- 입력: 라벨 위, 오류 텍스트 입력 아래, `gap-2` 간격
- 아이콘: Phosphor Icons, `size={16}` + `weight="regular"` 통일
- **Inter 폰트 금지** / **퍼플 계열 금지** / **순수 black(#000) 금지**

### 사이드바 아이콘 매핑 (Phosphor)

| 메뉴 | Phosphor 아이콘 |
|------|----------------|
| 홈 | `<SquaresFour />` |
| 클라이언트 | `<Buildings />` |
| 업무관리 | `<Kanban />` |
| 미팅노트 | `<NotePencil />` |
| 견적서 | `<CurrencyKrw />` |
| 계약서 | `<FileText />` |
| 세금계산서 | `<Receipt />` |
| AI 추천 | `<Sparkle />` |
| 설정 | `<GearSix />` |

### 로딩 · 에러 · 빈 상태

| 상태 | 처리 방식 |
|------|-----------|
| 데이터 로딩 | 레이아웃 크기 맞춤 스켈레톤 shimmer (스피너 금지) |
| 빈 목록 | 아이콘 + 안내 문구 + CTA 버튼 ("첫 번째 클라이언트를 추가해보세요") |
| 네트워크 오류 | 인라인 에러 배너 + 재시도 버튼 |
| RLS 거부 | "접근 권한이 없습니다" 페이지, `/login` 링크 |
| 폼 제출 오류 | 입력 필드 아래 인라인 에러 텍스트, 빨간 border |
| TipTap 자동저장 실패 | 상단 토스트 "임시저장 실패 — 수동으로 저장해주세요" |

---

## 5. 모듈 구성 (M1~M9)

### 홈 대시보드 (/)
**KPI 카드 4개 (2×2 그리드)**
- 오늘 마감 태스크 수
- 진행 중 프로젝트 수
- 이번 달 거래액 합계
- 활성 클라이언트 수

**위젯**
- 마감 임박 태스크 리스트 (D-3 이내)
- 최근 미팅노트 3건
- 미발행 세금계산서 알림 배너 (있을 경우)

**빈 상태:** 전체 위젯 빈 상태 안내 + 각 모듈 바로가기 링크

### M1 — 프로젝트·태스크 관리 (/tasks)
- 칸반 보드 (할일 / 진행중 / 완료 / 보류) — 드래그앤드롭
- 태스크 CRUD, 마감일, 우선순위(높음/보통/낮음), 프로젝트 연결
- 클라이언트 필터 드롭다운 (M8 연동)
- 태스크 상세 슬라이드오버 → '참고 미팅노트' 섹션 (M9 연동)

### M2 — 세금계산서 (/invoices)
- 발행 이력 테이블, 기간 필터
- 총 발행액 합산, 원본 PDF 링크
- `client_id` FK 기반 클라이언트 필터

### M3 — 견적서 (/estimates)
- 견적서 목록, 상태 배지 (대기/수락/만료)
- PDF 다운로드, `client_id` FK 연결

### M4 — 계약서 (/contracts)
- 계약서 목록, 상태 배지 (서명완료/대기/만료)
- PDF 다운로드, `client_id` FK 연결

### M5 — 클라이언트 포털 (/portal/[token])
- `portal_token` URL 파라미터 무인증 접근
- 클라이언트가 볼 수 있는 데이터: 본인 프로젝트 목록, 견적서, 계약서, 세금계산서
- 만료 처리: `portal_expires_at < now()` → 에러 페이지
- 토큰 갱신: Brian이 설정에서 수동 재발급
- 읽기 전용 (수정 불가)

### M6 — AI 추천 (/ai) — Phase 3
- **Phase 1~2:** "준비 중" 플레이스홀더 페이지 (아이콘 + 설명 텍스트)
- **Phase 3 활성화:** Claude API 연동, 이탈 위험 분석, 업셀 기회 감지, 추천 액션 카드 3개

### M7 — 설정 (/settings)
- Brian 프로필 (이름, 이메일 변경)
- 비밀번호 변경
- Supabase 연결 상태 확인
- 클라이언트 포털 토큰 재발급 UI

### M8 — 클라이언트 관리 (/clients)
**목록 화면**
- 카드뷰 / 테이블뷰 전환
- 필터: 상태(활성/잠재/완료/휴면), 업종, 태그
- 정렬: 최근 미팅일, 총 거래액, 이름
- 검색: 회사명·담당자명·이메일
- 신규 추가 → 슬라이드오버 폼

**상세 화면 탭 구조 (/clients/[id])**
- 개요: 기본 정보 카드 + 최근 활동 피드 + KPI 4개 (총 프로젝트·진행중·총 거래액·미수금)
- 프로젝트: 진행중·완료·보류 목록, 진행률 바, M1 상세로 이동
- 견적/계약: 발행 이력, 상태 배지, PDF 다운로드
- 세금계산서: 발행 이력, 기간 필터, 총액 합산
- 커뮤니케이션: 미팅노트+이메일 타임라인 (날짜 역순, 미팅노트=보라 아이콘, 이메일=파란 아이콘)
- AI 인사이트: Phase 3 활성화 (그 전까지 플레이스홀더)

### M9 — 미팅노트 (/meetings)
**작성 폼 필드 및 유효성**

| 필드 | 방식 | 필수 | 제약 |
|------|------|------|------|
| 미팅 날짜 | Date picker | Y | 기본값: 오늘 |
| 미팅 제목 | Text input | Y | 최대 100자 |
| 클라이언트 | Dropdown | Y | clients 테이블에서 선택 |
| 참석자 | Tag input | N | 자유 입력, 콤마 또는 Enter로 구분, 최대 20명, 이전 입력값 자동완성 제공 |
| 미팅 내용 | TipTap | N | 마크다운 지원 (굵기·목록·코드블록) |
| 미팅 방식 | Chip select | N | 대면 / 화상 / 전화 / 이메일 (4개 고정) |
| 연결 태스크 | Multi-select | N | 기존 태스크 연결 또는 새 태스크 바로 생성 |

**자동저장**
- 30초마다 Supabase upsert (`meeting_notes.id` 기준)
- 첫 저장 시 레코드 생성, 이후 업데이트
- 저장 성공: 상단 바 타임스탬프 "오후 3:21 자동저장됨"
- 저장 실패: 상단 토스트 "임시저장 실패 — 수동 저장 필요"
- 페이지 이탈 시 `isDirty` 플래그 → `beforeunload` 경고

**저장 후 동작:** 완료 토스트 → "태스크 생성할까요?" 확인 모달

---

## 6. DB 스키마 (Supabase)

### 기존 테이블 정의 (참고 — 마이그레이션 기준)

**projects**
```sql
id UUID PK DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
description TEXT,
status TEXT CHECK (status IN ('active','completed','on_hold')) DEFAULT 'active',
progress INT DEFAULT 0,  -- 0~100
client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- v1.1 추가
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

**tasks**
```sql
id UUID PK DEFAULT gen_random_uuid(),
title TEXT NOT NULL CHECK (char_length(title) <= 200),
description TEXT,
status TEXT CHECK (status IN ('todo','in_progress','done','on_hold')) DEFAULT 'todo',
priority TEXT CHECK (priority IN ('high','medium','low')) DEFAULT 'medium',
due_date DATE,
project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

**estimates**
```sql
id UUID PK DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
amount NUMERIC NOT NULL CHECK (amount > 0),
status TEXT CHECK (status IN ('pending','accepted','expired')) DEFAULT 'pending',
pdf_url TEXT,
client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- v1.1 추가
issued_at TIMESTAMPTZ DEFAULT now(),
expires_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT now()
```

**contracts**
```sql
id UUID PK DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
status TEXT CHECK (status IN ('signed','pending','expired')) DEFAULT 'pending',
pdf_url TEXT,
client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- v1.1 추가
signed_at TIMESTAMPTZ,
expires_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT now()
```

**tax_invoices**
```sql
id UUID PK DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
amount NUMERIC NOT NULL,
issued_at TIMESTAMPTZ DEFAULT now(),
pdf_url TEXT,
client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- v1.1 추가
created_at TIMESTAMPTZ DEFAULT now()
```

### 신규 테이블 (v1.1)

**clients**
```sql
id UUID PK DEFAULT gen_random_uuid(),
company_name TEXT NOT NULL CHECK (char_length(company_name) <= 100),
contact_name TEXT NOT NULL CHECK (char_length(contact_name) <= 50),
email TEXT NOT NULL UNIQUE CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
phone TEXT,
industry TEXT,
status TEXT NOT NULL CHECK (status IN ('active','potential','dormant','ended')) DEFAULT 'active',
source TEXT,
portal_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
portal_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
notes TEXT,
first_contract_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

`total_revenue`는 별도 **PostgreSQL View** (`clients_with_revenue`)로 계산:
```sql
CREATE VIEW clients_with_revenue AS
  SELECT c.*, COALESCE(SUM(ti.amount), 0) AS total_revenue
  FROM clients c
  LEFT JOIN tax_invoices ti ON ti.client_id = c.id
  GROUP BY c.id;
```

**meeting_notes**
```sql
id UUID PK DEFAULT gen_random_uuid(),
client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- nullable: 클라이언트 삭제 시 미팅노트 보존
title TEXT NOT NULL CHECK (char_length(title) <= 100),
met_at DATE NOT NULL DEFAULT CURRENT_DATE,
attendees TEXT[] DEFAULT '{}' CHECK (array_length(attendees, 1) IS NULL OR array_length(attendees, 1) <= 20),
method TEXT CHECK (method IN ('in_person','video','phone','email')),
content TEXT,
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

**task_meeting_notes** (조인)
```sql
task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
meeting_note_id UUID REFERENCES meeting_notes(id) ON DELETE CASCADE,
created_at TIMESTAMPTZ DEFAULT now(),
PRIMARY KEY (task_id, meeting_note_id)
```

### pg_trgm 전체 검색 인덱스
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 클라이언트 검색 (회사명·담당자명·이메일)
CREATE INDEX idx_clients_search ON clients
  USING GIN ((company_name || ' ' || contact_name || ' ' || email) gin_trgm_ops);

-- 미팅노트 전문 검색 (내용·참석자)
CREATE INDEX idx_meeting_notes_content ON meeting_notes USING GIN (content gin_trgm_ops);
```

### updated_at 자동 갱신 트리거
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### RLS 정책
```sql
-- 모든 테이블 RLS 활성화
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_meeting_notes ENABLE ROW LEVEL SECURITY;

-- Brian(admin): 전체 CRUD — auth.uid() 기반 역할 확인
CREATE POLICY "admin_all" ON clients FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');
-- (동일 패턴을 나머지 테이블에도 적용)

-- 클라이언트 포털: portal_token 일치하는 본인 레코드만 SELECT
CREATE POLICY "portal_select" ON clients FOR SELECT
  USING (portal_token = (current_setting('request.jwt.claims', true)::json ->> 'portal_token')::uuid
         AND portal_expires_at > now());
```

---

## 7. 사이드바 내비게이션 & 라우트

| 순서 | 메뉴명 | 라우트 | 모듈 | 아이콘 |
|------|--------|--------|------|--------|
| 1 | 홈 | `/` | 홈 대시보드 | SquaresFour |
| 2 | 클라이언트 | `/clients` | M8 | Buildings |
| 3 | 업무관리 | `/tasks` | M1 | Kanban |
| 4 | 미팅노트 | `/meetings` | M9 | NotePencil |
| 5 | 견적서 | `/estimates` | M3 | CurrencyKrw |
| 6 | 계약서 | `/contracts` | M4 | FileText |
| 7 | 세금계산서 | `/invoices` | M2 | Receipt |
| 8 | AI 추천 | `/ai` | M6 | Sparkle |
| — | 설정 | `/settings` | M7 | GearSix |

**모바일 하단 탭바 (5개):** 홈 / 클라이언트 / 업무관리 / 미팅노트 / 더보기

**더보기 (More) 드로어:**
- 하단에서 슬라이드업 Bottom Sheet (shadcn/ui `Sheet` 컴포넌트)
- 포함 항목: 견적서 / 계약서 / 세금계산서 / AI 추천 / 설정
- 닫기: 바깥 영역 탭 또는 아래로 스와이프

---

## 8. 반응형 브레이크포인트

| 구간 | 레이아웃 변화 |
|------|--------------|
| `< 768px` | 사이드바 숨김, 상단 로고바(높이 48px), 하단 탭바(높이 56px), 2열 KPI 그리드, 단일 컬럼 리스트 |
| `768px ~ 1023px` | 64px 아이콘 전용 사이드바, 아이콘 hover → Tooltip으로 메뉴명 표시, 2열 KPI 그리드 |
| `1024px+` | 240px 사이드바(아이콘+텍스트), 4열 KPI 그리드, 다중 컬럼 테이블 |

---

## 9. 개발 로드맵 (15주)

### Phase 1 (3~6주차)
| 주차 | 작업 | 산출물 |
|------|------|--------|
| 3주차 | Next.js 세팅, 레이아웃, Auth, 홈 대시보드, M1 태스크 CRUD | 기본 뼈대 |
| 4주차 | M8 클라이언트 목록+상세, Supabase clients 테이블+RLS | 클라이언트 관리 v1 |
| 5주차 | M9 미팅노트 작성폼+TipTap+태스크 연결 | 미팅노트 모듈 v1 |
| 6주차 | M8 커뮤니케이션 탭 타임라인, pg_trgm 전체 검색, updated_at 트리거 | Phase 1 완료 |

### Phase 2 (7~11주차)
- M2 세금계산서, M3 견적서, M4 계약서, M5 클라이언트 포털

### Phase 3 (12~14주차)
- M6 AI 추천 (Claude API), 대시보드 고도화, 알림 시스템

### Phase 4 (15주차)
- 전체 QA, 성능 최적화, README 작성

---

## 10. 개발 환경 설정

```bash
# 1. 클론 및 의존성
git clone https://github.com/Brrriann/MK_DASH_BD.git
cd MK_DASH_BD
npm install

# 2. Supabase 로컬 실행
supabase start  # supabase CLI 필요

# 3. 환경변수
cp .env.example .env.local  # 값 채우기

# 4. 개발 서버
npm run dev
```

**페이지네이션:** 모든 목록은 서버사이드 페이지네이션 (기본 20건/페이지). 향후 무한스크롤 고려.

---

## 11. 성능 · 코드 원칙

- Server Components 기본, 상호작용 있는 컴포넌트만 `'use client'`
- 무한 애니메이션은 독립 Client Component로 분리 (`React.memo`)
- `h-screen` 대신 `min-h-[100dvh]`
- flex 퍼센트 계산 대신 CSS Grid
- `transform` / `opacity`만 애니메이션 (top/left/width/height 금지)
- Supabase 쿼리: Server Actions 또는 Route Handlers에서 처리
- Next.js 15 Suspense 경계 + 스트리밍으로 로딩 처리
