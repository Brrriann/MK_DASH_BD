"use client";

import { useState } from "react";
import { CalendarPlus } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MethodChipSelect } from "@/components/meetings/MethodChipSelect";
import { createMeetingNote } from "@/lib/actions/meetings";
import type { MeetingMethod } from "@/lib/types";

interface QuickMeetingDialogProps {
  /** 클라이언트 미팅이면 clientId, 리드 미팅이면 leadId 중 하나 지정 */
  clientId?: string;
  leadId?: string;
  onCreated?: () => void;
  /** 트리거 버튼 스타일 (compact: 작은 버튼) — controlled 모드에선 무시 */
  variant?: "default" | "compact";
  /** controlled 모드: open/onOpenChange를 주면 자체 트리거 버튼을 렌더하지 않음 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickMeetingDialog({
  clientId,
  leadId,
  onCreated,
  variant = "default",
  open: controlledOpen,
  onOpenChange,
}: QuickMeetingDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [title, setTitle] = useState("");
  const [metAt, setMetAt] = useState(new Date().toISOString().split("T")[0]);
  const [metTime, setMetTime] = useState("");
  const [method, setMethod] = useState<MeetingMethod | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setOpen(o: boolean) {
    if (isControlled) onOpenChange?.(o);
    else setUncontrolledOpen(o);
  }

  function reset() {
    setTitle("");
    setMetAt(new Date().toISOString().split("T")[0]);
    setMetTime("");
    setMethod(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("미팅 제목을 입력해주세요."); return; }
    setSaving(true);
    setError("");
    try {
      await createMeetingNote({
        title: title.trim(),
        client_id: clientId ?? null,
        lead_id: leadId ?? null,
        met_at: metAt,
        met_time: metTime || null,
        attendees: [],
        method,
        content: null,
      });
      setOpen(false);
      reset();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const triggerCls = variant === "compact"
    ? "inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
    : "inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors";

  return (
    <>
      {!isControlled && (
        <button type="button" onClick={() => setOpen(true)} className={triggerCls}>
          <CalendarPlus size={variant === "compact" ? 12 : 16} weight="regular" />
          미팅 일정 추가
        </button>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogTitle className="font-outfit">미팅 일정 추가</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">미팅 제목 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 킥오프 미팅"
                className="font-outfit text-sm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">날짜</Label>
                <Input
                  type="date"
                  value={metAt}
                  onChange={(e) => setMetAt(e.target.value)}
                  className="font-outfit text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">시간</Label>
                <Input
                  type="time"
                  value={metTime}
                  onChange={(e) => setMetTime(e.target.value)}
                  className="font-outfit text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">미팅 방식</Label>
              <MethodChipSelect value={method} onChange={setMethod} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setOpen(false); reset(); }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {saving ? "저장 중..." : "추가"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
