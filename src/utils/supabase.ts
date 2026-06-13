import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pcfnpamapfxovctijzts.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_LqaHES1R2EzcNDqeZKljxg_YI9M9ZM4';

export const supabase = createClient(supabaseUrl, supabaseKey);
