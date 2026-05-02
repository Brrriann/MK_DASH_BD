import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callNvidia } from "@/lib/nvidia";

const SYSTEM_PROMPT = `당신은 한국어 비즈니스 회의록 작성 전문가입니다.
사용자가 제공하는 키워드와 메모를 바탕으로 정식 회의록을 작성하세요.
반드시 다음 형식을 따르세요:

## 회의 개요
(날짜, 참석자, 미팅 방식 등)

## 주요 논의 내용
(불릿 포인트로 구체적으로)

## 결정 사항
(불릿 포인트)

## 액션아이템
(담당자와 기한 포함)

## 다음 미팅 안건
(예정 사항)

전문적이고 명확한 한국어로 작성하세요.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { keywords, clientName, metAt } = body as { keywords?: unknown; clientName?: unknown; metAt?: unknown };
  if (typeof keywords !== "string" || keywords.trim().length === 0)
    return NextResponse.json({ error: "keywords 필드가 필요합니다." }, { status: 400 });
  if (keywords.length > 2000)
    return NextResponse.json({ error: "keywords는 2,000자 이하여야 합니다." }, { status: 400 });

  const userMessage = [
    clientName ? `클라이언트: ${String(clientName).slice(0, 100)}` : null,
    metAt ? `미팅일: ${String(metAt).slice(0, 20)}` : null,
    `키워드/메모:\n${keywords.trim()}`,
  ].filter(Boolean).join("\n");

  try {
    const content = await callNvidia([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);
    return NextResponse.json({ content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 처리 중 오류가 발생했습니다.";
    console.error("meeting-note AI error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
