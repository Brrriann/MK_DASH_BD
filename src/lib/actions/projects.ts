import { createBrowserClient } from "@supabase/ssr";
import type { Project, ProjectStatus, PipelineStage, ServiceType, SourceChannel } from "@/lib/types";

export type CreateProjectInput = {
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  progress?: number;
  client_id?: string | null;
  pipeline_stage?: PipelineStage;
  service_type?: ServiceType | null;
  contract_amount?: number | null;
  deposit_ratio?: number;
  deposit_paid?: boolean;
  deposit_paid_at?: string | null;
  final_paid?: boolean;
  final_paid_at?: string | null;
  deadline?: string | null;
  source_channel?: SourceChannel | null;
};

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchProjects(): Promise<Project[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function fetchProject(id: string): Promise<Project | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Project;
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  const supabase = getClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "active",
      progress: data.progress ?? 0,
      client_id: data.client_id ?? null,
      pipeline_stage: data.pipeline_stage ?? '상담',
      service_type: data.service_type ?? null,
      contract_amount: data.contract_amount ?? null,
      deposit_ratio: data.deposit_ratio ?? 50,
      deposit_paid: data.deposit_paid ?? false,
      deposit_paid_at: data.deposit_paid_at ?? null,
      final_paid: data.final_paid ?? false,
      final_paid_at: data.final_paid_at ?? null,
      deadline: data.deadline ?? null,
      source_channel: data.source_channel ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const supabase = getClient();
  const { data: project, error } = await supabase
    .from("projects")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
