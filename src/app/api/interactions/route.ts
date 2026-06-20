import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/guard";
import type { InteractionInput } from "@/lib/actions/interaction-actions";

export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as InteractionInput;
    if (!body.summary?.trim()) {
      return NextResponse.json({ error: "요약은 필수입니다." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("interactions").insert({
      lead_id: body.lead_id ?? null,
      client_id: body.client_id ?? null,
      type: body.type,
      summary: body.summary.trim(),
      content: body.content ?? null,
      occurred_at: body.occurred_at ?? new Date().toISOString(),
      follow_up_at: body.follow_up_at ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "저장 실패" },
      { status: 500 }
    );
  }
}
