/**
 * KAMIS API 테스트 — 농수산물 소매가격 조회
 * 실행: bun run scripts/test-kamis.ts
 */
import './lib/load-env';
import {
  fetchDailyPricesByCategory,
  getLatestPrice,
  calcTrend,
  KAMIS_CATEGORIES,
} from '../src/lib/kamis';

async function main() {
  console.log('KAMIS API 테스트 시작\n');
  console.log(`CERT_KEY: ${process.env.KAMIS_CERT_KEY?.slice(0, 8)}...`);
  console.log(`CERT_ID: ${process.env.KAMIS_CERT_ID}\n`);

  const testCategories = [
    { code: KAMIS_CATEGORIES.VEGETABLE, label: '채소류' },
    { code: KAMIS_CATEGORIES.LIVESTOCK, label: '축산물' },
    { code: KAMIS_CATEGORIES.GRAIN, label: '식량작물' },
  ];

  let totalItems = 0;

  for (const { code, label } of testCategories) {
    console.log(`\n--- ${label} (${code}) ---`);
    const items = await fetchDailyPricesByCategory(code);
    console.log(`  ${items.length}개 품목 조회됨`);

    for (const item of items.slice(0, 5)) {
      const price = getLatestPrice(item);
      const trend = calcTrend(item);
      const trendStr = trend
        ? `${trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}${trend.changePercent}%`
        : '-';
      console.log(
        `  ${item.itemName.padEnd(10)} ${item.kindName.padEnd(16)} ${item.rank.padEnd(4)} ${price ? `${price.toLocaleString()}원` : '미등록'.padStart(10)} /${item.unit}  ${trendStr}`,
      );
    }
    if (items.length > 5) console.log(`  ... 외 ${items.length - 5}개`);
    totalItems += items.length;
  }

  console.log(`\n총 ${totalItems}개 품목 조회 완료`);
}

main().catch(console.error);
