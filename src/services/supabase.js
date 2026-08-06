import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL/anon key missing. Add them in .env.local (see supabase.com dashboard > Settings > API).'
  )
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
