import { createBrowserClient } from "@supabase/ssr";
import type { Task, TaskStatus, Client, Project, MeetingNote } from "@/lib/types";

export interface TaskWithClient extends Task {
  client?: { company_name: string } | null;
  project?: { title: string } | null;
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: "high" | "medium" | "low";
  due_date?: string | null;
  project_id?: string | null;
  client_id?: string | null;
};

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchTasks(clientId?: string): Promise<TaskWithClient[]> {
  const supabase = getClient();
  let query = supabase
    .from("tasks")
    .select(`
      *,
      client:clients(company_name),
      project:projects(title)
    `)
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TaskWithClient[];
}

export async function fetchProjectOptions(): Promise<Project[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("title", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClients(): Promise<Client[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("company_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTask(data: CreateTaskInput): Promise<Task> {
  const supabase = getClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "todo",
      priority: data.priority ?? "medium",
      due_date: data.due_date ?? null,
      project_id: data.project_id ?? null,
      client_id: data.client_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return task;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  const supabase = getClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return task;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTaskMeetingNotes(taskId: string): Promise<MeetingNote[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("task_meeting_notes")
    .select(`
      meeting_note:meeting_notes(*)
    `)
    .eq("task_id", taskId);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []).map((row: any) => row.meeting_note).filter(Boolean)) as MeetingNote[];
}
