# 대시보드 전면 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1인 기업 실무 8단계 파이프라인 · 견적/계약/계산서 PDF 생성 · 입금 추적 · AI 문서 초안 · 네비게이션 7항목으로 전면 재설계

**Architecture:** 
서버 API 레이어 분리 — AI/PDF 처리는 Next.js API 라우트에서만, 클라이언트는 내부 라우트만 호출. NVIDIA NIM(`moonshotai/kimi-k2-instruct`) 사용. PDF는 `@react-pdf/renderer` 서버 생성. 네비게이션 7항목: 홈·클라이언트·프로젝트·미팅노트·견적서·계약서·세금계산서.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v3, shadcn/ui, @phosphor-icons/react, @react-pdf/renderer, NVIDIA NIM API, Supabase PostgreSQL + Storage + RLS

---

## File Map

| 파일 | 작업 | 역할 |
|------|------|------|
| `supabase/migrations/008_redesign.sql` | **Create** | projects·estimates·contracts·invoices 신규 컬럼 |
| `supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql` | **Modify** | 008 내용 하단 추가 |
| `src/lib/types.ts` | **Modify** | PipelineStage·ServiceType enum, Project·Estimate·Contract·TaxInvoice 타입 업데이트 |
| `src/lib/actions/projects.ts` | **Modify** | CreateProjectInput에 새 필드 추가 |
| `src/lib/actions/estimates.ts` | **Create** | CRUD + EstimateItem 타입 |
| `src/lib/actions/contracts.ts` | **Create** | CRUD + 입금추적 필드 |
| `src/lib/actions/invoices.ts` | **Create** | CRUD + 입금추적 필드 |
| `src/lib/nvidia.ts` | **Create** | NVIDIA NIM 공통 헬퍼 (60s timeout) |
| `src/lib/pdf/estimate-template.tsx` | **Create** | @react-pdf/renderer 견적서 템플릿 |
| `src/lib/pdf/contract-template.tsx` | **Create** | @react-pdf/renderer 계약서 템플릿 |
| `src/lib/pdf/invoice-template.tsx` | **Create** | @react-pdf/renderer 세금계산서 서식 템플릿 |
| `src/components/layout/Sidebar.tsx` | **Modify** | 7항목 네비게이션 (MeetingNote·Estimates·Contracts·Invoices 추가) |
| `src/components/layout/MobileBottomNav.tsx` | **Modify** | 모바일 하단 네비 업데이트 |
| `src/components/projects/ProjectFormDialog.tsx` | **Modify** | pipeline_stage·service_type·계약금액·입금추적·deadline·source_channel 추가 |
| `src/app/(dashboard)/projects/page.tsx` | **Modify** | 칸반 8단계 뷰 + 리스트 뷰 전환 |
| `src/components/estimates/EstimateFormDialog.tsx` | **Modify** | line_items·VAT·discount·AI초안·PDF버튼 |
| `src/components/contracts/ContractFormDialog.tsx` | **Modify** | 입금추적·AI계약서·PDF버튼 |
| `src/components/invoices/InvoiceFormDialog.tsx` | **Modify** | 입금추적·PDF버튼 |
| `src/app/(dashboard)/estimates/page.tsx` | **Modify** | 테이블 뷰 개선 |
| `src/app/(dashboard)/contracts/page.tsx` | **Modify** | 테이블 뷰 개선 |
| `src/app/(dashboard)/invoices/page.tsx` | **Modify** | 테이블 뷰 개선 |
| `src/app/(dashboard)/meetings/new/page.tsx` | **Modify** | AI 회의록 작성 섹션 추가 |
| `src/app/(dashboard)/page.tsx` | **Modify** | 파이프라인 현황·미수금·매출·마감임박·채널 분석 |
| `src/app/api/ai/meeting-note/route.ts` | **Create** | 키워드 → 회의록 AI |
| `src/app/api/ai/estimate/route.ts` | **Create** | 작업내용 → 견적 품목 AI |
| `src/app/api/ai/contract/route.ts` | **Create** | 계약조건 → 계약서 본문 AI |
| `src/app/api/pdf/estimate/route.ts` | **Create** | 견적서 PDF 생성 + Supabase Storage |
| `src/app/api/pdf/contract/route.ts` | **Create** | 계약서 PDF 생성 + Supabase Storage |
| `src/app/api/pdf/invoice/route.ts` | **Create** | 세금계산서 PDF 생성 + Supabase Storage |

---

### Task 1: DB 마이그레이션 008

**Files:**
- Create: `supabase/migrations/008_redesign.sql`
- Modify: `supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql`

- [ ] **Step 1: `supabase/migrations/008_redesign.sql` 작성**

```sql
-- 008_redesign.sql
-- 프로젝트: 8단계 파이프라인 + 서비스유형 + 입금추적 + 마감일 + 유입채널
DO $$ BEGIN
  CREATE TYPE pipeline_stage AS ENUM (
    '상담', '견적', '계약', '계산서발행', '계약입금', '착수', '납품', '완납'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_type AS ENUM (
    '명함', '로고', '웹사이트', '쇼핑몰', '앱', '광고소재', 'SNS관리', '영상편집', '기타'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_channel AS ENUM (
    '숨고', '크몽', '위시캣', '라우드소싱', 'Fiverr', '직접문의', '재구매', '기타'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pipeline_stage pipeline_stage NOT NULL DEFAULT '상담',
  ADD COLUMN IF NOT EXISTS service_type service_type,
  ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS deposit_ratio INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_paid_at DATE,
  ADD COLUMN IF NOT EXISTS final_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_paid_at DATE,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS source_channel source_channel;

-- 견적서: 품목 목록 + VAT + 할인 + 프로젝트 연결
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS include_vat BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_ratio INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 계약서: 입금추적 + 계약내용 + 프로젝트 연결
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_paid_at DATE,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS final_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_paid_at DATE,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 세금계산서: 입금추적 + 프로젝트 연결
ALTER TABLE tax_invoices
  ADD COLUMN IF NOT EXISTS payment_received BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_received_at DATE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
```

- [ ] **Step 2: ALL_IN_ONE 파일 하단에 동일 SQL 추가**

`supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql` 맨 끝에 추가:
```sql
-- ===== 008: REDESIGN =====
-- (위 008_redesign.sql 내용 그대로 붙여넣기)
```

- [ ] **Step 3: Supabase SQL Editor에서 실행**

로컬 또는 프로덕션 Supabase 대시보드 → SQL Editor에 008_redesign.sql 내용 붙여넣고 실행.
Expected: ALTER TABLE 4개 성공 메시지.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/008_redesign.sql supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql
git commit -m "feat: migration 008 - pipeline stages, payment tracking, line items"
```

---

### Task 2: Types + Actions 업데이트

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/actions/projects.ts`
- Create: `src/lib/actions/estimates.ts`
- Create: `src/lib/actions/contracts.ts`
- Create: `src/lib/actions/invoices.ts`

- [ ] **Step 1: types.ts 현재 파일 읽기**

`src/lib/types.ts` 전체 읽기.

- [ ] **Step 2: types.ts 업데이트**

기존 `ProjectStatus` 아래에 새 enum 추가:
```ts
export type PipelineStage = '상담' | '견적' | '계약' | '계산서발행' | '계약입금' | '착수' | '납품' | '완납';
export type ServiceType = '명함' | '로고' | '웹사이트' | '쇼핑몰' | '앱' | '광고소재' | 'SNS관리' | '영상편집' | '기타';
export type SourceChannel = '숨고' | '크몽' | '위시캣' | '라우드소싱' | 'Fiverr' | '직접문의' | '재구매' | '기타';
```

`Project` 인터페이스에 새 필드 추가:
```ts
export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  client_id: string | null;
  pipeline_stage: PipelineStage;
  service_type: ServiceType | null;
  contract_amount: number | null;
  deposit_ratio: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  final_paid: boolean;
  final_paid_at: string | null;
  deadline: string | null;
  source_channel: SourceChannel | null;
  created_at: string;
  updated_at: string;
}
```

`EstimateItem` 인터페이스 추가 (없으면):
```ts
export interface EstimateItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
}
```

`Estimate` 인터페이스 업데이트:
```ts
export interface Estimate {
  id: string;
  title: string;
  amount: number;
  status: EstimateStatus;
  pdf_url: string | null;
  client_id: string | null;
  issued_at: string;
  expires_at: string | null;
  line_items: EstimateItem[];
  include_vat: boolean;
  discount_amount: number;
  deposit_ratio: number | null;
  project_id: string | null;
  description: string | null;
  created_at: string;
}
```

`Contract` 인터페이스 업데이트:
```ts
export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  pdf_url: string | null;
  client_id: string | null;
  signed_at: string | null;
  expires_at: string | null;
  contract_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  final_amount: number | null;
  final_paid: boolean;
  final_paid_at: string | null;
  terms: string | null;
  project_id: string | null;
  created_at: string;
}
```

`TaxInvoice` 인터페이스 업데이트:
```ts
// 기존 TaxInvoice에 추가
  payment_received: boolean;
  payment_received_at: string | null;
  project_id: string | null;
```

- [ ] **Step 3: actions/projects.ts 업데이트**

`CreateProjectInput` 타입에 새 필드 추가:
```ts
export type CreateProjectInput = {
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  progress?: number;
  client_id?: string | null;
  pipeline_stage?: PipelineStage;
  service_type?: ServiceType | null;
  contract_amount?: number | null;
  deposit_ratio?: number;
  deposit_paid?: boolean;
  deposit_paid_at?: string | null;
  final_paid?: boolean;
  final_paid_at?: string | null;
  deadline?: string | null;
  source_channel?: SourceChannel | null;
};
```

`createProject`, `updateProject` insert/update 객체에 새 필드들 그대로 스프레드 (`...data`).

- [ ] **Step 4: `src/lib/actions/estimates.ts` 작성**

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import type { Estimate, EstimateItem, EstimateStatus } from "@/lib/types";

export type CreateEstimateInput = {
  title: string;
  amount: number;
  status?: EstimateStatus;
  client_id?: string | null;
  issued_at?: string;
  expires_at?: string | null;
  line_items?: EstimateItem[];
  include_vat?: boolean;
  discount_amount?: number;
  deposit_ratio?: number | null;
  project_id?: string | null;
  description?: string | null;
};

export async function fetchEstimates(): Promise<Estimate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Estimate[];
}

export async function fetchEstimate(id: string): Promise<Estimate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  return data as Estimate;
}

export async function createEstimate(input: CreateEstimateInput): Promise<Estimate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      ...input,
      line_items: input.line_items ?? [],
      include_vat: input.include_vat ?? true,
      discount_amount: input.discount_amount ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Estimate;
}

export async function updateEstimate(id: string, input: Partial<CreateEstimateInput>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("estimates")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEstimate(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("estimates").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 5: `src/lib/actions/contracts.ts` 작성**

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import type { Contract, ContractStatus } from "@/lib/types";

export type CreateContractInput = {
  title: string;
  status?: ContractStatus;
  client_id?: string | null;
  signed_at?: string | null;
  expires_at?: string | null;
  contract_amount?: number | null;
  deposit_amount?: number | null;
  deposit_paid?: boolean;
  deposit_paid_at?: string | null;
  final_amount?: number | null;
  final_paid?: boolean;
  final_paid_at?: string | null;
  terms?: string | null;
  project_id?: string | null;
};

export async function fetchContracts(): Promise<Contract[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contract[];
}

export async function createContract(input: CreateContractInput): Promise<Contract> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .insert({ ...input })
    .select()
    .single();
  if (error) throw error;
  return data as Contract;
}

export async function updateContract(id: string, input: Partial<CreateContractInput>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteContract(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 6: `src/lib/actions/invoices.ts` 작성**

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import type { TaxInvoice } from "@/lib/types";

export type CreateInvoiceInput = {
  title: string;
  amount: number;
  items?: Array<{ name: string; qty: number; unit_price: number }>;
  supply_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  issued_at?: string;
  pdf_url?: string | null;
  memo?: string | null;
  client_id?: string | null;
  payment_received?: boolean;
  payment_received_at?: string | null;
  project_id?: string | null;
};

export async function fetchInvoices(): Promise<TaxInvoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_invoices")
    .select("*")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaxInvoice[];
}

export async function createInvoice(input: CreateInvoiceInput): Promise<TaxInvoice> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_invoices")
    .insert({ ...input })
    .select()
    .single();
  if (error) throw error;
  return data as TaxInvoice;
}

export async function updateInvoice(id: string, input: Partial<CreateInvoiceInput>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tax_invoices")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tax_invoices").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 7: TypeScript 확인**

```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 8: 커밋**

```bash
git add src/lib/types.ts src/lib/actions/
git commit -m "feat: update types and add estimate/contract/invoice actions"
```

---

### Task 3: 네비게이션 7항목 재구성

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/MobileBottomNav.tsx`
- Modify: `src/components/layout/MobileTopBar.tsx` (있으면)

- [ ] **Step 1: Sidebar.tsx 전체 읽기**

현재 nav items 배열 위치 파악.

- [ ] **Step 2: nav items 업데이트**

아이콘: `@phosphor-icons/react`에서 import:
- `SquaresFour` (홈)
- `Buildings` (클라이언트)
- `Kanban` (프로젝트)
- `NotePencil` (미팅노트)
- `FileText` (견적서)
- `FileSignature` → `Signature` 또는 `Scroll` (계약서)
- `Receipt` (세금계산서)

Nav items 배열:
```tsx
const NAV_ITEMS = [
  { href: "/", label: "홈", icon: SquaresFour },
  { href: "/clients", label: "클라이언트", icon: Buildings },
  { href: "/projects", label: "프로젝트", icon: Kanban },
  { href: "/meetings", label: "미팅노트", icon: NotePencil },
  { href: "/estimates", label: "견적서", icon: FileText },
  { href: "/contracts", label: "계약서", icon: Scroll },
  { href: "/invoices", label: "세금계산서", icon: Receipt },
];
```

Settings는 하단에 별도 위치 유지.

- [ ] **Step 3: MobileBottomNav.tsx 읽기 및 업데이트**

모바일 하단 네비는 공간 제한으로 5개만 표시: 홈·클라이언트·프로젝트·견적서·더보기(drawer).

- [ ] **Step 4: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/components/layout/
git commit -m "feat: expand navigation to 7 items - projects, meetings, estimates, contracts, invoices"
```

---

### Task 4: ProjectFormDialog 개편 (파이프라인 + 입금추적)

**Files:**
- Modify: `src/components/projects/ProjectFormDialog.tsx`

- [ ] **Step 1: 현재 파일 전체 읽기**

`src/components/projects/ProjectFormDialog.tsx` 전체 읽기 — 현재 폼 필드 파악.

- [ ] **Step 2: 새 상태 추가**

기존 상태 외 추가:
```tsx
const [pipelineStage, setPipelineStage] = useState<PipelineStage>("상담");
const [serviceType, setServiceType] = useState<ServiceType | "">("");
const [contractAmount, setContractAmount] = useState("");
const [depositRatio, setDepositRatio] = useState("50");
const [depositPaid, setDepositPaid] = useState(false);
const [depositPaidAt, setDepositPaidAt] = useState("");
const [finalPaid, setFinalPaid] = useState(false);
const [finalPaidAt, setFinalPaidAt] = useState("");
const [deadline, setDeadline] = useState("");
const [sourceChannel, setSourceChannel] = useState<SourceChannel | "">("");
```

- [ ] **Step 3: useEffect 초기화 업데이트**

project prop 있을 때 새 필드 초기화.

- [ ] **Step 4: handleSubmit 업데이트**

CreateProjectInput에 새 필드 포함:
```tsx
pipeline_stage: pipelineStage,
service_type: serviceType || null,
contract_amount: contractAmount ? Number(contractAmount) : null,
deposit_ratio: Number(depositRatio) || 50,
deposit_paid: depositPaid,
deposit_paid_at: depositPaidAt || null,
final_paid: finalPaid,
final_paid_at: finalPaidAt || null,
deadline: deadline || null,
source_channel: sourceChannel || null,
```

- [ ] **Step 5: 폼 JSX 업데이트**

기존 필드 유지하고, 새 섹션 추가:

**파이프라인 단계** (Select):
```tsx
<Select value={pipelineStage} onValueChange={(v) => setPipelineStage(v as PipelineStage)}>
  {['상담','견적','계약','계산서발행','계약입금','착수','납품','완납'].map(s => (
    <SelectItem key={s} value={s}>{s}</SelectItem>
  ))}
</Select>
```

**서비스 유형** (Select, 선택사항):
```tsx
{['명함','로고','웹사이트','쇼핑몰','앱','광고소재','SNS관리','영상편집','기타']}
```

**계약금액** (number input):
```tsx
<Input type="number" value={contractAmount} onChange={...} placeholder="계약 금액 (원)" />
```

**계약금/잔금 입금 추적** (2개 그룹):
```tsx
{/* 계약금 */}
<div className="flex items-center gap-3">
  <input type="checkbox" checked={depositPaid} onChange={...} />
  <label>계약금 입금 완료</label>
  {depositPaid && <Input type="date" value={depositPaidAt} onChange={...} />}
</div>
{/* 잔금 */}
<div className="flex items-center gap-3">
  <input type="checkbox" checked={finalPaid} onChange={...} />
  <label>잔금 입금 완료</label>
  {finalPaid && <Input type="date" value={finalPaidAt} onChange={...} />}
</div>
```

**마감일** + **유입 채널** (Select):
```tsx
{['숨고','크몽','위시캣','라우드소싱','Fiverr','직접문의','재구매','기타']}
```

- [ ] **Step 6: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/components/projects/ProjectFormDialog.tsx
git commit -m "feat: add pipeline stage, payment tracking, and service type to ProjectFormDialog"
```

---

### Task 5: 프로젝트 칸반 뷰 (8단계)

**Files:**
- Modify: `src/app/(dashboard)/projects/page.tsx`

현재 projects 페이지는 리스트 뷰. 8단계 칸반 뷰 추가 + 뷰 전환 버튼.

- [ ] **Step 1: 현재 파일 전체 읽기**

`src/app/(dashboard)/projects/page.tsx` 전체 읽기.

- [ ] **Step 2: 상태 추가**

```tsx
const [view, setView] = useState<"list" | "kanban">("kanban");
```

- [ ] **Step 3: 칸반 뷰 컴포넌트 구현**

페이지 파일 내 `KanbanView` 인라인 컴포넌트:

```tsx
const STAGES: PipelineStage[] = ['상담','견적','계약','계산서발행','계약입금','착수','납품','완납'];

function KanbanView({ projects }: { projects: Project[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map(stage => {
        const stageProjects = projects.filter(p => p.pipeline_stage === stage);
        const totalAmount = stageProjects.reduce((s, p) => s + (p.contract_amount ?? 0), 0);
        return (
          <div key={stage} className="flex-shrink-0 w-56">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-slate-600">{stage}</span>
              <span className="text-xs text-slate-400">{stageProjects.length}</span>
            </div>
            {totalAmount > 0 && (
              <p className="text-xs text-slate-400 mb-2 px-1">
                {totalAmount.toLocaleString('ko-KR')}원
              </p>
            )}
            <div className="flex flex-col gap-2">
              {stageProjects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{p.title}</p>
                    {p.contract_amount && (
                      <p className="text-xs text-slate-500 mt-1">{p.contract_amount.toLocaleString('ko-KR')}원</p>
                    )}
                    {p.deadline && (
                      <p className="text-xs text-slate-400 mt-1">마감: {p.deadline}</p>
                    )}
                    <div className="flex gap-1 mt-2">
                      {p.deposit_paid && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">계약금✓</span>}
                      {p.final_paid && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">잔금✓</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 뷰 전환 버튼 + 조건 렌더링**

헤더에 뷰 전환 버튼 추가, 리스트/칸반 조건 렌더링.

- [ ] **Step 5: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/app/(dashboard)/projects/page.tsx
git commit -m "feat: add 8-stage kanban view to projects page with payment status badges"
```

---

### Task 6: NVIDIA NIM 헬퍼 + AI 라우트 3개

**Files:**
- Create: `src/lib/nvidia.ts`
- Create: `src/app/api/ai/meeting-note/route.ts`
- Create: `src/app/api/ai/estimate/route.ts`
- Create: `src/app/api/ai/contract/route.ts`

- [ ] **Step 1: `src/lib/nvidia.ts` 작성**

```ts
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "moonshotai/kimi-k2-instruct";

export interface NvidiaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callNvidia(
  messages: NvidiaMessage[],
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.3,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("NVIDIA API error:", text);
      throw new Error("AI 서비스 오류가 발생했습니다.");
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 2: `src/app/api/ai/meeting-note/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callNvidia } from "@/lib/nvidia";

const SYSTEM_PROMPT = `당신은 한국어 비즈니스 회의록 작성 전문가입니다.
사용자가 제공하는 키워드와 메모를 바탕으로 정식 회의록을 작성하세요.
반드시 다음 형식을 따르세요:

## 회의 개요
(날짜, 참석자, 미팅 방식 등)

## 주요 논의 내용
(불릿 포인트로 구체적으로)

## 결정 사항
(불릿 포인트)

## 액션아이템
(담당자와 기한 포함)

## 다음 미팅 안건
(예정 사항)

전문적이고 명확한 한국어로 작성하세요.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { keywords, clientName, metAt } = body as { keywords?: unknown; clientName?: unknown; metAt?: unknown };
  if (typeof keywords !== "string" || keywords.trim().length === 0)
    return NextResponse.json({ error: "keywords 필드가 필요합니다." }, { status: 400 });
  if (keywords.length > 2000)
    return NextResponse.json({ error: "keywords는 2,000자 이하여야 합니다." }, { status: 400 });

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    metAt ? `미팅일: ${String(metAt).slice(0, 20)}` : null,
    `키워드/메모:\n${keywords.trim()}`,
  ].filter(Boolean).join("\n");

  try {
    const content = await callNvidia([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);
    return NextResponse.json({ content });
  } catch (err) {
    console.error("meeting-note AI error:", err);
    return NextResponse.json({ error: "AI 처리 중 오류가 발생했습니다." }, { status: 502 });
  }
}
```

- [ ] **Step 3: `src/app/api/ai/estimate/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callNvidia } from "@/lib/nvidia";

const SYSTEM_PROMPT = `당신은 한국 IT/디지털 프리랜서 견적서 작성 전문가입니다.
클라이언트 정보와 작업 설명을 바탕으로 견적 품목 목록을 JSON 형식으로 반환하세요.
반드시 다음 JSON 형식만 반환하세요 (다른 텍스트 없이):
{
  "items": [
    { "name": "품목명", "quantity": 1, "unit_price": 1000000 }
  ]
}
규칙:
- 품목명은 구체적이고 명확하게
- 단가는 한국 시장 기준 현실적인 금액 (원 단위, 정수)
- 수량은 1 이상의 정수
- 최대 10개 품목`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientName, description } = body as { clientName?: unknown; description?: unknown };
  if (typeof description !== "string" || description.trim().length === 0)
    return NextResponse.json({ error: "description 필드가 필요합니다." }, { status: 400 });
  if (description.length > 1000)
    return NextResponse.json({ error: "description은 1,000자 이하여야 합니다." }, { status: 400 });

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    `작업 내용: ${description.trim()}`,
  ].filter(Boolean).join("\n");

  try {
    const raw = await callNvidia(
      [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMessage }],
      { jsonMode: true, temperature: 0.2 }
    );
    let parsed: { items: Array<{ name: string; quantity: number; unit_price: number }> };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      return NextResponse.json({ error: "AI 응답을 파싱할 수 없습니다." }, { status: 422 });
    }
    if (!Array.isArray(parsed.items) || parsed.items.length === 0)
      return NextResponse.json({ error: "AI가 품목을 생성하지 못했습니다." }, { status: 422 });

    const items = parsed.items.slice(0, 10).map(item => ({
      name: String(item.name ?? "").slice(0, 100),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      unit_price: Math.max(0, Math.floor(Number(item.unit_price) || 0)),
      supply_amount: Math.max(1, Math.floor(Number(item.quantity) || 1)) * Math.max(0, Math.floor(Number(item.unit_price) || 0)),
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("estimate AI error:", err);
    return NextResponse.json({ error: "AI 처리 중 오류가 발생했습니다." }, { status: 502 });
  }
}
```

- [ ] **Step 4: `src/app/api/ai/contract/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callNvidia } from "@/lib/nvidia";

const SYSTEM_PROMPT = `당신은 한국 IT/디지털 프리랜서 계약서 작성 전문가입니다.
제공된 계약 조건을 바탕으로 전문적인 한국어 프리랜서 용역 계약서를 작성하세요.
반드시 다음 항목을 포함하세요:
1. 계약의 목적
2. 용역의 범위 및 내용
3. 계약 기간
4. 계약 금액 및 지급 조건
5. 저작권 및 지식재산권
6. 비밀유지 의무
7. 계약 해지 조건
8. 손해배상
9. 기타 특약 사항
전문적이고 명확한 법률 문체의 한국어로 작성하세요.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientName, amount, startDate, endDate, scope, notes } = body as {
    clientName?: unknown; amount?: unknown; startDate?: unknown; endDate?: unknown; scope?: unknown; notes?: unknown;
  };

  if (typeof scope !== "string" || scope.trim().length === 0)
    return NextResponse.json({ error: "scope 필드가 필요합니다." }, { status: 400 });
  if (scope.length > 1000)
    return NextResponse.json({ error: "scope는 1,000자 이하여야 합니다." }, { status: 400 });

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    amount ? `계약 금액: ${Number(amount).toLocaleString("ko-KR")}원` : null,
    startDate ? `계약 시작일: ${String(startDate).slice(0, 20)}` : null,
    endDate ? `계약 종료일: ${String(endDate).slice(0, 20)}` : null,
    `작업 범위: ${scope.trim()}`,
    notes ? `특이사항: ${String(notes).slice(0, 500)}` : null,
  ].filter(Boolean).join("\n");

  try {
    const content = await callNvidia(
      [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMessage }],
      { maxTokens: 3000 }
    );
    return NextResponse.json({ content });
  } catch (err) {
    console.error("contract AI error:", err);
    return NextResponse.json({ error: "AI 처리 중 오류가 발생했습니다." }, { status: 502 });
  }
}
```

- [ ] **Step 5: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/lib/nvidia.ts src/app/api/ai/
git commit -m "feat: add NVIDIA NIM helper and AI routes for meeting-note, estimate, contract"
```

---

### Task 7: EstimateFormDialog 전면 개편

**Files:**
- Modify: `src/components/estimates/EstimateFormDialog.tsx`

현재 폼: title, amount(단일), status, client, issued_at, expires_at, pdf_url.
변경 후: AI 초안 + line_items 품목 테이블 + VAT + 할인 + 합계자동계산 + PDF 버튼. pdf_url 수동입력 제거.

- [ ] **Step 1: 현재 파일 전체 읽기**

`src/components/estimates/EstimateFormDialog.tsx` 전체 읽기.

- [ ] **Step 2: import 업데이트**

```tsx
import { Plus, Trash, Sparkle } from "@phosphor-icons/react";
import type { EstimateItem } from "@/lib/types";
import { createEstimate, updateEstimate } from "@/lib/actions/estimates";
```

- [ ] **Step 3: 상태 추가**

```tsx
const EMPTY_ITEM = (): EstimateItem => ({ name: "", quantity: 1, unit_price: 0, supply_amount: 0 });
const [lineItems, setLineItems] = useState<EstimateItem[]>([EMPTY_ITEM()]);
const [includeVat, setIncludeVat] = useState(true);
const [discountAmount, setDiscountAmount] = useState("0");
const [description, setDescription] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");
const [pdfLoading, setPdfLoading] = useState(false);
```

- [ ] **Step 4: 계산 로직 추가**

```tsx
const supplySubtotal = lineItems.reduce((s, i) => s + i.supply_amount, 0);
const discount = Number(discountAmount) || 0;
const supplyAmount = Math.max(0, supplySubtotal - discount);
const vatAmount = includeVat ? Math.round(supplyAmount * 0.1) : 0;
const totalAmount = supplyAmount + vatAmount;

function updateItem(idx: number, field: keyof EstimateItem, value: string | number) {
  setLineItems(prev => {
    const next = [...prev];
    const item = { ...next[idx] };
    if (field === "name") item.name = value as string;
    else {
      const n = typeof value === "string" ? Number(value) || 0 : value;
      if (field === "quantity") item.quantity = Math.max(1, n);
      if (field === "unit_price") item.unit_price = Math.max(0, n);
      item.supply_amount = item.quantity * item.unit_price;
    }
    next[idx] = item;
    return next;
  });
}

async function handleAiDraft() {
  if (!description.trim()) return;
  setAiLoading(true); setAiError("");
  try {
    const res = await fetch("/api/ai/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: description.trim() }),
    });
    const json = await res.json();
    if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
    setLineItems(json.items);
  } catch { setAiError("네트워크 오류"); }
  finally { setAiLoading(false); }
}

async function handlePdfIssue() {
  if (!estimate?.id) return;
  setPdfLoading(true);
  try {
    const res = await fetch("/api/pdf/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estimateId: estimate.id }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "PDF 오류"); return; }
    window.open(json.url, "_blank");
  } catch { setError("PDF 생성 오류"); }
  finally { setPdfLoading(false); }
}
```

- [ ] **Step 5: handleSubmit 업데이트**

createEstimate/updateEstimate 호출 시:
```tsx
line_items: lineItems,
include_vat: includeVat,
discount_amount: discount,
amount: totalAmount,
description: description.trim() || null,
```

- [ ] **Step 6: JSX 업데이트**

1. pdf_url Input 제거
2. title 위에 AI 섹션 추가 (파란 박스)
3. 품목 테이블 추가 (grid: 1fr 60px 100px 100px auto - 품목명·수량·단가·공급가액·삭제)
4. VAT 토글 + 할인금액 input + 합계 표시 (3줄)
5. DialogFooter에 PDF 버튼 (수정 모드만)

- [ ] **Step 7: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/components/estimates/EstimateFormDialog.tsx
git commit -m "feat: overhaul EstimateFormDialog - line items, VAT, discount, AI draft, PDF button"
```

---

### Task 8: ContractFormDialog 개편 (입금추적 + AI + PDF)

**Files:**
- Modify: `src/components/contracts/ContractFormDialog.tsx`

현재 폼: title, status, client, signed_at, expires_at, pdf_url.
변경 후: 계약금액·입금추적·AI 계약서 작성·계약서 본문 텍스트에어리어·PDF 버튼.

- [ ] **Step 1: 현재 파일 전체 읽기**

- [ ] **Step 2: 상태 추가**

```tsx
const [contractAmount, setContractAmount] = useState("");
const [depositAmount, setDepositAmount] = useState("");
const [depositPaid, setDepositPaid] = useState(false);
const [depositPaidAt, setDepositPaidAt] = useState("");
const [finalAmount, setFinalAmount] = useState("");
const [finalPaid, setFinalPaid] = useState(false);
const [finalPaidAt, setFinalPaidAt] = useState("");
const [terms, setTerms] = useState("");
const [scope, setScope] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");
const [pdfLoading, setPdfLoading] = useState(false);
```

- [ ] **Step 3: AI + PDF 핸들러**

```tsx
async function handleAiWrite() {
  if (!scope.trim()) return;
  setAiLoading(true); setAiError("");
  try {
    const res = await fetch("/api/ai/contract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: scope.trim(),
        amount: contractAmount ? Number(contractAmount) : undefined,
        startDate: signedAt || undefined,
        endDate: expiresAt || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
    setTerms(json.content);
  } catch { setAiError("네트워크 오류"); }
  finally { setAiLoading(false); }
}

async function handlePdfIssue() {
  if (!contract?.id) return;
  setPdfLoading(true);
  try {
    const res = await fetch("/api/pdf/contract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId: contract.id }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "PDF 오류"); return; }
    window.open(json.url, "_blank");
  } catch { setError("PDF 생성 오류"); }
  finally { setPdfLoading(false); }
}
```

- [ ] **Step 4: handleSubmit 업데이트**

```tsx
contract_amount: contractAmount ? Number(contractAmount) : null,
deposit_amount: depositAmount ? Number(depositAmount) : null,
deposit_paid: depositPaid,
deposit_paid_at: depositPaidAt || null,
final_amount: finalAmount ? Number(finalAmount) : null,
final_paid: finalPaid,
final_paid_at: finalPaidAt || null,
terms: terms.trim() || null,
```

- [ ] **Step 5: JSX 업데이트**

1. pdf_url Input 제거
2. title 아래에: 계약금액·계약금(입금체크+날짜)·잔금(입금체크+날짜) 섹션
3. AI 작성 섹션 (파란 박스, scope textarea + 버튼)
4. 계약서 본문 Textarea (12줄, resize-y)
5. DialogFooter에 PDF 버튼 (수정 모드 + terms 있을 때)

- [ ] **Step 6: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/components/contracts/ContractFormDialog.tsx
git commit -m "feat: overhaul ContractFormDialog - payment tracking, AI writer, PDF button"
```

---

### Task 9: InvoiceFormDialog 입금추적 + PDF 버튼 추가

**Files:**
- Modify: `src/components/invoices/InvoiceFormDialog.tsx`

현재 구현: 품목입력·공급가액·세액 자동계산·볼타 발행 버튼 있음.
추가: 입금여부 체크박스 + 입금일 + PDF 발행 버튼.

- [ ] **Step 1: 현재 파일 전체 읽기**

- [ ] **Step 2: 상태 추가**

```tsx
const [paymentReceived, setPaymentReceived] = useState(false);
const [paymentReceivedAt, setPaymentReceivedAt] = useState("");
const [pdfLoading, setPdfLoading] = useState(false);
```

- [ ] **Step 3: PDF 핸들러**

```tsx
async function handlePdfIssue() {
  if (!invoice?.id) return;
  setPdfLoading(true);
  try {
    const res = await fetch("/api/pdf/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: invoice.id }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "PDF 오류"); return; }
    window.open(json.url, "_blank");
  } catch { setError("PDF 생성 오류"); }
  finally { setPdfLoading(false); }
}
```

- [ ] **Step 4: handleSubmit 업데이트**

```tsx
payment_received: paymentReceived,
payment_received_at: paymentReceivedAt || null,
```

- [ ] **Step 5: JSX 업데이트**

볼타 발행 버튼 위에 입금 추적 섹션 추가:
```tsx
<div className="flex items-center gap-3 pt-2 border-t border-slate-100">
  <input type="checkbox" id="payment" checked={paymentReceived} onChange={e => setPaymentReceived(e.target.checked)} className="rounded" />
  <Label htmlFor="payment" className="text-sm">입금 완료</Label>
  {paymentReceived && (
    <Input type="date" value={paymentReceivedAt} onChange={e => setPaymentReceivedAt(e.target.value)} className="w-40 font-outfit" />
  )}
</div>
```

DialogFooter에 PDF 버튼 (수정 모드만):
```tsx
{isEdit && (
  <Button type="button" onClick={handlePdfIssue} disabled={pdfLoading} variant="outline" className="font-outfit">
    {pdfLoading ? "생성 중..." : "서식 PDF"}
  </Button>
)}
```

- [ ] **Step 6: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/components/invoices/InvoiceFormDialog.tsx
git commit -m "feat: add payment tracking and PDF button to InvoiceFormDialog"
```

---

### Task 10: @react-pdf/renderer 설치 + PDF 템플릿 3개

**Files:**
- Create: `src/lib/pdf/estimate-template.tsx`
- Create: `src/lib/pdf/contract-template.tsx`
- Create: `src/lib/pdf/invoice-template.tsx`

- [ ] **Step 1: 패키지 설치**

```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: `src/lib/pdf/estimate-template.tsx` 작성**

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { EstimateItem } from "@/lib/types";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1e293b" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 20 },
  twoCol: { flexDirection: "row", gap: 20, marginBottom: 16 },
  col: { flex: 1 },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 3 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 90, color: "#64748b" },
  value: { flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8fafc", padding: "5 6", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", padding: "5 6", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  col1: { flex: 3 }, col2: { flex: 1, textAlign: "center" }, col3: { flex: 1.5, textAlign: "right" }, col4: { flex: 1.5, textAlign: "right" },
  totalSection: { marginTop: 8, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", marginBottom: 2 },
  totalLabel: { width: 80, color: "#64748b", textAlign: "right", marginRight: 8 },
  totalValue: { width: 90, textAlign: "right" },
  grandTotal: { fontSize: 12, fontWeight: "bold", color: "#2563eb" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 9, color: "#94a3b8", textAlign: "center" },
});

const krw = (n: number) => n.toLocaleString("ko-KR") + "원";

interface EstimatePdfProps {
  title: string;
  issuedAt: string;
  expiresAt?: string | null;
  items: EstimateItem[];
  includeVat: boolean;
  discountAmount: number;
  supplierName: string;
  supplierRegNo?: string;
  supplierEmail?: string;
  clientName?: string;
  clientContact?: string;
  clientEmail?: string;
}

export function EstimatePdf(props: EstimatePdfProps) {
  const sub = props.items.reduce((s, i) => s + i.supply_amount, 0);
  const supply = Math.max(0, sub - props.discountAmount);
  const vat = props.includeVat ? Math.round(supply * 0.1) : 0;
  const total = supply + vat;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>견 적 서</Text>
        <Text style={styles.subtitle}>{props.title}</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>공급자</Text>
            <View style={styles.row}><Text style={styles.label}>상호</Text><Text style={styles.value}>{props.supplierName}</Text></View>
            {props.supplierRegNo && <View style={styles.row}><Text style={styles.label}>사업자번호</Text><Text style={styles.value}>{props.supplierRegNo}</Text></View>}
            {props.supplierEmail && <View style={styles.row}><Text style={styles.label}>이메일</Text><Text style={styles.value}>{props.supplierEmail}</Text></View>}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>수신</Text>
            {props.clientName && <View style={styles.row}><Text style={styles.label}>상호</Text><Text style={styles.value}>{props.clientName}</Text></View>}
            {props.clientContact && <View style={styles.row}><Text style={styles.label}>담당자</Text><Text style={styles.value}>{props.clientContact}</Text></View>}
            {props.clientEmail && <View style={styles.row}><Text style={styles.label}>이메일</Text><Text style={styles.value}>{props.clientEmail}</Text></View>}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 20, marginBottom: 16 }}>
          <View style={styles.row}><Text style={styles.label}>발행일</Text><Text>{props.issuedAt}</Text></View>
          {props.expiresAt && <View style={styles.row}><Text style={styles.label}>유효기간</Text><Text>{props.expiresAt}</Text></View>}
        </View>

        <Text style={styles.sectionTitle}>품목 내역</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>품목명</Text><Text style={styles.col2}>수량</Text>
          <Text style={styles.col3}>단가</Text><Text style={styles.col4}>공급가액</Text>
        </View>
        {props.items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.col1}>{item.name}</Text><Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{krw(item.unit_price)}</Text><Text style={styles.col4}>{krw(item.supply_amount)}</Text>
          </View>
        ))}

        <View style={styles.totalSection}>
          {props.discountAmount > 0 && (
            <View style={styles.totalRow}><Text style={styles.totalLabel}>할인</Text><Text style={styles.totalValue}>-{krw(props.discountAmount)}</Text></View>
          )}
          <View style={styles.totalRow}><Text style={styles.totalLabel}>공급가액</Text><Text style={styles.totalValue}>{krw(supply)}</Text></View>
          {props.includeVat && <View style={styles.totalRow}><Text style={styles.totalLabel}>세액(10%)</Text><Text style={styles.totalValue}>{krw(vat)}</Text></View>}
          <View style={styles.totalRow}><Text style={[styles.totalLabel, styles.grandTotal]}>합계</Text><Text style={[styles.totalValue, styles.grandTotal]}>{krw(total)}</Text></View>
        </View>

        <Text style={styles.footer}>{props.supplierName}</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: `src/lib/pdf/contract-template.tsx` 작성**

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1e293b" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", textAlign: "center", marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 3, marginTop: 12 },
  parties: { flexDirection: "row", gap: 16, marginBottom: 12 },
  partyBox: { flex: 1, padding: 8, backgroundColor: "#f8fafc" },
  partyLabel: { fontSize: 8, color: "#64748b", marginBottom: 3 },
  partyName: { fontWeight: "bold" },
  content: { lineHeight: 1.7, marginBottom: 8, whiteSpace: "pre-wrap" },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signBox: { width: 160, borderTopWidth: 1, borderTopColor: "#1e293b", paddingTop: 6, alignItems: "center" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 9, color: "#94a3b8", textAlign: "center" },
});

interface ContractPdfProps {
  title: string;
  terms: string;
  signedAt?: string | null;
  expiresAt?: string | null;
  supplierName: string;
  supplierRep?: string;
  clientName?: string;
  clientRep?: string | null;
}

export function ContractPdf(props: ContractPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>용 역 계 약 서</Text>
        <Text style={styles.subtitle}>{props.title}</Text>

        <Text style={styles.sectionTitle}>계약 당사자</Text>
        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>공급자 (갑)</Text>
            <Text style={styles.partyName}>{props.supplierName}</Text>
            {props.supplierRep && <Text>대표: {props.supplierRep}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>수급자 (을)</Text>
            <Text style={styles.partyName}>{props.clientName ?? "—"}</Text>
            {props.clientRep && <Text>대표: {props.clientRep}</Text>}
          </View>
        </View>

        {(props.signedAt || props.expiresAt) && (
          <>
            <Text style={styles.sectionTitle}>계약 기간</Text>
            <Text style={styles.content}>{props.signedAt ?? "—"} ~ {props.expiresAt ?? "—"}</Text>
          </>
        )}

        <Text style={styles.sectionTitle}>계약 내용</Text>
        <Text style={styles.content}>{props.terms}</Text>

        <View style={styles.signRow}>
          <View style={styles.signBox}><Text>갑 (공급자)</Text><Text style={{ color: "#64748b", marginTop: 4 }}>{props.supplierName}</Text></View>
          <View style={styles.signBox}><Text>을 (수급자)</Text><Text style={{ color: "#64748b", marginTop: 4 }}>{props.clientName ?? "—"}</Text></View>
        </View>
        <Text style={styles.footer}>본 계약서는 양 당사자 간 합의에 의해 작성되었습니다.</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 4: `src/lib/pdf/invoice-template.tsx` 작성**

세금계산서 공식 서식 스타일 (테두리 기반):
```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 30, color: "#0f172a" },
  outerBorder: { border: "2px solid #0f172a", padding: 16 },
  bigTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 12 },
  grid: { display: "flex", flexDirection: "row", border: "1px solid #e2e8f0" },
  cell: { padding: "4 6", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" },
  headerCell: { backgroundColor: "#f8fafc", fontWeight: "bold" },
  totalRow: { flexDirection: "row", marginTop: 8, justifyContent: "flex-end", gap: 16 },
});

interface InvoicePdfProps {
  title: string;
  issuedAt: string;
  items: Array<{ name: string; qty?: number; unit_price?: number }>;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  supplierName: string;
  supplierRegNo?: string;
  supplierRep?: string;
  clientName?: string;
  clientRegNo?: string;
}

export function InvoicePdf(props: InvoicePdfProps) {
  const krw = (n: number) => n.toLocaleString("ko-KR");
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.outerBorder}>
          <Text style={S.bigTitle}>세 금 계 산 서</Text>
          
          {/* 공급자 / 공급받는자 */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>공급자</Text>
              <View style={{ border: "1px solid #e2e8f0" }}>
                <View style={[S.cell, { flexDirection: "row" }]}><Text style={{ width: 70, color: "#64748b" }}>등록번호</Text><Text>{props.supplierRegNo ?? "—"}</Text></View>
                <View style={[S.cell, { flexDirection: "row" }]}><Text style={{ width: 70, color: "#64748b" }}>상호</Text><Text>{props.supplierName}</Text></View>
                <View style={[S.cell, { flexDirection: "row" }]}><Text style={{ width: 70, color: "#64748b" }}>대표자</Text><Text>{props.supplierRep ?? "—"}</Text></View>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>공급받는자</Text>
              <View style={{ border: "1px solid #e2e8f0" }}>
                <View style={[S.cell, { flexDirection: "row" }]}><Text style={{ width: 70, color: "#64748b" }}>등록번호</Text><Text>{props.clientRegNo ?? "—"}</Text></View>
                <View style={[S.cell, { flexDirection: "row" }]}><Text style={{ width: 70, color: "#64748b" }}>상호</Text><Text>{props.clientName ?? "—"}</Text></View>
              </View>
            </View>
          </View>

          {/* 발행일 */}
          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            <Text style={{ color: "#64748b", marginRight: 8 }}>작성일자</Text>
            <Text>{props.issuedAt}</Text>
          </View>

          {/* 품목 */}
          <View style={{ border: "1px solid #e2e8f0", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <Text style={[S.cell, { flex: 3 }]}>품목</Text>
              <Text style={[S.cell, { flex: 1, textAlign: "right" }]}>공급가액</Text>
              <Text style={[S.cell, { flex: 1, textAlign: "right", borderRight: "0" }]}>세액</Text>
            </View>
            {props.items.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", borderBottom: i < props.items.length - 1 ? "1px solid #f1f5f9" : "0" }}>
                <Text style={[S.cell, { flex: 3 }]}>{item.name}</Text>
                <Text style={[S.cell, { flex: 1, textAlign: "right" }]}>—</Text>
                <Text style={[S.cell, { flex: 1, textAlign: "right", borderRight: "0" }]}>—</Text>
              </View>
            ))}
          </View>

          {/* 합계 */}
          <View style={{ border: "1px solid #e2e8f0" }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={[S.cell, { width: 80, color: "#64748b" }]}>공급가액</Text>
              <Text style={[S.cell, { flex: 1, textAlign: "right" }]}>{krw(props.supplyAmount)}원</Text>
              <Text style={[S.cell, { width: 60, color: "#64748b" }]}>세액</Text>
              <Text style={[S.cell, { flex: 1, textAlign: "right", borderRight: "0" }]}>{krw(props.taxAmount)}원</Text>
            </View>
            <View style={{ flexDirection: "row", borderTop: "1px solid #e2e8f0" }}>
              <Text style={[S.cell, { width: 80, fontWeight: "bold" }]}>합계금액</Text>
              <Text style={[S.cell, { flex: 1, fontWeight: "bold", fontSize: 11, borderRight: "0" }]}>{krw(props.totalAmount)}원</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 5: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/lib/pdf/
git commit -m "feat: add PDF templates for estimate, contract, invoice (@react-pdf/renderer)"
```

---

### Task 11: PDF API 라우트 3개

**Files:**
- Create: `src/app/api/pdf/estimate/route.ts`
- Create: `src/app/api/pdf/contract/route.ts`
- Create: `src/app/api/pdf/invoice/route.ts`

먼저 Supabase Storage에서 `estimates`, `contracts`, `invoices` 버킷 생성 (비공개).

- [ ] **Step 1: Supabase 버킷 생성 확인**

대시보드 → Storage → 버킷 3개 생성: `estimates`, `contracts`, `invoices` (모두 Private).

- [ ] **Step 2: `src/app/api/pdf/estimate/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { EstimatePdf } from "@/lib/pdf/estimate-template";
import React from "react";

function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { estimateId } = body as { estimateId?: unknown };
  if (typeof estimateId !== "string" || !estimateId)
    return NextResponse.json({ error: "estimateId 필드가 필요합니다." }, { status: 400 });

  const { data: estimate, error: estErr } = await supabase
    .from("estimates").select("*, clients(*)").eq("id", estimateId).single();
  if (estErr || !estimate)
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });

  const { data: { user } } = await supabase.auth.getUser();
  const bp = user?.user_metadata?.business_profile ?? {};

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(React.createElement(EstimatePdf, {
      title: estimate.title,
      issuedAt: estimate.issued_at,
      expiresAt: estimate.expires_at,
      items: estimate.line_items ?? [],
      includeVat: estimate.include_vat ?? true,
      discountAmount: estimate.discount_amount ?? 0,
      supplierName: bp.organization_name ?? "공급자",
      supplierRegNo: bp.registration_number,
      supplierEmail: user?.email,
      clientName: estimate.clients?.company_name,
      clientContact: estimate.clients?.contact_name,
      clientEmail: estimate.clients?.email,
    }));
  } catch (err) {
    console.error("PDF render error:", err);
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 });
  }

  const svc = serviceClient();
  const fileName = `${estimateId}-${Date.now()}.pdf`;
  const { error: upErr } = await svc.storage.from("estimates").upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: "PDF 저장 오류" }, { status: 500 });

  const { data: urlData, error: urlErr } = await svc.storage.from("estimates").createSignedUrl(fileName, 3600);
  if (urlErr || !urlData?.signedUrl)
    return NextResponse.json({ error: "URL 생성 오류" }, { status: 500 });

  return NextResponse.json({ url: urlData.signedUrl });
}
```

- [ ] **Step 3: `src/app/api/pdf/contract/route.ts` 작성**

동일한 패턴. 차이점:
- `contracts` 테이블 + `clients` join
- `terms` 없으면 400 반환
- `ContractPdf` 컴포넌트 사용
- Storage 버킷: `contracts`

```ts
// 주요 변경점만 표시 (나머지는 estimate route와 동일 패턴)
const { data: contract, error } = await supabase
  .from("contracts").select("*, clients(*)").eq("id", contractId).single();

if (!contract.terms)
  return NextResponse.json({ error: "계약서 본문이 없습니다. AI로 먼저 작성해주세요." }, { status: 400 });

// renderToBuffer(React.createElement(ContractPdf, { ... }))
// Storage bucket: "contracts"
```

- [ ] **Step 4: `src/app/api/pdf/invoice/route.ts` 작성**

```ts
// tax_invoices 테이블 + clients join
// InvoicePdf 컴포넌트 사용
// Storage 버킷: "invoices"
const { data: invoice } = await supabase
  .from("tax_invoices").select("*, clients(*)").eq("id", invoiceId).single();

// renderToBuffer(React.createElement(InvoicePdf, {
//   title, issuedAt, items, supplyAmount, taxAmount, totalAmount,
//   supplierName, supplierRegNo, clientName, clientRegNo
// }))
```

- [ ] **Step 5: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/app/api/pdf/
git commit -m "feat: add PDF API routes for estimate, contract, invoice with Supabase Storage"
```

---

### Task 12: 미팅노트 새 페이지 AI 회의록 섹션

**Files:**
- Modify: `src/app/(dashboard)/meetings/new/page.tsx`

- [ ] **Step 1: 현재 파일 전체 읽기**

`src/app/(dashboard)/meetings/new/page.tsx` 전체 읽기.

- [ ] **Step 2: AI 상태 추가**

```tsx
const [aiKeywords, setAiKeywords] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");
```

- [ ] **Step 3: AI 핸들러**

```tsx
async function handleAiWrite() {
  if (!aiKeywords.trim()) return;
  setAiLoading(true); setAiError("");
  try {
    const res = await fetch("/api/ai/meeting-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: aiKeywords.trim(), metAt }),
    });
    const json = await res.json();
    if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
    setContent(json.content);
  } catch { setAiError("네트워크 오류"); }
  finally { setAiLoading(false); }
}
```

- [ ] **Step 4: MeetingNoteEditor 위에 AI 섹션 삽입**

```tsx
<div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI 회의록 작성</p>
  <textarea
    value={aiKeywords}
    onChange={(e) => setAiKeywords(e.target.value)}
    placeholder="키워드나 메모를 자유롭게 입력하세요 (최대 2,000자)&#10;예: 홈페이지 리뉴얼, 디자인 3안 검토, 1안으로 결정, 다음주까지 시안 수정 요청"
    maxLength={2000}
    rows={3}
    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-outfit"
  />
  <div className="flex items-center justify-between">
    <span className="text-xs text-slate-400">{aiKeywords.length}/2,000</span>
    <button type="button" onClick={handleAiWrite} disabled={aiLoading || !aiKeywords.trim()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
      {aiLoading ? "작성 중..." : "AI 회의록 작성"}
    </button>
  </div>
  {aiError && <p className="text-xs text-red-500">{aiError}</p>}
  {aiLoading && <p className="text-xs text-blue-600 animate-pulse">AI가 회의록을 작성하고 있습니다... (최대 60초 소요)</p>}
</div>
```

- [ ] **Step 5: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/app/(dashboard)/meetings/new/page.tsx
git commit -m "feat: add AI meeting note writer section to new meeting form"
```

---

### Task 13: 대시보드 홈 재설계

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

현재: 활성 클라이언트 / 이번주 미팅 / 최근 30일 발행 KPI.
변경 후: 파이프라인 현황 · 미수금 리스트 · 이번달 매출 · 마감임박 · 채널별 비중.

- [ ] **Step 1: 현재 파일 전체 읽기**

`src/app/(dashboard)/page.tsx` 전체 읽기.

- [ ] **Step 2: 데이터 페칭 추가**

Server Component에서:
```tsx
const [projects, clients] = await Promise.all([
  fetchProjects(),   // pipeline_stage, contract_amount, deposit_paid, final_paid, deadline 포함
  fetchClients(),
]);

// 파이프라인 현황
const pipelineStats = STAGES.map(stage => ({
  stage,
  count: projects.filter(p => p.pipeline_stage === stage).length,
  amount: projects.filter(p => p.pipeline_stage === stage).reduce((s, p) => s + (p.contract_amount ?? 0), 0),
}));

// 미수금 (deposit_paid=false 또는 final_paid=false인 계약 단계 이후)
const unpaid = projects.filter(p =>
  ['계약', '계산서발행', '계약입금', '착수', '납품', '완납'].includes(p.pipeline_stage) &&
  (!p.deposit_paid || !p.final_paid)
);

// 마감임박 (D-7 이내)
const today = new Date().toISOString().split('T')[0];
const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
const deadlineSoon = projects.filter(p =>
  p.deadline && p.deadline >= today && p.deadline <= sevenDaysLater &&
  !['납품', '완납'].includes(p.pipeline_stage)
);

// 채널별 계약금액
const channelMap = new Map<string, number>();
projects.forEach(p => {
  if (p.source_channel && p.contract_amount) {
    channelMap.set(p.source_channel, (channelMap.get(p.source_channel) ?? 0) + p.contract_amount);
  }
});
```

- [ ] **Step 3: UI 구현**

기존 KpiCard 컴포넌트 재사용 + 새 섹션:

```tsx
{/* 파이프라인 현황 */}
<section>
  <h2 className="text-sm font-semibold text-slate-700 mb-3">파이프라인 현황</h2>
  <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
    {pipelineStats.map(({ stage, count, amount }) => (
      <div key={stage} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
        <p className="text-xs text-slate-500 mb-1">{stage}</p>
        <p className="text-lg font-bold text-slate-800">{count}</p>
        {amount > 0 && <p className="text-[10px] text-slate-400">{(amount/10000).toFixed(0)}만</p>}
      </div>
    ))}
  </div>
</section>

{/* 미수금 */}
{unpaid.length > 0 && (
  <section>
    <h2 className="text-sm font-semibold text-slate-700 mb-3">미수금 ({unpaid.length}건)</h2>
    <div className="space-y-2">
      {unpaid.map(p => (
        <div key={p.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">{p.title}</p>
            <div className="flex gap-2 mt-0.5">
              {!p.deposit_paid && <span className="text-xs text-amber-700">계약금 미입금</span>}
              {!p.final_paid && <span className="text-xs text-amber-700">잔금 미입금</span>}
            </div>
          </div>
          {p.contract_amount && (
            <p className="text-sm font-semibold text-slate-700">{p.contract_amount.toLocaleString('ko-KR')}원</p>
          )}
        </div>
      ))}
    </div>
  </section>
)}

{/* 마감임박 */}
{deadlineSoon.length > 0 && (
  <section>
    <h2 className="text-sm font-semibold text-slate-700 mb-3">마감임박 D-7</h2>
    <div className="space-y-2">
      {deadlineSoon.map(p => {
        const dDay = Math.ceil((new Date(p.deadline!).getTime() - Date.now()) / 86400000);
        return (
          <div key={p.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-slate-800">{p.title}</p>
            <span className="text-xs font-bold text-red-600">D-{dDay}</span>
          </div>
        );
      })}
    </div>
  </section>
)}
```

- [ ] **Step 4: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/app/(dashboard)/page.tsx
git commit -m "feat: redesign dashboard home - pipeline stats, unpaid alerts, deadline tracking"
```

---

## 완료 후 확인 사항

- [ ] DB 마이그레이션 008 실행 완료 (Supabase SQL Editor)
- [ ] `npm install @react-pdf/renderer` 완료
- [ ] Supabase Storage: `estimates`, `contracts`, `invoices` 버킷 생성 완료
- [ ] `npx tsc --noEmit` 오류 없음
- [ ] 네비게이션 7항목 정상 렌더링
- [ ] 프로젝트 폼: pipeline_stage Select 정상 동작
- [ ] 프로젝트 칸반: 8컬럼 스크롤 정상
- [ ] 견적서 품목 추가/삭제 + 합계 자동계산
- [ ] 견적서 AI 초안 → 품목 자동입력 (NVIDIA API 키 필요)
- [ ] 견적서 저장 후 PDF 버튼 클릭 → 새탭 PDF 열림
- [ ] 계약서 AI 작성 → terms 필드 자동입력
- [ ] 세금계산서 입금완료 체크 정상 저장
- [ ] 홈 대시보드: 파이프라인 현황 카드 8개 표시
- [ ] 모든 AI 라우트: 미로그인 401 반환 확인
