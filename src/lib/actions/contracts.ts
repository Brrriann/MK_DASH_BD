import { createBrowserClient } from "@supabase/ssr";
import type { Contract } from "@/lib/types";

export type { Contract };

import type { ContractStatus } from "@/lib/types";

export type CreateContractInput = {
  title: string;
  status?: ContractStatus;
  pdf_url?: string | null;
  client_id?: string | null;
  signed_at?: string | null;
  expires_at?: string | null;
  contract_amount?: number | null;
  deposit_amount?: number | null;
  deposit_paid?: boolean;
  deposit_paid_at?: string | null;
  final_amount?: number | null;
  final_paid?: boolean;
  final_paid_at?: string | null;
  terms?: string | null;
  project_id?: string | null;
};

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchContracts(params?: {
  clientId?: string;
  status?: string;
}): Promise<Contract[]> {
  const supabase = getClient();
  let query = supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Contract[];
}

export async function createContract(data: CreateContractInput): Promise<Contract> {
  const supabase = getClient();
  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      title: data.title,
      status: data.status ?? "pending",
      pdf_url: data.pdf_url ?? null,
      client_id: data.client_id ?? null,
      signed_at: data.signed_at ?? null,
      expires_at: data.expires_at ?? null,
      contract_amount: data.contract_amount ?? null,
      deposit_amount: data.deposit_amount ?? null,
      deposit_paid: data.deposit_paid ?? false,
      deposit_paid_at: data.deposit_paid_at ?? null,
      final_amount: data.final_amount ?? null,
      final_paid: data.final_paid ?? false,
      final_paid_at: data.final_paid_at ?? null,
      terms: data.terms ?? null,
      project_id: data.project_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return contract as Contract;
}

export async function updateContract(
  id: string,
  data: Partial<Contract>
): Promise<Contract> {
  const supabase = getClient();
  const { data: contract, error } = await supabase
    .from("contracts")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return contract as Contract;
}

export async function deleteContract(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}
