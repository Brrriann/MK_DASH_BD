import { createBrowserClient } from "@supabase/ssr";
import type { Estimate } from "@/lib/types";

export type { Estimate };

export type CreateEstimateInput = {
  title: string;
  amount: number;
  status?: "pending" | "accepted" | "expired";
  pdf_url?: string | null;
  client_id?: string | null;
  issued_at?: string;
  expires_at?: string | null;
};

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchEstimates(params?: {
  clientId?: string;
  status?: string;
}): Promise<Estimate[]> {
  const supabase = getClient();
  let query = supabase
    .from("estimates")
    .select("*")
    .order("issued_at", { ascending: false });

  if (params?.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Estimate[];
}

export async function createEstimate(data: CreateEstimateInput): Promise<Estimate> {
  const supabase = getClient();
  const { data: estimate, error } = await supabase
    .from("estimates")
    .insert({
      title: data.title,
      amount: data.amount,
      status: data.status ?? "pending",
      pdf_url: data.pdf_url ?? null,
      client_id: data.client_id ?? null,
      issued_at: data.issued_at ?? new Date().toISOString().split("T")[0],
      expires_at: data.expires_at ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return estimate as Estimate;
}

export async function updateEstimate(
  id: string,
  data: Partial<Estimate>
): Promise<Estimate> {
  const supabase = getClient();
  const { data: estimate, error } = await supabase
    .from("estimates")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return estimate as Estimate;
}

export async function deleteEstimate(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("estimates").delete().eq("id", id);
  if (error) throw error;
}
