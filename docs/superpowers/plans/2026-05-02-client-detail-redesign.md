# Client Detail Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/clients/[id]` from a single-column tab layout to a sticky 2-column layout with an inline meeting note creation flow.

**Architecture:** Left panel (280px, sticky) holds client identity, contact info, KPI stats, and action buttons. Right panel (fluid) holds tabbed content with count badges, a `+ 새 미팅노트` button in the meeting notes tab, and hover-reveal edit/delete actions per card. `/meetings/new` gains a `?client_id=` search param to pre-fill the client selector.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v3, shadcn/ui Tabs, @phosphor-icons/react (size=16 regular)

**Style rules (CLAUDE.md):**
- Font: Outfit only (no Inter)
- Accent: blue-600 only (no purple)
- Text: slate-950 / slate-900 (no pure #000)
- Layout: CSS Grid only (no flex %, no h-screen → use min-h-[100dvh])
- Icons: @phosphor-icons/react size=16 weight="regular"

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/(dashboard)/clients/[id]/page.tsx` | **Rewrite** | 2-column layout, sticky left panel, tabbed right panel, hover CRUD |
| `src/app/(dashboard)/meetings/new/page.tsx` | **Modify** | Read `?client_id=` search param, pre-fill client Select |

---

## Task 1: Add `?client_id=` pre-fill to `/meetings/new`

**Files:**
- Modify: `src/app/(dashboard)/meetings/new/page.tsx`

This is a small, self-contained change — add `useSearchParams`, read `client_id`, and initialise state with it. Do this first so the link from the redesigned client page works immediately.

- [ ] **Step 1: Add `useSearchParams` import and read the param**

In `src/app/(dashboard)/meetings/new/page.tsx`, add `useSearchParams` to the `next/navigation` import line:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
```

Inside `NewMeetingPage()`, before the existing state declarations, add:

```tsx
const searchParams = useSearchParams();
const initialClientId = searchParams.get("client_id") ?? "";
```

Then change the `clientId` state initialiser from `""` to `initialClientId`:

```tsx
const [clientId, setClientId] = useState<string>(initialClientId);
```

- [ ] **Step 2: Verify dev server compiles without errors**

Run: `npm run dev`
Expected: No TypeScript errors, page loads at `/meetings/new`.

- [ ] **Step 3: Manual smoke-test**

Navigate to `/meetings/new?client_id=any-uuid` in the browser.
Expected: The client Select shows the matching client pre-selected (or stays empty if UUID doesn't exist in DB).

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/meetings/new/page.tsx
git commit -m "feat: pre-fill client from ?client_id= search param on new meeting page"
```

---

## Task 2: Rewrite client detail page — 2-column layout

**Files:**
- Rewrite: `src/app/(dashboard)/clients/[id]/page.tsx`

Replace the entire JSX return. Keep all existing state, data-fetching (`loadAll`), and handler logic (`handleDelete`, `setEditOpen`) unchanged. Only the rendered markup changes.

### Layout skeleton

```
┌─ topbar (back link + company name breadcrumb) ────────────────┐
│                                                               │
├─ left panel (280px sticky) ─┬─ right panel (fluid) ──────────┤
│  • avatar + name + badge    │  • Tabs bar (미팅노트/프로젝트/ │
│  • contact info dl          │    견적·계약/세금계산서) w/ count│
│  • memo box (if present)    │  • Tab content                 │
│  • KPI 2×2 grid             │    — section header + "+ 추가"  │
│  • edit + delete buttons    │    — cards w/ hover actions    │
└─────────────────────────────┴────────────────────────────────┘
```

Grid: `grid-cols-1 lg:grid-cols-[280px_1fr]`
Left panel: `lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-48px)] lg:overflow-y-auto`

- [ ] **Step 1: Replace the page wrapper and add back-link + page grid**

Replace the outer `<div className="font-outfit">` with:

```tsx
return (
  <div className="font-outfit">
    {/* Back link */}
    <div className="mb-5">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={16} weight="regular" />
        클라이언트 목록
      </Link>
    </div>

    {/* 2-column grid */}
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      {/* LEFT PANEL */}
      {/* RIGHT PANEL */}
    </div>

    {/* Edit Sheet */}
    <ClientFormSheet
      open={editOpen}
      onOpenChange={setEditOpen}
      client={client}
      onSuccess={loadAll}
    />
  </div>
);
```

- [ ] **Step 2: Build the left panel**

Replace `{/* LEFT PANEL */}` comment with:

```tsx
<aside className="lg:sticky lg:top-6 lg:self-start bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">

  {/* Identity */}
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-outfit font-bold text-blue-600 text-lg shrink-0">
      {client.company_name.charAt(0)}
    </div>
    <div className="min-w-0">
      <h1 className="font-outfit font-bold text-slate-900 text-lg leading-tight truncate">
        {client.company_name}
      </h1>
      <div className="mt-1.5">
        <StatusBadge status={client.status} />
      </div>
    </div>
  </div>

  <div className="h-px bg-slate-100" />

  {/* Contact info */}
  <div>
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">연락처 정보</p>
    <dl className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        <User size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
        <div>
          <dt className="text-[10px] text-slate-400 mb-0.5">담당자</dt>
          <dd className="text-sm text-slate-900">{client.contact_name}</dd>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <EnvelopeSimple size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
        <div>
          <dt className="text-[10px] text-slate-400 mb-0.5">이메일</dt>
          <dd className="text-sm text-slate-900 break-all">{client.email}</dd>
        </div>
      </div>
      {client.phone && (
        <div className="flex items-start gap-2.5">
          <Phone size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <dt className="text-[10px] text-slate-400 mb-0.5">전화번호</dt>
            <dd className="text-sm text-slate-900">{client.phone}</dd>
          </div>
        </div>
      )}
      {client.industry && (
        <div className="flex items-start gap-2.5">
          <Briefcase size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <dt className="text-[10px] text-slate-400 mb-0.5">업종</dt>
            <dd className="text-sm text-slate-900">{client.industry}</dd>
          </div>
        </div>
      )}
      {client.source && (
        <div className="flex items-start gap-2.5">
          <ShareNetwork size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <dt className="text-[10px] text-slate-400 mb-0.5">소스</dt>
            <dd className="text-sm text-slate-900">{client.source}</dd>
          </div>
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <Buildings size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
        <div>
          <dt className="text-[10px] text-slate-400 mb-0.5">등록일</dt>
          <dd className="text-sm text-slate-900">{formatDate(client.created_at)}</dd>
        </div>
      </div>
    </dl>
  </div>

  {/* Memo */}
  {client.notes && (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-1.5">메모</p>
      <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
    </div>
  )}

  <div className="h-px bg-slate-100" />

  {/* KPI grid */}
  <div>
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">주요 지표</p>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-[10px] text-slate-400 mb-1">총 프로젝트</p>
        <p className="font-outfit text-xl font-bold text-slate-900">{projects.length}</p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-[10px] text-slate-400 mb-1">진행중</p>
        <p className="font-outfit text-xl font-bold text-blue-600">{activeProjects}</p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-[10px] text-slate-400 mb-1">총 거래액</p>
        <p className="font-outfit text-sm font-bold text-slate-900">{formatKRW(client.total_revenue)}</p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-[10px] text-slate-400 mb-1">총 견적액</p>
        <p className="font-outfit text-sm font-bold text-slate-900">{formatKRW(totalEstimates)}</p>
      </div>
    </div>
  </div>

  {/* Actions */}
  <div className="flex flex-col gap-2">
    <button
      onClick={() => setEditOpen(true)}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
    >
      <PencilSimple size={16} weight="regular" />
      클라이언트 수정
    </button>
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
    >
      <Trash size={16} weight="regular" />
      삭제
    </button>
  </div>

</aside>
```

- [ ] **Step 3: Build the right panel — tabs with count badges**

Replace `{/* RIGHT PANEL */}` comment with:

```tsx
<div className="min-w-0">
  <Tabs defaultValue="meeting-notes">
    <TabsList className="w-full justify-start mb-5 flex-wrap">
      <TabsTrigger value="meeting-notes">
        미팅노트
        {meetingNotes.length > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-semibold">
            {meetingNotes.length}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger value="projects">
        프로젝트
        {projects.length > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
            {projects.length}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger value="estimates">
        견적·계약
        {(estimates.length + contracts.length) > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
            {estimates.length + contracts.length}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger value="tax">
        세금계산서
        {taxInvoices.length > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
            {taxInvoices.length}
          </span>
        )}
      </TabsTrigger>
    </TabsList>

    {/* TAB CONTENTS — see Task 3 */}

  </Tabs>
</div>
```

- [ ] **Step 4: Verify layout renders at lg breakpoint**

Run dev server, open `/clients/[any-id]`.
Expected: 2-column at ≥1024px, single column on mobile. Left panel shows client info, right panel shows empty tab placeholders.

- [ ] **Step 5: Commit skeleton**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx
git commit -m "feat: client detail 2-column grid skeleton with sticky left panel"
```

---

## Task 3: Fill tab contents — 미팅노트 tab (with "+ 새 미팅노트")

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

The 미팅노트 tab is the primary new feature. It must show a section header with a `+ 새 미팅노트` button linking to `/meetings/new?client_id={id}`, and each card must expose edit/delete actions on hover.

Add the `Plus` icon to the phosphor import at the top of the file.

- [ ] **Step 1: Add Plus to icon imports**

In the import block at the top of `page.tsx`, add `Plus` to the `@phosphor-icons/react` import:

```tsx
import {
  PencilSimple,
  Trash,
  Buildings,
  User,
  EnvelopeSimple,
  Phone,
  Briefcase,
  ShareNetwork,
  Plus,
  FilePdf,
} from "@phosphor-icons/react";
```

Remove unused `Note` and `ArrowLeft` is still needed for back link — keep `ArrowLeft`.

- [ ] **Step 2: Replace `{/* TAB CONTENTS */}` with 미팅노트 TabsContent**

```tsx
{/* 미팅노트 Tab */}
<TabsContent value="meeting-notes">
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-outfit font-semibold text-slate-800 text-sm">미팅노트</h2>
    <Link
      href={`/meetings/new?client_id=${id}`}
      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
    >
      <Plus size={12} weight="regular" />
      새 미팅노트
    </Link>
  </div>
  <div className="space-y-3">
    {meetingNotes.length === 0 ? (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-400">기록된 미팅노트가 없습니다.</p>
        <Link
          href={`/meetings/new?client_id=${id}`}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus size={12} weight="regular" />
          첫 미팅노트 작성하기
        </Link>
      </div>
    ) : (
      meetingNotes.map((note) => (
        <Link
          key={note.id}
          href={`/meetings/${note.id}`}
          className="group block rounded-xl border border-slate-200 bg-white shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-outfit font-medium text-slate-900 text-sm">{note.title}</h3>
            {note.method && (
              <span className="group-hover:hidden inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                {methodLabel[note.method] ?? note.method}
              </span>
            )}
            <div className="hidden group-hover:flex items-center gap-1 shrink-0">
              <span
                onClick={(e) => { e.stopPropagation(); }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <PencilSimple size={12} weight="regular" />
                수정
              </span>
              {/* 수정: stops propagation but lets parent <Link> still navigate to /meetings/{id} */}
              <span
                onClick={(e) => { e.preventDefault(); }}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 cursor-pointer"
              >
                <Trash size={12} weight="regular" />
                삭제
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-1.5">{formatDate(note.met_at)}</p>
          {note.content && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {note.content.slice(0, 100)}{note.content.length > 100 ? "..." : ""}
            </p>
          )}
        </Link>
      ))
    )}
  </div>
</TabsContent>
```

> **Note on hover actions:** The edit/delete buttons currently only `e.preventDefault()`. Wire up real delete in a follow-up task (Task 5). Edit navigates to `/meetings/{id}` — already handled by the parent Link.

- [ ] **Step 3: Verify 미팅노트 tab renders correctly**

Open `/clients/[id]` in browser, click 미팅노트 tab.
Expected: Section header with "+ 새 미팅노트" link. Cards show method badge normally, on hover show 수정/삭제 buttons instead of badge.

Click "+ 새 미팅노트". Expected: navigates to `/meetings/new?client_id={id}` with the client pre-selected.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx
git commit -m "feat: 미팅노트 tab with new-note CTA and hover CRUD actions"
```

---

## Task 4: Fill remaining tab contents (프로젝트, 견적·계약, 세금계산서)

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

Port the existing tab content from the old page, adding section headers with count and styling to match the new design. No functional changes — just cosmetic alignment with the new layout.

- [ ] **Step 1: Add 프로젝트 TabsContent**

```tsx
{/* 프로젝트 Tab */}
<TabsContent value="projects">
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-outfit font-semibold text-slate-800 text-sm">프로젝트</h2>
  </div>
  <div className="space-y-3">
    {projects.length === 0 ? (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-400">등록된 프로젝트가 없습니다.</p>
      </div>
    ) : (
      projects.map((project) => (
        <Link
          key={project.id}
          href="/projects"
          className="block rounded-xl border border-slate-200 bg-white shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="font-outfit font-medium text-slate-900 text-sm">{project.title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${projectStatusClass[project.status] ?? ""}`}>
              {projectStatusLabel[project.status] ?? project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-xs text-slate-500 mb-2 line-clamp-1">{project.description}</p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${project.progress}%` }} />
            </div>
            <span className="text-xs text-slate-400 shrink-0">{project.progress}%</span>
          </div>
        </Link>
      ))
    )}
  </div>
</TabsContent>
```

- [ ] **Step 2: Add 견적·계약 TabsContent**

```tsx
{/* 견적·계약 Tab */}
<TabsContent value="estimates">
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-outfit font-semibold text-slate-800 text-sm">견적·계약</h2>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
    {/* 견적서 */}
    <div>
      <h3 className="font-outfit font-semibold text-slate-800 text-sm mb-3">견적서</h3>
      {estimates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-400">견적서가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {estimates.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-outfit font-medium text-slate-900 text-sm">{e.title}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estimateStatusClass[e.status] ?? ""}`}>
                  {estimateStatusLabel[e.status] ?? e.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{formatKRW(e.amount)}</p>
              <p className="text-xs text-slate-400">{formatDate(e.issued_at)}</p>
              {e.pdf_url && (
                <a href={e.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  onClick={(ev) => ev.stopPropagation()}>
                  <FilePdf size={14} weight="regular" />PDF 보기
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    {/* 계약서 */}
    <div>
      <h3 className="font-outfit font-semibold text-slate-800 text-sm mb-3">계약서</h3>
      {contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-400">계약서가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-outfit font-medium text-slate-900 text-sm">{c.title}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${contractStatusClass[c.status] ?? ""}`}>
                  {contractStatusLabel[c.status] ?? c.status}
                </span>
              </div>
              {c.signed_at && <p className="text-xs text-slate-500 mb-1">서명일: {formatDate(c.signed_at)}</p>}
              {c.expires_at && <p className="text-xs text-slate-400">만료일: {formatDate(c.expires_at)}</p>}
              {c.pdf_url && (
                <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  onClick={(ev) => ev.stopPropagation()}>
                  <FilePdf size={14} weight="regular" />PDF 보기
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
</TabsContent>
```

- [ ] **Step 3: Add 세금계산서 TabsContent**

```tsx
{/* 세금계산서 Tab */}
<TabsContent value="tax">
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-outfit font-semibold text-slate-800 text-sm">세금계산서</h2>
  </div>
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    {taxInvoices.length === 0 ? (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-400">발행된 세금계산서가 없습니다.</p>
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">제목</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">금액</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">발행일</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">PDF</th>
          </tr>
        </thead>
        <tbody>
          {taxInvoices.map((ti) => (
            <tr key={ti.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{ti.title}</td>
              <td className="px-4 py-3 text-sm text-slate-700 font-outfit">{formatKRW(ti.amount)}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{formatDate(ti.issued_at)}</td>
              <td className="px-4 py-3">
                {ti.pdf_url ? (
                  <a href={ti.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                    <FilePdf size={14} weight="regular" />보기
                  </a>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</TabsContent>
```

- [ ] **Step 4: Verify all tabs render without errors**

Open `/clients/[id]`. Switch through all 4 tabs.
Expected: Each tab shows its content (or empty state). No console errors.

- [ ] **Step 5: Check mobile layout**

Resize browser to 375px width.
Expected: Single column, left panel at top, tabs below. No horizontal scroll.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx
git commit -m "feat: complete client detail 2-column redesign with all tab contents"
```

---

## Task 5: Wire up delete on meeting note hover action

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

The hover 삭제 button currently does nothing. Add a `handleDeleteMeetingNote` function and wire it up, matching the existing `handleDelete` pattern.

Check `src/lib/actions/clients.ts` — if `deleteClientMeetingNote` or a meetings-specific delete action doesn't exist, use the Supabase client directly or add the action. Only implement what's needed.

- [ ] **Step 1: Check available delete action**

Use Grep tool to search for `deleteMeetingNote` in `src/lib/actions/`.
Expected: find it in `src/lib/actions/meetings.ts`. If NOT found, proceed to Step 1b.

- [ ] **Step 1b (only if not found): Add `deleteMeetingNote` to `src/lib/actions/meetings.ts`**

```ts
export async function deleteMeetingNote(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_notes").delete().eq("id", id);
  if (error) throw error;
}
```

Follow the same `createClient` import pattern used by other functions in that file.

- [ ] **Step 2: Add delete handler in page component**

Import `deleteMeetingNote` from `@/lib/actions/meetings` at the top of `page.tsx`. After the existing `handleDelete` function, add:

```tsx
async function handleDeleteNote(noteId: string, e: React.MouseEvent) {
  e.preventDefault();
  const confirmed = window.confirm("이 미팅노트를 삭제하시겠습니까?");
  if (!confirmed) return;
  try {
    await deleteMeetingNote(noteId);
    setMeetingNotes((prev) => prev.filter((n) => n.id !== noteId));
  } catch {
    alert("삭제 중 오류가 발생했습니다.");
  }
}
```

- [ ] **Step 3: Wire the handler into the hover 삭제 button**

In the 미팅노트 tab card, change:

```tsx
onClick={(e) => { e.preventDefault(); }}
```

to:

```tsx
onClick={(e) => handleDeleteNote(note.id, e)}
```

for the 삭제 span only.

- [ ] **Step 4: Verify delete works**

In browser, hover a meeting note card, click 삭제.
Expected: Confirm dialog appears. On confirm, card disappears from the list without page reload.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx
git commit -m "feat: wire delete handler on meeting note hover action"
```

---

## Completion Checklist

- [ ] `/clients/[id]` shows 2-column layout on desktop (≥1024px)
- [ ] Left panel is sticky and scrolls independently
- [ ] Single-column on mobile (no horizontal scroll)
- [ ] "커뮤니케이션" tab is gone; "미팅노트" tab is default
- [ ] Count badges on all tabs
- [ ] "+ 새 미팅노트" CTA navigates to `/meetings/new?client_id={id}` with client pre-selected
- [ ] Meeting note cards: badge visible normally, hover shows 수정/삭제 buttons
- [ ] 삭제 on hover removes card without page reload
- [ ] All existing tabs (프로젝트, 견적·계약, 세금계산서) still function
- [ ] `npm run build` passes with no TypeScript errors
