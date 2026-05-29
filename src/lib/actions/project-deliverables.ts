"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ProjectDeliverable {
  id: string;
  project_id: string;
  title: string;
  url: string;
  created_at: string;
}

export type DeliverableUrlType =
  | "figma"
  | "drive"
  | "notion"
  | "github"
  | "youtube"
  | "link";

export function detectUrlType(url: string): DeliverableUrlType {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes("figma.com")) return "figma";
    if (
      hostname.includes("drive.google.com") ||
      hostname.includes("docs.google.com") ||
      hostname.includes("sheets.google.com") ||
      hostname.includes("slides.google.com")
    )
      return "drive";
    if (hostname.includes("notion.so") || hostname.includes("notion.site"))
      return "notion";
    if (hostname.includes("github.com") || hostname.includes("gitlab.com"))
      return "github";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be"))
      return "youtube";
  } catch {
    // invalid URL
  }
  return "link";
}

export const URL_TYPE_CONFIG: Record<
  DeliverableUrlType,
  { label: string; emoji: string; bg: string; text: string; border: string }
> = {
  figma:   { label: "Figma",        emoji: "🎨", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  drive:   { label: "Google Drive", emoji: "📂", bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"   },
  notion:  { label: "Notion",       emoji: "📄", bg: "bg-slate-100", text: "text-slate-700",  border: "border-slate-200"  },
  github:  { label: "GitHub",       emoji: "🐙", bg: "bg-slate-900", text: "text-white",      border: "border-slate-700"  },
  youtube: { label: "YouTube",      emoji: "🎬", bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"    },
  link:    { label: "링크",          emoji: "🔗", bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200"  },
};

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
