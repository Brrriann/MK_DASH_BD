"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FunnelSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import {
  fetchTasks,
  fetchClients,
  fetchProjects,
  type TaskWithClient,
} from "@/lib/actions/tasks";
import type { Client, Project } from "@/lib/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

  // Sheet state
  const [sheetTask, setSheetTask] = useState<TaskWithClient | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formTask, setFormTask] = useState<TaskWithClient | null>(null);
  const [formInitialStatus, setFormInitialStatus] = useState<string>("todo");

  const loadData = useCallback(async (clientId?: string) => {
    setLoading(true);
    try {
      const [taskData, clientData, projectData] = await Promise.all([
        fetchTasks(clientId),
        fetchClients(),
        fetchProjects(),
      ]);
      setTasks(taskData);
      setClients(clientData);
      setProjects(projectData);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedClientId);
  }, [loadData, selectedClientId]);

  function handleAddTask(status: string) {
    setFormTask(null);
    setFormInitialStatus(status);
    setFormOpen(true);
  }

  function handleTaskClick(task: TaskWithClient) {
    setSheetTask(task);
    setSheetOpen(true);
  }

  function handleEditTask(task: TaskWithClient) {
    setSheetOpen(false);
    setFormTask(task);
    setFormInitialStatus(task.status);
    setFormOpen(true);
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function handleTaskSaved(saved: TaskWithClient) {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [saved, ...prev];
    });
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="flex flex-col gap-6 min-h-[100dvh] font-outfit">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">
            업무관리
          </h1>
          {!loading && (
            <span className="text-sm text-slate-400 bg-slate-100 rounded-full px-3 py-0.5 font-medium">
              총 {tasks.length}건
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Client filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm font-medium font-outfit rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors">
              <FunnelSimple size={14} weight="regular" />
              {selectedClient ? selectedClient.company_name : "전체 클라이언트"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-outfit">
              <DropdownMenuItem
                onClick={() => setSelectedClientId(undefined)}
                className={!selectedClientId ? "text-blue-600 font-medium" : ""}
              >
                전체
              </DropdownMenuItem>
              {clients.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={selectedClientId === c.id ? "text-blue-600 font-medium" : ""}
                >
                  {c.company_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New task button */}
          <Button
            onClick={() => handleAddTask("todo")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium font-outfit flex items-center gap-1.5"
          >
            <Plus size={14} weight="regular" />
            새 태스크
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <KanbanBoard
          tasks={tasks}
          loading={loading}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onTasksChange={setTasks}
        />
      </div>

      {/* Task detail sheet */}
      <TaskSheet
        task={sheetTask}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEdit={handleEditTask}
        onDeleted={handleTaskDeleted}
      />

      {/* Create/Edit form dialog */}
      <TaskFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialStatus={formInitialStatus}
        task={formTask}
        projects={projects}
        clients={clients}
        onSaved={handleTaskSaved}
      />
    </div>
  );
}
