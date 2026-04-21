"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotePencil, Funnel } from "@phosphor-icons/react";
import { fetchMeetingNotes } from "@/lib/actions/meetings";
import { fetchClients } from "@/lib/actions/tasks";
import type { MeetingNoteWithClient } from "@/lib/actions/meetings";
import type { Client } from "@/lib/types";
import { MeetingNoteCard } from "@/components/meetings/MeetingNoteCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export default function MeetingsPage() {
  const [notes, setNotes] = useState<MeetingNoteWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMeetingNotes(selectedClientId === "all" ? undefined : selectedClientId)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  return (
    <div className="font-outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-900">
            미팅노트
          </h1>
          {!loading && (
            <p className="text-sm text-slate-400 mt-0.5">총 {notes.length}개</p>
          )}
        </div>
        <Link
          href="/meetings/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <NotePencil size={16} weight="regular" />
          새 미팅노트
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        <Funnel size={16} weight="regular" className="text-slate-400" />
        <Select value={selectedClientId} onValueChange={(v) => setSelectedClientId(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="클라이언트 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 클라이언트</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={NotePencil}
          title="미팅노트가 없습니다"
          description="첫 미팅노트를 작성해보세요."
          actionLabel="새 미팅노트"
          actionHref="/meetings/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <MeetingNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
