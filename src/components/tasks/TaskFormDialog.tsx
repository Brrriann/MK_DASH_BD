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
import { createTask, updateTask, type TaskWithClient, type CreateTaskInput } from "@/lib/actions/tasks";
import type { Project, Client } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialStatus?: string;
  task?: TaskWithClient | null;
  projects: Project[];
  clients: Client[];
  onSaved: (task: TaskWithClient) => void;
}

const NONE_VALUE = "__none__";

export function TaskFormDialog({
  open,
  onClose,
  initialStatus = "todo",
  task,
  projects,
  clients,
  onSaved,
}: TaskFormDialogProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string | null>(NONE_VALUE);
  const [clientId, setClientId] = useState<string | null>(NONE_VALUE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "medium");
      setDueDate(task?.due_date ?? "");
      setProjectId(task?.project_id ?? NONE_VALUE as string);
      setClientId(task?.client_id ?? NONE_VALUE as string);
      setError("");
    }
  }, [open, task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");

    const data: CreateTaskInput = {
      title: title.trim().slice(0, 200),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      project_id: projectId === NONE_VALUE || projectId === null ? null : projectId,
      client_id: clientId === NONE_VALUE || clientId === null ? null : clientId,
      status: (task?.status as CreateTaskInput["status"]) ?? (initialStatus as CreateTaskInput["status"]),
    };

    try {
      let saved;
      if (isEdit && task) {
        saved = await updateTask(task.id, data);
        // Merge with existing client/project relations
        const editedClient = (!clientId || clientId === NONE_VALUE) ? null : (clients.find((c) => c.id === clientId) ? { company_name: clients.find((c) => c.id === clientId)!.company_name } : task.client);
        const editedProject = (!projectId || projectId === NONE_VALUE) ? null : (projects.find((p) => p.id === projectId) ? { title: projects.find((p) => p.id === projectId)!.title } : task.project);
        onSaved({
          ...task,
          ...saved,
          client: editedClient,
          project: editedProject,
        } as TaskWithClient);
      } else {
        saved = await createTask(data);
        const newClient = (!clientId || clientId === NONE_VALUE) ? null : (clients.find((c) => c.id === clientId) ? { company_name: clients.find((c) => c.id === clientId)!.company_name } : null);
        const newProject = (!projectId || projectId === NONE_VALUE) ? null : (projects.find((p) => p.id === projectId) ? { title: projects.find((p) => p.id === projectId)!.title } : null);
        onSaved({
          ...saved,
          client: newClient,
          project: newProject,
        } as TaskWithClient);
      }
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
            {isEdit ? "태스크 수정" : "새 태스크"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title" className="text-sm text-slate-700 font-medium">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="태스크 제목을 입력하세요"
              className="font-outfit"
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-desc" className="text-sm text-slate-700 font-medium">
              설명
            </Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="태스크에 대한 설명을 입력하세요"
              rows={3}
              className="font-outfit resize-none"
            />
          </div>

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-slate-700 font-medium">우선순위</Label>
              <Select value={priority} onValueChange={(v) => { if (v) setPriority(v as "high" | "medium" | "low"); }}>
                <SelectTrigger className="font-outfit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due" className="text-sm text-slate-700 font-medium">
                마감일
              </Label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 font-outfit shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Project */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">프로젝트</Label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? NONE_VALUE)}>
              <SelectTrigger className="font-outfit">
                <SelectValue placeholder="프로젝트 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>없음</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-slate-700 font-medium">클라이언트</Label>
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
              {saving ? "저장 중..." : isEdit ? "수정 완료" : "태스크 생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
