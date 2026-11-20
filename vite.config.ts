import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: { ignored: ['**/test-results/**', '**/playwright-report/**', '**/.data/**', '**/android/**', '**/ios/**', '**/releases/**'] },
    proxy: { '/api': 'http://localhost:4000', '/uploads': 'http://localhost:4000' },
  },
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          validation: ['zod'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
