---
name: seed-and-parse
description: 식약처 API에서 레시피 데이터를 가져와서 재료 파싱까지 한번에 실행
allowed-tools: Bash(bun run seed), Bash(bun run parse-ingredients), Bash(bun run classify-tags)
---

# Seed & Parse 워크플로우

식약처 API → Supabase 적재 → 재료 파싱 → 태그 분류를 순차 실행한다.

## 실행 순서

1. `bun run seed` — 식약처 API에서 레시피 데이터를 Supabase에 적재
2. `bun run parse-ingredients` — raw_ingredients를 recipe_ingredients 테이블로 파싱
3. `bun run classify-tags` — concept_tags 규칙 기반 자동 분류
4. 각 단계 결과를 요약하여 리포트

## 주의사항

- 각 단계는 반드시 순차 실행 (이전 단계 성공 후 다음 단계 진행)
- 실패 시 에러 내용을 사용자에게 보고하고 다음 단계 진행 여부를 확인
- SUPABASE_SECRET_KEY 환경변수가 필요함 (.env.local에 설정)
