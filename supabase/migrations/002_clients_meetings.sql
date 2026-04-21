-- 002_clients_meetings.sql
-- clients 테이블 생성 + 001의 테이블에 FK 연결 + meeting_notes

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

-- FK 연결
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

-- 미팅노트
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

-- 태스크-미팅노트 조인
CREATE TABLE IF NOT EXISTS task_meeting_notes (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  meeting_note_id UUID NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, meeting_note_id)
);
