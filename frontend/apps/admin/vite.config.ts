/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/admin',
  resolve: {
    alias: {
      '@edumind/shared-types': resolve(__dirname, '../../libs/shared/types/src/index.ts'),
      '@edumind/shared-constants': resolve(__dirname, '../../libs/shared/constants/src/index.ts'),
      '@edumind/shared-utils': resolve(__dirname, '../../libs/shared/utils/src/index.ts'),
      '@edumind/admin-ui': resolve(__dirname, '../../libs/admin/ui/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'html'],
      include: ['src/app/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/test-setup.ts'],
    },
  },
  optimizeDeps: {
    include: ['zone.js'],
  },
  ssr: {
    noExternal: ['@angular/**'],
  },
}));

