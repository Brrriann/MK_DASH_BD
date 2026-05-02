# OCR 사업자등록증 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사업자등록증 OCR로 클라이언트 사업자 정보를 자동 추출·저장하고, 세금계산서 발행 시 누락된 정보를 프롬프트한다.

**Architecture:** NVIDIA NIM API(`meta/llama-3.2-90b-vision-instruct`)를 서버사이드 `/api/ocr` 라우트로 감싸고, ClientFormSheet에서 이미지 업로드 → OCR 호출 → 필드 자동완성 흐름을 제공. InvoiceFormDialog에서 선택된 클라이언트의 `business_registration_number`가 없으면 인라인 경고와 OCR 버튼을 표시한다.

**Tech Stack:** Next.js 15 App Router API Routes, NVIDIA NIM REST API, Supabase PostgreSQL migration, React file input, @phosphor-icons/react

---

### Task 1: Supabase 마이그레이션 — 사업자 정보 필드 추가

**Files:**
- Create: `supabase/migrations/005_business_registration.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 005_business_registration.sql
-- clients 테이블에 사업자등록증 관련 필드 추가

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS business_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS representative_name TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS business_item TEXT;
```

- [ ] **Step 2: Supabase SQL 에디터에서 실행**

프로젝트 Supabase 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run.
로컬 supabase가 실행 중이면 `supabase db push`도 가능.

- [ ] **Step 3: `ALL_IN_ONE_run_in_supabase_sql_editor.sql`에도 동일 내용 추가**

파일 맨 아래에 Task 1의 SQL을 추가한다.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/005_business_registration.sql supabase/migrations/ALL_IN_ONE_run_in_supabase_sql_editor.sql
git commit -m "feat: add business registration fields to clients table"
```

---

### Task 2: 타입 및 액션 업데이트

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/actions/clients.ts`

- [ ] **Step 1: `src/lib/types.ts` — Client 인터페이스에 필드 추가**

`updated_at: string;` 바로 위에 아래 필드를 추가한다:

```typescript
  business_registration_number: string | null;
  representative_name: string | null;
  business_address: string | null;
  business_type: string | null;
  business_item: string | null;
```

- [ ] **Step 2: `src/lib/actions/clients.ts` — CreateClientInput에 필드 추가**

`notes?: string;` 아래에 추가:

```typescript
  business_registration_number?: string;
  representative_name?: string;
  business_address?: string;
  business_type?: string;
  business_item?: string;
```

- [ ] **Step 3: `createClient` 함수 업데이트**

insert 객체에 아래 필드 추가:

```typescript
  business_registration_number: data.business_registration_number ?? null,
  representative_name: data.representative_name ?? null,
  business_address: data.business_address ?? null,
  business_type: data.business_type ?? null,
  business_item: data.business_item ?? null,
```

- [ ] **Step 4: TypeScript 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (기존 `.next/types` 관련 에러는 무시 가능)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/types.ts src/lib/actions/clients.ts
git commit -m "feat: add business registration fields to Client type and actions"
```

---

### Task 3: OCR API 라우트 생성

**Files:**
- Create: `src/app/api/ocr/route.ts`

OCR 라우트는 `multipart/form-data`로 이미지를 받아 base64로 변환 후 NVIDIA NIM에 전달하고, 추출된 사업자 정보 JSON을 반환한다.

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// src/app/api/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are an OCR assistant for Korean business registration certificates (사업자등록증).
Extract the following fields and return ONLY valid JSON, no other text:
{
  "business_registration_number": "000-00-00000 format",
  "representative_name": "대표자명",
  "business_address": "사업장소재지",
  "business_type": "업태",
  "business_item": "종목"
}
If a field is not visible, use null.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 500 });
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "image field required" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다. JPG, PNG, WEBP만 가능합니다." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString("base64");
    mimeType = file.type;
  } catch {
    return NextResponse.json({ error: "파일 처리 중 오류가 발생했습니다." }, { status: 400 });
  }

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-90b-vision-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA API error:", errorText);
      return NextResponse.json({ error: "OCR 처리 중 오류가 발생했습니다." }, { status: 502 });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content ?? "";

    // Parse JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "OCR 결과를 파싱할 수 없습니다." }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("OCR route error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript 빌드 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/ocr/route.ts
git commit -m "feat: add /api/ocr route for business registration OCR via NVIDIA NIM"
```

---

### Task 4: ClientFormSheet — 사업자 정보 섹션 + OCR 업로드

**Files:**
- Modify: `src/components/clients/ClientFormSheet.tsx`

ClientFormSheet에 사업자 정보 섹션을 추가한다. 섹션 상단에 "사업자등록증 업로드" 버튼이 있고, 파일 선택 시 `/api/ocr`를 호출하여 필드를 자동완성한다. 필드는 수동 입력도 가능하다.

- [ ] **Step 1: `CreateClientInput`에 사업자 정보 필드 추가 (이미 Task 2에서 actions에 추가됨)**

FormData state 초기값에 새 필드 추가:

```typescript
const [formData, setFormData] = useState<CreateClientInput>({
  // ...기존 필드...
  business_registration_number: client?.business_registration_number ?? "",
  representative_name: client?.representative_name ?? "",
  business_address: client?.business_address ?? "",
  business_type: client?.business_type ?? "",
  business_item: client?.business_item ?? "",
});
```

- [ ] **Step 2: OCR 상태 추가**

`const [submitting, setSubmitting] = useState(false);` 아래에:

```typescript
const [ocrLoading, setOcrLoading] = useState(false);
const [ocrError, setOcrError] = useState<string | null>(null);
```

- [ ] **Step 3: OCR 핸들러 추가**

`handleChange` 함수 아래에:

```typescript
async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  setOcrLoading(true);
  setOcrError(null);

  try {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/ocr", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      setOcrError(json.error ?? "OCR 처리 중 오류가 발생했습니다.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      business_registration_number: json.business_registration_number ?? prev.business_registration_number,
      representative_name: json.representative_name ?? prev.representative_name,
      business_address: json.business_address ?? prev.business_address,
      business_type: json.business_type ?? prev.business_type,
      business_item: json.business_item ?? prev.business_item,
    }));
  } catch {
    setOcrError("네트워크 오류가 발생했습니다.");
  } finally {
    setOcrLoading(false);
    e.target.value = "";
  }
}
```

- [ ] **Step 4: payload에 사업자 정보 포함**

`handleSubmit`의 `payload` 객체에 추가:

```typescript
business_registration_number: formData.business_registration_number?.trim() || undefined,
representative_name: formData.representative_name?.trim() || undefined,
business_address: formData.business_address?.trim() || undefined,
business_type: formData.business_type?.trim() || undefined,
business_item: formData.business_item?.trim() || undefined,
```

- [ ] **Step 5: JSX — 사업자 정보 섹션 추가**

메모(`notes`) 필드 아래, `</form>` 닫는 태그 바로 위에 추가:

```tsx
{/* 사업자 정보 */}
<div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
  <div className="flex items-center justify-between">
    <p className="text-sm font-semibold text-slate-700">사업자 정보</p>
    <label className="cursor-pointer">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleOcrUpload}
        disabled={ocrLoading}
      />
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer">
        {ocrLoading ? (
          <>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-300 border-t-blue-700 animate-spin" />
            스캔 중...
          </>
        ) : (
          <>사업자등록증 스캔</>
        )}
      </span>
    </label>
  </div>
  {ocrError && (
    <p className="text-xs text-red-500">{ocrError}</p>
  )}
  <div className="grid grid-cols-2 gap-3">
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="brn" className="text-sm font-medium text-slate-700">사업자등록번호</Label>
      <Input
        id="brn"
        value={formData.business_registration_number ?? ""}
        onChange={(e) => handleChange("business_registration_number", e.target.value)}
        placeholder="000-00-00000"
        className="h-9 text-sm"
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="rep_name" className="text-sm font-medium text-slate-700">대표자명</Label>
      <Input
        id="rep_name"
        value={formData.representative_name ?? ""}
        onChange={(e) => handleChange("representative_name", e.target.value)}
        placeholder="홍길동"
        className="h-9 text-sm"
      />
    </div>
  </div>
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="biz_addr" className="text-sm font-medium text-slate-700">사업장소재지</Label>
    <Input
      id="biz_addr"
      value={formData.business_address ?? ""}
      onChange={(e) => handleChange("business_address", e.target.value)}
      placeholder="서울특별시 강남구 ..."
      className="h-9 text-sm"
    />
  </div>
  <div className="grid grid-cols-2 gap-3">
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="biz_type" className="text-sm font-medium text-slate-700">업태</Label>
      <Input
        id="biz_type"
        value={formData.business_type ?? ""}
        onChange={(e) => handleChange("business_type", e.target.value)}
        placeholder="서비스"
        className="h-9 text-sm"
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="biz_item" className="text-sm font-medium text-slate-700">종목</Label>
      <Input
        id="biz_item"
        value={formData.business_item ?? ""}
        onChange={(e) => handleChange("business_item", e.target.value)}
        placeholder="소프트웨어 개발"
        className="h-9 text-sm"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 6: TypeScript 빌드 확인 + 개발 서버에서 시각적 확인**

```bash
npx tsc --noEmit
```

개발 서버(`npm run dev`)에서 클라이언트 추가/수정 시트 열어서 사업자 정보 섹션이 표시되는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/components/clients/ClientFormSheet.tsx
git commit -m "feat: add business registration section with OCR upload to ClientFormSheet"
```

---

### Task 5: InvoiceFormDialog — 사업자 정보 누락 경고 + OCR 프롬프트

**Files:**
- Modify: `src/components/invoices/InvoiceFormDialog.tsx`

세금계산서 발행 시 선택된 클라이언트에 `business_registration_number`가 없으면, 인라인 경고 박스를 표시한다. 경고 박스 안에 사업자등록증 업로드 버튼을 제공하고, OCR 성공 시 클라이언트를 업데이트(`updateClient`)한다. OCR 섹션은 클라이언트가 선택되었을 때만 노출된다.

- [ ] **Step 1: import 추가**

기존 import 목록에 추가:

```typescript
import { updateClient } from "@/lib/actions/clients";
```

- [ ] **Step 2: OCR 상태 추가**

`const [error, setError] = useState("");` 아래에:

```typescript
const [ocrLoading, setOcrLoading] = useState(false);
const [ocrDone, setOcrDone] = useState(false);
```

- [ ] **Step 3: useEffect에서 ocrDone 리셋**

`useEffect`의 `if (open) {` 블록 안에 추가:

```typescript
setOcrDone(false);
```

- [ ] **Step 4: selectedClient 헬퍼 계산**

`handleSubmit` 함수 위에:

```typescript
const selectedClient = clientId !== NONE_VALUE
  ? clients.find((c) => c.id === clientId) ?? null
  : null;
const missingBrn = selectedClient !== null && !selectedClient.business_registration_number && !ocrDone;
```

- [ ] **Step 5: OCR 핸들러 추가**

```typescript
async function handleInvoiceOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file || !selectedClient) return;

  setOcrLoading(true);
  setError("");

  try {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/ocr", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "OCR 처리 중 오류가 발생했습니다.");
      return;
    }

    await updateClient(selectedClient.id, {
      business_registration_number: json.business_registration_number ?? undefined,
      representative_name: json.representative_name ?? undefined,
      business_address: json.business_address ?? undefined,
      business_type: json.business_type ?? undefined,
      business_item: json.business_item ?? undefined,
    });
    setOcrDone(true);
  } catch {
    setError("OCR 처리 중 오류가 발생했습니다.");
  } finally {
    setOcrLoading(false);
    e.target.value = "";
  }
}
```

- [ ] **Step 6: JSX — 사업자등록증 누락 경고 블록 추가**

`{/* Client */}` Select 필드 바로 아래에 추가:

```tsx
{/* 사업자등록증 누락 경고 */}
{missingBrn && (
  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
    <div className="flex-1">
      <p className="text-xs font-semibold text-amber-800">사업자등록번호 미입력</p>
      <p className="text-xs text-amber-700 mt-0.5">
        세금계산서 발행에 필요한 사업자 정보가 없습니다. 사업자등록증을 스캔하면 자동으로 저장됩니다.
      </p>
    </div>
    <label className="cursor-pointer shrink-0">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleInvoiceOcrUpload}
        disabled={ocrLoading}
      />
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer whitespace-nowrap">
        {ocrLoading ? (
          <>
            <span className="h-3 w-3 rounded-full border-2 border-amber-300 border-t-amber-700 animate-spin" />
            스캔 중...
          </>
        ) : (
          "스캔하기"
        )}
      </span>
    </label>
  </div>
)}
{ocrDone && (
  <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
    사업자 정보가 저장되었습니다.
  </p>
)}
```

- [ ] **Step 7: TypeScript 빌드 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: 개발 서버에서 시각적 확인**

`npm run dev` → 세금계산서 생성 → 사업자 정보 없는 클라이언트 선택 → 경고 박스 표시 확인.

- [ ] **Step 9: 커밋**

```bash
git add src/components/invoices/InvoiceFormDialog.tsx
git commit -m "feat: show business registration warning with OCR prompt in InvoiceFormDialog"
```

---

## 완료 후 확인 사항

- [ ] `.env.local`의 `NVIDIA_API_KEY` 값이 올바른지 확인 (이미 수정됨)
- [ ] Supabase에서 migration SQL 실행 완료
- [ ] 클라이언트 수정 → 사업자등록증 이미지 업로드 → 필드 자동완성 동작
- [ ] 세금계산서 생성 → 사업자 정보 없는 클라이언트 선택 → 경고+스캔 버튼 표시
- [ ] OCR 스캔 후 클라이언트 DB에 저장 확인
