"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createProject, updateProject, type CreateProjectInput } from "@/lib/actions/projects";
import type { Project, ClientWithRevenue, ProjectStatus, PipelineStage, ServiceType, SourceChannel } from "@/lib/types";

const PIPELINE_STAGES: PipelineStage[] = ['상담', '견적', '계약', '계산서발행', '계약입금', '착수', '납품', '완납'];
const SERVICE_TYPES: ServiceType[] = ['명함', '로고', '웹사이트', '쇼핑몰', '앱', '광고소재', 'SNS관리', '영상편집', '기타'];
const SOURCE_CHANNELS: SourceChannel[] = ['숨고', '크몽', '위시캣', '라우드소싱', 'Fiverr', '직접문의', '재구매', '기타'];

interface ProjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  clients: ClientWithRevenue[];
  onSaved: () => void;
}

const NONE_VALUE = "__none__";

export function ProjectFormDialog({ open, onClose, project, clients, onSaved }: ProjectFormDialogProps) {
  const isEdit = !!project;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("상담");
  const [serviceType, setServiceType] = useState<ServiceType | "">("") ;
  const [contractAmount, setContractAmount] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositPaidAt, setDepositPaidAt] = useState("");
  const [finalPaid, setFinalPaid] = useState(false);
  const [finalPaidAt, setFinalPaidAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sourceChannel, setSourceChannel] = useState<SourceChannel | "">("") ;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(project?.title ?? "");
      setDescription(project?.description ?? "");
      setStatus(project?.status ?? "active");
      setClientId(project?.client_id ?? NONE_VALUE);
      setPipelineStage(project?.pipeline_stage ?? "상담");
      setServiceType(project?.service_type ?? "");
      setContractAmount(project?.contract_amount?.toString() ?? "");
      setDepositPaid(project?.deposit_paid ?? false);
      setDepositPaidAt(project?.deposit_paid_at ?? "");
      setFinalPaid(project?.final_paid ?? false);
      setFinalPaidAt(project?.final_paid_at ?? "");
      setDeadline(project?.deadline ?? "");
      setSourceChannel(project?.source_channel ?? "");
      setError("");
    }
  }, [open, project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }

    setSaving(true);
    setError("");

    const data: CreateProjectInput = {
      title: title.trim().slice(0, 200),
      description: description.trim() || null,
      status,
      client_id: clientId === NONE_VALUE ? null : clientId,
      pipeline_stage: pipelineStage,
      service_type: serviceType || null,
      contract_amount: contractAmount ? Number(contractAmount) : null,
      deposit_paid: depositPaid,
      deposit_paid_at: depositPaid && depositPaidAt ? depositPaidAt : null,
      final_paid: finalPaid,
      final_paid_at: finalPaid && finalPaidAt ? finalPaidAt : null,
      deadline: deadline || null,
      source_channel: sourceChannel || null,
    };

    try {
      if (isEdit && project) {
        await updateProject(project.id, data);
      } else {
        await createProject(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="font-outfit sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg font-bold text-slate-900">
            {isEdit ? "프로젝트 수정" : "새 프로젝트"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* 제목 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-title" className="text-sm text-slate-700 font-medium">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input id="project-title" value={title} onChange={(e) => setTitle(e.target.value)}
              maxLength={200} placeholder="프로젝트 제목" className="font-outfit" required />
          </div>

          {/* 설명 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-desc" className="text-sm text-slate-700 font-medium">설명</Label>
            <Textarea id="project-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 설명" rows={2} className="font-outfit resize-none" />
          </div>

          {/* 파이프라인 단계 + 상태 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">파이프라인 단계</Label>
              <Select value={pipelineStage} onValueChange={(v) => setPipelineStage(v as PipelineStage)}>
                <SelectTrigger className="font-outfit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">상태</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger className="font-outfit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">진행중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="on_hold">보류</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 서비스 유형 + 유입 채널 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">서비스 유형</Label>
              <Select value={serviceType || NONE_VALUE} onValueChange={(v) => setServiceType(v === NONE_VALUE ? "" : v as ServiceType)}>
                <SelectTrigger className="font-outfit"><SelectValue placeholder="선택 (선택사항)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>선택 안함</SelectItem>
                  {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">유입 채널</Label>
              <Select value={sourceChannel || NONE_VALUE} onValueChange={(v) => setSourceChannel(v === NONE_VALUE ? "" : v as SourceChannel)}>
                <SelectTrigger className="font-outfit"><SelectValue placeholder="선택 (선택사항)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>선택 안함</SelectItem>
                  {SOURCE_CHANNELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 클라이언트 + 마감일 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">클라이언트</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? NONE_VALUE)}>
                <SelectTrigger className="font-outfit"><SelectValue placeholder="선택 (선택사항)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>없음</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-deadline" className="text-sm text-slate-700 font-medium">마감일</Label>
              <Input id="project-deadline" type="date" value={deadline}
                onChange={(e) => setDeadline(e.target.value)} className="font-outfit" />
            </div>
          </div>

          {/* 계약금액 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-amount" className="text-sm text-slate-700 font-medium">계약금액 (원)</Label>
            <Input id="contract-amount" type="number" value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
              placeholder="계약 금액 입력" className="font-outfit" min={0} />
          </div>

          {/* 입금 추적 */}
          <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">입금 추적</p>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="deposit-paid" checked={depositPaid}
                onChange={(e) => setDepositPaid(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <Label htmlFor="deposit-paid" className="text-sm text-slate-700">계약금 입금 완료</Label>
              {depositPaid && (
                <Input type="date" value={depositPaidAt} onChange={(e) => setDepositPaidAt(e.target.value)}
                  className="font-outfit w-36 text-xs" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="final-paid" checked={finalPaid}
                onChange={(e) => setFinalPaid(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <Label htmlFor="final-paid" className="text-sm text-slate-700">잔금 입금 완료</Label>
              {finalPaid && (
                <Input type="date" value={finalPaidAt} onChange={(e) => setFinalPaidAt(e.target.value)}
                  className="font-outfit w-36 text-xs" />
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="font-outfit">취소</Button>
            <Button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium font-outfit">
              {saving ? "저장 중..." : isEdit ? "수정 완료" : "프로젝트 생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
