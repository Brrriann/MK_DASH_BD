"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, ClientWithRevenue, Project, TaxInvoice, Estimate, Contract } from "@/lib/types";

export type { Estimate, Contract };

export async function fetchClients(params?: {
  search?: string;
  status?: string;
  sortBy?: string;
}): Promise<ClientWithRevenue[]> {
  const supabase = createAdminClient();
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
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientWithRevenue[];
}

export async function fetchClient(id: string): Promise<ClientWithRevenue | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients_with_revenue")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as ClientWithRevenue;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const supabase = createAdminClient();
  const { data: client, error } = await supabase
    .from("clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return client;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchClientProjects(clientId: string): Promise<Project[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

export async function fetchClientEstimates(clientId: string): Promise<Estimate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("client_id", clientId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Estimate[];
}

export async function fetchClientContracts(clientId: string): Promise<Contract[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Contract[];
}

export async function fetchClientTaxInvoices(clientId: string): Promise<TaxInvoice[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tax_invoices")
    .select("*")
    .eq("client_id", clientId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TaxInvoice[];
}

