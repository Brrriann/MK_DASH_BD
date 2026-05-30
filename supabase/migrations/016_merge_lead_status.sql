-- 016_merge_lead_status.sql
-- 리드 상태 '연락중'을 '신규'로 통합

-- 1) 기존 '연락중' 리드를 '신규'로 이전 (CHECK 제약 변경 전에 실행)
UPDATE leads SET status = '신규' WHERE status = '연락중';

-- 2) CHECK 제약 재정의 ('연락중' 제거)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('신규','견적발송','계약','실패','보류'));
