import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEstimate } from "@/lib/resend";
import type { Estimate } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Optional custom subject/body from request body
  let customSubject: string | undefined;
  let customBody: string | undefined;
  try {
    const body = await req.json() as { subject?: string; body?: string };
    customSubject = body.subject;
    customBody = body.body;
  } catch {
    // Body is optional — ignore parse errors
  }

  const supabase = createAdminClient();

  const { data: estimate, error: estimateErr } = await supabase
    .from("estimates")
    .select("*, clients(contact_name, email, company_name)")
    .eq("id", id)
    .single();

  if (estimateErr || !estimate) {
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  const client = (estimate as Estimate & {
    clients: { contact_name: string; email: string; company_name: string } | null;
  }).clients;

  if (!client?.email) {
    return NextResponse.json({
      error: "클라이언트 이메일이 없습니다. 고객 정보에서 이메일을 먼저 등록해주세요.",
    }, { status: 422 });
  }

  try {
    await sendEstimate({
      to: client.email,
      recipientName: client.contact_name,
      estimateTitle: estimate.title,
      pdfUrl: estimate.pdf_url,
      amount: estimate.amount,
      issuedAt: estimate.issued_at,
      expiresAt: estimate.expires_at,
      customSubject,
      customBody,
    });
  } catch (err) {
    console.error("Estimate email send error:", err);
    return NextResponse.json({ error: "이메일 발송에 실패했습니다." }, { status: 502 });
  }

  // 만료 상태였다면 발송됨으로 업데이트
  await supabase
    .from("estimates")
    .update({ status: "pending" })
    .eq("id", id)
    .eq("status", "expired");

  return NextResponse.json({ ok: true });
}
