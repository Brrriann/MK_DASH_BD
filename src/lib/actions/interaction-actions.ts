"use server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type InteractionInput = {
  lead_id?: string;
  client_id?: string;
  type: 'call' | 'kakao' | 'email' | 'meeting' | 'memo';
  summary: string;
  content?: string;
  occurred_at?: string;
  follow_up_at?: string;
};

export async function createInteraction(data: InteractionInput) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("interactions").insert({
    ...data,
    occurred_at: data.occurred_at ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidateTag("interactions");
  revalidateTag("leads");
}

export async function updateInteraction(id: string, data: Partial<InteractionInput>) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("interactions").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTag("interactions");
}

export async function deleteInteraction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("interactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTag("interactions");
}
