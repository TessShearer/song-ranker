// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    base: '/song-ranker/',
    plugins: [vue()],
    define: {
        SUPABASE_URL: JSON.stringify('https://sfwljugwcxaakaolslzf.supabase.co'),
        SUPABASE_KEY: JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd2xqdWd3Y3hhYWthb2xzbHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzYzNTMsImV4cCI6MjA2Njk1MjM1M30.LlHgDIE1uZAhUyY0g7mA_nnY__0-GBSGOXJTz3UlW7g'),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    }
})
