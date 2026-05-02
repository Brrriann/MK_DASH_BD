"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, FolderOpen, PencilSimple, Trash, Buildings, Rows, Kanban } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { fetchProjects, deleteProject } from "@/lib/actions/projects";
import { fetchClients } from "@/lib/actions/clients";
import type { Project, ClientWithRevenue, PipelineStage } from "@/lib/types";

const PIPELINE_STAGES: PipelineStage[] = ['상담', '견적', '계약', '계산서발행', '계약입금', '착수', '납품', '완납'];

function KanbanView({ projects, clients, onEdit }: {
  projects: Project[];
  clients: ClientWithRevenue[];
  onEdit: (p: Project) => void;
}) {
  function getClientName(clientId: string | null) {
    if (!clientId) return null;
    return clients.find(c => c.id === clientId)?.company_name ?? null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map(stage => {
        const stageProjects = projects.filter(p => p.pipeline_stage === stage);
        const totalAmount = stageProjects.reduce((s, p) => s + (p.contract_amount ?? 0), 0);
        return (
          <div key={stage} className="flex-shrink-0 w-52">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-slate-600">{stage}</span>
              <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{stageProjects.length}</span>
            </div>
            {totalAmount > 0 && (
              <p className="text-[10px] text-slate-400 mb-2 px-1">
                {(totalAmount / 10000).toFixed(0)}만원
              </p>
            )}
            <div className="flex flex-col gap-2">
              {stageProjects.map(p => {
                const clientName = getClientName(p.client_id);
                const today = new Date().toISOString().split('T')[0];
                const isDeadlineSoon = p.deadline && p.deadline >= today &&
                  new Date(p.deadline).getTime() - Date.now() < 7 * 86400000;
                return (
                  <div key={p.id} className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 transition-colors group">
                    <div className="flex items-start justify-between gap-1">
                      <Link href={`/projects/${p.id}`} className="text-sm font-medium text-slate-800 line-clamp-2 hover:text-blue-600 flex-1">
                        {p.title}
                      </Link>
                      <button onClick={() => onEdit(p)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition-all">
                        <PencilSimple size={12} />
                      </button>
                    </div>
                    {clientName && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Buildings size={10} />{clientName}
                      </p>
                    )}
                    {p.contract_amount && (
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        {p.contract_amount.toLocaleString('ko-KR')}원
                      </p>
                    )}
                    {p.deadline && (
                      <p className={`text-[10px] mt-1 ${isDeadlineSoon ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                        마감 {p.deadline}
                      </p>
                    )}
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {p.deposit_paid && (
                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">계약금✓</span>
                      )}
                      {p.final_paid && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">잔금✓</span>
                      )}
                      {p.service_type && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{p.service_type}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {stageProjects.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center">
                  <p className="text-[10px] text-slate-300">없음</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ projects, clients, onEdit, onDelete }: {
  projects: Project[];
  clients: ClientWithRevenue[];
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  function getClientName(clientId: string | null) {
    if (!clientId) return null;
    return clients.find(c => c.id === clientId)?.company_name ?? null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(project => {
        const clientName = getClientName(project.client_id);
        return (
          <div key={project.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/projects/${project.id}`}
                className="font-semibold text-slate-950 text-sm leading-snug line-clamp-2 flex-1 hover:text-blue-600 transition-colors">
                {project.title}
              </Link>
              <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 whitespace-nowrap">
                {project.pipeline_stage}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-slate-500 line-clamp-1">{project.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {project.contract_amount && (
                <span className="bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {project.contract_amount.toLocaleString('ko-KR')}원
                </span>
              )}
              {project.deposit_paid && <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">계약금✓</span>}
              {project.final_paid && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">잔금✓</span>}
            </div>
            {clientName && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Buildings size={14} /><span className="truncate">{clientName}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
              <button onClick={() => onEdit(project)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <PencilSimple size={15} />
              </button>
              <button onClick={() => onDelete(project)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsData, clientsData] = await Promise.all([fetchProjects(), fetchClients()]);
      setProjects(projectsData);
      setClients(clientsData);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  async function handleDelete(project: Project) {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    setDeleteError(null);
    try {
      await deleteProject(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <div className="font-outfit">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-950">프로젝트</h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {projects.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 전환 */}
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Kanban size={14} />칸반
            </button>
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Rows size={14} />리스트
            </button>
          </div>
          <button onClick={() => { setEditingProject(null); setDialogOpen(true); }}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            <Plus size={16} />새 프로젝트
          </button>
        </div>
      </div>

      {deleteError && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{deleteError}</p>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(s => (
            <div key={s} className="flex-shrink-0 w-52">
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderOpen} title="프로젝트가 없습니다"
          description="새 프로젝트 버튼을 눌러 첫 번째 프로젝트를 추가해 보세요." />
      ) : view === "kanban" ? (
        <KanbanView projects={projects} clients={clients} onEdit={handleEdit} />
      ) : (
        <ListView projects={projects} clients={clients} onEdit={handleEdit} onDelete={handleDelete} />
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
