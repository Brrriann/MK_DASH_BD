"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen, PencilSimple, Trash, Buildings, Rows, Kanban, CalendarBlank,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import type { Project, ClientWithRevenue, PipelineStage } from "@/lib/types";

/* ─────────────────────────────────────────
   단계 그룹 (8 → 4)
───────────────────────────────────────── */
const STAGE_GROUPS = [
  {
    label: "상담·견적",
    stages: ["상담", "견적"] as PipelineStage[],
    dot: "bg-slate-400",
    headerBg: "bg-slate-50",
    headerBorder: "border-slate-200",
    labelColor: "text-slate-700",
    stageBadge: "bg-slate-100 text-slate-600",
  },
  {
    label: "계약·입금",
    stages: ["계약", "계산서발행", "계약입금"] as PipelineStage[],
    dot: "bg-blue-500",
    headerBg: "bg-blue-50",
    headerBorder: "border-blue-100",
    labelColor: "text-blue-700",
    stageBadge: "bg-blue-100 text-blue-700",
  },
  {
    label: "진행중",
    stages: ["착수", "납품"] as PipelineStage[],
    dot: "bg-amber-500",
    headerBg: "bg-amber-50",
    headerBorder: "border-amber-100",
    labelColor: "text-amber-700",
    stageBadge: "bg-amber-100 text-amber-700",
  },
  {
    label: "완납",
    stages: ["완납"] as PipelineStage[],
    dot: "bg-green-500",
    headerBg: "bg-green-50",
    headerBorder: "border-green-100",
    labelColor: "text-green-700",
    stageBadge: "bg-green-100 text-green-700",
  },
] as const;

/* ─────────────────────────────────────────
   스윔레인 칸반
───────────────────────────────────────── */
function KanbanView({
  projects, clients, onEdit,
}: {
  projects: Project[];
  clients: ClientWithRevenue[];
  onEdit: (p: Project) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  function getClientName(clientId: string | null) {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.company_name ?? null;
  }

  function dDay(deadline: string) {
    const diff = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / 86400000
    );
    if (diff < 0) return { label: `D+${Math.abs(diff)}`, cls: "text-red-500 font-bold" };
    if (diff === 0) return { label: "D-day", cls: "text-red-500 font-bold" };
    if (diff <= 7) return { label: `D-${diff}`, cls: "text-orange-500 font-semibold" };
    return { label: `D-${diff}`, cls: "text-slate-400" };
  }

  const renderCard = (p: Project, stageBadge: string) => {
    const clientName = getClientName(p.client_id);
    const dd = p.deadline ? dDay(p.deadline) : null;
    const amountMan = p.contract_amount
      ? Math.floor(p.contract_amount / 10000)
      : null;

    return (
      <div
        key={p.id}
        className="relative w-48 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-3.5 hover:border-blue-300 hover:shadow-sm transition-all group"
      >
        {/* 단계 배지 + 편집 버튼 */}
        <div className="flex items-center justify-between mb-2.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageBadge}`}>
            {p.pipeline_stage}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(p); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-blue-500 transition-all"
          >
            <PencilSimple size={13} />
          </button>
        </div>

        {/* 제목 */}
        <Link href={`/projects/${p.id}`} className="block">
          <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug hover:text-blue-600 transition-colors">
            {p.title}
          </p>
        </Link>

        {/* 고객사 */}
        {clientName && (
          <p className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1 truncate">
            <Buildings size={11} weight="regular" />
            {clientName}
          </p>
        )}

        {/* 서비스 유형 */}
        {p.service_type && (
          <p className="mt-1 text-[10px] text-slate-400">{p.service_type}</p>
        )}

        {/* 금액 */}
        {amountMan !== null && (
          <p className="mt-2 text-sm font-bold text-slate-800">
            {amountMan.toLocaleString("ko-KR")}만원
          </p>
        )}

        {/* 하단: 마감 D-day + 입금 상태 */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          {dd ? (
            <span className={`text-[11px] flex items-center gap-1 ${dd.cls}`}>
              <CalendarBlank size={11} />
              {dd.label}
            </span>
          ) : (
            <span />
          )}
          {/* 계약금●  잔금● */}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-0.5 text-[10px] font-medium ${
                p.deposit_paid ? "text-green-600" : "text-slate-300"
              }`}
              title="계약금"
            >
              <span className={`w-2 h-2 rounded-full ${p.deposit_paid ? "bg-green-400" : "bg-slate-200"}`} />
              계
            </span>
            <span
              className={`flex items-center gap-0.5 text-[10px] font-medium ${
                p.final_paid ? "text-blue-600" : "text-slate-300"
              }`}
              title="잔금"
            >
              <span className={`w-2 h-2 rounded-full ${p.final_paid ? "bg-blue-400" : "bg-slate-200"}`} />
              잔
            </span>
          </div>
        </div>
      </div>
    );
  };

  // 그룹에 속하지 않는 프로젝트
  const allGrouped = STAGE_GROUPS.flatMap((g) => g.stages as string[]);
  const uncategorized = projects.filter(
    (p) => !allGrouped.includes(p.pipeline_stage ?? "")
  );

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200">
      {STAGE_GROUPS.map((group) => {
        const gProjects = projects.filter((p) =>
          (group.stages as readonly string[]).includes(p.pipeline_stage ?? "")
        );
        const total = gProjects.reduce((s, p) => s + (p.contract_amount ?? 0), 0);
        const totalMan = Math.floor(total / 10000);

        return (
          <div key={group.label} className="flex min-h-[100px]">
            {/* 그룹 헤더 (고정 좌측) */}
            <div
              className={`w-32 flex-shrink-0 ${group.headerBg} border-r ${group.headerBorder} px-4 py-4 flex flex-col gap-1`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${group.dot}`} />
                <span className={`text-xs font-bold ${group.labelColor}`}>
                  {group.label}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 pl-4">
                {gProjects.length}개
              </span>
              {totalMan > 0 && (
                <span className="text-[11px] font-semibold text-slate-600 pl-4">
                  {totalMan.toLocaleString("ko-KR")}만원
                </span>
              )}
            </div>

            {/* 카드 영역 (가로 스크롤) */}
            <div className="flex-1 overflow-x-auto px-4 py-4">
              {gProjects.length > 0 ? (
                <div className="flex gap-3 min-w-max">
                  {gProjects.map((p) => renderCard(p, group.stageBadge))}
                </div>
              ) : (
                <div className="h-full flex items-center">
                  <p className="text-[11px] text-slate-300">프로젝트 없음</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 미분류 */}
      {uncategorized.length > 0 && (
        <div className="flex min-h-[80px]">
          <div className="w-32 flex-shrink-0 bg-amber-50 border-r border-amber-100 px-4 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold text-amber-700">미분류</span>
            </div>
            <span className="text-[11px] text-slate-500 pl-4">{uncategorized.length}개</span>
          </div>
          <div className="flex-1 overflow-x-auto px-4 py-4">
            <div className="flex gap-3 min-w-max">
              {uncategorized.map((p) => renderCard(p, "bg-amber-100 text-amber-700"))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   리스트 뷰 (기존 유지)
───────────────────────────────────────── */
function ListView({
  projects, clients, onEdit, onDelete,
}: {
  projects: Project[];
  clients: ClientWithRevenue[];
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  function getClientName(clientId: string | null) {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.company_name ?? null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const clientName = getClientName(project.client_id);
        return (
          <div
            key={project.id}
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/projects/${project.id}`}
                className="font-semibold text-slate-950 text-sm leading-snug line-clamp-2 flex-1 hover:text-blue-600 transition-colors"
              >
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
                  {project.contract_amount.toLocaleString("ko-KR")}원
                </span>
              )}
              {project.deposit_paid && (
                <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
                  계약금✓
                </span>
              )}
              {project.final_paid && (
                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                  잔금✓
                </span>
              )}
            </div>
            {clientName && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Buildings size={14} />
                <span className="truncate">{clientName}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
              <button
                onClick={() => onEdit(project)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <PencilSimple size={15} />
              </button>
              <button
                onClick={() => onDelete(project)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
interface ProjectsClientProps {
  initialProjects: Project[];
  clients: ClientWithRevenue[];
}

export function ProjectsClient({ initialProjects, clients }: ProjectsClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  async function handleDelete(project: Project) {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    setDeleteError(null);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `삭제 실패 (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
      setProjects(initialProjects);
      router.refresh();
    }
  }

  function handleSaved() {
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="font-outfit">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-950">프로젝트</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === "kanban" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Kanban size={14} />칸반
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === "list" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Rows size={14} />리스트
            </button>
          </div>
        </div>
      </div>

      {deleteError && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {deleteError}
        </p>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="프로젝트가 없습니다"
          description="고객 상세 페이지의 '프로젝트' 탭에서 새 프로젝트를 추가하세요."
        />
      ) : view === "kanban" ? (
        <KanbanView projects={projects} clients={clients} onEdit={handleEdit} />
      ) : (
        <ListView
          projects={projects}
          clients={clients}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ProjectFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        project={editingProject}
        clients={clients}
        onSaved={handleSaved}
      />
    </div>
  );
}
