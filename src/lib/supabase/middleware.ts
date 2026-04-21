import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function loginRedirect(request: NextRequest) {
  // Use new URL() instead of nextUrl.clone() for Cloudflare Workers compatibility
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { pathname } = new URL(request.url);
  const isAuthRoute = pathname.startsWith("/login");
  const isPortalRoute = pathname.startsWith("/portal");
  const isApiRoute = pathname.startsWith("/api");
  const isProtected = !isAuthRoute && !isPortalRoute && !isApiRoute;

  // Env vars not set — redirect to login for all protected routes
  if (!supabaseUrl || !supabaseAnonKey) {
    return isProtected
      ? loginRedirect(request)
      : NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user && isProtected) {
      return loginRedirect(request);
    }
  } catch {
    // Auth check failed — redirect to login for safety
    if (isProtected) {
      return loginRedirect(request);
    }
  }

  return supabaseResponse;
}
