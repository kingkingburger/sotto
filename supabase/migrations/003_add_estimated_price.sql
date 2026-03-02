-- 레시피 예상 가격 (원화) 컬럼 추가
ALTER TABLE recipes ADD COLUMN estimated_price INTEGER;

COMMENT ON COLUMN recipes.estimated_price IS '재료 기반 예상 원가 (원)';
