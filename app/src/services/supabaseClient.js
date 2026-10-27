import { createClient } from '@supabase/supabase-js'

// Publishable key: è pubblica per progetto (finisce nel bundle), i dati sono
// protetti dall'RLS. La secret key vive solo nelle Netlify Functions.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
