import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
  ],
  server: {
    proxy: {
      '/api/payload': {
        target: 'https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com',
        changeOrigin: true,
        rewrite: () => '/candidate-assessments/payload.json',
      },
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js'],
    },
  },
})
