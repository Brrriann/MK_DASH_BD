# 전자계약서 e-서명 기능 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계약서를 이메일로 발송하고 클라이언트가 손글씨 서명 후 제출하면 서명 포함 PDF가 자동 생성되어 양측에 발송되는 e-서명 워크플로우 구현.

**Architecture:** 공개 서명 페이지(`/sign/contract/[token]`)는 인증 없이 접근 가능하며, 토큰 기반으로 계약서를 식별. 모든 서버 처리(토큰 생성, 서명 저장, PDF 재생성, 이메일 발송)는 API 라우트에서만 수행하며 서비스 롤 키는 클라이언트에 노출하지 않음. 이중 서명 방지는 원자적 DB UPDATE로 보장.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + Storage), `resend` (이메일), `react-signature-canvas` (서명 패드), `@react-pdf/renderer` (PDF, 기존 재활용)

---

## 파일 구조

**신규 생성:**
- `src/app/sign/contract/[token]/page.tsx` — 공개 서명 페이지 (2단계 위자드)
- `src/app/api/contracts/send-signature/route.ts` — 토큰 생성 + 이메일 발송
- `src/app/api/contracts/sign/[token]/route.ts` — GET(토큰 검증) + POST(서명 처리)
- `src/components/pdf/SignedContractPdf.tsx` — 서명 이미지 포함 PDF 컴포넌트
- `src/lib/resend.ts` — Resend 이메일 유틸리티
- `supabase/migrations/009_esign_columns.sql` — contracts 테이블 컬럼 추가

**수정:**
- `src/lib/types.ts` — `ContractStatus`에 `"signature_requested"` 추가, `Contract` 인터페이스에 e-서명 필드 추가
- `src/lib/actions/contracts.ts` — `CreateContractInput`에 e-서명 필드 추가
- `src/components/contracts/ContractFormDialog.tsx` — "서명 요청 발송" 버튼 추가
- `next.config.ts` — `transpilePackages` 추가 (react-signature-canvas CJS 패키지)

---

## Task 1: 의존성 설치 + next.config 업데이트

**Files:**
- Modify: `next.config.ts`
- Run: `npm install resend react-signature-canvas`
- Run: `npm install -D @types/react-signature-canvas`

- [ ] **Step 1: 패키지 설치**

```bash
npm install resend react-signature-canvas
npm install -D @types/react-signature-canvas
```

- [ ] **Step 2: next.config.ts 업데이트**

`next.config.ts`를 다음으로 교체:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-signature-canvas"],
};

export default nextConfig;
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공 (오류 없음)

- [ ] **Step 4: 커밋**

```bash
git add next.config.ts package.json package-lock.json
git commit -m "chore: add resend and react-signature-canvas dependencies"
```

---

## Task 2: DB 마이그레이션 + 타입 업데이트

**Files:**
- Create: `supabase/migrations/009_esign_columns.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/actions/contracts.ts`

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/009_esign_columns.sql`:

```sql
-- e-서명 기능: contracts 테이블에 서명 관련 컬럼 추가
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS signature_token            UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_token_used_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signer_name                TEXT,
  ADD COLUMN IF NOT EXISTS signer_email               TEXT,
  ADD COLUMN IF NOT EXISTS signer_ip                  TEXT,
  ADD COLUMN IF NOT EXISTS signer_user_agent          TEXT,
  ADD COLUMN IF NOT EXISTS signature_image_url        TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_url             TEXT,
  ADD COLUMN IF NOT EXISTS signed_at                  TIMESTAMPTZ;

-- 'signature_requested' 상태 추가 — CHECK constraint 교체 (필수)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('signed', 'pending', 'expired', 'signature_requested'));
```

- [ ] **Step 2: 로컬 Supabase에 마이그레이션 적용**

```bash
supabase db push
```

또는 Supabase 대시보드 SQL 에디터에서 직접 실행.

- [ ] **Step 3: `src/lib/types.ts` ContractStatus + Contract 업데이트**

`types.ts`에서 다음 두 곳 수정:

```ts
// 기존:
export type ContractStatus = "signed" | "pending" | "expired";

// 변경:
export type ContractStatus = "signed" | "pending" | "expired" | "signature_requested";
```

`Contract` 인터페이스 끝에 필드 추가 (기존 `created_at` 앞):

```ts
  // e-서명
  signature_token: string | null;
  signature_token_expires_at: string | null;
  signature_token_used_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signature_image_url: string | null;
  signed_pdf_url: string | null;
  signed_at: string | null;
```

- [ ] **Step 4: `src/lib/actions/contracts.ts` CreateContractInput 업데이트**

기존 `terms?: string | null;` 아래에 추가:

```ts
  signature_token?: string | null;
  signature_token_expires_at?: string | null;
  signature_token_used_at?: string | null;
  signer_name?: string | null;
  signer_email?: string | null;
  signature_image_url?: string | null;
  signed_pdf_url?: string | null;
  signed_at?: string | null;
```

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/009_esign_columns.sql src/lib/types.ts src/lib/actions/contracts.ts
git commit -m "feat: add e-sign columns to contracts schema and types"
```

---

## Task 3: Resend 이메일 유틸리티

**Files:**
- Create: `src/lib/resend.ts`

**전제조건:** `.env.local`에 `RESEND_API_KEY` 추가 필요.  
개발 시 `onboarding@resend.dev`를 From 주소로 사용 (도메인 인증 전).

- [ ] **Step 1: `.env.local`에 키 추가**

```
RESEND_API_KEY=re_...                  # resend.com에서 발급
RESEND_FROM=마그네이트코리아 <noreply@magnatekorea.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
OWNER_NOTIFICATION_EMAIL=your@email.com  # 서명 완료 알림 수신 이메일 (대시보드 사용자)
```

개발 중에는 `RESEND_FROM=onboarding@resend.dev` 사용 가능.

- [ ] **Step 2: `src/lib/resend.ts` 작성**

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface SendSignatureRequestParams {
  to: string;
  recipientName: string;
  contractTitle: string;
  token: string;
  expiresAt: Date;
}

export async function sendSignatureRequest(params: SendSignatureRequestParams) {
  const { to, recipientName, contractTitle, token, expiresAt } = params;
  const link = `${APP_URL}/sign/contract/${token}`;
  const expiryStr = expiresAt.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[서명 요청] ${contractTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="font-size:16px;color:#0f172a;margin-bottom:8px;">📄 계약서 서명을 요청드립니다</h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;">
          ${recipientName} 님,<br/>
          <strong>${contractTitle}</strong>에 서명을 요청드립니다.<br/>
          아래 버튼을 클릭하여 계약 내용을 확인하신 후 서명해 주세요.
        </p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin:16px 0;">계약서 서명하기</a>
        <div style="background:#f8fafc;border-radius:6px;padding:12px;font-size:12px;color:#64748b;margin-top:8px;">
          📋 ${contractTitle}<br/>
          ⏰ 만료일: ${expiryStr}
        </div>
        <p style="font-size:11px;color:#94a3b8;margin-top:16px;">버튼이 작동하지 않으면 아래 링크를 복사하여 접속하세요:<br/>${link}</p>
      </div>
    `,
  });
}

export interface SendSignatureCompleteParams {
  // 클라이언트에게 발송
  clientEmail: string;
  clientName: string;
  contractTitle: string;
  signedPdfUrl: string;
  // 대시보드 사용자에게 발송
  ownerEmail: string;
  signerName: string;
  signedAt: Date;
}

export async function sendSignatureComplete(params: SendSignatureCompleteParams) {
  const { clientEmail, clientName, contractTitle, signedPdfUrl, ownerEmail, signerName, signedAt } = params;
  const signedAtStr = signedAt.toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // 클라이언트에게
  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `[서명 완료] ${contractTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="font-size:32px;margin-bottom:8px;">🎉</div>
        <h2 style="font-size:16px;color:#0f172a;">계약이 체결되었습니다</h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;">
          ${clientName} 님, <strong>${contractTitle}</strong>에 서명이 완료되었습니다.<br/>
          서명된 계약서를 아래에서 다운로드하실 수 있습니다.
        </p>
        <a href="${signedPdfUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;margin:12px 0;">📄 서명된 계약서 다운로드</a>
      </div>
    `,
  });

  // 대시보드 사용자에게
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `[서명 완료 알림] ${contractTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="font-size:16px;color:#0f172a;">✅ 계약서 서명 완료</h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;">
          <strong>${contractTitle}</strong>에 클라이언트 서명이 완료되었습니다.
        </p>
        <div style="background:#f0fdf4;border-radius:6px;padding:12px;font-size:13px;color:#15803d;">
          서명자: ${signerName}<br/>
          서명 일시: ${signedAtStr}
        </div>
      </div>
    `,
  });
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/resend.ts
git commit -m "feat: add Resend email utility for e-sign notifications"
```

---

## Task 4: send-signature API 라우트

**Files:**
- Create: `src/app/api/contracts/send-signature/route.ts`

- [ ] **Step 1: 라우트 파일 작성**

`src/app/api/contracts/send-signature/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignatureRequest } from "@/lib/resend";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  // Auth guard
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contractId } = body as { contractId?: unknown };
  if (typeof contractId !== "string")
    return NextResponse.json({ error: "contractId 필드가 필요합니다." }, { status: 400 });

  const admin = createAdminClient();

  // 계약서 + 클라이언트 조회
  const { data: contract, error: contractErr } = await admin
    .from("contracts")
    .select("*, clients(contact_name, email)")
    .eq("id", contractId)
    .single();

  if (contractErr || !contract)
    return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 });

  // 이미 서명 완료된 경우 차단
  if (contract.signature_token_used_at)
    return NextResponse.json({ error: "이미 서명이 완료된 계약서입니다." }, { status: 409 });

  // 클라이언트 이메일 필요
  const client = contract.clients as { contact_name: string; email: string } | null;
  if (!client?.email)
    return NextResponse.json({ error: "클라이언트 이메일이 없습니다." }, { status: 422 });

  // 토큰 생성 (7일 만료)
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // DB 업데이트 (기존 토큰 교체 허용)
  const { error: updateErr } = await admin
    .from("contracts")
    .update({
      signature_token: token,
      signature_token_expires_at: expiresAt.toISOString(),
      signature_token_used_at: null,
      status: "signature_requested",
    })
    .eq("id", contractId);

  if (updateErr)
    return NextResponse.json({ error: "토큰 저장 실패" }, { status: 500 });

  // 이메일 발송
  try {
    await sendSignatureRequest({
      to: client.email,
      recipientName: client.contact_name,
      contractTitle: contract.title,
      token,
      expiresAt,
    });
  } catch (err) {
    console.error("send-signature email error:", err);
    return NextResponse.json({ error: "이메일 발송에 실패했습니다." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: `src/lib/supabase/admin.ts` 확인**

`admin.ts`가 이미 존재하는지 확인. 있으면 skip. 없으면:

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

- [ ] **Step 3: API 수동 테스트**

`npm run dev` 실행 후 로그인된 상태에서:

```bash
curl -X POST http://localhost:3000/api/contracts/send-signature \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=..." \
  -d '{"contractId": "<실제_계약서_ID>"}'
```

Expected: `{"ok":true}` 또는 에러 메시지 확인

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/contracts/send-signature/route.ts
git commit -m "feat: add send-signature API route"
```

---

## Task 5: sign/[token] API 라우트 (GET + POST)

**Files:**
- Create: `src/app/api/contracts/sign/[token]/route.ts`

- [ ] **Step 1: GET 라우트 작성 (토큰 검증 + 계약서 조회)**

`src/app/api/contracts/sign/[token]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: contract, error } = await admin
    .from("contracts")
    .select("id, title, terms, signature_token_expires_at, signature_token_used_at, clients(contact_name, email)")
    .eq("signature_token", token)
    .single();

  if (error || !contract)
    return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });

  if (contract.signature_token_used_at)
    return NextResponse.json({ error: "already_signed" }, { status: 409 });

  if (new Date(contract.signature_token_expires_at) < new Date())
    return NextResponse.json({ error: "expired" }, { status: 410 });

  return NextResponse.json({
    id: contract.id,
    title: contract.title,
    terms: contract.terms,
    clientName: (contract.clients as { contact_name: string } | null)?.contact_name,
  });
}
```

- [ ] **Step 2: POST 라우트 작성 (서명 처리)**

같은 파일에 POST 함수 추가:

```ts
import { renderToBuffer } from "@react-pdf/renderer";
import { SignedContractPdf } from "@/components/pdf/SignedContractPdf";
import { sendSignatureComplete } from "@/lib/resend";
import React from "react";

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const admin = createAdminClient();

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { signerName, signatureBase64 } = body as {
    signerName?: unknown;
    signatureBase64?: unknown;
  };

  if (typeof signerName !== "string" || !signerName.trim())
    return NextResponse.json({ error: "서명자 이름이 필요합니다." }, { status: 400 });

  if (typeof signatureBase64 !== "string" || !signatureBase64.startsWith("data:image/png;base64,"))
    return NextResponse.json({ error: "서명 이미지가 유효하지 않습니다." }, { status: 400 });

  // base64 크기 제한 (500KB)
  if (signatureBase64.length > 700000)
    return NextResponse.json({ error: "서명 이미지가 너무 큽니다." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  // 원자적 토큰 소비 (이중 서명 방지)
  const { data: claimed, error: claimErr } = await admin
    .from("contracts")
    .update({ signature_token_used_at: new Date().toISOString() })
    .eq("signature_token", token)
    .is("signature_token_used_at", null)
    .gt("signature_token_expires_at", new Date().toISOString())
    .select("id, title, terms, contract_amount, deposit_amount, deposit_paid, final_amount, final_paid, clients(contact_name, email)")
    .single();

  if (claimErr || !claimed)
    return NextResponse.json({ error: "이미 서명되었거나 만료된 링크입니다." }, { status: 409 });

  const client = claimed.clients as { contact_name: string; email: string } | null;
  const signedAt = new Date();

  // 서명 이미지를 Supabase Storage에 저장
  const sigImgBuffer = Buffer.from(signatureBase64.split(",")[1], "base64");
  const sigImgPath = `signatures/${claimed.id}/${signedAt.getTime()}.png`;

  const { error: imgUploadErr } = await admin.storage
    .from("contract-signatures")
    .upload(sigImgPath, sigImgBuffer, { contentType: "image/png" });

  if (imgUploadErr) {
    console.error("signature image upload error:", imgUploadErr);
    return NextResponse.json({ error: "서명 이미지 저장 실패" }, { status: 500 });
  }

  // PDF 생성
  let pdfUrl: string;
  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(SignedContractPdf, {
        title: claimed.title,
        terms: claimed.terms,
        clientName: client?.contact_name,
        contractAmount: claimed.contract_amount,
        depositAmount: claimed.deposit_amount,
        depositPaid: claimed.deposit_paid,
        finalAmount: claimed.final_amount,
        finalPaid: claimed.final_paid,
        signerName: signerName.trim(),
        signatureBase64,
        signedAt: signedAt.toLocaleDateString("ko-KR"),
      })
    );

    const pdfPath = `signed-pdfs/${claimed.id}/${signedAt.getTime()}.pdf`;
    const { error: pdfUploadErr } = await admin.storage
      .from("contract-signatures")
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf" });

    if (pdfUploadErr) throw pdfUploadErr;

    const { data: signedUrl } = await admin.storage
      .from("contract-signatures")
      .createSignedUrl(pdfPath, 3600);

    pdfUrl = signedUrl?.signedUrl ?? "";

    // DB 업데이트 (완료 기록)
    await admin.from("contracts").update({
      status: "signed",
      signer_name: signerName.trim(),
      signer_email: client?.email ?? null,
      signer_ip: ip,
      signer_user_agent: userAgent,
      signature_image_url: sigImgPath,
      signed_pdf_url: pdfPath,
      signed_at: signedAt.toISOString(),
    }).eq("id", claimed.id);

  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }

  // 이메일 발송 (오류 시 로그만, 서명은 완료 처리)
  try {
    const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL ?? "";
    if (client?.email && ownerEmail) {
      await sendSignatureComplete({
        clientEmail: client.email,
        clientName: client.contact_name,
        contractTitle: claimed.title,
        signedPdfUrl: pdfUrl,
        ownerEmail,
        signerName: signerName.trim(),
        signedAt,
      });
    }
  } catch (err) {
    console.error("completion email error:", err);
  }

  return NextResponse.json({ ok: true, pdfUrl });
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/contracts/sign/
git commit -m "feat: add sign/[token] GET and POST API routes"
```

---

## Task 6: SignedContractPdf 컴포넌트

**Files:**
- Create: `src/components/pdf/SignedContractPdf.tsx`

`ContractPdf.tsx`를 기반으로 서명 이미지와 서명자 정보를 서명란에 추가.

- [ ] **Step 1: 컴포넌트 작성**

`src/components/pdf/SignedContractPdf.tsx`:

```tsx
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.otf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.otf", fontWeight: 700 },
  ],
});

const S = StyleSheet.create({
  page: { fontFamily: "NotoSansKR", fontSize: 9, color: "#1e293b", padding: "40 50", lineHeight: 1.6 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 24 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, paddingBottom: 4, borderBottom: "1 solid #e2e8f0" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#64748b", minWidth: 80 },
  paymentBox: { backgroundColor: "#f8fafc", borderRadius: 6, padding: "10 12", marginBottom: 16 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  terms: { fontSize: 8.5, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#94a3b8" },
  signBox: { flexDirection: "row", gap: 40, marginTop: 40 },
  signParty: { flex: 1, borderTop: "1 solid #334155", paddingTop: 8 },
  signLabel: { fontSize: 8, color: "#64748b", marginBottom: 4 },
  signImage: { width: 180, height: 60, objectFit: "contain" },
});

interface Props {
  title: string;
  clientName?: string;
  supplierName?: string;
  contractAmount?: number | null;
  depositAmount?: number | null;
  depositPaid?: boolean;
  finalAmount?: number | null;
  finalPaid?: boolean;
  terms?: string | null;
  // 서명 관련
  signerName: string;
  signatureBase64: string;
  signedAt: string;
}

export function SignedContractPdf({
  title, clientName, supplierName,
  contractAmount, depositAmount, depositPaid, finalAmount, finalPaid, terms,
  signerName, signatureBase64, signedAt,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>용 역 계 약 서</Text>
        <Text style={S.subtitle}>{title}</Text>

        <View style={[S.section, { flexDirection: "row", gap: 40 }]}>
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>계약 당사자</Text>
            <View style={S.row}><Text style={S.label}>발주처</Text><Text style={{ fontWeight: 700 }}>{clientName ?? "—"}</Text></View>
            <View style={S.row}><Text style={S.label}>수급사</Text><Text style={{ fontWeight: 700 }}>{supplierName ?? "—"}</Text></View>
          </View>
        </View>

        {(contractAmount || depositAmount || finalAmount) && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>계약 금액</Text>
            <View style={S.paymentBox}>
              {contractAmount != null && (
                <View style={S.paymentRow}><Text style={{ color: "#64748b" }}>계약금액</Text><Text style={{ fontWeight: 700, fontSize: 11, color: "#2563eb" }}>{contractAmount.toLocaleString()}원</Text></View>
              )}
              {depositAmount != null && (
                <View style={S.paymentRow}>
                  <Text style={{ color: "#64748b" }}>계약금</Text>
                  <Text>{depositAmount.toLocaleString()}원 {depositPaid ? "✓ 입금완료" : "미입금"}</Text>
                </View>
              )}
              {finalAmount != null && (
                <View style={S.paymentRow}>
                  <Text style={{ color: "#64748b" }}>잔금</Text>
                  <Text>{finalAmount.toLocaleString()}원 {finalPaid ? "✓ 입금완료" : "미입금"}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {terms && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>계약 조건</Text>
            <Text style={S.terms}>{terms}</Text>
          </View>
        )}

        {/* 서명란 — 클라이언트 서명 포함 */}
        <View style={S.signBox}>
          <View style={S.signParty}>
            <Text style={S.signLabel}>발주처 (갑)</Text>
            <Text style={{ fontWeight: 700 }}>{signerName}</Text>
            <Image src={signatureBase64} style={S.signImage} />
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4 }}>{signedAt} 서명</Text>
          </View>
          <View style={S.signParty}>
            <Text style={S.signLabel}>수급사 (을)</Text>
            <Text>{supplierName ?? "___________________"}</Text>
            <Text style={{ color: "#94a3b8", marginTop: 4 }}>서명: ___________________</Text>
          </View>
        </View>

        <View style={S.footer}>
          <Text>본 계약서는 전자서명법에 따라 유효한 전자서명으로 체결되었습니다.</Text>
          <Text>{signedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/pdf/SignedContractPdf.tsx
git commit -m "feat: add SignedContractPdf component with signature image"
```

---

## Task 7: 공개 서명 페이지 (2단계 위자드)

**Files:**
- Create: `src/app/sign/contract/[token]/page.tsx`

이 페이지는 Next.js `layout.tsx`를 거치지 않는 공개 라우트. 로그인 불필요.

- [ ] **Step 1: 서명 페이지 작성**

`src/app/sign/contract/[token]/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContractData = {
  id: string;
  title: string;
  terms: string | null;
  clientName: string | null;
};

type PageState = "loading" | "error" | "step1" | "step2" | "done";

export default function SignContractPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [contract, setContract] = useState<ContractData | null>(null);
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);

  // 캔버스 너비를 컨테이너에 맞춰 설정 (모바일 정확도 보장)
  useEffect(() => {
    const container = sigContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setCanvasWidth(Math.floor(width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [state]);

  useEffect(() => {
    fetch(`/api/contracts/sign/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (json.error === "already_signed") {
            setErrorMsg("이미 서명이 완료된 계약서입니다.");
          } else if (json.error === "expired") {
            setErrorMsg("링크가 만료되었습니다. 담당자에게 재발송 요청해주세요.");
          } else {
            setErrorMsg("유효하지 않은 링크입니다. 담당자에게 문의해주세요.");
          }
          setState("error");
        } else {
          setContract(json);
          setState("step1");
        }
      })
      .catch(() => {
        setErrorMsg("네트워크 오류가 발생했습니다.");
        setState("error");
      });
  }, [token]);

  async function handleSubmit() {
    if (!signerName.trim()) return;
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;

    const signatureBase64 = sigCanvasRef.current.getCanvas().toDataURL("image/png");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), signatureBase64 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "서명 처리 중 오류가 발생했습니다.");
        setState("error");
        return;
      }
      setPdfUrl(json.pdfUrl ?? "");
      setState("done");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">계약서를 불러오는 중...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <p className="text-2xl mb-4">⚠️</p>
          <h1 className="text-slate-900 font-semibold mb-2">링크 오류</h1>
          <p className="text-slate-500 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="text-xl font-bold text-slate-900 mb-2">계약이 체결되었습니다!</h1>
          <p className="text-slate-500 text-sm mb-6">서명된 계약서가 이메일로 발송되었습니다.</p>
          {pdfUrl && (
            <Button asChild className="mb-3 w-full">
              <a href={pdfUrl} target="_blank" rel="noreferrer">📄 서명된 계약서 다운로드</a>
            </Button>
          )}
          <p className="text-slate-400 text-xs">이 창을 닫으셔도 됩니다.</p>
        </div>
      </div>
    );
  }

  const isStep1 = state === "step1";
  const isStep2 = state === "step2";

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-blue-600 text-white rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <span className="font-semibold text-sm">마그네이트코리아</span>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{isStep1 ? "1 / 2" : "2 / 2"}</span>
        </div>

        {isStep1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-1">{contract?.title}</h2>
            <p className="text-slate-500 text-xs mb-4">아래 계약서 내용을 확인해 주세요.</p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed mb-6 border border-slate-200">
              {contract?.terms ?? "계약 내용이 없습니다."}
            </div>
            <Button onClick={() => setState("step2")} className="w-full">
              다음 → 서명
            </Button>
          </div>
        )}

        {isStep2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <button
                onClick={() => setState("step1")}
                className="text-xs text-slate-400 hover:text-slate-600 mb-4"
              >
                ← 계약서 다시 보기
              </button>
              <h2 className="font-bold text-slate-900">서명해 주세요</h2>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                성함 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="홍길동"
                className="max-w-xs"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                서명 <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-slate-400 mb-2">마우스 또는 터치로 서명하세요</p>
              <div
                ref={sigContainerRef}
                className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                style={{ touchAction: "none" }}
              >
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="#1e293b"
                  canvasProps={{
                    width: canvasWidth,
                    height: Math.round(canvasWidth / 3),
                    style: { width: "100%", height: "auto", display: "block" },
                  }}
                />
              </div>
              <button
                onClick={() => sigCanvasRef.current?.clear()}
                className="text-xs text-slate-400 hover:text-slate-600 mt-1.5"
              >
                ↩ 다시 그리기
              </button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !signerName.trim()}
              className="w-full"
            >
              {submitting ? "처리 중..." : "서명 완료 →"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 개발 서버에서 UI 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/sign/contract/test-token` 접속.  
Expected: "유효하지 않은 링크입니다" 오류 화면 표시 (정상)

실제 토큰으로 전체 플로우 테스트:
1. ContractFormDialog에서 서명 요청 발송 (Task 8 완료 후)
2. 이메일 수신 → 링크 클릭
3. 계약서 확인 → 서명 → 제출
4. 완료 화면 + PDF 다운로드

- [ ] **Step 3: 커밋**

```bash
git add src/app/sign/
git commit -m "feat: add public e-sign page with 2-step wizard"
```

---

## Task 8: ContractFormDialog — "서명 요청 발송" 버튼

**Files:**
- Modify: `src/components/contracts/ContractFormDialog.tsx`

저장된 계약서에만 버튼 표시 (`isEdit === true`). 이미 서명 완료된 경우 비활성화.

- [ ] **Step 1: state + handler 추가**

`ContractFormDialog.tsx`의 state 선언 블록에 추가:

```ts
const [sigRequestLoading, setSigRequestLoading] = useState(false);
const [sigRequestSent, setSigRequestSent] = useState(false);
```

`handlePdfIssue` 함수 아래에 추가:

```ts
async function handleSendSignature() {
  if (!contract?.id) return;
  setSigRequestLoading(true);
  try {
    const res = await fetch("/api/contracts/send-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId: contract.id }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "발송 오류"); return; }
    setSigRequestSent(true);
  } catch { setError("네트워크 오류가 발생했습니다."); }
  finally { setSigRequestLoading(false); }
}
```

- [ ] **Step 2: 버튼 UI 추가**

`DialogFooter` 안 "PDF 발행" 버튼 옆에 추가:

```tsx
{isEdit && contract?.signature_token_used_at === null && (
  <Button
    type="button"
    onClick={handleSendSignature}
    disabled={sigRequestLoading || sigRequestSent || contract?.signed_at !== null}
    variant="outline"
    className="font-outfit mr-auto"
  >
    {sigRequestSent
      ? "✓ 서명 요청 발송됨"
      : sigRequestLoading
      ? "발송 중..."
      : "서명 요청 발송"}
  </Button>
)}
```

- [ ] **Step 3: useEffect에 초기화 추가**

기존 `useEffect` 내 reset 블록에:

```ts
setSigRequestSent(false);
setSigRequestLoading(false);
```

- [ ] **Step 4: 타입 체크 + 빌드**

```bash
npx tsc --noEmit
npm run build
```

Expected: 오류 없음

- [ ] **Step 5: 전체 플로우 수동 테스트**

1. `npm run dev`
2. 계약서 생성 → 저장
3. 계약서 다시 열기 → "서명 요청 발송" 버튼 확인
4. 버튼 클릭 → 클라이언트 이메일 수신 확인
5. 이메일 링크 → 서명 페이지 → 2단계 완료
6. 완료 화면 + PDF 다운로드 확인
7. 대시보드에서 계약서 상태 "서명완료" 변경 확인

- [ ] **Step 6: 커밋**

```bash
git add src/components/contracts/ContractFormDialog.tsx
git commit -m "feat: add send-signature button to ContractFormDialog"
```

---

## Task 9: Supabase Storage 버킷 생성

**전제조건:** Supabase 대시보드 접근 또는 CLI

- [ ] **Step 1: 버킷 생성**

Supabase 대시보드 → Storage → New Bucket:
- 이름: `contract-signatures`
- Public: **OFF** (Private)

또는 SQL 에디터에서:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-signatures', 'contract-signatures', false);
```

- [ ] **Step 2: Storage RLS 정책 설정**

```sql
-- 서비스 롤만 쓰기 가능 (API 라우트에서만 업로드)
CREATE POLICY "service_role_only_insert"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'contract-signatures');

CREATE POLICY "service_role_only_select"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'contract-signatures');
```

- [ ] **Step 3: 업로드 테스트**

전체 플로우(Task 8 Step 5) 재실행하여 Storage에 서명 이미지 + PDF 파일 생성 확인.

- [ ] **Step 4: handoff.md 업데이트**

```bash
# handoff.md 수동 업데이트 후
git add -A
git commit -m "feat: complete e-sign feature implementation"
```
