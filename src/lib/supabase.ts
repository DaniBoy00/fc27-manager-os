import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ejhqjhdkljsharoqwfkg.supabase.co';
const supabaseAnonKey = 'sb_publishable_XEL_Czg-ab-VLq0XNFxqgg_GVYSP1k6';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);