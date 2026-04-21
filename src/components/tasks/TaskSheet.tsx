"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PencilSimple,
  Trash,
  CalendarBlank,
  Buildings,
  Briefcase,
  BookOpen,
} from "@phosphor-icons/react";
import { deleteTask, fetchTaskMeetingNotes, type TaskWithClient } from "@/lib/actions/tasks";
import type { MeetingNote } from "@/lib/types";

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-600 border border-red-200",
  medium: "bg-amber-50 text-amber-600 border border-amber-200",
  low: "bg-slate-100 text-slate-500 border border-slate-200",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "할일",
  in_progress: "진행중",
  done: "완료",
  on_hold: "보류",
};

const STATUS_BADGE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600 border border-slate-200",
  in_progress: "bg-blue-50 text-blue-600 border border-blue-200",
  done: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  on_hold: "bg-amber-50 text-amber-600 border border-amber-200",
};

interface TaskSheetProps {
  task: TaskWithClient | null;
  open: boolean;
  onClose: () => void;
  onEdit: (task: TaskWithClient) => void;
  onDeleted: (taskId: string) => void;
}

export function TaskSheet({ task, open, onClose, onEdit, onDeleted }: TaskSheetProps) {
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task && open) {
      setLoadingNotes(true);
      setConfirmDelete(false);
      fetchTaskMeetingNotes(task.id)
        .then(setMeetingNotes)
        .catch(() => setMeetingNotes([]))
        .finally(() => setLoadingNotes(false));
    }
  }, [task, open]);

  async function handleDelete() {
    if (!task) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onDeleted(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  if (!task) return null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto font-outfit">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <SheetTitle className="font-outfit text-xl font-bold text-slate-900 leading-snug flex-1">
              {task.title}
            </SheetTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(task)}
                title="수정"
              >
                <PencilSimple size={14} weight="regular" />
              </Button>
              <Button
                variant={confirmDelete ? "destructive" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleDelete}
                disabled={deleting}
              >
                {confirmDelete ? (
                  deleting ? "삭제 중..." : "확인 삭제"
                ) : (
                  <Trash size={14} weight="regular" />
                )}
              </Button>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[task.status] ?? STATUS_BADGE.todo}`}>
              {STATUS_LABEL[task.status]}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.low}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
          </div>
        </SheetHeader>

        <Separator className="mb-6" />

        {/* Meta info */}
        <div className="flex flex-col gap-4 mb-6">
          {task.due_date && (
            <div className="flex items-center gap-3">
              <CalendarBlank size={16} weight="regular" className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">마감일</p>
                <p className={`text-sm font-medium ${isOverdue ? "text-red-500" : "text-slate-800"}`}>
                  {new Date(task.due_date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {isOverdue && <span className="ml-2 text-xs text-red-400">기한 초과</span>}
                </p>
              </div>
            </div>
          )}

          {task.client?.company_name && (
            <div className="flex items-center gap-3">
              <Buildings size={16} weight="regular" className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">클라이언트</p>
                <p className="text-sm font-medium text-slate-800">{task.client.company_name}</p>
              </div>
            </div>
          )}

          {task.project?.title && (
            <div className="flex items-center gap-3">
              <Briefcase size={16} weight="regular" className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">프로젝트</p>
                <p className="text-sm font-medium text-slate-800">{task.project.title}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <>
            <Separator className="mb-4" />
            <div className="mb-6">
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">설명</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          </>
        )}

        {/* Meeting Notes Section */}
        <Separator className="mb-4" />
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} weight="regular" className="text-slate-400" />
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">참고 미팅노트</p>
          </div>

          {loadingNotes ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : meetingNotes.length === 0 ? (
            <p className="text-sm text-slate-300 py-4 text-center">연결된 미팅노트가 없습니다</p>
          ) : (
            <div className="flex flex-col gap-2">
              {meetingNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-slate-50 rounded-xl border border-slate-100 p-3 flex flex-col gap-1"
                >
                  <p className="text-sm font-medium text-slate-800">{note.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(note.met_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 mb-2">
          <p className="text-xs text-slate-300">
            생성: {new Date(task.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
