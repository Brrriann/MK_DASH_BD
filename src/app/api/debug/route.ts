import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const info: Record<string, unknown> = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .limit(1);

    if (error) {
      info.supabaseError = error.message;
      info.supabaseCode = error.code;
    } else {
      info.supabaseOk = true;
      info.rowCount = data?.length ?? 0;
    }
  } catch (err) {
    info.adminClientError = err instanceof Error ? err.message : String(err);
  }

  // instrumentation 의 onRequestError 가 저장한 마지막 서버 에러 (서버 액션 실패 진단용)
  const g = globalThis as unknown as { __lastError?: unknown; __layoutAuthError?: unknown };
  info.lastError = g.__lastError ?? null;
  info.layoutAuthError = g.__layoutAuthError ?? null;

  return NextResponse.json(info);
}
