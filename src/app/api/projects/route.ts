import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateProjectInput } from "@/lib/actions/projects";

const TASK_TEMPLATES: Record<string, string[]> = {
  웹사이트:  ["기획/요구사항 정리", "와이어프레임", "디자인 시안", "디자인 확정", "개발", "퍼블리싱", "검수", "납품"],
  쇼핑몰:   ["기획/요구사항 정리", "상품 카테고리 설계", "디자인 시안", "디자인 확정", "개발", "검수", "납품"],
  앱:       ["기획/요구사항 정리", "UI/UX 설계", "디자인", "개발", "테스트", "배포"],
  로고:     ["브리핑", "컨셉 제안", "1차 시안", "수정", "최종 확정", "파일 납품"],
  명함:     ["디자인 의뢰", "시안 확인", "수정", "최종 확정", "인쇄 발주", "수령/납품"],
  광고소재: ["기획", "소재 제작", "1차 검토", "수정", "최종 납품"],
  SNS관리:  ["컨텐츠 기획", "소재 제작", "업로드", "리포팅"],
  영상편집: ["원본 수령", "편집", "1차 검토", "수정", "최종 납품"],
  기타:     ["기획", "진행", "검수", "납품"],
};

export async function POST(req: Request) {
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
