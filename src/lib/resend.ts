import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface SendSignatureRequestParams {
  to: string;
  recipientName: string;
  contractTitle: string;
  token: string;
  expiresAt: Date;
}

export async function sendSignatureRequest(params: SendSignatureRequestParams) {
  const { to, recipientName, contractTitle, token, expiresAt } = params;
  const link = `${APP_URL}/sign/contract/${token}`;
  const expiryStr = expiresAt.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[서명 요청] ${contractTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="font-size:16px;color:#0f172a;margin-bottom:8px;">📄 계약서 서명을 요청드립니다</h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;">
          ${recipientName} 님,<br/>
          <strong>${contractTitle}</strong>에 서명을 요청드립니다.<br/>
          아래 버튼을 클릭하여 계약 내용을 확인하신 후 서명해 주세요.
        </p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin:16px 0;">계약서 서명하기</a>
        <div style="background:#f8fafc;border-radius:6px;padding:12px;font-size:12px;color:#64748b;margin-top:8px;">
          📋 ${contractTitle}<br/>
          ⏰ 만료일: ${expiryStr}
        </div>
        <p style="font-size:11px;color:#94a3b8;margin-top:16px;">버튼이 작동하지 않으면 아래 링크를 복사하여 접속하세요:<br/>${link}</p>
      </div>
    `,
  });
}

export interface SendSignatureCompleteParams {
  clientEmail: string;
  clientName: string;
  contractTitle: string;
  signedPdfUrl: string;
  ownerEmail: string;
  signerName: string;
  signedAt: Date;
}

export async function sendSignatureComplete(params: SendSignatureCompleteParams) {
  const { clientEmail, clientName, contractTitle, signedPdfUrl, ownerEmail, signerName, signedAt } = params;
  const signedAtStr = signedAt.toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `[서명 완료] ${contractTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="font-size:32px;margin-bottom:8px;">🎉</div>
        <h2 style="font-size:16px;color:#0f172a;">계약이 체결되었습니다</h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;">
          ${clientName} 님, <strong>${contractTitle}</strong>에 서명이 완료되었습니다.<br/>
          서명된 계약서를 아래에서 다운로드하실 수 있습니다.
        </p>
        <a href="${signedPdfUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;margin:12px 0;">📄 서명된 계약서 다운로드</a>
      </div>
    `,
  });

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `[서명 완료 알림] ${contractTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="font-size:16px;color:#0f172a;">✅ 계약서 서명 완료</h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;">
          <strong>${contractTitle}</strong>에 클라이언트 서명이 완료되었습니다.
        </p>
        <div style="background:#f0fdf4;border-radius:6px;padding:12px;font-size:13px;color:#15803d;">
          서명자: ${signerName}<br/>
          서명 일시: ${signedAtStr}
        </div>
      </div>
    `,
  });
}
