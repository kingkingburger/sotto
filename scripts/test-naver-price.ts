/**
 * 네이버 쇼핑 API 테스트 — 도시락 재료 가격 조회
 * 실행: bun run scripts/test-naver-price.ts
 */

import './lib/load-env';

import { getIngredientPrices } from '../src/lib/naver-shopping';

const TEST_INGREDIENTS = [
  // 채소
  '양파',
  '당근',
  '감자',
  '대파',
  '마늘',
  // 육류
  '돼지고기 앞다리',
  '닭가슴살',
  '소고기',
  // 양념/가공
  '간장',
  '고추장',
  '참기름',
  '두부',
  '계란',
  // 기타
  '김치',
  '어묵',
];

async function main() {
  console.log('🔍 네이버 쇼핑 API 테스트 시작\n');
  console.log(`Client ID: ${process.env.NAVER_CLIENT_ID?.slice(0, 8)}...`);
  console.log(`재료 ${TEST_INGREDIENTS.length}개 조회 중...\n`);

  const results = await getIngredientPrices(TEST_INGREDIENTS);

  console.log('─'.repeat(70));
  console.log(
    `${'재료'.padEnd(16)} ${'가격'.padStart(10)} ${'신뢰도'.padStart(6)} ${'카테고리'.padEnd(10)} 판매처`,
  );
  console.log('─'.repeat(70));

  let found = 0;
  let notFound = 0;

  for (const [name, result] of results) {
    if (result.price !== null) {
      found++;
      console.log(
        `${name.padEnd(16)} ${`${result.price.toLocaleString()}원`.padStart(10)} ${`${(result.confidence * 100).toFixed(0)}%`.padStart(6)} ${result.unit.padEnd(10)} ${result.mallName ?? '-'}`,
      );
    } else {
      notFound++;
      console.log(`${name.padEnd(16)} ${'미발견'.padStart(10)}`);
    }
  }

  console.log('─'.repeat(70));
  console.log(`\n✅ 조회 성공: ${found}개 / ❌ 미발견: ${notFound}개`);
  console.log(`커버리지: ${((found / TEST_INGREDIENTS.length) * 100).toFixed(0)}%`);
}

main().catch(console.error);
