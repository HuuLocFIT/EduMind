/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/user',
  server:{
    port: 3000,
    host: 'localhost',
  },
  preview:{
    port: 3000,
    host: 'localhost',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@edumind/user-ui': fileURLToPath(
        new URL('../../libs/user/ui/src/index.ts', import.meta.url)
      ),
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
