import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://wandererharu-sudo.github.io/tochine/ で公開するため base 設定が必要
export default defineConfig({
  plugins: [react()],
  base: '/tochine/',
})
