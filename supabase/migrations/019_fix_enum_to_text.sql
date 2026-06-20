-- 019_fix_enum_to_text.sql
-- service_type, pipeline_stage, source_channel 열거형을 TEXT로 변환
-- (열거형 값과 코드값 불일치 해결)

-- projects.service_type: enum → TEXT
ALTER TABLE projects
  ALTER COLUMN service_type TYPE TEXT USING service_type::TEXT;

-- projects.pipeline_stage: enum → TEXT
ALTER TABLE projects
  ALTER COLUMN pipeline_stage TYPE TEXT USING pipeline_stage::TEXT;

-- projects.source_channel: enum → TEXT
ALTER TABLE projects
  ALTER COLUMN source_channel TYPE TEXT USING source_channel::TEXT;

-- 기존 열거형 타입 제거 (의존성 없으면)
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS pipeline_stage CASCADE;
DROP TYPE IF EXISTS source_channel CASCADE;
