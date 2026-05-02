import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callNvidia } from "@/lib/nvidia";

const SYSTEM_PROMPT = `당신은 한국 IT/디지털 프리랜서 견적서 작성 전문가입니다.
클라이언트 정보와 작업 설명을 바탕으로 견적 품목 목록을 JSON 형식으로 반환하세요.
반드시 다음 JSON 형식만 반환하세요 (다른 텍스트 없이):
{
  "items": [
    { "name": "품목명", "quantity": 1, "unit_price": 1000000 }
  ]
}
규칙:
- 품목명은 구체적이고 명확하게
- 단가는 한국 시장 기준 현실적인 금액 (원 단위, 정수)
- 수량은 1 이상의 정수
- 최대 10개 품목`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientName, description } = body as { clientName?: unknown; description?: unknown };
  if (typeof description !== "string" || description.trim().length === 0)
    return NextResponse.json({ error: "description 필드가 필요합니다." }, { status: 400 });
  if (description.length > 1000)
    return NextResponse.json({ error: "description은 1,000자 이하여야 합니다." }, { status: 400 });

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    `작업 내용: ${description.trim()}`,
  ].filter(Boolean).join("\n");

  try {
    const raw = await callNvidia(
      [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMessage }],
      { jsonMode: true, temperature: 0.2 }
    );

    let parsed: { items: Array<{ name: string; quantity: number; unit_price: number }> };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      console.error("AI estimate parse error:", raw);
      return NextResponse.json({ error: "AI 응답을 파싱할 수 없습니다." }, { status: 422 });
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0)
      return NextResponse.json({ error: "AI가 품목을 생성하지 못했습니다." }, { status: 422 });

    const items = parsed.items.slice(0, 10).map(item => ({
      name: String(item.name ?? "").slice(0, 100),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      unit_price: Math.max(0, Math.floor(Number(item.unit_price) || 0)),
      supply_amount: Math.max(1, Math.floor(Number(item.quantity) || 1)) * Math.max(0, Math.floor(Number(item.unit_price) || 0)),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 처리 중 오류가 발생했습니다.";
    console.error("estimate AI error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
