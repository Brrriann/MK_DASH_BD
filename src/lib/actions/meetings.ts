"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MeetingNote, MeetingMethod } from "@/lib/types";

export interface MeetingNoteWithClient extends MeetingNote {
  client?: { company_name: string } | null;
}

export interface CreateMeetingNoteInput {
  title: string;
  client_id: string;
  met_at: string;
  attendees: string[];
  method?: MeetingMethod | null;
  content?: string | null;
}

export interface UpsertMeetingNoteInput extends CreateMeetingNoteInput {
  id?: string;
}

export async function fetchMeetingNotes(
  clientId?: string
): Promise<MeetingNoteWithClient[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("meeting_notes")
    .select(`*, client:clients(company_name)`)
    .order("met_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MeetingNoteWithClient[];
}

export async function fetchMeetingNote(
  id: string
): Promise<MeetingNoteWithClient | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .select(`*, client:clients(company_name)`)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as MeetingNoteWithClient;
}

export async function createMeetingNote(
  input: CreateMeetingNoteInput
): Promise<MeetingNote> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MeetingNote;
}

export async function updateMeetingNote(
  id: string,
  input: Partial<MeetingNote>
): Promise<MeetingNote> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MeetingNote;
}

export async function upsertMeetingNote(
  input: UpsertMeetingNoteInput
): Promise<MeetingNote> {
  if (input.id) {
    const { id, ...rest } = input;
    return updateMeetingNote(id, rest);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MeetingNote;
}

export async function deleteMeetingNote(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("meeting_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchAllAttendees(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("meeting_notes").select("attendees");
  if (error) throw new Error(error.message);

  const allNames = (data ?? []).flatMap((row) => row.attendees as string[]);
  return [...new Set(allNames)].sort();
}

export async function linkTaskToMeeting(
  taskId: string,
  meetingNoteId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("task_meeting_notes")
    .insert({ task_id: taskId, meeting_note_id: meetingNoteId });
  if (error) throw new Error(error.message);
}

export async function unlinkTaskFromMeeting(
  taskId: string,
  meetingNoteId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("task_meeting_notes")
    .delete()
    .eq("task_id", taskId)
    .eq("meeting_note_id", meetingNoteId);
  if (error) throw new Error(error.message);
}
