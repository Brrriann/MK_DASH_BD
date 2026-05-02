// src/app/api/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NVIDIA_API_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are an expert OCR system for Korean business registration certificates (사업자등록증).
Carefully read ALL text in the image, then extract these exact fields and return ONLY valid JSON with no other text:
{
  "business_registration_number": "사업자등록번호 in 000-00-00000 format",
  "representative_name": "대표자명 (name of representative)",
  "business_address": "사업장소재지 (business address)",
  "business_type": "업태 (type of business)",
  "business_item": "종목 (business item/category)"
}
Rules:
- Read the document carefully and thoroughly before extracting
- Use null for any field not clearly visible
- Return ONLY the JSON object, no markdown, no explanation`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 500 });
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "image field required" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다. JPG, PNG, WEBP만 가능합니다." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString("base64");
    mimeType = file.type;
  } catch {
    return NextResponse.json({ error: "파일 처리 중 오류가 발생했습니다." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    const response = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "meta/llama-3.2-90b-vision-instruct",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all fields from this Korean business registration certificate (사업자등록증).",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA API error:", response.status, errorText);
      const msg = response.status === 429
        ? "API 요청 한도 초과. 잠시 후 다시 시도해주세요."
        : response.status === 401
        ? "API 키가 유효하지 않습니다."
        : "OCR 처리 중 오류가 발생했습니다.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const nvidiaResult = await response.json();
    const content = nvidiaResult.choices?.[0]?.message?.content ?? "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "OCR 결과를 파싱할 수 없습니다." }, { status: 422 });
    }

    const raw = JSON.parse(jsonMatch[0]);
    const fields = [
      "business_registration_number",
      "representative_name",
      "business_address",
      "business_type",
      "business_item",
    ] as const;
    const extracted: Record<string, string | null> = {};
    for (const field of fields) {
      const val = raw[field];
      extracted[field] = typeof val === "string" && val.length <= 200 ? val : null;
    }
    return NextResponse.json(extracted);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "OCR 요청 시간이 초과되었습니다. (90초)" }, { status: 504 });
    }
    console.error("OCR route error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
