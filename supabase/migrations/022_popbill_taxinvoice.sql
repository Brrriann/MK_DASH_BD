-- 022_popbill_taxinvoice.sql
-- 세금계산서 발행 연동 교체: Bolta → 팝빌(Popbill)
-- ⚠️ Supabase SQL Editor에서 수동 실행 필요

-- 팝빌 문서관리번호 + 국세청 승인번호 컬럼 추가
alter table tax_invoices
  add column if not exists popbill_mgt_key text,
  add column if not exists nts_confirm_num text;

-- 기존 Bolta 발행키 컬럼 제거 (Bolta 연동 폐기)
alter table tax_invoices
  drop column if exists bolta_issuance_key;
