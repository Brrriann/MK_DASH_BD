"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  FloppyDisk,
  X,
  Users,
  LinkSimple,
} from "@phosphor-icons/react";
import {
  fetchMeetingNote,
  updateMeetingNote,
  deleteMeetingNote,
  fetchAllAttendees,
} from "@/lib/actions/meetings";
import { fetchClients, fetchTasks } from "@/lib/actions/tasks";
import type { MeetingNoteWithClient } from "@/lib/actions/meetings";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const METHOD_LABEL: Record<MeetingMethod, string> = {
  in_person: "대면",
  video: "화상",
  phone: "전화",
  email: "이메일",
};

const METHOD_CHIP_CLASS: Record<MeetingMethod, string> = {
  in_person: "bg-slate-100 text-slate-700",
  video: "bg-blue-100 text-blue-700",
  phone: "bg-emerald-100 text-emerald-700",
  email: "bg-amber-100 text-amber-700",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  done: "완료",
  on_hold: "보류",
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [note, setNote] = useState<MeetingNoteWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [metAt, setMetAt] = useState("");
  const [method, setMethod] = useState<MeetingMethod | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [content, setContent] = useState("");

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendeeSuggestions, setAttendeeSuggestions] = useState<string[]>([]);

  // Autosave
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isDirty = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMeetingNote(id)
      .then((data) => {
        if (data) {
          setNote(data);
          setTitle(data.title);
          setClientId(data.client_id ?? "");
          setMetAt(data.met_at);
          setMethod(data.method);
          setAttendees(data.attendees);
          setContent(data.content ?? "");
        }
      })
      .finally(() => setLoading(false));

    fetchClients().then(setClients).catch(() => {});
    fetchTasks().then(setTasks).catch(() => {});
    fetchAllAttendees().then(setAttendeeSuggestions).catch(() => {});
  }, [id]);

  const markDirty = () => {
    isDirty.current = true;
  };

  const doAutosave = useCallback(async () => {
    if (!isDirty.current || saving || !editMode) return;
    setSaveStatus("saving");
    setSaving(true);
    try {
      const updated = await updateMeetingNote(id, {
        title,
        client_id: clientId || null,
        met_at: metAt,
        method,
        attendees,
        content,
      });
      setNote((prev) => (prev ? { ...prev, ...updated } : prev));
      isDirty.current = false;
      setSaveStatus("saved");
      setSavedAt(new Date());
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [id, title, clientId, metAt, method, attendees, content, saving, editMode]);

  useEffect(() => {
    if (!editMode) return;
    intervalRef.current = setInterval(() => {
      if (isDirty.current) doAutosave();
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [editMode, doAutosave]);

  useEffect(() => {
    if (!editMode) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editMode]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("미팅 제목을 입력해주세요.");
      return;
    }
    setSaveStatus("saving");
    setSaving(true);
    try {
      const updated = await updateMeetingNote(id, {
        title,
        client_id: clientId || null,
        met_at: metAt,
        method,
        attendees,
        content,
      });
      setNote((prev) => (prev ? { ...prev, ...updated } : prev));
      isDirty.current = false;
      setSaveStatus("saved");
      setSavedAt(new Date());
      setEditMode(false);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMeetingNote(id);
      router.push("/meetings");
    } catch {
      alert("삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const cancelEdit = () => {
    if (note) {
      setTitle(note.title);
      setClientId(note.client_id ?? "");
      setMetAt(note.met_at);
      setMethod(note.method);
      setAttendees(note.attendees);
      setContent(note.content ?? "");
    }
    isDirty.current = false;
    setSaveStatus("idle");
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 font-outfit">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="font-outfit text-center py-16">
        <p className="text-slate-400">미팅노트를 찾을 수 없습니다.</p>
        <Link href="/meetings" className="text-blue-600 text-sm mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(note.met_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/meetings"
            className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} weight="regular" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 mb-1">{formattedDate}</p>
            {!editMode ? (
              <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 truncate">
                {note.title}
              </h1>
            ) : (
              <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">
                편집 중
              </h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editMode ? (
            <>
              <AutoSaveBar status={saveStatus} savedAt={savedAt} />
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                <X size={14} weight="regular" />
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              >
                <FloppyDisk size={14} weight="regular" />
                저장
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                <PencilSimple size={14} weight="regular" />
                편집
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                <Trash size={14} weight="regular" />
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {editMode ? (
        /* Edit form */
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">미팅 날짜</Label>
              <Input
                type="date"
                value={metAt}
                onChange={(e) => { setMetAt(e.target.value); markDirty(); }}
                className="font-outfit text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">미팅 제목</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                className="font-outfit text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">클라이언트</Label>
              <Select value={clientId} onValueChange={(v) => { setClientId(v ?? ""); markDirty(); }}>
                <SelectTrigger className="w-full font-outfit text-sm">
                  <SelectValue placeholder="클라이언트 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">없음</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">미팅 방식</Label>
              <MethodChipSelect value={method} onChange={(m) => { setMethod(m); markDirty(); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">참석자</Label>
              <AttendeeTagInput
                value={attendees}
                onChange={(a) => { setAttendees(a); markDirty(); }}
                suggestions={attendeeSuggestions}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">미팅 내용</Label>
            <MeetingNoteEditor
              key={note.id}
              initialContent={note.content ?? ""}
              onUpdate={(html) => { setContent(html); markDirty(); }}
            />
          </div>
        </div>
      ) : (
        /* View mode */
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar metadata */}
          <div className="space-y-5">
            {/* Client */}
            {note.client?.company_name && (
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">클라이언트</p>
                <p className="text-sm font-semibold text-slate-900">{note.client.company_name}</p>
              </div>
            )}

            {/* Method */}
            {note.method && (
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1.5">미팅 방식</p>
                <span className={`inline-block text-xs rounded-full px-2.5 py-1 font-medium ${METHOD_CHIP_CLASS[note.method]}`}>
                  {METHOD_LABEL[note.method]}
                </span>
              </div>
            )}

            {/* Attendees */}
            {note.attendees.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                  <Users size={12} weight="regular" />
                  참석자 ({note.attendees.length}명)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {note.attendees.map((a) => (
                    <span
                      key={a}
                      className="bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked tasks */}
            {tasks.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                  <LinkSimple size={12} weight="regular" />
                  연결 태스크
                </p>
                <div className="space-y-1.5">
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    >
                      <span className="flex-1 truncate text-slate-700 font-medium">{task.title}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${
                        task.status === "done"
                          ? "bg-emerald-100 text-emerald-700"
                          : task.status === "in_progress"
                          ? "bg-blue-100 text-blue-700"
                          : task.status === "on_hold"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <p className="text-xs text-slate-400 font-medium mb-3">미팅 내용</p>
            {note.content ? (
              <div
                className="prose prose-sm max-w-none text-slate-800 font-outfit [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-slate-100 [&_code]:rounded [&_code]:px-1 [&_code]:text-xs [&_pre]:bg-slate-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs [&_p]:mb-2 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            ) : (
              <p className="text-sm text-slate-400 italic">내용이 없습니다.</p>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle>미팅노트 삭제</DialogTitle>
          <DialogDescription>
            이 미팅노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              삭제
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
