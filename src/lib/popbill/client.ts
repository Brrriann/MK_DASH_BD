// 팝빌(Popbill) 전자세금계산서 REST 클라이언트 — Cloudflare Workers 호환
//
// 공식 `popbill` npm SDK는 node:http/node:https 콜백 클라이언트에 의존해
// 현재 Workers 런타임(compatibility_date 2025-05-05, node:http 미지원)에서 동작하지
// 않는다. 그래서 Linkhub 토큰 인증(HMAC-SHA256 서명)과 registIssue(즉시발행)를
// `fetch` + Web Crypto(crypto.subtle)로 직접 구현한다.
//
// 스펙 출처: 공식 오픈소스 SDK(linkhub-sdk/node-popbill, node-linkhub)에서 포팅.

const LINKHUB_API_VERSION = "2.0";
const AUTH_HOST = "auth.linkhub.co.kr"; // 토큰 발급 호스트(테스트/운영 동일)
const TAXINVOICE_SCOPES = ["member", "110"]; // 세금계산서 서비스 scope

export interface PopbillConfig {
  linkId: string;
  secretKey: string; // base64 인코딩된 연동 SecretKey
  isTest: boolean;
}

export function getPopbillConfig(): PopbillConfig {
  const linkId = process.env.POPBILL_LINK_ID;
  const secretKey = process.env.POPBILL_SECRET_KEY;
  if (!linkId || !secretKey) {
    throw new Error("팝빌 설정 누락: POPBILL_LINK_ID / POPBILL_SECRET_KEY");
  }
  return {
    linkId,
    secretKey,
    // 기본값은 테스트. 운영 전환 시에만 POPBILL_IS_TEST=false 지정.
    isTest: process.env.POPBILL_IS_TEST !== "false",
  };
}

// ---------- base64 / Web Crypto helpers ----------
const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256Base64(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return bytesToBase64(new Uint8Array(digest));
}

async function hmacSha256Base64(
  secretKeyB64: string,
  message: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secretKeyB64),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToBase64(new Uint8Array(sig));
}

// 팝빌 SDK와 동일하게 falsy 값은 직렬화에서 제외한다.
function pbStringify(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) => (!value ? undefined : value));
}

// ---------- 토큰 발급 (Linkhub) ----------
interface LinkhubToken {
  session_token: string;
  expiration: string; // ISO8601
}

// isolate 단위 best-effort 토큰 캐시 (CorpNum 기준)
const tokenCache = new Map<string, LinkhubToken>();

async function getToken(
  cfg: PopbillConfig,
  corpNum: string
): Promise<LinkhubToken> {
  const cached = tokenCache.get(corpNum);
  if (cached && Date.parse(cached.expiration) - 60_000 > Date.now()) {
    return cached;
  }

  const serviceID = cfg.isTest ? "POPBILL_TEST" : "POPBILL";
  const uri = `/${serviceID}/Token`;
  const xDate = new Date().toISOString();
  const forwardIP = "*"; // Workers egress IP가 가변 → IP 제한 해제
  const body = pbStringify({ access_id: corpNum, scope: TAXINVOICE_SCOPES });
  const bodyDigest = await sha256Base64(body);

  const stringToSign =
    "POST\n" +
    bodyDigest +
    "\n" +
    xDate +
    "\n" +
    forwardIP +
    "\n" +
    LINKHUB_API_VERSION +
    "\n" +
    uri;
  const signature = await hmacSha256Base64(cfg.secretKey, stringToSign);

  const res = await fetch(`https://${AUTH_HOST}${uri}`, {
    method: "POST",
    headers: {
      "x-lh-date": xDate,
      "x-lh-version": LINKHUB_API_VERSION,
      "x-lh-forwarded": forwardIP,
      Authorization: `LINKHUB ${cfg.linkId} ${signature}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const json = (await res.json()) as LinkhubToken & {
    code?: number;
    message?: string;
  };
  if (!res.ok || !json.session_token) {
    throw new Error(
      `팝빌 토큰 발급 실패: ${json.message ?? res.status} (code ${
        json.code ?? res.status
      })`
    );
  }
  tokenCache.set(corpNum, json);
  return json;
}

// ---------- registIssue (즉시발행 = 등록+발행+국세청전송) ----------
export interface PopbillResponse {
  code: number;
  message: string;
  ntsConfirmNum?: string;
}

export async function registIssue(
  cfg: PopbillConfig,
  corpNum: string,
  taxinvoice: Record<string, unknown>,
  userId?: string
): Promise<PopbillResponse> {
  const token = await getToken(cfg, corpNum);
  const apiHost = cfg.isTest
    ? "popbill-test.linkhub.co.kr"
    : "popbill.linkhub.co.kr";
  const body = pbStringify(taxinvoice);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.session_token}`,
    "X-HTTP-Method-Override": "ISSUE",
    "Content-Type": "application/json;charset=utf-8",
  };
  if (userId) headers["x-pb-userid"] = userId;

  const res = await fetch(`https://${apiHost}/Taxinvoice`, {
    method: "POST",
    headers,
    body,
  });

  const json = (await res.json()) as PopbillResponse;
  if (!res.ok) {
    throw new Error(
      `${json.message ?? "세금계산서 발행 실패"} (code ${json.code ?? res.status})`
    );
  }
  return json;
}
