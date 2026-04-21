"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject, updateProject, type CreateProjectInput } from "@/lib/actions/projects";
import type { Project, ClientWithRevenue, ProjectStatus } from "@/lib/types";

interface ProjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  clients: ClientWithRevenue[];
  onSaved: () => void;
}

const NONE_VALUE = "__none__";

export function ProjectFormDialog({
  open,
  onClose,
  project,
  clients,
  onSaved,
}: ProjectFormDialogProps) {
  const isEdit = !!project;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [progress, setProgress] = useState(0);
  const [clientId, setClientId] = useState<string>(NONE_VALUE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(project?.title ?? "");
      setDescription(project?.description ?? "");
      setStatus(project?.status ?? "active");
      setProgress(project?.progress ?? 0);
      setClientId(project?.client_id ?? NONE_VALUE);
      setError("");
    }
  }, [open, project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    const progressNum = Number(progress);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      setError("진행률은 0~100 사이의 숫자여야 합니다.");
      return;
    }

    setSaving(true);
    setError("");

    const data: CreateProjectInput = {
      title: title.trim().slice(0, 200),
      description: description.trim() || null,
      status,
      progress: progressNum,
      client_id: clientId === NONE_VALUE ? null : clientId,
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
      <DialogContent className="font-outfit sm:max-w-lg">
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
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="프로젝트 제목을 입력하세요"
              className="font-outfit"
              required
            />
          </div>

          {/* 설명 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-desc" className="text-sm text-slate-700 font-medium">
              설명
            </Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트에 대한 설명을 입력하세요"
              rows={3}
              className="font-outfit resize-none"
            />
          </div>

          {/* 상태 + 진행률 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">상태</Label>
              <Select value={status} onValueChange={(v) => { if (v) setStatus(v as ProjectStatus); }}>
                <SelectTrigger className="font-outfit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">진행중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="on_hold">보류</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-progress" className="text-sm text-slate-700 font-medium">
                진행률 (0-100)
              </Label>
              <Input
                id="project-progress"
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="font-outfit"
              />
            </div>
          </div>

          {/* 클라이언트 연결 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">클라이언트 연결</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? NONE_VALUE)}>
              <SelectTrigger className="font-outfit">
                <SelectValue placeholder="클라이언트 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>없음</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="font-outfit"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium font-outfit"
            >
              {saving ? "저장 중..." : isEdit ? "수정 완료" : "프로젝트 생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
