"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  Buildings,
  CalendarBlank,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { fetchProject, deleteProject } from "@/lib/actions/projects";
import { fetchClient, fetchClients } from "@/lib/actions/clients";
import type { Project, ClientWithRevenue } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  active: "진행중",
  completed: "완료",
  on_hold: "보류",
};

const statusClass: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 border border-amber-200",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<ClientWithRevenue | null>(null);
  const [clients, setClients] = useState<ClientWithRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projectData, clientsData] = await Promise.all([
        fetchProject(id),
        fetchClients(),
      ]);
      setProject(projectData);
      setClients(clientsData);
      if (projectData?.client_id) {
        const clientData = await fetchClient(projectData.client_id);
        setClient(clientData);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
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

  return (
    <div className="font-outfit">
      {/* Back link */}
      <div className="mb-5">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} weight="regular" />
          프로젝트 목록
        </Link>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">

        {/* LEFT PANEL */}
        <aside className="lg:sticky lg:top-6 lg:self-start bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">

          {/* Identity */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-outfit font-bold text-blue-600 text-lg shrink-0">
              {project.title.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-outfit font-bold text-slate-900 text-lg leading-tight">
                {project.title}
              </h1>
              <div className="mt-1.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[project.status] ?? ""}`}>
                  {statusLabel[project.status] ?? project.status}
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Progress */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">진행률</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>완료도</span>
                <span className="font-semibold text-slate-900">{project.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Meta */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">정보</p>
            <dl className="space-y-2.5">
              {client && (
                <div className="flex items-start gap-2.5">
                  <Buildings size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-slate-400 mb-0.5">클라이언트</dt>
                    <dd>
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {client.company_name}
                      </Link>
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <CalendarBlank size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] text-slate-400 mb-0.5">생성일</dt>
                  <dd className="text-sm text-slate-900">{formatDate(project.created_at)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarBlank size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] text-slate-400 mb-0.5">최근 수정</dt>
                  <dd className="text-sm text-slate-900">{formatDate(project.updated_at)}</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <PencilSimple size={16} weight="regular" />
              프로젝트 수정
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash size={16} weight="regular" />
              삭제
            </button>
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-outfit font-semibold text-slate-800 text-sm mb-3">프로젝트 설명</h2>
            {project.description ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">등록된 설명이 없습니다.</p>
            )}
          </div>

          {/* Client shortcut */}
          {client && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-outfit font-semibold text-slate-800 text-sm mb-3">연결된 클라이언트</h2>
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-outfit font-bold text-blue-600 text-sm shrink-0">
                  {client.company_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{client.company_name}</p>
                  <p className="text-xs text-slate-400">{client.contact_name}</p>
                </div>
              </Link>
            </div>
          )}
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
