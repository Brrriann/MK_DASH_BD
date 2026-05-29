"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ProjectDeliverable {
  id: string;
  project_id: string;
  title: string;
  url: string;
  created_at: string;
}

export async function fetchProjectDeliverablesAction(
  projectId: string
): Promise<ProjectDeliverable[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("project_deliverables")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectDeliverable[];
}

export async function addProjectDeliverableAction(
  projectId: string,
  title: string,
  url: string
): Promise<ProjectDeliverable> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("project_deliverables")
    .insert({ project_id: projectId, title, url })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProjectDeliverable;
}

export async function deleteProjectDeliverableAction(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("project_deliverables")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
