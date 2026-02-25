import type { IngredientCategory } from '@/types/recipe';

export interface ParsedIngredient {
  name: string;
  amount: string | null;
  category: IngredientCategory;
  isOptional: boolean;
  displayOrder: number;
}

const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  meat: [
    '돼지고기', '소고기', '닭고기', '닭', '쇠고기', '목살', '삼겹살',
    '갈비', '안심', '등심', '다짐육', '베이컨', '햄', '소시지',
  ],
  seafood: [
    '새우', '오징어', '조개', '전복', '멸치', '참치', '연어',
    '꽃게', '굴', '홍합', '해물',
  ],
  vegetable: [
    '양파', '당근', '감자', '배추', '시금치', '브로콜리', '파프리카',
    '호박', '버섯', '콩나물', '깻잎', '상추', '고추', '마늘', '생강',
    '대파', '쪽파', '무', '미나리', '셀러리', '가지', '토마토', '오이', '고구마',
  ],
  seasoning: [
    '간장', '소금', '설탕', '후추', '고추장', '된장', '참기름',
    '들기름', '맛술', '미림', '식초', '올리고당', '다진마늘', '고춧가루', '깨', '참깨',
  ],
  sauce: [
    '케첩', '마요네즈', '굴소스', '돈까스소스', '칠리소스', '우스터소스', '스리라차',
  ],
  grain: ['쌀', '밥', '찹쌀', '현미', '보리'],
  noodle: ['국수', '라면', '스파게티', '파스타', '소면', '당면', '우동'],
  egg: ['달걀', '계란', '메추리알'],
  dairy: ['우유', '치즈', '버터', '생크림', '크림치즈', '요거트'],
  tofu: ['두부', '콩', '유부'],
  oil: ['식용유', '올리브유', '포도씨유', '카놀라유'],
  other: [],
};

// Build a flat lookup: keyword -> category (longer keywords take precedence)
const KEYWORD_TO_CATEGORY: Array<{ keyword: string; category: IngredientCategory }> = [];
for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
  IngredientCategory,
  string[],
][]) {
  for (const keyword of keywords) {
    KEYWORD_TO_CATEGORY.push({ keyword, category });
  }
}
// Sort descending by keyword length so longer matches win
KEYWORD_TO_CATEGORY.sort((a, b) => b.keyword.length - a.keyword.length);

function guessCategory(name: string): IngredientCategory {
  const lower = name.toLowerCase();
  for (const { keyword, category } of KEYWORD_TO_CATEGORY) {
    if (lower.includes(keyword)) {
      return category;
    }
  }
  return 'other';
}

const OPTIONAL_MARKERS = ['(선택)', '선택', '생략가능', '(생략가능)', '취향껏', '기호에 따라'];

function isOptionalIngredient(raw: string): boolean {
  return OPTIONAL_MARKERS.some((m) => raw.includes(m));
}

/**
 * Extract name and amount from a raw ingredient chunk.
 * Typical Korean format: "이름 200g" or "이름(200g)" or "이름 : 200g"
 */
function extractNameAndAmount(chunk: string): { name: string; amount: string | null } {
  const trimmed = chunk.trim();

  // Remove optional markers for cleaner name extraction
  let cleaned = trimmed;
  for (const marker of OPTIONAL_MARKERS) {
    cleaned = cleaned.replace(marker, '').trim();
  }

  // Format: "이름(양) " e.g. "돼지고기(200g)"
  const parenMatch = cleaned.match(/^([^(]+)\(([^)]+)\)(.*)$/);
  if (parenMatch) {
    const name = parenMatch[1].trim();
    const amount = parenMatch[2].trim();
    return { name, amount: amount || null };
  }

  // Format: "이름 : 양" or "이름: 양"
  const colonMatch = cleaned.match(/^(.+?)\s*:\s*(.+)$/);
  if (colonMatch) {
    return { name: colonMatch[1].trim(), amount: colonMatch[2].trim() };
  }

  // Format: "이름 양" where amount looks like a number + unit
  // Match Korean units: g, kg, ml, l, 개, 컵, 큰술, 작은술, 줌, 장, 마리, 덩이, 조각, 봉, 팩, 통
  const spaceMatch = cleaned.match(
    /^(.+?)\s+(\d+(?:\/\d+)?(?:\.\d+)?\s*(?:g|kg|ml|l|개|컵|큰술|작은술|줌|장|마리|덩이|조각|봉|팩|통|약간|적당량|조금|반|少許|少|약)?)\s*$/i,
  );
  if (spaceMatch) {
    return { name: spaceMatch[1].trim(), amount: spaceMatch[2].trim() };
  }

  // No amount found — whole string is the name
  return { name: cleaned, amount: null };
}

/**
 * Parse a raw ingredients text (from recipe source) into structured ingredients.
 */
export function parseIngredients(rawText: string): ParsedIngredient[] {
  if (!rawText || !rawText.trim()) return [];

  // Split by commas, newlines, middle dots, or semicolons
  const chunks = rawText
    .split(/[,\n\r·;]+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const results: ParsedIngredient[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Skip section headers like "[재료]", "●재료", "▶재료" etc.
    if (/^[[\]●▶◆■□•*#]/.test(chunk) && chunk.length < 20) continue;
    // Skip pure whitespace or very short non-meaningful strings
    if (chunk.length < 1) continue;

    const isOptional = isOptionalIngredient(chunk);
    const { name, amount } = extractNameAndAmount(chunk);

    if (!name) continue;

    const category = guessCategory(name);

    results.push({
      name,
      amount,
      category,
      isOptional,
      displayOrder: i,
    });
  }

  return results;
}
