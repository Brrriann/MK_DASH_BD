import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    title,
    amount,
    client_id = null,
    pdf_url = null,
    issued_at,
    expires_at = null,
    status = "pending",
  } = body as {
    title?: unknown;
    amount?: unknown;
    client_id?: unknown;
    pdf_url?: unknown;
    issued_at?: unknown;
    expires_at?: unknown;
    status?: unknown;
  };

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  }
  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json({ error: "금액을 올바르게 입력해주세요." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: estimate, error } = await supabase
    .from("estimates")
    .insert({
      title: (title as string).trim(),
      amount,
      status,
      pdf_url: pdf_url ?? null,
      client_id: client_id ?? null,
      issued_at: issued_at ?? new Date().toISOString().split("T")[0],
      expires_at: expires_at ?? null,
      line_items: [],
      include_vat: true,
      discount_amount: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(estimate);
}
