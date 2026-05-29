"use server";

import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, ClientWithRevenue } from "@/lib/types";

export async function fetchClientsAction(): Promise<ClientWithRevenue[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients_with_revenue")
    .select("*")
    .order("company_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientWithRevenue[];
}

export interface ClientInput {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  industry?: string;
  status: string;
  source?: string;
  notes?: string;
  business_registration_number?: string;
  representative_name?: string;
  business_address?: string;
  business_type?: string;
  business_item?: string;
}

export async function createClientAction(data: ClientInput): Promise<Client> {
  const supabase = createAdminClient();
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
      business_registration_number: data.business_registration_number ?? null,
      representative_name: data.representative_name ?? null,
      business_address: data.business_address ?? null,
      business_type: data.business_type ?? null,
      business_item: data.business_item ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidateTag("clients");
  revalidateTag("dashboard");
  return client as Client;
}

export async function updateClientAction(
  id: string,
  data: Partial<ClientInput>
): Promise<Client> {
  const supabase = createAdminClient();
  const { data: client, error } = await supabase
    .from("clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidateTag("clients");
  revalidateTag("dashboard");
  return client as Client;
}
