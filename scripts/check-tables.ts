import './lib/load-env';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const { error: e1 } = await supabase.from('ingredient_mappings').select('id').limit(1);
const { error: e2 } = await supabase.from('ingredient_prices').select('id').limit(1);

console.log('ingredient_mappings:', e1 ? `MISSING (${e1.code})` : 'OK');
console.log('ingredient_prices:', e2 ? `MISSING (${e2.code})` : 'OK');

if (e1 || e2) {
  console.log('\n테이블이 없습니다. 마이그레이션을 실행합니다...');
  process.exit(1);
} else {
  console.log('\n모든 테이블 존재');
  process.exit(0);
}
