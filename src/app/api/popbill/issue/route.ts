/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { issueTaxInvoice } from "@/lib/popbill";

const digits = (s?: string) => (s ?? "").replace(/\D/g, "");

export async function POST(req: NextRequest) {
  // 인증
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 공급자(발행자): 발행 주체 사업자번호는 팝빌에 등록된 연동회원이어야 한다.
  // 운영에서는 POPBILL_CORP_NUM(등록 사업자) 우선, 없으면 사용자 프로필.
  const bp = session.user.user_metadata?.business_profile ?? {};
  const supplierCorpNum =
    digits(process.env.POPBILL_CORP_NUM) || digits(bp.registration_number);
  if (!supplierCorpNum) {
    return NextResponse.json(
      { error: "공급자 사업자번호가 없습니다. 설정에서 내 사업자 정보를 입력하거나 POPBILL_CORP_NUM을 설정하세요." },
      { status: 400 }
    );
  }

  const invoicee = body.invoicee ?? {};
  if (!digits(invoicee.corpNum)) {
    return NextResponse.json(
      { error: "공급받는자 사업자등록번호가 없습니다." },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "품목이 없습니다." }, { status: 400 });
  }

  const writeDate = (body.writeDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  // 문서관리번호: 공급자별로 유일해야 한다. (1~24자, 영숫자/일부특수)
  const mgtKey: string = body.mgtKey || `MK${Date.now()}`;

  const taxinvoice = {
    writeDate,
    chargeDirection: "정과금",
    issueType: "정발행",
    purposeType: body.purposeType === "영수" ? "영수" : "청구",
    taxType: "과세",

    // 공급자
    invoicerCorpNum: supplierCorpNum,
    invoicerMgtKey: mgtKey,
    invoicerCorpName: bp.organization_name ?? "",
    invoicerCEOName: bp.representative_name ?? "",
    invoicerAddr: bp.business_address ?? "",
    invoicerBizType: bp.business_type ?? "",
    invoicerBizClass: bp.business_item ?? "",
    invoicerContactName: bp.representative_name ?? "",
    invoicerEmail: bp.manager_email ?? "",

    // 공급받는자
    invoiceeType: "사업자",
    invoiceeCorpNum: digits(invoicee.corpNum),
    invoiceeCorpName: invoicee.corpName ?? "",
    invoiceeCEOName: invoicee.ceoName ?? "",
    invoiceeAddr: invoicee.addr ?? "",
    invoiceeBizType: invoicee.bizType ?? "",
    invoiceeBizClass: invoicee.bizClass ?? "",
    invoiceeEmail1: invoicee.email ?? "",

    // 합계 (팝빌은 문자열 금액)
    supplyCostTotal: String(body.supplyCostTotal ?? 0),
    taxTotal: String(body.taxTotal ?? 0),
    totalAmount: String(body.totalAmount ?? 0),

    // 품목
    detailList: body.items.map((it: any, i: number) => ({
      serialNum: i + 1,
      purchaseDT: writeDate,
      itemName: it.name ?? "",
      spec: it.spec ?? "",
      qty: String(it.qty ?? ""),
      unitCost: String(it.unitCost ?? ""),
      supplyCost: String(it.supplyCost ?? 0),
      tax: String(it.tax ?? 0),
      remark: it.remark ?? "",
    })),
  };

  try {
    const result = await issueTaxInvoice(supplierCorpNum, taxinvoice);
    return NextResponse.json({
      success: true,
      mgtKey,
      ntsConfirmNum: result?.ntsConfirmNum,
      result,
    });
  } catch (err: any) {
    // 팝빌 오류는 { code, message } 형태
    const message =
      err?.message ?? err?.error ?? "팝빌 세금계산서 발행에 실패했습니다.";
    console.error("Popbill issue error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
