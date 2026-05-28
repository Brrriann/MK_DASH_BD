-- leads 테이블 (CRM 리드 관리)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  source TEXT NOT NULL DEFAULT '기타' CHECK (source IN ('숨고','크몽','위시캣','라우드소싱','Fiverr','직접문의','기타')),
  status TEXT NOT NULL DEFAULT '신규' CHECK (status IN ('신규','연락중','견적발송','계약','실패','보류')),
  service_interest TEXT,
  budget_estimate NUMERIC,
  notes TEXT,
  follow_up_at DATE,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- interactions 테이블 (소통 기록 - meeting_notes 대체)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call','kakao','email','meeting','memo')),
  summary TEXT NOT NULL,
  content TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  follow_up_at DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_occurred ON interactions(occurred_at DESC);

-- updated_at 트리거 (leads)
CREATE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_interactions" ON interactions FOR ALL USING (true) WITH CHECK (true);
