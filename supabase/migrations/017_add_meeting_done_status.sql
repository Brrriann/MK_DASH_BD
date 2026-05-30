-- 017_add_meeting_done_status.sql
-- 리드 단계에 '미팅완료' 추가

-- 허용되지 않는 옛 상태(예: '연락중')를 '신규'로 정리 — 제약 위반 방지
UPDATE leads
SET status = '신규'
WHERE status NOT IN ('신규','견적발송','미팅완료','계약','실패','보류');

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('신규','견적발송','미팅완료','계약','실패','보류'));
