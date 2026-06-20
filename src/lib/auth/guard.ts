import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API 라우트 인증 가드.
 * 세션이 없으면 401 응답을 반환하고, 있으면 null을 반환한다.
 *
 * 사용 예:
 *   const unauth = await requireAuth();
 *   if (unauth) return unauth;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
