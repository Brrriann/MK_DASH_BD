"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "@phosphor-icons/react";
import { TaskCard } from "./TaskCard";
import type { TaskWithClient } from "@/lib/actions/tasks";

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  tasks: TaskWithClient[];
  onAddTask: (status: string) => void;
  onTaskClick: (task: TaskWithClient) => void;
}

export function KanbanColumn({ id, label, color, tasks, onAddTask, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col min-w-[280px] w-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`font-outfit text-sm font-semibold ${color}`}>{label}</span>
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(id)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="태스크 추가"
        >
          <Plus size={14} weight="regular" />
        </button>
      </div>

      {/* Droppable Column Body */}
      <div
        ref={setNodeRef}
        className={`bg-slate-50 rounded-2xl p-4 flex flex-col gap-3 min-h-[200px] flex-1 transition-colors ${isOver ? "bg-blue-50 border border-blue-200" : "border border-transparent"}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl min-h-[80px]">
            <span className="text-xs text-slate-300">태스크 없음</span>
          </div>
        )}
      </div>
    </div>
  );
}
