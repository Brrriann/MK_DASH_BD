import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that do NOT require authentication.
// 주의: "/api" 전체를 공개하면 안 됨 — 외부 토큰 기반 경로만 명시적으로 허용한다.
const PUBLIC_PATHS = [
  "/login",
  "/reset-password",
  "/auth", // 인증 콜백 (/auth/callback)
  "/portal", // 외부 클라이언트 포털 (토큰 기반)
  "/sign", // 외부 계약 서명 페이지 (토큰 기반)
  "/api/contracts/sign", // 외부 계약 서명 API
  "/api/auth/callback", // 인증 콜백 API (안전망)
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams, origin } = new URL(request.url);

  // Supabase password recovery lands at Site URL with token_hash — forward to callback
  if (searchParams.get("token_hash") && searchParams.get("type") === "recovery") {
    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("token_hash", searchParams.get("token_hash")!);
    callbackUrl.searchParams.set("type", "recovery");
    return NextResponse.redirect(callbackUrl);
  }

  // Always allow public paths without auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, redirect to login (safe fallback)
  if (!supabaseUrl || !supabaseAnonKey) {
    return loginRedirect(request);
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // No session → redirect to login
    if (!session) {
      return loginRedirect(request);
    }
  } catch {
    // Auth check failed → redirect to login for safety
    return loginRedirect(request);
  }

  return supabaseResponse;
}
