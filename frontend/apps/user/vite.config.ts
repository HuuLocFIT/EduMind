/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { resolve } from 'path';
import { readFileSync } from 'node:fs';
import { viteSitemapPlugin } from '../../tools/plugins/vite-sitemap';

// Serve the production CSP from vercel.json on `vite preview` so it can be
// tested locally against a single source of truth. The local gateway is
// added to connect-src because preview builds call http://localhost:8080.
function previewCspHeaders(): Record<string, string> {
  const vercel = JSON.parse(
    readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
  ) as { headers?: { headers: { key: string; value: string }[] }[] };
  const csp = vercel.headers
    ?.flatMap((rule) => rule.headers)
    .find((header) => header.key.startsWith('Content-Security-Policy'));
  if (!csp) return {};
  return {
    [csp.key]: csp.value.replace(
      'connect-src ',
      'connect-src http://localhost:8080 '
    ),
  };
}

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/user',
  server:{
    port: 3000,
    host: 'localhost',
    fs: {
      allow: ['../..'],
    },
  },
  preview:{
    port: 3000,
    host: 'localhost',
    headers: previewCspHeaders(),
  },
  appType: 'spa',
  plugins: [
    react(),
    viteSitemapPlugin({
      baseUrl: 'https://edumind.nguyenloc.dev',
      staticRoutes: ['/', '/courses'],
    }),
  ],
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
      '@edumind/shared-types': fileURLToPath(
        new URL('../../libs/shared/types/src/index.ts', import.meta.url)
      ),
      '@edumind/shared-constants': fileURLToPath(
        new URL('../../libs/shared/constants/src/index.ts', import.meta.url)
      ),
      '@edumind/shared-utils': fileURLToPath(
        new URL('../../libs/shared/utils/src/index.ts', import.meta.url)
      ),
      '@user/services': resolve(__dirname, 'src/app/services'),
      '@user/stores': resolve(__dirname, 'src/app/stores'),
      '@user/components': resolve(__dirname, 'src/app/components'),
      '@user/pages': resolve(__dirname, 'src/app/pages'),
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
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'html'],
      include: ['src/app/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    },
  },
}));
