import './lib/load-env';
import { createClient } from '@supabase/supabase-js';
// parseIngredients is a src/ module — tsx handles the path alias via tsconfig
import { parseIngredients } from '../src/lib/parse-ingredients';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}
if (!YOUTUBE_API_KEY) {
  console.error('Missing YOUTUBE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Constants ─────────────────────────────────────────────────────────
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

const DEFAULT_KEYWORDS = [
  '도시락 반찬 레시피',
  '직장인 도시락 만들기',
  '간단 도시락 메뉴',
  '일주일 도시락 준비',
  '도시락 밑반찬',
  '한끼 도시락',
  '건강 도시락 레시피',
  '다이어트 도시락',
  '냉장 보관 반찬',
  '15분 반찬 레시피',
];

const BLOCKED_TITLE_RE =
  /추천|BEST|리뷰|하울|언박싱|꿀팁|브이로그|먹방|ASMR|vlog|mukbang/i;

// ─── CLI Args ──────────────────────────────────────────────────────────
interface CliOptions {
  dryRun: boolean;
  limit: number;
  query: string | null;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { dryRun: false, limit: 50, query: null };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--query=')) {
      options.query = arg.split('=').slice(1).join('=');
    }
  }

  return options;
}

// ─── YouTube API ───────────────────────────────────────────────────────
interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  thumbnailHighRes: string | null;
  channelTitle: string;
}

async function searchVideos(
  query: string,
  maxResults: number,
): Promise<string[]> {
  const url = new URL(`${YOUTUBE_API_BASE}/search`);
  url.searchParams.set('part', 'id');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('relevanceLanguage', 'ko');
  url.searchParams.set('regionCode', 'KR');
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error(`YouTube API quota exceeded or forbidden: ${text}`);
    }
    throw new Error(`YouTube search failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return (json.items ?? [])
    .map((item: { id?: { videoId?: string } }) => item.id?.videoId)
    .filter(Boolean) as string[];
}

async function fetchVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
  if (videoIds.length === 0) return [];

  const results: YouTubeVideo[] = [];

  // YouTube API allows max 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL(`${YOUTUBE_API_BASE}/videos`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(
        `  videos.list failed (${res.status}): ${await res.text()}`,
      );
      continue;
    }

    const json = await res.json();
    for (const item of json.items ?? []) {
      const s = item.snippet;
      results.push({
        id: item.id,
        title: s.title ?? '',
        description: s.description ?? '',
        thumbnailUrl:
          s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url ?? null,
        thumbnailHighRes: s.thumbnails?.maxres?.url ?? null,
        channelTitle: s.channelTitle ?? '',
      });
    }
  }

  return results;
}

// ─── Description Parsing ───────────────────────────────────────────────
const INGREDIENT_HEADER_RE =
  /(?:^|\n)\s*(?:[■●▶★▣◆◇※#\-=~]+\s*)?[\[<「『【]?\s*(?:재료|준비물|필요한\s*재료|준비할\s*재료)\s*[\]>」』】]?\s*(?:[■●▶★▣◆◇※#\-=~]+)?\s*:?\s*(?:\n|$)/;

const STEP_HEADER_RE =
  /(?:^|\n)\s*(?:[■●▶★▣◆◇※#\-=~]+\s*)?[\[<「『【]?\s*(?:만드는\s*(?:법|방법)|조리\s*(?:순서|방법)|요리\s*(?:순서|방법)|레시피|만들기)\s*[\]>」』】]?\s*(?:[■●▶★▣◆◇※#\-=~]+)?\s*:?\s*(?:\n|$)/;

const SECTION_BOUNDARY_RE =
  /(?:^|\n)\s*(?:[■●▶★▣◆◇※#\-=~]+\s*)?[\[<「『【]?\s*(?:재료|만드는|조리|요리|레시피|만들기|TIP|팁|참고|영양|칼로리|소스|양념|부재료|주재료|준비물)/;

interface ParsedDescription {
  ingredients: string[];
  steps: string[];
}

function extractSection(text: string, headerRe: RegExp): string | null {
  const match = headerRe.exec(text);
  if (!match) return null;

  const start = match.index + match[0].length;
  const rest = text.slice(start);

  // Find next section header
  const nextSection = SECTION_BOUNDARY_RE.exec(rest);
  const end = nextSection ? nextSection.index : rest.length;

  return rest.slice(0, end).trim();
}

function parseDescription(description: string): ParsedDescription {
  const ingredients: string[] = [];
  const steps: string[] = [];

  // Extract ingredient section
  const ingSection = extractSection(description, INGREDIENT_HEADER_RE);
  if (ingSection) {
    for (const rawLine of ingSection.split('\n')) {
      let line = rawLine.trim();
      if (!line) continue;

      // Skip non-ingredient lines (URLs, social media, promotions)
      if (
        /^(https?:|www\.|@|#|구독|좋아요|채널|팔로우|영상|문의|협찬|인스타|비즈니스)/i.test(
          line,
        )
      )
        continue;
      if (line.length > 80) continue;

      // Remove leading bullets/markers
      line = line.replace(/^[\-·•※▶●■▣◆◇★\d.)]+\s*/, '');
      if (!line) continue;

      // Must contain Korean characters to be a valid ingredient
      if (/[가-힣]/.test(line) && line.length <= 50) {
        ingredients.push(line);
      }
    }
  }

  // Extract step section
  const stepSection = extractSection(description, STEP_HEADER_RE);
  if (stepSection) {
    for (const rawLine of stepSection.split('\n')) {
      let line = rawLine.trim();
      if (!line) continue;

      // Remove step numbering (1., 1), ①, step 1, etc.)
      line = line.replace(
        /^(?:\d+[.):\-]\s*|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]\s*|step\s*\d+[.:)]\s*)/i,
        '',
      );
      if (!line) continue;

      // Skip non-step content
      if (/^(https?:|www\.|@|#|구독|좋아요)/i.test(line)) continue;
      if (line.length < 5) continue;

      steps.push(line);
    }
  }

  return { ingredients, steps };
}

// ─── normalizeForPipeline ──────────────────────────────────────────────
const UNIT_NORMALIZATION: Record<string, string> = {
  tablespoon: '큰술',
  tbsp: '큰술',
  Tbsp: '큰술',
  T: '큰술',
  teaspoon: '작은술',
  tsp: '작은술',
  ts: '작은술',
  그램: 'g',
  킬로그램: 'kg',
  밀리리터: 'ml',
  리터: 'l',
  숟가락: '큰술',
  스푼: '큰술',
  티스푼: '작은술',
  cc: 'ml',
};

// Amount-first pattern: "2T 간장", "100g 돼지고기", "1/2개 양파"
const AMOUNT_FIRST_RE =
  /^(\d+(?:\/\d+)?(?:\.\d+)?\s*(?:g|kg|ml|l|T|t|큰술|작은술|개|컵|줌|장|마리|덩이|조각|봉|팩|통|약간|적당량|조금|반)?)\s+([가-힣].+)$/i;

function normalizeForPipeline(ingredients: string[]): string {
  return ingredients
    .map((raw) => {
      let line = raw.trim();

      // a. Strip leading hyphens/bullets
      line = line.replace(/^[\-·•※▶●■▣◆◇★]+\s*/, '');

      // b. Reorder amount-first patterns: "2T 간장" -> "간장 2T"
      const amountFirstMatch = line.match(AMOUNT_FIRST_RE);
      if (amountFirstMatch) {
        line = `${amountFirstMatch[2]} ${amountFirstMatch[1]}`;
      }

      // c. Normalize unit names
      for (const [from, to] of Object.entries(UNIT_NORMALIZATION)) {
        // Word boundary-safe replacement for unit names
        const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?<=\\d\\s*)${escaped}(?=\\s|$)`, 'gi');
        line = line.replace(re, to);
      }

      return line.trim();
    })
    .filter(Boolean)
    .join(', ');
}

// ─── Title Cleaning ────────────────────────────────────────────────────
function cleanTitle(title: string, channelTitle: string): string {
  let name = title;

  // Remove common YouTube title patterns
  name = name.replace(/\s*[|\-/]\s*[^|/\-]*$/, ''); // "레시피 | 채널명"
  name = name.replace(/\[.*?\]/g, ''); // [sub] [4K]
  name = name.replace(/【.*?】/g, '');
  name = name.replace(
    /\(.*?(?:sub|eng|자막|4k|hd|레시피|recipe)\)/gi,
    '',
  );

  // Remove channel name from title
  if (channelTitle && name.includes(channelTitle)) {
    name = name.replace(channelTitle, '');
  }

  // Remove trailing recipe-related suffixes
  name = name.replace(
    /\s*(?:레시피|만들기|만드는\s*법|recipe|요리|모음)\s*$/i,
    '',
  );

  // Clean up emoji and special chars
  name = name
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}!?~♡♥✨🔥🎉💕💛❤️]+/gu,
      '',
    )
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-|/]+|[\s\-|/]+$/g, '');

  return name || title.slice(0, 50).trim();
}

// ─── Dish Type Classification ──────────────────────────────────────────
type DishTypeValue =
  | 'rice'
  | 'side'
  | 'soup'
  | 'one_plate'
  | 'dessert'
  | 'other';

function inferDishType(name: string, ingredients: string[]): DishTypeValue {
  const text = `${name} ${ingredients.join(' ')}`.toLowerCase();

  if (/볶음밥|비빔밥|김밥|주먹밥|덮밥|유부초밥|오므라이스|리조또/.test(text))
    return 'rice';
  if (/국|찌개|탕|전골|수프|스프/.test(text)) return 'soup';
  if (/파스타|라면|우동|냉면|쫄면|잡채|샌드위치|토스트|햄버거|카레/.test(text))
    return 'one_plate';
  if (/떡|케이크|쿠키|디저트|과자|마카롱|빵|타르트/.test(text))
    return 'dessert';
  if (
    /반찬|볶음|나물|무침|조림|전|튀김|구이|찜|장아찌|김치|샐러드|계란말이/.test(
      text,
    )
  )
    return 'side';

  // Default: side (most lunchbox recipes are side dishes)
  return 'side';
}

// ─── Quality Filter ────────────────────────────────────────────────────
interface FilterStats {
  descriptionTooShort: number;
  titleBlocked: number;
  tooFewIngredients: number;
  noSteps: number;
  duplicateExternal: number;
  duplicateName: number;
}

function isLunchboxFriendly(name: string): boolean {
  const nonLunchbox = ['음료', '주스', '스무디', '차', '라떼', '에이드'];
  return !nonLunchbox.some((kw) => name.includes(kw));
}

// ─── Deduplication ─────────────────────────────────────────────────────
function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();
}

async function getExistingExternalIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('recipes')
    .select('external_id')
    .like('external_id', 'yt:%');

  if (error) {
    console.error('Failed to fetch existing external_ids:', error.message);
    return new Set();
  }

  return new Set(
    (data ?? []).map((r: { external_id: string }) => r.external_id),
  );
}

async function getExistingNames(): Promise<Set<string>> {
  const { data, error } = await supabase.from('recipes').select('name');
  if (error) {
    console.error('Failed to fetch existing names:', error.message);
    return new Set();
  }

  return new Set(
    (data ?? []).map((r: { name: string }) => normalizeName(r.name)),
  );
}

// ─── Dry-run Stats ─────────────────────────────────────────────────────
interface ParsedRecipe {
  videoId: string;
  name: string;
  rawIngredients: string; // normalizeForPipeline output
  ingredients: string[];
  steps: string[];
  thumbnailUrl: string | null;
  thumbnailHighRes: string | null;
  dishType: DishTypeValue;
}

function printDryRunStats(
  recipes: ParsedRecipe[],
  filterStats: FilterStats,
  totalSearched: number,
): void {
  console.log('\n=== YouTube Recipe Seeding - Dry Run Report ===\n');
  console.log(`[Search] Total videos found: ${totalSearched}`);
  console.log(
    `[Filter] Description < 100 chars: ${filterStats.descriptionTooShort} skipped`,
  );
  console.log(
    `[Filter] Title blocked pattern: ${filterStats.titleBlocked} skipped`,
  );
  console.log(
    `[Filter] Ingredients < 2: ${filterStats.tooFewIngredients} skipped`,
  );
  console.log(`[Filter] Steps = 0: ${filterStats.noSteps} skipped`);
  console.log(
    `[Filter] Duplicate (external_id): ${filterStats.duplicateExternal} skipped`,
  );
  console.log(
    `[Filter] Duplicate (name): ${filterStats.duplicateName} skipped`,
  );
  console.log(`[Parse]  Successfully parsed: ${recipes.length}`);

  // parseIngredients() compatibility stats
  // "Parsed successfully" = parseIngredients(normalizedText).length >= 2
  let parsedOk = 0;
  let totalIngCount = 0;
  const categoryCounts: Record<string, number> = {};

  for (const recipe of recipes) {
    const parsed = parseIngredients(recipe.rawIngredients);
    if (parsed.length >= 2) {
      parsedOk++;
      totalIngCount += parsed.length;
      for (const ing of parsed) {
        categoryCounts[ing.category] = (categoryCounts[ing.category] ?? 0) + 1;
      }
    }
  }

  const parseRate =
    recipes.length > 0 ? ((parsedOk / recipes.length) * 100).toFixed(1) : '0';
  const avgIng = parsedOk > 0 ? (totalIngCount / parsedOk).toFixed(1) : '0';

  console.log('\n--- parseIngredients() Compatibility Stats ---');
  console.log(
    `Total parsed recipes:    ${recipes.length}`,
  );
  console.log(
    `Parsed successfully:     ${parsedOk} (${parseRate}%)`,
  );
  console.log(
    `  (criterion: parseIngredients(normalizedText).length >= 2)`,
  );
  console.log(`Avg ingredients/recipe:  ${avgIng}`);

  if (Object.keys(categoryCounts).length > 0) {
    const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
    console.log('Category distribution:');
    const sorted = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);
    for (const [cat, count] of sorted) {
      console.log(`  ${cat.padEnd(12)} ${((count / total) * 100).toFixed(1)}%`);
    }
  }

  const rateNum = parseFloat(parseRate);
  if (rateNum >= 30) {
    console.log(`\n[STATUS] OK - Parse rate ${parseRate}% exceeds 30% threshold.`);
    console.log('=> Ready to run without --dry-run for actual seeding.');
  } else {
    console.log(`\n[WARNING] Parse rate ${parseRate}% is BELOW 30% threshold.`);
    console.log(
      '=> YouTube description parsing is insufficient for this keyword set.',
    );
    console.log(
      '=> RECOMMENDATION: Switch to Option B (공공데이터포털 레시피 API) for structured data.',
    );
  }

  // Sample recipes
  console.log('\n--- Sample Recipes (first 10) ---');
  for (const r of recipes.slice(0, 10)) {
    console.log(
      `  - ${r.name} [${r.dishType}] (${r.ingredients.length} ingredients, ${r.steps.length} steps)`,
    );
  }
  if (recipes.length > 10)
    console.log(`  ... and ${recipes.length - 10} more`);
}

// ─── Supabase Upsert ───────────────────────────────────────────────────
async function upsertRecipe(recipe: ParsedRecipe): Promise<boolean> {
  const recipeRow = {
    external_id: `yt:${recipe.videoId}`,
    name: recipe.name,
    cooking_method: null,
    dish_type: recipe.dishType,
    difficulty: 'medium' as const,
    calories: null,
    carbs: null,
    protein: null,
    fat: null,
    sodium: null,
    raw_ingredients: recipe.rawIngredients,
    tip: null,
    hash_tag: null,
    thumbnail_url: recipe.thumbnailUrl,
    main_image_url: recipe.thumbnailHighRes,
    source_url: `https://www.youtube.com/watch?v=${recipe.videoId}`,
    youtube_video_id: recipe.videoId,
    is_lunchbox_friendly: isLunchboxFriendly(recipe.name),
    concept_tags: [] as string[],
  };

  const { data: upserted, error: recipeError } = await supabase
    .from('recipes')
    .upsert(recipeRow, { onConflict: 'external_id' })
    .select('id')
    .single();

  if (recipeError || !upserted) {
    console.error(
      `  Failed to upsert "${recipe.name}":`,
      recipeError?.message,
    );
    return false;
  }

  const recipeId = upserted.id as string;

  // Insert steps (delete first for idempotency)
  if (recipe.steps.length > 0) {
    await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId);
    const stepRows = recipe.steps.map((instruction, idx) => ({
      recipe_id: recipeId,
      step_number: idx + 1,
      instruction,
      image_url: null,
    }));
    const { error: stepsError } = await supabase
      .from('recipe_steps')
      .insert(stepRows);
    if (stepsError) {
      console.error(
        `  Failed to insert steps for "${recipe.name}":`,
        stepsError.message,
      );
    }
  }

  return true;
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const options = parseCliArgs();

  console.log('=== YouTube Recipe Seeder ===');
  if (options.dryRun) console.log('  Mode: DRY RUN (no DB writes)');
  console.log(`  Limit per keyword: ${options.limit}`);
  if (options.query) console.log(`  Custom query: "${options.query}"`);

  const keywords = options.query ? [options.query] : DEFAULT_KEYWORDS;

  // Step 1: Search YouTube
  console.log(`\n1. Searching YouTube (${keywords.length} keywords)...`);
  const allVideoIds = new Set<string>();

  for (const keyword of keywords) {
    try {
      const ids = await searchVideos(keyword, options.limit);
      for (const id of ids) allVideoIds.add(id);
      console.log(
        `  "${keyword}" -> ${ids.length} videos (unique total: ${allVideoIds.size})`,
      );
    } catch (err) {
      console.error(`  "${keyword}" FAILED:`, (err as Error).message);
      if ((err as Error).message.includes('quota')) {
        console.error('  Stopping due to quota limit.');
        break;
      }
    }
  }

  const totalSearched = allVideoIds.size;
  console.log(`  Total unique videos: ${totalSearched}`);

  if (totalSearched === 0) {
    console.log('\nNo videos found. Exiting.');
    return;
  }

  // Step 2: Fetch video details
  console.log('\n2. Fetching video details...');
  const videos = await fetchVideoDetails([...allVideoIds]);
  console.log(`  Got details for ${videos.length} videos`);

  // Step 3: Parse & filter
  console.log('\n3. Parsing descriptions & applying quality filters...');

  const filterStats: FilterStats = {
    descriptionTooShort: 0,
    titleBlocked: 0,
    tooFewIngredients: 0,
    noSteps: 0,
    duplicateExternal: 0,
    duplicateName: 0,
  };

  const existingIds = await getExistingExternalIds();
  const existingNames = await getExistingNames();
  const parsedRecipes: ParsedRecipe[] = [];

  for (const video of videos) {
    // Filter: description too short
    if (video.description.length < 100) {
      filterStats.descriptionTooShort++;
      continue;
    }

    // Filter: blocked title pattern
    if (BLOCKED_TITLE_RE.test(video.title)) {
      filterStats.titleBlocked++;
      continue;
    }

    // Filter: duplicate external_id
    const extId = `yt:${video.id}`;
    if (existingIds.has(extId)) {
      filterStats.duplicateExternal++;
      continue;
    }

    // Parse description
    const { ingredients, steps } = parseDescription(video.description);

    // Filter: too few ingredients
    if (ingredients.length < 2) {
      filterStats.tooFewIngredients++;
      continue;
    }

    // Filter: no cooking steps
    if (steps.length === 0) {
      filterStats.noSteps++;
      continue;
    }

    // Clean title & check name duplicate
    const name = cleanTitle(video.title, video.channelTitle);
    if (existingNames.has(normalizeName(name))) {
      filterStats.duplicateName++;
      continue;
    }

    // Normalize ingredients for pipeline compatibility
    const rawIngredients = normalizeForPipeline(ingredients);
    const dishType = inferDishType(name, ingredients);

    parsedRecipes.push({
      videoId: video.id,
      name,
      rawIngredients,
      ingredients,
      steps,
      thumbnailUrl: video.thumbnailUrl,
      thumbnailHighRes: video.thumbnailHighRes,
      dishType,
    });

    // Track name to avoid intra-batch duplicates
    existingNames.add(normalizeName(name));
  }

  console.log(`  Parsed: ${parsedRecipes.length} recipes`);

  // Step 4: Dry-run report or actual upsert
  if (options.dryRun) {
    printDryRunStats(parsedRecipes, filterStats, totalSearched);
    return;
  }

  console.log(`\n4. Upserting ${parsedRecipes.length} recipes to Supabase...`);
  let seeded = 0;

  for (const recipe of parsedRecipes) {
    const ok = await upsertRecipe(recipe);
    if (ok) seeded++;

    if (seeded > 0 && (seeded % 20 === 0 || seeded === parsedRecipes.length)) {
      console.log(`  Seeded ${seeded}/${parsedRecipes.length} recipes`);
    }
  }

  // Final report
  console.log('\n=== Final Report ===');
  console.log(`Total videos searched:   ${totalSearched}`);
  console.log(`Description < 100 chars: ${filterStats.descriptionTooShort} skipped`);
  console.log(`Title blocked:           ${filterStats.titleBlocked} skipped`);
  console.log(`Ingredients < 2:         ${filterStats.tooFewIngredients} skipped`);
  console.log(`Steps = 0:               ${filterStats.noSteps} skipped`);
  console.log(`Duplicate (external_id): ${filterStats.duplicateExternal} skipped`);
  console.log(`Duplicate (name):        ${filterStats.duplicateName} skipped`);
  console.log(`Successfully seeded:     ${seeded}`);

  console.log('\nNext steps:');
  console.log('  bun run classify-tags');
  console.log('  bun run parse-ingredients');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
