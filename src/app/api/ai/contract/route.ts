import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callNvidia } from "@/lib/nvidia";

const SYSTEM_PROMPT = `당신은 한국 IT/디지털 프리랜서 계약서 작성 전문가입니다.
제공된 계약 조건을 바탕으로 전문적인 한국어 프리랜서 용역 계약서를 작성하세요.
반드시 다음 항목을 포함하세요:
1. 계약의 목적
2. 용역의 범위 및 내용
3. 계약 기간
4. 계약 금액 및 지급 조건
5. 저작권 및 지식재산권
6. 비밀유지 의무
7. 계약 해지 조건
8. 손해배상
9. 기타 특약 사항
전문적이고 명확한 법률 문체의 한국어로 작성하세요.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientName, amount, startDate, endDate, scope, notes } = body as {
    clientName?: unknown; amount?: unknown; startDate?: unknown;
    endDate?: unknown; scope?: unknown; notes?: unknown;
  };

  if (typeof scope !== "string" || scope.trim().length === 0)
    return NextResponse.json({ error: "scope 필드가 필요합니다." }, { status: 400 });
  if (scope.length > 1000)
    return NextResponse.json({ error: "scope는 1,000자 이하여야 합니다." }, { status: 400 });

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    amount ? `계약 금액: ${Number(amount).toLocaleString("ko-KR")}원` : null,
    startDate ? `계약 시작일: ${String(startDate).slice(0, 20)}` : null,
    endDate ? `계약 종료일: ${String(endDate).slice(0, 20)}` : null,
    `작업 범위: ${scope.trim()}`,
    notes ? `특이사항: ${String(notes).slice(0, 500)}` : null,
  ].filter(Boolean).join("\n");

  try {
    const content = await callNvidia(
      [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMessage }],
      { maxTokens: 3000 }
    );
    return NextResponse.json({ content });
  } catch (err) {
    console.error("contract AI error:", err);
    return NextResponse.json({ error: "AI 처리 중 오류가 발생했습니다." }, { status: 502 });
  }
}
