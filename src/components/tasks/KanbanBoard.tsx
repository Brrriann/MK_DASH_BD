"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { Skeleton } from "@/components/ui/skeleton";
import { updateTaskStatus, type TaskWithClient } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/types";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "할일", color: "text-slate-600" },
  { id: "in_progress", label: "진행중", color: "text-blue-600" },
  { id: "done", label: "완료", color: "text-emerald-600" },
  { id: "on_hold", label: "보류", color: "text-amber-600" },
];

interface KanbanBoardProps {
  tasks: TaskWithClient[];
  loading: boolean;
  onTaskClick: (task: TaskWithClient) => void;
  onAddTask: (status: string) => void;
  onTasksChange: (tasks: TaskWithClient[]) => void;
}

export function KanbanBoard({ tasks, loading, onTaskClick, onAddTask, onTasksChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithClient | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    // Determine target column: over.id could be column id or task id
    const targetColumnId = COLUMNS.find((c) => c.id === over.id)
      ? (over.id as TaskStatus)
      : tasks.find((t) => t.id === over.id)?.status ?? task.status;

    if (targetColumnId === task.status) return;

    // Optimistic update
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, status: targetColumnId } : t
    );
    onTasksChange(updatedTasks);

    try {
      await updateTaskStatus(task.id, targetColumnId);
    } catch {
      // Revert on error
      onTasksChange(tasks);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1 mb-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3 min-h-[200px]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 min-w-[1160px]">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
            tasks={tasks.filter((t) => t.status === col.id)}
            onAddTask={onAddTask}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onClick={() => {}} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
