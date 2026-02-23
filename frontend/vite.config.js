import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://studytrack-n18i.onrender.com',
      '/uploads': 'https://studytrack-n18i.onrender.com',
    },
  },
})
