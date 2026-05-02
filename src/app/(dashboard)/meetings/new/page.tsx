"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FloppyDisk, LinkSimple, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { upsertMeetingNote, fetchAllAttendees } from "@/lib/actions/meetings";
import { fetchClients, fetchTasks } from "@/lib/actions/tasks";
import type { Client, Task, MeetingMethod } from "@/lib/types";
import { AutoSaveBar, type AutoSaveStatus } from "@/components/meetings/AutoSaveBar";
import { AttendeeTagInput } from "@/components/meetings/AttendeeTagInput";
import { MethodChipSelect } from "@/components/meetings/MethodChipSelect";
import { MeetingNoteEditor } from "@/components/meetings/MeetingNoteEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  done: "완료",
  on_hold: "보류",
};

export default function NewMeetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("client_id") ?? "";

  // Form state
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>(initialClientId);
  const [metAt, setMetAt] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<MeetingMethod | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [linkedTaskIds, setLinkedTaskIds] = useState<Set<string>>(new Set());

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendeeSuggestions, setAttendeeSuggestions] = useState<string[]>([]);

  // Autosave
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isDirty = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [injectedContent, setInjectedContent] = useState("");

  // Load data
  useEffect(() => {
    fetchClients().then(setClients).catch(() => {});
    fetchTasks().then(setTasks).catch(() => {});
    fetchAllAttendees().then(setAttendeeSuggestions).catch(() => {});
  }, []);

  // Mark dirty on any field change
  const markDirty = () => {
    isDirty.current = true;
  };

  const doAutosave = useCallback(async () => {
    if (!isDirty.current || saving) return;
    if (!title.trim()) return;
    setSaveStatus("saving");
    setSaving(true);
    try {
      const result = await upsertMeetingNote({
        id: savedId ?? undefined,
        title: title || "제목 없음",
        client_id: clientId || "",
        met_at: metAt,
        attendees,
        method,
        content,
      });
      setSavedId(result.id);
      isDirty.current = false;
      setSaveStatus("saved");
      setSavedAt(new Date());
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [title, clientId, metAt, attendees, method, content, savedId, saving]);

  // Autosave interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (isDirty.current) {
        doAutosave();
      }
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [doAutosave]);

  // Warn on unload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("미팅 제목을 입력해주세요.");
      return;
    }
    setSaveStatus("saving");
    setSaving(true);
    try {
      const result = await upsertMeetingNote({
        id: savedId ?? undefined,
        title,
        client_id: clientId || "",
        met_at: metAt,
        attendees,
        method,
        content,
      });
      setSavedId(result.id);
      isDirty.current = false;
      setSaveStatus("saved");
      setSavedAt(new Date());
      router.push(`/meetings/${result.id}`);
    } catch {
      setSaveStatus("error");
      setSaving(false);
    }
  };

  async function handleAiWrite() {
    if (!aiKeywords.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const clientName = clientId ? clients.find(c => c.id === clientId)?.company_name : undefined;
      const res = await fetch("/api/ai/meeting-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: aiKeywords.trim(), clientName, metAt }),
      });
      const json = await res.json();
      if (!res.ok) { setAiError(json.error ?? "AI 오류"); return; }
      const html = json.content.replace(/\n/g, "<br>");
      setInjectedContent(html);
      setContent(html);
    } catch { setAiError("네트워크 오류가 발생했습니다."); }
    finally { setAiLoading(false); }
  }

  const toggleTask = (taskId: string) => {
    setLinkedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
    markDirty();
  };

  return (
    <div className="font-outfit">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/meetings"
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} weight="regular" />
          </Link>
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">
            새 미팅노트
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <AutoSaveBar status={saveStatus} savedAt={savedAt} />
          <Link
            href="/meetings"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            취소
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <FloppyDisk size={16} weight="regular" />
            저장
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left column: metadata */}
        <div className="space-y-5">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">미팅 날짜</Label>
            <Input
              type="date"
              value={metAt}
              onChange={(e) => {
                setMetAt(e.target.value);
                markDirty();
              }}
              className="font-outfit text-sm"
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">미팅 제목</Label>
            <Input
              type="text"
              placeholder="예: Q2 마케팅 전략 논의"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              className="font-outfit text-sm"
            />
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">클라이언트</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                if (v) setClientId(v);
                markDirty();
              }}
            >
              <SelectTrigger className="w-full font-outfit text-sm">
                <SelectValue placeholder="클라이언트 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">없음</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">미팅 방식</Label>
            <MethodChipSelect
              value={method}
              onChange={(m) => {
                setMethod(m);
                markDirty();
              }}
            />
          </div>

          {/* Attendees */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">참석자</Label>
            <AttendeeTagInput
              value={attendees}
              onChange={(a) => {
                setAttendees(a);
                markDirty();
              }}
              suggestions={attendeeSuggestions}
            />
          </div>

          {/* AI 회의록 작성 */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI 회의록 작성</p>
            <textarea
              value={aiKeywords}
              onChange={(e) => setAiKeywords(e.target.value)}
              placeholder={"키워드와 메모를 입력하세요.\n예: 웹사이트 리뉴얼, 디자인 레퍼런스 공유, 다음주까지 와이어프레임 요청"}
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-outfit"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{aiKeywords.length}/2,000</span>
              <button type="button" onClick={handleAiWrite}
                disabled={aiLoading || !aiKeywords.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Sparkle size={12} />
                {aiLoading ? "AI 작성 중..." : "AI 회의록 작성"}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-500">{aiError}</p>}
            {aiLoading && <p className="text-xs text-blue-600 animate-pulse">AI가 회의록을 작성하고 있습니다...</p>}
          </div>

          {/* Linked tasks */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <LinkSimple size={12} weight="regular" />
                연결 태스크
              </Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {tasks.map((task) => {
                  const linked = linkedTaskIds.has(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={`w-full text-left flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        linked
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex-1 truncate font-medium">{task.title}</span>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${
                          task.status === "done"
                            ? "bg-emerald-100 text-emerald-700"
                            : task.status === "in_progress"
                            ? "bg-blue-100 text-blue-700"
                            : task.status === "on_hold"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {STATUS_LABEL[task.status]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: content editor */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">미팅 내용</Label>
          <MeetingNoteEditor
            injectContent={injectedContent || undefined}
            onUpdate={(html) => {
              setContent(html);
              markDirty();
            }}
          />
        </div>
      </div>
    </div>
  );
}
