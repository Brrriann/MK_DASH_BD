# AI 문서 작성 + PDF 발행 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미팅노트 AI 회의록 작성, 견적서/계약서 AI 초안 + 서버 PDF 발행 기능 구현

**Architecture:** 서버 API 레이어 분리 — 모든 AI/PDF 처리는 Next.js API 라우트에서만, 클라이언트는 내부 라우트 호출만. NVIDIA NIM (`moonshotai/kimi-k2-instruct`) 사용. PDF는 `@react-pdf/renderer` 서버 생성 → Supabase Storage signed URL.

**Tech Stack:** Next.js 15 App Router, TypeScript, @react-pdf/renderer, NVIDIA NIM API, Supabase Storage

**Note:** 볼타 API 연동은 `InvoiceFormDialog`에 이미 완전 구현됨 (`handleBoltaIssue`). 이 플랜에서 제외.

---

## File Map

| 파일 | 작업 | 역할 |
|------|------|------|
| `src/lib/nvidia.ts` | **Create** | NVIDIA NIM 호출 공통 헬퍼 |
| `src/app/api/ai/meeting-note/route.ts` | **Create** | 키워드 → 회의록 AI 라우트 |
| `src/app/api/ai/estimate/route.ts` | **Create** | 프로젝트 정보 → 견적 품목 AI 라우트 |
| `src/app/api/ai/contract/route.ts` | **Create** | 계약 조건 → 계약서 본문 AI 라우트 |
| `src/app/api/pdf/estimate/route.ts` | **Create** | 견적서 PDF 생성 라우트 |
| `src/app/api/pdf/contract/route.ts` | **Create** | 계약서 PDF 생성 라우트 |
| `src/lib/pdf/estimate-template.tsx` | **Create** | @react-pdf/renderer 견적서 템플릿 |
| `src/lib/pdf/contract-template.tsx` | **Create** | @react-pdf/renderer 계약서 템플릿 |
| `supabase/migrations/007_estimate_contract_ai.sql` | **Create** | estimates.items + contracts.content 컬럼 추가 |
| `src/lib/types.ts` | **Modify** | Estimate에 items, Contract에 content 추가 |
| `src/lib/actions/estimates.ts` | **Modify** | CreateEstimateInput에 items, description 추가 |
| `src/lib/actions/contracts.ts` | **Modify** | CreateContractInput에 content 추가 |
| `src/components/estimates/EstimateFormDialog.tsx` | **Modify** | AI 초안 + PDF 발행 버튼 추가, 품목 입력 추가 |
| `src/components/contracts/ContractFormDialog.tsx` | **Modify** | AI 계약서 작성 + PDF 발행 버튼 추가, content 필드 추가 |
| `src/app/(dashboard)/meetings/new/page.tsx` | **Modify** | AI 회의록 작성 섹션 추가 |

---

### Task 1: NVIDIA NIM 공통 헬퍼

**Files:**
- Create: `src/lib/nvidia.ts`

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

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/nvidia.ts
git commit -m "feat: add NVIDIA NIM helper with 60s timeout"
```

---

### Task 2: 미팅노트 AI 라우트

**Files:**
- Create: `src/app/api/ai/meeting-note/route.ts`

- [ ] **Step 1: 디렉토리 생성 및 라우트 작성**

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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { keywords, clientName, metAt } = body as {
    keywords?: unknown;
    clientName?: unknown;
    metAt?: unknown;
  };

  if (typeof keywords !== "string" || keywords.trim().length === 0) {
    return NextResponse.json({ error: "keywords 필드가 필요합니다." }, { status: 400 });
  }
  if (keywords.length > 2000) {
    return NextResponse.json({ error: "keywords는 2,000자 이하여야 합니다." }, { status: 400 });
  }

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    metAt ? `미팅일: ${String(metAt).slice(0, 20)}` : null,
    `키워드/메모:\n${keywords.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

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

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/ai/meeting-note/route.ts
git commit -m "feat: add /api/ai/meeting-note route with auth guard and input validation"
```

---

### Task 3: 미팅노트 UI — AI 회의록 작성 섹션

**Files:**
- Modify: `src/app/(dashboard)/meetings/new/page.tsx`

현재 파일 구조: `MeetingNoteEditor` 컴포넌트가 `content` 상태를 렌더링. AI 섹션을 에디터 위에 삽입.

- [ ] **Step 1: 현재 파일 읽기**

`src/app/(dashboard)/meetings/new/page.tsx` 전체 읽기 — content 상태와 MeetingNoteEditor 렌더 위치 파악.

- [ ] **Step 2: AI 상태 추가**

기존 상태 선언 블록에 추가:
```tsx
const [aiKeywords, setAiKeywords] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");
```

- [ ] **Step 3: AI 호출 함수 추가**

```tsx
async function handleAiWrite() {
  if (!aiKeywords.trim()) return;
  setAiLoading(true);
  setAiError("");
  try {
    const res = await fetch("/api/ai/meeting-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: aiKeywords.trim(),
        clientName: clients.find((c) => c.id === clientId)?.company_name,
        metAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAiError(json.error ?? "AI 오류가 발생했습니다.");
      return;
    }
    setContent(json.content);
  } catch {
    setAiError("네트워크 오류가 발생했습니다.");
  } finally {
    setAiLoading(false);
  }
}
```

- [ ] **Step 4: AI 섹션 UI 삽입**

`MeetingNoteEditor` 렌더 바로 위에 삽입:
```tsx
{/* AI 회의록 작성 */}
<div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI 회의록 작성</p>
  <textarea
    value={aiKeywords}
    onChange={(e) => setAiKeywords(e.target.value)}
    placeholder="키워드나 메모를 자유롭게 입력하세요. (최대 2,000자)&#10;예: 홈페이지 리뉴얼 논의, 디자인 3안 검토, 1안으로 결정, 다음주까지 시안 수정 요청"
    maxLength={2000}
    rows={4}
    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-outfit"
  />
  <div className="flex items-center justify-between">
    <span className="text-xs text-slate-400">{aiKeywords.length}/2,000</span>
    <button
      type="button"
      onClick={handleAiWrite}
      disabled={aiLoading || !aiKeywords.trim()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {aiLoading ? "작성 중..." : "AI 회의록 작성"}
    </button>
  </div>
  {aiError && <p className="text-xs text-red-500">{aiError}</p>}
  {aiLoading && (
    <p className="text-xs text-blue-600 animate-pulse">AI가 회의록을 작성하고 있습니다... (최대 30초 소요)</p>
  )}
</div>
```

- [ ] **Step 5: TypeScript 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: 커밋**

```bash
git add src/app/(dashboard)/meetings/new/page.tsx
git commit -m "feat: add AI meeting note writer section to new meeting page"
```

---

### Task 4: DB 마이그레이션 — estimates.items + contracts.content

**Files:**
- Create: `supabase/migrations/007_estimate_contract_ai.sql`
- Modify: `supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/007_estimate_contract_ai.sql`:
```sql
-- 007_estimate_contract_ai.sql
-- 견적서: AI 품목 목록 + 작업 설명 추가
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 계약서: AI 계약서 본문 추가
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS content TEXT;
-- pdf_url 컬럼 유지 (하위호환)
```

- [ ] **Step 2: ALL_IN_ONE 파일 하단에 동일 SQL 추가**

`ALL_IN_ONE_run_in_supabase_sql_editor.sql` 파일 끝에 구분선과 함께 위 SQL 추가.

- [ ] **Step 3: Supabase SQL Editor에서 007 실행**

로컬 및 프로덕션 Supabase SQL Editor에서 실행.
Expected: `ALTER TABLE` 성공 메시지 2개.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/007_estimate_contract_ai.sql supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql
git commit -m "feat: add items/description to estimates, content to contracts"
```

---

### Task 5: types.ts + actions 업데이트

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/actions/estimates.ts`
- Modify: `src/lib/actions/contracts.ts`

- [ ] **Step 1: types.ts — EstimateItem 인터페이스 추가, Estimate 업데이트**

`InvoiceItem` 정의 바로 아래에 추가:
```ts
export interface EstimateItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
}
```

`Estimate` 인터페이스에 필드 추가:
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
  items: EstimateItem[];         // 추가
  description: string | null;   // 추가
  created_at: string;
}
```

`Contract` 인터페이스에 필드 추가:
```ts
export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  pdf_url: string | null;
  client_id: string | null;
  signed_at: string | null;
  expires_at: string | null;
  content: string | null;   // 추가
  created_at: string;
}
```

- [ ] **Step 2: actions/estimates.ts — CreateEstimateInput 업데이트**

`CreateEstimateInput` 타입에 추가:
```ts
export type CreateEstimateInput = {
  title: string;
  amount: number;
  status?: EstimateStatus;
  pdf_url?: string | null;
  client_id?: string | null;
  issued_at?: string;
  expires_at?: string | null;
  items?: EstimateItem[];        // 추가
  description?: string | null;  // 추가
};
```

`createEstimate`, `updateEstimate` 함수 내 insert/update 객체에 `items`, `description` 추가:
```ts
items: data.items ?? [],
description: data.description ?? null,
```

- [ ] **Step 3: actions/contracts.ts — CreateContractInput 업데이트**

`CreateContractInput`에 추가:
```ts
content?: string | null;
```

`createContract`, `updateContract`에 `content: data.content ?? null` 추가.

- [ ] **Step 4: TypeScript 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/types.ts src/lib/actions/estimates.ts src/lib/actions/contracts.ts
git commit -m "feat: add items/description to Estimate type, content to Contract type"
```

---

### Task 6: 견적서 AI 라우트

**Files:**
- Create: `src/app/api/ai/estimate/route.ts`

- [ ] **Step 1: 라우트 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callNvidia } from "@/lib/nvidia";

const SYSTEM_PROMPT = `당신은 한국 IT/디지털 프리랜서 견적서 작성 전문가입니다.
클라이언트 정보와 작업 설명을 바탕으로 견적 품목 목록을 JSON 형식으로 반환하세요.
반드시 다음 JSON 형식만 반환하세요 (다른 텍스트 없이):

{
  "items": [
    { "name": "품목명", "quantity": 1, "unit_price": 1000000 },
    ...
  ]
}

규칙:
- 품목명은 구체적이고 명확하게 (예: "반응형 웹사이트 메인페이지 디자인")
- 단가는 한국 시장 기준 현실적인 금액 (원 단위)
- 수량은 1 이상의 정수
- 최대 10개 품목`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientName, description, scope } = body as {
    clientName?: unknown;
    description?: unknown;
    scope?: unknown;
  };

  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "description 필드가 필요합니다." }, { status: 400 });
  }
  if (description.length > 1000) {
    return NextResponse.json({ error: "description은 1,000자 이하여야 합니다." }, { status: 400 });
  }

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    `작업 내용: ${description.trim()}`,
    scope ? `작업 범위: ${String(scope).slice(0, 500)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callNvidia(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    let parsed: { items: Array<{ name: string; quantity: number; unit_price: number }> };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      console.error("AI estimate parse error:", raw);
      return NextResponse.json({ error: "AI 응답을 파싱할 수 없습니다." }, { status: 422 });
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return NextResponse.json({ error: "AI가 품목을 생성하지 못했습니다." }, { status: 422 });
    }

    // Validate and sanitize items
    const items = parsed.items.slice(0, 10).map((item) => ({
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

- [ ] **Step 2: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/app/api/ai/estimate/route.ts
git commit -m "feat: add /api/ai/estimate route - project info to itemized estimate"
```

---

### Task 7: EstimateFormDialog 개편

**Files:**
- Modify: `src/components/estimates/EstimateFormDialog.tsx`

현재 폼: title, amount(단일 숫자), status, client, issued_at, expires_at, pdf_url(텍스트).
변경 후: AI 초안 섹션 + 품목 목록(InvoiceFormDialog 패턴) + 합계 자동계산 + PDF 발행 버튼.
`pdf_url` 텍스트 input 제거 (서버에서 자동 생성으로 교체).

- [ ] **Step 1: 현재 EstimateFormDialog.tsx 전체 읽기**

파일 전체 읽어서 현재 상태 파악.

- [ ] **Step 2: import 블록 업데이트**

```tsx
import { useState, useEffect } from "react";
import { Plus, Trash, Sparkle } from "@phosphor-icons/react";
import {
  createEstimate, updateEstimate,
  type Estimate, type CreateEstimateInput,
} from "@/lib/actions/estimates";
import type { ClientWithRevenue, EstimateItem } from "@/lib/types";
// Dialog, Button, Input, Label, Select imports 유지
```

- [ ] **Step 3: 상태 추가**

기존 상태에 추가:
```tsx
const EMPTY_ITEM = (): EstimateItem => ({ name: "", quantity: 1, unit_price: 0, supply_amount: 0 });

const [items, setItems] = useState<EstimateItem[]>([EMPTY_ITEM()]);
const [description, setDescription] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");
const [pdfLoading, setPdfLoading] = useState(false);
```

- [ ] **Step 4: useEffect 업데이트 — items, description 초기화**

기존 useEffect에 추가:
```tsx
setItems(estimate?.items?.length ? estimate.items : [EMPTY_ITEM()]);
setDescription(estimate?.description ?? "");
setAiError("");
// pdfUrl state 제거
```

- [ ] **Step 5: 합계 계산 + 품목 핸들러 추가**

```tsx
const supplyAmount = items.reduce((s, i) => s + i.supply_amount, 0);

function updateItem(index: number, field: keyof EstimateItem, value: string | number) {
  setItems((prev) => {
    const next = [...prev];
    const item = { ...next[index] };
    if (field === "name") {
      item.name = value as string;
    } else {
      const num = typeof value === "string" ? Number(value) || 0 : value;
      if (field === "quantity") item.quantity = num;
      if (field === "unit_price") item.unit_price = num;
      item.supply_amount = item.quantity * item.unit_price;
    }
    next[index] = item;
    return next;
  });
}

async function handleAiDraft() {
  if (!description.trim()) return;
  setAiLoading(true);
  setAiError("");
  try {
    const clientName = clientId !== NONE_VALUE
      ? clients.find((c) => c.id === clientId)?.company_name
      : undefined;
    const res = await fetch("/api/ai/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName, description: description.trim() }),
    });
    const json = await res.json();
    if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
    setItems(json.items);
    setAmount(String(json.items.reduce((s: number, i: EstimateItem) => s + i.supply_amount, 0)));
  } catch {
    setAiError("네트워크 오류가 발생했습니다.");
  } finally {
    setAiLoading(false);
  }
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
    if (!res.ok) { setError(json.error ?? "PDF 생성 오류"); return; }
    window.open(json.url, "_blank");
  } catch {
    setError("PDF 생성 중 오류가 발생했습니다.");
  } finally {
    setPdfLoading(false);
  }
}
```

- [ ] **Step 6: handleSubmit 업데이트**

`CreateEstimateInput`에 items, description 추가:
```tsx
const data: CreateEstimateInput = {
  title: title.trim(),
  amount: supplyAmount || Number(amount),
  status,
  pdf_url: null,
  client_id: clientId === NONE_VALUE ? null : clientId,
  issued_at: issuedAt || undefined,
  expires_at: expiresAt || null,
  items,
  description: description.trim() || null,
};
```

- [ ] **Step 7: 폼 JSX 업데이트**

폼 내부 변경:
1. `pdf_url` Input 필드 제거
2. title 위에 AI 초안 섹션 삽입:

```tsx
{/* AI 초안 작성 */}
<div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI 견적 초안</p>
  <div className="flex flex-col gap-1.5">
    <Label className="text-sm text-slate-700 font-medium">작업 내용 설명</Label>
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      placeholder="예: 쇼핑몰 웹사이트 구축 - 메인, 상품 목록, 상세, 장바구니, 결제 페이지 포함"
      maxLength={1000}
      rows={3}
      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-outfit"
    />
  </div>
  <button
    type="button"
    onClick={handleAiDraft}
    disabled={aiLoading || !description.trim()}
    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
  >
    <Sparkle size={12} />
    {aiLoading ? "AI 작성 중..." : "AI 품목 초안 생성"}
  </button>
  {aiLoading && <p className="text-xs text-blue-600 animate-pulse">AI가 견적을 작성하고 있습니다...</p>}
  {aiError && <p className="text-xs text-red-500">{aiError}</p>}
</div>
```

3. amount 단일 Input 아래에 품목 테이블 추가 (InvoiceFormDialog 패턴 참고):

```tsx
{/* 품목 목록 */}
<div className="space-y-2">
  <Label className="text-sm text-slate-700 font-medium">품목 목록</Label>
  <div className="rounded-lg border border-slate-200 overflow-hidden">
    <div className="grid grid-cols-[1fr_60px_100px_auto] gap-0 bg-slate-50 border-b border-slate-200 px-3 py-2">
      <span className="text-xs font-medium text-slate-500">품목명</span>
      <span className="text-xs font-medium text-slate-500 text-center">수량</span>
      <span className="text-xs font-medium text-slate-500 text-right">단가</span>
      <span />
    </div>
    {items.map((item, i) => (
      <div key={i} className="grid grid-cols-[1fr_60px_100px_auto] gap-2 px-3 py-2 border-b border-slate-100 last:border-0 items-center">
        <input
          value={item.name}
          onChange={(e) => updateItem(i, "name", e.target.value)}
          placeholder="품목명"
          className="text-sm border border-slate-200 rounded px-2 py-1 font-outfit focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
        />
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => updateItem(i, "quantity", e.target.value)}
          min={1}
          className="text-sm border border-slate-200 rounded px-2 py-1 font-outfit focus:outline-none focus:ring-1 focus:ring-blue-500 text-center w-full"
        />
        <input
          type="number"
          value={item.unit_price}
          onChange={(e) => updateItem(i, "unit_price", e.target.value)}
          min={0}
          className="text-sm border border-slate-200 rounded px-2 py-1 font-outfit focus:outline-none focus:ring-1 focus:ring-blue-500 text-right w-full"
        />
        <button
          type="button"
          onClick={() => setItems((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p)}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash size={14} />
        </button>
      </div>
    ))}
  </div>
  <button
    type="button"
    onClick={() => setItems((p) => [...p, EMPTY_ITEM()])}
    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
  >
    <Plus size={12} />품목 추가
  </button>
  {supplyAmount > 0 && (
    <div className="text-right text-sm text-slate-700 font-outfit font-semibold">
      합계: {supplyAmount.toLocaleString("ko-KR")}원
    </div>
  )}
</div>
```

4. DialogFooter에 PDF 발행 버튼 추가 (수정 모드일 때만 표시):

```tsx
{isEdit && (
  <Button
    type="button"
    onClick={handlePdfIssue}
    disabled={pdfLoading}
    variant="outline"
    className="font-outfit"
  >
    {pdfLoading ? "PDF 생성 중..." : "PDF 발행"}
  </Button>
)}
```

- [ ] **Step 8: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/components/estimates/EstimateFormDialog.tsx
git commit -m "feat: overhaul EstimateFormDialog with AI draft and itemized PDF"
```

---

### Task 8: 계약서 AI 라우트

**Files:**
- Create: `src/app/api/ai/contract/route.ts`

- [ ] **Step 1: 라우트 작성**

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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientName, amount, startDate, endDate, scope, notes } = body as {
    clientName?: unknown;
    amount?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    scope?: unknown;
    notes?: unknown;
  };

  if (typeof scope !== "string" || scope.trim().length === 0) {
    return NextResponse.json({ error: "scope 필드가 필요합니다." }, { status: 400 });
  }
  if (scope.length > 1000) {
    return NextResponse.json({ error: "scope는 1,000자 이하여야 합니다." }, { status: 400 });
  }

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    amount ? `계약 금액: ${Number(amount).toLocaleString("ko-KR")}원` : null,
    startDate ? `계약 시작일: ${String(startDate).slice(0, 20)}` : null,
    endDate ? `계약 종료일: ${String(endDate).slice(0, 20)}` : null,
    `작업 범위: ${scope.trim()}`,
    notes ? `특이사항: ${String(notes).slice(0, 500)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const content = await callNvidia([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ], { maxTokens: 3000 });
    return NextResponse.json({ content });
  } catch (err) {
    console.error("contract AI error:", err);
    return NextResponse.json({ error: "AI 처리 중 오류가 발생했습니다." }, { status: 502 });
  }
}
```

- [ ] **Step 2: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/app/api/ai/contract/route.ts
git commit -m "feat: add /api/ai/contract route - contract conditions to full contract body"
```

---

### Task 9: ContractFormDialog 개편

**Files:**
- Modify: `src/components/contracts/ContractFormDialog.tsx`

현재 폼: title, status, client, signed_at, expires_at, pdf_url.
변경 후: AI 계약서 작성 섹션 + content 텍스트에어리어 + PDF 발행 버튼. `pdf_url` 수동 입력 제거.

- [ ] **Step 1: 현재 파일 전체 읽기**

- [ ] **Step 2: import 블록 업데이트**

```tsx
import { Sparkle } from "@phosphor-icons/react";
import { Textarea } from "@/components/ui/textarea";
```

- [ ] **Step 3: 상태 추가**

```tsx
const [content, setContent] = useState("");
const [scope, setScope] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");
const [pdfLoading, setPdfLoading] = useState(false);
```

- [ ] **Step 4: useEffect에 content, scope 초기화 추가**

```tsx
setContent(contract?.content ?? "");
setScope("");
setAiError("");
```

- [ ] **Step 5: AI 호출 + PDF 핸들러 추가**

```tsx
async function handleAiWrite() {
  if (!scope.trim()) return;
  setAiLoading(true);
  setAiError("");
  try {
    const clientName = clientId !== NONE_VALUE
      ? clients.find((c) => c.id === clientId)?.company_name
      : undefined;
    const res = await fetch("/api/ai/contract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        scope: scope.trim(),
        startDate: signedAt || undefined,
        endDate: expiresAt || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
    setContent(json.content);
  } catch {
    setAiError("네트워크 오류가 발생했습니다.");
  } finally {
    setAiLoading(false);
  }
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
    if (!res.ok) { setError(json.error ?? "PDF 생성 오류"); return; }
    window.open(json.url, "_blank");
  } catch {
    setError("PDF 생성 중 오류가 발생했습니다.");
  } finally {
    setPdfLoading(false);
  }
}
```

- [ ] **Step 6: handleSubmit 업데이트**

```tsx
const data: CreateContractInput = {
  title: title.trim(),
  status,
  pdf_url: null,
  client_id: clientId === NONE_VALUE ? null : clientId,
  signed_at: signedAt || null,
  expires_at: expiresAt || null,
  content: content.trim() || null,
};
```

- [ ] **Step 7: 폼 JSX 업데이트**

1. `pdf_url` Input 제거
2. title 위에 AI 섹션 추가:

```tsx
{/* AI 계약서 작성 */}
<div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI 계약서 작성</p>
  <div className="flex flex-col gap-1.5">
    <Label className="text-sm text-slate-700 font-medium">작업 범위 및 조건</Label>
    <textarea
      value={scope}
      onChange={(e) => setScope(e.target.value)}
      placeholder="예: 쇼핑몰 웹사이트 기획/디자인/개발. 계약금 50% 착수, 잔금 50% 납품 완료 후 지급."
      maxLength={1000}
      rows={3}
      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-outfit"
    />
  </div>
  <button
    type="button"
    onClick={handleAiWrite}
    disabled={aiLoading || !scope.trim()}
    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
  >
    <Sparkle size={12} />
    {aiLoading ? "AI 작성 중..." : "AI 계약서 작성"}
  </button>
  {aiLoading && <p className="text-xs text-blue-600 animate-pulse">AI가 계약서를 작성하고 있습니다... (최대 30초 소요)</p>}
  {aiError && <p className="text-xs text-red-500">{aiError}</p>}
</div>
```

3. signed_at/expires_at 아래에 계약서 본문 Textarea 추가:

```tsx
<div className="flex flex-col gap-1.5">
  <Label className="text-sm text-slate-700 font-medium">계약서 본문</Label>
  <Textarea
    value={content}
    onChange={(e) => setContent(e.target.value)}
    placeholder="AI로 생성하거나 직접 입력하세요."
    rows={10}
    className="font-outfit text-sm resize-y"
  />
</div>
```

4. DialogFooter에 PDF 버튼 (수정 모드 + content 있을 때):

```tsx
{isEdit && contract?.content && (
  <Button type="button" onClick={handlePdfIssue} disabled={pdfLoading} variant="outline" className="font-outfit">
    {pdfLoading ? "PDF 생성 중..." : "PDF 발행"}
  </Button>
)}
```

- [ ] **Step 8: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/components/contracts/ContractFormDialog.tsx
git commit -m "feat: overhaul ContractFormDialog with AI writer and PDF issuance"
```

---

### Task 10: @react-pdf/renderer 설치 + 견적서 PDF 템플릿

**Files:**
- Create: `src/lib/pdf/estimate-template.tsx`

- [ ] **Step 1: 패키지 설치**

```bash
npm install @react-pdf/renderer
npm install --save-dev @types/react-pdf
```

- [ ] **Step 2: `src/lib/pdf/estimate-template.tsx` 작성**

```tsx
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { EstimateItem } from "@/lib/types";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1e293b" },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 100, color: "#64748b" },
  value: { flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8fafc", padding: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", padding: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "center" },
  col3: { flex: 1.5, textAlign: "right" },
  col4: { flex: 1.5, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  totalLabel: { width: 80, color: "#64748b" },
  totalValue: { width: 100, textAlign: "right" },
  grandTotal: { fontSize: 12, fontWeight: "bold", color: "#2563eb" },
  footer: { marginTop: 40, fontSize: 9, color: "#94a3b8", textAlign: "center" },
});

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

interface EstimatePdfProps {
  estimate: {
    title: string;
    issued_at: string;
    expires_at?: string | null;
    items: EstimateItem[];
  };
  supplier: {
    organizationName: string;
    registrationNumber?: string;
    representativeName?: string;
    address?: string;
    email?: string;
  };
  client: {
    company_name: string;
    contact_name: string;
    email: string;
    business_registration_number?: string | null;
    representative_name?: string | null;
  } | null;
}

export function EstimatePdf({ estimate, supplier, client }: EstimatePdfProps) {
  const supplyAmount = estimate.items.reduce((s, i) => s + i.supply_amount, 0);
  const taxAmount = Math.round(supplyAmount * 0.1);
  const total = supplyAmount + taxAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>견 적 서</Text>
          <Text style={styles.subtitle}>{estimate.title}</Text>
        </View>

        {/* Supplier + Client */}
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>공급자</Text>
            <View style={styles.row}><Text style={styles.label}>상호</Text><Text style={styles.value}>{supplier.organizationName}</Text></View>
            {supplier.registrationNumber && <View style={styles.row}><Text style={styles.label}>사업자번호</Text><Text style={styles.value}>{supplier.registrationNumber}</Text></View>}
            {supplier.representativeName && <View style={styles.row}><Text style={styles.label}>대표자</Text><Text style={styles.value}>{supplier.representativeName}</Text></View>}
            {supplier.email && <View style={styles.row}><Text style={styles.label}>이메일</Text><Text style={styles.value}>{supplier.email}</Text></View>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>수신</Text>
            {client ? (
              <>
                <View style={styles.row}><Text style={styles.label}>상호</Text><Text style={styles.value}>{client.company_name}</Text></View>
                <View style={styles.row}><Text style={styles.label}>담당자</Text><Text style={styles.value}>{client.contact_name}</Text></View>
                <View style={styles.row}><Text style={styles.label}>이메일</Text><Text style={styles.value}>{client.email}</Text></View>
                {client.business_registration_number && <View style={styles.row}><Text style={styles.label}>사업자번호</Text><Text style={styles.value}>{client.business_registration_number}</Text></View>}
              </>
            ) : (
              <Text style={{ color: "#94a3b8" }}>—</Text>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 20 }}>
          <View style={styles.row}><Text style={styles.label}>발행일</Text><Text>{estimate.issued_at}</Text></View>
          {estimate.expires_at && <View style={styles.row}><Text style={styles.label}>유효기간</Text><Text>{estimate.expires_at}</Text></View>}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>품목 내역</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>품목명</Text>
            <Text style={styles.col2}>수량</Text>
            <Text style={styles.col3}>단가</Text>
            <Text style={styles.col4}>공급가액</Text>
          </View>
          {estimate.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{item.name}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{formatKRW(item.unit_price)}</Text>
              <Text style={styles.col4}>{formatKRW(item.supply_amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>공급가액</Text><Text style={styles.totalValue}>{formatKRW(supplyAmount)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>세액 (10%)</Text><Text style={styles.totalValue}>{formatKRW(taxAmount)}</Text></View>
          <View style={styles.totalRow}><Text style={[styles.totalLabel, styles.grandTotal]}>합계</Text><Text style={[styles.totalValue, styles.grandTotal]}>{formatKRW(total)}</Text></View>
        </View>

        <Text style={styles.footer}>본 견적서는 {supplier.organizationName}에서 발행하였습니다.</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/pdf/estimate-template.tsx
git commit -m "feat: add @react-pdf/renderer estimate PDF template"
```

---

### Task 11: 견적서 PDF API 라우트

**Files:**
- Create: `src/app/api/pdf/estimate/route.ts`

Supabase Storage에 `estimates` 버킷이 있어야 함. 없으면 대시보드에서 생성.

- [ ] **Step 1: Supabase Storage `estimates` 버킷 생성 확인**

Supabase 대시보드 → Storage → `estimates` 버킷 생성 (비공개).
`contracts` 버킷도 미리 생성.

- [ ] **Step 2: 라우트 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { EstimatePdf } from "@/lib/pdf/estimate-template";
import React from "react";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
  if (typeof estimateId !== "string" || !estimateId) {
    return NextResponse.json({ error: "estimateId 필드가 필요합니다." }, { status: 400 });
  }

  // Fetch estimate
  const { data: estimate, error: estErr } = await supabase
    .from("estimates")
    .select("*, clients(*)")
    .eq("id", estimateId)
    .single();

  if (estErr || !estimate) {
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  // Fetch supplier info from user metadata
  const { data: { user } } = await supabase.auth.getUser();
  const bp = user?.user_metadata?.business_profile ?? {};
  const supplier = {
    organizationName: bp.organization_name ?? "공급자",
    registrationNumber: bp.registration_number,
    representativeName: bp.representative_name,
    email: user?.email,
  };

  // Generate PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(EstimatePdf, {
        estimate: {
          title: estimate.title,
          issued_at: estimate.issued_at,
          expires_at: estimate.expires_at,
          items: estimate.items ?? [],
        },
        supplier,
        client: estimate.clients ?? null,
      })
    );
  } catch (err) {
    console.error("PDF render error:", err);
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 });
  }

  // Upload to Supabase Storage
  const serviceClient = getServiceClient();
  const fileName = `estimates/${estimateId}-${Date.now()}.pdf`;

  const { error: uploadErr } = await serviceClient.storage
    .from("estimates")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return NextResponse.json({ error: "PDF 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  // Create signed URL (1 hour)
  const { data: urlData, error: urlErr } = await serviceClient.storage
    .from("estimates")
    .createSignedUrl(fileName, 3600);

  if (urlErr || !urlData?.signedUrl) {
    return NextResponse.json({ error: "PDF URL 생성 중 오류가 발생했습니다." }, { status: 500 });
  }

  // Update estimate pdf_url
  await supabase
    .from("estimates")
    .update({ pdf_url: urlData.signedUrl })
    .eq("id", estimateId);

  return NextResponse.json({ url: urlData.signedUrl });
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/pdf/estimate/route.ts
git commit -m "feat: add /api/pdf/estimate route - server PDF generation with Supabase Storage"
```

---

### Task 12: 계약서 PDF 템플릿 + 라우트

**Files:**
- Create: `src/lib/pdf/contract-template.tsx`
- Create: `src/app/api/pdf/contract/route.ts`

- [ ] **Step 1: `src/lib/pdf/contract-template.tsx` 작성**

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1e293b" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 10, color: "#64748b", textAlign: "center", marginBottom: 24 },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4, marginTop: 16 },
  parties: { flexDirection: "row", gap: 20, marginBottom: 16 },
  partyBox: { flex: 1, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4 },
  partyLabel: { fontSize: 8, color: "#64748b", marginBottom: 4 },
  partyName: { fontWeight: "bold", marginBottom: 2 },
  content: { lineHeight: 1.6, marginBottom: 8 },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signatureBox: { width: 180, borderTopWidth: 1, borderTopColor: "#1e293b", paddingTop: 8, alignItems: "center" },
  footer: { marginTop: 24, fontSize: 9, color: "#94a3b8", textAlign: "center" },
});

interface ContractPdfProps {
  contract: { title: string; content: string; signed_at?: string | null; expires_at?: string | null };
  supplier: { organizationName: string; representativeName?: string };
  client: { company_name: string; representative_name?: string | null } | null;
}

export function ContractPdf({ contract, supplier, client }: ContractPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>용역 계약서</Text>
        <Text style={styles.subtitle}>{contract.title}</Text>

        {/* 계약 당사자 */}
        <Text style={styles.sectionTitle}>계약 당사자</Text>
        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>공급자 (갑)</Text>
            <Text style={styles.partyName}>{supplier.organizationName}</Text>
            {supplier.representativeName && <Text>대표: {supplier.representativeName}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>수급자 (을)</Text>
            <Text style={styles.partyName}>{client?.company_name ?? "—"}</Text>
            {client?.representative_name && <Text>대표: {client.representative_name}</Text>}
          </View>
        </View>

        {/* 계약 기간 */}
        {(contract.signed_at || contract.expires_at) && (
          <>
            <Text style={styles.sectionTitle}>계약 기간</Text>
            <Text style={styles.content}>
              {contract.signed_at ?? "—"} ~ {contract.expires_at ?? "—"}
            </Text>
          </>
        )}

        {/* 계약 내용 */}
        <Text style={styles.sectionTitle}>계약 내용</Text>
        <Text style={styles.content}>{contract.content}</Text>

        {/* 서명란 */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text>갑 (공급자)</Text>
            <Text style={{ marginTop: 4, color: "#64748b" }}>{supplier.organizationName}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>을 (수급자)</Text>
            <Text style={{ marginTop: 4, color: "#64748b" }}>{client?.company_name ?? "—"}</Text>
          </View>
        </View>

        <Text style={styles.footer}>본 계약서는 양 당사자 간 합의에 의해 작성되었습니다.</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: `src/app/api/pdf/contract/route.ts` 작성**

`/api/pdf/estimate/route.ts`와 동일한 패턴. 차이점:
- `contracts` 테이블 조회 (+ `clients` join)
- `content` 필드 없으면 400 반환
- Storage 버킷: `contracts`
- `ContractPdf` 컴포넌트 사용

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPdf } from "@/lib/pdf/contract-template";
import React from "react";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contractId } = body as { contractId?: unknown };
  if (typeof contractId !== "string" || !contractId) {
    return NextResponse.json({ error: "contractId 필드가 필요합니다." }, { status: 400 });
  }

  const { data: contract, error: contErr } = await supabase
    .from("contracts")
    .select("*, clients(*)")
    .eq("id", contractId)
    .single();

  if (contErr || !contract) {
    return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!contract.content) {
    return NextResponse.json({ error: "계약서 본문이 없습니다. AI로 먼저 작성해주세요." }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const bp = user?.user_metadata?.business_profile ?? {};
  const supplier = {
    organizationName: bp.organization_name ?? "공급자",
    representativeName: bp.representative_name,
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(ContractPdf, {
        contract: {
          title: contract.title,
          content: contract.content,
          signed_at: contract.signed_at,
          expires_at: contract.expires_at,
        },
        supplier,
        client: contract.clients ?? null,
      })
    );
  } catch (err) {
    console.error("PDF render error:", err);
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 });
  }

  const serviceClient = getServiceClient();
  const fileName = `contracts/${contractId}-${Date.now()}.pdf`;

  const { error: uploadErr } = await serviceClient.storage
    .from("contracts")
    .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return NextResponse.json({ error: "PDF 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  const { data: urlData, error: urlErr } = await serviceClient.storage
    .from("contracts")
    .createSignedUrl(fileName, 3600);

  if (urlErr || !urlData?.signedUrl) {
    return NextResponse.json({ error: "PDF URL 생성 중 오류가 발생했습니다." }, { status: 500 });
  }

  await supabase
    .from("contracts")
    .update({ pdf_url: urlData.signedUrl })
    .eq("id", contractId);

  return NextResponse.json({ url: urlData.signedUrl });
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/pdf/contract-template.tsx src/app/api/pdf/contract/route.ts
git commit -m "feat: add contract PDF template and /api/pdf/contract route"
```

---

## 완료 후 확인 사항

- [ ] 미팅노트 폼에서 키워드 입력 → AI 회의록 생성 → content 필드에 삽입 확인
- [ ] 견적서 폼 AI 초안 → 품목 목록 자동 입력 확인
- [ ] 견적서 저장 후 PDF 발행 → 브라우저 새탭에서 PDF 열림 확인
- [ ] 계약서 폼 AI 작성 → content 텍스트에어리어에 계약서 본문 삽입 확인
- [ ] 계약서 저장 후 PDF 발행 → 서명란 포함 PDF 확인
- [ ] 모든 AI 라우트: 비로그인 상태에서 401 반환 확인
- [ ] `npx tsc --noEmit` 오류 없음
- [ ] Supabase Storage `estimates`, `contracts` 버킷 존재 확인
