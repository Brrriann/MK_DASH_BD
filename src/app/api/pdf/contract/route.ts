import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContractPdf } from "@/components/pdf/ContractPdf";
import type { Contract, ClientWithRevenue } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contractId } = body as { contractId?: unknown };
  if (typeof contractId !== "string")
    return NextResponse.json({ error: "contractId 필드가 필요합니다." }, { status: 400 });

  const { data: contract, error: cErr } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (cErr || !contract) return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 });

  const c = contract as Contract;

  let clientName: string | undefined;
  if (c.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("company_name")
      .eq("id", c.client_id)
      .single();
    clientName = (client as ClientWithRevenue | null)?.company_name;
  }

  const user = session.user;
  const bp = user.user_metadata?.business_profile;
  const supplierName: string | undefined = bp?.organization_name;

  const pdfBuffer = await renderToBuffer(
    createElement(ContractPdf, {
      title: c.title,
      clientName,
      supplierName,
      signedAt: c.signed_at ? c.signed_at.split("T")[0] : undefined,
      expiresAt: c.expires_at ? c.expires_at.split("T")[0] : undefined,
      contractAmount: c.contract_amount ?? undefined,
      depositAmount: c.deposit_amount ?? undefined,
      depositPaid: c.deposit_paid,
      finalAmount: c.final_amount ?? undefined,
      finalPaid: c.final_paid,
      terms: c.terms ?? undefined,
    })
  );

  const admin = createAdminClient();
  const path = `${session.user.id}/${contractId}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from("contracts")
    .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadErr) return NextResponse.json({ error: "PDF 업로드 실패: " + uploadErr.message }, { status: 500 });

  const { data: signed } = await admin.storage
    .from("contracts")
    .createSignedUrl(path, 3600);
  if (!signed?.signedUrl) return NextResponse.json({ error: "서명된 URL 생성 실패" }, { status: 500 });

  await supabase.from("contracts").update({ pdf_url: signed.signedUrl }).eq("id", contractId);

  return NextResponse.json({ url: signed.signedUrl });
}
