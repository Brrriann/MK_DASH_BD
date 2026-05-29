import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

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

  return NextResponse.json(info);
}
