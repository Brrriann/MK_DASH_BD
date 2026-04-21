-- 004_rls_triggers.sql
-- RLS 활성화 + updated_at 트리거 + 정책

-- updated_at 트리거 함수
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

-- RLS 활성화
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_meeting_notes ENABLE ROW LEVEL SECURITY;

-- 단독 사용자(Brian): 로그인 = 전체 접근
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

-- 클라이언트 포털: portal_token 기반 SELECT (anon)
CREATE POLICY "portal_select" ON clients FOR SELECT
  TO anon
  USING (
    portal_token = (
      current_setting('request.jwt.claims', true)::json ->> 'portal_token'
    )::uuid
    AND (portal_expires_at IS NULL OR portal_expires_at > now())
  );
