"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, CalendarBlank, Buildings } from "@phosphor-icons/react";
import type { TaskWithClient } from "@/lib/actions/tasks";

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

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

interface TaskCardProps {
  task: TaskWithClient;
  onClick: (task: TaskWithClient) => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(task.due_date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm cursor-pointer select-none flex flex-col gap-2 hover:border-slate-300 hover:shadow-md transition-all ${isDragging ? "shadow-xl rotate-1" : ""}`}
      onClick={() => onClick(task)}
    >
      {/* Header: drag handle + priority */}
      <div className="flex items-start justify-between gap-2">
        <div
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing mt-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsSixVertical size={16} weight="regular" />
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.low}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      {/* Title */}
      <p className="font-outfit text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
        {task.title}
      </p>

      {/* Footer: due date + client */}
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        {task.due_date && (
          <span
            className={`flex items-center gap-1 text-xs ${overdue ? "text-red-500 font-medium" : "text-slate-400"}`}
          >
            <CalendarBlank size={12} weight="regular" />
            {new Date(task.due_date).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        {task.client?.company_name && (
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
            <Buildings size={12} weight="regular" />
            {task.client.company_name}
          </span>
        )}
      </div>
    </div>
  );
}
