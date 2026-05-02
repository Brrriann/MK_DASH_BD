import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoicePdf } from "@/components/pdf/InvoicePdf";
import type { TaxInvoice, ClientWithRevenue, InvoiceItem } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { invoiceId } = body as { invoiceId?: unknown };
  if (typeof invoiceId !== "string")
    return NextResponse.json({ error: "invoiceId 필드가 필요합니다." }, { status: 400 });

  const { data: invoice, error: iErr } = await supabase
    .from("tax_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (iErr || !invoice) return NextResponse.json({ error: "세금계산서를 찾을 수 없습니다." }, { status: 404 });

  const inv = invoice as TaxInvoice;

  let clientName: string | undefined;
  let clientBrn: string | undefined;
  if (inv.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("company_name, business_registration_number")
      .eq("id", inv.client_id)
      .single();
    const c = client as ClientWithRevenue | null;
    clientName = c?.company_name;
    clientBrn = c?.business_registration_number ?? undefined;
  }

  const user = session.user;
  const bp = user.user_metadata?.business_profile;
  const supplierName: string | undefined = bp?.organization_name;
  const supplierBrn: string | undefined = bp?.registration_number;

  const invoiceNumber = `INV-${inv.id.slice(0, 8).toUpperCase()}`;
  const items: InvoiceItem[] = Array.isArray(inv.items) ? inv.items as InvoiceItem[] : [];

  const pdfBuffer = await renderToBuffer(
    createElement(InvoicePdf, {
      invoiceNumber,
      title: inv.title,
      issuedAt: inv.issued_at ? inv.issued_at.split("T")[0] : new Date().toISOString().split("T")[0],
      clientName,
      clientBrn,
      supplierName,
      supplierBrn,
      items,
      supplyAmount: inv.supply_amount,
      taxAmount: inv.tax_amount,
      totalAmount: inv.total_amount,
      memo: inv.memo ?? undefined,
    })
  );

  const admin = createAdminClient();
  const path = `${session.user.id}/${invoiceId}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from("invoices")
    .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadErr) return NextResponse.json({ error: "PDF 업로드 실패: " + uploadErr.message }, { status: 500 });

  const { data: signed } = await admin.storage
    .from("invoices")
    .createSignedUrl(path, 3600);
  if (!signed?.signedUrl) return NextResponse.json({ error: "서명된 URL 생성 실패" }, { status: 500 });

  await supabase.from("tax_invoices").update({ pdf_url: signed.signedUrl }).eq("id", invoiceId);

  return NextResponse.json({ url: signed.signedUrl });
}
