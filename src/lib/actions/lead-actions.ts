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
): Promise<{ success: true; clientId: string } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient();

    // 리드 소스/메모 가져오기
    const { data: lead, error: fetchError } = await supabase
      .from("leads").select("source, notes").eq("id", leadId).single();
    if (fetchError) return { success: false, error: `리드 조회 실패: ${fetchError.message}` };

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
    if (clientError) return { success: false, error: `고객 생성 실패: ${clientError.message}` };

    // 프로젝트 생성 (선택)
    if (projectData?.title?.trim()) {
      try {
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
      } catch (projErr) {
        // 프로젝트 생성 실패해도 고객 전환은 계속 진행
        console.error("프로젝트 생성 실패 (무시):", projErr);
      }
    }

    // 리드에 달린 미팅을 새 고객으로 이전
    const { error: meetingError } = await supabase
      .from("meeting_notes")
      .update({ client_id: client.id, lead_id: null })
      .eq("lead_id", leadId);
    if (meetingError)
      return { success: false, error: `미팅 이전 실패: ${meetingError.message}` };

    // 리드 전환 처리
    const { error: leadError } = await supabase.from("leads").update({
      status: "계약",
      converted_client_id: client.id,
      name: clientData.contact_name,
      company: clientData.company_name,
      updated_at: new Date().toISOString(),
    }).eq("id", leadId);
    if (leadError)
      return { success: false, error: `리드 전환 실패: ${leadError.message}` };

    revalidateTag("leads");
    revalidateTag("clients");
    revalidateTag("projects");
    revalidateTag("meetings");
    return { success: true, clientId: client.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}
