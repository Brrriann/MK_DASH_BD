"use server";

import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TASK_TEMPLATES: Record<string, string[]> = {
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

export async function fetchProjectTasksAction(projectId: string): Promise<ProjectTask[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectTask[];
}

export async function addProjectTaskAction(
  projectId: string,
  title: string,
  sortOrder: number
): Promise<ProjectTask> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("project_tasks")
    .insert({ project_id: projectId, title, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidateTag("projects");
  return data as ProjectTask;
}

export async function toggleProjectTaskAction(
  taskId: string,
  completed: boolean
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("project_tasks")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function deleteProjectTaskAction(taskId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateTag("projects");
}

export async function createTasksFromTemplateAction(
  projectId: string,
  serviceType: string
): Promise<ProjectTask[]> {
  const titles = TASK_TEMPLATES[serviceType] ?? TASK_TEMPLATES["기타"];
  const supabase = createAdminClient();

  // 기존 태스크 삭제 후 템플릿 삽입
  await supabase.from("project_tasks").delete().eq("project_id", projectId);

  const { data, error } = await supabase
    .from("project_tasks")
    .insert(
      titles.map((title, i) => ({
        project_id: projectId,
        title,
        sort_order: i,
        completed: false,
      }))
    )
    .select()
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  revalidateTag("projects");
  return (data ?? []) as ProjectTask[];
}
