import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignatureRequest } from "@/lib/resend";
import { randomUUID } from "crypto";

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

  const admin = createAdminClient();

  const { data: contract, error: contractErr } = await admin
    .from("contracts")
    .select("*, clients(contact_name, email)")
    .eq("id", contractId)
    .single();

  if (contractErr || !contract)
    return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 });

  if (contract.signature_token_used_at)
    return NextResponse.json({ error: "이미 서명이 완료된 계약서입니다." }, { status: 409 });

  const client = contract.clients as { contact_name: string; email: string } | null;
  if (!client?.email)
    return NextResponse.json({ error: "클라이언트 이메일이 없습니다." }, { status: 422 });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error: updateErr } = await admin
    .from("contracts")
    .update({
      signature_token: token,
      signature_token_expires_at: expiresAt.toISOString(),
      signature_token_used_at: null,
      status: "signature_requested",
    })
    .eq("id", contractId);

  if (updateErr)
    return NextResponse.json({ error: "토큰 저장 실패" }, { status: 500 });

  try {
    await sendSignatureRequest({
      to: client.email,
      recipientName: client.contact_name,
      contractTitle: contract.title,
      token,
      expiresAt,
    });
  } catch (err) {
    console.error("send-signature email error:", err);
    return NextResponse.json({ error: "이메일 발송에 실패했습니다." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
