-- e-서명 기능: contracts 테이블에 서명 관련 컬럼 추가
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS signature_token            UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_token_used_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signer_name                TEXT,
  ADD COLUMN IF NOT EXISTS signer_email               TEXT,
  ADD COLUMN IF NOT EXISTS signer_ip                  TEXT,
  ADD COLUMN IF NOT EXISTS signer_user_agent          TEXT,
  ADD COLUMN IF NOT EXISTS signature_image_url        TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_url             TEXT,
  ADD COLUMN IF NOT EXISTS signed_at                  TIMESTAMPTZ;

-- 'signature_requested' 상태 추가 — CHECK constraint 교체 (필수)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('signed', 'pending', 'expired', 'signature_requested'));
