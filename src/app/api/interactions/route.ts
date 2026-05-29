import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InteractionInput } from "@/lib/actions/interaction-actions";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InteractionInput;
    if (!body.summary?.trim()) {
      return NextResponse.json({ error: "요약은 필수입니다." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("interactions").insert({
      ...body,
      occurred_at: body.occurred_at ?? new Date().toISOString(),
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
