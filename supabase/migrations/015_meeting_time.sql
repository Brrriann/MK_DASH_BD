-- 015_meeting_time.sql
-- 미팅에 시간 정보 추가 (nullable, 기존 노트 호환)

ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS met_time TIME;
