import { createBrowserClient } from "@supabase/ssr";
import type { Contract } from "@/lib/actions/clients";

export type { Contract };

export type CreateContractInput = {
  title: string;
  status?: "signed" | "pending" | "expired";
  pdf_url?: string | null;
  client_id?: string | null;
  signed_at?: string | null;
  expires_at?: string | null;
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
