-- 계약 서명 시 수집되는 서명자 휴대폰 번호 컬럼 추가
-- 포트원(아임포트) 휴대폰 본인인증 도입 시 검증된 번호 저장 목적

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS signer_phone TEXT;

COMMENT ON COLUMN contracts.signer_phone IS
  '서명자 휴대폰 번호. NEXT_PUBLIC_PHONE_VERIFY_ENABLED=true 시 포트원 본인인증으로 검증된 번호가 저장됩니다.';
