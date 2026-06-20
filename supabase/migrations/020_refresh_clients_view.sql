-- clients_with_revenue 뷰 재생성
-- 005_business_registration.sql 이후 추가된 컬럼들이 뷰에 반영되지 않는 문제 수정
-- (PostgreSQL에서 SELECT * 뷰는 생성 시점 컬럼으로 고정됨)

DROP VIEW IF EXISTS clients_with_revenue;

CREATE VIEW clients_with_revenue AS
  SELECT c.*,
         COALESCE(SUM(ti.total_amount), 0) AS total_revenue
  FROM clients c
  LEFT JOIN tax_invoices ti ON ti.client_id = c.id
  GROUP BY c.id;
