-- 레거시 세금계산서 매출 백필
-- 020에서 clients_with_revenue 뷰가 SUM(total_amount)로 바뀌었으나,
-- 006 이전(또는 total_amount를 채우지 않은 경로)에 생성된 행은 total_amount=0,
-- 실제 금액은 legacy `amount` 컬럼에 남아 있어 매출이 0으로 집계되는 문제 수정.

UPDATE tax_invoices
SET total_amount = amount
WHERE total_amount = 0
  AND amount > 0;
