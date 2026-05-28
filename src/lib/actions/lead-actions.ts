"use server";

import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadStatus, LeadSource } from "@/lib/types";

export type LeadInput = {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  status?: LeadStatus;
  service_interest?: string;
  budget_estimate?: number;
  notes?: string;
  follow_up_at?: string;
};

export async function createLead(data: LeadInput) {
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ ...data, status: data.status ?? "신규" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidateTag("leads");
  return lead;
}

export async function updateLead(
  id: string,
  data: Partial<LeadInput> & { status?: LeadStatus }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTag("leads");
}

export async function deleteLead(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTag("leads");
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTag("leads");
}

export async function convertLeadToClient(leadId: string) {
  const supabase = createAdminClient();

  // 리드 정보 가져오기
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // 고객 생성
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      company_name: lead.company ?? lead.name,
      contact_name: lead.name,
      email: lead.email ?? `${leadId}@placeholder.com`,
      phone: lead.phone,
      status: "active",
      source: lead.source,
      notes: lead.notes,
    })
    .select()
    .single();
  if (clientError) throw new Error(clientError.message);

  // 리드를 '계약' 상태로 업데이트 + converted_client_id 설정
  await supabase
    .from("leads")
    .update({
      status: "계약",
      converted_client_id: client.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  revalidateTag("leads");
  revalidateTag("clients");
  return client;
}
