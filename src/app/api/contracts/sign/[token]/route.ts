import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderToBuffer } from "@react-pdf/renderer";
import { SignedContractPdf } from "@/components/pdf/SignedContractPdf";
import { sendSignatureComplete } from "@/lib/resend";
import React from "react";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: contract, error } = await admin
    .from("contracts")
    .select("id, title, terms, signature_token_expires_at, signature_token_used_at, clients(contact_name, email)")
    .eq("signature_token", token)
    .single();

  if (error || !contract)
    return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });

  if (contract.signature_token_used_at)
    return NextResponse.json({ error: "already_signed" }, { status: 409 });

  if (new Date(contract.signature_token_expires_at) < new Date())
    return NextResponse.json({ error: "expired" }, { status: 410 });

  return NextResponse.json({
    id: contract.id,
    title: contract.title,
    terms: contract.terms,
    clientName: (contract.clients as unknown as { contact_name: string } | null)?.contact_name,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const admin = createAdminClient();

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { signerName, signatureBase64 } = body as {
    signerName?: unknown;
    signatureBase64?: unknown;
  };

  if (typeof signerName !== "string" || !signerName.trim())
    return NextResponse.json({ error: "서명자 이름이 필요합니다." }, { status: 400 });

  if (typeof signatureBase64 !== "string" || !signatureBase64.startsWith("data:image/png;base64,"))
    return NextResponse.json({ error: "서명 이미지가 유효하지 않습니다." }, { status: 400 });

  if (signatureBase64.length > 700000)
    return NextResponse.json({ error: "서명 이미지가 너무 큽니다." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  // 원자적 토큰 소비 (이중 서명 방지)
  const { data: claimed, error: claimErr } = await admin
    .from("contracts")
    .update({ signature_token_used_at: new Date().toISOString() })
    .eq("signature_token", token)
    .is("signature_token_used_at", null)
    .gt("signature_token_expires_at", new Date().toISOString())
    .select("id, title, terms, contract_amount, deposit_amount, deposit_paid, final_amount, final_paid, clients(contact_name, email)")
    .single();

  if (claimErr || !claimed)
    return NextResponse.json({ error: "이미 서명되었거나 만료된 링크입니다." }, { status: 409 });

  const client = claimed.clients as unknown as { contact_name: string; email: string } | null;
  const signedAt = new Date();

  // 서명 이미지 Storage 저장
  const sigImgBuffer = Buffer.from(signatureBase64.split(",")[1], "base64");
  const sigImgPath = `signatures/${claimed.id}/${signedAt.getTime()}.png`;

  const { error: imgUploadErr } = await admin.storage
    .from("contract-signatures")
    .upload(sigImgPath, sigImgBuffer, { contentType: "image/png" });

  if (imgUploadErr) {
    console.error("signature image upload error:", imgUploadErr);
    return NextResponse.json({ error: "서명 이미지 저장 실패" }, { status: 500 });
  }

  // PDF 생성 + 저장
  let pdfUrl = "";
  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(SignedContractPdf, {
        title: claimed.title,
        terms: claimed.terms,
        clientName: client?.contact_name,
        contractAmount: claimed.contract_amount,
        depositAmount: claimed.deposit_amount,
        depositPaid: claimed.deposit_paid,
        finalAmount: claimed.final_amount,
        finalPaid: claimed.final_paid,
        signerName: signerName.trim(),
        signatureBase64,
        signedAt: signedAt.toLocaleDateString("ko-KR"),
      })
    );

    const pdfPath = `signed-pdfs/${claimed.id}/${signedAt.getTime()}.pdf`;
    const { error: pdfUploadErr } = await admin.storage
      .from("contract-signatures")
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf" });

    if (pdfUploadErr) throw pdfUploadErr;

    const { data: signedUrl } = await admin.storage
      .from("contract-signatures")
      .createSignedUrl(pdfPath, 3600);

    pdfUrl = signedUrl?.signedUrl ?? "";

    await admin.from("contracts").update({
      status: "signed",
      signer_name: signerName.trim(),
      signer_email: client?.email ?? null,
      signer_ip: ip,
      signer_user_agent: userAgent,
      signature_image_url: sigImgPath,
      signed_pdf_url: pdfPath,
      signed_at: signedAt.toISOString(),
    }).eq("id", claimed.id);

  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }

  // 이메일 발송 (오류 시 로그만)
  try {
    const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL ?? "";
    if (client?.email && ownerEmail) {
      await sendSignatureComplete({
        clientEmail: client.email,
        clientName: client.contact_name,
        contractTitle: claimed.title,
        signedPdfUrl: pdfUrl,
        ownerEmail,
        signerName: signerName.trim(),
        signedAt,
      });
    }
  } catch (err) {
    console.error("completion email error:", err);
  }

  return NextResponse.json({ ok: true, pdfUrl });
}
