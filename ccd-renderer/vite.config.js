import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',  // 👉 index.html에서 상대 경로로 asset 불러오기 위해 필요
  plugins: [react()],
})
