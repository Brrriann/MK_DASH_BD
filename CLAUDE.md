# 마그네이트코리아 대시보드

## 개발 환경 실행
```bash
npm run dev       # http://localhost:3000
supabase start    # 로컬 Supabase (supabase CLI 필요)
```

## 환경변수
`.env.local` 파일에 Supabase URL, anon key, service role key 필요.

## 기술 스택
- Next.js 15 App Router + TypeScript
- Tailwind CSS v3 + shadcn/ui
- @phosphor-icons/react (size=16, weight="regular")
- Supabase (Auth + PostgreSQL + RLS)
- Outfit 폰트

## 스타일 규칙
- Inter 폰트 금지, Outfit 사용
- 퍼플 계열 금지, blue-600 단일 포인트
- 순수 #000 금지, slate-950 사용
- `h-screen` 금지, `min-h-[100dvh]` 사용
- flex 퍼센트 계산 금지, CSS Grid 사용

## 스펙 문서
`docs/superpowers/specs/2026-04-21-magnate-dashboard-design.md`

## 아이콘
`@phosphor-icons/react` 사용. size=16, weight="regular" 통일.
Server Component에서는 `/ssr` 서브패키지에서 import:
`import { SquaresFour } from "@phosphor-icons/react/ssr"`
