"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Buildings, User, Envelope, Phone, Briefcase } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  convertLeadToClientWithProject,
  type ConvertClientData,
  type ConvertProjectData,
} from "@/lib/actions/lead-actions";
import { formatAmount, parseAmount } from "@/lib/utils/input-formatters";
import type { Lead } from "@/lib/types";

const SERVICE_TYPES = [
  "웹개발", "앱개발", "소프트웨어개발", "디자인", "영상", "강의/컨설팅", "기타",
];

interface ConvertLeadDialogProps {
  lead: Lead | null;
  onClose: () => void;
}

export function ConvertLeadDialog({ lead, onClose }: ConvertLeadDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 리드에 관심 서비스 정보가 있으면 프로젝트 생성 토글 기본 활성화
  const [withProject, setWithProject] = useState(() => !!lead?.service_interest);

  // 고객 정보 (리드에서 prefill)
  const [client, setClient] = useState<ConvertClientData>({
    company_name: lead?.company ?? lead?.name ?? "",
    contact_name: lead?.name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
  });

  // 프로젝트 정보
  const [project, setProject] = useState<ConvertProjectData>({
    title: lead?.service_interest
      ? `[${lead.company ?? lead?.name}] ${lead.service_interest}`
      : "",
    service_type: "",
    contract_amount: undefined,
    deadline: "",
  });
  const [contractAmountStr, setContractAmountStr] = useState(
    lead?.budget_estimate ? formatAmount(String(lead.budget_estimate)) : ""
  );

  // lead가 바뀌면(null→리드 포함) 리드 값으로 폼 재prefill
  useEffect(() => {
    if (!lead) return;
    setWithProject(!!lead.service_interest);
    setClient({
      company_name: lead.company ?? lead.name ?? "",
      contact_name: lead.name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
    });
    setProject({
      title: lead.service_interest
        ? `[${lead.company ?? lead.name}] ${lead.service_interest}`
        : "",
      service_type: "",
      contract_amount: undefined,
      deadline: "",
    });
    setContractAmountStr(lead.budget_estimate ? formatAmount(String(lead.budget_estimate)) : "");
    setError(null);
  }, [lead]);

  function setC<K extends keyof ConvertClientData>(k: K, v: ConvertClientData[K]) {
    setClient((prev) => ({ ...prev, [k]: v }));
  }
  function setP<K extends keyof ConvertProjectData>(k: K, v: ConvertProjectData[K]) {
    setProject((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    if (!client.company_name.trim() || !client.contact_name.trim()) {
      setError("회사명과 담당자명은 필수입니다.");
      return;
    }

    if (withProject && !project.title.trim()) {
      setError("프로젝트명을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await convertLeadToClientWithProject(
      lead.id,
      {
        company_name: client.company_name.trim(),
        contact_name: client.contact_name.trim(),
        email: client.email.trim() || `lead-${lead.id}@noemail.local`,
        phone: client.phone?.trim() || undefined,
      },
      withProject
        ? {
            title: project.title.trim(),
            service_type: project.service_type || undefined,
            contract_amount: parseAmount(contractAmountStr) ?? undefined,
            deadline: project.deadline || undefined,
          }
        : undefined
    );
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  if (!lead) return null;

  return (
    <Dialog open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {lead.source}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="text-slate-500 font-normal">{lead.name}</span>
            <ArrowRight size={16} className="text-blue-500" />
            고객 전환
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            정보를 확인하고 필요 시 수정해 주세요.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── 고객 정보 ── */}
          <section>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              고객 정보
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Buildings size={13} /> 회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={client.company_name}
                  onChange={(e) => setC("company_name", e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <User size={13} /> 담당자명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={client.contact_name}
                  onChange={(e) => setC("contact_name", e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Envelope size={13} /> 이메일
                </label>
                <input
                  type="email"
                  value={client.email}
                  onChange={(e) => setC("email", e.target.value)}
                  placeholder="contact@example.com (선택)"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Phone size={13} /> 전화번호
                </label>
                <input
                  type="tel"
                  value={client.phone ?? ""}
                  onChange={(e) => setC("phone", e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </section>

          {/* ── 프로젝트 생성 토글 ── */}
          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                onClick={() => setWithProject((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  withProject ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    withProject ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-slate-700">
                프로젝트도 함께 생성하기
              </span>
            </label>
            <p className="text-xs text-slate-400 mt-1 ml-13 pl-[52px]">
              전환과 동시에 프로젝트를 만들고 파이프라인에 등록합니다.
            </p>
          </div>

          {/* ── 프로젝트 정보 (토글 시) ── */}
          {withProject && (
            <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={12} /> 프로젝트 정보
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  프로젝트명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) => setP("title", e.target.value)}
                  placeholder="예: [회사명] 웹사이트 제작"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-600">서비스 유형</label>
                  <select
                    value={project.service_type ?? ""}
                    onChange={(e) => setP("service_type", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  >
                    <option value="">선택 안함</option>
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-600">계약금액 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={contractAmountStr}
                    onChange={(e) => setContractAmountStr(formatAmount(e.target.value))}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">마감일</label>
                <input
                  type="date"
                  value={project.deadline ?? ""}
                  onChange={(e) => setP("deadline", e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
              </div>
            </section>
          )}

          {/* ── 버튼 ── */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <ArrowRight size={15} />
                  고객 전환 완료
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
