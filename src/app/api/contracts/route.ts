import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/guard";

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    title, client_id = null, pdf_url = null,
    contract_amount = null, deposit_amount = null,
    signed_at = null, expires_at = null, status = "pending",
  } = body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim())
    return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      title: (title as string).trim(),
      status,
      client_id: client_id ?? null,
      pdf_url: pdf_url ?? null,
      contract_amount: contract_amount ?? null,
      deposit_amount: deposit_amount ?? null,
      deposit_paid: false,
      final_paid: false,
      signed_at: signed_at ?? null,
      expires_at: expires_at ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
