import type { Task } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};
const PRIORITY_LABEL: Record<string, string> = {
  high: "높음", medium: "보통", low: "낮음",
};

interface UrgentTaskListProps {
  tasks: Pick<Task, "id" | "title" | "due_date" | "priority">[];
}

export function UrgentTaskList({ tasks }: UrgentTaskListProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-outfit font-semibold text-slate-900 text-sm">마감 임박 태스크</h2>
      </div>
      <div className="divide-y divide-slate-50">
        {tasks.map((task) => (
          <div key={task.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700 truncate">{task.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400">
                {task.due_date ? formatDate(task.due_date) : ""}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                PRIORITY_COLOR[task.priority]
              )}>
                {PRIORITY_LABEL[task.priority]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
