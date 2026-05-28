# Handoff — 마그네이트코리아 대시보드

## 현재 상태

- **빌드:** Cloudflare Workers 배포 중 (GitHub Actions CI)
- **로컬 개발:** `npm run dev` — `D:\project\magnatekorea dashboard\` (원본 디렉토리)에서 실행 권장
- **주의:** worktree 경로(`.claude/worktrees/`)에서 dev 실행 시 Windows UNKNOWN 파일 잠금 에러 간헐 발생

## 최근 완료 작업 (2026-05-28)

### 비밀번호 재설정 플로우 구현 ✅
- `src/app/(auth)/login/page.tsx` — "비밀번호 찾기" 모드 추가 (`resetPasswordForEmail` + `redirectTo: /reset-password`)
- `src/app/(auth)/reset-password/page.tsx` — 신규 생성, `onAuthStateChange` + `getSession()` 으로 복구 세션 감지
- `src/app/auth/callback/route.ts` — 신규 생성 (Supabase 기본 redirect 경로 `/auth/callback` 처리)
- `src/app/api/auth/callback/route.ts` — `?next=` 파라미터 지원, 쿠키를 redirect 응답에 직접 세팅
- `src/lib/supabase/middleware.ts` — `/reset-password`, `/auth` 공개 경로 추가

### 미들웨어 성능 개선 ✅
- `getUser()` → `getSession()` 교체: 매 요청마다 Supabase 서버 네트워크 왕복 제거 → 응답 속도 대폭 개선

### 기타
- `next.config.ts` — `outputFileTracingRoot` `experimental` 밖으로 이동 (경고 제거)
- GitHub CLI 재인증 완료 (`Brrriann`)
- Supabase Redirect URLs에 `http://localhost:3000/reset-password` 추가됨

## 알려진 이슈

- **Resend 이메일 발송:** 아직 미테스트 (이전 세션 이슈, 재확인 필요)
- **Bolta API** (`/api/bolta/issue`): 실제 API 키 테스트 필요
- **Supabase 마이그레이션 009**: 적용 완료 여부 확인 필요
- **Security Definer View** (`public.clients_with_revenue`): SQL 실행 필요 (명령어는 이전 대화 참고)

## 다음 TODO

1. 비밀번호 재설정 플로우 최종 테스트 (앱 "비밀번호 찾기" → 이메일 → `/reset-password`)
2. Resend 이메일 발송 재테스트
3. 프로덕션 배포 후 Cloudflare Workers URL에서도 동일 플로우 확인
