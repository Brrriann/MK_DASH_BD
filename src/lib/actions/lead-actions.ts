"use server";

import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProject } from "@/lib/actions/projects";
import type { LeadStatus, LeadSource, ServiceType } from "@/lib/types";

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

  const { data: lead, error: fetchError } = await supabase
    .from("leads").select("*").eq("id", leadId).single();
  if (fetchError) throw new Error(fetchError.message);

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
    .select().single();
  if (clientError) throw new Error(clientError.message);

  await supabase
    .from("meeting_notes")
    .update({ client_id: client.id, lead_id: null })
    .eq("lead_id", leadId);

  await supabase.from("leads").update({
    status: "계약",
    converted_client_id: client.id,
    updated_at: new Date().toISOString(),
  }).eq("id", leadId);

  revalidateTag("leads");
  revalidateTag("clients");
  revalidateTag("meetings");
  return client;
}

// 파이프라인 전환: 고객 정보 수정 가능 + 프로젝트 선택 생성
export type ConvertClientData = {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
};

export type ConvertProjectData = {
  title: string;
  service_type?: string;
  contract_amount?: number;
  deadline?: string;
};

export async function convertLeadToClientWithProject(
  leadId: string,
  clientData: ConvertClientData,
  projectData?: ConvertProjectData
) {
  const supabase = createAdminClient();

  // 리드 소스/메모 가져오기
  const { data: lead, error: fetchError } = await supabase
    .from("leads").select("source, notes").eq("id", leadId).single();
  if (fetchError) throw new Error(fetchError.message);

  // 고객 생성
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      company_name: clientData.company_name,
      contact_name: clientData.contact_name,
      email: clientData.email,
      phone: clientData.phone ?? null,
      status: "active",
      source: lead.source,
      notes: lead.notes,
    })
    .select().single();
  if (clientError) throw new Error(clientError.message);

  // 프로젝트 생성 (선택) — createProject 공통 함수 사용으로 일관성 확보
  if (projectData?.title?.trim()) {
    await createProject({
      title: projectData.title.trim(),
      client_id: client.id,
      status: "active",
      pipeline_stage: "상담",
      service_type: (projectData.service_type || null) as ServiceType | null,
      contract_amount: projectData.contract_amount ?? null,
      deposit_paid: false,
      final_paid: false,
      deadline: projectData.deadline ?? null,
    });
  }

  // 리드에 달린 미팅을 새 고객으로 이전 (lead_id → client_id)
  await supabase
    .from("meeting_notes")
    .update({ client_id: client.id, lead_id: null })
    .eq("lead_id", leadId);

  // 리드 전환 처리 — 고객 전환 폼에서 수정된 이름/회사도 리드에 반영
  await supabase.from("leads").update({
    status: "계약",
    converted_client_id: client.id,
    name: clientData.contact_name,
    company: clientData.company_name,
    updated_at: new Date().toISOString(),
  }).eq("id", leadId);

  revalidateTag("leads");
  revalidateTag("clients");
  revalidateTag("projects");
  revalidateTag("meetings");
  return client;
}
