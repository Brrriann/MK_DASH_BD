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
  ChatTeardropText,
} from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { ClientFormSheet } from "@/components/clients/ClientFormSheet";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import {
  fetchClient,
  fetchClientProjects,
  fetchClientEstimates,
  fetchClientContracts,
  fetchClientTaxInvoices,
  deleteClient,
  type Estimate,
  type Contract,
} from "@/lib/actions/clients";
import { fetchClientInteractionsAction } from "@/lib/actions/client-actions";
import { fetchMeetingNotes, type MeetingNoteWithClient } from "@/lib/actions/meetings";
import { QuickMeetingDialog } from "@/components/meetings/QuickMeetingDialog";
import type { ClientWithRevenue, Project, Interaction, TaxInvoice } from "@/lib/types";
import { formatKRW, formatDate, formatTimeLabel } from "@/lib/utils";

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
  pending: "발송됨",
  expired: "만료",
};

const estimateStatusClass: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700 border border-blue-200",
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

const INTERACTION_TYPE_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  call:    { label: "통화",   emoji: "📞", bg: "bg-blue-50",   text: "text-blue-700" },
  kakao:   { label: "카톡",   emoji: "💬", bg: "bg-yellow-50", text: "text-yellow-700" },
  email:   { label: "이메일", emoji: "✉️", bg: "bg-violet-50", text: "text-violet-700" },
  meeting: { label: "미팅",   emoji: "👥", bg: "bg-green-50",  text: "text-green-700" },
  memo:    { label: "메모",   emoji: "📝", bg: "bg-slate-100", text: "text-slate-600" },
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
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [meetings, setMeetings] = useState<MeetingNoteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<TaxInvoice | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, e, ct, ti, interactions, m] = await Promise.all([
        fetchClient(id),
        fetchClientProjects(id),
        fetchClientEstimates(id),
        fetchClientContracts(id),
        fetchClientTaxInvoices(id),
        fetchClientInteractionsAction(id),
        fetchMeetingNotes(id),
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
      setInteractions(interactions);
      setMeetings(m);
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
          <Tabs defaultValue="interactions">
            <TabsList className="w-full justify-start mb-5 flex-wrap">
              <TabsTrigger value="interactions">
                소통기록
                {interactions.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-semibold">
                    {interactions.length}
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
              <TabsTrigger value="meetings">
                미팅
                {meetings.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                    {meetings.length}
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

            {/* 소통기록 Tab */}
            <TabsContent value="interactions">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">소통기록</h2>
                <Link
                  href="/interactions"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <ChatTeardropText size={12} weight="regular" />
                  소통기록 추가
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
                      <Plus size={12} weight="regular" />
                      첫 소통 기록하기
                    </Link>
                  </div>
                ) : (
                  interactions.map((item) => {
                    const cfg = INTERACTION_TYPE_CONFIG[item.type] ?? INTERACTION_TYPE_CONFIG.memo;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 hover:border-slate-300 transition-colors"
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
                            <CalendarBlank size={11} weight="regular" />
                            팔로업: {formatDate(item.follow_up_at)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* 프로젝트 Tab */}
            <TabsContent value="projects">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">프로젝트</h2>
                <button
                  onClick={() => setProjectDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  <Plus size={12} weight="regular" />
                  새 프로젝트
                </button>
              </div>
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-400">등록된 프로젝트가 없습니다.</p>
                    <button
                      onClick={() => setProjectDialogOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Plus size={12} weight="regular" />
                      첫 프로젝트 만들기
                    </button>
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                            {project.pipeline_stage}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${projectStatusClass[project.status] ?? ""}`}>
                            {projectStatusLabel[project.status] ?? project.status}
                          </span>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-1">{project.description}</p>
                      )}
                      <div className="flex items-center gap-3">
                        {project.contract_amount != null && (
                          <span className="text-xs font-semibold text-slate-700">
                            {project.contract_amount.toLocaleString("ko-KR")}원
                          </span>
                        )}
                        {project.deadline && (
                          <span className="text-xs text-slate-400">마감 {project.deadline}</span>
                        )}
                        {project.deposit_paid && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full">계약금✓</span>
                        )}
                        {project.final_paid && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full">잔금✓</span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>

            {/* 미팅 Tab */}
            <TabsContent value="meetings">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">미팅 일정</h2>
                <QuickMeetingDialog clientId={id} variant="compact" onCreated={loadAll} />
              </div>
              <div className="space-y-2">
                {meetings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-400">등록된 미팅 일정이 없습니다.</p>
                  </div>
                ) : (
                  meetings.map((m) => {
                    const dateLabel = formatDate(m.met_at);
                    const timeLabel = formatTimeLabel(m.met_time);
                    return (
                      <Link
                        key={m.id}
                        href={`/meetings/${m.id}`}
                        className="block rounded-xl border border-slate-200 bg-white shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <h3 className="font-outfit font-medium text-slate-900 text-sm truncate">{m.title}</h3>
                          {m.method && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 shrink-0">
                              {{ in_person: "대면", video: "화상", phone: "전화", email: "이메일" }[m.method]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          <CalendarBlank size={12} weight="regular" className="inline mr-1 -mt-0.5" />
                          {dateLabel}
                          {timeLabel && <span className="ml-1.5 text-blue-500 font-medium">{timeLabel}</span>}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* 견적·계약 Tab */}
            <TabsContent value="estimates">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit font-semibold text-slate-800 text-sm">견적·계약</h2>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/estimates/new?client_id=${id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={12} weight="regular" />
                    새 견적서
                  </Link>
                  <Link
                    href={`/contracts/new?client_id=${id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Plus size={12} weight="regular" />
                    새 계약서
                  </Link>
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
                        <tr key={ti.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => { setEditingInvoice(ti as unknown as TaxInvoice); setInvoiceDialogOpen(true); }}>
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">{ti.title}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 font-outfit">{formatKRW(ti.total_amount)}</td>
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
        onClose={() => { setInvoiceDialogOpen(false); setEditingInvoice(null); }}
        invoice={editingInvoice}
        clients={client ? [client] : []}
        defaultClientId={id}
        onSaved={() => { setInvoiceDialogOpen(false); setEditingInvoice(null); loadAll(); }}
      />

      {/* 프로젝트 생성 Dialog — 클라이언트 고정 */}
      <ProjectFormDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        project={null}
        clients={client ? [client] : []}
        defaultClientId={id}
        onSaved={() => { setProjectDialogOpen(false); loadAll(); }}
      />
    </div>
  );
}
