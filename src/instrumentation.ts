// Cloudflare Workers 프로덕션에서 숨겨지는 실제 서버 에러를 캡처하기 위한 진단용 훅.
// onRequestError 는 서버 컴포넌트/서버 액션 렌더 중 발생한 실제 에러를 받는다.
// 마지막 에러를 globalThis 에 저장 → /api/debug 에서 조회.

export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string; routeType?: string }
) {
  const g = globalThis as unknown as { __lastError?: unknown };
  g.__lastError = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    name: err instanceof Error ? err.name : undefined,
    path: request?.path,
    method: request?.method,
    routeType: context?.routeType,
    routePath: context?.routePath,
    at: new Date().toISOString(),
  };
}
