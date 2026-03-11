/**
 * 참가격 API 테스트 — 생필품 가격 조회
 * 실행: bun run scripts/test-consumer-price.ts
 */
import './lib/load-env';
import { searchConsumerPrices, getConsumerMedianPrice } from '../src/lib/consumer-price';

const TEST_KEYWORDS = [
  '간장',
  '고추장',
  '참기름',
  '식용유',
  '계란',
  '두부',
  '밀가루',
  '설탕',
  '소금',
  '김',
];

async function main() {
  console.log('참가격 API 테스트 시작\n');
  console.log(`API_KEY: ${process.env.DATA_GO_KR_API_KEY?.slice(0, 12)}...\n`);

  // 1. 기본 검색 테스트
  console.log('--- 기본 검색 (간장) ---');
  const soyItems = await searchConsumerPrices('간장', { perPage: 5 });
  for (const item of soyItems) {
    console.log(
      `  ${item.productName.padEnd(30)} ${item.price.toLocaleString().padStart(8)}원  ${item.store}`,
    );
  }

  // 2. 대표가격 일괄 조회
  console.log('\n--- 대표가격 (중앙값) ---');
  console.log(
    `${'재료'.padEnd(10)} ${'가격'.padStart(10)} ${'규격'.padEnd(12)} ${'매장'}`,
  );
  console.log('─'.repeat(55));

  let found = 0;
  for (const keyword of TEST_KEYWORDS) {
    const result = await getConsumerMedianPrice(keyword);
    if (result) {
      found++;
      console.log(
        `${keyword.padEnd(10)} ${`${result.price.toLocaleString()}원`.padStart(10)} ${result.unit.padEnd(12)} ${result.store}`,
      );
    } else {
      console.log(`${keyword.padEnd(10)} ${'미발견'.padStart(10)}`);
    }
  }

  console.log('─'.repeat(55));
  console.log(`\n조회 성공: ${found}/${TEST_KEYWORDS.length}개`);
  console.log(`커버리지: ${((found / TEST_KEYWORDS.length) * 100).toFixed(0)}%`);
}

main().catch(console.error);
