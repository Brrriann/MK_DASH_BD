import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectsClient } from "@/components/projects/ProjectsClient";
import type { Project, ClientWithRevenue } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = createAdminClient();

  const [projectsResult, clientsResult] = await Promise.allSettled([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("clients_with_revenue").select("*"),
  ]);

  const projects = projectsResult.status === "fulfilled"
    ? (projectsResult.value.data ?? []) as Project[]
    : [];

  const clients = clientsResult.status === "fulfilled"
    ? (clientsResult.value.data ?? []) as ClientWithRevenue[]
    : [];

  return <ProjectsClient initialProjects={projects} clients={clients} />;
}
