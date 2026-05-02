import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EstimatePdf } from "@/components/pdf/EstimatePdf";
import type { Estimate, ClientWithRevenue, EstimateItem } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { estimateId } = body as { estimateId?: unknown };
  if (typeof estimateId !== "string")
    return NextResponse.json({ error: "estimateId 필드가 필요합니다." }, { status: 400 });

  const { data: estimate, error: estErr } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .single();
  if (estErr || !estimate) return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });

  const est = estimate as Estimate;

  let clientName: string | undefined;
  if (est.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("company_name")
      .eq("id", est.client_id)
      .single();
    clientName = (client as ClientWithRevenue | null)?.company_name;
  }

  const user = session.user;
  const bp = user.user_metadata?.business_profile;
  const supplierName: string | undefined = bp?.organization_name;

  const estimateNumber = `EST-${est.id.slice(0, 8).toUpperCase()}`;
  const items: EstimateItem[] = Array.isArray(est.line_items) ? est.line_items as EstimateItem[] : [];

  const pdfBuffer = await renderToBuffer(
    createElement(EstimatePdf, {
      estimateNumber,
      title: est.title,
      issuedAt: est.issued_at ? est.issued_at.split("T")[0] : new Date().toISOString().split("T")[0],
      validUntil: est.expires_at ? est.expires_at.split("T")[0] : undefined,
      clientName,
      supplierName,
      items,
      includeVat: est.include_vat ?? true,
      discountAmount: est.discount_amount ?? 0,
      depositRatio: est.deposit_ratio ?? undefined,
      memo: undefined,
    })
  );

  const admin = createAdminClient();
  const path = `${session.user.id}/${estimateId}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from("estimates")
    .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadErr) return NextResponse.json({ error: "PDF 업로드 실패: " + uploadErr.message }, { status: 500 });

  const { data: signed } = await admin.storage
    .from("estimates")
    .createSignedUrl(path, 3600);
  if (!signed?.signedUrl) return NextResponse.json({ error: "서명된 URL 생성 실패" }, { status: 500 });

  await supabase.from("estimates").update({ pdf_url: signed.signedUrl }).eq("id", estimateId);

  return NextResponse.json({ url: signed.signedUrl });
}
