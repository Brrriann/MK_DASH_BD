import { createBrowserClient } from "@supabase/ssr";
import type { MeetingNote, MeetingMethod } from "@/lib/types";

const supabase = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export interface MeetingNoteWithClient extends MeetingNote {
  client?: { company_name: string } | null;
}

export interface CreateMeetingNoteInput {
  title: string;
  client_id: string;
  met_at: string; // YYYY-MM-DD
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
  const db = supabase();
  let query = db
    .from("meeting_notes")
    .select(`*, client:clients(company_name)`)
    .order("met_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MeetingNoteWithClient[];
}

export async function fetchMeetingNote(
  id: string
): Promise<MeetingNoteWithClient | null> {
  const db = supabase();
  const { data, error } = await db
    .from("meeting_notes")
    .select(`*, client:clients(company_name)`)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as MeetingNoteWithClient;
}

export async function createMeetingNote(
  input: CreateMeetingNoteInput
): Promise<MeetingNote> {
  const db = supabase();
  const { data, error } = await db
    .from("meeting_notes")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as MeetingNote;
}

export async function updateMeetingNote(
  id: string,
  input: Partial<MeetingNote>
): Promise<MeetingNote> {
  const db = supabase();
  const { data, error } = await db
    .from("meeting_notes")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MeetingNote;
}

export async function upsertMeetingNote(
  input: UpsertMeetingNoteInput
): Promise<MeetingNote> {
  const db = supabase();
  if (input.id) {
    const { id, ...rest } = input;
    return updateMeetingNote(id, rest);
  }

  const { data, error } = await db
    .from("meeting_notes")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as MeetingNote;
}

export async function deleteMeetingNote(id: string): Promise<void> {
  const db = supabase();
  const { error } = await db.from("meeting_notes").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAllAttendees(): Promise<string[]> {
  const db = supabase();
  const { data, error } = await db.from("meeting_notes").select("attendees");
  if (error) throw error;

  const allNames = (data ?? []).flatMap((row) => row.attendees as string[]);
  return [...new Set(allNames)].sort();
}

export async function linkTaskToMeeting(
  taskId: string,
  meetingNoteId: string
): Promise<void> {
  const db = supabase();
  const { error } = await db
    .from("task_meeting_notes")
    .insert({ task_id: taskId, meeting_note_id: meetingNoteId });
  if (error) throw error;
}

export async function unlinkTaskFromMeeting(
  taskId: string,
  meetingNoteId: string
): Promise<void> {
  const db = supabase();
  const { error } = await db
    .from("task_meeting_notes")
    .delete()
    .eq("task_id", taskId)
    .eq("meeting_note_id", meetingNoteId);
  if (error) throw error;
}
