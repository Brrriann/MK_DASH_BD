import { createBrowserClient } from "@supabase/ssr";
import type { TaxInvoice } from "@/lib/types";

export type { TaxInvoice };

export type CreateInvoiceInput = {
  title: string;
  amount: number;
  issued_at?: string;
  pdf_url?: string | null;
  client_id?: string | null;
};

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
      amount: data.amount,
      issued_at: data.issued_at ?? new Date().toISOString().split("T")[0],
      pdf_url: data.pdf_url ?? null,
      client_id: data.client_id ?? null,
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
