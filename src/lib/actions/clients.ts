import { createBrowserClient } from "@supabase/ssr";
import type { Client, ClientWithRevenue, ClientStatus, Project, MeetingNote, TaxInvoice, Estimate, Contract } from "@/lib/types";

export type { Estimate, Contract };

export interface CreateClientInput {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  industry?: string;
  status: ClientStatus;
  source?: string;
  notes?: string;
}

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchClients(params?: {
  search?: string;
  status?: string;
  sortBy?: string;
}): Promise<ClientWithRevenue[]> {
  const supabase = getClient();
  let query = supabase.from("clients_with_revenue").select("*");

  if (params?.search) {
    const s = params.search;
    query = query.or(
      `company_name.ilike.%${s}%,contact_name.ilike.%${s}%,email.ilike.%${s}%`
    );
  }

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params?.sortBy === "total_revenue") {
    query = query.order("total_revenue", { ascending: false });
  } else if (params?.sortBy === "created_at") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("company_name", { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ClientWithRevenue[];
}

export async function fetchClient(id: string): Promise<ClientWithRevenue | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("clients_with_revenue")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ClientWithRevenue;
}

export async function createClient(data: CreateClientInput): Promise<Client> {
  const supabase = getClient();
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      company_name: data.company_name,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone ?? null,
      industry: data.industry ?? null,
      status: data.status,
      source: data.source ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return client;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const supabase = getClient();
  const { data: client, error } = await supabase
    .from("clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return client;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchClientProjects(clientId: string): Promise<Project[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function fetchClientEstimates(clientId: string): Promise<Estimate[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("client_id", clientId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Estimate[];
}

export async function fetchClientContracts(clientId: string): Promise<Contract[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contract[];
}

export async function fetchClientTaxInvoices(clientId: string): Promise<TaxInvoice[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("tax_invoices")
    .select("*")
    .eq("client_id", clientId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaxInvoice[];
}

export async function fetchClientMeetingNotes(clientId: string): Promise<MeetingNote[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("met_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MeetingNote[];
}
