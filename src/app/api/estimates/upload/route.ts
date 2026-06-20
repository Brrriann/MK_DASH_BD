import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/guard";

const BUCKET = "estimates";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "파일 업로드 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file 필드가 필요합니다." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "PDF, PNG, JPG 파일만 업로드 가능합니다." }, { status: 415 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 413 });
  }

  const ext = file.type === "application/pdf" ? "pdf"
    : file.type === "image/png" ? "png"
    : file.type === "image/webp" ? "webp"
    : "jpg";

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Supabase Storage upload error:", error);
    // Likely the bucket doesn't exist
    if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
      return NextResponse.json(
        { error: `Supabase Storage 버킷 '${BUCKET}'이 없습니다. Supabase 대시보드에서 '${BUCKET}' 버킷을 먼저 생성해주세요.` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: `업로드 실패: ${error.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return NextResponse.json({ url: publicUrl });
}
