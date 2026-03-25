import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfoslaydcsffzruubwrx.supabase.co';
const supabaseKey = 'sb_publishable_5dyc2h0B0oGZqZONwmIJPw_-3jQ4OiV';

export const supabase = createClient(supabaseUrl, supabaseKey);