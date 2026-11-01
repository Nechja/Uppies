import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'es2022',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:8787',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
