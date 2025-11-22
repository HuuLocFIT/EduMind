/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { resolve } from 'path';

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
  css: {
    postcss: {
      plugins: [
        tailwindcss(resolve(__dirname, 'tailwind.config.js')),
        autoprefixer,
      ],
    },
  },
  resolve: {
    alias: {
      '@edumind/user-ui': fileURLToPath(
        new URL('../../libs/user/ui/src/index.ts', import.meta.url)
      ),
      '@edumind/shared-api': fileURLToPath(
        new URL('../../libs/shared/api/src/index.ts', import.meta.url)
      ),
      '@edumind/shared-types': fileURLToPath(
        new URL('../../libs/shared/types/src/index.ts', import.meta.url)
      ),
      '@edumind/shared-constants': fileURLToPath(
        new URL('../../libs/shared/constants/src/index.ts', import.meta.url)
      ),
      '@edumind/shared-utils': fileURLToPath(
        new URL('../../libs/shared/utils/src/index.ts', import.meta.url)
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
