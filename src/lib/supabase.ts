import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://csyhxsjikpoljxzydibz.supabase.co'
const supabaseKey = 'sb_publishable_BF6eqbmXtrk-1UMntHSQTA_xDAMNaqx'

export const supabase = createClient(supabaseUrl, supabaseKey)
