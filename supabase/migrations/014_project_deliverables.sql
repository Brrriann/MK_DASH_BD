-- 014_project_deliverables.sql
-- 프로젝트 납품물/링크 관리

CREATE TABLE IF NOT EXISTS project_deliverables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_project ON project_deliverables(project_id);
