-- 017_add_meeting_done_status.sql
-- 리드 단계에 '미팅완료' 추가

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('신규','견적발송','미팅완료','계약','실패','보류'));
