"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  CalendarBlank,
  ChatTeardropText,
  CheckCircle,
  Circle,
  Plus,
  X,
  ListChecks,
} from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { fetchProject, deleteProject } from "@/lib/actions/projects";
import {
  fetchClientsAction,
  fetchClientAction,
  fetchClientInteractionsAction,
} from "@/lib/actions/client-actions";
import {
  fetchProjectTasksAction,
  addProjectTaskAction,
  toggleProjectTaskAction,
  deleteProjectTaskAction,
  createTasksFromTemplateAction,
  TASK_TEMPLATES,
  type ProjectTask,
} from "@/lib/actions/project-tasks";
import type { Project, ClientWithRevenue, Interaction } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const PIPELINE_STAGES = [
  "상담", "견적", "계약", "계산서발행", "계약입금", "착수", "납품", "완납",
] as const;

const PIPELINE_PROGRESS: Record<string, number> = {
  상담: 12, 견적: 25, 계약: 37, 계산서발행: 50,
  계약입금: 62, 착수: 75, 납품: 87, 완납: 100,
};

const STATUS_LABEL: Record<string, string> = {
  active: "진행중", completed: "완료", on_hold: "보류",
};
const STATUS_CLASS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 border border-amber-200",
};

const INTERACTION_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  call:    { label: "통화",   emoji: "📞", bg: "bg-blue-50",   text: "text-blue-700" },
  kakao:   { label: "카톡",   emoji: "💬", bg: "bg-yellow-50", text: "text-yellow-700" },
  email:   { label: "이메일", emoji: "✉️",  bg: "bg-violet-50", text: "text-violet-700" },
  meeting: { label: "미팅",   emoji: "👥", bg: "bg-green-50",  text: "text-green-700" },
  memo:    { label: "메모",   emoji: "📝", bg: "bg-slate-100", text: "text-slate-600" },
};

// ─── 체크리스트 컴포넌트 ───────────────────────────────────────────
function ProjectChecklist({
  projectId,
  serviceType,
}: {
  projectId: string;
  serviceType: string | null;
}) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjectTasksAction(projectId)
      .then(setTasks)
      .finally(() => setLoadingTasks(false));
  }, [projectId]);

  async function handleToggle(taskId: string, current: boolean) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !current } : t))
    );
    try {
      await toggleProjectTaskAction(taskId, !current);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: current } : t))
      );
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const tempId = `temp-${Date.now()}`;
    const sortOrder = tasks.length;
    setNewTitle("");
    setTasks((prev) => [
      ...prev,
      {
        id: tempId,
        project_id: projectId,
        title,
        completed: false,
        sort_order: sortOrder,
        created_at: "",
        updated_at: "",
      },
    ]);
    try {
      const created = await addProjectTaskAction(projectId, title, sortOrder);
      setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      alert("항목 추가에 실패했습니다.");
    }
  }

  async function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteProjectTaskAction(taskId);
    } catch {
      fetchProjectTasksAction(projectId).then(setTasks);
    }
  }

  async function handleApplyTemplate() {
    if (!serviceType || !TASK_TEMPLATES[serviceType]) return;
    if (
      tasks.length > 0 &&
      !window.confirm("기존 체크리스트가 모두 삭제되고 템플릿으로 교체됩니다. 계속하시겠습니까?")
    )
      return;
    setApplyingTemplate(true);
    try {
      const created = await createTasksFromTemplateAction(projectId, serviceType);
      setTasks(created);
    } catch {
      alert("템플릿 적용에 실패했습니다.");
    } finally {
      setApplyingTemplate(false);
    }
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const taskProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null;

  if (loadingTasks) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 진행 요약 */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
          <span className="text-xs text-slate-500">
            <span className="font-semibold text-slate-900">{completedCount}</span>
            /{totalCount} 완료
          </span>
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700">{taskProgress}%</span>
        </div>
      )}

      {/* 템플릿 버튼 */}
      {serviceType && TASK_TEMPLATES[serviceType] && (
        <button
          onClick={handleApplyTemplate}
          disabled={applyingTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <ListChecks size={13} />
          {applyingTemplate
            ? "적용 중..."
            : `${serviceType} 템플릿 적용 (${TASK_TEMPLATES[serviceType].length}개)`}
        </button>
      )}

      {/* 태스크 목록 */}
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-400">체크리스트 항목이 없습니다.</p>
          <p className="text-xs text-slate-300 mt-1">아래에서 직접 추가하거나 템플릿을 적용하세요.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="group flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 transition-colors"
            >
              <button
                onClick={() => handleToggle(task.id, task.completed)}
                className="shrink-0 transition-colors"
              >
                {task.completed ? (
                  <CheckCircle size={18} weight="fill" className="text-emerald-500" />
                ) : (
                  <Circle size={18} className="text-slate-300 hover:text-slate-400" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  task.completed ? "line-through text-slate-400" : "text-slate-800"
                }`}
              >
                {task.title}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 항목 추가 */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="새 항목 추가..."
          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          추가
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function getDaysLeft(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<ClientWithRevenue | null>(null);
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projectData, clientsData] = await Promise.all([
        fetchProject(id),
        fetchClientsAction(),
      ]);
      setProject(projectData);
      setClients(clientsData);
      if (projectData?.client_id) {
        const [clientData, interactionsData] = await Promise.all([
          fetchClientAction(projectData.client_id),
          fetchClientInteractionsAction(projectData.client_id),
        ]);
        setClient(clientData);
        setInteractions(interactionsData);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleDelete() {
    if (!project) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      router.push("/projects");
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="font-outfit space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <Skeleton className="h-[480px] rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="font-outfit text-center py-20 text-slate-400">
        프로젝트를 찾을 수 없습니다.
      </div>
    );
  }

  const progress = PIPELINE_PROGRESS[project.pipeline_stage] ?? 0;
  const stageIndex = PIPELINE_STAGES.indexOf(
    project.pipeline_stage as typeof PIPELINE_STAGES[number]
  );
  const daysLeft = project.deadline ? getDaysLeft(project.deadline) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  return (
    <div className="font-outfit">
      {/* Back */}
      <div className="mb-5">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
          프로젝트 목록
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

        {/* ─── LEFT PANEL ─── */}
        <aside className="lg:sticky lg:top-6 lg:self-start bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">

          {/* Identity */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 text-lg shrink-0">
              {project.title.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-base leading-tight">{project.title}</h1>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[project.status] ?? ""}`}>
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
                {project.service_type && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                    {project.service_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Pipeline */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">파이프라인</p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {PIPELINE_STAGES.map((stage, i) => (
                  <span
                    key={stage}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                      i === stageIndex
                        ? "bg-blue-600 text-white border-blue-600"
                        : i < stageIndex
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    {i < stageIndex ? "✓ " : ""}{stage}
                  </span>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">진행률</span>
                  <span className="font-semibold text-slate-900">{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Schedule + Amount */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">일정 · 금액</p>
            <dl className="space-y-2.5">
              {project.deadline && (
                <div className="flex items-start gap-2.5">
                  <CalendarBlank
                    size={14}
                    className={`mt-0.5 shrink-0 ${
                      isOverdue ? "text-red-500" : isDueSoon ? "text-amber-500" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <dt className="text-[10px] text-slate-400 mb-0.5">마감일</dt>
                    <dd className="flex items-center gap-1.5">
                      <span className="text-sm text-slate-900">{project.deadline}</span>
                      {daysLeft !== null && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          isOverdue
                            ? "bg-red-100 text-red-600"
                            : isDueSoon
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {isOverdue
                            ? `D+${Math.abs(daysLeft)}`
                            : daysLeft === 0
                            ? "D-day"
                            : `D-${daysLeft}`}
                        </span>
                      )}
                    </dd>
                  </div>
                </div>
              )}

              {project.contract_amount != null && (
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 mt-0.5 shrink-0 text-xs font-bold leading-[14px]">₩</span>
                  <div>
                    <dt className="text-[10px] text-slate-400 mb-0.5">계약금액</dt>
                    <dd className="text-sm font-semibold text-slate-900">
                      {project.contract_amount.toLocaleString("ko-KR")}원
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {/* Payment status */}
          {project.contract_amount != null && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">입금 현황</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {project.deposit_paid ? (
                      <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                    ) : (
                      <Circle size={14} className="text-slate-300" />
                    )}
                    <span className={`text-xs font-medium ${project.deposit_paid ? "text-emerald-700" : "text-slate-500"}`}>
                      계약금
                    </span>
                  </div>
                  <span className={`text-xs ${project.deposit_paid ? "text-emerald-600" : "text-slate-400"}`}>
                    {project.deposit_paid
                      ? (project.deposit_paid_at ? formatDate(project.deposit_paid_at) : "입금완료")
                      : "미입금"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {project.final_paid ? (
                      <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                    ) : (
                      <Circle size={14} className="text-slate-300" />
                    )}
                    <span className={`text-xs font-medium ${project.final_paid ? "text-emerald-700" : "text-slate-500"}`}>
                      잔금
                    </span>
                  </div>
                  <span className={`text-xs ${project.final_paid ? "text-emerald-600" : "text-slate-400"}`}>
                    {project.final_paid
                      ? (project.final_paid_at ? formatDate(project.final_paid_at) : "입금완료")
                      : "미입금"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Client */}
          {client && (
            <>
              <div className="h-px bg-slate-100" />
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">클라이언트</p>
                <Link
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 text-sm shrink-0">
                    {client.company_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{client.company_name}</p>
                    <p className="text-xs text-slate-400 truncate">{client.contact_name}</p>
                  </div>
                </Link>
              </div>
            </>
          )}

          <div className="h-px bg-slate-100" />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <PencilSimple size={16} />
              프로젝트 수정
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash size={16} />
              삭제
            </button>
          </div>
        </aside>

        {/* ─── RIGHT PANEL ─── */}
        <div className="min-w-0">
          <Tabs defaultValue="checklist">
            <TabsList className="w-full justify-start mb-5 flex-wrap">
              <TabsTrigger value="checklist">체크리스트</TabsTrigger>
              {client && (
                <TabsTrigger value="interactions">
                  소통기록
                  {interactions.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-semibold">
                      {interactions.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="info">상세정보</TabsTrigger>
            </TabsList>

            {/* 체크리스트 탭 */}
            <TabsContent value="checklist">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 text-sm">체크리스트</h2>
              </div>
              <ProjectChecklist
                projectId={project.id}
                serviceType={project.service_type}
              />
            </TabsContent>

            {/* 소통기록 탭 */}
            {client && (
              <TabsContent value="interactions">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-800 text-sm">
                    소통기록
                    <span className="ml-1.5 font-normal text-slate-400">— {client.company_name}</span>
                  </h2>
                  <Link
                    href="/interactions"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <ChatTeardropText size={12} />
                    소통 추가
                  </Link>
                </div>
                <div className="space-y-2">
                  {interactions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                      <p className="text-sm text-slate-400">기록된 소통이 없습니다.</p>
                      <Link
                        href="/interactions"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Plus size={12} />
                        첫 소통 기록하기
                      </Link>
                    </div>
                  ) : (
                    interactions.map((item) => {
                      const cfg = INTERACTION_CONFIG[item.type] ?? INTERACTION_CONFIG.memo;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${cfg.bg} ${cfg.text}`}>
                                {cfg.emoji} {cfg.label}
                              </span>
                              <p className="text-sm font-medium text-slate-900 truncate">{item.summary}</p>
                            </div>
                            <p className="text-xs text-slate-400 shrink-0">{formatDate(item.occurred_at)}</p>
                          </div>
                          {item.content && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed ml-1 mt-1">
                              {item.content}
                            </p>
                          )}
                          {item.follow_up_at && (
                            <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                              <CalendarBlank size={11} />
                              팔로업: {formatDate(item.follow_up_at)}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            )}

            {/* 상세정보 탭 */}
            <TabsContent value="info">
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="font-semibold text-slate-800 text-sm mb-3">프로젝트 설명</h2>
                  {project.description ? (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">등록된 설명이 없습니다.</p>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="font-semibold text-slate-800 text-sm mb-4">프로젝트 정보</h2>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {project.service_type && (
                      <div>
                        <dt className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">서비스 유형</dt>
                        <dd className="text-sm text-slate-900">{project.service_type}</dd>
                      </div>
                    )}
                    {project.source_channel && (
                      <div>
                        <dt className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">유입 채널</dt>
                        <dd className="text-sm text-slate-900">{project.source_channel}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">생성일</dt>
                      <dd className="text-sm text-slate-900">{formatDate(project.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">최근 수정</dt>
                      <dd className="text-sm text-slate-900">{formatDate(project.updated_at)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ProjectFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        clients={clients}
        onSaved={async () => {
          setEditOpen(false);
          await loadAll();
        }}
      />
    </div>
  );
}
