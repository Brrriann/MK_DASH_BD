"use server";

import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { TASK_TEMPLATES } from "@/lib/task-templates";

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

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
