-- ================================================================
-- 마그네이트코리아 대시보드 — 전체 스키마 (Supabase SQL Editor용)
-- 순서대로 실행: 001 → 002 → 003 → 004
-- ================================================================

-- ----------------------------------------------------------------
-- 001: 기본 테이블 (projects, tasks, estimates, contracts, tax_invoices)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','on_hold')),
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  client_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo','in_progress','done','on_hold')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  due_date DATE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired')),
  pdf_url TEXT,
  client_id UUID,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('signed','pending','expired')),
  pdf_url TEXT,
  client_id UUID,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  client_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 002: clients + meeting_notes + FK 연결
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL CHECK (char_length(company_name) <= 100),
  contact_name TEXT NOT NULL CHECK (char_length(contact_name) <= 50),
  email TEXT NOT NULL UNIQUE
    CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone TEXT,
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','potential','dormant','ended')),
  source TEXT,
  portal_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  portal_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  notes TEXT,
  first_contract_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects ADD CONSTRAINT fk_projects_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE estimates ADD CONSTRAINT fk_estimates_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE tax_invoices ADD CONSTRAINT fk_tax_invoices_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  met_at DATE NOT NULL DEFAULT CURRENT_DATE,
  attendees TEXT[] NOT NULL DEFAULT '{}'
    CHECK (array_length(attendees, 1) IS NULL OR array_length(attendees, 1) <= 20),
  method TEXT CHECK (method IN ('in_person','video','phone','email')),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_meeting_notes (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  meeting_note_id UUID NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, meeting_note_id)
);

-- ----------------------------------------------------------------
-- 003: View + 인덱스
-- ----------------------------------------------------------------

CREATE OR REPLACE VIEW clients_with_revenue AS
  SELECT c.*, COALESCE(SUM(ti.amount), 0) AS total_revenue
  FROM clients c
  LEFT JOIN tax_invoices ti ON ti.client_id = c.id
  GROUP BY c.id;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clients_search
  ON clients USING GIN (
    (company_name || ' ' || contact_name || ' ' || email) gin_trgm_ops
  );
CREATE INDEX IF NOT EXISTS idx_meeting_notes_content
  ON meeting_notes USING GIN (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_client ON meeting_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_met_at ON meeting_notes(met_at DESC);

-- ----------------------------------------------------------------
-- 004: RLS + 트리거
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON clients FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON projects FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON tasks FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON meeting_notes FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON estimates FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contracts FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON tax_invoices FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON task_meeting_notes FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "portal_select" ON clients FOR SELECT
  TO anon
  USING (
    portal_token = (
      current_setting('request.jwt.claims', true)::json ->> 'portal_token'
    )::uuid
    AND (portal_expires_at IS NULL OR portal_expires_at > now())
  );
