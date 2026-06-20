/* eslint-disable @typescript-eslint/no-explicit-any */
// 팝빌(Popbill) 전자세금계산서 SDK 래퍼.
//
// 필요한 환경변수:
//   POPBILL_LINK_ID      링크아이디 (LinkHub 발급)
//   POPBILL_SECRET_KEY   시크릿키 (LinkHub 발급)
//   POPBILL_CORP_NUM     발행 주체(공급자) 사업자번호 — 팝빌에 등록된 연동회원
//   POPBILL_IS_TEST      "false"면 운영(국세청 실제 전송), 그 외/미설정이면 테스트베드
//   POPBILL_USER_ID      (선택) 팝빌 회원 아이디
//
// 주의: 팝빌 SDK는 node `https`/`crypto`를 사용한다. Cloudflare Workers에서는
// nodejs_compat 플래그로 동작이 기대되나(현재 wrangler.toml에 설정됨), 테스트베드
// 키로 실제 배포 환경에서 1차 검증이 필요하다.

import popbill from "popbill";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const LinkID = process.env.POPBILL_LINK_ID;
  const SecretKey = process.env.POPBILL_SECRET_KEY;
  if (!LinkID || !SecretKey) {
    throw new Error("팝빌 API 키(POPBILL_LINK_ID / POPBILL_SECRET_KEY)가 설정되지 않았습니다.");
  }
  popbill.config({
    LinkID,
    SecretKey,
    // 기본값은 테스트베드. 운영 전환 시 POPBILL_IS_TEST=false
    IsTest: process.env.POPBILL_IS_TEST !== "false",
    IPRestrictOnOff: false,
    UseStaticIP: false,
    UseLocalTimeYN: true,
    defaultErrorHandler: () => {
      // registIssue 등 호출별 error 콜백에서 처리하므로 전역 핸들러는 비워둔다.
    },
  });
  configured = true;
}

/** 팝빌 전자세금계산서 서비스 인스턴스 */
export function getTaxinvoiceService(): any {
  ensureConfigured();
  return popbill.TaxinvoiceService();
}

/**
 * 즉시 발행(정발행). 등록과 동시에 국세청 전송 대기열에 올린다.
 * @param corpNum 공급자(발행자) 사업자번호 — 하이픈 없는 10자리
 * @param taxinvoice 팝빌 Taxinvoice 객체
 */
export function issueTaxInvoice(
  corpNum: string,
  taxinvoice: any,
  userId = process.env.POPBILL_USER_ID ?? ""
): Promise<any> {
  const service = getTaxinvoiceService();
  return new Promise((resolve, reject) => {
    service.registIssue(
      corpNum,
      taxinvoice,
      false, // writeSpecification (거래명세서 동시작성)
      false, // forceIssue (지연발행 강제)
      "", // memo
      "", // emailSubject
      "", // dealInvoiceMgtKey
      userId,
      (result: any) => resolve(result),
      (err: any) => reject(err)
    );
  });
}

/** 잔여 포인트 조회 — 연동 확인용 */
export function getBalance(corpNum: string): Promise<number> {
  const service = getTaxinvoiceService();
  return new Promise((resolve, reject) => {
    service.getBalance(
      corpNum,
      (remain: number) => resolve(remain),
      (err: any) => reject(err)
    );
  });
}
