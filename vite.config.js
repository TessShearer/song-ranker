// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://song-ranker.supabase.co'),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd2xqdWd3Y3hhYWthb2xzbHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzYzNTMsImV4cCI6MjA2Njk1MjM1M30.LlHgDIE1uZAhUyY0g7mA_nnY__0-GBSGOXJTz3UlW7g'),
    },
    base: '/song-ranker/'
})
