-- 003_views_indexes.sql
-- clients_with_revenue view + 검색/성능 인덱스

CREATE OR REPLACE VIEW clients_with_revenue AS
  SELECT c.*, COALESCE(SUM(ti.amount), 0) AS total_revenue
  FROM clients c
  LEFT JOIN tax_invoices ti ON ti.client_id = c.id
  GROUP BY c.id;

-- 전문 검색 인덱스 (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clients_search
  ON clients USING GIN (
    (company_name || ' ' || contact_name || ' ' || email) gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_meeting_notes_content
  ON meeting_notes USING GIN (content gin_trgm_ops);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_client ON meeting_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_met_at ON meeting_notes(met_at DESC);
