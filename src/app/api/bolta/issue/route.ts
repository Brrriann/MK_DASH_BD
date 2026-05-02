import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BOLTA_API_URL = "https://xapi.bolta.io/v1/taxInvoices/issue";

export async function POST(req: NextRequest) {
  // Auth guard
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.BOLTA_API_KEY;
  const customerKey = process.env.BOLTA_CUSTOMER_KEY;
  if (!apiKey || !customerKey) {
    return NextResponse.json(
      { error: "Bolta API keys not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  const data = body as Record<string, unknown>;
  if (
    !data.date ||
    !data.supplier ||
    !data.supplied ||
    !Array.isArray(data.items) ||
    data.items.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "필수 항목이 누락되었습니다. (date, supplier, supplied, items)",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(BOLTA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Customer-Key": customerKey,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      console.error("Bolta API error:", result);
      return NextResponse.json(
        {
          error:
            (result.error as { message?: string } | undefined)?.message ??
            "세금계산서 발행에 실패했습니다.",
        },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Bolta route error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
