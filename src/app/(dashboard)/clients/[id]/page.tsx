"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PencilSimple,
  Trash,
  CalendarBlank,
  User,
  EnvelopeSimple,
  Phone,
  Briefcase,
  ShareNetwork,
  ArrowLeft,
  Plus,
  FilePdf,
} from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { ClientFormSheet } from "@/components/clients/ClientFormSheet";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import { EstimateFormDialog } from "@/components/estimates/EstimateFormDialog";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import {
  fetchClient,
  fetchClientProjects,
  fetchClientEstimates,
  fetchClientContracts,
  fetchClientTaxInvoices,
  fetchClientMeetingNotes,
  deleteClient,
  type Estimate,
  type Contract,
} from "@/lib/actions/clients";
import { deleteMeetingNote } from "@/lib/actions/meetings";
import type { ClientWithRevenue, Project, MeetingNote, TaxInvoice } from "@/lib/types";
import { formatKRW, formatDate } from "@/lib/utils";

const projectStatusLabel: Record<string, string> = {
  active: "진행중",
  completed: "완료",
  on_hold: "보류",
};

const projectStatusClass: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 border border-amber-200",
};

const estimateStatusLabel: Record<string, string> = {
  pending: "검토중",
  accepted: "수락",
  expired: "만료",
};

const estimateStatusClass: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

const contractStatusLabel: Record<string, string> = {
  signed: "서명완료",
  pending: "대기중",
  expired: "만료",
};

const contractStatusClass: Record<string, string> = {
  signed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

const methodLabel: Record<string, string> = {
  in_person: "대면",
  video: "화상",
  phone: "전화",
  email: "이메일",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<ClientWithRevenue | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [estimateDialogOpen, setEstimateDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, e, ct, ti, mn] = await Promise.all([
        fetchClient(id),
        fetchClientProjects(id),
        fetchClientEstimates(id),
        fetchClientContracts(id),
        fetchClientTaxInvoices(id),
        fetchClientMeetingNotes(id),
      ]);

      if (!c) {
        router.replace("/clients");
        return;
      }

      setClient(c);
      setProjects(p);
      setEstimates(e);
      setContracts(ct);
      setTaxInvoices(ti);
      setMeetingNotes(mn);
    } catch {
      router.replace("/clients");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleDelete() {
    if (!client) return;
    const confirmed = window.confirm(
      `"${client.company_name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteClient(client.id);
      router.replace("/clients");
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
      setDeleting(false);
    }
  }

  async function handleDeleteNote(noteId: string, e: React.MouseEvent) {
    e.preventDefault();
    const confirmed = window.confirm("이 미팅노트를 삭제하시겠습니까?");
    if (!confirmed) return;
    try {
      await deleteMeetingNote(noteId);
      setMeetingNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="font-outfit space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) return null;

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalEstimates = estimates.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="font-outfit">
      {/* Back link */}
      <div className="mb-5">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} weight="regular" />
          클라이언트 목록
        </Link>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* LEFT PANEL */}
        <aside className="lg:sticky lg:top-6 lg:self-start bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">

          {/* Identity */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-outfit font-bold text-blue-600 text-lg shrink-0">
              {client.company_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-outfit font-bold text-slate-900 text-lg leading-tight truncate">
                {client.company_name}
              </h1>
              <div className="mt-1.5">
                <StatusBadge status={client.status} />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Contact info */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">연락처 정보</p>
            <dl className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <User size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] text-slate-400 mb-0.5">담당자</dt>
                  <dd className="text-sm text-slate-900">{client.contact_name}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <EnvelopeSimple size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] text-slate-400 mb-0.5">이메일</dt>
                  <dd className="text-sm text-slate-900 break-all">{client.email}</dd>
                </div>
              </div>
              {client.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-slate-400 mb-0.5">전화번호</dt>
                    <dd className="text-sm text-slate-900">{client.phone}</dd>
                  </div>
                </div>
              )}
              {client.industry && (
                <div className="flex items-start gap-2.5">
                  <Briefcase size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-slate-400 mb-0.5">업종</dt>
                    <dd className="text-sm text-slate-900">{client.industry}</dd>
                  </div>
                </div>
              )}
              {client.source && (
                <div className="flex items-start gap-2.5">
                  <ShareNetwork size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-slate-400 mb-0.5">소스</dt>
                    <dd className="text-sm text-slate-900">{client.source}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <CalendarBlank size={14} weight="regular" className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] text-slate-400 mb-0.5">등록일</dt>
                  <dd className="text-sm text-slate-900">{formatDate(client.created_at)}</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Memo */}
          {client.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-1.5">메모</p>
              <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          <div className="h-px bg-slate-100" />

          {/* KPI grid */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">주요 지표</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 mb-1">총 프로젝트</p>
                <p className="font-outfit text-xl font-bold text-slate-900">{projects.length}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 mb-1">진행중</p>
                <p className="font-outfit text-xl font-bold text-blue-600">{activeProjects}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 mb-1">총 거래액</p>
                <p className="font-outfit text-sm font-bold text-slate-900">{formatKRW(client.total_revenue)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 mb-1">총 견적액</p>
                <p className="font-outfit text-sm font-bold text-slate-900">{formatKRW(totalEstimates)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <PencilSimple size={16} weight="regular" />
              클라이언트 수정
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
        <div className="min-w-0">
          <Tabs defaultValue="meeting-notes">
            <TabsList className="w-full justify-start mb-5 flex-wrap">
              <TabsTrigger value="meeting-notes">
                미팅노트
                {meetingNotes.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-semibold">
                    {meetingNotes.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="projects">
                프로젝트
                {projects.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                    {projects.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="estimates">
                견적·계약
                {(estimates.length + contracts.length) > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                    {estimates.length + contracts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="tax">
                세금계산서
                {taxInvoices.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                    {taxInvoices.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 미팅노트 Tab */}
            <TabsContent value="meeting-notes">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">미팅노트</h2>
                <Link
                  href={`/meetings/new?client_id=${id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Plus size={12} weight="regular" />
                  새 미팅노트
                </Link>
              </div>
              <div className="space-y-3">
                {meetingNotes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-400">기록된 미팅노트가 없습니다.</p>
                    <Link
                      href={`/meetings/new?client_id=${id}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Plus size={12} weight="regular" />
                      첫 미팅노트 작성하기
                    </Link>
                  </div>
                ) : (
                  meetingNotes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/meetings/${note.id}`}
                      className="group block rounded-xl border border-slate-200 bg-white shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-outfit font-medium text-slate-900 text-sm">{note.title}</h3>
                        {note.method && (
                          <span className="group-hover:hidden inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {methodLabel[note.method] ?? note.method}
                          </span>
                        )}
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <PencilSimple size={12} weight="regular" />
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNote(note.id, e)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash size={12} weight="regular" />
                            삭제
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-1.5">{formatDate(note.met_at)}</p>
                      {note.content && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {note.content}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>

            {/* 프로젝트 Tab */}
            <TabsContent value="projects">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">프로젝트</h2>
              </div>
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-400">등록된 프로젝트가 없습니다.</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block rounded-xl border border-slate-200 bg-white shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="font-outfit font-medium text-slate-900 text-sm">{project.title}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${projectStatusClass[project.status] ?? ""}`}>
                          {projectStatusLabel[project.status] ?? project.status}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-1">{project.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{project.progress}%</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>

            {/* 견적·계약 Tab */}
            <TabsContent value="estimates">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">견적·계약</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEstimateDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={12} weight="regular" />
                    새 견적서
                  </button>
                  <button
                    onClick={() => setContractDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Plus size={12} weight="regular" />
                    새 계약서
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <h3 className="font-outfit font-semibold text-slate-800 text-sm mb-3">견적서</h3>
                  {estimates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                      <p className="text-sm text-slate-400">견적서가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {estimates.map((e) => (
                        <div key={e.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-outfit font-medium text-slate-900 text-sm">{e.title}</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estimateStatusClass[e.status] ?? ""}`}>
                              {estimateStatusLabel[e.status] ?? e.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mb-1">{formatKRW(e.amount)}</p>
                          <p className="text-xs text-slate-400">{formatDate(e.issued_at)}</p>
                          {e.pdf_url && (
                            <a href={e.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              onClick={(ev) => ev.stopPropagation()}>
                              <FilePdf size={14} weight="regular" />PDF 보기
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-outfit font-semibold text-slate-800 text-sm mb-3">계약서</h3>
                  {contracts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                      <p className="text-sm text-slate-400">계약서가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contracts.map((c) => (
                        <div key={c.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-outfit font-medium text-slate-900 text-sm">{c.title}</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${contractStatusClass[c.status] ?? ""}`}>
                              {contractStatusLabel[c.status] ?? c.status}
                            </span>
                          </div>
                          {c.signed_at && <p className="text-xs text-slate-500 mb-1">서명일: {formatDate(c.signed_at)}</p>}
                          {c.expires_at && <p className="text-xs text-slate-400">만료일: {formatDate(c.expires_at)}</p>}
                          {c.pdf_url && (
                            <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              onClick={(ev) => ev.stopPropagation()}>
                              <FilePdf size={14} weight="regular" />PDF 보기
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 세금계산서 Tab */}
            <TabsContent value="tax">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">세금계산서</h2>
                <button
                  onClick={() => setInvoiceDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Plus size={12} weight="regular" />
                  새 세금계산서
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {taxInvoices.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-slate-400">발행된 세금계산서가 없습니다.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">제목</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">금액</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">발행일</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxInvoices.map((ti) => (
                        <tr key={ti.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">{ti.title}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 font-outfit">{formatKRW(ti.amount)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(ti.issued_at)}</td>
                          <td className="px-4 py-3">
                            {ti.pdf_url ? (
                              <a href={ti.pdf_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                                <FilePdf size={14} weight="regular" />보기
                              </a>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Edit Sheet */}
      <ClientFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        onSuccess={loadAll}
      />

      {/* 세금계산서 Dialog */}
      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        clients={client ? [client] : []}
        onSaved={() => { setInvoiceDialogOpen(false); loadAll(); }}
      />

      {/* 견적서 Dialog */}
      <EstimateFormDialog
        open={estimateDialogOpen}
        onClose={() => setEstimateDialogOpen(false)}
        clients={client ? [client] : []}
        onSaved={() => { setEstimateDialogOpen(false); loadAll(); }}
      />

      {/* 계약서 Dialog */}
      <ContractFormDialog
        open={contractDialogOpen}
        onClose={() => setContractDialogOpen(false)}
        clients={client ? [client] : []}
        onSaved={() => { setContractDialogOpen(false); loadAll(); }}
      />
    </div>
  );
}
