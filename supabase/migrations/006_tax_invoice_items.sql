-- 006_tax_invoice_items.sql
-- 세금계산서 품목(items) 및 금액 필드 추가

ALTER TABLE tax_invoices
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS supply_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS memo TEXT,
  ADD COLUMN IF NOT EXISTS bolta_issuance_key TEXT;
-- pdf_url 컬럼 유지 (DROP 위험), 사용만 중단
-- amount 컬럼 유지 (하위호환)
