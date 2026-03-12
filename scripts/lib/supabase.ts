/**
 * scripts 공용 Supabase 클라이언트
 * load-env를 포함하므로 별도로 import 불필요
 * Usage: import { supabase } from './lib/supabase';
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
