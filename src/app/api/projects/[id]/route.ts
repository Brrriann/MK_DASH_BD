import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/guard";
import type { Project } from "@/lib/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    const body = (await req.json()) as Partial<Project>;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ project: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "수정 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "삭제 실패" },
      { status: 500 }
    );
  }
}
