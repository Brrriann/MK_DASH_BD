import { createBrowserClient } from "@supabase/ssr";
import type { TaxInvoice, InvoiceItem } from "@/lib/types";

export type { TaxInvoice };

export interface CreateInvoiceInput {
  title: string;
  items: InvoiceItem[];
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  issued_at?: string;
  memo?: string;
  client_id?: string | null;
  payment_received?: boolean;
  payment_received_at?: string | null;
  project_id?: string | null;
}

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchInvoices(params?: {
  clientId?: string;
}): Promise<TaxInvoice[]> {
  const supabase = getClient();
  let query = supabase
    .from("tax_invoices")
    .select("*")
    .order("issued_at", { ascending: false });

  if (params?.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TaxInvoice[];
}

export async function createInvoice(data: CreateInvoiceInput): Promise<TaxInvoice> {
  const supabase = getClient();
  const { data: invoice, error } = await supabase
    .from("tax_invoices")
    .insert({
      title: data.title,
      items: data.items,
      supply_amount: data.supply_amount,
      tax_amount: data.tax_amount,
      total_amount: data.total_amount,
      amount: data.total_amount,  // backward compat
      issued_at: data.issued_at ?? new Date().toISOString(),
      memo: data.memo ?? null,
      client_id: data.client_id ?? null,
      pdf_url: null,
      payment_received: data.payment_received ?? false,
      payment_received_at: data.payment_received_at ?? null,
      project_id: data.project_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return invoice as TaxInvoice;
}

export async function updateInvoice(
  id: string,
  data: Partial<TaxInvoice>
): Promise<TaxInvoice> {
  const supabase = getClient();
  const { data: invoice, error } = await supabase
    .from("tax_invoices")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return invoice as TaxInvoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("tax_invoices").delete().eq("id", id);
  if (error) throw error;
}
