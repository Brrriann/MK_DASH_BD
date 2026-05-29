/**
 * 포트원(아임포트) 휴대폰 본인인증 모듈
 *
 * 현재 상태: 비활성화 (NEXT_PUBLIC_PHONE_VERIFY_ENABLED=false)
 * 활성화 방법:
 *   1. 포트원 계정 가입 (https://portone.io) — 월 5만원 기본
 *   2. .env.local에 추가:
 *        NEXT_PUBLIC_PHONE_VERIFY_ENABLED=true
 *        NEXT_PUBLIC_PORTONE_IMP_CODE=imp00000000  (포트원 가맹점 식별코드)
 *   3. TODO 섹션 구현 완료
 */

export const PHONE_VERIFY_ENABLED =
  process.env.NEXT_PUBLIC_PHONE_VERIFY_ENABLED === "true";

export type PhoneVerifyResult =
  | { success: true; name: string; phone: string }
  | { success: false; errorMsg: string };

/**
 * 휴대폰 본인인증 실행.
 *
 * PHONE_VERIFY_ENABLED=false (기본):
 *   입력된 name/phone을 그대로 반환. 실제 검증 없음.
 *
 * PHONE_VERIFY_ENABLED=true (포트원 연동 후):
 *   window.IMP.certification() 팝업을 띄워 통신사 본인인증 수행.
 *   성공 시 통신사에서 반환된 실명/번호를 반환.
 */
export async function launchPhoneVerify(
  name: string,
  phone: string
): Promise<PhoneVerifyResult> {
  if (!PHONE_VERIFY_ENABLED) {
    // 비활성화 상태: 입력값 그대로 통과
    return { success: true, name, phone };
  }

  // TODO: 포트원 IMP.certification() 연동
  //
  // const impCode = process.env.NEXT_PUBLIC_PORTONE_IMP_CODE;
  //
  // // 스크립트 로드 보장
  // await loadIamportScript();
  // window.IMP.init(impCode);
  //
  // return new Promise((resolve) => {
  //   window.IMP.certification(
  //     {
  //       merchant_uid: `cert_${Date.now()}`,
  //       name,
  //       phone,
  //       popup: true,
  //     },
  //     (rsp: { success: boolean; name: string; phone: string; error_msg?: string }) => {
  //       if (rsp.success) {
  //         resolve({ success: true, name: rsp.name, phone: rsp.phone });
  //       } else {
  //         resolve({ success: false, errorMsg: rsp.error_msg ?? "본인인증에 실패했습니다." });
  //       }
  //     }
  //   );
  // });

  return { success: false, errorMsg: "포트원 연동이 완료되지 않았습니다." };
}
