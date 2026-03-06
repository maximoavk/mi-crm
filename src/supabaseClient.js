import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvwytgmldfwmdhlnfttz.supabase.co'
const supabaseKey = 'sb_publishable_mNnc3MpFU2jsO6WuyMTMJQ_32QqjyHj' 

export const supabase = createClient(supabaseUrl, supabaseKey)