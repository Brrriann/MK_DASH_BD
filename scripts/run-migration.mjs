// 010_crm.sql 마이그레이션 실행 스크립트
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local 수동 파싱
const env = {};
try {
  const envContent = readFileSync(join(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) env[key.trim()] = vals.join("=").trim();
  }
} catch (e) {
  console.error(".env.local 읽기 실패:", e.message);
  process.exit(1);
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("환경변수 누락:", { SUPABASE_URL, SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY });
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// leads 테이블 존재 확인
const { error: checkError } = await supabase.from("leads").select("id").limit(1);

if (!checkError) {
  console.log("✅ leads 테이블 이미 존재합니다. 마이그레이션 불필요.");
  process.exit(0);
}

if (checkError.code !== "42P01") {
  // 42P01 = undefined_table
  console.log("leads 테이블 확인 중 오류 (정상적으로 없는 경우):", checkError.code, checkError.message);
}

console.log("leads 테이블 없음 → 마이그레이션 실행...\n");

// 각 SQL 문을 개별 RPC 또는 REST로 실행
// Supabase는 일반 REST API로 DDL 실행 불가 → Management API 사용
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
console.log("프로젝트 Ref:", projectRef);

const sqlStatements = `
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

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_occurred ON interactions(occurred_at DESC);

CREATE OR REPLACE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads' AND policyname='service_role_leads') THEN
    CREATE POLICY "service_role_leads" ON leads FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='interactions' AND policyname='service_role_interactions') THEN
    CREATE POLICY "service_role_interactions" ON interactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

// Supabase Management API로 SQL 실행
// 이 API는 service_role JWT가 아닌 management token이 필요함
// → 대신 직접 PostgreSQL REST endpoint 사용

console.log("\n📋 실행할 SQL:\n");
console.log(sqlStatements);
console.log("\n⚠️  Supabase REST API는 DDL 직접 실행 불가.");
console.log("아래 SQL을 Supabase 대시보드 SQL Editor에 직접 붙여넣어 실행해주세요:");
console.log("\nhttps://supabase.com/dashboard/project/" + projectRef + "/sql/new\n");
