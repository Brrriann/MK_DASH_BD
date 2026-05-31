-- 018_meeting_lead_link.sql
-- 미팅을 리드에도 연결할 수 있도록 lead_id 추가
-- client_id 또는 lead_id 중 하나에 속함 (둘 다 nullable)

ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_meeting_notes_lead ON meeting_notes(lead_id);
