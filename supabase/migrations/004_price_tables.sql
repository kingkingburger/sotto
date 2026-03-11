-- 재료명 → API 품목코드 매핑
CREATE TABLE ingredient_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL UNIQUE,
  kamis_item_code TEXT,         -- KAMIS 품목코드
  kamis_kind_code TEXT,         -- KAMIS 품종코드
  kamis_category_code TEXT,     -- KAMIS 카테고리 코드 (100~600)
  consumer_search_keyword TEXT, -- 참가격 검색 키워드
  standard_unit TEXT NOT NULL,  -- '100g', '1개', '100ml'
  standard_quantity NUMERIC,    -- 표준 수량
  category TEXT,                -- vegetable, meat, seasoning 등
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재료별 가격 이력
CREATE TABLE ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('kamis', 'consumer', 'naver', 'static')),
  price INTEGER NOT NULL,       -- 원 단위 (standard_unit 기준)
  unit TEXT NOT NULL,            -- '100g', '1kg', '1개'
  fetched_at DATE NOT NULL DEFAULT CURRENT_DATE,
  region TEXT DEFAULT '서울',
  grade TEXT,                    -- 상품/중품 등
  metadata JSONB,
  UNIQUE (ingredient_name, source, fetched_at)
);

CREATE INDEX idx_prices_name_date
  ON ingredient_prices (ingredient_name, fetched_at DESC);

CREATE INDEX idx_prices_fetched
  ON ingredient_prices (fetched_at);

-- RLS: anon은 SELECT만
ALTER TABLE ingredient_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_mappings" ON ingredient_mappings
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_prices" ON ingredient_prices
  FOR SELECT TO anon USING (true);

-- service_role은 전체 접근
CREATE POLICY "service_role_all_mappings" ON ingredient_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_prices" ON ingredient_prices
  FOR ALL TO service_role USING (true) WITH CHECK (true);
