import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/guard";
import type { CreateProjectInput } from "@/lib/actions/projects";
import { TASK_TEMPLATES } from "@/lib/task-templates";

export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as CreateProjectInput & { autoCreateTasks?: boolean };
    const supabase = createAdminClient();

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        title: body.title,
        description: body.description ?? null,
        status: body.status ?? "active",
        progress: body.progress ?? 0,
        client_id: body.client_id ?? null,
        pipeline_stage: body.pipeline_stage ?? "상담",
        service_type: body.service_type ?? null,
        contract_amount: body.contract_amount ?? null,
        deposit_ratio: body.deposit_ratio ?? 50,
        deposit_paid: body.deposit_paid ?? false,
        deposit_paid_at: body.deposit_paid_at ?? null,
        final_paid: body.final_paid ?? false,
        final_paid_at: body.final_paid_at ?? null,
        deadline: body.deadline ?? null,
        source_channel: body.source_channel ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // 서비스 유형 템플릿 자동 태스크 생성
    if (body.autoCreateTasks && body.service_type && TASK_TEMPLATES[body.service_type]) {
      const titles = TASK_TEMPLATES[body.service_type];
      await supabase.from("project_tasks").insert(
        titles.map((title, i) => ({ project_id: project.id, title, sort_order: i, completed: false }))
      );
    }

    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "생성 실패" },
      { status: 500 }
    );
  }
}
