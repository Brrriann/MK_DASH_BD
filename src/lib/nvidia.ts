const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "meta/llama-3.3-70b-instruct";

export interface NvidiaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callNvidia(
  messages: NvidiaMessage[],
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.3,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("NVIDIA API error:", res.status, text);
      let detail = "";
      try { detail = JSON.parse(text)?.detail ?? JSON.parse(text)?.message ?? text; } catch { detail = text; }
      throw new Error(`NVIDIA API ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}
