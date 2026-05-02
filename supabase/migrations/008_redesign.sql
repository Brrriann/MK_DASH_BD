-- 008_redesign.sql
-- 프로젝트: 8단계 파이프라인 + 서비스유형 + 입금추적 + 마감일 + 유입채널
DO $$ BEGIN
  CREATE TYPE pipeline_stage AS ENUM (
    '상담', '견적', '계약', '계산서발행', '계약입금', '착수', '납품', '완납'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_type AS ENUM (
    '명함', '로고', '웹사이트', '쇼핑몰', '앱', '광고소재', 'SNS관리', '영상편집', '기타'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_channel AS ENUM (
    '숨고', '크몽', '위시캣', '라우드소싱', 'Fiverr', '직접문의', '재구매', '기타'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pipeline_stage pipeline_stage NOT NULL DEFAULT '상담',
  ADD COLUMN IF NOT EXISTS service_type service_type,
  ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS deposit_ratio INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_paid_at DATE,
  ADD COLUMN IF NOT EXISTS final_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_paid_at DATE,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS source_channel source_channel;

-- 견적서: 품목 목록 + VAT + 할인 + 프로젝트 연결
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS include_vat BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_ratio INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 계약서: 입금추적 + 계약내용 + 프로젝트 연결
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_paid_at DATE,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC(15,0),
  ADD COLUMN IF NOT EXISTS final_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_paid_at DATE,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 세금계산서: 입금추적 + 프로젝트 연결
ALTER TABLE tax_invoices
  ADD COLUMN IF NOT EXISTS payment_received BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_received_at DATE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
