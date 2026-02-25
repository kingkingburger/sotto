-- Concept tags enum
CREATE TYPE concept_tag AS ENUM (
  'budget',      -- 가성비
  'taste',       -- 맛위주
  'volume',      -- 무게위주
  'easy',        -- 간편함
  'nutrition'    -- 영양 밸런스
);

CREATE TYPE dish_type AS ENUM (
  'rice',        -- 밥
  'side',        -- 반찬
  'soup',        -- 국/찌개
  'one_plate',   -- 일품
  'dessert',     -- 후식
  'other'        -- 기타
);

CREATE TYPE difficulty AS ENUM (
  'easy',        -- 초급
  'medium',      -- 중급
  'hard'         -- 고급
);

CREATE TYPE ingredient_category AS ENUM (
  'vegetable', 'meat', 'seafood', 'dairy', 'grain', 'seasoning',
  'sauce', 'noodle', 'tofu', 'egg', 'oil', 'other'
);

CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  cooking_method TEXT,
  dish_type dish_type DEFAULT 'other',
  difficulty difficulty DEFAULT 'medium',
  serving_size TEXT,
  cooking_time_minutes INTEGER,
  calories NUMERIC,
  carbs NUMERIC,
  protein NUMERIC,
  fat NUMERIC,
  sodium NUMERIC,
  raw_ingredients TEXT,
  tip TEXT,
  hash_tag TEXT,
  thumbnail_url TEXT,
  main_image_url TEXT,
  concept_tags concept_tag[] DEFAULT '{}',
  source_url TEXT,
  youtube_video_id TEXT,
  youtube_search_query TEXT,
  is_lunchbox_friendly BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipe_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  image_url TEXT,
  UNIQUE(recipe_id, step_number)
);

CREATE TABLE recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount TEXT,
  category ingredient_category DEFAULT 'other',
  is_optional BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0
);

CREATE INDEX idx_recipes_concept_tags ON recipes USING GIN (concept_tags);
CREATE INDEX idx_recipes_dish_type ON recipes (dish_type);
CREATE INDEX idx_recipes_lunchbox ON recipes (is_lunchbox_friendly) WHERE is_lunchbox_friendly = true;
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps (recipe_id, step_number);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients (recipe_id);
CREATE INDEX idx_recipe_ingredients_category ON recipe_ingredients (category);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- INTENTIONAL: Only SELECT policies. No INSERT/UPDATE/DELETE policies.
-- The Supabase anon key is exposed client-side; RLS default-deny prevents writes.
CREATE POLICY "Public read recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Public read steps" ON recipe_steps FOR SELECT USING (true);
CREATE POLICY "Public read ingredients" ON recipe_ingredients FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
