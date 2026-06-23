import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPopbillConfig, registIssue } from "@/lib/popbill/client";

interface IssueRequestItem {
  name: string;
  quantity?: number;
  unit_price?: number;
  supply_amount: number;
}

interface IssueRequestBody {
  invoiceId: string;
  writeDate: string; // yyyy-mm-dd
  purposeType?: "영수" | "청구";
  invoicee: {
    corpNum: string;
    corpName: string;
    ceoName?: string;
    addr?: string;
    bizType?: string;
    bizClass?: string;
    email?: string;
  };
  items: IssueRequestItem[];
}

const onlyDigits = (s: string | undefined) => (s ?? "").replace(/[^0-9]/g, "");
const toYmd = (s: string | undefined) => (s ?? "").replace(/[^0-9]/g, "").slice(0, 8);

export async function POST(req: NextRequest) {
  // 인증 가드
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let cfg;
  try {
    cfg = getPopbillConfig();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "팝빌 설정 오류" },
      { status: 500 }
    );
  }

  // 공급자(팝빌 회원) 사업자번호 — 토큰 발급 및 invoicerCorpNum에 사용
  const corpNum = onlyDigits(process.env.POPBILL_CORP_NUM);
  if (!corpNum) {
    return NextResponse.json(
      { error: "POPBILL_CORP_NUM(공급자 사업자번호)이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: IssueRequestBody;
  try {
    body = (await req.json()) as IssueRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body.invoiceId ||
    !body.invoicee?.corpNum ||
    !Array.isArray(body.items) ||
    body.items.length === 0
  ) {
    return NextResponse.json(
      { error: "필수 항목 누락 (invoiceId, invoicee.corpNum, items)" },
      { status: 400 }
    );
  }

  // 공급자 상세 — 로그인 사용자 메타데이터(설정에서 입력한 내 사업자 정보)
  const bp = (user.user_metadata?.business_profile ?? {}) as {
    organization_name?: string;
    representative_name?: string;
    business_address?: string;
    business_type?: string;
    business_item?: string;
    manager_email?: string;
  };

  const writeDate = toYmd(body.writeDate) || toYmd(new Date().toISOString());
  const supplyTotal = body.items.reduce((s, i) => s + (i.supply_amount || 0), 0);
  const taxTotal = Math.round(supplyTotal * 0.1);
  const totalAmount = supplyTotal + taxTotal;

  // 문서관리번호(invoicerMgtKey): 인보이스 id 기반 — 안정적·고유, 영숫자 ≤24자
  const mgtKey = body.invoiceId.replace(/[^0-9a-zA-Z]/g, "").slice(0, 24);

  const detailList = body.items.map((item, idx) => {
    const itemSupply = item.supply_amount || 0;
    return {
      serialNum: idx + 1,
      purchaseDT: writeDate,
      itemName: item.name,
      qty: String(item.quantity ?? 1),
      unitCost: item.unit_price != null ? String(item.unit_price) : "",
      supplyCost: String(itemSupply),
      tax: String(Math.round(itemSupply * 0.1)),
    };
  });

  const taxinvoice: Record<string, unknown> = {
    writeDate,
    chargeDirection: "정과금",
    issueType: "정발행",
    purposeType: body.purposeType === "영수" ? "영수" : "청구",
    taxType: "과세",

    // 공급자
    invoicerCorpNum: corpNum,
    invoicerCorpName: bp.organization_name ?? "",
    invoicerMgtKey: mgtKey,
    invoicerCEOName: bp.representative_name ?? "",
    invoicerAddr: bp.business_address ?? "",
    invoicerBizType: bp.business_type ?? "",
    invoicerBizClass: bp.business_item ?? "",
    invoicerContactName: bp.representative_name ?? "",
    invoicerEmail: bp.manager_email ?? "",

    // 공급받는자
    invoiceeType: "사업자",
    invoiceeCorpNum: onlyDigits(body.invoicee.corpNum),
    invoiceeCorpName: body.invoicee.corpName ?? "",
    invoiceeCEOName: body.invoicee.ceoName ?? "",
    invoiceeAddr: body.invoicee.addr ?? "",
    invoiceeBizType: body.invoicee.bizType ?? "",
    invoiceeBizClass: body.invoicee.bizClass ?? "",
    invoiceeContactName1: body.invoicee.ceoName ?? "",
    invoiceeEmail1: body.invoicee.email ?? "",

    supplyCostTotal: String(supplyTotal),
    taxTotal: String(taxTotal),
    totalAmount: String(totalAmount),

    detailList,
  };

  try {
    const result = await registIssue(cfg, corpNum, taxinvoice);
    return NextResponse.json({
      success: true,
      mgtKey,
      ntsConfirmNum: result.ntsConfirmNum ?? null,
      code: result.code,
      message: result.message,
    });
  } catch (err) {
    console.error("Popbill issue error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "세금계산서 발행에 실패했습니다.",
      },
      { status: 502 }
    );
  }
}
