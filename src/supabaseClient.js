// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sfwljugwcxaakaolslzf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd2xqdWd3Y3hhYWthb2xzbHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzYzNTMsImV4cCI6MjA2Njk1MjM1M30.LlHgDIE1uZAhUyY0g7mA_nnY__0-GBSGOXJTz3UlW7g'                    

export const supabase = createClient(supabaseUrl, supabaseKey)
