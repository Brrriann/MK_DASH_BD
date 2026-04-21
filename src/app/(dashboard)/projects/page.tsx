"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FolderOpen, PencilSimple, Trash, Buildings } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { fetchProjects, deleteProject } from "@/lib/actions/projects";
import { fetchClients } from "@/lib/actions/clients";
import type { Project, ClientWithRevenue, ProjectStatus } from "@/lib/types";

function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5">
        진행중
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5">
        완료
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5">
      보류
    </span>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsData, clientsData] = await Promise.all([
        fetchProjects(),
        fetchClients(),
      ]);
      setProjects(projectsData);
      setClients(clientsData);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjects = projects
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title, "ko");
      }
      // newest (default)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  function handleNewProject() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  async function handleDelete(project: Project) {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteProject(project.id);
      await loadData();
    } catch {
      // silently fail; in production we'd show an error
    }
  }

  function getClientName(clientId: string | null): string | null {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.company_name ?? null;
  }

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-950">
            프로젝트 관리
          </h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {filteredProjects.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNewProject}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} weight="regular" />
          새 프로젝트
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="active">진행중</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
            <SelectItem value="on_hold">보류</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "newest")}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">최신순</SelectItem>
            <SelectItem value="name">이름순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="프로젝트가 없습니다"
          description={
            statusFilter !== "all"
              ? "선택한 상태에 해당하는 프로젝트가 없습니다."
              : "새 프로젝트 버튼을 눌러 첫 번째 프로젝트를 추가해 보세요."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const clientName = getClientName(project.client_id);
            return (
              <div
                key={project.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-950 text-sm leading-snug line-clamp-2 flex-1">
                    {project.title}
                  </h2>
                  <StatusBadge status={project.status} />
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-1">
                    {project.description}
                  </p>
                )}

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>진행률</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                    />
                  </div>
                </div>

                {/* Client */}
                {clientName && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Buildings size={14} weight="regular" className="shrink-0" />
                    <span className="truncate">{clientName}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(project)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="수정"
                  >
                    <PencilSimple size={15} weight="regular" />
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <Trash size={15} weight="regular" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        project={editingProject}
        clients={clients}
        onSaved={loadData}
      />
    </div>
  );
}
